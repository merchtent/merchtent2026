-- Product payouts and artist self-order discounts use the product-level snapshot.
-- Restore missing snapshots from the supplier catalogue target selected in the designer.
update public.products product
set artist_cut_cents = pricing.artist_profit_cents
from public.product_designs design
join public.supplier_catalog_product_pricing pricing
  on pricing.supplier = 'printify'
 and pricing.supplier_product_id = design.printify_blueprint_id::text
where design.product_id = product.id
  and design.printify_blueprint_id is not null
  and coalesce(product.artist_cut_cents, 0) = 0
  and pricing.artist_profit_cents > 0;
