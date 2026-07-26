import { REJILLA_CLIENTE, REJILLA_EQUIPO, ROTULO } from "./rejilla";

/**
 * Rótulos de las columnas del listado.
 *
 * **Solo en escritorio** (`hidden md:grid`): en móvil la fila no tiene columnas,
 * se apila, y cada dato lleva su etiqueta pegada cuando le hace falta («Vence
 * 25 jul»). Una cabecera sobre una lista apilada rotularía columnas que no
 * existen.
 *
 * ⚠️ Va `aria-hidden`. No es un descuido: esto **no es una `<table>>`** —la fila
 * entera es un enlace, y una tabla no puede envolver una `<tr>` en un `<a>`—,
 * así que no hay relación semántica entre estos rótulos y las celdas de abajo.
 * Un lector de pantalla los leería como una fila más de datos sin sentido. Quien
 * navega con lector recibe la información por los `sr-only` de cada fila, que
 * son los que sí van adosados al dato.
 */
export default function CabeceraLista({
  pestana,
}: {
  pestana: "clientes" | "equipo";
}) {
  const esClientes = pestana === "clientes";

  return (
    <div
      aria-hidden="true"
      className={`hidden border-b border-beige bg-arena/40 py-2.5 md:grid ${
        esClientes ? REJILLA_CLIENTE : REJILLA_EQUIPO
      }`}
    >
      {/* Columna del avatar: sin rótulo, pero tiene que ocupar su hueco. */}
      <span />
      <span className={ROTULO}>{esClientes ? "Cliente" : "Miembro"}</span>
      <span className={ROTULO}>{esClientes ? "Plan" : "Rol"}</span>
      <span className={ROTULO}>Estado</span>
      <span className={`${ROTULO} text-right`}>
        {esClientes ? "Vence" : "Desde"}
      </span>
      {/* Columna del chevron, solo en clientes. */}
      {esClientes && <span />}
    </div>
  );
}
