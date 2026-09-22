create table if not exists public.marketing_events (
    id uuid primary key default gen_random_uuid(),
    event_name text not null,
    path text not null,
    session_id text,
    user_id uuid references public.profiles(id) on delete set null,
    attribution jsonb not null default '{}'::jsonb,
    properties jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint marketing_events_name_check check (event_name in (
        'view_item_list', 'select_item', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase',
        'sign_up', 'artist_lead', 'artist_activation', 'newsletter_signup', 'search', 'outbound_click'
    ))
);

create index if not exists idx_marketing_events_name_created_at
    on public.marketing_events (event_name, created_at desc);
create index if not exists idx_marketing_events_session_created_at
    on public.marketing_events (session_id, created_at desc) where session_id is not null;
create unique index if not exists idx_marketing_events_purchase_transaction
    on public.marketing_events ((properties->>'transaction_id'))
    where event_name = 'purchase' and nullif(properties->>'transaction_id', '') is not null;

alter table public.marketing_events enable row level security;
revoke all on table public.marketing_events from anon, authenticated;

alter table if exists public.orders
    add column if not exists marketing_attribution jsonb not null default '{}'::jsonb;

alter table if exists public.profiles
    add column if not exists marketing_attribution jsonb not null default '{}'::jsonb;

create index if not exists idx_orders_marketing_source
    on public.orders ((marketing_attribution->>'utm_source'));

comment on table public.marketing_events is 'First-party funnel events. Inserted only by trusted server routes.';
comment on column public.orders.marketing_attribution is 'First/last-touch campaign and click identifiers captured at checkout.';

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
    if p_key is null or p_key !~ '^(newsletter|contact|page_view|marketing_event):' then
        raise exception 'invalid rate limit key';
    end if;

    return public.check_rate_limit(p_key, p_limit, p_window_seconds);
end;
$$;

revoke all on function public.check_public_rate_limit(text, integer, integer) from public;
grant execute on function public.check_public_rate_limit(text, integer, integer) to anon, authenticated;

create or replace function public.record_account_marketing_event(
    p_event_name text,
    p_attribution jsonb default '{}'::jsonb,
    p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'sign in required'; end if;
    if p_event_name not in ('sign_up', 'artist_activation') then raise exception 'invalid event'; end if;
    insert into public.marketing_events (event_name, path, user_id, attribution, properties)
    values (p_event_name, '/account/setup', auth.uid(), coalesce(p_attribution, '{}'::jsonb), coalesce(p_properties, '{}'::jsonb));
end;
$$;

revoke all on function public.record_account_marketing_event(text, jsonb, jsonb) from public;
grant execute on function public.record_account_marketing_event(text, jsonb, jsonb) to authenticated;
