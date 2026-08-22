# UC-010: Ver Sus Pedidos (Cliente)

## Descripción
Cliente autenticado ve lista de sus órdenes con estado y totales.

## Actores
- Cliente registrado (role = CUSTOMER)

## Precondiciones
- Sesión válida, role = CUSTOMER

## Flujo Principal
1. Usuario en `/mis-pedidos` (protegido por middleware auth)
2. `GET /api/orders?page=1&limit=10&status=`
3. Server: `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`
4. Muestra tabla: Número, Fecha, Estado, Total, Acciones
5. Paginación, filtro por estado

## Criterios de Aceptación
- [ ] Solo órdenes del usuario autenticado (user_id = session.user_id)
- [ ] Estados mostrados: PENDING, PAID, CANCELLED, EXPIRED, REFUNDED, SHIPPED
- [ ] Formato fecha locale es-AR
- [ ] Total formateado ARS
- [ ] Link a detalle `/mis-pedidos/:id`
- [ ] Paginación funcional
- [ ] Empty state: "No tiene pedidos aún"

## Flujo Alternativo
- Sin sesión → redirect `/login?next=/mis-pedidos`

## Reglas de Negocio
- R-001: Cliente NUNCA ve órdenes de otros usuarios
- R-002: Filtro status opcional (PENDING, PAID, etc.)
- R-003: Límite max 50 por página

## Endpoints
- `GET /api/orders` (auth required, role CUSTOMER/ADMIN)
- Query: `page, limit, status`
- Response: `{ data: Order[], pagination }`