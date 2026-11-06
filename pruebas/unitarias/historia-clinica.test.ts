import { describe, expect, it } from "vitest";
import { obtenerLineaDeTiempo } from "@/servicios/linea-tiempo";
import { listarEvolucionesDelTurno } from "@/servicios/evoluciones";
import type { ClienteSupabase } from "@/lib/supabase/servidor";

function clienteDePrueba(filas: unknown[]) {
  const tablas: string[] = [];
  const filtros: [string, string][] = [];
  const consulta = {
    select() { return consulta; },
    eq(campo: string, valor: string) { filtros.push([campo, valor]); return consulta; },
    async order() { return { data: filas, error: null }; },
  };
  const cliente = { from(tabla: string) { tablas.push(tabla); return consulta; } } as unknown as ClienteSupabase;
  return { cliente, tablas, filtros };
}

describe("historia clínica y relación con turnos", () => {
  it("consulta solo evoluciones del paciente y conserva borradores y notas privadas", async () => {
    const prueba = clienteDePrueba([
      { id: "primera", creado_en: "2026-11-04", titulo: "Consulta", contenido: "Nota privada", es_borrador: false, visible_para_paciente: false },
      { id: "segunda", creado_en: "2026-11-06", titulo: "", contenido: "En preparación", es_borrador: true, visible_para_paciente: false },
    ]);
    const eventos = await obtenerLineaDeTiempo(prueba.cliente, "consultorio", "paciente");
    expect(prueba.tablas).toEqual(["evoluciones"]);
    expect(prueba.filtros).toContainEqual(["consultorio_id", "consultorio"]);
    expect(prueba.filtros).toContainEqual(["paciente_id", "paciente"]);
    expect(eventos.map(evento => evento.destacado)).toEqual(["Borrador", "Privada"]);
    expect(eventos[0].href).toBe("/panel/pacientes/paciente/historia/segunda");
  });

  it("restringe las evoluciones vinculadas al consultorio, paciente y turno solicitados", async () => {
    const prueba = clienteDePrueba([]);
    await listarEvolucionesDelTurno(prueba.cliente, "consultorio", "paciente", "turno");
    expect(prueba.filtros).toEqual([["consultorio_id", "consultorio"], ["paciente_id", "paciente"], ["turno_id", "turno"]]);
  });
});
