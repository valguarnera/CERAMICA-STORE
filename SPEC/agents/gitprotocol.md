GIT WORKFLOW RULES

El agente está autorizado a administrar ramas Git del proyecto.

1. Nunca trabajar directamente sobre main para cambios de implementación.

2. Antes de comenzar una misión:
   - ejecutar git status
   - identificar la rama actual
   - verificar si existen cambios sin commit

3. Cada misión independiente debe realizarse en una rama descriptiva:

   fix/<descripcion>
   feat/<descripcion>
   research/<descripcion>
   chore/<descripcion>

Ejemplos:

   fix/cart-400
   feat/ux-notifications
   research/sqlite-dev-crash
   feat/product-image-upload

4. Antes de modificar código:
   - confirmar que el working tree está limpio,
     o documentar explícitamente los cambios existentes.

5. No mezclar cambios no relacionados dentro de una misma rama.

6. Cada cambio debe terminar con:
   - tests relevantes
   - npm run lint
   - npm run typecheck
   - npm run build

7. Un comando se considera exitoso únicamente si:
   - todas las verificaciones esperadas pasan
   - el proceso termina con exit code 0

8. Si las assertions pasan pero el proceso termina con crash,
   abort o exit code distinto de 0:
   - la verificación se considera FALLIDA
   - no reportar "tests passing"

9. Antes de hacer commit:
   - ejecutar git diff
   - revisar que no haya secretos
   - revisar que no haya archivos generados
   - revisar que el commit solo incluya cambios de la misión.

10. Commits pequeños y semánticos:

    feat(admin): add product management
    fix(cart): accept add-item payload without price
    fix(auth): prevent credentials from leaking in URL
    test(product): add image serialization regression coverage
    docs(timeline): update phase 7 status

11. El agente puede crear commits.

12. El agente NO puede:
    - hacer git push --force
    - borrar ramas
    - reescribir historia compartida
    - hacer git reset --hard
    - hacer git clean -fd
    - modificar main sin autorización explícita

13. Merge hacia main:
    - requiere aprobación explícita del usuario
    - presentar primero un resumen de cambios
    - confirmar que todas las verificaciones terminaron con exit code 0.

14. Para investigaciones:
    - usar ramas research/*
    - no mezclar investigación con implementación productiva
    - documentar hallazgos antes de decidir migraciones.