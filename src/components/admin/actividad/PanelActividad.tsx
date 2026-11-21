"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/admin/Card";
import Pastilla, { TONO_ESTADO } from "@/components/admin/Pastilla";
import { useActividad } from "@/context/ActividadContext";
import {
  ETIQUETA_TIPO,
  FILTROS_ORIGEN,
  FILTROS_TIPO,
  agruparPorDia,
  contarPorTipo,
  cuandoEsLaClase,
  cuandoPaso,
  esNuevo,
  filtrarAvisos,
  quienLoHizo,
  type AvisoReserva,
  type FiltroOrigen,
  type FiltroTipo,
  type TipoAviso,
} from "@/lib/admin/actividad";

const PASTILLA =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm transition-[border-color,box-shadow,background-color,color] duration-300 sm:px-4";
const ACTIVA = "border-dorado bg-dorado text-verde-900";
const REPOSO =
  "border-beige bg-white text-verde-700 hover:border-dorado hover:text-verde hover:ring-2 hover:ring-dorado/25";

/* Símbolo + texto + color, nunca solo color (`Pastilla`). Cancelar no es una
   alarma roja: es algo normal del día; ámbar para que se vea de reojo. */
const TONO_TIPO: Record<TipoAviso, { simbolo: string; clase: string }> = {
  Reservó: { simbolo: "●", clase: TONO_ESTADO.ok },
  Canceló: { simbolo: "○", clase: TONO_ESTADO.aviso },
  Cambió: { simbolo: "↻", clase: TONO_ESTADO.neutro },
};

/**
 * La actividad de reservas: quién reservó, canceló o cambió una clase, del más
 * nuevo al más viejo, agrupado por día (nov 2026).
 *
 * - Lo que llegó desde la última visita lleva «Nuevo» y un filete dorado.
 *   La marca la movió el servidor al abrir la página (`getActividad`).
 * - Dos filtros: qué pasó y quién lo hizo. Los dos son estado local: la lista
 *   ya está en el navegador.
 * - Si llegan movimientos con la página abierta, la campana los cuenta y aquí
 *   sale «Hay N nuevos · Ver»: recargar marca lo visto otra vez.
 * - El nombre lleva a la ficha solo para el mostrador: la instructora no
 *   tiene Usuarios.
 */
export default function PanelActividad({
  avisos,
  vistoHasta,
  ahora,
  hoy,
  verFichas,
  dias,
}: {
  avisos: AvisoReserva[];
  vistoHasta: string;
  ahora: string;
  hoy: string;
  verFichas: boolean;
  dias: number;
}) {
  const router = useRouter();
  const { sinVer, refrescar } = useActividad();
  // Recién marcado lo visto en el servidor: que la campana lo sepa ya. Se
  // repite con cada recarga de la página (cambia `vistoHasta`).
  useEffect(() => {
    refrescar();
  }, [vistoHasta, refrescar]);
  const [tipo, setTipo] = useState<FiltroTipo>("Todos");
  const [origen, setOrigen] = useState<FiltroOrigen>("Todos");

  // Los recuentos de «qué pasó» siguen al filtro de «quién»: si dijeran 12 y
  // salieran 3, el que mentiría sería el número.
  const delOrigen = filtrarAvisos(avisos, "Todos", origen);
  const cuenta = contarPorTipo(delOrigen);
  const visibles = filtrarAvisos(delOrigen, tipo, "Todos");
  const grupos = agruparPorDia(visibles, hoy);
  const nuevos = avisos.filter((a) => esNuevo(a, vistoHasta)).length;

  return (
    <div className="space-y-4">
      {/* Resumen y aviso de lo que llega con la página abierta. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-verde-700">
          {nuevos > 0 ? (
            <>
              <span className="font-bold text-verde">
                {nuevos} {nuevos === 1 ? "movimiento nuevo" : "movimientos nuevos"}
              </span>{" "}
              desde la última vez que miraste.
            </>
          ) : (
            <>Estás al día. Aquí sale cada reserva, cancelación y cambio de los últimos {dias} días.</>
          )}
        </p>
        {/* `role="status"`: quien usa lector se entera de que llegó algo. */}
        <div role="status">
          {sinVer > 0 && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-dorado bg-dorado/10 px-5 text-sm font-bold text-verde transition-colors duration-300 hover:bg-dorado hover:text-verde-900"
            >
              Hay {sinVer} {sinVer === 1 ? "nuevo" : "nuevos"} · Ver
            </button>
          )}
        </div>
      </div>

      <Card densidad="plana" resalte={false}>
        {/* Filtros */}
        <div className="flex flex-col gap-3 border-b border-beige px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div role="group" aria-label="Qué pasó" className="flex flex-wrap gap-2">
            {FILTROS_TIPO.map((f) => {
              const activa = f.valor === tipo;
              return (
                <button
                  key={f.valor}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setTipo(f.valor)}
                  className={`${PASTILLA} ${activa ? ACTIVA : REPOSO}`}
                >
                  {f.etiqueta}
                  <span
                    className={`font-cifra text-xs ${activa ? "text-verde-900" : "text-verde-300"}`}
                  >
                    {cuenta[f.valor]}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-verde-700">
            <span className="shrink-0">Quién lo hizo</span>
            {/* `<select>` nativo, como el resto del panel: en el móvil abre
                el selector del sistema. */}
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value as FiltroOrigen)}
              className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado/60 sm:w-auto"
            >
              {FILTROS_ORIGEN.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        {grupos.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-2xl text-verde">
              {avisos.length === 0 ? "Todavía no hay movimientos" : "Ningún movimiento con ese filtro"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-verde-700">
              {avisos.length === 0
                ? `Cuando alguien reserve, cancele o cambie una clase saldrá aquí, y la campana de la barra lateral lo contará.`
                : "Prueba con otro filtro."}
            </p>
          </div>
        ) : (
          grupos.map((g) => (
            <section key={g.dia} aria-labelledby={`dia-${g.dia}`}>
              <h2
                id={`dia-${g.dia}`}
                className="border-b border-beige bg-arena px-4 py-2 text-xs font-bold uppercase tracking-wider text-verde-700 sm:px-6"
              >
                {g.titulo}
              </h2>
              <ul className="divide-y divide-beige/70">
                {g.avisos.map((a) => (
                  <FilaAviso
                    key={a.id}
                    aviso={a}
                    nuevo={esNuevo(a, vistoHasta)}
                    ahora={ahora}
                    verFichas={verFichas}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </Card>
    </div>
  );
}

function FilaAviso({
  aviso: a,
  nuevo,
  ahora,
  verFichas,
}: {
  aviso: AvisoReserva;
  nuevo: boolean;
  ahora: string;
  verFichas: boolean;
}) {
  const tono = TONO_TIPO[a.tipo];
  return (
    <li
      className={`relative flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6 ${
        nuevo ? "bg-dorado/[0.06]" : ""
      }`}
    >
      {/* Filete dorado de lo nuevo: el texto «Nuevo» va al lado, no es solo color. */}
      {nuevo && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-dorado" />}

      <div className="flex items-center justify-between gap-3 sm:w-36 sm:shrink-0 sm:flex-col sm:items-start sm:gap-1.5">
        <Pastilla simbolo={tono.simbolo} texto={ETIQUETA_TIPO[a.tipo]} clase={tono.clase} />
        <span className="font-cifra text-xs text-verde-300">
          <time dateTime={a.creadoEn}>{cuandoPaso(a.creadoEn, ahora)}</time>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {verFichas ? (
            <Link
              href={`/admin/usuarios/${a.clienteId}`}
              className="font-bold text-verde underline-offset-4 hover:text-dorado-tinta hover:underline"
            >
              {a.cliente}
            </Link>
          ) : (
            <span className="font-bold text-verde">{a.cliente}</span>
          )}
          {nuevo && (
            <span className="rounded-full bg-dorado px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-verde-900">
              Nuevo
            </span>
          )}
        </p>

        <p className="mt-1 text-sm text-verde-700">
          <span className="font-medium text-verde">{a.clase.tipo}</span>
          {" · "}
          {a.anterior ? (
            <>
              <span className="text-verde-300 line-through decoration-verde-300/60">
                {cuandoEsLaClase(a.anterior)}
              </span>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> pasó a </span>
              <span className="font-cifra">{cuandoEsLaClase(a.clase)}</span>
            </>
          ) : (
            <span className="font-cifra">{cuandoEsLaClase(a.clase)}</span>
          )}
        </p>

        <p className="mt-1 text-xs text-verde-300">{quienLoHizo(a)}</p>
      </div>
    </li>
  );
}
