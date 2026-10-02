import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * La imagen que sale al compartir el enlace (WhatsApp, Instagram, Facebook).
 * Antes el enlace salía sin miniatura.
 *
 * Se genera en el build con la marca: el logo OFICIAL (`public/logo-reforme.png`,
 * trazo verde sobre transparente), Cormorant para el titular y Lato para el
 * texto, sobre el blanco cálido de la web. Fondo claro a propósito: el logo
 * oficial es verde, y el motor de esta imagen no admite `filter` para
 * pintarlo en blanco como hace el hero.
 *
 * Las fuentes van como archivo (`assets/fonts/`, licencia OFL) porque las de
 * `next/font` no se pueden leer desde aquí.
 */
export const alt = "Reforme Studio Pilates — Movimiento con Propósito. Florencia, Caquetá.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VERDE = "#284435";
const DORADO = "#BE9B69";
const ARENA = "#F7F6F3";

export default async function Image() {
  const raiz = process.cwd();
  const [cormorant, lato, logo] = await Promise.all([
    readFile(join(raiz, "assets/fonts/Cormorant-Medium.ttf")),
    readFile(join(raiz, "assets/fonts/Lato-Regular.ttf")),
    readFile(join(raiz, "public/logo-reforme.png")),
  ]);
  const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: ARENA,
          padding: "0 90px",
          gap: 80,
          // Franja verde abajo: la marca de la web, sin competir con el logo.
          borderBottom: `24px solid ${VERDE}`,
        }}
      >
        {/* El PNG mide 554×328: se respeta la proporción.
            `<img>` y no `<Image>` de Next: esto no es una página sino la
            plantilla de `ImageResponse`, que solo entiende HTML básico. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} width={388} height={230} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Lato", fontSize: 24, letterSpacing: 8, color: DORADO }}>
            FLORENCIA · CAQUETÁ
          </div>
          <div
            style={{
              fontFamily: "Cormorant",
              fontSize: 78,
              lineHeight: 1.05,
              color: VERDE,
              marginTop: 18,
            }}
          >
            Movimiento con Propósito
          </div>
          <div style={{ width: 120, height: 3, background: DORADO, margin: "28px 0" }} />
          <div style={{ fontFamily: "Lato", fontSize: 30, color: "#3f5a4b", lineHeight: 1.35 }}>
            Pilates Reformer en grupos reducidos. Reserva tu clase en línea.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: cormorant, style: "normal", weight: 500 },
        { name: "Lato", data: lato, style: "normal", weight: 400 },
      ],
    },
  );
}
