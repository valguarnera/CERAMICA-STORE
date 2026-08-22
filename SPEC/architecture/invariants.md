# Invariantes Críticas — CERAMICA-STORE

## Seguridad y Autorización
- **INV-001**: Un CUSTOMER nunca puede ejecutar operaciones ADMIN (middleware valida `role === 'ADMIN'` en `(admin)/*` y `api/admin/*`)
- **INV-002**: Solamente existe un bootstrap ADMIN válido (primer registro atómico via `COUNT(*)=0` en transacción `IMMEDIATE`)
- **INV-003**: Una sesión revocada (`revoked=1`) o expirada (`expires_at < now()`) nunca puede autenticarse

## Stock e Inventario
- **INV-004**: Stock nunca puede ser negativo (`CHECK (stock >= 0)` + `UPDATE ... WHERE stock >= qty` en transacción)
- **INV-005**: Stock se descuenta SOLO al crear Order (`PENDING`) en transacción atómica; se restituye solo en `CANCELLED`/`EXPIRED`/`REFUNDED`

## Precios y Pagos
- **INV-006**: El precio del cliente nunca determina el total final (server re-calcula desde SQLite al iniciar checkout)
- **INV-007**: Una Order no puede marcarse `PAID` por el redirect `/checkout/success` (solo webhook MP validado + consulta server-side)
- **INV-008**: Un webhook repetido (mismo `mp_payment_id`) no duplica un pago (`UNIQUE constraint` + `webhooks_log.processed`)
- **INV-009**: Un pago aprobado (`status=approved`) no vuelve arbitrariamente a `PENDING` (transiciones controladas por webhook verificado)

## Integridad Histórica
- **INV-010**: Una Order conserva los precios históricos de sus `order_items` (`product_name`, `product_slug`, `unit_price_cents` snapshot)
- **INV-011**: Un admin no puede falsificar un estado de Mercado Pago (botón "Sincronizar" solo consulta MP API, nunca set manual)

## Conciliación
- **INV-012**: `orders.mp_payment_id = payments.mp_payment_id` siempre (actualizado en misma transacción que webhook)
- **INV-013**: `external_reference` en MP = `order.id` (1:1, inmutable)