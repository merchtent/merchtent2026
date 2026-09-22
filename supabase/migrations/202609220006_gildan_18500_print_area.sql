-- Calibrate the Gildan 18500 front print area against Printify's provider
-- designer. Ratios target the shared 900 x 1200 Merch Tent design canvas.

update public.supplier_catalog_products
set print_areas = jsonb_set(
    print_areas,
    '{front}',
    jsonb_build_object(
        'x', 280.0 / 900.0,
        'y', 480.0 / 1200.0,
        'width', 340.0 / 900.0,
        'height', 230.0 / 1200.0,
        'units', 'ratio',
        'supplierPlacement', 'front'
    ),
    true
)
where supplier = 'printify'
  and supplier_product_id = '77';
