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
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialProduct?.name ?? '');
    setQuantity(
      initialProduct?.quantity != null ? String(initialProduct.quantity) : '1'
    );
    setQuantityUnit(initialProduct?.quantity_unit ?? 'uds');
    setCategory(initialProduct?.category ?? 'Alimentación');
    setAddedAt(toDateInputValue(initialProduct?.added_at));
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
    };

    await onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="product-name"
          className="flex items-center gap-2 text-sm font-semibold text-slate-200 md:text-sm"
        >
          <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Nombre del producto
        </label>
        <div className="relative">
          <input
            id="product-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-slate-800/40 backdrop-blur-xl px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 shadow-[0_0_15px_rgba(147,197,253,0.1),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 focus:border-sky-400/50 focus:shadow-[0_0_20px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] focus:outline-none md:py-2 md:text-sm"
            placeholder="Ej. Pechugas de pollo"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="product-category"
          className="flex items-center gap-2 text-sm font-semibold text-slate-200 md:text-sm"
        >
          <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Categoría
        </label>
        <select
          id="product-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
          className="w-full rounded-xl border border-white/20 bg-slate-800/40 backdrop-blur-xl px-4 py-3 text-base text-slate-100 shadow-[0_0_15px_rgba(147,197,253,0.1),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 focus:border-sky-400/50 focus:shadow-[0_0_20px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] focus:outline-none md:py-2 md:text-sm"
        >
          <option value="Alimentación">🍎 Alimentación</option>
          <option value="Limpieza">🧹 Limpieza</option>
          <option value="Mascotas">🐾 Mascotas</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:gap-4">
        <div className="space-y-2">
          <label
            htmlFor="product-quantity"
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 md:text-sm"
          >
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            Cantidad
          </label>
          <div className="flex items-center rounded-xl border border-white/20 bg-slate-800/40 backdrop-blur-xl shadow-[0_0_15px_rgba(147,197,253,0.1),inset_0_1px_2px_rgba(255,255,255,0.05)] focus-within:border-sky-400/50 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-200">
            <button
              type="button"
              aria-label="Restar cantidad"
              onClick={() => changeQuantityBy(-1)}
              disabled={loading || parseQuantity(quantity) <= 0}
              className="inline-flex h-12 w-12 items-center justify-center rounded-l-xl text-xl font-bold text-slate-200 transition-all duration-200 hover:bg-white/10 active:bg-white/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10 md:text-lg"
            >
              -
            </button>
            <input
              id="product-quantity"
              type="number"
              min={0}
              required
              value={quantity}
              onChange={handleQuantityChange}
              className="w-full bg-transparent px-3 py-3 text-base text-center font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none md:py-2 md:text-sm"
              placeholder="0"
            />
            <button
              type="button"
              aria-label="Sumar cantidad"
              onClick={() => changeQuantityBy(1)}
              disabled={loading}
              className="inline-flex h-12 w-12 items-center justify-center rounded-r-xl text-xl font-bold text-slate-200 transition-all duration-200 hover:bg-white/10 active:bg-white/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10 md:text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="product-quantity-unit"
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 md:text-sm"
          >
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            Unidad
          </label>
          <select
            id="product-quantity-unit"
            value={quantityUnit}
            onChange={(e) => setQuantityUnit(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-slate-800/40 backdrop-blur-xl px-4 py-3 text-base text-slate-100 shadow-[0_0_15px_rgba(147,197,253,0.1),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 focus:border-sky-400/50 focus:shadow-[0_0_20px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] focus:outline-none md:py-2 md:text-sm"
          >
            <option value="uds">uds</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="L">L</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="product-added-at"
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 md:text-sm"
          >
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Fecha de alta
          </label>
          <input
            id="product-added-at"
            type="date"
            required
            value={addedAt}
            onChange={(e) => setAddedAt(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-slate-800/40 backdrop-blur-xl px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 shadow-[0_0_15px_rgba(147,197,253,0.1),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 focus:border-sky-400/50 focus:shadow-[0_0_20px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] focus:outline-none md:py-2 md:text-sm"
          />
        </div>
      </div>

      {localError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/60 backdrop-blur-xl px-4 py-3 text-sm text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.2)] md:px-4 md:py-3 md:text-sm">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{localError}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-800/60 backdrop-blur-xl px-5 py-3.5 text-base font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(148,163,184,0.25),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:px-4 md:py-2 md:text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="relative inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 px-5 py-3.5 text-base font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-200 hover:from-sky-400 hover:via-blue-500 hover:to-blue-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:px-4 md:py-2 md:text-sm"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
          <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="relative z-10">
            {loading
              ? isEdit
                ? 'Guardando…'
                : 'Creando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Añadir producto'}
          </span>
        </button>
      </div>
    </form>
  );
}

