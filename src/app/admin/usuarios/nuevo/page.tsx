'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserForm from '@/components/admin/UserForm';
import { UsuarioCreate } from '@/types/usuario';
import { crearUsuario } from '@/lib/usuarios';

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (datos: UsuarioCreate) => {
    setIsLoading(true);
    try {
      await crearUsuario(datos);
      router.push('/admin/usuarios');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-verde mb-2">Crear Nuevo Usuario</h1>
        <p className="text-verde-300">Añade un nuevo cliente, instructor o personal administrativo</p>
      </div>

      <UserForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
