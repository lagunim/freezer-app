import { useEffect, useMemo, useState, memo } from "react";
import type { PriceEntry, PriceInput } from "@/lib/priceHunter";
import {
  calculateNormalizedPrice,
  fetchPricesByProduct,
  fetchPricesBySupermarket,
} from "@/lib/priceHunter";
import { motion, AnimatePresence } from "framer-motion";

export interface PriceTableProps {
  prices: PriceEntry[];
  loading?: boolean;
  onEdit: (price: PriceEntry) => void;
  onDelete: (id: string) => void;
  searchTerm?: string;
}

export default memo(PriceTable);

type SortField = "product_name" | "price" | "date";
type SortDirection = "asc" | "desc";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Fecha no válida";
  }

  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function PriceTable({
  prices,
  loading = false,
  onEdit,
  onDelete,
  searchTerm = "",
}: PriceTableProps) {
  const [priceToDelete, setPriceToDelete] = useState<string | null>(null);
  const [detailPrice, setDetailPrice] = useState<PriceEntry | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Estados para la vista de historial
  const [historyView, setHistoryView] = useState<{
    type: "product" | "supermarket";
    value: string;
  } | null>(null);
  const [historyPrices, setHistoryPrices] = useState<PriceEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"6months" | "1year" | "all">(
    "6months",
  );
  const [priceBeforeHistory, setPriceBeforeHistory] =
    useState<PriceEntry | null>(null);
  const [supermarketHistorySearchTerm, setSupermarketHistorySearchTerm] =
    useState("");

  // Sincronizar detailPrice cuando se actualiza un precio en el array prices
  useEffect(() => {
    if (detailPrice) {
      const updatedPrice = prices.find((p) => p.id === detailPrice.id);
      if (updatedPrice) {
        setDetailPrice(updatedPrice);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  const handleRowClick = (price: PriceEntry) => {
    setDetailPrice(price);
  };

  const handleCloseDetail = () => {
    setDetailPrice(null);
  };

  const handleHistoryRowClick = (price: PriceEntry) => {
    setDetailPrice(price);
    setHistoryView(null);
    setHistoryPrices([]);
    setHistoryError(null);
    setSupermarketHistorySearchTerm("");
  };

  const handleDeleteClick = (id: string) => {
    setPriceToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (priceToDelete) {
      onDelete(priceToDelete);
      setPriceToDelete(null);
      setDetailPrice(null);
    }
  };

  const handleCancelDelete = () => {
    setPriceToDelete(null);
  };

  const handleEditClick = (price: PriceEntry) => {
    onEdit(price);
  };

  const handleViewProductHistory = async (
    productName: string,
    priceFromDetail?: PriceEntry | null,
  ) => {
    setPriceBeforeHistory(priceFromDetail ?? null);
    setDetailPrice(null);
    setLoadingHistory(true);
    setHistoryError(null);
    setHistoryView({ type: "product", value: productName });

    try {
      const data = await fetchPricesByProduct(productName);
      setHistoryPrices(data);
    } catch (error) {
      console.error("Error al cargar historial de producto:", error);
      setHistoryError("No se pudo cargar el historial del producto");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewSupermarketHistory = async (
    supermarket: string,
    priceFromDetail?: PriceEntry | null,
  ) => {
    setPriceBeforeHistory(priceFromDetail ?? null);
    setDetailPrice(null);
    setSupermarketHistorySearchTerm("");
    setLoadingHistory(true);
    setHistoryError(null);
    setHistoryView({ type: "supermarket", value: supermarket });

    try {
      const data = await fetchPricesBySupermarket(supermarket);
      setHistoryPrices(data);
    } catch (error) {
      console.error("Error al cargar historial de supermercado:", error);
      setHistoryError("No se pudo cargar el historial del supermercado");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setHistoryView(null);
    setHistoryPrices([]);
    setHistoryError(null);
    setSupermarketHistorySearchTerm("");
  };

  const handleBackToDetails = () => {
    if (priceBeforeHistory) setDetailPrice(priceBeforeHistory);
    setPriceBeforeHistory(null);
    setHistoryView(null);
    setHistoryPrices([]);
    setHistoryError(null);
    setSupermarketHistorySearchTerm("");
  };

  // Filtrar precios según el rango temporal seleccionado
  const filteredHistoryPrices = useMemo(() => {
    if (timeFilter === "all") {
      return historyPrices;
    }

    const now = new Date();
    const filterDate = new Date();

    if (timeFilter === "6months") {
      filterDate.setMonth(now.getMonth() - 6);
    } else if (timeFilter === "1year") {
      filterDate.setFullYear(now.getFullYear() - 1);
    }

    return historyPrices.filter((price) => {
      const priceDate = new Date(price.date);
      return priceDate >= filterDate;
    });
  }, [historyPrices, timeFilter]);

  // En historial de supermercado, filtrar por nombre de producto según la búsqueda
  const historyTablePrices = useMemo(() => {
    if (historyView?.type !== "supermarket") {
      return filteredHistoryPrices;
    }
    const term = supermarketHistorySearchTerm.trim().toLowerCase();
    if (!term) return filteredHistoryPrices;
    return filteredHistoryPrices.filter((p) =>
      p.product_name.toLowerCase().includes(term),
    );
  }, [historyView?.type, filteredHistoryPrices, supermarketHistorySearchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si ya está ordenado por este campo, invertir la dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo nuevo, ordenar ascendente por defecto (excepto fecha que es descendente)
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  // Por cada producto (mismo nombre), mostrar solo el precio más bajo del último año;
  // si no hay precios en el último año, el precio histórico más bajo.
  const pricesToShow = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );

    const byProduct = new Map<string, PriceEntry[]>();
    for (const p of prices) {
      const list = byProduct.get(p.product_name) ?? [];
      list.push(p);
      byProduct.set(p.product_name, list);
    }

    const result: PriceEntry[] = [];
    for (const [, entries] of byProduct) {
      const inLastYear = entries.filter((e) => new Date(e.date) >= oneYearAgo);
      const pool = inLastYear.length > 0 ? inLastYear : entries;
      const best = pool.reduce((min, curr) => {
        const currNorm = calculateNormalizedPrice(
          curr.total_price,
          curr.quantity,
          curr.unit,
        );
        const minNorm = calculateNormalizedPrice(
          min.total_price,
          min.quantity,
          min.unit,
        );
        return currNorm < minNorm ? curr : min;
      }, pool[0]);
      result.push(best);
    }
    return result;
  }, [prices]);

  const sortedPrices = useMemo(() => {
    return pricesToShow.toSorted((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "product_name":
          aValue = a.product_name.toLowerCase();
          bValue = b.product_name.toLowerCase();
          break;
        case "price":
          aValue = calculateNormalizedPrice(a.total_price, a.quantity, a.unit);
          bValue = calculateNormalizedPrice(b.total_price, b.quantity, b.unit);
          break;
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [pricesToShow, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="ml-1 inline h-4 w-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="ml-1 inline h-4 w-4 text-sky-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg
        className="ml-1 inline h-4 w-4 text-sky-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
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
    const isSearching = searchTerm.trim() !== "";
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-slate-800/40 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
          <span className="text-4xl">{isSearching ? "🔍" : "📊"}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-100">
            {isSearching
              ? "No se encontraron resultados"
              : "No hay precios registrados"}
          </h3>
          <p className="max-w-md text-sm text-slate-400">
            {isSearching
              ? "Intenta con otros términos de búsqueda."
              : "Comienza añadiendo precios de productos para compararlos entre supermercados."}
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
              <th
                className="px-2 py-2 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-slate-100 transition-colors select-none"
                onClick={() => handleSort("product_name")}
              >
                Producto
                <SortIcon field="product_name" />
              </th>
              <th
                className="px-2 py-2 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-slate-100 transition-colors select-none"
                onClick={() => handleSort("price")}
              >
                Precio
                <SortIcon field="price" />
              </th>
              <th
                className="px-2 py-2 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-slate-100 transition-colors select-none"
                onClick={() => handleSort("date")}
              >
                Fecha
                <SortIcon field="date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPrices.map((price) => {
              const normalizedPrice = calculateNormalizedPrice(
                price.total_price,
                price.quantity,
                price.unit,
              );
              return (
                <AnimatePresence>
                  <motion.tr
                    layoutId={`price-product-${price.product_name}`}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    // viewport={{ once: true, margin: "-50px" }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      duration: 0.2,
                    }}
                    key={price.id}
                    onClick={() => handleRowClick(price)}
                    className="border-b border-slate-800 transition-colors hover:bg-slate-800/40 cursor-pointer"
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "44px",
                    }}
                  >
                    <td className="px-2 py-2 text-sm text-slate-100">
                      {price.product_name}
                    </td>
                    <td className="px-2 py-2 text-sm font-medium text-sky-400 whitespace-nowrap">
                      {formatPrice(normalizedPrice)}/{price.unit}
                    </td>
                    <td className="px-2 py-2 text-sm text-slate-400 whitespace-nowrap">
                      {formatDate(price.date)}
                    </td>
                  </motion.tr>
                </AnimatePresence>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {detailPrice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleCloseDetail}
          >
            <motion.div
              layoutId={`price-product-${detailPrice.product_name}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="mx-4 w-full max-w-md  rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
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
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Producto - Tarjeta clicable mejorada */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProductHistory(
                      detailPrice.product_name,
                      detailPrice,
                    );
                  }}
                  className="w-full text-left rounded-lg border border-slate-700 bg-gradient-to-r from-slate-800/40 to-slate-800/20 p-4 transition-all hover:border-sky-500/50 hover:bg-gradient-to-r hover:from-sky-900/20 hover:to-slate-800/40 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">📦</span>
                        <p className="text-xs font-medium text-slate-400">
                          Producto
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                        {detailPrice.product_name}
                      </p>
                      <p className="text-xs text-sky-400/60 group-hover:text-sky-400 mt-1 transition-colors">
                        Ver historial completo →
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 transition-all group-hover:bg-sky-500/20 group-hover:scale-110">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Marca */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Marca
                  </p>
                  <p className="text-base font-semibold text-slate-100">
                    {detailPrice.brand && detailPrice.brand.trim() !== ""
                      ? detailPrice.brand
                      : "—"}
                  </p>
                </div>

                {/* Precio calculado */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-4">
                  <p className="text-xs font-medium text-slate-400 mb-2">
                    Precio normalizado
                  </p>
                  <p className="text-2xl font-bold text-sky-400">
                    {formatPrice(
                      calculateNormalizedPrice(
                        detailPrice.total_price,
                        detailPrice.quantity,
                        detailPrice.unit,
                      ),
                    )}
                    <span className="text-base font-normal text-slate-400 ml-1">
                      /{detailPrice.unit}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Precio pagado */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Precio pagado
                    </p>
                    <p className="text-base font-semibold text-slate-100">
                      {formatPrice(detailPrice.total_price)}
                    </p>
                  </div>

                  {/* Cantidad */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Cantidad
                    </p>
                    <p className="text-base font-semibold text-slate-100">
                      {detailPrice.quantity} g/ml
                    </p>
                  </div>
                </div>

                {/* Supermercado - Tarjeta clicable mejorada */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewSupermarketHistory(
                      detailPrice.supermarket,
                      detailPrice,
                    );
                  }}
                  className="w-full text-left rounded-lg border border-slate-700 bg-gradient-to-r from-slate-800/40 to-slate-800/20 p-4 transition-all hover:border-sky-500/50 hover:bg-gradient-to-r hover:from-sky-900/20 hover:to-slate-800/40 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🏪</span>
                        <p className="text-xs font-medium text-slate-400">
                          Supermercado
                        </p>
                      </div>
                      <p className="text-base font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                        {detailPrice.supermarket}
                      </p>
                      <p className="text-xs text-sky-400/60 group-hover:text-sky-400 mt-1 transition-colors">
                        Ver todos los productos →
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 transition-all group-hover:bg-sky-500/20 group-hover:scale-110">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Fecha */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Fecha de compra
                  </p>
                  <p className="text-base font-semibold text-slate-100">
                    {formatDate(detailPrice.date)}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleEditClick(detailPrice)}
                  className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(detailPrice.id)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de historial */}
      <AnimatePresence>
        {historyView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleCloseHistory}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con breadcrumb */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBackToDetails}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                    aria-label="Volver a detalles"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <button
                      type="button"
                      onClick={handleBackToDetails}
                      className="text-slate-400 transition-colors hover:text-slate-100 focus:outline-none focus:underline"
                    >
                      Detalles
                    </button>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-slate-100 font-medium">
                      Historial de{" "}
                      {historyView.type === "product"
                        ? "Producto"
                        : "Supermercado"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleBackToDetails}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Cerrar y volver a detalles"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Título */}
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-slate-100">
                  {historyView.type === "product" ? "📦 " : "🏪 "}
                  {historyView.value}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {historyView.type === "product"
                    ? "Todos los precios registrados de este producto"
                    : "Todos los productos registrados en este supermercado"}
                </p>
              </div>

              {/* Barra de búsqueda (solo para historial de supermercado) */}
              {historyView.type === "supermarket" && (
                <div className="mb-6">
                  <label
                    htmlFor="supermarket-history-search"
                    className="sr-only"
                  >
                    Buscar por producto
                  </label>
                  <div className="relative">
                    <div
                      className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      id="supermarket-history-search"
                      type="text"
                      value={supermarketHistorySearchTerm}
                      onChange={(e) =>
                        setSupermarketHistorySearchTerm(e.target.value)
                      }
                      placeholder="Buscar por producto…"
                      className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Filtros temporales (solo para vista de producto) */}
              {historyView.type === "product" && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTimeFilter("6months")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      timeFilter === "6months"
                        ? "bg-sky-600 text-white shadow-lg shadow-sky-500/30"
                        : "border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>6 meses</span>
                  </button>
                  <button
                    onClick={() => setTimeFilter("1year")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      timeFilter === "1year"
                        ? "bg-sky-600 text-white shadow-lg shadow-sky-500/30"
                        : "border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>1 año</span>
                  </button>
                  <button
                    onClick={() => setTimeFilter("all")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      timeFilter === "all"
                        ? "bg-sky-600 text-white shadow-lg shadow-sky-500/30"
                        : "border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Histórico</span>
                  </button>
                </div>
              )}

              {/* Estados de carga y error */}
              {loadingHistory && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500"></div>
                    <p className="text-sm text-slate-400">
                      Cargando historial...
                    </p>
                  </div>
                </div>
              )}

              {historyError && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm text-red-300">{historyError}</p>
                  </div>
                </div>
              )}

              {/* Estadísticas (solo para historial de producto) */}
              {!loadingHistory &&
                !historyError &&
                filteredHistoryPrices.length > 0 &&
                historyView.type === "product" && (
                  <div className="mb-5 space-y-2.5">
                    {(() => {
                      const normalizedPrices = filteredHistoryPrices.map((p) =>
                        calculateNormalizedPrice(
                          p.total_price,
                          p.quantity,
                          p.unit,
                        ),
                      );
                      const minPrice = Math.min(...normalizedPrices);
                      const maxPrice = Math.max(...normalizedPrices);
                      const avgPrice =
                        normalizedPrices.reduce((a, b) => a + b, 0) /
                        normalizedPrices.length;
                      const minPriceIndex = normalizedPrices.indexOf(minPrice);
                      const maxPriceIndex = normalizedPrices.indexOf(maxPrice);
                      const minPriceEntry =
                        filteredHistoryPrices[minPriceIndex];
                      const maxPriceEntry =
                        filteredHistoryPrices[maxPriceIndex];
                      return (
                        <>
                          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-800/35 backdrop-blur-sm">
                            <div className="px-2 py-2.5 text-center sm:px-3">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                Mín
                              </p>
                              <p className="mt-0.5 text-base font-semibold leading-none text-green-400 sm:text-lg">
                                {formatPrice(minPrice)}
                              </p>
                            </div>
                            <div className="border-x border-slate-700/90 px-2 py-2.5 text-center sm:px-3">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                Media
                              </p>
                              <p className="mt-0.5 text-base font-semibold leading-none text-sky-400 sm:text-lg">
                                {formatPrice(avgPrice)}
                              </p>
                            </div>
                            <div className="px-2 py-2.5 text-center sm:px-3">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                Máx
                              </p>
                              <p className="mt-0.5 text-base font-semibold leading-none text-red-400 sm:text-lg">
                                {formatPrice(maxPrice)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-400 sm:grid-cols-2">
                            <div className="truncate rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5">
                              <span className="font-medium text-green-300">
                                Mejor:
                              </span>{" "}
                              <span className="text-slate-300">
                                {minPriceEntry.supermarket}
                              </span>{" "}
                              <span className="text-slate-500">
                                · {formatDate(minPriceEntry.date)}
                              </span>
                            </div>
                            <div className="truncate rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5">
                              <span className="font-medium text-red-300">
                                Peor:
                              </span>{" "}
                              <span className="text-slate-300">
                                {maxPriceEntry.supermarket}
                              </span>{" "}
                              <span className="text-slate-500">
                                · {formatDate(maxPriceEntry.date)}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

              {/* Tabla de historial */}
              {!loadingHistory &&
                !historyError &&
                filteredHistoryPrices.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-700">
                            {historyView.type === "supermarket" && (
                              <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                                Producto
                              </th>
                            )}
                            {historyView.type === "product" && (
                              <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                                Supermercado
                              </th>
                            )}
                            <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                              Precio Normalizado
                            </th>
                            <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                              Precio Total
                            </th>
                            <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                              Cantidad
                            </th>
                            <th className="px-2 py-2 text-left text-sm font-semibold text-slate-300">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyTablePrices.map((price) => {
                            const normalizedPrice = calculateNormalizedPrice(
                              price.total_price,
                              price.quantity,
                              price.unit,
                            );
                            return (
                              <tr
                                key={price.id}
                                onClick={() => handleHistoryRowClick(price)}
                                className="border-b border-slate-800 transition-colors hover:bg-slate-800/40 cursor-pointer"
                              >
                                {historyView.type === "supermarket" && (
                                  <td className="px-2 py-3 text-sm text-slate-100">
                                    {price.product_name}
                                  </td>
                                )}
                                {historyView.type === "product" && (
                                  <td className="px-2 py-3 text-sm text-slate-100">
                                    {price.supermarket}
                                  </td>
                                )}
                                <td className="px-2 py-3 text-sm font-medium text-sky-400 whitespace-nowrap">
                                  {formatPrice(normalizedPrice)}/{price.unit}
                                </td>
                                <td className="px-2 py-3 text-sm text-slate-300 whitespace-nowrap">
                                  {formatPrice(price.total_price)}
                                </td>
                                <td className="px-2 py-3 text-sm text-slate-300 whitespace-nowrap">
                                  {price.quantity} g/ml
                                </td>
                                <td className="px-2 py-3 text-sm text-slate-400 whitespace-nowrap">
                                  {formatDate(price.date)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Información adicional */}
                    <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/20 p-4">
                      <p className="text-sm text-slate-400">
                        <span className="font-medium text-slate-300">
                          {historyTablePrices.length}
                        </span>{" "}
                        {historyTablePrices.length === 1
                          ? "registro encontrado"
                          : "registros encontrados"}
                        {historyView.type === "product" &&
                          timeFilter !== "all" && (
                            <span className="ml-2 text-slate-500">
                              (de {historyPrices.length}{" "}
                              {historyPrices.length === 1 ? "total" : "totales"}
                              )
                            </span>
                          )}
                        {historyView.type === "supermarket" &&
                          supermarketHistorySearchTerm.trim() !== "" && (
                            <span className="ml-2 text-slate-500">
                              (de {filteredHistoryPrices.length}{" "}
                              {filteredHistoryPrices.length === 1
                                ? "total"
                                : "totales"}
                              )
                            </span>
                          )}
                      </p>
                    </div>
                  </>
                )}

              {/* Sin resultados - No hay datos en absoluto */}
              {!loadingHistory &&
                !historyError &&
                filteredHistoryPrices.length === 0 &&
                historyPrices.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800/40">
                      <span className="text-4xl">📭</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        Sin historial disponible
                      </h3>
                      <p className="max-w-md text-sm text-slate-400">
                        No hay registros de precios para{" "}
                        {historyView.type === "product"
                          ? "este producto"
                          : "este supermercado"}
                        .
                      </p>
                    </div>
                  </div>
                )}

              {/* Sin resultados - Filtro sin coincidencias */}
              {!loadingHistory &&
                !historyError &&
                filteredHistoryPrices.length === 0 &&
                historyPrices.length > 0 && (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-700/20 to-slate-800/40">
                      <span className="text-4xl">🔍</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        Sin resultados en este período
                      </h3>
                      <p className="max-w-md text-sm text-slate-400">
                        No hay registros en el rango temporal seleccionado.
                        Prueba con "Histórico" para ver todos los datos.
                      </p>
                      <button
                        onClick={() => setTimeFilter("all")}
                        className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-sky-700"
                      >
                        Ver histórico completo
                      </button>
                    </div>
                  </div>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
