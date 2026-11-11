import { describe, expect, it } from "vitest";
import { crearHtmlRecordatorioCobro, crearMensajeRecordatorioCobro, type DatosCorreoRecordatorio } from "@/servicios/correos/recordatorio-cobro";

const datos: DatosCorreoRecordatorio = {
  paciente: "Alberto", consulta: "2026-11-11T01:00:00Z", original: 35000, abonado: 10000,
  saldo: 25000, moneda: "ARS", nombre_remitente: "Consultorio de Daniel", instrucciones: "", texto: "Te recordamos tu saldo pendiente.", zona: "America/Argentina/Buenos_Aires",
};

describe("presentación del recordatorio de cobro", () => {
  it("identifica las muestras tanto en HTML como en texto y asunto", () => {
    const mensaje = crearMensajeRecordatorioCobro({ ...datos, correo: "paciente@prueba.test", prueba: true }, "consultorio@prueba.test", "muestra");
    expect(mensaje.to).toBe("paciente@prueba.test");
    expect(mensaje.subject).toMatch(/^\[PRUEBA\]/);
    expect(mensaje.text).toContain("SIN COBRO REAL");
    expect(mensaje.html).toContain("SIN COBRO REAL");
  });
  it("muestra el saldo validado y la fecha del consultorio sin dirigir al paciente a la facturación profesional", () => {
    const html = crearHtmlRecordatorioCobro(datos);
    expect(html).toContain("25.000,00");
    expect(html).toContain("35.000,00");
    expect(html).toContain("10.000,00");
    expect(html).toContain("10 de noviembre de 2026");
    expect(html).toContain("En nombre de Consultorio de Daniel");
    expect(html).toContain("Comunicate con el consultorio por tus canales habituales");
    expect(html).not.toContain("/panel/facturacion");
    expect(html).not.toContain("MUESTRA DE DISEÑO");
  });

  it("escapa los campos del paciente y del consultorio, conservando saltos de línea", () => {
    const html = crearHtmlRecordatorioCobro({ ...datos, paciente: '<img src=x onerror="alert(1)">', nombre_remitente: '<script>Daniel</script>', texto: "Saldo & cuenta", instrucciones: '<a href="https://ajeno.test">Pagar</a>\nSegunda línea', prueba: true });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="https://ajeno.test"');
    expect(html).toContain("Saldo &amp; cuenta");
    expect(html).toContain("<br>Segunda línea");
    expect(html).toContain("MUESTRA DE DISEÑO · SIN COBRO REAL");
  });
});

it('enlaza al turno del portal tanto en HTML como en texto',()=>{const mensaje=crearMensajeRecordatorioCobro({...datos,correo:'paciente@prueba.test',turno_id:'11111111-1111-4111-8111-111111111111'},'consultorio@prueba.test','muestra');expect(mensaje.html).toContain('/portal/turnos?turno=11111111-1111-4111-8111-111111111111');expect(mensaje.text).toContain('/portal/turnos?turno=');});
