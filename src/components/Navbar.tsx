"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { ButtonLink } from "./ui/Button";

const links = [
  { href: "/#estudio", label: "El estudio" },
  { href: "/#experiencia", label: "Experiencia" },
  { href: "/#ubicacion", label: "Ubicación" },
];

// Redes para el pie del drawer móvil (coherentes con el Footer)
const social = [
  { label: "Instagram", href: "https://instagram.com/reformestudiopilates" },
  { label: "Facebook", href: "https://facebook.com/reformestudiopilates" },
  { label: "TikTok", href: "https://tiktok.com/@reformestudiopilates" },
  { label: "WhatsApp", href: "https://wa.me/573209078814" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Bloquear scroll con el menú móvil abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cerrar con Escape y al pasar a escritorio
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  const solid = scrolled;
  const lightText = !solid;

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? "bg-arena/85 backdrop-blur-md shadow-soft py-3"
          : "bg-transparent py-5"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
        <div className={lightText ? "text-arena" : "text-verde"}>
          <Logo size={34} layout="horizontal" />
        </div>

        {/* Enlaces — escritorio */}
        <ul
          className={`hidden items-center gap-9 md:flex ${
            solid ? "text-verde" : "text-arena"
          }`}
        >
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="relative text-sm tracking-wide transition-colors duration-300 hover:text-dorado after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-dorado after:transition-all after:duration-300 hover:after:w-full"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Acciones — escritorio */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`text-sm font-medium tracking-wide transition-colors duration-300 hover:text-dorado ${
              solid ? "text-verde" : "text-arena"
            }`}
          >
            Iniciar sesión
          </Link>
          <ButtonLink href="/registro" variant="gold" size="sm">
            Registrarse
          </ButtonLink>
        </div>

        {/* Botón hamburguesa — móvil (abre el drawer) */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-menu"
          className={`-mr-2 flex h-11 w-11 items-center justify-center md:hidden ${
            lightText ? "text-arena" : "text-verde"
          }`}
        >
          <span className="relative block h-4 w-6" aria-hidden="true">
            <span className="absolute left-0 top-0 block h-px w-6 bg-current" />
            <span className="absolute left-0 top-2 block h-px w-6 bg-current" />
            <span className="absolute left-0 top-4 block h-px w-6 bg-current" />
          </span>
        </button>
      </nav>

      {/* Barra de progreso de lectura, anclada al borde inferior del header */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-500 ${
          solid ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-dorado-dark via-dorado to-dorado-light transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      </header>

      {/* ============ SCRIM (fondo oscurecido) ============ */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[55] bg-verde-900/50 backdrop-blur-sm transition-opacity duration-500 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ============ DRAWER MÓVIL — entra desde la derecha ============ */}
      <aside
        id="mobile-menu"
        aria-hidden={!open}
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 right-0 z-[60] flex w-[82%] max-w-sm flex-col bg-arena text-verde shadow-lift transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Cabecera del drawer: logo + cerrar */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="text-verde">
            <Logo size={30} layout="horizontal" />
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-verde transition-colors duration-300 hover:text-dorado"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Enlaces principales — Cormorant */}
        <nav className="flex-1 overflow-y-auto px-6 pt-4">
          <ul className="flex flex-col">
            {links.map((l, i) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
                  className={`block border-b border-beige py-4 font-display text-3xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-dorado-dark motion-reduce:translate-x-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
                    open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Acciones de cuenta */}
          <div className="mt-8 flex flex-col gap-3">
            <ButtonLink
              href="/registro"
              variant="gold"
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              Reservar mi clase
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="outline"
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpen(false)}
            >
              Iniciar sesión
            </ButtonLink>
          </div>
        </nav>

        {/* Pie: redes + teléfono */}
        <div className="px-6 pb-8 pt-6">
          <div className="rule-gold opacity-50" />
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-verde-700">
            {social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-dorado-dark"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="tel:+573209078814"
            className="mt-3 block font-display text-xl text-dorado-dark transition-colors duration-300 hover:text-dorado"
          >
            +57 320 9078814
          </a>
        </div>
      </aside>
    </>
  );
}
