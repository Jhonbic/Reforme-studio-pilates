import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Card from "@/components/admin/Card";
import CardHeader from "@/components/admin/CardHeader";
import AccionesCliente from "@/components/admin/usuarios/AccionesCliente";
import Avatar from "@/components/admin/usuarios/Avatar";
import EstadoBadge from "@/components/admin/usuarios/EstadoBadge";
import { documento, fecha, moneda } from "@/lib/admin/format";
import { getCliente } from "@/lib/admin/queries";

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
  const cliente = await getCliente(id);

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

          <div className="flex items-center gap-3">
            <EstadoBadge estado={cliente.estado} />
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
          </dl>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader titulo="Actividad" />
          <dl className="mt-4">
            <Dato etiqueta="Última asistencia" numerico>
              {/* `null` significa «nunca vino», que no es lo mismo que «no
                  sabemos»: se dice con palabras en vez de con un guion. */}
              {cliente.ultimaAsistencia
                ? fecha(cliente.ultimaAsistencia, true)
                : "Todavía no ha asistido a ninguna clase"}
            </Dato>
          </dl>
          <p className="mt-4 text-sm text-verde-300">
            El historial de clases, los pagos y las notas de la ficha llegarán
            con la base de datos.
          </p>
        </Card>
      </div>
    </div>
  );
}
