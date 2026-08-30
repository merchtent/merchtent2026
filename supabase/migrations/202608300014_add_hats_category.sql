alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_category_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_category_check
    check (category in ('tees', 'hoodies', 'hats', 'tanks', 'posters', 'vinyl', 'accessories', 'other'));
