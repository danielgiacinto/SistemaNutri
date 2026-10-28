import { redirect } from "next/navigation";

/** Los indicadores viven en el inicio. Esta ruta queda para no romper enlaces viejos. */
export default function PaginaAnaliticas() {
  redirect("/panel");
}
