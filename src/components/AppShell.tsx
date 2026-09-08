import { useEffect, useRef, useState, type TransitionEvent } from "react";
import { useAuth } from "@/lib/useAuth";
import FreezerApp, { type FreezerAppHandle } from "@/components/FreezerApp";
import PriceHunterApp, {
  type PriceHunterAppHandle,
} from "@/components/PriceHunterApp";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import FriezaIcon from "@/public/Frieza-icon.png";
import AppChrome from "@/components/AppChrome";
import { Toaster, sileo } from "sileo";

export type AppView = "freezer" | "price-hunter";

function getInitialView(): AppView {
  if (typeof window === "undefined") return "price-hunter";
  const hash = window.location.hash?.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  if (hash === "#freezer" || params.get("view") === "freezer") {
    return "freezer";
  }
  return "price-hunter";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type AuthView = "login" | "register";

export default function AppShell() {
  const { auth, handleLogout } = useAuth();
  const [view, setView] = useState<AppView>(getInitialView);
  const [isSliding, setIsSliding] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const freezerRef = useRef<FreezerAppHandle>(null);
  const priceHunterRef = useRef<PriceHunterAppHandle>(null);

  useEffect(() => {
    const target = view === "freezer" ? "/#freezer" : "/#price-hunter";
    const current =
      window.location.pathname + window.location.search + window.location.hash;
    if (current !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [view]);

  useEffect(() => {
    if (auth.user) setError(null);
  }, [auth.user]);

  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [message, error]);

  const switchView = (next: AppView) => {
    if (next === view) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    window.scrollTo(0, 0);
    if (!prefersReducedMotion()) setIsSliding(true);
    setView(next);
  };

  const handleTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "transform") return;
    setIsSliding(false);
  };

  useEffect(() => {
    if (!isSliding) return;
    const t = window.setTimeout(() => setIsSliding(false), 850);
    return () => window.clearTimeout(t);
  }, [isSliding]);

  const handleAuthError = (msg: string) => {
    sileo.error({ title: msg });
    setError(msg);
    setMessage(null);
  };

  const handleRegistered = (msg: string) => {
    sileo.success({ title: msg });
    setMessage(msg);
    setError(null);
    setAuthView("login");
  };

  const handleLogoutAndClear = async () => {
    setError(null);
    setMessage(null);
    await handleLogout();
  };

  const focusActiveSearch = () => {
    if (view === "freezer") freezerRef.current?.focusSearch();
    else priceHunterRef.current?.focusSearch();
  };

  const openActiveCreate = () => {
    if (view === "freezer") freezerRef.current?.openCreateForm();
    else priceHunterRef.current?.openCreateForm();
  };

  if (auth.loading) {
    return (
      <section>
        <header className="flex items-center justify-center p-2 mb-2 sm:mb-3 md:mb-4">
          <img
            src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
            alt="Freezer App"
            className="h-20 px-4 rounded-2xl shadow-sm"
          />
          <div className="w-64">
            <div className="space-y-1 text-center">
              <h1 className="text-left gap-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                <span>Freezer App</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Cargando sesión de Supabase…
              </p>
            </div>
          </div>
        </header>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>Un momento…</p>
        </div>
      </section>
    );
  }

  if (!auth.session || !auth.user) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center p-4">
        <header className="mb-8 flex items-center justify-center">
          <img
            src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
            alt="Freezer App"
            className="h-20 rounded-2xl px-4 shadow-sm"
          />
          <div className="w-64">
            <div className="space-y-1 text-center">
              <h1 className="gap-3 text-left text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                <span>Freezer App</span>
              </h1>
              <p className="text-left text-xs text-slate-400 sm:text-sm">
                Identifícate para gestionar tu congelador.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/50">
          <div className="mb-4 flex rounded-lg bg-slate-800/80 p-0.5 text-xs font-medium text-slate-300">
            <button
              type="button"
              onClick={() => {
                setAuthView("login");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md px-2 py-1 transition ${
                authView === "login"
                  ? "bg-slate-950 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthView("register");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md px-2 py-1 transition ${
                authView === "register"
                  ? "bg-slate-950 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {authView === "login" ? (
            <LoginForm onAuthError={handleAuthError} />
          ) : (
            <RegisterForm
              onAuthError={handleAuthError}
              onRegistered={handleRegistered}
            />
          )}
        </div>
      </section>
    );
  }

  const freezerActive = view === "freezer";

  return (
    <>
      <section>
        <header className="flex items-center justify-between p-2 mb-2 sm:mb-3 md:mb-4">
          <div className="flex items-center">
            <img
              src={FriezaIcon.src ?? (FriezaIcon as unknown as string)}
              alt={freezerActive ? "Freezer App" : "Price Hunter"}
              className="h-20 px-4 rounded-2xl shadow-sm"
            />
            <div className="w-64">
              <div className="space-y-1 text-center">
                <h1 className="relative min-h-[1.75rem] text-left text-2xl font-semibold tracking-tight text-slate-50 sm:min-h-[2.25rem] sm:text-3xl">
                  <span
                    className={`inline-block transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      freezerActive ? "opacity-100" : "pointer-events-none absolute left-0 top-0 opacity-0"
                    }`}
                  >
                    Freezer App
                  </span>
                  <span
                    className={`inline-block transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      freezerActive ? "pointer-events-none absolute left-0 top-0 opacity-0" : "opacity-100"
                    }`}
                  >
                    Price Hunter
                  </span>
                </h1>
                <p className="text-xs text-left text-slate-400 sm:text-sm">
                  {auth.user.email ?? "usuario sin email"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogoutAndClear}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-slate-700/40 backdrop-blur-xl text-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-slate-700/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </header>

        <div className="app-view-viewport">
          <div
            className={`app-view-track${view === "price-hunter" ? " is-price-hunter" : ""}${isSliding ? " is-sliding" : ""}`}
            onTransitionEnd={handleTrackTransitionEnd}
          >
            <div
              className={`app-view-panel${!freezerActive && !isSliding ? " is-idle-hidden" : ""}`}
              aria-hidden={!freezerActive}
              inert={!freezerActive}
            >
              <FreezerApp user={auth.user} ref={freezerRef} />
            </div>
            <div
              className={`app-view-panel${freezerActive && !isSliding ? " is-idle-hidden" : ""}`}
              aria-hidden={freezerActive}
              inert={freezerActive}
            >
              <PriceHunterApp user={auth.user} ref={priceHunterRef} />
            </div>
          </div>
        </div>
      </section>

      <AppChrome
        view={view}
        onSwitch={() =>
          switchView(freezerActive ? "price-hunter" : "freezer")
        }
        onSearch={focusActiveSearch}
        onAdd={openActiveCreate}
        onScan={() => priceHunterRef.current?.openScanner()}
      />
      <Toaster
        position="top-center"
        options={{
          fill: "#1e293b",
          roundness: 16,
          styles: {
            title: "text-slate-100!",
            description: "text-slate-400!",
            badge: "bg-white/10!",
            button: "bg-white/10! hover:bg-white/15!",
          },
        }}
      />
    </>
  );
}
