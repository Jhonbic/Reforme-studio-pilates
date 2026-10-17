import { describe, expect, it } from "vitest";
import { erroresRegistro, esMenorDeEdad, type FichaRegistro } from "./registro";

const HOY = "2026-10-17";

/** Una ficha de adulto que pasa todo; cada test rompe una cosa. */
const ADULTO: FichaRegistro = {
  nombre: "Laura Gutiérrez",
  tipoIdentificacion: "C.C.",
  identificacion: "1045678912",
  fechaNacimiento: "1995-03-14",
  correo: "laura@correo.com",
  telefono: "3209078814",
  direccion: "Cra 1 #27-50, barrio Centro",
  emergenciaNombre: "Marta Gutiérrez",
  emergenciaTelefono: "3101234567",
  acudiente: { nombre: "", identificacion: "", telefono: "" },
  contrasena: "secreta123",
  aceptaTerminos: true,
};

const MENOR: FichaRegistro = {
  ...ADULTO,
  tipoIdentificacion: "T.I.",
  identificacion: "1100223344",
  fechaNacimiento: "2012-05-01",
  acudiente: { nombre: "Marta Gutiérrez", identificacion: "40123456", telefono: "3101234567" },
};

describe("esMenorDeEdad", () => {
  it("cumplir 18 HOY ya es ser mayor", () => {
    expect(esMenorDeEdad("2008-10-17", HOY)).toBe(false);
    expect(esMenorDeEdad("2008-10-18", HOY)).toBe(true);
  });

  it("sin fecha o sin «hoy» no se sabe: nunca se da por mayor", () => {
    expect(esMenorDeEdad("", HOY)).toBeNull();
    expect(esMenorDeEdad("2012-05-01", "")).toBeNull();
  });
});

describe("erroresRegistro", () => {
  it("un adulto con todo bien se puede registrar", () => {
    expect(erroresRegistro(ADULTO, HOY)).toEqual({});
  });

  it("todo es obligatorio: fecha, dirección y contacto de emergencia también", () => {
    const e = erroresRegistro(
      { ...ADULTO, fechaNacimiento: "", direccion: " ", emergenciaNombre: "", emergenciaTelefono: "" },
      HOY,
    );
    expect(Object.keys(e).sort()).toEqual(
      ["direccion", "emergenciaNombre", "emergenciaTelefono", "fechaNacimiento"].sort(),
    );
  });

  it("una fecha futura no es una fecha de nacimiento", () => {
    expect(erroresRegistro({ ...ADULTO, fechaNacimiento: "2027-01-01" }, HOY).fechaNacimiento).toBeTruthy();
  });

  it("un adulto no puede ponerse a sí mismo como emergencia", () => {
    expect(
      erroresRegistro({ ...ADULTO, emergenciaTelefono: ADULTO.telefono }, HOY).emergenciaTelefono,
    ).toBeTruthy();
  });

  it("a un adulto no se le piden datos de acudiente", () => {
    const e = erroresRegistro(ADULTO, HOY);
    expect(e.acudienteNombre ?? e.acudienteIdentificacion ?? e.acudienteTelefono).toBeUndefined();
  });

  it("un menor con su acudiente se puede registrar", () => {
    expect(erroresRegistro(MENOR, HOY)).toEqual({});
  });

  it("un menor sin acudiente no", () => {
    const e = erroresRegistro({ ...MENOR, acudiente: { nombre: "", identificacion: "", telefono: "" } }, HOY);
    expect(e.acudienteNombre && e.acudienteIdentificacion && e.acudienteTelefono).toBeTruthy();
  });

  it("el documento del acudiente no puede ser el del menor", () => {
    const e = erroresRegistro(
      { ...MENOR, acudiente: { ...MENOR.acudiente, identificacion: MENOR.identificacion } },
      HOY,
    );
    expect(e.acudienteIdentificacion).toBeTruthy();
  });

  it("un menor no tiene cédula de ciudadanía", () => {
    expect(erroresRegistro({ ...MENOR, tipoIdentificacion: "C.C." }, HOY).identificacion).toBeTruthy();
  });

  it("a un menor sí se le deja el mismo teléfono que su emergencia (puede ser el de su madre)", () => {
    expect(erroresRegistro({ ...MENOR, telefono: MENOR.emergenciaTelefono }, HOY)).toEqual({});
  });

  it("si es menor, los términos los acepta el acudiente, y el mensaje lo dice", () => {
    expect(erroresRegistro({ ...MENOR, aceptaTerminos: false }, HOY).aceptaTerminos).toMatch(/acudiente/);
  });
});
