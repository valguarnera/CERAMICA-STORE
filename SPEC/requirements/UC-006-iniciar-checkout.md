# UC-006: Iniciar Checkout

## Descripción
Proceso server-side que valida carrito, crea Order y preferencia de Mercado Pago.

## Actores
- Sistema (invocado por UC-005 o UC-007)

## Precondiciones
- Carrito válido (cookie firmada integra, items existen)

## Flujo Principal
1. Recibir request con datos cliente (guest o user autenticado)
2. Leer y validar cookie `cart` (firma, version, items)
3. Para cada item:
   - `SELECT id, price_cents, stock, active FROM products WHERE id = ?`
   - Verificar: `active = 1`, `stock >= quantity`, `price_cents === item.unitPriceCents`
4. Si alguna validación falla → 409 con detalle
5. Transacción atómica:
   - `INSERT INTO orders ...` (status=PENDING, total_cents=sum)
   - `INSERT INTO order_items ...` (snapshot name, slug, price_cents)
   - `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`
   - Verificar `changes() > 0` por cada item
6. Construir Preference MP:
   - `items[]` = order_items con `unit_price = price_cents / 100`, `quantity`
   - `external_reference = order.id`
   - `back_urls`: success/failure/pending → `/checkout/result?status=...`
   - `notification_url = https://dominio.com/api/webhooks/mercadopago`
   - `metadata.order_id = order.id`
7. `POST /checkout/preferences` (MP SDK)
8. `UPDATE orders SET mp_preference_id = ? WHERE id = ?`
9. Retornar `{ init_point, preference_id, orderId }`

## Criterios de Aceptación
- [ ] Transacción atómica: todo o nada (stock, order, items)
- [ ] Precios SIEMPRE desde BD, nunca del cliente
- [ ] Stock descontado con `WHERE stock >= qty` (previene race condition)
- [ ] Preference MP incluye todos los items del carrito
- [ ] `external_reference` = order.id (trazabilidad)
- [ ] `notification_url` apunta a webhook de producción
- [ ] Respuesta < 2s (incluyendo llamada a MP)

## Flujo Alternativo
- Error validación → rollback automático, stock NO descuenta
- Error MP API → rollback, stock restituido, error 502
- Carrito version mismatch → 409 "Carrito modificado, recargue"

## Reglas de Negocio
- R-001: Total en centavos (INTEGER), sin floats
- R-002: Moneda fija ARS
- R-003: Order `user_id` = NULL si guest, = user.id si autenticado

## Endpoint Interno
- `POST /api/checkout/start` (público, rate-limited 10/min/session)