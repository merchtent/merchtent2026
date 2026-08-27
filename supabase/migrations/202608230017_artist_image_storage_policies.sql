create or replace function public.check_public_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_key is null or p_key !~ '^(newsletter|contact|page_view|artist_hero_upload):' then
        raise exception 'invalid rate limit key';
    end if;

    return public.check_rate_limit(p_key, p_limit, p_window_seconds);
end;
$$;

drop policy if exists storage_artist_images_public_select on storage.objects;
create policy storage_artist_images_public_select
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'artist-images');

drop policy if exists storage_artist_images_owner_insert on storage.objects;
create policy storage_artist_images_owner_insert
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'artist-images'
        and (storage.foldername(name))[1] = 'artist'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (
            public.is_admin()
            or public.owns_artist(((storage.foldername(name))[2])::uuid)
        )
    );

drop policy if exists storage_artist_images_owner_update on storage.objects;
create policy storage_artist_images_owner_update
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'artist-images'
        and (storage.foldername(name))[1] = 'artist'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (
            public.is_admin()
            or public.owns_artist(((storage.foldername(name))[2])::uuid)
        )
    )
    with check (
        bucket_id = 'artist-images'
        and (storage.foldername(name))[1] = 'artist'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (
            public.is_admin()
            or public.owns_artist(((storage.foldername(name))[2])::uuid)
        )
    );

drop policy if exists storage_artist_images_owner_delete on storage.objects;
create policy storage_artist_images_owner_delete
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'artist-images'
        and (storage.foldername(name))[1] = 'artist'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (
            public.is_admin()
            or public.owns_artist(((storage.foldername(name))[2])::uuid)
        )
    );

revoke all on function public.check_public_rate_limit(text, integer, integer) from public;
grant execute on function public.check_public_rate_limit(text, integer, integer) to anon, authenticated;
