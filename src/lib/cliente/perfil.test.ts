import { describe, expect, it } from "vitest";
import { erroresPerfil, hayCambios, type MisDatosEditables } from "./perfil";

const BIEN: MisDatosEditables = {
  telefono: "3001112233",
  direccion: "Calle 12 # 3-45, La Estrella",
  eps: "Sura",
  emergenciaNombre: "Marta Gil",
  emergenciaTelefono: "3112223344",
};

describe("datos que el cliente corrige en Mi perfil", () => {
  it("unos datos completos y correctos no tienen errores", () => {
    expect(erroresPerfil(BIEN, false)).toEqual({});
    // La EPS es opcional: los clientes antiguos no la tienen.
    expect(erroresPerfil({ ...BIEN, eps: "" }, false)).toEqual({});
  });

  it("las mismas reglas que el registro: móvil colombiano, dirección completa, nombre y apellido", () => {
    expect(erroresPerfil({ ...BIEN, telefono: "6012345678" }, false).telefono).toMatch(/móvil/);
    expect(erroresPerfil({ ...BIEN, direccion: "Cl 1" }, false).direccion).toMatch(/completa/);
    expect(erroresPerfil({ ...BIEN, emergenciaNombre: "Marta" }, false).emergenciaNombre).toMatch(/apellido/);
  });

  it("un adulto no puede ser su propio contacto de emergencia; un menor sí", () => {
    const mismo = { ...BIEN, emergenciaTelefono: BIEN.telefono };
    expect(erroresPerfil(mismo, false).emergenciaTelefono).toMatch(/otra persona/);
    expect(erroresPerfil(mismo, null).emergenciaTelefono).toMatch(/otra persona/);
    expect(erroresPerfil(mismo, true)).toEqual({});
  });

  it("«Guardar» solo se enciende si algo cambió (los espacios no cuentan)", () => {
    expect(hayCambios(BIEN, { ...BIEN, direccion: ` ${BIEN.direccion} ` })).toBe(false);
    expect(hayCambios(BIEN, { ...BIEN, eps: "Sanitas" })).toBe(true);
  });
});
