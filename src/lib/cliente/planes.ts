import { moneda } from "@/lib/admin/format";
import type { ModalidadPlan } from "@/lib/admin/types";

/** El orden de las pestañas de «Planes». */
export const MODALIDADES: ModalidadPlan[] = ["Mat", "Reformer", "Fusión"];

type ConClases = { clasesReformer: number; clasesMat: number; caracteristicas: string[] };

/**
 * Lo que incluye un plan, como lista con ✓ en su tarjeta (al estilo de los
 * beneficios de DEMO adminGym): las clases de cada tipo, el precio por clase
 * y lo que Administración haya escrito en «Características». La vigencia no:
 * va en la pastilla de la cabecera.
 */
export function beneficiosDe(p: ConClases, precio: number): string[] {
  const total = p.clasesReformer + p.clasesMat;
  return [
    p.clasesReformer > 0 ? `${p.clasesReformer} ${p.clasesReformer === 1 ? "clase" : "clases"} de Reformer` : null,
    p.clasesMat > 0 ? `${p.clasesMat} ${p.clasesMat === 1 ? "clase" : "clases"} de Mat` : null,
    total > 0 ? `${moneda(Math.round(precio / total))} por clase` : null,
    ...p.caracteristicas.map((c) => c.trim()).filter(Boolean),
  ].filter((b): b is string => b !== null);
}

/**
 * La pestaña que se abre al entrar: la de SU plan si tiene uno a la venta
 * (viene a renovar); si no, la del plan destacado; si no, la primera con
 * planes.
 */
export function pestanaInicial(
  planes: { nombre: string; modalidad: ModalidadPlan; destacado: boolean }[],
  planActual: string | null,
): ModalidadPlan {
  const suyo = planes.find((p) => p.nombre === planActual);
  if (suyo) return suyo.modalidad;
  const destacado = planes.find((p) => p.destacado);
  if (destacado) return destacado.modalidad;
  return MODALIDADES.find((m) => planes.some((p) => p.modalidad === m)) ?? "Mat";
}
