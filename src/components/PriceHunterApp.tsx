import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import FriezaIcon from "@/public/Frieza-icon.png";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import PriceForm from "@/components/PriceForm";
import PriceTable from "@/components/PriceTable";
import FloatingMenu from "@/components/FloatingMenu";
import type { PriceEntry, PriceInput, Unit } from "@/lib/priceHunter";
import {
  createPrice,
  deletePrice,
  fetchPrices,
  updatePrice,
  fetchUniqueProductNames,
  fetchUniqueBrands,
  fetchUniqueSupermarkets,
} from "@/lib/priceHunter";
import { createProduct, updateProduct, fetchProducts } from "@/lib/products";
import type { ProductInput } from "@/lib/products";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, sileo } from "sileo";

type AuthView = "login" | "register";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
};

export default function PriceHunterApp() {
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
  });
  const [authView, setAuthView] = useState<AuthView>("login");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceEntry | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [supermarketSuggestions, setSupermarketSuggestions] = useState<
    string[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setAuth({
        loading: false,
        session: currentSession,
        user: currentSession?.user ?? null,
      });
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuth((prev) => ({
        ...prev,
        session: newSession,
        user: newSession?.user ?? null,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Clear auth error when user successfully logs in
  useEffect(() => {
    if (auth.user) setError(null);
  }, [auth.user]);

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
    if (!auth.user) {
      setPrices([]);
      setIsFormOpen(false);
      setPricesError(null);
      return;
    }

    const load = async () => {
      setPricesLoading(true);
      setPricesError(null);
      try {
        const [pricesData, suggestions, brands, supermarkets] =
          await Promise.all([
            fetchPrices(),
            fetchUniqueProductNames(),
            fetchUniqueBrands(),
            fetchUniqueSupermarkets(),
          ]);
        setPrices(pricesData);
        setProductSuggestions(suggestions);
        setBrandSuggestions(brands);
        setSupermarketSuggestions(supermarkets);
      } catch (err) {
        console.error("Error al cargar precios desde Supabase:", err);
        const msg =
          "No se han podido cargar los precios. Prueba a recargar o revisa la configuración de Supabase.";
        sileo.error({ title: "Error al cargar precios", description: msg });
        setPricesError(msg);
      } finally {
        setPricesLoading(false);
      }
    };

    void load();
  }, [auth.user]);

  const handleLogout = async () => {
    setError(null);
    setMessage(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const msg = "No se ha podido cerrar sesión. Inténtalo de nuevo.";
      sileo.error({ title: "Cerrar sesión", description: msg });
      setError(msg);
    }
  };

  const openForm = () => {
    setEditingPrice(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPrice(null);
  };

  function mapUnitToQuantityUnit(unit: Unit): string {
    switch (unit) {
      case "1Kg":
        return "g";
      case "1L":
        return "ml";
      case "Docena":
        return "uds";
      case "Unidad":
        return "uds";
      default:
        return "g";
    }
  }

  const handleCreatePrice = async (
    input: PriceInput,
    options?: { addToDespensa?: boolean },
  ) => {
    if (!auth.user) return;

    setSavingPrice(true);
    setPricesError(null);
    try {
      const created = await createPrice(auth.user.id, input);
      setPrices((prev) => [created, ...prev]);
      sileo.success({ title: "Precio añadido correctamente." });
      setMessage("Precio añadido correctamente.");
      closeForm();
      // Actualizar sugerencias
      const [suggestions, brands, supermarkets] = await Promise.all([
        fetchUniqueProductNames(),
        fetchUniqueBrands(),
        fetchUniqueSupermarkets(),
      ]);
      setProductSuggestions(suggestions);
      setBrandSuggestions(brands);
      setSupermarketSuggestions(supermarkets);

      if (options?.addToDespensa) {
        // Cuando la unidad es "Docena", quantity representa unidades individuales
        // Por lo tanto, añadimos directamente esa cantidad como "uds" a la despensa
        const newQty = Math.max(1, Math.round(input.quantity));
        const quantityUnit = mapUnitToQuantityUnit(input.unit);
        const productNameNormalized = input.product_name.trim().toLowerCase();
        try {
          const products = await fetchProducts();
          const existing = products.find(
            (p) => p.name.trim().toLowerCase() === productNameNormalized,
          );
          if (existing) {
            await updateProduct(existing.id, {
              name: existing.name,
              quantity: existing.quantity + newQty,
              quantity_unit: existing.quantity_unit,
              category: existing.category,
              added_at: existing.added_at,
              in_shopping_list: existing.in_shopping_list,
            });
          } else {
            const productInput: ProductInput = {
              name: input.product_name.trim(),
              quantity: newQty,
              quantity_unit: quantityUnit,
              category: "Alimentación",
              added_at: input.date,
              in_shopping_list: false,
            };
            await createProduct(auth.user.id, productInput);
          }
        } catch (despensaErr) {
          console.error(
            "Error al añadir/actualizar en la despensa:",
            despensaErr,
          );
          const msg =
            "Precio añadido correctamente; no se pudo añadir o actualizar en la despensa.";
          sileo.warning({ title: msg });
          setMessage(msg);
        }
      }
    } catch (err) {
      console.error("Error al crear precio en Supabase:", err);
      const msg = "No se ha podido crear el precio.";
      sileo.error({ title: msg });
      setPricesError(msg);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleUpdatePrice = async (input: PriceInput) => {
    if (!editingPrice) return;

    setSavingPrice(true);
    setPricesError(null);
    try {
      const updated = await updatePrice(editingPrice.id, input);
      setPrices((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      sileo.success({ title: "Precio actualizado correctamente." });
      setMessage("Precio actualizado correctamente.");
      closeForm();
      // Actualizar sugerencias
      const [suggestions, brands, supermarkets] = await Promise.all([
        fetchUniqueProductNames(),
        fetchUniqueBrands(),
        fetchUniqueSupermarkets(),
      ]);
      setProductSuggestions(suggestions);
      setBrandSuggestions(brands);
      setSupermarketSuggestions(supermarkets);
    } catch (err) {
      console.error("Error al actualizar precio en Supabase:", err);
      const msg = "No se ha podido actualizar el precio.";
      sileo.error({ title: msg });
      setPricesError(msg);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeletePrice = async (id: string) => {
    setPricesError(null);
    try {
      await deletePrice(id);
      setPrices((prev) => prev.filter((p) => p.id !== id));
      sileo.success({ title: "Precio eliminado correctamente." });
      setMessage("Precio eliminado correctamente.");
      // Actualizar sugerencias
      const [suggestions, brands, supermarkets] = await Promise.all([
        fetchUniqueProductNames(),
        fetchUniqueBrands(),
        fetchUniqueSupermarkets(),
      ]);
      setProductSuggestions(suggestions);
      setBrandSuggestions(brands);
      setSupermarketSuggestions(supermarkets);
    } catch (err) {
      console.error("Error al borrar precio en Supabase:", err);
      const msg = "No se ha podido borrar el precio.";
      sileo.error({ title: msg });
      setPricesError(msg);
    }
  };

  const handleEdit = (price: PriceEntry) => {
    setEditingPrice(price);
    setIsFormOpen(true);
  };

  const filteredPrices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return prices;
    }

    return prices.filter((price) =>
      price.product_name.toLowerCase().includes(term),
    );
  }, [prices, searchTerm]);

  if (auth.loading) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500"></div>
            <p className="text-sm text-slate-400">Cargando...</p>
          </div>
        </div>
        <FloatingMenu
          items={[
            { id: "freezer-app", label: "Freezer App", href: "/", icon: "❄️" },
          ]}
        />
      </>
    );
  }

  if (!auth.session || !auth.user) {
    return (
      <>
        <section className="flex min-h-screen flex-col items-center justify-center p-4">
          {/* Header */}
          <header className="mb-8 flex items-center justify-center">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt="Price Hunter"
              className="h-20 rounded-2xl px-4 shadow-sm"
            />
            <div className="w-64">
              <div className="space-y-1 text-center">
                <h1 className="gap-3 text-left text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  <span>Price Hunter</span>
                </h1>
                <p className="text-left text-xs text-slate-400 sm:text-sm">
                  Compara precios y encuentra las mejores ofertas
                </p>
              </div>
            </div>
          </header>

          {/* Auth Form */}
          <div className="w-full max-w-md">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              {authView === "login" ? (
                <LoginForm
                  onAuthError={(msg: string) => {
                    sileo.error({ title: msg });
                    setError(msg);
                  }}
                />
              ) : (
                <RegisterForm
                  onAuthError={(msg: string) => {
                    sileo.error({ title: msg });
                    setError(msg);
                  }}
                  onRegistered={(msg: string) => {
                    sileo.success({ title: msg });
                    setMessage(msg);
                    setAuthView("login");
                  }}
                />
              )}

              {/* Toggle Auth View */}
              <div className="mt-4 text-center">
                <button
                  onClick={() =>
                    setAuthView(authView === "login" ? "register" : "login")
                  }
                  className="text-sm text-sky-400 hover:underline"
                >
                  {authView === "login"
                    ? "¿No tienes cuenta? Regístrate"
                    : "¿Ya tienes cuenta? Inicia sesión"}
                </button>
              </div>
            </div>

            {/* Notificaciones via Sileo */}
          </div>
        </section>
        {/* Menú flotante de aplicaciones */}
        <FloatingMenu
          items={[
            {
              id: "freezer-app",
              label: "Freezer App",
              href: "/",
              icon: "❄️",
            },
          ]}
        />
      </>
    );
  }

  return (
    <>
      <section>
        {/* Header */}
        <header className="mb-2 flex items-center justify-between p-2 sm:mb-3 md:mb-4">
          <div className="flex items-center">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt="Price Hunter"
              className="h-20 rounded-2xl px-4 shadow-sm"
            />
            <div className="w-64">
              <div className="space-y-1 text-center">
                <h1 className="gap-3 text-left text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  <span>Price Hunter</span>
                </h1>
                <p className="text-left text-xs text-slate-400 sm:text-sm">
                  {auth.user.email ?? "usuario sin email"}
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
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </header>

        {/* Barra de búsqueda */}
        <div className="sticky top-0 z-50 backdrop-blur-md pb-2 md:pb-3 pt-2 md:pt-3 -mx-3 px-3 sm:-mx-4 sm:px-4 shadow-lg rounded-b-2xl">
          <div>
            <label htmlFor="price-search" className="sr-only">
              Buscar por producto
            </label>
            <div className="relative">
              <div
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-100"
                aria-hidden
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                id="price-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por producto…"
                className="block w-full rounded-2xl border border-white/10 bg-slate-800/30 backdrop-blur-xl py-2 pl-12 pr-4 text-base md:py-2.5 text-slate-100 placeholder:text-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.08)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:shadow-[0_0_20px_rgba(255,255,255,0.12)]"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 shadow-xl">
          <PriceTable
            prices={filteredPrices}
            loading={pricesLoading}
            onEdit={handleEdit}
            onDelete={handleDeletePrice}
            searchTerm={searchTerm}
          />
        </div>

        {/* Floating Add Button */}
        <button
          onClick={openForm}
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-sky-600 text-3xl font-light text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:bg-sky-700 hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
          aria-label="Añadir precio"
        >
          +
        </button>

        {/* Price Form Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <PriceForm
              key={editingPrice?.id ?? "create"}
              mode={editingPrice ? "edit" : "create"}
              initialPrice={editingPrice}
              loading={savingPrice}
              productSuggestions={productSuggestions}
              brandSuggestions={brandSuggestions}
              supermarketSuggestions={supermarketSuggestions}
              onSubmit={editingPrice ? handleUpdatePrice : handleCreatePrice}
              onCancel={closeForm}
            />
          )}
        </AnimatePresence>
      </section>

      {/* Menú flotante de aplicaciones */}
      <FloatingMenu
        items={[
          { id: "freezer-app", label: "Freezer App", href: "/", icon: "❄️" },
        ]}
      />
      <Toaster
        position="top-center"
        options={{
          fill: "#1e293b",
          roundness: 16,
          styles: {
            title: "text-slate-100!",
            description: "text-slate-400!",
            badge: "bg-white/10!",
            button: "bg-white/10! hover:bg-white/15!",
          },
        }}
      />
    </>
  );
}
