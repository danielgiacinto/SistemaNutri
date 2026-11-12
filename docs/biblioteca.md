# Biblioteca del consultorio — 11A y 11B

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

Los platos y las preparaciones ya calculan energía y macronutrientes según sus
ingredientes guardados (11B). Suplementos y catálogo base curado/licenciado siguen
pendientes en 11C. La integración con bloques y publicaciones de planes corresponde a fase 12.
Los planes actuales y sus publicaciones conservan su funcionamiento.

Esta entrega no incorpora cargas de imágenes, archivos ni catálogos externos.

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
