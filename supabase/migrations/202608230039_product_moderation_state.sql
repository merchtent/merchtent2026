alter table if exists public.products
    add column if not exists moderation_status text not null default 'pending_review';

alter table if exists public.products
    add column if not exists moderation_notes text;

alter table if exists public.products
    add column if not exists moderation_reviewed_at timestamptz;

alter table if exists public.products
    add column if not exists moderation_reviewed_by uuid references public.profiles(id) on delete set null;

alter table if exists public.products
    drop constraint if exists products_moderation_status_contract_check;

alter table if exists public.products
    add constraint products_moderation_status_contract_check
    check (
        moderation_status in (
            'draft',
            'pending_review',
            'approved',
            'blocked'
        )
    ) not valid;

alter table if exists public.products
    drop constraint if exists products_blocked_moderation_publish_contract_check;

alter table if exists public.products
    add constraint products_blocked_moderation_publish_contract_check
    check (
        is_published = false
        or moderation_status <> 'blocked'
    ) not valid;

alter table if exists public.products
    drop constraint if exists products_moderation_review_contract_check;

alter table if exists public.products
    add constraint products_moderation_review_contract_check
    check (
        (
            moderation_status in ('approved', 'blocked')
            and moderation_reviewed_at is not null
        )
        or (
            moderation_status in ('draft', 'pending_review')
            and moderation_reviewed_by is null
        )
    ) not valid;

create index if not exists idx_products_moderation_status_created_at
    on public.products (moderation_status, created_at desc);

drop view if exists public.product_generation_operational_exceptions;

create or replace view public.product_generation_operational_exceptions
with (security_invoker = true)
as
select
    p.id as product_id,
    p.artist_id,
    a.display_name as artist_name,
    p.title,
    p.slug,
    p.is_published,
    p.production_status,
    p.moderation_status,
    p.readiness_notes,
    p.created_at,
    pd.id as product_design_id,
    pd.validation_status,
    pd.print_asset_front_path,
    pd.print_asset_back_path,
    pd.print_asset_front_hash,
    pd.print_asset_back_hash,
    pi.path as primary_image_path,
    case
        when p.production_status = 'failed'
            then 'generation_failed'
        when p.production_status = 'generating'
         and p.created_at < now() - interval '30 minutes'
            then 'generation_stale'
        when p.is_published = true
         and p.moderation_status = 'pending_review'
            then 'published_pending_moderation'
        when p.is_published = true
         and p.moderation_status = 'blocked'
            then 'blocked_product_published'
        when p.is_published = true
         and pd.id is null
            then 'published_without_design'
        when p.is_published = true
         and coalesce(pd.validation_status, 'pending') <> 'validated'
            then 'design_not_validated'
        when p.is_published = true
         and (
            nullif(pd.print_asset_front_path, '') is null
            or nullif(pd.print_asset_front_hash, '') is null
         )
            then 'missing_front_print_asset'
        when p.is_published = true
         and pi.path is null
            then 'missing_storefront_mockup'
        else 'unknown'
    end as exception_reason,
    extract(epoch from (now() - p.created_at))::integer as age_seconds
from public.products p
left join public.artists a on a.id = p.artist_id
left join public.product_designs pd
    on pd.product_id = p.id
   and pd.provider = 'merch_tent'
left join lateral (
    select product_images.path
    from public.product_images
    where product_images.product_id = p.id
    order by product_images.sort_order, product_images.id
    limit 1
) pi on true
where p.production_status = 'failed'
   or (
        p.production_status = 'generating'
        and p.created_at < now() - interval '30 minutes'
   )
   or (
        p.is_published = true
        and (
            p.moderation_status in ('pending_review', 'blocked')
            or pd.id is null
            or coalesce(pd.validation_status, 'pending') <> 'validated'
            or nullif(pd.print_asset_front_path, '') is null
            or nullif(pd.print_asset_front_hash, '') is null
            or pi.path is null
        )
   );

revoke all on public.product_generation_operational_exceptions from public;
revoke all on public.product_generation_operational_exceptions from anon;
grant select on public.product_generation_operational_exceptions to authenticated;
