# UC-004: Modificar Carrito

## Descripción
El usuario actualiza cantidades o elimina items del carrito.

## Actores
- Visitante
- Cliente registrado

## Precondiciones
- Carrito con al menos 1 item

## Flujo Principal
1. Usuario en `/carrito` ve lista de items con:
   - Imagen, nombre, precio unitario, subtotal
   - Input cantidad (1..stock actual)
   - Botón eliminar
2. Usuario modifica cantidad → `PATCH /api/cart/items/:productId`
3. Usuario elimina → `DELETE /api/cart/items/:productId`
4. Sistema valida stock actual en BD, actualiza cookie, retorna carrito
5. UI re-renderiza totales

## Criterios de Aceptación
- [ ] Cantidad 0 = elimina item (equivalente a DELETE)
- [ ] Validación stock en tiempo real (GET /api/products/:id/stock)
- [ ] Totales recalculados: subtotal por item + total general
- [ ] Persistencia: recarga página → carrito intacto
- [ ] Vaciar carrito: `DELETE /api/cart` → cookie limpia

## Flujo Alternativo
- Stock bajó desde que agregó → ajusta a stock máximo, toast informativo
- Producto desactivado → elimina automáticamente, toast "Producto no disponible"

## Reglas de Negocio
- R-001: Validación SIEMPRE contra stock actual en SQLite (no confiar en cookie)
- R-002: Precio en carrito = snapshot al agregar (no cambia si admin modifica precio)
- R-003: `version` en cookie previene lost updates concurrentes

## Endpoints
- `PATCH /api/cart/items/:productId` body: `{ quantity }`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart` (vaciar)
- `GET /api/cart` (hidratado con datos actuales)