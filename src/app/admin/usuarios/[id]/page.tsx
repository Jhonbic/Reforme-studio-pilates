import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import HeroFX from "@/components/fx/HeroFX";
import AccionesCliente from "@/components/admin/usuarios/AccionesCliente";
import AccesoWebCliente from "@/components/admin/usuarios/AccesoWebCliente";
import AsignarPlan from "@/components/admin/usuarios/AsignarPlan";
import CobrarPendiente from "@/components/admin/usuarios/CobrarPendiente";
import EstadoBadge from "@/components/admin/usuarios/EstadoBadge";
import HistorialClases from "@/components/admin/usuarios/HistorialClases";
import HistorialPlanes from "@/components/admin/usuarios/HistorialPlanes";
import ReservarClaseCliente from "@/components/admin/usuarios/ReservarClaseCliente";
import { documento, fecha, iniciales, moneda } from "@/lib/admin/format";
import { horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import {
  getCliente,
  getClasesParaReservar,
  getDatosPersonales,
  getHistorialClases,
  getMembresiasConSaldo,
  getMotivoBaja,
  getPagosPendientes,
  getPlanesALaVenta,
  getPlanesAdquiridos,
  getSaldoCliente,
  getUsuarioActual,
  tieneAccesoWeb,
} from "@/lib/admin/queries";
import { edad } from "@/lib/validacion";

/**
 * Ficha de un cliente.
 *
 * ⚠️ **Organización copiada de JainSportBox** (`UsuarioPerfilView.vue`,
 * decisión del usuario, oct 2026), con la marca de Reforme: cabecera verde con
 * el nombre, debajo el estado y las acciones, y una rejilla con TODOS los datos
 * que se piden en el registro web y en el alta de recepción (nacimiento y
 * edad, dirección, EPS, emergencia, acudiente si es menor, términos) más la
 * membresía. Después, el historial de planes comprados y las clases.
 *
 * Lee de Supabase. Desde «Acciones» el mostrador edita los datos
 * (`/admin/usuarios/[id]/editar`) y da de baja o reactiva.
 *
 * Sin `generateStaticParams`: los clientes viven en la base y cambian, y el
 * panel ya se pinta por petición desde que hay sesión.
 */

export async function generateMetadata({
  params,
}: PageProps<"/admin/usuarios/[id]">): Promise<Metadata> {
  const { id } = await params;
  const cliente = await getCliente(id);
  return {
    title: cliente
      ? `${cliente.nombre} · Panel administrativo`
      : "Cliente no encontrado",
    robots: { index: false, follow: false },
  };
}

const ENLACE =
  "underline decoration-dorado underline-offset-4 transition-colors duration-300 hover:text-verde";

/** Sin dato: una raya en gris, como en Jain. Nunca un enlace vacío. */
const Nada = () => <span className="font-normal text-verde-300">—</span>;

/**
 * Una casilla de la rejilla de datos. `<dl>` y no tabla: son parejas
 * campo/valor de UNA persona, que es para lo que existe la lista de
 * definiciones.
 */
function Casilla({
  etiqueta,
  children,
  destacada = false,
  className = "",
}: {
  etiqueta: string;
  children: React.ReactNode;
  /** Dorada: el acudiente de un menor, que es lo primero que hay que ver. */
  destacada?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl p-3 ${
        destacada ? "border border-dorado/40 bg-dorado/10" : "bg-arena/70"
      } ${className}`}
    >
      <dt
        className={`mb-1 text-xs uppercase tracking-[0.14em] ${
          destacada ? "text-dorado-tinta" : "text-verde-300"
        }`}
      >
        {etiqueta}
      </dt>
      <dd className="text-sm font-semibold text-verde-700">{children}</dd>
    </div>
  );
}

/** Teléfono como enlace `tel:`: en el móvil abre el marcador. */
function Telefono({ numero }: { numero: string | null }) {
  if (!numero) return <Nada />;
  return (
    <a href={`tel:${numero.replace(/\s/g, "")}`} className={`whitespace-nowrap tabular-nums ${ENLACE}`}>
      {numero}
    </a>
  );
}

export default async function FichaClientePage({
  params,
}: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await params;
  const hoy = hoyEnBogota();
  const [cliente, usuario, datos, saldo, historial] = await Promise.all([
    getCliente(id),
    getUsuarioActual(),
    getDatosPersonales(id),
    getCliente(id).then((c) => (c ? getSaldoCliente(c.id, hoy) : [])),
    getCliente(id).then((c) => (c ? getHistorialClases(c.id, hoy, horaEnBogota()) : [])),
  ]);
  // Cobrar es del mostrador, igual que en la base (RLS). A una instructora no
  // se le enseña un botón que acabaría en «no tienes permiso».
  const puedeCobrar =
    usuario?.rol === "Administración" || usuario?.rol === "Recepción";
  // Arranca ya, en paralelo con lo de abajo: con pagos solo para el mostrador.
  const historialPlanes = getPlanesAdquiridos(id, puedeCobrar);
  const [planes, accesoWeb, clasesParaReservar, membresias, deudas] = puedeCobrar
    ? await Promise.all([
        getPlanesALaVenta(),
        tieneAccesoWeb(id),
        cliente ? getClasesParaReservar(cliente.id, hoy, horaEnBogota()) : [],
        cliente ? getMembresiasConSaldo(cliente.id) : [],
        cliente ? getPagosPendientes(cliente.id) : [],
      ])
    : [[], false, [], [], []];

  /* Un id que no existe es un 404 de verdad, no una tarjeta vacía: la ficha de
     alguien que no está no es «sin datos», es otra dirección. */
  if (!cliente) notFound();
  const planesAdquiridos = await historialPlanes;
  const deBaja = cliente.estado === "De baja";
  const motivoBaja = deBaja ? await getMotivoBaja(cliente.id) : null;
  const anios = datos?.fechaNacimiento ? edad(datos.fechaNacimiento, hoy) : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* ⚠️ Sin `overflow-hidden` en la tarjeta: el menú «Acciones» se
          despliega por fuera y quedaría recortado. Solo la banda verde lo
          lleva, para contener las motas. */}
      <section className="rounded-2xl border border-beige bg-white shadow-card">
        {/* Cabecera verde de marca, como la roja de Jain. */}
        <div className="relative isolate overflow-hidden rounded-t-2xl bg-verde px-6 pb-6 pt-8 text-center">
          <HeroFX className="-z-10" goteo={false} />
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border-2 border-arena/40 bg-white/10 font-display text-2xl text-arena"
          >
            {iniciales(cliente.nombre)}
          </span>
          <h1 className="font-display text-3xl leading-tight text-arena">{cliente.nombre}</h1>
          <p className="mt-1 text-sm tabular-nums text-beige/80">
            {cliente.tipoIdentificacion ?? "C.C."} {documento(cliente.identificacion)}
          </p>
        </div>

        {/* Estado y acciones, en blanco: los botones son los del resto del
            panel. `flex-wrap`: con Renovar + Reservar + Contraseña web +
            Acciones no caben en una fila del móvil. */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-beige px-5 py-4 sm:gap-3">
          <EstadoBadge estado={cliente.estado} />
          {puedeCobrar && !deBaja && (
            <AsignarPlan
              clienteId={cliente.id}
              nombre={cliente.nombre}
              vencimiento={cliente.vencimiento}
              planes={planes}
              hoy={hoy}
            />
          )}
          {/* Reservar parte de la PERSONA: «resérvame el jueves a las 7». */}
          {puedeCobrar && !deBaja && (
            <ReservarClaseCliente
              clienteId={cliente.id}
              nombre={cliente.nombre}
              clases={clasesParaReservar}
              membresias={membresias}
              hoy={hoy}
            />
          )}
          {puedeCobrar && (
            <AccesoWebCliente
              clienteId={cliente.id}
              nombre={cliente.nombre}
              correo={cliente.correo}
              tieneAcceso={accesoWeb}
            />
          )}
          <AccionesCliente cliente={cliente} puedeEditar={puedeCobrar} />
        </div>

        {deBaja && cliente.baja && (
          <p className="mx-5 mt-5 rounded-xl bg-arena px-4 py-3 text-sm text-verde-700">
            De baja desde el {fecha(cliente.baja, true)}
            {motivoBaja && <> · {motivoBaja}</>}
          </p>
        )}

        {/* Dos columnas ya en el móvil, como Jain: a una sola la ficha medía el
            doble. Lo largo (correo, dirección, emergencia, acudiente) ocupa
            las dos hasta `sm`. */}
        <dl className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-3">
          <Casilla etiqueta="Correo" className="col-span-2 sm:col-span-1">
            {cliente.correo ? (
              <a href={`mailto:${cliente.correo}`} className={`break-all ${ENLACE}`}>
                {cliente.correo}
              </a>
            ) : (
              <Nada />
            )}
          </Casilla>
          <Casilla etiqueta="Teléfono">
            <Telefono numero={cliente.telefono || null} />
          </Casilla>
          <Casilla etiqueta="Nacimiento">
            {datos?.fechaNacimiento ? (
              <span className="tabular-nums">
                {fecha(datos.fechaNacimiento, true)}
                {anios !== null && <span className="font-normal text-verde-300"> · {anios} años</span>}
              </span>
            ) : (
              <Nada />
            )}
          </Casilla>
          <Casilla etiqueta="Dirección" className="col-span-2 sm:col-span-1">{datos?.direccion || <Nada />}</Casilla>
          <Casilla etiqueta="EPS">{datos?.eps || <Nada />}</Casilla>
          <Casilla etiqueta="Cliente desde">
            <span className="tabular-nums">{fecha(cliente.alta, true)}</span>
          </Casilla>
          <Casilla etiqueta="Contacto de emergencia" className="col-span-2 sm:col-span-1">
            {datos?.emergencia.nombre || datos?.emergencia.telefono ? (
              <>
                <span className="block">{datos.emergencia.nombre || <Nada />}</span>
                <span className="mt-0.5 block text-xs font-normal">
                  <Telefono numero={datos.emergencia.telefono} />
                </span>
              </>
            ) : (
              <Nada />
            )}
          </Casilla>
          {datos?.acudiente && (
            <Casilla etiqueta="Acudiente · menor de edad" destacada className="col-span-2 sm:col-span-1">
              <span className="block">{datos.acudiente.nombre}</span>
              <span className="mt-0.5 block text-xs font-normal text-verde-700">
                {datos.acudiente.identificacion ? `C.C. ${documento(datos.acudiente.identificacion)}` : "Sin documento"}
                {" · "}
                <Telefono numero={datos.acudiente.telefono} />
              </span>
            </Casilla>
          )}
          <Casilla etiqueta="Términos">
            {datos?.aceptaTerminos ? (
              <span className="text-[var(--color-estado-ok)]">Aceptados</span>
            ) : (
              <span className="font-normal text-verde-300">No constan</span>
            )}
          </Casilla>

          {/* La membresía, a lo ancho: es la pregunta que más trae a esta
              pantalla («¿hasta cuándo tiene?», «¿cuántas le quedan?»). */}
          <Casilla etiqueta="Membresía" className="col-span-2 lg:col-span-3">
            {/* Recién dado de alta no tiene membresía: se dice con palabras, no
                con «$0» ni una fecha vacía. */}
            {cliente.plan ? (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="text-base">{cliente.plan}</span>
                <span className="font-normal tabular-nums">
                  Vence el {cliente.vencimiento ? fecha(cliente.vencimiento, true) : "—"}
                </span>
                <span className="font-normal tabular-nums text-verde-300">
                  Renovación {moneda(cliente.importeRenovacion)}
                </span>
                {/* Lo que le queda hoy de cada tipo. Cada reserva descuenta
                    una; quitarla o cancelar a tiempo la devuelve. */}
                {saldo.length > 0 && (
                  <span className="tabular-nums">
                    Le quedan {saldo.map((s) => `${s.total - s.usadas} de ${s.total} ${s.tipo}`).join(" · ")}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-normal text-verde-300">Sin plan todavía</span>
            )}
            {/* Lo que debe (plan asignado con abono o sin cobrar), con el
                botón para cobrarlo. Solo lo ve el mostrador. */}
            {deudas.length > 0 && (
              <div className="mt-3 space-y-2 font-normal">
                {deudas.map((d) => (
                  <CobrarPendiente key={d.membresiaId} deuda={d} />
                ))}
              </div>
            )}
          </Casilla>
        </dl>
      </section>

      {/* Los planes que ha comprado, del más reciente al más antiguo. */}
      <Card className="min-w-0">
        <CardHeader titulo="Historial de planes" />
        <HistorialPlanes planes={planesAdquiridos} hoy={hoy} />
      </Card>

      {/* `min-w-0`: el historial lleva `truncate`, y un hijo de rejilla no
          encoge por debajo de su contenido: ensanchaba la columna y la página
          se desplazaba de lado en móvil. */}
      <Card className="min-w-0">
        <CardHeader titulo="Clases" />
        <dl className="mt-4">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-verde-300">Última asistencia</dt>
            <dd className="mt-1 tabular-nums text-verde-700">
              {/* `null` significa «nunca vino», que no es lo mismo que «no
                  sabemos»: se dice con palabras en vez de con un guion. */}
              {cliente.ultimaAsistencia
                ? fecha(cliente.ultimaAsistencia, true)
                : "Todavía no ha asistido a ninguna clase"}
            </dd>
          </div>
        </dl>
        <HistorialClases clases={historial} />
      </Card>
    </div>
  );
}
