import { CalendarCheck2, ClipboardList, LineChart, ShieldCheck } from "lucide-react";
import { Logo } from "@/componentes/marca/logo";

const BENEFICIOS = [
  { icono: ClipboardList, texto: "Historia clínica ordenada por consulta, sin documentos dispersos." },
  { icono: CalendarCheck2, texto: "Agenda con estados de turno y control de superposiciones." },
  { icono: LineChart, texto: "Evolución de peso y mediciones con gráficos claros." },
  { icono: ShieldCheck, texto: "Cada consultorio aislado: tus pacientes solo los ves vos." },
];

export default function LayoutAutenticacion({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-accent dark:text-accent-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-current/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-current/10 blur-3xl"
        />
        <Logo invertido className="relative" />
        <div className="relative max-w-md space-y-8">
          <p className="text-3xl leading-tight font-bold tracking-tight text-balance">
            Tu consultorio de nutrición, organizado en un solo lugar.
          </p>
          <ul className="space-y-4">
            {BENEFICIOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm opacity-90">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-current/15">
                  <Icono className="size-4" aria-hidden="true" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs opacity-75">
          Los datos de salud se tratan con confidencialidad y acceso restringido.
        </p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Logo className="mb-10 lg:hidden" />
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </main>
    </div>
  );
}
