-- Printify blueprint 77 / provider 66 (Prima Printing) shipping supplied on
-- 2026-09-22. Preserve the displayed catalogue figures as source evidence;
-- cost_cents already contains 20% off the complete one-side standard price.

update public.supplier_catalog_variants variant
set raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
    'catalog_standard_one_side_cents', variant.price_cents,
    'catalog_displayed_premium_cents', case variant.price_cents
        when 4438 then 3268
        when 4811 then 3541
        else null
    end,
    'complete_premium_one_side_cents', variant.cost_cents,
    'captured_on', '2026-09-22'
)
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '66';

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
    'AU',
    'standard',
    '3 - 6 business days',
    3,
    6,
    'All',
    1053,
    417,
    'AUD',
    jsonb_build_object(
        'source', 'Printify catalogue shipping screenshot',
        'captured_on', '2026-09-22',
        'supplied_rates', jsonb_build_array(
            jsonb_build_object(
                'zone', 'Australia',
                'delivery_time', '3 - 6 business days',
                'first_item_cents', 1053,
                'additional_item_cents', 417,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'New Zealand',
                'delivery_time', '5 - 10 business days',
                'first_item_cents', 1053,
                'additional_item_cents', 417,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'United States',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 3104,
                'additional_item_cents', 2974,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'European Countries',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 9100,
                'additional_item_cents', 2483,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'Canada',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 3364,
                'additional_item_cents', 3234,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'Rest Of The World',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 8941,
                'additional_item_cents', 8594,
                'currency', 'AUD'
            )
        )
    )
from public.supplier_catalog_products product
where product.supplier = 'printify'
  and product.supplier_product_id = '77'
  and product.supplier_provider_id = '66'
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
