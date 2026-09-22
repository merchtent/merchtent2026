-- Printify blueprint 145 / provider 66 (Prima Printing), White variants.
-- Captured from the standard (non-Premium), ex-GST production breakdown on
-- 2026-09-22. The screenshot's subtotal includes both front and back printing.

update public.supplier_catalog_variants variant
set
    cost_cents = case
        when variant.size_label in ('S', 'M', 'L', 'XL') then 944
        when variant.size_label in ('2XL', '3XL') then 1156
        else variant.cost_cents
    end,
    price_cents = case
        when variant.size_label in ('S', 'M', 'L', 'XL') then 1378
        when variant.size_label in ('2XL', '3XL') then 1624
        else variant.price_cents
    end,
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'pricing_basis', 'standard_non_premium_ex_gst',
        'standard_blank_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then 511
            when variant.size_label in ('2XL', '3XL') then 688
            else null
        end,
        'standard_front_print_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then 434
            when variant.size_label in ('2XL', '3XL') then 468
            else null
        end,
        'standard_back_print_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then 434
            when variant.size_label in ('2XL', '3XL') then 468
            else null
        end,
        -- The low displayed components add to AUD 13.79 while Printify's
        -- authoritative subtotal is AUD 13.78, so use the subtotal for routing.
        'standard_one_side_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then 944
            when variant.size_label in ('2XL', '3XL') then 1156
            else null
        end,
        'standard_two_side_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then 1378
            when variant.size_label in ('2XL', '3XL') then 1624
            else null
        end,
        'component_rounding_delta_cents', case
            when variant.size_label in ('S', 'M', 'L', 'XL') then -1
            else 0
        end,
        'captured_on', '2026-09-22'
    )
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
  and product.supplier_provider_id = '66'
  and variant.color_label = 'White'
  and variant.size_label in ('S', 'M', 'L', 'XL', '2XL', '3XL');

update public.supplier_catalog_products
set production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
    'white_standard_cost_breakdown', jsonb_build_object(
        'pricing_basis', 'standard_non_premium_ex_gst',
        'blank_cost_min_cents', 511,
        'blank_cost_max_cents', 688,
        'front_print_min_cents', 434,
        'front_print_max_cents', 468,
        'back_print_min_cents', 434,
        'back_print_max_cents', 468,
        'two_side_total_min_cents', 1378,
        'two_side_total_max_cents', 1624,
        'source', 'Printify production breakdown screenshot',
        'captured_on', '2026-09-22'
    )
)
where supplier = 'printify'
  and supplier_product_id = '145'
  and supplier_provider_id = '66';
