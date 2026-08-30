create table if not exists public.product_supplier_routes (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    product_design_id uuid not null references public.product_designs(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    supplier text not null,
    supplier_product_id text not null,
    supplier_provider_id text not null,
    supplier_provider_name text,
    supplier_external_product_id text,
    sync_status text not null default 'not_synced',
    sync_payload jsonb,
    last_error text,
    synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint product_supplier_routes_supplier_check
        check (supplier in ('printify', 'printful', 'local')),
    constraint product_supplier_routes_sync_status_check
        check (sync_status in ('not_synced', 'syncing', 'synced', 'failed')),
    constraint product_supplier_routes_unique_provider
        unique (product_design_id, supplier, supplier_provider_id)
);

create index if not exists idx_product_supplier_routes_product
    on public.product_supplier_routes (product_id);

create index if not exists idx_product_supplier_routes_status
    on public.product_supplier_routes (sync_status, updated_at desc);

drop trigger if exists trg_product_supplier_routes_updated_at on public.product_supplier_routes;
create trigger trg_product_supplier_routes_updated_at
before update on public.product_supplier_routes
for each row execute function public.set_updated_at();

alter table public.product_supplier_routes enable row level security;

drop policy if exists product_supplier_routes_select_owner_or_admin on public.product_supplier_routes;
create policy product_supplier_routes_select_owner_or_admin
    on public.product_supplier_routes
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop policy if exists product_supplier_routes_admin_all on public.product_supplier_routes;
create policy product_supplier_routes_admin_all
    on public.product_supplier_routes
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
