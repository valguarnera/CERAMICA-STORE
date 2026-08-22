# Threat Model — CERAMICA-STORE

## Activos
| Activo | Clasificación | Impacto Compromiso |
|--------|---------------|-------------------|
| `users.password_hash` | Crítico | Total (credenciales) |
| `sessions.id` | Alto | Acceso cuentas |
| `orders` + `payments` | Alto | Datos financieros, PII |
| `MP_ACCESS_TOKEN` | Crítico | Control total cuenta MP |
| `MP_WEBHOOK_SECRET` | Alto | Validación webhooks |
| `SESSION_SECRET` | Alto | Firma cookies |
| SQLite DB file | Crítico | Todos los datos |

## Superficies de Ataque

### 1. Autenticación
| Amenaza | Mitigación |
|---------|------------|
| Brute force login | Rate limit 5/min/IP + bcrypt cost 12 |
| Credential stuffing | Rate limit + login genérico "credenciales inválidas" |
| Session hijacking | Cookie HttpOnly+Secure+SameSite=Lax, 32 bytes random |
| Session fixation | Nueva sesión en login (no reusa) |
| Timing attack | `bcrypt.compare` siempre (user existe o no) |

### 2. Carrito / Checkout
| Amenaza | Mitigación |
|---------|------------|
| Price tampering | Validación server-side obligatoria en `/api/checkout/start` |
| Quantity tampering | Validación stock BD en cada mutación |
| Cart fixation | Cookie firmada HMAC + version optimistic locking |
| Replay attack | `external_reference` único por order |

### 3. Pagos (Mercado Pago)
| Amenaza | Mitigación |
|---------|------------|
| Webhook spoofing | HMAC SHA256 verification (`x-signature` + `x-request-id`) |
| Payment status tampering | Consulta MP API server-side (source of truth) |
| Idempotency bypass | `mp_payment_id` UNIQUE + `webhooks_log` process-once |
| Redirect manipulation | Nunca confiar en `/checkout/success` params |
| Admin payment forgery | "Sincronizar" solo consulta MP, nunca set manual |

### 4. Admin / Backoffice
| Amenaza | Mitigación |
|---------|------------|
| Privilege escalation | Middleware valida `role === 'ADMIN'` en cada request |
| CSRF | SameSite=Lax + POST/PATCH/DELETE requieren session válida |
| XSS en admin | CSP estricta, sanitización outputs, React auto-escape |
| SQL injection | Kysely prepared statements (nunca string interpolation) |

### 5. Infraestructura
| Amenaza | Mitigación |
|---------|------------|
| SQLite file theft | Volume persistente solo montado en container, no expuesto |
| Backup theft | Backups en mismo volume (host), permisos 600 |
| Container escape | Non-root user (1001), read-only rootfs, drop capabilities |
| MITM | Coolify TLS (Let's Encrypt), HSTS, secure cookies |
| DDoS | Rate limiting middleware + Traefik proxy buffer |

## Controles de Seguridad por Capa

### Aplicación
- ✅ CSP con nonces (report-only → enforcing)
- ✅ Cookies: HttpOnly, Secure, SameSite=Lax
- ✅ Rate limiting en middleware (SQLite store)
- ✅ Validación Zod en TODOS los inputs
- ✅ Prepared statements (Kysely)
- ✅ bcrypt cost 12
- ✅ Session IDs 32 bytes crypto-random
- ✅ No secrets en client bundle

### Datos
- ✅ Passwords: solo hash (bcrypt), nunca log
- ✅ MP tokens: solo env vars server, nunca en response
- ✅ PII mínimo: email, nombre, dirección (necesario para envío)
- ✅ Logs sin datos sensibles (sanitizar)

### Infraestructura
- ✅ Docker: non-root, read-only rootfs, drop ALL caps
- ✅ Coolify: TLS automático, headers seguridad
- ✅ SQLite: WAL mode, backup cron + verificación
- ✅ Volumes: permisos 1001:1001, no world-readable

## Matriz de Riesgos Residuales

| Riesgo | Probabilidad | Impacto | Residual | Aceptación |
|--------|--------------|---------|----------|------------|
| MP webhook perdido 28d | Baja | Alto | Monitoreo + botón sync + polling | Aceptado |
| SQLite corruption | Muy baja | Crítico | WAL + backup 5min + verify mensual | Aceptado |
| Session ID brute force | Muy baja | Alto | 32 bytes = 2^256 espacio | Aceptado |
| CSP bypass via MP | Baja | Medio | Report-only 2 semanas staging | Mitigado |
| Admin credential leak | Baja | Crítico | Rate limit, logs, rotación manual | Aceptado |

## Incident Response (Runbooks)
Ver `SPEC/operations/runbooks/`:
- `mp-webhook-failure.md`
- `stock-negative.md`
- `admin-impersonation.md`

## Compliance MVP
- 🇦🇷 Argentina: Ley 25.326 (Datos Personales) — email, nombre, dirección = consentimiento checkout
- 💳 PCI DSS: **No almacenamos tarjetas** (MP maneja todo), SAQ A aplicable
- 🍪 Cookies: Informar uso sesión + carrito (banner simple)