alter table public.marketing_events
    drop constraint if exists marketing_events_name_check;

alter table public.marketing_events
    add constraint marketing_events_name_check check (event_name in (
        'view_item_list', 'select_item', 'view_item', 'add_to_cart', 'view_cart',
        'remove_from_cart', 'view_checkout', 'begin_checkout', 'checkout_error', 'purchase',
        'sign_up', 'artist_lead', 'artist_activation', 'newsletter_signup', 'search', 'outbound_click'
    ));

comment on table public.marketing_events is
    'Consent-gated first-party customer journey and acquisition events. Inserted only by trusted server routes.';

drop policy if exists marketing_events_select_admin on public.marketing_events;
create policy marketing_events_select_admin
    on public.marketing_events
    for select
    to authenticated
    using (public.is_admin());
