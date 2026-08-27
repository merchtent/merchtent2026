create or replace view public.payout_operational_exceptions
with (security_invoker = true)
as
select
    at.id as transfer_id,
    co.id as cash_out_id,
    co.artist_id,
    a.display_name as artist_name,
    co.total_cents,
    co.status as cash_out_status,
    at.status as transfer_status,
    at.failure_code,
    at.failure_message,
    at.stripe_transfer_id,
    at.attempted_at,
    co.created_at,
    co.updated_at,
    case
        when at.id is null
         and co.status = 'pending'
         and co.created_at < now() - interval '24 hours'
            then 'cash_out_missing_transfer_over_24h'
        when co.status = 'paid'
         and (at.id is null or at.status <> 'succeeded')
            then 'cash_out_paid_without_succeeded_transfer'
        when at.status = 'succeeded'
         and co.status <> 'paid'
            then 'transfer_succeeded_cash_out_not_paid'
        when at.status = 'failed'
            then 'transfer_failed'
        when at.status = 'processing'
         and coalesce(at.attempted_at, at.updated_at, at.created_at) < now() - interval '24 hours'
            then 'transfer_processing_over_24h'
        when at.status = 'pending'
         and at.created_at < now() - interval '24 hours'
            then 'transfer_pending_over_24h'
        when co.status = 'transfer_failed'
         and coalesce(at.status, '') <> 'failed'
            then 'cash_out_transfer_failed_without_failed_transfer'
        when co.status = 'transfer_failed'
            then 'cash_out_transfer_failed'
        else 'unknown'
    end as exception_reason,
    extract(epoch from (now() - coalesce(at.attempted_at, at.created_at, co.created_at)))::integer as age_seconds
from public.cash_outs co
left join public.artist_transfers at on at.cash_out_id = co.id
join public.artists a on a.id = co.artist_id
where (
        at.id is null
        and co.status = 'pending'
        and co.created_at < now() - interval '24 hours'
   )
   or (
        co.status = 'paid'
        and (at.id is null or at.status <> 'succeeded')
   )
   or (
        at.status = 'succeeded'
        and co.status <> 'paid'
   )
   or at.status = 'failed'
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
