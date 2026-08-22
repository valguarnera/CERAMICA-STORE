# UC-013: CRUD Productos (Admin)

## Descripción
Administrador gestiona productos: crear, editar, listar, desactivar.

## Actores
- Administrador (role = ADMIN)

## Precondiciones
- Sesión válida, middleware valida role = ADMIN

## Flujo Principal - Listar
1. `/admin/productos` → `GET /api/admin/products?page=&limit=&q=&active=`
2. Tabla: imagen thumb, nombre, slug, precio, stock, estado, acciones
3. Filtros: búsqueda texto, solo activos/inactivos, paginación

## Flujo Principal - Crear
1. `/admin/productos/nuevo` → formulario
2. Campos: nombre, slug (auto-generado, editable), descripción, precio (ARS), stock, imágenes (URLs), activo, metadata (JSON)
3. `POST /api/admin/products` → valida Zod, `INSERT`, redirect a lista

## Flujo Principal - Editar
1. `/admin/productos/:id/editar` → `GET /api/admin/products/:id`
2. Formulario prellenado, `PATCH /api/admin/products/:id`
3. Slug inmutable (no editable)
4. Actualiza `updated_at`

## Flujo Principal - Desactivar
1. Botón "Desactivar" → `PATCH /api/admin/products/:id` body: `{ active: false }`
2. Producto desaparece de catálogo público (no borrado físico)

## Criterios de Aceptación
- [ ] Solo ADMIN accede (middleware 403 si CUSTOMER)
- [ ] Validación Zod server-side en create/update
- [ ] Slug único (constraint UNIQUE + check previo)
- [ ] Precio en centavos (integer), input en ARS formato
- [ ] Imágenes: array URLs, max 10, validación URL
- [ ] Metadata: JSON válido, schema libre
- [ ] Soft delete: `active = 0` (no DELETE físico)

## Reglas de Negocio
- R-001: Slug generado: `nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(^-|-$/g, '')`
- R-002: Stock ≥ 0 (validación + CHECK constraint)
- R-003: Precio > 0
- R-004: `created_at` inmutable, `updated_at` auto

## Endpoints
- `GET /api/admin/products` (query: page, limit, q, active)
- `POST /api/admin/products` body: ProductCreateInput
- `GET /api/admin/products/:id`
- `PATCH /api/admin/products/:id` body: ProductUpdateInput
- `PATCH /api/admin/products/:id` body: `{ active: false }` (desactivar)