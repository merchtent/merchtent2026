-- Printify blueprint 995: Classic Tank Top.
-- Provider: The Print Bar. Prices are the Printify AUD figures supplied on
-- 2026-09-22. The Premium production cost is AUD 27.30 for every enabled
-- colour/size variant (S-2XL); the standard reference price is AUD 36.53.

alter table public.supplier_catalog_products
    drop constraint if exists supplier_catalog_products_garment_kind_check;

alter table public.supplier_catalog_products
    add constraint supplier_catalog_products_garment_kind_check
    check (garment_kind in ('tee', 'hoodie', 'tank'));

update public.supplier_catalog_products
set
    category = 'tanks',
    garment_kind = 'tank',
    default_price_cents = 3900,
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 290.0 / 900.0,
            'y', 250.0 / 1200.0,
            'width', 320.0 / 900.0,
            'height', 500.0 / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 290.0 / 900.0,
            'y', 235.0 / 1200.0,
            'width', 320.0 / 900.0,
            'height', 515.0 / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';

update public.supplier_catalog_variants variant
set
    cost_cents = 2730,
    price_cents = 3653,
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '995'
  and variant.size_label in ('S', 'M', 'L', 'XL', '2XL')
  and variant.color_label in ('Ash Stone', 'Black Stone', 'Moss Stone');

update public.supplier_catalog_product_pricing
set
    default_price_cents = 3900,
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';

insert into public.supplier_catalog_provider_shipping (
    catalog_product_id,
    supplier,
    supplier_product_id,
    supplier_provider_id,
    destination_country,
    shipping_method,
    delivery_time_label,
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
    '4.0+ days',
    'All',
    966,
    null,
    'AUD',
    jsonb_build_object(
        'source', 'Printify catalogue screenshot',
        'captured_on', '2026-09-22',
        'additional_item_cost', 'not supplied'
    )
from public.supplier_catalog_products product
where product.supplier = 'printify'
  and product.supplier_product_id = '995'
  and product.supplier_provider_id is not null
on conflict (catalog_product_id, destination_country, shipping_method, size_type_label)
do update set
    first_item_cents = excluded.first_item_cents,
    delivery_time_label = excluded.delivery_time_label,
    raw_supplier_data = excluded.raw_supplier_data,
    updated_at = now();
