alter table if exists public.product_designs
    add column if not exists print_asset_front_path text,
    add column if not exists print_asset_back_path text,
    add column if not exists printify_blueprint_id integer,
    add column if not exists printify_print_provider_id integer,
    add column if not exists printify_variant_ids integer[],
    add column if not exists printify_product_id text,
    add column if not exists printify_status text not null default 'not_synced',
    add column if not exists printify_last_error text,
    add column if not exists printify_payload jsonb,
    add column if not exists printify_synced_at timestamptz;

alter table if exists public.product_designs
    drop constraint if exists product_designs_printify_status_check;

alter table if exists public.product_designs
    add constraint product_designs_printify_status_check
    check (printify_status in ('not_synced', 'syncing', 'synced', 'failed'));

create index if not exists idx_product_designs_printify_status
    on public.product_designs (printify_status, updated_at desc);

create table if not exists public.printify_sync_events (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    product_design_id uuid references public.product_designs(id) on delete set null,
    artist_id uuid not null references public.artists(id) on delete cascade,
    status text not null,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    created_at timestamptz not null default now(),
    constraint printify_sync_events_status_check
        check (status in ('started', 'succeeded', 'failed', 'skipped'))
);

create index if not exists idx_printify_sync_events_product_created_at
    on public.printify_sync_events (product_id, created_at desc);

create index if not exists idx_printify_sync_events_artist_created_at
    on public.printify_sync_events (artist_id, created_at desc);

alter table public.printify_sync_events enable row level security;

drop policy if exists printify_sync_events_select_owner_or_admin on public.printify_sync_events;
create policy printify_sync_events_select_owner_or_admin
    on public.printify_sync_events
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());
