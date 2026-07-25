'use client';

import { Usuario } from '@/types/usuario';

interface RecentIngressesProps {
  usuarios: Usuario[];
}

export default function RecentIngresses({ usuarios }: RecentIngressesProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-soft p-6">
      <h2 className="font-display text-2xl text-verde mb-6">Últimos Ingresos</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-beige">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-verde-300 uppercase tracking-wide text-xs">
                Nombre
              </th>
              <th className="text-left py-3 px-4 font-semibold text-verde-300 uppercase tracking-wide text-xs">
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold text-verde-300 uppercase tracking-wide text-xs">
                Teléfono
              </th>
              <th className="text-left py-3 px-4 font-semibold text-verde-300 uppercase tracking-wide text-xs">
                Rol
              </th>
              <th className="text-left py-3 px-4 font-semibold text-verde-300 uppercase tracking-wide text-xs">
                Fecha Ingreso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige">
            {usuarios.map((usuario, idx) => (
              <tr key={usuario.id} className="hover:bg-arena transition">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dorado to-verde-500 flex items-center justify-center text-white text-xs font-semibold">
                      {usuario.nombre.charAt(0)}
                    </div>
                    <span className="font-semibold text-verde">{usuario.nombre}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-verde-300">{usuario.email}</td>
                <td className="py-4 px-4 text-verde-300">{usuario.telefono}</td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      usuario.rol === 'cliente'
                        ? 'bg-verde-100 text-verde-700'
                        : usuario.rol === 'instructor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {usuario.rol}
                  </span>
                </td>
                <td className="py-4 px-4 text-verde-300 font-mono">{formatDate(usuario.fechaRegistro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
