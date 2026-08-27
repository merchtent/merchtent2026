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
    if p_key is null or p_key !~ '^(newsletter|contact|page_view|artist_hero_upload|stripe_connect):' then
        raise exception 'invalid rate limit key';
    end if;

    return public.check_rate_limit(p_key, p_limit, p_window_seconds);
end;
$$;

revoke all on function public.check_public_rate_limit(text, integer, integer) from public;
grant execute on function public.check_public_rate_limit(text, integer, integer) to anon, authenticated;
