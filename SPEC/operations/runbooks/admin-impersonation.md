# Runbook: Impersonación / Acceso Admin No Autorizado

## Síntomas
- Usuario no-admin accede `/admin/*` o `POST /api/admin/*`
- Logs muestran `role: 'CUSTOMER'` en requests a endpoints admin
- Admin reporta cambios no realizados por él

## Diagnóstico Inmediato
```sql
-- Verificar sesiones activas
SELECT s.id, s.user_id, u.email, u.role, s.expires_at, s.revoked
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.revoked = 0 AND s.expires_at > datetime('now');

-- Verificar users con role ADMIN
SELECT id, email, name, role, created_at FROM users WHERE role = 'ADMIN';

-- Logs de acceso admin (últimas 24h)
-- Revisar en Coolify logs: "GET /admin" OR "POST /api/admin"
```

## Causas Posibles
| Causa | Evidencia | Acción |
|-------|-----------|--------|
| Session hijacking (cookie robada) | IP distinta, user-agent distinto | Revocar sesión, rotar `SESSION_SECRET` |
| Middleware bypass | Bug en `middleware.ts` | Verificar código, deploy fix |
| Role escalation bug | User con `role='ADMIN'` no esperado | Verificar `UC-012` bootstrap logic |
| Cookie fixation | Session ID predecible | Verificar `crypto.randomBytes(32)` |
| Admin credential leak | Login exitoso desde IP desconocida | Revocar todas las sesiones admin |

## Acciones Inmediatas

### 1. Revocar Sesiones Sospechosas
```sql
-- Revocar sesión específica
UPDATE sessions SET revoked = 1 WHERE id = 'SESSION_ID';

-- O: Revocar TODAS las sesiones (forzar re-login)
UPDATE sessions SET revoked = 1 WHERE user_id IN (SELECT id FROM users WHERE role = 'ADMIN');
```

### 2. Rotar `SESSION_SECRET` (Nuclear)
```bash
# Generar nuevo
openssl rand -hex 32
# Actualizar en Coolify env vars → redeploy
# Invalida TODAS las cookies existentes
```

### 3. Verificar Usuarios Admin
```sql
-- Debe ser EXACTAMENTE 1 (el bootstrap original)
SELECT COUNT(*) FROM users WHERE role = 'ADMIN';
-- Si > 1: investigar cómo se crearon (bug UC-012 o manipulación manual)
-- Despromover extras: UPDATE users SET role='CUSTOMER' WHERE id='...' AND role='ADMIN';
```

### 4. Auditar Cambios Recientes
- Revisar `products` modificados: `SELECT * FROM products WHERE updated_at > datetime('now', '-1 day')`
- Revisar `orders` status changes: `SELECT * FROM orders WHERE updated_at > datetime('now', '-1 day') AND status != 'PENDING'`
- Revisar `settings` cambios: `SELECT * FROM settings WHERE updated_at > datetime('now', '-1 day')`

## Prevención
- Rate limit `/api/auth/login` (5/min/IP) + `/api/auth/register` (3/min/IP)
- `SESSION_SECRET` único, 32+ chars, rotado solo en incidente
- Middleware admin: test unitario obligatorio (`SessionMiddleware.test.ts`)
- Logs de acceso admin estructurados (timestamp, user_id, ip, action)

## Escalación
- Si breach confirmado → Notificar usuarios afectados (email en `users`)
- Rotar `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` en MP Dashboard
- Revisar logs MP para actividad sospechosa (pagos, reembolsos)