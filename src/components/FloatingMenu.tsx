export interface MenuItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
  /** Si es true, se muestra solo un FAB redondo con el icono (sin texto ni flecha), alineado con los FABs de la derecha */
  roundOnly?: boolean;
}

interface FloatingMenuProps {
  items: MenuItem[];
  /** Offset extra sobre el bottom base (ej. "4rem"). Use "0" para alinear el FAB con el de la barra de búsqueda. */
  bottomOffset?: string;
}

const roundFabClass =
  "flex h-14 w-14 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16";

export default function FloatingMenu({
  items,
  bottomOffset = "0",
}: FloatingMenuProps) {
  const targetApp = items[0];

  if (!targetApp) {
    return null;
  }

  const bottomValue = `calc(1.5rem + env(safe-area-inset-bottom) + ${bottomOffset})`;
  const linkClass =
    "group flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/10 bg-slate-700/40 px-3.5 py-2.5 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:gap-3 sm:px-4";
  const isButton = typeof targetApp.onClick === "function";
  const roundOnly = targetApp.roundOnly === true;

  const iconContent = targetApp.icon ? (
    <span className="text-xl leading-none sm:text-2xl" aria-hidden>
      {targetApp.icon}
    </span>
  ) : null;

  const content = (
    <>
      {iconContent}
      <span className="max-w-[120px] truncate text-xs font-semibold tracking-wide text-slate-100/95 sm:max-w-none sm:text-sm">
        {targetApp.label}
      </span>
      <svg
        className="h-4 w-4 text-slate-300 transition-transform duration-300 group-hover:translate-x-0.5 sm:h-4.5 sm:w-4.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </>
  );

  return (
    <div className="fixed left-0 top-0 z-20 h-[100svh] w-full pointer-events-none">
      <div
        className="absolute left-6 pointer-events-auto sm:left-8"
        style={{ bottom: bottomValue }}
      >
        {roundOnly ? (
          isButton ? (
            <button
              type="button"
              onClick={targetApp.onClick}
              className={roundFabClass}
              aria-label={`Ir a ${targetApp.label}`}
              title={targetApp.label}
            >
              {iconContent}
            </button>
          ) : (
            <a
              href={targetApp.href ?? "#"}
              className={roundFabClass}
              aria-label={`Ir a ${targetApp.label}`}
              title={targetApp.label}
            >
              {iconContent}
            </a>
          )
        ) : isButton ? (
          <button
            type="button"
            onClick={targetApp.onClick}
            className={linkClass}
            aria-label={`Ir a ${targetApp.label}`}
            title={`Ir a ${targetApp.label}`}
          >
            {content}
          </button>
        ) : (
          <a
            href={targetApp.href ?? "#"}
            className={linkClass}
            aria-label={`Ir a ${targetApp.label}`}
            title={`Ir a ${targetApp.label}`}
          >
            {content}
          </a>
        )}
      </div>
    </div>
  );
}
