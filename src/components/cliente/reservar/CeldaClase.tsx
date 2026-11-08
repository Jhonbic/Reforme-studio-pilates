import type { ClaseParaCliente } from "@/lib/cliente/datos";
import { textoEstado, type EstadoParaMi } from "@/lib/cliente/reservar";

const NO_DISPONIBLE = "bg-arena/50 hover:bg-arena";

/** El fondo de la celda según el estado. Nunca solo por color: la línea de
 *  abajo lo dice con palabras («8 libres», «✓ Tu clase», «Sin plan ese día»). */
const FONDO: Record<EstadoParaMi, string> = {
  disponible: "bg-white hover:bg-dorado/10",
  reservada: "bg-verde hover:bg-verde-700",
  espera: "bg-dorado/10 hover:bg-dorado/20",
  "llena-espera": "bg-white hover:bg-dorado/10",
  llena: NO_DISPONIBLE,
  "sin-plan": NO_DISPONIBLE,
  "sin-clases": NO_DISPONIBLE,
  privada: NO_DISPONIBLE,
};

const APAGADA: EstadoParaMi[] = ["llena", "sin-plan", "sin-clases", "privada"];

/**
 * Una clase como celda de la tabla de horas (nov 2026: antes eran tarjetas
 * sueltas y el usuario las veía «muy sueltas»). Plana, sin borde propio: las
 * líneas las pone la tabla. Es un botón que ocupa la celda entera y abre la
 * hoja de la clase (`HojaClase`), también cuando no se puede reservar: ahí se
 * lee el porqué.
 *
 * `conTipo` en la tabla de la semana, donde las columnas son días y hay que
 * decir si es Reformer o Mat; en la del día las columnas ya son las salas.
 */
export default function CeldaClase({
  clase,
  estado,
  conTipo = false,
  onAbrir,
}: {
  clase: ClaseParaCliente;
  estado: EstadoParaMi;
  conTipo?: boolean;
  onAbrir: (c: ClaseParaCliente) => void;
}) {
  const suya = estado === "reservada";
  const apagada = APAGADA.includes(estado);
  const texto = textoEstado(estado, clase);
  return (
    <button
      type="button"
      onClick={() => onAbrir(clase)}
      aria-label={`${clase.tipo} a las ${clase.horaInicio} con ${clase.instructora}: ${texto}`}
      className={`flex h-full min-h-[60px] w-full flex-col justify-center gap-0.5 px-3 py-2.5 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dorado ${FONDO[estado]}`}
    >
      {conTipo && (
        <span className={`text-sm font-bold ${suya ? "text-arena" : apagada ? "text-verde-300" : "text-verde"}`}>
          {clase.tipo}
        </span>
      )}
      <span
        className={`w-full truncate text-sm ${conTipo ? "" : "font-medium"} ${
          suya ? "text-beige" : apagada ? "text-verde-300" : conTipo ? "text-verde-700" : "text-verde"
        }`}
      >
        {clase.instructora.split(" ")[0]}
      </span>
      <span
        className={`flex w-full items-center gap-1.5 truncate text-xs ${
          suya
            ? "text-dorado-light"
            : estado === "disponible" || estado === "espera"
              ? "text-dorado-tinta"
              : apagada
                ? "text-verde-300"
                : "text-verde-700"
        }`}
      >
        {estado === "disponible" && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-dorado" />}
        <span className="truncate">{texto}</span>
      </span>
    </button>
  );
}
