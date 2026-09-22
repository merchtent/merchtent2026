-- Printify blueprint 145 / provider 66 (Prima Printing) catalogue pricing and
-- shipping supplied on 2026-09-22. The green Premium figures remain provisional
-- blank costs until the complete production breakdown is supplied; record the
-- corresponding standard catalogue prices separately for reference.

update public.supplier_catalog_variants variant
set
    price_cents = case variant.cost_cents
        when 1105 then 1378
        when 1302 then 1624
        when 1419 then 1770
        when 1458 then 1819
        when 1621 then 2021
        else variant.price_cents
    end,
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'catalog_premium_blank_cents', variant.cost_cents,
        'catalog_standard_blank_cents', case variant.cost_cents
            when 1105 then 1378
            when 1302 then 1624
            when 1419 then 1770
            when 1458 then 1819
            when 1621 then 2021
            else null
        end,
        'pricing_status', 'awaiting complete production breakdown',
        'captured_on', '2026-09-22'
    )
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
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
                'zone', 'New Zealand',
                'delivery_time', '5 - 10 business days',
                'first_item_cents', 966,
                'additional_item_cents', 201,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'United States',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 2093,
                'additional_item_cents', 2007,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'European Countries',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 6311,
                'additional_item_cents', 1804,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'Canada',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 2267,
                'additional_item_cents', 2180,
                'currency', 'AUD'
            ),
            jsonb_build_object(
                'zone', 'Rest Of The World',
                'delivery_time', '10 - 30 business days',
                'first_item_cents', 6037,
                'additional_item_cents', 5806,
                'currency', 'AUD'
            )
        )
    )
from public.supplier_catalog_products product
where product.supplier = 'printify'
  and product.supplier_product_id = '145'
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
