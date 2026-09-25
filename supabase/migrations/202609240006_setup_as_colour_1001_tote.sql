-- Printify blueprint 553 / AS Colour 1001 Cotton Tote Bag.
-- Supplier figures and delivery bands were supplied from The Print Bar on 2026-09-24.

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_garment_kind_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_garment_kind_check
    check (garment_kind in ('tee', 'hoodie', 'tank', 'bag'));

update public.supplier_catalog_products
set
    category = 'bags',
    garment_kind = 'bag',
    merch_tent_name = 'Classic Cotton Tote Bag',
    default_price_cents = 4900,
    colors = jsonb_build_array(
        jsonb_build_object('label', 'Black', 'value', '#111111', 'supplierColorName', 'Black'),
        jsonb_build_object('label', 'Cream', 'value', '#f1eee4', 'supplierColorName', 'Cream')
    ),
    sizes = jsonb_build_array('One size'),
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 235.0 / 900.0,
            'y', 525.0 / 1200.0,
            'width', 430.0 / 900.0,
            'height', (430.0 * 3425.0 / 2835.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 235.0 / 900.0,
            'y', 525.0 / 1200.0,
            'width', 430.0 / 900.0,
            'height', (430.0 * 3425.0 / 2835.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
        'method', 'DTG',
        'placements', jsonb_build_array('Front side', 'Back side'),
        'routing_back_print_cost_cents', 700,
        'pricing_basis', jsonb_build_object(
            'standard_cost_cents', 2782,
            'premium_reference_cents', 2017,
            'currency', 'AUD',
            'tax_mode', 'ex_gst',
            'additional_side_cost_cents', 700,
            'additional_side_basis', 'conservative estimate pending supplier production breakdown',
            'captured_on', '2026-09-24'
        ),
        'customer_info', jsonb_build_object(
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', '100% cotton canvas',
                    'description', 'Strong, smooth cotton canvas gives the tote a durable surface suited to detailed printing.'
                ),
                jsonb_build_object(
                    'title', 'Medium-heavy fabric',
                    'description', 'The 320 g/m² canvas has enough structure for daily use while remaining comfortable to carry.'
                ),
                jsonb_build_object(
                    'title', 'Reinforced shoulder straps',
                    'description', 'Long handles use reinforced, double-stitched seams for dependable carrying.'
                ),
                jsonb_build_object(
                    'title', 'Spacious interior',
                    'description', 'A single roomy main compartment keeps the tote simple and useful for everyday gear.'
                ),
                jsonb_build_object(
                    'title', 'Front and back printing',
                    'description', 'Both faces support a 2835 × 3425 px DTG print area for single- or double-sided artwork.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Machine wash cold, maximum 30°C',
                'Do not bleach',
                'Tumble dry on low heat',
                'Iron or steam on low heat',
                'Do not dry clean'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'One-size tote. Measurements refer to the bag body and exclude the handles.',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'One size', 'width', 42, 'length', 42)
                )
            )
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '553'
  and supplier_provider_name = 'The Print Bar';

update public.supplier_catalog_variants variant
set
    size_label = 'One size',
    color_label = case variant.supplier_variant_id
        when '70603' then 'Black'
        when '70646' then 'Cream'
        else variant.color_label
    end,
    cost_cents = 2782,
    price_cents = 2782,
    currency = 'AUD',
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'standard_cost_cents', 2782,
        'premium_reference_cents', 2017,
        'pricing_basis', 'standard non-premium supplier price, ex GST',
        'captured_on', '2026-09-24'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '553'
  and variant.supplier_variant_id in ('70603', '70646');

update public.supplier_catalog_product_pricing
set
    default_price_cents = 4900,
    artist_profit_cents = 800,
    platform_profit_cents = 700,
    included_print_sides = 1,
    additional_print_side_cents = 700,
    additional_print_side_retail_cents = 1000,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '553';

insert into public.supplier_catalog_provider_shipping (
    catalog_product_id,
    supplier,
    supplier_product_id,
    supplier_provider_id,
    destination_country,
    shipping_method,
    delivery_time_label,
    delivery_min_days,
    delivery_max_days,
    size_type_label,
    first_item_cents,
    additional_item_cents,
    currency,
    raw_supplier_data
)
select
    product.id,
    product.supplier,
    product.supplier_product_id,
    product.supplier_provider_id,
    rate.destination_country,
    'standard',
    rate.delivery_time_label,
    rate.delivery_min_days,
    rate.delivery_max_days,
    'All',
    rate.first_item_cents,
    rate.additional_item_cents,
    'AUD',
    jsonb_build_object(
        'source', 'Printify catalogue shipping screenshot',
        'captured_on', '2026-09-24',
        'zone', rate.zone
    )
from public.supplier_catalog_products product
cross join (values
    ('AU', 'Australia', '3 - 6 business days', 3, 6, 966, 201),
    ('NZ', 'New Zealand', '5 - 10 business days', 5, 10, 1877, 201),
    ('ROW', 'Rest of the world', '10 - 30 business days', 10, 30, 2180, 230),
    ('AT', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('BE', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('BG', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('HR', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('CY', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('CZ', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('DK', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('EE', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('FI', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('FR', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('DE', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('GR', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('HU', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('IE', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('IT', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('LV', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('LT', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('LU', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('MT', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('NL', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('PL', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('PT', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('RO', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('SK', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('SI', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('ES', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230),
    ('SE', 'European Countries', '10 - 30 business days', 10, 30, 2599, 230)
) as rate(destination_country, zone, delivery_time_label, delivery_min_days, delivery_max_days, first_item_cents, additional_item_cents)
where product.supplier = 'printify'
  and product.supplier_product_id = '553'
  and product.supplier_provider_name = 'The Print Bar'
on conflict (catalog_product_id, destination_country, shipping_method, size_type_label)
do update set
    delivery_time_label = excluded.delivery_time_label,
    delivery_min_days = excluded.delivery_min_days,
    delivery_max_days = excluded.delivery_max_days,
    first_item_cents = excluded.first_item_cents,
    additional_item_cents = excluded.additional_item_cents,
    currency = excluded.currency,
    raw_supplier_data = excluded.raw_supplier_data,
    updated_at = now();
