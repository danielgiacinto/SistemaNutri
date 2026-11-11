import { readFileSync, writeFileSync } from "node:fs";

const estilos = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const paleta = Object.fromEntries([...estilos.matchAll(/--correo-([a-z]+):\s*(#[a-f0-9]{6});/g)].map(([, nombre, valor]) => [nombre, valor]));
if (Object.keys(paleta).length !== 7) throw new Error("Revisá los tokens de correo en globals.css.");
writeFileSync(new URL("../src/configuracion/paleta-correo.json", import.meta.url), JSON.stringify(paleta, null, 2) + "\n");
