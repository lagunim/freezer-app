import { useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SwipeableProductCardProps {
  /** Contenido principal de la tarjeta */
  children: ReactNode;
  /** ID único del producto para coordinar estado global */
  productId: string;
  /** ID del producto actualmente abierto (para coordinar cierre de otras tarjetas) */
  openSwipeId: string | null;
  /** Callback cuando se abre esta tarjeta */
  onOpen: (id: string) => void;
  /** Callback cuando se cierra esta tarjeta */
  onClose: () => void;
  /** Callback para acción de editar */
  onEdit: () => void;
  /** Callback para acción de borrar */
  onDelete: () => void;
  /** Callback para añadir/quitar de la cesta */
  onAddToCart: () => void;
  /** Indica si el producto ya está en la cesta */
  isInCart: boolean;
}

const SWIPE_THRESHOLD = 60; // Píxeles mínimos para activar swipe (reducido para móvil)
const VELOCITY_THRESHOLD = 0.2; // Velocidad mínima (px/ms) para swipe rápido (más sensible)
const MAX_SWIPE_LEFT = 156; // Ancho máximo de deslizamiento izquierda (2 botones de ~78px)
const MAX_SWIPE_RIGHT = 80; // Ancho máximo de deslizamiento derecha (1 botón)
const ACTIONS_WIDTH_LEFT = 156; // Ancho del panel de acciones izquierda
const ACTIONS_WIDTH_RIGHT = 80; // Ancho del panel de acciones derecha
const DEAD_ZONE = 5; // Zona muerta para ignorar movimientos pequeños (reducido)

export default function SwipeableProductCard({
  children,
  productId,
  openSwipeId,
  onOpen,
  onClose,
  onEdit,
  onDelete,
  onAddToCart,
  isInCart,
}: SwipeableProductCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Cerrar si otra tarjeta se abre
  useEffect(() => {
    if (openSwipeId !== null && openSwipeId !== productId && isOpen) {
      closeSwipe();
    }
  }, [openSwipeId, productId, isOpen]);

  const closeSwipe = () => {
    setTranslateX(0);
    setIsOpen(false);
    setSwipeDirection(null);
    onClose();
  };

  const openSwipeLeft = () => {
    setTranslateX(-MAX_SWIPE_LEFT);
    setIsOpen(true);
    setSwipeDirection("left");
    onOpen(productId);
  };

  const openSwipeRight = () => {
    setTranslateX(MAX_SWIPE_RIGHT);
    setIsOpen(true);
    setSwipeDirection("right");
    onOpen(productId);
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    currentX.current = translateX;
    isDragging.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Determinar dirección del gesto solo la primera vez
    if (isHorizontalSwipe.current === null) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Si el movimiento es menor que la zona muerta, no hacer nada
      if (absDeltaX < DEAD_ZONE && absDeltaY < DEAD_ZONE) {
        return;
      }

      // Determinar si es swipe horizontal o scroll vertical
      // Más permisivo: solo requiere que el movimiento horizontal sea mayor
      isHorizontalSwipe.current = absDeltaX > absDeltaY;

      // Si es scroll vertical, no interceptar
      if (!isHorizontalSwipe.current) {
        return;
      }

      // Marcar que hemos iniciado el drag
      isDragging.current = true;
    }

    // Si ya determinamos que es scroll vertical, no hacer nada
    if (!isHorizontalSwipe.current) {
      return;
    }

    // Prevenir el scroll solo si estamos haciendo swipe horizontal
    e.preventDefault();

    isDragging.current = true;
    setIsSwiping(true);

    // Calcular nueva posición
    let newX = currentX.current + deltaX;

    // Aplicar límites con resistencia
    if (newX > 0) {
      // Permitir swipe hacia la derecha con límite
      if (newX > MAX_SWIPE_RIGHT) {
        // Resistencia al exceder el máximo derecha
        const excess = newX - MAX_SWIPE_RIGHT;
        newX = MAX_SWIPE_RIGHT + excess * 0.3;
      }
    } else {
      // Swipe hacia la izquierda
      if (newX < -MAX_SWIPE_LEFT) {
        // Resistencia al exceder el máximo izquierda
        const excess = Math.abs(newX + MAX_SWIPE_LEFT);
        newX = -MAX_SWIPE_LEFT - excess * 0.3;
      }
    }

    setTranslateX(newX);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) {
      return;
    }

    const deltaX = currentX.current - translateX;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Determinar dirección y si abrir o cerrar
    if (translateX < 0) {
      // Swipe hacia la izquierda
      const shouldOpenLeft =
        translateX < -SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (shouldOpenLeft) {
        openSwipeLeft();
      } else {
        closeSwipe();
      }
    } else if (translateX > 0) {
      // Swipe hacia la derecha
      const shouldOpenRight =
        translateX > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (shouldOpenRight) {
        openSwipeRight();
      } else {
        closeSwipe();
      }
    } else {
      closeSwipe();
    }

    setIsSwiping(false);
    isDragging.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleActionClick = (action: "edit" | "delete" | "cart") => {
    if (action === "edit") {
      onEdit();
    } else if (action === "delete") {
      onDelete();
    } else if (action === "cart") {
      onAddToCart();
    }
    closeSwipe();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    // Solo cerrar si la tarjeta está abierta y no estamos haciendo swipe
    if (isOpen && !isSwiping) {
      e.stopPropagation();
      closeSwipe();
    }
  };

  // Registrar event listeners con passive: false para permitir preventDefault
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.addEventListener("touchstart", handleTouchStart, { passive: true });
    content.addEventListener("touchmove", handleTouchMove, { passive: false });
    content.addEventListener("touchend", handleTouchEnd, { passive: true });
    content.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      content.removeEventListener("touchstart", handleTouchStart);
      content.removeEventListener("touchmove", handleTouchMove);
      content.removeEventListener("touchend", handleTouchEnd);
      content.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [translateX]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeSwipe();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 50, scale: 0.5 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.5 }}
        transition={{ duration: 0.5, type: "spring", ease: "easeInOut" }}
      >
        {/* Capa de acciones izquierda (fondo fijo) */}
        <div
          className="absolute right-0 top-0 bottom-0 flex items-stretch gap-1 p-1"
          style={{ width: `${ACTIONS_WIDTH_LEFT}px` }}
        >
          {/* Botón Editar */}
          <button
            type="button"
            onClick={() => handleActionClick("edit")}
            className="relative flex-1 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 hover:from-sky-400 hover:via-blue-500 hover:to-blue-600 active:from-sky-600 active:via-blue-700 active:to-blue-800 transition-all duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
            aria-label="Editar producto"
            style={{
              boxShadow:
                "0 0 15px rgba(56, 189, 248, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
            <svg
              className="w-6 h-6 mb-0.5 relative z-10 drop-shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-xs font-bold relative z-10 drop-shadow-md">
              Editar
            </span>
          </button>

          {/* Botón Borrar */}
          <button
            type="button"
            onClick={() => handleActionClick("delete")}
            className="relative flex-1 bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 active:from-red-600 active:via-red-700 active:to-red-800 transition-all duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl border border-red-400/40 shadow-[0_0_15px_rgba(239,68,68,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
            aria-label="Borrar producto"
            style={{
              boxShadow:
                "0 0 15px rgba(239, 68, 68, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
            <svg
              className="w-6 h-6 mb-0.5 relative z-10 drop-shadow-lg"
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
            <span className="text-xs font-bold relative z-10 drop-shadow-md">
              Borrar
            </span>
          </button>
        </div>

        {/* Capa de acciones derecha (fondo fijo) */}
        <div
          className="absolute left-0 top-0 bottom-0 flex items-stretch gap-1 p-1"
          style={{ width: `${ACTIONS_WIDTH_RIGHT}px` }}
        >
          {/* Botón Añadir/Quitar de Cesta */}
          <button
            type="button"
            onClick={() => handleActionClick("cart")}
            className="relative flex-1 bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 hover:from-emerald-400 hover:via-green-500 hover:to-green-600 active:from-emerald-600 active:via-green-700 active:to-green-800 transition-all duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
            aria-label={isInCart ? "Quitar de la cesta" : "Añadir a la cesta"}
            style={{
              boxShadow:
                "0 0 15px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
            <svg
              className="w-6 h-6 mb-0.5 relative z-10 drop-shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isInCart ? (
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
            <span className="text-xs font-bold relative z-10 drop-shadow-md">
              {isInCart ? "Quitar" : "Cesta"}
            </span>
          </button>
        </div>

        {/* Capa de contenido deslizable */}
        <div
          ref={contentRef}
          className={`relative ${isSwiping ? "select-none" : ""} ${isOpen ? "cursor-pointer" : ""}`}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isSwiping ? "none" : "transform 300ms ease-out",
            WebkitTapHighlightColor: "transparent",
            touchAction: "pan-y",
          }}
          onClick={handleContentClick}
        >
          {children}
        </div>

        {/* Indicador visual de swipe - gradiente sutil en el borde derecho */}
        {!isOpen && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to left, rgba(100, 116, 139, 0.25), rgba(100, 116, 139, 0.08), transparent)",
            }}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
