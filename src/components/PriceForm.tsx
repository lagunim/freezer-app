import { useMemo, useState } from "react";
import type { PriceEntry, PriceInput, Unit, OfferType } from "@/lib/priceHunter";
import { normalizeStr, toDateInputValue } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useScrollLock } from "@/lib/useScrollLock";

/** Datos pre-rellenados desde el escáner de código de barras */
export interface PrefillData {
  product_name?: string;
  brand?: string;
  quantity?: number;
  unit?: Unit;
  bar_code?: string;
  product_prices_id?: string;
}

interface PriceFormProps {
  mode: "create" | "edit";
  initialPrice?: PriceEntry | null;
  prefillData?: PrefillData | null;
  loading?: boolean;
  productSuggestions?: string[];
  brandSuggestions?: string[];
  supermarketSuggestions?: string[];
  onSubmit: (
    input: PriceInput,
    options?: { addToDespensa?: boolean },
  ) => Promise<void> | void;
  onCancel?: () => void;
}

const AVAILABLE_UNITS: Unit[] = ["Kg", "L", "Docena", "Unidad"];

const OFFER_OPTIONS: { value: "" | OfferType; label: string }[] = [
  { value: "", label: "— Sin oferta —" },
  { value: "2x1", label: "2x1 Segunda unidad gratis" },
  { value: "3x2", label: "3x2 Tercera unidad gratis" },
  { value: "50_second", label: "50% descuento en segunda unidad" },
  { value: "custom", label: "Personalizado" },
];

export default function PriceForm({
  mode,
  initialPrice,
  prefillData = null,
  loading = false,
  productSuggestions = [],
  brandSuggestions = [],
  supermarketSuggestions = [],
  onSubmit,
  onCancel,
}: PriceFormProps) {
  const isEdit = mode === "edit";
  const source = initialPrice ?? prefillData;

  useScrollLock(true);

  const [productName, setProductName] = useState(
    initialPrice?.product_name ?? prefillData?.product_name ?? "",
  );
  const [brand, setBrand] = useState(
    initialPrice?.brand ?? prefillData?.brand ?? "",
  );
  const [totalPrice, setTotalPrice] = useState(
    initialPrice?.total_price != null ? String(initialPrice.total_price) : "",
  );
  const [quantity, setQuantity] = useState(
    initialPrice?.quantity != null
      ? String(initialPrice.quantity)
      : prefillData?.quantity != null
        ? String(prefillData.quantity)
        : "",
  );
  const [unit, setUnit] = useState<Unit>(
    initialPrice?.unit ?? prefillData?.unit ?? "Kg",
  );
  const [supermarket, setSupermarket] = useState(
    initialPrice?.supermarket ?? "",
  );
  const [date, setDate] = useState(toDateInputValue(initialPrice?.date));
  const [offerType, setOfferType] = useState<"" | OfferType>(
    initialPrice?.offer_type ?? "",
  );
  const [customOfferName, setCustomOfferName] = useState(
    initialPrice?.offer_name ?? "",
  );
  const [customOfferDescription, setCustomOfferDescription] = useState(
    initialPrice?.offer_description ?? "",
  );
  const [showCustomOfferModal, setShowCustomOfferModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSuggestionsBrand, setShowSuggestionsBrand] = useState(false);
  const [showSuggestionsSupermarket, setShowSuggestionsSupermarket] =
    useState(false);
  const [addToDespensa, setAddToDespensa] = useState(false);
  const [barcode, setBarcode] = useState(
    initialPrice?.bar_code ?? prefillData?.bar_code ?? "",
  );
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Derivar listas filtradas durante el render (rerender-derived-state-no-effect)
  const filteredSuggestions = useMemo(() => {
    if (productName.trim() === "") return [];
    const q = normalizeStr(productName);
    return productSuggestions.filter((s) => normalizeStr(s).includes(q));
  }, [productName, productSuggestions]);

  const filteredBrandSuggestions = useMemo(() => {
    if (brand.trim() === "") return [];
    const q = normalizeStr(brand);
    return brandSuggestions.filter((s) => normalizeStr(s).includes(q));
  }, [brand, brandSuggestions]);

  const filteredSupermarketSuggestions = useMemo(() => {
    if (supermarket.trim() === "") return [];
    const q = normalizeStr(supermarket);
    return supermarketSuggestions.filter((s) => normalizeStr(s).includes(q));
  }, [supermarket, supermarketSuggestions]);

  const handleProductNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setProductName(event.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setProductName(suggestion);
    setShowSuggestions(false);
  };

  const handleBrandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBrand(event.target.value);
    setShowSuggestionsBrand(true);
  };

  const handleBrandSuggestionClick = (suggestion: string) => {
    setBrand(suggestion);
    setShowSuggestionsBrand(false);
  };

  const handleSupermarketChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setSupermarket(event.target.value);
    setShowSuggestionsSupermarket(true);
  };

  const handleSupermarketSuggestionClick = (suggestion: string) => {
    setSupermarket(suggestion);
    setShowSuggestionsSupermarket(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedProductName = productName.trim();
    if (!trimmedProductName) {
      setLocalError("El nombre del producto no puede estar vacío.");
      return;
    }

    const totalPriceNumber = Number.parseFloat(totalPrice.replace(",", "."));
    if (Number.isNaN(totalPriceNumber) || totalPriceNumber < 0) {
      setLocalError("El precio debe ser un número mayor o igual que 0.");
      return;
    }

    const quantityNumber = Number.parseFloat(quantity.replace(",", "."));
    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      setLocalError("La cantidad debe ser un número mayor que 0.");
      return;
    }

    const trimmedSupermarket = supermarket.trim();
    if (!trimmedSupermarket) {
      setLocalError("El supermercado no puede estar vacío.");
      return;
    }

    if (!date) {
      setLocalError("Selecciona una fecha.");
      return;
    }

    const input: PriceInput = {
      product_prices_id: initialPrice?.product_prices_id ?? prefillData?.product_prices_id,
      product_name: trimmedProductName,
      brand: brand.trim(),
      total_price: totalPriceNumber,
      quantity: quantityNumber,
      unit: unit,
      supermarket: trimmedSupermarket,
      date: new Date(date).toISOString(),
      offer_type: offerType === "" ? null : offerType,
      offer_name:
        offerType === "custom" ? customOfferName.trim() || null : null,
      offer_description:
        offerType === "custom"
          ? customOfferDescription.trim() || null
          : null,
      bar_code: barcode.trim() || undefined,
    };

    try {
      if (isEdit) {
        await onSubmit(input);
        // Cerrar el modal después de actualizar exitosamente
        onCancel?.();
      } else {
        await onSubmit(input, { addToDespensa });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      setLocalError(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (!loading) {
          onCancel?.();
        }
      }}
    >
      <motion.div
        initial={{ scaleY: 0, originY: 0.5 }}
        animate={{ scaleY: 1, originY: 0.5 }}
        exit={{ scaleY: 0, originY: 0.5 }}
        transition={{ duration: 0.8, type: "spring", ease: "easeIn" }}
        className="relative mx-4 w-full max-w-lg min-w-0 rounded-[22px] border border-white/[0.07] bg-[#141c30] p-3.5 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-[#f4f6fb]">
            {isEdit ? "Editar precio" : "Añadir nuevo precio"}
          </h2>
          <p className="mt-0.5 text-xs text-[#8b93a9]">
            {isEdit
              ? "Modifica los datos del precio"
              : "Ingresa los datos del producto y su precio"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* mt-head: Producto + Marca */}
          <div className="rounded-[22px] border border-white/[0.07] bg-[#141c30] p-3 space-y-2">
            {/* Row 1: Producto */}
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06] text-sm">
                📦
              </div>
              <input
                id="product-name"
                type="text"
                value={productName}
                onChange={handleProductNameChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-base font-bold text-[#f4f6fb] placeholder-[#5a6379] placeholder:font-semibold py-1.5 min-h-[44px]"
                placeholder="Nombre del producto"
                required
                autoComplete="off"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-11 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/[0.07] bg-[#111a2c] shadow-lg">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm text-[#f4f6fb] transition-colors hover:bg-white/[0.06]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Row 2: Marca */}
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06] text-sm">
                🏷️
              </div>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={handleBrandChange}
                onFocus={() => setShowSuggestionsBrand(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsBrand(false), 200)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-base font-medium text-[#8b93a9] placeholder-[#5a6379] py-1.5 min-h-[44px]"
                placeholder="Marca"
                autoComplete="off"
              />
              {showSuggestionsBrand && filteredBrandSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-11 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/[0.07] bg-[#111a2c] shadow-lg">
                  {filteredBrandSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleBrandSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm text-[#f4f6fb] transition-colors hover:bg-white/[0.06]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* priceband: Precio pagado */}
          <div className="rounded-[14px] border border-[#4da2ff]/[0.2] bg-[#4da2ff]/[0.09] px-3.5 py-2.5">
            <p className="text-[0.6rem] uppercase tracking-[0.06em] font-bold text-[#4da2ff] mb-1">
              Precio pagado (€)
            </p>
            <input
              id="total-price"
              type="text"
              inputMode="decimal"
              pattern="^\d+([.,]\d{1,2})?$"
              step="0.01"
              min="0"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xl font-extrabold text-[#4da2ff] placeholder-[#4da2ff]/[0.45]"
              placeholder="0,00"
              required
            />
          </div>

          {/* miniStats: Cantidad + Unidad + Fecha */}
          <div className="flex overflow-hidden rounded-[14px] border border-white/[0.07]">
            <div className="flex-1 px-2 py-2 text-center border-r border-white/[0.07]">
              <p className="text-[0.55rem] uppercase tracking-[0.04em] font-bold text-[#8b93a9] mb-1">Cantidad</p>
              <input
                id="quantity"
                type="text"
                inputMode="decimal"
                pattern="^\d+([.,]\d{1,2})?$"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-center text-base font-bold text-[#f4f6fb] placeholder-[#5a6379] placeholder:font-semibold"
                placeholder="0"
                required
              />
            </div>
            <div className="flex-1 px-2 py-2 text-center border-r border-white/[0.07]">
              <p className="text-[0.55rem] uppercase tracking-[0.04em] font-bold text-[#8b93a9] mb-1">Unidad</p>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="w-full bg-transparent border-none outline-none text-center text-base font-bold text-[#f4f6fb] appearance-none cursor-pointer"
                required
              >
                {AVAILABLE_UNITS.map((u) => (
                  <option key={u} value={u} className="bg-[#141c30] text-[#f4f6fb]">
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 px-2 py-2 text-center">
              <p className="text-[0.55rem] uppercase tracking-[0.04em] font-bold text-[#8b93a9] mb-1">Fecha</p>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-center text-base font-bold text-[#f4f6fb] appearance-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70"
                required
              />
            </div>
          </div>

          {/* thinrow: Supermercado */}
          <div className="flex items-center gap-2.5 border-t border-dashed border-white/[0.07] pt-2.5">
            <span className="flex items-center text-sm leading-none mt-2">🏬</span>
            <div className="relative flex-1 min-w-0">
              <input
                id="supermarket"
                type="text"
                value={supermarket}
                onChange={handleSupermarketChange}
                onFocus={() => setShowSuggestionsSupermarket(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsSupermarket(false), 200)}
                className="w-full bg-transparent border-none outline-none text-base font-semibold text-[#f4f6fb] placeholder-[#5a6379] py-2 min-h-[44px]"
                placeholder="Supermercado"
                required
                autoComplete="off"
              />
              {showSuggestionsSupermarket && filteredSupermarketSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/[0.07] bg-[#111a2c] shadow-lg">
                  {filteredSupermarketSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSupermarketSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm text-[#f4f6fb] transition-colors hover:bg-white/[0.06]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* thinrow: Código de barras */}
          <div className="flex items-center gap-2.5 border-t border-dashed border-white/[0.07] pt-2.5">
            <span className="flex items-center text-sm leading-none mt-2">📋</span>
            <input
              id="barcode"
              type="text"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-base font-semibold text-[#f4f6fb] placeholder-[#5a6379] py-2 min-h-[44px]"
              placeholder="Código de barras"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] bg-[#4da2ff] text-[11px] font-bold text-[#06121f] transition-colors hover:bg-[#3b8fe6]"
              aria-label="Escanear código de barras"
              title="Escanear código de barras"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </button>
          </div>

          {/* thinrow oferta: Oferta */}
          <div className="flex items-center gap-2.5 rounded-[10px] bg-[rgba(227,181,103,0.12)] border border-[rgba(227,181,103,0.3)] px-3 py-2">
            <span className="flex items-center text-sm leading-none">🏷️</span>
            <select
              id="offer"
              value={offerType}
              onChange={(e) => {
                const v = e.target.value as "" | OfferType;
                setOfferType(v);
                if (v === "custom") setShowCustomOfferModal(true);
              }}
              className="flex-1 bg-transparent border-none outline-none text-base font-bold text-[#e3b567] appearance-none cursor-pointer"
            >
              {OFFER_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value} className="bg-[#141c30] text-[#f4f6fb]">
                  {opt.label}
                </option>
              ))}
            </select>
            {offerType === "custom" && (
              <button
                type="button"
                onClick={() => setShowCustomOfferModal(true)}
                className="shrink-0 text-[0.65rem] font-semibold text-[#e3b567] hover:text-[#d4a556] transition-colors"
              >
                Editar →
              </button>
            )}
          </div>

          {/* mt-check: Añadir a la despensa */}
          {!isEdit && (
            <div className="flex items-center gap-2.5 py-1">
              <input
                id="add-to-despensa"
                type="checkbox"
                checked={addToDespensa}
                onChange={(e) => setAddToDespensa(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#111a2c] text-[#4da2ff] focus:ring-[#4da2ff] focus:ring-offset-0 focus:ring-offset-[#141c30] cursor-pointer"
              />
              <label
                htmlFor="add-to-despensa"
                className="text-xs text-[#8b93a9] cursor-pointer select-none"
              >
                Añadir también a la despensa (Freezer App)
              </label>
            </div>
          )}

          {/* Error local */}
          {localError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5">
              <p className="text-xs text-red-400">{localError}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2.5 text-xs font-bold text-[#8b93a9] transition-colors hover:bg-white/[0.10] hover:text-[#f4f6fb] focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancelar</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-[#2fbf62] py-2.5 text-xs font-bold text-[#04170c] transition-colors hover:bg-[#28a856] focus:outline-none focus:ring-2 focus:ring-[#2fbf62] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#04170c] border-t-transparent"></span>
                  Guardando...
                </span>
              ) : isEdit ? (
                <span>Actualizar</span>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Añadir</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal oferta personalizada */}
        <AnimatePresence>
          {showCustomOfferModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"
              onClick={() => setShowCustomOfferModal(false)}
            >
              <motion.div
                initial={{ scaleY: 0, scaleX: 0.7, opacity: 0 }}
                animate={{ scaleY: 1, scaleX: 1, opacity: 1 }}
                exit={{ scaleY: 0, scaleX: 0.6, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="mx-4 w-full max-w-sm rounded-[22px] border border-white/[0.07] bg-[#141c30] p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#f4f6fb]">
                    Oferta personalizada
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomOfferModal(false)}
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/[0.06] text-[#8b93a9] hover:bg-white/10 hover:text-[#f4f6fb] transition-colors"
                    aria-label="Cerrar"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="custom-offer-name" className="mb-1 block text-xs font-medium text-[#8b93a9]">
                      Nombre
                    </label>
                    <input
                      id="custom-offer-name"
                      type="text"
                      value={customOfferName}
                      onChange={(e) => setCustomOfferName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.07] bg-[#111a2c] px-3.5 py-2.5 text-base text-[#f4f6fb] placeholder-[#8b93a9]/50 focus:border-[#4da2ff] focus:outline-none focus:ring-1 focus:ring-[#4da2ff]/50"
                      placeholder="Ej: 3x2 en yogures"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-offer-description" className="mb-1 block text-xs font-medium text-[#8b93a9]">
                      Descripción
                    </label>
                    <textarea
                      id="custom-offer-description"
                      value={customOfferDescription}
                      onChange={(e) => setCustomOfferDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-white/[0.07] bg-[#111a2c] px-3.5 py-2.5 text-base text-[#f4f6fb] placeholder-[#8b93a9]/50 focus:border-[#4da2ff] focus:outline-none focus:ring-1 focus:ring-[#4da2ff]/50 resize-none"
                      placeholder="Ej: Lleva 3 y paga 2 en línea de yogures naturales"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCustomOfferModal(false)}
                    className="rounded-xl bg-[#4da2ff] px-4 py-2 text-xs font-bold text-[#06121f] transition-colors hover:bg-[#3b8fe6]"
                  >
                    Listo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Barcode Scanner */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner
            onDetected={(code) => {
              setBarcode(code);
              setIsScannerOpen(false);
            }}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
