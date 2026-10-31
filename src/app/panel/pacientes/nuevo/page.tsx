import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioPaciente } from "@/componentes/pacientes/formulario-paciente";
import { Card, CardContent } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default function PaginaNuevoPaciente() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirProfesional();
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Nuevo paciente"
        descripcion="Nombre y un dato de contacto alcanzan para empezar."
        volverA="/panel/pacientes"
        etiquetaVolver="Pacientes"
      />
      <Card>
        <CardContent>
          <FormularioPaciente modo="alta" />
        </CardContent>
      </Card>
    </div>
  );
}
