-- The imported Printify #995 shipping row already contained the AUD 1.39
-- additional-item rate, but its currency label was stale. Keep that supplier
-- value and align the route with the AUD 9.66 first-item figure supplied on
-- 2026-09-22.

update public.supplier_catalog_provider_shipping shipping
set
    first_item_cents = 966,
    currency = 'AUD',
    raw_supplier_data = coalesce(shipping.raw_supplier_data, '{}'::jsonb) || jsonb_build_object(
        'source', 'Printify catalogue and supplier shipping data',
        'verified_on', '2026-09-22'
    ),
    updated_at = now()
from public.supplier_catalog_products product
where product.id = shipping.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '995'
  and shipping.destination_country = 'AU'
  and shipping.shipping_method = 'standard';
