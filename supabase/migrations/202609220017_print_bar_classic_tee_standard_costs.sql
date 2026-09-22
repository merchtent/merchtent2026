-- Printify blueprint 145 / provider 34 (The Print Bar), captured 2026-09-22.
-- These are standard (non-Premium), ex-GST production costs. Printify supplied
-- a blank range rather than every variant's blank price, so retain the existing
-- variant cost tiers and proportionally map them into the supplied total range.

update public.supplier_catalog_variants variant
set
    price_cents = case variant.cost_cents
        when 1439 then 1797
        when 1521 then 1868
        when 1536 then 1881
        when 1653 then 1981
        when 1671 then 1997
        when 1680 then 2004
        when 1748 then 2063
        else variant.price_cents
    end,
    cost_cents = case variant.cost_cents
        when 1439 then 1797
        when 1521 then 1868
        when 1536 then 1881
        when 1653 then 1981
        when 1671 then 1997
        when 1680 then 2004
        when 1748 then 2063
        else variant.cost_cents
    end,
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'previous_catalog_premium_cents', variant.cost_cents,
        'pricing_basis', 'standard_non_premium_ex_gst',
        'standard_blank_cost_range_cents', jsonb_build_array(595, 862),
        'standard_front_print_cents', 1202,
        'standard_back_print_cents', 1202,
        'estimated_standard_blank_cents', case variant.cost_cents
            when 1439 then 595
            when 1521 then 666
            when 1536 then 679
            when 1653 then 779
            when 1671 then 795
            when 1680 then 802
            when 1748 then 861
            else null
        end,
        'standard_one_side_cents', case variant.cost_cents
            when 1439 then 1797
            when 1521 then 1868
            when 1536 then 1881
            when 1653 then 1981
            when 1671 then 1997
            when 1680 then 2004
            when 1748 then 2063
            else null
        end,
        'captured_on', '2026-09-22'
    )
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
  and product.supplier_provider_id = '34';

update public.supplier_catalog_products
set production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
    'standard_cost_breakdown', jsonb_build_object(
        'pricing_basis', 'standard_non_premium_ex_gst',
        'blank_cost_min_cents', 595,
        'blank_cost_max_cents', 862,
        'front_print_cents', 1202,
        'back_print_cents', 1202,
        'one_side_total_min_cents', 1797,
        'one_side_total_max_cents', 2063,
        'two_side_total_min_cents', 2999,
        'two_side_total_max_cents', 3265,
        'source', 'Printify production breakdown screenshot',
        'captured_on', '2026-09-22'
    )
)
where supplier = 'printify'
  and supplier_product_id = '145'
  and supplier_provider_id = '34';

update public.supplier_catalog_product_pricing
set
    included_print_sides = 1,
    additional_print_side_cents = 1202,
    additional_print_side_retail_cents = greatest(coalesce(additional_print_side_retail_cents, 0), 1500),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '145';
