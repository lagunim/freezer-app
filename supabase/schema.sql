-- Configuración de Supabase para la app "freezer"
-- Ejecuta este script en el panel de Supabase:
-- SQL -> New query -> pega este contenido -> Run

-- Extensión para generar UUIDs (suele venir ya creada, pero por si acaso)
create extension if not exists "pgcrypto";

-- Tabla de productos del congelador
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity integer not null check (quantity >= 0),
  quantity_unit text not null default 'uds',
  added_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz
);

comment on table public.products is 'Productos del congelador, por usuario';
comment on column public.products.user_id is 'Id de usuario (auth.users.id)';
comment on column public.products.added_at is 'Fecha de alta del producto en el congelador';

-- Asegurarnos de que RLS esté activado
alter table public.products enable row level security;

-- Eliminar políticas anteriores si existen (evita errores al re-ejecutar el script)
drop policy if exists "Products select own" on public.products;
drop policy if exists "Products insert own" on public.products;
drop policy if exists "Products update own" on public.products;
drop policy if exists "Products delete own" on public.products;

-- Política: cada usuario solo puede ver sus propios productos
create policy "Products select own"
  on public.products
  for select
  using (auth.uid() = user_id);

-- Política: cada usuario solo puede insertar productos para sí mismo
create policy "Products insert own"
  on public.products
  for insert
  with check (auth.uid() = user_id);

-- Política: cada usuario solo puede actualizar sus propios productos
create policy "Products update own"
  on public.products
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Política: cada usuario solo puede borrar sus propios productos
create policy "Products delete own"
  on public.products
  for delete
  using (auth.uid() = user_id);

