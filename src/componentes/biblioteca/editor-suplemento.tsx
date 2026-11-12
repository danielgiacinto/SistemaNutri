"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { guardarRecursoBiblioteca } from "@/acciones/biblioteca";
import { CATEGORIAS_SUPLEMENTOS, UNIDADES_MEDIDA, type RecursoBiblioteca, type RelacionBiblioteca } from "@/tipos/biblioteca";
import { Button } from "@/componentes/ui/button";
import { SelectorRecurso } from "./selector-recurso";
import type { PropiedadesEditorRecurso } from "./editor-recurso";

const estilo = "w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5"><span className="text-xs font-medium">{titulo}</span>{children}</label>;
}
type VarianteEditor = { clave: string; nombre: string; medidas: number; preparacion: string };
type IngredienteEditor = RelacionBiblioteca & { clave: string; variante: string };

export function EditorSuplemento({ inicial, alGuardar, alCancelar, alCambiar, alPendiente }: PropiedadesEditorRecurso) {
  const recurso = inicial?.recurso;
  const contenido = recurso?.contenido;
  const [fuente, fijarFuente] = useState(recurso?.fuente_instantanea ?? null);
  const [variantes, fijarVariantes] = useState<VarianteEditor[]>(() => (contenido?.variantes ?? [{ nombre: "Producto solo", medidas: 1, preparacion: "" }]).map((v, i) => ({ ...v, clave: `variante-${i}` })));
  const [ingredientes, fijarIngredientes] = useState<IngredienteEditor[]>(() => (inicial?.relaciones ?? []).map((f, i) => ({ ...f, clave: `ingrediente-${i}`, variante: `variante-${f.detalle.variante}` })));
  const [error, fijarError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function agregarIngrediente(variante: string, elegido: RecursoBiblioteca) {
    fijarIngredientes(filas => [...filas, { clave: crypto.randomUUID(), variante, referencia_id: elegido.id, instantanea: elegido, detalle: { cantidad: 100, unidad: "g", gramos_por_unidad: 1, rendimiento: 1 } }]);
    alCambiar();
  }
  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const texto = (clave: string) => String(formulario.get(clave) ?? "");
    const numero = (clave: string) => texto(clave).trim() === "" ? null : Number(texto(clave).replace(",", "."));
    const datos = {
      ...(recurso ? { id: recurso.id, version: recurso.version } : {}), tipo: "suplemento", nombre: texto("nombre"), categoria: texto("categoria"),
      etiquetas: texto("etiquetas").split(",").map(t => t.trim()).filter(Boolean), fuente_id: fuente?.id, fuente_version: fuente?.version,
      contenido: { marca: texto("marca"), medida_cantidad: numero("medida_cantidad"), medida_unidad: texto("medida_unidad"), energia: numero("energia"), proteinas: numero("proteinas"), carbohidratos: numero("carbohidratos"), grasas: numero("grasas"), notas: texto("notas"),
        variantes: variantes.map(v => ({ nombre: texto(`nombre-${v.clave}`), medidas: numero(`medidas-${v.clave}`), preparacion: texto(`preparacion-${v.clave}`) })) },
      relaciones: ingredientes.map(f => ({ referencia_id: f.referencia_id, referencia_version: f.instantanea.version, detalle: {
        variante: variantes.findIndex(v => v.clave === f.variante), cantidad: numero(`cantidad-${f.clave}`), unidad: f.detalle.unidad,
        gramos_por_unidad: f.detalle.unidad === "g" ? 1 : numero(`gramos-${f.clave}`), rendimiento: 1,
      } })),
    };
    fijarError(""); alPendiente(true);
    iniciar(async () => {
      try {
        const resultado = await guardarRecursoBiblioteca(datos);
        if (resultado.ok && resultado.datos) alGuardar(resultado.datos.id); else fijarError(resultado.mensaje ?? "No se pudo guardar el suplemento.");
      } catch { fijarError("No pudimos guardar. Los cambios siguen en el formulario para reintentar."); }
      finally { alPendiente(false); }
    });
  }

  return <form onSubmit={guardar} onChange={alCambiar} className="space-y-5"><fieldset disabled={pendiente} className="min-w-0 space-y-5">
    <p className="rounded-xl bg-accent/40 p-3 text-xs leading-relaxed text-muted-foreground">Registrá la composición según la etiqueta o fuente consultada. La medida describe el producto; no es una dosis recomendada. Evitá datos de pacientes.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo titulo="Nombre"><input name="nombre" required maxLength={150} defaultValue={recurso?.nombre} className={estilo}/></Campo>
      <Campo titulo="Categoría"><select name="categoria" defaultValue={recurso?.categoria ?? "Otro"} className={estilo}>{CATEGORIAS_SUPLEMENTOS.map(c => <option key={c}>{c}</option>)}</select></Campo>
      <Campo titulo="Marca (opcional)"><input name="marca" maxLength={100} defaultValue={contenido?.marca} className={estilo}/></Campo>
      <Campo titulo="Etiquetas separadas por comas (hasta 12)"><input name="etiquetas" maxLength={360} defaultValue={recurso?.etiquetas.join(", ")} className={estilo}/></Campo>
    </div>
    <div><p className="mb-2 text-sm font-medium">Fuente: {fuente ? `${fuente.nombre} · v${fuente.version}` : "Sin elegir"}</p><SelectorRecurso tipo="fuente" alElegir={elegido => { fijarFuente(elegido); alCambiar(); }}/><p className="mt-2 text-xs text-muted-foreground">La fuente conserva la referencia a la etiqueta o al fabricante, su versión y el permiso de uso.</p></div>
    <section className="space-y-4 rounded-xl border p-4"><h3 className="text-sm font-semibold">Medida y composición del producto</h3>
      <div className="grid grid-cols-2 gap-3"><Campo titulo="Cantidad de la medida declarada"><input name="medida_cantidad" type="number" min="0.001" max={1000000} step="any" required defaultValue={contenido?.medida_cantidad ?? 1} className={estilo}/></Campo><Campo titulo="Unidad de la medida"><select name="medida_unidad" defaultValue={contenido?.medida_unidad ?? "g"} className={estilo}>{UNIDADES_MEDIDA.map(unidad => <option key={unidad} value={unidad}>{unidad === "capsula" ? "cápsula" : unidad}</option>)}</select></Campo></div>
      <p className="text-xs text-muted-foreground">Informá los nutrientes correspondientes exactamente a esa medida, sin incluir leche, yogur u otros agregados. Vacío significa Sin dato; cero es un valor informado.</p>
      <div className="grid grid-cols-2 gap-3">{([["energia","Energía (kcal)"],["proteinas","Proteínas (g)"],["carbohidratos","Carbohidratos (g)"],["grasas","Grasas (g)"]] as const).map(([clave,titulo]) => <Campo key={clave} titulo={titulo}><input name={clave} type="number" min={0} max={1000000} step="any" defaultValue={contenido?.[clave] ?? ""} className={estilo}/></Campo>)}</div>
    </section>
    <section className="space-y-4"><h3 className="text-sm font-semibold">Variantes de preparación</h3><p className="text-xs leading-relaxed text-muted-foreground">Cada variante combina una cantidad de medidas del producto con los ingredientes que registres. El texto de preparación no suma nutrientes automáticamente. Para leche o yogur, agregá el alimento y su cantidad; ml necesita conversión explícita a gramos.</p>
      {variantes.map((v, indice) => <section key={v.clave} className="min-w-0 space-y-4 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-medium">Variante {indice+1}</h4><Button type="button" size="sm" variant="ghost" disabled={variantes.length === 1} aria-label={`Quitar variante ${indice+1}`} onClick={() => { fijarVariantes(filas => filas.filter(f => f.clave !== v.clave)); fijarIngredientes(filas => filas.filter(f => f.variante !== v.clave)); alCambiar(); }}>Quitar variante</Button></div>
        <div className="grid gap-3 sm:grid-cols-2"><Campo titulo={`Nombre de la variante ${indice+1}`}><input name={`nombre-${v.clave}`} required maxLength={100} defaultValue={v.nombre} className={estilo}/></Campo><Campo titulo={`Cantidad de medidas en la variante ${indice+1}`}><input name={`medidas-${v.clave}`} type="number" min="0.001" max={1000} step="any" required defaultValue={v.medidas} className={estilo}/></Campo></div>
        <Campo titulo={`Preparación de la variante ${indice+1}`}><textarea name={`preparacion-${v.clave}`} maxLength={2000} defaultValue={v.preparacion} className={estilo}/></Campo>
        {ingredientes.length < 100 && <><SelectorRecurso tipo="alimento" alElegir={r => agregarIngrediente(v.clave,r)}/><SelectorRecurso tipo="preparacion" alElegir={r => agregarIngrediente(v.clave,r)}/></>}
        <ul className="space-y-3">{ingredientes.filter(f => f.variante === v.clave).map(f => <li key={f.clave} className="space-y-3 rounded-xl bg-muted/30 p-3"><div className="flex items-start justify-between gap-2"><p className="min-w-0 wrap-anywhere text-sm font-medium">{f.instantanea.nombre} · v{f.instantanea.version}</p><Button type="button" size="sm" variant="ghost" aria-label={`Quitar ${f.instantanea.nombre} de variante ${indice+1}`} onClick={() => { fijarIngredientes(filas => filas.filter(a => a.clave !== f.clave)); alCambiar(); }}>Quitar</Button></div>
          <div className="grid grid-cols-2 gap-3"><Campo titulo="Cantidad del ingrediente"><input name={`cantidad-${f.clave}`} type="number" min="0.001" max={1000000} step="any" required defaultValue={f.detalle.cantidad} className={estilo}/></Campo><Campo titulo="Unidad del ingrediente"><select value={f.detalle.unidad} onChange={e => { const unidad = e.target.value; fijarIngredientes(filas => filas.map(a => a.clave === f.clave ? { ...a, detalle: { ...a.detalle, unidad, gramos_por_unidad: unidad === "g" ? 1 : null } } : a)); }} className={estilo}><option value="g">g</option><option value="ml">ml</option><option value="unidad">unidad</option><option value="porcion">porción</option></select></Campo><div className="col-span-2"><Campo titulo="Gramos por unidad (si no es g)"><input key={f.detalle.unidad} name={`gramos-${f.clave}`} type="number" min="0.001" max={1000000} step="any" disabled={f.detalle.unidad === "g"} defaultValue={f.detalle.gramos_por_unidad ?? ""} className={estilo} placeholder="Sin conversión informada"/></Campo></div></div>
        </li>)}</ul>
        {!ingredientes.some(f => f.variante === v.clave) && <p className="text-xs text-muted-foreground">Sin agregados nutricionales registrados: la mezcla usa solo el aporte del producto.</p>}
      </section>)}
      <Button type="button" variant="outline" disabled={variantes.length >= 10} onClick={() => { fijarVariantes(filas => [...filas, { clave: crypto.randomUUID(), nombre: `Variante ${filas.length+1}`, medidas: 1, preparacion: "" }]); alCambiar(); }}>Agregar variante</Button>
    </section>
    <Campo titulo="Notas"><textarea name="notas" maxLength={6000} rows={2} defaultValue={contenido?.notas} className={estilo}/></Campo>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit">{pendiente ? "Guardando…" : "Guardar suplemento"}</Button><Button type="button" variant="outline" onClick={alCancelar}>Cancelar</Button></div>
  </fieldset></form>;
}
