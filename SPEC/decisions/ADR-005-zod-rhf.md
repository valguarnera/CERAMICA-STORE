# ADR-005: Zod + React Hook Form

## Contexto
Validación de formularios y schemas compartidos client/server.

## Decisión
**Zod** para schemas + **React Hook Form** para formularios client.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Zod + RHF** | Estándar, type-safe, DX excelente, schemas compartidos | Zod bundle size (~50kb) |
| **Valibot** | Menor bundle, modular | Menos maduro, ecosystem menor |
| **Yup** | Maduro | Más lento, API menos type-safe |
| **TanStack Form** | Headless, performant | Más nuevo, learning curve |

## Justificación
- Zod: schemas TypeScript-first, inferencia tipos automática
- RHF: performance, uncontrolled inputs, validación nativa Zod (`zodResolver`)
- Schemas en `domain/schemas/` → importados en server (API) y client (forms)
- Single source of truth para validación

## Consecuencias
- `domain/schemas/*.ts` con schemas Zod (Product, Order, Cart, Auth, Settings)
- `lib/validators.ts` helpers para server-side parsing
- RHF `useForm({ resolver: zodResolver(schema) })`

## Estado
✅ Aprobado