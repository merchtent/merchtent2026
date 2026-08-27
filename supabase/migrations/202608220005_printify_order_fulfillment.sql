alter table if exists public.order_items
    add column if not exists size_label text;

create table if not exists public.product_printify_variants (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    printify_product_id text not null,
    printify_variant_id integer not null,
    title text,
    size_label text,
    color_label text,
    sku text,
    is_enabled boolean not null default true,
    raw_variant jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, printify_variant_id)
);

create index if not exists idx_product_printify_variants_product
    on public.product_printify_variants (product_id);

create index if not exists idx_product_printify_variants_lookup
    on public.product_printify_variants (product_id, size_label, color_label);

alter table public.product_printify_variants enable row level security;

drop policy if exists product_printify_variants_select_owner_or_admin on public.product_printify_variants;
create policy product_printify_variants_select_owner_or_admin
    on public.product_printify_variants
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop trigger if exists trg_product_printify_variants_updated_at on public.product_printify_variants;
create trigger trg_product_printify_variants_updated_at
before update on public.product_printify_variants
for each row execute function public.set_updated_at();

create table if not exists public.printify_order_syncs (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    status text not null,
    printify_order_id text,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    attempted_at timestamptz,
    succeeded_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (order_id)
);

alter table public.printify_order_syncs enable row level security;

drop policy if exists printify_order_syncs_select_customer_or_admin on public.printify_order_syncs;
create policy printify_order_syncs_select_customer_or_admin
    on public.printify_order_syncs
    for select
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.orders o
            where o.id = printify_order_syncs.order_id
              and o.user_id = auth.uid()
        )
    );

drop trigger if exists trg_printify_order_syncs_updated_at on public.printify_order_syncs;
create trigger trg_printify_order_syncs_updated_at
before update on public.printify_order_syncs
for each row execute function public.set_updated_at();
