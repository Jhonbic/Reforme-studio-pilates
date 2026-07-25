'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserTable from '@/components/admin/UserTable';
import { Usuario } from '@/types/usuario';
import { obtenerUsuarios, eliminarUsuario } from '@/lib/usuarios';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const datos = await obtenerUsuarios();
        setUsuarios(datos);
      } catch (err) {
        setError('Error al cargar usuarios');
      } finally {
        setLoading(false);
      }
    };

    cargarUsuarios();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      await eliminarUsuario(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-verde mb-2">Usuarios</h1>
          <p className="text-verde-300">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="px-6 py-3 bg-dorado text-verde rounded-lg font-semibold hover:bg-dorado-dark transition"
        >
          + Nuevo Usuario
        </Link>
      </div>

      {/* Filtros (futura mejora) */}
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-white border border-beige rounded-lg text-sm text-verde hover:bg-arena transition">
          Todos
        </button>
        <button className="px-4 py-2 bg-white border border-beige rounded-lg text-sm text-verde hover:bg-arena transition">
          Activos
        </button>
        <button className="px-4 py-2 bg-white border border-beige rounded-lg text-sm text-verde hover:bg-arena transition">
          Pendientes
        </button>
      </div>

      {/* Contenido */}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-verde-300">Cargando usuarios...</p>
        </div>
      ) : usuarios.length > 0 ? (
        <UserTable usuarios={usuarios} onDelete={handleDelete} />
      ) : (
        <div className="bg-white rounded-lg p-12 text-center shadow-soft">
          <p className="text-verde-300 mb-4">No hay usuarios registrados aún</p>
          <Link
            href="/admin/usuarios/nuevo"
            className="inline-block px-6 py-2 bg-dorado text-verde rounded-lg font-semibold hover:bg-dorado-dark transition"
          >
            Crear primer usuario
          </Link>
        </div>
      )}
    </div>
  );
}
