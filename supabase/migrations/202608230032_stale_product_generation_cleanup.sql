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
            pd.id is null
            or coalesce(pd.validation_status, 'pending') <> 'validated'
            or nullif(pd.print_asset_front_path, '') is null
            or nullif(pd.print_asset_front_hash, '') is null
            or pi.path is null
        )
   );

create or replace function public.system_mark_stale_product_generations_failed(
    p_stale_after_minutes integer default 30,
    p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cutoff timestamptz;
    v_marked_count integer := 0;
    v_product_ids uuid[] := array[]::uuid[];
    v_products jsonb := '[]'::jsonb;
begin
    if p_stale_after_minutes is null or p_stale_after_minutes < 1 or p_stale_after_minutes > 1440 then
        raise exception 'invalid stale product generation threshold';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 500 then
        raise exception 'invalid stale product generation batch size';
    end if;

    v_cutoff := now() - make_interval(mins => p_stale_after_minutes);

    with stale_products as (
        select p.id, p.artist_id, p.title
          from public.products p
         where p.production_status = 'generating'
           and p.created_at < v_cutoff
         order by p.created_at asc
         limit p_limit
         for update skip locked
    ),
    updated_products as (
        update public.products p
           set production_status = 'failed',
               is_published = false,
               readiness_notes = 'Marked failed by scheduled maintenance after stale product generation timeout.'
          from stale_products sp
         where p.id = sp.id
         returning p.id, p.artist_id, p.title
    ),
    inserted_events as (
        insert into public.product_generation_events (
            product_id,
            product_design_id,
            artist_id,
            status,
            renderer,
            renderer_version,
            message,
            metadata
        )
        select
            up.id,
            null,
            up.artist_id,
            'failed',
            'scheduled-maintenance',
            'system-v1',
            'Scheduled maintenance marked stale product generation as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff
            )
          from updated_products up
        returning product_id
    )
    select
        count(*)::integer,
        coalesce(array_agg(id order by id), array[]::uuid[]),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'product_id', id,
                    'artist_id', artist_id,
                    'title', title
                )
                order by id
            ),
            '[]'::jsonb
        )
      into v_marked_count, v_product_ids, v_products
      from updated_products;

    if v_marked_count > 0 then
        perform public.log_platform_event(
            'product_generation',
            'scheduled_stale_product_generations_marked_failed',
            'warning',
            null,
            null,
            null,
            null,
            null,
            null,
            'Scheduled maintenance marked stale product generations as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff,
                'marked_count',
                v_marked_count,
                'product_ids',
                v_product_ids,
                'products',
                v_products
            )
        );
    end if;

    return jsonb_build_object(
        'marked_count',
        v_marked_count,
        'cutoff',
        v_cutoff,
        'product_ids',
        v_product_ids
    );
end;
$$;

revoke all on public.product_generation_operational_exceptions from public;
revoke all on public.product_generation_operational_exceptions from anon;
grant select on public.product_generation_operational_exceptions to authenticated;

revoke all on function public.system_mark_stale_product_generations_failed(integer, integer) from public;
revoke all on function public.system_mark_stale_product_generations_failed(integer, integer) from anon;
grant execute on function public.system_mark_stale_product_generations_failed(integer, integer) to service_role;
