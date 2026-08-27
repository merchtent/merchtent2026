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
    p.created_at,
    pd.id as product_design_id,
    pd.validation_status,
    pd.print_asset_front_path,
    pd.print_asset_back_path,
    pd.print_asset_front_hash,
    pd.print_asset_back_hash,
    pi.path as primary_image_path,
    case
        when pd.id is null
            then 'published_without_design'
        when coalesce(pd.validation_status, 'pending') <> 'validated'
            then 'design_not_validated'
        when nullif(pd.print_asset_front_path, '') is null
          or nullif(pd.print_asset_front_hash, '') is null
            then 'missing_front_print_asset'
        when pi.path is null
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
where p.is_published = true
  and (
    pd.id is null
    or coalesce(pd.validation_status, 'pending') <> 'validated'
    or nullif(pd.print_asset_front_path, '') is null
    or nullif(pd.print_asset_front_hash, '') is null
    or pi.path is null
  );

revoke all on public.product_generation_operational_exceptions from public;
revoke all on public.product_generation_operational_exceptions from anon;
grant select on public.product_generation_operational_exceptions to authenticated;
