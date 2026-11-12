import { NUTRIENTES_BIBLIOTECA, type CalculoBiblioteca, type NutrientesBiblioteca, type RecursoBiblioteca, type RelacionBiblioteca } from "@/tipos/biblioteca";

const sinDatos = (): NutrientesBiblioteca => ({ energia: null, proteinas: null, carbohidratos: null, grasas: null });
const positivo = (valor: number | null | undefined): valor is number => valor != null && Number.isFinite(valor) && valor > 0;
function escalar(valores: NutrientesBiblioteca, factor: number | null): NutrientesBiblioteca {
  return Object.fromEntries(NUTRIENTES_BIBLIOTECA.map(clave => {
    const valor = valores[clave];
    const resultado = valor != null && factor != null ? valor * factor : null;
    return [clave, resultado != null && Number.isFinite(resultado) ? resultado : null];
  })) as NutrientesBiblioteca;
}

/** Usa exclusivamente instantáneas guardadas; el rendimiento modifica peso, no nutrientes. */
export function calcularComposicionBiblioteca(recurso: RecursoBiblioteca, relaciones: RelacionBiblioteca[]): CalculoBiblioteca {
  const ingredientes = relaciones.map(({ detalle, instantanea }) => {
    const conversion = detalle.unidad === "g" ? 1 : detalle.gramos_por_unidad;
    const gramos = positivo(detalle.cantidad) && positivo(conversion) ? detalle.cantidad * conversion : null;
    const pesoPreparado = gramos != null && positivo(detalle.rendimiento) ? gramos * detalle.rendimiento : null;
    // Las preparaciones solo admiten alimentos: no hay recursión entre recetas.
    const base = instantanea.tipo === "alimento" ? Object.fromEntries(NUTRIENTES_BIBLIOTECA.map(clave => [clave, instantanea.contenido[clave] ?? null])) as NutrientesBiblioteca
      : instantanea.tipo === "preparacion" && instantanea.relaciones?.every(f => f.instantanea.tipo === "alimento") ? calcularComposicionBiblioteca(instantanea, instantanea.relaciones).por_100g : sinDatos();
    return { gramos, peso_preparado: pesoPreparado, aporte: escalar(base, gramos == null ? null : gramos / 100) };
  });
  const total = sinDatos();
  for (const clave of NUTRIENTES_BIBLIOTECA) {
    if (ingredientes.length > 0 && ingredientes.every(f => f.aporte[clave] != null)) total[clave] = ingredientes.reduce((suma, f) => suma + f.aporte[clave]!, 0);
  }
  const pesoEstimado = ingredientes.length > 0 && ingredientes.every(f => f.peso_preparado != null) ? ingredientes.reduce((suma, f) => suma + f.peso_preparado!, 0) : null;
  const informado = positivo(recurso.contenido.peso_final);
  const pesoFinal = informado ? recurso.contenido.peso_final! : pesoEstimado;
  return {
    total, ingredientes, peso_final: pesoFinal,
    origen_peso: informado ? "informado" : pesoFinal != null ? "estimado" : "sin_dato",
    por_porcion: escalar(total, positivo(recurso.contenido.porciones) ? 1 / recurso.contenido.porciones : null),
    por_100g: escalar(total, positivo(pesoFinal) ? 100 / pesoFinal : null),
  };
}

/** Separa los insumos del listado: al navegador se envía solo el resumen calculado. */
export function resumirRecursoBiblioteca(recurso: RecursoBiblioteca, relaciones = recurso.relaciones ?? []): RecursoBiblioteca {
  const { relaciones: insumos, ...resumen } = recurso;
  void insumos;
  if (recurso.tipo === "suplemento") return { ...resumen, calculo_suplemento: calcularSuplemento(recurso, relaciones) };
  return recurso.tipo === "plato" || recurso.tipo === "preparacion" ? { ...resumen, calculo: calcularComposicionBiblioteca(recurso, relaciones) } : resumen;
}

export function calcularSuplemento(recurso: RecursoBiblioteca, relaciones: RelacionBiblioteca[]): NonNullable<RecursoBiblioteca["calculo_suplemento"]> {
  const producto = Object.fromEntries(NUTRIENTES_BIBLIOTECA.map(clave => [clave,recurso.contenido[clave] ?? null])) as NutrientesBiblioteca;
  return { producto, variantes: (recurso.contenido.variantes ?? []).map((variante, indice) => {
    const insumos = relaciones.filter(f => f.detalle.variante === indice);
    const agregados = insumos.length ? calcularComposicionBiblioteca(recurso, insumos).total : { energia: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
    const aporteProducto = escalar(producto, positivo(variante.medidas) ? variante.medidas : null);
    const mezcla = Object.fromEntries(NUTRIENTES_BIBLIOTECA.map(clave => [clave, aporteProducto[clave] == null || agregados[clave] == null ? null : aporteProducto[clave] + agregados[clave]])) as NutrientesBiblioteca;
    return { producto: aporteProducto, agregados, mezcla };
  }) };
}
