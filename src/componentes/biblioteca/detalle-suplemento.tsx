import { medidaSuplemento, valorNutricional, type DetalleBiblioteca, type NutrientesBiblioteca, type RecursoBiblioteca } from "@/tipos/biblioteca";
import { ComposicionAlimento } from "./composicion-alimento";

function Aporte({ titulo, valores, mostrarMacros = true }: { titulo: string; valores?: NutrientesBiblioteca; mostrarMacros?: boolean }) {
  return <div className="min-w-0 space-y-2 rounded-xl bg-muted/30 p-3"><h4 className="text-xs font-medium text-muted-foreground">{titulo}</h4><p className="font-semibold tabular-nums">{valorNutricional(valores?.energia,"kcal")}</p>{mostrarMacros && <p className="text-xs leading-relaxed text-muted-foreground">P {valorNutricional(valores?.proteinas,"g")} · C {valorNutricional(valores?.carbohidratos,"g")} · G {valorNutricional(valores?.grasas,"g")}</p>}</div>;
}

export function ResumenSuplemento({ recurso }: { recurso: RecursoBiblioteca }) {
  return <span className="block space-y-1"><span className="block text-sm font-medium tabular-nums">{valorNutricional(recurso.contenido.energia,"kcal")} <span className="text-xs font-normal text-muted-foreground">/ medida</span></span><span className="block text-xs text-muted-foreground">{medidaSuplemento(recurso.contenido)} · {recurso.contenido.variantes?.length ?? 0} variantes</span><span className="block text-xs text-muted-foreground">{recurso.contenido.marca || "Sin marca informada"}</span></span>;
}

export function DetalleSuplemento({ datos }: { datos: DetalleBiblioteca }) {
  const r = datos.recurso;
  const fuente = r.fuente_instantanea;
  return <div className="space-y-5">
    <section className="space-y-3 rounded-xl border p-4"><h3 className="text-sm font-semibold">Producto: {r.contenido.marca || "Sin marca informada"}</h3><p className="text-sm">Composición por medida declarada: <strong>{medidaSuplemento(r.contenido)}</strong></p><Aporte titulo="Producto sin agregados" valores={r.calculo_suplemento?.producto} mostrarMacros={false}/><ComposicionAlimento recurso={r}/><p className="text-xs leading-relaxed text-muted-foreground">La medida describe la etiqueta; no es una dosis recomendada. Las variantes no indican frecuencia ni uso terapéutico. La barra compara gramos de macros, no porcentajes de energía.</p></section>
    {fuente && <section className="space-y-2 rounded-xl bg-muted/30 p-4"><h3 className="text-sm font-semibold">Fuente utilizada: {fuente.nombre} · v{fuente.version}</h3><p className="whitespace-pre-wrap wrap-anywhere text-xs text-muted-foreground">{fuente.contenido.referencia} · {fuente.contenido.version}</p><p className="whitespace-pre-wrap wrap-anywhere text-xs text-muted-foreground">Base declarada: {fuente.contenido.base}</p><p className="whitespace-pre-wrap wrap-anywhere text-xs text-muted-foreground">Permiso declarado: {fuente.contenido.licencia}</p></section>}
    <section className="space-y-4"><h3 className="text-sm font-semibold">Variantes de preparación</h3>{r.contenido.variantes?.map((v, indice) => {
      const calculo = r.calculo_suplemento?.variantes[indice];
      const ingredientes = datos.relaciones.filter(f => f.detalle.variante === indice);
      return <section key={indice} className="min-w-0 space-y-3 rounded-xl border p-4"><h4 className="text-sm font-semibold">{v.nombre}</h4><p className="text-xs text-muted-foreground">{v.medidas.toLocaleString("es-AR")} {v.medidas === 1 ? "medida" : "medidas"} del producto · {medidaSuplemento(r.contenido)} por medida</p><div className="grid gap-3 sm:grid-cols-3"><Aporte titulo="Producto" valores={calculo?.producto}/><Aporte titulo="Agregados registrados" valores={calculo?.agregados}/><Aporte titulo="Mezcla completa" valores={calculo?.mezcla}/></div>
        {ingredientes.length ? <ul className="divide-y text-xs">{ingredientes.map((f, i) => <li key={i} className="space-y-1 py-2"><p className="wrap-anywhere font-medium">{f.instantanea.nombre} · v{f.instantanea.version}</p><p className="text-muted-foreground">{f.detalle.cantidad?.toLocaleString("es-AR")} {f.detalle.unidad === "porcion" ? "porción" : f.detalle.unidad} · Conversión: {valorNutricional(f.detalle.gramos_por_unidad,"g por unidad")}</p>{f.instantanea.fuente_instantanea && <p className="wrap-anywhere text-muted-foreground">Fuente: {f.instantanea.fuente_instantanea.nombre} · {f.instantanea.fuente_instantanea.contenido.version}</p>}{f.instantanea.relaciones?.map((insumo,j) => <p key={j} className="wrap-anywhere text-muted-foreground">{insumo.instantanea.nombre} · v{insumo.instantanea.version} · Fuente: {insumo.instantanea.fuente_instantanea?.nombre ?? "Sin dato"}</p>)}</li>)}</ul> : <p className="text-xs text-muted-foreground">Sin agregados nutricionales registrados. La mezcla usa solo el producto; el texto de preparación no suma nutrientes.</p>}
        {v.preparacion && <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-muted-foreground">{v.preparacion}</p>}
      </section>;
    })}<p className="text-xs leading-relaxed text-muted-foreground">Los aportes se calculan con las versiones guardadas. Si falta un nutriente o una conversión, el resultado correspondiente es Sin dato. Revisá los ingredientes y cantidades de cada variante antes de utilizarla.</p></section>
  </div>;
}
