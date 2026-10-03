-- Lower the AS Colour AS1140 artwork boundary to match the supplier's crown placement.

update public.supplier_catalog_products
set
    print_areas = jsonb_build_object(
        'front', jsonb_build_object(
            'x', 270.0 / 900.0,
            'y', 420.0 / 1200.0,
            'width', 360.0 / 900.0,
            'height', (360.0 * 675.0 / 1200.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        ),
        'back', jsonb_build_object(
            'x', 270.0 / 900.0,
            'y', 420.0 / 1200.0,
            'width', 360.0 / 900.0,
            'height', (360.0 * 675.0 / 1200.0) / 1200.0,
            'units', 'ratio',
            'supplierPlacement', 'front'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '5384'
  and supplier_provider_id = '34';
