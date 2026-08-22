# UC-016: Ver Detalle de Pedido (Admin)

## Descripción
Admin ve detalle completo de cualquier orden y puede gestionar su estado.

## Actores
- Administrador

## Precondiciones
- Orden existe

## Flujo Principal
1. `/admin/pedidos/:id` → `GET /api/admin/orders/:id`
2. Muestra:
   - Header: #orden, fecha, badges estado orden + estado pago
   - Cliente: email, nombre, teléfono, tipo (registrado/guest)
   - Direcciones envío/facturación (JSON formateado)
   - Items tabla: producto, snapshot nombre, cantidad, precio unit., subtotal
   - Info pago: MP payment_id, método, cuotas, monto, fecha pago, raw_response (collapsible)
   - Acciones:
     - Si `PENDING`: "Cancelar orden" (restituye stock)
     - Si `PAID`: "Reembolsar" (llama MP Refund API) / "Marcar enviado"
     - Si `SHIPPED`: "Marcar entregado"
     - Siempre: "Sincronizar con MP" (consulta GET /v1/payments/{id})

## Criterios de Aceptación
- [ ] Acceso a cualquier orden (sin ownership check)
- [ ] Estados pago mostrados desde tabla `payments`
- [ ] Botón "Sincronizar" → consulta MP API → actualiza Payment + Order
- [ ] Reembolso: `POST /api/admin/orders/:id/refund` → MP Refund API → webhook procesa
- [ ] Cancelar: `PATCH status=CANCELLED` + `UPDATE products SET stock=stock+qty` (transacción)
- [ ] Timeline completo con timestamps

## Flujo Alternativo
- Reembolso parcial (futuro): input monto
- Orden ya `REFUNDED`/`SHIPPED` → botones deshabilitados

## Reglas de Negocio
- R-001: Admin NUNCA puede setear manualmente status=PAID (solo via webhook/sync)
- R-002: "Sincronizar" es read-only desde MP (source of truth)
- R-003: Acciones de estado usan transacciones atómicas

## Endpoints
- `GET /api/admin/orders/:id` (auth ADMIN)
- `PATCH /api/admin/orders/:id` body: `{ status }` (valid transitions only)
- `POST /api/admin/orders/:id/refund` body: `{ amount_cents? }` (full refund MVP)
- `POST /api/admin/orders/:id/sync` (consulta MP, actualiza local)