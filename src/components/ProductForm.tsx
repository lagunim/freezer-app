import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductInput, ProductCategory } from '@/lib/products';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialProduct?: Product | null;
  loading?: boolean;
  onSubmit: (input: ProductInput) => Promise<void> | void;
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

export default function ProductForm({
  mode,
  initialProduct,
  loading = false,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const isEdit = mode === 'edit';

  const initialDate = useMemo(
    () => toDateInputValue(initialProduct?.added_at),
    [initialProduct]
  );

  const [name, setName] = useState(initialProduct?.name ?? '');
  const [quantity, setQuantity] = useState(
    initialProduct?.quantity != null ? String(initialProduct.quantity) : '1'
  );
  const [quantityUnit, setQuantityUnit] = useState(
    initialProduct?.quantity_unit ?? 'uds'
  );
  const [category, setCategory] = useState<ProductCategory>(
    initialProduct?.category ?? 'Alimentación'
  );
  const [addedAt, setAddedAt] = useState(initialDate);
  const [addToBasket, setAddToBasket] = useState(
    initialProduct?.in_shopping_list ?? false
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialProduct?.name ?? '');
    setQuantity(
      initialProduct?.quantity != null ? String(initialProduct.quantity) : '1'
    );
    setQuantityUnit(initialProduct?.quantity_unit ?? 'uds');
    setCategory(initialProduct?.category ?? 'Alimentación');
    setAddedAt(toDateInputValue(initialProduct?.added_at));
    setAddToBasket(initialProduct?.in_shopping_list ?? false);
    setLocalError(null);
  }, [initialProduct]);

  const parseQuantity = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  };

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    // Permitimos cadena vacía mientras el usuario escribe
    if (value === '') {
      setQuantity('');
      return;
    }

    setQuantity(value);
  };

  const changeQuantityBy = (delta: number) => {
    setQuantity((previous) => {
      const current = parseQuantity(previous);
      const next = current + delta;

      if (next < 0) {
        return '0';
      }

      return String(next);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('El nombre del producto no puede estar vacío.');
      return;
    }

    const qtyNumber = Number.parseInt(quantity, 10);
    if (Number.isNaN(qtyNumber) || qtyNumber < 0) {
      setLocalError('La cantidad debe ser un número mayor o igual que 0.');
      return;
    }

    if (!addedAt) {
      setLocalError('Selecciona una fecha de alta.');
      return;
    }

    const input: ProductInput = {
      name: trimmedName,
      quantity: qtyNumber,
      quantity_unit: quantityUnit,
      category: category,
      // Normalizamos a inicio de día; el backend lo guardará como timestamptz
      added_at: new Date(addedAt).toISOString(),
      in_shopping_list: addToBasket,
    };

    await onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="space-y-1">
        <label
          htmlFor="product-name"
          className="text-xs font-semibold text-slate-200"
        >
          Nombre del producto
        </label>
        <input
          id="product-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-800/40 backdrop-blur-xl px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 shadow-[0_0_15px_rgba(147,197,253,0.1)] transition-all focus:border-sky-400/50 focus:outline-none"
          placeholder="Ej. Pechugas de pollo"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="product-category"
          className="text-xs font-semibold text-slate-200"
        >
          Categoría
        </label>
        <select
          id="product-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
          className="w-full rounded-lg border border-white/20 bg-slate-800/40 backdrop-blur-xl px-3 py-2 text-base text-slate-100 shadow-[0_0_15px_rgba(147,197,253,0.1)] transition-all focus:border-sky-400/50 focus:outline-none"
        >
          <option value="Alimentación">🍎 Alimentación</option>
          <option value="Limpieza">🧹 Limpieza</option>
          <option value="Higiene">🧴 Higiene</option>
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="product-added-at"
          className="text-xs font-semibold text-slate-200"
        >
          Fecha de alta
        </label>
        <input
          id="product-added-at"
          type="date"
          required
          value={addedAt}
          onChange={(e) => setAddedAt(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-800/40 backdrop-blur-xl px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 shadow-[0_0_15px_rgba(147,197,253,0.1)] transition-all focus:border-sky-400/50 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label
            htmlFor="product-quantity"
            className="text-xs font-semibold text-slate-200"
          >
            Cantidad
          </label>
          <div className="flex h-10 items-stretch rounded-lg border border-white/20 bg-slate-800/40 backdrop-blur-xl shadow-[0_0_15px_rgba(147,197,253,0.1)] focus-within:border-sky-400/50 transition-all overflow-hidden">
            <button
              type="button"
              aria-label="Restar cantidad"
              onClick={() => changeQuantityBy(-1)}
              disabled={loading || parseQuantity(quantity) <= 0}
              className="flex h-10 min-w-[44px] flex-shrink-0 items-center justify-center rounded-l-lg bg-slate-700/50 text-xl font-bold text-slate-100 transition-all duration-200 hover:bg-slate-600/60 active:bg-slate-500/70 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 touch-manipulation"
            >
              −
            </button>
            <input
              id="product-quantity"
              type="number"
              min={0}
              required
              value={quantity}
              onChange={handleQuantityChange}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-center text-base font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none touch-manipulation"
              placeholder="0"
            />
            <button
              type="button"
              aria-label="Sumar cantidad"
              onClick={() => changeQuantityBy(1)}
              disabled={loading}
              className="flex h-10 min-w-[44px] flex-shrink-0 items-center justify-center rounded-r-lg bg-slate-700/50 text-xl font-bold text-slate-100 transition-all duration-200 hover:bg-slate-600/60 active:bg-slate-500/70 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 touch-manipulation"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="product-quantity-unit"
            className="text-xs font-semibold text-slate-200"
          >
            Unidad
          </label>
          <select
            id="product-quantity-unit"
            value={quantityUnit}
            onChange={(e) => setQuantityUnit(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-slate-800/40 backdrop-blur-xl px-3 py-2 text-base text-slate-100 shadow-[0_0_15px_rgba(147,197,253,0.1)] transition-all focus:border-sky-400/50 focus:outline-none"
          >
            <option value="uds">uds</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="L">L</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="add-to-basket"
          className="text-xs font-semibold text-slate-200"
        >
          Añadir a la cesta
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="add-to-basket"
            type="checkbox"
            checked={addToBasket}
            onChange={(e) => setAddToBasket(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-white/30 bg-slate-800/40 text-sky-500 focus:ring-sky-400/50 focus:ring-offset-0"
          />
          <span className="text-sm text-slate-200">
            Incluir en la lista de la compra
          </span>
        </label>
      </div>

      {localError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/60 backdrop-blur-xl px-3 py-2 text-xs text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
          <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{localError}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-slate-800/60 backdrop-blur-xl px-3 py-2 text-sm font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-800/80 hover:scale-105 active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
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
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 relative inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/40 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 px-3 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:from-sky-400 hover:via-blue-500 hover:to-blue-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-105 active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent"
                aria-hidden
              />
              {isEdit ? "Guardando…" : "Creando…"}
            </span>
          ) : (
            <>
              {isEdit ? (
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
              ) : (
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
              )}
              {isEdit ? "Guardar" : "Añadir"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

