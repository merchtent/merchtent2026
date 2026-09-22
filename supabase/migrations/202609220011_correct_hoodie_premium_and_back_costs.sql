-- Printify blueprint 77: Gildan 18500 / Unisex Heavy Blend Hooded Sweatshirt.
-- Catalogue Premium figures previously captured the discounted blank rather than
-- 20% off the complete single-side production cost. Preserve the supplier's
-- standard printed price as the reference and store the complete Premium cost.

update public.supplier_catalog_variants variant
set
    price_cents = case variant.cost_cents
        when 2720 then 3690
        when 2729 then 3703
        when 3278 then 4448
        when 3451 then 4682
        when 3786 then 5137
        when 3900 then 5293
        when 4007 then 5437
        when 4075 then 5530
        else variant.price_cents
    end,
    cost_cents = case variant.cost_cents
        when 2720 then 2952
        when 2729 then 2962
        when 3278 then 3558
        when 3451 then 3746
        when 3786 then 4110
        when 3900 then 4234
        when 4007 then 4350
        when 4075 then 4424
        else variant.cost_cents
    end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '34';

update public.supplier_catalog_variants variant
set
    price_cents = case variant.cost_cents
        when 3268 then 4438
        when 3541 then 4811
        else variant.price_cents
    end,
    cost_cents = case variant.cost_cents
        when 3268 then 3550
        when 3541 then 3849
        else variant.cost_cents
    end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '66';

-- The Print Bar standard back print is AUD 13.12. Printify Premium is 20% off,
-- which rounds to AUD 10.50. The existing AUD 15 retail back-print add-on stays.
update public.supplier_catalog_product_pricing
set
    included_print_sides = 1,
    additional_print_side_cents = 1050,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '77';
