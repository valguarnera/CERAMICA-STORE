# CERAMICA-STORE — Development Timeline

> **Estado actual:** Fase 4 — COMPLETADA
> **Próxima fase:** Fase 5 — Storefront / Catálogo
> **Fuente de verdad:** `SPEC/`
> **Última actualización:** 2026-08-23

---

## 1. Propósito

Este documento define el roadmap de desarrollo de CERAMICA-STORE.

Su objetivo es servir como:

* mapa general del proyecto para los desarrolladores;
* guía de trabajo para agentes de IA;
* registro del estado de cada fase;
* límite de alcance para cada etapa;
* checklist de finalización;
* referencia rápida antes de comenzar una nueva fase.

La `SPEC/` continúa siendo la **fuente de verdad funcional y técnica**.

Este archivo no reemplaza la SPEC: indica **en qué fase estamos, qué se hizo y qué falta hacer**.

---

# 2. Reglas de trabajo

## 2.1 SPEC First

Antes de implementar una funcionalidad:

1. Identificar el caso de uso correspondiente.
2. Leer los documentos de `SPEC/` relacionados.
3. Identificar invariantes aplicables.
4. Revisar implementación existente.
5. Revisar tests existentes.
6. Diseñar el cambio.
7. Implementar.
8. Ejecutar tests.
9. Verificar que no se hayan roto fases anteriores.
10. Reportar el resultado.

---

## 2.2 No modificar fases cerradas

Una fase marcada como:

`✅ COMPLETADA`

debe considerarse estable.

Un agente no debe reescribir, reemplazar o modificar arbitrariamente funcionalidades de fases anteriores.

Si encuentra un problema:

1. identificarlo;
2. demostrarlo;
3. explicar el impacto;
4. proponer una solución;
5. modificar la SPEC si corresponde;
6. recién entonces modificar el código.

---

## 2.3 Respetar el alcance

Cada fase tiene un objetivo específico.

No implementar funcionalidades pertenecientes a fases posteriores salvo que exista una dependencia explícita.

Ejemplo:

Mientras se trabaja en Fase 5, no comenzar espontáneamente con:

* Mercado Pago;
* PostgreSQL;
* infraestructura de producción;
* administración avanzada.

---

## 2.4 Tests como contrato

Una fase no está terminada simplemente porque el código compile.

Debe verificarse:

```text
SPEC
  ↓
Implementación
  ↓
Tests
  ↓
Invariantes
  ↓
Fase completa
```

---

# 3. Estado general

| Fase | Área                                 | Estado       |
| ---- | ------------------------------------ | ------------ |
| 0    | Especificación                       | ✅ COMPLETADA |
| 1    | Arquitectura y dominio               | ✅ COMPLETADA |
| 2    | Persistencia y base de datos         | ✅ COMPLETADA |
| 3    | Carrito y pedidos                    | ✅ COMPLETADA |
| 4    | Autenticación y servicios de dominio | ✅ COMPLETADA |
| 5    | Storefront / Catálogo                | ⏳ PRÓXIMA    |
| 6    | Checkout / Mercado Pago              | ⏳ PENDIENTE  |
| 7    | Backoffice ADMIN                     | ⏳ PENDIENTE  |
| 8    | Seguridad / Hardening                | ⏳ PENDIENTE  |
| 9    | Testing integral                     | ⏳ PENDIENTE  |
| 10   | Deploy / Producción                  | ⏳ PENDIENTE  |
| 11   | Backups / Operación                  | ⏳ PENDIENTE  |
| 12   | Migración PostgreSQL                 | ⏳ FUTURA     |

---

# 4. Fase 0 — Especificación

## Estado

`✅ COMPLETADA`

## Objetivo

Definir el comportamiento esperado del sistema antes de implementar.

## Resultado

Se creó la especificación técnica completa bajo `SPEC/`.

Incluye:

* requisitos;
* casos de uso;
* arquitectura;
* invariantes;
* modelo de datos;
* autenticación;
* carrito;
* pagos;
* stock;
* migraciones;
* rate limiting;
* backups;
* CSP;
* testing.

Actualmente existen aproximadamente **42 documentos de SPEC**.

## Criterio de finalización

La funcionalidad requerida debe estar definida antes de su implementación.

---

# 5. Fase 1 — Arquitectura y dominio

## Estado

`✅ COMPLETADA`

## Objetivo

Establecer las reglas estructurales y de negocio del sistema.

## Incluye

* arquitectura;
* dominio;
* entidades;
* servicios;
* invariantes;
* casos de uso;
* separación de responsabilidades;
* modelo de datos;
* autenticación;
* carrito;
* pedidos;
* stock;
* pagos.

## Principio

Las reglas de negocio deben permanecer independientes de:

* UI;
* framework;
* infraestructura;
* base de datos;
* proveedores externos.

---

# 6. Fase 2 — Persistencia y base de datos

## Estado

`✅ COMPLETADA`

## Objetivo

Implementar la persistencia SQLite definida en la SPEC.

## Verificado

* tablas;
* relaciones;
* foreign keys;
* índices;
* `CHECK constraints`;
* triggers;
* integridad referencial;
* compatibilidad con el modelo definido.

## Estrategia futura

La arquitectura debe permitir:

```text
SQLite
  ↓
PostgreSQL
```

sin reescribir las reglas de negocio.

---

# 7. Fase 3 — Carrito y pedidos

## Estado

`✅ COMPLETADA`

## Objetivo

Implementar las reglas centrales relacionadas con compras y pedidos.

## Carrito

Implementado:

* cookie firmada;
* fuente única de verdad;
* validación;
* cantidades;
* actualización;
* eliminación;
* persistencia.

## Pedidos

Implementado:

* creación;
* estados;
* reglas de stock;
* invariantes;
* relaciones necesarias.

## Tests existentes

```text
Cart   → 14 tests
Order  → 5 tests
```

---

# 8. Fase 4 — Autenticación y servicios de dominio

## Estado

`✅ COMPLETADA`

## Objetivo

Implementar autenticación, sesiones y protección de áreas administrativas.

## Auth Routes

Implementadas:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Con:

* Zod;
* bcrypt cost 12;
* rate limiting;
* HttpOnly cookies.

## Session Service

Implementado:

```text
createSession()
validateSession()
revokeSession()
cleanupExpiredSessions()
```

La validación verifica:

```text
revoked = 0
AND
expires_at > now
```

## Middleware

Protege:

```text
/admin/*
/api/admin/*
```

Y exige:

```text
role === 'ADMIN'
```

Además establece los headers `x-user-*`.

## Bootstrap ADMIN

Se implementó creación atómica del primer ADMIN mediante:

```sql
BEGIN IMMEDIATE
```

y:

```sql
CASE
    WHEN (SELECT COUNT(*) FROM users) = 0
        THEN 'ADMIN'
    ELSE 'CUSTOMER'
END
```

Esto garantiza `INV-002`:

> Existe un único ADMIN de bootstrap.

La implementación es segura incluso frente a registros concurrentes.

## Tests

Actualmente:

```text
Auth        10
Cart        14
Order        5
Migrations  14
----------------
TOTAL       43
```

**43/43 tests pasando.**

Incluye test de concurrencia para el bootstrap ADMIN.

## Deuda técnica conocida

La SPEC define:

```text
SQLite + rate-limiter-flexible
```

La implementación actual utiliza:

```text
In-memory Map
```

Esto es aceptable para el MVP single-instance, pero debe registrarse como deuda técnica.

## Fuera del alcance

No corresponden a esta fase:

```text
GET /api/orders
GET /api/orders/:id
```

Estas rutas corresponden a fases Storefront/Admin.

El cron de limpieza de sesiones también queda como tarea operacional futura.

---

# 9. Fase 5 — Storefront / Catálogo

## Estado

`⏳ PRÓXIMA`

## Objetivo

Construir la experiencia pública de compra.

## Flujo objetivo

```text
Visitante
   ↓
Catálogo
   ↓
Producto
   ↓
Agregar al carrito
   ↓
Modificar carrito
   ↓
Checkout
```

## Implementar

* catálogo;
* listado de productos;
* detalle de producto;
* disponibilidad;
* carrito UI;
* cantidades;
* eliminación;
* validaciones;
* API routes correspondientes;
* manejo de errores.

## Debe respetar

```text
SPEC/requirements/
SPEC/architecture/cart-model.md
SPEC/architecture/stock-rules.md
```

## Criterio de finalización

El usuario debe poder recorrer el catálogo y administrar su carrito desde el storefront sin romper las invariantes existentes.

---

# 10. Fase 6 — Checkout / Mercado Pago

## Estado

`⏳ PENDIENTE`

## Objetivo

Implementar el proceso completo de checkout y pago.

## Flujo

```text
Carrito
   ↓
Checkout
   ↓
Crear pedido
   ↓
Mercado Pago
   ↓
Pago
   ↓
Webhook
   ↓
Actualizar pedido
```

## Implementar

* checkout;
* creación de preferencia;
* integración Mercado Pago;
* webhook;
* validación;
* idempotencia;
* estados de pago;
* errores;
* escenarios definidos en la SPEC.

## Regla crítica

El navegador nunca debe considerarse autoridad sobre el resultado del pago.

La fuente de verdad debe ser:

```text
Mercado Pago
   ↓
Webhook
   ↓
Backend
   ↓
Pedido
```

---

# 11. Fase 7 — Backoffice ADMIN

## Estado

`⏳ PENDIENTE`

## Objetivo

Crear la interfaz administrativa de la tienda.

## Áreas

```text
ADMIN
 ├── Productos
 ├── Stock
 ├── Pedidos
 ├── Usuarios
 └── Configuración
```

## Incluir

* gestión de productos;
* stock;
* pedidos;
* consulta de pedidos;
* detalle de pedidos;
* configuración;
* autorización ADMIN.

## Casos relacionados

Entre otros:

```text
UC-010 — Mis pedidos
UC-011 — Detalle de pedido
```

---

# 12. Fase 8 — Seguridad / Hardening

## Estado

`⏳ PENDIENTE`

## Objetivo

Realizar una revisión integral de seguridad.

## Revisar

* autenticación;
* autorización;
* sesiones;
* cookies;
* CSP;
* CSRF cuando corresponda;
* XSS;
* SQL injection;
* validación de inputs;
* headers;
* rate limiting;
* webhooks;
* idempotencia;
* secretos;
* logs;
* mensajes de error.

## También

Verificar:

```text
No secrets en Git
No .env reales en Git
No datos sensibles en logs
```

---

# 13. Fase 9 — Testing integral

## Estado

`⏳ PENDIENTE`

## Objetivo

Validar los flujos completos del sistema.

## Flujo principal

```text
Registro
  ↓
Login
  ↓
Catálogo
  ↓
Carrito
  ↓
Checkout
  ↓
Pago
  ↓
Webhook
  ↓
Pedido
  ↓
ADMIN
```

## Casos críticos

### Concurrencia

* registros simultáneos;
* compras simultáneas;
* stock insuficiente;
* webhooks duplicados;
* operaciones simultáneas sobre el mismo pedido.

### Property-based testing

Utilizar `fast-check` cuando aporte valor real.

---

# 14. Fase 10 — Deploy / Producción

## Estado

`⏳ PENDIENTE`

## Objetivo

Preparar el sistema para deployment reproducible.

## Flujo esperado

```text
Git
 ↓
Coolify
 ↓
Docker build
 ↓
Container
 ↓
Persistent Volume
 ↓
SQLite
```

## Persistencia

```text
/app/data
```

## Secrets

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
JWT_SECRET
```

## Health check

```text
GET /api/health
```

---

# 15. Fase 11 — Backups / Operación

## Estado

`⏳ PENDIENTE`

## Objetivo

Garantizar recuperación ante pérdida o corrupción de datos.

## Implementar

```text
SQLite
 ↓
Backup periódico
 ↓
Verificación
 ↓
Retención
 ↓
Restauración probada
```

## Principio

> Un backup que nunca fue restaurado exitosamente es una esperanza, no un backup verificado.

También deberá contemplarse:

* limpieza automática de sesiones;
* cron jobs;
* logs;
* monitoreo;
* health checks;
* procedimientos de recuperación.

---

# 16. Fase 12 — Migración PostgreSQL

## Estado

`⏳ FUTURA`

## Objetivo

Migrar de SQLite a PostgreSQL solamente cuando exista una necesidad real.

## Estrategia

```text
SQLite
   ↓
crecimiento / necesidad real
   ↓
PostgreSQL
```

La migración debe seguir:

```text
SPEC/architecture/migration-strategy.md
```

## Regla

La migración de base de datos no debe modificar las reglas de negocio.

---

# 17. Criterio general de finalización

Una fase puede marcarse:

`✅ COMPLETADA`

solamente cuando:

* la SPEC correspondiente fue implementada;
* los tests relevantes pasan;
* no existen regresiones conocidas;
* las invariantes se mantienen;
* las deudas técnicas están documentadas;
* no quedan tareas críticas ocultas;
* el agente puede explicar qué cambió;
* el alcance de la fase está cerrado.

---

# 18. Estado actual

```text
                 CERAMICA-STORE

FASE 0  SPEC                    ██████████ ✅
FASE 1  Arquitectura            ██████████ ✅
FASE 2  Persistencia            ██████████ ✅
FASE 3  Carrito / Pedidos       ██████████ ✅
FASE 4  Auth / Sesiones          ██████████ ✅
FASE 5  Storefront                     ░░ ⏳
FASE 6  Checkout / MP                  ░░ ⏳
FASE 7  Backoffice                     ░░ ⏳
FASE 8  Security                       ░░ ⏳
FASE 9  Testing integral               ░░ ⏳
FASE 10 Deploy                         ░░ ⏳
FASE 11 Operación                      ░░ ⏳
FASE 12 PostgreSQL                     ░░ ⏳
```

---

# 19. Próximo trabajo

## FASE 5 — STOREFRONT / CATÁLOGO

El próximo agente debe comenzar por:

1. Leer `TIMELINE.md`.
2. Confirmar que Fase 4 permanece completa.
3. Leer los documentos de `SPEC/` relacionados con Storefront.
4. Identificar los casos de uso correspondientes.
5. Revisar el código existente antes de modificarlo.
6. Crear un plan de implementación.
7. Implementar únicamente el alcance de Fase 5.
8. Ejecutar los tests existentes.
9. Agregar tests nuevos necesarios.
10. Verificar invariantes.
11. No modificar funcionalidades de fases cerradas sin justificación.
12. Informar exactamente qué se hizo y qué queda pendiente.

**No avanzar a Fase 6 hasta que Fase 5 cumpla sus criterios de finalización.**

---

# 20. Regla final para agentes

> **No programes a ciegas.**
>
> Primero entiende la SPEC.
>
> Después entiende la fase.
>
> Después entiende el código existente.
>
> Después implementa.
>
> Después prueba.
>
> Finalmente reporta.

El objetivo no es solamente producir código que funcione.

El objetivo es construir CERAMICA-STORE **por fases, con trazabilidad, invariantes verificables y una arquitectura que pueda evolucionar sin rehacer el proyecto.**

Lenguaje en español en respuestas por consola.
