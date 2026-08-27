create or replace function public.system_mark_stale_printify_product_syncs_failed(
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
    v_designs jsonb := '[]'::jsonb;
begin
    if p_stale_after_minutes is null or p_stale_after_minutes < 1 or p_stale_after_minutes > 1440 then
        raise exception 'invalid stale Printify product sync threshold';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 500 then
        raise exception 'invalid stale Printify product sync batch size';
    end if;

    v_cutoff := now() - make_interval(mins => p_stale_after_minutes);

    with stale_designs as (
        select pd.id, pd.product_id, pd.artist_id
          from public.product_designs pd
         where pd.printify_status = 'syncing'
           and pd.updated_at < v_cutoff
         order by pd.updated_at asc
         limit p_limit
         for update skip locked
    ),
    updated_designs as (
        update public.product_designs pd
           set printify_status = 'failed',
               printify_last_error = 'Marked failed by scheduled maintenance after stale Printify product sync timeout.',
               updated_at = now()
          from stale_designs sd
         where pd.id = sd.id
         returning pd.id, pd.product_id, pd.artist_id
    ),
    inserted_events as (
        insert into public.printify_sync_events (
            product_id,
            product_design_id,
            artist_id,
            status,
            error_message,
            request_payload
        )
        select
            product_id,
            id,
            artist_id,
            'failed',
            'Marked failed by scheduled maintenance after stale Printify product sync timeout.',
            jsonb_build_object(
                'reason',
                'scheduled_stale_printify_product_sync_cleanup',
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff
            )
          from updated_designs
        returning product_id, product_design_id, artist_id
    )
    select
        count(*)::integer,
        coalesce(array_agg(product_id order by product_id), array[]::uuid[]),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'product_id', product_id,
                    'product_design_id', product_design_id,
                    'artist_id', artist_id
                )
                order by product_id
            ),
            '[]'::jsonb
        )
      into v_marked_count, v_product_ids, v_designs
      from inserted_events;

    if v_marked_count > 0 then
        perform public.log_platform_event(
            'fulfillment',
            'scheduled_stale_printify_product_syncs_marked_failed',
            'warning',
            null,
            null,
            null,
            null,
            null,
            null,
            'Scheduled maintenance marked stale Printify product syncs as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff,
                'marked_count',
                v_marked_count,
                'product_ids',
                v_product_ids,
                'designs',
                v_designs
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

revoke all on function public.system_mark_stale_printify_product_syncs_failed(integer, integer) from public;
revoke all on function public.system_mark_stale_printify_product_syncs_failed(integer, integer) from anon;
grant execute on function public.system_mark_stale_printify_product_syncs_failed(integer, integer) to service_role;
