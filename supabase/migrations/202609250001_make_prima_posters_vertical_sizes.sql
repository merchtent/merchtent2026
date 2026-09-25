-- Keep the Prima poster range portrait-only and expose familiar retail size names.
-- Each size still retains its exact supplier dimensions and print asset ratio.

update public.supplier_catalog_products
set
    merch_tent_name = 'Vertical Art Poster',
    sizes = jsonb_build_array('S', 'M', 'L'),
    production_data = jsonb_set(
        jsonb_set(
            jsonb_set(
                coalesce(production_data, '{}'::jsonb),
                '{variant_print_areas}',
                jsonb_build_object(
                    '81394', jsonb_build_object('width', 4859, 'height', 6059, 'orientation', 'vertical', 'size', 'S'),
                    '81395', jsonb_build_object('width', 4859, 'height', 6059, 'orientation', 'vertical', 'size', 'S'),
                    '81400', jsonb_build_object('width', 6059, 'height', 7259, 'orientation', 'vertical', 'size', 'M'),
                    '81401', jsonb_build_object('width', 6059, 'height', 7259, 'orientation', 'vertical', 'size', 'M'),
                    '81396', jsonb_build_object('width', 6059, 'height', 9059, 'orientation', 'vertical', 'size', 'L'),
                    '81397', jsonb_build_object('width', 6059, 'height', 9059, 'orientation', 'vertical', 'size', 'L')
                ),
                true
            ),
            '{notes}',
            jsonb_build_array(
                'Single-sided, full-bleed vertical poster product.',
                'Retail sizes map to S (16 x 20), M (20 x 24), and L (20 x 30).',
                'Each supplier variant retains its exact output dimensions for fulfilment.'
            ),
            true
        ),
        '{customer_info,size_guide}',
        jsonb_build_object(
            'unit', 'cm',
            'measurement_note', 'S, M and L are Merch Tent labels. Dimensions refer to the finished vertical poster.',
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
        ),
        true
    ) || jsonb_build_object(
        'orientation', 'vertical',
        'retail_size_map', jsonb_build_object(
            'S', '16 x 20 in',
            'M', '20 x 24 in',
            'L', '20 x 30 in'
        )
    ),
    updated_at = now()
where supplier = 'printify'
  and supplier_product_id = '1079'
  and supplier_provider_name = 'Prima Printing';

update public.supplier_catalog_variants variant
set
    is_enabled = variant.supplier_variant_id in ('81394', '81395', '81400', '81401', '81396', '81397'),
    size_label = case
        when variant.supplier_variant_id in ('81394', '81395') then 'S'
        when variant.supplier_variant_id in ('81400', '81401') then 'M'
        when variant.supplier_variant_id in ('81396', '81397') then 'L'
        else variant.size_label
    end,
    updated_at = now()
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '1079'
  and variant.supplier_variant_id between '81390' and '81401';
