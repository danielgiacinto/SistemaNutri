import { Suspense } from "react";
import { requerirProfesional } from "@/autorizacion/sesion";

export default function PaginaSinDialogo() {
  return <Suspense fallback={null}><Contenido /></Suspense>;
}

async function Contenido() {
  await requerirProfesional();
  return null;
}
