import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";

/** Precio en pesos, sin centavos si el monto es entero. */
export function formatearPesos(monto: number | string | null | undefined): string | null {
  if (monto == null || monto === "") return null;
  const numero = Number(monto);
  if (!Number.isFinite(numero)) return null;
  const tieneCentavos = Math.round(numero * 100) % 100 !== 0;
  return new Intl.NumberFormat(LOCALE_PREDETERMINADO, {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: tieneCentavos ? 2 : 0,
  }).format(numero);
}

/** Duración de la prueba tal como se guarda: un mes es un mes calendario, no 30 días. */
export function textoDuracionPrueba(cantidad: number, unidad: "dias" | "meses"): string {
  if (unidad === "dias") return cantidad === 1 ? "1 día" : `${cantidad} días`;
  return cantidad === 1 ? "1 mes calendario" : `${cantidad} meses calendario`;
}
