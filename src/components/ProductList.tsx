import { useState } from 'react';
import type { Product, ProductInput, ProductCategory } from '@/lib/products';
import ProductForm from '@/components/ProductForm';
import SwipeableProductCard from '@/components/SwipeableProductCard';

export interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onUpdateProduct: (product: Product, input: ProductInput) => Promise<void> | void;
  onDelete: (product: Product) => void;
  onToggleShoppingCart: (product: Product) => void;
  productNotification?: { productId: string; message: string; type: 'success' | 'error' } | null;
  isNotificationExiting?: boolean;
  showShoppingCart?: boolean;
}

const getBadgeColor = (quantity: number) => {
  if (quantity === 0) return 'bg-red-500 text-white';
  if (quantity <= 10) return 'bg-blue-500 text-white';
  return 'bg-green-500 text-white';
};

const getCategoryInfo = (category: ProductCategory) => {
  switch (category) {
    case 'Alimentación':
      return {
        emoji: '🍎',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-400/40',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'
      };
    case 'Limpieza':
      return {
        emoji: '🧹',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-400/40',
        glowColor: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]'
      };
    case 'Mascotas':
      return {
        emoji: '🐾',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-400/40',
        glowColor: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]'
      };
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
  onToggleShoppingCart,
  productNotification,
  isNotificationExiting = false,
  showShoppingCart = false,
}: ProductListProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<Product['id'] | null>(null);
  const [savingProductId, setSavingProductId] = useState<Product['id'] | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [isEditClosing, setIsEditClosing] = useState(false);

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

  const closeEditModal = () => {
    setIsEditClosing(true);
    setTimeout(() => {
      setEditingProductId(null);
      setIsEditClosing(false);
    }, 500); // Duración de la animación con rebote
  };

  const toggleEditForProduct = (product: Product) => {
    if (editingProductId === product.id) {
      closeEditModal();
    } else {
      setEditingProductId(product.id);
      setIsEditClosing(false);
    }
  };

  const handleUpdateProduct = async (product: Product, input: ProductInput) => {
    setSavingProductId(product.id);
    try {
      await onUpdateProduct(product, input);
      closeEditModal();
    } finally {
      setSavingProductId(null);
    }
  };

  if (!loading && products.length === 0) {
    return (
      <div className="min-w-0 rounded-3xl border border-dashed border-white/10 bg-slate-800/30 backdrop-blur-xl p-6 text-center transition-colors shadow-[0_0_20px_rgba(255,255,255,0.08)]">
        <p className="mb-1 font-medium text-slate-200">No quedan productos en tu casa</p>
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
      <div className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                  onAddToCart={() => onToggleShoppingCart(product)}
                  isInCart={product.in_shopping_list}
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-[1.02]' : 'hover:shadow-[0_0_40px_rgba(147,197,253,0.5),0_0_80px_rgba(147,197,253,0.2),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(255,255,255,0.15)] hover:border-sky-400/50 hover:-translate-y-1 hover:scale-[1.02]'
                    }`}
                    style={{
                      boxShadow: isConfirmingDelete 
                        ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 16px rgba(0, 0, 0, 0.4)'
                        : '0 0 25px rgba(147, 197, 253, 0.2), 0 0 50px rgba(147, 197, 253, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Capa de brillo superior */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Contenido de la tarjeta */}
                    <div className="relative z-10 flex items-center gap-2">
                      {/* Icono de categoría */}
                      <div className={`flex-shrink-0 rounded-xl border backdrop-blur-xl p-2 flex items-center justify-center ${getCategoryInfo(product.category).bgColor} ${getCategoryInfo(product.category).borderColor} ${getCategoryInfo(product.category).glowColor}`}>
                        <span className="text-3xl">
                          {getCategoryInfo(product.category).emoji}
                        </span>
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        {/* Nombre */}
                        <h3 className="mb-1 text-sm font-medium text-white line-clamp-2 drop-shadow-sm">
                          {product.name}
                        </h3>

                        {/* Badge de cantidad y fecha */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-lg ${getBadgeColor(product.quantity)}`}
                          >
                            {product.quantity} {product.quantity_unit ?? 'uds'}
                          </span>
                          {product.in_shopping_list && product.shopping_quantity && product.shopping_quantity > 0 && (
                            <span className="inline-flex items-center rounded-full bg-purple-500 text-white px-2 py-0.5 text-[10px] font-semibold shadow-lg">
                              🛒 {product.shopping_quantity} uds
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 drop-shadow-sm">
                            {formatDate(product.added_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwipeableProductCard>

                {/* Panel de confirmación expandible */}
                <div
                  className={`overflow-hidden rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isConfirmingDelete
                      ? 'max-h-[350px] opacity-100 mt-2 scale-100'
                      : 'max-h-0 opacity-0 pointer-events-none scale-95'
                  }`}
                >
                  <div className="rounded-2xl border-2 border-red-500/60 bg-slate-900/60 backdrop-blur-xl p-3 shadow-[0_0_40px_rgba(239,68,68,0.6),0_0_80px_rgba(239,68,68,0.3),inset_0_1px_3px_rgba(255,100,100,0.3)]">
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="rounded-full bg-red-500/20 p-2">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <p className="mb-3 text-base font-bold text-white drop-shadow-lg">
                        ¿Borrar este producto?
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="relative flex items-center justify-center gap-1.5 rounded-lg border border-red-400/40 bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(239,68,68,0.7),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
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
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-slate-800/60 backdrop-blur-xl px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(148,163,184,0.25),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
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

              {/* Versión desktop: con botones visibles */}
              <div className="hidden md:block">
                <div
                  className={`relative overflow-hidden rounded-3xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-3 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isConfirmingDelete ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-[1.02]' : 'hover:shadow-[0_0_40px_rgba(147,197,253,0.5),0_0_80px_rgba(147,197,253,0.2),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(255,255,255,0.15)] hover:border-sky-400/50 hover:-translate-y-1 hover:scale-[1.02]'
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
                  <div className="relative z-10 flex items-center gap-4">
                    {/* Icono de categoría */}
                    <div className={`flex-shrink-0 rounded-2xl border-2 backdrop-blur-xl p-4 flex items-center justify-center ${getCategoryInfo(product.category).bgColor} ${getCategoryInfo(product.category).borderColor} ${getCategoryInfo(product.category).glowColor}`}>
                      <span className="text-6xl">
                        {getCategoryInfo(product.category).emoji}
                      </span>
                    </div>

                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      {/* Fila superior: Nombre y botones */}
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="flex-1 text-lg font-medium text-white line-clamp-2 drop-shadow-sm">
                          {product.name}
                        </h3>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleEditForProduct(product)}
                            className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:border-sky-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] hover:scale-110 active:scale-95"
                          >
                            {isEditing ? 'Cerrar' : 'Editar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(product)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-red-950 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95"
                          >
                            Borrar
                          </button>
                        </div>
                      </div>

                      {/* Fila inferior: Badge de cantidad y fecha */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold shadow-lg ${getBadgeColor(product.quantity)}`}
                        >
                          {product.quantity} {product.quantity_unit ?? 'uds'}
                        </span>
                        {product.in_shopping_list && product.shopping_quantity && product.shopping_quantity > 0 && (
                          <span className="inline-flex items-center rounded-full bg-purple-500 text-white px-3 py-1 text-sm font-semibold shadow-lg">
                            🛒 {product.shopping_quantity} uds
                          </span>
                        )}
                        <span className="text-xs text-slate-400 drop-shadow-sm">
                          {formatDate(product.added_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel de confirmación expandible desktop */}
                <div
                  className={`overflow-hidden rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isConfirmingDelete
                      ? 'max-h-[300px] opacity-100 mt-3 scale-100'
                      : 'max-h-0 opacity-0 pointer-events-none scale-95'
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
                          className="relative flex items-center justify-center gap-1.5 rounded-lg border border-red-400/40 bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:shadow-[0_0_25px_rgba(239,68,68,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95"
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
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-slate-800/60 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.15),inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(148,163,184,0.25),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:scale-110 active:scale-95"
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

              {/* Overlay para cerrar el modal de edición */}
              {isEditing && (
                <div
                  className={`fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-800 ease-in-out ${
                    isEditClosing ? 'opacity-0' : 'opacity-100'
                  }`}
                  onClick={closeEditModal}
                  aria-hidden="true"
                />
              )}

              {/* Formulario de edición expandible */}
              <div
                className={`transition-all duration-500 ${
                  isEditing && !isEditClosing
                    ? 'fixed inset-x-3 top-1/2 -translate-y-1/2 z-[110] max-w-sm mx-auto opacity-100 scale-100 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]'
                    : isEditing && isEditClosing
                    ? 'fixed inset-x-3 top-[calc(100%+2rem)] z-[110] max-w-sm mx-auto opacity-0 scale-95 ease-[cubic-bezier(0.6,-0.28,0.735,0.045)]'
                    : 'max-h-0 opacity-0 pointer-events-none overflow-hidden rounded-3xl translate-y-full scale-90'
                }`}
              >
                <div className="max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-sky-400/30 bg-slate-800/40 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(147,197,253,0.3),0_0_60px_rgba(147,197,253,0.15),inset_0_1px_3px_rgba(255,255,255,0.1)]">
                  <h3 className="mb-3 text-base font-semibold text-slate-100">
                    Editar producto
                  </h3>
                  <ProductForm
                    mode="edit"
                    initialProduct={product}
                    loading={savingProductId === product.id}
                    onSubmit={(input) => handleUpdateProduct(product, input)}
                    onCancel={closeEditModal}
                  />
                </div>
              </div>

              {/* Notificación del producto */}
              {productNotification?.productId === product.id && (
                <div
                  className={`mt-3 rounded-2xl border-2 backdrop-blur-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-500 ease-out ${
                    isNotificationExiting 
                      ? 'opacity-0 scale-95 -translate-y-2' 
                      : 'opacity-100 scale-100 translate-y-0 animate-[slideInUp_0.4s_ease-out]'
                  } ${
                    productNotification.type === 'success'
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : 'border-red-400/60 bg-red-500/20 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {productNotification.type === 'success' ? (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span>{productNotification.message}</span>
                  </div>
                </div>
              )}
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

