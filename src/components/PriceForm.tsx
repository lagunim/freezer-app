import { useMemo, useState } from "react";
import type { PriceEntry, PriceInput, Unit, OfferType } from "@/lib/priceHunter";
import { motion, AnimatePresence } from "framer-motion";

interface PriceFormProps {
  mode: "create" | "edit";
  initialPrice?: PriceEntry | null;
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

function toDateInputValue(iso?: string): string {
  if (!iso) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return toDateInputValue();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const AVAILABLE_UNITS: Unit[] = ["1Kg", "1L", "Docena", "Unidad"];

const OFFER_OPTIONS: { value: "" | OfferType; label: string }[] = [
  { value: "", label: "— Sin oferta —" },
  { value: "2x1", label: "2x1 Segunda unidad gratis" },
  { value: "50_second", label: "50% descuento en segunda unidad" },
  { value: "custom", label: "Personalizado" },
];

export default function PriceForm({
  mode,
  initialPrice,
  loading = false,
  productSuggestions = [],
  brandSuggestions = [],
  supermarketSuggestions = [],
  onSubmit,
  onCancel,
}: PriceFormProps) {
  const isEdit = mode === "edit";

  const [productName, setProductName] = useState(
    initialPrice?.product_name ?? "",
  );
  const [brand, setBrand] = useState(initialPrice?.brand ?? "");
  const [totalPrice, setTotalPrice] = useState(
    initialPrice?.total_price != null ? String(initialPrice.total_price) : "",
  );
  const [quantity, setQuantity] = useState(
    initialPrice?.quantity != null ? String(initialPrice.quantity) : "",
  );
  const [unit, setUnit] = useState<Unit>(initialPrice?.unit ?? "1Kg");
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
  const [addToDespensa, setAddToDespensa] = useState(true);

  // Derivar listas filtradas durante el render (rerender-derived-state-no-effect)
  const filteredSuggestions = useMemo(() => {
    if (productName.trim() === "") return [];
    return productSuggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(productName.toLowerCase()),
    );
  }, [productName, productSuggestions]);

  const filteredBrandSuggestions = useMemo(() => {
    if (brand.trim() === "") return [];
    return brandSuggestions.filter((s) =>
      s.toLowerCase().includes(brand.toLowerCase()),
    );
  }, [brand, brandSuggestions]);

  const filteredSupermarketSuggestions = useMemo(() => {
    if (supermarket.trim() === "") return [];
    return supermarketSuggestions.filter((s) =>
      s.toLowerCase().includes(supermarket.toLowerCase()),
    );
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

    const totalPriceNumber = Number.parseFloat(totalPrice);
    if (Number.isNaN(totalPriceNumber) || totalPriceNumber < 0) {
      setLocalError("El precio debe ser un número mayor o igual que 0.");
      return;
    }

    const quantityNumber = Number.parseFloat(quantity);
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
        className="relative mx-4 w-full max-w-lg min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-100">
            {isEdit ? "Editar precio" : "Añadir nuevo precio"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isEdit
              ? "Modifica los datos del precio"
              : "Ingresa los datos del producto y su precio"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del producto con autocompletado */}
          <div className="relative">
            <label
              htmlFor="product-name"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Producto
            </label>
            <input
              id="product-name"
              type="text"
              value={productName}
              onChange={handleProductNameChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay para permitir click en sugerencias
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="Ej: Leche entera"
              required
              autoComplete="off"
            />
            {/* Sugerencias de autocompletado */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Marca con autocompletado */}
          <div className="relative">
            <label
              htmlFor="brand"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Marca
            </label>
            <input
              id="brand"
              type="text"
              value={brand}
              onChange={handleBrandChange}
              onFocus={() => setShowSuggestionsBrand(true)}
              onBlur={() =>
                setTimeout(() => setShowSuggestionsBrand(false), 200)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="Ej: Hacendado"
              autoComplete="off"
            />
            {showSuggestionsBrand && filteredBrandSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                {filteredBrandSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleBrandSuggestionClick(suggestion)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Precio pagado y Cantidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="total-price"
                className="mb-2 block text-sm font-medium text-slate-300 min-h-[20px]"
              >
                Precio pagado (€)
              </label>
              <input
                id="total-price"
                type="number"
                step="0.01"
                min="0"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="Ej: 3.40"
                required
              />
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="mb-2 block text-sm font-medium text-slate-300 min-h-[20px]"
              >
                Cantidad
              </label>
              <input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="Ej: 250 (g, ml o unidades)"
                required
              />
            </div>
          </div>

          {/* Unidad de comparación y Supermercado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="unit"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Unidad
              </label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                required
              >
                {AVAILABLE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label
                htmlFor="supermarket"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Supermercado
              </label>
              <input
                id="supermarket"
                type="text"
                value={supermarket}
                onChange={handleSupermarketChange}
                onFocus={() => setShowSuggestionsSupermarket(true)}
                onBlur={() =>
                  setTimeout(() => setShowSuggestionsSupermarket(false), 200)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="Ej: Mercadona"
                required
                autoComplete="off"
              />
              {showSuggestionsSupermarket &&
                filteredSupermarketSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                    {filteredSupermarketSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          handleSupermarketSuggestionClick(suggestion)
                        }
                        className="w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Fecha */}
          <div className="min-w-0">
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Fecha
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 w-full max-w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90"
              required
            />
          </div>

          {/* Oferta */}
          <div className="min-w-0">
            <label
              htmlFor="offer"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Oferta
            </label>
            <select
              id="offer"
              value={offerType}
              onChange={(e) => {
                const v = e.target.value as "" | OfferType;
                setOfferType(v);
                if (v === "custom") setShowCustomOfferModal(true);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              {OFFER_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {offerType === "custom" && (
              <button
                type="button"
                onClick={() => setShowCustomOfferModal(true)}
                className="mt-2 text-sm text-sky-400 hover:text-sky-300 transition-colors"
              >
                Editar nombre y descripción →
              </button>
            )}
          </div>

          {/* Añadir a la despensa (solo en creación) */}
          {!isEdit && (
            <div className="flex items-center gap-3">
              <input
                id="add-to-despensa"
                type="checkbox"
                checked={addToDespensa}
                onChange={(e) => setAddToDespensa(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0 focus:ring-offset-slate-900"
              />
              <label
                htmlFor="add-to-despensa"
                className="text-sm text-slate-300 cursor-pointer select-none"
              >
                Añadir también a la despensa (Freezer App)
              </label>
            </div>
          )}

          {/* Error local */}
          {localError && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{localError}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Guardando...
                </span>
              ) : isEdit ? (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 15l10-10a2.121 2.121 0 013 3L12 18l-4 1 1-4z"
                    />
                  </svg>
                  Actualizar
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Añadir
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal oferta personalizada (sobre el modal de precio) */}
        <AnimatePresence>
          {showCustomOfferModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-900/95 backdrop-blur-sm"
              onClick={() => setShowCustomOfferModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">
                    Oferta personalizada
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomOfferModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    aria-label="Cerrar"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="custom-offer-name"
                      className="mb-1.5 block text-sm font-medium text-slate-300"
                    >
                      Nombre
                    </label>
                    <input
                      id="custom-offer-name"
                      type="text"
                      value={customOfferName}
                      onChange={(e) => setCustomOfferName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      placeholder="Ej: 3x2 en yogures"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-offer-description"
                      className="mb-1.5 block text-sm font-medium text-slate-300"
                    >
                      Descripción
                    </label>
                    <textarea
                      id="custom-offer-description"
                      value={customOfferDescription}
                      onChange={(e) =>
                        setCustomOfferDescription(e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                      placeholder="Ej: Lleva 3 y paga 2 en línea de yogures naturales"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCustomOfferModal(false)}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    Listo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
