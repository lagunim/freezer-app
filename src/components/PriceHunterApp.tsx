import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import PriceForm from "@/components/PriceForm";
import type { PrefillData } from "@/components/PriceForm";
import PriceTable from "@/components/PriceTable";
import SearchInput from "@/components/SearchInput";
import BarcodeScanner from "@/components/BarcodeScanner";
import type { PriceEntry, PriceInput, Unit } from "@/lib/priceHunter";
import {
  createPrice,
  deletePrice,
  fetchPrices,
  updatePrice,
  fetchUniqueSupermarkets,
} from "@/lib/priceHunter";
import {
  createProductPrice,
  updateProductPrice,
  fetchUniqueProductNames as fetchPPNames,
  fetchUniqueBrands as fetchPPBrands,
  fetchProductPriceByBarcode,
} from "@/lib/productPrices";
import { createProduct, updateProduct, fetchProducts } from "@/lib/products";
import type { ProductInput } from "@/lib/products";
import { lookupByBarcode } from "@/lib/openProducts";
import { normalizeStr } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { sileo } from "sileo";

export interface PriceHunterAppProps {
  user: User;
  onSwitchToFreezer?: () => void;
}

export default function PriceHunterApp({
  user,
  onSwitchToFreezer,
}: PriceHunterAppProps) {
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const priceSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setPricesLoading(true);
      setPricesError(null);
      try {
        const [pricesData, ppNames, ppBrands, supermarkets] =
          await Promise.all([
            fetchPrices(),
            fetchPPNames(),
            fetchPPBrands(),
            fetchUniqueSupermarkets(),
          ]);
        setPrices(pricesData);
        setProductSuggestions(ppNames);
        setBrandSuggestions(ppBrands);
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
  }, [user]);

  const refreshSuggestions = async () => {
    const [ppNames, ppBrands, supermarkets] = await Promise.all([
      fetchPPNames(),
      fetchPPBrands(),
      fetchUniqueSupermarkets(),
    ]);
    setProductSuggestions(ppNames);
    setBrandSuggestions(ppBrands);
    setSupermarketSuggestions(supermarkets);
  };

  const openForm = () => {
    setEditingPrice(null);
    setPrefillData(null);
    setIsFormOpen(true);
  };

  const openFormWithPrefill = (data: PrefillData) => {
    setEditingPrice(null);
    setPrefillData(data);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPrice(null);
    setPrefillData(null);
    setScannedBarcode(null);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setIsScannerOpen(false);
    setScannedBarcode(barcode);
    try {
      const found = await fetchProductPriceByBarcode(barcode);
      if (found) {
        openFormWithPrefill({
          product_name: found.product_name,
          brand: found.brand ?? undefined,
          quantity: found.quantity,
          unit: found.unit,
          bar_code: found.bar_code ?? undefined,
          product_prices_id: found.id,
        });
        return;
      }

      const offResult = await lookupByBarcode(barcode);
      if (offResult.found) {
        openFormWithPrefill({
          product_name: offResult.product_name,
          brand: offResult.brand,
          quantity: offResult.quantity,
          unit: offResult.unit,
          bar_code: barcode,
        });
      } else {
        sileo.info({
          title: "Código no registrado",
          description: "Introduce el precio manualmente.",
        });
        openForm();
      }
    } catch (err) {
      console.error("Error al buscar código de barras:", err);
      sileo.error({ title: "Error al buscar el código de barras." });
      openForm();
    }
  };

  function mapUnitToQuantityUnit(unit: Unit): string {
    switch (unit) {
      case "Kg":
      case "1Kg":
        return "g";
      case "L":
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
    setSavingPrice(true);
    setPricesError(null);
    try {
      let productPricesId = input.product_prices_id;
      if (!productPricesId) {
        const newPP = await createProductPrice(user.id, {
          product_name: input.product_name,
          brand: input.brand,
          quantity: input.quantity,
          unit: input.unit,
          bar_code: scannedBarcode ?? undefined,
        });
        productPricesId = newPP.id;
      }

      const created = await createPrice(user.id, {
        ...input,
        product_prices_id: productPricesId,
      });
      setPrices((prev) => [created, ...prev]);
      sileo.success({ title: "Precio añadido correctamente." });
      closeForm();
      // Refresh suggestions non-blocking
      void refreshSuggestions();

      if (options?.addToDespensa) {
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
            await createProduct(user.id, productInput);
          }
        } catch (despensaErr) {
          console.error(
            "Error al añadir/actualizar en la despensa:",
            despensaErr,
          );
          const msg =
            "Precio añadido correctamente; no se pudo añadir o actualizar en la despensa.";
          sileo.warning({ title: msg });
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
      if (editingPrice.product_prices_id) {
        await updateProductPrice(editingPrice.product_prices_id, {
          product_name: input.product_name,
          brand: input.brand,
          quantity: input.quantity,
          unit: input.unit,
          bar_code: input.bar_code,
        });
      }

      const updated = await updatePrice(editingPrice.id, input);
      setPrices((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      sileo.success({ title: "Precio actualizado correctamente." });
      closeForm();
      // Only refresh suggestions if suggestion-relevant fields changed
      if (
        input.product_name !== editingPrice.product_name ||
        input.brand !== editingPrice.brand ||
        input.supermarket !== editingPrice.supermarket
      ) {
        void refreshSuggestions();
      }
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
      const deleted = prices.find((p) => p.id === id);
      await deletePrice(id);
      setPrices((prev) => prev.filter((p) => p.id !== id));
      sileo.success({ title: "Precio eliminado correctamente." });
      // Only refresh if the deleted product/brand/supermarket no longer exists
      if (deleted) {
        const remaining = prices.filter((p) => p.id !== id);
        const hasSameProduct = remaining.some(
          (p) =>
            p.product_name === deleted.product_name &&
            p.brand === deleted.brand,
        );
        const hasSameSupermarket = remaining.some(
          (p) => p.supermarket === deleted.supermarket,
        );
        if (!hasSameProduct || !hasSameSupermarket) {
          void refreshSuggestions();
        }
      }
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
    const term = normalizeStr(searchTerm.trim());

    if (!term) {
      return prices;
    }

    return prices.filter((price) =>
      normalizeStr(price.product_name).includes(term),
    );
  }, [prices, searchTerm]);

  return (
    <>
      {/* Barra de búsqueda */}
      <div className="sticky top-0 z-50 backdrop-blur-md pb-2 md:pb-3 pt-2 md:pt-3 -mx-3 px-3 sm:-mx-4 sm:px-4 shadow-lg rounded-b-2xl">
        <SearchInput
          id="price-search"
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por producto…"
          label="Buscar por producto"
          inputRef={priceSearchInputRef}
        />
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

      {/* Scanner + Add Price FABs (inferior derecha, apilados) */}
      <div
        className="fixed right-6 z-20 flex flex-col items-end gap-3 sm:right-8"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-sky-600 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:bg-sky-700 hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16"
          aria-label="Escanear código de barras"
          title="Escanear código de barras"
        >
          <svg
            className="h-7 w-7 sm:h-8 sm:w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
            />
          </svg>
        </button>

        <button
          onClick={openForm}
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-sky-600 text-3xl font-light text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:bg-sky-700 hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16"
          aria-label="Añadir precio"
        >
          +
        </button>
      </div>

      {/* FAB Freezer App (inferior izquierda) */}
      <div
        className="fixed left-6 z-20 flex flex-col items-start sm:left-8"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={
            onSwitchToFreezer
              ? onSwitchToFreezer
              : () => { window.location.href = "/"; }
          }
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16"
          aria-label="Ir a Freezer App"
          title="Freezer App"
        >
          ❄️
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
            const input = priceSearchInputRef.current;
            if (!input) return;
            input.focus();
            input.select();
            window.requestAnimationFrame(() => {
              input.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
          className="flex h-14 w-14 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-colors duration-200 ease-out hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16 pointer-events-auto"
          aria-label="Buscar precios"
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

      {/* Price Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <PriceForm
            key={editingPrice?.id ?? prefillData?.product_prices_id ?? "create"}
            mode={editingPrice ? "edit" : "create"}
            initialPrice={editingPrice}
            prefillData={prefillData}
            loading={savingPrice}
            productSuggestions={productSuggestions}
            brandSuggestions={brandSuggestions}
            supermarketSuggestions={supermarketSuggestions}
            onSubmit={editingPrice ? handleUpdatePrice : handleCreatePrice}
            onCancel={closeForm}
          />
        )}
      </AnimatePresence>

      {/* Barcode Scanner */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
