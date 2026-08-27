create or replace function public.complete_account_onboarding(
    p_account_type text,
    p_display_name text default null,
    p_artist_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_account_type text := lower(trim(coalesce(p_account_type, '')));
    v_display_name text := nullif(left(trim(coalesce(p_display_name, '')), 80), '');
    v_artist_name text := nullif(left(trim(coalesce(p_artist_name, '')), 60), '');
    v_artist_id uuid;
begin
    if v_user_id is null then
        raise exception 'sign in required';
    end if;

    if v_account_type not in ('fan', 'artist') then
        raise exception 'choose fan or artist account';
    end if;

    if v_account_type = 'artist' and coalesce(length(v_artist_name), 0) < 2 then
        raise exception 'artist or band name is required';
    end if;

    insert into public.profiles (
        id,
        account_type,
        display_name,
        onboarding_completed
    )
    values (
        v_user_id,
        v_account_type,
        coalesce(v_display_name, v_artist_name),
        true
    )
    on conflict (id) do update
    set
        account_type = excluded.account_type,
        display_name = excluded.display_name,
        onboarding_completed = true;

    insert into public.merch_credit_balances (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;

    if v_account_type = 'artist' then
        select id
          into v_artist_id
          from public.artists
         where user_id = v_user_id
         limit 1;

        if v_artist_id is null then
            insert into public.artists (user_id, display_name)
            values (v_user_id, v_artist_name)
            returning id into v_artist_id;
        end if;
    end if;

    return jsonb_build_object(
        'ok', true,
        'account_type', v_account_type,
        'artist_id', v_artist_id
    );
end;
$$;

revoke all on function public.complete_account_onboarding(text, text, text) from public;
grant execute on function public.complete_account_onboarding(text, text, text) to authenticated;
