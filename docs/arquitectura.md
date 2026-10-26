# Arquitectura

Documento vivo con las decisiones que condicionan el crecimiento del producto.

## Stack

| Capa | Elección | Motivo |
| --- | --- | --- |
| Aplicación | Next.js 16 (App Router, Cache Components) + React 19 + TypeScript | Un solo proyecto para interfaz y servidor; despliegue directo en Vercel. |
| Estilos | Tailwind CSS 4 + shadcn/ui (Radix) | Componentes accesibles y personalizables mediante tokens CSS. |
| Formularios | React Hook Form + Zod 4 | El mismo esquema valida en el navegador y en el servidor. |
| Datos y auth | Supabase (PostgreSQL, Auth, RLS) | Autenticación gestionada y autorización reforzada en la base. |
| Pruebas | Vitest + PGlite | Pruebas unitarias y de políticas RLS sobre PostgreSQL real embebido, sin Docker. |
| Despliegue | Vercel + Supabase + GitHub Actions | CI en cada PR, despliegue automático de la app y de las migraciones. |

No hay backend separado: Server Actions y Route Handlers cubren las necesidades
actuales. Las reglas de negocio viven en `src/servicios`, sin dependencias de React,
por lo que podrían moverse a un servicio independiente si hiciera falta.

## Estructura de carpetas

```
src/
  app/                 Rutas (App Router). Solo composición de páginas.
    (autenticacion)/   Ingreso, registro y recuperación de contraseña.
    auth/              Route Handlers de Supabase Auth (confirmar, destino).
    panel/             Área del profesional.
    portal/            Área del paciente (experiencia móvil propia).
    admin/             Área del superadministrador.
  acciones/            Server Actions: validan, autorizan y delegan en servicios.
  autorizacion/        Sesión, roles, rutas protegidas (Data Access Layer).
  servicios/           Reglas de negocio y acceso a datos (reciben el cliente de Supabase).
  esquemas/            Esquemas Zod compartidos cliente/servidor.
  componentes/         Interfaz. `ui/` contiene los componentes de shadcn sin modificar su API.
  configuracion/       Entorno, navegación, paletas, constantes del producto.
  lib/                 Utilidades (clientes de Supabase, errores, formularios).
  tipos/               Tipos de la base de datos y tipos compartidos.
  proxy.ts             Renovación de sesión y primera barrera de acceso.
supabase/
  migrations/          Migraciones SQL versionadas (única fuente de verdad del esquema).
  plantillas/          Correos de autenticación en español.
pruebas/
  unitarias/           Lógica pura (rutas, roles, validaciones).
  bd/                  Migraciones + RLS sobre PGlite con una simulación mínima de Supabase.
docs/                  Esta documentación.
```

Los componentes generados por shadcn (`src/componentes/ui`) conservan los nombres en
inglés de la biblioteca para poder actualizarlos con `npx shadcn add`; todo el código
propio usa identificadores en español.

## Flujo de una petición

1. **`src/proxy.ts`** renueva la sesión de Supabase y redirige a `/ingresar` si una
   ruta protegida no tiene sesión. No decide permisos por rol.
2. **Layouts** (`panel`, `portal`, `admin`) llaman a `requerirProfesional()`,
   `requerirPaciente()` o `requerirSuperadmin()` dentro de un `<Suspense>`.
3. **Cada página y cada Server Action** vuelve a verificar con las mismas funciones:
   Next.js renderiza layouts y páginas en paralelo, así que el layout no es una barrera suficiente.
4. **La base de datos** aplica RLS y permisos por columna. Aunque una verificación
   anterior fallara, PostgreSQL no devuelve ni modifica filas ajenas.

Los identificadores de recursos sensibles (consultorio, usuario) siempre se toman de
la sesión en el servidor, nunca de los datos enviados por el cliente.

## Multi-tenencia

- El **tenant es el consultorio** (`consultorios`). Toda tabla clínica futura tendrá
  `consultorio_id` y sus políticas usarán `privado.es_miembro_consultorio(consultorio_id)`.
- La membresía (`miembros_consultorio`) ya admite los roles `titular` y `colaborador`.
  Hoy un índice único limita a un consultorio por usuario; para soportar equipos o
  varios consultorios alcanza con quitarlo y agregar un selector de consultorio activo.
- El superadministrador no es miembro de ningún consultorio: ve datos comerciales
  (consultorios, cuentas, auditoría) pero no tendrá políticas sobre tablas clínicas.

## Roles

| Rol | Cómo se asigna | Dónde se verifica |
| --- | --- | --- |
| Profesional | `crear_consultorio_inicial()` durante el alta | `requerirProfesional()` + RLS por membresía |
| Paciente | Aceptación de una invitación del profesional (fase 3) | `requerirPaciente()` + RLS por vínculo |
| Superadministrador | Script con clave secreta o editor SQL | `requerirSuperadmin()` + `privado.es_superadmin()` |

El tipo de cuenta nunca se lee de `raw_user_meta_data` (editable por el usuario al
registrarse) y la columna `perfiles.tipo_cuenta` no tiene permiso de escritura para la API.

## Cache Components

El proyecto usa `cacheComponents` y `partialPrefetching` (valores por defecto de Next 16):

- Toda lectura de sesión ocurre dentro de un `<Suspense>`; el resto de la página se
  prerenderiza como esqueleto estático.
- No se usa `use cache` sobre datos clínicos: se leen siempre en tiempo de petición.
- Después de una mutación se llama a `refresh()` para actualizar la vista.

## Apariencia

Todos los colores provienen de tokens CSS en `src/app/globals.css`. Hay dos capas:
neutros (claro/oscuro) y paleta de marca (`data-paleta` en `<html>`). Las preferencias
se guardan en `perfiles` y se replican en `localStorage` para aplicarlas antes del
primer pintado.

## Decisiones pendientes

- **Proveedor de pagos (fase 5).** Propuesta inicial: Mercado Pago Suscripciones
  (débito recurrente en ARS, medios de pago locales). Stripe requiere en general una
  entidad fuera de Argentina para cobrar. La decisión final se documentará antes de
  integrar, verificando condiciones vigentes, y siempre con webhooks autenticados e idempotentes.
- **Envío de correos transaccionales** (recordatorios de turnos): la columna
  `turnos.recordatorio_enviado_en` ya existe. Los correos de Auth ya salen por un SMTP
  de prueba (Gmail). Falta SMTP de producción con dominio propio y el job de recordatorios.
- **Calendario:** vistas día/semana/mes propias, con hora local del consultorio, en lugar de
  una biblioteca de calendario pesada. Los selectores de fecha y hora usan controles nativos
  (mejor en celular). El gráfico de peso usa Recharts.
- **Content-Security-Policy** con nonce: pendiente hasta incorporar recursos externos.

## Plan por fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundamentos: proyecto, auth, roles, RLS base, layouts, configuración | Implementada |
| 2 | Pacientes, agenda, historia clínica, objetivos, mediciones, gráficos | Implementada |
| 3 | Portal del paciente e invitaciones | Pendiente |
| 4 | Planes alimentarios con versiones y publicación | Pendiente |
| 5 | Suscripciones, pagos y panel de administración completo | Pendiente |
| 6 | Comunidad y desafíos | Pendiente |

El detalle de lo que se puede probar hoy, el entorno de Supabase y lo operativo
pendiente está en el README (sección Estado) y en `docs/despliegue.md`.
