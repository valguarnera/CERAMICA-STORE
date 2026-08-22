# Deploy Coolify — CERAMICA-STORE

## Arquitectura Despliegue

```
Coolify (VPS/RPi)
├── Git Repository (GitHub/GitLab/Gitea)
│   └── Auto-deploy en push a main
├── Docker Compose (app service)
├── Persistent Volumes
│   ├── /app/data → SQLite + backups
│   └── /app/backups → Backups (montado en host)
├── Environment Variables (Secrets)
│   ├── MP_ACCESS_TOKEN
│   ├── MP_WEBHOOK_SECRET
│   ├── MP_PUBLIC_KEY
│   ├── MP_SANDBOX=true/false
│   ├── SESSION_SECRET (32+ chars random)
│   ├── DATABASE_PATH=/app/data/ceramica.db
│   ├── EMAIL_PROVIDER=console|resend|smtp
│   ├── RESEND_API_KEY (si Resend)
│   ├── SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (si SMTP)
│   ├── NODE_ENV=production
│   └── BASE_URL=https://ceramica-store.com
├── Traefik (Proxy + TLS)
│   ├── Let's Encrypt automático
│   ├── Security headers (CSP, HSTS, etc.)
│   └── Rate limiting: SOLO TLS/buffer (NO rate limit en Traefik)
├── Health Check
│   └── GET /api/health → 200 OK + DB ping
└── Dominio + TLS
    └── ceramica-store.com + www
```

## Docker Compose (Producción)

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    image: ceramica-store:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/ceramica.db
    env_file:
      - .env.production
    volumes:
      - ceramica-data:/app/data
      - ceramica-backups:/app/backups
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ceramica.rule=Host(\`ceramica-store.com\`)"
      - "traefik.http.routers.ceramica.tls=true"
      - "traefik.http.routers.ceramica.tls.certresolver=letsencrypt"
      - "traefik.http.services.ceramica.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  ceramica-data:
  ceramica-backups:
```

## Dockerfile (Multi-stage)

```dockerfile
# syntax=docker/dockerfile:1.4

# ===== Builder =====
FROM node:20-alpine AS builder
WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci

# Source
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Runner =====
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Data volume (SQLite + backups)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

## Next.js Standalone Output
```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  // ... resto config
}
```

## Variables de Entorno (Coolify Secrets)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MP_ACCESS_TOKEN` | Access Token MP (prod) | `APP_USR-...` |
| `MP_PUBLIC_KEY` | Public Key MP (si usa SDK frontend) | `APP_USR-...` |
| `MP_WEBHOOK_SECRET` | Secret firma webhook | `whsec_...` |
| `MP_SANDBOX` | `true` staging, `false` prod | `false` |
| `SESSION_SECRET` | Firma cookies (32+ chars) | `openssl rand -hex 32` |
| `DATABASE_PATH` | Path SQLite | `/app/data/ceramica.db` |
| `EMAIL_PROVIDER` | `console` \| `resend` \| `smtp` | `resend` |
| `RESEND_API_KEY` | API Key Resend | `re_...` |
| `SMTP_HOST` | Host SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | `noreply@dominio.com` |
| `SMTP_PASS` | Password SMTP | `...` |
| `SMTP_FROM` | Remitente | `Cerámica Store <noreply@dominio.com>` |
| `BASE_URL` | URL pública | `https://ceramica-store.com` |
| `NODE_ENV` | Entorno | `production` |

## Coolify Configuración

### 1. Crear Proyecto
- Source: Git repository
- Build: Docker Compose
- Base path: `/`

### 2. Configurar Volumes
- `ceramica-data` → `/app/data` (persistent)
- `ceramica-backups` → `/app/backups` (persistent)

### 3. Environment Variables
- Agregar todas las secrets en Coolify UI (encrypted)
- `MP_SANDBOX=true` en staging, `false` en prod

### 4. Dominio + TLS
- Add domain: `ceramica-store.com`
- Enable TLS: Let's Encrypt (automático)
- Force HTTPS: ON

### 5. Health Check
- Path: `/api/health`
- Interval: 30s
- Timeout: 10s

### 6. Deploy
- Push a `main` → auto-deploy
- Watch logs en Coolify UI

## Health Check Endpoint

```typescript
// app/api/health/route.ts
import { getDatabase } from '@/infrastructure/database/connection'

export async function GET() {
  try {
    const db = getDatabase()
    await db.selectFrom('sqlite_master').select('name').limit(1).execute()
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (e) {
    return Response.json({ status: 'error', error: String(e) }, { status: 503 })
  }
}
```

## Migración Staging → Producción

### Staging (Coolify Preview / Branch)
- Branch `staging` → auto-deploy a `staging.ceramica-store.com`
- `MP_SANDBOX=true`
- `EMAIL_PROVIDER=console`
- Datos de prueba

### Producción
- Branch `main` → auto-deploy a `ceramica-store.com`
- `MP_SANDBOX=false`
- `EMAIL_PROVIDER=resend|smtp`
- Datos reales

### Checklist Pre-Prod
- [ ] MP credentials producción válidas (test connection en admin)
- [ ] Webhook URL actualizada en MP dashboard (`https://ceramica-store.com/api/webhooks/mercadopago`)
- [ ] `MP_SANDBOX=false`
- [ ] `SESSION_SECRET` único y fuerte
- [ ] CSP en `Content-Security-Policy` (no Report-Only)
- [ ] Backups funcionando (verify script OK)
- [ ] Health check passing
- [ ] DNS propagado + TLS válido

## Rollback
```bash
# Coolify UI: Deployments → Previous → Redeploy
# O: git revert + push
# Tiempo: ~2-3 min
```

## Monitoreo Básico
- Coolify: CPU, RAM, Disk, Logs
- Health check: `/api/health` (uptime)
- Logs: `docker logs -f ceramica-store-app`
- Backup verify: `/var/log/backup-verify.log` (mensual)