# Base de datos

El esquema se define exclusivamente con migraciones en `supabase/migrations`. No se
hacen cambios manuales desde el panel de Supabase.

## Convenciones

- Tablas, columnas y funciones en español y `snake_case`.
- `creado_en` / `actualizado_en` (`timestamptz`) en toda tabla editable; `actualizado_en`
  se mantiene con el trigger `privado.establecer_actualizado_en()`.
- El esquema `privado` contiene funciones auxiliares que no se exponen por la API REST.
- Permisos explícitos: cada migración revoca los privilegios por defecto de `anon` y
  `authenticated` y otorga solo lo necesario, incluso por columna.
- Las funciones `SECURITY DEFINER` fijan `search_path = ''` y califican cada objeto.
- Los errores de negocio se lanzan con una clave (`raise exception 'consultorio_existente'`)
  que `src/servicios` traduce a mensajes en español.

## Modelo actual (fases 1 a 4)

| Tabla | Propósito | Escritura desde la API |
| --- | --- | --- |
| `perfiles` | Un registro por usuario de Auth: nombre, preferencias, tipo de cuenta. | Solo `nombre`, `apellido`, `tema`, `paleta` del propio perfil. |
| `consultorios` | Tenant: espacio de trabajo de cada profesional. | Solo `nombre`, `zona_horaria`, `telefono`, `direccion`, `duracion_turno_minutos`, y solo el titular. |
| `miembros_consultorio` | Relación usuario–consultorio con rol `titular`/`colaborador`. | Ninguna (vía `crear_consultorio_inicial`). |
| `administradores_plataforma` | Superadministradores. | Ninguna. Sin políticas: invisible para la API. |
| `registros_auditoria` | Quién hizo qué, sobre qué entidad y cuándo. Nunca contenido clínico. | Ninguna (vía funciones y triggers). |
| `pacientes` | Personas del consultorio. `usuario_id` se vincula al aceptar una invitación. | Alta y edición; sin borrar (se desactiva). `usuario_id` no es editable por la API. |
| `invitaciones_paciente` | Invitación al portal. Se guarda la huella del token, no el token. | El consultorio crea y revoca. La persona invitada ve las suyas pendientes. |
| `horarios_atencion` | Franjas locales de atención. Si no hay filas, la agenda no restringe. | Miembros. |
| `bloqueos_agenda` | Intervalos no reservables. | Miembros. |
| `turnos` | Reservas. No se eliminan: se cancelan. | Miembros. El trigger rechaza solapes, bloqueos y horarios inválidos. |
| `evoluciones` | Notas clínicas. Nacen privadas y en borrador. | Miembros. Borrar solo borradores propios. |
| `evoluciones_versiones` | Instantánea anterior de cada edición. | Solo SELECT. |
| `objetivos` | Metas del paciente (no solo peso). | Miembros. |
| `mediciones` | Antropometría puntual. El IMC no se persiste. | Miembros. |
| `planes_alimentarios` | Borrador del plan. El paciente no lo lee. | Miembros. Borrar solo si nunca se publicó. |
| `planes_comidas` | Comidas del borrador. | Miembros. |
| `planes_publicaciones` | Copia inmutable al publicar. | Solo SELECT. La crea `publicar_plan`. |
| `planes_publicaciones_comidas` | Comidas de esa copia. | Solo SELECT. |

El superadministrador **no** tiene políticas sobre las tablas clínicas.

### Funciones expuestas (RPC)

- `crear_consultorio_inicial(p_nombre, p_zona_horaria)`: crea el consultorio, la
  membresía titular y asigna el tipo de cuenta profesional. Rechaza cuentas de paciente
  y usuarios que ya tienen consultorio.
- `obtener_mi_contexto()`: perfil, consultorio y rol de plataforma del usuario actual
  (`SECURITY INVOKER`: solo devuelve lo que RLS ya permite ver).
- `aceptar_invitacion(p_huella)`: vincula `pacientes.usuario_id` y asigna `tipo_cuenta = paciente`.
  Rechaza cuentas que ya son de un consultorio. Si `p_huella` es nula, acepta la única
  invitación pendiente del correo de la sesión.
- `guardar_plan` y `publicar_plan`: el borrador se edita sin tocar la copia que ve el paciente.
  Publicar crea la versión siguiente.

## Políticas RLS

| Tabla | SELECT | UPDATE |
| --- | --- | --- |
| `perfiles` | Propio perfil; superadministrador | Propio perfil (columnas permitidas) |
| `consultorios` | Miembros; superadministrador | Titular (columnas permitidas) |
| `miembros_consultorio` | Propias y del mismo consultorio; superadministrador | — |
| `registros_auditoria` | Titular del consultorio; superadministrador | — |
| `administradores_plataforma` | — | — |

INSERT y DELETE de identidad (fase 1) siguen bloqueados para la API. En las tablas clínicas
los miembros pueden insertar y actualizar filas de su consultorio; el borrado físico está
limitado a horarios, bloqueos y borradores de evoluciones.

## Retención y eliminación

- Los consultorios no se eliminan desde la aplicación: se cambia su `estado`
  (`activo`, `suspendido`, `baja`). La historia clínica debe conservarse (ver
  `docs/seguridad-y-privacidad.md`).
- Pacientes, turnos y evoluciones publicadas no se borran desde la aplicación: el paciente
  se desactiva, el turno se cancela y cada edición de evolución deja una versión.
  El borrado físico queda limitado a horarios, bloqueos y borradores de evoluciones.
- Si se elimina un usuario de Auth, su perfil y sus membresías se eliminan en cascada,
  pero el consultorio y sus datos permanecen (`creado_por` pasa a `NULL`).

## Pruebas

`npm test` aplica todas las migraciones sobre PGlite (PostgreSQL embebido) junto con
`pruebas/bd/supabase-simulado.sql`, que recrea los roles `anon`/`authenticated`/`service_role`,
`auth.users` y `auth.uid()`. Las pruebas ejecutan consultas como cada usuario y verifican
aislamiento, escalada de privilegios y acceso anónimo.

Esa simulación es mínima: las pruebas completas contra Supabase (Auth real, Storage)
se harán con `supabase start` cuando haya Docker disponible.

## Flujo de trabajo

```bash
npx supabase migration new nombre_descriptivo   # crea el archivo vacío
npm test                                         # valida migraciones y RLS
npm run bd:reiniciar                             # (con Docker) recrea la base local
npm run bd:tipos                                 # regenera src/tipos/base-datos.ts
```
