# ADR-002: Sesiones DB (Cookie Opaca + Tabla sessions)

## Contexto
Necesitamos autenticación simple, segura, revocable, sin complejidad JWT/refresh.

## Decisión
**Sesiones Server-Side**: Cookie opaca (`session_id`) + tabla `sessions` en SQLite.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Sesiones DB** | Revocación inmediata natural, simple, una cookie, sin blocklist | Lookup DB por request (mitigado con índice) |
| **JWT + Refresh + Blocklist** | Stateless access | Complejidad: 2 cookies, blocklist, rotación claves, refresh logic |
| **NextAuth.js** | Battle-tested, providers | Dependencia pesada, opinionated, menos control |
| **JWT corto (5min) sin refresh** | Simple | UX pobre (re-login frecuente) |

## Justificación
- SQLite local, baja concurrencia → lookup DB trivial (<1ms con índice)
- Revocación = `UPDATE sessions SET revoked=1` (inmediata)
- Sin secrets rotativos, sin refresh tokens, sin blocklist
- Una cookie semántica clara (`session_id`)
- Bootstrap ADMIN atómico via transacción `IMMEDIATE` en registro

## Consecuencias
- Tabla `sessions` con `id`, `user_id`, `expires_at`, `revoked`
- Middleware valida sesión en cada request admin
- Cron limpieza diaria sesiones expiradas/revocadas
- Rate limiting usa misma tabla `rate_limits` (separada)

## Estado
✅ Aprobado