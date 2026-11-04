import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const estilos = readFileSync(new URL("src/app/globals.css", raiz), "utf8");
const trazos = JSON.parse(readFileSync(new URL("src/configuracion/palta.json", raiz), "utf8"));
const { inclinacionPalta } = JSON.parse(readFileSync(new URL("src/configuracion/marca.json", raiz), "utf8"));
function color(nombre) {
  const valor = estilos.match(new RegExp(`--${nombre}:\\s*([^;]+);`))?.[1];
  if (!valor) throw new Error(`Falta el token ${nombre} en globals.css.`);
  return valor;
}
const dibujo = `    <g transform="rotate(${inclinacionPalta} 32 40)">\n` + trazos.map(({ color: nombre, trazo }) => `      <path d="${trazo}" fill="${color(nombre)}"/>`).join("\n") + "\n    </g>";
const icono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">\n  <!-- Generado por scripts/generar-icono.mjs desde los trazos y tokens de marca. -->\n  <rect width="80" height="80" rx="23" fill="${color("palta-fondo")}"/>\n  <g transform="translate(10 3) scale(.94)">\n${dibujo}\n  </g>\n</svg>\n`;
writeFileSync(new URL("src/app/icon.svg", raiz), icono);
console.log(`Icono actualizado: ${fileURLToPath(new URL("src/app/icon.svg", raiz))}`);
