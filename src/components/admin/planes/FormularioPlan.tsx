"use client";

import { useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import CampoTexto from "@/components/admin/campos/CampoTexto";
import { CASILLA, FILA_CHECK } from "@/components/admin/campos/estilos";
import { moneda } from "@/lib/admin/format";
import type { BorradorPlan, PlanConMetricas } from "@/lib/admin/types";
import { soloDigitos } from "@/lib/validacion";

const BOTON_PRIMARIO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-dorado px-5 text-sm font-medium text-verde-900 transition-colors duration-300 hover:bg-dorado-dark";

const BOTON =
  "control-fx relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-full border border-verde/40 px-5 text-sm text-verde-700 transition-colors duration-300 hover:border-dorado hover:text-verde";

const VACIO: BorradorPlan = {
  nombre: "",
  precio: 0,
  vigenciaDias: 30,
  clasesIncluidas: null,
  seVende: true,
  descripcion: "",
  caracteristicas: [],
};

type Errores = Partial<Record<"nombre" | "precio" | "vigenciaDias", string>>;

function errorDe(campo: keyof Errores, v: BorradorPlan): string {
  switch (campo) {
    case "nombre":
      return v.nombre.trim().length >= 3
        ? ""
        : "El nombre necesita al menos 3 caracteres.";
    case "precio":
      return v.precio > 0 ? "" : "El precio tiene que ser mayor que 0.";
    case "vigenciaDias":
      return v.vigenciaDias > 0
        ? ""
        : "La vigencia tiene que ser de al menos 1 día.";
  }
}

/** `PlanConMetricas` → borrador editable. Las métricas se quedan fuera: son
 *  consecuencia del plan, no algo que se pueda escribir en un formulario. */
function aBorrador(p: PlanConMetricas): BorradorPlan {
  return {
    nombre: p.nombreVisible,
    precio: p.precio,
    vigenciaDias: p.vigenciaDias,
    clasesIncluidas: p.clasesIncluidas,
    seVende: p.seVende,
    descripcion: p.descripcion,
    caracteristicas: [...p.caracteristicas],
  };
}

/**
 * Alta y edición de un plan.
 *
 * Un solo componente para las dos cosas: los campos son idénticos y mantener
 * dos formularios gemelos garantiza que acaben divergiendo. Lo único que
 * cambia es el título, el texto del botón y de dónde salen los valores
 * iniciales.
 *
 * ⚠️ **NO GUARDA NADA.** No hay base de datos ni mutador, y el catálogo vive en
 * `mock.ts` como constante de módulo: mutarlo se perdería en el siguiente
 * render del servidor y, peor, *parecería* que funciona. Al enviar se dice.
 */
export default function FormularioPlan({
  abierto,
  plan,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  /** `undefined` = plan nuevo. */
  plan?: PlanConMetricas;
  onCerrar: () => void;
  onGuardado: (nombre: string, esNuevo: boolean) => void;
}) {
  const esNuevo = plan === undefined;
  const [v, setV] = useState<BorradorPlan>(() =>
    plan ? aBorrador(plan) : VACIO,
  );
  const [errores, setErrores] = useState<Errores>({});
  const [nuevaCaract, setNuevaCaract] = useState("");
  const refs = useRef<Partial<Record<keyof Errores, HTMLElement | null>>>({});
  const refCaract = useRef<HTMLInputElement>(null);

  /* ⚠️ `key` en el Modal desde fuera sería lo ideal, pero el estado vive aquí:
     se resincroniza cuando cambia el plan que se está editando. Sin esto, abrir
     «editar Mensual», cerrar y abrir «editar Trimestral» enseñaría los datos
     del primero. */
  const [ultimoPlan, setUltimoPlan] = useState(plan?.nombreVisible);
  if (plan?.nombreVisible !== ultimoPlan) {
    setUltimoPlan(plan?.nombreVisible);
    setV(plan ? aBorrador(plan) : VACIO);
    setErrores({});
    setNuevaCaract("");
  }

  function set<K extends keyof BorradorPlan>(campo: K, valor: BorradorPlan[K]) {
    setV((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      if (campo in errores) {
        const k = campo as keyof Errores;
        if (errores[k] && !errorDe(k, siguiente)) {
          setErrores((e) => ({ ...e, [k]: "" }));
        }
      }
      return siguiente;
    });
  }

  function anadirCaracteristica() {
    const t = nuevaCaract.trim();
    if (!t) return;
    /* Sin duplicados: dos líneas iguales en la tarjeta se leen como un fallo.
       Se compara sin distinguir mayúsculas para que «Grupos reducidos» y
       «grupos reducidos» no convivan. */
    if (
      v.caracteristicas.some((c) => c.toLowerCase() === t.toLowerCase())
    ) {
      setNuevaCaract("");
      return;
    }
    setV((prev) => ({ ...prev, caracteristicas: [...prev.caracteristicas, t] }));
    setNuevaCaract("");
    refCaract.current?.focus();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    const orden: (keyof Errores)[] = ["nombre", "precio", "vigenciaDias"];
    const nuevos: Errores = {};
    for (const c of orden) {
      const err = errorDe(c, v);
      if (err) nuevos[c] = err;
    }
    setErrores(nuevos);

    const primero = orden.find((c) => nuevos[c]);
    if (primero) {
      refs.current[primero]?.focus();
      return;
    }

    onGuardado(v.nombre.trim(), esNuevo);
    onCerrar();
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esNuevo ? "Nuevo plan" : `Editar ${plan.nombreVisible}`}
      tamano="lg"
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CampoTexto
          nombre="nombre"
          etiqueta="Nombre del plan"
          value={v.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          error={errores.nombre}
          placeholder="Mensual, Pack 10 clases…"
          autoComplete="off"
          ref={(el) => {
            refs.current.nombre = el;
          }}
          ancho
        />

        <CampoTexto
          nombre="descripcion"
          etiqueta="Para quién es"
          value={v.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Para quien entrena de forma constante todas las semanas."
          ayuda="Una línea. Es lo que se lee bajo el precio en la tarjeta."
          autoComplete="off"
          ancho
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            nombre="precio"
            etiqueta="Precio"
            /* Nunca `type="number"`: admite e/+/-, ignora maxLength y pierde
               ceros iniciales. Filtrando a dígitos, «solo números» no existe. */
            inputMode="numeric"
            pattern="\d*"
            value={v.precio ? String(v.precio) : ""}
            onChange={(e) => set("precio", Number(soloDigitos(e.target.value)))}
            error={errores.precio}
            ayuda={v.precio ? moneda(v.precio) : "En pesos, sin puntos."}
            autoComplete="off"
            ref={(el) => {
              refs.current.precio = el;
            }}
          />

          <CampoTexto
            nombre="vigenciaDias"
            etiqueta="Vigencia (días)"
            inputMode="numeric"
            pattern="\d*"
            value={v.vigenciaDias ? String(v.vigenciaDias) : ""}
            onChange={(e) =>
              set("vigenciaDias", Number(soloDigitos(e.target.value)))
            }
            error={errores.vigenciaDias}
            ayuda="30 = un mes. 1 = se consume el mismo día."
            autoComplete="off"
            ref={(el) => {
              refs.current.vigenciaDias = el;
            }}
          />
        </div>

        {/* ⚠️ «Ilimitadas» es una casilla y no un valor especial que haya que
            teclear (¿0? ¿vacío? ¿-1?). Al marcarla, el campo de número
            desaparece: no se puede dejar puesto un número que ya no significa
            nada. */}
        <fieldset className="rounded-xl border border-beige p-4">
          <legend className="px-1.5 text-sm font-medium text-verde">
            Clases incluidas
          </legend>

          <label className={FILA_CHECK}>
            <input
              type="checkbox"
              checked={v.clasesIncluidas === null}
              onChange={(e) =>
                set("clasesIncluidas", e.target.checked ? null : 10)
              }
              className={CASILLA}
            />
            <span className="text-sm text-verde-700">
              Ilimitadas dentro de la vigencia
            </span>
          </label>

          {v.clasesIncluidas !== null && (
            <div className="mt-3">
              <CampoTexto
                nombre="clasesIncluidas"
                etiqueta="Cuántas clases"
                inputMode="numeric"
                pattern="\d*"
                value={String(v.clasesIncluidas)}
                onChange={(e) =>
                  set("clasesIncluidas", Number(soloDigitos(e.target.value)))
                }
                autoComplete="off"
              />
            </div>
          )}
        </fieldset>

        {/* Lista editable de características */}
        <fieldset className="rounded-xl border border-beige p-4">
          <legend className="px-1.5 text-sm font-medium text-verde">
            Qué incluye
          </legend>

          {v.caracteristicas.length > 0 && (
            <ul className="mb-3 space-y-2">
              {v.caracteristicas.map((c, i) => (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-xl bg-arena px-3 py-2"
                >
                  <span aria-hidden="true" className="text-dorado-dark">
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-verde-700">
                    {c}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setV((prev) => ({
                        ...prev,
                        caracteristicas: prev.caracteristicas.filter(
                          (_, j) => j !== i,
                        ),
                      }))
                    }
                    /* El nombre de la característica va en el aria-label: con
                       cinco botones «Quitar» seguidos, un lector de pantalla
                       leería cinco veces lo mismo sin saber cuál es cuál. */
                    aria-label={`Quitar «${c}»`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-verde-300 transition-colors duration-300 hover:text-[var(--color-estado-grave)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              ref={refCaract}
              type="text"
              value={nuevaCaract}
              onChange={(e) => setNuevaCaract(e.target.value)}
              /* ⚠️ `Enter` añade en vez de enviar el formulario. Sin esto, dar
                 a Enter tras escribir una característica guardaría el plan
                 dejándose fuera justo lo que se acababa de teclear. */
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  anadirCaracteristica();
                }
              }}
              placeholder="Grupos de máximo 6 personas"
              aria-label="Nueva característica"
              className="min-h-[44px] w-full rounded-full border border-beige bg-white px-4 text-sm text-verde-700 placeholder:text-verde-300 transition-colors duration-300 hover:border-dorado/60"
            />
            <button
              type="button"
              onClick={anadirCaracteristica}
              disabled={!nuevaCaract.trim()}
              className={`${BOTON} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {nuevaCaract.trim() && (
                <span className="control-sheen" aria-hidden="true" />
              )}
              Añadir
            </button>
          </div>
          <p className="mt-2 text-xs text-verde-300">
            No repitas aquí el precio, la vigencia ni las clases: ya tienen su
            sitio en la tarjeta.
          </p>
        </fieldset>

        <label className={FILA_CHECK}>
          <input
            type="checkbox"
            checked={v.seVende}
            onChange={(e) => set("seVende", e.target.checked)}
            className={CASILLA}
          />
          <span className="text-sm text-verde-700">
            Se puede contratar hoy
            <span className="block text-xs text-verde-300">
              Al desmarcarlo deja de ofrecerse, pero quien ya lo tiene lo
              conserva hasta que le venza.
            </span>
          </span>
        </label>

        <p className="rounded-xl border border-dashed border-dorado/50 bg-dorado/5 px-4 py-3 text-sm text-verde-700">
          Este formulario <strong>no guarda todavía</strong>: el catálogo vive en
          el código. Sirve para acordar qué define un plan antes de que exista la
          base de datos.
        </p>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={BOTON}>
            <span className="control-sheen" aria-hidden="true" />
            Cancelar
          </button>
          <button type="submit" className={BOTON_PRIMARIO}>
            {esNuevo ? "Crear plan" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
