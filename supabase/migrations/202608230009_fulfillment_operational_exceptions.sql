create or replace view public.fulfillment_operational_exceptions
with (security_invoker = true)
as
select
    fj.id as fulfillment_job_id,
    fj.order_id,
    o.order_number,
    o.email,
    fj.status,
    fj.priority,
    fj.queued_at,
    fj.started_at,
    fj.updated_at,
    case
        when fj.status = 'pending'
         and fj.queued_at < now() - interval '24 hours'
            then 'pending_over_24h'
        when fj.status = 'in_progress'
         and coalesce(fj.started_at, fj.updated_at, fj.queued_at) < now() - interval '48 hours'
            then 'in_progress_over_48h'
        when fj.status = 'pending'
         and fj.priority in ('high', 'urgent')
         and fj.queued_at < now() - interval '4 hours'
            then 'priority_pending_over_4h'
        else 'unknown'
    end as exception_reason,
    extract(epoch from (now() - fj.queued_at))::integer as age_seconds
from public.fulfillment_jobs fj
join public.orders o on o.id = fj.order_id
where fj.status in ('pending', 'in_progress')
  and (
    (fj.status = 'pending' and fj.queued_at < now() - interval '24 hours')
    or (
        fj.status = 'in_progress'
        and coalesce(fj.started_at, fj.updated_at, fj.queued_at) < now() - interval '48 hours'
    )
    or (
        fj.status = 'pending'
        and fj.priority in ('high', 'urgent')
        and fj.queued_at < now() - interval '4 hours'
    )
  );

revoke all on public.fulfillment_operational_exceptions from public;
revoke all on public.fulfillment_operational_exceptions from anon;
grant select on public.fulfillment_operational_exceptions to authenticated;
