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
- **Validación técnica:** `npm run verificar` completo, con lint, tipos, 177 pruebas
  en 21 archivos y compilación el 4/11/2026. Turbopack requirió repetir por un fallo transitorio
  de su proceso auxiliar en Windows. Revisión visual previa de las seis vistas en
  escritorio y móvil; Inicio también revisado a 320 px sin desborde horizontal.

## Cierre de fase 5

El webhook ya existe en `src/app/api/facturacion/mercadopago/route.ts`, con firma,
consulta autenticada al proveedor, deduplicación y reintentos cubiertos por pruebas.
Falta demostrar el recorrido completo con notificaciones externas:

- [x] Disponer de una URL pública HTTPS de pruebas: `https://nutrisfera.vercel.app`.
  Inicio de OAuth y retorno a `/auth/confirmar` comprobados; falta completar el ingreso.
- [x] Agregar `Secure` a los tres clientes SSR en producción/HTTPS, manteniendo HTTP
  en desarrollo local. Prueba con cookie PKCE real generada por Supabase SSR.
- [x] Usar IDs únicos por instancia en los cuatro formularios de autenticación;
  prueba con varias pantallas e instancias montadas juntas.
- [x] Corregir la lectura del consultorio del paciente mediante `20261104180000`,
  aplicada y registrada en Supabase hospedado el 4/11/2026. Pruebas de propio/ajeno,
  cuenta sin ficha y paciente inactivo.
- [x] Aplicar y verificar `20261103220000_checkout_suscripciones.sql` en Supabase hospedado
  (4/11/2026): trigger de checkout, función idempotente, permisos de servicio e historial comprobados.
- [ ] Conciliar las diferencias de versiones históricas entre el repositorio y Supabase
  antes de habilitar el `db push` automático; no se repararon versiones antiguas a ciegas.
- [x] Configurar `SUPABASE_SECRET_KEY` y `MERCADOPAGO_WEBHOOK_SECRETO` en Vercel;
  usuario confirmó configuración y redeploy. POST sin firma devuelve 401
  `firma_invalida` el 4/11/2026. Esto no demuestra aún que coincida la firma real.
- [x] Usuario confirmó configuración de Webhooks en Mercado Pago; validar su entrega
  efectiva mediante una notificación firmada con un recurso existente.
- [ ] Comprobar que un cobro de prueba aprobado aparezca en el historial y extienda
  exactamente una vez la cobertura; la autorización por sí sola no debe hacerlo.
- [ ] Comprobar rechazo y acceso comercial resultante, actualización de la suscripción
  al cancelarse y reintentos/eventos repetidos sin duplicar pagos ni cobertura.
- [ ] Mostrar la gestión/cancelación de renovación también cuando la suscripción está
  autorizada; no aparece una acción visible en la revisión del portal profesional.
- [x] Auditoría presenta actor, consultorio y motivo administrativo, sin volcar el JSON
  completo. Fechas en Córdoba; vencimientos en Profesionales usan la zona del consultorio.
- [x] Sincronización explícita de autorización en Facturación y en el diálogo administrativo,
  usando el mismo servicio verificado del webhook. Protegida por sesión/rol, referencia,
  precio y moneda; evita sobrescribir versiones recientes y reactivar una cancelación.
  No acredita pagos ni sustituye la reconciliación periódica.
  Validada en el despliegue público desde la cuenta administrativa: estado actualizado
  a `authorized` en vista y base, conservando cero pagos y cobertura nula.
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
