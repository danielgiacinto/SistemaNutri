import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDown, ArrowUpRight, CalendarDays, Check, CheckCheck, ClipboardList,
  Heart, HeartHandshake, Leaf, LockKeyhole, MessageCircle, Plus, Salad,
  ShieldCheck, Smartphone, Sparkles, Sprout, Target, TrendingUp, Users, Wallet,
} from "lucide-react";
import { RUTAS } from "@/autorizacion/rutas";
import { EscenaPalta } from "@/componentes/inicio/escena-palta";
import { MovimientoInicio } from "@/componentes/inicio/movimiento-inicio";
import { NavegacionInicio } from "@/componentes/inicio/navegacion-inicio";
import { SeccionPlan } from "@/componentes/inicio/seccion-plan";
import { VistaConsultorio } from "@/componentes/inicio/vista-consultorio";
import { Logo } from "@/componentes/marca/logo";
import { Palta } from "@/componentes/marca/palta";
import { NOMBRE_PRODUCTO } from "@/configuracion/producto";

const DESCRIPCION = "Menos gestión. Más nutrición. Organizá pacientes, agenda, historias clínicas, planes alimentarios y cobros, y acompañá cada avance con el portal del paciente de Nutrisfera.";

export const metadata: Metadata = {
  title: { absolute: `${NOMBRE_PRODUCTO} · Menos gestión. Más nutrición.` },
  description: DESCRIPCION,
  alternates: { canonical: "https://nutrisfera.vercel.app/" },
  openGraph: {
    type: "website", locale: "es_AR", url: "https://nutrisfera.vercel.app/",
    siteName: NOMBRE_PRODUCTO, title: `${NOMBRE_PRODUCTO} · Tu consultorio, en sintonía`, description: DESCRIPCION,
  },
  twitter: { card: "summary", title: `${NOMBRE_PRODUCTO} · Menos gestión. Más nutrición.`, description: DESCRIPCION },
};

const HERRAMIENTAS = [
  { icono: Users, texto: "Pacientes" }, { icono: CalendarDays, texto: "Agenda" },
  { icono: ClipboardList, texto: "Historia clínica" }, { icono: Salad, texto: "Planes" },
  { icono: Wallet, texto: "Finanzas" }, { icono: HeartHandshake, texto: "Comunidad" },
];

const PASOS = [
  { numero: "01", icono: Sprout, titulo: "Dale un lugar a tu consultorio", texto: "Creá tu cuenta y configurá tus horarios, servicios y precios. Tu espacio, a tu manera." },
  { numero: "02", icono: Users, titulo: "Conectá todas las piezas", texto: "Sumá pacientes, organizá tus turnos y empezá a registrar consultas, mediciones y planes." },
  { numero: "03", icono: Heart, titulo: "Acompañá cada avance", texto: "Invitá a tus pacientes al portal y compartí lo que necesitan para seguir adelante." },
];

const PREGUNTAS = [
  { pregunta: "¿Para quién está pensado Nutrisfera?", respuesta: "Para profesionales de la nutrición que quieren organizar su consultorio y acompañar a sus pacientes desde un mismo lugar. Reúne el trabajo clínico, la agenda y las finanzas, con un portal para que cada paciente consulte lo que compartís." },
  { pregunta: "¿Qué pueden ver mis pacientes?", respuesta: "Acceden por invitación a su propio portal: próximos turnos, planes publicados, objetivos y mediciones que decidas compartir. También pueden participar en los desafíos de tu comunidad. Tus notas clínicas y los borradores de planes se mantienen privados." },
  { pregunta: "¿Necesito instalar alguna aplicación?", respuesta: "No. Nutrisfera funciona desde el navegador en computadora, tablet y celular. Tus pacientes también pueden entrar al portal desde el navegador de su teléfono, sin descargar una aplicación." },
  { pregunta: "¿Puedo registrar los cobros de mis consultas?", respuesta: "Sí. Podés configurar servicios y precios, registrar pagos totales, parciales o anticipados, aplicar descuentos y consultar deudas, movimientos de caja y estadísticas de ingresos. Los cobros a pacientes se registran en el sistema; son independientes de tu suscripción a Nutrisfera." },
  { pregunta: "¿Cómo se protege la información del consultorio?", respuesta: "Cada consultorio tiene su información separada y el acceso se verifica según el rol de cada cuenta. Las notas clínicas son privadas y vos controlás qué objetivos, mediciones y versiones de los planes llegan al portal del paciente." },
  { pregunta: "¿Cómo funciona la suscripción?", respuesta: "El plan mensual incluye todas las herramientas que se muestran en esta página. El precio vigente y la disponibilidad de prueba están en la sección El plan. La renovación se gestiona con Mercado Pago y podés solicitar su cancelación desde Plan y facturación. Si vence la cobertura, se pausa el acceso clínico y se conservan los registros." },
];

export default function PaginaInicio() {
  return (
    <MovimientoInicio>
      <a className="inicio-saltar" href="#contenido">Ir al contenido</a>
      <header className="inicio-cabecera">
        <div className="inicio-contenedor inicio-barra">
          <Logo href="#contenido" className="inicio-logo" />
          <NavegacionInicio />
        </div>
      </header>
      <main id="contenido">
        <section className="inicio-hero" aria-labelledby="titulo-inicio">
          <div className="inicio-contenedor inicio-hero-rejilla">
            <div className="inicio-hero-texto">
              <p className="inicio-antetitulo">
                <span className="inicio-punto" /> TU CONSULTORIO, EN SINTONÍA</p>
              <h1 id="titulo-inicio">Menos gestión.<br />Más <em>nutrición.</em>
              </h1>
              <p className="inicio-bajada">Tu agenda, tus pacientes y cada avance, conectados. Un espacio para ordenar tu día y dedicarle más tiempo a lo que te mueve: <strong>acompañar.</strong>
              </p>
              <div className="inicio-acciones">
                <Link className="inicio-boton" href={RUTAS.registro}>Crear mi consultorio <ArrowUpRight aria-hidden="true" />
                </Link>
                <a className="inicio-enlace" href="#funcionalidades">Explorar Nutrisfera <ArrowDown aria-hidden="true" />
                </a>
              </div>
              <div className="inicio-hero-notas">
                <span>
                  <Check aria-hidden="true" /> Todo tu consultorio, conectado</span>
                <span>
                  <Smartphone aria-hidden="true" /> Sin instalar nada</span>
              </div>
            </div>
            <VistaConsultorio />
          </div>
          <div className="inicio-contenedor inicio-herramientas">
            <p>Una sola plataforma.<br />
              <strong>Todo cobra sentido.</strong>
            </p>
            <ul>{HERRAMIENTAS.map(({ icono: Icono, texto }) => <li key={texto}>
              <Icono aria-hidden="true" />
              <span>{texto}</span>
            </li>)}</ul>
          </div>
        </section>

        <EscenaPalta />

        <section id="funcionalidades" className="inicio-seccion inicio-contenedor" aria-labelledby="titulo-funcionalidades">
          <div className="inicio-encabezado-seccion" data-revelar>
            <div>
              <p className="inicio-antetitulo">MENOS PESTAÑAS ABIERTAS. MÁS CLARIDAD.</p>
              <h2 id="titulo-funcionalidades">Cada parte de tu trabajo.<br />
                <em>En el mismo lugar.</em>
              </h2>
            </div>
            <p>De la primera consulta al próximo gran avance. Todo lo que necesitás para una práctica más organizada y un acompañamiento más cercano.</p>
          </div>
          <div className="inicio-bento">
            <article className="inicio-tarjeta inicio-tarjeta-historia" data-revelar>
              <span className="inicio-icono">
                <ClipboardList aria-hidden="true" />
              </span>
              <h3>La historia completa.<br />No solo la última consulta.</h3>
              <p>Notas, mediciones y objetivos en una línea de tiempo. Retomá cada encuentro con todo el contexto.</p>
              <div className="inicio-linea-tiempo" aria-label="Ejemplo ilustrativo de una historia clínica">
                <div>
                  <span className="inicio-marca-tiempo">
                    <CheckCheck aria-hidden="true" />
                  </span>
                  <div>
                    <span className="inicio-mini-etiqueta">HOY · CONSULTA DE CONTROL</span>
                    <strong>Pequeños cambios, grandes avances</strong>
                    <p>Revisión de hábitos y objetivos del próximo mes.</p>
                    <div className="inicio-mini-chips">
                      <span>
                        <Target aria-hidden="true" /> Objetivos</span>
                      <span>
                        <TrendingUp aria-hidden="true" /> Mediciones</span>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="inicio-marca-tiempo inicio-marca-tenue">
                    <ClipboardList aria-hidden="true" />
                  </span>
                  <div>
                    <span className="inicio-mini-etiqueta">PRIMER ENCUENTRO</span>
                    <strong>El comienzo de una nueva historia</strong>
                    <p>Evaluación inicial y plan de acompañamiento.</p>
                  </div>
                </div>
              </div>
              <span className="inicio-nota-ejemplo">Contenido ilustrativo</span>
            </article>
            <article className="inicio-tarjeta inicio-tarjeta-agenda" data-revelar>
              <span className="inicio-icono">
                <CalendarDays aria-hidden="true" />
              </span>
              <h3>Un día organizado.<br />Una cabeza más libre.</h3>
              <p>Agenda por día, semana o mes. Tus horarios de atención y cada turno, sin superposiciones.</p>
              <div className="inicio-mini-semana" aria-hidden="true">{["L", "M", "M", "J", "V"].map((dia, indice) => <div key={indice} className={indice === 2 ? "inicio-dia-activo" : ""}>
                <span>{dia}</span>
                <strong>{16 + indice}</strong>{indice === 2 && <i />}</div>)}</div>
              <div className="inicio-mini-turno">
                <span>10:30</span>
                <span>
                  <strong>Consulta de control</strong>
                  <small>45 min · Consultorio</small>
                </span>
                <Check aria-hidden="true" />
              </div>
            </article>
            <article className="inicio-tarjeta inicio-tarjeta-plan" data-revelar>
              <span className="inicio-icono">
                <Salad aria-hidden="true" />
              </span>
              <h3>Tu criterio, en cada plan.</h3>
              <p>Prepará planes alimentarios, ajustá sus versiones y publicalos cuando estén listos. Tu paciente recibe solo lo que vos elegís.</p>
              <div className="inicio-plan-visual">
                <span className="inicio-plan-hoja">
                  <Leaf aria-hidden="true" />
                </span>
                <div>
                  <strong>Plan alimentario</strong>
                  <span>Una nueva versión para seguir avanzando</span>
                </div>
                <span className="inicio-insignia">
                  <Check aria-hidden="true" /> Publicado</span>
              </div>
            </article>
            <article className="inicio-tarjeta inicio-tarjeta-finanzas" data-revelar>
              <span className="inicio-icono">
                <Wallet aria-hidden="true" />
              </span>
              <h3>Los números, más claros.</h3>
              <p>Servicios, precios, cobros y deudas. Registrá pagos parciales o anticipados y conocé los ingresos de tu consultorio.</p>
              <div className="inicio-finanzas-visual" aria-hidden="true">
                <span>Una vista más clara de tu caja</span>
                <div>{[35, 52, 43, 68, 58, 82, 94].map((altura, indice) => <i key={indice} style={{ height: `${altura}%` }} />)}</div>
                <TrendingUp />
              </div>
            </article>
          </div>
        </section>

        <section id="pacientes" className="inicio-portal-seccion" aria-labelledby="titulo-portal">
          <div className="inicio-contenedor inicio-portal-rejilla">
            <div className="inicio-portal-texto" data-revelar>
              <p className="inicio-antetitulo">
                <HeartHandshake aria-hidden="true" /> CERCA, TAMBIÉN ENTRE CONSULTAS</p>
              <h2 id="titulo-portal">El acompañamiento<br />no termina<br />
                <em>en el consultorio.</em>
              </h2>
              <p>Un portal propio para que cada paciente tenga su plan a mano, vea sus próximos turnos y siga sus objetivos. Desde el celular, sin vueltas.</p>
              <ul className="inicio-lista-portal">
                <li>
                  <Check aria-hidden="true" /> Planes publicados, siempre a mano</li>
                <li>
                  <Check aria-hidden="true" /> Mediciones y objetivos que decidís compartir</li>
                <li>
                  <Check aria-hidden="true" /> Sus próximos encuentros, en un lugar</li>
              </ul>
              <div className="inicio-comunidad">
                <span>
                  <MessageCircle aria-hidden="true" />
                </span>
                <div>
                  <h3>Los hábitos también crecen en comunidad.</h3>
                  <p>Creá desafíos y un espacio donde tus pacientes puedan sumarse, compartir experiencias y acompañarse.</p>
                </div>
              </div>
            </div>
            <div className="inicio-portal-visual" data-revelar>
              <span className="inicio-orbita inicio-orbita-uno" aria-hidden="true" />
              <span className="inicio-orbita inicio-orbita-dos" aria-hidden="true" />
              <div className="inicio-telefono" role="img" aria-label="Vista ilustrativa del portal de una paciente ficticia: plan publicado, próximo turno y objetivos compartidos">
                <div className="inicio-telefono-hora">
                  <span>9:41</span>
                  <span>••• ▰</span>
                </div>
                <div className="inicio-telefono-marca">
                  <Palta className="size-7" />
                  <strong>{NOMBRE_PRODUCTO}</strong>
                  <span className="inicio-avatar">JL</span>
                </div>
                <div className="inicio-telefono-saludo">
                  <span>TU ESPACIO PARA SEGUIR CRECIENDO</span>
                  <strong>Hola, Julieta <Sprout aria-hidden="true" />
                  </strong>
                  <p>Cada pequeño paso cuenta.</p>
                </div>
                <div className="inicio-telefono-plan">
                  <span className="inicio-icono">
                    <Salad aria-hidden="true" />
                  </span>
                  <span className="inicio-insignia">Publicado</span>
                  <strong>Tu plan alimentario</strong>
                  <p>Pensado para vos y tu día a día.</p>
                  <span className="inicio-telefono-enlace">Ver mi plan <ArrowUpRight aria-hidden="true" />
                  </span>
                </div>
                <div className="inicio-telefono-turno">
                  <CalendarDays aria-hidden="true" />
                  <div>
                    <small>TU PRÓXIMO ENCUENTRO</small>
                    <strong>Miércoles 18 · 10:30</strong>
                    <span>Consulta de control</span>
                  </div>
                </div>
                <div className="inicio-telefono-objetivos">
                  <strong>Un hábito a la vez <Target aria-hidden="true" />
                  </strong>
                  <span>
                    <Check aria-hidden="true" /> Sumar variedad a las comidas</span>
                  <span>
                    <Check aria-hidden="true" /> Encontrar tiempo para moverte</span>
                </div>
                <div className="inicio-telefono-pie">
                  <span>
                    <Heart aria-hidden="true" /> Mi espacio</span>
                  <span>
                    <Salad aria-hidden="true" /> Mi plan</span>
                  <span>
                    <Users aria-hidden="true" /> Comunidad</span>
                </div>
              </div>
              <div className="inicio-tarjeta-flotante inicio-flotante-portal">
                <span>
                  <Heart aria-hidden="true" />
                </span>
                <div>
                  <strong>Más conexión.</strong>
                  <small>Un proceso compartido.</small>
                </div>
              </div>
              <p className="inicio-portal-aclaracion">Vista ilustrativa · Datos ficticios</p>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="inicio-seccion inicio-contenedor" aria-labelledby="titulo-pasos">
          <div className="inicio-centrado" data-revelar>
            <p className="inicio-antetitulo">HACÉ ESPACIO PARA LO QUE IMPORTA</p>
            <h2 id="titulo-pasos">Un nuevo orden.<br />
              <em>Un comienzo simple.</em>
            </h2>
          </div>
          <ol className="inicio-pasos">{PASOS.map(({ numero, icono: Icono, titulo, texto }) => <li key={numero} data-revelar>
            <div className="inicio-paso-superior">
              <span>{numero}</span>
              <Icono aria-hidden="true" />
            </div>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>)}</ol>
          <div id="privacidad" className="inicio-privacidad" data-revelar>
            <span className="inicio-privacidad-icono">
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <h3>Tu consultorio es tuyo. La información, también.</h3>
              <p>Datos separados por consultorio, notas clínicas privadas y control sobre lo que compartís. La confianza se cuida desde el primer encuentro.</p>
            </div>
            <LockKeyhole className="inicio-privacidad-candado" aria-hidden="true" />
          </div>
        </section>

        <div className="inicio-precio-fondo" data-revelar>
          <Suspense fallback={<section id="plan" className="inicio-contenedor inicio-plan-cargando" aria-label="Cargando el plan">
            <span className="inicio-antetitulo">UN PLAN. TODO TU CONSULTORIO.</span>
            <h2>Una inversión en<br />
              <em>tu forma de trabajar.</em>
            </h2>
            <p role="status">Consultando precio y prueba disponibles…</p>
          </section>}>
            <SeccionPlan />
          </Suspense>
        </div>

        <section id="preguntas" className="inicio-seccion inicio-contenedor inicio-preguntas" aria-labelledby="titulo-preguntas">
          <div data-revelar>
            <p className="inicio-antetitulo">CON TODO MÁS CLARO</p>
            <h2 id="titulo-preguntas">Buenas preguntas.<br />
              <em>Respuestas simples.</em>
            </h2>
            <p className="inicio-texto-secundario">Conocé un poco más antes de dar el primer paso.</p>
            <span className="inicio-preguntas-adorno" aria-hidden="true">
              <MessageCircle />
              <Plus />
            </span>
          </div>
          <div className="inicio-acordeon" data-revelar>{PREGUNTAS.map(({ pregunta, respuesta }) => <details key={pregunta} name="preguntas-nutrisfera">
            <summary>{pregunta}<Plus aria-hidden="true" />
            </summary>
            <p>{respuesta}</p>
          </details>)}</div>
        </section>

        <section className="inicio-cta-seccion inicio-contenedor" aria-labelledby="titulo-cta">
          <div className="inicio-cta" data-revelar>
            <span className="inicio-cta-sello" aria-hidden="true">
              <Sprout />
            </span>
            <p className="inicio-antetitulo">EL PRÓXIMO PASO ES TUYO</p>
            <h2 id="titulo-cta">Tu vocación, en el centro.<br />
              <em>El resto, en Nutrisfera.</em>
            </h2>
            <p>Hacé lugar para una forma más simple de gestionar<br className="inicio-salto-escritorio" /> y una forma más cercana de acompañar.</p>
            <Link className="inicio-boton" href={RUTAS.registro}>Crear mi consultorio <ArrowUpRight aria-hidden="true" />
            </Link>
            <span className="inicio-cta-detalle">
              <Sparkles aria-hidden="true" /> Pensado para profesionales de la nutrición</span>
          </div>
        </section>
      </main>
      <footer className="inicio-footer">
        <div className="inicio-contenedor">
          <div className="inicio-footer-superior">
            <div>
              <Logo href="#contenido" className="inicio-logo" />
              <p>Tu consultorio, en sintonía.<br />Más espacio para acompañar.</p>
            </div>
            <nav aria-label="Producto">
              <strong>Descubrí Nutrisfera</strong>
              <a href="#funcionalidades">El producto</a>
              <a href="#pacientes">Portal del paciente</a>
              <a href="#como-funciona">Cómo funciona</a>
            </nav>
            <nav aria-label="Información">
              <strong>Todo más claro</strong>
              <a href="#plan">El plan</a>
              <a href="#preguntas">Preguntas frecuentes</a>
              <a href="#privacidad">Privacidad de tus datos</a>
            </nav>
            <div className="inicio-footer-acceso">
              <strong>Tu próximo paso</strong>
              <Link href={RUTAS.registro}>Crear mi consultorio <ArrowUpRight aria-hidden="true" />
              </Link>
              <Link href={RUTAS.ingresar}>Ya tengo una cuenta <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="inicio-footer-inferior">
            <p>{NOMBRE_PRODUCTO} · Hecho para acompañar.</p>
            <span>
              <span className="inicio-punto" /> Nutrición con un lado más humano.</span>
            <a href="#contenido">Volver arriba <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </MovimientoInicio>
  );
}
