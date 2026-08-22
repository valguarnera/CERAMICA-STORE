# Estrategia de Migración SQLite → PostgreSQL

## Incompatibilidades Reales (No Prometer "Sin Cambios")

| Aspecto | SQLite | PostgreSQL | Acción Requerida |
|---------|--------|------------|------------------|
| **IDs** | `TEXT` (UUID v4 string) | `UUID` nativo | `gen_random_uuid()` en PG; mantener `TEXT` en domain types |
| **Enteros** | `INTEGER` (64-bit signed) | `BIGINT` | Usar `BIGINT` en PG; `INTEGER` en SQLite compatible |
| **Timestamps** | `DATETIME` (TEXT ISO8601) | `TIMESTAMPTZ` | `datetime('now')` vs `now()`; abstraer en `db.fn.now()` |
| **Boolean** | `INTEGER 0/1` | `BOOLEAN` | `CHECK (col IN (0,1))` en SQLite; `BOOLEAN` en PG |
| **JSON** | `TEXT` + `json_extract()` | `JSONB` + `->>` | Helpers compatibles; migración datos `TEXT` → `JSONB` |
| **Auto-increment** | `INTEGER PRIMARY KEY` | `BIGSERIAL` / `IDENTITY` | **Usar UUID string en ambos** (evita sequences) |
| **Locking** | File-level (`IMMEDIATE`) | Row-level (`FOR UPDATE`) | Transacciones funcionan igual; `FOR UPDATE` solo PG |
| **Constraints** | `CHECK`, `UNIQUE`, `FK` | Mismos + `EXCLUSION` | Compatibles |
| **WAL/Backup** | `.backup`, Litestream | `pg_dump`, PITR nativo | Estrategia distinta por motor |
| **RegEx** | `REGEXP` (opcional) | `~` / `~*` nativo | Evitar REGEXP en queries portables |
| **Date Math** | `date('now', '-1 day')` | `now() - interval '1 day'` | Abstraer en query builder |

## Queda Sin Tocar al Migrar

| Capa | Archivos | Por Qué |
|------|----------|---------|
| **Domain Types** | `domain/types.ts` | Interfaces TypeScript idénticas |
| **Domain Services** | `domain/services/*.ts` | Lógica pura, usan `Database` interface |
| **App Routes** | `app/**/*.tsx` | Usan services, no DB directo |
| **Database Interface** | `domain/db.ts` | Define `Database` schema para Kysely |

## Requiere Cambios

| Capa | Archivos | Cambios |
|------|----------|---------|
| **DB Connection** | `infrastructure/database/connection.ts` | Swap `createKysely<Database>(sqlite)` → `createKysely<Database>(pg)` |
| **Raw Queries** | Si existen en services | Migrar a Kysely query builder (portable) |
| **Migrations** | `infrastructure/database/sqlite/migrations/` | Reescribir en SQL PG o usar tool (pgloader) |
| **Backup/Restore** | `SPEC/operations/backup-restore.md` | Procedimientos distintos |
| **Docker/Coolify** | `docker-compose.yml`, Coolify config | Add Postgres service, env `DATABASE_URL` |

## Database Interface (Kysely) — Contrato Portable

```typescript
// domain/db.ts
export interface Database {
  users: {
    id: string
    email: string
    password_hash: string
    role: 'ADMIN' | 'CUSTOMER'
    name: string | null
    created_at: Date
    updated_at: Date
  }
  sessions: {
    id: string
    user_id: string
    expires_at: Date
    revoked: boolean
    created_at: Date
  }
  products: {
    id: string
    slug: string
    name: string
    description: string | null
    price_cents: number
    stock: number
    images: string | null      // JSON string
    active: boolean
    metadata: string | null    // JSON string
    created_at: Date
    updated_at: Date
  }
  orders: {
    id: string
    user_id: string | null
    guest_email: string | null
    status: OrderStatus
    total_cents: number
    currency: string
    shipping_address: string | null
    billing_address: string | null
    notes: string | null
    mp_preference_id: string | null
    mp_payment_id: string | null
    created_at: Date
    updated_at: Date
  }
  order_items: {
    id: string
    order_id: string
    product_id: string
    quantity: number
    unit_price_cents: number
    product_name: string
    product_slug: string
  }
  payments: {
    id: string
    order_id: string
    mp_payment_id: string | null
    mp_preference_id: string | null
    status: PaymentStatus
    status_detail: string | null
    amount_cents: number
    currency: string
    payment_method_id: string | null
    payment_type_id: string | null
    installments: number
    payer_email: string | null
    payer_id: string | null
    external_reference: string | null
    raw_response: string | null
    paid_at: Date | null
    created_at: Date
    updated_at: Date
  }
  webhooks_log: {
    id: string
    mp_event_type: string
    mp_resource_id: string
    payload: string
    processed: boolean
    error: string | null
    created_at: Date
  }
  settings: {
    key: string
    value: string
    description: string | null
    updated_at: Date
  }
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'SHIPPED'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'
```

## Implementaciones

### SQLite (`infrastructure/database/sqlite/connection.ts`)
```typescript
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'

export function createSqliteDatabase(path: string): Kysely<Database> {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  
  return new Kysely<Database>({
    dialect: new SqliteDialect({ database: db }),
  })
}
```

### PostgreSQL (`infrastructure/database/postgres/connection.ts`) — Futuro
```typescript
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

export function createPostgresDatabase(url: string): Kysely<Database> {
  const pool = new Pool({ connectionString: url, max: 10 })
  
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  })
}
```

## Procedimiento de Migración (Cuando Llegue el Momento)

1. **Preparar**: Add Postgres service en Coolify, `DATABASE_URL` en env
2. **Deploy paralelo**: Nueva versión con `createPostgresDatabase` + feature flag
3. **Migrar datos**: `pgloader sqlite:///app/data/ceramica.db postgresql://...`
   - Mapeo tipos automático (TEXT→UUID, INTEGER→BIGINT, DATETIME→TIMESTAMPTZ, TEXT→JSONB)
4. **Verificar**: Queries críticas, integridad referencial, índices
5. **Switch**: DNS / feature flag → tráfico a PG
6. **Limpiar**: Remover volume SQLite, código SQLite connection

## Qué NO Prometemos
- ❌ "Migración sin cambios de código" (connection.ts cambia)
- ❌ "Queries raw SQL portables" (usar Kysely query builder)
- ❌ "Mismo performance" (PG mejor en concurrencia, peor en latency single-thread)
- ❌ "Mismo backup strategy" (PG usa pg_dump/PITR, no .backup)

## Qué SÍ Garantizamos
- ✅ Domain services **no cambian** (usan `Database` interface)
- ✅ Tipos TypeScript **idénticos** (`domain/types.ts`)
- ✅ Esquema lógico **idéntico** (tablas, FKs, constraints)
- ✅ Migración datos automatizable (`pgloader`)