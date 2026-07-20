import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(true);

  const stopScanner = useCallback(async () => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignorar errores al parar
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        const scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdge * 0.8),
                height: Math.floor(minEdge * 0.4),
              };
            },
            videoConstraints: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "environment",
            },
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          },
          (decodedText: string) => {
            if (cancelled) return;
            stopScanner();
            onDetected(decodedText);
          },
          () => {
            // Ignorar errores de escaneo (normal durante el escaneo)
          },
        );

        if (cancelled) return;

        // Aplicar focusMode continuo tras 2s (necesario para iOS)
        focusTimerRef.current = setTimeout(async () => {
          if (cancelled || !scannerRef.current) return;
          try {
            await scannerRef.current.applyVideoConstraints({
              focusMode: "continuous",
            });
          } catch {
            // No todos los dispositivos soportan focusMode
          }
        }, 2000);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error al iniciar escáner:", err);
        if (
          err?.message?.includes("NotAllowedError") ||
          err?.message?.includes("Permission")
        ) {
          setError(
            "Permiso de cámara denegado. Activa el permiso en ajustes del navegador.",
          );
        } else if (
          err?.message?.includes("NotFoundError") ||
          err?.message?.includes("DevicesNotFound")
        ) {
          setError("No se encontró ninguna cámara en el dispositivo.");
        } else {
          setError("No se pudo iniciar la cámara. Inténtalo de nuevo.");
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [onDetected, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[120] flex flex-col bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="Escáner de código de barras"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <h2 className="text-base font-semibold text-slate-100">
          Escanear código de barras
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-100 transition-colors hover:bg-slate-700 hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Cerrar escáner"
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

      {/* Scanner area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <svg
              className="h-16 w-16 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <p className="text-sm text-slate-300">{error}</p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-sky-500 bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div id="barcode-reader" className="w-full flex-1" />
            <p className="py-3 text-center text-sm text-slate-400 bg-slate-900/90">
              Apunta la cámara al código de barras del producto
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
