create table if not exists public.printify_api_events (
    id uuid primary key default gen_random_uuid(),
    endpoint_group text not null,
    method text not null,
    path text not null,
    status_code integer,
    ok boolean not null default false,
    duration_ms integer,
    attempt integer not null default 1,
    rate_limited boolean not null default false,
    error_message text,
    created_at timestamptz not null default now(),
    constraint printify_api_events_endpoint_group_check
        check (endpoint_group in ('catalog', 'product_mutation', 'order', 'upload', 'other')),
    constraint printify_api_events_method_check
        check (method in ('GET', 'POST', 'PUT', 'DELETE'))
);

create index if not exists idx_printify_api_events_created_at
    on public.printify_api_events (created_at desc);

create index if not exists idx_printify_api_events_group_created_at
    on public.printify_api_events (endpoint_group, created_at desc);

create index if not exists idx_printify_api_events_rate_limited
    on public.printify_api_events (created_at desc)
    where rate_limited = true;

alter table public.printify_api_events enable row level security;

drop policy if exists printify_api_events_select_admin on public.printify_api_events;
create policy printify_api_events_select_admin
    on public.printify_api_events
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists printify_api_events_insert_service_role on public.printify_api_events;
create policy printify_api_events_insert_service_role
    on public.printify_api_events
    for insert
    to service_role
    with check (true);
