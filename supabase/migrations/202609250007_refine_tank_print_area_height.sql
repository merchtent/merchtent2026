-- Fine-tune the AS Colour 5039 placement upward, with a slightly larger
-- adjustment on the front. Dimensions retain Printify's 3071 x 3508 ratio.
update public.supplier_catalog_products
set
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 387.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 338.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
