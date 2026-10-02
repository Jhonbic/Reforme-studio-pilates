import type { Metadata } from "next";
import { Cormorant, Lato } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/fx/SmoothScroll";
import { URL_SITIO } from "@/lib/sitio";

// Tipografía principal (títulos): elegante, atemporal
const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Tipografía secundaria (cuerpo)
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Base de las URL absolutas: la imagen para compartir y el sitemap tienen
  // que ser absolutas para WhatsApp y las redes. Ver `lib/sitio.ts`.
  metadataBase: new URL(URL_SITIO),
  title: "Reforme Studio Pilates — Movimiento con Propósito",
  description:
    "Un espacio creado para experimentar el Pilates a través de una vivencia elegante y personalizada, enfocada en tu bienestar integral. Florencia, Caquetá.",
  openGraph: {
    title: "Reforme Studio Pilates — Movimiento con Propósito",
    description:
      "Un espacio para experimentar el Pilates de forma elegante, personalizada y consciente. Florencia, Caquetá.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-arena text-verde font-sans">
        <SmoothScroll />
        {children}
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
