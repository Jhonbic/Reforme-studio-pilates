import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import AccionesCliente from "@/components/admin/usuarios/AccionesCliente";
import AccesoWebCliente from "@/components/admin/usuarios/AccesoWebCliente";
import AsignarPlan from "@/components/admin/usuarios/AsignarPlan";
import Avatar from "@/components/admin/usuarios/Avatar";
import EstadoBadge from "@/components/admin/usuarios/EstadoBadge";
import HistorialClases from "@/components/admin/usuarios/HistorialClases";
import { documento, fecha, moneda } from "@/lib/admin/format";
import { horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import {
  getCliente,
  getHistorialClases,
  getPlanesALaVenta,
  getSaldoCliente,
  getUsuarioActual,
  tieneAccesoWeb,
} from "@/lib/admin/queries";

/**
 * Ficha de un cliente.
 *
 * Existe porque **cada fila del listado ya enlazaba aquí y daba 404**: no es
 * una pantalla nueva que se le ocurra a nadie, es el destino que el listado
 * llevaba prometiendo desde que se construyó.
 *
 * Lee de Supabase y es de **solo lectura** por ahora. Lo que sí puede hacer
 * —descargar la ficha— lo hace de verdad.
 *
 * Sin `generateStaticParams`: los clientes viven en la base y cambian, y el
 * panel ya se pinta por petición desde que hay sesión. Prerenderizar fichas en
 * el build las dejaría desfasadas.
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

/** Una pareja etiqueta/valor de la ficha. */
function Dato({
  etiqueta,
  children,
  numerico = false,
}: {
  etiqueta: string;
  children: React.ReactNode;
  /** Alinea las cifras por la coma y usa cifras de ancho fijo. */
  numerico?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-verde-300">
        {etiqueta}
      </dt>
      <dd
        className={`mt-1 text-verde-700 ${numerico ? "tabular-nums" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

export default async function FichaClientePage({
  params,
}: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await params;
  const [cliente, usuario, saldo, historial] = await Promise.all([
    getCliente(id),
    getUsuarioActual(),
    getCliente(id).then((c) => (c ? getSaldoCliente(c.id, hoyEnBogota()) : [])),
    getCliente(id).then((c) => (c ? getHistorialClases(c.id, hoyEnBogota(), horaEnBogota()) : [])),
  ]);
  // Cobrar es del mostrador, igual que en la base (RLS). A una instructora no
  // se le enseña un botón que acabaría en «no tienes permiso».
  const puedeCobrar =
    usuario?.rol === "Administración" || usuario?.rol === "Recepción";
  const [planes, accesoWeb] = puedeCobrar
    ? await Promise.all([getPlanesALaVenta(), tieneAccesoWeb(id)])
    : [[], false];

  /* Un id que no existe es un 404 de verdad, no una tarjeta vacía: la ficha de
     alguien que no está no es «sin datos», es otra dirección. */
  if (!cliente) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* El <h1> de la página es el nombre. La topbar titula «Ficha del
          cliente» porque solo conoce la ruta; aquí sí se sabe de quién es. */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar nombre={cliente.nombre} />

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight text-verde sm:text-3xl">
              {cliente.nombre}
            </h1>
            <p className="mt-0.5 text-sm tabular-nums text-verde-300">
              {cliente.tipoIdentificacion ?? "C.C."}{" "}
              {documento(cliente.identificacion)}
            </p>
          </div>

          {/* ⚠️ Fila propia (`w-full`) y `flex-wrap` hasta `xl`: con estado +
              Renovar + Acceso web + Acciones, en móvil «Acciones» se salía
              de la tarjeta y la página se desplazaba de lado; en 1024px
              aplastaban el nombre en dos líneas. En `xl` caben al lado. */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 xl:w-auto">
            <EstadoBadge estado={cliente.estado} />
            {puedeCobrar && (
              <AsignarPlan
                clienteId={cliente.id}
                nombre={cliente.nombre}
                vencimiento={cliente.vencimiento}
                planes={planes}
                hoy={hoyEnBogota()}
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
            <AccionesCliente cliente={cliente} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader titulo="Contacto" />
          {/* `<dl>` y no una tabla: son parejas campo/valor de una sola
              persona, que es exactamente para lo que existe la lista de
              definiciones. Una tabla necesitaría una fila por cliente. */}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Correo">
              {/* Enlaces de verdad: en recepción se llama y se escribe desde
                  aquí, y en móvil `tel:` abre el marcador. */}
              {/* En la base son opcionales: sin dato se dice, no se pinta un
                  enlace vacío que abriría el correo sin destinatario. */}
              {cliente.correo ? (
                <a
                  href={`mailto:${cliente.correo}`}
                  className="break-all underline decoration-dorado underline-offset-4 transition-colors duration-300 hover:text-verde"
                >
                  {cliente.correo}
                </a>
              ) : (
                <span className="text-verde-300">No lo ha dado</span>
              )}
            </Dato>
            <Dato etiqueta="Teléfono" numerico>
              {cliente.telefono ? (
                <a
                  href={`tel:${cliente.telefono.replace(/\s/g, "")}`}
                  className="whitespace-nowrap underline decoration-dorado underline-offset-4 transition-colors duration-300 hover:text-verde"
                >
                  {cliente.telefono}
                </a>
              ) : (
                <span className="text-verde-300">No lo ha dado</span>
              )}
            </Dato>
          </dl>
        </Card>

        <Card>
          <CardHeader titulo="Membresía" />
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Recién dado de alta no tiene membresía: se dice con palabras, no
                con «$0» ni una fecha vacía. */}
            <Dato etiqueta="Plan">{cliente.plan || "Sin plan todavía"}</Dato>
            <Dato etiqueta="Renovación" numerico>
              {cliente.plan ? moneda(cliente.importeRenovacion) : "—"}
            </Dato>
            <Dato etiqueta="Vence" numerico>
              {cliente.vencimiento ? fecha(cliente.vencimiento, true) : "—"}
            </Dato>
            <Dato etiqueta="Cliente desde" numerico>
              {fecha(cliente.alta, true)}
            </Dato>
            {/* Lo que le queda hoy de cada tipo. Cada reserva descuenta una;
                quitarla o cancelar a tiempo la devuelve. */}
            {saldo.length > 0 && (
              <Dato etiqueta="Clases que le quedan" numerico>
                {saldo.map((s) => `${s.total - s.usadas} de ${s.total} ${s.tipo}`).join(" · ")}
              </Dato>
            )}
          </dl>
        </Card>

        {/* `min-w-0`: el historial lleva `truncate`, y un hijo de rejilla no
            encoge por debajo de su contenido: ensanchaba la columna y la
            página se desplazaba de lado en móvil. */}
        <Card className="min-w-0 md:col-span-2">
          <CardHeader titulo="Clases" />
          <dl className="mt-4">
            <Dato etiqueta="Última asistencia" numerico>
              {/* `null` significa «nunca vino», que no es lo mismo que «no
                  sabemos»: se dice con palabras en vez de con un guion. */}
              {cliente.ultimaAsistencia
                ? fecha(cliente.ultimaAsistencia, true)
                : "Todavía no ha asistido a ninguna clase"}
            </Dato>
          </dl>
          <HistorialClases clases={historial} />
          <p className="mt-4 text-sm text-verde-300">
            Los pagos todavía no se muestran aquí: se ven en Finanzas.
          </p>
        </Card>
      </div>
    </div>
  );
}
