alter table if exists public.product_designs
    alter column provider set default 'merch_tent';

update public.product_designs
set
    provider = 'merch_tent',
    printify_status = 'not_synced',
    printify_last_error = null
where provider = 'printify'
  and printify_product_id is null;
