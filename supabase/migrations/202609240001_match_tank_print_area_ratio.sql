-- Match the Merch Tent designer guide to Printify blueprint 995's
-- 3071 x 3508 px printable area on both sides.
update public.supplier_catalog_products
set
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 290.0 / 900.0,
            'y', 250.0 / 1200.0,
            'width', 320.0 / 900.0,
            'height', (320.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 290.0 / 900.0,
            'y', 235.0 / 1200.0,
            'width', 320.0 / 900.0,
            'height', (320.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
