import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormularioIngreso } from "@/componentes/autenticacion/formulario-ingreso";
import { FormularioRegistro } from "@/componentes/autenticacion/formulario-registro";
import { FormularioRecuperacion } from "@/componentes/autenticacion/formulario-recuperacion";
import { FormularioRestablecimiento } from "@/componentes/autenticacion/formulario-restablecimiento";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...propiedades }: ComponentProps<"a">) => createElement("a", propiedades, children) }));
vi.mock("@/acciones/autenticacion", () => ({
  ingresar: vi.fn(), registrarse: vi.fn(), reenviarConfirmacion: vi.fn(),
  solicitarRecuperacion: vi.fn(), restablecerContrasena: vi.fn(),
}));

describe("formularios conservados durante la navegación", () => {
  it("asocia cada etiqueta con un solo campo aunque convivan pantallas e instancias", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(FormularioIngreso, { siguiente: null }),
      createElement(FormularioRegistro, { siguiente: null }),
      createElement(FormularioRecuperacion),
      createElement(FormularioRestablecimiento),
      createElement(FormularioIngreso, { siguiente: "/portal" }),
      createElement(FormularioRestablecimiento, { registro: true }),
    ));
    const campos = [...html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    const etiquetas = [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]);
    expect(campos.length).toBeGreaterThan(0);
    expect(new Set(campos).size).toBe(campos.length);
    expect(etiquetas.length).toBe(campos.length);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
    for (const id of etiquetas) expect(campos.filter((campo) => campo === id)).toHaveLength(1);
    for (const atributo of html.matchAll(/aria-describedby="([^"]+)"/g)) {
      for (const id of atributo[1].split(" ")) expect(html).toContain(`id="${id}"`);
    }
  });
});
