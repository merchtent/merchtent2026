update public.supplier_catalog_variants variant
set cost_cents = case
    when variant.color_label = 'White' and variant.size_label in ('XS', 'S', 'M', 'L', 'XL', '2XL') then 1439
    when variant.color_label = 'White' and variant.size_label in ('3XL', '5XL') then 1653

    when variant.color_label in (
        'Sport Grey',
        'Charcoal',
        'Red',
        'Royal'
    ) and variant.size_label in ('XS', 'S', 'M', 'L', 'XL', '2XL') then 1536
    when variant.color_label in (
        'Sport Grey',
        'Charcoal',
        'Red',
        'Royal'
    ) and variant.size_label = '3XL' then 1748
    when variant.color_label in (
        'Sport Grey',
        'Charcoal',
        'Red',
        'Royal'
    ) and variant.size_label in ('4XL', '5XL') then 1680

    when variant.color_label = 'Black' and variant.size_label in ('XS', 'S', 'M', 'L', 'XL', '2XL') then 1521
    when variant.color_label = 'Black' and variant.size_label in ('3XL', '5XL') then 1748
    when variant.color_label = 'Black' and variant.size_label = '4XL' then 1671

    when variant.color_label in (
        'Antique Cherry Red',
        'Cardinal Red',
        'Cherry Red',
        'Daisy',
        'Dark Chocolate',
        'Dark Heather',
        'Forest Green',
        'Gold',
        'Heather Military Green',
        'Heather Purple',
        'Heather Royal',
        'Ice Grey',
        'Indigo Blue',
        'Irish Green',
        'Kelly Green',
        'Light Blue',
        'Maroon',
        'Military Green',
        'Natural',
        'Navy',
        'Orange',
        'Purple',
        'Sand'
    ) and variant.size_label in ('XS', 'S', 'M', 'L', 'XL', '2XL') then 1536
    when variant.color_label in (
        'Daisy',
        'Dark Chocolate',
        'Dark Heather',
        'Forest Green',
        'Gold',
        'Heather Military Green',
        'Heather Purple',
        'Heather Royal',
        'Ice Grey',
        'Indigo Blue',
        'Light Blue',
        'Maroon',
        'Military Green',
        'Natural',
        'Navy',
        'Orange',
        'Purple',
        'Sand'
    ) and variant.size_label = '3XL' then 1748
    else variant.cost_cents
end
from public.supplier_catalog_products product
where product.id = variant.catalog_product_id
  and product.supplier = 'printify'
  and product.supplier_product_id = '145'
  and product.supplier_provider_id = '34'
  and variant.color_label in (
      'Antique Cherry Red',
      'Black',
      'Cardinal Red',
      'Charcoal',
      'Cherry Red',
      'Daisy',
      'Dark Chocolate',
      'Dark Heather',
      'Forest Green',
      'Gold',
      'Heather Military Green',
      'Heather Purple',
      'Heather Royal',
      'Ice Grey',
      'Indigo Blue',
      'Irish Green',
      'Kelly Green',
      'Light Blue',
      'Maroon',
      'Military Green',
      'Natural',
      'Navy',
      'Orange',
      'Purple',
      'Red',
      'Royal',
      'Sand',
      'Sport Grey',
      'White'
  )
  and variant.size_label in ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL');
