import { useRef, useState, useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";

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

const CART_WIDTH = 80;
const ACTIONS_WIDTH = 156;
const REST_LEFT = CART_WIDTH;
const OPEN_PX = 12;
const SCROLL_END_DEBOUNCE_MS = 80;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function snapBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

function isAwayFromRest(scrollLeft: number): boolean {
  return Math.abs(scrollLeft - REST_LEFT) > OPEN_PX;
}

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);
  const wasOpenRef = useRef(false);
  const isProgrammaticRef = useRef(false);
  const readyRef = useRef(false);
  const scrollEndTimerRef = useRef<number>(0);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const openSwipeIdRef = useRef(openSwipeId);
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  openSwipeIdRef.current = openSwipeId;

  const pinToRest = (el: HTMLDivElement) => {
    el.scrollLeft = REST_LEFT;
  };

  const scrollToRest = (smooth: boolean) => {
    const el = scrollerRef.current;
    if (!el) return;
    isProgrammaticRef.current = true;
    el.scrollTo({
      left: REST_LEFT,
      behavior: smooth ? snapBehavior() : "auto",
    });
  };

  const syncOpenFromScroll = () => {
    const el = scrollerRef.current;
    if (!el || !readyRef.current) return;

    const open = isAwayFromRest(el.scrollLeft);
    if (open === wasOpenRef.current) return;

    wasOpenRef.current = open;
    setIsOpen(open);

    if (open) {
      onOpenRef.current(productId);
      return;
    }

    if (openSwipeIdRef.current === productId) {
      onCloseRef.current();
    }
  };

  const closeSwipe = (smooth = true) => {
    if (!isAwayFromRest(scrollerRef.current?.scrollLeft ?? REST_LEFT)) {
      wasOpenRef.current = false;
      setIsOpen(false);
      if (openSwipeIdRef.current === productId) {
        onCloseRef.current();
      }
      return;
    }
    scrollToRest(smooth);
    wasOpenRef.current = false;
    setIsOpen(false);
    if (openSwipeIdRef.current === productId) {
      onCloseRef.current();
    }
  };

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    pinToRest(el);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      pinToRest(el);
      innerId = requestAnimationFrame(() => {
        pinToRest(el);
        readyRef.current = true;
        setIsReady(true);
      });
    });

    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onPointerDown = () => {
      didScrollRef.current = false;
    };

    const onScroll = () => {
      if (!readyRef.current) return;
      if (!isProgrammaticRef.current) {
        didScrollRef.current = true;
      }

      window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(() => {
        isProgrammaticRef.current = false;
        syncOpenFromScroll();
      }, SCROLL_END_DEBOUNCE_MS);
    };

    const onScrollEnd = () => {
      if (!readyRef.current) return;
      window.clearTimeout(scrollEndTimerRef.current);
      isProgrammaticRef.current = false;
      syncOpenFromScroll();
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);

    return () => {
      window.clearTimeout(scrollEndTimerRef.current);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
    };
  }, [productId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isReady) return;

    const restorePosition = () => {
      if (wasOpenRef.current) {
        if (el.scrollLeft > REST_LEFT) {
          el.scrollLeft = REST_LEFT + ACTIONS_WIDTH;
        } else {
          el.scrollLeft = 0;
        }
        return;
      }
      pinToRest(el);
    };

    const ro = new ResizeObserver(restorePosition);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (openSwipeId !== productId && wasOpenRef.current) {
      scrollToRest(true);
      wasOpenRef.current = false;
      setIsOpen(false);
    }
  }, [openSwipeId, productId, isReady]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (!target || !containerRef.current) return;
      if (containerRef.current.contains(target)) return;
      if (target instanceof Element && target.closest("[role='dialog']")) return;
      closeSwipe(true);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, [isOpen, productId]);

  const handleActionClick = (action: "edit" | "delete" | "cart") => {
    if (didScrollRef.current) return;
    if (action === "edit") {
      onEdit();
    } else if (action === "delete") {
      onDelete();
    } else {
      onAddToCart();
    }
    closeSwipe(action === "edit" || action === "delete" ? false : true);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (didScrollRef.current) return;
    const el = scrollerRef.current;
    if (!el || !isAwayFromRest(el.scrollLeft)) return;
    e.stopPropagation();
    closeSwipe(true);
  };

  const actionBtnClass =
    "relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-2xl border text-white";

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 overflow-hidden rounded-3xl"
      style={{ opacity: isReady ? 1 : 0 }}
    >
      <div ref={scrollerRef} className="product-swipe-scroller">
        <div className="product-swipe-panel-cart flex items-stretch gap-1 p-1">
          <button
            type="button"
            onClick={() => handleActionClick("cart")}
            className={`${actionBtnClass} border-emerald-400/40 bg-gradient-to-br from-emerald-500 via-green-600 to-green-700`}
            aria-label={isInCart ? "Quitar de la cesta" : "Añadir a la cesta"}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            <svg
              className="relative z-10 mb-0.5 h-6 w-6 drop-shadow-lg"
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
            <span className="relative z-10 text-xs font-bold drop-shadow-md">
              {isInCart ? "Quitar" : "Cesta"}
            </span>
          </button>
        </div>

        <div
          className="product-swipe-panel-content"
          onClick={handleContentClick}
        >
          {children}
        </div>

        <div className="product-swipe-panel-actions flex items-stretch gap-1 p-1">
          <button
            type="button"
            onClick={() => handleActionClick("edit")}
            className={`${actionBtnClass} border-sky-400/40 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700`}
            aria-label="Editar producto"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            <svg
              className="relative z-10 mb-0.5 h-6 w-6 drop-shadow-lg"
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
            <span className="relative z-10 text-xs font-bold drop-shadow-md">
              Editar
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleActionClick("delete")}
            className={`${actionBtnClass} border-red-400/40 bg-gradient-to-br from-red-500 via-red-600 to-red-700`}
            aria-label="Borrar producto"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            <svg
              className="relative z-10 mb-0.5 h-6 w-6 drop-shadow-lg"
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
            <span className="relative z-10 text-xs font-bold drop-shadow-md">
              Borrar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
