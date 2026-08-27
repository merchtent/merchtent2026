create or replace view public.payout_operational_exceptions
with (security_invoker = true)
as
select
    at.id as transfer_id,
    at.cash_out_id,
    at.artist_id,
    a.display_name as artist_name,
    co.total_cents,
    co.status as cash_out_status,
    at.status as transfer_status,
    at.failure_code,
    at.failure_message,
    at.stripe_transfer_id,
    at.attempted_at,
    at.created_at,
    at.updated_at,
    case
        when at.status = 'failed'
            then 'transfer_failed'
        when at.status = 'processing'
         and coalesce(at.attempted_at, at.updated_at, at.created_at) < now() - interval '24 hours'
            then 'transfer_processing_over_24h'
        when at.status = 'pending'
         and at.created_at < now() - interval '24 hours'
            then 'transfer_pending_over_24h'
        when co.status = 'transfer_failed'
            then 'cash_out_transfer_failed'
        else 'unknown'
    end as exception_reason,
    extract(epoch from (now() - coalesce(at.attempted_at, at.created_at)))::integer as age_seconds
from public.artist_transfers at
join public.cash_outs co on co.id = at.cash_out_id
join public.artists a on a.id = at.artist_id
where at.status = 'failed'
   or co.status = 'transfer_failed'
   or (
        at.status = 'processing'
        and coalesce(at.attempted_at, at.updated_at, at.created_at) < now() - interval '24 hours'
   )
   or (
        at.status = 'pending'
        and at.created_at < now() - interval '24 hours'
   );

revoke all on public.payout_operational_exceptions from public;
revoke all on public.payout_operational_exceptions from anon;
grant select on public.payout_operational_exceptions to authenticated;
