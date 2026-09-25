-- Printify blueprint 1703 / Yupoong 6089M, fulfilled internationally by Duplium (Canada).
-- Supplier figures, delivery bands, print area, and product details were supplied on 2026-09-24.

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_garment_kind_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_garment_kind_check
    check (garment_kind in ('tee', 'hoodie', 'hat', 'tank', 'bag', 'poster'));

update public.supplier_catalog_products
set
    category = 'hats',
    garment_kind = 'hat',
    merch_tent_name = 'Classic Snapback Hat',
    default_price_cents = 5900,
    colors = jsonb_build_array(
        jsonb_build_object('label', 'Black', 'value', '#111111', 'supplierColorName', 'Black'),
        jsonb_build_object('label', 'Dark Heather', 'value', '#514b49', 'supplierColorName', 'Dark Heather'),
        jsonb_build_object('label', 'White', 'value', '#f7f7f2', 'supplierColorName', 'White')
    ),
    sizes = jsonb_build_array('One size'),
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 220.0 / 900.0,
            'y', 390.0 / 1200.0,
            'width', 460.0 / 900.0,
            'height', (460.0 * 750.0 / 1654.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 220.0 / 900.0,
            'y', 390.0 / 1200.0,
            'width', 460.0 / 900.0,
            'height', (460.0 * 750.0 / 1654.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        )
    ),
    production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
        'method', 'DTF',
        'placements', jsonb_build_array('Front'),
        'international_supplier', true,
        'shipping_origin', jsonb_build_object('country', 'CA', 'region', 'ON', 'city', 'Thornhill'),
        'routing_back_print_cost_cents', 0,
        'pricing_basis', jsonb_build_object(
            'standard_cost_cents', 3071,
            'premium_reference_cents', 2222,
            'currency', 'AUD',
            'tax_mode', 'ex_gst',
            'captured_on', '2026-09-24'
        ),
        'notes', jsonb_build_array(
            'Internationally fulfilled by Duplium in Canada.',
            'Australia and New Zealand use the Rest of World delivery band: 10–30 business days.',
            'Front DTF print only. Semi-transparency and gradients may not reproduce as shown because DTF uses a white underbase.'
        ),
        'customer_info', jsonb_build_object(
            'about', 'A structured, six-panel, high-profile snapback with a flat brim and adjustable closure. Solid and heather colours use an 80% acrylic, 20% wool blend; White is 100% acrylic.',
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Structured six-panel crown',
                    'description', 'A high-profile six-panel build with sewn eyelets gives the cap a defined shape.'
                ),
                jsonb_build_object(
                    'title', 'Adjustable snap closure',
                    'description', 'The plastic snapback closure adjusts from approximately 51 to 60 cm for a flexible one-size fit.'
                ),
                jsonb_build_object(
                    'title', 'Flat visor',
                    'description', 'A classic flat brim with a green undervisor and eight rows of stitching delivers the traditional snapback look.'
                ),
                jsonb_build_object(
                    'title', 'Acrylic and wool blend',
                    'description', 'Black and Dark Heather are 80% acrylic and 20% wool. White is made from 100% acrylic.'
                ),
                jsonb_build_object(
                    'title', 'Front DTF print',
                    'description', 'The 1654 × 750 px front print area suits bold artwork with sharp edges and vibrant colour.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Spot clean with mild, diluted detergent',
                'If soaking is needed, limit it to 15 minutes in warm or cold water',
                'Rinse thoroughly and gently pat dry with a towel',
                'Reshape while damp and leave to air dry'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'One-size adjustable snapback. Measurements refer to the blank hat.',
                'measurements', jsonb_build_array(
                    jsonb_build_object(
                        'size', 'One size',
                        'metrics', jsonb_build_array(
                            jsonb_build_object('label', 'Circumference, cm', 'value', '51–60'),
                            jsonb_build_object('label', 'Crown height, cm', 'value', 11.5),
                            jsonb_build_object('label', 'Visor width, cm', 'value', 6.5),
                            jsonb_build_object('label', 'Visor length, cm', 'value', 18)
                        )
                    )
                )
            )
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1703'
  and supplier_provider_id = '41';

update public.supplier_catalog_variants variant
set
    size_label = 'One size',
    color_label = case variant.supplier_variant_id
        when '117048' then 'Black'
        when '117049' then 'Dark Heather'
        when '117050' then 'White'
        else variant.color_label
    end,
    cost_cents = 3071,
    price_cents = 3071,
    currency = 'AUD',
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'standard_cost_cents', 3071,
        'premium_reference_cents', 2222,
        'pricing_basis', 'standard non-premium supplier price, ex GST',
        'captured_on', '2026-09-24'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '1703'
  and product.supplier_provider_id = '41'
  and variant.supplier_variant_id in ('117048', '117049', '117050');

update public.supplier_catalog_product_pricing
set
    default_price_cents = 5900,
    artist_profit_cents = 800,
    platform_profit_cents = 900,
    included_print_sides = 1,
    additional_print_side_cents = 0,
    additional_print_side_retail_cents = 0,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1703';

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
        'captured_on', '2026-09-24',
        'zone', rate.zone,
        'international_supplier', true,
        'origin_country', 'CA'
    )
from public.supplier_catalog_products product
cross join (values
    ('AU', 'Rest of the world', '10 - 30 business days', 10, 30, 1804, 865),
    ('NZ', 'Rest of the world', '10 - 30 business days', 10, 30, 1804, 865),
    ('US', 'United States', '2 - 5 business days', 2, 5, 1125, 143),
    ('CA', 'Canada', '2 - 5 business days', 2, 5, 1400, 287),
    ('ROW', 'Rest of the world', '10 - 30 business days', 10, 30, 1804, 865),
    ('AT', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('BE', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('BG', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('HR', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('CY', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('CZ', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('DK', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('EE', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('FI', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('FR', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('DE', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('GR', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('HU', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('IE', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('IT', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('LV', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('LT', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('LU', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('MT', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('NL', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('PL', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('PT', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('RO', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('SK', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('SI', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('ES', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865),
    ('SE', 'European Countries', '10 - 30 business days', 10, 30, 2238, 865)
) as rate(destination_country, zone, delivery_time_label, delivery_min_days, delivery_max_days, first_item_cents, additional_item_cents)
where product.supplier = 'printify'
  and product.supplier_product_id = '1703'
  and product.supplier_provider_id = '41'
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
