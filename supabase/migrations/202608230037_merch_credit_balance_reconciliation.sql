create or replace view public.merch_credit_balance_reconciliation_exceptions
with (security_invoker = true)
as
with ledger_totals as (
    select
        mcl.user_id,
        coalesce(sum(mcl.points), 0)::integer as ledger_points_balance,
        coalesce(sum(mcl.points) filter (where mcl.points > 0), 0)::integer as ledger_lifetime_points,
        coalesce(abs(sum(mcl.points) filter (where mcl.reason = 'redemption')), 0)::integer as ledger_redeemed_points,
        max(mcl.created_at) as last_ledger_at
    from public.merch_credit_ledger mcl
    group by mcl.user_id
)
select
    mcb.user_id,
    mcb.points_balance,
    mcb.lifetime_points,
    mcb.redeemed_points,
    coalesce(lt.ledger_points_balance, 0)::integer as ledger_points_balance,
    coalesce(lt.ledger_lifetime_points, 0)::integer as ledger_lifetime_points,
    coalesce(lt.ledger_redeemed_points, 0)::integer as ledger_redeemed_points,
    case
        when mcb.points_balance <> coalesce(lt.ledger_points_balance, 0)
            then 'points_balance_mismatch'
        when mcb.lifetime_points <> coalesce(lt.ledger_lifetime_points, 0)
            then 'lifetime_points_mismatch'
        when mcb.redeemed_points <> coalesce(lt.ledger_redeemed_points, 0)
            then 'redeemed_points_mismatch'
        else 'unknown_balance_mismatch'
    end as exception_reason,
    mcb.updated_at,
    lt.last_ledger_at
from public.merch_credit_balances mcb
left join ledger_totals lt
    on lt.user_id = mcb.user_id
where
    mcb.points_balance <> coalesce(lt.ledger_points_balance, 0)
    or mcb.lifetime_points <> coalesce(lt.ledger_lifetime_points, 0)
    or mcb.redeemed_points <> coalesce(lt.ledger_redeemed_points, 0);

revoke all on public.merch_credit_balance_reconciliation_exceptions from public;
revoke all on public.merch_credit_balance_reconciliation_exceptions from anon;
grant select on public.merch_credit_balance_reconciliation_exceptions to authenticated;
