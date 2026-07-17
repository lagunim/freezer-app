import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopScanner = useCallback(async () => {
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
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
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

        if (!cancelled) {
          setScanning(true);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error al iniciar escáner:", err);
        if (
          err?.message?.includes("NotAllowedError") ||
          err?.message?.includes("Permission")
        ) {
          setError("Permiso de cámara denegado. Activa el permiso en ajustes del navegador.");
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
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
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
            <div id="barcode-reader" ref={containerRef} className="w-full h-full" />

            {/* Overlay de guía de escaneo */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Marco de guía */}
                <div className="relative w-[280px] h-[150px]">
                  {/* Esquinas */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-md" />

                  {/* Línea de escaneo animada */}
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                    animate={{ y: [0, 130, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>

                {/* Texto de guía */}
                <p className="mt-6 text-sm text-slate-300 text-center px-4">
                  Apunta la cámara al código de barras del producto
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
