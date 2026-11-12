import { Suspense } from "react";
import Link from "next/link";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarBiblioteca } from "@/servicios/biblioteca";
import { esquemaFiltroBiblioteca } from "@/esquemas/biblioteca";
import { ESTANTES_BIBLIOTECA, TIPOS_BIBLIOTECA, type FiltroBiblioteca } from "@/tipos/biblioteca";
import { CatalogoBiblioteca } from "@/componentes/biblioteca/catalogo-biblioteca";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata = { title: "Biblioteca" };
const valor = (dato: string | string[] | undefined) => Array.isArray(dato) ? dato[0] : dato;
function href(filtro: FiltroBiblioteca, pagina = filtro.pagina) {
  return `/panel/biblioteca?${new URLSearchParams({ tipo: filtro.tipo, q: filtro.q, categoria: filtro.categoria, archivados: filtro.archivados ? "1" : "0", pagina: String(pagina) })}`;
}
export default function PaginaBiblioteca({ searchParams }: PageProps<"/panel/biblioteca">) {
  return <Suspense fallback={<div className="space-y-6" aria-busy="true" aria-label="Cargando biblioteca"><Skeleton className="h-20"/><Skeleton className="h-14"/><Skeleton className="h-80"/></div>}><Contenido parametros={searchParams}/></Suspense>;
}
async function Contenido({ parametros }: { parametros: PageProps<"/panel/biblioteca">["searchParams"] }) {
  await requerirProfesional();
  const consulta = await parametros;
  const validacion = esquemaFiltroBiblioteca.safeParse({ tipo: valor(consulta.tipo) ?? "plato", q: valor(consulta.q) ?? "", categoria: valor(consulta.categoria) ?? "", archivados: valor(consulta.archivados) === "1", pagina: Number(valor(consulta.pagina) ?? 1) });
  const filtro = validacion.success ? validacion.data : esquemaFiltroBiblioteca.parse({});
  const datos = await listarBiblioteca(await crearClienteServidor(), filtro);
  return <div className="space-y-6"><EncabezadoPagina titulo="Biblioteca" descripcion="Tus alimentos, grupos y recetas, organizados para volver a usarlos."/>
    <nav aria-label="Estantes de biblioteca" className="flex gap-2 overflow-x-auto pb-2">{TIPOS_BIBLIOTECA.map(tipo => <Link key={tipo} href={href({ ...filtro, tipo, q: "", categoria: "", pagina: 1 })} aria-current={filtro.tipo === tipo ? "page" : undefined} className="flex shrink-0 items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:border-primary/40 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground">{ESTANTES_BIBLIOTECA[tipo].titulo}<span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">{datos.contadores[tipo] ?? 0}</span></Link>)}</nav>
    <div><h2 className="font-semibold">{ESTANTES_BIBLIOTECA[filtro.tipo].titulo}</h2><p className="mt-1 text-sm text-muted-foreground">{ESTANTES_BIBLIOTECA[filtro.tipo].descripcion}</p></div>
    <form action="/panel/biblioteca" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_auto_auto]"><input type="hidden" name="tipo" value={filtro.tipo}/><label className="min-w-0 space-y-1"><span className="block text-xs font-medium">Buscar por nombre o etiqueta</span><input name="q" maxLength={100} defaultValue={filtro.q} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/></label><label className="space-y-1"><span className="block text-xs font-medium">Categoría</span><select name="categoria" defaultValue={filtro.categoria} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="">Todas</option>{datos.categorias.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="space-y-1"><span className="block text-xs font-medium">Estado</span><select name="archivados" defaultValue={filtro.archivados ? "1" : "0"} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="0">Activos</option><option value="1">Archivados</option></select></label><Button type="submit" variant="outline" className="self-end">Buscar</Button></form>
    <CatalogoBiblioteca datos={datos} tipo={filtro.tipo} filtrado={!!filtro.q || !!filtro.categoria || filtro.archivados}/>
    {datos.total > 25 && <nav aria-label="Páginas de biblioteca" className="flex flex-wrap items-center gap-4 text-sm">{filtro.pagina > 1 && <Link href={href(filtro, filtro.pagina - 1)} className="underline underline-offset-4">Anterior</Link>}<span>Página {filtro.pagina} de {Math.ceil(datos.total / 25)}</span>{filtro.pagina * 25 < datos.total && <Link href={href(filtro, filtro.pagina + 1)} className="underline underline-offset-4">Ver más</Link>}</nav>}
  </div>;
}
