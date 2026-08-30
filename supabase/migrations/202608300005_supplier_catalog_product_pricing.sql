create table if not exists public.supplier_catalog_product_pricing (
    id uuid primary key default gen_random_uuid(),
    supplier text not null,
    supplier_product_id text not null,
    default_price_cents integer not null default 3900,
    currency text not null default 'AUD',
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint supplier_catalog_product_pricing_supplier_check
        check (supplier in ('printify', 'printful', 'local')),
    constraint supplier_catalog_product_pricing_price_check
        check (default_price_cents > 0),
    constraint supplier_catalog_product_pricing_unique_product
        unique (supplier, supplier_product_id)
);

insert into public.supplier_catalog_product_pricing (
    supplier,
    supplier_product_id,
    default_price_cents,
    currency
)
select
    supplier,
    supplier_product_id,
    max(default_price_cents),
    coalesce(max(currency), 'AUD')
from public.supplier_catalog_products
group by supplier, supplier_product_id
on conflict (supplier, supplier_product_id) do nothing;

create index if not exists idx_supplier_catalog_product_pricing_lookup
    on public.supplier_catalog_product_pricing (supplier, supplier_product_id);

drop trigger if exists trg_supplier_catalog_product_pricing_updated_at on public.supplier_catalog_product_pricing;
create trigger trg_supplier_catalog_product_pricing_updated_at
before update on public.supplier_catalog_product_pricing
for each row execute function public.set_updated_at();

alter table public.supplier_catalog_product_pricing enable row level security;

drop policy if exists supplier_catalog_product_pricing_public_select on public.supplier_catalog_product_pricing;
create policy supplier_catalog_product_pricing_public_select
    on public.supplier_catalog_product_pricing
    for select
    to anon, authenticated
    using (true);

drop policy if exists supplier_catalog_product_pricing_admin_all on public.supplier_catalog_product_pricing;
create policy supplier_catalog_product_pricing_admin_all
    on public.supplier_catalog_product_pricing
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
