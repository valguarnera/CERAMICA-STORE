# Rate Limiting — CERAMICA-STORE

## Estrategia: Solo Next.js Middleware + SQLite Store

### Por Qué No Traefik
- Traefik rate limit = config en YAML (docker labels), no en código
- Debug distribuido (logs en 2 lugares)
- Next.js middleware: una sola fuente de verdad, testeable, logs centralizados
- SQLite store: persistente entre deploys, no requiere Redis externo

## Implementación

### Middleware (`middleware.ts`)
```typescript
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Rate limiting ANTES de auth (protege login/register)
  const rlResponse = await rateLimit(request)
  if (rlResponse) return rlResponse
  
  // ... auth logic
}
```

### Store SQLite (`lib/rate-limit.ts`)
```typescript
import { SQLiteStore } from 'rate-limiter-flexible'

const db = getDatabase() // Kysely instance

// Tabla auto-creada por rate-limiter-flexible
// CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, points INTEGER, expire INTEGER)

const limiter = new RateLimiterFlexible({
  storeClient: new SQLiteStore(db, 'rate_limits'),
  points: 10,        // requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block 60s if exceeded
})

export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const key = getRateLimitKey(request)
  
  try {
    await limiter.consume(key)
    return null // OK
  } catch (rejRes) {
    const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(retrySecs),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + retrySecs),
      },
    })
  }
}

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  const path = request.nextUrl.pathname
  return `rl:${path}:${ip}`
}
```

## Límites por Endpoint

| Endpoint | Límite | Ventana | Key | Acción si Excede |
|----------|--------|---------|-----|------------------|
| `/api/auth/register` | 3 | 1 min | IP | 429 + block 60s |
| `/api/auth/login` | 5 | 1 min | IP | 429 + block 60s |
| `/api/checkout/start` | 10 | 1 min | Session ID | 429 |
| `/api/cart/*` | 30 | 1 min | Session ID | 429 |
| `/api/webhooks/mercadopago` | 100 | 1 min | IP | **Log only** (validar firma primero) |
| `/api/admin/*` | 60 | 1 min | Session ID | 429 |
| Resto API | 60 | 1 min | IP | 429 |

### Webhook MP: Excepción
- Validar firma HMAC **antes** de rate limit
- IPs conocidas de MP → allowlist opcional
- Límite alto (100/min) solo para evitar DoS accidental

## Identificación de Cliente
| Contexto | Identificador |
|----------|---------------|
| Sin sesión (auth, checkout init) | IP + User-Agent (hash) |
| Con sesión (cart, user endpoints) | `session_id` (cookie) |
| Admin | `session_id` (más estricto) |

## Limpieza Automática
- `rate-limiter-flexible` maneja TTL via columna `expire` (Unix timestamp)
- Entradas expiradas se limpian en cada `consume()` (lazy cleanup)
- Opcional: cron semanal `DELETE FROM rate_limits WHERE expire < strftime('%s', 'now')`

## Headers de Respuesta
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700000000
Retry-After: 45  (solo en 429)
```

## Testing
```typescript
// rate-limit.test.ts
test('login rate limit bloquea tras 5 intentos', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await request(app).post('/api/auth/login').send({email:'a@b.com',password:'x'})
    expect(res.status).not.toBe(429)
  }
  const res = await request(app).post('/api/auth/login').send({email:'a@b.com',password:'x'})
  expect(res.status).toBe(429)
  expect(res.headers['retry-after']).toBeDefined()
})
```

## Configuración en Código (No en Infra)
- Límites definidos en `lib/rate-limit-config.ts` (versionados)
- Fácil ajustar sin redeploy infra
- Traefik solo: TLS termination + proxy pass