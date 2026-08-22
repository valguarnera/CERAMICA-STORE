# UC-011: Ver Detalle de Pedido (Cliente)

## Descripción
Cliente ve detalle completo de una orden propia.

## Actores
- Cliente registrado

## Precondiciones
- Orden existe y `user_id` = usuario actual

## Flujo Principal
1. Usuario en `/mis-pedidos/:id`
2. `GET /api/orders/:id` (valida ownership)
3. Muestra:
   - Header: #orden, fecha, estado badge, total
   - Datos envío/facturación
   - Tabla items: imagen, nombre, cantidad, precio unit., subtotal
   - Timeline de estados (creado → pagado → enviado → entregado)
   - Si `PENDING`: botón "Pagar" (re-checkout) / "Cancelar"
   - Si `PAID`: info de pago (método, cuotas, ID MP)

## Criterios de Aceptación
- [ ] 404 si orden no existe o no pertenece al usuario
- [ ] Items muestran precio HISTÓRICO (order_items.unit_price_cents)
- [ ] Timeline basado en `orders.updated_at` + `payments.paid_at` + `orders.status`
- [ ] Botón "Pagar" solo si `PENDING` y < 24h
- [ ] Botón "Cancelar" solo si `PENDING` → `PATCH /api/orders/:id` status=CANCELLED + stock back

## Flujo Alternativo
- Orden ajena → 404 (no 403, no filtrar info)

## Reglas de Negocio
- R-001: Ownership check obligatorio en server
- R-002: Precios desde `order_items` (snapshot), no productos actuales
- R-003: Cancelación restituye stock atómicamente

## Endpoints
- `GET /api/orders/:id` (auth, ownership)
- `PATCH /api/orders/:id` body: `{ status: 'CANCELLED' }` (solo PENDING, owner)