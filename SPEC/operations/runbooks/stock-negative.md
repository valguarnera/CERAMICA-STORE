# Runbook: Stock Negativo Detectado

## Síntomas
- `products.stock < 0` en query directa
- Admin ve stock negativo en `/admin/productos`
- Cliente ve "Disponible: -X"

## Diagnóstico Inmediato
```sql
-- Identificar productos afectados
SELECT id, name, stock FROM products WHERE stock < 0;

-- Verificar orders relacionadas
SELECT o.id, o.status, oi.product_id, oi.quantity, p.stock
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE p.stock < 0;
```

## Causas Raíz Posibles
| Causa | Evidencia | Fix |
|-------|-----------|-----|
| Race condition checkout | 2 orders mismos items, timestamp cercano | Verificar `UPDATE ... WHERE stock >= qty` en código |
| Webhook duplicado procesó 2x | 2 payments mismo `mp_payment_id` | Verificar `webhooks_log.processed` |
| Bug restitución stock (cancel/refund) | Order CANCELLED/REFUNDED pero stock no volvió | Verificar transacción rollback |
| Migración/manual DB edit | Timestamp reciente, sin orders relacionadas | Revisar logs admin |

## Acciones Correctivas

### 1. Restituir Stock Inmediato
```sql
-- Para cada producto afectado
UPDATE products SET stock = 0 WHERE id = 'PRODUCT_ID' AND stock < 0;
-- O calcular stock real:
UPDATE products SET stock = (
  SELECT COALESCE(SUM(CASE 
    WHEN o.status IN ('PAID','SHIPPED') THEN -oi.quantity
    WHEN o.status IN ('CANCELLED','EXPIRED','REFUNDED') THEN +oi.quantity
    ELSE 0 END), 0)
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = products.id
) WHERE id = 'PRODUCT_ID';
```

### 2. Verificar Integridad Referencial
```sql
-- Orders sin payment (deberían ser PENDING/EXPIRED/CANCELLED)
SELECT * FROM orders WHERE status = 'PAID' AND mp_payment_id IS NULL;

-- Payments sin order
SELECT * FROM payments WHERE order_id NOT IN (SELECT id FROM orders);
```

### 3. Recalcular Stock Real (Script)
```bash
# /app/scripts/recalculate-stock.sh
sqlite3 /app/data/ceramica.db "
UPDATE products SET stock = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN o.status IN ('PAID','SHIPPED') THEN -oi.quantity
      WHEN o.status IN ('CANCELLED','EXPIRED','REFUNDED') THEN +oi.quantity
      ELSE 0 END
  ), 0) + initial_stock
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = products.id
);
"
```
> ⚠️ Requiere columna `initial_stock` o snapshot inicial. En MVP: restaurar desde backup válido.

## Prevención
- Test property-based: `stockConcurrency.test.ts` (CI obligatorio)
- Constraint `CHECK (stock >= 0)` en schema (SQLite 3.38+)
- Logs estructurados en `OrderService.createFromCart` y `PaymentService.handleWebhook`
- Monitoreo: query diaria `SELECT COUNT(*) FROM products WHERE stock < 0` → alerta

## Escalación
- Si recursivo → Revisar código `OrderService.createFromCart` y `PaymentService.handleWebhook`
- Deploy fix + recalcular stock desde backup último válido