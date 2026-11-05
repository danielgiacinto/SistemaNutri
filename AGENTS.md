<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Convenciones del proyecto

- Código, identificadores, comentarios y textos de la interfaz en español (excepto `src/componentes/ui`, generado por shadcn).
- Autorización: toda página y Server Action llama a `requerir*()` de `src/autorizacion/sesion.ts`; los ids de consultorio/usuario se toman de la sesión, nunca del cliente.
- Esquema de base solo mediante migraciones en `supabase/migrations`, con permisos explícitos y políticas RLS por operación, más pruebas en `pruebas/bd`.
- Lecturas de sesión dentro de `<Suspense>` (Cache Components). Sin `use cache` sobre datos clínicos.
- Colores solo mediante tokens de `src/app/globals.css`.
- Ejecutar `npm run verificar` una vez al final cuando se modifique código, configuración, migraciones o pruebas. Si falla, corregir el problema y volver a ejecutarlo. Para cambios solo de documentación, omitirlo.

## Uso eficiente del contexto

- Empezar por los archivos directamente relacionados con el pedido. Usar `rg` para ubicar código y leer solo los fragmentos necesarios; ampliar la búsqueda si el problema lo requiere.
- Para cambios de Next.js, consultar únicamente la guía de `node_modules/next/dist/docs/` correspondiente a la API que se va a modificar.
- Agrupar los cambios y resumir las salidas de comandos; mencionar errores relevantes y evitar copiar logs completos salvo que sean necesarios para diagnosticar.
