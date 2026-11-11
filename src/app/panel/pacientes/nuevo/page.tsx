import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requerirProfesional } from "@/autorizacion/sesion";
import { Skeleton } from "@/componentes/ui/skeleton";

export default function PaginaNuevoPaciente() {
  return <Suspense fallback={<Skeleton className="h-72" />}><RedirigirAlta /></Suspense>;
}

async function RedirigirAlta() {
  await requerirProfesional();
  return redirect("/panel/pacientes?crear=1");
}
