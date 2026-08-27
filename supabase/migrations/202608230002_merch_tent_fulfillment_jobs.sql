create table if not exists public.fulfillment_jobs (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    provider text not null default 'merch_tent',
    status text not null default 'pending',
    priority text not null default 'normal',
    notes text,
    assigned_to uuid references public.profiles(id) on delete set null,
    queued_at timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (order_id),
    constraint fulfillment_jobs_provider_check check (provider in ('merch_tent')),
    constraint fulfillment_jobs_status_check check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
    constraint fulfillment_jobs_priority_check check (priority in ('low', 'normal', 'high', 'urgent'))
);

create index if not exists idx_fulfillment_jobs_status_queued_at
    on public.fulfillment_jobs (status, queued_at asc);

alter table public.fulfillment_jobs enable row level security;

drop policy if exists fulfillment_jobs_select_admin on public.fulfillment_jobs;
create policy fulfillment_jobs_select_admin
    on public.fulfillment_jobs
    for select
    to authenticated
    using (public.is_admin());

drop trigger if exists trg_fulfillment_jobs_updated_at on public.fulfillment_jobs;
create trigger trg_fulfillment_jobs_updated_at
before update on public.fulfillment_jobs
for each row execute function public.set_updated_at();
