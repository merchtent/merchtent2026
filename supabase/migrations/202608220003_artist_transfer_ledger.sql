create table if not exists public.artist_transfers (
    id uuid primary key default gen_random_uuid(),
    cash_out_id uuid not null references public.cash_outs(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    provider text not null default 'stripe_connect',
    status text not null default 'pending',
    amount_cents integer not null,
    currency text not null default 'AUD',
    destination_account_id text not null,
    stripe_transfer_id text unique,
    idempotency_key text not null unique,
    failure_code text,
    failure_message text,
    metadata jsonb not null default '{}'::jsonb,
    attempted_at timestamptz,
    succeeded_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint artist_transfers_cash_out_unique unique (cash_out_id),
    constraint artist_transfers_amount_positive check (amount_cents > 0),
    constraint artist_transfers_provider_check check (provider in ('stripe_connect')),
    constraint artist_transfers_status_check check (status in ('pending', 'processing', 'succeeded', 'failed'))
);

create index if not exists idx_artist_transfers_artist_created_at
    on public.artist_transfers (artist_id, created_at desc);

create index if not exists idx_artist_transfers_status_created_at
    on public.artist_transfers (status, created_at desc);

alter table public.artist_transfers enable row level security;

drop policy if exists artist_transfers_select_owner_or_admin on public.artist_transfers;
create policy artist_transfers_select_owner_or_admin
    on public.artist_transfers
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop trigger if exists trg_artist_transfers_updated_at on public.artist_transfers;
create trigger trg_artist_transfers_updated_at
before update on public.artist_transfers
for each row execute function public.set_updated_at();
