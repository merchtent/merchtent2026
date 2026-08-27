create or replace function public.expire_merch_credit_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count integer;
begin
    update public.merch_credit_reservations
       set status = 'expired',
           released_at = now(),
           metadata = metadata || jsonb_build_object('expired_by', 'expire_merch_credit_reservations')
     where status = 'reserved'
       and expires_at <= now();

    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

create or replace view public.merch_credit_operational_exceptions
with (security_invoker = true)
as
select
    mcr.id as reservation_id,
    mcr.user_id,
    mcr.order_id,
    o.order_number,
    mcr.stripe_session_id,
    mcr.points,
    mcr.discount_cents,
    mcr.currency,
    mcr.status,
    mcr.expires_at,
    mcr.created_at,
    case
        when mcr.status = 'reserved'
         and mcr.expires_at <= now()
            then 'expired_reserved_credits'
        when mcr.status = 'reserved'
         and o.id is not null
         and coalesce(o.status, '') in ('paid', 'in_production', 'shipped', 'delivered')
            then 'paid_order_with_unredeemed_credits'
        when pe.id is not null
            then 'credit_redemption_failed'
        else 'unknown_credit_exception'
    end as exception_reason,
    extract(epoch from (now() - coalesce(mcr.expires_at, mcr.created_at)))::integer as age_seconds
from public.merch_credit_reservations mcr
left join public.orders o
    on o.id = mcr.order_id
    or (
        mcr.stripe_session_id is not null
        and o.stripe_session_id = mcr.stripe_session_id
    )
left join public.platform_events pe
    on pe.action = 'merch_credit_reservation_redemption_failed'
   and pe.metadata->>'reservation_id' = mcr.id::text
where
    (
        mcr.status = 'reserved'
        and mcr.expires_at <= now()
    )
    or (
        mcr.status = 'reserved'
        and o.id is not null
        and coalesce(o.status, '') in ('paid', 'in_production', 'shipped', 'delivered')
    )
    or pe.id is not null;

revoke all on public.merch_credit_operational_exceptions from public;
revoke all on public.merch_credit_operational_exceptions from anon;
grant select on public.merch_credit_operational_exceptions to authenticated;

revoke all on function public.expire_merch_credit_reservations() from public;
revoke all on function public.expire_merch_credit_reservations() from anon;
grant execute on function public.expire_merch_credit_reservations() to service_role;
