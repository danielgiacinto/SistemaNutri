import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { requerirUsuario } from "@/autorizacion/sesion";
import { calcularDestino } from "@/autorizacion/contexto";
import { RUTAS } from "@/autorizacion/rutas";
import { MarcoSimple } from "@/componentes/disposicion/marco-simple";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Skeleton } from "@/componentes/ui/skeleton";
import Link from "next/link";
import { Button } from "@/componentes/ui/button";

export const metadata: Metadata = { title: "Cuenta inactiva" };

export default function PaginaCuentaInactiva() {
  return (
    <MarcoSimple>
      <div className="w-full max-w-lg">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <AvisoCuentaInactiva />
        </Suspense>
      </div>
    </MarcoSimple>
  );
}

async function AvisoCuentaInactiva() {
  const contexto = await requerirUsuario();
  const destino = calcularDestino(contexto);
  if (destino !== RUTAS.cuentaInactiva) redirect(destino);

  return (
    <div className="space-y-4">
      <EstadoVacio
      icono={ShieldAlert}
      titulo="Tu consultorio no está activo"
      descripcion={
        <>
          El acceso a <strong>{contexto.consultorio?.nombre}</strong> está suspendido. Tus datos se conservan de forma
          segura. Comunicate con el soporte de la plataforma para regularizar la cuenta.
        </>
      }
      />
      <Button asChild className="w-full"><Link href={RUTAS.facturacion}>Ver facturación y administrar renovación</Link></Button>
    </div>
  );
}
