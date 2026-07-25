'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import RecentIngresses from '@/components/admin/RecentIngresses';
import MonthlyChart from '@/components/admin/MonthlyChart';
import Link from 'next/link';
import { Usuario } from '@/types/usuario';
import {
  obtenerUsuarios,
  obtenerUltimosIngresos,
  obtenerEstadisticasPorMes,
} from '@/lib/usuarios';

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ultimos, setUltimos] = useState<Usuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<{ mes: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [todosLosUsuarios, ultimosIngresos, stats] = await Promise.all([
          obtenerUsuarios(),
          obtenerUltimosIngresos(3),
          obtenerEstadisticasPorMes(),
        ]);

        setUsuarios(todosLosUsuarios);
        setUltimos(ultimosIngresos);
        setEstadisticas(stats);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const activos = usuarios.filter((u) => u.estado === 'activo').length;
  const instructores = usuarios.filter((u) => u.rol === 'instructor').length;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-4xl text-verde mb-2">Dashboard</h1>
        <p className="text-verde-300">Gestión de Reforme Studio Pilates</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid md:grid-cols-4 gap-4">
        <AdminCard
          title="Usuarios Totales"
          value={usuarios.length}
          subtitle={`${activos} activos`}
          icon="👥"
          trend="up"
        />
        <AdminCard
          title="Clientes Activos"
          value={activos}
          subtitle="Con acceso vigente"
          icon="✅"
          trend="up"
        />
        <AdminCard
          title="Instructores"
          value={instructores}
          subtitle="Personal activo"
          icon="🧘‍♀️"
          trend="neutral"
        />
        <AdminCard
          title="Nuevos este Mes"
          value={
            estadisticas.find((s) => s.mes === 'Julio')?.count ||
            0
          }
          subtitle="Julio 2026"
          icon="📈"
          trend="up"
        />
      </div>

      {/* Menu rápido */}
      <div className="grid md:grid-cols-4 gap-4">
        <Link
          href="/admin/usuarios"
          className="bg-white hover:shadow-lift rounded-lg p-4 text-center transition cursor-pointer border border-beige hover:border-dorado"
        >
          <div className="text-3xl mb-2">👥</div>
          <p className="font-semibold text-verde">Usuarios</p>
          <p className="text-sm text-verde-300">Gestionar usuarios</p>
        </Link>

        <Link
          href="/admin/usuarios/nuevo"
          className="bg-white hover:shadow-lift rounded-lg p-4 text-center transition cursor-pointer border border-beige hover:border-dorado"
        >
          <div className="text-3xl mb-2">➕</div>
          <p className="font-semibold text-verde">Nuevo Usuario</p>
          <p className="text-sm text-verde-300">Añadir cliente</p>
        </Link>

        <div className="bg-white rounded-lg p-4 text-center border border-beige opacity-50 cursor-not-allowed">
          <div className="text-3xl mb-2">📅</div>
          <p className="font-semibold text-verde-300">Clases</p>
          <p className="text-sm text-verde-300">Próximamente</p>
        </div>

        <div className="bg-white rounded-lg p-4 text-center border border-beige opacity-50 cursor-not-allowed">
          <div className="text-3xl mb-2">💳</div>
          <p className="font-semibold text-verde-300">Planes</p>
          <p className="text-sm text-verde-300">Próximamente</p>
        </div>
      </div>

      {/* Sección principal: Últimos ingresos y estadísticas */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white rounded-lg shadow-soft p-12 text-center">
              <p className="text-verde-300">Cargando datos...</p>
            </div>
          ) : (
            <RecentIngresses usuarios={ultimos} />
          )}
        </div>

        <div>
          {loading ? (
            <div className="bg-white rounded-lg shadow-soft p-12 text-center">
              <p className="text-verde-300">Cargando datos...</p>
            </div>
          ) : (
            <MonthlyChart data={estadisticas} />
          )}
        </div>
      </div>
    </div>
  );
}
