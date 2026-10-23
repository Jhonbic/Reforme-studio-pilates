import { ImageResponse } from "next/og";

/**
 * El icono de la pestaña y de la pantalla de inicio del móvil (oct 2026): el
 * isotipo en arena sobre el verde de marca. Sustituye al favicon de plantilla
 * de create-next-app.
 *
 * El trazo es mucho más grueso que el del `Isotype` de la web (3 de 240): a
 * 32 px aquel se quedaba en medio píxel y no se veía.
 */
export function iconoMarca(lado: number, redondeo: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#284435",
          borderRadius: redondeo,
        }}
      >
        <svg width={lado * 0.78} height={lado * 0.78 * (130 / 240)} viewBox="0 -6 240 136" fill="none">
          <ellipse cx="119" cy="14" rx="11" ry="13" transform="rotate(-12 119 14)" fill="#E8E1D9" />
          <path
            d="M18 104 C 55 104, 78 52, 120 48 C 168 44, 178 84, 214 92"
            stroke="#E8E1D9"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M120 60 C 150 58, 150 92, 176 92 C 196 92, 200 82, 214 76"
            stroke="#D4BD96"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { width: lado, height: lado },
  );
}
