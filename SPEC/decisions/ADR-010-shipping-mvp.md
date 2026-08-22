# ADR-010: Envío - Retiro Local + Fixed (MVP)

## Contexto
Cálculo de costos de envío.

## Decisión
**Retiro en local + Tarifa fija** configurables. Cálculo dinámico **no** en MVP.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Retiro + Fixed** | Simple, predecible, cero integraciones | No cubre todos casos |
| **Correos Argentinos API** | Realista | API inestable, requiere credenciales, complejidad |
| **Cálculo por zona/CP** | Preciso | Requiere tabla tarifas, mantenimiento |
| **Gratis > monto** | Marketing | Complejidad lógica, márgenes |

## Justificación
- Cerámica = frágil, pesado → retiro en taller es opción real
- Fixed rate simple para envíos (configurable en admin settings)
- MVP: 2 opciones en checkout: "Retiro en taller (Gratis)" | "Envío a domicilio ($X)"
- Admin configura: `SHIPPING_FIXED_CENTS`, `SHIPPING_FREE_THRESHOLD_CENTS` (opcional)

## Consecuencias
- Checkout step: radio button selección método envío
- `shipping_method` en `orders`: `'pickup' | 'delivery'`
- `shipping_cost_cents` en `orders` (0 o fixed)
- Settings admin: `SHIPPING_FIXED_CENTS`, `PICKUP_ADDRESS`

## Estado
✅ Aprobado