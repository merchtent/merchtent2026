-- Align the AS Colour 5039 designer guides with Printify blueprint 995's
-- front and back product templates. Both placements retain the supplier's
-- exact 3071 x 3508 px printable-area ratio.
update public.supplier_catalog_products
set
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 357.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 296.0 / 900.0,
            'y', 302.0 / 1200.0,
            'width', 308.0 / 900.0,
            'height', (308.0 * 3508.0 / 3071.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'back'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
