"use client";

import Dropdown, {
  DropdownDivider,
  DropdownItem,
} from "@/components/admin/Dropdown";
import { useToast } from "@/context/ToastContext";
import type { Cliente } from "@/lib/admin/types";
import { csvCliente, descargarCsv } from "./exportar";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

/**
 * Acciones sobre un cliente.
 *
 * ⚠️ **Solo una de ellas hace algo, y las otras no fingen que sí.** Descargar
 * la ficha funciona porque el dato ya está en el navegador; editar y dar de
 * baja necesitan escribir en algún sitio, y hoy no hay dónde. Van
 * deshabilitadas de verdad, con el porqué escrito debajo, en vez de aparentar
 * que funcionan y no hacer nada al pulsarlas.
 *
 * Es el único sitio del panel donde tiene sentido un desplegable de acciones:
 * son tres, y dos no se pueden usar — puestas en fila serían tres botones,
 * dos de ellos apagados, ocupando la cabecera entera.
 */
export default function AccionesCliente({ cliente }: { cliente: Cliente }) {
  const { mostrarAviso } = useToast();

  function descargar() {
    /* El nombre del archivo lleva la cédula y no el nombre: dos clientes se
       pueden llamar igual, y además el nombre trae tildes y espacios que
       algunos sistemas de archivos maltratan. */
    descargarCsv(`cliente-${cliente.identificacion}.csv`, csvCliente(cliente));
    mostrarAviso(`Ficha de ${cliente.nombre} descargada`, "success");
  }

  return (
    <Dropdown
      alineacion="derecha"
      claseBoton={BOTON}
      etiqueta={
        <>
          <span className="control-sheen" aria-hidden="true" />
          Acciones
          <span aria-hidden="true">▾</span>
        </>
      }
    >
      <DropdownItem onClick={descargar}>Descargar ficha (CSV)</DropdownItem>
      <DropdownDivider />
      <DropdownItem deshabilitado>Editar datos</DropdownItem>
      <DropdownItem deshabilitado>Dar de baja</DropdownItem>
      <p className="px-4 py-2 text-xs leading-snug text-verde-300">
        Editar y dar de baja necesitan base de datos.
      </p>
    </Dropdown>
  );
}
