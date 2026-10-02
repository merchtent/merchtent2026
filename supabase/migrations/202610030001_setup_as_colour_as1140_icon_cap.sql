-- Printify blueprint 5384 / AS Colour AS1140, fulfilled in Australia by The Print Bar.
-- Product, pricing, print area, and delivery figures were supplied on 2026-10-03.

update public.supplier_catalog_products
set
    category = 'hats',
    garment_kind = 'hat',
    merch_tent_name = 'Classic Icon Cap',
    default_price_cents = 4900,
    colors = jsonb_build_array(
        jsonb_build_object('label', 'Black', 'value', '#111111', 'supplierColorName', 'Black'),
        jsonb_build_object('label', 'Walnut', 'value', '#5a4638', 'supplierColorName', 'Walnut'),
        jsonb_build_object('label', 'Ecru', 'value', '#e8dfcf', 'supplierColorName', 'Ecru'),
        jsonb_build_object('label', 'Bone', 'value', '#ded9cd', 'supplierColorName', 'Bone'),
        jsonb_build_object('label', 'Sand', 'value', '#bda783', 'supplierColorName', 'Sand'),
        jsonb_build_object('label', 'Cypress', 'value', '#697260', 'supplierColorName', 'Cypress'),
        jsonb_build_object('label', 'Atlantic', 'value', '#006b70', 'supplierColorName', 'Atlantic'),
        jsonb_build_object('label', 'Midnight Blue', 'value', '#34384d', 'supplierColorName', 'Midnight Blue'),
        jsonb_build_object('label', 'Petrol Blue', 'value', '#34454f', 'supplierColorName', 'Petrol Blue'),
        jsonb_build_object('label', 'Plum', 'value', '#32232f', 'supplierColorName', 'Plum')
    ),
    sizes = jsonb_build_array('One size'),
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 270.0 / 900.0,
            'y', 390.0 / 1200.0,
            'width', 360.0 / 900.0,
            'height', (360.0 * 675.0 / 1200.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 270.0 / 900.0,
            'y', 390.0 / 1200.0,
            'width', 360.0 / 900.0,
            'height', (360.0 * 675.0 / 1200.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        )
    ),
    production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
        'method', 'DTF',
        'placements', jsonb_build_array('Front'),
        'international_supplier', false,
        'shipping_origin', jsonb_build_object('country', 'AU'),
        'routing_back_print_cost_cents', 0,
        'printify_variant_ids', jsonb_build_array(244932, 244933, 244934, 244936, 244937, 244938, 244939, 244940, 244941),
        'pricing_basis', jsonb_build_object(
            'standard_cost_cents', 2365,
            'premium_reference_cents', 1745,
            'currency', 'AUD',
            'tax_mode', 'ex_gst',
            'captured_on', '2026-10-03'
        ),
        'notes', jsonb_build_array(
            'Printed in Australia by The Print Bar.',
            'Front DTF print only.',
            'Walnut is part of the supplier range but is currently unavailable.'
        ),
        'customer_info', jsonb_build_object(
            'about', 'A polished mid-profile cap with a contoured crown, curved peak and structured six-panel construction. Made from 100% cotton with a tonal underpeak and adjustable plastic snapback.',
            'features', jsonb_build_array(
                jsonb_build_object('title', 'Structured mid-profile crown', 'description', 'A six-panel construction and contoured crown provide a clean, dependable shape.'),
                jsonb_build_object('title', 'Adjustable snapback', 'description', 'The plastic snapback closure gives this one-size cap an adaptable fit.'),
                jsonb_build_object('title', '100% cotton', 'description', 'Cotton construction, a tonal underpeak and stitched eyelets keep the finish understated and durable.'),
                jsonb_build_object('title', 'Printed in Australia', 'description', 'Your front artwork is produced locally by The Print Bar using DTF printing.'),
                jsonb_build_object('title', 'Wide front print area', 'description', 'The 1200 × 675 px front print area is suited to bold logos, wordmarks and horizontal artwork.')
            ),
            'care_instructions', jsonb_build_array(
                'Spot clean with warm water and mild dish soap',
                'Use a soft-bristled brush for stubborn marks',
                'Air dry and reshape while damp',
                'Do not bleach'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'One-size adjustable snapback.',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'One size', 'metrics', jsonb_build_array(
                        jsonb_build_object('label', 'Fit', 'value', 'Adjustable')
                    ))
                )
            )
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '5384'
  and supplier_provider_id = '34';

update public.supplier_catalog_variants variant
set
    size_label = 'One size',
    cost_cents = 2365,
    price_cents = 2365,
    currency = 'AUD',
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'standard_cost_cents', 2365,
        'premium_reference_cents', 1745,
        'pricing_basis', 'standard non-premium supplier price, ex GST',
        'captured_on', '2026-10-03'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '5384'
  and product.supplier_provider_id = '34';

insert into public.supplier_catalog_product_pricing (
    supplier, supplier_product_id, default_price_cents, currency,
    artist_profit_cents, platform_profit_cents, included_print_sides,
    additional_print_side_cents, additional_print_side_retail_cents
)
values ('printify', '5384', 4900, 'AUD', 800, 900, 1, 0, 0)
on conflict (supplier, supplier_product_id) do update set
    default_price_cents = excluded.default_price_cents,
    currency = excluded.currency,
    artist_profit_cents = excluded.artist_profit_cents,
    platform_profit_cents = excluded.platform_profit_cents,
    included_print_sides = excluded.included_print_sides,
    additional_print_side_cents = excluded.additional_print_side_cents,
    additional_print_side_retail_cents = excluded.additional_print_side_retail_cents,
    updated_at = now();

delete from public.supplier_catalog_provider_shipping shipping
using public.supplier_catalog_products product
where shipping.catalog_product_id = product.id
  and product.supplier = 'printify'
  and product.supplier_product_id = '5384'
  and product.supplier_provider_id = '34';

insert into public.supplier_catalog_provider_shipping (
    catalog_product_id, supplier, supplier_product_id, supplier_provider_id,
    destination_country, shipping_method, delivery_time_label,
    delivery_min_days, delivery_max_days, size_type_label,
    first_item_cents, additional_item_cents, currency, raw_supplier_data
)
select
    product.id, product.supplier, product.supplier_product_id, product.supplier_provider_id,
    rate.destination_country, 'standard', rate.delivery_time_label,
    rate.delivery_min_days, rate.delivery_max_days, 'All',
    rate.first_item_cents, rate.additional_item_cents, 'AUD',
    jsonb_build_object(
        'source', 'Printify catalogue shipping screenshot',
        'captured_on', '2026-10-03',
        'zone', rate.zone,
        'international_supplier', false,
        'origin_country', 'AU'
    )
from public.supplier_catalog_products product
cross join (values
    ('AU', 'Australia', '3 - 6 business days', 3, 6, 966, 201),
    ('NZ', 'New Zealand', '10 - 30 business days', 10, 30, 1877, 201),
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
  and product.supplier_product_id = '5384'
  and product.supplier_provider_id = '34';
