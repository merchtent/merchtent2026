create table if not exists public.artist_payment_accounts (
    id uuid primary key default gen_random_uuid(),
    artist_id uuid not null unique references public.artists(id) on delete cascade,
    provider text not null default 'stripe_connect',
    stripe_account_id text not null unique,
    onboarding_status text not null default 'not_started',
    charges_enabled boolean not null default false,
    payouts_enabled boolean not null default false,
    details_submitted boolean not null default false,
    disabled_reason text,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint artist_payment_accounts_provider_check
        check (provider in ('stripe_connect')),
    constraint artist_payment_accounts_onboarding_status_check
        check (onboarding_status in ('not_started', 'pending', 'complete', 'restricted'))
);

create index if not exists idx_artist_payment_accounts_artist_id
    on public.artist_payment_accounts (artist_id);

create index if not exists idx_artist_payment_accounts_onboarding_status
    on public.artist_payment_accounts (onboarding_status);

alter table public.artist_payment_accounts enable row level security;

drop policy if exists artist_payment_accounts_select_owner_or_admin on public.artist_payment_accounts;
create policy artist_payment_accounts_select_owner_or_admin
    on public.artist_payment_accounts
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop trigger if exists trg_artist_payment_accounts_updated_at on public.artist_payment_accounts;
create trigger trg_artist_payment_accounts_updated_at
before update on public.artist_payment_accounts
for each row
execute function public.set_updated_at();
