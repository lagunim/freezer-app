import FriezaIcon from '@/public/Frieza-icon.png';
import FloatingMenu from '@/components/FloatingMenu';

export default function PriceHunterApp() {
  return (
    <section>
      {/* Header */}
      <header className="flex items-center justify-center p-2 mb-2 sm:mb-3 md:mb-4">
        <img
          src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
          alt="Price Hunter"
          className="h-20 px-4 rounded-2xl shadow-sm"
        />
        <div className="w-64">
          <div className="space-y-1 text-center">
            <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              <span>Price Hunter</span>
            </h1>
            <p className="text-xs text-left text-slate-400 sm:text-sm">
              Compara precios y encuentra las mejores ofertas
            </p>
          </div>
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

      {/* Menú flotante de aplicaciones */}
      <FloatingMenu
        items={[
          { id: 'freezer-app', label: 'Freezer App', href: '/', icon: '❄️' }
        ]}
      />
    </section>
  );
}
