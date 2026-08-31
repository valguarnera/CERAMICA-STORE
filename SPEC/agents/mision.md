# MISIÓN — Storage de imágenes y cierre de UX Admin

# OBJETIVO PRINCIPAL

Cerrar los últimos problemas de la Fase 7.2 y preparar una arquitectura de almacenamiento de imágenes desacoplada.

La intención NO es solamente solucionar la UI actual.

Queremos que el sistema quede preparado para que el almacenamiento actual basado en:

```text
/public/uploads/products/...
```

pueda reemplazarse en el futuro por otro backend de storage sin tener que modificar el dominio de productos ni toda la UI.

El filesystem local es solamente la implementación actual del storage.

Pensar conceptualmente en:

```text
Product
   ↓
Image reference
   ↓
Storage abstraction
   ↓
Local filesystem actualmente
```

y permitir eventualmente:

```text
Storage abstraction
   ↓
S3 / MinIO / otro storage
```

No implementar un storage externo ahora.

---

# 1. BUG — DESACTIVAR PRODUCTO

Revisar el botón:

```text
/admin/productos
```

El botón `Desactivar` debe realizar correctamente el soft-delete/desactivación existente.

Verificar:

* request PATCH correcto;
* respuesta HTTP;
* actualización real en DB;
* refresco de la lista;
* estado visual correcto;
* manejo de errores;
* no generar condiciones de carrera entre PATCH y refresh.

No cambiar la semántica del dominio sin necesidad.

IMPORTANTE:

El objetivo es verificar el comportamiento real, no simplemente aceptar el diagnóstico anterior.

Agregar o corregir tests de regresión si corresponde.

---

# 2. BORRADO REAL DE PRODUCTOS

Actualmente el producto puede ser desactivado mediante soft delete.

Existe además la necesidad de soportar un borrado REAL del registro cuando la acción de administración sea específicamente "Eliminar".

Investigar primero el modelo actual.

Definir claramente:

```text
Desactivar
→ producto permanece en DB
→ deja de estar activo

Eliminar
→ producto se elimina realmente de SQL
```

No implementar eliminación física si actualmente no existe una acción explícita que la represente sin revisar primero la UI y el dominio.

Cuando se elimina físicamente un producto:

* NO borrar automáticamente las imágenes del storage.
* Las imágenes deben permanecer disponibles para posible reutilización.
* Deben quedar identificables como imágenes actualmente sin referencia a un producto.

Esto es importante.

---

# 3. STORAGE DE IMÁGENES

Crear una abstracción clara para el storage.

La implementación actual debe continuar utilizando filesystem local.

Evitar que:

```text
ProductService
ProductForm
API de productos
```

tengan que conocer detalles como:

```text
fs.writeFile
mkdir
public/uploads
sharp
nombres físicos de archivos
```

La arquitectura debería permitir una evolución futura hacia otro backend.

Por ejemplo, conceptualmente:

```text
StorageService
├── save(...)
├── delete(...)
├── get(...)
├── exists(...)
└── ...
```

y una implementación:

```text
LocalFileStorage
```

No copiar este diseño literalmente si el código existente sugiere una abstracción mejor.

La decisión debe estar basada en la arquitectura existente del proyecto.

---

# 4. ESTRUCTURA FÍSICA DEL STORAGE

Mantener la idea actual de almacenamiento organizado.

Formato esperado:

```text
/public/uploads/products/YYYY-MM-DD/<image-id>/
    original.webp
    thumbnail.webp
```

Ejemplo:

```text
/public/uploads/products/2026-08-28/abc123/
    original.webp
    thumbnail.webp
```

El nombre físico y la estructura interna del filesystem deben ser responsabilidad del storage.

El dominio NO debería depender de ellos.

---

# 5. MODELO DE IMÁGENES

Revisar críticamente la representación actual de:

```text
images[]
```

Actualmente se almacenan referencias a original/thumbnail.

Determinar si la estructura actual es suficientemente limpia para desacoplar storage.

Priorizar una representación semántica, por ejemplo:

```text
{
  id,
  original,
  thumbnail
}
```

o la estructura equivalente que mejor encaje con el proyecto.

No introducir complejidad innecesaria.

IMPORTANTE:

El dominio debe almacenar referencias lógicas al recurso, no asumir que el backend será siempre `/public`.

---

# 6. GALERÍA DE IMÁGENES EN PRODUCTFORM

Mantener la mejora UX existente.

La gestión de imágenes debe mostrar:

* thumbnails;
* botón de eliminar en la esquina superior derecha;
* no mostrar la URL como campo editable principal;
* permitir subir nuevas imágenes;
* permitir quitar imágenes;
* mantener el orden de las imágenes si el modelo actual lo soporta.

El usuario NO debería tener que editar manualmente una URL generada por el sistema.

El flujo esperado:

```text
Subir imagen
      ↓
Storage
      ↓
original + thumbnail
      ↓
aparece thumbnail en ProductForm
      ↓
usuario puede quitarla
      ↓
guardar producto
```

---

# 7. REUTILIZACIÓN DE IMÁGENES

Este es un objetivo importante.

Si una imagen ya fue subida anteriormente y continúa almacenada, debería poder reutilizarse sin volver a subir físicamente el archivo.

Por ejemplo:

```text
Producto A
   ↓
imagen X
```

Si el Producto A es eliminado:

```text
imagen X
   ↓
sin referencias
   ↓
permanece en Storage
```

Posteriormente:

```text
Producto B
   ↓
reutiliza imagen X
```

No implementar una solución complicada de deduplicación binaria salvo que sea realmente necesaria.

Primero resolver correctamente la idea de:

```text
imagen almacenada
≠
imagen actualmente asociada a producto
```

---

# 8. NUEVA SECCIÓN ADMIN — STORAGE

Agregar un item:

```text
Storage
```

al menú administrativo.

Ruta sugerida:

```text
/admin/storage
```

La sección debe mostrar las imágenes almacenadas y permitir administrarlas.

Como mínimo estudiar/implementar:

* listado de imágenes;
* thumbnail;
* información básica;
* referencia/ruta lógica;
* producto(s) asociado(s), si existe;
* estado:

  * vinculada;
  * sin vínculos;
* posibilidad de reutilizar una imagen;
* posibilidad de eliminar físicamente una imagen cuando no tenga referencias.

La UI debe priorizar thumbnails y no mostrar largas URLs como elemento principal.

---

# 9. IMÁGENES SIN REFERENCIAS

Crear una forma de detectar imágenes almacenadas que no tengan referencias desde las tablas SQL correspondientes.

Conceptualmente:

```text
Storage
   ↓
todas las imágenes

SQL
   ↓
referencias actualmente utilizadas

Storage - SQL references
   ↓
orphan / unlinked images
```

En `/admin/storage` debería ser posible identificar:

```text
✓ En uso
⚠ Sin referencias
```

Y para imágenes sin referencias:

```text
Eliminar
```

con confirmación.

MUY IMPORTANTE:

No eliminar automáticamente archivos simplemente porque no aparecen en un producto.

Primero crear una operación explícita y segura para detectar y eliminar huérfanos.

---

# 10. BORRAR IMAGEN DESDE PRODUCTFORM

Cuando el usuario quita una imagen de un producto:

NO necesariamente debe borrarse físicamente del storage.

Debe quitarse la referencia del producto.

La imagen debe continuar almacenada para poder reutilizarse.

Por lo tanto:

```text
Eliminar del producto
≠
Eliminar del storage
```

La eliminación física pertenece a la gestión de Storage.

Esto debe quedar reflejado claramente en el diseño.

---

# 11. DOCKER — EROFS

Actualmente Docker Node 22 todavía presenta:

```text
EROFS: read-only file system
```

durante el upload de imágenes.

El error ocurre al intentar escribir en:

```text
/app/public/uploads/products/...
```

El resto de la aplicación funciona correctamente y la persistencia SQL no presenta este problema.

Investigar la causa real del montaje/permisos.

El objetivo es que:

```text
docker compose up
```

permita subir imágenes correctamente.

Preferir una solución mediante volumen/mount apropiado para uploads.

NO hacer:

```text
chmod 777
```

como solución rápida.

La solución debe ser coherente con Docker y con el hecho de que uploads son datos persistentes de runtime.

Idealmente separar:

```text
código de aplicación
```

de:

```text
datos generados por runtime
```

por ejemplo:

```text
/app/public/uploads
```

como volumen persistente.

Documentar la decisión.

---

# 12. NEXT/IMAGE

Mantener la solución actual de URLs locales relativas.

No solucionar el problema agregando:

```text
localhost
```

a `next.config.js`.

Las imágenes locales deben continuar utilizando referencias relativas como:

```text
/uploads/...
```

Las URLs externas legítimas deben continuar funcionando.

Mantener la normalización existente para registros antiguos.

---

# 13. SEGURIDAD

No degradar ninguna protección existente.

Mantener:

* middleware;
* validación definitiva contra DB;
* ADMIN boundary;
* SessionService;
* protección de `/admin/*`.

La nueva ruta:

```text
/admin/storage
```

debe quedar protegida exactamente como el resto del backoffice.

---

# 14. NAVEGACIÓN ADMIN ↔ TIENDA

Conservar la mejora existente:

ADMIN:

```text
Ver tienda
```

Tienda:

```text
email del usuario
Administración
```

El enlace `Administración` solamente debe aparecer para ADMIN.

No cambiar autenticación.

---

# 15. TESTS

Agregar tests donde aporten valor, especialmente para:

* desactivar producto;
* eliminar producto;
* referencias de imágenes;
* imagen sin referencias;
* reutilización de imágenes;
* storage abstraction;
* normalización de referencias;
* seguridad de `/admin/storage`.

No fabricar tests que solamente comprueben implementación interna.

Preferir pruebas de comportamiento.

---

# 16. VALIDACIÓN OBLIGATORIA

Al finalizar:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Todos deben terminar con:

```text
exit code 0
```

Si un proceso muestra tests pasando pero termina con crash, assertion o exit code != 0:

→ la verificación es FALLIDA.

Probar además manualmente:

### Producto

```text
/admin/productos
```

* crear;
* editar;
* desactivar;
* eliminar si corresponde;
* comprobar persistencia.

### Imágenes

* subir;
* visualizar thumbnail;
* quitar del producto;
* guardar;
* volver a editar;
* reutilizar una imagen existente.

### Storage

```text
/admin/storage
```

* listar;
* identificar imágenes vinculadas;
* identificar imágenes sin referencias;
* reutilizar;
* eliminar una imagen huérfana.

### Docker

```bash
docker compose up
```

* subir una imagen;
* comprobar que no aparece EROFS;
* comprobar que el archivo persiste;
* reiniciar el contenedor;
* comprobar persistencia del upload.

---

# 17. ALCANCE

NO comenzar Fase 7.3.

No implementar todavía:

* stock;
* pedidos;
* usuarios;
* configuración general.

Esta misión pertenece al cierre de:

```text
Fase 7.2 / UX + Storage
```

y prepara infraestructura para fases posteriores.

---

# 18. DOCUMENTACIÓN

Si la implementación modifica realmente la arquitectura o comportamiento:

Actualizar:

```text
README.md
TIMELINE.md
SPEC/agents/contexto.md
```

y cualquier documento de `SPEC/` que corresponda.

Documentar especialmente:

* Storage abstraction;
* LocalFileStorage;
* estructura física de uploads;
* thumbnails;
* diferencia entre referencia de imagen y archivo físico;
* imágenes huérfanas;
* reutilización;
* volumen Docker para uploads;
* runtime Node 22.

No declarar una funcionalidad completada si el flujo manual continúa fallando.

---

# 19. GIT

Seguir estrictamente:

```text
SPEC/agents/gitprotocol.md
```

La rama actual es:

```text
fix/bug-ux-admin
```

No hacer merge hacia `main/master`.

Antes del commit:

```bash
git status
git diff
```

Revisar:

* secretos;
* archivos generados;
* uploads de pruebas;
* cambios no relacionados.

Crear commits semánticos y pequeños.

Al finalizar informar:

1. qué se modificó;
2. arquitectura de Storage adoptada;
3. cómo se representan las imágenes;
4. cómo funciona reutilización;
5. cómo se detectan huérfanas;
6. cómo se solucionó Docker EROFS;
7. tests ejecutados y exit codes;
8. estado de Git;
9. commits realizados;
10. pendientes reales.

NO hacer push ni merge.

---

# CRITERIO FINAL DE ÉXITO

La misión se considera completa cuando:

```text
Producto
   ↓
referencia de imagen
   ↓
Storage abstraction
   ↓
Local filesystem
```

funciona correctamente y la aplicación ya no depende conceptualmente del filesystem en la lógica de productos.

Además:

* `/admin/productos` tiene CRUD funcional;
* Desactivar funciona;
* Eliminar funciona cuando corresponde;
* quitar imagen del producto no destruye el archivo;
* imágenes existentes pueden reutilizarse;
* `/admin/storage` permite gestionar el storage;
* pueden detectarse imágenes sin referencias;
* las imágenes huérfanas pueden eliminarse explícitamente;
* Docker puede escribir uploads sin EROFS;
* thumbnails funcionan;
* Node 22 continúa siendo el runtime oficial;
* auth y middleware no se modifican;
* Fase 7.3 NO comienza.
