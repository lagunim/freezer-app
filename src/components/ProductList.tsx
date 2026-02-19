import { useState, memo } from "react";
import type { Product, ProductInput, ProductCategory } from "@/lib/products";
import ProductForm from "@/components/ProductForm";
import SwipeableProductCard from "@/components/SwipeableProductCard";
import { AnimatePresence, motion } from "framer-motion";

export interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onUpdateProduct: (
    product: Product,
    input: ProductInput,
  ) => Promise<void> | void;
  onDelete: (product: Product) => void;
  onToggleShoppingCart: (product: Product) => void;
  showShoppingCart?: boolean;
  selectedProductIds?: Set<string>;
  onToggleSelection?: (productId: string) => void;
  onClearSelection?: () => void;
  onDeleteMultiple?: (productIds: string[]) => void;
}

const EMPTY_SELECTION = new Set<string>();

const getBadgeColor = (quantity: number) => {
  if (quantity === 0) return "bg-red-500 text-white";
  if (quantity <= 10) return "bg-blue-500 text-white";
  return "bg-green-500 text-white";
};

const getCategoryInfo = (category: ProductCategory) => {
  switch (category) {
    case "Alimentación":
      return {
        iconSrc: "/groceries-icon.png",
        bgColor: "bg-emerald-600/20",
        borderColor: "border-emerald-500",
        glowColor: "",
      };
    case "Limpieza":
      return {
        iconSrc: "/cleaning-icon.png",
        bgColor: "bg-cyan-600/20",
        borderColor: "border-cyan-500",
        glowColor: "",
      };
    case "Higiene":
      return {
        iconSrc: "/higiene-icon.png",
        bgColor: "bg-amber-400/20",
        borderColor: "border-amber-500",
        glowColor: "",
      };
  }
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Fecha no válida";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function ProductList({
  products,
  loading = false,
  onUpdateProduct,
  onDelete,
  onToggleShoppingCart,
  showShoppingCart = false,
  selectedProductIds = EMPTY_SELECTION,
  onToggleSelection,
  onClearSelection,
  onDeleteMultiple,
}: ProductListProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<
    Product["id"] | null
  >(null);
  const [savingProductId, setSavingProductId] = useState<Product["id"] | null>(
    null,
  );
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [isDeleteMultipleModalOpen, setIsDeleteMultipleModalOpen] =
    useState(false);

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
    setEditingProductId(null);
  };

  const toggleEditForProduct = (product: Product) => {
    if (editingProductId === product.id) {
      closeEditModal();
    } else {
      setEditingProductId(product.id);
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

  const handleAddSelectedToCart = async () => {
    const selected = products.filter((p) => selectedProductIds.has(p.id));
    if (selected.length === 0) {
      onClearSelection?.();
      return;
    }

    const allInCart = selected.every((p) => p.in_shopping_list);

    // Si todos están en la cesta: quitar de la cesta.
    // Si hay alguno fuera: añadir solo los que no estén en la cesta.
    const targets = allInCart
      ? selected.filter((p) => p.in_shopping_list)
      : selected.filter((p) => !p.in_shopping_list);

    if (targets.length === 0) {
      onClearSelection?.();
      return;
    }

    await Promise.all(
      targets.map((product) => Promise.resolve(onToggleShoppingCart(product))),
    );

    onClearSelection?.();
  };

  if (!loading && products.length === 0) {
    return (
      <div className="min-w-0 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center shadow-sm">
        <p className="mb-1 font-medium text-slate-100">
          No quedan productos en tu casa
        </p>
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
              className="h-32 animate-pulse rounded-2xl bg-slate-800"
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

  const selectedProductsArray = products.filter((p) =>
    selectedProductIds.has(p.id),
  );
  const allSelectedInCart =
    selectedProductsArray.length > 0 &&
    selectedProductsArray.every((p) => p.in_shopping_list);

  return (
    <div className="min-w-0">
      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const isConfirmingDelete = productToDelete?.id === product.id;
          const isEditing = editingProductId === product.id;

          return (
            <AnimatePresence>
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
                      className={`relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-2 ${
                        isConfirmingDelete
                          ? "ring-1 ring-red-500 shadow-md scale-[1.01]"
                          : "shadow-sm"
                      }`}
                      style={{
                        contentVisibility: "auto",
                        containIntrinsicSize: "160px",
                      }}
                    >
                      {/* Contenido de la tarjeta */}
                      <div className="relative z-10 flex items-center gap-2">
                        {/* Icono de categoría */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelection?.(product.id);
                          }}
                          className={`flex-shrink-0 rounded-xl border p-0 flex items-center justify-center cursor-pointer transition-colors duration-200 w-[52px] h-[52px] overflow-hidden ${
                            selectedProductIds.has(product.id)
                              ? "bg-sky-600 border-sky-400 text-white"
                              : `${getCategoryInfo(product.category).bgColor} ${getCategoryInfo(product.category).borderColor} hover:border-sky-400`
                          }`}
                        >
                          {selectedProductIds.has(product.id) ? (
                            <span className="text-2xl font-bold leading-none">
                              ✓
                            </span>
                          ) : (
                            <img
                              src={getCategoryInfo(product.category).iconSrc}
                              alt=""
                              className="min-w-0 min-h-0 w-full h-full object-contain"
                            />
                          )}
                        </button>

                        {/* Información del producto */}
                        <motion.div
                          layoutId={`product-${product.id}`}
                          className="flex-1 min-w-0"
                        >
                          {/* Nombre */}
                          <h3 className="mb-1 text-sm font-medium text-white line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Badge de cantidad y fecha */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-lg ${getBadgeColor(product.quantity)}`}
                            >
                              {product.quantity}{" "}
                              {product.quantity_unit ?? "uds"}
                            </span>
                            {product.in_shopping_list && (
                              <span className="inline-flex items-center rounded-full bg-purple-500 text-white px-2 py-0.5 text-[10px] font-semibold shadow-lg">
                                En la cesta
                              </span>
                            )}
                            <span className="text-[10px] text-slate-300">
                              {formatDate(product.added_at)}
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </SwipeableProductCard>

                  {/* Panel de confirmación expandible */}
                  <div
                    className={`overflow-hidden rounded-2xl transition-all duration-300 ${
                      isConfirmingDelete
                        ? "max-h-[350px] opacity-100 mt-2"
                        : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="rounded-2xl border border-red-500 bg-slate-900 p-3 shadow-md">
                      <div className="text-center">
                        <div className="mb-3 flex justify-center">
                          <div className="rounded-full bg-red-500/20 p-2">
                            <svg
                              className="w-6 h-6 text-red-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="mb-3 text-base font-bold text-white">
                          ¿Borrar este producto?
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="relative flex items-center justify-center gap-1.5 rounded-lg border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-red-500"
                          >
                            <svg
                              className="w-4 h-4 relative z-10"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span className="relative z-10">Sí, borrar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm transition-colors duration-200 hover:bg-slate-700"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
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
                    className={`relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-3 transition-transform duration-200 ${
                      isConfirmingDelete
                        ? "ring-1 ring-red-500 shadow-md scale-[1.01]"
                        : "shadow-sm hover:shadow-md hover:border-sky-500 hover:-translate-y-0.5"
                    }`}
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "180px",
                    }}
                  >
                    {/* Contenido de la tarjeta */}
                    <div className="relative z-10 flex items-center gap-4">
                      {/* Icono de categoría */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelection?.(product.id);
                        }}
                        className={`flex-shrink-0 rounded-2xl border-2 p-0 flex items-center justify-center cursor-pointer transition-colors duration-200 w-[104px] h-[104px] overflow-hidden ${
                          selectedProductIds.has(product.id)
                            ? "bg-sky-600 border-sky-400 text-white"
                            : `${getCategoryInfo(product.category).bgColor} ${getCategoryInfo(product.category).borderColor} hover:border-sky-400`
                        }`}
                      >
                        {selectedProductIds.has(product.id) ? (
                          <span className="text-4xl font-bold leading-none">
                            ✓
                          </span>
                        ) : (
                          <img
                            src={getCategoryInfo(product.category).iconSrc}
                            alt=""
                            className="min-w-0 min-h-0 w-full h-full object-contain"
                          />
                        )}
                      </button>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        {/* Fila superior: Nombre y botones */}
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="flex-1 text-lg font-medium text-white line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleEditForProduct(product)}
                              className="inline-flex items-center justify-center rounded-lg border border-sky-500 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-sm transition-colors duration-200 hover:bg-slate-700"
                            >
                              {isEditing ? "Cerrar" : "Editar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(product)}
                              className="inline-flex items-center justify-center rounded-lg border border-red-500 bg-red-700 px-3 py-1.5 text-xs font-medium text-red-50 shadow-sm transition-colors duration-200 hover:bg-red-600"
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
                            {product.quantity} {product.quantity_unit ?? "uds"}
                          </span>
                          {product.in_shopping_list && (
                            <span className="inline-flex items-center rounded-full bg-purple-500 text-white px-3 py-1 text-sm font-semibold shadow-lg">
                              En la cesta
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {formatDate(product.added_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel de confirmación expandible desktop */}
                  <div
                    className={`overflow-hidden rounded-3xl transition-all duration-300 ${
                      isConfirmingDelete
                        ? "max-h-[300px] opacity-100 mt-3"
                        : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="rounded-3xl border border-red-500 bg-slate-900 p-4 shadow-md">
                      <div className="text-center">
                        <div className="mb-3 flex justify-center">
                          <div className="rounded-full bg-red-500/20 p-2">
                            <svg
                              className="w-6 h-6 text-red-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
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
                            className="relative flex items-center justify-center gap-1.5 rounded-lg border border-red-500 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-red-500"
                          >
                            <svg
                              className="w-4 h-4 relative z-10"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span className="relative z-10">Sí, borrar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow-sm transition-colors duration-200 hover:bg-slate-700"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal de edición */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-edit-product-title"
                    onClick={closeEditModal}
                  >
                    <motion.div
                      layoutId={`product-${product.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, type: "spring" }}
                      className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.div>
                        <h3
                          id="modal-edit-product-title"
                          className="mb-3 text-base font-semibold text-slate-100"
                        >
                          Editar producto
                        </h3>
                        <ProductForm
                          mode="edit"
                          initialProduct={product}
                          loading={savingProductId === product.id}
                          onSubmit={(input) =>
                            handleUpdateProduct(product, input)
                          }
                          onCancel={closeEditModal}
                        />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}

              </div>
            </AnimatePresence>
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

      {/* Botones flotantes de selección múltiple */}
      <AnimatePresence>
        {selectedProductIds.size > 0 &&
          onClearSelection &&
          onDeleteMultiple && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              transition={{
                duration: 0.5,
                type: "spring",
              }}
              className="fixed bottom-24 left-1/2 z-30 sm:bottom-10 md:bottom-8"
            >
              <div className="flex items-center gap-12 rounded-full border border-slate-700 bg-slate-900/95 px-2 py-2 shadow-md">
                {/* Botón Cancelar */}
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-white shadow-sm transition-colors duration-200 hover:bg-slate-700 sm:h-14 sm:w-14"
                  aria-label="Cancelar selección"
                >
                  <svg
                    className="w-5 h-5 relative z-10 drop-shadow-lg sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Botón Añadir a la cesta */}
                <button
                  type="button"
                  onClick={() => void handleAddSelectedToCart()}
                  className={`relative flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white shadow-sm transition-colors duration-200 sm:h-14 sm:w-14 ${
                    allSelectedInCart
                      ? "border border-amber-500 bg-amber-600 hover:bg-amber-500"
                      : "border border-emerald-500 bg-emerald-600 hover:bg-emerald-500"
                  }`}
                  aria-label={
                    allSelectedInCart
                      ? "Quitar productos seleccionados de la cesta"
                      : "Añadir productos seleccionados a la cesta"
                  }
                >
                  <svg
                    className="w-5 h-5 relative z-10 drop-shadow-lg sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {allSelectedInCart ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    )}
                  </svg>
                  {/* Badge con cantidad */}
                  <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/90 border border-emerald-400/60 text-[10px] font-bold text-white shadow-lg sm:h-6 sm:w-6 sm:text-xs">
                    {selectedProductIds.size}
                  </div>
                </button>

                {/* Botón Borrar */}
                <button
                  type="button"
                  onClick={() => setIsDeleteMultipleModalOpen(true)}
                  className="relative flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-red-500 bg-red-600 text-white shadow-sm transition-colors duration-200 hover:bg-red-500 sm:h-14 sm:w-14"
                  aria-label="Borrar productos seleccionados"
                >
                  <svg
                    className="w-5 h-5 relative z-10 drop-shadow-lg sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  {/* Badge con cantidad */}
                  <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-900/90 border border-red-400/60 text-[10px] font-bold text-white shadow-lg sm:h-6 sm:w-6 sm:text-xs">
                    {selectedProductIds.size}
                  </div>
                </button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Modal de confirmación de borrado múltiple */}
      {isDeleteMultipleModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsDeleteMultipleModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-red-500 bg-slate-900/95 p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-500/20 p-3">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mb-2 text-xl font-bold text-white">
                ¿Borrar {selectedProductIds.size} producto
                {selectedProductIds.size > 1 ? "s" : ""}?
              </p>
              <p className="mb-6 text-sm text-slate-300">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMultiple?.(Array.from(selectedProductIds));
                    setIsDeleteMultipleModalOpen(false);
                  }}
                  className="relative flex items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-red-500"
                >
                  <svg
                    className="w-5 h-5 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="relative z-10">Sí, borrar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteMultipleModalOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base font-semibold text-slate-200 shadow-sm transition-colors duration-200 hover:bg-slate-700"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProductList);
