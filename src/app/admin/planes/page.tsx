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
 * Crear, editar y eliminar existen como pantalla, pero **no guardan**: el
 * catálogo vive en `mock.ts` como constante de módulo. Cada acción lo dice al
 * ejecutarse, con un aviso de tipo `warning`.
 *
 * ⚠️ El precio no se guarda aquí ni en el catálogo: sale de `PRECIO_PLAN`, el
 * mismo que se le cobra a cada cliente. Y los clientes se cuentan sobre
 * `CLIENTES`. Ver `getPlanes()`.
 */
export default function PlanesPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Planes</h1>
      <PanelPlanes planes={getPlanes()} />
    </div>
  );
}
