alter table if exists public.profiles
    add column if not exists account_type text not null default 'fan',
    add column if not exists display_name text,
    add column if not exists onboarding_completed boolean not null default false;

alter table if exists public.profiles
    drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
    add constraint profiles_account_type_check
    check (account_type in ('fan', 'artist', 'admin'));

update public.profiles
set account_type = 'admin'
where role = 'admin';

update public.profiles p
set account_type = 'artist'
where account_type = 'fan'
  and exists (
      select 1
      from public.artists a
      where a.user_id = p.id
  );

update public.profiles
set onboarding_completed = true
where role is not null
   or display_name is not null
   or exists (
       select 1
       from public.artists a
       where a.user_id = profiles.id
   );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
    on public.profiles
    for update
    to authenticated
    using (id = (select auth.uid()))
    with check (
        id = (select auth.uid())
        and account_type in ('fan', 'artist')
    );

create table if not exists public.merch_credit_balances (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    points_balance integer not null default 0,
    lifetime_points integer not null default 0,
    redeemed_points integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint merch_credit_balances_non_negative
        check (points_balance >= 0 and lifetime_points >= 0 and redeemed_points >= 0)
);

alter table public.merch_credit_balances enable row level security;

drop policy if exists merch_credit_balances_select_own_or_admin on public.merch_credit_balances;
create policy merch_credit_balances_select_own_or_admin
    on public.merch_credit_balances
    for select
    to authenticated
    using (user_id = (select auth.uid()) or public.is_admin());

drop trigger if exists trg_merch_credit_balances_updated_at on public.merch_credit_balances;
create trigger trg_merch_credit_balances_updated_at
before update on public.merch_credit_balances
for each row execute function public.set_updated_at();

create table if not exists public.merch_credit_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    points integer not null,
    reason text not null,
    description text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint merch_credit_ledger_points_not_zero check (points <> 0),
    constraint merch_credit_ledger_reason_check
        check (reason in ('order_earned', 'manual_adjustment', 'redemption'))
);

create unique index if not exists idx_merch_credit_ledger_order_earned_once
    on public.merch_credit_ledger (order_id, reason)
    where reason = 'order_earned' and order_id is not null;

create index if not exists idx_merch_credit_ledger_user_created_at
    on public.merch_credit_ledger (user_id, created_at desc);

alter table public.merch_credit_ledger enable row level security;

drop policy if exists merch_credit_ledger_select_own_or_admin on public.merch_credit_ledger;
create policy merch_credit_ledger_select_own_or_admin
    on public.merch_credit_ledger
    for select
    to authenticated
    using (user_id = (select auth.uid()) or public.is_admin());
