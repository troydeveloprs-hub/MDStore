create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  image text not null default '',
  description text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists products_created_at_idx
  on public.products (created_at desc);

alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products
  for select
  using (true);

drop policy if exists "Public can manage products" on public.products;
create policy "Public can manage products"
  on public.products
  for all
  using (true)
  with check (true);

-- Replace the policy above with authenticated admin-only policies before production.
-- Example:
-- create policy "Admins can insert products"
--   on public.products
--   for insert
--   to authenticated
--   with check (lower(auth.jwt() ->> 'email') in ('admin@example.com'));
--
-- create policy "Admins can update products"
--   on public.products
--   for update
--   to authenticated
--   using (lower(auth.jwt() ->> 'email') in ('admin@example.com'))
--   with check (lower(auth.jwt() ->> 'email') in ('admin@example.com'));
--
-- create policy "Admins can delete products"
--   on public.products
--   for delete
--   to authenticated
--   using (lower(auth.jwt() ->> 'email') in ('admin@example.com'));
