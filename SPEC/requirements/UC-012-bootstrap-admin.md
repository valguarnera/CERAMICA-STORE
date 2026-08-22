# UC-012: Bootstrap ADMIN (Primer Usuario)

## Descripción
El primer usuario que se registra obtiene rol ADMIN automáticamente.

## Actores
- Sistema (durante registro)

## Precondiciones
- Tabla `users` vacía (`COUNT(*) = 0`)

## Flujo Principal
1. Request `POST /api/auth/register` (primer usuario)
2. Transacción `IMMEDIATE` (better-sqlite3):
   ```sql
   BEGIN IMMEDIATE;
   -- Verificar tabla vacía Y email no existe en misma transacción
   INSERT INTO users (id, email, password_hash, role, name)
   SELECT ?, ?, ?, 
     CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
     ?
   WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?);
   COMMIT;
   ```
3. Si `changes() = 1` y `role = 'ADMIN'` → éxito, crea sesión, redirect `/admin`
4. Si `changes() = 0` → 409 email duplicado

## Criterios de Aceptación
- [ ] **Race condition imposible**: `BEGIN IMMEDIATE` bloquea archivo DB
- [ ] Solo UN usuario puede obtener ADMIN (constraint lógica en transacción)
- [ ] Si 2 requests simultáneos: uno gana (INSERT), otro 409 (unique email)
- [ ] No existe endpoint público "claim admin" ni similar
- [ ] ADMIN creado tiene todas las capacidades admin inmediatas

## Flujo Alternativo
- Tabla no vacía → role = CUSTOMER (flujo normal)

## Reglas de Negocio
- R-001: `BEGIN IMMEDIATE` obligatorio (no DEFERRED, no READ ONLY)
- R-002: Verificación `COUNT(*) = 0` DENTRO de la transacción
- R-003: No hay "superadmin" ni roles adicionales

## Seguridad
- INV-001: Un CUSTOMER nunca puede ejecutar operaciones ADMIN
- INV-002: Solo existe un bootstrap ADMIN válido (el primer registro)