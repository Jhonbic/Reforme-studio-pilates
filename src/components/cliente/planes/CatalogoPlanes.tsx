"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { moneda } from "@/lib/admin/format";
import type { ModalidadPlan } from "@/lib/admin/types";
import { MODALIDADES } from "@/lib/cliente/planes";
import TarjetaPlanCliente, { type PlanParaTarjeta } from "./TarjetaPlanCliente";

/**
 * El catálogo en pestañas por modalidad (Mat · Reformer · Fusión), decisión
 * del usuario: en el móvil, nueve tarjetas seguidas eran mucho scroll. Cada
 * pestaña dice desde cuánto y lleva ★ si tiene el plan destacado.
 *
 * Pestañas ARIA de verdad: `tablist`, flechas izquierda/derecha para moverse
 * (y Inicio/Fin), y solo la pestaña activa en el orden de tabulación.
 *
 * El destacado va PRIMERO en el móvil (es lo primero que se ve) y en su sitio
 * por precio en escritorio, donde las tres caben a la vez.
 */
export default function CatalogoPlanes({
  planes,
  inicial,
}: {
  planes: PlanParaTarjeta[];
  inicial: ModalidadPlan;
}) {
  const modalidades = MODALIDADES.filter((m) => planes.some((p) => p.modalidad === m));
  const [activa, setActiva] = useState<ModalidadPlan>(modalidades.includes(inicial) ? inicial : modalidades[0]);
  const botones = useRef<Partial<Record<ModalidadPlan, HTMLButtonElement | null>>>({});

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const destino =
      e.key === "ArrowRight"
        ? (i + 1) % modalidades.length
        : e.key === "ArrowLeft"
          ? (i - 1 + modalidades.length) % modalidades.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? modalidades.length - 1
              : null;
    if (destino === null) return;
    e.preventDefault();
    const m = modalidades[destino];
    setActiva(m);
    botones.current[m]?.focus();
  }

  if (modalidades.length === 0) return null;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Modalidad"
        className="grid grid-cols-3 gap-1 rounded-full border border-beige bg-white p-1 shadow-soft sm:mx-auto sm:max-w-xl"
        style={{ gridTemplateColumns: `repeat(${modalidades.length}, minmax(0, 1fr))` }}
      >
        {modalidades.map((m, i) => {
          const sel = m === activa;
          const delGrupo = planes.filter((p) => p.modalidad === m);
          const desde = Math.min(...delGrupo.map((p) => p.precio));
          const conDestacado = delGrupo.some((p) => p.destacado);
          return (
            <button
              key={m}
              ref={(el) => {
                botones.current[m] = el;
              }}
              type="button"
              role="tab"
              id={`pestana-${m}`}
              aria-selected={sel}
              aria-controls={`panel-${m}`}
              tabIndex={sel ? 0 : -1}
              onClick={() => setActiva(m)}
              onKeyDown={(e) => alTeclear(e, i)}
              className={`flex min-h-[52px] flex-col items-center justify-center rounded-full px-2 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado ${
                sel ? "bg-verde text-arena" : "text-verde-700 hover:bg-arena"
              }`}
            >
              <span className="text-sm font-bold">
                {m}
                {conDestacado && (
                  <span aria-label=", con plan destacado" className={sel ? "text-dorado-light" : "text-dorado"}>
                    {" "}★
                  </span>
                )}
              </span>
              <span className={`text-[11px] ${sel ? "text-beige/80" : "text-verde-300"}`}>
                desde <span className="font-cifra">{moneda(desde)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {modalidades.map((m) => (
        <div
          key={m}
          role="tabpanel"
          id={`panel-${m}`}
          aria-labelledby={`pestana-${m}`}
          hidden={m !== activa}
          className="grid gap-6 pt-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {planes
            .filter((p) => p.modalidad === m)
            .map((p) => (
              <div key={p.id} className={`flex ${p.destacado ? "order-first lg:order-none" : ""}`}>
                <TarjetaPlanCliente plan={p} />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
