import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirUsuario, requerirProfesional, requerirPaciente } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { DocumentoDelPlan } from "@/componentes/planes/documento-plan";
import { BotonImprimirPlan } from "@/componentes/planes/boton-imprimir";
import { documentoDesdeComidas } from "@/lib/planes-visuales";
import type { DocumentoPlan } from "@/tipos/plan-visual";
import { Skeleton } from "@/componentes/ui/skeleton";
import { registrarError } from "@/lib/errores";

export const metadata: Metadata = { title: "Plan para imprimir", robots: { index: false, follow: false } };
export default function PaginaImpresion({ params }: PageProps<"/planes/impresion/[publicacionId]">) {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-3xl" />}><Contenido params={params} /></Suspense>;
}
async function Contenido({ params }: Pick<PageProps<"/planes/impresion/[publicacionId]">, "params">) {
  const contexto = await requerirUsuario();
  if (contexto.tipoCuenta === "profesional") await requerirProfesional(); else await requerirPaciente();
  const { publicacionId } = await params;
  if (!esquemaUuid.safeParse(publicacionId).success) notFound();
  const cliente = await crearClienteServidor();
  const { data: plan, error } = await cliente.from("planes_publicaciones").select("*, planes_publicaciones_comidas (*)").eq("id", publicacionId).maybeSingle();
  if (error) { registrarError("imprimir_plan", error); throw new Error("No se pudo cargar esta versión del plan."); }
  if (!plan) notFound();
  const presentacion = plan.presentacion as { paciente?: string; profesional?: string; consultorio?: string } | null;
  let paciente = presentacion?.paciente;
  let remitente = [presentacion?.profesional, presentacion?.consultorio].filter(Boolean).join(" · ");
  if (!presentacion) {
    const [ficha, consultorio] = await Promise.all([
      cliente.from("pacientes").select("nombre, apellido").eq("id", plan.paciente_id).maybeSingle(),
      cliente.from("consultorios").select("nombre").eq("id", plan.consultorio_id).maybeSingle(),
    ]);
    if (ficha.error || consultorio.error) {
      registrarError("identificacion_plan_anterior", ficha.error ?? consultorio.error);
      throw new Error("No se pudo cargar la identificación de este plan.");
    }
    paciente = ficha.data ? `${ficha.data.nombre} ${ficha.data.apellido}` : undefined;
    remitente = consultorio.data?.nombre ?? "";
  }
  const documento = (plan.documento as unknown as DocumentoPlan) ?? documentoDesdeComidas([...plan.planes_publicaciones_comidas].sort((a, b) => a.orden - b.orden));
  return <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:py-8 print:p-0"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><div><h1 className="font-semibold">Tu plan, también en papel</h1><p className="text-xs text-muted-foreground">Elegí «Guardar como PDF» en el diálogo de impresión. Se incluyen los siete días.</p></div><BotonImprimirPlan /></div><DocumentoDelPlan titulo={plan.titulo} indicaciones={plan.indicaciones ?? ""} documento={documento} paciente={paciente} profesional={remitente} version={plan.numero} fecha={new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(plan.publicada_en))} /></main>;
}
