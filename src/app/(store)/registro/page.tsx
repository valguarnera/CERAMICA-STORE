'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/presentation/components/ui/Toast';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Error al registrarse', variant: 'destructive' });
        setLoading(false);
        return;
      }
      router.push(data.redirect || '/');
      router.refresh();
    } catch {
      toast({ title: 'Error de red', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/" className="text-muted-foreground hover:underline flex items-center gap-1">
          Volver al inicio
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Crear cuenta</h1>
        <p className="mt-2 text-muted-foreground">
          ¿Ya tienes cuenta? <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Nombre completo *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded border bg-background pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Juan Pérez"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded border bg-background pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Contraseña * (mínimo 8 caracteres)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded border bg-background pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              minLength={8}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Registrarse'}
        </button>
      </form>
    </div>
  );
}