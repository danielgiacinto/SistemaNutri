# Seguridad y privacidad

> Este documento resume criterios técnicos. **No constituye asesoramiento legal** ni
> implica cumplimiento normativo automático por usar determinadas tecnologías. Antes de
> operar con datos reales se debe validar con asesoría legal especializada.

## Marco normativo a considerar (Argentina)

- **Ley 25.326 de Protección de Datos Personales.** Los datos de salud son *datos
  sensibles*. Puntos a resolver antes de producción:
  - Consentimiento informado y finalidad del tratamiento (textos de términos y política
    de privacidad — **pendientes**, no se redactaron para no inventar contenido legal).
  - Inscripción de las bases de datos ante la Agencia de Acceso a la Información Pública (AAIP).
  - Transferencia internacional (art. 12): Supabase y Vercel alojan datos fuera de
    Argentina. Evaluar región, países con protección adecuada y cláusulas contractuales.
  - Derechos de acceso, rectificación y supresión, compatibilizados con la obligación
    de conservar la historia clínica.
- **Ley 26.529 de Derechos del Paciente.** La historia clínica es del paciente, el
  profesional es depositario y debe conservarse al menos 10 años. Si es informatizada
  debe garantizar integridad, autenticidad, inalterabilidad, perdurabilidad y
  recuperabilidad: por eso las evoluciones tendrán versionado y no se borrarán físicamente.
- **Ley 27.706** (digitalización de historias clínicas) y **Ley 25.506** (firma digital):
  evaluar requisitos de interoperabilidad y firma para las evoluciones clínicas.

## Medidas implementadas (fases 1 a 3)

- Autenticación con Supabase Auth (contraseñas con hash gestionado por Supabase,
  confirmación de correo, OAuth con Google, límites de intentos).
- Autorización en tres capas: proxy (sesión), servidor (rol y recurso) y base (RLS +
  permisos por columna). Ver `docs/arquitectura.md`.
- El rol de una cuenta nunca proviene del cliente; el superadministrador solo se asigna
  con credenciales de servicio.
- Pruebas automáticas de aislamiento entre consultorios y de escalada de privilegios.
- Errores: el usuario ve mensajes genéricos; los logs guardan código y mensaje técnico,
  nunca los datos enviados. El registro de argumentos de Server Actions de Next en
  desarrollo está desactivado (`logging.serverFunctions: false`).
- Auditoría de altas y cambios del consultorio (registra qué campos cambiaron, no sus valores).
- El portal del paciente solo lee su ficha, sus turnos y las filas clínicas marcadas como visibles.
  El tipo de cuenta paciente se asigna al aceptar la invitación, no desde el cliente.
- Pacientes, turnos, evoluciones, objetivos y mediciones aislados por `consultorio_id` con RLS.
  Un id ajeno en la URL responde 404. Las evoluciones nacen privadas y en borrador; compartir
  una nota en borrador está prohibido por constraint. Cada edición de evolución deja una versión.
- Encabezados de seguridad (`X-Frame-Options`, `HSTS`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`).
- Mensajes de registro y recuperación que no revelan si un correo existe.

## Principios para las próximas fases

- Notas clínicas **privadas por defecto**; compartir requiere una acción explícita y
  queda auditada. El portal del paciente consulta vistas/políticas que excluyen notas privadas.
- El superadministrador no tendrá políticas sobre tablas clínicas.
- Nada clínico en el feed social: las publicaciones solo contienen lo que el paciente escribe.
- Archivos (si se usan) en buckets privados de Supabase Storage con URLs firmadas de corta duración.
- Pagos: estado confirmado solo por webhooks verificados e idempotentes.

## Pendientes

- TODO: textos legales (términos, privacidad, consentimiento) revisados por un profesional.
- TODO: Content-Security-Policy con nonce.
- TODO: MFA opcional para profesionales (Supabase lo soporta con TOTP).
- TODO: política de respaldo y restauración (Point-in-Time Recovery en Supabase).
