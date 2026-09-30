begin;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (char_length(trim(name)) between 1 and 80),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null
    references public.categories(id) on delete restrict,

  sku text not null unique
    check (char_length(trim(sku)) between 1 and 64),

  name text not null
    check (char_length(trim(name)) between 1 and 160),

  description text not null default '',
  price_paise integer not null check (price_paise > 0),

  sizes text[] not null default '{}'::text[],
  colors text[] not null default '{}'::text[],
  image_paths text[] not null default '{}'::text[],

  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_category_id_idx
  on public.products(category_id);

create index products_price_paise_idx
  on public.products(price_paise)
  where is_active = true;

create index products_created_at_idx
  on public.products(created_at desc)
  where is_active = true;

alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Set explicit privileges for application users.
revoke all on public.categories, public.products
  from PUBLIC, anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.categories, public.products
  to anon;

grant select, insert, update, delete
  on public.categories, public.products
  to authenticated;

-- Everyone can browse categories.
create policy "Anyone can read categories"
  on public.categories
  for select
  to anon, authenticated
  using (true);

-- Visitors and customers can browse published products.
create policy "Anyone can read active products"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

-- Administrators can read and manage all categories.
create policy "Admins can manage categories"
  on public.categories
  for all
  to authenticated
  using (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
  with check (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  );

-- Administrators can also access unpublished products.
create policy "Admins can manage products"
  on public.products
  for all
  to authenticated
  using (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  )
  with check (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  );

insert into public.categories (name, slug)
values
  ('Oversized Tees', 'oversized-tees'),
  ('Graphic Tees', 'graphic-tees'),
  ('Essential Tees', 'essential-tees'),
  ('Cargo Shorts', 'cargo-shorts'),
  ('Denim Shorts', 'denim-shorts'),
  ('Active Shorts', 'active-shorts');

commit;