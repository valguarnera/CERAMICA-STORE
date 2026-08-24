# Integración Mercado Pago — Webhooks, Idempotencia y Escenarios

## Configuración
```env
MP_ACCESS_TOKEN=APP_USR-xxxxx          # Solo server
MP_PUBLIC_KEY=APP_USR-xxxxx            # Solo si usa SDK frontend (Bricks)
MP_WEBHOOK_SECRET=whsec_xxxxx          # Para validar firma
MP_SANDBOX=true                        # true/false
```

## Checkout Pro (Preferences API) - Flujo Estándar

### Crear Preference (Carrito Multi-item)
```typescript
const preference = {
  items: cartItems.map(item => ({
    id: item.productId,
    title: item.name,
    unit_price: item.unitPriceCents / 100,
    quantity: item.quantity,
    currency_id: 'ARS',
    picture_url: item.imageUrl,
  })),
  external_reference: orderId,           // NUESTRO order.id
  back_urls: {
    success: `${BASE_URL}/checkout/result?status=approved`,
    failure: `${BASE_URL}/checkout/result?status=rejected`,
    pending: `${BASE_URL}/checkout/result?status=pending`,
  },
  notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
  metadata: { order_id: orderId },
  auto_return: 'approved',
}
```

### Crear Preference (Admin Link Single-item)
```typescript
const preference = {
  items: [{
    id: productId,
    title: product.name,
    unit_price: priceCents / 100,
    quantity: qty,
    currency_id: 'ARS',
  }],
  external_reference: `product:${productId}:admin`,
  back_urls: { ... },
  notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
  metadata: { product_id: productId, source: 'admin_link' },
}
```

## Validación de Firma Webhook (Obligatoria)

Mercado Pago envía los headers:

- `x-signature`: `ts=<timestamp>,v1=<hex>`
- `x-request-id`: `<request-id>`

El payload JSON contiene `data.id` (payment ID).

```typescript
function verifyMpSignature(payload: string, signatureHeader: string, requestIdHeader: string): boolean {
  // signatureHeader = "ts=1234567890,v1=abcdef..."
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {} as Record<string, string>)
  
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  
  // Extraer paymentId del payload JSON
  let paymentId: string
  try {
    paymentId = JSON.parse(payload).data?.id?.toString() ?? ''
  } catch {
    return false
  }
  if (!paymentId) return false
  
  // Manifest según docs MP: `id:${paymentId};request-id:${requestId};ts:${ts};`
  const manifest = `id:${paymentId};request-id:${requestIdHeader};ts:${ts};`
  const expected = crypto.createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex')
  
  return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))
}
```

## Idempotencia (Múltiples Capas)

| Capa | Mecanismo |
|------|-----------|
| **Preference** | `external_reference` = `order.id` (único por order) |
| **Payment** | `mp_payment_id` UNIQUE en `payments` table |
| **Webhook** | `webhooks_log.mp_resource_id` UNIQUE + `processed` flag |
| **Consulta MP** | `GET /v1/payments/{id}` siempre (source of truth) |

## Escenarios de Webhook

### 1. Webhook Llega Varias Veces (Duplicados)
```
MP envía payment.updated 3 veces (reintentos)
  → 1ra: processed=0 → procesa, processed=1
  → 2da/3ra: processed=1 → return 200 OK inmediato (no reprocesa)
```

### 2. Webhook Llega Antes Que Redirect
```
Usuario paga → MP envía webhook → Order PAID
Usuario redirect a /checkout/success
  → Polling /api/checkout/status → ya PAID → muestra confirmación
```

### 3. Redirect Ocurre Sin Webhook
```
Usuario paga → redirect a success
  → Polling /api/checkout/status/:orderId cada 3s (max 30s)
  → Si MP ya aprobó → webhook en proceso → eventualmente PAID
  → Si timeout 30s → "Verifique su email, pago en proceso"
  → MP reintenta webhook (backoff 28 días)
```

### 4. Mercado Pago Temporalmente Inaccesible
```
Webhook handler: GET /v1/payments/{id} timeout/5xx
  → Nuestro endpoint: 500/504
  → MP reintenta con backoff exponencial (hasta 28 días)
  → Cuando MP recupera → webhook llega → procesa normal
```

### 5. Pago Cambia de Estado (approved → refunded)
```
Webhook payment.updated (status=refunded)
  → GET /v1/payments/{id} → confirmed refunded
  → Transacción: Payment.refunded + Order.REFUNDED
  → Email notificación
```

### 6. Admin Ejecuta "Sincronizar"
```
POST /api/admin/orders/:id/sync
  ├─ SELECT mp_payment_id FROM orders
  ├─ GET /v1/payments/{mp_payment_id}
  ├─ Mismo mapeo estados que webhook
  ├─ Transacción: UPDATE payments + orders
  ├─ Log webhooks_log (tipo manual_sync)
  └─ Return estado actualizado
  → NUNCA permite admin elegir estado
```

## Mapeo Estados MP → Internos

| MP Status | Order Status | Payment Status |
|-----------|--------------|----------------|
| `pending` | `PENDING` | `pending` |
| `approved` | `PAID` | `approved` |
| `rejected` | `PENDING` | `rejected` |
| `cancelled` | `CANCELLED` | `cancelled` |
| `refunded` | `REFUNDED` | `refunded` |
| `in_process` | `PENDING` | `pending` |
| `in_mediation` | `PENDING` | `pending` |
| `chargeback` | `PAID` | `approved` (flag contracargo) |

## Reglas Inquebrantables
- ✅ **Nunca** confiar en precio/cantidad del cliente
- ✅ **Nunca** marcar `PAID` por redirect `/checkout/success`
- ✅ **Siempre** validar firma webhook (HMAC)
- ✅ **Siempre** consultar MP server-side (`GET /v1/payments/{id}`)
- ✅ **Siempre** idempotencia (UNIQUE constraints + process-once)
- ✅ **Siempre** tolerar duplicados, fuera de orden, reintentos
- ❌ **Nunca** admin setea estado manualmente (solo sync consulta MP)