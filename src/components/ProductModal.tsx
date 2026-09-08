import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

const IOS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

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

  const overlay = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="product-modal"
          className="fixed inset-0 z-[100] flex items-end justify-center"
          initial={false}
          exit={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.38 }}
        >
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.2,
              ease: "easeOut",
            }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-sm rounded-t-2xl border border-b-0 border-slate-700 bg-slate-900 shadow-lg"
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { y: "100%", transition: { duration: 0.28, ease: IOS_EASE } }
            }
            transition={{
              duration: reduceMotion ? 0.01 : 0.38,
              ease: IOS_EASE,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="max-h-[85vh] overflow-y-auto p-3"
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
