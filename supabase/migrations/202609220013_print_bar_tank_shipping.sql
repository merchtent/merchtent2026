-- Printify blueprint 995 / The Print Bar shipping supplied on 2026-09-22.
-- AU is the currently supported checkout destination; retain the other shown
-- zones as source data until international checkout is enabled.

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
    966,
    201,
    'AUD',
    jsonb_build_object(
        'source', 'Printify catalogue shipping screenshot',
        'captured_on', '2026-09-22',
        'supplied_rates', jsonb_build_array(
            jsonb_build_object(
                'zone', 'Australia',
                'delivery_time', '3 - 6 business days',
                'first_item_cents', 966,
                'additional_item_cents', 201,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'European Countries',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 2599,
                'additional_item_cents', 230,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'Rest Of The World',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 2180,
                'additional_item_cents', 230,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'New Zealand',
                'delivery_time', '5 - 10 business days',
                'first_item_cents', 1877,
                'additional_item_cents', 201,
                'currency', 'AUD'
            )
        )
    )
from public.supplier_catalog_products product
where product.supplier = 'printify'
  and product.supplier_product_id = '995'
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
