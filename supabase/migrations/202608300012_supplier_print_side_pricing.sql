alter table public.supplier_catalog_product_pricing
    add column if not exists included_print_sides integer not null default 1,
    add column if not exists additional_print_side_cents integer not null default 0;

alter table public.supplier_catalog_product_pricing
    drop constraint if exists supplier_catalog_product_pricing_print_sides_check;

alter table public.supplier_catalog_product_pricing
    add constraint supplier_catalog_product_pricing_print_sides_check
    check (
        included_print_sides between 1 and 2
        and additional_print_side_cents >= 0
    );
