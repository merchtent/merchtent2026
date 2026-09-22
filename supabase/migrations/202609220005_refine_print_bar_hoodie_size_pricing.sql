-- Refine Print Bar hoodie costs using the supplier's size-grouped Premium AUD
-- pricing supplied on 2026-09-22. This replaces the provisional size split
-- inferred from colour-level ranges in migration 202609220003.

update public.supplier_catalog_variants variant
set cost_cents = case
    when variant.color_label = 'White' and variant.size_label in ('S', 'M', 'L', 'XL') then 2720
    when variant.color_label = 'White' and variant.size_label = '2XL' then 2729
    when variant.color_label = 'White' and variant.size_label in ('3XL', '4XL') then 3278
    when variant.color_label = 'White' and variant.size_label = '5XL' then 3786

    when variant.color_label = 'Ash' and variant.size_label in ('S', '2XL') then 3451
    when variant.color_label = 'Ash' and variant.size_label in ('M', 'L', 'XL', '3XL') then 3278

    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label = '2XL' then 3451
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label = '3XL' then 3900
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label = '4XL' then 3786
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label = '5XL' then 4007

    when variant.color_label = 'Black' and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label = 'Black' and variant.size_label = '2XL' then 3451
    when variant.color_label = 'Black' and variant.size_label = '3XL' then 3900
    when variant.color_label = 'Black' and variant.size_label = '4XL' then 3786
    when variant.color_label = 'Black' and variant.size_label = '5XL' then 4075

    when variant.color_label in ('Red', 'Sand', 'Light Blue', 'Light Pink')
        and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label in ('Red', 'Sand', 'Light Blue', 'Light Pink')
        and variant.size_label = '2XL' then 3451
    when variant.color_label in ('Red', 'Sand', 'Light Blue', 'Light Pink')
        and variant.size_label = '3XL' then 3900

    when variant.color_label in ('Dark Heather', 'Dark Chocolate', 'Maroon', 'Forest Green') then 3278
    else variant.cost_cents
end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '34';
