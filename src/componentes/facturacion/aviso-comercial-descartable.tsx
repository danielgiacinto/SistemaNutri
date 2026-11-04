"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CircleAlert, Info, X } from "lucide-react";

function suscribirse(avisar: () => void) { window.addEventListener("storage", avisar); return () => window.removeEventListener("storage", avisar); }
export function AvisoComercialDescartable({ clave, texto, alerta, descartable }: { clave: string; texto: string; alerta: boolean; descartable: boolean }) {
  const almacen = `nutri-aviso-comercial:${clave}`;
  const cerrado = useSyncExternalStore(suscribirse, () => { try { return sessionStorage.getItem(almacen) === "cerrado"; } catch { return false; } }, () => false);
  if (cerrado && descartable) return null;
  const Icono = alerta ? CircleAlert : Info;
  return <aside role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${alerta ? "border-destructive/30 bg-destructive/10" : "border-primary/25 bg-accent/40"}`}>
    <Icono className={`mt-0.5 size-4 shrink-0 ${alerta ? "text-destructive" : "text-primary"}`} aria-hidden="true" />
    <div className="min-w-0 flex-1 space-y-2"><p>{texto}</p><Link href="/panel/facturacion" className="font-medium underline underline-offset-4">Ver plan y facturación</Link></div>
    {descartable ? <button type="button" aria-label="Cerrar aviso comercial" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => { try { sessionStorage.setItem(almacen, "cerrado"); window.dispatchEvent(new Event("storage")); } catch { /* El aviso sigue visible si el almacenamiento está bloqueado. */ } }}><X className="size-4" aria-hidden="true" /></button> : null}
  </aside>;
}
