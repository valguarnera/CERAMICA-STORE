# ADR-004: Zustand para Carrito (Client-Side Only)

## Contexto
Carrito necesita estado reactivo en cliente, persistente, simple.

## Decisión
**Zustand** solo para representación visual (UI state). Fuente de verdad = cookie firmada server-side.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Zustand** | Simple, SSR-friendly, 1kb, no providers | Dual source of truth si no se disciplina |
| **Redux Toolkit** | DevTools, opinionated | Overkill, boilerplate, provider wrapper |
| **React Context** | Built-in | Re-renders innecesarios, no persistente |
| **Jotai** | Atomic, minimal | Curva aprendizaje, similar a Zustand |

## Justificación
- Zustand minimalista, API simple (`create`, `persist` middleware)
- **Crítico**: Solo vista. Cookie firmada = source of truth.
- Hidrata de `GET /api/cart` al montar
- Mutaciones → API call → `router.refresh()` → re-hidrata
- Evita sync manual localStorage ↔ cookie

## Consecuencias
- `presentation/hooks/useCart.ts` con `create<CartState>()`
- `persist` middleware solo para cache UI (no source of truth)
- `router.refresh()` después de cada mutación API

## Estado
✅ Aprobado