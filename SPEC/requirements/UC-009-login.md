# UC-009: Iniciar Sesión

## Descripción
Usuario autenticado obtiene sesión y acceso según su rol.

## Actores
- Cliente registrado
- Administrador

## Precondiciones
- Usuario existe en BD

## Flujo Principal
1. Usuario en `/login` completa: email, password
2. `POST /api/auth/login`
3. Server:
   - `SELECT * FROM users WHERE email = ?`
   - Si no existe → 401 "Credenciales inválidas" (mismo mensaje que password erróneo)
   - `bcrypt.compare(password, password_hash)`
   - Si falla → 401
   - `INSERT INTO sessions (id, user_id, expires_at)` (expires_at = now + 7d)
   - Set cookie `session_id`
3. Retorna `{ user: { id, email, name, role }, redirect }`

## Criterios de Aceptación
- [ ] Timing attack mitigado (siempre bcrypt.compare aunque user no exista)
- [ ] Rate limit: 5 req/min/IP
- [ ] Cookie: HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=604800
- [ ] Redirect: ADMIN → `/admin`, CUSTOMER → `/` (o `/mis-pedidos`)

## Flujo Alternativo
- Credenciales inválidas → 401 genérico
- Usuario inactivo (futuro) → 403

## Reglas de Negocio
- R-001: Sesión = 32 bytes hex (crypto.randomBytes(32).toString('hex'))
- R-002: Una sesión activa por login (no invalida anteriores)
- R-003: Expiración 7 días, renovada en cada request (sliding window opcional MVP: no)

## Endpoints
- `POST /api/auth/login` body: `{ email, password }`
- Response: `{ user, redirect }`