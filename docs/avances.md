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
- **Validación técnica:** `npm run verificar` completo, con lint, tipos, 201 pruebas
  en 25 archivos y compilación el 4/11/2026. Revisión visual previa de las seis vistas en
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
  `firma_invalida` el 4/11/2026. La simulación firmada posterior devolvió 200.
- [x] Entrega firmada desde el simulador de Mercado Pago (`subscription_preapproval`,
  recurso existente): usuario observó 200 y se verificó el evento procesado sin error
  en Supabase. Conservó `authorized`, cero pagos y cobertura nula. Esta prueba no es
  un cobro mensual ni acredita que ya se hayan recibido todos los tópicos.
- [ ] Comprobar que un cobro de prueba aprobado aparezca en el historial y extienda
  exactamente una vez la cobertura; la autorización por sí sola no debe hacerlo.
- [ ] Comprobar rechazo y acceso comercial resultante, actualización de la suscripción
  al cancelarse y reintentos/eventos repetidos sin duplicar pagos ni cobertura.
- [x] Cancelación de renovación visible para el titular, con confirmación y motivo.
  Solicitud auditada desde la identidad; confirmación por API y recuperación por cron
  si falla el proveedor. Conserva la prueba/cobertura pagada. El usuario completó la
  cancelación de prueba el 4/11/2026; se verificaron estado y fechas en la base.
- [x] Auditoría presenta actor, consultorio y motivo administrativo, sin volcar el JSON
  completo. Fechas en Córdoba; vencimientos en Profesionales usan la zona del consultorio.
- [x] Sincronización explícita de autorización en Facturación y en el diálogo administrativo,
  usando el mismo servicio verificado del webhook. Protegida por sesión/rol, referencia,
  precio y moneda; evita sobrescribir versiones recientes y reactivar una cancelación.
  No acredita pagos ni sustituye la reconciliación periódica.
  Validada en el despliegue público desde la cuenta administrativa: estado actualizado
  a `authorized` en vista y base, conservando cero pagos y cobertura nula.
- [x] Detalle comercial y cobros en `/admin/profesionales/[consultorioId]`, con
  suspensión/reactivación administrativa confirmada y auditada. Resumen de ingresos
  mensuales, vencimientos, cancelaciones y cobros pendientes agregado en PostgreSQL.
- [x] Conciliación periódica en `/api/facturacion/conciliar`, protegida por `CRON_SECRET`,
  configurada diariamente en Vercel. Lote de cinco suscripciones, dos trabajadores,
  diez facturas por página, cursor persistente y reserva de diez minutos. Se puede
  continuar manualmente desde Facturación o Administración. En el despliegue público:
  401 sin secreto y 200 con secreto, una suscripción revisada y cero fallos; cursor,
  fecha de éxito y error nulo confirmados en Supabase. La ejecución programada futura
  queda configurada; no se afirma haber observado todavía el disparo diario de Vercel.
- [x] Cobertura por ciclo de factura, independiente del orden de llegada. Devoluciones
  retiran el período acreditado; las repeticiones no suman meses. Pruebas PostgreSQL.
- [x] Bloqueo comercial centralizado en RLS y funciones clínicas, manteniendo lectura
  administrativa de facturación y lectura del paciente de lo previamente compartido.
  La comunidad queda en solo lectura cuando el consultorio pierde cobertura o se suspende.
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
