import { getDatabase } from '@/infrastructure/database';
import { SessionService } from '@/domain/services';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/presentation/components/admin/Sidebar';
import { Header } from '@/presentation/components/admin/Header';

async function verifyAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_id')?.value;

  if (!token) {
    return false;
  }

  const db = getDatabase();
  const sessionService = new SessionService(db);
  const session = await sessionService.validateSession(token);

  return session?.role === 'ADMIN';
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await verifyAdminSession();

  if (!isAdmin) {
    redirect('/');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('session_id')?.value;
  let userRole = 'ADMIN';

  if (token) {
    const db = getDatabase();
    const sessionService = new SessionService(db);
    const session = await sessionService.validateSession(token);
    userRole = session?.role ?? 'ADMIN';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header userRole={userRole} />
      <main className="lg:ml-64 min-h-[calc(100vh-4rem)]">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}