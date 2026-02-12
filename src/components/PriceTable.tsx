import { useState } from 'react';
import type { PriceEntry, PriceInput } from '@/lib/priceHunter';
import { calculateNormalizedPrice } from '@/lib/priceHunter';

export interface PriceTableProps {
  prices: PriceEntry[];
  loading?: boolean;
  onEdit: (price: PriceEntry) => void;
  onDelete: (id: string) => void;
  searchTerm?: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no válida';
  }

  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function PriceTable({
  prices,
  loading = false,
  onEdit,
  onDelete,
  searchTerm = '',
}: PriceTableProps) {
  const [priceToDelete, setPriceToDelete] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceEntry | null>(null);

  const handleRowClick = (price: PriceEntry) => {
    setSelectedPrice(price);
  };

  const handleCloseDetail = () => {
    setSelectedPrice(null);
  };

  const handleDeleteClick = (id: string) => {
    setPriceToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (priceToDelete) {
      onDelete(priceToDelete);
      setPriceToDelete(null);
      setSelectedPrice(null);
    }
  };

  const handleCancelDelete = () => {
    setPriceToDelete(null);
  };

  const handleEditClick = (price: PriceEntry) => {
    setSelectedPrice(null);
    onEdit(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500"></div>
          <p className="text-sm text-slate-400">Cargando precios...</p>
        </div>
      </div>
    );
  }

  if (prices.length === 0) {
    const isSearching = searchTerm.trim() !== '';
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-slate-800/40 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
          <span className="text-4xl">{isSearching ? '🔍' : '📊'}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-100">
            {isSearching ? 'No se encontraron resultados' : 'No hay precios registrados'}
          </h3>
          <p className="max-w-md text-sm text-slate-400">
            {isSearching
              ? 'Intenta con otros términos de búsqueda.'
              : 'Comienza añadiendo precios de productos para compararlos entre supermercados.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                Producto
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                Precio
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                Supermercado
              </th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => {
              const normalizedPrice = calculateNormalizedPrice(
                price.total_price,
                price.quantity,
                price.unit
              );
              return (
                <tr
                  key={price.id}
                  onClick={() => handleRowClick(price)}
                  className="border-b border-slate-800 transition-colors hover:bg-slate-800/40 cursor-pointer"
                >
                  <td className="px-3 py-3 text-sm text-slate-100">
                    {price.product_name}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-sky-400 whitespace-nowrap">
                    {formatPrice(normalizedPrice)}/{price.unit}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-300">
                    {price.supermarket}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle */}
      {selectedPrice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCloseDetail}
        >
          <div
            className="mx-4 w-full max-w-md animate-[slideInUp_0.3s_ease-out] rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">
                Detalles del precio
              </h3>
              <button
                onClick={handleCloseDetail}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Producto */}
              <div>
                <p className="text-xs font-medium text-slate-400">Producto</p>
                <p className="mt-1 text-base font-medium text-slate-100">
                  {selectedPrice.product_name}
                </p>
              </div>

              {/* Precio calculado */}
              <div>
                <p className="text-xs font-medium text-slate-400">Precio normalizado</p>
                <p className="mt-1 text-lg font-semibold text-sky-400">
                  {formatPrice(
                    calculateNormalizedPrice(
                      selectedPrice.total_price,
                      selectedPrice.quantity,
                      selectedPrice.unit
                    )
                  )}
                  /{selectedPrice.unit}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Precio pagado */}
                <div>
                  <p className="text-xs font-medium text-slate-400">Precio pagado</p>
                  <p className="mt-1 text-sm text-slate-100">
                    {formatPrice(selectedPrice.total_price)}
                  </p>
                </div>

                {/* Cantidad */}
                <div>
                  <p className="text-xs font-medium text-slate-400">Cantidad</p>
                  <p className="mt-1 text-sm text-slate-100">
                    {selectedPrice.quantity} g/ml
                  </p>
                </div>
              </div>

              {/* Supermercado */}
              <div>
                <p className="text-xs font-medium text-slate-400">Supermercado</p>
                <p className="mt-1 text-sm text-slate-100">{selectedPrice.supermarket}</p>
              </div>

              {/* Fecha */}
              <div>
                <p className="text-xs font-medium text-slate-400">Fecha de compra</p>
                <p className="mt-1 text-sm text-slate-100">{formatDate(selectedPrice.date)}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleEditClick(selectedPrice)}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteClick(selectedPrice.id)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {priceToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCancelDelete}
        >
          <div
            className="mx-4 w-full max-w-md animate-[slideInUp_0.3s_ease-out] rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Confirmar eliminación
                </h3>
                <p className="text-sm text-slate-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-slate-300">
              ¿Estás seguro de que quieres eliminar este registro de precio?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
