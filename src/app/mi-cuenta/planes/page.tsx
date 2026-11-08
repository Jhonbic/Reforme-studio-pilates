import { redirect } from "next/navigation";
import CatalogoPlanes from "@/components/cliente/planes/CatalogoPlanes";
import type { PlanParaTarjeta } from "@/components/cliente/planes/TarjetaPlanCliente";
import { fecha, moneda } from "@/lib/admin/format";
import { aperturaPara, precioDeVenta, tieneDerechoApertura } from "@/lib/admin/campana";
import { getEstadoCampana, getPlanesALaVenta, type PlanALaVenta } from "@/lib/admin/queries";
import { enlaceWhatsApp, primerNombre } from "@/lib/admin/whatsapp";
import { getMiCuenta } from "@/lib/cliente/datos";
import { beneficiosDe, pestanaInicial } from "@/lib/cliente/planes";
import { TELEFONO_ESTUDIO } from "@/lib/contacto";

/** «8 de Reformer + 4 de Mat», para el mensaje de WhatsApp. */
function clasesDe(p: PlanALaVenta): string {
  const partes = [
    p.clasesReformer > 0 ? `${p.clasesReformer} de Reformer` : null,
    p.clasesMat > 0 ? `${p.clasesMat} de Mat` : null,
  ].filter(Boolean);
  return partes.join(" + ");
}

/**
 * Área de cliente → Planes: el catálogo a la venta en pestañas por modalidad,
 * con tarjetas al estilo de DEMO adminGym (nov 2026, decisión del usuario):
 * cabecera verde, precio grande, lo que incluye con ✓, el plan DESTACADO con
 * cinta y brillo (lo marca Administración) y los descuentos con el precio de
 * antes tachado. «Adquirir» abre WhatsApp con el plan ya escrito: aquí no se
 * paga; lo activa recepción al cobrarlo.
 *
 * Lee `planes` con la sesión del cliente (RLS: «planes: el cliente los ve»).
 *
 * Campaña de descuento por tramos (la apertura): si corre y sería su PRIMERA
 * membresía, todos los precios salen con el % del tramo, sobre el precio de
 * lista y sin sumar el descuento propio del plan (las reglas de
 * `registrar_membresia`). Quien ya tuvo un plan ve los precios de siempre.
 */
export default async function PlanesClientePage() {
  const cuenta = await getMiCuenta();
  if (!cuenta) redirect("/login");
  const [planes, campana] = await Promise.all([getPlanesALaVenta(), getEstadoCampana()]);
  const nombre = primerNombre(cuenta.nombre);
  // No ha comprado nunca un plan que entre en la campaña (los excluidos no cuentan).
  const conDerecho = tieneDerechoApertura(campana, cuenta.planesComprados);
  const pctApertura = conDerecho ? campana!.tramo!.pct : null;

  const tarjetas: PlanParaTarjeta[] = planes.map((p) => {
    // El % de apertura de ESTE plan: `null` si el plan no entra en la campaña.
    const pctPlan = aperturaPara(campana, cuenta.planesComprados, p.id);
    // La apertura manda sobre el descuento del plan (no se suman).
    const oferta =
      pctPlan !== null
        ? { pct: pctPlan, hasta: campana?.hasta ?? null, nombre: "Apertura" }
        : p.descuento
          ? { pct: p.descuento.pct, hasta: p.descuento.hasta, nombre: "Precio especial" }
          : null;
    const precio = precioDeVenta(p, pctPlan);
    const mensaje =
      `Hola, soy ${nombre} (${cuenta.correo}). Me interesa el plan ${p.nombre}` +
      ` de ${p.modalidad} (${clasesDe(p)}, ${moneda(precio)}` +
      (pctPlan !== null
        ? ` con el ${pctPlan} % de apertura`
        : oferta
          ? ` con el ${oferta.pct} % de descuento`
          : "") +
      `). ¿Me ayudas a activarlo?`;
    return {
      id: p.id,
      nombre: p.nombre,
      modalidad: p.modalidad,
      vigenciaDias: p.vigenciaDias,
      precio,
      precioLista: p.precioLista,
      oferta,
      beneficios: beneficiosDe(p, precio),
      destacado: p.destacado,
      actual: cuenta.plan === p.nombre && cuenta.estado !== "Vencida",
      enlace: enlaceWhatsApp(TELEFONO_ESTUDIO, mensaje),
    };
  });

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="eyebrow text-dorado-tinta">Planes</p>
        <h1 className="mt-2 font-display text-4xl text-verde sm:text-5xl">Elige tu plan</h1>
        <p className="mx-auto mt-2 max-w-md text-verde-700">
          Escríbenos por WhatsApp con el que quieras y te lo activamos en recepción.
        </p>
      </section>

      {/* La campaña de apertura, solo mientras corre. Los descuentos propios
          de los planes NO llevan banda arriba (decisión del usuario): se ven
          en su tarjeta. */}
      {campana?.tramo && pctApertura !== null && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-verde to-verde-900 px-5 py-5 text-center text-arena sm:px-6">
          <span className="brillo-plan" aria-hidden="true" />
          <p className="eyebrow text-dorado-light">{campana.nombre}</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl">
            <span className="text-dorado">−{pctApertura} %</span> en tu primera membresía
          </p>
          <p className="mt-1 text-sm text-beige/80">
            {campana.tramo.quedan === 1
              ? "Queda el último cupo a este precio"
              : `Quedan ${campana.tramo.quedan} cupos a este precio`}{" "}
            · hasta el {fecha(campana.hasta)}.
          </p>
          {/* Los planes que el estudio dejó fuera de la promoción. */}
          {planes.some((p) => campana.planesExcluidos.includes(p.id)) && (
            <p className="mt-1 text-sm text-beige/80">
              No aplica a{" "}
              {planes
                .filter((p) => campana.planesExcluidos.includes(p.id))
                .map((p) => `${p.nombre} (${p.modalidad})`)
                .join(", ")}
              .
            </p>
          )}
        </section>
      )}

      {planes.length === 0 ? (
        <p className="rounded-3xl border border-beige bg-white p-6 text-center text-verde-700">
          Ahora mismo no hay planes a la venta. Escríbenos y te contamos.
        </p>
      ) : (
        <CatalogoPlanes planes={tarjetas} inicial={pestanaInicial(planes, cuenta.plan)} />
      )}
    </div>
  );
}
