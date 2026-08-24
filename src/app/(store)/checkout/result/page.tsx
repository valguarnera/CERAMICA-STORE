'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react';
import { formatARS } from '@/presentation/lib/currency';
import Link from 'next/link';

export default function CheckoutResultPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? 'pending';
  const paymentId = searchParams.get('payment_id');
  const [order, setOrder] = useState<{
    id: string;
    status: string;
    totalCents: number;
    mpPaymentId: string | null;
  } | null>(null);
  const [polling, setPolling] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!paymentId) return;
    const maxAttempts = 10; // 30 seconds / 3s
    const interval = setInterval(async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        return;
      }
      setAttempts((a) => a + 1);
      try {
        const res = await fetch(`/api/checkout/status/${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          if (data.order?.status === 'PAID') {
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [paymentId, attempts]);

  const getStatusIcon = () => {
    if (status === 'approved' || order?.status === 'PAID') return <CheckCircle className="h-16 w-16 text-green-600" />;
    if (status === 'rejected') return <XCircle className="h-16 w-16 text-red-600" />;
    return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
  };

  const getStatusText = () => {
    if (order?.status === 'PAID') return '¡Pago aprobado!';
    if (status === 'approved') return 'Procesando pago...';
    if (status === 'rejected') return 'Pago rechazado';
    if (status === 'pending') return 'Pago pendiente';
    return 'Estado desconocido';
  };

  const getDescription = () => {
    if (order?.status === 'PAID') return `Tu orden #${order.id.slice(0, 8)} fue confirmada.`;
    if (status === 'rejected') return 'El pago fue rechazado. Puedes intentarlo nuevamente con otro medio.';
    if (status === 'pending') return 'Estamos verificando el estado del pago. Esto puede tardar unos segundos.';
    return '';
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
      {getStatusIcon()}
      <h1 className="mt-4 text-2xl font-bold">{getStatusText()}</h1>
      <p className="mt-2 text-muted-foreground">{getDescription()}</p>

      {order && (
        <div className="mt-8 rounded-lg border bg-card p-4 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Orden</span>
            <span className="font-mono">#{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Total</span>
            <span>{formatARS(order.totalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estado</span>
            <span className="font-medium capitalize">{order.status.toLowerCase()}</span>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="mt-6">
          <Link
            href="/checkout"
            className="inline-block rounded bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Intentar otro medio de pago
          </Link>
        </div>
      )}

      {(status === 'approved' || order?.status === 'PAID') && (
        <div className="mt-6">
          <Link
            href="/mis-pedidos"
            className="inline-block rounded bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/productos"
            className="ml-4 inline-block text-primary hover:underline"
          >
            Seguir comprando
          </Link>
        </div>
      )}

      {polling && (
        <p className="mt-8 text-sm text-muted-foreground">
          Verificando estado del pago... ({attempts}/10)
        </p>
      )}
    </div>
  );
}