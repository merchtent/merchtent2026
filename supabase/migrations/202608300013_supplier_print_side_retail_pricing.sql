alter table public.supplier_catalog_product_pricing
    add column if not exists additional_print_side_retail_cents integer;

update public.supplier_catalog_product_pricing
set additional_print_side_retail_cents = additional_print_side_cents
where additional_print_side_retail_cents is null;

alter table public.supplier_catalog_product_pricing
    drop constraint if exists supplier_catalog_product_pricing_print_side_retail_check;

alter table public.supplier_catalog_product_pricing
    add constraint supplier_catalog_product_pricing_print_side_retail_check
    check (additional_print_side_retail_cents is null or additional_print_side_retail_cents >= 0);
