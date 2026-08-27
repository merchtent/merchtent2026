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
    v_order public.orders%rowtype;
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

    if p_status = 'shipped'
       and (nullif(btrim(coalesce(p_tracking_code, '')), '') is null
            or nullif(btrim(coalesce(p_tracking_carrier, '')), '') is null) then
        raise exception 'tracking number and carrier are required for shipped orders';
    end if;

    select o.status
      into v_from_status
      from public.orders o
     where o.id = p_order_id
     for update;

    if not found then
        raise exception 'order not found';
    end if;

    update public.orders
       set status = p_status,
           tracking_code = nullif(btrim(coalesce(p_tracking_code, '')), ''),
           tracking_carrier = nullif(btrim(coalesce(p_tracking_carrier, '')), ''),
           tracking_url = nullif(btrim(coalesce(p_tracking_url, '')), ''),
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
            'trackingNumber', nullif(btrim(coalesce(p_tracking_code, '')), ''),
            'carrier', nullif(btrim(coalesce(p_tracking_carrier, '')), ''),
            'trackingUrl', nullif(btrim(coalesce(p_tracking_url, '')), '')
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
            'tracking_number', nullif(btrim(coalesce(p_tracking_code, '')), ''),
            'carrier', nullif(btrim(coalesce(p_tracking_carrier, '')), ''),
            'tracking_url', nullif(btrim(coalesce(p_tracking_url, '')), '')
        )
    );

    return to_jsonb(v_order);
end;
$$;

revoke all on function public.admin_update_order_status(uuid, uuid, text, text, text, text) from public;
revoke all on function public.admin_update_order_status(uuid, uuid, text, text, text, text) from anon;
grant execute on function public.admin_update_order_status(uuid, uuid, text, text, text, text) to service_role;
