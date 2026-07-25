import AdminLayout from '@/components/admin/AdminLayout';

export const metadata = {
  title: 'Panel Administrativo — Reforme Studio Pilates',
  description: 'Gestión de usuarios, clases y planes de Reforme Studio Pilates',
};

export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
