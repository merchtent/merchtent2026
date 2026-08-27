alter table if exists public.products
    drop constraint if exists products_production_status_contract_check;

alter table if exists public.products
    add constraint products_production_status_contract_check
    check (
        production_status in (
            'manual',
            'generating',
            'generated',
            'published',
            'failed'
        )
    ) not valid;

alter table if exists public.products
    drop constraint if exists products_published_status_contract_check;

alter table if exists public.products
    add constraint products_published_status_contract_check
    check (
        is_published = false
        or production_status = 'published'
    ) not valid;

alter table if exists public.product_designs
    drop constraint if exists product_designs_validation_status_contract_check;

alter table if exists public.product_designs
    add constraint product_designs_validation_status_contract_check
    check (
        validation_status in (
            'pending',
            'validated',
            'failed'
        )
    ) not valid;

alter table if exists public.product_designs
    drop constraint if exists product_designs_design_hash_contract_check;

alter table if exists public.product_designs
    add constraint product_designs_design_hash_contract_check
    check (
        design_hash is null
        or design_hash ~ '^[a-f0-9]{64}$'
    ) not valid;

alter table if exists public.product_designs
    drop constraint if exists product_designs_print_asset_hash_contract_check;

alter table if exists public.product_designs
    add constraint product_designs_print_asset_hash_contract_check
    check (
        (print_asset_front_hash is null or print_asset_front_hash ~ '^[a-f0-9]{64}$')
        and (print_asset_back_hash is null or print_asset_back_hash ~ '^[a-f0-9]{64}$')
    ) not valid;
