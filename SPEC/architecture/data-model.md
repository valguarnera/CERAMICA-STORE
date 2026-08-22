# Modelo de Datos — CERAMICA-STORE

## Tablas y Cardinalidad

```
users (1) ─────< (0..N) orders
users (1) ─────< (0..N) sessions
orders (1) ─────< (1..N) order_items
orders (1) ─────< (0..1) payments
products (1) ─────< (0..N) order_items
webhooks_log (1) ← (0..N) eventos MP
settings (1) ← (0..N) claves-valor
```

## Esquema SQLite (DDL)

```sql
-- users
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,            -- bcrypt cost 12
  role TEXT NOT NULL DEFAULT 'CUSTOMER',  -- 'ADMIN' | 'CUSTOMER'
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                    -- 32 bytes hex
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- products
CREATE TABLE products (
  id TEXT PRIMARY KEY,                    -- UUID v4
  slug TEXT UNIQUE NOT NULL,              -- inmutable, generado al crear
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,           -- > 0, centavos ARS
  stock INTEGER NOT NULL DEFAULT 0,       -- >= 0 (CHECK)
  images TEXT,                            -- JSON array URLs
  active BOOLEAN NOT NULL DEFAULT 1,      -- 0/1
  metadata TEXT,                          -- JSON flexible (color, material, etc)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_slug ON products(slug);

-- orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT,                           -- NULL = guest
  guest_email TEXT,                       -- email si guest
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|PAID|CANCELLED|EXPIRED|REFUNDED|SHIPPED
  total_cents INTEGER NOT NULL,           -- suma items
  currency TEXT NOT NULL DEFAULT 'ARS',
  shipping_address TEXT,                  -- JSON snapshot
  billing_address TEXT,                   -- JSON snapshot
  notes TEXT,
  mp_preference_id TEXT,                  -- ID preferencia MP
  mp_payment_id TEXT,                     -- denormalizado para queries rápidas
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_mp_preference ON orders(mp_preference_id);
CREATE INDEX idx_orders_mp_payment ON orders(mp_payment_id);

-- order_items (SNAPSHOT HISTÓRICO - sin JSON)
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,                    -- UUID v4
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,              -- > 0
  unit_price_cents INTEGER NOT NULL,      -- precio al momento de compra
  product_name TEXT NOT NULL,             -- snapshot nombre
  product_slug TEXT NOT NULL,             -- snapshot slug
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,                    -- UUID v4
  order_id TEXT NOT NULL UNIQUE,          -- 1:1 con orders
  mp_payment_id TEXT UNIQUE,              -- ID pago en MP (source of truth)
  mp_preference_id TEXT,
  status TEXT NOT NULL,                   -- pending|approved|rejected|cancelled|refunded
  status_detail TEXT,                     -- ej: accredited, cc_rejected_insufficient_amount
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  payment_method_id TEXT,                 -- visa, master, ticket, etc
  payment_type_id TEXT,                   -- credit_card, debit_card, ticket, etc
  installments INTEGER DEFAULT 1,
  payer_email TEXT,
  payer_id TEXT,                          -- ID comprador en MP
  external_reference TEXT,                -- = order.id
  raw_response TEXT,                      -- JSON completo respuesta MP
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX idx_payments_mp_payment ON payments(mp_payment_id);
CREATE INDEX idx_payments_order ON payments(order_id);

-- webhooks_log (auditoría)
CREATE TABLE webhooks_log (
  id TEXT PRIMARY KEY,                    -- UUID v4
  mp_event_type TEXT NOT NULL,            -- payment.updated, merchant_order.updated
  mp_resource_id TEXT NOT NULL,           -- payment ID en MP
  payload TEXT NOT NULL,                  -- JSON raw
  processed BOOLEAN DEFAULT 0,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_webhook_resource ON webhooks_log(mp_resource_id);

-- settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Estados y Transiciones

### Order Status
| Estado | Descripción | Transiciones Permitidas |
|--------|-------------|------------------------|
| `PENDING` | Creada, esperando pago | → `PAID` (webhook approved), → `CANCELLED` (user/admin), → `EXPIRED` (cron 24h) |
| `PAID` | Pago aprobado | → `REFUNDED` (admin), → `SHIPPED` (admin) |
| `CANCELLED` | Cancelada antes de pago | *terminal* |
| `EXPIRED` | Expiró sin pago (24h) | *terminal* |
| `REFUNDED` | Reembolso total | *terminal* |
| `SHIPPED` | Enviado/entregado | *terminal* |

### Payment Status
| Estado | Descripción | Transiciones |
|--------|-------------|--------------|
| `pending` | Creado, esperando MP | → `approved`, → `rejected`, → `cancelled` |
| `approved` | Acreditado | → `refunded` |
| `rejected` | Rechazado por MP | *terminal* |
| `cancelled` | Cancelado por usuario | *terminal* |
| `refunded` | Reembolsado | *terminal* |

### Matriz Transiciones (Actor/Evento)
| De → A | Actor/Evento |
|--------|--------------|
| PENDING → PAID | Webhook MP `payment.updated` status=approved |
| PENDING → CANCELLED | Usuario cancela / Admin cancela / Cron 24h |
| PENDING → EXPIRED | Cron job diario |
| PAID → REFUNDED | Admin ejecuta reembolso (MP API) |
| PAID → SHIPPED | Admin marca enviado |
| Payment pending → approved/rejected/cancelled | Webhook MP |

## Constraints de Integridad
- `users.email` UNIQUE
- `products.slug` UNIQUE
- `products.stock >= 0` (CHECK)
- `products.price_cents > 0` (CHECK)
- `orders.mp_payment_id` denormalizado, consistencia vía transacción
- `payments.order_id` UNIQUE (1:1)
- `payments.mp_payment_id` UNIQUE (idempotencia)
- `webhooks_log.mp_resource_id` UNIQUE (process-once)
- `sessions.revoked=0 AND expires_at > now()` para auth válida