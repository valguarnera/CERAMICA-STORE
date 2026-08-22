# UC-015: Ver Pedidos (Admin)

## Descripción
Administrador ve todas las órdenes con filtros avanzados.

## Actores
- Administrador

## Precondiciones
- Sesión ADMIN válida

## Flujo Principal
1. `/admin/pedidos` → `GET /api/admin/orders`
2. Tabla: #Orden, Fecha, Cliente (email/nombre), Estado, Total, Pago MP, Acciones
3. Filtros:
   - Estado (multiselect: PENDING, PAID, CANCELLED, EXPIRED, REFUNDED, SHIPPED)
   - Rango fechas (created_at)
   - Búsqueda: email cliente, order.id, mp_payment_id
   - Cliente: registrado / guest
4. Paginación (20 por página)
5. Exportar CSV (opcional MVP: no)

## Criterios de Aceptación
- [ ] Ve TODAS las órdenes (no solo propias)
- [ ] Filtros combinados funcionan (AND)
- [ ] Búsqueda partial match en email, id, mp_payment_id
- [ ] Columna "Pago MP": muestra estado payment + link a MP si existe
- [ ] Ordenamiento por fecha desc por defecto
- [ ] Performance: < 500ms con 10k órdenes

## Reglas de Negocio
- R-001: Admin ve datos completos (guest_email, user_id, addresses)
- R-002: Join con `payments` para mostrar estado pago y mp_payment_id
- R-003: Índices en `orders(user_id, status, created_at)` + `payments(mp_payment_id)`

## Endpoints
- `GET /api/admin/orders` query: `page, limit, status[], dateFrom, dateTo, q, customerType`
- Response: `{ data: AdminOrder[], pagination }`
- `AdminOrder` = Order + user email/name + payment status + mp_payment_id