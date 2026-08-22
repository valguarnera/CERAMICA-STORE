# ADR-008: MDX para Contenido Editorial

## Contexto
Páginas estáticas: Home, About, FAQ. ¿Keystatic o archivos MDX?

## Decisión
**Archivos MDX en `/content`** (git-tracked, build-time). Keystatic **no se usa**.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **MDX files** | Cero deps, git-tracked, PR-reviewable, build-time, gratis | Editor no-técnico necesita GitHub/VS Code |
| **Keystatic** | UI visual, preview, schema TS | Dep extra, config, build sync, overkill para 3 páginas |

## Justificación
- Usuario final = **desarrollador** (tú). No hay editor no-técnico.
- 3 páginas (home, about, FAQ) → cero justificación CMS
- MDX: frontmatter + componentes React en markdown
- `mdx-bundler` o `next-mdx-remote` en build time
- Cero runtime cost, cero config CMS

## Consecuencias
- `/content/home.mdx`, `/content/about.mdx`, `/content/faq.mdx`
- Frontmatter: `title`, `description`, `updatedAt`
- Loader en `infrastructure/content/MDXLoader.ts`
- Keystatic **no instalado**, no configurado

## Estado
✅ Aprobado