create or replace function public.admin_mark_stale_stripe_webhooks_failed(
    p_actor_user_id uuid,
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
    v_event_ids text[] := array[]::text[];
    v_event_types jsonb := '[]'::jsonb;
begin
    if p_actor_user_id is null or not exists (
        select 1
          from public.profiles p
         where p.id = p_actor_user_id
           and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if p_stale_after_minutes is null or p_stale_after_minutes < 1 or p_stale_after_minutes > 1440 then
        raise exception 'invalid stale webhook threshold';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 500 then
        raise exception 'invalid stale webhook batch size';
    end if;

    v_cutoff := now() - make_interval(mins => p_stale_after_minutes);

    with stale_events as (
        select swe.event_id, swe.event_type
          from public.stripe_webhook_events swe
         where swe.status = 'processing'
           and swe.processing_started_at < v_cutoff
         order by swe.processing_started_at asc
         limit p_limit
         for update skip locked
    ),
    updated_events as (
        update public.stripe_webhook_events swe
           set status = 'failed',
               failed_at = now(),
               last_error = 'Marked failed by admin maintenance after stale processing timeout.'
          from stale_events se
         where swe.event_id = se.event_id
         returning swe.event_id, swe.event_type
    )
    select
        count(*)::integer,
        coalesce(array_agg(event_id order by event_id), array[]::text[]),
        coalesce(
            jsonb_agg(jsonb_build_object('event_id', event_id, 'event_type', event_type) order by event_id),
            '[]'::jsonb
        )
      into v_marked_count, v_event_ids, v_event_types
      from updated_events;

    if v_marked_count > 0 then
        perform public.log_platform_event(
            'stripe',
            'stale_stripe_webhooks_marked_failed',
            'warning',
            p_actor_user_id,
            null,
            null,
            null,
            null,
            null,
            'Admin marked stale Stripe webhook processing events as failed.',
            jsonb_build_object(
                'stale_after_minutes',
                p_stale_after_minutes,
                'cutoff',
                v_cutoff,
                'marked_count',
                v_marked_count,
                'event_ids',
                v_event_ids,
                'event_types',
                v_event_types
            )
        );
    end if;

    return jsonb_build_object(
        'marked_count',
        v_marked_count,
        'cutoff',
        v_cutoff,
        'event_ids',
        v_event_ids
    );
end;
$$;

revoke all on function public.admin_mark_stale_stripe_webhooks_failed(uuid, integer, integer) from public;
revoke all on function public.admin_mark_stale_stripe_webhooks_failed(uuid, integer, integer) from anon;
grant execute on function public.admin_mark_stale_stripe_webhooks_failed(uuid, integer, integer) to service_role;
