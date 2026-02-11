export default function PriceHunterApp() {
  return (
    <section className="space-y-4">
      {/* Header con botón de volver */}
      <header className="flex items-center gap-4">
        <a
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 text-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 hover:bg-slate-700/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Volver a Freezer App"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </a>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Price Hunter
          </h1>
          <p className="text-sm text-slate-400">
            Compara precios y encuentra las mejores ofertas
          </p>
        </div>
      </header>

      {/* Contenedor principal */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-slate-800/40 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
            <span className="text-4xl">🔍</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-100">
              Próximamente
            </h2>
            <p className="max-w-md text-sm text-slate-400">
              Esta aplicación te permitirá comparar precios entre diferentes supermercados
              y encontrar las mejores ofertas para tus productos.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3">
            <p className="text-xs text-slate-300">
              Funcionalidad en desarrollo
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
