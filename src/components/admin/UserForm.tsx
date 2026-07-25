'use client';

import { useState, useEffect } from 'react';
import { Usuario, UsuarioCreate, RolUsuario } from '@/types/usuario';
import Button from '@/components/ui/Button';

interface UserFormProps {
  usuario?: Usuario;
  onSubmit: (datos: UsuarioCreate) => Promise<void>;
  isLoading?: boolean;
}

export default function UserForm({ usuario, onSubmit, isLoading }: UserFormProps) {
  const [formData, setFormData] = useState<UsuarioCreate>({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    telefono: usuario?.telefono || '',
    documento: usuario?.documento || '',
    genero: usuario?.genero || undefined,
    fechaNacimiento: usuario?.fechaNacimiento || '',
    rol: usuario?.rol || 'cliente',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nombre || !formData.email || !formData.telefono) {
      setError('Por favor completa los campos requeridos');
      return;
    }

    try {
      await onSubmit(formData);
      setSuccess('Usuario guardado correctamente');
      if (!usuario) {
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          documento: '',
          genero: undefined,
          fechaNacimiento: '',
          rol: 'cliente',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg p-6 shadow-soft">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej. Sandra López"
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Ej. sandra@example.com"
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Teléfono *</label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="Ej. +57 320 1234567"
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          />
        </div>

        {/* Documento */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Documento</label>
          <input
            type="text"
            name="documento"
            value={formData.documento || ''}
            onChange={handleChange}
            placeholder="Ej. 1234567890"
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          />
        </div>

        {/* Género */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Género</label>
          <select
            name="genero"
            value={formData.genero || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          >
            <option value="">Selecciona...</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Fecha de Nacimiento */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Fecha de Nacimiento</label>
          <input
            type="date"
            name="fechaNacimiento"
            value={formData.fechaNacimiento || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-semibold text-verde mb-2">Rol</label>
          <select
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-dorado text-verde"
          >
            <option value="cliente">Cliente</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
      </div>

      {/* Mensajes */}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
      {success && <div className="p-4 bg-verde-50 border border-verde-200 rounded-lg text-verde text-sm">{success}</div>}

      {/* Botón */}
      <div className="flex gap-3 justify-end pt-4">
        <a href="/admin/usuarios" className="px-6 py-2 rounded-lg text-verde hover:bg-beige transition">
          Cancelar
        </a>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-dorado text-verde hover:bg-dorado-dark"
        >
          {isLoading ? 'Guardando...' : usuario ? 'Actualizar' : 'Crear Usuario'}
        </Button>
      </div>
    </form>
  );
}
