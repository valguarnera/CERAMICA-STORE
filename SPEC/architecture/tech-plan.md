# CERAMICA-STORE — Plan Técnico Final (Post-Revisión Adversarial)

## 1. Casos de Uso (Resumen)

### Público (sin auth)
| ID | Caso de Uso |
|---|---|
| UC-001 | Ver catálogo (paginado, filtros) |
| UC-002 | Ver producto (detalle, stock, imágenes) |
| UC-003 | Agregar al carrito |
| UC-004 | Modificar carrito (cantidades, eliminar) |
| UC-005 | Comprar sin registrarse (guest checkout) |
| UC-006 | Iniciar checkout → crear preferencia MP |
| UC-007 | Pagar con Mercado Pago (Checkout Pro multi-item) |

### Cliente registrado
| UC-008 | Registrarse | UC-009 | Iniciar sesión (session cookie httpOnly) |
| UC-010 | Ver sus pedidos | UC-011 | Ver detalle de pedido |

### Administrador (primer usuario = ADMIN)
| UC-012 | Primer registro → ADMIN auto (transacción IMMEDIATE atómica) | UC-013 | CRUD productos |
| UC-014 | Generar link pago MP producto | UC-015 | Ver pedidos con filtros |
| UC-016 | Detalle pedido + estado pago | UC-017 | Sincronizar estado pago manual |
| UC-018 | Configuración (tienda, MP credentials, email provider) |

---

## 2. Arquitectura — Simplificada (Sin Sobreingeniería)

```
src/
├── app/
│   ├── (store)/           # SPA - Storefront público
│   │   ├── page.tsx
│   │   ├── productos/[slug]/
│   │   ├── carrito/       # Client component (Zustand - solo vista)
│   │   └── checkout/
│   ├── (admin)/           # SSR - Backoffice
│   │   ├── layout.tsx     # Auth guard (session DB) + sidebar
│   │   ├── productos/     # CRUD
│   │   ├── pedidos/
│   │   └── configuracion/
│   └── api/               # API Routes
│       ├── auth/
│       ├── products/
│       ├── orders/
│       ├── payments/
│       └── webhooks/
├── domain/                # Núcleo - Sin deps externas
│   ├── types.ts           # Product, Order, User, Cart, Payment, Session (interfaces)
│   ├── db.ts              # Database interface (Kysely<Database>)
│   ├── schemas/           # Zod schemas (compartidos client/server)
│   └── services/          # Funciones puras: createOrder, handleWebhook, addToCart, etc.
├── infrastructure/        # Adaptadores
│   ├── database/
│   │   ├── sqlite/
│   │   │   ├── schema.sql
│   │   │   ├── migrations/
│   │   │   └── connection.ts   # createKysely<Database>(sqlite)
│   │   └── postgres/           # (futuro) createKysely<Database>(pg)
│   ├── auth/               # session.ts (create, validate, revoke)
│   ├── payments/mercadopago/ # client, preferences, webhook
│   ├── email/              # EmailProvider + implementations
│   └── content/            # MDXLoader (no Keystatic)
└── presentation/          # UI Components
    ├── components/
    │   ├── store/
    │   ├── admin/
    │   └── shared/        # shadcn/ui primitives
    ├── hooks/
    └── lib/
```

**Patrones Mantenidos**: Service Layer (funciones puras), Database Interface (para migración PG)
**Patrones Eliminados**: Repository Pattern, DI Manual, Domain Events, Entities separados

---

## 3. Modelo de Datos (SQLite)

Ver `SPEC/architecture/data-model.md` — Esquema completo con:
- `users`, `sessions`, `products`, `orders`, `order_items` (snapshot histórico), `payments`, `webhooks_log`, `settings`
- Cardinalidad: Order 1 ───── 0..1 Payment (UNIQUE `payments.order_id`)
- Estados Order: `PENDING` → `PAID`/`CANCELLED`/`EXPIRED` → `REFUNDED`/`SHIPPED`
- Estados Payment: `pending` → `approved`/`rejected`/`cancelled` → `refunded`
- Constraints: `stock >= 0`, `mp_payment_id` UNIQUE, `webhooks_log.mp_resource_id` UNIQUE

---

## 4. Autenticación / Autorización — Sesiones DB

### Estrategia: Cookie opaca + Tabla `sessions`
```
Login → bcrypt.verify → INSERT sessions → Cookie session_id (HttpOnly, Secure, SameSite=Lax, 7d)
Middleware → SELECT sessions JOIN users WHERE id=? AND revoked=0 AND expires_at>now()
Logout → UPDATE sessions SET revoked=1
```

### Bootstrap ADMIN Atómico
```sql
BEGIN IMMEDIATE;
INSERT INTO users (...) SELECT ..., CASE WHEN (SELECT COUNT(*) FROM users)=0 THEN 'ADMIN' ELSE 'CUSTOMER' END, ...;
COMMIT;
```
- Race condition imposible (lock archivo SQLite)
- No endpoint "claim admin" público

### Rate Limiting Auth
- `/api/auth/register`: 3 req/min/IP
- `/api/auth/login`: 5 req/min/IP

---

## 5. Carrito — Cookie Firmada (Única Fuente de Verdad)

| Aspecto | Definición |
|---|---|
| **Estructura** | `{ version: number, items: [{ productId, quantity, unitPriceCents }] }` |
| **Fuente verdad** | Cookie firmada `cart` (HMAC-SHA256, `SESSION_SECRET`) |
| **Zustand** | Solo vista (hidrata de `GET /api/cart`, mutaciones → API → `router.refresh()`) |
| **Validación checkout** | Server recalcula TODO desde BD (stock, precios, active) en transacción |

---

## 6. Mercado Pago — Checkout Pro + Webhooks Idempotentes

### Credenciales (SOLO SERVER)
```env
MP_ACCESS_TOKEN=APP_USR-xxxxx
MP_WEBHOOK_SECRET=whsec_xxxxx
MP_SANDBOX=true
```

### Reglas Inquebrantables
- ✅ **Nunca** confiar en precio/cliente
- ✅ **Nunca** marcar `PAID` por redirect
- ✅ **Siempre** validar firma HMAC webhook
- ✅ **Siempre** consultar `GET /v1/payments/{id}` server-side
- ✅ **Siempre** idempotencia: `mp_payment_id` UNIQUE + `webhooks_log.processed`
- ❌ **Nunca** admin setea estado manual (sync solo consulta MP)

### Escenarios Cubiertos
Ver `SPEC/architecture/mp-integration.md`: duplicados, fuera de orden, MP caído, redirect sin webhook, sync admin.

---

## 7. Stock — Reglas Estrictas

| Regla | Implementación |
|---|---|
| **Descuenta SOLO en Order create** | `UPDATE products SET stock=stock-? WHERE id=? AND stock>=?` en transacción |
| **Reserva durante PENDING** | Stock ya descontado = reservado |
| **Abandono MP** | Cron 24h → `EXPIRED` + `UPDATE stock=stock+qty` |
| **Pago rechazado** | Order sigue `PENDING` (stock reservado), user reintenta o cancela |
| **Stock negativo IMPOSIBLE** | `WHERE stock >= qty` + `CHECK (stock >= 0)` |
| **Concurrencia último item** | Uno 200, otro 409 "Stock insuficiente" |

---

## 8. SQLite → PostgreSQL — Incompatibilidades Reales

| Aspecto | SQLite | PostgreSQL | Acción |
|---|---|---|---|
| IDs | `TEXT` UUID | `UUID` nativo | `gen_random_uuid()` PG, mantener `TEXT` en types |
| Enteros | `INTEGER` | `BIGINT` | Compatible |
| Timestamps | `DATETIME` (TEXT) | `TIMESTAMPTZ` | Abstraer `db.fn.now()` |
| Boolean | `INTEGER 0/1` | `BOOLEAN` | `CHECK (0,1)` SQLite |
| JSON | `TEXT` | `JSONB` | Helpers compatibles |
| Locking | File-level | Row-level | Transacciones igual; `FOR UPDATE` solo PG |

**Sin tocar al migrar**: `domain/types.ts`, `domain/services/*.ts`, `domain/db.ts`, `app/**`
**Requiere cambios**: `infrastructure/database/connection.ts`, queries raw (usar Kysely builder), backup procedures

---

## 9. Rate Limiting — Solo Next.js Middleware

| Endpoint | Límite | Key | Store |
|---|---|---|---|
| `/api/auth/register` | 3/min | IP | SQLite `rate_limits` |
| `/api/auth/login` | 5/min | IP | SQLite |
| `/api/checkout/start` | 10/min | Session ID | SQLite |
| `/api/cart/*` | 30/min | Session ID | SQLite |
| `/api/webhooks/mercadopago` | 100/min | IP (validar firma primero) | Log only |
| Resto | 60/min | IP/Session | SQLite |

**Traefik**: Solo TLS + proxy, sin rate limit.

---

## 10. Backup — Cron `.backup` + Verificación Mensual

```bash
# Cada 5 min
*/5 * * * * sqlite3 /app/data/ceramica.db ".backup /app/backups/ceramica-$(date +\%Y\%m\%d-\%H\%M\%S).db"

# Mensual obligatoria
0 4 1 * * /app/scripts/verify-backup.sh
```

| Métrica | MVP | Futuro (Litestream) |
|---|---|---|
| RPO | ≤ 5 min | ~1 seg |
| RTO | ≤ 10 min | ~1 min |
| Verificación | Script mensual manual | Automática |
| Destino | Volume local | S3/B2 off-site |

**Regla**: *Backup no existe hasta que se restaura y verifica.*

---

## 11. CSP — Compatible Next.js + MP

```javascript
// next.config.js
const csp = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : ''} https://sdk.mercadopago.com https://www.mercadopago.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.mercadopago.com https://www.mercadopago.com;
  frame-src 'self' https://www.mercadopago.com https://*.mercadopago.com;
  form-action 'self' https://www.mercadopago.com;
  base-uri 'self';
  frame-ancestors 'none';
`
```
- **Fase 1**: Dev sin CSP
- **Fase 2**: Staging 2 semanas `Content-Security-Policy-Report-Only` + `/api/csp-report`
- **Fase 3**: Prod `Content-Security-Policy` enforcing

---

## 12. Testing — Critical Scenarios + Property-Based

### Herramientas
- **Vitest** (unit/integration, SQLite `:memory:`)
- **Playwright** (5-10 E2E críticos)
- **fast-check** (property-based: precios, stock, idempotencia)

### Tests Obligatorios (100% coverage en paths críticos)
1. Auth + Bootstrap ADMIN (concurrencia)
2. Carrito (add/update/validate stock/precios)
3. Cálculo precios (enteros, sin floats)
4. Stock concurrente (2 checkouts → 1 409)
5. Order creation (atómico: order + items + stock--)
6. Webhook idempotencia (3x mismo mp_payment_id → 1 pago)
7. Transiciones Payment/Order (matriz completa)
8. Permisos ADMIN (CUSTOMER 403 en /admin/*)
9. Migraciones (up/down preserva datos)

**Eliminado**: StrykerJS (mutation testing) — ROI negativo MVP.

---

## 13. Contenido Editorial — MDX Files

- `/content/home.mdx`, `/content/about.mdx`, `/content/faq.mdx`
- Frontmatter: `title`, `description`, `updatedAt`
- Loader: `mdx-bundler` / `next-mdx-remote` (build-time)
- **Keystatic no usado** (overkill para 3 páginas, usuario = desarrollador)

---

## 14. Decisiones Aprobadas (ADR Registry)

| ADR | Decisión | Archivo |
|---|---|---|
| ADR-001 | Kysely query builder | `SPEC/decisions/ADR-001-kysely.md` |
| ADR-002 | Sesiones DB (cookie opaca) | `SPEC/decisions/ADR-002-sessions-db.md` |
| ADR-003 | shadcn/ui + Tailwind | `SPEC/decisions/ADR-003-shadcn-ui.md` |
| ADR-004 | Zustand (solo vista carrito) | `SPEC/decisions/ADR-004-zustand-cart.md` |
| ADR-005 | Zod + React Hook Form | `SPEC/decisions/ADR-005-zod-rhf.md` |
| ADR-006 | Imágenes volume local | `SPEC/decisions/ADR-006-local-images.md` |
| ADR-007 | EmailProvider (Console/Resend/SMTP) | `SPEC/decisions/ADR-007-email-provider.md` |
| ADR-008 | MDX contenido editorial | `SPEC/decisions/ADR-008-mdx-content.md` |
| ADR-009 | Solo ARS | `SPEC/decisions/ADR-009-ars-only.md` |
| ADR-010 | Retiro local + Fixed shipping | `SPEC/decisions/ADR-010-shipping-mvp.md` |

---

## 15. Invariantes Críticas

Ver `SPEC/architecture/invariants.md` — 13 invariantes:
- INV-001 a INV-003: Seguridad/Auth
- INV-004 a INV-005: Stock
- INV-006 a INV-009: Precios/Pagos
- INV-010 a INV-013: Integridad/Conciliación

---

## 16. Riesgos Residuales

| Riesgo | Mitigación |
|---|---|
| MP webhook perdido 28d | Botón "Sincronizar" + polling success page + monitoreo orders PENDING >24h |
| SQLite corruption | WAL + cron backup 5min + verify mensual + runbook restore |
| Race condition stock | `UPDATE ... WHERE stock >= qty` + property-based test en CI |
| CSP rompe MP prod | Report-only 2 semanas staging + endpoint reporte |
| Migración PG queries raw | Usar Kysely query builder; auditar antes de migrar |

---

## 17. Archivos SPEC Creados (Listos para Implementación)

```
SPEC/
├── requirements/
│   ├── UC-001-catalogo.md ... UC-018-configuracion.md (18 archivos)
├── architecture/
│   ├── tech-plan.md (este archivo)
│   ├── invariants.md
│   ├── data-model.md
│   ├── auth-model.md
│   ├── cart-model.md
│   ├── payment-model.md
│   ├── mp-integration.md
│   ├── stock-rules.md
│   ├── migration-strategy.md
│   ├── rate-limiting.md
│   ├── backup-strategy.md
│   ├── csp-policy.md
│   └── testing-strategy.md
├── security/
│   └── threat-model.md
├── decisions/
│   ├── ADR-001-kysely.md ... ADR-010-shipping-mvp.md (10 archivos)
└── operations/
    ├── backup-restore.md
    ├── deploy-coolify.md
    └── runbooks/
        ├── mp-webhook-failure.md
        ├── stock-negative.md
        └── admin-impersonation.md
```

---

## Próximo Paso: IMPLEMENTACIÓN

Orden sugerido:
1. **Scaffold**: Next.js 14 + TS + Tailwind + shadcn/ui + Vitest + Playwright + Kysely
2. **DB**: Schema + migraciones + `connection.ts` (Kysely + Database interface)
3. **Domain**: `types.ts`, `db.ts`, `schemas/`, `services/` (auth, cart, order, payment, product)
4. **Infra**: `auth/session.ts`, `payments/mercadopago/`, `email/`, `content/MDXLoader.ts`
5. **Storefront**: Catálogo, Producto, Carrito (Zustand + cookie), Checkout
6. **MP**: Preferences API, Webhook handler, Success/Cancel pages
7. **Admin**: CRUD Productos, Pedidos, Link pago, Config, Sync
8. **Docker + Coolify**: Deploy staging → prod
9. **Tests**: Critical scenarios + property-based + E2E
10. **Docs**: README, runbooks, CSP config