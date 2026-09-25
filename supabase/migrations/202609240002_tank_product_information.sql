-- Customer-facing blank details for Printify blueprint 995 / AS Colour 5039.
-- Only orderable Merch Tent sizes are included in the size guide.
update public.supplier_catalog_products
set
    production_data = jsonb_set(
        coalesce(production_data, '{}'::jsonb),
        '{customer_info}',
        jsonb_build_object(
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', '100% combed cotton',
                    'description', 'Specially spun cotton fibres create a durable, smooth surface suited to detailed printing.'
                ),
                jsonb_build_object(
                    'title', 'Stone washed',
                    'description', 'Stone-washed cotton gives each garment a naturally worn-in look with subtle variation.'
                ),
                jsonb_build_object(
                    'title', 'Raw sleeve edge',
                    'description', 'Cut-off sleeves with raw edges give the tank its relaxed muscle-tee profile.'
                ),
                jsonb_build_object(
                    'title', 'Ribbed collar',
                    'description', 'The ribbed neckline stretches for comfort and recovers to retain its shape.'
                ),
                jsonb_build_object(
                    'title', 'Shoulder-to-shoulder tape',
                    'description', 'Twill tape stabilises the shoulder and neck seams to help prevent stretching.'
                ),
                jsonb_build_object(
                    'title', 'Double-needle bottom hem',
                    'description', 'A double-stitched bottom hem improves strength and long-term durability.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Machine wash cold, maximum 30°C',
                'Do not bleach',
                'Tumble dry on low heat',
                'Iron or steam on low heat',
                'Do not dry clean'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'Measurements refer to the garment itself. Width is measured across the chest.',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'S', 'width', 48, 'length', 72),
                    jsonb_build_object('size', 'M', 'width', 51, 'length', 75),
                    jsonb_build_object('size', 'L', 'width', 54, 'length', 78),
                    jsonb_build_object('size', 'XL', 'width', 57, 'length', 81),
                    jsonb_build_object('size', '2XL', 'width', 60, 'length', 84)
                )
            )
        ),
        true
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '995';
