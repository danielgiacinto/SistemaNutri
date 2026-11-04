# Avances y criterios de cierre del MVP

Actualizado el **4 de noviembre de 2026**. App en localhost y en
`https://nutrisfera.vercel.app`, con Supabase hospedado de desarrollo.
Las fases 1 a 4 y 6 están implementadas para probar; la fase 5 tiene el
flujo de autorización validado y conserva pendiente la acreditación real de cobros.

## Avances confirmados

- **Suscripciones:** el checkout alojado reemplaza al formulario de tarjeta interno.
  Se crea o retoma una suscripción pendiente. El usuario completó la autorización
  con el comprador de prueba y la vio tanto en Mercado Pago como en Nutrisfera.
  Esta evidencia corresponde a autorización, no a un cobro mensual acreditado.
- **Marca:** palta vectorial con contornos, colores y semilla refinados; inclinación
  de 10° a la derecha compartida por logo y favicon. Trazos, tokens e inclinación
  centralizados; regeneración mediante `node scripts/generar-icono.mjs`.
- **Agenda:** línea horaria con duración de turnos, tratamiento de superposiciones
  y marca de hora actual. Semana adaptada a lista diaria en celular y mes compacto.
- **Diseño del panel:** Inicio con cinco métricas equilibradas y gráfico legible;
  Pacientes con avatar y presentación compacta en pantallas medianas/pequeñas;
  Historias y Planes con filas completas pulsables y acciones en estados vacíos;
  Comunidad con estados y metadatos más claros; Configuración con accesos por sección.
  Tarjetas, filtros, iconos y espaciados mantienen una línea visual común.
- **Validación técnica:** último `npm run verificar` satisfactorio: lint, tipos,
  160 pruebas en 18 archivos y compilación. Revisión visual de las seis vistas en
  escritorio y móvil; Inicio también revisado a 320 px sin desborde horizontal.

## Cierre de fase 5

El webhook ya existe en `src/app/api/facturacion/mercadopago/route.ts`, con firma,
consulta autenticada al proveedor, deduplicación y reintentos cubiertos por pruebas.
Falta demostrar el recorrido completo con notificaciones externas:

- [x] Disponer de una URL pública HTTPS de pruebas: `https://nutrisfera.vercel.app`.
  Inicio de OAuth y retorno a `/auth/confirmar` comprobados; falta completar el ingreso.
- [ ] Agregar `Secure` a las cookies SSR para HTTPS; la cookie PKCE pública observada aún no lo incluye.
- [ ] Usar IDs únicos en los formularios de autenticación: la navegación conserva
  pantallas ocultas y duplica las asociaciones de las etiquetas.
- [ ] Corregir mediante migración incremental la política de lectura del consultorio
  por el paciente: la regla remota compara `p.consultorio_id = p.id` y el portal cae
  en el nombre y la zona horaria de respaldo. Agregar pruebas de propio/ajeno.
- [x] Aplicar y verificar `20261103220000_checkout_suscripciones.sql` en Supabase hospedado
  (4/11/2026): trigger de checkout, función idempotente, permisos de servicio e historial comprobados.
- [ ] Conciliar las diferencias de versiones históricas entre el repositorio y Supabase
  antes de habilitar el `db push` automático; no se repararon versiones antiguas a ciegas.
- [ ] Configurar `SUPABASE_SECRET_KEY` y `MERCADOPAGO_WEBHOOK_SECRETO` solo en servidor.
  La clave de Supabase ya está cargada y validada en local (4/11/2026); falta llevarla
  a Vercel y configurar el secreto del webhook. No documentar sus valores.
- [ ] Configurar los eventos de Mercado Pago en la URL del webhook.
- [ ] Comprobar que un cobro de prueba aprobado aparezca en el historial y extienda
  exactamente una vez la cobertura; la autorización por sí sola no debe hacerlo.
- [ ] Comprobar rechazo y acceso comercial resultante, actualización de la suscripción
  al cancelarse y reintentos/eventos repetidos sin duplicar pagos ni cobertura.
- [ ] Mostrar la gestión/cancelación de renovación también cuando la suscripción está
  autorizada; no aparece una acción visible en la revisión del portal profesional.
- [ ] Completar la consulta administrativa del actor y motivo de cada cambio; Auditoría
  hoy muestra solo acción, entidad y fecha. Fijar zona horaria explícita en las fechas
  administrativas, que actualmente dependen del servidor.
- [ ] Completar la gestión comercial individual prevista: detalle de suscripción/cobros,
  suspensión/reactivación administrativa con motivo y métricas de vencimientos. Las
  pantallas actuales cubren listado, ajuste de prueba y configuración global.
- [ ] Implementar la reconciliación periódica independiente de los webhooks. La lectura
  manual de estado en Facturación no sustituye una tarea programada de recuperación.
- [ ] Completar los avisos comerciales previstos por correo; hoy solo existen avisos
  en la interfaz y correos de autenticación.

Registrar el resultado de esas pruebas y sus limitaciones antes de marcar fase 5
como cerrada. Una compilación o un webhook simulado no sustituyen esta validación.
Pasos de integración en [Facturación](facturacion.md).

## Alcance de «lista»

El núcleo funcional del MVP está bastante completo para desarrollo. Cerrar fase 5
completa la validación del circuito comercial previsto, pero no implica que el
servicio esté listo para operar con usuarios y datos reales.

Para el lanzamiento quedan la configuración y comprobación del despliegue, las
migraciones y CI, el correo con dominio propio, el respaldo y la restauración, la
revisión de seguridad/privacidad pendiente y una pasada de los recorridos completos
de profesional, paciente y administración en el entorno desplegado.
Consultar [Despliegue](despliegue.md) y [Seguridad y privacidad](seguridad-y-privacidad.md).

Recordatorios automáticos, reservas online, catálogo de platos, importación de
pacientes y otras ampliaciones siguen como mejoras posteriores; no se presentan
como funciones ya entregadas ni como requisitos del cierre técnico de fase 5.
