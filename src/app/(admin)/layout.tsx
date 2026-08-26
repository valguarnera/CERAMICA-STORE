import { redirect } from 'next/navigation';
import { getValidatedSession } from '@/lib/get-server-session';
import { Sidebar } from '@/presentation/components/admin/Sidebar';
import { Header } from '@/presentation/components/admin/Header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidatedSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header userRole={session.role} />
      <main className="lg:ml-64 min-h-[calc(100vh-4rem)]">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}