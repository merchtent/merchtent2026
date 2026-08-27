update public.profiles
set role = null
where role in ('fan', 'artist');
