import Link from "next/link";
import { connection } from "next/server";
import { Check } from "lucide-react";
import { RUTAS } from "@/autorizacion/rutas";
import { Button } from "@/componentes/ui/button";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearPesos, textoDuracionPrueba } from "@/lib/moneda";
import { obtenerOfertaPublica } from "@/servicios/facturacion/mercadopago";

const INCLUIDO = [
  "Pacientes, historia clínica y línea de tiempo",
  "Agenda de turnos, sin superposiciones",
  "Mediciones, objetivos y evolución",
  "Planes alimentarios: el paciente ve solo lo que publicás",
  "Portal del paciente en el celular, sin instalar nada",
  "Los datos de cada consultorio quedan aislados",
];

export async function SeccionPlan() {
  await connection();
  const cliente = await crearClienteServidor();
  const oferta = await obtenerOfertaPublica(cliente);
  const precio = formatearPesos(oferta?.precioMensual);
  const prueba =
    oferta?.pruebasHabilitadas && oferta.pruebaCantidad
      ? textoDuracionPrueba(oferta.pruebaCantidad, oferta.pruebaUnidad)
      : null;

  return (
    <section id="plan" aria-labelledby="titulo-plan" className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          <h2 id="titulo-plan" className="text-3xl font-bold tracking-tight text-balance">
            Un plan para todo el consultorio
          </h2>
          <p className="text-muted-foreground">
            No hay módulos aparte ni un precio por función. El mismo plan incluye la agenda, la historia clínica, el
            seguimiento y el portal de tus pacientes.
          </p>
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-semibold">1. Creás el consultorio.</span>{" "}
              {prueba ? `Empezás con ${prueba} de prueba, sin cargar una tarjeta.` : "La prueba gratuita está pausada para las altas nuevas."}
            </li>
            <li>
              <span className="font-semibold">2. Autorizás el cobro mensual</span> antes de que termine la prueba, con
              Mercado Pago. Autorizar no significa que el mes ya esté pago.
            </li>
            <li>
              <span className="font-semibold">3. Si no hay un cobro confirmado</span> al terminar la prueba, se pausa el
              acceso clínico. Los pacientes, turnos e historias se conservan.
            </li>
          </ol>
        </div>

        <article className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary">Plan consultorio</p>
          {precio ? (
            <p className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight">{precio}</span>
              <span className="pb-1 text-muted-foreground">por mes</span>
            </p>
          ) : (
            <p className="mt-3 text-lg font-semibold">El precio mensual todavía no está publicado.</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {prueba
              ? `${prueba.charAt(0).toUpperCase()}${prueba.slice(1)} de prueba. Después, el cobro es mensual y en pesos.`
              : "Precio en pesos argentinos, por mes."}
          </p>
          <ul className="mt-6 space-y-3">
            {INCLUIDO.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 h-11 w-full px-5 sm:w-auto">
            <Link href={RUTAS.registro}>Crear mi consultorio</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            El pago recurrente lo procesa Mercado Pago. Este precio es el que configuró la administración y es el mismo
            que ve el profesional en Facturación.
          </p>
        </article>
      </div>
    </section>
  );
}
