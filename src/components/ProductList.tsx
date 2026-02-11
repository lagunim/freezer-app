import { useState } from 'react';
import type { Product, ProductInput } from '@/lib/products';
import ProductForm from '@/components/ProductForm';
import SwipeableProductCard from '@/components/SwipeableProductCard';

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onUpdateProduct: (product: Product, input: ProductInput) => Promise<void> | void;
  onDelete: (product: Product) => void;
}

const getBadgeColor = (quantity: number) => {
  if (quantity === 0) return 'bg-red-500 text-white';
  if (quantity <= 10) return 'bg-blue-500 text-white';
  return 'bg-green-500 text-white';
};

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
  onUpdateProduct,
  onDelete,
}: ProductListProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<Product['id'] | null>(null);
  const [savingProductId, setSavingProductId] = useState<Product['id'] | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

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

  const toggleEditForProduct = (product: Product) => {
    setEditingProductId((current) => (current === product.id ? null : product.id));
  };

  const handleUpdateProduct = async (product: Product, input: ProductInput) => {
    setSavingProductId(product.id);
    try {
      await onUpdateProduct(product, input);
      setEditingProductId(null);
    } finally {
      setSavingProductId(null);
    }
  };

  if (!loading && products.length === 0) {
    return (
      <div className="min-w-0 rounded-3xl border border-dashed border-white/10 bg-slate-800/30 backdrop-blur-xl p-6 text-center transition-colors shadow-[0_0_20px_rgba(255,255,255,0.08)]">
        <p className="mb-1 font-medium text-slate-200">Tu congelador está vacío</p>
        <p className="text-sm text-slate-400">
          Añade tu primer producto con el botón +.
        </p>
      </div>
    );
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-800/60"
              aria-hidden
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500"
            aria-hidden
          />
          Cargando productos…
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const isConfirmingDelete = productToDelete?.id === product.id;
          const isEditing = editingProductId === product.id;

          return (
            <div key={product.id} className="relative">
              {/* Tarjeta del producto - con SwipeableProductCard en móvil */}
              <div className="md:hidden">
                {/* Versión móvil: con swipe */}
                <SwipeableProductCard
                  productId={product.id}
                  openSwipeId={openSwipeId}
                  onOpen={setOpenSwipeId}
                  onClose={() => setOpenSwipeId(null)}
                  onEdit={() => toggleEditForProduct(product)}
                  onDelete={() => handleDeleteClick(product)}
                >
                  <div
                    className={`relative overflow-hidden rounded-3xl border border-white/20 bg-slate-800/40 backdrop-blur-xl p-3 transition-all duration-300 ${
                      isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'hover:shadow-[0_0_35px_rgba(147,197,253,0.3),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:border-white/30 hover:-translate-y-0.5'
                    }`}
                    style={{
                      boxShadow: isConfirmingDelete 
                        ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 16px rgba(0, 0, 0, 0.4)'
                        : '0 0 20px rgba(147, 197, 253, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Capa de brillo superior */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Contenido de la tarjeta */}
                    <div className="relative z-10">
                      {/* Fila superior: Nombre sin botones (botones accesibles mediante swipe) */}
                      <div className="mb-2">
                        <h3 className="text-base font-medium text-white line-clamp-2 drop-shadow-sm">
                          {product.name}
                        </h3>
                      </div>

                      {/* Fila inferior: Badge de cantidad y fecha */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-lg ${getBadgeColor(product.quantity)}`}
                        >
                          {product.quantity} {product.quantity_unit ?? 'uds'}
                        </span>
                        <span className="text-xs text-slate-400 drop-shadow-sm">
                          {formatDate(product.added_at)}
                        </span>
                      </div>
                    </div>

                    {/* Modal de confirmación de borrado */}
                    {isConfirmingDelete && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/90 backdrop-blur-sm">
                        <div className="px-4 text-center">
                          <p className="mb-4 text-base font-medium text-white">
                            ¿Borrar este producto?
                          </p>
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleConfirmDelete}
                              className="rounded-lg bg-red-600 px-5 py-3 text-base font-medium text-white transition hover:bg-red-500"
                            >
                              Sí, borrar
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="rounded-lg border border-slate-600 bg-slate-800 px-5 py-3 text-base font-medium text-slate-100 transition hover:bg-slate-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </SwipeableProductCard>
              </div>

              {/* Versión desktop: con botones visibles */}
              <div className="hidden md:block">
                <div
                  className={`relative overflow-hidden rounded-3xl border border-white/20 bg-slate-800/40 backdrop-blur-xl p-3 transition-all duration-300 ${
                    isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'hover:shadow-[0_0_35px_rgba(147,197,253,0.3),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:border-white/30 hover:-translate-y-0.5'
                  }`}
                  style={{
                    boxShadow: isConfirmingDelete 
                      ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 16px rgba(0, 0, 0, 0.4)'
                      : '0 0 20px rgba(147, 197, 253, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {/* Capa de brillo superior */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Contenido de la tarjeta */}
                  <div className="relative z-10">
                    {/* Fila superior: Nombre y botones */}
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="flex-1 text-lg font-medium text-white line-clamp-2 drop-shadow-sm">
                        {product.name}
                      </h3>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEditForProduct(product)}
                          className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all duration-200 hover:border-sky-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] hover:scale-105"
                        >
                          {isEditing ? 'Cerrar' : 'Editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(product)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all duration-200 hover:bg-red-950 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:scale-105"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>

                    {/* Fila inferior: Badge de cantidad y fecha */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold shadow-lg ${getBadgeColor(product.quantity)}`}
                      >
                        {product.quantity} {product.quantity_unit ?? 'uds'}
                      </span>
                      <span className="text-xs text-slate-400 drop-shadow-sm">
                        {formatDate(product.added_at)}
                      </span>
                    </div>
                  </div>

                  {/* Modal de confirmación de borrado */}
                  {isConfirmingDelete && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/90 backdrop-blur-sm">
                      <div className="px-4 text-center">
                        <p className="mb-3 text-sm font-medium text-white">
                          ¿Borrar este producto?
                        </p>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
                          >
                            Sí, borrar
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulario de edición expandible */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isEditing
                    ? 'max-h-[800px] opacity-100 mt-3'
                    : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="rounded-3xl border border-white/10 bg-slate-800/40 backdrop-blur-xl p-4 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                  <ProductForm
                    mode="edit"
                    initialProduct={product}
                    loading={savingProductId === product.id}
                    onSubmit={(input) => handleUpdateProduct(product, input)}
                    onCancel={() => setEditingProductId(null)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de carga */}
      {loading && products.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500"
            aria-hidden
          />
          Actualizando lista de productos…
        </div>
      )}
    </div>
  );
}

