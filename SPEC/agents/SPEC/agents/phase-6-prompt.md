Estamos trabajando en CERAMICA-STORE.

Quiero comenzar la FASE 6 — CHECKOUT / MERCADO PAGO.

IMPORTANTE:
Respondeme TODO en español.
Conservá en inglés únicamente nombres técnicos, nombres de archivos,
funciones, rutas, comandos, librerías y código.

REGLA PRINCIPAL:
TIMELINE.md y SPEC/ son la fuente de verdad.
No inventes requisitos y no reimplementes funcionalidades de fases cerradas.

ANTES DE MODIFICAR CÓDIGO:

1. Leer completo TIMELINE.md.

2. Leer la sección:
   "## 10. Fase 6 — Checkout / Mercado Pago"

3. Confirmar que Fases 1–5 figuran como COMPLETADAS y entender qué
   capacidades ya existen.

4. Leer los documentos SPEC relacionados con esta fase:
   - payment-model.md
   - mp-integration.md
   - UC-005
   - UC-006
   - UC-007
   - UC-017

   Si alguno de esos archivos tiene otro nombre o ubicación exacta,
   localizarlo dentro de SPEC/ en lugar de asumir.

5. Identificar todos los casos de uso, invariantes y reglas relacionadas
   con Checkout, Order, Payment y Mercado Pago.

6. Revisar el código existente, especialmente:

   - ProductService
   - CartService
   - Cart API
   - OrderService
   - modelos de Order/Payment
   - autenticación
   - Storefront
   - configuración de base de datos
   - configuración/env relacionada con Mercado Pago

   NO reimplementar estas funcionalidades.

7. Verificar qué partes de la Fase 6 ya están preparadas por las fases
   anteriores y cuáles realmente faltan.

8. Revisar especialmente las invariantes INV-006 a INV-013 y explicar
   cómo deben preservarse durante Checkout y el procesamiento de pagos.

9. Revisar la estrategia de:
   - idempotencia;
   - webhook;
   - estados de Payment;
   - estados de Order;
   - transiciones válidas;
   - errores;
   - webhooks duplicados;
   - webhooks fuera de orden;
   - validación HMAC;
   - mp_payment_id UNIQUE;
   - webhooks_log.

10. Crear un PLAN DE IMPLEMENTACIÓN de Fase 6, ordenado por dependencias.

El plan debe indicar:

- archivos que habría que crear/modificar;
- responsabilidad de cada archivo;
- caso de uso SPEC correspondiente;
- invariantes afectadas;
- tests necesarios;
- dependencias entre pasos;
- qué NO se va a tocar.

NO IMPLEMENTES TODAVÍA.

Primero quiero ver el análisis y el plan.

REGLAS DE ALCANCE:

- No modificar Fases 1–5 salvo que encuentres una incompatibilidad real
  con la SPEC de Fase 6.
- Si encontrás una incompatibilidad, NO la corrijas automáticamente:
  reportala y explicá por qué sería necesaria.
- No implementar Backoffice/Fase 7.
- No implementar el rate limiter SQLite/Fase 8.
- No migrar SQLite a PostgreSQL.
- No implementar funcionalidades que no pertenezcan a Fase 6.
- No modificar la arquitectura solo por preferencia personal.

OBJETIVO DE FASE 6:

El flujo final debe poder evolucionar hacia:

Carrito
  ↓
Checkout
  ↓
Validación final
  ↓
Order PENDING
  ↓
Preferencia Mercado Pago
  ↓
Checkout Pro
  ↓
Pago
  ↓
Webhook Mercado Pago
  ↓
Verificación HMAC
  ↓
Idempotencia
  ↓
Consulta/validación del pago
  ↓
Actualización Payment/Order

REGLA CRÍTICA:

El navegador nunca es autoridad sobre el resultado del pago.

La fuente de verdad del pago será:

Mercado Pago
    ↓
Webhook verificado
    ↓
Backend
    ↓
Payment / Order

Cuando termines el análisis, respondé con:

1. Estado actual de Fase 6.
2. Qué ya existe.
3. Qué falta.
4. Invariantes involucradas.
5. Riesgos o inconsistencias encontradas.
6. Plan de implementación ordenado.
7. Estrategia de tests.
8. Criterios concretos para declarar Fase 6 COMPLETADA.

No escribas código todavía.