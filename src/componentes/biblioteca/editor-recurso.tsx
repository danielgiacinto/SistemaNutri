"use client";

import { useState, useTransition, type ReactNode } from "react";
import { guardarRecursoBiblioteca } from "@/acciones/biblioteca";
import { type DetalleBiblioteca, type RecursoBiblioteca, type RelacionBiblioteca, type TipoBiblioteca } from "@/tipos/biblioteca";
import { Button } from "@/componentes/ui/button";
import { SelectorRecurso } from "./selector-recurso";

const estilo = "w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
function Campo({ titulo, children }: { titulo: string; children: ReactNode }) { return <label className="block min-w-0 space-y-1.5"><span className="text-xs font-medium">{titulo}</span>{children}</label>; }
type FilaEditor = RelacionBiblioteca & { clave: string };

export function EditorRecurso({ tipo, inicial, alGuardar, alCancelar, alCambiar, alPendiente }: { tipo: TipoBiblioteca; inicial?: DetalleBiblioteca; alGuardar: (id: string) => void; alCancelar: () => void; alCambiar: () => void; alPendiente: (pendiente: boolean) => void }) {
  const esReceta = tipo === "plato" || tipo === "preparacion";
  const recurso = inicial?.recurso;
  const contenido = recurso?.contenido;
  const [fuente, fijarFuente] = useState<RecursoBiblioteca | null>(recurso?.fuente_instantanea ?? null);
  const [filas, fijarFilas] = useState<FilaEditor[]>(() => (inicial?.relaciones ?? []).map((r, i) => ({ ...r, clave: `${r.referencia_id}-${i}` })));
  const [error, fijarError] = useState("");
  const [pendiente, iniciar] = useTransition();
  function agregar(elegido: RecursoBiblioteca) {
    fijarFilas(anteriores => [...anteriores, { clave: crypto.randomUUID(), referencia_id: elegido.id, instantanea: elegido, detalle: esReceta ? { cantidad: 100, unidad: "g", gramos_por_unidad: 1, rendimiento: 1 } : { fraccion: .5, ejemplos: elegido.contenido.ejemplos ?? "", coccion: elegido.contenido.coccion ?? "" } }]);
    alCambiar();
  }
  function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const texto = (nombre: string) => String(datos.get(nombre) ?? "");
    const numero = (nombre: string) => texto(nombre).trim() === "" ? null : Number(texto(nombre).replace(",", "."));
    const notas = texto("notas");
    const contenido = tipo === "fuente" ? { referencia: texto("referencia"), version: texto("version_fuente"), licencia: texto("licencia"), base: texto("base"), fecha: texto("fecha"), notas }
      : tipo === "alimento" ? { energia: numero("energia"), proteinas: numero("proteinas"), carbohidratos: numero("carbohidratos"), grasas: numero("grasas"), notas }
      : tipo === "grupo" ? { ejemplos: texto("ejemplos"), coccion: texto("coccion"), notas }
      : esReceta ? { porciones: numero("porciones"), peso_final: numero("peso_final"), preparacion: texto("preparacion"), alternativas: texto("alternativas"), notas }
      : { preparacion: texto("preparacion"), alternativas: texto("alternativas"), notas };
    const relaciones = filas.map(f => ({ referencia_id: f.referencia_id, referencia_version: f.instantanea.version, detalle: esReceta
      ? { cantidad: numero(`cantidad-${f.clave}`), unidad: texto(`unidad-${f.clave}`), gramos_por_unidad: texto(`unidad-${f.clave}`) === "g" ? 1 : numero(`gramos-${f.clave}`), rendimiento: numero(`rendimiento-${f.clave}`) }
      : { fraccion: (numero(`parte-${f.clave}`) ?? 0) / 100, ejemplos: texto(`ejemplos-${f.clave}`), coccion: texto(`coccion-${f.clave}`) } }));
    fijarError(""); alPendiente(true);
    iniciar(async () => {
      try {
        const resultado = await guardarRecursoBiblioteca({ ...(recurso ? { id: recurso.id, version: recurso.version } : {}), tipo, nombre: texto("nombre"), categoria: texto("categoria"), etiquetas: texto("etiquetas").split(",").map(v => v.trim()).filter(Boolean), contenido, relaciones, ...(tipo === "alimento" ? { fuente_id: fuente?.id, fuente_version: fuente?.version } : {}) });
        if (resultado.ok && resultado.datos) alGuardar(resultado.datos.id); else fijarError(resultado.mensaje ?? "No se pudo guardar.");
      } catch { fijarError("No pudimos guardar. Tus cambios siguen en el formulario para reintentar."); }
      finally { alPendiente(false); }
    });
  }
  return <form onSubmit={guardar} onChange={alCambiar} className="space-y-5"><fieldset disabled={pendiente} className="min-w-0 space-y-5">
    <p className="rounded-xl bg-accent/40 p-3 text-xs leading-relaxed text-muted-foreground">Contenido reutilizable del consultorio. Evitá nombres, diagnósticos y mediciones de pacientes.</p>
    <div className="grid gap-4 sm:grid-cols-2"><Campo titulo="Nombre"><input name="nombre" required maxLength={150} defaultValue={recurso?.nombre} className={estilo}/></Campo><Campo titulo="Categoría"><input name="categoria" maxLength={80} defaultValue={recurso?.categoria} list={tipo.startsWith("plato") ? "categorias-platos" : undefined} className={estilo}/></Campo></div>
    <datalist id="categorias-platos">{["Desayuno/Merienda", "Almuerzo", "Cena", "Colación", "Postre"].map(c => <option key={c} value={c}/>)}</datalist>
    <Campo titulo="Etiquetas separadas por comas (hasta 12)"><input name="etiquetas" maxLength={360} defaultValue={recurso?.etiquetas.join(", ")} className={estilo}/></Campo>
    {tipo === "fuente" && <div className="space-y-4"><Campo titulo="Referencia bibliográfica o enlace"><textarea name="referencia" required maxLength={1000} defaultValue={contenido?.referencia} className={estilo}/></Campo><div className="grid gap-4 sm:grid-cols-2"><Campo titulo="Versión o edición"><input name="version_fuente" required maxLength={1000} defaultValue={contenido?.version} className={estilo}/></Campo><Campo titulo="Fecha de consulta (opcional)"><input name="fecha" type="date" defaultValue={contenido?.fecha} className={estilo}/></Campo></div><Campo titulo="Licencia o permiso de uso"><textarea name="licencia" required maxLength={1000} defaultValue={contenido?.licencia} className={estilo} placeholder="Indicá la licencia, su referencia o la autoría propia."/></Campo><Campo titulo="Base de cálculo de la fuente"><input name="base" required maxLength={1000} defaultValue={contenido?.base} className={estilo} placeholder="Ej.: por 100 g de parte comestible, en crudo"/></Campo><p className="text-xs text-muted-foreground">Registrar una fuente no verifica su licencia ni autoriza a copiar un catálogo. Confirmá el permiso de uso y la base antes de cargar datos.</p></div>}
    {tipo === "alimento" && <div className="space-y-4"><div><p className="mb-2 text-sm font-medium">Fuente: {fuente?.nombre ?? "Sin elegir"}</p><SelectorRecurso tipo="fuente" alElegir={r => { fijarFuente(r); alCambiar(); }}/></div><p className="text-sm text-muted-foreground">Composición declarada por 100 g de alimento, con el estado crudo/cocido aclarado en el nombre o las notas. Un campo vacío significa Sin dato; cero es un valor informado.</p><div className="grid grid-cols-2 gap-4">{([['energia','Energía (kcal)',10000],['proteinas','Proteínas (g)',100],['carbohidratos','Carbohidratos (g)',100],['grasas','Grasas (g)',100]] as const).map(([clave,titulo,maximo]) => <Campo key={clave} titulo={titulo}><input name={clave} type="number" min={0} max={maximo} step="any" defaultValue={contenido?.[clave] ?? ""} className={estilo}/></Campo>)}</div></div>}
    {tipo === "grupo" && <><Campo titulo="Alimentos comprendidos y ejemplos"><textarea name="ejemplos" rows={3} maxLength={6000} defaultValue={contenido?.ejemplos} className={estilo}/></Campo><Campo titulo="Métodos de cocción"><textarea name="coccion" rows={2} maxLength={6000} defaultValue={contenido?.coccion} className={estilo}/></Campo></>}
    {(esReceta || tipo === "plato_grupos") && <div className="space-y-4">
      {esReceta && <div className="grid gap-4 sm:grid-cols-2"><Campo titulo="Porciones obtenidas"><input name="porciones" type="number" min="0.001" max={10000} step="any" required defaultValue={contenido?.porciones ?? 1} className={estilo}/></Campo><Campo titulo="Peso final preparado en g (opcional)"><input name="peso_final" type="number" min="0.001" max={1000000} step="any" defaultValue={contenido?.peso_final ?? ""} className={estilo}/></Campo></div>}
      {esReceta && <p className="text-xs leading-relaxed text-muted-foreground">Al guardar se calcula el aporte por porción y por 100 g. El peso final informado tiene prioridad; si falta, se estima con los factores de rendimiento. Un dato faltante no se reemplaza por cero.</p>}
      <h3 className="text-sm font-semibold">{esReceta ? "Ingredientes" : "Partes del plato"}</h3>
      <SelectorRecurso tipo={esReceta ? "alimento" : "grupo"} alElegir={agregar}/>
      {tipo === "plato" && <SelectorRecurso tipo="preparacion" alElegir={agregar}/>}
      {filas.length === 0 && <p className="text-sm text-muted-foreground">Agregá al menos {esReceta ? "un ingrediente" : "un grupo"} desde el buscador.</p>}
      <ol className="space-y-3">{filas.map((f, i) => <li key={f.clave} className="space-y-3 rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 wrap-anywhere text-sm font-medium">{i + 1}. {f.instantanea.nombre}</p><Button type="button" variant="ghost" size="sm" aria-label={`Quitar ${f.instantanea.nombre}, fila ${i + 1}`} onClick={() => { fijarFilas(anteriores => anteriores.filter(a => a.clave !== f.clave)); alCambiar(); }}>Quitar</Button></div>{esReceta ? <div className="grid grid-cols-2 gap-3"><Campo titulo="Cantidad"><input name={`cantidad-${f.clave}`} type="number" required min="0.001" max={1000000} step="any" defaultValue={f.detalle.cantidad} className={estilo}/></Campo><Campo titulo="Unidad"><select name={`unidad-${f.clave}`} value={f.detalle.unidad} onChange={e => { const unidad = e.target.value; fijarFilas(anteriores => anteriores.map(fila => fila.clave === f.clave ? { ...fila, detalle: { ...fila.detalle, unidad, gramos_por_unidad: unidad === "g" ? 1 : null } } : fila)); }} className={estilo}><option value="g">g</option><option value="ml">ml</option><option value="unidad">unidad</option><option value="porcion">porción</option></select></Campo><Campo titulo="Gramos por unidad (si no es g)"><input key={f.detalle.unidad} name={`gramos-${f.clave}`} disabled={f.detalle.unidad === "g"} type="number" min="0.001" max={1000000} step="any" defaultValue={f.detalle.gramos_por_unidad ?? ""} placeholder="Sin conversión informada" className={estilo}/></Campo><Campo titulo="Factor de rendimiento"><input name={`rendimiento-${f.clave}`} type="number" min="0.001" max={1000} step="any" required defaultValue={f.detalle.rendimiento ?? 1} className={estilo}/></Campo><p className="col-span-2 text-xs text-muted-foreground">La cantidad se expresa en el estado declarado por la fuente. El factor es peso preparado ÷ peso inicial: 1 indica sin cambio. Solo modifica el peso estimado; ml requiere conversión explícita a g.</p></div> : <div className="space-y-3"><Campo titulo="Parte del plato (%)"><input name={`parte-${f.clave}`} type="number" required min="0.01" max={100} step="any" defaultValue={(f.detalle.fraccion ?? .5) * 100} className={estilo}/></Campo><Campo titulo="Ejemplos a elección"><textarea name={`ejemplos-${f.clave}`} maxLength={1000} defaultValue={f.detalle.ejemplos} className={estilo}/></Campo><Campo titulo="Cocción sugerida"><input name={`coccion-${f.clave}`} maxLength={1000} defaultValue={f.detalle.coccion} className={estilo}/></Campo></div>}</li>)}</ol>
      {tipo === "plato_grupos" && <p className="text-xs text-muted-foreground">Las partes deben sumar 100%. Una consigna por grupos no determina una composición química exacta.</p>}
      <Campo titulo="Preparación, un paso por línea"><textarea name="preparacion" rows={4} maxLength={6000} defaultValue={contenido?.preparacion} className={estilo}/></Campo><Campo titulo="Alternativas sugeridas (requieren revisión profesional)"><textarea name="alternativas" rows={2} maxLength={6000} defaultValue={contenido?.alternativas} className={estilo}/></Campo>
    </div>}
    <Campo titulo="Notas"><textarea name="notas" rows={2} maxLength={6000} defaultValue={contenido?.notas} className={estilo}/></Campo>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit">{pendiente ? "Guardando…" : "Guardar recurso"}</Button><Button type="button" variant="outline" onClick={alCancelar}>Cancelar</Button></div>
  </fieldset></form>;
}
