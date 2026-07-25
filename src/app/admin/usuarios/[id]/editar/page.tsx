'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UserForm from '@/components/admin/UserForm';
import { Usuario, UsuarioCreate } from '@/types/usuario';
import { obtenerUsuario, actualizarUsuario } from '@/lib/usuarios';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const usuarioId = params.id as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const datos = await obtenerUsuario(usuarioId);
        if (!datos) {
          setError('Usuario no encontrado');
          return;
        }
        setUsuario(datos);
      } catch (err) {
        setError('Error al cargar el usuario');
      } finally {
        setLoading(false);
      }
    };

    cargarUsuario();
  }, [usuarioId]);

  const handleSubmit = async (datos: UsuarioCreate) => {
    setIsSubmitting(true);
    try {
      await actualizarUsuario(usuarioId, datos);
      router.push('/admin/usuarios');
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-verde-300">Cargando usuario...</p>
      </div>
    );
  }

  if (error || !usuario) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl text-verde">Error</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-verde mb-2">Editar Usuario</h1>
        <p className="text-verde-300">Actualiza la información de {usuario.nombre}</p>
      </div>

      <UserForm usuario={usuario} onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  );
}
