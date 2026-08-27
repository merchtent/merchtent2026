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
    if p_key is null or p_key !~ '^(newsletter|contact|page_view):' then
        raise exception 'invalid rate limit key';
    end if;

    return public.check_rate_limit(p_key, p_limit, p_window_seconds);
end;
$$;

create or replace function public.public_subscribe_newsletter(
    p_email text,
    p_name text default null,
    p_source text default null,
    p_utm text default null,
    p_consent boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.subscribe_newsletter(
        p_email,
        p_name,
        p_source,
        p_utm,
        coalesce(p_consent, true)
    );

    return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.check_public_rate_limit(text, integer, integer) from public;
grant execute on function public.check_public_rate_limit(text, integer, integer) to anon, authenticated;

revoke all on function public.public_subscribe_newsletter(text, text, text, text, boolean) from public;
grant execute on function public.public_subscribe_newsletter(text, text, text, text, boolean) to anon, authenticated;
