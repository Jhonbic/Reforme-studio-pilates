import AdminCard from '@/components/admin/AdminCard';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-4xl text-verde mb-2">Dashboard</h1>
        <p className="text-verde-300">Bienvenido al panel administrativo de Reforme Studio Pilates</p>
      </div>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-4 gap-4">
        <AdminCard
          title="Usuarios Totales"
          value="24"
          subtitle="+3 esta semana"
          icon="👥"
          trend="up"
        />
        <AdminCard
          title="Clientes Activos"
          value="18"
          subtitle="18 con membresía vigente"
          icon="✅"
          trend="up"
        />
        <AdminCard
          title="Instructores"
          value="3"
          subtitle="Todos activos"
          icon="🧘‍♀️"
          trend="neutral"
        />
        <AdminCard
          title="Pendientes"
          value="3"
          subtitle="Requieren aprobación"
          icon="⏳"
          trend="down"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-soft">
          <h2 className="font-display text-xl text-verde mb-4">Gestión de Usuarios</h2>
          <p className="text-verde-300 text-sm mb-4">Administra clientes, instructores y personal</p>
          <Link
            href="/admin/usuarios"
            className="inline-block px-6 py-2 bg-dorado text-verde rounded-lg font-semibold hover:bg-dorado-dark transition"
          >
            Ir a Usuarios
          </Link>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-soft">
          <h2 className="font-display text-xl text-verde mb-4">Próximamente</h2>
          <p className="text-verde-300 text-sm mb-4">Módulos de clases, planes y reportes</p>
          <button
            disabled
            className="inline-block px-6 py-2 bg-beige text-verde-300 rounded-lg font-semibold cursor-not-allowed"
          >
            Deshabilitado
          </button>
        </div>
      </div>

      {/* Resumen reciente */}
      <div className="bg-white rounded-lg p-6 shadow-soft">
        <h2 className="font-display text-xl text-verde mb-4">Registros Recientes</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between py-2 border-b border-beige">
            <span>Sandra López se registró</span>
            <span className="text-verde-300">Hoy</span>
          </li>
          <li className="flex justify-between py-2 border-b border-beige">
            <span>Carlos Mendez renovó membresía</span>
            <span className="text-verde-300">Ayer</span>
          </li>
          <li className="flex justify-between py-2">
            <span>María Instructora fue añadida</span>
            <span className="text-verde-300">3 días atrás</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
