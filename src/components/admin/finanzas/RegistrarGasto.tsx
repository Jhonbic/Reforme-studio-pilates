"use client";

import { useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import CampoSelect from "@/components/admin/campos/CampoSelect";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { useToast } from "@/context/ToastContext";
import { moneda } from "@/lib/admin/format";
import type { CategoriaGasto, MetodoPago } from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";

const CATEGORIAS: CategoriaGasto[] = [
  "Arriendo",
  "Nómina",
  "Servicios",
  "Mantenimiento",
  "Marketing",
];

const METODOS: MetodoPago[] = ["Efectivo", "Nequi", "Transferencia", "Tarjeta"];

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

type Campos = {
  categoria: string;
  concepto: string;
  importe: string;
  fecha: string;
  metodo: string;
};

const VACIO: Campos = {
  categoria: "",
  concepto: "",
  importe: "",
  fecha: "",
  metodo: "Transferencia",
};

/**
 * Una sola función de validación para el `blur` y para el envío, así el
 * mensaje que sale al salir de un campo y el que sale al guardar no pueden
 * diferir. Misma doctrina que `FormularioAlta`.
 */
function errorDe(campo: keyof Campos, v: Campos, hoy: string): string {
  switch (campo) {
    case "categoria":
      return v.categoria ? "" : "Elige una categoría.";
    case "concepto":
      return v.concepto.trim().length >= 3
        ? ""
        : "Describe el gasto en al menos 3 caracteres.";
    case "importe":
      if (!v.importe) return "Escribe el importe.";
      return Number(v.importe) > 0 ? "" : "El importe tiene que ser mayor que 0.";
    case "fecha":
      if (!v.fecha) return "Elige la fecha del gasto.";
      /* Un gasto es un hecho ya ocurrido. Comparar cadenas ISO basta: se
         ordenan igual que cronológicamente. */
      return v.fecha <= hoy ? "" : "La fecha no puede ser posterior a hoy.";
    case "metodo":
      return v.metodo ? "" : "Elige cómo se pagó.";
  }
}

/**
 * Alta de un gasto.
 *
 * ⚠️ **En modal y no en página propia, al revés que el alta de cliente.** Aquel
 * tiene catorce campos y una lógica de menor de edad; este tiene cinco y se
 * rellena mirando el libro que hay detrás. Sacarlo a otra ruta obligaría a
 * perder de vista los movimientos justo cuando se está cuadrando la caja.
 *
 * ⚠️ **NO GUARDA NADA, y se dice sin eufemismos.** No hay base de datos ni
 * mutador: al enviar, el aviso explica que el gasto no se ha registrado. Es la
 * misma decisión que `/admin/usuarios/nuevo` — un formulario que dice «guardado»
 * y no guarda es peor que uno que no existe.
 */
export default function RegistrarGasto({ hoy }: { hoy: string }) {
  const { mostrarAviso } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>(
    {},
  );
  /* ⚠️ Un ref POR CAMPO, no uno solo «al primero que falle». Un callback de
     ref se ejecuta al montar el elemento, no al enviar: si guardara ahí el
     primer error, en el momento del `submit` valdría `null` —los errores
     acaban de calcularse y aún no se ha re-renderizado— y el foco no se
     movería nunca. */
  const refs = useRef<Partial<Record<keyof Campos, HTMLElement | null>>>({});

  function cerrar() {
    setAbierto(false);
    setV(VACIO);
    setErrores({});
  }

  /** `onChange` solo QUITA errores, nunca los pone: premia pronto, castiga
   *  tarde. Poner el error mientras se teclea regaña por un campo a medias. */
  function set<K extends keyof Campos>(campo: K, valor: string) {
    setV((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      setErrores((e) =>
        e[campo] && !errorDe(campo, siguiente, hoy)
          ? { ...e, [campo]: "" }
          : e,
      );
      return siguiente;
    });
  }

  /** El `blur` solo saca error si el campo tiene contenido: tabular por uno
   *  vacío que ibas a rellenar después no debe castigarte. */
  function alSalir(campo: keyof Campos) {
    if (!v[campo]) return;
    setErrores((e) => ({ ...e, [campo]: errorDe(campo, v, hoy) }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    const orden = Object.keys(VACIO) as (keyof Campos)[];
    const nuevos: Partial<Record<keyof Campos, string>> = {};
    for (const campo of orden) {
      const err = errorDe(campo, v, hoy);
      if (err) nuevos[campo] = err;
    }
    setErrores(nuevos);

    const primero = orden.find((c) => nuevos[c]);
    if (primero) {
      /* Con cinco campos el foco va al primero que falla. El resumen de errores
         de `FormularioAlta` existe porque allí son catorce y arreglarlos de uno
         en uno es tortura por goteo; aquí caben todos en pantalla a la vez. */
      refs.current[primero]?.focus();
      return;
    }

    cerrar();
    mostrarAviso(
      `El gasto de ${moneda(Number(v.importe))} NO se ha registrado: Finanzas todavía no puede escribir. Llegará con la base de datos.`,
      "warning",
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={BOTON}
      >
        <span className="control-sheen" aria-hidden="true" />
        <span aria-hidden="true">+</span>
        Registrar gasto
      </button>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Registrar gasto"
        tamano="md"
      >
        <form onSubmit={enviar} noValidate className="space-y-4">
          <CampoSelect
            nombre="categoria"
            etiqueta="Categoría"
            value={v.categoria}
            onChange={(e) => set("categoria", e.target.value)}
            onBlur={() => alSalir("categoria")}
            error={errores.categoria}
            ref={(el) => {
              refs.current.categoria = el;
            }}
            ancho
          >
            <option value="">Elige una…</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            nombre="concepto"
            etiqueta="Concepto"
            value={v.concepto}
            onChange={(e) => set("concepto", e.target.value)}
            onBlur={() => alSalir("concepto")}
            error={errores.concepto}
            ref={(el) => {
              refs.current.concepto = el;
            }}
            placeholder="Arriendo del local · julio"
            ayuda="Lo que se lee en el libro. Cuanto más concreto, menos hay que preguntar después."
            autoComplete="off"
            ancho
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              nombre="importe"
              etiqueta="Importe"
              /* ⚠️ Nunca `type="number"`: admite `e`/`+`/`-`, ignora
                 `maxLength`, pierde ceros iniciales y devuelve cadena vacía
                 cuando su contenido es inválido. Filtrando a dígitos en el
                 `onChange`, el error «solo números» no puede existir. */
              inputMode="numeric"
              pattern="\d*"
              value={v.importe}
              onChange={(e) => set("importe", soloDigitos(e.target.value))}
              onBlur={() => alSalir("importe")}
              error={errores.importe}
              ref={(el) => {
                refs.current.importe = el;
              }}
              /* El eco formateado va debajo, no dentro del campo: formatear un
                 input controlado descoloca el cursor al editar por el medio. */
              ayuda={v.importe ? moneda(Number(v.importe)) : "En pesos, sin puntos."}
              autoComplete="off"
            />

            <CampoTexto
              nombre="fecha"
              etiqueta="Fecha"
              type="date"
              /* Un gasto ya ocurrió: el calendario no ofrece el futuro, así
                 que ese error tampoco puede llegar a existir. */
              max={hoy}
              value={v.fecha}
              onChange={(e) => set("fecha", e.target.value)}
              onBlur={() => alSalir("fecha")}
              error={errores.fecha}
              ref={(el) => {
                refs.current.fecha = el;
              }}
            />
          </div>

          <CampoSelect
            nombre="metodo"
            etiqueta="Cómo se pagó"
            value={v.metodo}
            onChange={(e) => set("metodo", e.target.value)}
            error={errores.metodo}
            ref={(el) => {
              refs.current.metodo = el;
            }}
            ancho
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            nombre="comprobante"
            etiqueta="Comprobante"
            type="file"
            accept="image/*,.pdf"
            ayuda="Foto o PDF de la factura. Sin base de datos no hay dónde subirlo, así que por ahora no se envía."
            ancho
          />

          <p className="rounded-xl border border-dashed border-dorado/50 bg-dorado/5 px-4 py-3 text-sm text-verde-700">
            Este formulario <strong>no guarda todavía</strong>: Finanzas se lee,
            no se escribe. Sirve para acordar qué datos pide un gasto antes de
            que exista la base de datos.
          </p>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={cerrar} className={BOTON}>
              <span className="control-sheen" aria-hidden="true" />
              Cancelar
            </button>
            <button type="submit" className={BOTON_PRIMARIO}>
              Registrar gasto
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
