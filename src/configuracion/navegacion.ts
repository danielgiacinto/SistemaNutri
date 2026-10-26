import {
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  HeartHandshake,
  House,
  LayoutDashboard,
  LineChart,
  Salad,
  ScrollText,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ElementoNavegacion = {
  titulo: string;
  href: string;
  icono: LucideIcon;
  descripcion: string;
  /** Fase del plan de desarrollo en la que se implementa. Sin valor = disponible. */
  fasePendiente?: number;
};

export const NAVEGACION = {
  profesional: [
    { titulo: "Inicio", href: "/panel", icono: LayoutDashboard, descripcion: "Resumen del día y accesos rápidos." },
    {
      titulo: "Agenda",
      href: "/panel/agenda",
      icono: CalendarDays,
      descripcion: "Turnos por día, semana y mes, horarios de atención y bloqueos.",
    },
    {
      titulo: "Pacientes",
      href: "/panel/pacientes",
      icono: Users,
      descripcion: "Listado, búsqueda y fichas completas de tus pacientes.",
    },
    {
      titulo: "Historias clínicas",
      href: "/panel/historias",
      icono: ClipboardList,
      descripcion: "Evoluciones, notas privadas y línea de tiempo de cada paciente.",
    },
    {
      titulo: "Planes",
      href: "/panel/planes",
      icono: Salad,
      descripcion: "Planes alimentarios con versiones y publicación controlada.",
      fasePendiente: 4,
    },
    {
      titulo: "Analíticas",
      href: "/panel/analiticas",
      icono: ChartColumn,
      descripcion: "Indicadores del consultorio calculados con datos reales.",
    },
    {
      titulo: "Comunidad",
      href: "/panel/comunidad",
      icono: HeartHandshake,
      descripcion: "Desafíos y actividades grupales para tus pacientes.",
      fasePendiente: 6,
    },
    {
      titulo: "Configuración",
      href: "/panel/configuracion",
      icono: Settings,
      descripcion: "Perfil, consultorio y apariencia.",
    },
  ],
  admin: [
    { titulo: "Resumen", href: "/admin", icono: LayoutDashboard, descripcion: "Métricas generales de la plataforma." },
    {
      titulo: "Profesionales",
      href: "/admin/profesionales",
      icono: Building2,
      descripcion: "Cuentas profesionales, estado y fecha de alta.",
      fasePendiente: 5,
    },
    {
      titulo: "Suscripciones",
      href: "/admin/suscripciones",
      icono: CreditCard,
      descripcion: "Planes, estados de suscripción y facturación.",
      fasePendiente: 5,
    },
    {
      titulo: "Auditoría",
      href: "/admin/auditoria",
      icono: ScrollText,
      descripcion: "Registro de acciones administrativas relevantes.",
      fasePendiente: 5,
    },
  ],
  paciente: [
    { titulo: "Inicio", href: "/portal", icono: House, descripcion: "Tu resumen." },
    {
      titulo: "Turnos",
      href: "/portal/turnos",
      icono: CalendarDays,
      descripcion: "Próximos turnos y turnos anteriores.",
    },
    {
      titulo: "Mi plan",
      href: "/portal/plan",
      icono: Salad,
      descripcion: "El plan alimentario que tu nutricionista publicó para vos.",
      fasePendiente: 4,
    },
    {
      titulo: "Progreso",
      href: "/portal/progreso",
      icono: LineChart,
      descripcion: "Objetivos y mediciones compartidas por tu nutricionista.",
    },
    {
      titulo: "Comunidad",
      href: "/portal/comunidad",
      icono: Trophy,
      descripcion: "Desafíos y actividades con otros pacientes.",
      fasePendiente: 6,
    },
  ],
} satisfies Record<string, ElementoNavegacion[]>;

export type VarianteNavegacion = keyof typeof NAVEGACION;

/** Secciones aún no implementadas de un área, para generar sus páginas informativas. */
export function seccionesPendientes(variante: VarianteNavegacion): (ElementoNavegacion & { segmento: string })[] {
  const elementos: ElementoNavegacion[] = NAVEGACION[variante];
  return elementos
    .filter((elemento) => elemento.fasePendiente !== undefined)
    .map((elemento) => ({ ...elemento, segmento: elemento.href.split("/").at(-1) ?? "" }));
}

export function buscarSeccionPendiente(variante: VarianteNavegacion, segmento: string) {
  return seccionesPendientes(variante).find((seccion) => seccion.segmento === segmento);
}
