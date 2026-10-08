import type { Metadata } from "next";
import PanelHorario from "@/components/admin/clases/PanelHorario";
import { hoyEnBogota } from "@/lib/admin/horario";
import {
  getHorarioSemanal,
  getInstructoras,
  getSalas,
  getSemanasAgenda,
  getUsuarioActual,
} from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Horario semanal · Panel administrativo",
  robots: { index: false, follow: false },
};

/**
 * El horario que se repite cada semana (tabla `horario_semanal`, oct 2026).
 * La agenda lo sigue sola: ver la migración `20261010120000_agenda_automatica`.
 *
 * Lo arma el mostrador (Administración y Recepción), igual que la agenda; las
 * instructoras lo consultan. RLS y las funciones de base lo vuelven a impedir.
 *
 * El `<h1>` va `sr-only` porque el visible lo pone `AdminTopbar` desde la ruta.
 */
export default async function HorarioPage() {
  const usuario = await getUsuarioActual();
  const puedeEditar =
    usuario?.rol === "Administración" || usuario?.rol === "Recepción";
  const [franjas, instructoras, salas, semanas] = await Promise.all([
    getHorarioSemanal(hoyEnBogota()),
    getInstructoras(),
    getSalas(),
    getSemanasAgenda(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Horario semanal</h1>
      <PanelHorario
        franjas={franjas}
        instructoras={instructoras}
        salas={salas}
        puedeEditar={puedeEditar}
        semanas={semanas}
      />
    </div>
  );
}
