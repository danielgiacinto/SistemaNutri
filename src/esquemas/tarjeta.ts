import { esquemaCorreo } from "@/esquemas/comunes";

export type DatosAutorizacionTarjeta = {
  nombre: string;
  correo: string;
  tipoDocumento: string;
  documento: string;
  banco: string;
  cuotas: string;
  bancoListo: boolean;
  cuotasListas: boolean;
  numeroValido: boolean;
  vencimientoValido: boolean;
  codigoValido: boolean;
};

/** Mensajes por campo. Un objeto vacío significa que se puede autorizar. */
export function validarAutorizacionTarjeta(datos: DatosAutorizacionTarjeta): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!datos.numeroValido) errores.numero = "Ingresá un número de tarjeta válido.";
  if (!datos.vencimientoValido) errores.vence = "Ingresá un vencimiento válido.";
  if (!datos.codigoValido) errores.cvv = "Ingresá el código de seguridad.";
  if (datos.nombre.trim().length < 2) errores.nombre = "Ingresá el nombre del titular.";
  if (!datos.bancoListo) errores.banco = "El banco aparece cuando el número de tarjeta es válido.";
  else if (!datos.banco.trim()) errores.banco = "Elegí el banco emisor.";
  if (!datos.cuotasListas) errores.cuotas = "Las cuotas aparecen cuando el número de tarjeta es válido.";
  else if (!datos.cuotas.trim() || Number(datos.cuotas) < 1) errores.cuotas = "Elegí las cuotas de la validación.";
  if (!datos.tipoDocumento.trim()) errores.tipoDoc = "Elegí el tipo de documento.";
  const documento = datos.documento.replace(/\D/g, "");
  if (documento.length < 7 || documento.length > 11) errores.dni = "Ingresá el número de documento, sin puntos.";
  const correo = esquemaCorreo.safeParse(datos.correo);
  if (!correo.success) errores.correo = correo.error.issues[0]?.message ?? "Ingresá un correo electrónico válido.";
  return errores;
}
