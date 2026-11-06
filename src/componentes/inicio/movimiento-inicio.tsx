"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MovimientoInicio({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = contenedor.current;
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!raiz || preferencia.matches || !("IntersectionObserver" in window)) return;

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("inicio-visible");
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.08 });

    raiz.querySelectorAll("[data-revelar]").forEach((elemento) => {
      // Lo que ya está en pantalla queda visible desde el primer renderizado.
      if (elemento.getBoundingClientRect().top > window.innerHeight) {
        elemento.classList.add("inicio-por-revelar");
        observador.observe(elemento);
      }
    });

    return () => observador.disconnect();
  }, []);

  return <div ref={contenedor} className="inicio-marca-palta inicio-premium">{children}</div>;
}
