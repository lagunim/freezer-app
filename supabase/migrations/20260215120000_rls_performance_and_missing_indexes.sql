-- =============================================================================
-- Supabase Postgres best practices: query performance + RLS performance
-- Ref: .cursor/skills/supabase-postgres-best-practices
-- =============================================================================

-- 1) Índice en FK y columna de RLS (query-missing-indexes, schema-foreign-key-indexes)
-- products: todas las consultas filtran por user_id vía RLS; FK sin índice
create index if not exists idx_products_user_id on public.products (user_id);

-- 2) Índice para ORDER BY added_at DESC (fetchProducts)
create index if not exists idx_products_added_at on public.products (added_at desc);

-- 3) Índice para filtro por supermarket (fetchPricesBySupermarket)
create index if not exists idx_price_hunter_prices_supermarket on public.price_hunter_prices (supermarket);

-- 4) RLS: usar (select auth.uid()) para evaluar una sola vez (security-rls-performance)
-- products: drop y recreate políticas
drop policy if exists "Products select own" on public.products;
drop policy if exists "Products insert own" on public.products;
drop policy if exists "Products update own" on public.products;
drop policy if exists "Products delete own" on public.products;

create policy "Products select own"
  on public.products for select
  using ((select auth.uid()) = user_id);

create policy "Products insert own"
  on public.products for insert
  with check ((select auth.uid()) = user_id);

create policy "Products update own"
  on public.products for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Products delete own"
  on public.products for delete
  using ((select auth.uid()) = user_id);

-- price_hunter_prices: drop y recreate políticas
drop policy if exists "Users can view own price entries" on public.price_hunter_prices;
drop policy if exists "Users can insert own price entries" on public.price_hunter_prices;
drop policy if exists "Users can update own price entries" on public.price_hunter_prices;
drop policy if exists "Users can delete own price entries" on public.price_hunter_prices;

create policy "Users can view own price entries"
  on public.price_hunter_prices for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own price entries"
  on public.price_hunter_prices for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own price entries"
  on public.price_hunter_prices for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own price entries"
  on public.price_hunter_prices for delete
  using ((select auth.uid()) = user_id);
