import PanelPlanes from "@/components/admin/planes/PanelPlanes";
import { getPlanes } from "@/lib/admin/queries";

/**
 * Catálogo de planes.
 *
 * La pantalla **es el catálogo y nada más**. Tuvo encima una fila de tres
 * cifras de resumen y debajo una nota de pendientes; las dos se quitaron porque
 * competían con lo único que se viene a mirar aquí. El recuento de modalidades
 * no se perdió: vive en la cabecera de `PanelPlanes`, junto al botón de alta.
 *
 * ⚠️ **Es la primera pantalla del panel que GUARDA de verdad.** Crear, editar,
 * eliminar y destacar escriben en la tabla `planes` a través de las server
 * actions de `acciones.ts`. El resto del panel sigue leyendo `mock.ts`.
 *
 * ⚠️ **Por eso esta ruta ya no se prerenderiza.** Consultar la base obliga a
 * resolverla por petición: no es un coste de Supabase, es lo que significa
 * tener datos reales en vez de constantes compiladas.
 */
export default async function PlanesPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Planes</h1>
      <PanelPlanes planes={await getPlanes()} />
    </div>
  );
}
