import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import { UserRound, Info } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioPaciente } from "@/componentes/pacientes/formulario-paciente";
import { Card, CardContent, CardHeader, CardDescription } from "@/componentes/ui/card";
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
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Card>
          <CardHeader>
            <TituloTarjeta icono={UserRound}>Datos del paciente</TituloTarjeta>
            <CardDescription className="sm:pl-12">Completá los datos para abrir su ficha.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormularioPaciente modo="alta" />
          </CardContent>
        </Card>
        <aside className="space-y-3 rounded-2xl border bg-card p-5 sm:p-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Info className="size-4" aria-hidden="true" /></span>
          <h2 className="font-semibold">Antes de guardar</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Podés completar los datos opcionales más adelante. Agregar un correo te permitirá invitar al paciente a su portal.</p>
        </aside>
      </div>
    </div>
  );
}
