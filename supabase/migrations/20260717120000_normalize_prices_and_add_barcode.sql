-- =============================================================================
-- Migración: Normalización de precios + Soporte código de barras
-- Fecha: 2026-07-17
-- Descripción:
--   1. Crea la tabla `product_prices` (datos inmutables de producto)
--   2. Migra datos existentes de `price_hunter_prices`
--   3. Añade FK `product_prices_id` a `price_hunter_prices`
--   4. Elimina columnas obsoletas
--   5. Añade índices y RLS
-- =============================================================================

-- 1) Crear tabla product_prices
create table if not exists public.product_prices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_name    text not null,
  brand           text,
  quantity        numeric not null,
  unit            text not null,  -- '1Kg', '1L', 'Docena', 'Unidad'
  bar_code        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.product_prices is 'Datos inmutables de producto para Price Hunter (nombre, marca, cantidad, unidad, código de barras)';
comment on column public.product_prices.bar_code is 'Código de barras EAN/UPC del producto';

-- 2) RLS para product_prices
alter table public.product_prices enable row level security;

drop policy if exists "Product prices select own" on public.product_prices;
drop policy if exists "Product prices insert own" on public.product_prices;
drop policy if exists "Product prices update own" on public.product_prices;
drop policy if exists "Product prices delete own" on public.product_prices;

create policy "Product prices select own"
  on public.product_prices for select
  using ((select auth.uid()) = user_id);

create policy "Product prices insert own"
  on public.product_prices for insert
  with check ((select auth.uid()) = user_id);

create policy "Product prices update own"
  on public.product_prices for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Product prices delete own"
  on public.product_prices for delete
  using ((select auth.uid()) = user_id);

-- 3) Índices para product_prices
create index if not exists idx_product_prices_user_id on public.product_prices (user_id);
create index if not exists idx_product_prices_bar_code on public.product_prices (bar_code);
create index if not exists idx_product_prices_unique_product
  on public.product_prices (user_id, product_name, brand, quantity, unit);

-- 4) Migrar datos: insertar productos únicos en product_prices
--    Agrupa por user_id + product_name + brand + quantity + unit para evitar duplicados
insert into public.product_prices (user_id, product_name, brand, quantity, unit, created_at)
select distinct on (p.user_id, p.product_name, p.brand, p.quantity, p.unit)
  p.user_id,
  p.product_name,
  p.brand,
  p.quantity,
  p.unit,
  p.created_at
from public.price_hunter_prices p
on conflict do nothing;

-- 5) Añadir columna product_prices_id a price_hunter_prices
alter table public.price_hunter_prices
  add column if not exists product_prices_id uuid;

-- 6) Actualizar product_prices_id usando los datos migrados
update public.price_hunter_prices ph
set product_prices_id = (
  select pp.id
  from public.product_prices pp
  where pp.user_id = ph.user_id
    and pp.product_name = ph.product_name
    and pp.brand is not distinct from ph.brand
    and pp.quantity = ph.quantity
    and pp.unit = ph.unit
  limit 1
);

-- 7) Hacer NOT NULL la FK y añadir constraint
alter table public.price_hunter_prices
  alter column product_prices_id set not null;

alter table public.price_hunter_prices
  add constraint fk_price_hunter_product_prices
  foreign key (product_prices_id) references public.product_prices(id)
  on delete cascade;

-- 8) Eliminar columnas obsoletas de price_hunter_prices
alter table public.price_hunter_prices drop column if exists product_name;
alter table public.price_hunter_prices drop column if exists brand;
alter table public.price_hunter_prices drop column if exists quantity;
alter table public.price_hunter_prices drop column if exists unit;

-- 9) Índices de rendimiento para price_hunter_prices (actualizados)
create index if not exists idx_price_hunter_product_prices_id
  on public.price_hunter_prices (product_prices_id);
