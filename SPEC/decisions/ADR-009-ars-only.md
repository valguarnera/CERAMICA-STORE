# ADR-009: Solo ARS (Moneda)

## Contexto
Soporte de monedas en la tienda.

## Decisión
**Solo ARS (Peso Argentino)** hardcoded. Multi-moneda **no** en MVP.

## Alternativas Consideradas
| Opción | Pros | Contras |
|--------|------|---------|
| **Solo ARS** | Simple, sin conversión, sin rounding issues, MP nativo ARS | No internacionalizable |
| **Multi-moneda** | Futuro expansión | Complejidad: rates, redondeo, MP multi-currency, display |

## Justificación
- Mercado Pago Argentina opera en ARS nativamente
- Cerámica store = mercado local argentino
- Evita: exchange rates, rounding, formatting, MP multi-currency complexity
- `currency` column en BD = `'ARS'` constante (preparado para futuro)

## Consecuencias
- `price_cents` siempre en centavos ARS
- Formato display: `new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`
- MP preference `currency_id: 'ARS'` fijo
- Migración futura: agregar `currency` por producto/order + exchange rate service

## Estado
✅ Aprobado