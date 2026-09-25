-- Customer-facing blank details for Printify blueprint 77 / Gildan 18500.
-- The size guide is limited to the supplier sizes currently configured for sale.
update public.supplier_catalog_products
set
    production_data = jsonb_set(
        coalesce(production_data, '{}'::jsonb),
        '{customer_info}',
        jsonb_build_object(
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Cotton-poly fleece',
                    'description', 'A smooth, durable 50% cotton and 50% polyester blend suited to printing. Heather Sport colours use 40% cotton and 60% polyester.'
                ),
                jsonb_build_object(
                    'title', 'Without side seams',
                    'description', 'Tubular-knit construction reduces fabric waste and gives the hoodie a clean, uninterrupted shape.'
                ),
                jsonb_build_object(
                    'title', 'Drawstring hood',
                    'description', 'An adjustable hood with a self-coloured woven drawcord provides extra coverage.'
                ),
                jsonb_build_object(
                    'title', 'Kangaroo pocket',
                    'description', 'A spacious front pouch pocket keeps hands warm and everyday essentials close.'
                ),
                jsonb_build_object(
                    'title', 'Sleeve and wrist print capable',
                    'description', 'The supplier supports Direct-to-Film sleeve and wrist placements on eligible configurations. Merch Tent currently offers front and back artwork.'
                ),
                jsonb_build_object(
                    'title', 'Embroidery capable',
                    'description', 'The supplier supports embroidery on eligible chest, centre-chest and wrist placements; availability depends on the product configuration.'
                ),
                jsonb_build_object(
                    'title', 'Adult sizing',
                    'description', 'This garment is designed and sized for adults.'
                ),
                jsonb_build_object(
                    'title', 'Made in Bangladesh',
                    'description', 'The blank garment is manufactured in Bangladesh before printing and fulfilment.'
                ),
                jsonb_build_object(
                    'title', 'Compliance tested',
                    'description', 'Meets applicable requirements for formaldehyde, flammability, lead, cadmium and phthalates levels.'
                ),
                jsonb_build_object(
                    'title', 'Inner neck label capable',
                    'description', 'The supplier supports Direct-to-Film inner neck labels on eligible configurations; this placement is not currently offered in the Merch Tent designer.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Machine wash cold, maximum 30°C',
                'Use non-chlorine bleach only when needed',
                'Tumble dry on medium heat',
                'Iron or steam on low heat',
                'Do not dry clean'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'Measurements refer to the garment itself. Sleeve length is measured from the centre back; a 3.81 cm manufacturing tolerance applies.',
                'sleeve_label', 'Sleeve length from centre back',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'S', 'width', 51.00, 'length', 69.00, 'sleeve_length', 85.09, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'M', 'width', 56.00, 'length', 71.00, 'sleeve_length', 87.63, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'L', 'width', 61.00, 'length', 74.00, 'sleeve_length', 90.17, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'XL', 'width', 66.00, 'length', 76.00, 'sleeve_length', 92.71, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '2XL', 'width', 71.10, 'length', 79.00, 'sleeve_length', 95.25, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '3XL', 'width', 76.00, 'length', 81.00, 'sleeve_length', 97.79, 'size_tolerance', 3.81)
                )
            )
        ),
        true
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '77';
