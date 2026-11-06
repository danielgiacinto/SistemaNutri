import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Check, CreditCard, ShieldCheck, Sprout } from "lucide-react";
import { RUTAS } from "@/autorizacion/rutas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearPesos, textoDuracionPrueba } from "@/lib/moneda";
import { obtenerOfertaPublica } from "@/servicios/facturacion/mercadopago";

const INCLUIDO = [
  "Pacientes e historias clínicas en un lugar", "Agenda y horarios de atención",
  "Mediciones, evolución y objetivos", "Planes alimentarios con versiones",
  "Portal del paciente y comunidad", "Servicios, cobros y caja del consultorio",
];

export async function SeccionPlan() {
  await connection();
  const cliente = await crearClienteServidor();
  const oferta = await obtenerOfertaPublica(cliente);
  const precio = formatearPesos(oferta?.precioMensual);
  const prueba = oferta?.pruebasHabilitadas && oferta.pruebaCantidad
    ? textoDuracionPrueba(oferta.pruebaCantidad, oferta.pruebaUnidad) : null;

  return (
    <section id="plan" aria-labelledby="titulo-plan" className="inicio-contenedor inicio-plan-rejilla">
      <div className="inicio-plan-texto">
        <p className="inicio-antetitulo">UN PLAN. TODO TU CONSULTORIO.</p>
        <h2 id="titulo-plan">Una inversión en<br />
          <em>tu forma de trabajar.</em>
        </h2>
        <p>Todas las herramientas conectadas, en una sola suscripción. Para que tu energía vaya a tus pacientes.</p>
        <div className="inicio-plan-beneficio">
          <span>
            <Sprout aria-hidden="true" />
          </span>
          <div>
            <strong>Todo incluido, de verdad.</strong>
            <p>Sin módulos aparte ni un precio por cada función.</p>
          </div>
        </div>
        <div className="inicio-plan-beneficio">
          <span>
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <strong>Vos decidís cómo seguir.</strong>
            <p>Gestioná la renovación desde tu cuenta. Si se pausa el acceso, tus registros se conservan.</p>
          </div>
        </div>
      </div>
      <article className="inicio-precio-tarjeta">
        <div className="inicio-precio-encabezado">
          <span className="inicio-antetitulo">PLAN CONSULTORIO</span>
          <span className="inicio-insignia">
            <Sprout aria-hidden="true" /> Todo conectado</span>
        </div>{precio ? <p className="inicio-precio">
          <strong>{precio}</strong>
          <span>ARS / mes</span>
        </p> : <p className="inicio-precio-sin-publicar">El precio mensual todavía no está publicado.</p>}<p className="inicio-precio-descripcion">Un espacio para toda tu práctica profesional.</p>
        <ul className="inicio-precio-incluido">{INCLUIDO.map((item) => <li key={item}>
          <Check aria-hidden="true" />{item}</li>)}</ul>{prueba ? <div className="inicio-precio-prueba">
            <Sprout aria-hidden="true" />
            <p>
              <strong>{prueba} de prueba</strong>
              <span>Empezá sin cargar una tarjeta.</span>
            </p>
          </div> : <p className="inicio-precio-aviso">{oferta ? "La prueba gratuita está pausada para las altas nuevas." : "No pudimos consultar la disponibilidad de prueba. Revisá las condiciones al registrarte."}</p>}<Link className="inicio-boton" href={RUTAS.registro}>Crear mi consultorio <ArrowUpRight aria-hidden="true" />
        </Link>
        <p className="inicio-precio-pago">
          <CreditCard aria-hidden="true" /> Suscripción mensual en pesos con Mercado Pago</p>
        <p className="inicio-precio-condiciones">{prueba ? "Para continuar después de la prueba, autorizá la renovación y confirmá el pago de tu plan. " : "El acceso clínico requiere cobertura vigente. "}Autorizar la suscripción no acredita un mes pago.</p>
      </article>
    </section>
  );
}
