# AGENTS.md — Freezer App

## 1. Resumen

App personal de hogar: inventario (Freezer) + historial/comparador de precios pagados (Price Hunter); auth compartida; navegación FAB.
SPA cliente puro: Astro 5.17 SSG + React 19 (`client:load`) + TS strict 5.9 + Tailwind 3.4. Sin API routes ni SSR data fetching.
BaaS Supabase (Postgres + Auth + RLS) vía `@supabase/supabase-js`. El anon key es público; la seguridad es RLS.
Price Hunter compara € normalizado (€/kg, €/L, €/docena, €/ud); escáner EAN (`html5-qrcode`) + lookup OFF (Open Food/Beauty/Products Facts).
Acrónimos: FAB = botón flotante; RLS = Row Level Security; OFF = Open Food Facts; SSG = static site generation.

## 2. Estructura

- `astro.config.mjs` — Astro + React + Tailwind
- `package.json` — scripts/deps; `"type": "module"`
- `tsconfig.json` — strict; alias `@/*` → `src/*`
- `tailwind.config.cjs` / `postcss.config.cjs` — CSS
- `src/pages/index.astro` — único HTML; hidrata `AppShell` con `client:load`
- `src/layouts/Layout.astro` — shell HTML (`lang=es`)
- `src/styles/global.css` — Tailwind + animaciones de cambio de vista
- `src/components/AppShell.tsx` — auth, router interno, header, FAB
- `src/components/FreezerApp.tsx` / `PriceHunterApp.tsx` — módulos (sin auth)
- `src/components/` — UI (forms, listas, scanner, auth/)
- `src/lib/` — cliente Supabase, CRUD, `useAuth`, `useScrollLock`, `utils`, OFF
- `supabase/schema.sql` — incompleto (solo `products` antiguo); no usar como fuente
- `supabase/migrations/` — schema vigente (RLS, índices, `product_prices`)
- `public/` — iconos estáticos
- `.agents/skills/` + `.cursor/skills/` — Postgres / React / UI

## 3. Convenciones y arquitectura

- No backend propio ni API routes. CRUD desde el cliente. No añadir store global (Redux/Zustand).
- Auth centralizada: `useAuth` solo en `AppShell`. `FreezerApp` / `PriceHunterApp` reciben `user` por props.
- Router interno: `AppView` `"price-hunter"` (default) | `"freezer"`. Deep link `#freezer` o `?view=freezer`; sync con `history.replaceState` → `/#freezer` | `/#price-hunter`.
- Imports: alias `@/` hacia `src/`. Componentes: default export. Tipos y CRUD: named exports en `src/lib/*`.
- Errores: `src/lib/*` lanza el error de Supabase; la UI captura y muestra Sileo (`sileo.success|error|warning`).
- Idioma: UI, toasts y comentarios en español. Precios EUR (`formatPrice` en `src/lib/utils.ts`).
- Estilos: Tailwind utility-first, tema oscuro slate/sky. Motion (`motion`) para modales/listas; CSS en `global.css` para transiciones de vista.
- Móvil: touch ≥44px (`min-h-[44px] min-w-[44px]`). `<input|select|textarea>` con `text-base` (≥16px) para no zoom iOS.
- Utils: `normalizeStr`, `formatDate`, `toDateInputValue`, `formatPrice`. Búsqueda: `SearchInput`. Modales: `useScrollLock`.
- Env (`.env` gitignored): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`. Prefijo `PUBLIC_` es intencional (Astro las expone al cliente).
- Tablas vigentes (no copiar DDL; ver tipos + migrations):
  - `products` — inventario: `quantity_unit` `g|ml|uds`; `category` `Alimentación|Limpieza|Higiene`; `in_shopping_list`
  - `product_prices` — catálogo PH: nombre, marca, quantity, `unit` `Kg|L|Docena|Unidad`, `bar_code`
  - `price_hunter_prices` — FK `product_prices_id`, `total_price`, supermarket, `date` (ISO text), oferta `2x1|3x2|50_second|custom`
- RLS en las 3: `(select auth.uid()) = user_id` en SELECT/INSERT/UPDATE/DELETE. No relajar ni usar `auth.uid()` crudo en políticas nuevas.
- `PriceEntry` = join aplanado para UI. Crear precio exige `product_prices_id` (crear/reusar fila en `product_prices` antes).
- Unidades de inventario ≠ unidades PH. No denormalizar nombre/marca/cantidad otra vez en `price_hunter_prices`.
- `schema.sql` desfasado (faltan `category`, `in_shopping_list` y las tablas PH). Fuente de verdad: tipos en `src/lib/*.ts` + `supabase/migrations/`.
- No añadir ESLint/Prettier/tests/CI salvo que se pida.

## 4. Comandos

- `npm install` — deps
- `npm run dev` — servidor Astro
- `npm run build` — build producción
- `npm run preview` — preview del build
- Setup: `.env` con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
- No hay `test`, `lint` ni `typecheck`

## 5. Puntos de entrada

Leer al empezar un chat:

- `AGENTS.md`
- `src/pages/index.astro` + `src/components/AppShell.tsx`
- Módulo: `src/components/FreezerApp.tsx` o `src/components/PriceHunterApp.tsx`
- Datos: `src/lib/products.ts` | `src/lib/productPrices.ts` | `src/lib/priceHunter.ts`
- Schema: tipos en `src/lib/*.ts` + `supabase/migrations/`
- UI/DB skills: `.agents/skills/vercel-react-best-practices/SKILL.md`, `.agents/skills/supabase-postgres-best-practices/SKILL.md`, `.cursor/skills/ui-ux-pro-max` si toca UI
