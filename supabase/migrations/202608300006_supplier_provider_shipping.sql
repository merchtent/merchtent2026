create table if not exists public.supplier_catalog_provider_shipping (
    id uuid primary key default gen_random_uuid(),
    catalog_product_id uuid not null references public.supplier_catalog_products(id) on delete cascade,
    supplier text not null,
    supplier_product_id text not null,
    supplier_provider_id text not null,
    destination_country text not null default 'AU',
    shipping_method text not null default 'standard',
    delivery_time_label text,
    size_type_label text not null default 'All',
    first_item_cents integer,
    additional_item_cents integer,
    currency text not null default 'AUD',
    raw_supplier_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint supplier_catalog_provider_shipping_supplier_check
        check (supplier in ('printify', 'printful', 'local')),
    constraint supplier_catalog_provider_shipping_cost_check
        check (
            (first_item_cents is null or first_item_cents >= 0)
            and (additional_item_cents is null or additional_item_cents >= 0)
        ),
    constraint supplier_catalog_provider_shipping_unique_route
        unique (
            catalog_product_id,
            destination_country,
            shipping_method,
            size_type_label
        )
);

create index if not exists idx_supplier_catalog_provider_shipping_lookup
    on public.supplier_catalog_provider_shipping (
        supplier,
        supplier_product_id,
        supplier_provider_id,
        destination_country,
        shipping_method
    );

drop trigger if exists trg_supplier_catalog_provider_shipping_updated_at on public.supplier_catalog_provider_shipping;
create trigger trg_supplier_catalog_provider_shipping_updated_at
before update on public.supplier_catalog_provider_shipping
for each row execute function public.set_updated_at();

alter table public.supplier_catalog_provider_shipping enable row level security;

drop policy if exists supplier_catalog_provider_shipping_public_active_product_select on public.supplier_catalog_provider_shipping;
create policy supplier_catalog_provider_shipping_public_active_product_select
    on public.supplier_catalog_provider_shipping
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.supplier_catalog_products scp
            where scp.id = supplier_catalog_provider_shipping.catalog_product_id
              and scp.status = 'active'
        )
    );

drop policy if exists supplier_catalog_provider_shipping_admin_all on public.supplier_catalog_provider_shipping;
create policy supplier_catalog_provider_shipping_admin_all
    on public.supplier_catalog_provider_shipping
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
