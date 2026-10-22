import { redirect } from "next/navigation";
import BotonContrasena from "@/components/cliente/BotonContrasena";
import { documento, fecha, telefonoCO } from "@/lib/admin/format";
import { getMisDatos } from "@/lib/cliente/datos";

const WHATSAPP = "https://wa.me/573209078814";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-verde-300">{etiqueta}</dt>
      <dd className="mt-1 break-words text-verde-700">{children}</dd>
    </div>
  );
}

const SIN_DATO = <span className="text-verde-300">Sin dato</span>;

/**
 * Área de cliente → Mi cuenta: sus datos y cambiar la contraseña (decisión del
 * usuario, oct 2026).
 *
 * ⚠️ Los datos son de SOLO LECTURA aquí: los corrige recepción, que tiene a la
 * persona delante. El correo es su usuario para entrar, y dejar cambiarlo
 * desde la web sin verificarlo abriría la puerta a quedarse con una cuenta.
 */
export default async function MiCuentaConfiguracionPage() {
  const datos = await getMisDatos();
  if (!datos) redirect("/login");
  const [tipo, ...num] = datos.documento.split(" ");

  return (
    <div className="space-y-8">
      <section className="text-center md:text-left">
        <h1 className="font-display text-3xl text-verde sm:text-4xl">{datos.nombre}</h1>
      </section>

      <section className="rounded-2xl border border-beige bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-verde">Mis datos</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Documento">{tipo} {documento(num.join(" "))}</Dato>
          <Dato etiqueta="Correo (tu usuario)">{datos.correo ?? SIN_DATO}</Dato>
          <Dato etiqueta="Teléfono">{datos.telefono ? telefonoCO(datos.telefono) : SIN_DATO}</Dato>
          <Dato etiqueta="Fecha de nacimiento">
            {datos.fechaNacimiento ? fecha(datos.fechaNacimiento, true) : SIN_DATO}
          </Dato>
          <Dato etiqueta="Dirección">{datos.direccion ?? SIN_DATO}</Dato>
          <Dato etiqueta="EPS">{datos.eps ?? SIN_DATO}</Dato>
          <Dato etiqueta="Contacto de emergencia">
            {datos.emergenciaNombre
              ? `${datos.emergenciaNombre}${datos.emergenciaTelefono ? ` · ${telefonoCO(datos.emergenciaTelefono)}` : ""}`
              : SIN_DATO}
          </Dato>
          <Dato etiqueta="Cliente desde">{fecha(datos.alta, true)}</Dato>
        </dl>
        <p className="mt-5 text-sm text-verde-700">
          ¿Algo no está bien?{" "}
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-dorado-dark underline underline-offset-4"
          >
            Escríbenos
          </a>{" "}
          y lo corregimos.
        </p>
      </section>

      <section className="rounded-2xl border border-beige bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-verde">Contraseña</h2>
        <p className="mt-1 text-sm text-verde-700">Te pediremos la actual y la nueva dos veces.</p>
        <div className="mt-4">
          <BotonContrasena />
        </div>
      </section>
    </div>
  );
}
