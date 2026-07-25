'use client';

interface MonthlyChartProps {
  data: { mes: string; count: number }[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count));
  const scale = maxCount > 0 ? 100 / maxCount : 1;

  return (
    <div className="bg-white rounded-lg shadow-soft p-6">
      <h2 className="font-display text-2xl text-verde mb-6">Registros por Mes</h2>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.mes}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-verde">{item.mes}</label>
              <span className="text-sm font-mono bg-dorado/10 text-dorado px-2 py-1 rounded">
                {item.count} ingresos
              </span>
            </div>
            <div className="w-full bg-beige rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-dorado to-dorado-light h-full rounded-full transition-all duration-300"
                style={{ width: `${item.count * scale}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
