# UC-001: Ver Catálogo

## Descripción
El usuario público puede ver una lista paginada de productos activos con filtros básicos.

## Actores
- Visitante (sin autenticación)

## Precondiciones
- Existen productos con `active = 1` en la base de datos

## Flujo Principal
1. Usuario accede a `/productos`
2. Sistema muestra página 1 (12 productos por defecto)
3. Usuario puede:
   - Cambiar página (paginación)
   - Filtrar por búsqueda de texto (nombre, descripción)
   - Ordenar por: precio ascendente/descendente, nombre, más recientes
4. Cada producto muestra: imagen principal, nombre, precio formateado (ARS), stock disponible

## Criterios de Aceptación
- [ ] Paginación funciona (page, limit, total pages)
- [ ] Filtro de texto busca en nombre y descripción (ILIKE)
- [ ] Ordenamiento funciona en todos los campos
- [ ] Solo productos `active = 1` aparecen
- [ ] Stock 0 se muestra como "Agotado" pero producto visible
- [ ] Respuesta < 500ms en localhost
- [ ] SEO: meta tags básicos, structured data ProductList

## Flujo Alternativo
- Sin productos activos → mensaje "No hay productos disponibles"

## Reglas de Negocio
- R-001: Página por defecto = 1, límite por defecto = 12, máximo = 50
- R-002: Búsqueda case-insensitive, partial match
- R-003: Orden por defecto = más recientes (created_at DESC)

## Endpoints
- `GET /api/products?page=1&limit=12&q=&sort=-created_at`
- Response: `{ data: Product[], pagination: { page, limit, total, totalPages } }`