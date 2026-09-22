create or replace function public.admin_complete_order_terminal_action(
    p_order_id uuid,
    p_actor_user_id uuid,
    p_status text,
    p_reason text,
    p_stripe_refund_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_from_status text;
begin
    if p_actor_user_id is null or not exists (
        select 1 from public.profiles p
        where p.id = p_actor_user_id and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if p_status not in ('cancelled', 'refunded') then
        raise exception 'invalid terminal order status';
    end if;

    if length(btrim(coalesce(p_reason, ''))) < 5 then
        raise exception 'a reason is required';
    end if;

    select * into v_order
    from public.orders o
    where o.id = p_order_id
    for update;

    if not found then
        raise exception 'order not found';
    end if;

    if v_order.status = p_status then
        return to_jsonb(v_order);
    end if;

    if v_order.status in ('cancelled', 'refunded') then
        raise exception 'order is already in a terminal state';
    end if;

    if p_status = 'cancelled' and v_order.status not in ('pending', 'processing') then
        raise exception 'only unpaid orders can be cancelled without a refund';
    end if;

    v_from_status := v_order.status;

    insert into public.fulfillment_job_events (
        fulfillment_job_id,
        order_id,
        from_status,
        to_status,
        actor_user_id,
        reason,
        metadata
    )
    select
        f.id,
        f.order_id,
        f.status,
        'cancelled',
        p_actor_user_id,
        'order_terminal_action',
        jsonb_build_object('order_status', p_status)
    from public.fulfillment_jobs f
    where f.order_id = p_order_id
      and f.status not in ('completed', 'cancelled');

    update public.fulfillment_jobs
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now(),
        notes = concat_ws(E'\n', nullif(notes, ''), 'Cancelled because the order was ' || p_status || '.')
    where order_id = p_order_id
      and status not in ('completed', 'cancelled');

    update public.orders
    set status = p_status,
        updated_at = now()
    where id = p_order_id
    returning * into v_order;

    insert into public.order_status_events (
        order_id,
        from_status,
        to_status,
        actor_user_id,
        reason,
        metadata
    ) values (
        p_order_id,
        v_from_status,
        p_status,
        p_actor_user_id,
        case when p_status = 'refunded' then 'admin_order_refunded' else 'admin_order_cancelled' end,
        jsonb_build_object(
            'operatorReason', btrim(p_reason),
            'stripeRefundId', p_stripe_refund_id
        )
    );

    perform public.log_platform_event(
        'orders',
        case when p_status = 'refunded' then 'admin_order_refunded' else 'admin_order_cancelled' end,
        'warning',
        p_actor_user_id,
        p_order_id,
        null,
        null,
        null,
        p_stripe_refund_id,
        'Admin completed a terminal order action.',
        jsonb_build_object(
            'from_status', v_from_status,
            'to_status', p_status,
            'operator_reason', btrim(p_reason),
            'stripe_refund_id', p_stripe_refund_id
        )
    );

    return to_jsonb(v_order);
end;
$$;

revoke all on function public.admin_complete_order_terminal_action(uuid, uuid, text, text, text) from public;
revoke all on function public.admin_complete_order_terminal_action(uuid, uuid, text, text, text) from anon;
revoke all on function public.admin_complete_order_terminal_action(uuid, uuid, text, text, text) from authenticated;
grant execute on function public.admin_complete_order_terminal_action(uuid, uuid, text, text, text) to service_role;
