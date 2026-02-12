import { useEffect, useState } from 'react';
import type { PriceEntry, PriceInput, Unit } from '@/lib/priceHunter';

interface PriceFormProps {
  mode: 'create' | 'edit';
  initialPrice?: PriceEntry | null;
  loading?: boolean;
  productSuggestions?: string[];
  onSubmit: (input: PriceInput) => Promise<void> | void;
  onCancel?: () => void;
}

function toDateInputValue(iso?: string): string {
  if (!iso) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return toDateInputValue();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const AVAILABLE_UNITS: Unit[] = ['1Kg', '1L', 'Docena'];

export default function PriceForm({
  mode,
  initialPrice,
  loading = false,
  productSuggestions = [],
  onSubmit,
  onCancel,
}: PriceFormProps) {
  const isEdit = mode === 'edit';

  const [productName, setProductName] = useState(initialPrice?.product_name ?? '');
  const [totalPrice, setTotalPrice] = useState(
    initialPrice?.total_price != null ? String(initialPrice.total_price) : ''
  );
  const [quantity, setQuantity] = useState(
    initialPrice?.quantity != null ? String(initialPrice.quantity) : ''
  );
  const [unit, setUnit] = useState<Unit>(initialPrice?.unit ?? '1Kg');
  const [supermarket, setSupermarket] = useState(initialPrice?.supermarket ?? '');
  const [date, setDate] = useState(toDateInputValue(initialPrice?.date));
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setProductName(initialPrice?.product_name ?? '');
    setTotalPrice(initialPrice?.total_price != null ? String(initialPrice.total_price) : '');
    setQuantity(initialPrice?.quantity != null ? String(initialPrice.quantity) : '');
    setUnit(initialPrice?.unit ?? '1Kg');
    setSupermarket(initialPrice?.supermarket ?? '');
    setDate(toDateInputValue(initialPrice?.date));
    setLocalError(null);
  }, [initialPrice]);

  // Filtrar sugerencias basadas en el input del usuario
  useEffect(() => {
    if (productName.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = productSuggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(productName.toLowerCase())
    );
    setFilteredSuggestions(filtered);
  }, [productName, productSuggestions]);

  const handleProductNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProductName(event.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setProductName(suggestion);
    setShowSuggestions(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedProductName = productName.trim();
    if (!trimmedProductName) {
      setLocalError('El nombre del producto no puede estar vacío.');
      return;
    }

    const totalPriceNumber = Number.parseFloat(totalPrice);
    if (Number.isNaN(totalPriceNumber) || totalPriceNumber < 0) {
      setLocalError('El precio debe ser un número mayor o igual que 0.');
      return;
    }

    const quantityNumber = Number.parseFloat(quantity);
    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      setLocalError('La cantidad debe ser un número mayor que 0.');
      return;
    }

    const trimmedSupermarket = supermarket.trim();
    if (!trimmedSupermarket) {
      setLocalError('El supermercado no puede estar vacío.');
      return;
    }

    if (!date) {
      setLocalError('Selecciona una fecha.');
      return;
    }

    const input: PriceInput = {
      product_name: trimmedProductName,
      total_price: totalPriceNumber,
      quantity: quantityNumber,
      unit: unit,
      supermarket: trimmedSupermarket,
      date: new Date(date).toISOString(),
    };

    try {
      await onSubmit(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setLocalError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg animate-[slideInUp_0.3s_ease-out] rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-100">
            {isEdit ? 'Editar precio' : 'Añadir nuevo precio'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isEdit
              ? 'Modifica los datos del precio'
              : 'Ingresa los datos del producto y su precio'}
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

            <div>
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
                onChange={(e) => setSupermarket(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="Ej: Mercadona"
                required
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

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
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Guardando...
                </span>
              ) : isEdit ? (
                'Actualizar'
              ) : (
                'Añadir'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
