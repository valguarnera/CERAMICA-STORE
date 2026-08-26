# CERAMICA-STORE

Tienda online de cerámica artesanal.

## Estado actual

**Fase 6 — Checkout / Mercado Pago: COMPLETADA** ✅
- Checkout, webhook MP, polling de resultado, idempotencia
- Auth UI: `/login` y `/registro` funcionales
- 54 tests pasando, lint/typecheck/build ✅

**Preflight Fase 7 — Auth Boundary Fix: COMPLETADA** ✅
- Middleware desacoplado de `better-sqlite3` (Edge Runtime) mediante cookie JWT HS256 (5 min TTL)
- `jose` ya era dependencia; sin nuevas dependencias nativas
- Sesiones en BD siguen siendo source of truth; revocación inmediata preservada
- 58 tests pasando (incluye 3 tests cookie + 1 regresión revocación)
- Build, lint, typecheck OK; middleware bundle sin `better-sqlite3`

**Fase 7.2 — Product Management (CRUD): COMPLETADA** ✅
- CRUD productos completo en backoffice ADMIN (`/admin/productos`, nuevo, editar)
- Listado paginado con búsqueda, filtro activo/inactivo, ordenamiento
- Formularios crear/editar con validación Zod, slug auto-generado, imágenes URLs
- API routes `/api/admin/products` (GET list, POST create, GET/:id, PATCH)
- UI admin con Sidebar, Header, ProductTable, ProductForm
- 63 tests pasando, lint/typecheck/build OK

- Próxima: Fase 7.3 — Stock Management

⚠️ **Deuda técnica conocida**: `better-sqlite3` puede crashear en `npm run dev` durante HMR (crash nativo intermitente, no afecta producción/build/tests). Ver `TIMELINE.md`.

⚠️ **Docker + native addon**: `better-sqlite3` requiere compilar en entorno consistente (builder y runner mismo libc). Ver `TIMELINE.md`.

## Requisitos

- Docker y Docker Compose
- Node.js 20+ y npm (para desarrollo local)
- Git

## Instalación

### Con Docker (Recomendado para producción)

```bash
# Clonar el repositorio
git clone <repo-url>
cd ceramica-store

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# Levantar la aplicación
docker compose up --build

# La aplicación estará disponible en http://localhost:3000
```

> **Nota**: El build Docker usa multi-stage (Debian para compilar, Alpine para runtime). Para producción se recomienda usar `node:20-slim` (Debian) consistentemente en builder y runner para evitar problemas con `better-sqlite3` nativo.

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Ejecutar migraciones
npm run db:migrate

# Iniciar servidor de desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:3000
```

## Variables de Entorno

| Variable | Descripción | Requerida | Default |
|----------|-------------|-----------|---------|
| `DATABASE_PATH` | Ruta al archivo SQLite | Sí | `/app/data/ceramica.db` |
| `SESSION_SECRET` | Secreto para firmar cookies de sesión (32+ chars) | Sí | - |
| `CART_SECRET` | Secreto para firmar cookies del carrito | Sí | Usa `SESSION_SECRET` |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago | Para pagos | - |
| `MP_PUBLIC_KEY` | Public Key de Mercado Pago | Para pagos | - |
| `MP_WEBHOOK_SECRET` | Secret para verificar webhooks de MP | Para pagos | - |
| `MP_SANDBOX` | `true` para sandbox, `false` para producción | No | `true` |
| `EMAIL_PROVIDER` | Proveedor de email: `console`, `resend`, `smtp` | No | `console` |
| `RESEND_API_KEY` | API Key de Resend | Si usa Resend | - |
| `SMTP_HOST` | Host SMTP | Si usa SMTP | - |
| `SMTP_PORT` | Puerto SMTP | Si usa SMTP | - |
| `SMTP_USER` | Usuario SMTP | Si usa SMTP | - |
| `SMTP_PASS` | Password SMTP | Si usa SMTP | - |
| `SMTP_FROM` | Email remitente | Si usa SMTP | - |
| `NODE_ENV` | Entorno: `development`, `production` | No | `development` |
| `BASE_URL` | URL pública de la aplicación | En producción | `http://localhost:3000` |

## Docker

### Levantar la aplicación

```bash
docker compose up --build
```

Esto:
1. Construye la imagen multi-stage (builder Debian + runner Alpine)
2. Crea volúmenes persistentes para datos y backups
3. Inicia la aplicación en puerto 3000

### Detener la aplicación

```bash
docker compose down
```

### Ver logs

```bash
docker compose logs -f
```

### Persistencia de Datos

Los datos se guardan en volúmenes Docker:
- `ceramica-data`: Base de datos SQLite (`/app/data/ceramica.db`)
- `ceramica-backups`: Backups automáticos (`/app/backups/`)

Los datos persisten entre reinicios del contenedor.

### ⚠️ Consideración: better-sqlite3 (addon nativo)

`better-sqlite3` compila un módulo nativo (`.node`). El entorno de **compilación** y **runtime** deben ser compatibles (mismo libc, misma versión Node):

- **Actual**: builder usa Debian (glibc), runner usa Alpine (musl) → los artefactos `.node` no son compatibles entre sí.
- **Producción**: usar `node:20-slim` (Debian) en **ambas** etapas (builder + runner) para consistencia, o compilar dentro del mismo Alpine target con headers Node coincidentes.
- **Desarrollo local**: `npm run dev` funciona correctamente en el host.

## Desarrollo Local

### Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con hot reload
npm run dev

# Verificación de tipos TypeScript
npm run typecheck

# Linting con ESLint
npm run lint

# Build de producción
npm run build

# Ejecutar tests unitarios e integración
npm run test

# Tests en modo watch
npm run test:watch

# Tests E2E con Playwright
npm run test:e2e

# Ejecutar migraciones de base de datos
npm run db:migrate
```

### Base de Datos

La base de datos SQLite se encuentra en `data/ceramica.db` (desarrollo) o `/app/data/ceramica.db` (Docker).

#### Migraciones

```bash
# Ejecutar migraciones pendientes
npm run db:migrate
```

Las migraciones se encuentran en `src/infrastructure/database/sqlite/migrations/` y se ejecutan en orden alfabético.

#### Crear BD desde Cero

```bash
# Eliminar BD existente
rm -rf data/

# Recrear y migrar
npm run db:migrate
```

#### Preservar Datos

Los datos se guardan en el archivo SQLite. Para backup manual:

```bash
# Backup manual
cp data/ceramica.db backups/ceramica-backup-$(date +%Y%m%d).db
```

## Autenticación

### Páginas de Autenticación (UI)

- `GET /login` — Página de inicio de sesión (formulario email + password)
- `GET /registro` — Página de registro (formulario nombre + email + password)

Ambas páginas consumen las APIs REST documentadas abajo.

### Registro de Usuario

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "name": "Nombre Usuario"
}
```

Respuesta exitosa (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "CUSTOMER"
  },
  "redirect": "/"
}
```

Cookie `session_id` se establece automáticamente (HttpOnly, Secure, SameSite=Lax, 7 días).

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```

Respuesta exitosa (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "CUSTOMER"
  },
  "redirect": "/"
}
```

### Logout

```bash
POST /api/auth/logout
```

Respuesta exitosa (200):
```json
{ "ok": true }
```

Cookie `session_id` se elimina.

### Bootstrap ADMIN

El primer usuario que se registra automáticamente obtiene el rol `ADMIN`. Esto es atómico y seguro contra condiciones de carrera.

- Primer registro → `role = 'ADMIN'`
- Registros posteriores → `role = 'CUSTOMER'`

### Protección de Rutas

El middleware protege:
- `/admin/*` - Solo usuarios con rol `ADMIN`
- `/api/admin/*` - Solo usuarios con rol `ADMIN`

Usuarios sin sesión → Redirect a `/login`
Usuarios `CUSTOMER` en rutas admin → Redirect a `/`

### Variables de Entorno de Auth

| Variable | Descripción |
|----------|-------------|
| `SESSION_SECRET` | Secreto para firmar cookies (mínimo 32 chars, generar con `openssl rand -hex 32`) |

## Carrito de Compras

El carrito se maneja via cookie firmada (`cart`) en el cliente.

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/cart` | Obtener carrito actual |
| `POST` | `/api/cart/items` | Agregar item `{ productId, quantity }` |
| `PATCH` | `/api/cart/items/:productId` | Actualizar cantidad `{ quantity }` |
| `DELETE` | `/api/cart/items/:productId` | Eliminar item |
| `DELETE` | `/api/cart` | Vaciar carrito |

### Cookie del Carrito

- Nombre: `cart`
- Firmada con `CART_SECRET` (o `SESSION_SECRET`)
- Atributos: `HttpOnly=false`, `Secure`, `SameSite=Lax`, `Max-Age=7d`
- Formato: `{ version: number, items: CartItem[] }`
- `CartItem = { productId, quantity, unitPriceCents }`

## Health Check

```bash
GET /api/health
```

Respuesta exitosa:
```json
{
  "status": "ok",
  "timestamp": "2026-08-22T10:00:00.000Z"
}
```

Verifica que la base de datos esté accesible.

## Testing

### Tests Unitarios e Integración

```bash
npm run test
```

Tests incluidos:
- **Auth**: Registro, login, logout, bootstrap ADMIN, concurrencia
- **Cart**: Agregar, actualizar, eliminar, validación stock, serialización
- **Order**: Crear orden atómica, stock decrement, snapshot histórico

### Tests E2E (Playwright)

```bash
npm run test:e2e
```

### Property-Based Tests (fast-check)

Incluidos en `npm run test` para lógica de precios, stock e idempotencia.

## Production

### Flujo de Despliegue

```
Git push → Docker build → Container → Volúmenes persistentes
```

### Datos que Deben Persistir

- Base de datos SQLite: `/app/data/ceramica.db`
- Backups: `/app/backups/`
- Imágenes subidas: `/app/public/uploads/` (futuro)

### Checklist Pre-Producción

- [ ] `MP_SANDBOX=false`
- [ ] Credenciales MP de producción válidas
- [ ] Webhook URL actualizada en MP Dashboard
- [ ] `SESSION_SECRET` único y fuerte (32+ chars)
- [ ] `CSP` en modo enforcing
- [ ] Backups funcionando (verificar script)
- [ ] Health check passing
- [ ] DNS propagado + TLS válido

### Rollback

```bash
# Via Docker Compose
docker compose down
git checkout <previous-tag>
docker compose up --build -d

# O via Git revert
git revert <commit>
git push
```

## Estructura del Proyecto

```
ceramica-store/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Register, Login, Logout
│   │   │   ├── cart/          # Cart CRUD
│   │   │   └── health/        # Health check
│   │   ├── middleware.ts      # Auth middleware
│   │   └── page.tsx           # Home page
│   ├── domain/                # Núcleo - Sin deps externas
│   │   ├── db.ts              # Database interface (Kysely)
│   │   ├── types.ts           # Tipos compartidos
│   │   ├── schemas/           # Zod schemas
│   │   └── services/          # Servicios de dominio
│   ├── infrastructure/        # Adaptadores
│   │   └── database/
│   │       └── sqlite/        # SQLite implementation
│   └── presentation/          # UI Components
│       ├── components/
│       ├── hooks/
│       └── lib/               # Utilities (rate-limit, cart-cookie)
├── scripts/
│   └── migrate.ts             # Migration runner
├── src/infrastructure/database/sqlite/migrations/
│   └── 001_initial_schema.sql # Schema inicial
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Licencia

MIT