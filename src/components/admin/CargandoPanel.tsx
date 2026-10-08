/**
 * Pantalla de carga del panel: la que sale al cambiar de módulo mientras el
 * servidor prepara la página (la usan los `loading.tsx` de `/admin`).
 *
 * Sin ella, al pulsar otra sección la pantalla se quedaba quieta hasta que
 * llegaban los datos y parecía colgada (feedback del usuario, oct 2026).
 * Ahora el cambio es inmediato: la lateral y la cabecera ya marcan la sección
 * nueva y aquí se ve que algo está llegando.
 *
 * - Una barra dorada fina arriba, que avanza: «estoy trabajando».
 * - Un esqueleto con la forma general de una pantalla del panel (cabecera,
 *   fila de cifras, bloque grande), no de una en concreto: inventar el
 *   dibujo de cada módulo sería mantener diez maquetas.
 * - Aparece con 150 ms de retraso (`.carga-aparece`): si la página llega
 *   antes, no parpadea nada.
 * - Para lectores de pantalla, un «Cargando…» en `role="status"`.
 */
export default function CargandoPanel() {
  return (
    <div className="carga-aparece mx-auto w-full max-w-[1440px]" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden" aria-hidden="true">
        <div className="carga-barra h-full w-full bg-dorado" />
      </div>

      <div aria-hidden="true">
        <div className="mb-6 space-y-2">
          <Hueso className="h-8 w-64 max-w-full" />
          <Hueso className="h-4 w-44" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-beige bg-white p-5 shadow-card">
              <Hueso className="mb-3 h-3 w-24" />
              <Hueso className="h-8 w-20" />
              <Hueso className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-beige bg-white p-5 shadow-card">
              <Hueso className="mb-4 h-3 w-32" />
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 border-t border-beige py-3">
                  <Hueso className="h-9 w-9 shrink-0 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Hueso className="h-3 w-2/5" />
                    <Hueso className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hueso({ className }: { className: string }) {
  return <div className={`carga-hueso rounded-lg bg-beige ${className}`} />;
}
