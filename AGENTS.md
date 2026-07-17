# AGENTS.md — Freezer App

## Propósito de la aplicación

Freezer App es una aplicación personal de productividad del hogar compuesta por dos módulos:

1. **Freezer (Inventario)** — Lista de productos almacenados en casa (alimentos, limpieza, higiene). Permite conocer qué hay disponible antes de ir a comprar o cocinar. Incluye gestión de cantidades, filtros por categoría, búsqueda, lista de la compra (cesta) y acciones en lote con gestos swipe en móvil.

2. **Price Hunter (Comparador de precios)** — Historial de precios pagados en distintos supermercados. Permite comparar ofertas reales, identificar el mejor precio por unidad normalizada (kg, L, docena, unidad) y consultar el histórico por producto o supermercado.

Ambos módulos comparten autenticación y se navega entre ellos con botones flotantes (FAB).

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Astro (SSG/SPA) | 5.17 |
| UI | React | 19.2 |
| Lenguaje | TypeScript (strict) | 5.9 |
| Estilos | Tailwind CSS + PostCSS + Autoprefixer | 3.4 |
| Backend/BaaS | Supabase (PostgreSQL + Auth + RLS) | `@supabase/supabase-js` 2.95 |
| Animaciones | Framer Motion (`motion`) | 12.34 |
| Notificaciones | Sileo (toast) | 0.1.4 |

## Estructura del proyecto

```
freezer-app/
├── AGENTS.md                          # Este archivo
├── astro.config.mjs                   # Config Astro (React + Tailwind)
├── package.json                       # Dependencias y scripts
├── postcss.config.cjs                 # PostCSS (Tailwind + Autoprefixer)
├── tailwind.config.cjs                # Config Tailwind
├── tsconfig.json                      # TypeScript strict + alias @/*
├── supabase/
│   ├── schema.sql                     # Schema de la tabla products
│   └── migrations/
│       └── 20260215120000_*.sql       # RLS performance + índices
├── public/                            # Iconos estáticos (categorías, logo)
│   ├── Frieza-icon.png
│   ├── cart-icon.png
│   ├── cleaning-icon.png
│   ├── groceries-icon.png
│   └── higiene-icon.png
└── src/
    ├── pages/
    │   └── index.astro                # Punto de entrada único (SPA)
    ├── layouts/
    │   └── Layout.astro               # Shell HTML
    ├── styles/
    │   └── global.css                 # Tailwind + animaciones CSS
    ├── lib/                           # Capa de acceso a datos
    │   ├── supabaseClient.ts          # Cliente Supabase
    │   ├── products.ts                # CRUD productos (tabla `products`)
    │   └── priceHunter.ts             # CRUD precios + consultas (tabla `price_hunter_prices`)
    └── components/
        ├── AppShell.tsx               # Router interno (freezer | price-hunter)
        ├── FreezerApp.tsx             # Módulo inventario (vista principal)
        ├── PriceHunterApp.tsx         # Módulo comparador de precios
        ├── ProductForm.tsx            # Formulario crear/editar producto
        ├── ProductList.tsx            # Grid de productos con multi-selección
        ├── SwipeableProductCard.tsx   # Tarjeta con gestos swipe (móvil)
        ├── PriceForm.tsx              # Formulario crear/editar precio
        ├── PriceTable.tsx             # Tabla comparativa + historial
        ├── FloatingMenu.tsx           # Menú flotante de navegación
        └── auth/
            ├── LoginForm.tsx          # Formulario de inicio de sesión
            └── RegisterForm.tsx       # Formulario de registro
```

## Arquitectura

- **SPA cliente puro**: Astro genera un único HTML shell (`index.astro`). Toda la interactividad vive en React, hidratada con `client:load`.
- **Router interno**: `AppShell.tsx` alterna entre `"price-hunter"` (vista por defecto) y `"freezer"` vía estado de React. Sincroniza con `#freezer` / `?view=freezer` para deep linking.
- **Sin backend propio**: No hay API routes ni SSR data fetching. Todas las llamadas a Supabase se hacen desde el cliente con el SDK JS. La seguridad se garantiza con RLS (Row Level Security).
- **Estado local**: No hay librería de estado global (Redux, Zustand). Cada módulo gestiona su estado con `useState` + `useMemo` + `useEffect`.
- **Idioma**: Toda la UI está en español.

## Base de datos

### Tabla `products` (Inventario)

```sql
products (
  id            uuid PK DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  quantity      integer NOT NULL CHECK (quantity >= 0),
  quantity_unit text NOT NULL DEFAULT 'uds',  -- 'g', 'ml', 'uds'
  category      text,  -- 'Alimentación', 'Limpieza', 'Higiene'
  added_at      timestamptz NOT NULL DEFAULT now(),
  in_shopping_list boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
)
```

> **Nota**: El `schema.sql` del repo no incluye `category` ni `in_shopping_list`, pero existen en la BD en producción y en los tipos TypeScript.

### Tabla `price_hunter_prices` (Comparador de precios)

```sql
price_hunter_prices (
  id                 uuid PK DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name       text NOT NULL,
  brand              text,
  total_price        numeric NOT NULL,
  quantity           numeric NOT NULL,
  unit               text NOT NULL,  -- '1Kg', '1L', 'Docena', 'Unidad'
  supermarket        text NOT NULL,
  date               text NOT NULL,  -- ISO date string
  offer_type         text,  -- '2x1', '3x2', '50_second', 'custom', null
  offer_name         text,
  offer_description  text,
  created_at         timestamptz,
  updated_at         timestamptz
)
```

> **Nota**: El CREATE TABLE de esta tabla no está en el repo. Solo se encuentra referenciada en el código TypeScript y en la migración de índices/RLS.

### Seguridad (RLS)

Ambas tablas tienen RLS habilitado. Políticas optimizadas con `(select auth.uid())` para evaluación única:

- SELECT: `(select auth.uid()) = user_id`
- INSERT: `(select auth.uid()) = user_id` (WITH CHECK)
- UPDATE: `(select auth.uid()) = user_id` (USING + WITH CHECK)
- DELETE: `(select auth.uid()) = user_id`

### Índices de rendimiento

- `idx_products_user_id` en `products(user_id)`
- `idx_products_added_at` en `products(added_at DESC)`
- `idx_price_hunter_prices_supermarket` en `price_hunter_prices(supermarket)`

## Capa de datos (`src/lib/`)

### `supabaseClient.ts`
Crea y exporta el cliente Supabase usando las variables de entorno `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.

### `products.ts`

| Función | Descripción |
|---|---|
| `fetchProducts()` | Obtiene todos los productos del usuario, ordenados por `added_at DESC` |
| `createProduct(userId, input)` | Crea un nuevo producto |
| `updateProduct(id, input)` | Actualiza un producto existente |
| `deleteProduct(id)` | Elimina un producto |

**Tipos exportados**: `Product`, `ProductInput`, `ProductCategory` (`'Alimentación' | 'Limpieza' | 'Higiene'`)

### `priceHunter.ts`

| Función | Descripción |
|---|---|
| `fetchPrices()` | Obtiene todos los precios del usuario, ordenados por `date DESC` |
| `createPrice(userId, input)` | Crea un nuevo registro de precio |
| `updatePrice(id, input)` | Actualiza un registro existente |
| `deletePrice(id)` | Elimina un registro |
| `fetchUniqueProductNames()` | Nombres únicos de productos (para autocompletado) |
| `fetchUniqueBrands()` | Marcas únicas (para autocompletado) |
| `fetchUniqueSupermarkets()` | Supermercados únicos (para autocompletado) |
| `fetchPricesByProduct(name)` | Historial completo de precios de un producto |
| `fetchPricesBySupermarket(name)` | Todos los precios registrados en un supermercado |
| `calculateNormalizedPrice(totalPrice, quantity, unit)` | Calcula precio normalizado por unidad |

**Tipos exportados**: `PriceEntry`, `PriceInput`, `Unit` (`'1Kg' | '1L' | 'Docena' | 'Unidad'`), `OfferType`

## Funcionalidades clave

### Freezer (Inventario)

- **CRUD de productos** con formulario modal (nombre, cantidad, unidad, categoría, fecha).
- **Tres categorías** con iconos: Alimentación, Limpieza, Higiene. Filtros toggle.
- **Búsqueda en tiempo real** por nombre.
- **Lista de la compra (Cesta)**: toggle `in_shopping_list` por producto, filtro dedicado.
- **Multi-selección**: selección múltiple de productos para borrar en lote o añadir a la cesta.
- **Swipe gestures** (móvil): deslizar izquierda para editar/borrar, derecha para añadir a la cesta. Framer Motion para física de resorts.
- **Responsive**: grid de 1-3 columnas, diseño mobile-first con safe-area-inset.

### Price Hunter (Comparador de precios)

- **CRUD de precios** con formulario modal y campos con autocompletado.
- **Normalización de precios**: convierte a precio/kg, precio/L, precio/docena o precio/unidad para comparación justa.
- **Tabla inteligente**: muestra solo el mejor precio (más bajo normalizado) de los últimos 12 meses por producto. Fallback a histórico si no hay datos recientes.
- **Historial de precios**: al hacer clic en un producto se muestra el histórico completo con filtros (6m, 1 año, todo), estadísticas (min/avg/max) y mejor/peor supermercado.
- **Historial por supermercado**: muestra todos los productos comprados en un supermercado.
- **Ofertas**: soporta 2x1, 3x2, 50% segunda unidad y ofertas personalizadas (nombre + descripción).
- **Cruce entre módulos**: al registrar un precio, opción de añadir también el producto al inventario (Freezer).

## Variables de entorno

```env
PUBLIC_SUPABASE_URL=<url del proyecto Supabase>
PUBLIC_SUPABASE_ANON_KEY=<anon key de Supabase>
```

Definidas en `.env` (gitignored). Las variables con prefijo `PUBLIC_` están expuestas al cliente en Astro, lo cual es correcto ya que Supabase RLS garantiza la seguridad.

## Comandos

```bash
npm run dev      # Servidor de desarrollo (Astro)
npm run build    # Build de producción
npm run preview  # Preview del build de producción
```

No hay scripts de linting, formateo, typecheck ni testing configurados.

## Convenciones

- **Idioma**: toda la UI, mensajes y comentarios están en español.
- **Estilos**: clases utilitarias de Tailwind. Tema oscuro (slate/sky). Fondo con gradiente lineal repetido.
- **Animaciones**: Framer Motion para modales (scaleY), tarjetas, transiciones de lista. CSS animations en `global.css` para transiciones de vista.
- **Notificaciones**: librería Sileo para toasts (success, error, warning). Configurada con tema oscuro.
- **Touch targets**: mínimo 44x44px para accesibilidad móvil (`min-h-[44px] min-w-[44px]`).
- **TypeScript**: estricto. Path alias `@/*` -> `src/*`.
- **Módulos ES**: `"type": "module"` en `package.json`.

## Limitaciones conocidas

1. **Sin tests**: no hay framework de testing (vitest, jest, playwright, cypress) ni archivos de test.
2. **Schema incompleto en repo**: el `schema.sql` no incluye las columnas `category` e `in_shopping_list` de `products`, ni el CREATE TABLE de `price_hunter_prices`.
3. **Sin linting/formateo**: no hay ESLint, Prettier ni scripts relacionados.
4. **Sin CI/CD**: no hay configuración de GitHub Actions, Vercel o similar.
5. **`.env` en working tree**: aunque está gitignoreado, el archivo `.env` existe en el directorio de trabajo.

## Skills de agentes disponibles

En `.agents/skills/` hay referencias para asistentes IA:

- `supabase-postgres-best-practices` — Optimización de PostgreSQL, esquemas, RLS, consultas.
- `vercel-react-best-practices` — Optimización de React/Next.js, rendering, bundling.

En `.cursor/skills/` (específico de Cursor IDE):

- `ui-ux-pro-max` — Diseño UI/UX.
