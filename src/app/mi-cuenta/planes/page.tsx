import { redirect } from "next/navigation";
import { moneda } from "@/lib/admin/format";
import { getPlanesALaVenta, type PlanALaVenta } from "@/lib/admin/queries";
import { enlaceWhatsApp, primerNombre } from "@/lib/admin/whatsapp";
import { getMiCuenta } from "@/lib/cliente/datos";

/** El WhatsApp del estudio (recepción): el mismo que el pie de la web. */
const TELEFONO_ESTUDIO = "3209078814";

const ORDEN_MODALIDAD = ["Mat", "Reformer", "Fusión"] as const;

/** «8 de Reformer + 4 de Mat», para la tarjeta y para el mensaje. */
function clasesDe(p: PlanALaVenta): string {
  const partes = [
    p.clasesReformer > 0 ? `${p.clasesReformer} de Reformer` : null,
    p.clasesMat > 0 ? `${p.clasesMat} de Mat` : null,
  ].filter(Boolean);
  return partes.join(" + ");
}

/**
 * Área de cliente → Planes: el catálogo a la venta, por modalidad, con
 * «Lo quiero» en cada plan, que abre WhatsApp con el plan ya escrito
 * (decisión del usuario, oct 2026). El plan lo activa recepción al cobrarlo:
 * aquí no se paga nada.
 *
 * Lee `planes` con la sesión del cliente (RLS: «planes: el cliente los ve»).
 */
export default async function PlanesClientePage() {
  const cuenta = await getMiCuenta();
  if (!cuenta) redirect("/login");
  const planes = await getPlanesALaVenta();
  const nombre = primerNombre(cuenta.nombre);

  return (
    <div className="space-y-8">
      <section className="text-center md:text-left">
        <h1 className="font-display text-3xl text-verde sm:text-4xl">Elige tu plan</h1>
        <p className="mt-2 text-verde-700">
          Escríbenos por WhatsApp con el que quieras y te lo activamos en recepción.
        </p>
      </section>

      {ORDEN_MODALIDAD.map((modalidad) => {
        const delGrupo = planes.filter((p) => p.modalidad === modalidad);
        if (delGrupo.length === 0) return null;
        return (
          <section key={modalidad}>
            <h2 className="font-display text-2xl text-verde">{modalidad}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {delGrupo.map((p) => {
                const actual = cuenta.plan === p.nombre && cuenta.estado !== "Vencida";
                const total = p.clasesReformer + p.clasesMat;
                const mensaje =
                  `Hola, soy ${nombre} (${cuenta.correo}). Me interesa el plan ${p.nombre}` +
                  ` de ${p.modalidad} (${clasesDe(p)}, ${moneda(p.precio)}). ¿Me ayudas a activarlo?`;
                const enlace = enlaceWhatsApp(TELEFONO_ESTUDIO, mensaje);
                return (
                  <li
                    key={p.id}
                    className={`flex flex-col rounded-2xl border bg-white p-5 ${
                      actual ? "border-dorado shadow-soft" : "border-beige"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-verde">{p.nombre}</h3>
                      {actual && (
                        <span className="shrink-0 rounded-full bg-dorado/15 px-3 py-1 text-xs text-dorado-dark">
                          Tu plan
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-cifra text-3xl font-light text-verde">{moneda(p.precio)}</p>
                    <p className="mt-1 text-sm text-verde-700">
                      {clasesDe(p)} · {p.vigenciaDias} días
                    </p>
                    {total > 0 && (
                      <p className="mt-0.5 text-xs text-verde-300">
                        {moneda(Math.round(p.precio / total))} por clase
                      </p>
                    )}
                    {enlace && (
                      <a
                        href={enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-verde px-5 text-sm font-medium text-arena transition-colors duration-300 hover:bg-verde-900"
                        aria-label={`Pedir el plan ${p.nombre} por WhatsApp`}
                      >
                        {actual ? "Renovar por WhatsApp" : "Lo quiero · WhatsApp"}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {planes.length === 0 && (
        <p className="rounded-2xl border border-beige bg-white p-6 text-center text-verde-700">
          Ahora mismo no hay planes a la venta. Escríbenos y te contamos.
        </p>
      )}
    </div>
  );
}
