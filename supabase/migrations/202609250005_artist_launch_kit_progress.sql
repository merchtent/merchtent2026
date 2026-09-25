create table if not exists public.launch_kit_progress (
    product_id uuid primary key references public.products(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    completed_steps smallint[] not null default '{}'::smallint[],
    updated_at timestamptz not null default now(),
    constraint launch_kit_progress_valid_steps check (
        cardinality(completed_steps) <= 7
        and completed_steps <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
);

create index if not exists launch_kit_progress_artist_updated_idx
    on public.launch_kit_progress (artist_id, updated_at desc);

alter table public.launch_kit_progress enable row level security;

revoke all on table public.launch_kit_progress from anon;
grant select, insert, update on table public.launch_kit_progress to authenticated;
grant all on table public.launch_kit_progress to service_role;

drop policy if exists "Artists can view their launch kit progress" on public.launch_kit_progress;
create policy "Artists can view their launch kit progress"
    on public.launch_kit_progress
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop policy if exists "Artists can create their launch kit progress" on public.launch_kit_progress;
create policy "Artists can create their launch kit progress"
    on public.launch_kit_progress
    for insert
    to authenticated
    with check (
        (public.owns_artist(artist_id) or public.is_admin())
        and exists (
            select 1
            from public.products
            where products.id = launch_kit_progress.product_id
              and products.artist_id = launch_kit_progress.artist_id
        )
    );

drop policy if exists "Artists can update their launch kit progress" on public.launch_kit_progress;
create policy "Artists can update their launch kit progress"
    on public.launch_kit_progress
    for update
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin())
    with check (
        (public.owns_artist(artist_id) or public.is_admin())
        and exists (
            select 1
            from public.products
            where products.id = launch_kit_progress.product_id
              and products.artist_id = launch_kit_progress.artist_id
        )
    );
