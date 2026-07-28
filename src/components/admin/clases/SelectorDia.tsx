"use client";

import HeroFX from "@/components/fx/HeroFX";
import { numero } from "@/lib/admin/format";
import {
  diaCorto,
  diaRelativo,
  lunesDe,
  numeroDia,
  sumarDias,
} from "@/lib/admin/horario";

const NAV =
  "control-fx relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-full border border-beige/30 text-beige transition-colors duration-300 hover:border-dorado hover:text-arena focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado";

/**
 * Tira de la semana + salto a una fecha cualquiera.
 *
 * ⚠️ **El día elegido es estado de cliente, no una ruta ni un `searchParams`.**
 * Leer la URL volvería la página dinámica y `/admin/clases` dejaría de compilar
 * `○ Static` como el resto del panel. El precio es el mismo que ya se pagó en el
 * listado de Usuarios: un día concreto no se puede compartir por enlace. Cuando
 * haya backend y la agenda se pida por rango, ese es el momento de subirlo a la
 * URL.
 *
 * ⚠️ **La semana empieza en LUNES** (`lunesDe`), no en domingo: es la convención
 * de aquí, y el domingo el estudio cierra — abrir la tira por el día cerrado
 * sería empezar por el hueco.
 */
export default function SelectorDia({
  dia,
  hoy,
  conteos,
  onDia,
}: {
  /** Día seleccionado, ISO corto. */
  dia: string;
  hoy: string;
  /** Clases por fecha, para el número de cada día. */
  conteos: Record<string, number>;
  onDia: (iso: string) => void;
}) {
  const lunes = lunesDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  return (
    /* ⚠️ **Banda verde con las motas doradas**, el mismo tratamiento que la
       barra lateral. Es el bloque de navegación de la pantalla —lo que se toca
       para moverse por la agenda— y en verde se separa de un vistazo de la
       lista de clases, que se queda en blanco porque es donde está el dato. Con
       toda la tarjeta blanca, el selector y las filas pesaban igual.

       `isolate` + canvas a `-z-10`, como `Card` con `fx`. El recorte lo hace el
       `overflow-hidden` que ya trae `Card` con `densidad="plana"`. */
    <div className="relative isolate space-y-3 border-b border-verde-700 bg-verde px-4 py-4 sm:px-5">
      <HeroFX className="-z-10" goteo={false} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDia(sumarDias(dia, -7))}
            className={NAV}
            aria-label="Semana anterior"
          >
            <span className="control-sheen" aria-hidden="true" />
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={() => onDia(sumarDias(dia, 7))}
            className={NAV}
            aria-label="Semana siguiente"
          >
            <span className="control-sheen" aria-hidden="true" />
            <span aria-hidden="true">›</span>
          </button>

          {/* Solo cuando sirve de algo: estando ya en hoy, el botón no llevaría
              a ninguna parte y sería un control muerto que hay que leer igual. */}
          {dia !== hoy && (
            <button
              type="button"
              onClick={() => onDia(hoy)}
              className={`${NAV} px-4`}
            >
              <span className="control-sheen" aria-hidden="true" />
              Hoy
            </button>
          )}
        </div>

        {/* `<input type="date">` nativo, como los `<select>` del panel: en móvil
            abre el calendario del sistema y trae teclado y accesibilidad gratis.
            Es la única forma de llegar a un día lejano sin pulsar «semana
            siguiente» quince veces. */}
        <div className="flex items-center gap-2">
          {/* ⚠️ El rótulo es `sr-only`, no se borra: un campo sin nombre
              accesible se anuncia como «editar texto» y nadie sabe para qué es.
              Visualmente sobra porque un calendario ya se reconoce solo, y ahí
              al lado competía con las flechas de semana. */}
          <label htmlFor="ir-a-dia" className="sr-only">
            Ir al día
          </label>
          <input
            id="ir-a-dia"
            type="date"
            value={dia}
            onChange={(e) => {
              /* Vaciar el campo (la ✕ del control nativo) deja `value` en "".
                 Sin esta guarda, la agenda saltaría a una fecha inválida y toda
                 la aritmética de la semana devolvería `NaN`. */
              if (e.target.value) onDia(e.target.value);
            }}
            className="min-h-[44px] rounded-full border border-beige bg-white px-4 text-sm text-verde transition-colors duration-300 hover:border-dorado/60 focus:border-dorado focus:outline-none"
          />
        </div>
      </div>

      {/* Siete botones a 375px salen a ~49px cada uno: caben sin scroll
          horizontal, así que aquí no hace falta el raíl desplazable de las
          pastillas de filtro. */}
      <div
        role="group"
        aria-label="Elegir día de la semana"
        className="grid grid-cols-7 gap-1 sm:gap-2"
      >
        {dias.map((d) => {
          const activo = d === dia;
          const esHoy = d === hoy;
          const n = conteos[d] ?? 0;

          return (
            <button
              key={d}
              type="button"
              aria-pressed={activo}
              onClick={() => onDia(d)}
              /* El nombre accesible dice el día entero y cuántas clases tiene:
                 leído en voz alta, «lun 20» y un «7» suelto no significan nada. */
              aria-label={`${diaRelativo(d, hoy)} · ${n} ${n === 1 ? "clase" : "clases"}`}
              className={`control-fx relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-1 py-2 transition-colors duration-300 ${
                activo
                  ? "bg-dorado text-verde-900"
                  : /* ⚠️ El borde existe SIEMPRE (transparente cuando no toca):
                       encender uno que antes no ocupaba sitio movería la tira
                       1px y se leería como un temblor. Misma regla que las
                       tarjetas y las pestañas del listado. */
                    `border ${esHoy ? "border-dorado" : "border-transparent"} bg-verde-700/60 text-beige hover:border-dorado/60 hover:text-arena`
              }`}
            >
              {!activo && <span className="control-sheen" aria-hidden="true" />}
              <span
                aria-hidden="true"
                className={`text-[11px] uppercase ${activo ? "text-verde-900" : "text-beige/70"}`}
              >
                {diaCorto(d)}
              </span>
              <span
                aria-hidden="true"
                className="font-display text-lg tabular-nums leading-none"
              >
                {numeroDia(d)}
              </span>
              {/* Un día sin clases enseña una raya y no un «0»: la raya se lee
                  como «cerrado / nada programado», mientras que un cero invita a
                  buscar qué se rompió. */}
              <span
                aria-hidden="true"
                /* `dorado-light` y no `dorado-dark`: sobre verde, el dorado
                   oscuro se apaga hasta confundirse con el fondo. Es el mismo
                   par que usan las tarjetas oscuras del dashboard. */
                className={`text-[11px] tabular-nums ${
                  activo
                    ? "text-verde-900"
                    : n === 0
                      ? "text-beige/40"
                      : "text-dorado-light"
                }`}
              >
                {n === 0 ? "–" : numero(n)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
