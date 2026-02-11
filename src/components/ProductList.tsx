import { useState } from 'react';
import type { Product, ProductInput, ProductCategory } from '@/lib/products';
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

const getCategoryInfo = (category: ProductCategory) => {
  switch (category) {
    case 'Alimentación':
      return { emoji: '🍎', color: 'bg-emerald-500/90 text-white border-emerald-400/40' };
    case 'Limpieza':
      return { emoji: '🧹', color: 'bg-cyan-500/90 text-white border-cyan-400/40' };
    case 'Mascotas':
      return { emoji: '🐾', color: 'bg-amber-500/90 text-white border-amber-400/40' };
  }
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
    // Cerrar cualquier tarjeta deslizada cuando se abre el modal
    setOpenSwipeId(null);
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
                    className={`relative overflow-hidden rounded-3xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-3 transition-all duration-300 ${
                      isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'hover:shadow-[0_0_40px_rgba(147,197,253,0.5),0_0_80px_rgba(147,197,253,0.2),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(255,255,255,0.15)] hover:border-sky-400/50 hover:-translate-y-0.5'
                    }`}
                    style={{
                      boxShadow: isConfirmingDelete 
                        ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 16px rgba(0, 0, 0, 0.4)'
                        : '0 0 25px rgba(147, 197, 253, 0.2), 0 0 50px rgba(147, 197, 253, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Capa de brillo superior */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Contenido de la tarjeta */}
                    <div className="relative z-10">
                      {/* Fila superior: Nombre y categoría */}
                      <div className="mb-2 flex items-start gap-2">
                        <h3 className="flex-1 text-base font-medium text-white line-clamp-2 drop-shadow-sm">
                          {product.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold shadow-lg ${getCategoryInfo(product.category).color}`}
                        >
                          <span>{getCategoryInfo(product.category).emoji}</span>
                          <span className="hidden sm:inline">{product.category}</span>
                        </span>
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
                  </div>
                </SwipeableProductCard>

                {/* Panel de confirmación expandible */}
                <div
                  className={`overflow-hidden rounded-3xl transition-all duration-300 ease-out ${
                    isConfirmingDelete
                      ? 'max-h-[400px] opacity-100 mt-3'
                      : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="rounded-3xl border-2 border-red-500/60 bg-slate-900/60 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(239,68,68,0.6),0_0_80px_rgba(239,68,68,0.3),inset_0_1px_3px_rgba(255,100,100,0.3)]">
                    <div className="text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-red-500/20 p-3">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <p className="mb-5 text-lg font-bold text-white drop-shadow-lg">
                        ¿Borrar este producto?
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="relative flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-6 py-3.5 text-base font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-200 hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(239,68,68,0.7),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95"
                        >
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                          <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="relative z-10">Sí, borrar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-800/60 backdrop-blur-xl px-6 py-3.5 text-base font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(148,163,184,0.25),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Versión desktop: con botones visibles */}
              <div className="hidden md:block">
                <div
                  className={`relative overflow-hidden rounded-3xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-3 transition-all duration-300 ${
                    isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'hover:shadow-[0_0_40px_rgba(147,197,253,0.5),0_0_80px_rgba(147,197,253,0.2),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(255,255,255,0.15)] hover:border-sky-400/50 hover:-translate-y-0.5'
                  }`}
                  style={{
                    boxShadow: isConfirmingDelete 
                      ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 16px rgba(0, 0, 0, 0.4)'
                      : '0 0 25px rgba(147, 197, 253, 0.2), 0 0 50px rgba(147, 197, 253, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {/* Capa de brillo superior */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Contenido de la tarjeta */}
                  <div className="relative z-10">
                    {/* Fila superior: Nombre y botones */}
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex-1 flex items-start gap-2">
                        <h3 className="flex-1 text-lg font-medium text-white line-clamp-2 drop-shadow-sm">
                          {product.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-lg ${getCategoryInfo(product.category).color}`}
                        >
                          <span>{getCategoryInfo(product.category).emoji}</span>
                          <span>{product.category}</span>
                        </span>
                      </div>
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
                </div>

                {/* Panel de confirmación expandible desktop */}
                <div
                  className={`overflow-hidden rounded-3xl transition-all duration-300 ease-out ${
                    isConfirmingDelete
                      ? 'max-h-[300px] opacity-100 mt-3'
                      : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="rounded-3xl border-2 border-red-500/60 bg-slate-900/60 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(239,68,68,0.6),0_0_80px_rgba(239,68,68,0.3),inset_0_1px_3px_rgba(255,100,100,0.3)]">
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="rounded-full bg-red-500/20 p-2">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <p className="mb-4 text-base font-bold text-white drop-shadow-lg">
                        ¿Borrar este producto?
                      </p>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="relative flex items-center justify-center gap-1.5 rounded-lg border border-red-400/40 bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-200 hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:shadow-[0_0_25px_rgba(239,68,68,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                        >
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                          <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="relative z-10">Sí, borrar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-slate-800/60 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-200 hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(148,163,184,0.25),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario de edición expandible */}
              <div
                className={`overflow-hidden rounded-3xl transition-all duration-300 ease-out ${
                  isEditing
                    ? 'max-h-[800px] opacity-100 mt-3'
                    : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="rounded-3xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(147,197,253,0.3),0_0_60px_rgba(147,197,253,0.15),inset_0_1px_3px_rgba(255,255,255,0.1)]">
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

