create or replace function public.system_mark_stale_notification_deliveries_failed(
    p_stale_after_minutes integer default 15,
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
    v_delivery_ids uuid[] := array[]::uuid[];
    v_channels jsonb := '[]'::jsonb;
begin
    if p_stale_after_minutes is null or p_stale_after_minutes < 1 or p_stale_after_minutes > 1440 then
        raise exception 'invalid stale notification threshold';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 500 then
        raise exception 'invalid stale notification batch size';
    end if;

    v_cutoff := now() - make_interval(mins => p_stale_after_minutes);

    with stale_deliveries as (
        select nd.id, nd.channel, nd.order_id
          from public.notification_deliveries nd
         where nd.status = 'pending'
           and nd.created_at < v_cutoff
         order by nd.created_at asc
         limit p_limit
         for update skip locked
    ),
    updated_deliveries as (
        update public.notification_deliveries nd
           set status = 'failed',
               last_attempted_at = coalesce(nd.last_attempted_at, now()),
               last_error = 'Marked failed by scheduled maintenance after stale pending timeout.',
               metadata = nd.metadata || jsonb_build_object(
                   'failed_by',
                   'system_mark_stale_notification_deliveries_failed',
                   'failed_reason',
                   'stale_pending_timeout'
               )
          from stale_deliveries sd
         where nd.id = sd.id
         returning nd.id, nd.channel, nd.order_id
    )
    select
        count(*)::integer,
        coalesce(array_agg(id order by id), array[]::uuid[]),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'delivery_id', id,
                    'channel', channel,
                    'order_id', order_id
                )
                order by id
            ),
            '[]'::jsonb
        )
      into v_marked_count, v_delivery_ids, v_channels
      from updated_deliveries;

    if v_marked_count > 0 then
        perform public.log_platform_event(
            'notifications',
            'scheduled_stale_notification_deliveries_marked_failed',
            'warning',
            null,
            null,
            null,
            null,
            null,
            null,
            'Scheduled maintenance marked stale pending notification deliveries as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff,
                'marked_count',
                v_marked_count,
                'delivery_ids',
                v_delivery_ids,
                'deliveries',
                v_channels
            )
        );
    end if;

    return jsonb_build_object(
        'marked_count',
        v_marked_count,
        'cutoff',
        v_cutoff,
        'delivery_ids',
        v_delivery_ids
    );
end;
$$;

revoke all on function public.system_mark_stale_notification_deliveries_failed(integer, integer) from public;
revoke all on function public.system_mark_stale_notification_deliveries_failed(integer, integer) from anon;
grant execute on function public.system_mark_stale_notification_deliveries_failed(integer, integer) to service_role;
