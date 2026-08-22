# Modelo de Pagos — Order & Payment

## Cardinalidad
- **Order 1 ───── 0..1 Payment** (UNIQUE `payments.order_id`)
- Un Order puede tener múltiples intentos → se crea **nueva Order** (re-checkout)
- `payments.order_id UNIQUE` **es correcto**: un pago exitoso = una order pagada

## Tablas Clave

### orders
```sql
status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'SHIPPED'
mp_payment_id: TEXT  -- denormalizado para queries admin rápidas
```

### payments
```sql
order_id: TEXT UNIQUE          -- 1:1
mp_payment_id: TEXT UNIQUE     -- idempotencia MP
status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'
status_detail: TEXT            -- detalle MP (accredited, cc_rejected_*)
external_reference: TEXT       -- = order.id (trazabilidad)
raw_response: TEXT             -- JSON completo MP (auditoría)
```

## Transiciones de Estado

### Order
```mermaid
PENDING ──(webhook approved)──→ PAID
PENDING ──(user cancel)───────→ CANCELLED
PENDING ──(admin cancel)──────→ CANCELLED
PENDING ──(cron 24h)──────────→ EXPIRED
PAID ───(admin refund)────────→ REFUNDED
PAID ───(admin ship)──────────→ SHIPPED
```

### Payment
```mermaid
pending ──(webhook approved)──→ approved
pending ──(webhook rejected)──→ rejected
pending ──(webhook cancelled)─→ cancelled
approved ──(admin refund)─────→ refunded
```

## Actores por Transición

| Transición | Actor/Evento |
|------------|--------------|
| PENDING → PAID | Webhook MP `payment.updated` + consulta GET /v1/payments/{id} |
| PENDING → CANCELLED | Usuario (abandono) / Admin / Cron 24h |
| PENDING → EXPIRED | Cron job diario |
| PAID → REFUNDED | Admin → POST /v1/payments/{id}/refunds (MP) → webhook refunded |
| PAID → SHIPPED | Admin manual |
| Payment pending → approved/rejected/cancelled | Webhook MP validado |

## Pagos Rechazados y Reintentos

### Flujo Rechazo
1. Webhook `rejected` → Payment `rejected`, Order **sigue `PENDING`**
2. Usuario ve "Pago rechazado" en `/checkout/result`
3. Opciones:
   - **Reintentar** → Nueva Order (carrito intacto) → nuevo Payment
   - **Cancelar** → Order `CANCELLED` + stock restituido
   - **Esperar** → Order expira en 24h → `EXPIRED` + stock back

### Nueva Order (Re-checkout)
- Carrito persistido en cookie (no afectado)
- `POST /api/checkout/start` → nueva Order `PENDING` + nuevo stock decrement
- Order anterior → `CANCELLED` (admin) o `EXPIRED` (cron)

## Refund / Cancelación

### Refund Total (Admin)
```
POST /api/admin/orders/:id/refund
  ├─ Validar Order.status = 'PAID'
  ├─ GET payment.mp_payment_id
  ├─ POST MP /v1/payments/{mp_payment_id}/refunds
  ├─ Webhook 'refunded' → Payment.refunded + Order.REFUNDED
  └─ Stock NO restituido (producto ya entregado/consumido)
```

### Cancelación (Antes de Pago)
```
PATCH /api/admin/orders/:id { status: 'CANCELLED' }
  ├─ Validar Order.status = 'PENDING'
  ├─ Transacción:
  │   UPDATE orders SET status='CANCELLED'
  │   UPDATE products SET stock = stock + oi.quantity 
  │     FROM order_items oi WHERE oi.order_id = orders.id
  └─ Order CANCELLED, stock restituido
```

## Idempotencia y Conciliación

### Garantías
- `payments.mp_payment_id` UNIQUE → un pago MP = un registro
- `webhooks_log.mp_resource_id` UNIQUE → process-once
- `orders.mp_payment_id` = `payments.mp_payment_id` (misma transacción)
- `external_reference` = `order.id` (1:1 inmutable)

### Webhook Handler (Pseudocódigo)
```typescript
async function handleWebhook(payload, signature) {
  verifySignature(payload, signature)  // HMAC SHA256
  
  const paymentId = extractPaymentId(payload)
  
  // Idempotencia: ya procesado?
  const logged = await db.selectFrom('webhooks_log')
    .where('mp_resource_id', '=', paymentId)
    .where('processed', '=', 1)
    .executeTakeFirst()
  if (logged) return 200
  
  // Consultar MP (source of truth)
  const mpPayment = await mpClient.getPayment(paymentId)
  
  // Transacción atómica
  await db.transaction().execute(async (trx) => {
    // Upsert payment
    await trx.insertInto('payments').values(mapMpToPayment(mpPayment))
      .onConflict(oc => oc.column('mp_payment_id').doUpdateSet(mapMpToPayment(mpPayment)))
      .execute()
    
    // Update order status
    const newOrderStatus = mapPaymentToOrderStatus(mpPayment.status)
    await trx.updateTable('orders')
      .set({ status: newOrderStatus, mp_payment_id: paymentId, updated_at: new Date() })
      .where('id', '=', mpPayment.external_reference)
      .execute()
    
    // Log webhook
    await trx.insertInto('webhooks_log')
      .values({ id: uuid(), mp_event_type: payload.type, mp_resource_id: paymentId, payload: JSON.stringify(payload), processed: 1 })
      .execute()
  })
  
  return 200
}
```

## Reglas Críticas
- **INV-007**: Order NUNCA `PAID` por redirect (solo webhook verificado)
- **INV-008**: Webhook duplicado no duplica pago (UNIQUE + process-once)
- **INV-009**: Payment `approved` no vuelve a `pending` (transiciones unidireccionales)
- **INV-011**: Admin no puede setear manualmente `PAID` (solo sync consulta MP)
- **INV-010**: `order_items` guarda precios históricos (snapshot)
- **INV-012**: `orders.mp_payment_id` = `payments.mp_payment_id` siempre
- **INV-013**: `external_reference` = `order.id` (trazabilidad 1:1)