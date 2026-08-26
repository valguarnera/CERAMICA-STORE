OBJETIVO

NO comenzar Fase 7.3.

Antes de continuar con cualquier módulo del Backoffice, dejar completamente funcional y coherente el flujo de autenticación desde la perspectiva del usuario.

El objetivo concreto es:

CUSTOMER:
Home → Login → login exitoso → Home (/)

ADMIN:
Home → Login → login exitoso → Admin (/admin)

Además:

Credenciales inválidas:
Login → API 401 → mensaje de error visible en UI → usuario puede corregir y volver a intentar sin recargar la página.

El manejo de errores debe ser simple, claro, no intrusivo y fácil de cerrar/limpiar.

============================================================
1. INVESTIGAR ANTES DE MODIFICAR
============================================================

No asumir que el problema está en middleware.

Primero investigar el flujo completo:

Home
→ /login
→ formulario
→ onSubmit
→ preventDefault()
→ fetch()
→ /api/auth/login
→ respuesta
→ interpretación frontend
→ redirect
→ middleware
→ /admin o /

Determinar exactamente por qué puede ocurrir:

POST /api/auth/login 200
GET /admin 307
GET / 200

Revisar especialmente:

- redirect enviado por API
- redirect recibido por frontend
- router.replace()
- query parameter redirect
- role incluido en JWT
- role de usuario en DB
- middleware
- SessionService.validateSession()
- Admin layout
- cualquier redirect duplicado
- cualquier redirect producido por middleware
- cualquier redirect producido por layout
- cualquier redirect producido por página

No corregir simplemente agregando otro redirect.
Encontrar la causa real y eliminar la contradicción.

============================================================
2. FLUJOS DE ACEPTACIÓN
============================================================

ADMIN

1. Usuario comienza en /
2. Va a /login
3. Ingresa credenciales ADMIN válidas
4. Form submit usa preventDefault()
5. POST JSON /api/auth/login
6. API responde 200
7. Cookie session_id queda creada correctamente
8. Frontend obtiene redirect válido
9. router.replace('/admin')
10. Middleware permite ADMIN
11. Admin layout valida sesión contra DB
12. /admin responde correctamente
13. No debe producirse redirect a /

CUSTOMER

1. Usuario comienza en /
2. Va a /login
3. Ingresa credenciales CUSTOMER válidas
4. Form submit usa preventDefault()
5. POST JSON /api/auth/login
6. API responde 200
7. Cookie session_id queda creada correctamente
8. Frontend obtiene redirect válido
9. router.replace('/')
10. Home responde correctamente

CUSTOMER intentando /admin:

- Middleware puede rechazarlo.
- Admin layout/API debe mantener defensa en profundidad.
- Nunca debe visualizar contenido administrativo.
- Debe terminar en /.

============================================================
3. LOGIN CON ERROR
============================================================

Probar:

A. Usuario inexistente
B. Password incorrecta
C. Datos inválidos
D. Rate limit si aplica

Para credenciales incorrectas:

HTTP 401

JSON estructurado, por ejemplo:

{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Credenciales inválidas"
  }
}

El frontend debe:

- NO recargar la página.
- NO cambiar la URL.
- NO incluir password en URL.
- NO mostrar stack trace.
- NO mostrar detalles internos.
- Mostrar un mensaje claro.
- Permitir cerrar/descartar la notificación.
- Permitir volver a intentar inmediatamente.

Preferir una UI de notificación simple y reutilizable antes que introducir una arquitectura compleja de notificaciones.

La notificación debe ser accesible y tener botón explícito de cierre.

============================================================
4. FORMULARIOS
============================================================

Verificar login y registro.

Deben utilizar:

<form onSubmit={handleSubmit}>

y:

event.preventDefault()

El envío debe realizarse mediante fetch POST JSON.

Nunca utilizar GET para credenciales.

Nunca colocar:

email
password
token
secret
JWT

en query parameters.

Los inputs de password deben utilizar:

type="password"

El frontend debe manejar estados:

- idle
- submitting
- success
- error

Durante submit:

- evitar doble envío
- mostrar feedback apropiado
- restaurar estado correctamente después de error

============================================================
5. REDIRECCIONES
============================================================

Revisar cuidadosamente el parámetro:

?redirect=/admin

Debe utilizarse solamente para rutas internas válidas.

No aceptar URLs externas.

Reglas:

ADMIN autenticado:
→ /admin

CUSTOMER autenticado:
→ /

Si una ruta solicitada originalmente requiere ADMIN pero el usuario es CUSTOMER:
→ /

Si no existe redirect válido:
- ADMIN → /admin
- CUSTOMER → /

No debe haber cadenas de redirects innecesarias.

Evitar:

/login → / → /admin

o:

/login → /admin → / → /

El flujo debe ser determinista.

============================================================
6. AUTHORIZATION BOUNDARY
============================================================

NO degradar la arquitectura existente.

Middleware Edge:

- NO SQLite
- NO better-sqlite3
- NO Kysely
- NO SessionService que acceda a DB
- solamente JWT prevalidation

Node.js:

- SessionService.validateSession()
- DB como source of truth
- role real
- revoked
- expires_at

No confiar en:

x-user-id
x-user-role

como autoridad final.

No modificar INV-001, INV-002 ni INV-003.

============================================================
7. TESTS
============================================================

Agregar o corregir tests según sea necesario.

Tests mínimos:

AUTH FLOW

1. ADMIN login → /admin
2. CUSTOMER login → /
3. ADMIN con redirect=/admin → /admin
4. CUSTOMER con redirect=/admin → /
5. Usuario inexistente → 401 + mensaje
6. Password incorrecta → 401 + mensaje
7. Password nunca aparece en URL
8. Login no produce navegación GET con credenciales
9. Form usa preventDefault
10. Sesión revocada → acceso admin rechazado
11. CUSTOMER nunca obtiene contenido ADMIN

E2E Playwright debe verificar comportamiento real del navegador, no solamente llamar directamente a la API.

============================================================
8. DEV CRASH
============================================================

El crash:

Assertion failed: (env) != nullptr
Statement::~Statement()
better_sqlite3.node

debe mantenerse separado del análisis funcional de auth.

No declarar que está "resuelto" si continúa ocurriendo.

Documentarlo como deuda técnica si continúa únicamente en next dev/HMR.

NO cambiar SQLite ni introducir wa-sqlite/libsql en esta tarea.

La prioridad actual es AUTH UX/FLOW.

============================================================
9. NO HACER
============================================================

NO:

- iniciar Fase 7.3
- implementar Stock
- modificar schema de stock
- implementar nuevas features del backoffice
- introducir un sistema complejo de toast
- introducir CSRF casero
- cambiar el modelo de sesiones
- migrar SQLite
- eliminar tests existentes
- debilitar autorización para hacer pasar tests
- agregar redirects arbitrarios para ocultar el problema
- confiar en headers como fuente de autorización

============================================================
10. CRITERIO FINAL
============================================================

No considerar esta tarea terminada porque:

npm run test
npm run build
npm run lint

estén verdes.

Debe demostrarse además el comportamiento funcional:

ADMIN:
/
/login
→ login exitoso
→ /admin

CUSTOMER:
/
/login
→ login exitoso
→ /

INVALID:
/
/login
→ credenciales incorrectas
→ HTTP 401
→ mensaje visible
→ cerrar mensaje
→ volver a intentar
→ sin reload

Y:

CUSTOMER
→ /admin
→ /
sin visualizar contenido ADMIN.

============================================================
11. ENTREGABLE
============================================================

Antes de terminar:

1. Explicar causa raíz del problema de redirect si existía.
2. Enumerar archivos modificados.
3. Enumerar tests agregados/modificados.
4. Mostrar resultados:
   - lint
   - typecheck
   - test
   - build
   - test:e2e
5. Confirmar manualmente:
   - ADMIN → /admin
   - CUSTOMER → /
   - invalid credentials → error UI
6. Confirmar que password/secretos nunca aparecen en URL/logs.
7. Indicar separadamente estado del crash better-sqlite3 en next dev.
8. NO iniciar 7.3.

IMPORTANTE:
Si durante la investigación aparece una contradicción entre SPEC, implementación y comportamiento real, detenerse y reportarla antes de inventar una solución.