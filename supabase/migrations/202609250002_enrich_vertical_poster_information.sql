-- Adapt the supplier's poster information to Merch Tent's vertical-only range.

update public.supplier_catalog_products
set
    production_data = jsonb_set(
        coalesce(production_data, '{}'::jsonb),
        '{customer_info}',
        jsonb_build_object(
            'about', 'Thick premium-paper posters bring artwork to life in three vertical sizes. Choose high-gloss 200 gsm paper for extra colour punch or smooth 300 gsm matte paper for a softer, low-reflection finish.',
            'features', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Glossy or matte finish',
                    'description', 'Choose vivid high-gloss 200 gsm paper or smooth 300 gsm matte paper with restrained reflection.'
                ),
                jsonb_build_object(
                    'title', 'Vibrant colour reproduction',
                    'description', 'High-definition digital printing produces bright, crisp colour that matches detailed artwork.'
                ),
                jsonb_build_object(
                    'title', 'Premium paper stock',
                    'description', 'Substantial paper gives artwork a polished finish while remaining easy to frame or display.'
                ),
                jsonb_build_object(
                    'title', 'Three vertical sizes',
                    'description', 'Choose S, M or L, with exact finished dimensions shown in the size guide.'
                ),
                jsonb_build_object(
                    'title', 'Unframed',
                    'description', 'The poster arrives without a frame, ready for the customer to display their way.'
                )
            ),
            'care_instructions', jsonb_build_array(
                'Remove dust gently with a clean, soft, dry cloth',
                'Handle by the edges with clean, dry hands to reduce marks on the printed surface',
                'Keep away from moisture and do not apply cleaner directly to the paper',
                'If displayed behind acrylic or glass, apply cleaner to the cloth rather than toward the poster'
            ),
            'size_guide', jsonb_build_object(
                'unit', 'cm',
                'measurement_note', 'S, M and L are Merch Tent labels. Measurements refer to the finished vertical poster.',
                'length_label', 'Height',
                'measurements', jsonb_build_array(
                    jsonb_build_object('size', 'S', 'width', 40.64, 'length', 50.8, 'metrics', jsonb_build_array(
                        jsonb_build_object('label', 'Supplier size', 'value', '16 x 20 in')
                    )),
                    jsonb_build_object('size', 'M', 'width', 50.8, 'length', 60.96, 'metrics', jsonb_build_array(
                        jsonb_build_object('label', 'Supplier size', 'value', '20 x 24 in')
                    )),
                    jsonb_build_object('size', 'L', 'width', 50.8, 'length', 76.2, 'metrics', jsonb_build_array(
                        jsonb_build_object('label', 'Supplier size', 'value', '20 x 30 in')
                    ))
                )
            )
        ),
        true
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1079'
  and supplier_provider_name = 'Prima Printing';
