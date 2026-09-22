-- Conservative operational costs and routable international shipping.
-- Supplier figures are ex GST; checkout adds GST and rounds upward.

alter table public.supplier_catalog_provider_shipping
    drop constraint if exists supplier_catalog_provider_shipping_delivery_days_check;

alter table public.supplier_catalog_provider_shipping
    add constraint supplier_catalog_provider_shipping_delivery_days_check
    check (
        (delivery_min_days is null or delivery_min_days between 1 and 60)
        and (delivery_max_days is null or delivery_max_days between 1 and 60)
        and (delivery_min_days is null or delivery_max_days is null or delivery_min_days <= delivery_max_days)
    );

-- Prima tee catalogue totals include front and back. Convert all variants to
-- one-side routing costs using the observed provider print charge by size.
update public.supplier_catalog_variants variant
set
    cost_cents = greatest(variant.price_cents - case
        when variant.size_label in ('2XL', '3XL') then 468 else 434
    end, 0),
    raw_supplier_data = coalesce(variant.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'pricing_basis', 'standard_non_premium_ex_gst',
        'standard_back_print_estimate_cents', case
            when variant.size_label in ('2XL', '3XL') then 468 else 434
        end,
        'standard_one_side_estimate_cents', greatest(variant.price_cents - case
            when variant.size_label in ('2XL', '3XL') then 468 else 434
        end, 0),
        'standard_two_side_cents', variant.price_cents,
        'pricing_status', 'conservative estimate from supplied provider range',
        'captured_on', '2026-09-22'
    )
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
  and product.supplier_provider_id = '66'
  and variant.price_cents is not null;

update public.supplier_catalog_products
set production_data = coalesce(production_data, '{}'::jsonb) || jsonb_build_object(
    'routing_back_print_cost_cents', case
        when supplier_product_id = '145' and supplier_provider_id = '34' then 1202
        when supplier_product_id = '145' and supplier_provider_id = '66' then 468
        when supplier_product_id = '77' then 1050
        when supplier_product_id = '995' then 1072
        else 0
    end,
    'cost_estimate_policy', 'use known cost; otherwise upper-bound supplied range'
)
where supplier = 'printify'
  and supplier_product_id in ('145', '77', '995');

with rate_source(supplier_product_id, supplier_provider_id, countries, delivery_label, min_days, max_days, first_cents, additional_cents) as (
    values
        ('145', '34', array['NZ'], '5 - 10 business days', 5, 10, 1877, 201),
        ('145', '34', array['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'], '10 - 30 business days', 10, 30, 2599, 230),
        ('145', '34', array['ROW'], '10 - 30 business days', 10, 30, 2180, 230),
        ('145', '66', array['NZ'], '5 - 10 business days', 5, 10, 966, 201),
        ('145', '66', array['US'], '10 - 30 business days', 10, 30, 2093, 2007),
        ('145', '66', array['CA'], '10 - 30 business days', 10, 30, 2267, 2180),
        ('145', '66', array['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'], '10 - 30 business days', 10, 30, 6311, 1804),
        ('145', '66', array['ROW'], '10 - 30 business days', 10, 30, 6037, 5806),
        ('77', '34', array['NZ'], '5 - 10 business days', 5, 10, 1963, 287),
        ('77', '34', array['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'], '10 - 30 business days', 10, 30, 2599, 230),
        ('77', '34', array['ROW'], '10 - 30 business days', 10, 30, 2180, 230),
        ('77', '66', array['NZ'], '5 - 10 business days', 5, 10, 1053, 417),
        ('77', '66', array['US'], '10 - 30 business days', 10, 30, 3104, 2974),
        ('77', '66', array['CA'], '10 - 30 business days', 10, 30, 3364, 3234),
        ('77', '66', array['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'], '10 - 30 business days', 10, 30, 9100, 2483),
        ('77', '66', array['ROW'], '10 - 30 business days', 10, 30, 8941, 8594),
        ('995', '34', array['NZ'], '5 - 10 business days', 5, 10, 1877, 201),
        ('995', '34', array['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'], '10 - 30 business days', 10, 30, 2599, 230),
        ('995', '34', array['ROW'], '10 - 30 business days', 10, 30, 2180, 230)
), expanded as (
    select rate_source.*, unnest(countries) as country from rate_source
)
insert into public.supplier_catalog_provider_shipping (
    catalog_product_id, supplier, supplier_product_id, supplier_provider_id,
    destination_country, shipping_method, delivery_time_label, delivery_min_days,
    delivery_max_days, size_type_label, first_item_cents, additional_item_cents,
    currency, raw_supplier_data
)
select product.id, 'printify', source.supplier_product_id, source.supplier_provider_id,
    source.country, 'standard', source.delivery_label, source.min_days, source.max_days,
    'All', source.first_cents, source.additional_cents, 'AUD',
    jsonb_build_object('source', 'Printify supplied rate', 'captured_on', '2026-09-22', 'cost_tax_mode', 'ex_gst')
from expanded source
join public.supplier_catalog_products product
  on product.supplier = 'printify'
 and product.supplier_product_id = source.supplier_product_id
 and product.supplier_provider_id = source.supplier_provider_id
on conflict (catalog_product_id, destination_country, shipping_method, size_type_label)
do update set delivery_time_label = excluded.delivery_time_label,
    delivery_min_days = excluded.delivery_min_days,
    delivery_max_days = excluded.delivery_max_days,
    first_item_cents = excluded.first_item_cents,
    additional_item_cents = excluded.additional_item_cents,
    currency = excluded.currency,
    raw_supplier_data = excluded.raw_supplier_data,
    updated_at = now();
