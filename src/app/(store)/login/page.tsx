'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/presentation/components/ui/Toast';
import { useAsyncSubmit } from '@/presentation/hooks/useAsyncSubmit';
import { Mail, Lock, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const redirect = searchParams.get('redirect') || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const { submit, loading } = useAsyncSubmit(
    async (fd: typeof formData) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fd),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      return data.redirect || redirect;
    },
    (redirectUrl) => {
      router.push(redirectUrl);
      router.refresh();
    },
    (err) => {
      toast({ title: err instanceof Error ? err.message : 'Error de red', variant: 'destructive' });
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(formData);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/" className="text-muted-foreground hover:underline flex items-center gap-1">
          Volver al inicio
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Iniciar sesión</h1>
        <p className="mt-2 text-muted-foreground">
          ¿No tienes cuenta? <Link href="/registro" className="text-primary hover:underline">Regístrate</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            Contraseña *
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
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-12 max-w-md">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}