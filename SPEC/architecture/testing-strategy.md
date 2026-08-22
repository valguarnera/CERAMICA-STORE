# Estrategia de Testing — CERAMICA-STORE

## Herramientas
- **Vitest** — Unit/Integration tests (rápido, ESM nativo, compatible Next.js)
- **Playwright** — E2E crítico (5-10 flujos core)
- **fast-check** — Property-based testing (lógica precios, stock, idempotencia)

## Principios
- **Sin targets % globales** — Cobertura informativa, no gate
- **Tests de comportamiento** — Qué hace el sistema, no cómo
- **Critical Scenarios obligatorios** — 100% coverage en paths críticos
- **SQLite real en tests** — `:memory:` per test file (no mocks DB)
- **MSW para MP** — Mock Service Worker con fixtures reales

## Critical Test Scenarios (Obligatorios)

### 1. Autenticación y Bootstrap ADMIN
```typescript
// auth.test.ts
test('primer registro → ADMIN', async () => {
  const user1 = await register({ email: 'a@b.com', password: '12345678', name: 'Admin' })
  expect(user1.role).toBe('ADMIN')
  
  const user2 = await register({ email: 'c@d.com', password: '12345678', name: 'Customer' })
  expect(user2.role).toBe('CUSTOMER')
})

test('concurrencia registro: solo un ADMIN', async () => {
  const results = await Promise.allSettled([
    register({ email: 'a@b.com', password: '12345678', name: 'A' }),
    register({ email: 'c@d.com', password: '12345678', name: 'B' }),
  ])
  const admins = results.filter(r => r.status === 'fulfilled' && r.value.role === 'ADMIN')
  expect(admins.length).toBe(1)
})

test('login crea sesión y cookie', async () => {
  await register({ email: 'a@b.com', password: '12345678', name: 'Test' })
  const res = await login({ email: 'a@b.com', password: '12345678' })
  expect(res.headers['set-cookie']).toContain('session_id=')
  expect(res.body.user.role).toBe('CUSTOMER')
})

test('middleware bloquea CUSTOMER en /admin', async () => {
  const { sessionId } = await loginAsCustomer()
  const res = await request('/admin').set('Cookie', `session_id=${sessionId}`)
  expect(res.status).toBe(302) // redirect to /
})
```

### 2. Carrito
```typescript
// cart.test.ts
test('agregar item valida stock y precio', async () => {
  await createProduct({ id: 'p1', stock: 5, price_cents: 1000 })
  const cart = await addToCart({ productId: 'p1', quantity: 3 })
  expect(cart.items[0].quantity).toBe(3)
  expect(cart.items[0].unitPriceCents).toBe(1000)
})

test('no permite agregar más que stock', async () => {
  await createProduct({ id: 'p1', stock: 2, price_cents: 1000 })
  await expect(addToCart({ productId: 'p1', quantity: 3 })).rejects.toThrow('Stock insuficiente')
})

test('suma cantidades si producto ya en carrito', async () => {
  await createProduct({ id: 'p1', stock: 10, price_cents: 1000 })
  await addToCart({ productId: 'p1', quantity: 2 })
  const cart = await addToCart({ productId: 'p1', quantity: 3 })
  expect(cart.items[0].quantity).toBe(5)
})

test('validación precio en checkout (server-side)', async () => {
  await createProduct({ id: 'p1', stock: 10, price_cents: 1000 })
  // Manipular cookie con precio falso
  await setCartCookie({ items: [{ productId: 'p1', quantity: 1, unitPriceCents: 500 }] })
  await expect(checkoutStart({...})).rejects.toThrow('Precio no coincide')
})
```

### 3. Cálculo de Precios
```typescript
// pricing.test.ts
test('total = Σ(qty × price_cents) sin floats', () => {
  const items = [
    { quantity: 3, unitPriceCents: 15000 },
    { quantity: 1, unitPriceCents: 25000 },
  ]
  expect(calculateTotal(items)).toBe(70000) // 3×15000 + 1×25000 = 70000
})

// Property-based: total siempre entero, sin redondeo
test('calculateTotal property', () => {
  fc.assert(fc.property(fc.array(cartItemArb), (items) => {
    const total = calculateTotal(items)
    expect(Number.isInteger(total)).toBe(true)
    expect(total).toBe(items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0))
  }))
})
```

### 4. Stock Concurrente
```typescript
// stock-concurrency.test.ts
test('dos checkouts simultáneos último item → uno 409', async () => {
  await createProduct({ id: 'p1', stock: 1, price_cents: 1000 })
  
  const [r1, r2] = await Promise.allSettled([
    checkoutStart({ items: [{ productId: 'p1', quantity: 1 }], email: 'a@b.com', ... }),
    checkoutStart({ items: [{ productId: 'p1', quantity: 1 }], email: 'c@d.com', ... }),
  ])
  
  const success = [r1, r2].filter(r => r.status === 'fulfilled').length
  const fail = [r1, r2].filter(r => r.status === 'rejected').length
  
  expect(success).toBe(1)
  expect(fail).toBe(1)
  
  const stock = await getStock('p1')
  expect(stock).toBe(0)
})
```

### 5. Creación de Order (Atómica)
```typescript
// order.test.ts
test('crear order: order + items + stock decrement atómico', async () => {
  await createProduct({ id: 'p1', stock: 5, price_cents: 1000 })
  await createProduct({ id: 'p2', stock: 3, price_cents: 2000 })
  
  const order = await createOrder({
    items: [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ],
    email: 'test@test.com',
  })
  
  expect(order.status).toBe('PENDING')
  expect(order.total_cents).toBe(40000) // 2×10000 + 1×20000
  
  const stock1 = await getStock('p1')
  const stock2 = await getStock('p2')
  expect(stock1).toBe(3)
  expect(stock2).toBe(2)
  
  // Verificar order_items snapshot
  const items = await getOrderItems(order.id)
  expect(items[0].unit_price_cents).toBe(10000)
  expect(items[0].product_name).toBe('Product 1')
})
```

### 6. Idempotencia Webhooks
```typescript
// webhook.test.ts
test('mismo mp_payment_id 3 veces → 1 pago, 1 order PAID', async () => {
  const order = await createPendingOrder({ total_cents: 10000 })
  const mpPayment = createMpPaymentFixture({ id: 'mp-123', status: 'approved', external_reference: order.id })
  
  await handleWebhook(mpPayment)
  await handleWebhook(mpPayment)  // duplicado
  await handleWebhook(mpPayment)  // duplicado
  
  const payments = await getPaymentsByOrder(order.id)
  expect(payments.length).toBe(1)
  expect(payments[0].status).toBe('approved')
  
  const updatedOrder = await getOrder(order.id)
  expect(updatedOrder.status).toBe('PAID')
})

test('webhook fuera de orden (approved antes que pending)', async () => {
  const order = await createPendingOrder({})
  const mpApproved = createMpPaymentFixture({ status: 'approved' })
  const mpPending = createMpPaymentFixture({ status: 'pending' })
  
  await handleWebhook(mpApproved)
  await handleWebhook(mpPending) // llegó después
  
  const payment = await getPaymentByOrder(order.id)
  expect(payment.status).toBe('approved') // estado final prevalece
})
```

### 7. Transiciones Payment/Order
```typescript
// state-transitions.test.ts
const validTransitions = [
  { from: 'PENDING', to: 'PAID', actor: 'webhook_approved' },
  { from: 'PENDING', to: 'CANCELLED', actor: 'user_cancel' },
  { from: 'PENDING', to: 'EXPIRED', actor: 'cron_24h' },
  { from: 'PAID', to: 'REFUNDED', actor: 'admin_refund' },
  { from: 'PAID', to: 'SHIPPED', actor: 'admin_ship' },
]

validTransitions.forEach(({ from, to, actor }) => {
  test(`${from} → ${to} via ${actor}`, async () => {
    const order = await createOrder({ status: from })
    await executeTransition(order.id, actor)
    const updated = await getOrder(order.id)
    expect(updated.status).toBe(to)
  })
})

// Transiciones inválidas
const invalidTransitions = [
  { from: 'PAID', to: 'PENDING' },
  { from: 'CANCELLED', to: 'PAID' },
  { from: 'REFUNDED', to: 'SHIPPED' },
]

invalidTransitions.forEach(({ from, to }) => {
  test(`${from} → ${to} RECHAZADO`, async () => {
    const order = await createOrder({ status: from })
    await expect(executeTransition(order.id, to)).rejects.toThrow()
  })
})
```

### 8. Permisos ADMIN
```typescript
// admin-permissions.test.ts
test('CUSTOMER no accede GET /api/admin/products', async () => {
  const { sessionId } = await loginAsCustomer()
  const res = await request('/api/admin/products').set('Cookie', `session_id=${sessionId}`)
  expect(res.status).toBe(403)
})

test('ADMIN accede GET /api/admin/products', async () => {
  const { sessionId } = await loginAsAdmin()
  const res = await request('/api/admin/products').set('Cookie', `session_id=${sessionId}`)
  expect(res.status).toBe(200)
})

test('CUSTOMER no puede PATCH /api/admin/products/:id', async () => {
  const { sessionId } = await loginAsCustomer()
  const res = await request.patch('/api/admin/products/p1').set('Cookie', `session_id=${sessionId}`)
  expect(res.status).toBe(403)
})
```

### 9. Migraciones
```typescript
// migrations.test.ts
test('migración v1→v2 preserva datos', async () => {
  const db = await createTestDb()
  await migrateToV1(db)
  
  // Insertar datos v1
  await db.insertInto('users').values({...}).execute()
  await db.insertInto('products').values({...}).execute()
  
  // Migrar a v2
  await migrateToV2(db)
  
  // Verificar datos preservados
  const users = await db.selectFrom('users').selectAll().execute()
  expect(users.length).toBeGreaterThan(0)
  
  // Verificar nueva tabla/columna
  const columns = await db.selectFrom('information_schema.columns')
    .where('table_name', '=', 'products').where('column_name', '=', 'new_col')
    .execute()
  expect(columns.length).toBe(1)
})
```

## E2E con Playwright (5-10 Críticos)

| Test | Descripción |
|------|-------------|
| `e2e-checkout-guest.spec.ts` | Usuario agrega al carrito → checkout guest → paga MP sandbox → success |
| `e2e-checkout-registered.spec.ts` | Usuario registrado → checkout → ve orden en `/mis-pedidos` |
| `e2e-admin-crud.spec.ts` | Admin crea/edita/desactiva producto → verifica en storefront |
| `e2e-admin-orders.spec.ts` | Admin ve orden → sincroniza MP → reembolsa → verifica estado |
| `e2e-auth-bootstrap.spec.ts` | Primer registro → ADMIN → segundo → CUSTOMER |
| `e2e-cart-persistence.spec.ts` | Carrito persiste reload, navegación, pestañas |

## CI Pipeline
```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit        # Vitest
      - run: npm run test:property    # fast-check
      - run: npm run build
      - run: npm run test:e2e         # Playwright (headless)
```

## Qué NO Incluye
- ❌ StrykerJS (mutation testing) — ROI negativo MVP
- ❌ Coverage gates globales — Solo critical scenarios
- ❌ Visual regression — No valor para MVP
- ❌ Load testing — No requisito MVP