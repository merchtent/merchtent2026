-- Printify blueprint 1079 / Prima Printing unframed posters.
-- Standard and Premium references and shipping were supplied on 2026-09-24.

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_garment_kind_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_garment_kind_check
    check (garment_kind in ('tee', 'hoodie', 'tank', 'bag', 'poster'));

update public.supplier_catalog_products
set
    category = 'posters',
    garment_kind = 'poster',
    merch_tent_name = 'Unframed Art Poster',
    default_price_cents = 3900,
    colors = jsonb_build_array(
        jsonb_build_object('label', 'Glossy', 'value', '#ffffff', 'supplierColorName', 'Glossy'),
        jsonb_build_object('label', 'Matte', 'value', '#f4f1e8', 'supplierColorName', 'Matte')
    ),
    sizes = jsonb_build_array(
        '20" x 16" (Horizontal)',
        '24" x 20" (Horizontal)',
        '30" x 20" (Horizontal)',
        '16" x 20" (Vertical)',
        '20" x 24" (Vertical)',
        '20" x 30" (Vertical)'
    ),
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 150.0 / 900.0,
            'y', 150.0 / 1200.0,
            'width', 600.0 / 900.0,
            'height', 900.0 / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 150.0 / 900.0,
            'y', 150.0 / 1200.0,
            'width', 600.0 / 900.0,
            'height', 900.0 / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        )
    ),
    production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
        'method', 'Digital printing',
        'placements', jsonb_build_array('Front side'),
        'notes', jsonb_build_array(
            'Single-sided, full-bleed poster product.',
            'The designer uses the 20 x 30 vertical ratio as its canonical master.',
            'Each supplier variant retains its exact output dimensions for fulfilment.'
        ),
        'canonical_design_variant_id', 81396,
        'canonical_print_width', 6059,
        'canonical_print_height', 9059,
        'variant_print_areas', jsonb_build_object(
            '81390', jsonb_build_object('width', 6059, 'height', 4859, 'orientation', 'horizontal'),
            '81391', jsonb_build_object('width', 6059, 'height', 4859, 'orientation', 'horizontal'),
            '81392', jsonb_build_object('width', 9059, 'height', 6059, 'orientation', 'horizontal'),
            '81393', jsonb_build_object('width', 9059, 'height', 6059, 'orientation', 'horizontal'),
            '81394', jsonb_build_object('width', 4859, 'height', 6059, 'orientation', 'vertical'),
            '81395', jsonb_build_object('width', 4859, 'height', 6059, 'orientation', 'vertical'),
            '81396', jsonb_build_object('width', 6059, 'height', 9059, 'orientation', 'vertical'),
            '81397', jsonb_build_object('width', 6059, 'height', 9059, 'orientation', 'vertical'),
            '81398', jsonb_build_object('width', 7259, 'height', 6059, 'orientation', 'horizontal'),
            '81399', jsonb_build_object('width', 7259, 'height', 6059, 'orientation', 'horizontal'),
            '81400', jsonb_build_object('width', 6059, 'height', 7259, 'orientation', 'vertical'),
            '81401', jsonb_build_object('width', 6059, 'height', 7259, 'orientation', 'vertical')
        ),
        'pricing_basis', jsonb_build_object(
            'currency', 'AUD',
            'tax_mode', 'ex_gst',
            'standard_cost_range_cents', jsonb_build_array(1224, 1644),
            'premium_reference_range_cents', jsonb_build_array(887, 1192),
            'captured_on', '2026-09-24'
        ),
        'customer_info', jsonb_build_object(
            'about', 'Thick premium-paper posters bring artwork to life in three physical dimensions, each available horizontally or vertically. Choose a vivid high-gloss surface or a smooth matte finish.',
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Glossy or matte finish',
                    'description', 'Choose a high-gloss finish for extra punch or a smooth matte surface with restrained reflection.'
                ),
                jsonb_build_object(
                    'title', 'Vibrant colour reproduction',
                    'description', 'High-definition digital printing produces bright, crisp colour and detailed artwork.'
                ),
                jsonb_build_object(
                    'title', 'Premium paper stock',
                    'description', 'Matte posters use 300 gsm paper; glossy posters use 200 gsm paper.'
                ),
                jsonb_build_object(
                    'title', 'Six formats',
                    'description', 'Three dimensions are available in both horizontal and vertical orientations.'
                ),
                jsonb_build_object(
                    'title', 'Unframed',
                    'description', 'The poster arrives without a frame, ready for the customer to display their way.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Remove dust gently with a clean, soft, dry cloth',
                'Keep away from moisture and direct contact with cleaning products',
                'Handle with clean, dry hands to reduce marks on the printed surface'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'Dimensions refer to the finished poster. Inch names are supplier sizes; centimetre values are converted exactly.',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', '20 x 16 H', 'width', 50.8, 'length', 40.64),
                    jsonb_build_object('size', '24 x 20 H', 'width', 60.96, 'length', 50.8),
                    jsonb_build_object('size', '30 x 20 H', 'width', 76.2, 'length', 50.8),
                    jsonb_build_object('size', '16 x 20 V', 'width', 40.64, 'length', 50.8),
                    jsonb_build_object('size', '20 x 24 V', 'width', 50.8, 'length', 60.96),
                    jsonb_build_object('size', '20 x 30 V', 'width', 50.8, 'length', 76.2)
                )
            )
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1079'
  and supplier_provider_name = 'Prima Printing';

update public.supplier_catalog_variants variant
set
    size_label = case variant.supplier_variant_id
        when '81390' then '20" x 16" (Horizontal)'
        when '81391' then '20" x 16" (Horizontal)'
        when '81392' then '30" x 20" (Horizontal)'
        when '81393' then '30" x 20" (Horizontal)'
        when '81394' then '16" x 20" (Vertical)'
        when '81395' then '16" x 20" (Vertical)'
        when '81396' then '20" x 30" (Vertical)'
        when '81397' then '20" x 30" (Vertical)'
        when '81398' then '24" x 20" (Horizontal)'
        when '81399' then '24" x 20" (Horizontal)'
        when '81400' then '20" x 24" (Vertical)'
        when '81401' then '20" x 24" (Vertical)'
    end,
    color_label = case when variant.supplier_variant_id::integer % 2 = 0 then 'Glossy' else 'Matte' end,
    cost_cents = case
        when variant.supplier_variant_id in ('81390', '81391', '81394', '81395') then 1224
        when variant.supplier_variant_id in ('81398', '81399', '81400', '81401') then 1307
        else 1644
    end,
    price_cents = case
        when variant.supplier_variant_id in ('81390', '81391', '81394', '81395') then 1224
        when variant.supplier_variant_id in ('81398', '81399', '81400', '81401') then 1307
        else 1644
    end,
    currency = 'AUD',
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'standard_cost_cents', case
            when variant.supplier_variant_id in ('81390', '81391', '81394', '81395') then 1224
            when variant.supplier_variant_id in ('81398', '81399', '81400', '81401') then 1307
            else 1644
        end,
        'premium_reference_cents', case
            when variant.supplier_variant_id in ('81390', '81391', '81394', '81395') then 887
            when variant.supplier_variant_id in ('81398', '81399', '81400', '81401') then 948
            else 1192
        end,
        'pricing_basis', 'standard non-premium supplier price, ex GST',
        'captured_on', '2026-09-24'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '1079'
  and variant.supplier_variant_id between '81390' and '81401';

update public.supplier_catalog_product_pricing
set
    default_price_cents = 3900,
    artist_profit_cents = 800,
    platform_profit_cents = 700,
    included_print_sides = 1,
    additional_print_side_cents = 0,
    additional_print_side_retail_cents = 0,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1079';

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
    jsonb_build_object('source', 'Printify catalogue shipping screenshot', 'captured_on', '2026-09-24', 'zone', rate.zone)
from public.supplier_catalog_products product
cross join (values
    ('AU', 'Australia', '3 - 6 business days', 3, 6, 1241, 172),
    ('NZ', 'New Zealand', '5 - 10 business days', 5, 10, 1255, 678),
    ('ROW', 'Rest of the world', '10 - 30 business days', 10, 30, 4824, 4592),
    ('AT', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('BE', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('BG', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('HR', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('CY', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('CZ', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('DK', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('EE', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('FI', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('FR', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('DE', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('GR', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('HU', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('IE', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('IT', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('LV', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('LT', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('LU', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('MT', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('NL', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('PL', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('PT', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('RO', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('SK', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('SI', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('ES', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592),
    ('SE', 'European Countries', '10 - 30 business days', 10, 30, 5098, 4592)
) as rate(destination_country, zone, delivery_time_label, delivery_min_days, delivery_max_days, first_item_cents, additional_item_cents)
where product.supplier = 'printify'
  and product.supplier_product_id = '1079'
  and product.supplier_provider_name = 'Prima Printing'
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
