create or replace function public.public_track_page_view(
    p_path text,
    p_referrer text,
    p_user_agent text,
    p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if nullif(btrim(p_path), '') is null or left(btrim(p_path), 1) <> '/' or length(p_path) > 500 then
        raise exception 'invalid page view path';
    end if;

    insert into public.page_views (
        path,
        referrer,
        user_agent,
        user_id,
        session_id
    )
    values (
        btrim(p_path),
        nullif(left(coalesce(p_referrer, ''), 1000), ''),
        nullif(left(coalesce(p_user_agent, ''), 500), ''),
        auth.uid(),
        nullif(left(coalesce(p_session_id, ''), 100), '')
    );
end;
$$;

revoke all on function public.public_track_page_view(text, text, text, text) from public;
grant execute on function public.public_track_page_view(text, text, text, text) to anon, authenticated;

drop function if exists public.public_track_page_view(text, text, text, text, uuid);
