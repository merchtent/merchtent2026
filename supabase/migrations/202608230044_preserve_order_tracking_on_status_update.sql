create or replace function public.admin_update_order_status(
    p_order_id uuid,
    p_actor_user_id uuid,
    p_status text,
    p_tracking_code text default null,
    p_tracking_carrier text default null,
    p_tracking_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_from_status text;
    v_existing_order public.orders%rowtype;
    v_order public.orders%rowtype;
    v_tracking_code text := nullif(btrim(coalesce(p_tracking_code, '')), '');
    v_tracking_carrier text := nullif(btrim(coalesce(p_tracking_carrier, '')), '');
    v_tracking_url text := nullif(btrim(coalesce(p_tracking_url, '')), '');
begin
    if p_actor_user_id is null or not exists (
        select 1
          from public.profiles p
         where p.id = p_actor_user_id
           and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if p_status not in ('pending', 'paid', 'in_production', 'shipped', 'delivered') then
        raise exception 'invalid order status';
    end if;

    select *
      into v_existing_order
      from public.orders o
     where o.id = p_order_id
     for update;

    if not found then
        raise exception 'order not found';
    end if;

    v_from_status := v_existing_order.status;

    if p_status = 'shipped'
       and coalesce(v_tracking_code, v_existing_order.tracking_code) is null then
        raise exception 'tracking number is required for shipped orders';
    end if;

    if p_status = 'shipped'
       and coalesce(v_tracking_carrier, v_existing_order.tracking_carrier) is null then
        raise exception 'tracking carrier is required for shipped orders';
    end if;

    update public.orders
       set status = p_status,
           tracking_code = coalesce(v_tracking_code, v_existing_order.tracking_code),
           tracking_carrier = coalesce(v_tracking_carrier, v_existing_order.tracking_carrier),
           tracking_url = coalesce(v_tracking_url, v_existing_order.tracking_url),
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
    )
    values (
        p_order_id,
        v_from_status,
        p_status,
        p_actor_user_id,
        'admin_status_update',
        jsonb_build_object(
            'trackingNumber', v_order.tracking_code,
            'carrier', v_order.tracking_carrier,
            'trackingUrl', v_order.tracking_url
        )
    );

    perform public.log_platform_event(
        'orders',
        'admin_order_status_updated',
        'info',
        p_actor_user_id,
        p_order_id,
        null,
        null,
        null,
        null,
        'Admin updated order status.',
        jsonb_build_object(
            'from_status', v_from_status,
            'to_status', p_status,
            'tracking_number', v_order.tracking_code,
            'carrier', v_order.tracking_carrier,
            'tracking_url', v_order.tracking_url
        )
    );

    return to_jsonb(v_order);
end;
$$;

revoke all on function public.admin_update_order_status(uuid, uuid, text, text, text, text) from public;
revoke all on function public.admin_update_order_status(uuid, uuid, text, text, text, text) from anon;
grant execute on function public.admin_update_order_status(uuid, uuid, text, text, text, text) to service_role;
