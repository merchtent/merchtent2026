-- Printify blueprint 77: Gildan 18500 / Unisex Heavy Blend Hooded Sweatshirt.
-- Provider 66: Prima Printing. Costs are the Printify Premium AUD prices
-- supplied on 2026-09-22.

update public.supplier_catalog_variants variant
set cost_cents = case
    when variant.color_label in ('White', 'Sport Grey', 'Black', 'Navy')
        and variant.size_label in ('S', 'M', 'L', 'XL') then 3268
    when variant.color_label in ('White', 'Sport Grey', 'Black', 'Navy')
        and variant.size_label in ('2XL', '3XL') then 3541
    else variant.cost_cents
end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '66'
  and variant.color_label in ('White', 'Sport Grey', 'Black', 'Navy')
  and variant.size_label in ('S', 'M', 'L', 'XL', '2XL', '3XL');
