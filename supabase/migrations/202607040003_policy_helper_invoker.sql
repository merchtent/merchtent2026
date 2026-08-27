alter function public.is_admin() security invoker;
alter function public.owns_artist(uuid) security invoker;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.owns_artist(uuid) from public;
revoke all on function public.owns_artist(uuid) from anon;
grant execute on function public.owns_artist(uuid) to authenticated;
