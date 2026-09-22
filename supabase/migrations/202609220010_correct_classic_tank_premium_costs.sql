-- Correct Printify #995 Premium pricing from the detailed production-cost
-- breakdown supplied on 2026-09-22. Premium is 20% off the complete product:
-- blank AUD 23.12 + each print side AUD 13.40.
-- One side: round(36.52 * .80) = AUD 29.22.
-- Two sides: round(49.92 * .80) = AUD 39.94.
-- Each additional print side: 13.40 * .80 = AUD 10.72.

update public.supplier_catalog_variants variant
set
    cost_cents = 2922,
    price_cents = 3652,
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'premium_cost_cents', 2922,
        'standard_cost_cents', 3652,
        'blank_standard_cost_cents', 2312,
        'print_side_standard_cost_cents', 1340,
        'premium_discount_bps', 2000,
        'verified_on', '2026-09-22'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '995'
  and variant.size_label in ('S', 'M', 'L', 'XL', '2XL')
  and variant.color_label in ('Ash Stone', 'Black Stone', 'Moss Stone');

update public.supplier_catalog_product_pricing
set
    additional_print_side_cents = 1072,
    additional_print_side_retail_cents = case
        when coalesce(additional_print_side_retail_cents, 0) = 0 then 1072
        else additional_print_side_retail_cents
    end,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
