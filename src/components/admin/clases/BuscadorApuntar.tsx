"use client";

import { useEffect, useState } from "react";
import { disponiblesParaClase } from "@/lib/admin/acciones";
import { documento, numero } from "@/lib/admin/format";
import type { ClaseEnAgenda } from "@/lib/admin/types";
import { normalizar, soloDigitos } from "@/lib/validacion";
import type { ClienteParaReservar } from "./ReservasClase";

const APUNTAR =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-dorado px-4 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark disabled:cursor-not-allowed disabled:bg-beige disabled:text-verde-300";

/** Cuántos resultados se enseñan: más no se leen en un diálogo. */
const MAXIMO = 6;

/**
 * «Apuntar a»: buscar un cliente por nombre o cédula y apuntarlo.
 *
 * Sustituye al desplegable con TODOS los clientes, que no tenía buscador
 * (con cien clientes era imposible) y no decía nada del saldo: recepción se
 * enteraba de que a alguien no le quedaban clases al estrellarse contra el
 * error. Ahora cada resultado dice «Le quedan 2 de Mat» o por qué no se puede
 * («Sin clases de Mat», «Sin plan ese día») ANTES de pulsar.
 *
 * El saldo se pide a la base al abrir (`disponibles_para`, para el día y la
 * modalidad de ESTA clase); hasta que llega, el botón ya funciona y la base
 * decide igual.
 */
export default function BuscadorApuntar({
  clase,
  clientes,
  enCurso,
  onApuntar,
}: {
  clase: ClaseEnAgenda;
  /** Los que todavía no están en la clase. */
  clientes: ClienteParaReservar[];
  enCurso: boolean;
  onApuntar: (c: ClienteParaReservar) => void;
}) {
  const [texto, setTexto] = useState("");
  /* `undefined` = cargando · `null` = privada (no descuenta) · mapa = saldo. */
  const [saldo, setSaldo] = useState<Record<string, number> | null | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    disponiblesParaClase(clase.id).then((r) => {
      if (vigente) setSaldo(r.ok ? r.disponibles : {});
    });
    return () => {
      vigente = false;
    };
    // `clase.reservas`: al apuntar a alguien su saldo baja; se vuelve a pedir.
  }, [clase.id, clase.reservas]);

  const q = normalizar(texto.trim());
  const digitos = soloDigitos(texto);
  const resultados = q
    ? clientes
        .filter(
          (c) => normalizar(c.nombre).includes(q) || (digitos.length > 0 && c.identificacion.includes(digitos)),
        )
        .slice(0, MAXIMO)
    : [];

  /** Por qué no se puede (o cuánto le queda). `bloquea` desactiva el botón. */
  function estadoDe(c: ClienteParaReservar): { texto: string; bloquea: boolean; tono: string } {
    if (saldo === null) return { texto: "Privada: no descuenta", bloquea: false, tono: "text-verde-300" };
    if (saldo === undefined) return { texto: "…", bloquea: false, tono: "text-verde-300" };
    const n = saldo[c.id];
    if (n === undefined)
      return { texto: "Sin plan ese día", bloquea: true, tono: "text-[var(--color-estado-aviso)]" };
    if (n <= 0)
      return { texto: `Sin clases de ${clase.tipo}`, bloquea: true, tono: "text-[var(--color-estado-aviso)]" };
    return {
      texto: `Le ${n === 1 ? "queda" : "quedan"} ${numero(n)} de ${clase.tipo}`,
      bloquea: false,
      tono: "text-[var(--color-estado-ok)]",
    };
  }

  return (
    <div>
      <label htmlFor="buscar-apuntar" className="mb-1.5 block text-sm font-medium text-verde">
        Apuntar a alguien
      </label>
      <input
        id="buscar-apuntar"
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nombre o cédula"
        autoComplete="off"
        aria-describedby="buscar-apuntar-ayuda"
        className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde transition-colors duration-300 placeholder:text-verde-300 hover:border-dorado/60 focus-visible:border-dorado focus-visible:outline-none"
      />
      <p id="buscar-apuntar-ayuda" className="mt-1.5 text-xs text-verde-300" aria-live="polite">
        {!q
          ? "Escribe para buscar. Cada resultado dice cuántas clases le quedan."
          : resultados.length === 0
            ? "Nadie coincide (o ya está en la clase)."
            : `${resultados.length}${resultados.length === MAXIMO ? "+" : ""} ${resultados.length === 1 ? "resultado" : "resultados"}`}
      </p>

      {resultados.length > 0 && (
        <ul className="mt-2 divide-y divide-beige rounded-xl border border-beige">
          {resultados.map((c) => {
            const e = estadoDe(c);
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-verde">{c.nombre}</p>
                  <p className="text-xs text-verde-300">
                    <span className="font-cifra">{documento(c.identificacion)}</span>
                    <span className={e.tono}> · {e.texto}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={e.bloquea || enCurso}
                  onClick={() => onApuntar(c)}
                  className={APUNTAR}
                  aria-label={`Apuntar a ${c.nombre}${e.bloquea ? ` (no se puede: ${e.texto.toLowerCase()})` : ""}`}
                >
                  Apuntar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
