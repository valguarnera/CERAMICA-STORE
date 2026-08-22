# UC-008: Registrarse

## Descripción
Usuario crea cuenta con email y password. Primer usuario = ADMIN.

## Actores
- Visitante

## Precondiciones
- Email no registrado

## Flujo Principal
1. Usuario en `/registro` completa: email, password, nombre
2. `POST /api/auth/register`
3. Server:
   - Valida Zod: email format, password min 8 chars, nombre 1-100
   - `bcrypt.hash(password, 12)`
   - Transacción `IMMEDIATE`:
     ```sql
     INSERT INTO users (id, email, password_hash, role, name)
     SELECT ?, ?, ?, 
       CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
       ?
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)
     ```
   - Si `changes() = 0` → 409 "Email ya registrado"
   - Crea sesión: `INSERT INTO sessions (id, user_id, expires_at)`
   - Set cookie `session_id` (HttpOnly, Secure, SameSite=Lax, 7d)
4. Retorna `{ user: { id, email, name, role }, redirect: role === 'ADMIN' ? '/admin' : '/' }`

## Criterios de Aceptación
- [ ] Primer registro → `role = 'ADMIN'` (atómico, sin race condition)
- [ ] Registros posteriores → `role = 'CUSTOMER'`
- [ ] Password hasheado con bcrypt cost 12 (nunca loggeado)
- [ ] Sesión creada y cookie seteada
- [ ] Email único (constraint UNIQUE + check en transacción)
- [ ] Rate limit: 3 req/min/IP

## Flujo Alternativo
- Email ya existe → 409 "Email ya registrado"
- Password débil → 400 "Mínimo 8 caracteres"
- Error DB → 500, log interno

## Reglas de Negocio
- R-001: `role` ENUM ('ADMIN', 'CUSTOMER') - solo estos dos
- R-002: `id` = UUID v4 (crypto.randomUUID())
- R-003: No verificación de email en MVP (opcional futuro)

## Endpoints
- `POST /api/auth/register` body: `{ email, password, name }`
- Response: `{ user, redirect }`