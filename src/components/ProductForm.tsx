import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductInput } from '@/lib/products';

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
  const [addedAt, setAddedAt] = useState(initialDate);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialProduct?.name ?? '');
    setQuantity(
      initialProduct?.quantity != null ? String(initialProduct.quantity) : '1'
    );
    setQuantityUnit(initialProduct?.quantity_unit ?? 'uds');
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
      // Normalizamos a inicio de día; el backend lo guardará como timestamptz
      added_at: new Date(addedAt).toISOString(),
    };

    await onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="product-name"
          className="text-xs font-medium text-slate-200 sm:text-sm"
        >
          Nombre del producto
        </label>
        <input
          id="product-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:py-2 sm:text-sm"
          placeholder="Ej. Pechugas de pollo"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="space-y-1">
          <label
            htmlFor="product-quantity"
            className="text-xs font-medium text-slate-200 sm:text-sm"
          >
            Cantidad
          </label>
          <div className="flex items-center rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-100 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 sm:text-sm">
            <button
              type="button"
              aria-label="Restar cantidad"
              onClick={() => changeQuantityBy(-1)}
              disabled={loading || parseQuantity(quantity) <= 0}
              className="inline-flex h-8 w-8 items-center justify-center border-r border-slate-700 text-base font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9 sm:text-lg"
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
              className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none sm:py-2 sm:text-sm"
              placeholder="Ej. 3"
            />
            <button
              type="button"
              aria-label="Sumar cantidad"
              onClick={() => changeQuantityBy(1)}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-700 text-base font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9 sm:text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="product-quantity-unit"
            className="text-xs font-medium text-slate-200 sm:text-sm"
          >
            Unidad
          </label>
          <select
            id="product-quantity-unit"
            value={quantityUnit}
            onChange={(e) => setQuantityUnit(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:py-2 sm:text-sm"
          >
            <option value="uds">uds</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="L">L</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="product-added-at"
            className="text-xs font-medium text-slate-200 sm:text-sm"
          >
            Fecha de alta
          </label>
          <input
            id="product-added-at"
            type="date"
            required
            value={addedAt}
            onChange={(e) => setAddedAt(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:py-2 sm:text-sm"
          />
        </div>
      </div>

      {localError && (
        <div className="rounded-lg border border-amber-800/80 bg-amber-950/60 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:py-3 sm:text-sm">
          {localError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
        >
          {loading
            ? isEdit
              ? 'Guardando cambios…'
              : 'Creando producto…'
            : isEdit
              ? 'Guardar cambios'
              : 'Añadir producto'}
        </button>
      </div>
    </form>
  );
}

