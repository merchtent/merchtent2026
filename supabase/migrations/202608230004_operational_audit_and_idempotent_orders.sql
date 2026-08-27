create sequence if not exists public.order_reference_seq;

alter table if exists public.orders
    add column if not exists order_number text,
    add column if not exists operational_status text not null default 'recorded';

alter table if exists public.products
    add column if not exists production_status text not null default 'manual',
    add column if not exists readiness_notes text;

alter table if exists public.product_designs
    add column if not exists validation_status text not null default 'pending',
    add column if not exists renderer text,
    add column if not exists renderer_version text,
    add column if not exists design_hash text,
    add column if not exists print_asset_front_hash text,
    add column if not exists print_asset_back_hash text;

create unique index if not exists idx_orders_order_number_unique
    on public.orders (order_number)
    where order_number is not null;

create unique index if not exists idx_orders_stripe_session_id_unique
    on public.orders (stripe_session_id)
    where stripe_session_id is not null;

alter table if exists public.order_items
    add column if not exists stripe_line_item_id text,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_order_items_stripe_line_item_id_unique
    on public.order_items (stripe_line_item_id)
    where stripe_line_item_id is not null;

create index if not exists idx_order_items_order_id
    on public.order_items (order_id);

create table if not exists public.platform_events (
    id uuid primary key default gen_random_uuid(),
    scope text not null,
    action text not null,
    severity text not null default 'info',
    actor_user_id uuid references public.profiles(id) on delete set null,
    order_id uuid references public.orders(id) on delete set null,
    artist_id uuid references public.artists(id) on delete set null,
    product_id uuid references public.products(id) on delete set null,
    fulfillment_job_id uuid references public.fulfillment_jobs(id) on delete set null,
    external_id text,
    message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint platform_events_severity_check
        check (severity in ('debug', 'info', 'warning', 'error', 'critical'))
);

create index if not exists idx_platform_events_scope_created_at
    on public.platform_events (scope, created_at desc);

create index if not exists idx_platform_events_order_created_at
    on public.platform_events (order_id, created_at desc)
    where order_id is not null;

create index if not exists idx_platform_events_severity_created_at
    on public.platform_events (severity, created_at desc);

alter table public.platform_events enable row level security;

drop policy if exists platform_events_select_admin on public.platform_events;
create policy platform_events_select_admin
    on public.platform_events
    for select
    to authenticated
    using (public.is_admin());

create table if not exists public.order_status_events (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    from_status text,
    to_status text not null,
    actor_user_id uuid references public.profiles(id) on delete set null,
    reason text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_order_status_events_order_created_at
    on public.order_status_events (order_id, created_at desc);

create unique index if not exists idx_order_status_events_stripe_checkout_once
    on public.order_status_events (order_id, reason)
    where reason = 'stripe_checkout_session_completed';

alter table public.order_status_events enable row level security;

drop policy if exists order_status_events_select_customer_artist_admin on public.order_status_events;
create policy order_status_events_select_customer_artist_admin
    on public.order_status_events
    for select
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.orders o
            where o.id = order_status_events.order_id
              and o.user_id = (select auth.uid())
        )
        or exists (
            select 1
            from public.order_items oi
            where oi.order_id = order_status_events.order_id
              and public.owns_artist(oi.artist_id)
        )
    );

drop policy if exists order_status_events_insert_admin on public.order_status_events;
create policy order_status_events_insert_admin
    on public.order_status_events
    for insert
    to authenticated
    with check (public.is_admin());

create table if not exists public.fulfillment_job_events (
    id uuid primary key default gen_random_uuid(),
    fulfillment_job_id uuid not null references public.fulfillment_jobs(id) on delete cascade,
    order_id uuid references public.orders(id) on delete cascade,
    from_status text,
    to_status text not null,
    actor_user_id uuid references public.profiles(id) on delete set null,
    reason text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_fulfillment_job_events_job_created_at
    on public.fulfillment_job_events (fulfillment_job_id, created_at desc);

create unique index if not exists idx_fulfillment_job_events_stripe_checkout_once
    on public.fulfillment_job_events (fulfillment_job_id, reason)
    where reason = 'stripe_checkout_session_completed';

alter table public.fulfillment_job_events enable row level security;

drop policy if exists fulfillment_job_events_select_admin on public.fulfillment_job_events;
create policy fulfillment_job_events_select_admin
    on public.fulfillment_job_events
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists fulfillment_job_events_insert_admin on public.fulfillment_job_events;
create policy fulfillment_job_events_insert_admin
    on public.fulfillment_job_events
    for insert
    to authenticated
    with check (public.is_admin());

create table if not exists public.product_generation_events (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete cascade,
    product_design_id uuid references public.product_designs(id) on delete cascade,
    artist_id uuid references public.artists(id) on delete cascade,
    status text not null,
    renderer text,
    renderer_version text,
    message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint product_generation_events_status_check
        check (status in ('submitted', 'validated', 'rendered', 'published', 'blocked', 'failed'))
);

create index if not exists idx_product_generation_events_product_created_at
    on public.product_generation_events (product_id, created_at desc);

alter table public.product_generation_events enable row level security;

drop policy if exists product_generation_events_select_owner_or_admin on public.product_generation_events;
create policy product_generation_events_select_owner_or_admin
    on public.product_generation_events
    for select
    to authenticated
    using (public.is_admin() or public.owns_artist(artist_id));

drop policy if exists product_generation_events_insert_owner_or_admin on public.product_generation_events;
create policy product_generation_events_insert_owner_or_admin
    on public.product_generation_events
    for insert
    to authenticated
    with check (public.is_admin() or public.owns_artist(artist_id));

create table if not exists public.notification_deliveries (
    id uuid primary key default gen_random_uuid(),
    order_id uuid references public.orders(id) on delete cascade,
    channel text not null,
    recipient text,
    status text not null default 'pending',
    provider text,
    provider_message_id text,
    idempotency_key text not null unique,
    attempts integer not null default 0,
    last_error text,
    metadata jsonb not null default '{}'::jsonb,
    first_attempted_at timestamptz,
    last_attempted_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint notification_deliveries_channel_check check (channel in ('email', 'sms')),
    constraint notification_deliveries_status_check check (status in ('pending', 'sent', 'failed', 'skipped'))
);

create index if not exists idx_notification_deliveries_order_channel
    on public.notification_deliveries (order_id, channel);

create index if not exists idx_notification_deliveries_status_created_at
    on public.notification_deliveries (status, created_at desc);

alter table public.notification_deliveries enable row level security;

drop policy if exists notification_deliveries_select_admin on public.notification_deliveries;
create policy notification_deliveries_select_admin
    on public.notification_deliveries
    for select
    to authenticated
    using (public.is_admin());

drop trigger if exists trg_notification_deliveries_updated_at on public.notification_deliveries;
create trigger trg_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

create table if not exists public.rate_limit_buckets (
    key text primary key,
    count integer not null default 0,
    reset_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;

drop policy if exists rate_limit_buckets_select_admin on public.rate_limit_buckets;
create policy rate_limit_buckets_select_admin
    on public.rate_limit_buckets
    for select
    to authenticated
    using (public.is_admin());

drop trigger if exists trg_rate_limit_buckets_updated_at on public.rate_limit_buckets;
create trigger trg_rate_limit_buckets_updated_at
before update on public.rate_limit_buckets
for each row execute function public.set_updated_at();

create or replace function public.log_platform_event(
    p_scope text,
    p_action text,
    p_severity text default 'info',
    p_actor_user_id uuid default null,
    p_order_id uuid default null,
    p_artist_id uuid default null,
    p_product_id uuid default null,
    p_fulfillment_job_id uuid default null,
    p_external_id text default null,
    p_message text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
begin
    insert into public.platform_events (
        scope,
        action,
        severity,
        actor_user_id,
        order_id,
        artist_id,
        product_id,
        fulfillment_job_id,
        external_id,
        message,
        metadata
    )
    values (
        p_scope,
        p_action,
        coalesce(nullif(p_severity, ''), 'info'),
        p_actor_user_id,
        p_order_id,
        p_artist_id,
        p_product_id,
        p_fulfillment_job_id,
        p_external_id,
        p_message,
        coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.log_platform_event(text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) from public;
revoke all on function public.log_platform_event(text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) from anon;
grant execute on function public.log_platform_event(text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) to service_role;

create or replace function public.check_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now timestamptz := now();
    v_reset_at timestamptz := now() + make_interval(secs => p_window_seconds);
    v_bucket public.rate_limit_buckets%rowtype;
begin
    if p_key is null or length(p_key) = 0 or p_limit <= 0 or p_window_seconds <= 0 then
        return false;
    end if;

    insert into public.rate_limit_buckets (key, count, reset_at)
    values (p_key, 1, v_reset_at)
    on conflict (key) do update
       set count = case
               when public.rate_limit_buckets.reset_at <= v_now then 1
               else public.rate_limit_buckets.count + 1
           end,
           reset_at = case
               when public.rate_limit_buckets.reset_at <= v_now then v_reset_at
               else public.rate_limit_buckets.reset_at
           end,
           updated_at = v_now
    returning * into v_bucket;

    return v_bucket.count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

create or replace function public.award_merch_credits_for_order(
    p_user_id uuid,
    p_order_id uuid,
    p_item_count integer,
    p_points_per_item integer default 3
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_points integer;
begin
    if p_user_id is null or p_order_id is null or coalesce(p_item_count, 0) <= 0 then
        return 0;
    end if;

    v_points := p_item_count * coalesce(p_points_per_item, 3);

    insert into public.merch_credit_balances (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    insert into public.merch_credit_ledger (
        user_id,
        order_id,
        points,
        reason,
        description,
        metadata
    )
    values (
        p_user_id,
        p_order_id,
        v_points,
        'order_earned',
        format('Earned %s merch credits from order %s.', v_points, p_order_id),
        jsonb_build_object(
            'item_count', p_item_count,
            'points_per_item', coalesce(p_points_per_item, 3)
        )
    )
    on conflict do nothing;

    if not found then
        return 0;
    end if;

    update public.merch_credit_balances
       set points_balance = points_balance + v_points,
           lifetime_points = lifetime_points + v_points,
           updated_at = now()
     where user_id = p_user_id;

    return v_points;
end;
$$;

revoke all on function public.award_merch_credits_for_order(uuid, uuid, integer, integer) from public;
revoke all on function public.award_merch_credits_for_order(uuid, uuid, integer, integer) from anon;
grant execute on function public.award_merch_credits_for_order(uuid, uuid, integer, integer) to service_role;

create or replace function public.process_stripe_checkout_order(
    p_session jsonb,
    p_items jsonb
)
returns table(order_id uuid, order_number text, item_count integer, fulfillment_job_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order_id uuid;
    v_order_number text;
    v_existing_status text;
    v_user_id uuid;
    v_payment_intent text;
    v_item_count integer;
    v_fulfillment_job_id uuid;
    v_status_before text;
begin
    if p_session is null or nullif(p_session->>'stripe_session_id', '') is null then
        raise exception 'stripe_session_id is required';
    end if;

    v_user_id := nullif(p_session->>'user_id', '')::uuid;
    v_payment_intent := nullif(p_session->>'stripe_payment_intent', '');

    insert into public.orders (
        user_id,
        email,
        stripe_session_id,
        stripe_payment_intent,
        subtotal_cents,
        total_cents,
        currency,
        shipping_method,
        voucher_code,
        first_name,
        last_name,
        line1,
        line2,
        city,
        state,
        postal_code,
        country,
        phone,
        status,
        operational_status
    )
    values (
        v_user_id,
        nullif(p_session->>'email', ''),
        p_session->>'stripe_session_id',
        v_payment_intent,
        coalesce((p_session->>'subtotal_cents')::integer, 0),
        coalesce((p_session->>'total_cents')::integer, 0),
        coalesce(nullif(p_session->>'currency', ''), 'AUD'),
        nullif(p_session->>'shipping_method', ''),
        nullif(p_session->>'voucher_code', ''),
        nullif(p_session->>'first_name', ''),
        nullif(p_session->>'last_name', ''),
        nullif(p_session->>'line1', ''),
        nullif(p_session->>'line2', ''),
        nullif(p_session->>'city', ''),
        nullif(p_session->>'state', ''),
        nullif(p_session->>'postal_code', ''),
        nullif(p_session->>'country', ''),
        nullif(p_session->>'phone', ''),
        'paid',
        'recorded'
    )
    on conflict (stripe_session_id) where stripe_session_id is not null do update
       set user_id = coalesce(public.orders.user_id, excluded.user_id),
           email = coalesce(public.orders.email, excluded.email),
           stripe_payment_intent = coalesce(public.orders.stripe_payment_intent, excluded.stripe_payment_intent),
           subtotal_cents = excluded.subtotal_cents,
           total_cents = excluded.total_cents,
           currency = excluded.currency,
           shipping_method = coalesce(public.orders.shipping_method, excluded.shipping_method),
           voucher_code = coalesce(public.orders.voucher_code, excluded.voucher_code),
           first_name = coalesce(public.orders.first_name, excluded.first_name),
           last_name = coalesce(public.orders.last_name, excluded.last_name),
           line1 = coalesce(public.orders.line1, excluded.line1),
           line2 = coalesce(public.orders.line2, excluded.line2),
           city = coalesce(public.orders.city, excluded.city),
           state = coalesce(public.orders.state, excluded.state),
           postal_code = coalesce(public.orders.postal_code, excluded.postal_code),
           country = coalesce(public.orders.country, excluded.country),
           phone = coalesce(public.orders.phone, excluded.phone),
           updated_at = now()
    returning id, public.orders.order_number, public.orders.status
      into v_order_id, v_order_number, v_existing_status;

    if v_order_number is null then
        v_order_number := 'MT-' || lpad(nextval('public.order_reference_seq')::text, 6, '0');

        update public.orders
           set order_number = v_order_number
         where id = v_order_id
           and order_number is null;
    end if;

    insert into public.order_status_events (
        order_id,
        from_status,
        to_status,
        reason,
        metadata
    )
    values (
        v_order_id,
        null,
        coalesce(v_existing_status, 'paid'),
        'stripe_checkout_session_completed',
        jsonb_build_object('stripe_session_id', p_session->>'stripe_session_id')
    )
    on conflict do nothing;

    insert into public.order_items (
        order_id,
        stripe_line_item_id,
        product_id,
        artist_id,
        title,
        qty,
        unit_price_cents,
        currency,
        sku,
        color_label,
        size_label,
        metadata
    )
    select
        v_order_id,
        nullif(item->>'stripe_line_item_id', ''),
        nullif(item->>'product_id', '')::uuid,
        nullif(item->>'artist_id', '')::uuid,
        coalesce(nullif(item->>'title', ''), 'Product'),
        coalesce((item->>'qty')::integer, 1),
        coalesce((item->>'unit_price_cents')::integer, 0),
        coalesce(nullif(item->>'currency', ''), coalesce(nullif(p_session->>'currency', ''), 'AUD')),
        nullif(item->>'sku', ''),
        nullif(item->>'color_label', ''),
        nullif(item->>'size_label', ''),
        coalesce(item->'metadata', '{}'::jsonb)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
    where nullif(item->>'stripe_line_item_id', '') is not null
    on conflict (stripe_line_item_id) where stripe_line_item_id is not null do update
       set product_id = excluded.product_id,
           artist_id = excluded.artist_id,
           title = excluded.title,
           qty = excluded.qty,
           unit_price_cents = excluded.unit_price_cents,
           currency = excluded.currency,
           sku = excluded.sku,
           color_label = excluded.color_label,
           size_label = excluded.size_label,
           metadata = excluded.metadata;

    select coalesce(sum(coalesce(qty, 0)), 0)
      into v_item_count
      from public.order_items
     where order_id = v_order_id
       and coalesce(unit_price_cents, 0) > 0;

    perform public.award_merch_credits_for_order(v_user_id, v_order_id, v_item_count, 3);

    select status
      into v_status_before
      from public.fulfillment_jobs
     where order_id = v_order_id;

    insert into public.fulfillment_jobs (
        order_id,
        provider,
        status,
        priority,
        queued_at
    )
    values (
        v_order_id,
        'merch_tent',
        'pending',
        'normal',
        now()
    )
    on conflict (order_id) do update
       set updated_at = now()
    returning id into v_fulfillment_job_id;

    if v_status_before is null then
        insert into public.fulfillment_job_events (
            fulfillment_job_id,
            order_id,
            from_status,
            to_status,
            reason,
            metadata
        )
        values (
            v_fulfillment_job_id,
            v_order_id,
            null,
            'pending',
            'stripe_checkout_session_completed',
            jsonb_build_object('stripe_session_id', p_session->>'stripe_session_id')
        );
    end if;

    update public.orders
       set operational_status = 'ready_for_fulfillment',
           updated_at = now()
     where id = v_order_id;

    perform public.log_platform_event(
        'orders',
        'stripe_checkout_processed',
        'info',
        null,
        v_order_id,
        null,
        null,
        v_fulfillment_job_id,
        p_session->>'stripe_session_id',
        'Stripe checkout session processed into order records.',
        jsonb_build_object('item_count', v_item_count)
    );

    order_id := v_order_id;
    order_number := v_order_number;
    item_count := v_item_count;
    fulfillment_job_id := v_fulfillment_job_id;
    return next;
end;
$$;

revoke all on function public.process_stripe_checkout_order(jsonb, jsonb) from public;
revoke all on function public.process_stripe_checkout_order(jsonb, jsonb) from anon;
grant execute on function public.process_stripe_checkout_order(jsonb, jsonb) to service_role;

create or replace view public.orders_operational_exceptions
with (security_invoker = true)
as
select
    o.id,
    o.order_number,
    o.stripe_session_id,
    o.status,
    o.operational_status,
    o.created_at,
    o.updated_at,
    count(oi.id) as item_rows,
    coalesce(sum(coalesce(oi.qty, 0)), 0) as item_units,
    fj.id as fulfillment_job_id,
    fj.status as fulfillment_status
from public.orders o
left join public.order_items oi on oi.order_id = o.id
left join public.fulfillment_jobs fj on fj.order_id = o.id
where o.status in ('paid', 'in_production', 'shipped', 'delivered')
group by o.id, fj.id
having count(oi.id) = 0 or fj.id is null;
