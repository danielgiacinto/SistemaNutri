"use client";

import { useId, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ContactRound, Mail, Phone, Save, UserPlus, UserRound } from "lucide-react";
import { registrarPaciente, guardarPaciente } from "@/acciones/pacientes";
import { esquemaAltaPaciente, esquemaEdicionPaciente, type DatosAltaPaciente, type DatosEdicionPaciente } from "@/esquemas/paciente";
import { aplicarErroresServidor } from "@/lib/formularios";
import { edadEnAnios } from "@/lib/fechas";
import { cn } from "@/lib/utilidades";
import { CampoTexto } from "@/componentes/formularios/campo-texto";
import { CampoArea } from "@/componentes/formularios/campo-area";
import { CampoSelect } from "@/componentes/formularios/campo-select";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { Button } from "@/componentes/ui/button";
import { Field, FieldLabel, FieldError } from "@/componentes/ui/field";
import { ETIQUETAS_ESTADO_PACIENTE } from "@/configuracion/clinica";

type PropiedadesAlta = { modo: "alta"; alCancelar: () => void; alCambiarPendiente: (pendiente: boolean) => void };
type PropiedadesEdicion = { modo: "edicion"; pacienteId: string; inicial: DatosEdicionPaciente };

export function FormularioPaciente(propiedades: PropiedadesAlta | PropiedadesEdicion) {
  const [pendiente, iniciarTransicion] = useTransition();
  const prefijo = useId();
  const esEdicion = propiedades.modo === "edicion";
  const formulario = useForm<DatosEdicionPaciente>({
    resolver: zodResolver(esEdicion ? esquemaEdicionPaciente : esquemaAltaPaciente) as unknown as Resolver<DatosEdicionPaciente>,
    defaultValues: esEdicion ? propiedades.inicial : {
      nombre: "", apellido: "", correo: "", telefono: "", documento: "", fechaNacimiento: "",
      sexo: "", obraSocial: "", numeroAfiliado: "", notasAdministrativas: "", estado: "activo",
    },
  });
  const [nombre, apellido, telefono, correo, nacimiento, sexo] = useWatch({
    control: formulario.control, name: ["nombre", "apellido", "telefono", "correo", "fechaNacimiento", "sexo"],
  });
  const edad = nacimiento ? edadEnAnios(nacimiento) : null;
  const { errors: errores } = formulario.formState;

  const alEnviar = formulario.handleSubmit((datos) => iniciarTransicion(async () => {
    if (propiedades.modo === "alta") propiedades.alCambiarPendiente(true);
    try {
      const resultado = esEdicion
        ? await guardarPaciente(propiedades.pacienteId, datos as DatosEdicionPaciente)
        : await registrarPaciente(datos as DatosAltaPaciente);
      if (resultado && !resultado.ok) {
        aplicarErroresServidor(formulario.setError, resultado);
        toast.error(resultado.mensaje);
        return;
      }
      if (esEdicion && resultado?.ok) {
        toast.success(resultado.mensaje ?? "Cambios guardados.");
        formulario.reset(datos);
      }
    } finally {
      if (propiedades.modo === "alta") propiedades.alCambiarPendiente(false);
    }
  }));

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={pendiente} className={cn(!esEdicion && "grid min-h-0 flex-1 lg:grid-cols-[16rem_minmax(0,1fr)]")}>
      {!esEdicion && <aside className="hidden min-w-0 flex-col gap-5 bg-primary p-7 text-primary-foreground lg:flex">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15"><UserRound className="size-7" aria-hidden="true" /></span>
        <div><h2 className="text-2xl font-semibold wrap-anywhere">{[nombre, apellido].filter(Boolean).join(" ") || "Nuevo paciente"}</h2>
          <p className="mt-2 text-sm opacity-80">{[sexo === "femenino" ? "Femenino" : sexo === "masculino" ? "Masculino" : sexo === "x" ? "X" : null, edad != null && edad >= 0 ? `${edad} años` : null].filter(Boolean).join(" · ") || "Su ficha empieza con un nombre."}</p></div>
        <div className="space-y-2 text-xs">
          <p className="flex items-start gap-2 rounded-xl bg-primary-foreground/10 p-3 wrap-anywhere"><Phone className="size-4 shrink-0" aria-hidden="true" />{telefono || "Sin teléfono todavía"}</p>
          <p className="flex items-start gap-2 rounded-xl bg-primary-foreground/10 p-3 wrap-anywhere"><Mail className="size-4 shrink-0" aria-hidden="true" />{correo || "Sin correo todavía"}</p>
        </div>
        <div className="mt-auto rounded-xl bg-primary-foreground/10 p-4 text-xs leading-relaxed"><p className="font-semibold">Su espacio en Nutrisfera</p><p className="mt-1 opacity-90">Creá su ficha y, cuando quieras, invitalo por correo al portal para ver su plan, sus turnos y su seguimiento.</p></div>
      </aside>}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className={cn("space-y-6", !esEdicion && "min-h-0 flex-1 overflow-y-auto p-5 sm:p-7")}>
          {!esEdicion && <header className="pr-7"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Nuevo paciente</p><p className="mt-2 text-sm text-muted-foreground">Solo el nombre es obligatorio. Completá lo demás cuando lo tengas.</p></header>}
          <fieldset disabled={pendiente} className="min-w-0 space-y-4">
            <legend className="mb-4 flex items-center gap-2 font-semibold"><UserRound className="size-4 text-primary" aria-hidden="true" />Identidad</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto id={`${prefijo}-nombre`} etiqueta="Nombre" required maxLength={80} autoComplete="given-name" error={errores.nombre?.message} {...formulario.register("nombre")} />
              <CampoTexto id={`${prefijo}-apellido`} etiqueta="Apellido (opcional)" maxLength={80} autoComplete="family-name" error={errores.apellido?.message} {...formulario.register("apellido")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.25fr_5rem]">
              <CampoTexto id={`${prefijo}-documento`} etiqueta="DNI (opcional)" maxLength={20} error={errores.documento?.message} {...formulario.register("documento")} />
              <CampoTexto id={`${prefijo}-nacimiento`} etiqueta="Nacimiento (opcional)" type="date" min="1900-01-01" error={errores.fechaNacimiento?.message} {...formulario.register("fechaNacimiento")} />
              <CampoTexto id={`${prefijo}-edad`} etiqueta="Edad" readOnly value={edad != null && edad >= 0 ? edad : "—"} />
            </div>
            <Controller control={formulario.control} name="sexo" render={({ field: campo }) => <Field>
              <FieldLabel id={`${prefijo}-sexo`}>Sexo (opcional)</FieldLabel>
              <div role="group" aria-labelledby={`${prefijo}-sexo`} aria-describedby={errores.sexo ? `${prefijo}-sexo-error` : undefined} className="flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1">
                {([['femenino', 'Femenino'], ['masculino', 'Masculino'], ['x', 'X']] as const).map(([valor, etiqueta]) => <button key={valor} type="button" aria-pressed={campo.value === valor} onClick={() => campo.onChange(campo.value === valor ? "" : valor)} className={cn("min-h-9 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", campo.value === valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{etiqueta}</button>)}
              </div>
              {errores.sexo && <FieldError id={`${prefijo}-sexo-error`}>{errores.sexo.message}</FieldError>}
            </Field>} />
          </fieldset>
          <fieldset disabled={pendiente} className="min-w-0 space-y-4">
            <legend className="mb-4 flex items-center gap-2 font-semibold"><ContactRound className="size-4 text-primary" aria-hidden="true" />Contacto y cobertura</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto id={`${prefijo}-telefono`} etiqueta="Teléfono (opcional)" type="tel" autoComplete="tel" maxLength={40} error={errores.telefono?.message} {...formulario.register("telefono")} />
              <CampoTexto id={`${prefijo}-correo`} etiqueta="Correo (opcional)" type="email" autoComplete="email" error={errores.correo?.message} {...formulario.register("correo")} />
              <CampoTexto id={`${prefijo}-obra-social`} etiqueta="Obra social (opcional)" maxLength={120} error={errores.obraSocial?.message} {...formulario.register("obraSocial")} />
              <CampoTexto id={`${prefijo}-afiliado`} etiqueta="N° de afiliado (opcional)" maxLength={80} error={errores.numeroAfiliado?.message} {...formulario.register("numeroAfiliado")} />
            </div>
          </fieldset>
          {esEdicion && <Controller control={formulario.control} name="estado" render={({ field: campo }) => <CampoSelect id={`${prefijo}-estado`} etiqueta="Estado" valor={campo.value} alCambiar={campo.onChange} error={errores.estado?.message} opciones={[{ valor: "activo", etiqueta: ETIQUETAS_ESTADO_PACIENTE.activo }, { valor: "inactivo", etiqueta: ETIQUETAS_ESTADO_PACIENTE.inactivo }]} />} />}
          <details className="rounded-xl border p-4" open={esEdicion || !!errores.notasAdministrativas}>
            <summary className="cursor-pointer text-sm font-medium">Notas administrativas (opcional)</summary>
            <div className="pt-4"><CampoArea id={`${prefijo}-notas`} etiqueta="Notas" descripcion="Horarios, cómo llega, recados. No forma parte de la historia clínica." disabled={pendiente} error={errores.notasAdministrativas?.message} {...formulario.register("notasAdministrativas")} /></div>
          </details>
        </div>
        <footer className={cn("flex shrink-0 flex-wrap justify-end gap-2 border-t pt-5", !esEdicion && "bg-popover p-4 sm:px-7")}>
          {!esEdicion && <Button type="button" variant="outline" disabled={pendiente} onClick={propiedades.alCancelar}>Cancelar</Button>}
          <BotonEnvio pendiente={pendiente} textoPendiente={esEdicion ? "Guardando…" : "Creando…"} icono={esEdicion ? Save : UserPlus}>{esEdicion ? "Guardar cambios" : "Crear paciente"}</BotonEnvio>
        </footer>
      </div>
    </form>
  );
}
