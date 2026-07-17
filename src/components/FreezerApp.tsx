import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import ProductForm from "@/components/ProductForm";
import ProductList from "@/components/ProductList";
import SearchInput from "@/components/SearchInput";
import type { Product, ProductCategory } from "@/lib/products";
import { normalizeStr } from "@/lib/utils";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from "@/lib/products";
import { AnimatePresence, motion } from "framer-motion";
import { sileo } from "sileo";

export interface FreezerAppProps {
  user: User;
  onSwitchToPriceHunter?: () => void;
}

export default function FreezerApp({
  user,
  onSwitchToPriceHunter,
}: FreezerAppProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    ProductCategory[]
  >([]);
  const [showShoppingCart, setShowShoppingCart] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load products when user is available
  useEffect(() => {
    const load = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        console.error("Error al cargar productos desde Supabase:", err);
        const msg =
          "No se han podido cargar los productos. Prueba a recargar o revisa la configuración de Supabase.";
        sileo.error({ title: "Error al cargar productos", description: msg });
        setProductsError(msg);
      } finally {
        setProductsLoading(false);
      }
    };

    void load();
  }, [user]);

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const handleCreateProduct = async (
    input: Parameters<typeof createProduct>[1],
  ) => {
    setSavingProduct(true);
    setProductsError(null);
    try {
      const created = await createProduct(user.id, input);
      setProducts((prev) => [created, ...prev]);
      sileo.success({ title: "Producto añadido al listado." });
      closeForm();
    } catch (err) {
      console.error("Error al crear producto en Supabase:", err);
      const msg = "No se ha podido crear el producto.";
      sileo.error({ title: msg });
      setProductsError(msg);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async (
    product: Product,
    input: Parameters<typeof updateProduct>[1],
  ) => {
    setSavingProduct(true);
    setProductsError(null);
    try {
      const updated = await updateProduct(product.id, input);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      sileo.success({ title: "Producto actualizado." });
    } catch (err) {
      console.error("Error al actualizar producto en Supabase:", err);
      const msg = "No se ha podido actualizar el producto.";
      sileo.error({ title: msg });
      setProductsError(msg);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductsError(null);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      sileo.success({ title: "Producto eliminado." });
    } catch (err) {
      console.error("Error al borrar producto en Supabase:", err);
      const msg = "No se ha podido borrar el producto.";
      sileo.error({ title: msg });
      setProductsError(msg);
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
      };
      const updated = await updateProduct(product.id, input);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      const message = updated.in_shopping_list
        ? "Producto añadido a la cesta."
        : "Producto quitado de la cesta.";
      sileo.success({ title: message });
    } catch (err) {
      console.error("Error al actualizar producto en Supabase:", err);
      const msg = "No se ha podido actualizar el producto.";
      sileo.error({ title: msg });
      setProductsError(msg);
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
      await Promise.all(productIds.map((id) => deleteProduct(id)));
      sileo.success({
        title: `${productIds.length} producto${productIds.length > 1 ? "s" : ""} eliminado${productIds.length > 1 ? "s" : ""}.`,
      });
      setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
      handleClearSelection();
    } catch (err) {
      console.error("Error al borrar productos en Supabase:", err);
      const msg = "No se han podido borrar algunos productos.";
      sileo.error({ title: msg });
      setProductsError(msg);
    }
  };

  const toggleCategory = (category: ProductCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const filteredAndSortedProducts = useMemo(() => {
    const term = normalizeStr(searchTerm.trim());

    let result = products;

    if (showShoppingCart) {
      result = result.filter((product) => product.in_shopping_list);
    }

    if (selectedCategories.length > 0) {
      result = result.filter((product) =>
        selectedCategories.includes(product.category),
      );
    }

    if (term) {
      result = result.filter((product) =>
        normalizeStr(product.name).includes(term),
      );
    }

    return result.toSorted((a, b) => {
      const aTime = new Date(a.added_at).getTime();
      const bTime = new Date(b.added_at).getTime();
      return bTime - aTime;
    });
  }, [products, searchTerm, selectedCategories, showShoppingCart]);

  return (
    <>
      {/* Barra de búsqueda + filtros por categoría y cesta (anclados arriba) */}
      <div className="sticky top-0 z-50 backdrop-blur-md pb-2 md:pb-3 pt-2 md:pt-3 -mx-3 px-3 sm:-mx-4 sm:px-4 shadow-lg rounded-b-2xl space-y-2 md:space-y-3">
        <SearchInput
          id="product-search-fixed"
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre…"
          label="Buscar por nombre"
          inputRef={searchInputRef}
        />

        {/* Filtros por categoría y cesta */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => toggleCategory("Alimentación")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-colors-scale duration-200 min-h-[56px] md:min-h-[64px]  ${
              selectedCategories.includes("Alimentación")
                ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <motion.img
                animate={{
                  scale: selectedCategories.includes("Alimentación")
                    ? 0.95
                    : 1,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                src="/groceries-icon.png"
                alt="Comida"
                className="w-full h-full object-contain"
              />
            </span>
            <span className="leading-tight shrink-0">Comida</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory("Limpieza")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-colors-scale duration-200 min-h-[56px] md:min-h-[64px] ${
              selectedCategories.includes("Limpieza")
                ? "border-cyan-500 bg-cyan-600 text-white shadow-sm"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-cyan-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <motion.img
                animate={{
                  scale: selectedCategories.includes("Limpieza") ? 0.95 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                src="/cleaning-icon.png"
                alt="Limpieza"
                className="w-full h-full object-contain"
              />
            </span>
            <span className="leading-tight shrink-0">Limpieza</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategory("Higiene")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-colors-scale duration-200 min-h-[56px] md:min-h-[64px] ${
              selectedCategories.includes("Higiene")
                ? "border-amber-500 bg-amber-500 text-slate-900 shadow-sm"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <motion.img
                animate={{
                  scale: selectedCategories.includes("Higiene") ? 0.95 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                src="/higiene-icon.png"
                alt="Higiene"
                className="w-full h-full object-contain"
              />
            </span>
            <span className="leading-tight shrink-0">Higiene</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShoppingCart(!showShoppingCart)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-xl border px-1.5 py-1.5 md:px-2 md:py-2 text-[8px] md:text-[9px] font-bold transition-colors-scale duration-200 min-h-[56px] md:min-h-[64px] ${
              showShoppingCart
                ? "border-purple-500 bg-purple-600 text-white shadow-sm"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-purple-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className="flex-1 min-h-0 w-full flex items-center justify-center">
              <motion.img
                animate={{ scale: showShoppingCart ? 0.95 : 1 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                src="/cart-icon.png"
                alt="Cesta"
                className="w-full h-full object-contain"
              />
            </span>
            <span className="leading-tight shrink-0">Cesta</span>
          </button>
        </div>
      </div>

      {/* Contenido con scroll: mensajes + lista */}
      <div className="min-w-0 space-y-2 md:space-y-3 pb-20 sm:pb-24 mt-2 sm:mt-3 md:mt-4">
        <ProductList
          products={filteredAndSortedProducts}
          loading={productsLoading}
          onUpdateProduct={handleUpdateProduct}
          onDelete={handleDeleteProduct}
          onToggleShoppingCart={handleToggleShoppingCart}
          showShoppingCart={showShoppingCart}
          selectedProductIds={selectedProductIds}
          onToggleSelection={handleToggleSelection}
          onClearSelection={handleClearSelection}
          onDeleteMultiple={handleDeleteMultiple}
        />
      </div>

      {/* Contenedor FAB Añadir (inferior derecha) */}
      <div
        className="fixed right-6 z-20 flex flex-col items-end gap-2 sm:right-8"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => {
            setProductsError(null);
            setIsFormOpen(true);
          }}
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-sky-600 text-2xl font-light text-slate-50 shadow-md hover:bg-sky-500 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16 sm:text-3xl"
          aria-label="Añadir nuevo producto"
        >
          +
        </button>
      </div>

      {/* FAB Price Hunter (inferior izquierda) */}
      <div
        className="fixed left-6 z-20 flex flex-col items-start sm:left-8"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={
            onSwitchToPriceHunter
              ? onSwitchToPriceHunter
              : () => { window.location.href = "/#price-hunter"; }
          }
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16"
          aria-label="Ir a Price Hunter"
          title="Price Hunter"
        >
          🎯
        </button>
      </div>

      {/* FAB búsqueda (inferior centro): enfoca la barra de búsqueda anclada */}
      <div
        className="fixed inset-x-0 z-20 flex justify-center pointer-events-none"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => {
            const input = searchInputRef.current;
            if (!input) return;
            input.focus();
            input.select();
            window.requestAnimationFrame(() => {
              input.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-colors duration-200 ease-out hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16 pointer-events-auto"
          aria-label="Buscar productos"
        >
          <svg
            className="h-6 w-6 sm:h-7 sm:w-7"
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
        </button>
      </div>

      {/* Modal para añadir nuevo producto */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-new-product-title"
            onClick={closeForm}
          >
            <motion.div
              initial={{ scaleY: 0, originY: 0.5 }}
              animate={{ scaleY: 1, originY: 0.5 }}
              exit={{ scaleY: 0, originY: 0.5 }}
              transition={{ duration: 0.8, type: "spring", ease: "easeIn" }}
              className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="modal-new-product-title"
                className="mb-3 text-base font-semibold text-slate-100"
              >
                Añadir producto
              </h2>
              <ProductForm
                mode="create"
                initialProduct={null}
                loading={savingProduct}
                onSubmit={handleCreateProduct}
                onCancel={closeForm}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
