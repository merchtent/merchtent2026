create table if not exists public.supplier_catalog_products (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'active',
    supplier text not null,
    supplier_product_id text not null,
    supplier_product_name text not null,
    supplier_brand text,
    supplier_model text,
    supplier_provider_id text,
    supplier_provider_name text,
    supplier_product_url text,
    merch_tent_name text not null,
    category text not null default 'other',
    garment_kind text not null default 'tee',
    default_price_cents integer not null default 3900,
    currency text not null default 'AUD',
    automation_mode text not null default 'create_on_sale',
    print_areas jsonb not null default '{}'::jsonb,
    colors jsonb not null default '[]'::jsonb,
    sizes jsonb not null default '[]'::jsonb,
    production_data jsonb not null default '{}'::jsonb,
    raw_supplier_data jsonb not null default '{}'::jsonb,
    imported_by uuid references auth.users(id) on delete set null,
    imported_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint supplier_catalog_products_status_check
        check (status in ('draft', 'active', 'archived')),
    constraint supplier_catalog_products_supplier_check
        check (supplier in ('printify', 'printful', 'local')),
    constraint supplier_catalog_products_category_check
        check (category in ('tees', 'hoodies', 'tanks', 'posters', 'vinyl', 'accessories', 'other')),
    constraint supplier_catalog_products_garment_kind_check
        check (garment_kind in ('tee', 'hoodie')),
    constraint supplier_catalog_products_automation_mode_check
        check (automation_mode in ('create_on_sale', 'manual_order', 'local_fulfilment')),
    constraint supplier_catalog_products_unique_source
        unique (supplier, supplier_product_id, supplier_provider_id)
);

create index if not exists idx_supplier_catalog_products_status_category
    on public.supplier_catalog_products (status, category, created_at desc);

create table if not exists public.supplier_catalog_variants (
    id uuid primary key default gen_random_uuid(),
    catalog_product_id uuid not null references public.supplier_catalog_products(id) on delete cascade,
    supplier_variant_id text not null,
    supplier_variant_title text,
    sku text,
    size_label text,
    color_label text,
    cost_cents integer,
    price_cents integer,
    currency text not null default 'AUD',
    grams integer,
    is_enabled boolean not null default true,
    print_areas jsonb not null default '[]'::jsonb,
    shipping_profiles jsonb not null default '[]'::jsonb,
    raw_supplier_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint supplier_catalog_variants_unique_source
        unique (catalog_product_id, supplier_variant_id)
);

create index if not exists idx_supplier_catalog_variants_catalog_product
    on public.supplier_catalog_variants (catalog_product_id);

create index if not exists idx_supplier_catalog_variants_lookup
    on public.supplier_catalog_variants (catalog_product_id, size_label, color_label)
    where is_enabled = true;

drop trigger if exists trg_supplier_catalog_products_updated_at on public.supplier_catalog_products;
create trigger trg_supplier_catalog_products_updated_at
before update on public.supplier_catalog_products
for each row execute function public.set_updated_at();

drop trigger if exists trg_supplier_catalog_variants_updated_at on public.supplier_catalog_variants;
create trigger trg_supplier_catalog_variants_updated_at
before update on public.supplier_catalog_variants
for each row execute function public.set_updated_at();

alter table public.supplier_catalog_products enable row level security;
alter table public.supplier_catalog_variants enable row level security;

drop policy if exists supplier_catalog_products_public_active_select on public.supplier_catalog_products;
create policy supplier_catalog_products_public_active_select
    on public.supplier_catalog_products
    for select
    to anon, authenticated
    using (status = 'active');

drop policy if exists supplier_catalog_products_admin_all on public.supplier_catalog_products;
create policy supplier_catalog_products_admin_all
    on public.supplier_catalog_products
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists supplier_catalog_variants_public_active_product_select on public.supplier_catalog_variants;
create policy supplier_catalog_variants_public_active_product_select
    on public.supplier_catalog_variants
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.supplier_catalog_products scp
            where scp.id = supplier_catalog_variants.catalog_product_id
              and scp.status = 'active'
        )
    );

drop policy if exists supplier_catalog_variants_admin_all on public.supplier_catalog_variants;
create policy supplier_catalog_variants_admin_all
    on public.supplier_catalog_variants
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
