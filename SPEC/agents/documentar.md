DOCUMENTACIÓN

Al finalizar la implementación, actualizar únicamente la documentación que corresponda al cambio real.

Actualizar:

- TIMELINE.md
- README.md

Registrar:

- estado real de Auth UX
- flujo ADMIN → /admin
- flujo CUSTOMER → /
- manejo de HTTP 401
- comportamiento de formularios
- estrategia de redirecciones
- tests E2E de autenticación
- estado real de better-sqlite3 + next dev/HMR

NO declarar una funcionalidad como completada si solamente pasan tests pero el flujo manual continúa fallando.

Si se descubre una deuda técnica, documentarla explícitamente.

No avanzar a Fase 7.3 hasta que el flujo de autenticación definido en este prompt funcione de extremo a extremo.