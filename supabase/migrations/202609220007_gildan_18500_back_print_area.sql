-- Calibrate the Gildan 18500 back print area against Printify's provider
-- designer. The area starts below the hood and ends above the lower hem.

update public.supplier_catalog_products
set print_areas = jsonb_set(
    print_areas,
    '{back}',
    jsonb_build_object(
        'x', 280.0 / 900.0,
        'y', 450.0 / 1200.0,
        'width', 340.0 / 900.0,
        'height', 385.0 / 1200.0,
        'units', 'ratio',
        'supplierPlacement', 'back'
    ),
    true
)
where supplier = 'printify'
  and supplier_product_id = '77';
