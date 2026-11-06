"use client";

import Image from "next/image";
import { ArrowDown, Heart, Leaf, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const ETAPAS = [
  { numero: "01", titulo: "Tu vocación", texto: "El conocimiento y la cercanía los ponés vos." },
  { numero: "02", titulo: "Cada parte, conectada", texto: "Agenda, planes y seguimiento trabajan juntos." },
  { numero: "03", titulo: "Más espacio para acompañar", texto: "Tu energía, donde hace la diferencia." },
];

const limitar = (valor: number, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, valor));
const suavizar = (valor: number) => valor * valor * (3 - 2 * valor);

export function EscenaPalta() {
  const seccion = useRef<HTMLElement>(null);

  useEffect(() => {
    const raiz = seccion.current;
    if (!raiz) return;

    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)");
    let detener = () => {};

    function iniciarMovimiento() {
      if (!raiz) return () => {};
      const buscar = (nombre: string) => raiz.querySelector<HTMLElement>(`.inicio-palta-${nombre}`)!;
      const escena = buscar("escena");
      const conjunto = buscar("conjunto");
      const frontal = buscar("frontal");
      const posterior = buscar("posterior");
      const semilla = buscar("semilla");
      const sombra = buscar("sombra");
      const sombraSemilla = buscar("sombra-semilla");
      const orbita = buscar("orbita");
      const etiquetas = Array.from(raiz.querySelectorAll<HTMLElement>(".inicio-palta-etiqueta"));
      const elementos = [conjunto, frontal, posterior, semilla, sombra, sombraSemilla, orbita, ...etiquetas];

      let fotograma = 0;
      let visible = false;
      let terminado = false;
      let inicio = 0;
      let recorrido = 1;
      let progreso = 0;
      let objetivo = 0;
      let anterior = 0;
      let etapa = -1;
      const puntero = { x: 0, y: 0, destinoX: 0, destinoY: 0 };

      function dibujar() {
        const apertura = suavizar(limitar((progreso - 0.12) / 0.76));
        const elevacion = suavizar(limitar((progreso - 0.28) / 0.6));
        // Las distancias dependen de la escena, no del tamaño de la pantalla.
        const unidad = escena.clientWidth / 600;
        const px = (valor: number) => `${(valor * unidad).toFixed(2)}px`;

        conjunto.style.transform = `rotateX(${(-puntero.y * 4).toFixed(2)}deg) rotateY(${(puntero.x * 6).toFixed(2)}deg)`;
        posterior.style.transform = `translate(-50%, -50%) translate3d(${px(-37 - apertura * 107)}, ${px(-16 + apertura * 46)}, ${px(-50 - apertura * 35)}) rotateX(${apertura * -5}deg) rotateY(${-12 - apertura * 14}deg) rotateZ(${-9 - apertura * 18}deg) scale(${0.94 - apertura * 0.03})`;
        frontal.style.transform = `translate(-50%, -50%) translate3d(${px(29 + apertura * 86)}, ${px(14 - apertura * 49)}, ${px(24 + apertura * 42)}) rotateX(${apertura * 6}deg) rotateY(${8 + apertura * 10}deg) rotateZ(${10 + apertura * 12}deg)`;
        semilla.style.transform = `translate(-50%, -50%) translate3d(${px(elevacion * -151)}, ${px(elevacion * 14)}, ${px(elevacion * 120)}) rotateY(${elevacion * -25}deg) rotateZ(${elevacion * -40}deg) scale(${1 - elevacion * 0.09})`;
        sombraSemilla.style.opacity = `${0.25 - elevacion * 0.17}`;
        sombra.style.transform = `translateX(-50%) scaleX(${1 + apertura * 0.25}) scaleY(${1 - apertura * 0.18})`;
        sombra.style.opacity = `${0.18 - apertura * 0.05}`;
        orbita.style.transform = `translate(-50%, -50%) rotateX(66deg) rotateZ(${-20 + apertura * 45}deg)`;
        etiquetas.forEach((etiqueta, indice) => {
          const aparicion = suavizar(limitar((progreso - 0.1 - indice * 0.12) / 0.22));
          etiqueta.style.opacity = `${aparicion}`;
          etiqueta.style.transform = `translateY(${(1 - aparicion) * 12}px)`;
        });
        raiz!.style.setProperty("--palta-progreso", `${progreso}`);
        const nuevaEtapa = progreso < 0.34 ? 0 : progreso < 0.7 ? 1 : 2;
        if (nuevaEtapa !== etapa) {
          etapa = nuevaEtapa;
          raiz!.dataset.etapa = `${etapa}`;
        }
      }

      function animar(instante: number) {
        fotograma = 0;
        if (!visible || document.hidden) return;
        const delta = anterior ? Math.min(instante - anterior, 50) : 16;
        anterior = instante;
        const mezcla = 1 - Math.exp(-delta / 85);
        progreso += (objetivo - progreso) * mezcla;
        puntero.x += (puntero.destinoX - puntero.x) * mezcla;
        puntero.y += (puntero.destinoY - puntero.y) * mezcla;
        dibujar();
        if (Math.abs(objetivo - progreso) > 0.0001 || Math.abs(puntero.destinoX - puntero.x) > 0.001 || Math.abs(puntero.destinoY - puntero.y) > 0.001) {
          fotograma = requestAnimationFrame(animar);
        } else {
          anterior = 0;
        }
      }

      function solicitarFotograma() {
        if (visible && !fotograma && !document.hidden) fotograma = requestAnimationFrame(animar);
      }

      function actualizarScroll() {
        objetivo = limitar((window.scrollY - inicio) / recorrido);
        solicitarFotograma();
      }

      function medir() {
        const altoVentana = window.innerHeight;
        inicio = raiz!.getBoundingClientRect().top + window.scrollY - altoVentana * 0.55;
        recorrido = Math.max(1, raiz!.offsetHeight - altoVentana * 0.1);
        actualizarScroll();
      }

      function moverPuntero(evento: PointerEvent) {
        if (!punteroFino.matches || evento.pointerType !== "mouse") return;
        const limites = escena.getBoundingClientRect();
        puntero.destinoX = limitar((evento.clientX - limites.left) / limites.width * 2 - 1, -1, 1);
        puntero.destinoY = limitar((evento.clientY - limites.top) / limites.height * 2 - 1, -1, 1);
        solicitarFotograma();
      }

      function centrarPuntero() {
        puntero.destinoX = 0;
        puntero.destinoY = 0;
        solicitarFotograma();
      }

      function actualizarVisibilidad() {
        if (document.hidden) {
          cancelAnimationFrame(fotograma);
          fotograma = 0;
          anterior = 0;
        } else {
          actualizarScroll();
        }
      }

      const observador = new IntersectionObserver(([entrada]) => {
        visible = entrada.isIntersecting;
        raiz!.dataset.visible = `${visible}`;
        if (visible) {
          actualizarScroll();
        } else {
          cancelAnimationFrame(fotograma);
          fotograma = 0;
          anterior = 0;
        }
      }, { rootMargin: "120px 0px" });
      const tamanos = new ResizeObserver(medir);

      raiz.dataset.movimiento = "activo";
      medir();
      progreso = objetivo;
      dibujar();
      observador.observe(raiz);
      tamanos.observe(raiz);
      tamanos.observe(escena);
      window.addEventListener("scroll", actualizarScroll, { passive: true });
      window.addEventListener("resize", medir, { passive: true });
      escena.addEventListener("pointermove", moverPuntero, { passive: true });
      escena.addEventListener("pointerleave", centrarPuntero);
      document.addEventListener("visibilitychange", actualizarVisibilidad);
      void document.fonts.ready.then(() => { if (!terminado) medir(); });

      return () => {
        terminado = true;
        cancelAnimationFrame(fotograma);
        observador.disconnect();
        tamanos.disconnect();
        window.removeEventListener("scroll", actualizarScroll);
        window.removeEventListener("resize", medir);
        escena.removeEventListener("pointermove", moverPuntero);
        escena.removeEventListener("pointerleave", centrarPuntero);
        document.removeEventListener("visibilitychange", actualizarVisibilidad);
        elementos.forEach((elemento) => elemento.removeAttribute("style"));
        raiz.style.removeProperty("--palta-progreso");
        delete raiz.dataset.movimiento;
        delete raiz.dataset.visible;
        raiz.dataset.etapa = "0";
      };
    }

    function aplicarPreferencia() {
      detener();
      detener = !preferencia.matches && "IntersectionObserver" in window && "ResizeObserver" in window
        ? iniciarMovimiento() : () => {};
    }

    aplicarPreferencia();
    preferencia.addEventListener("change", aplicarPreferencia);
    return () => {
      preferencia.removeEventListener("change", aplicarPreferencia);
      detener();
    };
  }, []);

  return (
    <section ref={seccion} id="esencia" className="inicio-palta-seccion" data-etapa="0" aria-labelledby="titulo-esencia">
      <div className="inicio-palta-pegajosa">
        <div className="inicio-contenedor inicio-palta-rejilla">
          <div className="inicio-palta-texto">
            <p className="inicio-antetitulo"><Leaf aria-hidden="true" /> NUESTRA ESENCIA</p>
            <h2 id="titulo-esencia">Lo esencial,<br /><em>en el centro.</em></h2>
            <p>Vos ponés el conocimiento y la cercanía. Nutrisfera conecta cada parte de tu consultorio para que puedas dedicarte a lo que te mueve.</p>
            <ol className="inicio-palta-pasos">
              {ETAPAS.map(({ numero, titulo, texto }, indice) => (
                <li key={numero} data-paso={indice}>
                  <span>{numero}</span>
                  <div><h3>{titulo}</h3><p>{texto}</p></div>
                </li>
              ))}
            </ol>
            <p className="inicio-palta-indicacion"><ArrowDown aria-hidden="true" /> Deslizá. Mirá cómo todo se conecta.</p>
          </div>

          <div className="inicio-palta-escena" aria-hidden="true">
            <div className="inicio-palta-luz" />
            <div className="inicio-palta-orbita"><i /><i /></div>
            <div className="inicio-palta-anillo" />
            <div className="inicio-palta-sombra" />
            <div className="inicio-palta-conjunto">
              <div className="inicio-palta-respiracion">
                <div className="inicio-palta-pieza inicio-palta-posterior">
                  <Image src="/imagenes/inicio/palta-mitad-posterior.webp" alt="" width={1000} height={1000} sizes="(max-width: 640px) 85vw, (max-width: 900px) 65vw, 560px" draggable={false} />
                </div>
                <div className="inicio-palta-pieza inicio-palta-frontal">
                  <Image src="/imagenes/inicio/palta-mitad-principal.webp" alt="" width={1000} height={1000} sizes="(max-width: 640px) 85vw, (max-width: 900px) 65vw, 560px" draggable={false} />
                  <span className="inicio-palta-sombra-semilla" />
                  <div className="inicio-palta-semilla">
                    <Image src="/imagenes/inicio/palta-semilla.webp" alt="" width={1000} height={1000} sizes="(max-width: 640px) 40vw, 260px" draggable={false} />
                  </div>
                </div>
              </div>
            </div>
            <span className="inicio-palta-etiqueta inicio-palta-etiqueta-criterio"><Leaf /> Tu criterio</span>
            <span className="inicio-palta-etiqueta inicio-palta-etiqueta-tiempo"><Sparkles /> Tu tiempo</span>
            <span className="inicio-palta-etiqueta inicio-palta-etiqueta-pacientes"><Heart /> Tus pacientes</span>
            <div className="inicio-palta-firma"><span /> NATURALMENTE CONECTADOS <span /></div>
          </div>
        </div>
        <div className="inicio-palta-progreso" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
