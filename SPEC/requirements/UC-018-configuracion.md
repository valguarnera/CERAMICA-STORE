# UC-018: Configuración (Admin)

## Descripción
Administrador configura parámetros de la tienda y credenciales.

## Actores
- Administrador

## Precondiciones
- Sesión ADMIN válida

## Flujo Principal
1. `/admin/configuracion` → tabs: Tienda, Mercado Pago, Email
2. **Tienda**: nombre, descripción, moneda (ARS fijo), dirección, teléfono, email contacto
3. **Mercado Pago**: Access Token, Public Key, Webhook Secret, Sandbox (toggle)
4. **Email**: Proveedor (console/resend/smtp), credenciales según proveedor
5. `PATCH /api/admin/settings` body: `{ key, value }` por setting
6. Validación: MP credentials → test connection (GET /users/me)

## Criterios de Aceptación
- [ ] Settings guardados en tabla `settings` (clave-valor)
- [ ] MP credentials: validación de conectividad al guardar
- [ ] Sandbox toggle cambia `MP_SANDBOX` env var (requiere restart → documentar)
- [ ] Email provider config probada al guardar (send test)
- [ ] Valores sensibles (tokens) no se muestran en UI (masked), solo al editar
- [ ] Cambios efectivos inmediato (cache invalidation si aplica)

## Reglas de Negocio
- R-001: Settings críticos (MP, Email) solo ADMIN
- R-002: `MP_ACCESS_TOKEN` nunca en logs ni response bodies
- R-003: Moneda fija ARS (no editable en MVP)

## Endpoints
- `GET /api/admin/settings` (auth ADMIN) → `{ key: value }`
- `PATCH /api/admin/settings` body: `{ key, value }` (validación por key)
- `POST /api/admin/settings/test-mp` body: `{ access_token, sandbox }` → test connection
- `POST /api/admin/settings/test-email` body: `{ provider, config }` → send test