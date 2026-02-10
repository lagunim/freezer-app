import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isFormVisible = isFormOpen || !!editingProduct;

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
      setEditingProduct(null);
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
      setEditingProduct(null);
    } catch (err) {
      console.error('Error al crear producto en Supabase:', err);
      setProductsError('No se ha podido crear el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async (input: Parameters<typeof updateProduct>[1]) => {
    if (!editingProduct) return;

    setSavingProduct(true);
    setProductsError(null);
    try {
      const updated = await updateProduct(editingProduct.id, input);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      setMessage('Producto actualizado.');
      setIsFormOpen(false);
      setEditingProduct(null);
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Mi congelador
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Mi congelador
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

        <p className="text-xs text-slate-500">
          La autenticación se gestiona con Supabase Auth. Asegúrate de haber
          configurado correctamente `PUBLIC_SUPABASE_URL` y
          `PUBLIC_SUPABASE_ANON_KEY` en tu entorno.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 sm:space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
            Mi congelador
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

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] lg:gap-6">
        <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-3 shadow-sm sm:p-5">
          <button
            type="button"
            onClick={() => {
              if (editingProduct) {
                setEditingProduct(null);
                setIsFormOpen(false);
                setMessage(null);
                setProductsError(null);
                return;
              }

              setIsFormOpen((previous) => {
                const next = !previous;
                if (next) {
                  setMessage(null);
                  setProductsError(null);
                }
                return next;
              });
            }}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-expanded={isFormVisible}
          >
            <span>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</span>
            <span
              className={`ml-2 inline-flex h-5 w-5 items-center justify-center text-slate-300 transition-transform ${
                isFormVisible ? 'rotate-90' : ''
              }`}
              aria-hidden="true"
            >
              &gt;
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isFormVisible
                ? 'max-h-[800px] opacity-100 mt-3'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="pt-1">
              <ProductForm
                mode={editingProduct ? 'edit' : 'create'}
                initialProduct={editingProduct}
                loading={savingProduct}
                onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                onCancel={
                  isFormVisible
                    ? () => {
                        setIsFormOpen(false);
                        setEditingProduct(null);
                      }
                    : undefined
                }
              />
              <p className="mt-3 text-[11px] text-slate-500">
                Gestiona aquí lo que tienes en el congelador: raciones, tuppers, pan,
                verdura, etc.
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="product-search"
                  className="block text-xs font-medium text-slate-300"
                >
                  Buscar
                </label>
                <input
                  id="product-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre…"
                  className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:py-2 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <ProductList
            products={filteredAndSortedProducts}
            loading={productsLoading}
            onReload={handleReloadProducts}
            onEdit={(product) => {
              setEditingProduct(product);
              setIsFormOpen(true);
              setMessage(null);
            }}
            onDelete={handleDeleteProduct}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onChangeSort={handleChangeSort}
          />
        </div>
      </div>
    </section>
  );
}

