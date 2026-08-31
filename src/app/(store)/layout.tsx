import { Header } from '@/presentation/components/store/Header';
import { CartDrawer } from '@/presentation/components/store/CartDrawer';
import { ToastProvider } from '@/presentation/components/ui/Toast';
import { getValidatedSession } from '@/lib/get-server-session';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidatedSession();
  const user = session
    ? {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      }
    : null;

  return (
    <ToastProvider>
      <CartDrawer />
      <div className="flex min-h-screen flex-col">
        <Header user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}