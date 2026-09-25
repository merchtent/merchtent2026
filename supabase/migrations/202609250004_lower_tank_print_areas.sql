-- Lower both AS Colour 5039 guides so the printable area continues beneath
-- the armholes, matching Printify blueprint 995's product placement.
-- Width and height are unchanged to preserve the exact 3071 x 3508 ratio.
update public.supplier_catalog_products
set
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 441.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 386.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
