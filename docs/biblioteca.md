# Biblioteca del consultorio — Fase 11

La primera entrega de fase 11 está en `/panel/biblioteca`, con acceso profesional
desde el menú. El Inicio conserva su diseño anterior.

## Alcance

- Fuentes con referencia, edición, fecha de consulta opcional, licencia o permiso
  declarado y base de cálculo. Registrar una referencia no verifica sus derechos
  ni importa datos de terceros.
- Alimentos con fuente y composición declarada por **100 g**. Vacío significa
  **Sin dato**; cero significa un valor informado. La barra compara gramos de
  macronutrientes y no porcentajes de energía.
- Grupos propios con ejemplos, métodos de cocción y notas.
- Platos con porciones, peso final opcional, ingredientes, cantidad, unidad,
  conversión explícita a gramos y factor de rendimiento. `ml` no se interpreta
  automáticamente como `g`. El factor 1 declara ausencia de cambio de peso.
- Platos por grupos con partes que deben sumar 100%, ejemplos y cocción.
  Una consigna sin cantidades no determina composición química exacta.
- Búsqueda, categorías, etiquetas, contadores, paginación de 25 recursos, detalle,
  edición explícita, duplicación, archivo, restauración e historial de versiones.
  Abrir o cerrar el detalle conserva filtros y devuelve el foco al listado.

Los platos y las preparaciones calculan energía y macronutrientes según sus
ingredientes guardados (11B). 11C incorpora suplementos con variantes y un catálogo
base versionado y duplicable. La integración con bloques y publicaciones de planes corresponde a fase 12.
Los planes actuales y sus publicaciones conservan su funcionamiento.

Esta entrega no incorpora cargas de imágenes ni archivos. Los datos iniciales de
USDA se limitan a los dos alimentos documentados abajo; no hay importación masiva.

## Modelo y autorización

La migración `20261112140000_biblioteca_propia.sql` crea:

- `biblioteca_recursos`: recursos del consultorio, autor, tipo, contenido y versión.
- `biblioteca_relaciones`: ingredientes o grupos, con referencias compuestas por
  recurso y consultorio y una copia de los datos de la versión seleccionada.
- `biblioteca_versiones`: instantáneas inmutables del recurso y sus relaciones.

Las tres tablas tienen RLS de lectura por membresía con cobertura vigente y
políticas explícitas de denegación para INSERT, UPDATE y DELETE de autenticados.
Solo se concede SELECT; las escrituras pasan por `gestionar_biblioteca`, que toma
el consultorio y el usuario de la sesión, valida el contenido y las referencias y
guarda el historial en una transacción. Anónimos y pacientes sin membresía no
pueden consultar el catálogo. Las Server Actions exigen `requerirProfesional()`.

Cada edición exige la versión actual para detectar cambios simultáneos. Duplicar
crea otro identificador y conserva las copias de ingredientes. Editar una nota del
plato conserva la versión del ingrediente seleccionada; elegirlo nuevamente desde
el buscador permite incorporar la versión vigente de forma explícita. La fuente
utilizada por un alimento también queda guardada como copia.

Archivar retira el recurso de opciones nuevas y conserva referencias e historial.
Restaurar genera otra versión. No hay borrado físico desde la aplicación. Una
fuente o ingrediente archivado requiere reemplazo o restauración para guardados
nuevos que lo usen; las instantáneas anteriores siguen disponibles.

## Verificación del 12/11/2026

- `npm run verificar`: lint, tipos, **306 pruebas en 42 archivos** y build aprobados.
- Pruebas nuevas: aislamiento por consultorio, permisos por rol, referencias
  compuestas, fuentes, valores faltantes, unidades, fracciones, versiones elegidas,
  concurrencia, duplicación, archivo, restauración y paginación.
- Migración aplicada en una transacción al Supabase de desarrollo vinculado
  `zisacjleazvlrklwilap` y registrada con su versión exacta. Se comprobaron RLS,
  denegación a anónimos, ausencia de edición directa y ejecución autenticada de RPC.
- En localhost se crearon fuente, alimento, grupo, plato y plato por grupos con
  contenido ficticio de ensayo; se verificaron guardado, duplicación, cancelación,
  validación del 100%, historial, archivo/restauración y conservación de filtros.
  Los seis recursos técnicos, incluida la copia, quedaron archivados. No se
  modificaron pacientes, consultas, publicaciones ni movimientos financieros.
- Revisión a 390 px sin desborde horizontal observado; retorno del foco comprobado
  y consola sin errores ni advertencias durante el recorrido revisado.

La evidencia del preview de Vercel se registra en [Despliegue](despliegue.md).

## Cálculos y preparaciones — 11B

El estante **Preparaciones** permite crear, buscar, editar, duplicar, archivar y
restaurar recetas propias con porciones, ingredientes, rendimiento y peso final.
Admite alimentos como insumos. Los platos pueden utilizar alimentos y preparaciones;
no se admiten platos como ingredientes ni preparaciones anidadas, evitando ciclos.

El detalle ofrece las bases **Por porción**, **Por 100 g** y **Receta completa**.
El listado muestra platos por porción y preparaciones por 100 g. Cada ingrediente
muestra su peso inicial, peso preparado estimado, aporte energético y fuente/versiones.

Reglas del cálculo:

- Gramos iniciales = cantidad × gramos por unidad; en `g`, la conversión es 1.
  `ml`, unidades y porciones necesitan una conversión declarada. Cambiar de unidad
  limpia la conversión anterior para exigir una elección explícita.
- Aporte del ingrediente = composición declarada por 100 g × gramos iniciales / 100.
  La cantidad debe corresponder al estado del alimento indicado por su fuente.
- Peso preparado estimado = gramos iniciales × factor de rendimiento. El factor
  expresa peso preparado / peso inicial y **no modifica los nutrientes** ni estima
  pérdidas por cocción. El peso final informado tiene prioridad sobre la estimación.
- Se suman los aportes, se divide por porciones para obtener la porción y se
  multiplica por 100 / peso final para normalizar por 100 g.
- Cada nutriente es independiente: si falta en algún ingrediente, ese total y sus
  derivados son **Sin dato**, sin presentar sumas parciales como totales. Una
  conversión ausente impide todos los aportes de ese ingrediente. El cero informado
  se conserva; no se obtiene energía a partir de macros faltantes o viceversa.
- Se calcula sin redondeo intermedio y se muestran hasta dos decimales. La barra
  compara gramos de macronutrientes, no porcentajes de energía.

Los cálculos se realizan en servidor sobre instantáneas autorizadas y versionadas,
sin consultar los valores actuales del catálogo ni aceptar resultados del cliente.
No se reescribe el historial: las versiones anteriores de platos también pueden
mostrar resultados a partir de los ingredientes que ya conservaban.

Al usar una preparación en un plato, se copian tanto el recurso como sus ingredientes
de la versión elegida. Su composición normalizada se calcula desde esa copia. Editar,
duplicar o archivar alimentos/preparaciones no recalcula las versiones guardadas de
otros recursos. Para actualizar un ingrediente se lo quita y vuelve a elegir.

La migración `20261112160000_biblioteca_preparaciones.sql` amplía los tipos y las RPC;
conserva las políticas RLS por operación, los permisos y las referencias compuestas
de 11A. El listado consulta insumos solo para los 25 recursos de su página; el servicio
retira esas copias y los aportes individuales antes de enviar el resumen a la interfaz.

Verificación automática del 12/11/2026: `npm run verificar` aprobó lint, tipos,
**323 pruebas en 43 archivos** y build. Incluye ejemplos numéricos conocidos,
conversiones explícitas, datos faltantes, ceros, rendimientos, peso informado,
normalización de preparaciones, versiones anteriores, duplicación, archivo/restauración,
concurrencia, rechazo de ciclos, aislamiento entre consultorios y conciliación de
listado/detalle. La migración se aplicó y registró en una transacción en el Supabase
de desarrollo vinculado `zisacjleazvlrklwilap`, con autorización del usuario.

Recorrido autenticado en localhost: fuente y alimento ficticios, preparación con
400 kcal totales / 400 g finales (100 kcal por 100 g y 200 kcal por porción), y
plato con 100 g de esa preparación y dos porciones (50 kcal por porción). Al cambiar
el ingrediente del plato a `ml` sin conversión, la nueva versión muestra Sin dato;
la versión anterior conserva 50 kcal. Listado y detalle conciliados, retorno del
foco al recurso comprobado y consola sin errores ni advertencias durante el recorrido.
A 390 px, documento y diálogo sin desborde horizontal medido. Los cuatro recursos
ficticios quedaron archivados conservando su historia; no se modificaron pacientes,
planes ni movimientos financieros. Se restauró el ancho habitual del navegador.

## Suplementos y catálogo base — 11C

**Suplementos** admite nombre, marca opcional, categoría (Proteína, Creatina,
Aminoácidos, Ganador, Vitaminas, Colágeno u Otro), etiquetas, fuente versionada,
medida declarada y energía/proteínas/carbohidratos/grasas por esa medida. La medida
puede expresarse en g, ml, scoop, cápsula, comprimido o unidad: no se convierte
automáticamente entre unidades ni constituye una dosis recomendada.

Cada producto tiene entre una y diez variantes con nombre, cantidad de medidas y
preparación escrita. Se pueden agregar alimentos o preparaciones propios con sus
versiones, cantidad y conversión a gramos. La ficha separa **Producto**, **Agregados
registrados** y **Mezcla completa**. No se calculan nutrientes a partir del texto
de preparación: si se utiliza leche o yogur, hay que registrarlos como ingredientes.
Sin agregados registrados, el aporte adicional es cero y se aclara ese alcance.
Un nutriente desconocido o una conversión ausente se propaga como **Sin dato**;
se conservan los ceros informados. No hay dosificación, frecuencia ni indicaciones
terapéuticas automáticas. La incorporación a planes y su instantánea al publicar
siguen perteneciendo a fase 12.

El suplemento exige una fuente propia activa. La fuente de la etiqueta y cada
ingrediente se guardan como copias de la versión seleccionada, incluyendo los
insumos de una preparación. Editar la fuente o el ingrediente en el catálogo no
cambia la composición de un suplemento guardado. Cambiar notas conserva las
versiones seleccionadas. Duplicar, archivar, restaurar y controlar concurrencia
reutilizan las garantías de 11A/11B.

### Colección inicial y procedencia

**Mis recursos** y **Catálogo base** son alcances separados. Cada uno conserva
buscador, categoría, estante y paginación de 25 recursos. El catálogo base es de
solo lectura: copiar crea un recurso editable y nuevas copias de sus dependencias,
con identificadores del consultorio. No modifica ni fusiona recursos existentes.
La procedencia conserva el identificador y la versión base, referencia y licencia.
También se conserva al duplicar una copia propia. Retirar la última versión base
retira el recurso de nuevas selecciones sin volver a publicar la anterior; las
copias propias y el historial ya guardado se conservan.

La edición inicial contiene **nueve recursos**:

- Una fuente USDA FoodData Central, SR Legacy.
- Banana cruda, parte comestible: FDC **173944**, 89 kcal, 1,09 g de proteínas,
  22,84 g de carbohidratos y 0,33 g de grasas por 100 g.
- Leche entera sin vitaminas A/D agregadas: FDC **172217**, 61 kcal, 3,15 g de
  proteínas, 4,78 g de carbohidratos y 3,27 g de grasas por 100 g.
- Tres grupos descriptivos originales: frutas, lácteos y vegetales.
- Una preparación original de banana pisada, un plato original de banana con leche
  y un esquema original de fruta y lácteo por partes, para revisión y personalización.

Los dos registros se consultaron directamente en la API oficial el **12/11/2026**.
USDA publica FoodData Central bajo **CC0 1.0 Universal**, con atribución solicitada:
[guía oficial](https://fdc.nal.usda.gov/api-guide/). Los registros exactos están en
[Banana, FDC 173944](https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients)
y [Leche, FDC 172217](https://fdc.nal.usda.gov/fdc-app.html#/food-details/172217/nutrients).
Los carbohidratos son **por diferencia**, no se presentan como carbohidratos
disponibles. La leche está expresada por **100 g**, no por 100 ml; es una referencia
genérica estadounidense y no se equipara automáticamente a productos locales.
La fuente y las notas de cada alimento conservan estas aclaraciones.

Los textos y recetas restantes son originales de esta entrega y permiten
reutilización y edición dentro de la aplicación. Los grupos no implican
equivalencias nutricionales ni indicaciones individuales. No se importaron SARA 2,
ARGENFOODS ni el catálogo de otro servicio. No se incluyeron suplementos de marcas
sin una etiqueta y un permiso de uso revisados.

### Base de datos y verificación

La migración `20261112180000_biblioteca_suplementos_catalogo_base.sql` amplía la
validación de recursos y relaciones para suplementos, conserva las restricciones
de composición y agrega:

- `biblioteca_base_versiones`: instantáneas de plataforma identificadas por id y
  versión, con referencia, licencia y retiro explícito.
- `biblioteca_procedencias_base`: procedencia inmutable para clientes de las copias
  del consultorio, con referencia compuesta a recurso/consultorio y versión base.
- RPC de listado y detalle base con RLS, y copia transaccional autenticada que lee
  exclusivamente las instantáneas base persistidas. No recibe contenido del cliente.

Ambas tablas tienen RLS por operación: lectura solo con membresía y cobertura
vigentes, e INSERT/UPDATE/DELETE denegados a autenticados. Anónimos no tienen acceso.
La función recursiva interna de copia no es ejecutable por clientes. Las escrituras
propias pasan por las validaciones habituales y toman usuario/consultorio de sesión.
Si un insumo base está retirado, la copia completa falla y revierte sus dependencias.

Pruebas específicas: composición y mezclas, fracciones de medida, datos ausentes,
fuente y referencias cruzadas, variantes inválidas, historial, duplicación,
archivo/restauración, colección válida, permisos por operación, aislamiento,
copias de todos los tipos iniciales, versiones posteriores, retiro, atomicidad,
concurrencia existente y paginación. El estado de aplicación y los recorridos
visuales se registran en [Despliegue](despliegue.md).

Verificación del 12/11/2026: `npm run verificar` completo aprobado con **341 pruebas
en 45 archivos**, lint, tipos y build. La migración se aplicó y registró en una
transacción al Supabase de desarrollo vinculado `zisacjleazvlrklwilap`, con
autorización del usuario. Se comprobaron RLS, cuatro políticas por tabla nueva,
ausencia de escritura directa, denegación anónima y de ejecución del auxiliar interno.

En localhost se comprobó el plato base de 180,5 kcal, su copia con ingredientes y
fuentes propios y la edición independiente. Un suplemento ficticio con 120 kcal
por medida y una variante con 200 g de la leche de referencia sumó 122 kcal de
agregados y **242 kcal de mezcla**. Cambiar a ml sin conversión produjo Sin dato
solo para el agregado y la mezcla; el producto conservó 120 kcal y la versión
anterior conservó 242 kcal. Duplicación y cancelación del editor verificadas.

Ficha y variantes revisadas a 390 px sin desborde horizontal medido (documento de
390 px y diálogo de 341 px), y consola sin errores ni advertencias en el recorrido.
Se restauró el ancho habitual. Los ocho recursos propios de ensayo, incluidos los
insumos de la copia base, quedaron archivados con sus versiones; los nueve recursos
base siguen disponibles. No se modificaron pacientes, planes ni finanzas.
