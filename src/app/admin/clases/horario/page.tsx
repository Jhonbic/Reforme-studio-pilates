import type { Metadata } from "next";
import PanelHorario from "@/components/admin/clases/PanelHorario";
import { horaEnBogota, hoyEnBogota } from "@/lib/admin/horario";
import {
  getHorarioSemanal,
  getInstructoras,
  getSalas,
  getUsuarioActual,
} from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Horario semanal · Panel administrativo",
  robots: { index: false, follow: false },
};

/**
 * El horario que se repite cada semana, y «Generar clases» para pasarlo a la
 * agenda (tabla `horario_semanal`, oct 2026).
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
  const [franjas, instructoras, salas] = await Promise.all([
    getHorarioSemanal(),
    getInstructoras(),
    getSalas(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="sr-only">Horario semanal</h1>
      <PanelHorario
        franjas={franjas}
        instructoras={instructoras}
        salas={salas}
        puedeEditar={puedeEditar}
        hoy={hoyEnBogota()}
        ahora={horaEnBogota()}
      />
    </div>
  );
}
