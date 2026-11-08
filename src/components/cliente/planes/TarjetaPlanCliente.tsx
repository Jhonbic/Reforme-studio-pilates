import { fecha, moneda } from "@/lib/admin/format";
import type { ModalidadPlan } from "@/lib/admin/types";

/** Lo que la tarjeta necesita, ya calculado en el servidor (precio de hoy,
 *  oferta que manda, enlace de WhatsApp). */
export type PlanParaTarjeta = {
  id: string;
  nombre: string;
  modalidad: ModalidadPlan;
  vigenciaDias: number;
  /** Lo que pagaría hoy (con la oferta, si hay). */
  precio: number;
  precioLista: number;
  /** La oferta que se le aplica (apertura o descuento del plan), o `null`. */
  oferta: { pct: number; hasta: string | null; nombre: string } | null;
  beneficios: string[];
  destacado: boolean;
  /** Es el plan que tiene ahora. */
  actual: boolean;
  /** WhatsApp con el plan ya escrito, o `null` si no hay teléfono. */
  enlace: string | null;
};

/** Un icono por modalidad, en el cuadro de borde dorado de la cabecera. */
function IconoModalidad({ modalidad }: { modalidad: ModalidadPlan }) {
  const d =
    modalidad === "Reformer"
      ? "M3 16h18M5 16v3m14-3v3M6 12h12a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2Zm3-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
      : modalidad === "Mat"
        ? "M4 18h16M6 18c0-4 2-6 6-6s6 2 6 6M12 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        : "M12 3v4m0 10v4M3 12h4m10 0h4M6.3 6.3l2.8 2.8m5.8 5.8 2.8 2.8m0-11.4-2.8 2.8m-5.8 5.8-2.8 2.8";
  return (
    <svg
      className="size-6 text-dorado-light"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Un plan en la vista del cliente (nov 2026), con la estructura de las
 * tarjetas de DEMO adminGym y la marca de Reforme: cabecera verde con icono,
 * nombre y pastillas; precio grande (con el de antes tachado si hay oferta);
 * lo que incluye con ✓; y «Adquirir», que abre WhatsApp con el plan escrito.
 *
 * El DESTACADO (lo marca Administración) lleva la cinta «★ Plan destacado»,
 * borde dorado, un brillo que cruza la cabecera y un resplandor dorado. Todo
 * quieto con `prefers-reduced-motion`.
 */
export default function TarjetaPlanCliente({ plan: p }: { plan: PlanParaTarjeta }) {
  return (
    <article
      className={`relative flex w-full flex-col overflow-hidden rounded-3xl bg-white ${
        p.destacado ? "plan-destacado border-2 border-dorado lg:scale-[1.03]" : "border border-beige shadow-soft"
      }`}
    >
      {p.destacado && (
        <p className="flex items-center justify-center gap-1.5 bg-dorado py-1.5 text-xs font-bold uppercase tracking-widest text-verde-900">
          <span aria-hidden="true">★</span> Plan destacado
        </p>
      )}

      <header className="relative overflow-hidden bg-gradient-to-br from-verde to-verde-900 px-6 py-6 text-arena">
        {p.destacado && <span className="brillo-plan" aria-hidden="true" />}
        <div className="flex size-11 items-center justify-center rounded-xl border border-dorado">
          <IconoModalidad modalidad={p.modalidad} />
        </div>
        <h3 className="mt-4 font-display text-3xl leading-tight">{p.nombre}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.oferta && (
            <span className="inline-flex items-center rounded-full bg-dorado px-3 py-0.5 text-xs font-bold text-verde-900">
              −{p.oferta.pct} % · {p.oferta.nombre}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-0.5 text-xs text-beige">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {p.vigenciaDias} días de vigencia
          </span>
          {p.actual && (
            <span className="inline-flex items-center rounded-full border border-dorado-light/60 px-3 py-0.5 text-xs text-dorado-light">
              ✓ Tu plan
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div>
          {p.oferta && (
            <p className="text-sm text-verde-300">
              Antes <s className="font-cifra">{moneda(p.precioLista)}</s>
            </p>
          )}
          <p className="flex flex-wrap items-end gap-x-1.5">
            <span className={`font-cifra text-4xl font-light ${p.oferta ? "text-dorado-tinta" : "text-verde"}`}>
              {moneda(p.precio)}
            </span>
            <span className="mb-1 text-sm text-verde-300">COP</span>
          </p>
          {p.oferta && (
            <p className="mt-1 text-xs font-semibold text-dorado-tinta">
              {p.oferta.hasta ? `Hasta el ${fecha(p.oferta.hasta, true)}` : "Por tiempo limitado"}
            </p>
          )}
        </div>

        <div className="border-t border-beige" />

        <ul className="flex-1 space-y-2">
          {p.beneficios.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm leading-snug text-verde-700">
              <svg className="mt-0.5 size-4 shrink-0 text-dorado" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {p.enlace && (
          <a
            href={p.enlace}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-medium transition-colors duration-300 ${
              p.destacado || p.oferta
                ? "bg-dorado text-verde-900 hover:bg-dorado-dark"
                : "bg-verde text-arena hover:bg-verde-900"
            }`}
            aria-label={`Pedir el plan ${p.nombre} por WhatsApp`}
          >
            {p.actual ? "Renovar" : "Adquirir"}
          </a>
        )}
      </div>
    </article>
  );
}
