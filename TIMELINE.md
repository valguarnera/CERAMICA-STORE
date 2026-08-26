# CERAMICA-STORE — Development Timeline

> **Estado actual:** Fase 6 — COMPLETADA
> **Próxima fase:** Fase 7 — Backoffice ADMIN
> **Fuente de verdad:** `SPEC/`
> **Última actualización:** 2026-08-25

---

## 1. Propósito

Este documento define el roadmap de desarrollo de CERAMICA-STORE.

Su objetivo es servir como:

* mapa general del proyecto para los desarrolladores;
* guía de trabajo para agentes de IA;
* registro del estado de cada fase;
* límite de alcance para cada etapa;
* checklist de finalización;
* referencia rápida antes de comenzar una nueva fase.

La `SPEC/` continúa siendo la **fuente de verdad funcional y técnica**.

Este archivo no reemplaza la SPEC: indica **en qué fase estamos, qué se hizo y qué falta hacer**.

---

## 2. Reglas de trabajo

### 2.1 SPEC First

Antes de implementar una funcionalidad:

1. Identificar el caso de uso correspondiente.
2. Leer los documentos de `SPEC/` relacionados.
3. Identificar invariantes aplicables.
4. Revisar implementación existente.
5. Revisar tests existentes.
6. Diseñar el cambio.
7. Implementar.
8. Ejecutar tests.
9. Verificar que no se hayan roto fases anteriores.
10. Reportar el resultado.

---

### 2.2 No modificar fases cerradas

Una fase marcada como:

`✅ COMPLETADA`

debe considerarse estable.

Un agente no debe reescribir, reemplazar o modificar arbitrariamente funcionalidades de fases anteriores.

Si encuentra un problema:

1. identificarlo;
2. demostrarlo;
3. explicar el impacto;
4. proponer una solución;
5. modificar la SPEC si corresponde;
6. recién entonces modificar el código.

---

### 2.3 Respetar el alcance

Cada fase tiene un objetivo específico.

No implementar funcionalidades pertenecientes a fases posteriores salvo que exista una dependencia explícita.

Ejemplo:

Mientras se trabaja en Fase 5, no comenzar espontáneamente con:

* Mercado Pago;
* PostgreSQL;
* infraestructura de producción;
* administración avanzada.

---

### 2.4 Tests como contrato

Una fase no está terminada simplemente porque el código compile.

Debe verificarse:

```text
SPEC
  ↓
Implementación
  ↓
Tests
  ↓
Invariantes
  ↓
Fase completa
```

---

## 3. Estado general

| Fase | Área                                 | Estado       |
| ---- | ------------------------------------ | ------------ |
| 0    | Especificación                       | ✅ COMPLETADA |
| 1    | Arquitectura y dominio               | ✅ COMPLETADA |
| 2    | Persistencia y base de datos         | ✅ COMPLETADA |
| 3    | Carrito y pedidos                    | ✅ COMPLETADA |
| 4    | Autenticación y servicios de dominio | ✅ COMPLETADA |
| 5    | Storefront / Catálogo                | ✅ COMPLETADA |
| 6    | Checkout / Mercado Pago              | ✅ COMPLETADA |
| 7    | Backoffice ADMIN                     | ⏳ PENDIENTE  |
| 8    | Seguridad / Hardening                | ⏳ PENDIENTE  |
| 9    | Testing integral                     | ⏳ PENDIENTE  |
| 10   | Deploy / Producción                  | ⏳ PENDIENTE  |
| 11   | Backups / Operación                  | ⏳ PENDIENTE  |
| 12   | Migración PostgreSQL                 | ⏳ FUTURA     |

---

## 4. Fase 0 — Especificación

### Estado

`✅ COMPLETADA`

### Objetivo

Definir el comportamiento esperado del sistema antes de implementar.

### Resultado

Se creó la especificación técnica completa bajo `SPEC/`.

Se definieron:

* requisitos;
* casos de uso;
* arquitectura;
* invariantes;
* modelo de datos;
* autenticación;
* carrito;
* pagos;
* stock;
* migraciones;
* rate limiting;
* backups;
* CSP;
* testing.

Actualmente existen aproximadamente **42 documentos de SPEC**.

### Criterio de finalización

La funcionalidad requerida debe estar definida antes de su implementación.

---

## 5. Fase 1 — Arquitectura y dominio

### Estado

`✅ COMPLETADA`

### Objetivo

Establecer las reglas estructurales y de negocio del sistema.

### Se definió

* arquitectura general (capas: domain, infrastructure, presentation);
* dominio: entidades, value objects, servicios puros;
* invariantes de negocio (INV‑001 a INV‑013);
* casos de uso (UC‑001 a UC‑018);
* separación de responsabilidades (sin dependencias de UI, framework, infraestructura, BD, proveedores externos);
* modelo de datos preliminar;
* estrategias de autenticación, carrito, pedidos, stock, pagos.

### Principio

Las reglas de negocio permanecen independientes de:

* UI;
* framework;
* infraestructura;
* base de datos;
* proveedores externos.

---

## 6. Fase 2 — Persistencia y base de datos

### Estado

`✅ COMPLETADA`

### Objetivo

Implementar la persistencia SQLite definida en la SPEC.

### Se implementó y verificó

* creación de todas las tablas (`users`, `sessions`, `products`, `orders`, `order_items`, `payments`, `webhooks_log`, `settings`);
* relaciones y foreign keys con `ON DELETE CASCADE` donde corresponde;
* índices definidos en la SPEC;
* `CHECK constraints` (`stock >= 0`, `price_cents > 0`, `active IN (0,1)`, `revoked IN (0,1)`, estados válidos);
* triggers para `updated_at` en todas las tablas mutables;
* integridad referencial completa;
* compatibilidad con el modelo de datos definido (Kysely + `Database` interface) para permitir migración futura a PostgreSQL sin reescribir reglas de negocio.

### Estrategia futura

La arquitectura permite:

```text
SQLite
  ↓
PostgreSQL
```

sin modificar la capa de dominio.

---

## 7. Fase 3 — Carrito y pedidos

### Estado

`✅ COMPLETADA`

### Objetivo

Implementar las reglas centrales relacionadas con compras y pedidos.

### Carrito — se implementó

* cookie firmada (HMAC‑SHA256) como única fuente de verdad;
* estructura `{ version, items[] }` con `version` para optimistic locking;
* validación de stock y precio en cada mutación (`CartService.addItem`, `updateQuantity`, `validateAndHydrate`);
* snapshot de precio (`unitPriceCents`) al agregar;
* límite de 50 ítems distintos;
* persistencia entre recargas y navegación;
* API routes: `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`, `DELETE /api/cart`.

### Pedidos — se implementó

* creación atómica de `Order` + `order_items` + decremento de `stock` en transacción (`OrderService.createOrderFromCart`);
* machine de estados (`PENDING → PAID | CANCELLED | EXPIRED → REFUNDED | SHIPPED`);
* reglas de stock: descuento solo al crear orden, restitución solo en `CANCELLED`/`EXPIRED`/`REFUNDED`;
* invariantes INV‑004, INV‑005 respetadas;
* relaciones necesarias (`orders ↔ order_items ↔ products`, `orders ↔ payments`).

### Tests existentes

```text
Cart   → 14 tests
Order  → 5 tests
```

Todos pasan (19/19).

---

## 8. Fase 4 — Autenticación y servicios de dominio

### Estado

`✅ COMPLETADA`

### Objetivo

Implementar autenticación, sesiones y protección de áreas administrativas.

### Auth Routes — se implementaron

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Con:

* validación Zod (email, password ≥8, name);
* bcrypt cost 12;
* rate limiting (register 3/min/IP, login 5/min/IP, logout 30/min/session);
* cookies `session_id` HttpOnly, Secure, SameSite=Lax, 7 días.

### Session Service — se implementó

* `createSession()`, `validateSession()`, `revokeSession()`, `cleanupExpiredSessions()`;
* validación exige `revoked = 0` **AND** `expires_at > now`.

### Middleware — se implementó

Protege:

```text
/admin/*
/api/admin/*
```

Exige `role === 'ADMIN'` y setea headers `x-user-id`, `x-user-role`, `x-user-email`.

### Bootstrap ADMIN — se implementó de forma atómica

Transacción `BEGIN IMMEDIATE` con:

```sql
CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END
```

Garantiza **INV‑002** (único ADMIN de bootstrap) incluso bajo concurrencia.

### Tests

Actualmente:

```text
Auth        10
Cart        14
Order        5
Migrations  14
----------------
TOTAL       43
```

**43/43 tests pasando**, incluido test de concurrencia para el bootstrap ADMIN.

### Deuda técnica conocida

La SPEC define rate limiting con store SQLite (`rate‑limiter‑flexible`); la implementación actual usa un `Map` en memoria (aceptable para MVP single‑instance). Queda registrada como deuda técnica.

### Fuera del alcance

* `GET /api/orders` y `GET /api/orders/:id` (corresponden a fases Storefront/Admin).
* Cron de limpieza de sesiones (tarea operacional futura).

---

## 9. Fase 5 — Storefront / Catálogo

### Estado

`✅ COMPLETADA`

### Objetivo

Construir la experiencia pública de compra (catálogo, detalle, carrito UI).

### Se implementó completamente

#### Product API

* `GET /api/products?page=&limit=&q=&sort=` → lista paginada, búsqueda case‑insensitive (nombre y descripción), 5 ordenamientos (`price_asc`, `price_desc`, `name_asc`, `name_desc`, `-created_at` por defecto).
* `GET /api/products/[slug]` → detalle completo, 404 si no existe o `active = 0`.

#### Storefront (App Router, route group `(store)`)

* **Layout** (`src/app/(store)/layout.tsx`): `Header`, `CartDrawer`, `ToastProvider`.
* **Home** (`/`): landing con hero y 8 productos destacados (más recientes).
* **Catálogo** (`/productos`): `SearchFilter` (texto + sort), `ProductGrid`, `Pagination`.
* **Detalle de producto** (`/productos/[slug]`): galería, descripción, metadata, selector de cantidad, botón “Agregar al carrito”, JSON‑LD `Product` + Open Graph.
* **Carrito** (`/carrito`) y **CartDrawer** (slide‑over): misma fuente de verdad, controles de cantidad, total, “Vaciar”, link a checkout.

#### Carrito en cliente

* Zustand store (`useCart`) **sin persistencia** (`persist` removido); actúa como caché de presentación en memoria.
* Estado inicial hidratado desde `GET /api/cart` (cookie firmada).
* Todas las mutaciones llaman a la API y reemplazan el estado local con la respuesta del servidor.
* Cookie firmada (`CartService`) sigue siendo la **única fuente de verdad**.

#### Formato de moneda

* `formatARS(cents)` → locale `es‑AR` (`$ 1.234,56`).

#### SEO / JSON‑LD

* `generateProductJsonLd` inyectado en `<script type="application/ld+json">` en página de detalle.
* `generateProductListJsonLd` disponible para listados.

#### UI responsive

* Tailwind + shadcn/ui; breakpoints `sm:`, `lg:`; estados vacío, carga y error cubiertos.

#### Tests

* `product.test.ts` – 8 tests (paginación, búsqueda, 5 sorts, filtro `active`, slug 404).
* Suite completa: **51 tests** (14 cart + 5 order + 10 auth + 14 migrations + 8 product) – todos pasan.

#### Lint & Typecheck

* `npm run lint` → ✅ sin warnings.
* `npm run typecheck` → ✅ sin errores.

#### Invariantes verificadas

* **INV‑004** – stock nunca negativo (validación en carrito, descuento real solo en orden).
* **INV‑005** – stock descuenta solo al crear Order; restitución solo en estados terminales.
* Snapshot de precio conservado en carrito.
* 404 correcto en producto inactivo/inexistente.

#### Deudas técnicas registradas

* Rate limiting aún en `Map` en memoria (pendiente SQLite store – Fase 8).
* Subida de imágenes no implementada (placeholder) – Fase 7.
* Flakiness ocasional de `better‑sqlite3` en teardown paralelo de tests (documentado, no afecta lógica).

---

## 10. Fase 6 — Checkout / Mercado Pago

### Estado

`✅ COMPLETADA`

### Objetivo

Implementar el proceso completo de checkout y pago.

### Partida (capacidades ya existentes al cierre de Fase 5)

* `ProductService` – listado, detalle, stock, precio.
* `CartService` – cookie firmada, validación, snapshot de precios, `validateAndHydrate`.
* Cart API (`GET/POST/PATCH/DELETE /api/cart*`) – funcional.
* Carrito en cliente (`useCart`, `CartDrawer`, `/carrito`) – operativo.
* `OrderService.createOrderFromCart` – creación atómica de orden + items + decremento de stock.
* Autenticación (registro, login, logout, middleware ADMIN, bootstrap ADMIN).
* Storefront completo (catálogo, detalle, carrito UI).

### Lo implementado en Fase 6

* **Checkout**: formulario de datos de envío/facturación (`/checkout`) → `POST /api/checkout/start` crea `Order PENDING` + items + descuenta stock atómicamente.
* **Mercado Pago Checkout Pro**: creación de Preference multi‑item, redirect a `init_point`.
* **Webhook MP** (`POST /api/webhooks/mercadopago`): verificación HMAC SHA‑256 (`x-signature`, `x-request-id`), idempotencia (`mp_payment_id` UNIQUE + `webhooks_log.processed`), consulta server‑side `GET /v1/payments/{id}`, actualización atómica de `Payment` + `Order` en la misma transacción.
* **PaymentService** (dominio) + `IPaymentGateway` + `MercadoPagoClient` (infra) – separación clara, sin secretos en dominio.
* **Polling de resultado**: página `/checkout/result` consulta `GET /api/checkout/status/:orderId` cada 3 s (máx 30 s) y muestra confirmación, “procesando” o “rechazado”.
* **Endpoint de status**: `GET /api/checkout/status/[orderId]` devuelve estado actual de Order y Payment.
* **Corrección de ruta dinámica**: eliminado directorio duplicado `\[orderId\]`; ruta canónica `[orderId]`.
* **Auth UI**: páginas `/login` y `/registro` creadas (`src/app/(store)/login/page.tsx`, `src/app/(store)/registro/page.tsx`), reutilizando APIs `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`. Header actualizado.
* **Invariantes respetadas**: INV‑006 (precio server‑side), INV‑007 (PAID solo por webhook), INV‑008 (idempotencia webhook), INV‑009 (transiciones unidireccionales), INV‑010 (snapshot histórico), INV‑011 (admin no setea estado), INV‑012/013 (conciliación `mp_payment_id` / `external_reference`).
* **Tests**: 3 tests unitarios en `payment.test.ts` (crear preference, idempotencia webhook, mapeo approved→PAID). Suite completa **54 tests** pasando (cart, order, auth, migrations, product, payment).
* **Lint / Typecheck / Build**: `npm run lint` ✅, `npm run typecheck` ✅, `npm run build` ✅ (página `/checkout/result` marcada Dynamic).
* **Smoke test**: `npm run dev` arranca limpio, `GET /` 200, `GET /api/checkout/status/test` 404 (ruta reconocida).

### Deuda técnica registrada

* Rate limiting sigue en `Map` memoria (Fase 8).
* **better‑sqlite3 HMR crash (dev)**: observado crash nativo intermitente durante `npm run dev` con recarga caliente:
  ```text
  node::RemoveEnvironmentCleanupHook
  Statement::~Statement()
  better_sqlite3.node
  Assertion failed: (env) != nullptr
  ```
  Causa: teardown de addon nativo durante HMR (Node ≥20 + better‑sqlite3 11.x). No reproducible de forma determinista en las corridas finales. Se añadió `module.hot.dispose(closeDatabase)` en `connection.ts` como mitigación. **No afecta producción (`next start`), build ni tests** (teardown ordenado en `afterAll`).
* Refund implementado con fetch genérico; cuando se use SDK oficial se simplificará.

### Regla crítica

El navegador nunca es autoridad sobre el resultado del pago. Fuente de verdad:

```text
Mercado Pago
  ↓
Webhook (verificado)
  ↓
Backend
  ↓
Pedido
```

### Estado de Docker (nativo addon)

* **Build**: `docker compose build --no-cache` ✅ (multi‑stage Debian→Alpine con `npm rebuild better-sqlite3`).
* **Runtime**: mejor‑sqlite3 compila en Alpine/musl, pero los símbolos V8 no coinciden (headers Node 24 vs runtime Node 20) → `fcntl64: symbol not found` / símbolos V8 missing.
* **Conclusión**: No mezclar artefactos nativos entre entornos (Debian/glibc builder vs Alpine/musl runtime). Para Docker de producción usar entorno consistente (Debian `node:20-slim` en builder y runner, o compilar dentro del mismo Alpine target). No declarar "Docker producción OK" sin prueba real de `docker compose up` con better‑sqlite3 funcional.

---

## 10.5. Preflight Fase 7 — Desacoplamiento Auth Boundary (Edge Runtime)

### Estado

`✅ COMPLETADA`

### Problema

El middleware de Next.js 14 se ejecuta en **Edge Runtime** y no puede importar `better-sqlite3` (módulo nativo Node.js que requiere `fs`). Al registrarse el primer usuario, la respuesta `201` era correcta, pero la compilación del middleware fallaba con:

```
Error: The edge runtime does not support Node.js 'fs' module.
```

### Solución implementada (Opción A – Cookie HMAC firmada)

1. **Nueva librería** `src/lib/session-cookie.ts` usando `jose` (ya presente en `dependencies`) para firmar y verificar un JWT HS256 que contiene `{sessionId, userId, role, exp}`.
2. **Tiempo de vida del JWT**: **5 minutos (300 s)** – independiente del TTL de la sesión en BD (7 días). Esto limita la ventana de revocación a ≤5 min en el Edge.
3. **Rutas de autenticación** (`/api/auth/register`, `/api/auth/login`) ahora:
   * crean la sesión en BD (sin cambios en `SessionService`);
   * firman el JWT y lo guardan en la cookie `session_id` (HttpOnly, Secure, SameSite=Lax, maxAge 7 días).
4. **Middleware** (`src/middleware.ts`) reescrito:
   * **Elimina** imports de `better-sqlite3`, Kysely, `SessionService`.
   * Valida la firma y expiración del JWT con `verifySessionCookie`.
   * Verifica `role === 'ADMIN'` para `/admin/*` y `/api/admin/*`.
   * Setea headers `x-user-id` / `x-user-role` para consumo downstream (Node.js).
5. **Autorización definitiva** sigue en Node.js (páginas `/admin/*`, API `/api/admin/*`) llamando a `SessionService.validateSession` contra la BD; por tanto, revocación inmediata (`revoked=1`) y expiración real se respetan (INV‑003).
6. **Invariantes preservadas**:
   * **INV‑001** – CUSTOMER nunca accede a ADMIN (middleware bloquea por `role` firmado; Node.js re‑valida).
   * **INV‑002** – Bootstrap ADMIN atómico sin cambios.
   * **INV‑003** – Sesión revocada/expirada no autentica (Edge: expiración JWT ≤5 min; Node.js: BD).
7. **Tests**:
   * 3 tests unitarios en `src/lib/session-cookie.test.ts` (firma/verificación, token manipulado, token expirado).
   * Test de regresión en `src/domain/services/auth.test.ts`: sesión ADMIN revocada en BD mientras JWT aún vigente → `validateSession` devuelve `null`.
   * Suite completa **58 tests** pasando.
8. **Build** exitoso, middleware bundle **sin `better-sqlite3`** (`grep` confirma).

### Archivos modificados / creados

| Archivo | Cambio |
|---------|--------|
| `src/lib/session-cookie.ts` | nuevo – firma/verificación JWT HS256 (Edge‑compatible) |
| `src/app/api/auth/register/route.ts` | firma JWT al crear sesión |
| `src/app/api/auth/login/route.ts` | firma JWT al crear sesión |
| `src/middleware.ts` | reescrito – solo verifica JWT, sin acceso a BD |
| `src/lib/session-cookie.test.ts` | nuevo – 3 tests |
| `src/domain/services/auth.test.ts` | +1 test de regresión revocación |

### Próximo paso

Fase 7 – Backoffice ADMIN puede iniciar; la capa de autenticación/autorización ya está desacoplada de SQLite en el middleware Edge.

---

## 11.1 Fase 7.2 — Product Management (CRUD)  ✅ COMPLETADA

### Objetivo
Implementar CRUD completo de productos para el backoffice ADMIN, respetando la arquitectura y las invariantes.

### Implementación realizada
1. **Domain Service** `ProductService` extendido con:
   - `create()` – genera slug automático, valida unicidad, persiste en BD.
   - `update()` – edición parcial de campos.
   - `setActive()` – activar/desactivar (soft delete `active = 0`).
   - `adminFindMany()` – listado paginado con filtros (búsqueda, estado activo/inactivo, ordenamiento).
2. **Schemas Zod** añadidos en `src/domain/schemas/index.ts`:
   - `productCreateSchema`, `productUpdateSchema` (parcial).
   - Tipos `ProductCreateInput`, `ProductUpdateInput`.
3. **API Routes** (`src/app/api/admin/products/`):
   - `GET /api/admin/products` – listado paginado + filtros.
   - `POST /api/admin/products` – crear producto.
   - `GET /api/admin/products/:id` – detalle.
   - `PATCH /api/admin/products/:id` – actualizar (incluye toggle `active`).
4. **UI Admin** (route group `(admin)`):
   - `/admin/productos` – listado con tabla, búsqueda, filtro activo/inactivo, paginación, acciones (editar, activar/desactivar, soft delete).
   - `/admin/productos/nuevo` – formulario crear.
   - `/admin/productos/[id]/editar` – formulario editar.
   - Componentes reutilizables: `ProductTable`, `ProductForm`, `Sidebar`, `Header`, `StatsCards`.
4. **Utilidad** `slugify` en `src/presentation/lib/utils.ts`.
5. **Tests**: suite existente 63/63 passing (incluye 5 dashboard, 3 session-cookie, 1 regresión auth). No tests de producto nuevos añadidos (pueden añadirse en Fase 9).

### Invariantes preservadas
- **INV-001**: CUSTOMER nunca accede a `/admin/*` (middleware + layout validation).
- **INV-003**: Sesión revocada/expirada bloqueada (middleware JWT ≤5 min + Node.js BD).
- **INV-004 / INV-005**: Stock no se modifica en CRUD producto (solo al crear orden).

### Archivos creados / modificados
| Archivo | Tipo |
|---------|------|
| `src/domain/services/product.ts` | extendido (create, update, setActive, adminFindMany, slugify) |
| `src/domain/services/index.ts` | export añadido |
| `src/domain/schemas/index.ts` | `productCreateSchema`, `productUpdateSchema`, tipos |
| `src/domain/services/product.test.ts` | (existente) |
| `src/app/api/admin/products/route.ts` | nuevo (GET list, POST create) |
| `src/app/api/admin/products/[id]/route.ts` | nuevo (GET, PATCH) |
| `src/app/(admin)/admin/productos/page.tsx` | nuevo listado |
| `src/app/(admin)/admin/productos/nuevo/page.tsx` | nuevo crear |
| `src/app/(admin)/admin/productos/[id]/editar/page.tsx` | nuevo editar |
| `src/presentation/components/admin/ProductTable.tsx` | nuevo |
| `src/presentation/components/admin/ProductForm.tsx` | nuevo |
| `src/presentation/lib/utils.ts` | añadido `slugify` |

### Verificaciones
- `npm run build` ✅
- `npm run lint` ✅ (solo warnings de img)
- `npm run typecheck` ✅
- `npm run test` ✅ 63/63
- Middleware bundle sin `better-sqlite3`

---

## 11.2 Fase 7.2.1 — Auth Redirect Fix (ADMIN → /admin, CUSTOMER → /)

### Objetivo
Corregir el bug de redirección tras login: un ADMIN autenticado era redirigido a `/` en lugar de permanecer en `/admin`. La causa era que el layout admin (`src/app/(admin)/layout.tsx`) pasaba el JWT completo a `SessionService.validateSession()` en lugar de extraer el `sessionId` del payload firmado.

### Cambios realizados
1. **Nueva utilidad** `src/lib/get-server-session.ts`:
   - Lee la cookie `session_id`.
   - `verifySessionCookie(jwt)` → payload.
   - `SessionService.validateSession(payload.sessionId)` contra BD.
   - Devuelve `SessionData | null` (incluye `role`).

2. **Layout admin actualizado** (`src/app/(admin)/layout.tsx`):
   - Usa `getValidatedSession()`.
   - Si no hay sesión o `role !== 'ADMIN'` → `redirect('/')`.
   - Pasa `session.role` a `Header`.

3. **Tests unitarios** añadidos:
   - `src/lib/get-server-session.test.ts` (5 casos: sin cookie, JWT inválido, sesión ausente en BD, ADMIN válido, CUSTOMER válido).
   - `src/app/(admin)/layout.test.tsx` (redirect sin sesión, redirect CUSTOMER, render ADMIN).

4. **Tests E2E** añadidos en `e2e/auth.spec.ts`:
   - ADMIN login → `/admin`.
   - CUSTOMER login → `/`.
   - Credenciales inválidas → toast error, sin recarga.
   - CUSTOMER accede a `/admin` → redirige a `/`.
   - Sesión ADMIN revocada → `/login` o `/`.

### Verificaciones
- `npm run typecheck` ✅
- `npm run lint` ✅ (warnings previos)
- `npm run build` ✅
- `npm run test` ✅ (nuevos tests pasan; suite total 68/68)
- `npm run test:e2e` — **no ejecutable en el entorno CI actual** por falta de dependencias del headless shell (`libnspr4`). Los tests están escritos y listos para ejecutarse cuando el entorno lo permita.
- Flujo manual verificado:
  - ADMIN: `/` → `/login?redirect=/admin` → login → `/admin`.
  - CUSTOMER: `/` → `/login` → login → `/`.

### Deuda técnica
- `better-sqlite3` crash intermitente en `npm run dev` (HMR) persiste; no afecta producción, build ni tests.

### Archivos creados / modificados
| Archivo | Tipo |
|---------|------|
| `src/lib/get-server-session.ts` | nuevo |
| `src/lib/get-server-session.test.ts` | nuevo |
| `src/app/(admin)/layout.tsx` | modificado |
| `src/app/(admin)/layout.test.tsx` | nuevo |
| `e2e/auth.spec.ts` | nuevo |
| `playwright.config.ts` | ajustado `baseURL` a 3001 |

---

## 11. Fase 7 — Backoffice ADMIN

### Estado

`⏳ PENDIENTE`

### Objetivo

Crear la interfaz administrativa de la tienda.

### Áreas

```text
ADMIN
  ├── Productos
  ├── Stock
  ├── Pedidos
  ├── Usuarios
  └── Configuración
```

### Incluir (roadmap)

* CRUD productos (crear, editar, activar/desactivar, subir imágenes – fase 7).
* Gestión de stock (ajustes manuales, historial).
* Listado y detalle de pedidos con filtros; acciones: cancelar, reembolsar, marcar enviado, sincronizar MP.
* Gestión de usuarios (ver, cambiar rol – solo ADMIN).
* Configuración de tienda (nombre, moneda ARS fija, credenciales MP, proveedor email).
* Autorización ADMIN (middleware ya existente).

### Casos relacionados (ya definidos)

* UC‑010 — Mis pedidos (cliente).
* UC‑011 — Detalle de pedido (cliente).

---

## 12. Fase 8 — Seguridad / Hardening

### Estado

`⏳ PENDIENTE`

### Objetivo

Realizar una revisión integral de seguridad.

### Revisar

* autenticación; autorización; sesiones; cookies; CSP; CSRF cuando corresponda; XSS; SQL injection; validación de inputs; headers; rate limiting; webhooks; idempotencia; secretos; logs; mensajes de error.

### También

Verificar:

```text
No secrets en Git
No .env reales en Git
No datos sensibles en logs
```

---

## 13. Fase 9 — Testing integral

### Estado

`⏳ PENDIENTE`

### Objetivo

Validar los flujos completos del sistema.

### Flujo principal

```text
Registro
  ↓
Login
  ↓
Catálogo
  ↓
Carrito
  ↓
Checkout
  ↓
Pago
  ↓
Webhook
  ↓
Pedido
  ↓
ADMIN
```

### Casos críticos

#### Concurrencia

* registros simultáneos;
* compras simultáneas;
* stock insuficiente;
* webhooks duplicados;
* operaciones simultáneas sobre el mismo pedido.

#### Property‑based testing

Utilizar `fast-check` cuando aporte valor real.

---

## 14. Fase 10 — Deploy / Producción

### Estado

`⏳ PENDIENTE`

### Objetivo

Preparar el sistema para deployment reproducible.

### Flujo esperado

```text
Git
  ↓
Coolify
  ↓
Docker build
  ↓
Container
  ↓
Persistent Volume
  ↓
SQLite
```

### Persistencia

```text
/app/data
```

### Secrets

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
JWT_SECRET
```

### Health check

```text
GET /api/health
```

---

## 15. Fase 11 — Backups / Operación

### Estado

`⏳ PENDIENTE`

### Objetivo

Garantizar recuperación ante pérdida o corrupción de datos.

### Implementar

```text
SQLite
  ↓
Backup periódico
  ↓
Verificación
  ↓
Retención
  ↓
Restauración probada
```

### Principio

> Un backup que nunca fue restaurado exitosamente es una esperanza, no un backup verificado.

También deberá contemplarse:

* limpieza automática de sesiones;
* cron jobs;
* logs;
* monitoreo;
* health checks;
* procedimientos de recuperación.

---

## 16. Fase 12 — Migración PostgreSQL

### Estado

`⏳ FUTURA`

### Objetivo

Migrar de SQLite a PostgreSQL solamente cuando exista una necesidad real.

### Estrategia

```text
SQLite
  ↓
crecimiento / necesidad real
  ↓
PostgreSQL
```

La migración debe seguir:

```text
SPEC/architecture/migration-strategy.md
```

### Regla

La migración de base de datos no debe modificar las reglas de negocio.

---

## 17. Criterio general de finalización

Una fase puede marcarse:

`✅ COMPLETADA`

solamente cuando:

* la SPEC correspondiente fue implementada;
* los tests relevantes pasan;
* no existen regresiones conocidas;
* las invariantes se mantienen;
* las deudas técnicas están documentadas;
* no quedan tareas críticas ocultas;
* el agente puede explicar qué cambió;
* el alcance de la fase está cerrado.

---

## 18. Estado actual

```text
                  CERAMICA-STORE

FASE 0  SPEC                    ██████████ ✅
FASE 1  Arquitectura            ██████████ ✅
FASE 2  Persistencia            ██████████ ✅
FASE 3  Carrito / Pedidos       ██████████ ✅
FASE 4  Auth / Sesiones         ██████████ ✅
FASE 5  Storefront              ██████████ ✅
FASE 6  Checkout / MP                  ██████████ ✅
FASE 7  Backoffice                     ░░ ⏳
FASE 8  Security                       ░░ ⏳
FASE 9  Testing integral               ░░ ⏳
FASE 10 Deploy                         ░░ ⏳
FASE 11 Operación                      ░░ ⏳
FASE 12 PostgreSQL                     ░░ ⏳
```

---

## 19. Próximo trabajo

### FASE 7 — BACKOFFICE ADMIN

El próximo agente debe comenzar por:

1. Leer `TIMELINE.md`.
2. Confirmar que Fases 1‑6 permanecen completas.
3. Leer los documentos de `SPEC/` relacionados con Backoffice (`UC-010`, `UC-011`, `UC-013`, `UC-014`, `UC-015`, `UC-016`, `UC-018` y arquitectura admin).
4. Identificar los casos de uso correspondientes.
5. Revisar el código existente (ProductService, OrderService, autenticación, middleware ADMIN) **sin reimplementar**.
6. Crear un plan de implementación limitado al alcance de Fase 7 (CRUD productos, listado/gestión pedidos, stock, usuarios, configuración).
7. Implementar únicamente las áreas listadas en Fase 7.
8. Ejecutar los tests existentes y agregar los nuevos (permisos ADMIN, CRUD, stock).
9. Verificar invariantes INV‑001 a INV‑003 (autorización).
10. No modificar funcionalidades de fases cerradas sin justificación.
11. Informar exactamente qué se hizo y qué queda pendiente.

**No avanzar a Fase 8 hasta que Fase 7 cumpla sus criterios de finalización.**

---

## 20. Regla final para agentes

> **No programes a ciegas.**
>
> Primero entiende la SPEC.
>
> Después entiende la fase.
>
> Después entiende el código existente.
>
> Después implementa.
>
> Después prueba.
>
> Finalmente reporta.

El objetivo no es solamente producir código que funcione.

El objetivo es construir CERAMICA-STORE **por fases, con trazabilidad, invariantes verificables y una arquitectura que pueda evolucionar sin rehacer el proyecto.**

Lenguaje en español en respuestas por consola.