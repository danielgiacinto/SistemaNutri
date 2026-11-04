import { describe, expect, it } from "vitest";
import { distribuirTurnos, intervaloDelDia } from "@/componentes/agenda/distribucion-turnos";

const zona = "America/Argentina/Buenos_Aires";
const dia = "2026-11-03";
describe("ubicación de turnos en la agenda", () => {
  it("conserva los minutos de inicio y la duración de un turno fuera de la media hora", () => {
    const eventos = distribuirTurnos([{ inicio: "2026-11-03T12:15:00Z", fin: "2026-11-03T13:00:00Z" }], dia, zona);
    expect(eventos[0]).toMatchObject({ desde: 555, hasta: 600, carriles: 1 });
  });
  it("separa los eventos superpuestos y devuelve el ancho completo al siguiente grupo", () => {
    const eventos = distribuirTurnos([
      { inicio: "2026-11-03T12:00:00Z", fin: "2026-11-03T13:00:00Z" },
      { inicio: "2026-11-03T12:30:00Z", fin: "2026-11-03T13:15:00Z" },
      { inicio: "2026-11-03T14:00:00Z", fin: "2026-11-03T14:45:00Z" },
    ], dia, zona);
    expect(eventos.map(({ carril, carriles }) => [carril, carriles])).toEqual([[0, 2], [1, 2], [0, 1]]);
  });
  it("recorta un evento que cruza medianoche y excluye los días ajenos", () => {
    const evento = { inicio: "2026-11-04T02:30:00Z", fin: "2026-11-04T03:30:00Z" };
    expect(intervaloDelDia(evento, dia, zona)).toEqual({ desde: 1410, hasta: 1440 });
    expect(intervaloDelDia(evento, "2026-11-04", zona)).toEqual({ desde: 0, hasta: 30 });
    expect(intervaloDelDia(evento, "2026-11-05", zona)).toBeNull();
  });
});
