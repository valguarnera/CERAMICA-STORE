'use client';

import { useState } from 'react';
import { useCart } from '@/presentation/hooks/useCart';
import { useToast } from '@/presentation/components/ui/Toast';
import { formatARS } from '@/presentation/lib/currency';
import { ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { cart, total } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) {
      toast({ title: 'Carrito vacío', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          shippingAddress: {
            name: formData.name,
            address: `${formData.address} ${formData.number}${formData.complement ? ` ${formData.complement}` : ''}`,
            city: formData.city,
            province: formData.province,
            postalCode: formData.postalCode,
            phone: formData.phone,
          },
          notes: formData.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Error al iniciar checkout', variant: 'destructive' });
        setLoading(false);
        return;
      }
      // Redirect to Mercado Pago
      window.location.href = data.init_point;
    } catch {
      toast({ title: 'Error de red', variant: 'destructive' });
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <Link href="/productos" className="mt-4 inline-block text-primary hover:underline">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/carrito" className="text-muted-foreground hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Volver al carrito
        </Link>
      </div>

      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

      {/* Order summary */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Resumen del pedido</h2>
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex justify-between text-sm">
              <span>{item.productId} × {item.quantity}</span>
              <span>{formatARS(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t pt-4 flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatARS(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Datos de contacto</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Teléfono *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Nombre completo *
              </label>
              <input
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Dirección de envío</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-1">
                Calle *
              </label>
              <input
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="number" className="block text-sm font-medium mb-1">
                Número *
              </label>
              <input
                id="number"
                name="number"
                required
                value={formData.number}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="complement" className="block text-sm font-medium mb-1">
                Piso / Depto
              </label>
              <input
                id="complement"
                name="complement"
                value={formData.complement}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1">
                Ciudad *
              </label>
              <input
                id="city"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="province" className="block text-sm font-medium mb-1">
                Provincia *
              </label>
              <input
                id="province"
                name="province"
                required
                value={formData.province}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium mb-1">
                Código postal *
              </label>
              <input
                id="postalCode"
                name="postalCode"
                required
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Notas (opcional)</legend>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full rounded border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Instrucciones de entrega, horarios, etc."
          />
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
        </button>
      </form>
    </div>
  );
}