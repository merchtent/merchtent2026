create or replace function public.system_mark_stale_printify_order_syncs_failed(
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
    v_order_ids uuid[] := array[]::uuid[];
    v_syncs jsonb := '[]'::jsonb;
begin
    if p_stale_after_minutes is null or p_stale_after_minutes < 1 or p_stale_after_minutes > 1440 then
        raise exception 'invalid stale Printify order sync threshold';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 500 then
        raise exception 'invalid stale Printify order sync batch size';
    end if;

    v_cutoff := now() - make_interval(mins => p_stale_after_minutes);

    with stale_syncs as (
        select pos.order_id, pos.printify_order_id
          from public.printify_order_syncs pos
         where pos.status = 'started'
           and pos.attempted_at < v_cutoff
         order by pos.attempted_at asc
         limit p_limit
         for update skip locked
    ),
    updated_syncs as (
        update public.printify_order_syncs pos
           set status = 'failed',
               failed_at = now(),
               error_message = 'Marked failed by scheduled maintenance after stale Printify order sync timeout.'
          from stale_syncs ss
         where pos.order_id = ss.order_id
         returning pos.order_id, pos.printify_order_id
    )
    select
        count(*)::integer,
        coalesce(array_agg(order_id order by order_id), array[]::uuid[]),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'order_id', order_id,
                    'printify_order_id', printify_order_id
                )
                order by order_id
            ),
            '[]'::jsonb
        )
      into v_marked_count, v_order_ids, v_syncs
      from updated_syncs;

    if v_marked_count > 0 then
        perform public.log_platform_event(
            'fulfillment',
            'scheduled_stale_printify_order_syncs_marked_failed',
            'warning',
            null,
            null,
            null,
            null,
            null,
            null,
            'Scheduled maintenance marked stale Printify order syncs as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff,
                'marked_count',
                v_marked_count,
                'order_ids',
                v_order_ids,
                'syncs',
                v_syncs
            )
        );
    end if;

    return jsonb_build_object(
        'marked_count',
        v_marked_count,
        'cutoff',
        v_cutoff,
        'order_ids',
        v_order_ids
    );
end;
$$;

revoke all on function public.system_mark_stale_printify_order_syncs_failed(integer, integer) from public;
revoke all on function public.system_mark_stale_printify_order_syncs_failed(integer, integer) from anon;
grant execute on function public.system_mark_stale_printify_order_syncs_failed(integer, integer) to service_role;
