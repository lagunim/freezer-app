interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
}

interface FloatingMenuProps {
  items: MenuItem[];
}

export default function FloatingMenu({ items }: FloatingMenuProps) {
  const targetApp = items[0];

  if (!targetApp) {
    return null;
  }

  return (
    <div className="fixed left-0 top-0 z-20 h-[100svh] w-full pointer-events-none">
      <div className="absolute left-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-auto sm:left-8 sm:bottom-[calc(2rem+env(safe-area-inset-bottom))]">
        <a
          href={targetApp.href}
          className="group flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/10 bg-slate-700/40 px-3.5 py-2.5 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:gap-3 sm:px-4"
          aria-label={`Ir a ${targetApp.label}`}
          title={`Ir a ${targetApp.label}`}
        >
          {targetApp.icon && (
            <span className="text-xl leading-none sm:text-2xl" aria-hidden>
              {targetApp.icon}
            </span>
          )}
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
        </a>
      </div>
    </div>
  );
}
