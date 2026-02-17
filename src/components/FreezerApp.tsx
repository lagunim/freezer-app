import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import FriezaIcon from '@/public/Frieza-icon.png';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ProductForm from '@/components/ProductForm';
import ProductList from '@/components/ProductList';
import FloatingMenu from '@/components/FloatingMenu';
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
  const [showShoppingCart, setShowShoppingCart] = useState(false);
  const [productNotification, setProductNotification] = useState<{ productId: string; message: string; type: 'success' | 'error' } | null>(null);
  const [isNotificationExiting, setIsNotificationExiting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

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
    if (!productNotification) {
      setIsNotificationExiting(false);
      return;
    }
    
    // Mostrar la notificación durante 2.5 segundos
    const exitTimer = setTimeout(() => {
      setIsNotificationExiting(true);
    }, 2500);
    
    // Eliminar completamente después de la animación de salida (500ms adicionales)
    const removeTimer = setTimeout(() => {
      setProductNotification(null);
      setIsNotificationExiting(false);
    }, 3000);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
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

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const handleCreateProduct = async (input: Parameters<typeof createProduct>[1]) => {
    if (!user) return;

    setSavingProduct(true);
    setProductsError(null);
    try {
      const created = await createProduct(user.id, input);
      setProducts((prev) => [created, ...prev]);
      setMessage('Producto añadido al listado.');
      closeForm();
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
      // Esperar 3 segundos antes de eliminar el producto para que se vea la notificación completa
      setTimeout(() => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      }, 3000);
    } catch (err) {
      console.error('Error al borrar producto en Supabase:', err);
      setProductNotification({ productId: product.id, message: 'No se ha podido borrar el producto.', type: 'error' });
    }
  };

  const handleToggleShoppingCart = async (product: Product) => {
    setSavingProduct(true);
    setProductsError(null);
    try {
      const input: Parameters<typeof updateProduct>[1] = {
        name: product.name,
        quantity: product.quantity,
        quantity_unit: product.quantity_unit,
        category: product.category,
        added_at: product.added_at,
        in_shopping_list: !product.in_shopping_list,
        shopping_quantity: !product.in_shopping_list ? null : product.shopping_quantity,
      };
      const updated = await updateProduct(product.id, input);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      const message = updated.in_shopping_list
        ? 'Producto añadido a la cesta.'
        : 'Producto quitado de la cesta.';
      setProductNotification({ productId: product.id, message, type: 'success' });
    } catch (err) {
      console.error('Error al actualizar producto en Supabase:', err);
      setProductNotification({ productId: product.id, message: 'No se ha podido actualizar el producto.', type: 'error' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const handleDeleteMultiple = async (productIds: string[]) => {
    setProductsError(null);
    try {
      // Borrar todos los productos seleccionados en paralelo
      await Promise.all(productIds.map(id => deleteProduct(id)));
      
      setMessage(`${productIds.length} producto${productIds.length > 1 ? 's' : ''} eliminado${productIds.length > 1 ? 's' : ''}.`);
      
      // Eliminar los productos del estado
      setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
      
      // Limpiar la selección
      handleClearSelection();
    } catch (err) {
      console.error('Error al borrar productos en Supabase:', err);
      setProductsError('No se han podido borrar algunos productos.');
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

    // Filtrar por cesta (si está activo)
    if (showShoppingCart) {
      result = result.filter((product) => product.in_shopping_list);
    }

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

    // Ordenar por fecha descendente (más recientes primero) — toSorted() inmutable (js-tosorted-immutable)
    return result.toSorted((a, b) => {
      const aTime = new Date(a.added_at).getTime();
      const bTime = new Date(b.added_at).getTime();
      return bTime - aTime;
    });
  }, [products, searchTerm, selectedCategories, showShoppingCart]);

  if (loading) {
    return (
      <section>
        {/* Header */}
        <header className="flex items-center justify-center p-2 mb-2 sm:mb-3 md:mb-4">
          <img
            src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
            alt="Freezer App"
            className="h-20 px-4 rounded-2xl shadow-sm"
          />
          <div className="w-64">
            <div className="space-y-1 text-center">
              <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                <span>Freezer App</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Cargando sesión de Supabase…
              </p>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>Un momento…</p>
        </div>

        {/* Menú flotante de aplicaciones */}
        <FloatingMenu
          items={[
            { id: 'price-hunter', label: 'Price Hunter', href: '/price-hunter', icon: '🔍' }
          ]}
        />
      </section>
    );
  }

  if (!session || !user) {
    return (
      <section>
        {/* Header */}
        <header className="flex items-center justify-center p-2 mb-2 sm:mb-3 md:mb-4">
          <img
            src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
            alt="Freezer App"
            className="h-20 px-4 rounded-2xl shadow-sm"
          />
          <div className="w-64">
            <div className="space-y-1 text-center">
              <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                <span>Freezer App</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Identifícate para gestionar tu congelador.
              </p>
            </div>
          </div>
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

        {/* Menú flotante de aplicaciones */}
        <FloatingMenu
          items={[
            { id: 'price-hunter', label: 'Price Hunter', href: '/price-hunter', icon: '🔍' }
          ]}
        />
      </section>
    );
  }

  return (
    <section>
      {/* Header */}
      <header className="flex items-center justify-between p-2 mb-2 sm:mb-3 md:mb-4">
        <div className="flex items-center">
          <img
            src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
            alt="Freezer App"
            className="h-20 px-4 rounded-2xl shadow-sm"
          />
          <div className="w-64">
            <div className="space-y-1 text-center">
              <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                <span>Freezer App</span>
              </h1>
              <p className="text-xs text-left text-slate-400 sm:text-sm">
                {user.email ?? 'usuario sin email'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* Barra de búsqueda y filtros */}
      <div className="sticky top-0 z-50 space-y-2 md:space-y-3 backdrop-blur-md pb-2 md:pb-3 pt-2 md:pt-3 -mx-3 px-3 sm:-mx-4 sm:px-4 shadow-lg rounded-b-2xl">
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
              className="block w-full rounded-2xl border border-white/10 bg-slate-800/30 backdrop-blur-xl py-2 pl-12 pr-4 text-base md:py-2.5 text-slate-100 placeholder:text-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.08)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:shadow-[0_0_20px_rgba(255,255,255,0.12)]"
            />
          </div>
        </div>

        {/* Filtros por categoría y cesta */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => toggleCategory('Alimentación')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border-2 px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[56px] md:min-h-[64px] ${
              selectedCategories.includes('Alimentación')
                ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 via-green-600/20 to-green-700/30 text-white shadow-[0_0_20px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-110'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-emerald-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95'
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <img src="/groceries-icon.png" alt="Comida" className="w-full h-full object-contain" />
            </span>
            <span className="leading-tight shrink-0">Comida</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory('Limpieza')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border-2 px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[56px] md:min-h-[64px] ${
              selectedCategories.includes('Limpieza')
                ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 via-cyan-600/20 to-cyan-700/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.4),0_0_40px_rgba(34,211,238,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-110'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-cyan-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 active:scale-95'
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <img src="/cleaning-icon.png" alt="Limpieza" className="w-full h-full object-contain" />
            </span>
            <span className="leading-tight shrink-0">Limpieza</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory('Higiene')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border-2 px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[56px] md:min-h-[64px] ${
              selectedCategories.includes('Higiene')
                ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/30 via-orange-600/20 to-orange-700/30 text-white shadow-[0_0_20px_rgba(251,191,36,0.4),0_0_40px_rgba(251,191,36,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-110'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-amber-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:scale-105 active:scale-95'
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <img src="/higiene-icon.png" alt="Higiene" className="w-full h-full object-contain" />
            </span>
            <span className="leading-tight shrink-0">Higiene</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShoppingCart(!showShoppingCart)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border-2 px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[56px] md:min-h-[64px] ${
              showShoppingCart
                ? 'border-purple-400/60 bg-gradient-to-br from-purple-500/30 via-purple-600/20 to-purple-700/30 text-white shadow-[0_0_20px_rgba(168,85,247,0.4),0_0_40px_rgba(168,85,247,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)] scale-110'
                : 'border-white/20 bg-slate-800/40 text-slate-300 shadow-[0_0_15px_rgba(147,197,253,0.1)] hover:border-purple-400/40 hover:bg-slate-800/60 hover:text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:scale-105 active:scale-95'
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <img src="/cart-icon.png" alt="Cesta" className="w-full h-full object-contain" />
            </span>
            <span className="leading-tight shrink-0">Cesta</span>
          </button>
        </div>
      </div>

      {/* Contenido con scroll: mensajes + lista */}
      <div className="min-w-0 space-y-2 md:space-y-3 pb-20 sm:pb-24 mt-2 sm:mt-3 md:mt-4">
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
          onToggleShoppingCart={handleToggleShoppingCart}
          productNotification={productNotification}
          isNotificationExiting={isNotificationExiting}
          showShoppingCart={showShoppingCart}
          selectedProductIds={selectedProductIds}
          onToggleSelection={handleToggleSelection}
          onClearSelection={handleClearSelection}
          onDeleteMultiple={handleDeleteMultiple}
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
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl font-light text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 hover:rotate-90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16 sm:text-3xl"
        aria-label="Añadir nuevo producto"
      >
        +
      </button>

      {/* Menú flotante de aplicaciones */}
      <FloatingMenu
        items={[
          { id: 'price-hunter', label: 'Price Hunter', href: '/price-hunter', icon: '🔍' }
        ]}
      />

      {/* Modal formulario nuevo producto */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-product-title"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-sm max-h-[85vh] overflow-y-auto animate-[slideInUp_0.3s_ease-out] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-new-product-title" className="mb-3 text-base font-semibold text-slate-100">
              Añadir producto
            </h2>
            <ProductForm
              mode="create"
              initialProduct={null}
              loading={savingProduct}
              onSubmit={handleCreateProduct}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </section>
  );
}

