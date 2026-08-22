# UC-017: Sincronizar Estado de Pago (Admin)

## Descripción
Admin fuerza consulta a Mercado Pago para actualizar estado local de un pago.

## Actores
- Administrador

## Precondiciones
- Orden tiene `mp_payment_id` (pago iniciado)

## Flujo Principal
1. Admin en `/admin/pedidos/:id` click "Sincronizar"
2. `POST /api/admin/orders/:id/sync`
3. Server:
   - `SELECT mp_payment_id FROM orders WHERE id = ?`
   - Si null → 400 "No hay pago asociado"
   - `GET https://api.mercadopago.com/v1/payments/{mp_payment_id}` (con Access Token)
   - Mapea estado MP → interno
   - Transacción: `UPDATE payments SET status=?, status_detail=?, ...` + `UPDATE orders SET status=?`
   - Log en `webhooks_log` (tipo `manual_sync`)
4. Retorna estado actualizado, UI refresca

## Criterios de Aceptación
- [ ] **NUNCA** permite al admin elegir el estado (solo consulta MP)
- [ ] Usa MISMO mapeo de estados que webhook
- [ ] Idempotente: múltiples syncs = mismo resultado
- [ ] Log de auditoría con timestamp, admin user_id, estado anterior/nuevo
- [ ] Timeout MP 10s → error 504 "Mercado Pago no responde"

## Flujo Alternativo
- MP retorna 404 → pago no existe en MP → log error, no cambia estado local
- MP inaccesible → 502, reintentar manualmente

## Reglas de Negocio
- R-001: Source of truth = Mercado Pago (nuestra BD es reflejo)
- R-002: Solo ADMIN puede ejecutar
- R-003: No crea Order ni Payment (solo actualiza existentes)

## Endpoints
- `POST /api/admin/orders/:id/sync` (auth ADMIN)
- Response: `{ order: { status }, payment: { status, status_detail } }`