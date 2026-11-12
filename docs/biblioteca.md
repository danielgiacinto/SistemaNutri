# Biblioteca del consultorio — 11A

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

Los platos guardan sus ingredientes pero **todavía no calculan energía ni macros**:
esos resultados se muestran como Sin dato. Los cálculos y las preparaciones
normalizadas corresponden a 11B. Suplementos y catálogo base curado/licenciado,
a 11C. La integración con bloques y publicaciones de planes corresponde a fase 12.
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
