import { Header } from '@/presentation/components/store/Header';
import { CartDrawer } from '@/presentation/components/store/CartDrawer';
import { ToastProvider } from '@/presentation/components/ui/Toast';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <CartDrawer />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}