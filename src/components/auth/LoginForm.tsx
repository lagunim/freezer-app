import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface LoginFormProps {
  onAuthError?: (message: string) => void;
}

export default function LoginForm({ onAuthError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        onAuthError?.(error.message);
      }
    } catch (err) {
      // Mensaje más claro cuando hay problemas de red / conexión con Supabase
      if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
        console.error('Error de red al iniciar sesión en Supabase:', err);
        onAuthError?.(
          'No se ha podido contactar con Supabase. Revisa tu conexión, la URL del proyecto y que el proyecto no esté pausado.'
        );
      } else {
        console.error('Error inesperado al iniciar sesión en Supabase:', err);
        onAuthError?.('Ha ocurrido un error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="tucorreo@ejemplo.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent"
              aria-hidden
            />
            Iniciando sesión…
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 3h4a2 2 0 012 2v4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 14l11-11"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 10v9a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h9"
              />
            </svg>
            Iniciar sesión
          </>
        )}
      </button>
    </form>
  );
}

