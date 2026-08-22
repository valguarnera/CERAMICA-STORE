# UC-014: Generar Link de Pago (Admin)

## Descripción
Admin genera link de pago Mercado Pago para un producto individual (venta directa).

## Actores
- Administrador

## Precondiciones
- Producto existe, `active = 1`, `stock > 0`

## Flujo Principal
1. Admin en `/admin/productos` click "Generar link de pago" en fila producto
2. `POST /api/admin/payments/link` body: `{ productId, quantity? }`
3. Server:
   - Valida producto activo, stock ≥ quantity (default 1)
   - Crea Preference MP single-item:
     - `items: [{ id: product.id, title: product.name, unit_price: price_cents/100, quantity, currency_id: 'ARS' }]`
     - `external_reference = "product:${productId}:admin"`
     - `back_urls` → `/checkout/result?source=admin_link`
     - `notification_url` = webhook estándar
   - Retorna `{ init_point, sandbox_init_point, preference_id }`
4. UI muestra modal con ambos links + botón copiar

## Criterios de Aceptación
- [ ] Link producción (`init_point`) y sandbox (`sandbox_init_point`)
- [ ] Quantity válida ≤ stock actual
- [ ] Precio desde BD (no editable en request)
- [ ] `external_reference` trazable a producto + admin
- [ ] Webhook procesa igual que carrito (crea Order con `user_id = NULL`, `guest_email = null`)

## Flujo Alternativo
- Stock 0 → error "Sin stock"
- Producto inactivo → error "Producto no disponible"
- Error MP → 502, log, toast

## Reglas de Negocio
- R-001: Order creada SOLO cuando webhook confirma pago (no al generar link)
- R-002: Link expira según config MP (default 30 días)
- R-003: Admin puede generar múltiples links para mismo producto

## Endpoints
- `POST /api/admin/payments/link` body: `{ productId, quantity? }`
- Response: `{ init_point, sandbox_init_point, preference_id }`