# UC-003: Agregar Producto al Carrito

## Descripción
El usuario agrega productos al carrito desde la página de producto o catálogo.

## Actores
- Visitante (sin autenticación)
- Cliente registrado

## Precondiciones
- Producto existe, `active = 1`, `stock > 0`

## Flujo Principal
1. Usuario en `/productos/[slug]` selecciona cantidad (1..stock)
2. Click "Agregar al carrito"
3. Sistema:
   - Lee cookie firmada `cart`
   - Si producto ya existe en carrito → suma cantidad (max = stock)
   - Si no existe → agrega item con `productId`, `quantity`, `unitPriceCents` (precio actual)
   - Firma y actualiza cookie `cart`
   - Retorna carrito actualizado
4. UI muestra notificación toast + badge actualizado en header

## Criterios de Aceptación
- [ ] No permite agregar más que stock disponible
- [ ] Suma cantidades si producto ya en carrito
- [ ] Precio capturado al momento de agregar (snapshot)
- [ ] Cookie firmada: integridad verificada en server
- [ ] Badge header actualiza sin recargar (router.refresh)
- [ ] Persiste entre recargas y navegación

## Flujo Alternativo
- Stock = 0 → botón deshabilitado, toast "Sin stock"
- Cantidad > stock → toast "Stock insuficiente, máximo X"

## Reglas de Negocio
- R-001: Carrito = `{ items: CartItem[], version: number }`
- R-002: `CartItem = { productId, quantity, unitPriceCents }`
- R-003: `version` incrementa en cada mutación (optimistic locking)
- R-004: Máximo 50 items distintos en carrito
- R-005: Cookie: `HttpOnly=false, SameSite=Lax, Secure, Path=/, Max-Age=604800` (7 días)

## Endpoints
- `POST /api/cart/items` body: `{ productId, quantity }` → Response: `Cart`
- `GET /api/cart` → Response: `Cart` (hidratado con precios/stock actuales)