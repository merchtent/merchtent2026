create table if not exists public.stripe_financial_events (
    id uuid primary key default gen_random_uuid(),
    stripe_event_id text not null unique,
    stripe_event_type text not null,
    severity text not null,
    order_id uuid references public.orders(id) on delete set null,
    order_number text,
    stripe_payment_intent_id text,
    stripe_charge_id text,
    stripe_object_id text,
    amount_cents integer,
    amount_refunded_cents integer,
    currency text,
    reason text,
    stripe_status text,
    failure_code text,
    failure_message text,
    review_status text not null default 'open',
    payload jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references public.profiles(id) on delete set null,
    resolution_notes text,
    constraint stripe_financial_events_severity_check
        check (severity in ('error', 'critical')),
    constraint stripe_financial_events_review_status_check
        check (review_status in ('open', 'investigating', 'resolved', 'ignored')),
    constraint stripe_financial_events_currency_check
        check (currency is null or currency ~ '^[A-Z]{3}$'),
    constraint stripe_financial_events_amounts_check
        check (
            (amount_cents is null or amount_cents >= 0)
            and (amount_refunded_cents is null or amount_refunded_cents >= 0)
        )
);

create index if not exists idx_stripe_financial_events_review_received
    on public.stripe_financial_events (review_status, received_at desc);

create index if not exists idx_stripe_financial_events_order_received
    on public.stripe_financial_events (order_id, received_at desc)
    where order_id is not null;

create index if not exists idx_stripe_financial_events_severity_received
    on public.stripe_financial_events (severity, received_at desc);

alter table public.stripe_financial_events enable row level security;

drop policy if exists stripe_financial_events_select_admin on public.stripe_financial_events;
create policy stripe_financial_events_select_admin
    on public.stripe_financial_events
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists stripe_financial_events_update_admin on public.stripe_financial_events;
create policy stripe_financial_events_update_admin
    on public.stripe_financial_events
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

revoke all on public.stripe_financial_events from public;
revoke all on public.stripe_financial_events from anon;
grant select, update on public.stripe_financial_events to authenticated;
