type AppView = "freezer" | "price-hunter";

const FAB_BOTTOM = "calc(1.5rem + env(safe-area-inset-bottom))";

const ghostFabClass =
  "flex h-14 w-14 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-transform duration-200 ease-out hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16";

const primaryFabClass =
  "flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-sky-600 text-3xl font-light text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:bg-sky-700 hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16";

interface AppChromeProps {
  view: AppView;
  onSwitch: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onScan: () => void;
}

export default function AppChrome({
  view,
  onSwitch,
  onSearch,
  onAdd,
  onScan,
}: AppChromeProps) {
  const isPriceHunter = view === "price-hunter";
  const switchLabel = isPriceHunter ? "Ir a Freezer App" : "Ir a Price Hunter";
  const switchIcon = isPriceHunter ? "❄️" : "🎯";
  const searchLabel = isPriceHunter ? "Buscar precios" : "Buscar productos";
  const addLabel = isPriceHunter ? "Añadir precio" : "Añadir nuevo producto";

  return (
    <>
      <div
        className="fixed left-6 z-20 flex flex-col items-start sm:left-8"
        style={{ bottom: FAB_BOTTOM }}
      >
        <button
          type="button"
          onClick={onSwitch}
          className={ghostFabClass}
          aria-label={switchLabel}
          title={switchLabel}
        >
          <span className="leading-none" aria-hidden>
            {switchIcon}
          </span>
        </button>
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 z-20 flex justify-center"
        style={{ bottom: FAB_BOTTOM }}
      >
        <button
          type="button"
          onClick={onSearch}
          className={`${ghostFabClass} pointer-events-auto`}
          aria-label={searchLabel}
        >
          <svg
            className="h-6 w-6 sm:h-7 sm:w-7"
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
        </button>
      </div>

      <div
        className="fixed right-6 z-20 grid grid-cols-1 grid-rows-[auto_auto] items-end justify-items-end gap-3 sm:right-8"
        style={{ bottom: FAB_BOTTOM }}
      >
        <button
          type="button"
          onClick={onScan}
          tabIndex={isPriceHunter ? 0 : -1}
          aria-hidden={!isPriceHunter}
          className={`${primaryFabClass} text-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isPriceHunter
              ? "pointer-events-auto opacity-100 scale-100"
              : "pointer-events-none opacity-0 scale-90"
          }`}
          aria-label="Escanear código de barras"
          title="Escanear código de barras"
        >
          <svg
            className="h-7 w-7 sm:h-8 sm:w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            aria-hidden
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

        <button
          type="button"
          onClick={onAdd}
          className={primaryFabClass}
          aria-label={addLabel}
        >
          +
        </button>
      </div>
    </>
  );
}
