drop function if exists public.public_track_page_view(text, text, text, text, uuid);

revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from public;
revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from anon;
revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from authenticated;
grant execute on function public.subscribe_newsletter(text, text, text, text, boolean) to service_role;

revoke all on function public.check_public_rate_limit(text, integer, integer) from public;
revoke all on function public.check_public_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_public_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_public_rate_limit(text, integer, integer) to anon, authenticated;

revoke all on function public.public_subscribe_newsletter(text, text, text, text, boolean) from public;
revoke all on function public.public_subscribe_newsletter(text, text, text, text, boolean) from anon;
revoke all on function public.public_subscribe_newsletter(text, text, text, text, boolean) from authenticated;
grant execute on function public.public_subscribe_newsletter(text, text, text, text, boolean) to anon, authenticated;

revoke all on function public.public_track_page_view(text, text, text, text) from public;
revoke all on function public.public_track_page_view(text, text, text, text) from anon;
revoke all on function public.public_track_page_view(text, text, text, text) from authenticated;
grant execute on function public.public_track_page_view(text, text, text, text) to anon, authenticated;

revoke all on function public.public_submit_contact_message(text, text, text, text) from public;
revoke all on function public.public_submit_contact_message(text, text, text, text) from anon;
revoke all on function public.public_submit_contact_message(text, text, text, text) from authenticated;
grant execute on function public.public_submit_contact_message(text, text, text, text) to anon, authenticated;
