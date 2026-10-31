"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { autorizarSuscripcion } from "@/acciones/facturacion";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { formatearPesos } from "@/lib/moneda";
import { validarAutorizacionTarjeta } from "@/esquemas/tarjeta";

type DatosTarjeta = { token?: string };

type InstanciaTarjeta = {
  getCardFormData: () => DatosTarjeta;
  unmount: () => void;
};

type EstiloCampoSeguro = {
  color: string;
  placeholderColor: string;
  fontSize: string;
  height: string;
};

/**
 * El iframe de Mercado Pago no entiende oklch ni lab(). Hay que pasarle un hex
 * del texto y del placeholder ya resueltos para el tema y la paleta activos.
 */
function colorHex(variable: string): string {
  const sonda = document.createElement("span");
  sonda.style.color = `var(${variable})`;
  document.body.appendChild(sonda);
  const crudo = getComputedStyle(sonda).color;
  sonda.remove();
  const lienzo = document.createElement("canvas");
  lienzo.width = 1;
  lienzo.height = 1;
  const contexto = lienzo.getContext("2d", { colorSpace: "srgb" });
  if (!contexto) return "#111111";
  contexto.fillStyle = crudo;
  contexto.fillRect(0, 0, 1, 1);
  const [rojo, verde, azul] = contexto.getImageData(0, 0, 1, 1).data;
  const byte = (valor: number) => valor.toString(16).padStart(2, "0");
  return `#${byte(rojo)}${byte(verde)}${byte(azul)}`;
}

function estiloCampoSeguro(): EstiloCampoSeguro {
  return {
    color: colorHex("--foreground"),
    placeholderColor: colorHex("--muted-foreground"),
    fontSize: "16px",
    height: "22px",
  };
}

function aparienciaActual(): string {
  const html = document.documentElement;
  return `${html.classList.contains("dark") ? "oscuro" : "claro"}:${html.dataset.paleta ?? "marca"}`;
}

type MercadoPagoSdk = {
  cardForm: (opciones: {
    amount: string;
    iframe: boolean;
    form: Record<string, unknown>;
    callbacks: {
      onFormMounted?: (error?: unknown) => void;
      onSubmit?: (evento: Event) => void;
      onValidityChange?: (error: unknown, campo?: string) => void;
    };
  }) => InstanciaTarjeta;
};

const CLAVE_SDK = "__nutriMercadoPago";

/** Mercado Pago rechaza una segunda instancia y manda un error-metric con respuesta vacía. */
function obtenerSdk(clavePublica: string): MercadoPagoSdk | null {
  const ventana = window as Window & { [CLAVE_SDK]?: { clave: string; sdk: MercadoPagoSdk } };
  const guardada = ventana[CLAVE_SDK];
  if (guardada?.clave === clavePublica) return guardada.sdk;
  const MercadoPago = (window as unknown as { MercadoPago?: new (clave: string) => MercadoPagoSdk }).MercadoPago;
  if (!MercadoPago) return null;
  const sdk = new MercadoPago(clavePublica);
  ventana[CLAVE_SDK] = { clave: clavePublica, sdk };
  return sdk;
}

function limpiarCamposTarjeta() {
  for (const id of ["mp-numero", "mp-vence", "mp-cvv", "mp-banco", "mp-cuotas", "mp-tipo-doc"]) {
    document.getElementById(id)?.replaceChildren();
  }
}

function leerTexto(id: string): string {
  const nodo = document.getElementById(id);
  return nodo instanceof HTMLInputElement ? nodo.value : "";
}

function leerSelect(id: string): { valor: string; listo: boolean } {
  const nodo = document.getElementById(id);
  if (!(nodo instanceof HTMLSelectElement)) return { valor: "", listo: false };
  const listo = Array.from(nodo.options).some((opcion) => !opcion.disabled && opcion.value.trim() !== "");
  const elegida = nodo.selectedOptions[0];
  const valor = elegida && !elegida.disabled ? elegida.value.trim() : "";
  return { valor, listo };
}

type Seguros = { numero: boolean; vence: boolean; cvv: boolean };

const SEGUROS_VACIOS: Seguros = { numero: false, vence: false, cvv: false };

function claveSegura(campo: string): keyof Seguros | null {
  if (campo === "cardNumber") return "numero";
  if (campo === "expirationDate") return "vence";
  if (campo === "securityCode") return "cvv";
  return null;
}

const CLASE_SELECT =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function MensajeCampo({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {texto}
    </p>
  );
}

function sinCampo(errores: Record<string, string>, campo: string): Record<string, string> {
  if (!errores[campo]) return errores;
  const siguiente = { ...errores };
  delete siguiente[campo];
  return siguiente;
}

/**
 * Los datos de la tarjeta quedan en los campos seguros de Mercado Pago.
 * A nuestro servidor llega solo el token de un uso, y recién cuando el SDK
 * confirma el envío del formulario.
 */
export function FormularioTarjeta({
  clavePublica,
  precio,
  correo,
  pagadorDePrueba = false,
}: {
  clavePublica: string;
  precio: number;
  correo: string;
  pagadorDePrueba?: boolean;
}) {
  const referencia = useRef<InstanciaTarjeta | null>(null);
  const enviarToken = useRef<(token: string) => void>(() => {});
  const seguros = useRef<Seguros>(SEGUROS_VACIOS);
  const calcular = useRef<() => Record<string, string>>(() => ({}));
  const [listo, setListo] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [apariencia, setApariencia] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pendiente, iniciar] = useTransition();
  const precioVisible = formatearPesos(precio) ?? `${precio} ARS`;

  useEffect(() => {
    calcular.current = () => {
      const banco = leerSelect("mp-banco");
      const cuotas = leerSelect("mp-cuotas");
      const tipo = leerSelect("mp-tipo-doc");
      return validarAutorizacionTarjeta({
        nombre: leerTexto("mp-nombre"),
        correo: leerTexto("mp-correo"),
        tipoDocumento: tipo.valor,
        documento: leerTexto("mp-dni"),
        banco: banco.valor,
        cuotas: cuotas.valor,
        bancoListo: banco.listo,
        cuotasListas: cuotas.listo,
        numeroValido: seguros.current.numero,
        vencimientoValido: seguros.current.vence,
        codigoValido: seguros.current.cvv,
      });
    };
    enviarToken.current = (token) => {
      iniciar(async () => {
        const resultado = await autorizarSuscripcion(token);
        if (!resultado.ok) toast.error(resultado.mensaje);
        else toast.success(resultado.mensaje ?? "Suscripción autorizada.");
      });
    };
  });

  useEffect(() => {
    const html = document.documentElement;
    const sincronizar = () => {
      const siguiente = aparienciaActual();
      setApariencia((actual) => (actual === siguiente ? actual : siguiente));
    };
    sincronizar();
    const observador = new MutationObserver(sincronizar);
    observador.observe(html, { attributes: true, attributeFilter: ["class", "data-paleta"] });
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!apariencia) return;
    let cancelado = false;
    const estilo = estiloCampoSeguro();

    const montar = () => {
      if (cancelado) return;
      const sdk = obtenerSdk(clavePublica);
      if (!sdk) {
        setErrorCarga("No se pudo cargar el formulario de Mercado Pago.");
        return;
      }
      referencia.current = sdk.cardForm({
        amount: precio.toFixed(2),
        iframe: true,
        form: {
          id: "form-mp",
          cardNumber: { id: "mp-numero", placeholder: "Número de la tarjeta", style: estilo },
          expirationDate: { id: "mp-vence", placeholder: "MM/AA", style: estilo },
          securityCode: { id: "mp-cvv", placeholder: "CVV", style: estilo },
          cardholderName: { id: "mp-nombre", placeholder: "Como figura en la tarjeta" },
          issuer: { id: "mp-banco", placeholder: "Banco" },
          installments: { id: "mp-cuotas", placeholder: "Cuotas" },
          identificationType: { id: "mp-tipo-doc", placeholder: "Tipo" },
          identificationNumber: { id: "mp-dni", placeholder: "Número" },
          cardholderEmail: { id: "mp-correo", placeholder: "Correo" },
        },
        callbacks: {
          onFormMounted: (error) => {
            if (cancelado) return;
            if (error) setErrorCarga("Mercado Pago no pudo mostrar los campos de la tarjeta.");
            else setListo(true);
          },
          onValidityChange: (error: unknown, campo?: string) => {
            const clave = campo ? claveSegura(campo) : null;
            if (!clave) return;
            seguros.current = { ...seguros.current, [clave]: error == null };
            if (error == null) {
              setErrores((actual) => {
                if (!actual[clave]) return actual;
                const siguiente = { ...actual };
                delete siguiente[clave];
                return siguiente;
              });
            }
          },
          onSubmit: (evento) => {
            evento.preventDefault();
            const encontrados = calcular.current();
            let token: string | undefined;
            try {
              token = referencia.current?.getCardFormData().token;
            } catch {
              token = undefined;
            }
            if (!token) {
              encontrados.numero ??= "Ingresá un número de tarjeta válido.";
              encontrados.vence ??= "Ingresá un vencimiento válido.";
              encontrados.cvv ??= "Ingresá el código de seguridad.";
            }
            if (!token || Object.keys(encontrados).length > 0) {
              setErrores(encontrados);
              toast.error("Revisá los campos marcados antes de autorizar.");
              return;
            }
            setErrores({});
            enviarToken.current(token);
          },
        },
      });
    };

    const formulario = document.getElementById("form-mp");
    const interceptar = (evento: Event) => {
      const encontrados = calcular.current();
      if (Object.keys(encontrados).length === 0) return;
      evento.preventDefault();
      evento.stopPropagation();
      setErrores(encontrados);
      toast.error("Revisá los campos marcados antes de autorizar.");
    };
    formulario?.addEventListener("submit", interceptar, true);

    const existente = document.querySelector<HTMLScriptElement>("script[data-sdk-mp='tarjeta']");
    const tiempo = window.setTimeout(() => {
      if (cancelado) return;
      if (existente && (window as unknown as { MercadoPago?: unknown }).MercadoPago) {
        montar();
        return;
      }
      const script = existente ?? document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.dataset.sdkMp = "tarjeta";
      script.addEventListener("load", montar, { once: true });
      script.addEventListener(
        "error",
        () => {
          if (!cancelado) setErrorCarga("No se pudo cargar el formulario de Mercado Pago.");
        },
        { once: true },
      );
      if (!existente) document.body.appendChild(script);
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(tiempo);
      formulario?.removeEventListener("submit", interceptar, true);
      seguros.current = SEGUROS_VACIOS;
      try {
        referencia.current?.unmount();
      } catch {
        // El SDK ya liberó la instancia.
      }
      referencia.current = null;
      limpiarCamposTarjeta();
    };
  }, [apariencia, clavePublica, precio]);

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Autorizar el cobro mensual</CardTitle>
        <CardDescription>
          El plan es {precioVisible} por mes. El primer cobro de ese monto se programa al terminar la prueba. Mercado
          Pago puede debitar un importe mínimo para validar la tarjeta y devolverlo: ese importe no suma un mes.
          {pagadorDePrueba
            ? " Con estas credenciales de prueba, la suscripción queda a nombre del comprador de prueba que figura en el correo. Ese correo tiene que coincidir con el del token de la tarjeta, así que el campo queda fijo."
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {errorCarga
            ? errorCarga
            : listo
              ? "El número de tarjeta lo escribe Mercado Pago en un campo seguro. Nosotros no lo guardamos."
              : "Cargando el formulario seguro de Mercado Pago…"}
        </p>
        <form id="form-mp" className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mp-numero">Número de tarjeta</Label>
            <div
              id="mp-numero"
              className="campo-tarjeta-mp"
              data-invalido={errores.numero ? "true" : undefined}
              aria-describedby={errores.numero ? "mp-numero-error" : undefined}
            />
            <MensajeCampo id="mp-numero-error" texto={errores.numero} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-vence">Vencimiento</Label>
            <div
              id="mp-vence"
              className="campo-tarjeta-mp"
              data-invalido={errores.vence ? "true" : undefined}
              aria-describedby={errores.vence ? "mp-vence-error" : undefined}
            />
            <MensajeCampo id="mp-vence-error" texto={errores.vence} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-cvv">Código de seguridad</Label>
            <div
              id="mp-cvv"
              className="campo-tarjeta-mp"
              data-invalido={errores.cvv ? "true" : undefined}
              aria-describedby={errores.cvv ? "mp-cvv-error" : undefined}
            />
            <MensajeCampo id="mp-cvv-error" texto={errores.cvv} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mp-nombre">Titular</Label>
            <Input
              id="mp-nombre"
              className="h-11"
              autoComplete="cc-name"
              placeholder="Como figura en la tarjeta"
              aria-invalid={errores.nombre ? true : undefined}
              aria-describedby={errores.nombre ? "mp-nombre-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "nombre"))}
            />
            <MensajeCampo id="mp-nombre-error" texto={errores.nombre} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-banco">Banco emisor</Label>
            <select
              id="mp-banco"
              className={CLASE_SELECT}
              defaultValue=""
              aria-invalid={errores.banco ? true : undefined}
              aria-describedby={errores.banco ? "mp-banco-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "banco"))}
            />
            <MensajeCampo id="mp-banco-error" texto={errores.banco} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-cuotas">Cuotas de la validación</Label>
            <select
              id="mp-cuotas"
              className={CLASE_SELECT}
              defaultValue=""
              aria-invalid={errores.cuotas ? true : undefined}
              aria-describedby={errores.cuotas ? "mp-cuotas-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "cuotas"))}
            />
            <MensajeCampo id="mp-cuotas-error" texto={errores.cuotas} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-tipo-doc">Documento</Label>
            <select
              id="mp-tipo-doc"
              className={CLASE_SELECT}
              defaultValue=""
              aria-invalid={errores.tipoDoc ? true : undefined}
              aria-describedby={errores.tipoDoc ? "mp-tipo-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "tipoDoc"))}
            />
            <MensajeCampo id="mp-tipo-error" texto={errores.tipoDoc} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-dni">Número de documento</Label>
            <Input
              id="mp-dni"
              className="h-11"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Sin puntos"
              aria-invalid={errores.dni ? true : undefined}
              aria-describedby={errores.dni ? "mp-dni-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "dni"))}
            />
            <MensajeCampo id="mp-dni-error" texto={errores.dni} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mp-correo">Correo del titular</Label>
            <Input
              id="mp-correo"
              className="h-11"
              type="email"
              autoComplete="email"
              defaultValue={correo}
              readOnly={pagadorDePrueba}
              aria-invalid={errores.correo ? true : undefined}
              aria-describedby={errores.correo ? "mp-correo-error" : undefined}
              onChange={() => setErrores((actual) => sinCampo(actual, "correo"))}
            />
            <MensajeCampo id="mp-correo-error" texto={errores.correo} />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-3 text-sm text-muted-foreground">
              Las cuotas son solo de la validación de la tarjeta. El plan se cobra entero, una vez por mes.
            </p>
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={!listo || pendiente || Boolean(errorCarga)}>
              <CreditCard aria-hidden="true" />
              {pendiente ? "Autorizando…" : `Autorizar ${precioVisible} por mes`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
