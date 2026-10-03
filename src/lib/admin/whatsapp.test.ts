import { describe, expect, it } from "vitest";
import { cuandoVence, enlaceWhatsApp, mensajeRecordatorio, primerNombre } from "./whatsapp";

describe("WhatsApp", () => {
  it("sin un móvil colombiano completo no hay enlace (sería un botón que lleva a un error)", () => {
    expect(enlaceWhatsApp(null, "hola")).toBeNull();
    expect(enlaceWhatsApp("320907", "hola")).toBeNull();
    expect(enlaceWhatsApp("6012345678", "hola")).toBeNull();
    expect(enlaceWhatsApp("3209078814", "hola y adiós")).toBe(
      "https://wa.me/573209078814?text=hola%20y%20adi%C3%B3s",
    );
  });

  it("el mensaje usa el primer nombre y dice cuándo vence en palabras", () => {
    expect(primerNombre("  Laura Gómez Rojas ")).toBe("Laura");
    expect(cuandoVence("2026-10-15", "2026-10-15")).toBe("hoy");
    expect(cuandoVence("2026-10-16", "2026-10-15")).toBe("mañana");
    expect(mensajeRecordatorio("Laura Gómez", "Mensual", "2026-10-16", "2026-10-15")).toContain(
      "Hola, Laura. Te escribimos de Reforme Studio Pilates: tu plan Mensual vence mañana.",
    );
  });
});
