# ADR-006: Imágenes en Volume Local (MVP)

## Contexto
Almacenamiento de imágenes de productos.

## Decisión
**Volume local Docker** (`/app/data/images`) montado en host. URLs relativas `/images/...`.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Volume local** | Simple, cero costo, cero config, backup incluido en DB backup | No CDN, escalabilidad limitada |
| **S3-compatible (MinIO/R2/B2)** | Escalable, CDN, durabilidad | Config, credenciales, costo, complejidad |
| **Cloudinary/imgix** | Optimización auto, CDN | SaaS, vendor lock-in, costo |
| **Turso/libSQL** | SQLite replicado | Solo DB, no archivos estáticos |

## Justificación
- MVP: < 100 productos, imágenes < 500KB cada una → < 50MB total
- Backup incluido en `.backup` SQLite (archivos en mismo volume)
- Nginx/Next.js `public/` o `/images` route sirve estáticos
- Migración futura a S3: solo cambiar `imageUrl` base + upload script

## Consecuencias
- `docker-compose.yml`: volume `./data/images:/app/public/images`
- Next.js `next.config.js`: `images: { localPatterns: [{ pathname: '/images/**' }] }`
- Admin upload: `POST /api/admin/upload` → guarda en `/app/public/images/{uuid}.webp`
- Optimización: `sharp` en upload (resize, webp, quality 80)

## Estado
✅ Aprobado