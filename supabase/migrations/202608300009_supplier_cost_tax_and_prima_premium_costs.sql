alter table public.supplier_catalog_products
    add column if not exists cost_tax_mode text not null default 'unknown',
    add column if not exists cost_tax_region text,
    add column if not exists cost_tax_rate_bps integer;

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_cost_tax_mode_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_cost_tax_mode_check
    check (cost_tax_mode in ('unknown', 'ex_gst', 'inc_gst', 'not_applicable'));

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_cost_tax_rate_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_cost_tax_rate_check
    check (cost_tax_rate_bps is null or cost_tax_rate_bps between 0 and 10000);

update public.supplier_catalog_products
set
    cost_tax_mode = 'ex_gst',
    cost_tax_region = 'AU',
    cost_tax_rate_bps = 1000
where supplier = 'printify';

update public.supplier_catalog_variants variant
set cost_cents = case
    when variant.color_label = 'White' and variant.size_label in ('S', 'M', 'L', 'XL') then 1105
    when variant.color_label = 'White' and variant.size_label in ('2XL', '3XL') then 1302
    when variant.color_label in ('Sport Grey', 'Black', 'Light Blue') and variant.size_label in ('S', 'M', 'L', 'XL') then 1419
    when variant.color_label in ('Sport Grey', 'Black', 'Light Blue') and variant.size_label in ('2XL', '3XL') then 1621
    when variant.color_label in ('Dark Heather', 'Red') and variant.size_label in ('S', 'M', 'L', 'XL') then 1458
    when variant.color_label in ('Dark Heather', 'Red') and variant.size_label in ('2XL', '3XL') then 1621
    else variant.cost_cents
end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
  and product.supplier_provider_id = '66'
  and variant.color_label in ('White', 'Sport Grey', 'Dark Heather', 'Black', 'Red', 'Light Blue')
  and variant.size_label in ('S', 'M', 'L', 'XL', '2XL', '3XL');
