PROYECTO: CERAMICA-STORE

REPOSITORIO:
CERAMICA-STORE

STACK ACTUAL:
- Next.js 14.2.35
- TypeScript
- React
- Tailwind
- shadcn/ui / Radix
- Kysely
- SQLite
- better-sqlite3
- Zod
- jose
- Vitest
- Playwright
- Docker
- sharp (generación de thumbnails)

ARQUITECTURA:
- Domain Services
- API Routes Node.js
- Presentation/UI
- SQLite como persistence layer
- DB como SOURCE OF TRUTH para sesiones

ESTADO:
- Fases 1–6 implementadas.
- Fase 7.1 Admin Shell + Dashboard implementada.
- Fase 7.2 Product Management implementada.
- **Ajustes UX y imágenes (reciente): botón Desactivar corregido, galería thumbnails, upload con estructura fecha/UUID + thumbnails sharp, navegación ADMIN ↔ público, normalización URLs locales.**
- Fase 7.3 NO debe comenzar todavía.

AUTH ACTUAL:
- Login/Register crean sesión persistida en DB.
- session_id contiene JWT HS256 firmado mediante jose.
- JWT TTL: 5 minutos.
- Cookie HttpOnly, SameSite=Lax, Secure en producción.
- Middleware corre en Edge y NO accede a SQLite.
- Middleware solamente prevalida firma, expiración y role.
- Layout/API Node.js realizan validación definitiva mediante SessionService.validateSession() contra DB.
- DB continúa siendo source of truth.
- CUSTOMER no puede acceder a ADMIN.
- ADMIN puede acceder a /admin.
- Logout revoca sesión en DB y elimina cookie.

RUTAS ADMIN:
- /admin
- /admin/productos
- /admin/stock
- /admin/pedidos
- /admin/usuarios
- /admin/configuracion

IMPORTANTE:
El proyecto tiene además un problema conocido con better-sqlite3 + Next.js 14 `next dev`/HMR:
`Assertion failed: (env) != nullptr`
relacionado con `Statement::~Statement()`.

Existe una mitigación mediante singleton global, pero el crash nativo puede continuar de forma intermitente durante desarrollo.
NO confundir este problema del entorno de desarrollo con errores funcionales de autenticación.

RUNTIME ACTUAL:
- Node.js 22 LTS (`.nvmrc` 22.17.0, Docker `node:22-slim`).
- Node 24 NO soportado para desarrollo por incompatibilidad better-sqlite3 (crash HMR).
- Node 20 válido en Docker, pero baseline oficial es Node 22.

COMMIT:
El estado anterior ya fue guardado en Git.
Trabajar sobre este estado y preservar los cambios existentes.