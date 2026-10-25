// Asigna el rol de superadministrador a una cuenta existente.
//
// Uso:   npm run superadmin:crear -- correo@dominio.com
// Lee:   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY desde .env.local
//
// La cuenta debe haberse registrado antes en la aplicación. El rol nunca se
// puede asignar desde la interfaz: solo con la clave secreta o desde el editor SQL.

import { createClient } from "@supabase/supabase-js";

const correo = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveSecreta = process.env.SUPABASE_SECRET_KEY;

if (!correo || !correo.includes("@")) {
  console.error("Indicá el correo de la cuenta: npm run superadmin:crear -- correo@dominio.com");
  process.exit(1);
}
if (!url || !claveSecreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.");
  process.exit(1);
}

const supabase = createClient(url, claveSecreta, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function buscarUsuarioPorCorreo(correoBuscado) {
  const porPagina = 200;
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: porPagina });
    if (error) throw error;
    const usuario = data.users.find((u) => u.email?.toLowerCase() === correoBuscado);
    if (usuario) return usuario;
    if (data.users.length < porPagina) return null;
  }
}

try {
  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    console.error(`No existe una cuenta con el correo ${correo}. Registrala primero en la aplicación.`);
    process.exit(1);
  }

  const { error: errorAlta } = await supabase
    .from("administradores_plataforma")
    .upsert({ usuario_id: usuario.id, nota: "Asignado con scripts/crear-superadmin.mjs" });
  if (errorAlta) throw errorAlta;

  const { error: errorAuditoria } = await supabase.from("registros_auditoria").insert({
    actor_id: null,
    accion: "plataforma.superadmin_asignado",
    entidad: "administradores_plataforma",
    entidad_id: usuario.id,
    detalles: { origen: "script" },
  });
  if (errorAuditoria) throw errorAuditoria;

  console.log(`Listo: ${correo} ahora es superadministrador de la plataforma.`);
} catch (error) {
  console.error("No se pudo asignar el rol:", error.message ?? error);
  process.exit(1);
}
