# ADR-003: shadcn/ui + Tailwind CSS

## Contexto
Necesitamos componentes UI accesibles, customizables, sin vendor lock-in.

## Decisión
**shadcn/ui** (componentes copiados, no libreria) + **Tailwind CSS**.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **shadcn/ui** | Accesible (Radix), ownership total (código en tu repo), Tailwind, customizable | Requiere copiar componentes, no "npm install" |
| **Radix UI + Tailwind** | Primitivas headless, accesible | Más boilerplate, menos componentes listos |
| **Material UI** | Completo, maduro | Pesado, theming complejo, vendor lock-in |
| **Custom CSS** | Control total | Reinventar rueda, accesibilidad difícil |

## Justificación
- shadcn/ui = componentes Radix + Tailwind ya compuestos
- Código en `components/ui/` → se modifica directamente
- Sin dependencia de versión, sin breaking changes sorpresa
- Accesibilidad (ARIA) incluida por Radix
- Tailwind: utility-first, bundle pequeño, dark mode fácil

## Consecuencias
- `components/ui/` copiado de shadcn/ui (button, input, dialog, table, etc.)
- `tailwind.config.ts` con theme personalizado
- `components.json` para CLI shadcn (opcional)
- Dark mode via `class` strategy

## Estado
✅ Aprobado