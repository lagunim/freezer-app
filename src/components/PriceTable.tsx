import { useEffect, useMemo, useState, memo } from "react";
import type { PriceEntry, PriceInput, OfferType } from "@/lib/priceHunter";
import {
  calculateNormalizedPrice,
  fetchPricesByProductName,
  fetchPricesBySupermarket,
} from "@/lib/priceHunter";
import type { NutritionData } from "@/lib/openProducts";
import { fetchNutritionByBarcode } from "@/lib/openProducts";
import { motion, AnimatePresence } from "framer-motion";
import BarcodeScanner from "@/components/BarcodeScanner";
import { normalizeStr, formatDate, formatPrice, toDateInputValue } from "@/lib/utils";

function hasOffer(price: PriceEntry): boolean {
  return !!price.offer_type;
}

function getOfferLabel(price: PriceEntry): string {
  if (!price.offer_type) return "";
  switch (price.offer_type) {
    case "2x1":
      return "2x1 Segunda unidad gratis";
    case "3x2":
      return "3x2 Tercera unidad gratis";
    case "50_second":
      return "50% descuento en segunda unidad";
    case "custom":
      return price.offer_name?.trim() || "Oferta personalizada";
    default:
      return "";
  }
}

const OFFER_OPTIONS: { value: "" | OfferType; label: string }[] = [
  { value: "", label: "— Sin oferta —" },
  { value: "2x1", label: "2x1 Segunda unidad gratis" },
  { value: "3x2", label: "3x2 Tercera unidad gratis" },
  { value: "50_second", label: "50% descuento en segunda unidad" },
  { value: "custom", label: "Personalizado" },
];

export interface PriceTableProps {
  prices: PriceEntry[];
  loading?: boolean;
  onEdit: (price: PriceEntry) => void;
  onDelete: (id: string) => void;
  searchTerm?: string;
  onQuickAdd?: (input: PriceInput) => Promise<void>;
  savingQuickAdd?: boolean;
}

export default memo(PriceTable);

type SortField = "product_name" | "price" | "date";
type SortDirection = "asc" | "desc";

/**
 * Obtiene la etiqueta de unidad para mostrar la cantidad según el tipo de unidad
 * @param unit - Unidad de normalización del precio
 * @returns Etiqueta de unidad para mostrar (ej: "g/ml", "Unidades")
 */
function getQuantityUnitLabel(unit: string): string {
  switch (unit) {
    case "Docena":
      return "Unidades";
    case "Unidad":
      return "Unidades";
    case "Kg":
    case "1Kg":
    case "100g":
      return "g";
    case "L":
    case "1L":
    case "100ml":
      return "ml";
    default:
      return "g/ml";
  }
}

function PriceTable({
  prices,
  loading = false,
  onEdit,
  onDelete,
  searchTerm = "",
  onQuickAdd,
  savingQuickAdd = false,
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
  const [nutritionBarCode, setNutritionBarCode] = useState<string | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(
    null,
  );
  const [loadingNutrition, setLoadingNutrition] = useState(false);

  // Quick-add price states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddPrice, setQuickAddPrice] = useState("");
  const [quickAddQuantity, setQuickAddQuantity] = useState("");
  const [quickAddDate, setQuickAddDate] = useState(toDateInputValue());
  const [quickAddOfferType, setQuickAddOfferType] = useState<"" | OfferType>("");
  const [quickAddCustomOfferName, setQuickAddCustomOfferName] = useState("");
  const [quickAddCustomOfferDescription, setQuickAddCustomOfferDescription] = useState("");
  const [showQuickAddCustomOfferModal, setShowQuickAddCustomOfferModal] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState("");
  const [isQuickAddScannerOpen, setIsQuickAddScannerOpen] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

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
    setNutritionBarCode(null);
    setNutritionData(null);
  };

  const handleCloseDetail = () => {
    setDetailPrice(null);
    setNutritionBarCode(null);
    setNutritionData(null);
  };

  const handleHistoryRowClick = (price: PriceEntry) => {
    setDetailPrice(price);
    setHistoryView(null);
    setHistoryPrices([]);
    setHistoryError(null);
    setSupermarketHistorySearchTerm("");
    setNutritionBarCode(null);
    setNutritionData(null);
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
    userId: string,
    priceFromDetail?: PriceEntry | null,
  ) => {
    setPriceBeforeHistory(priceFromDetail ?? null);
    setDetailPrice(null);
    setLoadingHistory(true);
    setHistoryError(null);
    setHistoryView({ type: "product", value: productName });

    try {
      const data = await fetchPricesByProductName(productName, userId);
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

  const handleOpenNutrition = async (barCode: string) => {
    setNutritionBarCode(barCode);
    setLoadingNutrition(true);
    try {
      const data = await fetchNutritionByBarcode(barCode);
      setNutritionData(data);
    } catch {
      setNutritionData(null);
    } finally {
      setLoadingNutrition(false);
    }
  };

  const handleCloseNutrition = () => {
    setNutritionBarCode(null);
    setNutritionData(null);
  };

  const openQuickAdd = () => {
    setQuickAddPrice("");
    setQuickAddQuantity("");
    setQuickAddDate(toDateInputValue());
    setQuickAddOfferType("");
    setQuickAddCustomOfferName("");
    setQuickAddCustomOfferDescription("");
    setQuickAddBarcode("");
    setQuickAddError(null);
    setIsQuickAddOpen(true);
  };

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false);
    setQuickAddError(null);
  };

  const handleQuickAddSubmit = async () => {
    if (!detailPrice || !onQuickAdd) return;
    setQuickAddError(null);

    const priceNum = Number.parseFloat(quickAddPrice.replace(",", "."));
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setQuickAddError("El precio debe ser un número mayor o igual que 0.");
      return;
    }

    const qtyNum = Number.parseFloat(quickAddQuantity.replace(",", "."));
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      setQuickAddError("La cantidad debe ser un número mayor que 0.");
      return;
    }

    if (!quickAddDate) {
      setQuickAddError("Selecciona una fecha.");
      return;
    }

    const input: PriceInput = {
      product_prices_id: detailPrice.product_prices_id,
      product_name: detailPrice.product_name,
      brand: detailPrice.brand ?? "",
      total_price: priceNum,
      quantity: qtyNum,
      unit: detailPrice.unit,
      supermarket: detailPrice.supermarket,
      date: new Date(quickAddDate).toISOString(),
      offer_type: quickAddOfferType === "" ? null : quickAddOfferType,
      offer_name: quickAddOfferType === "custom" ? quickAddCustomOfferName.trim() || null : null,
      offer_description: quickAddOfferType === "custom" ? quickAddCustomOfferDescription.trim() || null : null,
      bar_code: detailPrice.bar_code || quickAddBarcode.trim() || undefined,
    };

    try {
      await onQuickAdd(input);
      closeQuickAdd();
    } catch {
      setQuickAddError("No se ha podido crear el precio.");
    }
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
      filterDate.setFullYear(now.getFullYear() - 2);
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
    const term = normalizeStr(supermarketHistorySearchTerm.trim());
    if (!term) return filteredHistoryPrices;
    return filteredHistoryPrices.filter((p) =>
      normalizeStr(p.product_name).includes(term),
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
                <AnimatePresence key={price.id}>
                  <motion.tr
                    layoutId={`price-product-${price.product_name}`}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    // viewport={{ once: true, margin: "-50px" }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      duration: 0.2,
                    }}
                    onClick={() => handleRowClick(price)}
                    className={`border-b border-slate-800 transition-colors hover:bg-slate-800/40 cursor-pointer ${hasOffer(price) ? "bg-amber-500/5" : ""
                      }`}
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "44px",
                    }}
                  >
                    <td className="px-2 py-2 text-sm">
                      {hasOffer(price) && (
                        <span
                          className="mr-1.5 inline-flex items-center justify-center rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90"
                          title={getOfferLabel(price)}
                        >
                          🏷
                        </span>
                      )}
                      <span
                        className={
                          hasOffer(price)
                            ? "text-amber-200/95 font-medium"
                            : "text-slate-100"
                        }
                      >
                        {price.product_name}
                      </span>
                    </td>
                    <td
                      className={`px-2 py-2 text-sm font-medium whitespace-nowrap ${hasOffer(price)
                        ? "text-amber-300/90"
                        : "text-sky-400"
                        }`}
                    >
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
              className="mx-4 w-full max-w-md rounded-[22px] border border-white/[0.07] bg-[#141c30] p-3.5 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-1 flex items-center justify-between px-0.5 pb-2.5">
                <h3 className="text-md font-bold tracking-tight text-[#f4f6fb]">
                  {nutritionBarCode
                    ? "Información nutricional"
                    : "Detalles del precio"}
                </h3>
                <div className="flex items-center gap-2">
                  {!nutritionBarCode && detailPrice.bar_code && (
                    <button
                      onClick={() => handleOpenNutrition(detailPrice.bar_code!)}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-[rgba(227,181,103,0.10)] border border-[rgba(227,181,103,0.3)] px-3 text-sm transition-all hover:bg-[rgba(227,181,103,0.20)] hover:border-[rgba(227,181,103,0.5)]"
                      aria-label="Ver información nutricional"
                    >
                      <span className="text-sm leading-none">🥗</span>
                      <span className="text-xs font-semibold text-[#e3b567] leading-none">Nutrición</span>
                    </button>
                  )}
                  <button
                    onClick={nutritionBarCode ? handleCloseNutrition : handleCloseDetail}
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/[0.06] text-[#8b93a9] transition-colors hover:bg-white/10 hover:text-[#f4f6fb]"
                    aria-label={nutritionBarCode ? "Volver a detalles" : "Cerrar"}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Vista de información nutricional */}
              {nutritionBarCode && (
                <div className="mt-2">
                  {loadingNutrition && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2a3352] border-t-[#4da2ff]"></div>
                        <p className="text-sm text-[#8b93a9]">
                          Cargando información nutricional...
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingNutrition && !nutritionData && (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-700/20 to-[#141c30]/40">
                        <span className="text-4xl">🥗</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-[#f4f6fb]">
                          Sin datos nutricionales
                        </h3>
                        <p className="max-w-md text-sm text-[#8b93a9]">
                          No se encontraron datos nutricionales para este
                          producto. Es posible que no esté registrado en Open
                          Food Facts.
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingNutrition && nutritionData && (
                    <>
                      <p className="mb-4 text-sm font-medium text-[#8b93a9]">
                        Por 100g de producto
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            label: "Energía",
                            value: nutritionData.energy_kcal,
                            unit: "kcal",
                            icon: "🔥",
                          },
                          {
                            label: "Grasas",
                            value: nutritionData.fat,
                            unit: "g",
                            icon: "🧈",
                          },
                          {
                            label: "Grasas saturadas",
                            value: nutritionData.saturated_fat,
                            unit: "g",
                            icon: "🟠",
                          },
                          {
                            label: "Hidratos de carbono",
                            value: nutritionData.carbohydrates,
                            unit: "g",
                            icon: "🍞",
                          },
                          {
                            label: "Azúcares",
                            value: nutritionData.sugars,
                            unit: "g",
                            icon: "🍬",
                          },
                          {
                            label: "Proteínas",
                            value: nutritionData.proteins,
                            unit: "g",
                            icon: "🥩",
                          },
                          {
                            label: "Sal",
                            value: nutritionData.salt,
                            unit: "g",
                            icon: "🧂",
                          },
                          {
                            label: "Fibra",
                            value: nutritionData.fiber,
                            unit: "g",
                            icon: "🌾",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#141c30] px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-base">{item.icon}</span>
                              <span className="text-sm text-[#8b93a9]">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-[#f4f6fb]">
                              {item.value !== null
                                ? `${item.value} ${item.unit}`
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Contenido normal del detalle — Estilo ticket */}
              {!nutritionBarCode && (
                <div className="rounded-[22px] border border-white/[0.07] bg-[#141c30] p-3.5">

                  {/* ticket-head + ticket-brand: Producto + Marca */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProductHistory(
                        detailPrice.product_name,
                        detailPrice.user_id,
                        detailPrice,
                      );
                    }}
                    className="w-full text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="flex items-center text-lg leading-none">📦</span>
                      <span className="flex-1 min-w-0 flex items-center text-2xl font-bold text-[#f4f6fb] group-hover:text-[#4da2ff] transition-colors leading-none">
                        {detailPrice.product_name}
                      </span>
                      <span className="flex items-center text-[#8b93a9] text-sm opacity-70 group-hover:opacity-100 transition-opacity leading-none">›</span>
                    </div>
                    <p className="ml-[34px] text-xs text-[#8b93a9] group-hover:text-[#4da2ff] transition-colors">
                      {detailPrice.brand && detailPrice.brand.trim() !== ""
                        ? detailPrice.brand
                        : "—"} · Ver historial completo →
                    </p>
                  </button>

                  {/* priceband: Precio normalizado centrado */}
                  <div className="my-3 rounded-xl bg-[#4da2ff]/[0.08] py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.06em] text-[#8b93a9]">
                      Precio normalizado
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold text-[#4da2ff] tracking-tight">
                      {formatPrice(
                        calculateNormalizedPrice(
                          detailPrice.total_price,
                          detailPrice.quantity,
                          detailPrice.unit,
                        ),
                      )}
                      <span className="text-xs font-medium text-[#8b93a9] ml-0.5">
                        /{detailPrice.unit}
                      </span>
                    </p>
                  </div>

                  {/* miniStats: PAGADO · CANTIDAD · FECHA */}
                  <div className="mb-2.5 flex overflow-hidden rounded-xl border border-white/[0.07]">
                    <div className="flex-1 py-2 text-center border-r border-white/[0.07]">
                      <p className="text-[0.65rem] uppercase text-[#8b93a9] mb-0.5">Pagado</p>
                      <p className="text-sm font-bold text-[#f4f6fb]">{formatPrice(detailPrice.total_price)}</p>
                    </div>
                    <div className="flex-1 py-2 text-center border-r border-white/[0.07]">
                      <p className="text-[0.65rem] uppercase text-[#8b93a9] mb-0.5">Cantidad</p>
                      <p className="text-sm font-bold text-[#f4f6fb]">{detailPrice.quantity} {getQuantityUnitLabel(detailPrice.unit)}</p>
                    </div>
                    <div className="flex-1 py-2 text-center">
                      <p className="text-[0.65rem] uppercase text-[#8b93a9] mb-0.5">Fecha</p>
                      <p className="text-sm font-bold text-[#f4f6fb]">{formatDate(detailPrice.date)}</p>
                    </div>
                  </div>

                  {/* thinrow: Supermercado (borde dashed superior) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSupermarketHistory(
                        detailPrice.supermarket,
                        detailPrice,
                      );
                    }}
                    className="w-full flex items-center gap-2.5 border-t border-dashed border-white/[0.07] pt-2.5 text-left cursor-pointer group"
                  >
                    <span className="flex items-center text-base leading-none">🏬</span>
                    <span className="flex-1 min-w-0 flex items-center text-md font-semibold text-[#f4f6fb] group-hover:text-[#4da2ff] transition-colors truncate leading-none">
                      {detailPrice.supermarket}
                    </span>
                    <span className="text-[#8b93a9] text-sm leading-none opacity-70 group-hover:opacity-100 transition-opacity">›</span>
                  </button>

                  {/* chip-amber: Oferta */}
                  {hasOffer(detailPrice) && (
                    <div className="mt-1 flex items-center gap-2 rounded-full bg-[rgba(227,181,103,0.10)] border border-[rgba(227,181,103,0.3)] px-3.5 py-2">
                      <span className="text-sm">🏷️</span>
                      <span className="text-xs font-bold text-[#e3b567]">
                        {getOfferLabel(detailPrice)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Añadir nuevo precio y acciones */}
              {!nutritionBarCode && (
                <div className="mt-3 space-y-2.5">
                  {onQuickAdd && (
                    <button
                      onClick={openQuickAdd}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir nuevo precio
                    </button>
                  )}

                  {/* Acciones compactas */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCloseDetail}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2.5 text-xs font-bold text-[#8b93a9] transition-colors hover:bg-white/[0.10] hover:text-[#f4f6fb] focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancelar</span>
                    </button>
                    <button
                      onClick={() => handleEditClick(detailPrice)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-[#4da2ff] py-2.5 text-xs font-bold text-[#06121f] transition-colors hover:bg-[#3b8fe6] focus:outline-none focus:ring-2 focus:ring-[#4da2ff]"
                    >
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l10-10a2.121 2.121 0 013 3L12 18l-4 1 1-4z" />
                      </svg>
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(detailPrice.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-[rgba(239,71,71,0.14)] py-2.5 text-xs font-bold text-[#ef4747] transition-colors hover:bg-[rgba(239,71,71,0.25)] focus:outline-none focus:ring-2 focus:ring-[#ef4747]/50"
                    >
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              )}
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
                      {historyView.type === "product"
                        ? "Historial de Producto"
                        : "Historial de Supermercado"}
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
                <div className="flex items-center gap-3">
                  <h3 className="min-w-0 flex-1 truncate text-2xl font-semibold text-slate-100">
                    {historyView.type === "product" ? "📦 " : "🏪 "}
                    {historyView.value}
                  </h3>
                </div>
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
                    {supermarketHistorySearchTerm && (
                      <button
                        type="button"
                        onClick={() => setSupermarketHistorySearchTerm("")}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded-full p-1"
                        aria-label="Limpiar búsqueda"
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
                    )}
                    <input
                      id="supermarket-history-search"
                      type="text"
                      value={supermarketHistorySearchTerm}
                      onChange={(e) =>
                        setSupermarketHistorySearchTerm(e.target.value)
                      }
                      placeholder="Buscar por producto…"
                      className="block w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-11 pr-10 text-base text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Filtros temporales (solo para vista de producto) */}
              {historyView.type === "product" && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTimeFilter("6months")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${timeFilter === "6months"
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
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${timeFilter === "1year"
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
                    <span>2 años</span>
                  </button>
                  <button
                    onClick={() => setTimeFilter("all")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${timeFilter === "all"
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
                              Precio
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
                                className={`border-b border-slate-800 transition-colors hover:bg-slate-800/40 cursor-pointer ${hasOffer(price) ? "bg-amber-500/5" : ""
                                  }`}
                              >
                                {historyView.type === "supermarket" && (
                                  <td className="px-2 py-3 text-sm">
                                    {hasOffer(price) && (
                                      <span
                                        className="mr-1.5 inline-flex rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90"
                                        title={getOfferLabel(price)}
                                      >
                                        🏷
                                      </span>
                                    )}
                                    <span
                                      className={
                                        hasOffer(price)
                                          ? "text-amber-200/95 font-medium"
                                          : "text-slate-100"
                                      }
                                    >
                                      {price.product_name}
                                    </span>
                                  </td>
                                )}
                                {historyView.type === "product" && (
                                  <td className="px-2 py-3 text-sm">
                                    {hasOffer(price) && (
                                      <span
                                        className="mr-1.5 inline-flex rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90"
                                        title={getOfferLabel(price)}
                                      >
                                        🏷
                                      </span>
                                    )}
                                    <span
                                      className={
                                        hasOffer(price)
                                          ? "text-amber-200/95 font-medium"
                                          : "text-slate-100"
                                      }
                                    >
                                      {price.supermarket}
                                    </span>
                                  </td>
                                )}
                                <td
                                  className={`px-2 py-3 text-sm font-medium whitespace-nowrap ${hasOffer(price)
                                    ? "text-amber-300/90"
                                    : "text-sky-400"
                                    }`}
                                >
                                  {formatPrice(normalizedPrice)}/{price.unit}
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
      {/* Modal de añadir precio rápido */}
      <AnimatePresence>
        {isQuickAddOpen && detailPrice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeQuickAdd}
          >
            <motion.div
              initial={{ scaleY: 0, originY: 0.5 }}
              animate={{ scaleY: 1, originY: 0.5 }}
              exit={{ scaleY: 0, originY: 0.5 }}
              transition={{ duration: 0.8, type: "spring", ease: "easeIn" }}
              className="mx-4 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-100">
                  Añadir nuevo precio
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Registro rápido de precio para este producto
                </p>
              </div>

              <div className="space-y-4">
                {/* Producto (solo lectura) */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📦</span>
                    <p className="text-xs font-medium text-slate-400">Producto</p>
                  </div>
                  <p className="text-base font-semibold text-slate-100">
                    {detailPrice.product_name}
                  </p>
                </div>

                {/* Marca (solo lectura) */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🏷️</span>
                    <p className="text-xs font-medium text-slate-400">Marca</p>
                  </div>
                  <p className="text-base font-semibold text-slate-100">
                    {detailPrice.brand && detailPrice.brand.trim() !== ""
                      ? detailPrice.brand
                      : "—"}
                  </p>
                </div>

                {/* Supermercado (solo lectura) */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🏪</span>
                    <p className="text-xs font-medium text-slate-400">Supermercado</p>
                  </div>
                  <p className="text-base font-semibold text-slate-100">
                    {detailPrice.supermarket}
                  </p>
                </div>

                {/* Unidad (solo lectura) */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📐</span>
                    <p className="text-xs font-medium text-slate-400">Unidad</p>
                  </div>
                  <p className="text-base font-semibold text-slate-100">
                    {detailPrice.unit}
                  </p>
                </div>

                {/* Precio y Cantidad */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="quick-price"
                      className="mb-2 block text-sm font-medium text-slate-300 min-h-[20px]"
                    >
                      Precio pagado (€)
                    </label>
                    <input
                      id="quick-price"
                      type="text"
                      inputMode="decimal"
                      pattern="^\d+([.,]\d{1,2})?$"
                      step="0.01"
                      min="0"
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      placeholder="Ej: 3,40"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="quick-quantity"
                      className="mb-2 block text-sm font-medium text-slate-300 min-h-[20px]"
                    >
                      Cantidad
                    </label>
                    <input
                      id="quick-quantity"
                      type="text"
                      inputMode="decimal"
                      pattern="^\d+([.,]\d{1,2})?$"
                      step="0.01"
                      min="0.01"
                      value={quickAddQuantity}
                      onChange={(e) => setQuickAddQuantity(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      placeholder="Ej: 250"
                      required
                    />
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label
                    htmlFor="quick-date"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Fecha
                  </label>
                  <input
                    id="quick-date"
                    type="date"
                    value={quickAddDate}
                    onChange={(e) => setQuickAddDate(e.target.value)}
                    className="min-w-0 w-full max-w-full appearance-none box-border rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90"
                    required
                  />
                </div>

                {/* Código de barras (solo si no existe uno previo) */}
                {!detailPrice.bar_code && (
                  <div>
                    <label
                      htmlFor="quick-barcode"
                      className="mb-2 block text-sm font-medium text-slate-300"
                    >
                      Código de barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="quick-barcode"
                        type="text"
                        inputMode="numeric"
                        value={quickAddBarcode}
                        onChange={(e) => setQuickAddBarcode(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 placeholder-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        placeholder="Ej: 8410076472586"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setIsQuickAddScannerOpen(true)}
                        className="flex h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-lg border border-sky-500/50 bg-sky-600/20 text-sky-400 transition-colors hover:bg-sky-600/40 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        aria-label="Escanear código de barras"
                        title="Escanear código de barras"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Oferta */}
                <div>
                  <label
                    htmlFor="quick-offer"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Oferta
                  </label>
                  <select
                    id="quick-offer"
                    value={quickAddOfferType}
                    onChange={(e) => {
                      const v = e.target.value as "" | OfferType;
                      setQuickAddOfferType(v);
                      if (v === "custom") setShowQuickAddCustomOfferModal(true);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    {OFFER_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {quickAddOfferType === "custom" && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCustomOfferModal(true)}
                      className="mt-2 text-sm text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Editar nombre y descripción →
                    </button>
                  )}
                </div>

                {/* Error */}
                {quickAddError && (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                    <p className="text-sm text-red-400">{quickAddError}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeQuickAdd}
                    disabled={savingQuickAdd}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddSubmit}
                    disabled={savingQuickAdd}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingQuickAdd ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Guardando...
                      </span>
                    ) : (
                      <>
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal oferta personalizada */}
              <AnimatePresence>
                {showQuickAddCustomOfferModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"
                    onClick={() => setShowQuickAddCustomOfferModal(false)}
                  >
                    <motion.div
                      initial={{ scaleY: 0, scaleX: 0.7, opacity: 0 }}
                      animate={{ scaleY: 1, scaleX: 1, opacity: 1 }}
                      exit={{ scaleY: 0, scaleX: 0.6, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      onClick={(e) => e.stopPropagation()}
                      className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-100">
                          Oferta personalizada
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowQuickAddCustomOfferModal(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
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
                        <div>
                          <label
                            htmlFor="quick-custom-offer-name"
                            className="mb-1.5 block text-sm font-medium text-slate-300"
                          >
                            Nombre
                          </label>
                          <input
                            id="quick-custom-offer-name"
                            type="text"
                            value={quickAddCustomOfferName}
                            onChange={(e) => setQuickAddCustomOfferName(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                            placeholder="Ej: 3x2 en yogures"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="quick-custom-offer-desc"
                            className="mb-1.5 block text-sm font-medium text-slate-300"
                          >
                            Descripción
                          </label>
                          <textarea
                            id="quick-custom-offer-desc"
                            value={quickAddCustomOfferDescription}
                            onChange={(e) => setQuickAddCustomOfferDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                            placeholder="Ej: Lleva 3 y paga 2"
                          />
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowQuickAddCustomOfferModal(false)}
                          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          Listo
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner (quick-add) */}
      <AnimatePresence>
        {isQuickAddScannerOpen && (
          <BarcodeScanner
            onDetected={(code) => {
              setQuickAddBarcode(code);
              setIsQuickAddScannerOpen(false);
            }}
            onClose={() => setIsQuickAddScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
