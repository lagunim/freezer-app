import { useState } from 'react';
import type { Product } from '@/lib/products';

type SortField = 'name' | 'quantity' | 'date';

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onReload?: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
  onChangeSort?: (field: SortField) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no válida';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export default function ProductList({
  products,
  loading = false,
  onReload,
  onEdit,
  onDelete,
  sortBy,
  sortDirection,
  onChangeSort,
}: ProductListProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleHeaderClick = (field: SortField) => {
    if (!onChangeSort) return;
    onChangeSort(field);
  };

  const renderSortIndicator = (field: SortField) => {
    if (!sortBy || sortBy !== field || !sortDirection) return null;

    return (
      <span className="ml-1 text-[10px] text-slate-400">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete);
      setProductToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setProductToDelete(null);
  };

  if (!loading && products.length === 0) {
    return (
      <div className="min-w-0 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center transition-colors">
        <p className="mb-1 font-medium text-slate-200">Tu congelador está vacío</p>
        <p className="text-sm text-slate-400">
          Añade tu primer producto con el formulario de la izquierda.
        </p>
      </div>
    );
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Productos</h2>
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded bg-slate-800/60"
                aria-hidden
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500"
              aria-hidden
            />
            Cargando productos…
          </div>
        </div>
      </div>
    );
  }

  const actionButtons = (product: Product) => {
    const isConfirmingDelete = productToDelete?.id === product.id;
    const btnClass =
      'inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-medium transition';
    if (isConfirmingDelete) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="py-1 text-[11px] text-amber-100">¿Borrar?</span>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className={`${btnClass} bg-red-600 text-white hover:bg-red-500`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={handleCancelDelete}
            className={`${btnClass} border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700`}
          >
            No
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className={`${btnClass} border border-slate-600 bg-slate-800/80 text-slate-100 hover:border-sky-600 hover:bg-slate-800`}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => handleDeleteClick(product)}
          className={`${btnClass} border border-red-900/80 bg-red-950/60 text-red-200 hover:bg-red-950`}
        >
          Borrar
        </button>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Productos</h2>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      </div>

      {/* Vista tarjetas en móvil */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60 shadow-sm sm:hidden">
        <div className="divide-y divide-slate-700/60">
          {products.map((product) => (
            <div
              key={product.id}
              className={`px-3 py-2.5 ${
                productToDelete?.id === product.id ? 'bg-red-950/30' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {product.quantity}{' '}
                    <span className="text-slate-500">
                      {product.quantity_unit ?? 'uds'}
                    </span>
                    {' · '}
                    {formatDate(product.added_at)}
                  </p>
                </div>
                <div className="shrink-0">{actionButtons(product)}</div>
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex items-center gap-2 border-t border-slate-700 bg-slate-900/60 px-3 py-3 text-[11px] text-slate-400">
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500"
              aria-hidden
            />
            Actualizando lista de productos…
          </div>
        )}
      </div>

      {/* Vista tabla en sm y superior */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60 shadow-sm transition-shadow sm:block">
        <table className="min-w-full divide-y divide-slate-700/80 text-xs">
          <thead className="bg-slate-800/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                <button
                  type="button"
                  onClick={() => handleHeaderClick('name')}
                  className="inline-flex items-center gap-1 text-left text-slate-300 hover:text-slate-50"
                >
                  <span>Nombre</span>
                  {renderSortIndicator('name')}
                </button>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                <button
                  type="button"
                  onClick={() => handleHeaderClick('quantity')}
                  className="inline-flex items-center gap-1 text-left text-slate-300 hover:text-slate-50"
                >
                  <span>Cantidad</span>
                  {renderSortIndicator('quantity')}
                </button>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">
                <button
                  type="button"
                  onClick={() => handleHeaderClick('date')}
                  className="inline-flex items-center gap-1 text-left text-slate-300 hover:text-slate-50"
                >
                  <span>Fecha de alta</span>
                  {renderSortIndicator('date')}
                </button>
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-300">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 bg-slate-950/40">
            {products.map((product) => {
              const isConfirmingDelete = productToDelete?.id === product.id;
              return (
                <tr
                  key={product.id}
                  className={`transition-colors ${
                    isConfirmingDelete ? 'bg-red-950/30' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="px-3 py-2 text-slate-100">{product.name}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {product.quantity}{' '}
                    <span className="text-slate-400">
                      {product.quantity_unit ?? 'uds'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {formatDate(product.added_at)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      {actionButtons(product)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div className="flex items-center gap-2 border-t border-slate-700 bg-slate-900/60 px-3 py-3 text-[11px] text-slate-400">
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500"
              aria-hidden
            />
            Actualizando lista de productos…
          </div>
        )}
      </div>
    </div>
  );
}

