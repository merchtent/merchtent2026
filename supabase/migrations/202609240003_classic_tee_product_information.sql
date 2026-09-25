-- Customer-facing blank details for Printify blueprint 145 / Gildan 64000.
-- The guide covers the complete size range configured in the Merch Tent catalogue.
update public.supplier_catalog_products
set
    production_data = jsonb_set(
        coalesce(production_data, '{}'::jsonb),
        '{customer_info}',
        jsonb_build_object(
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Print-ready cotton fabric',
                    'description', 'Specially spun fibres create a durable, smooth surface suited to detailed printing. Natural colour garments may show small dark flecks from unprocessed cotton.'
                ),
                jsonb_build_object(
                    'title', 'Without side seams',
                    'description', 'Tubular-knit construction reduces fabric waste and gives the tee a clean, uninterrupted shape.'
                ),
                jsonb_build_object(
                    'title', 'Ribbed knit collar',
                    'description', 'A highly elastic ribbed collar helps the neckline retain its shape.'
                ),
                jsonb_build_object(
                    'title', 'Shoulder tape',
                    'description', 'Twill tape reinforces the shoulder seams, stabilises the back of the garment and helps prevent stretching.'
                ),
                jsonb_build_object(
                    'title', 'Adult sizing',
                    'description', 'This garment is designed and sized for adults.'
                ),
                jsonb_build_object(
                    'title', 'Two-year EU warranty',
                    'description', 'Covered by a two-year warranty for customers in the European Union.'
                ),
                jsonb_build_object(
                    'title', 'Compliance tested',
                    'description', 'Meets applicable requirements for flammability, lead, cadmium, phthalates and formaldehyde levels.'
                ),
                jsonb_build_object(
                    'title', 'Made in Bangladesh',
                    'description', 'The blank garment is manufactured in Bangladesh before printing and fulfilment.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Machine wash cold, maximum 30°C, with similar colours',
                'Do not bleach',
                'Tumble dry on low heat',
                'Iron or steam on low heat',
                'Do not dry clean'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'Measurements refer to the garment itself. Width is measured across the chest; a 3.81 cm manufacturing tolerance applies.',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'XS', 'width', 40.64, 'length', 68.58, 'sleeve_length', 20.30, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'S', 'width', 45.72, 'length', 71.12, 'sleeve_length', 20.90, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'M', 'width', 50.80, 'length', 73.66, 'sleeve_length', 21.60, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'L', 'width', 55.88, 'length', 76.20, 'sleeve_length', 22.20, 'size_tolerance', 3.81),
                    jsonb_build_object('size', 'XL', 'width', 60.96, 'length', 78.74, 'sleeve_length', 22.90, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '2XL', 'width', 66.04, 'length', 81.28, 'sleeve_length', 23.50, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '3XL', 'width', 71.12, 'length', 83.82, 'sleeve_length', 24.10, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '4XL', 'width', 76.20, 'length', 86.36, 'sleeve_length', 24.70, 'size_tolerance', 3.81),
                    jsonb_build_object('size', '5XL', 'width', 81.28, 'length', 88.90, 'sleeve_length', 25.30, 'size_tolerance', 3.81)
                )
            )
        ),
        true
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '145';
