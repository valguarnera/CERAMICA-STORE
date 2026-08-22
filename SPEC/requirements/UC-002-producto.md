# UC-002: Ver Producto

## Descripción
El usuario ve el detalle completo de un producto activo vía slug.

## Actores
- Visitante (sin autenticación)

## Precondiciones
- Producto existe y `active = 1`

## Flujo Principal
1. Usuario accede a `/productos/[slug]`
2. Sistema muestra:
   - Galería de imágenes (carousel)
   - Nombre, descripción completa
   - Precio formateado (ARS)
   - Stock actual ("Disponible: X" / "Agotado")
   - Atributos: color, material, dimensiones (si existen)
   - Botón "Agregar al carrito" (deshabilitado si stock = 0)
3. Usuario puede modificar cantidad (1..stock) y agregar

## Criterios de Aceptación
- [ ] 404 si producto no existe o `active = 0`
- [ ] Imágenes cargan correctamente (fallback si faltan)
- [ ] Precio formateado: $ 1.234,56 (locale es-AR)
- [ ] Stock actualizado en tiempo real (revalidación al montar)
- [ ] Cantidad máxima = stock actual
- [ ] SEO: meta tags Open Graph, Twitter Card, structured data Product
- [ ] JSON-LD incluye: name, description, image, price, currency, availability

## Flujo Alternativo
- Producto inactivo → 404 (no 403, no filtrar info)

## Reglas de Negocio
- R-001: Slug único e inmutable (generado al crear, no editable)
- R-002: Imágenes: array de URLs, primera = principal
- R-003: Atributos opcionales en `metadata` JSON

## Endpoints
- `GET /api/products/[slug]`
- Response: `ProductDetail` (incluye images[], metadata, stock, price_cents)