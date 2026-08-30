create table if not exists public.artist_photos (
    id uuid primary key default gen_random_uuid(),
    artist_id uuid not null references public.artists(id) on delete cascade,
    image_path text not null,
    caption text,
    sort_order integer not null default 0,
    is_featured boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint artist_photos_image_path_artist_folder check (
        image_path ~ '^artist/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    )
);

create index if not exists artist_photos_artist_featured_idx
    on public.artist_photos (artist_id, is_featured, sort_order, created_at desc);

alter table public.artist_photos enable row level security;

drop policy if exists artist_photos_select_public on public.artist_photos;
create policy artist_photos_select_public
    on public.artist_photos
    for select
    to anon, authenticated
    using (
        is_featured = true
        and exists (
            select 1
            from public.artists a
            where a.id = artist_photos.artist_id
              and a.is_public = true
        )
    );

drop policy if exists artist_photos_insert_owner on public.artist_photos;
create policy artist_photos_insert_owner
    on public.artist_photos
    for insert
    to authenticated
    with check (public.is_admin() or public.owns_artist(artist_id));

drop policy if exists artist_photos_update_owner on public.artist_photos;
create policy artist_photos_update_owner
    on public.artist_photos
    for update
    to authenticated
    using (public.is_admin() or public.owns_artist(artist_id))
    with check (public.is_admin() or public.owns_artist(artist_id));

drop policy if exists artist_photos_delete_owner on public.artist_photos;
create policy artist_photos_delete_owner
    on public.artist_photos
    for delete
    to authenticated
    using (public.is_admin() or public.owns_artist(artist_id));
