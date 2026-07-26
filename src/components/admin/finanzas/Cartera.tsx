import { moneda, numero, porcentaje } from "@/lib/admin/format";
import type { CarteraVencida } from "@/lib/admin/types";

/* La deuda se vuelve más difícil de cobrar cuanto más envejece, y eso es lo
   único que codifica el color aquí: no son categorías, es una escala de
   gravedad. Aun así cada tramo lleva su etiqueta y su cifra, así que el color
   no carga con ninguna información en exclusiva. */
const TONO: Record<CarteraVencida["tramo"], string> = {
  "1-30 días": "var(--color-estado-aviso)",
  "31-60 días": "var(--color-chart-3)",
  "Más de 60 días": "var(--color-estado-grave)",
};

/**
 * Cartera vencida por antigüedad.
 *
 * ⚠️ **No es la «Cartera por vencer» del Dashboard.** Aquella es dinero que
 * todavía no se debe: renovaciones de los próximos 7 días. Esta es deuda real,
 * ya caducada. Se llaman parecido y significan cosas opuestas, así que la
 * descripción de la tarjeta lo dice en vez de fiarlo al título.
 */
export default function Cartera({ tramos }: { tramos: CarteraVencida[] }) {
  const total = tramos.reduce((t, c) => t + c.importe, 0);
  const clientes = tramos.reduce((t, c) => t + c.clientes, 0);

  return (
    <div className="mt-5">
      <p className="font-display text-4xl tabular-nums leading-none text-verde">
        {moneda(total)}
      </p>
      <p className="mt-2 text-sm text-verde-300">
        {numero(clientes)} clientes con pagos vencidos
      </p>

      {/* Barra apilada: la proporción entre tramos se lee de un vistazo, que es
          la pregunta real («¿cuánto de esto es deuda vieja?»). El desglose con
          cifras va justo debajo, así que la barra no es la única fuente. */}
      <div
        aria-hidden="true"
        className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-beige"
      >
        {tramos.map((t) => (
          <div
            key={t.tramo}
            style={{
              width: `${total ? (t.importe / total) * 100 : 0}%`,
              backgroundColor: TONO[t.tramo],
            }}
          />
        ))}
      </div>

      <dl className="mt-5 space-y-3">
        {tramos.map((t) => (
          <div key={t.tramo} className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TONO[t.tramo] }}
            />
            <dt className="min-w-0 flex-1 text-sm text-verde-700">
              {t.tramo}
              <span className="text-verde-300">
                {" · "}
                {numero(t.clientes)}{" "}
                {t.clientes === 1 ? "cliente" : "clientes"}
              </span>
            </dt>
            <dd className="shrink-0 text-right">
              <span className="block text-sm tabular-nums text-verde-700">
                {moneda(t.importe)}
              </span>
              <span className="block text-xs tabular-nums text-verde-300">
                {porcentaje(total ? (t.importe / total) * 100 : 0, 0)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
