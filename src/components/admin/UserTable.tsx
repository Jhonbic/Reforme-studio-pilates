'use client';

import Link from 'next/link';
import { Usuario } from '@/types/usuario';

interface UserTableProps {
  usuarios: Usuario[];
  onDelete?: (id: string) => void;
}

const rolBadge = {
  admin: { bg: 'bg-red-100', text: 'text-red-800' },
  instructor: { bg: 'bg-blue-100', text: 'text-blue-800' },
  cliente: { bg: 'bg-verde-100', text: 'text-verde-700' },
  pendiente: { bg: 'bg-amber-100', text: 'text-amber-800' },
};

const estadoBadge = {
  activo: { bg: 'bg-verde-100', text: 'text-verde-700' },
  inactivo: { bg: 'bg-gray-100', text: 'text-gray-700' },
  suspendido: { bg: 'bg-red-100', text: 'text-red-800' },
};

export default function UserTable({ usuarios, onDelete }: UserTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-soft">
      <table className="w-full">
        <thead className="border-b border-beige bg-arena">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Nombre</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Email</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Teléfono</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Rol</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Estado</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-verde">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-beige">
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="hover:bg-arena transition">
              <td className="px-6 py-4">
                <p className="font-sans font-semibold text-verde">{usuario.nombre}</p>
              </td>
              <td className="px-6 py-4 text-sm text-verde-300">{usuario.email}</td>
              <td className="px-6 py-4 text-sm text-verde-300">{usuario.telefono}</td>
              <td className="px-6 py-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    rolBadge[usuario.rol as keyof typeof rolBadge]?.bg
                  } ${rolBadge[usuario.rol as keyof typeof rolBadge]?.text}`}
                >
                  {usuario.rol}
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    estadoBadge[usuario.estado as keyof typeof estadoBadge]?.bg
                  } ${estadoBadge[usuario.estado as keyof typeof estadoBadge]?.text}`}
                >
                  {usuario.estado}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/usuarios/${usuario.id}/editar`}
                    className="px-3 py-1 rounded text-sm font-sans text-dorado hover:bg-dorado hover:text-verde transition"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => onDelete?.(usuario.id)}
                    className="px-3 py-1 rounded text-sm font-sans text-red-600 hover:bg-red-50 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
