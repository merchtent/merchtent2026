create or replace view public.orders_operational_exceptions
with (security_invoker = true)
as
select
    o.id,
    o.order_number,
    o.stripe_session_id,
    o.status,
    o.operational_status,
    o.created_at,
    o.updated_at,
    count(oi.id) as item_rows,
    coalesce(sum(coalesce(oi.qty, 0)), 0) as item_units,
    fj.id as fulfillment_job_id,
    fj.status as fulfillment_status,
    case
        when count(oi.id) = 0 then 'missing_order_items'
        when fj.id is null then 'missing_fulfillment_job'
        when nullif(btrim(o.email), '') is null then 'missing_customer_email'
        when nullif(btrim(o.first_name), '') is null
          or nullif(btrim(o.last_name), '') is null
          or nullif(btrim(o.line1), '') is null
          or nullif(btrim(o.city), '') is null
          or nullif(btrim(o.state), '') is null
          or nullif(btrim(o.postal_code), '') is null
          or nullif(btrim(o.country), '') is null
          or nullif(btrim(o.phone), '') is null
            then 'missing_fulfillment_address'
        when upper(coalesce(o.country, '')) !~ '^[A-Z]{2}$' then 'invalid_shipping_country'
        else 'unknown'
    end as exception_reason
from public.orders o
left join public.order_items oi on oi.order_id = o.id
left join public.fulfillment_jobs fj on fj.order_id = o.id
where o.status in ('paid', 'in_production', 'shipped')
group by o.id, fj.id
having count(oi.id) = 0
    or fj.id is null
    or nullif(btrim(o.email), '') is null
    or nullif(btrim(o.first_name), '') is null
    or nullif(btrim(o.last_name), '') is null
    or nullif(btrim(o.line1), '') is null
    or nullif(btrim(o.city), '') is null
    or nullif(btrim(o.state), '') is null
    or nullif(btrim(o.postal_code), '') is null
    or nullif(btrim(o.country), '') is null
    or nullif(btrim(o.phone), '') is null
    or upper(coalesce(o.country, '')) !~ '^[A-Z]{2}$';

revoke all on public.orders_operational_exceptions from public;
revoke all on public.orders_operational_exceptions from anon;
grant select on public.orders_operational_exceptions to authenticated;

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
         and p.moderation_status = 'blocked'
            then 'blocked_product_published'
        when p.is_published = true
         and p.fulfillment_flow = 'supplier_on_demand'
         and pd.id is null
            then 'published_without_design'
        when p.is_published = true
         and p.fulfillment_flow = 'supplier_on_demand'
         and coalesce(pd.validation_status, 'pending') <> 'validated'
            then 'design_not_validated'
        when p.is_published = true
         and p.fulfillment_flow = 'supplier_on_demand'
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
where p.artist_archived_at is null
  and (
    p.production_status = 'failed'
    or (
        p.production_status = 'generating'
        and p.created_at < now() - interval '30 minutes'
    )
    or (
        p.is_published = true
        and (
            p.moderation_status = 'blocked'
            or (
                p.fulfillment_flow = 'supplier_on_demand'
                and (
                    pd.id is null
                    or coalesce(pd.validation_status, 'pending') <> 'validated'
                    or nullif(pd.print_asset_front_path, '') is null
                    or nullif(pd.print_asset_front_hash, '') is null
                )
            )
            or pi.path is null
        )
    )
  );

revoke all on public.product_generation_operational_exceptions from public;
revoke all on public.product_generation_operational_exceptions from anon;
grant select on public.product_generation_operational_exceptions to authenticated;
