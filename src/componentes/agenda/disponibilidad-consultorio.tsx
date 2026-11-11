import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import { Ban, Clock } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarBloqueos, listarHorarios } from "@/servicios/agenda";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioHorario } from "@/componentes/agenda/formulario-horario";
import { FormularioBloqueo } from "@/componentes/agenda/formulario-bloqueo";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { BotonEliminarBloqueo, BotonEliminarHorario } from "@/componentes/agenda/boton-eliminar";
import { Card, CardContent, CardDescription, CardHeader } from "@/componentes/ui/card";
import { DIAS_SEMANA } from "@/configuracion/clinica";
import { formatearFechaHora, hoyEnZona, inicioDelDia } from "@/lib/fechas";

export async function DisponibilidadConsultorio({ enDialogo = false }: { enDialogo?: boolean }) {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const hoy = hoyEnZona(contexto.consultorio.zonaHoraria);
  const [horarios, bloqueos] = await Promise.all([
    listarHorarios(cliente, contexto.consultorio.id),
    listarBloqueos(cliente, contexto.consultorio.id, inicioDelDia(hoy, contexto.consultorio.zonaHoraria)),
  ]);

  return (
    <div className={enDialogo ? "space-y-5" : "space-y-8"}>
      {!enDialogo && <EncabezadoPagina
        titulo="Horarios y bloqueos"
        descripcion="Organizá tu semana de atención y reservá los momentos en los que no estás disponible."
        volverA="/panel/agenda"
        etiquetaVolver="Agenda"
      />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <TituloTarjeta icono={Clock}>Horarios de atención</TituloTarjeta>
            <CardDescription className="sm:pl-12">
              Hora local del consultorio ({contexto.consultorio.zonaHoraria}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {horarios.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-5"><p className="font-medium">Tu agenda está abierta</p><p className="mt-1 text-sm text-muted-foreground">Agregá franjas para definir tus días y horarios de atención. Sin franjas, podés agendar a cualquier hora.</p></div>
            ) : (
              <ul className="divide-y rounded-xl border">
                {horarios.map((horario) => (
                  <li key={horario.id} className="flex items-center justify-between gap-3 px-4 py-4 text-sm [&>span]:min-w-0 [&>span]:wrap-anywhere">
                    <span>
                      {DIAS_SEMANA.find((dia) => dia.iso === horario.dia_semana)?.etiqueta} {horario.hora_inicio.slice(0, 5)} –{" "}
                      {horario.hora_fin.slice(0, 5)}
                    </span>
                    <BotonEliminarHorario id={horario.id} />
                  </li>
                ))}
              </ul>
            )}
            <VentanaFormulario icono={<Clock aria-hidden="true" />} etiqueta="Agregar franja" titulo="Nueva franja" descripcion="Hora local del consultorio." variante="outline">
              <FormularioHorario />
            </VentanaFormulario>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <TituloTarjeta icono={Ban}>Bloqueos</TituloTarjeta>
            <CardDescription className="sm:pl-12">
              Vacaciones, reuniones u otros intervalos no reservables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bloqueos.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-5"><p className="font-medium">Sin bloqueos vigentes</p><p className="mt-1 text-sm text-muted-foreground">Cuando necesites reservar tiempo para vos, agregá un bloqueo.</p></div>
            ) : (
              <ul className="divide-y rounded-xl border">
                {bloqueos.map((bloqueo) => (
                  <li key={bloqueo.id} className="flex items-center justify-between gap-3 px-4 py-4 text-sm [&>span]:min-w-0 [&>span]:wrap-anywhere">
                    <span>
                      {formatearFechaHora(new Date(bloqueo.inicio), contexto.consultorio.zonaHoraria)} –{" "}
                      {formatearFechaHora(new Date(bloqueo.fin), contexto.consultorio.zonaHoraria)}
                      {bloqueo.motivo ? ` · ${bloqueo.motivo}` : ""}
                    </span>
                    <BotonEliminarBloqueo id={bloqueo.id} />
                  </li>
                ))}
              </ul>
            )}
            <VentanaFormulario icono={<Ban aria-hidden="true" />} etiqueta="Agregar bloqueo" titulo="Nuevo bloqueo" descripcion="Ese intervalo no se puede reservar." variante="outline">
              <FormularioBloqueo fechaPredeterminada={hoy} />
            </VentanaFormulario>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
