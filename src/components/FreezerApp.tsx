import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import type { User } from "@supabase/supabase-js";
import ProductForm from "@/components/ProductForm";
import ProductList from "@/components/ProductList";
import ProductModal from "@/components/ProductModal";
import SearchInput from "@/components/SearchInput";
import type { Product, ProductCategory } from "@/lib/products";
import { normalizeStr } from "@/lib/utils";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from "@/lib/products";
import { motion } from "framer-motion";
import { sileo } from "sileo";
import { useScrollLock } from "@/lib/useScrollLock";

export type FreezerAppHandle = {
  focusSearch: () => void;
  openCreateForm: () => void;
};

export interface FreezerAppProps {
  user: User;
  ref?: Ref<FreezerAppHandle>;
}

export default function FreezerApp({ user, ref }: FreezerAppProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useScrollLock(isFormOpen);
  const [selectedCategories, setSelectedCategories] = useState<
    ProductCategory[]
  >([]);
  const [showShoppingCart, setShowShoppingCart] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
      window.requestAnimationFrame(() => {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    openCreateForm: () => {
      setProductsError(null);
      setIsFormOpen(true);
    },
  }));

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

      <ProductModal
        open={isFormOpen}
        title="Añadir producto"
        titleId="modal-new-product-title"
        onClose={closeForm}
      >
        <ProductForm
          mode="create"
          initialProduct={null}
          loading={savingProduct}
          onSubmit={handleCreateProduct}
          onCancel={closeForm}
        />
      </ProductModal>
    </>
  );
}
