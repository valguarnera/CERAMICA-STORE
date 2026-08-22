# Modelo de Autenticación — CERAMICA-STORE

## Estrategia: Sesiones Server-Side (Cookie Opaca + Tabla `sessions`)

### Flujo de Registro (con Bootstrap ADMIN)
```
POST /api/auth/register
  ├─ Validar Zod: email, password (min 8), name
  ├─ bcrypt.hash(password, 12)
  ├─ Transacción IMMEDIATE:
  │   INSERT INTO users (id, email, password_hash, role, name)
  │   SELECT ?, ?, ?, 
  │     CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
  │     ?
  │   WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)
  ├─ Si changes() = 0 → 409 "Email ya registrado"
  ├─ INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, now()+7d)
  ├─ Set-Cookie: session_id=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
  └─ Response: { user: {id,email,name,role}, redirect }
```

### Flujo de Login
```
POST /api/auth/login
  ├─ SELECT * FROM users WHERE email = ?
  ├─ bcrypt.compare(password, password_hash) [siempre, timing-safe]
  ├─ Si falla → 401 "Credenciales inválidas"
  ├─ INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, now()+7d)
  ├─ Set-Cookie: session_id=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
  └─ Response: { user: {id,email,name,role}, redirect }
```

### Middleware de Autorización
```typescript
// middleware.ts - aplica a (admin)/* y api/admin/*
export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value
  if (!sessionId) return redirect('/login')
  
  const session = await db
    .selectFrom('sessions')
    .innerJoin('users', 'sessions.user_id', 'users.id')
    .select(['users.id', 'users.email', 'users.name', 'users.role'])
    .where('sessions.id', '=', sessionId)
    .where('sessions.revoked', '=', 0)
    .where('sessions.expires_at', '>', new Date())
    .executeTakeFirst()
  
  if (!session) {
    const res = redirect('/login')
    res.cookies.delete('session_id')
    return res
  }
  
  if (request.nextUrl.pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return redirect('/')
  }
  
  // Adjuntar user a request para uso en handlers
  request.headers.set('x-user-id', session.id)
  request.headers.set('x-user-role', session.role)
  return NextResponse.next()
}
```

### Logout
```
POST /api/auth/logout
  ├─ UPDATE sessions SET revoked=1 WHERE id = ?
  ├─ Clear cookie session_id
  └─ Response: { ok: true }
```

### Limpieza de Sesiones (Cron Diario)
```sql
DELETE FROM sessions 
WHERE expires_at < datetime('now') OR revoked = 1;
```

## Bootstrap ADMIN - Garantías

### Atomicidad
- `better-sqlite3` usa `BEGIN IMMEDIATE` por defecto en `db.transaction()`
- Lock exclusivo a nivel archivo durante la transacción
- Race condition imposible: solo un INSERT puede tener éxito

### Verificación
```sql
-- Dentro de la misma transacción IMMEDIATE
CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END
```

### Invarianza
- **INV-001**: CUSTOMER nunca ejecuta operaciones ADMIN (middleware)
- **INV-002**: Un solo bootstrap ADMIN válido (primer registro)
- No existe endpoint "claim admin" público

## Rate Limiting Auth
| Endpoint | Límite | Key |
|----------|--------|-----|
| `/api/auth/register` | 3 req/min | IP |
| `/api/auth/login` | 5 req/min | IP |
| `/api/auth/logout` | 30 req/min | session |

## Cookies
| Cookie | Atributos |
|--------|-----------|
| `session_id` | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` (7 días) |

## Seguridad
- Session ID = 32 bytes cryptographically random (hex)
- bcrypt cost 12 (OWASP recomendado 2024)
- Timing attack mitigado: siempre `bcrypt.compare` aunque user no exista
- No JWT, no refresh token, no blocklist → simplicidad