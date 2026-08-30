alter table public.supplier_catalog_product_pricing
    add column if not exists artist_profit_cents integer not null default 800,
    add column if not exists platform_profit_cents integer not null default 700;

alter table public.supplier_catalog_product_pricing
    drop constraint if exists supplier_catalog_product_pricing_profit_check;

alter table public.supplier_catalog_product_pricing
    add constraint supplier_catalog_product_pricing_profit_check
    check (artist_profit_cents >= 0 and platform_profit_cents >= 0);
