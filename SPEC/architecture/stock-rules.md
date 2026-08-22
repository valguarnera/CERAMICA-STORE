# Reglas de Stock — CERAMICA-STORE

## Invariante Fundamental
> **`stock >= 0` SIEMPRE** — Verificado por constraint + transacción atómica

## Cuándo Se Descuenta Stock
**SOLO** al crear Order `PENDING` (`POST /api/checkout/start`), en transacción atómica:

```sql
-- Por cada item del carrito
UPDATE products 
SET stock = stock - ? 
WHERE id = ? AND stock >= ?;

-- Verificar changes() > 0 por item
-- Si algún item falla → ROLLBACK total → 409 "Stock insuficiente"
```

## Reserva Durante Checkout
- Order `PENDING` = **stock reservado** (ya descontado de `products.stock`)
- Reserva dura hasta: pago aprobado, cancelación, o expiración 24h

## Qué Ocurre Si Usuario Abandona MP
1. Order queda `PENDING` (stock reservado)
2. Cron job diario (03:00): `UPDATE orders SET status='EXPIRED' WHERE status='PENDING' AND created_at < now()-24h`
3. Mismo cron: `UPDATE products SET stock = stock + oi.quantity FROM order_items oi WHERE oi.order_id = orders.id`
4. Order `EXPIRED`, stock restituido

## Qué Ocurre Si Pago Falla (Rejected)
1. Webhook `rejected` → Payment `rejected`
2. Order **sigue `PENDING`** (stock sigue reservado)
3. Usuario puede:
   - Reintentar → Nueva Order (nuevo stock decrement)
   - Cancelar → `PATCH status=CANCELLED` + stock back
4. Si no hace nada → Cron 24h → `EXPIRED` + stock back

## Prevención Stock Negativo (Concurrencia)

### Mecanismo: `UPDATE ... WHERE stock >= qty`
```sql
-- Dos checkouts concurrentes por último item (stock=1)
-- Request A: UPDATE products SET stock=0 WHERE id='X' AND stock>=1  → changes=1 ✓
-- Request B: UPDATE products SET stock=-1 WHERE id='X' AND stock>=1 → changes=0 ✗ → 409
```

### Garantías
- Atómico a nivel fila (SQLite: lock de base de datos completa en `IMMEDIATE`)
- `changes() = 0` = stock insuficiente → rollback
- Constraint `CHECK (stock >= 0)` como red de seguridad final

## Restitución de Stock (Estados Terminales)

| Estado Final | Acción Stock | Cuándo |
|--------------|--------------|--------|
| `CANCELLED` | `+ quantity` por item | Inmediato (user/admin) |
| `EXPIRED` | `+ quantity` por item | Cron diario (24h sin pago) |
| `REFUNDED` | **NO** restituye | Producto ya entregado |
| `SHIPPED` | **NO** restituye | En proceso de entrega |

## Reglas de Negocio
- **R-001**: Stock se descuenta **una sola vez** por Order creada
- **R-002**: Re-checkout (pago rechazado → nueva Order) = nuevo decremento
- **R-003**: Admin cancela Order `PENDING` → stock back atómico
- **R-004**: Admin reembolsa Order `PAID` → **NO** stock back
- **R-005**: `quantity` en `order_items` = snapshot al momento (para restitución exacta)

## Tests de Property-Based (fast-check)
```typescript
// stockConcurrency.ts
test('dos checkouts concurrentes último item → uno 409', async () => {
  await fc.assert(fc.asyncProperty(fc.nat(10), async (seed) => {
    const initialStock = 1
    await setupProduct({ stock: initialStock })
    
    const results = await Promise.allSettled([
      checkout({ productId: 'X', quantity: 1 }),
      checkout({ productId: 'X', quantity: 1 }),
    ])
    
    const successes = results.filter(r => r.status === 'fulfilled').length
    const failures = results.filter(r => r.status === 'rejected').length
    
    expect(successes).toBe(1)
    expect(failures).toBe(1)
    
    const finalStock = await getStock('X')
    expect(finalStock).toBe(0)
  }))
})
```

## Invariantes
- **INV-004**: Stock nunca negativo (constraint + WHERE stock >= qty)
- **INV-005**: Stock descuenta solo en Order create; restituye solo en CANCELLED/EXPIRED/REFUNDED