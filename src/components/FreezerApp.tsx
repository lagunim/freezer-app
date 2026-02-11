import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import FriezaIcon from '@/public/Frieza-icon.png';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import type { Product } from '@/lib/products';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '@/lib/products';

type AuthView = 'login' | 'register';
type SortField = 'name' | 'quantity' | 'date';

export default function FreezerApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Clear auth error when user successfully logs in
  useEffect(() => {
    if (user) setError(null);
  }, [user]);

  // Auto-dismiss success/error messages after 5 seconds
  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [message, error]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setIsFormOpen(false);
      setProductsError(null);
      return;
    }

    const load = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        console.error('Error al cargar productos desde Supabase:', err);
        setProductsError(
          'No se han podido cargar los productos. Prueba a recargar o revisa la configuración de Supabase.'
        );
      } finally {
        setProductsLoading(false);
      }
    };

    void load();
  }, [user]);

  const handleLogout = async () => {
    setError(null);
    setMessage(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError('No se ha podido cerrar sesión. Inténtalo de nuevo.');
    }
  };

  const handleReloadProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error al recargar productos desde Supabase:', err);
      setProductsError(
        'No se han podido recargar los productos. Prueba de nuevo en unos segundos.'
      );
    } finally {
      setProductsLoading(false);
    }
  };

  const handleCreateProduct = async (input: Parameters<typeof createProduct>[1]) => {
    if (!user) return;

    setSavingProduct(true);
    setProductsError(null);
    try {
      const created = await createProduct(user.id, input);
      setProducts((prev) => [created, ...prev]);
      setMessage('Producto añadido al congelador.');
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error al crear producto en Supabase:', err);
      setProductsError('No se ha podido crear el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async (
    product: Product,
    input: Parameters<typeof updateProduct>[1]
  ) => {
    setSavingProduct(true);
    setProductsError(null);
    try {
      const updated = await updateProduct(product.id, input);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      setMessage('Producto actualizado.');
    } catch (err) {
      console.error('Error al actualizar producto en Supabase:', err);
      setProductsError('No se ha podido actualizar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductsError(null);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setMessage('Producto eliminado.');
    } catch (err) {
      console.error('Error al borrar producto en Supabase:', err);
      setProductsError('No se ha podido borrar el producto.');
    }
  };

  const handleAuthError = (msg: string) => {
    setError(msg);
    setMessage(null);
  };

  const handleRegistered = (msg: string) => {
    setMessage(msg);
    setError(null);
    setAuthView('login');
  };

  const handleChangeSort = (field: SortField) => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === field) {
        setSortDirection((currentDirection) =>
          currentDirection === 'asc' ? 'desc' : 'asc'
        );
        return currentSortBy;
      }

      setSortDirection('asc');
      return field;
    });
  };

  const filteredAndSortedProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let result = products;

    if (term) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(term)
      );
    }

    const directionFactor = sortDirection === 'asc' ? 1 : -1;

    return [...result].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else {
        const aTime = new Date(a.added_at).getTime();
        const bTime = new Date(b.added_at).getTime();
        comparison = aTime - bTime;
      }

      return comparison * directionFactor;
    });
  }, [products, searchTerm, sortBy, sortDirection]);

  if (loading) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-50">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt="Freezer App"
              className="h-10 w-10 rounded-2xl bg-slate-900/80 shadow-sm"
            />
            <span>Freezer App</span>
          </h1>
          <p className="text-sm text-slate-400">
            Cargando sesión de Supabase…
          </p>
        </header>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>Un momento…</p>
        </div>
      </section>
    );
  }

  if (!session || !user) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-50">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt="Freezer App"
              className="h-10 w-10 rounded-2xl bg-slate-900/80 shadow-sm"
            />
            <span>Freezer App</span>
          </h1>
          <p className="text-sm text-slate-400">
            Identifícate para gestionar tu congelador.
          </p>
        </header>

        <div className="mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/50">
          <div className="mb-4 flex rounded-lg bg-slate-800/80 p-0.5 text-xs font-medium text-slate-300">
            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md px-2 py-1 transition ${
                authView === 'login'
                  ? 'bg-slate-950 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthView('register');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md px-2 py-1 transition ${
                authView === 'register'
                  ? 'bg-slate-950 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Crear cuenta
            </button>
          </div>

      {error && (
        <div className="alert-enter mb-3 rounded-lg border border-red-800/80 bg-red-950/70 px-4 py-3 text-sm text-red-100 shadow-sm">
          {error}
        </div>
      )}

          {message && (
            <div className="alert-enter mb-3 rounded-lg border border-emerald-800/80 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-100 shadow-sm">
              {message}
            </div>
          )}

          {authView === 'login' ? (
            <LoginForm onAuthError={handleAuthError} />
          ) : (
            <RegisterForm
              onAuthError={handleAuthError}
              onRegistered={handleRegistered}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Zona fija superior: header + búsqueda */}
      <div className="sticky top-0 z-10 -mx-3 -mt-3 space-y-3 bg-slate-950/95 px-3 pt-3 backdrop-blur sm:-mx-4 sm:-mt-4 sm:px-4 sm:pt-4 pb-3 sm:pb-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              <img
                src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
                alt="Freezer App"
                className="h-10 w-10 rounded-2xl bg-slate-900/80 shadow-sm"
              />
              <span>Freezer App</span>
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Autenticado como{' '}
              <span className="font-medium text-slate-100">
                {user.email ?? 'usuario sin email'}
              </span>
              .
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
          <label htmlFor="product-search" className="sr-only">
            Buscar por nombre
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="product-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre…"
              className="block w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:py-2.5 sm:pl-10 sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Contenido con scroll: mensajes + lista */}
      <div className="min-w-0 space-y-3 pb-20 sm:pb-24">
        {error && (
          <div className="alert-enter rounded-lg border border-red-800/80 bg-red-950/70 px-4 py-3 text-sm text-red-100 shadow-sm">
            {error}
          </div>
        )}

        {productsError && (
          <div className="alert-enter rounded-lg border border-amber-800/80 bg-amber-950/60 px-4 py-3 text-sm text-amber-100 shadow-sm">
            {productsError}
          </div>
        )}

        {message && (
          <div className="alert-enter rounded-lg border border-emerald-800/80 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-100 shadow-sm">
            {message}
          </div>
        )}

        <ProductList
          products={filteredAndSortedProducts}
          loading={productsLoading}
          onReload={handleReloadProducts}
          onUpdateProduct={handleUpdateProduct}
          onDelete={handleDeleteProduct}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onChangeSort={handleChangeSort}
        />
      </div>

      {/* FAB Nuevo producto */}
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setProductsError(null);
          setIsFormOpen(true);
        }}
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-600/80 bg-slate-800/90 text-2xl font-light text-slate-100 shadow-lg shadow-slate-950/50 backdrop-blur transition hover:bg-slate-700/90 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16 sm:text-3xl"
        aria-label="Añadir nuevo producto"
      >
        +
      </button>

      {/* Modal formulario nuevo producto */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-product-title"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-new-product-title" className="mb-4 text-lg font-semibold text-slate-100">
              Añadir nuevo producto
            </h2>
            <ProductForm
              mode="create"
              initialProduct={null}
              loading={savingProduct}
              onSubmit={handleCreateProduct}
              onCancel={() => setIsFormOpen(false)}
            />
            <p className="mt-3 text-[11px] text-slate-500">
              Gestiona aquí lo que tienes en el congelador: raciones, tuppers, pan,
              verdura, etc.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

