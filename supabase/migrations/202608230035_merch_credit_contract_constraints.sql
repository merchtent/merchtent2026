alter table if exists public.merch_credit_ledger
    drop constraint if exists merch_credit_ledger_reason_points_contract_check;

alter table if exists public.merch_credit_ledger
    add constraint merch_credit_ledger_reason_points_contract_check
    check (
        (reason = 'order_earned' and points > 0)
        or (reason = 'redemption' and points < 0)
        or (reason = 'manual_adjustment' and points <> 0)
    ) not valid;

alter table if exists public.merch_credit_reservations
    drop constraint if exists merch_credit_reservations_currency_contract_check;

alter table if exists public.merch_credit_reservations
    add constraint merch_credit_reservations_currency_contract_check
    check (currency ~ '^[A-Z]{3}$') not valid;

alter table if exists public.merch_credit_reservations
    drop constraint if exists merch_credit_reservations_terminal_timestamp_check;

alter table if exists public.merch_credit_reservations
    add constraint merch_credit_reservations_terminal_timestamp_check
    check (
        (status = 'reserved' and redeemed_at is null and released_at is null)
        or (status = 'redeemed' and redeemed_at is not null)
        or (status in ('released', 'expired') and released_at is not null)
    ) not valid;
