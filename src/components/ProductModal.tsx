import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

const PANEL_TRANSITION = { duration: 0.3, ease: "easeInOut" as const };
const REDUCED_TRANSITION = { duration: 0.01 };

interface ProductModalProps {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ProductModal({
  open,
  title,
  titleId,
  onClose,
  children,
}: ProductModalProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? REDUCED_TRANSITION : PANEL_TRANSITION;

  const overlay = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="product-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3"
          initial={false}
          exit={{ opacity: 1 }}
          transition={transition}
        >
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 min-w-0 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-lg"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
            }
            animate={
              reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
            }
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
            }
            transition={transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="min-w-0 max-h-[85vh] overflow-y-auto overflow-x-hidden p-3"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <h2
                id={titleId}
                className="mb-3 text-base font-semibold text-slate-100"
              >
                {title}
              </h2>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlay, document.body);
}
