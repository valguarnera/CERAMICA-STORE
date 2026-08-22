# UC-007: Pagar mediante Mercado Pago

## Descripción
Usuario completa el pago en Mercado Pago y retorna al sitio.

## Actores
- Visitante / Cliente registrado
- Mercado Pago (externo)

## Precondiciones
- Order `PENDING` creada con `mp_preference_id`
- Usuario en checkout MP

## Flujo Principal
1. Usuario en MP elige medio de pago, completa datos
2. MP procesa pago (async, segundos a minutos)
3. MP envía webhook `payment.updated` a `/api/webhooks/mercadopago`
4. Webhook handler:
   - Valida firma HMAC (`x-signature`, `x-request-id`, `MP_WEBHOOK_SECRET`)
   - Extrae `payment_id` del resource
   - `GET /v1/payments/{payment_id}` (idempotente)
   - Mapea estado MP → estado interno
   - Transacción: `UPDATE orders SET status=?, mp_payment_id=?` + `INSERT/UPDATE payments`
   - Marca `webhooks_log.processed = 1`
5. Usuario redirect a `/checkout/result?status=approved&payment_id=...`
6. Página resultado:
   - Polling `/api/checkout/status/:orderId` cada 3s (max 30s)
   - Si Order `PAID` → muestra confirmación + número de orden
   - Si aún `PENDING` → "Procesando, verifique su email"

## Criterios de Aceptación
- [ ] **NUNCA** marca PAID por redirect URL (solo por webhook verificado)
- [ ] Webhook valida firma HMAC SHA256
- [ ] Consulta MP server-side para obtener estado real
- [ ] Idempotencia: webhook duplicado → procesa una vez
- [ ] Order `PAID` solo si Payment `approved`
- [ ] Email de confirmación enviado (async, no bloquea)

## Flujo Alternativo
- Pago `rejected` → Order sigue `PENDING`, toast "Pago rechazado, intente otro medio"
- Pago `cancelled` → Order `CANCELLED`, stock restituido
- Pago `in_process` → Order `PENDING`, usuario ve "En proceso"
- Webhook falla → MP reintenta (backoff 28d). Nuestro endpoint: 200 solo si OK
- Usuario cierra MP sin pagar → Order `PENDING` 24h → cron `EXPIRED` + stock back

## Reglas de Negocio
- R-001: `payments.mp_payment_id` UNIQUE (previene duplicados)
- R-002: `webhooks_log` PK = `mp_resource_id` (process-once)
- R-003: Transición PENDING → PAID solo vía webhook `approved`
- R-004: Redirect `/checkout/success` solo muestra estado, NO lo cambia

## Endpoints
- `POST /api/webhooks/mercadopago` (MP → server)
- `GET /api/checkout/status/:orderId` (polling cliente)
- `GET /checkout/result` (página resultado)