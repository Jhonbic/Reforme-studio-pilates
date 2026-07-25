'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/admin/clases', label: 'Clases', icon: '🧘‍♀️' },
  { href: '/admin/planes', label: 'Planes', icon: '💳' },
];

export default function AdminNavbar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-verde text-arena shadow-soft p-6 flex flex-col h-screen sticky top-0">
      {/* Logo / Branding */}
      <div className="mb-8 pb-6 border-b border-verde-700">
        <h1 className="font-display text-2xl text-dorado">Reforme</h1>
        <p className="text-sm text-verde-300 mt-1">Panel Administrativo</p>
      </div>

      {/* Menú */}
      <div className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-dorado text-verde font-semibold'
                  : 'text-arena hover:bg-verde-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-verde-700 text-sm text-verde-300">
        <p>Sesión: Admin</p>
        <button className="mt-3 w-full px-3 py-2 rounded text-arena hover:bg-verde-700 transition">
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
