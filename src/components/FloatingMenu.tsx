import { useEffect, useRef, useState } from 'react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Cerrar el menú al presionar Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-20 sm:bottom-8 sm:left-8">
      {/* Menú emergente */}
      {isMenuOpen && (
        <div
          className="absolute bottom-16 left-0 mb-2 min-w-[200px] animate-[slideInUp_0.3s_ease-out] rounded-xl border border-white/10 bg-slate-800/90 backdrop-blur-xl p-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          role="menu"
          aria-label="Menú de aplicaciones"
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-100 transition-all duration-200 hover:bg-slate-700/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-sky-500"
              role="menuitem"
            >
              {item.icon && <span className="text-xl">{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-2xl font-light text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:h-16 sm:w-16 sm:text-3xl"
        aria-label="Menú de aplicaciones"
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
