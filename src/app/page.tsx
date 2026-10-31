import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  LineChart,
  Lock,
  LogIn,
  Salad,
  Smartphone,
  Tag,
  Target,
} from "lucide-react";
import { SeccionPlan } from "@/componentes/inicio/seccion-plan";
import { Logo } from "@/componentes/marca/logo";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { RUTAS } from "@/autorizacion/rutas";
import { NOMBRE_PRODUCTO } from "@/configuracion/producto";

const FUNCIONALIDADES = [
  {
    icono: ClipboardList,
    titulo: "Historia clínica en línea de tiempo",
    texto: "Cada consulta con sus notas, mediciones, objetivos y planes, ordenada cronológicamente.",
  },
  {
    icono: CalendarDays,
    titulo: "Agenda sin superposiciones",
    texto: "Vistas por día, semana y mes, estados de turno y horarios de atención.",
  },
  {
    icono: LineChart,
    titulo: "Evolución visual",
    texto: "Gráficos de peso y mediciones construidos solo con registros reales.",
  },
  {
    icono: Target,
    titulo: "Objetivos flexibles",
    texto: "Hábitos, composición corporal o peso: vos decidís qué compartir con cada paciente.",
  },
  {
    icono: Salad,
    titulo: "Planes con publicación controlada",
    texto: "Trabajá borradores tranquilo: el paciente ve solo la versión que publicás.",
  },
  {
    icono: HeartHandshake,
    titulo: "Cada paciente, con lo suyo",
    texto: "Ficha, turnos, mediciones y el plan publicado quedan juntos. El paciente solo ve lo que decidís compartir.",
  },
];

export default function PaginaInicio() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Logo />
          <nav aria-label="Acceso" className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={RUTAS.ingresar}>
                <LogIn aria-hidden="true" />
                Ingresar
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="#plan">
                <Tag aria-hidden="true" />
                El plan
              </Link>
            </Button>
            <Button asChild>
              <Link href={RUTAS.registro}>
                <ArrowRight aria-hidden="true" />
                Crear cuenta
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              Software para nutricionistas
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
              Tu consultorio, tus pacientes y su evolución,{" "}
              <span className="text-primary">en un solo lugar.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {NOMBRE_PRODUCTO} reúne agenda, historias clínicas, mediciones, objetivos y planes alimentarios para que
              dediques menos tiempo a buscar información y más a tus pacientes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={RUTAS.registro}>
                  Crear mi consultorio
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <Link href="#plan">
                  <Tag aria-hidden="true" />
                  Ver precio y qué incluye
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative rounded-3xl border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Seguimiento del paciente</p>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  Vista ilustrativa
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Consultas", "Mediciones", "Objetivos"].map((rotulo) => (
                  <div key={rotulo} className="rounded-2xl bg-muted p-3">
                    <div className="mb-2 h-2 w-8 rounded-full bg-primary/60" />
                    <p className="text-xs text-muted-foreground">{rotulo}</p>
                  </div>
                ))}
              </div>
              <div className="flex h-36 items-end gap-2 rounded-2xl bg-muted p-4" aria-hidden="true">
                {[45, 60, 52, 70, 64, 82, 76].map((altura, indice) => (
                  <div key={indice} className="flex-1 rounded-t-lg bg-primary/70" style={{ height: `${altura}%` }} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ilustración de la interfaz. No representa datos de pacientes reales.
              </p>
            </div>
          </div>
        </section>

        <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-6xl" />}>
          <SeccionPlan />
        </Suspense>

        <section aria-labelledby="titulo-funcionalidades" className="border-t bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 id="titulo-funcionalidades" className="max-w-2xl text-3xl font-bold tracking-tight text-balance">
              Pensado para el trabajo diario de un consultorio de nutrición
            </h2>
            <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FUNCIONALIDADES.map(({ icono: Icono, titulo, texto }) => (
                <li key={titulo} className="space-y-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icono className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-2 sm:py-20">
          <div className="flex gap-4">
            <Lock className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Privacidad desde el diseño</h2>
              <p className="text-sm text-muted-foreground">
                Cada consultorio está aislado a nivel de base de datos. Las notas clínicas son privadas por defecto y
                solo se comparte lo que el profesional decide publicar.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Smartphone className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Portal del paciente</h2>
              <p className="text-sm text-muted-foreground">
                Tus pacientes consultan turnos, objetivos y planes publicados desde el celular, sin descargar archivos.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>{NOMBRE_PRODUCTO}</p>
          <p>Hecho para profesionales de la nutrición.</p>
        </div>
      </footer>
    </div>
  );
}
