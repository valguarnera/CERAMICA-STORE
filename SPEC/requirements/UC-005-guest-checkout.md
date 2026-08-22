# UC-005: Comprar Sin Registrarse (Guest Checkout)

## Descripción
Usuario completa compra sin crear cuenta, solo proporciona email y datos de envío.

## Actores
- Visitante

## Precondiciones
- Carrito con items válidos (stock > 0, precios coinciden)

## Flujo Principal
1. Usuario en `/carrito` click "Iniciar checkout"
2. `/checkout` step 1: Formulario datos
   - Email (requerido, válido)
   - Nombre completo
   - Teléfono
   - Dirección envío: calle, número, piso/depto, ciudad, provincia, CP
   - Notas opcionales
3. Submit → `POST /api/checkout/start`
4. Server:
   - Valida carrito contra BD (stock, precios, productos activos)
   - Crea Order `PENDING` con `guest_email`, `shipping_address`, `billing_address`
   - Descuenta stock atómicamente (UPDATE ... WHERE stock >= qty)
   - Crea Preference MP multi-item con `external_reference = order.id`
   - Guarda `mp_preference_id` en Order
   - Retorna `{ init_point, preference_id }`
5. Redirect a `init_point` (Mercado Pago)

## Criterios de Aceptación
- [ ] Validación server-side de TODOS los campos (Zod)
- [ ] Email único por order guest (no requiere cuenta)
- [ ] Stock verificado y descontado ANTES de redirect a MP
- [ ] Precios recalculados desde BD (no del carrito)
- [ ] Order `PENDING` creada con snapshot completo
- [ ] Redirect inmediato a MP (no página intermedia)

## Flujo Alternativo
- Carrito vacío → redirect `/carrito` con toast
- Stock insuficiente → error 409, detalle qué items, carrito actualizado
- Producto desactivado → error 400, item removido de carrito
- Error MP → Order queda `PENDING`, toast "Error al iniciar pago, reintente"

## Reglas de Negocio
- R-001: `guest_email` almacenado en Order para notificaciones
- R-002: `shipping_address` y `billing_address` = JSON snapshot
- R-003: Order expira a 24h (cron marca `EXPIRED` y restituye stock)
- R-004: Idempotencia: mismo carrito + mismo email → misma Order (evitar duplicados)

## Endpoints
- `POST /api/checkout/start` body: `{ email, name, phone, shippingAddress, billingAddress?, notes }`
- Response: `{ init_point, preference_id, orderId }`