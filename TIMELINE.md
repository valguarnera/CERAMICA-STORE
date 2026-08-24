# CERAMICA-STORE — Development Timeline

> **Estado actual:** Fase 5 — COMPLETADA
> **Próxima fase:** Fase 6 — Checkout / Mercado Pago
> **Fuente de verdad:** `SPEC/`
> **Última actualización:** 2026-08-24

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
| 6    | Checkout / Mercado Pago              | ⏳ PRÓXIMA    |
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

`⏳ PRÓXIMA`

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

### Alcance de la Fase 6 (no repetir lo anterior)

* Checkout: formulario de datos de envío/facturación, creación de orden `PENDING`.
* Preferencia Mercado Pago (multi‑item) → redirect a Checkout Pro.
* Webhook MP (`/api/webhooks/mercadopago`): verificación HMAC, idempotencia (`mp_payment_id` UNIQUE + `webhooks_log`), actualización de `Order`/`Payment` solo vía webhook validado.
* Páginas de resultado (`/checkout/success`, `/checkout/failure`, `/checkout/pending`).
* Sincronización manual desde backoffice (botón “Sincronizar” → consulta MP API).
* Tests de idempotencia, webhooks duplicados, fuera de orden, transiciones de estado.

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
FASE 6  Checkout / MP                  ░░ ⏳
FASE 7  Backoffice                     ░░ ⏳
FASE 8  Security                       ░░ ⏳
FASE 9  Testing integral               ░░ ⏳
FASE 10 Deploy                         ░░ ⏳
FASE 11 Operación                      ░░ ⏳
FASE 12 PostgreSQL                     ░░ ⏳
```

---

## 19. Próximo trabajo

### FASE 6 — CHECKOUT / MERCADO PAGO

El próximo agente debe comenzar por:

1. Leer `TIMELINE.md`.
2. Confirmar que Fases 1‑5 permanecen completas.
3. Leer los documentos de `SPEC/` relacionados con Checkout y MP (`payment-model.md`, `mp-integration.md`, `UC-005`, `UC-006`, `UC-007`, `UC-017`).
4. Identificar los casos de uso correspondientes.
5. Revisar el código existente (ProductService, CartService, Cart API, OrderService, autenticación, Storefront) **sin reimplementar**.
6. Crear un plan de implementación limitado al alcance de Fase 6.
7. Implementar únicamente checkout, preferencia MP, webhook, páginas de resultado y sincronización.
8. Ejecutar los tests existentes y agregar los nuevos (idempotencia, webhooks, transiciones).
9. Verificar invariantes INV‑006 a INV‑013.
10. No modificar funcionalidades de fases cerradas sin justificación.
11. Informar exactamente qué se hizo y qué queda pendiente.

**No avanzar a Fase 7 hasta que Fase 6 cumpla sus criterios de finalización.**

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