create or replace function public.upgrade_account_to_artist(
    p_artist_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_artist_name text := nullif(left(trim(coalesce(p_artist_name, '')), 60), '');
    v_profile public.profiles%rowtype;
    v_artist_id uuid;
begin
    if v_user_id is null then
        raise exception 'sign in required';
    end if;

    if coalesce(length(v_artist_name), 0) < 2 then
        raise exception 'artist or band name is required';
    end if;

    select *
      into v_profile
      from public.profiles
     where id = v_user_id
     limit 1;

    if not found then
        raise exception 'profile not found';
    end if;

    if v_profile.role = 'admin' then
        raise exception 'admin account type must be managed by an administrator';
    end if;

    select id
      into v_artist_id
      from public.artists
     where user_id = v_user_id
     limit 1;

    if v_artist_id is null then
        insert into public.artists (user_id, display_name)
        values (v_user_id, v_artist_name)
        returning id into v_artist_id;
    else
        update public.artists
           set display_name = coalesce(nullif(display_name, ''), v_artist_name)
         where id = v_artist_id;
    end if;

    update public.profiles
       set account_type = 'artist',
           onboarding_completed = true,
           display_name = coalesce(nullif(display_name, ''), v_artist_name)
     where id = v_user_id;

    insert into public.merch_credit_balances (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;

    return jsonb_build_object(
        'ok', true,
        'account_type', 'artist',
        'artist_id', v_artist_id
    );
end;
$$;

revoke all on function public.upgrade_account_to_artist(text) from public;
grant execute on function public.upgrade_account_to_artist(text) to authenticated;
