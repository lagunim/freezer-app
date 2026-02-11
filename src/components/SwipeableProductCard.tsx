import { useRef, useState, useEffect, ReactNode } from 'react';

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
}

const SWIPE_THRESHOLD = 80; // Píxeles mínimos para activar swipe
const VELOCITY_THRESHOLD = 0.3; // Velocidad mínima (px/ms) para swipe rápido
const MAX_SWIPE = 156; // Ancho máximo de deslizamiento (2 botones de ~78px)
const ACTIONS_WIDTH = 156; // Ancho del panel de acciones
const DEAD_ZONE = 10; // Zona muerta para ignorar movimientos pequeños

export default function SwipeableProductCard({
  children,
  productId,
  openSwipeId,
  onOpen,
  onClose,
  onEdit,
  onDelete,
}: SwipeableProductCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showHint, setShowHint] = useState(true);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar si el usuario ya ha usado el swipe antes
  useEffect(() => {
    const hasUsedSwipe = localStorage.getItem('freezer-swipe-hint-dismissed');
    if (hasUsedSwipe === 'true') {
      setShowHint(false);
    }
  }, []);

  // Cerrar si otra tarjeta se abre
  useEffect(() => {
    if (openSwipeId !== null && openSwipeId !== productId && isOpen) {
      closeSwipe();
    }
  }, [openSwipeId, productId, isOpen]);

  const closeSwipe = () => {
    setTranslateX(0);
    setIsOpen(false);
    onClose();
  };

  const openSwipe = () => {
    setTranslateX(-MAX_SWIPE);
    setIsOpen(true);
    onOpen(productId);
    
    // Marcar que el usuario ya descubrió la funcionalidad de swipe
    if (showHint) {
      localStorage.setItem('freezer-swipe-hint-dismissed', 'true');
      setShowHint(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    currentX.current = translateX;
    isDragging.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
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
      isHorizontalSwipe.current = absDeltaX > absDeltaY;

      // Si es scroll vertical, no interceptar
      if (!isHorizontalSwipe.current) {
        return;
      }
    }

    // Si ya determinamos que es scroll vertical, no hacer nada
    if (!isHorizontalSwipe.current) {
      return;
    }

    // Prevenir scroll mientras se hace swipe horizontal
    e.preventDefault();

    isDragging.current = true;
    setIsSwiping(true);

    // Calcular nueva posición
    let newX = currentX.current + deltaX;

    // Aplicar límites con resistencia
    if (newX > 0) {
      // Resistencia al deslizar hacia la derecha desde cerrado
      newX = newX * 0.3;
    } else if (newX < -MAX_SWIPE) {
      // Resistencia al exceder el máximo
      const excess = Math.abs(newX + MAX_SWIPE);
      newX = -MAX_SWIPE - excess * 0.3;
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

    // Determinar si abrir o cerrar basado en distancia o velocidad
    const shouldOpen =
      translateX < -SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (shouldOpen && translateX < 0) {
      openSwipe();
    } else {
      closeSwipe();
    }

    setIsSwiping(false);
    isDragging.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleActionClick = (action: 'edit' | 'delete') => {
    if (action === 'edit') {
      onEdit();
    } else {
      onDelete();
    }
    closeSwipe();
  };

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
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-3xl">
      {/* Capa de acciones (fondo fijo) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch gap-1 p-1"
        style={{ width: `${ACTIONS_WIDTH}px` }}
      >
        {/* Botón Editar */}
        <button
          type="button"
          onClick={() => handleActionClick('edit')}
          className="relative flex-1 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 hover:from-sky-400 hover:via-blue-500 hover:to-blue-600 active:from-sky-600 active:via-blue-700 active:to-blue-800 transition-all duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
          aria-label="Editar producto"
          style={{
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)'
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
          <span className="text-xs font-bold relative z-10 drop-shadow-md">Editar</span>
        </button>

        {/* Botón Borrar */}
        <button
          type="button"
          onClick={() => handleActionClick('delete')}
          className="relative flex-1 bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 active:from-red-600 active:via-red-700 active:to-red-800 transition-all duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl border border-red-400/40 shadow-[0_0_15px_rgba(239,68,68,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
          aria-label="Borrar producto"
          style={{
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)'
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
          <span className="text-xs font-bold relative z-10 drop-shadow-md">Borrar</span>
        </button>
      </div>

      {/* Capa de contenido deslizable */}
      <div
        className={`relative ${isSwiping ? 'select-none' : ''}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 300ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Indicador visual de swipe - gradiente sutil en el borde derecho */}
      {!isOpen && (
        <div
          className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, rgba(100, 116, 139, 0.25), rgba(100, 116, 139, 0.08), transparent)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Icono chevron animado (hint visual) - desaparece tras primer uso */}
      {!isOpen && showHint && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 animate-chevron-pulse"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M12 15L7 10L12 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-400"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
