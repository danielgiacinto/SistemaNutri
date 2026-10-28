"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { guardarConfiguracionComercial } from "@/acciones/facturacion";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { formatearPesos, textoDuracionPrueba } from "@/lib/moneda";
import type { ConfiguracionComercial } from "@/servicios/facturacion/mercadopago";

export function FormularioConfiguracionComercial({ inicial }: { inicial: ConfiguracionComercial }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const precio = formatearPesos(inicial.precioMensual);
  const prueba = textoDuracionPrueba(inicial.pruebaCantidad, inicial.pruebaUnidad);

  const enviar = (formulario: FormData) => {
    iniciar(async () => {
      const resultado = await guardarConfiguracionComercial(formulario);
      if (!resultado.ok) {
        setConfirmacion(null);
        toast.error(resultado.mensaje);
        return;
      }
      const mensaje = resultado.mensaje ?? "Configuración guardada.";
      setConfirmacion(mensaje);
      toast.success(mensaje);
      router.refresh();
    });
  };

  return (
    <form
      key={`${inicial.precioMensual ?? "sin-precio"}-${inicial.pruebaCantidad}-${inicial.pruebaUnidad}-${inicial.diasGracia}-${inicial.pruebasHabilitadas}`}
      action={enviar}
      className="space-y-4"
    >
      <p role="status" className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
        {confirmacion
          ? confirmacion
          : precio
            ? `Precio vigente del plan: ${precio} por mes. Las altas nuevas reciben ${prueba} de prueba.`
            : "Todavía no hay un precio mensual publicado. Hasta definirlo, nadie puede autorizar la suscripción."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prueba-cantidad">Duración de la prueba</Label>
          <Input id="prueba-cantidad" name="pruebaCantidad" type="number" min={1} max={36} required defaultValue={inicial.pruebaCantidad} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prueba-unidad">Unidad</Label>
          <select
            id="prueba-unidad"
            name="pruebaUnidad"
            defaultValue={inicial.pruebaUnidad}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="meses">Meses calendario</option>
            <option value="dias">Días</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio-mensual">Precio mensual ARS</Label>
          <Input
            id="precio-mensual"
            name="precioMensual"
            type="number"
            min={1}
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={inicial.precioMensual ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dias-gracia">Días de gracia</Label>
          <Input id="dias-gracia" name="diasGracia" type="number" min={0} max={30} required defaultValue={inicial.diasGracia} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pruebas-habilitadas">Pruebas nuevas</Label>
          <select
            id="pruebas-habilitadas"
            name="pruebasHabilitadas"
            defaultValue={inicial.pruebasHabilitadas ? "si" : "no"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="si">Habilitadas</option>
            <option value="no">Deshabilitadas</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
