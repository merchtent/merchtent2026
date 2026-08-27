alter table if exists public.cash_outs
    drop constraint if exists cash_outs_status_contract_check;

alter table if exists public.cash_outs
    add constraint cash_outs_status_contract_check
    check (status in ('pending', 'paid', 'transfer_failed')) not valid;

alter table if exists public.cash_outs
    drop constraint if exists cash_outs_total_positive_check;

alter table if exists public.cash_outs
    add constraint cash_outs_total_positive_check
    check (total_cents > 0) not valid;

alter table if exists public.artist_transfers
    drop constraint if exists artist_transfers_currency_contract_check;

alter table if exists public.artist_transfers
    add constraint artist_transfers_currency_contract_check
    check (currency ~ '^[A-Z]{3}$') not valid;

alter table if exists public.artist_transfers
    drop constraint if exists artist_transfers_state_timestamp_contract_check;

alter table if exists public.artist_transfers
    add constraint artist_transfers_state_timestamp_contract_check
    check (
        (status = 'pending' and stripe_transfer_id is null)
        or (status = 'processing' and attempted_at is not null and stripe_transfer_id is null)
        or (
            status = 'succeeded'
            and attempted_at is not null
            and succeeded_at is not null
            and stripe_transfer_id is not null
        )
        or (
            status = 'failed'
            and attempted_at is not null
            and failed_at is not null
        )
    ) not valid;
