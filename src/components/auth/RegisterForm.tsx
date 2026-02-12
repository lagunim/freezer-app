import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface RegisterFormProps {
  onAuthError?: (message: string) => void;
  onRegistered?: (message: string) => void;
}

export default function RegisterForm({ onAuthError, onRegistered }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      onAuthError?.('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      onAuthError?.('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        onAuthError?.(error.message);
      } else {
        onRegistered?.(
          'Registro realizado. Revisa tu correo si es necesario confirmar la cuenta.'
        );
      }
    } catch (err) {
      // Mensaje más claro cuando hay problemas de red / conexión con Supabase
      if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
        console.error('Error de red al registrar usuario en Supabase:', err);
        onAuthError?.(
          'No se ha podido contactar con Supabase. Revisa tu conexión, la URL del proyecto y que el proyecto no esté pausado.'
        );
      } else {
        console.error('Error inesperado al registrar usuario en Supabase:', err);
        onAuthError?.('Ha ocurrido un error al registrarse.');
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm-password" className="text-sm font-medium text-slate-200">
          Repetir contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}

