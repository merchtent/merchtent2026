create table if not exists public.stripe_webhook_events (
    id uuid primary key default gen_random_uuid(),
    event_id text not null unique,
    event_type text not null,
    status text not null default 'received',
    attempts integer not null default 0,
    payload jsonb,
    last_error text,
    received_at timestamptz not null default now(),
    processing_started_at timestamptz,
    processed_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stripe_webhook_events_status_check
        check (status in ('received', 'processing', 'processed', 'ignored', 'failed'))
);

create index if not exists idx_stripe_webhook_events_status_created_at
    on public.stripe_webhook_events (status, created_at desc);

create index if not exists idx_stripe_webhook_events_event_type_created_at
    on public.stripe_webhook_events (event_type, created_at desc);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists stripe_webhook_events_select_admin on public.stripe_webhook_events;
create policy stripe_webhook_events_select_admin
    on public.stripe_webhook_events
    for select
    to authenticated
    using (public.is_admin());

drop trigger if exists trg_stripe_webhook_events_updated_at on public.stripe_webhook_events;
create trigger trg_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row
execute function public.set_updated_at();
