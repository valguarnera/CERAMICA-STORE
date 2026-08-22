# ADR-001: Kysely como Query Builder

## Contexto
Necesitamos acceso a BD type-safe, migrable a PostgreSQL, sin overhead runtime.

## Decisión
**Usar Kysely** como query builder principal.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Kysely** | Type-safe, zero runtime, SQL-like, fácil swap dialecto | Curva aprendizaje, menos "mágico" |
| **Prisma** | DX excelente, migraciones auto, Prisma Client | Runtime overhead, schema.prisma coupling, migraciones PG distintas |
| **Drizzle** | Ligero, type-safe, SQL-like | Menos maduro, ecosystem menor |
| **Raw SQL (better-sqlite3)** | Control total, cero abstracción | Repetitivo, propenso errores, sin type-safety |

## Justificación
- Type-safety en TypeScript sin runtime cost
- `Database` interface única → swap `SqliteDialect` ↔ `PostgresDialect`
- Queries portables (Kysely query builder) evitan SQL dialect-specific
- Mantenibilidad: código legible, cercano a SQL

## Consecuencias
- `domain/db.ts` define interface `Database` (contrato)
- `infrastructure/database/sqlite/connection.ts` y futuro `postgres/connection.ts` implementan
- Services usan `Kysely<Database>` genérico
- Migración PG = cambiar connection + fixear queries raw si existen

## Estado
✅ Aprobado