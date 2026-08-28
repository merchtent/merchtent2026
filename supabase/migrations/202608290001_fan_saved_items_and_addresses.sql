create table if not exists public.saved_artists (
    user_id uuid not null references public.profiles(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, artist_id)
);

create table if not exists public.wishlisted_products (
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, product_id)
);

create table if not exists public.customer_addresses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    label text not null default 'Default',
    first_name text not null,
    last_name text not null,
    line1 text not null,
    line2 text,
    city text not null,
    state text not null,
    postal_code text not null,
    country text not null default 'AU',
    phone text,
    is_default boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint customer_addresses_country_check check (country ~ '^[A-Z]{2}$'),
    constraint customer_addresses_label_check check (length(btrim(label)) between 1 and 80),
    constraint customer_addresses_first_name_check check (length(btrim(first_name)) between 1 and 80),
    constraint customer_addresses_last_name_check check (length(btrim(last_name)) between 1 and 80),
    constraint customer_addresses_line1_check check (length(btrim(line1)) between 3 and 160),
    constraint customer_addresses_line2_check check (line2 is null or length(btrim(line2)) <= 160),
    constraint customer_addresses_city_check check (length(btrim(city)) between 1 and 100),
    constraint customer_addresses_state_check check (length(btrim(state)) between 1 and 100),
    constraint customer_addresses_postal_code_check check (length(btrim(postal_code)) between 2 and 20),
    constraint customer_addresses_phone_check check (phone is null or length(btrim(phone)) <= 40)
);

create unique index if not exists customer_addresses_one_default_per_user
    on public.customer_addresses(user_id)
    where is_default;

create index if not exists saved_artists_artist_id_idx on public.saved_artists(artist_id);
create index if not exists wishlisted_products_product_id_idx on public.wishlisted_products(product_id);
create index if not exists customer_addresses_user_id_idx on public.customer_addresses(user_id);

alter table public.saved_artists enable row level security;
alter table public.wishlisted_products enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists saved_artists_select_own_or_admin on public.saved_artists;
create policy saved_artists_select_own_or_admin
    on public.saved_artists
    for select
    using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists saved_artists_insert_own on public.saved_artists;
create policy saved_artists_insert_own
    on public.saved_artists
    for insert
    with check (user_id = (select auth.uid()));

drop policy if exists saved_artists_delete_own_or_admin on public.saved_artists;
create policy saved_artists_delete_own_or_admin
    on public.saved_artists
    for delete
    using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists wishlisted_products_select_own_or_admin on public.wishlisted_products;
create policy wishlisted_products_select_own_or_admin
    on public.wishlisted_products
    for select
    using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists wishlisted_products_insert_own on public.wishlisted_products;
create policy wishlisted_products_insert_own
    on public.wishlisted_products
    for insert
    with check (user_id = (select auth.uid()));

drop policy if exists wishlisted_products_delete_own_or_admin on public.wishlisted_products;
create policy wishlisted_products_delete_own_or_admin
    on public.wishlisted_products
    for delete
    using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists customer_addresses_select_own_or_admin on public.customer_addresses;
create policy customer_addresses_select_own_or_admin
    on public.customer_addresses
    for select
    using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists customer_addresses_insert_own on public.customer_addresses;
create policy customer_addresses_insert_own
    on public.customer_addresses
    for insert
    with check (user_id = (select auth.uid()));

drop policy if exists customer_addresses_update_own_or_admin on public.customer_addresses;
create policy customer_addresses_update_own_or_admin
    on public.customer_addresses
    for update
    using (user_id = (select auth.uid()) or public.is_admin())
    with check (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists customer_addresses_delete_own_or_admin on public.customer_addresses;
create policy customer_addresses_delete_own_or_admin
    on public.customer_addresses
    for delete
    using (user_id = (select auth.uid()) or public.is_admin());
