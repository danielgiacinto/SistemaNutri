import { Suspense } from "react";
import CargandoSeccionPaciente from "../loading";
import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import { Eye } from "lucide-react";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { FormularioInvitacion } from "@/componentes/pacientes/formulario-invitacion";
import { listarEvoluciones } from "@/servicios/evoluciones";
import { obtenerInvitacionPendiente } from "@/servicios/invitaciones";
import { listarObjetivos } from "@/servicios/objetivos";
import { listarMediciones } from "@/servicios/mediciones";
import { Card, CardContent, CardDescription, CardHeader } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Visibilidad para el paciente" };

export default function PaginaVisibilidad({ params }: PageProps<"/panel/pacientes/[pacienteId]/visibilidad">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoSeccion params={params} /></Suspense>;
}

async function ContenidoSeccion({ params }: Pick<PageProps<"/panel/pacientes/[pacienteId]/visibilidad">, "params">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const [evoluciones, objetivos, mediciones, invitacion] = await Promise.all([
    listarEvoluciones(cliente, contexto.consultorio.id, paciente.id),
    listarObjetivos(cliente, contexto.consultorio.id, paciente.id),
    listarMediciones(cliente, contexto.consultorio.id, paciente.id),
    paciente.usuario_id ? Promise.resolve(null) : obtenerInvitacionPendiente(cliente, paciente.id),
  ]);

  const compartidas = {
    evoluciones: evoluciones.filter((item) => item.visible_para_paciente && !item.es_borrador).length,
    objetivos: objetivos.filter((item) => item.visible_para_paciente).length,
    mediciones: mediciones.filter((item) => item.visible_para_paciente).length,
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2} titulo="Visibilidad" descripcion="Gestioná el acceso al portal y revisá la información que compartís." />
    <Card>
      <CardHeader>
        <TituloTarjeta icono={Mail}>Invitación al portal</TituloTarjeta>
        <CardDescription className="sm:pl-12">

            {paciente.usuario_id
              ? "Esta persona ya aceptó la invitación y puede entrar al portal."
              : invitacion
                ? "La invitación está pendiente. Esta persona todavía no puede entrar al portal."
                : paciente.correo
                  ? "Esta persona todavía no tiene acceso al portal."
                  : "Esta persona todavía no tiene acceso al portal. Agregá un correo en la ficha para poder invitarla."}

        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioInvitacion
          pacienteId={paciente.id}
          correo={paciente.correo}
          vinculado={Boolean(paciente.usuario_id)}
          invitacionPendiente={Boolean(invitacion)}
        />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <TituloTarjeta icono={ShieldCheck}>Qué verá el paciente</TituloTarjeta>
        <CardDescription className="sm:pl-12">

            Nada se comparte por defecto. Las notas en borrador nunca se publican.

        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Dato etiqueta="Evoluciones compartidas" valor={compartidas.evoluciones} total={evoluciones.length} />
        <Dato etiqueta="Objetivos visibles" valor={compartidas.objetivos} total={objetivos.length} />
        <Dato etiqueta="Mediciones visibles" valor={compartidas.mediciones} total={mediciones.length} />
      </CardContent>
    </Card>
    </div>
  );
}

function Dato({ etiqueta, valor, total }: { etiqueta: string; valor: number; total: number }) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
      <Eye className="size-4 text-primary" aria-hidden="true" /><p className="text-3xl font-bold tabular-nums">{valor}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {total}</span></p>
      <p className="text-sm text-muted-foreground">
        {etiqueta}
      </p>
    </div>
  );
}
