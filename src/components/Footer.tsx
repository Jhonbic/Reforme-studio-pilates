import Logo from "./Logo";
import HeroFX from "./fx/HeroFX";

const social = [
  {
    label: "Instagram",
    href: "https://instagram.com/reformestudiopilates",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.3.07 1.68.07 4.94s0 3.63-.07 4.94c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.3.06-1.69.07-4.94.07s-3.64 0-4.94-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.6 2.2 15.22 2.2 12s0-3.64.07-4.94c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.21 8.79 2.2 12 2.2Zm0 1.98c-3.16 0-3.53.01-4.78.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.25-.07 1.62-.07 4.78s.01 3.53.07 4.78c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.25.06 1.62.07 4.78.07s3.53-.01 4.78-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.25.07-1.62.07-4.78s-.01-3.53-.07-4.78c-.04-.9-.19-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32-1.25-.06-1.62-.07-4.78-.07Zm0 3.37a4.45 4.45 0 1 1 0 8.9 4.45 4.45 0 0 1 0-8.9Zm0 7.34a2.89 2.89 0 1 0 0-5.78 2.89 2.89 0 0 0 0 5.78Zm5.66-7.53a1.04 1.04 0 1 1-2.08 0 1.04 1.04 0 0 1 2.08 0Z",
  },
  {
    label: "Facebook",
    href: "https://facebook.com/reformestudiopilates",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z",
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@reformestudiopilates",
    path: "M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.1v12.36a2.52 2.52 0 0 1-2.52 2.44 2.52 2.52 0 0 1-.23-5.03v-3.15a5.62 5.62 0 1 0 5.85 5.61V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.15-1.48Z",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/573209078814",
    path: "M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.25h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0 0 12.04 2Zm0 1.82c2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.75c0 4.5-3.66 8.15-8.16 8.15a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.07.8.82-2.99-.2-.31a8.1 8.1 0 0 1-1.25-4.33c0-4.5 3.66-8.15 8.16-8.15Zm-2.9 4.4c-.14 0-.36.05-.55.25-.19.2-.72.7-.72 1.72s.74 2 .84 2.13c.1.14 1.44 2.2 3.5 3.09.49.21.87.34 1.17.43.49.16.94.13 1.29.08.39-.06 1.2-.49 1.37-.96.17-.47.17-.87.12-.96-.05-.08-.19-.13-.4-.24-.2-.1-1.2-.59-1.39-.66-.19-.07-.32-.1-.46.1-.14.2-.53.66-.65.8-.12.14-.24.15-.44.05-.2-.1-.85-.31-1.62-1a6.1 6.1 0 0 1-1.12-1.39c-.12-.2-.01-.31.09-.41.09-.09.2-.24.3-.36.1-.12.13-.2.2-.34.06-.14.03-.26-.02-.36-.05-.1-.44-1.12-.62-1.53-.16-.4-.32-.35-.44-.35Z",
  },
];

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="relative overflow-hidden bg-verde text-arena"
    >
      <HeroFX className="z-0" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          {/* Marca */}
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <div className="text-arena">
              <Logo
                size={40}
                layout="stacked"
                href="/"
                className="items-center md:items-start"
              />
            </div>
            <p className="max-w-xs font-display text-xl italic text-beige">
              Movimiento con Propósito.
            </p>
            <div className="flex justify-center gap-4 pt-2 md:justify-start">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-arena/25 text-arena transition-all duration-300 hover:border-dorado hover:bg-dorado hover:text-verde-900"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Contacto */}
          <div className="text-center md:text-left">
            <h3 className="eyebrow text-dorado-light">Visítanos</h3>
            <address className="mt-5 space-y-3 text-sm not-italic text-beige">
              <p>
                Carrera 1 #27-50
                <br />
                Multiplaza Chaira
                <br />
                Florencia, Caquetá
              </p>
              <p>
                <a
                  href="tel:+573209078814"
                  className="transition-colors duration-300 hover:text-dorado"
                >
                  +57 320 9078814
                </a>
              </p>
              <p className="text-dorado-light">Reserva tu clase hoy</p>
            </address>
          </div>
        </div>

        <div className="mt-14 rule-gold opacity-40" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-center text-xs text-beige/70 sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} Reforme Studio Pilates. Todos los
            derechos reservados.
          </p>
          <p>Florencia · Caquetá · Colombia</p>
        </div>
      </div>
    </footer>
  );
}
