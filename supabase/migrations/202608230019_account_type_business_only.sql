update public.profiles p
set account_type = case
    when exists (
        select 1
        from public.artists a
        where a.user_id = p.id
    ) then 'artist'
    else 'fan'
end
where p.account_type = 'admin';

alter table if exists public.profiles
    drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
    add constraint profiles_account_type_check
    check (account_type in ('fan', 'artist'));
