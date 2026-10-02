import Card from "@/components/admin/Card";
import ChartCard from "@/components/admin/ChartCard";
import GraficaContable from "@/components/admin/GraficaContable";
import StatTile from "@/components/admin/StatTile";
import TarjetaIngresos from "@/components/admin/TarjetaIngresos";
import Variacion from "@/components/admin/Variacion";
import Donut from "@/components/admin/charts/Donut";
import GroupedBars from "@/components/admin/charts/GroupedBars";
import HBars from "@/components/admin/charts/HBars";
import {
  altasYBajas,
  gastosDelMes,
  indicadores,
  repartoMetodos,
  repartoPlanes,
  serieMensual,
  tasaRenovacion,
} from "@/lib/admin/dashboard";
import { moneda, monedaCorta, numero, porcentaje } from "@/lib/admin/format";
import { hoyEnBogota } from "@/lib/admin/horario";
import {
  SEMANAS_RESERVAS,
  getDatosDashboard,
  getReservasPorDiaSemana,
  getUsuarioActual,
} from "@/lib/admin/queries";

const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
const C3 = "var(--color-chart-3)";
const C4 = "var(--color-chart-4)";
/** En orden fijo, nunca cíclico: ver la nota de la paleta en CONTEXTO. */
const COLORES = [C1, C2, C3, C4];

const PASTILLA =
  "rounded-full border border-beige bg-arena px-3 py-1 text-xs text-verde-700";

/** La ventana de los repartos, dicha en la cabecera de la tarjeta: sin decir
 *  «de cuándo», la cifra no se puede interpretar. */
function Pastilla30() {
  return <span className={PASTILLA}>Últimos 30 días</span>;
}

/** Lo que se pinta en lugar de un gráfico sin datos: un donut o unas barras de
 *  ceros no dicen nada (y dividirían por cero). */
function SinDatos({ texto }: { texto: string }) {
  return <p className="py-10 text-center text-sm text-verde-300">{texto}</p>;
}

/**
 * Dashboard, leyendo de Supabase (paso 5 del plan).
 *
 * Todo sale de `getDatosDashboard()` —una sola ida a la base— y lo calcula
 * `lib/admin/dashboard.ts`. «Reservas por día de la semana» va aparte
 * (`getReservasPorDiaSemana`): lee las tablas `clases` y `reservas`.
 *
 * ⚠️ **Las tarjetas de dinero son solo para Administración.** RLS no da los
 * gastos a Recepción ni los pagos a Instructora, y las consultas no fallan:
 * devuelven vacío. Sin este filtro, a Recepción le saldría una utilidad sin
 * gastos y a una instructora «$0» de ingresos.
 */
export default async function DashboardPage() {
  const hoy = hoyEnBogota();
  const [usuario, datos] = await Promise.all([
    getUsuarioActual(),
    getDatosDashboard(),
  ]);
  const esAdmin = usuario?.rol === "Administración";

  const [ingresosMes, utilidad, activos, porVencer] = indicadores(datos, hoy);
  const tiles = esAdmin ? [utilidad, activos, porVencer] : [activos, porVencer];
  const meses = serieMensual(datos, hoy);
  const planes = repartoPlanes(datos, hoy);
  const metodos = repartoMetodos(datos, hoy);
  const movimiento = altasYBajas(datos, hoy);
  const renovacion = tasaRenovacion(datos, hoy);
  const gastos = gastosDelMes(datos, hoy);
  const porDia = await getReservasPorDiaSemana(hoy);

  const totalPlanes = planes.reduce((t, p) => t + p.importe, 0);
  const totalMetodos = metodos.reduce((t, m) => t + m.importe, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:gap-5">
        <section
          aria-label="Cifras principales"
          className={`grid gap-4 md:col-span-6 xl:col-span-12 ${
            tiles.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {tiles.map((i) => (
            <StatTile key={i.etiqueta} indicador={i} />
          ))}
        </section>

        {esAdmin && (
          <TarjetaIngresos
            indicador={ingresosMes}
            meses={meses}
            className="md:col-span-6 xl:col-span-8"
          />
        )}

        {esAdmin && (
          <ChartCard
            titulo="Ingresos por tipo de plan"
            className="md:col-span-6 xl:col-span-4"
            accion={<Pastilla30 />}
            tabla={{
              cabeceras: ["Plan", "Clientes", "Importe"],
              filas: planes.map((p) => [
                p.plan,
                numero(p.clientes),
                moneda(p.importe),
              ]),
            }}
          >
            {totalPlanes === 0 ? (
              <SinDatos texto="No hubo cobros en los últimos 30 días." />
            ) : (
              <Donut
                totalEtiqueta="Cobrado"
                totalValor={monedaCorta(totalPlanes)}
                formato="moneda"
                datos={planes.map((p, i) => ({
                  label: p.plan,
                  value: p.importe,
                  color: COLORES[i],
                }))}
              />
            )}
          </ChartCard>
        )}

        <Card
          tono="oscuro"
          fx
          className={`flex flex-col justify-center ${
            esAdmin ? "md:col-span-3 xl:col-span-4" : "md:col-span-3 xl:col-span-6"
          }`}
        >
          <h2 className="text-base font-bold text-arena">
            Tasa de renovación
          </h2>
          <p className="mt-6 font-cifra text-5xl leading-none text-arena xl:text-6xl">
            {renovacion.valor === null ? "—" : porcentaje(renovacion.valor)}
          </p>
          {/* Sin vencimientos en la ventana, la tasa no es «0 %» —eso sería
              «nadie renovó»—: es que la pregunta no aplica. */}
          {renovacion.valor === null ? (
            <p className="mt-3 text-sm text-beige/75">
              No venció ninguna membresía en los últimos 30 días.
            </p>
          ) : (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
              {/* En PUNTOS: de 60 % a 70 % son 10 puntos, no «+16,7 %». */}
              <Variacion valor={renovacion.variacion} tono="oscuro" />
              <span className="text-beige/75">
                {renovacion.variacion === null
                  ? "de las que vencieron en 30 días"
                  : "frente a los 30 días anteriores"}
              </span>
            </p>
          )}
        </Card>

        {esAdmin && (
          <ChartCard
            titulo="Cómo pagan los clientes"
            className="md:col-span-3 xl:col-span-4"
            accion={<Pastilla30 />}
            tabla={{
              cabeceras: ["Método", "Importe", "% del total"],
              filas: metodos.map((m) => [
                m.metodo,
                moneda(m.importe),
                totalMetodos
                  ? porcentaje((m.importe / totalMetodos) * 100, 0)
                  : "—",
              ]),
            }}
          >
            {totalMetodos === 0 ? (
              <SinDatos texto="No hubo cobros en los últimos 30 días." />
            ) : (
              <HBars
                datos={metodos.map((m) => ({
                  label: m.metodo,
                  value: m.importe,
                }))}
                color={C1}
                formatoValor={moneda}
              />
            )}
          </ChartCard>
        )}

        <ChartCard
          titulo="Altas y bajas por mes"
          /* Sin las dos tarjetas de dinero de su fila, renovación y altas se
             reparten la fila a medias en vez de dejar un tercio vacío. */
          className={
            esAdmin ? "md:col-span-6 xl:col-span-4" : "md:col-span-3 xl:col-span-6"
          }
          tabla={{
            cabeceras: ["Mes", "Altas", "Bajas", "Neto"],
            filas: movimiento.map((m) => [
              m.mes,
              m.altas,
              m.bajas,
              `${m.altas - m.bajas > 0 ? "+" : ""}${m.altas - m.bajas}`,
            ]),
          }}
        >
          <GroupedBars
            datos={movimiento.map((m) => ({
              label: m.mes,
              valores: [m.altas, m.bajas],
            }))}
            series={[
              { nombre: "Altas", color: C1 },
              { nombre: "Bajas", color: C3 },
            ]}
            formato="clientes"
            formatoEje="numero"
          />
        </ChartCard>

        {/* ---------- Reservas por día de la semana ----------
            ⚠️ Agrupa por DÍA DE LA SEMANA, no por fecha: un lunes suelto no
            dice nada y catorce lunes sí. Responde a «¿qué días llena el
            estudio?», que es lo que decide dónde añadir clases y dónde
            quitarlas — la primera pregunta del dashboard que no es de plata.

            ⚠️ Son RESERVAS, no asistencias verificadas: no existe todavía el
            registro de quién apareció. Esta es la tarjeta donde entrará como
            segunda serie el día que exista, y es lo que hará visible el
            «reserva y no viene». Ver `getReservasPorDiaSemana()`.

            A ancho completo como la vista contable: siete barras en cuatro
            columnas de `xl` (~360px) se apelotonan, y el domingo a cero necesita
            sitio para leerse como «cerramos» y no como un fallo. */}
        <ChartCard
          titulo="Reservas por día de la semana"
          className="md:col-span-6 xl:col-span-12"
          /* La ventana va en una pastilla y no en `descripcion`: las tarjetas
             del dashboard van sin párrafo a propósito, pero sin decir «de
             cuándo» la cifra no se puede interpretar. */
          accion={
            <span className={PASTILLA}>
              Últimas {SEMANAS_RESERVAS} semanas
            </span>
          }
          tabla={{
            cabeceras: ["Día", "Clases", "Reservas", "Cupos", "Ocupación"],
            filas: porDia.map((d) => [
              d.dia,
              numero(d.clases),
              numero(d.reservas),
              numero(d.cupos),
              /* Sin clases no hay ocupación que calcular, y eso NO es «0 %»:
                 es que la pregunta no aplica. Mismo criterio que el margen de
                 Finanzas con ingresos a cero. */
              d.cupos ? porcentaje((d.reservas / d.cupos) * 100, 0) : "—",
            ]),
          }}
        >
          <GroupedBars
            datos={porDia.map((d) => ({ label: d.dia, valores: [d.reservas] }))}
            series={[{ nombre: "Reservas", color: C1 }]}
            categoria="día de la semana"
            formato="numero"
            formatoEje="numero"
          />
        </ChartCard>

        {/* ---------- G · Vista contable, alternable ----------
            Las dos series contables vuelven al dashboard, pero en UNA tarjeta
            con desplegable en vez de dos: responden a la misma pregunta y
            juntas obligaban a cruzar cuatro series a ojo. Va al final porque
            es detalle: lo primero que se mira son las cifras de cabecera. */}
        {esAdmin && (
          <GraficaContable
            meses={meses}
            gastos={gastos}
            className="md:col-span-6 xl:col-span-12"
          />
        )}
      </div>
    </div>
  );
}
