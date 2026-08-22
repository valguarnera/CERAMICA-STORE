# CSP Policy — CERAMICA-STORE

## Directivas Finales (Compatible Next.js 14 + Mercado Pago)

```javascript
// next.config.js
const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : ''} https://sdk.mercadopago.com https://www.mercadopago.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.mercadopago.com https://www.mercadopago.com;
  frame-src 'self' https://www.mercadopago.com https://*.mercadopago.com;
  form-action 'self' https://www.mercadopago.com;
  base-uri 'self';
  frame-ancestors 'none';
  ${!isDev ? "block-all-mixed-content;" : ""}
  ${!isDev ? "upgrade-insecure-requests;" : ""}
`.replace(/\s+/g, ' ').trim()

module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: cspDirectives },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}
```

## Justificación por Directiva

| Directiva | Valor | Justificación |
|-----------|-------|---------------|
| `default-src 'self'` | Base restrictiva | Todo desde mismo origen por defecto |
| `script-src` | `'self'` + MP SDK + `'unsafe-eval'` (dev) | Next.js requiere `unsafe-eval` en dev para HMR; MP SDK en `sdk.mercadopago.com` y `www.mercadopago.com` |
| `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | Tailwind/emotion inyectan styles inline; Google Fonts CSS |
| `font-src` | `'self' data: fonts.gstatic.com` | Fuentes locales + Google Fonts + data URI (iconos) |
| `img-src` | `'self' data: https: blob:` | Imágenes productos (https), placeholders data:, blobs (uploads) |
| `connect-src` | `'self' api.mercadopago.com www.mercadopago.com` | Fetch a MP API + SDK calls |
| `frame-src` | `'self' www.mercadopago.com *.mercadopago.com` | Checkout Pro abre iframe en subdominios MP dinámicos |
| `form-action` | `'self' www.mercadopago.com` | Formularios solo a propio dominio + MP checkout |
| `base-uri` | `'self'` | Previene base tag injection |
| `frame-ancestors` | `'none'` | No permitir iframe del sitio (clickjacking) |
| `block-all-mixed-content` | Solo prod | Fuerza HTTPS en prod |
| `upgrade-insecure-requests` | Solo prod | Upgrade HTTP→HTTPS |

## Dominios Externos Permitidos (Auditados)

| Dominio | Propósito | Directivas |
|---------|-----------|------------|
| `sdk.mercadopago.com` | JS SDK Checkout Pro | `script-src` |
| `www.mercadopago.com` | Checkout UI, redirects | `script-src`, `frame-src`, `form-action`, `connect-src` |
| `api.mercadopago.com` | REST API (webhook validation, sync) | `connect-src` |
| `fonts.googleapis.com` | CSS Google Fonts | `style-src` |
| `fonts.gstatic.com` | Archivos fuente | `font-src` |
| `*.mercadopago.com` | Subdominios dinámicos checkout | `frame-src` |

**No hay wildcards genéricos** (`*.cloudflare.com`, `*.googleapis.com`, etc.)

## Nonces: No En MVP
- Next.js 14 nonces experimental (`next/experimental/nonce`)
- Requiere: middleware genera nonce → pasa a layout → `<Script nonce={nonce}>`
- `'unsafe-inline'` en styles necesario para Tailwind (no hay workaround simple)
- **Decisión**: CSP sin nonces en MVP, report-only → enforcing

## Estrategia Staging → Production

### Fase 1: Development (Local)
- CSP deshabilitado o `report-only` con endpoint local
- Verificar que no rompe HMR, Tailwind, MP SDK

### Fase 2: Staging (2 Semanas)
```javascript
// next.config.js staging
headers: [
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
  { key: 'Report-To', value: '{"group":"csp","max_age":10886400,"endpoints":[{"url":"/api/csp-report"}]}' },
]
```
- Endpoint `/api/csp-report` loggea violaciones a consola/archivo
- Revisar logs diarios → ajustar directivas si falsos positivos
- **No bloquear deploy por CSP en staging**

### Fase 3: Production (Enforcing)
- Cambiar `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
- Mantener endpoint `/api/csp-report` para monitoreo continuo
- Alertar si violaciones > 0/día (indica regression o ataque)

## Endpoint Reporte CSP
```typescript
// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json()
  console.warn('[CSP Violation]', JSON.stringify(report, null, 2))
  // En prod: enviar a logging service (Sentry, Datadog, etc.)
  return new Response(null, { status: 204 })
}
```

## Testing CSP
```bash
# Verificar headers en staging/prod
curl -I https://staging.ceramica-store.com | grep -i content-security-policy

# Verificar violaciones en console devtools
# Security tab → CSP violations
```

## Checklist Pre-Prod
- [ ] 2 semanas en staging con `Report-Only` sin violaciones legítimas
- [ ] MP checkout funciona (iframe carga, redirect OK)
- [ ] Google Fonts cargan
- [ ] Imágenes productos cargan (https externo si aplica)
- [ ] No `unsafe-eval` en prod
- [ ] Endpoint `/api/csp-report` recibiendo y loggeando