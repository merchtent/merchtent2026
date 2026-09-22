-- Printify blueprint 77: Gildan 18500 / Unisex Heavy Blend Hooded Sweatshirt.
-- Provider 34: The Print Bar. Costs are the Printify Premium AUD prices
-- supplied on 2026-09-22, including the published size premiums.

update public.supplier_catalog_variants variant
set cost_cents = case
    when variant.color_label = 'White' and variant.size_label in ('S', 'M', 'L', 'XL') then 2720
    when variant.color_label = 'White' and variant.size_label in ('2XL', '3XL') then 3451
    when variant.color_label = 'White' and variant.size_label in ('4XL', '5XL') then 3786

    when variant.color_label = 'Ash' and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label = 'Ash' and variant.size_label in ('2XL', '3XL') then 3451

    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label in ('2XL', '3XL') then 3900
    when variant.color_label in ('Sport Grey', 'Royal', 'Navy')
        and variant.size_label in ('4XL', '5XL') then 4007

    when variant.color_label = 'Black' and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label = 'Black' and variant.size_label in ('2XL', '3XL') then 3900
    when variant.color_label = 'Black' and variant.size_label in ('4XL', '5XL') then 4075

    when variant.color_label in ('Red', 'Sand', 'Light Blue', 'Light Pink')
        and variant.size_label in ('S', 'M', 'L', 'XL') then 3278
    when variant.color_label in ('Red', 'Sand', 'Light Blue', 'Light Pink')
        and variant.size_label in ('2XL', '3XL') then 3900

    when variant.color_label in ('Dark Heather', 'Dark Chocolate', 'Maroon', 'Forest Green') then 3278
    else variant.cost_cents
end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '34';

update public.supplier_catalog_product_pricing
set
    default_price_cents = 5900,
    artist_profit_cents = 1200,
    platform_profit_cents = 700,
    included_print_sides = 1,
    additional_print_side_retail_cents = 1500,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '77';

update public.supplier_catalog_products
set default_price_cents = 5900
where supplier = 'printify'
  and supplier_product_id = '77';
