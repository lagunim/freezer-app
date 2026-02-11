import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import FriezaIcon from '@/public/Frieza-icon.png';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import type { Product, ProductCategory } from '@/lib/products';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '@/lib/products';

type AuthView = 'login' | 'register';

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
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
  const [productNotification, setProductNotification] = useState<{ productId: string; message: string; type: 'success' | 'error' } | null>(null);

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

  // Auto-dismiss product notifications after 3 seconds
  useEffect(() => {
    if (!productNotification) return;
    const t = setTimeout(() => {
      setProductNotification(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [productNotification]);

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
      setProductNotification({ productId: product.id, message: 'Producto actualizado.', type: 'success' });
    } catch (err) {
      console.error('Error al actualizar producto en Supabase:', err);
      setProductNotification({ productId: product.id, message: 'No se ha podido actualizar el producto.', type: 'error' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductsError(null);
    try {
      await deleteProduct(product.id);
      setProductNotification({ productId: product.id, message: 'Producto eliminado.', type: 'success' });
      // Esperar un momento antes de eliminar el producto para que se vea la notificación
      setTimeout(() => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      }, 500);
    } catch (err) {
      console.error('Error al borrar producto en Supabase:', err);
      setProductNotification({ productId: product.id, message: 'No se ha podido borrar el producto.', type: 'error' });
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

  const toggleCategory = (category: ProductCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        // Si ya está seleccionada, la quitamos
        return prev.filter((c) => c !== category);
      } else {
        // Si no está seleccionada, la añadimos
        return [...prev, category];
      }
    });
  };

  const filteredAndSortedProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let result = products;

    // Filtrar por categorías seleccionadas (si hay alguna seleccionada)
    if (selectedCategories.length > 0) {
      result = result.filter((product) => 
        selectedCategories.includes(product.category)
      );
    }

    // Filtrar por término de búsqueda
    if (term) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(term)
      );
    }

    // Ordenar por fecha descendente (más recientes primero)
    return [...result].sort((a, b) => {
      const aTime = new Date(a.added_at).getTime();
      const bTime = new Date(b.added_at).getTime();
      return bTime - aTime;
    });
  }, [products, searchTerm, selectedCategories]);

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
      {/* Header */}
      <header className="flex items-center justify-center p-2">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt="Freezer App"
              className="h-20 px-4 rounded-2xl shadow-sm"
            />
            <div>
        <div className="space-y-1 text-center">
          <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
            <span>Freezer App</span>
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            {user.email ?? 'usuario sin email'}
          </p>
            </div>
        </div>
      </header>

      {/* Barra de búsqueda y filtros */}
      <div className="sticky top-0 z-10 space-y-3">
        <div>
          <label htmlFor="product-search" className="sr-only">
            Buscar por nombre
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-100" aria-hidden>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="product-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre…"
              className="block w-full rounded-2xl border border-white/10 bg-slate-800/30 backdrop-blur-xl py-2.5 pl-12 pr-4 text-base text-slate-100 placeholder:text-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.08)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:shadow-[0_0_20px_rgba(255,255,255,0.12)]"
            />
          </div>
        </div>

        {/* Filtros por categoría */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => toggleCategory('Alimentación')}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 text-xs font-bold transition-all duration-200 ${
              selectedCategories.includes('Alimentación')
                ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 via-green-600/20 to-green-700/30 text-white shadow-[0_0_20px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-105'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-emerald-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-[1.02]'
            }`}
          >
            <span className="text-2xl">🍎</span>
            <span className="leading-tight">Alimentación</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory('Limpieza')}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 text-xs font-bold transition-all duration-200 ${
              selectedCategories.includes('Limpieza')
                ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 via-cyan-600/20 to-cyan-700/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.4),0_0_40px_rgba(34,211,238,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-105'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-cyan-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-[1.02]'
            }`}
          >
            <span className="text-2xl">🧹</span>
            <span className="leading-tight">Limpieza</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory('Mascotas')}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 text-xs font-bold transition-all duration-200 ${
              selectedCategories.includes('Mascotas')
                ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/30 via-orange-600/20 to-orange-700/30 text-white shadow-[0_0_20px_rgba(251,191,36,0.4),0_0_40px_rgba(251,191,36,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-105'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-amber-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:scale-[1.02]'
            }`}
          >
            <span className="text-2xl">🐾</span>
            <span className="leading-tight">Mascotas</span>
          </button>
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
          onUpdateProduct={handleUpdateProduct}
          onDelete={handleDeleteProduct}
          productNotification={productNotification}
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
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl font-light text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16 sm:text-3xl"
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
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-800/40 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(255,255,255,0.1)] sm:p-6"
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

