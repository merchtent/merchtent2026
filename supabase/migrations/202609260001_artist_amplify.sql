create table if not exists public.artist_subscriptions (
    id uuid primary key default gen_random_uuid(),
    artist_id uuid not null unique references public.artists(id) on delete cascade,
    plan_key text not null default 'amplify' check (plan_key = 'amplify'),
    status text not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
    stripe_customer_id text not null unique,
    stripe_subscription_id text not null unique,
    stripe_price_id text not null,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    canceled_at timestamptz,
    ended_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_artist_subscriptions_status_period
    on public.artist_subscriptions (status, current_period_end);

create table if not exists public.artist_plan_entitlements (
    artist_id uuid primary key references public.artists(id) on delete cascade,
    subscription_id uuid references public.artist_subscriptions(id) on delete set null,
    plan_key text not null default 'amplify' check (plan_key = 'amplify'),
    active boolean not null default false,
    active_from timestamptz,
    active_until timestamptz,
    earnings_mode text not null check (earnings_mode in ('fixed', 'percentage')),
    extra_earnings_cents integer check (extra_earnings_cents is null or extra_earnings_cents >= 0),
    extra_earnings_basis_points integer check (extra_earnings_basis_points is null or extra_earnings_basis_points between 0 and 10000),
    homepage_priority boolean not null default false,
    monthly_promotion_credits integer not null default 0 check (monthly_promotion_credits >= 0),
    features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
    updated_at timestamptz not null default now(),
    check (
        (earnings_mode = 'fixed' and extra_earnings_cents is not null and extra_earnings_basis_points is null)
        or
        (earnings_mode = 'percentage' and extra_earnings_basis_points is not null and extra_earnings_cents is null)
    )
);

create index if not exists idx_artist_plan_entitlements_active_priority
    on public.artist_plan_entitlements (active, homepage_priority, active_until);

create table if not exists public.artist_promotion_requests (
    id uuid primary key default gen_random_uuid(),
    artist_id uuid not null references public.artists(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    channel text not null check (channel in ('instagram', 'tiktok', 'facebook', 'email', 'other')),
    status text not null default 'submitted' check (status in ('submitted', 'scheduled', 'published', 'declined', 'canceled')),
    requested_for date,
    brief text check (brief is null or char_length(brief) <= 2000),
    published_url text,
    period_start date not null,
    period_end date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (period_end > period_start)
);

create index if not exists idx_artist_promotion_requests_allowance
    on public.artist_promotion_requests (artist_id, period_start, status);

alter table public.order_items
    add column if not exists base_artist_cut_cents integer not null default 0,
    add column if not exists amplify_boost_cents integer not null default 0,
    add column if not exists artist_plan_key text not null default 'standard';

alter table public.order_items
    drop constraint if exists order_items_base_artist_cut_cents_check,
    drop constraint if exists order_items_amplify_boost_cents_check,
    drop constraint if exists order_items_artist_plan_key_check;

alter table public.order_items
    add constraint order_items_base_artist_cut_cents_check check (base_artist_cut_cents >= 0),
    add constraint order_items_amplify_boost_cents_check check (amplify_boost_cents >= 0),
    add constraint order_items_artist_plan_key_check check (artist_plan_key in ('standard', 'amplify'));

update public.order_items
set base_artist_cut_cents = artist_cut_cents,
    amplify_boost_cents = 0,
    artist_plan_key = 'standard'
where base_artist_cut_cents = 0
  and amplify_boost_cents = 0
  and artist_plan_key = 'standard';

alter table public.artist_subscriptions enable row level security;
alter table public.artist_plan_entitlements enable row level security;
alter table public.artist_promotion_requests enable row level security;

drop policy if exists artist_subscriptions_select_owner on public.artist_subscriptions;
create policy artist_subscriptions_select_owner
    on public.artist_subscriptions for select to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop policy if exists artist_subscriptions_admin_all on public.artist_subscriptions;
create policy artist_subscriptions_admin_all
    on public.artist_subscriptions for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists artist_plan_entitlements_select_owner on public.artist_plan_entitlements;
create policy artist_plan_entitlements_select_owner
    on public.artist_plan_entitlements for select to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop policy if exists artist_plan_entitlements_admin_all on public.artist_plan_entitlements;
create policy artist_plan_entitlements_admin_all
    on public.artist_plan_entitlements for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists artist_promotion_requests_select_owner on public.artist_promotion_requests;
create policy artist_promotion_requests_select_owner
    on public.artist_promotion_requests for select to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

drop policy if exists artist_promotion_requests_admin_all on public.artist_promotion_requests;
create policy artist_promotion_requests_admin_all
    on public.artist_promotion_requests for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

create or replace function public.sync_artist_amplify_subscription(p_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_artist_id uuid := (p_snapshot->>'artist_id')::uuid;
    v_subscription_id uuid;
    v_status text := p_snapshot->>'status';
    v_active boolean;
    v_period_start timestamptz := nullif(p_snapshot->>'current_period_start', '')::timestamptz;
    v_period_end timestamptz := nullif(p_snapshot->>'current_period_end', '')::timestamptz;
    v_earnings_mode text := p_snapshot->>'earnings_mode';
begin
    if auth.role() <> 'service_role' then
        raise exception 'Service role required';
    end if;

    if v_status not in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused') then
        raise exception 'Unsupported Amplify subscription status';
    end if;

    v_active := coalesce((p_snapshot->>'entitlements_enabled')::boolean, false)
        and v_status in ('trialing', 'active')
        and (v_period_end is null or v_period_end > now());

    insert into public.artist_subscriptions (
        artist_id, plan_key, status, stripe_customer_id, stripe_subscription_id,
        stripe_price_id, current_period_start, current_period_end, cancel_at_period_end,
        canceled_at, ended_at, metadata, updated_at
    ) values (
        v_artist_id, 'amplify', v_status, p_snapshot->>'stripe_customer_id',
        p_snapshot->>'stripe_subscription_id', p_snapshot->>'stripe_price_id',
        v_period_start, v_period_end, coalesce((p_snapshot->>'cancel_at_period_end')::boolean, false),
        nullif(p_snapshot->>'canceled_at', '')::timestamptz,
        nullif(p_snapshot->>'ended_at', '')::timestamptz,
        coalesce(p_snapshot->'metadata', '{}'::jsonb), now()
    )
    on conflict (artist_id) do update set
        status = excluded.status,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_price_id = excluded.stripe_price_id,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at = excluded.canceled_at,
        ended_at = excluded.ended_at,
        metadata = excluded.metadata,
        updated_at = now()
    returning id into v_subscription_id;

    insert into public.artist_plan_entitlements (
        artist_id, subscription_id, plan_key, active, active_from, active_until,
        earnings_mode, extra_earnings_cents, extra_earnings_basis_points,
        homepage_priority, monthly_promotion_credits, features, updated_at
    ) values (
        v_artist_id, v_subscription_id, 'amplify', v_active, v_period_start, v_period_end,
        v_earnings_mode,
        case when v_earnings_mode = 'fixed' then (p_snapshot->>'extra_earnings_cents')::integer else null end,
        case when v_earnings_mode = 'percentage' then (p_snapshot->>'extra_earnings_basis_points')::integer else null end,
        v_active and coalesce((p_snapshot->>'homepage_priority')::boolean, false),
        case when v_active then coalesce((p_snapshot->>'monthly_promotion_credits')::integer, 0) else 0 end,
        coalesce(p_snapshot->'features', '[]'::jsonb), now()
    )
    on conflict (artist_id) do update set
        subscription_id = excluded.subscription_id,
        active = excluded.active,
        active_from = excluded.active_from,
        active_until = excluded.active_until,
        earnings_mode = excluded.earnings_mode,
        extra_earnings_cents = excluded.extra_earnings_cents,
        extra_earnings_basis_points = excluded.extra_earnings_basis_points,
        homepage_priority = excluded.homepage_priority,
        monthly_promotion_credits = excluded.monthly_promotion_credits,
        features = excluded.features,
        updated_at = now();

    return v_subscription_id;
end;
$$;

create or replace function public.create_amplify_promotion_request(
    p_artist_id uuid,
    p_product_id uuid,
    p_channel text,
    p_requested_for date,
    p_brief text
)
returns public.artist_promotion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
    v_entitlement public.artist_plan_entitlements;
    v_period_start date := date_trunc('month', now())::date;
    v_period_end date := (date_trunc('month', now()) + interval '1 month')::date;
    v_used integer;
    v_request public.artist_promotion_requests;
begin
    if not public.owns_artist(p_artist_id) then
        raise exception 'Not allowed to request promotion for this artist';
    end if;

    select * into v_entitlement
      from public.artist_plan_entitlements
     where artist_id = p_artist_id
       and plan_key = 'amplify'
       and active = true
       and (active_until is null or active_until > now())
     for update;

    if v_entitlement.artist_id is null then
        raise exception 'Active Amplify membership required';
    end if;

    if p_product_id is not null and not exists (
        select 1 from public.products
         where id = p_product_id and artist_id = p_artist_id
    ) then
        raise exception 'Product does not belong to this artist';
    end if;

    select count(*) into v_used
      from public.artist_promotion_requests
     where artist_id = p_artist_id
       and period_start = v_period_start
       and status not in ('declined', 'canceled');

    if v_used >= v_entitlement.monthly_promotion_credits then
        raise exception 'Monthly Amplify promotion allowance has been used';
    end if;

    insert into public.artist_promotion_requests (
        artist_id, product_id, channel, requested_for, brief, period_start, period_end
    ) values (
        p_artist_id, p_product_id, p_channel, p_requested_for, nullif(trim(p_brief), ''),
        v_period_start, v_period_end
    ) returning * into v_request;

    return v_request;
end;
$$;

create or replace function public.apply_order_item_purchase_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_purchase_type text;
    v_discount_text text;
    v_artist_cut_text text;
    v_base_artist_cut_text text;
    v_amplify_boost_text text;
    v_plan_key text;
    v_order_user_id uuid;
    v_artist_user_id uuid;
begin
    v_purchase_type := coalesce(nullif(new.metadata->>'purchase_type', ''), 'retail');
    if v_purchase_type not in ('retail', 'artist_self_order') then
        raise exception 'Unsupported order item purchase type';
    end if;

    v_discount_text := coalesce(new.metadata->>'artist_discount_cents', '0');
    new.purchase_type := v_purchase_type;
    new.artist_discount_cents := case when v_discount_text ~ '^[0-9]+$' then v_discount_text::integer else 0 end;

    v_artist_cut_text := coalesce(new.metadata->>'artist_cut_cents', '');
    if v_artist_cut_text ~ '^[0-9]+$' then
        new.artist_cut_cents := v_artist_cut_text::integer;
    elsif tg_op = 'INSERT' or new.artist_cut_cents is null then
        select coalesce(product.artist_cut_cents, 0) into new.artist_cut_cents
          from public.products product where product.id = new.product_id;
        new.artist_cut_cents := coalesce(new.artist_cut_cents, 0);
    end if;

    v_base_artist_cut_text := coalesce(new.metadata->>'base_artist_cut_cents', '');
    new.base_artist_cut_cents := case
        when v_base_artist_cut_text ~ '^[0-9]+$' then v_base_artist_cut_text::integer
        else new.artist_cut_cents
    end;
    v_amplify_boost_text := coalesce(new.metadata->>'amplify_boost_cents', '0');
    new.amplify_boost_cents := case
        when v_amplify_boost_text ~ '^[0-9]+$' then v_amplify_boost_text::integer
        else 0
    end;
    v_plan_key := coalesce(nullif(new.metadata->>'artist_plan_key', ''), 'standard');
    new.artist_plan_key := case when v_plan_key = 'amplify' then 'amplify' else 'standard' end;

    if new.artist_cut_cents <> new.base_artist_cut_cents + new.amplify_boost_cents then
        raise exception 'Artist earnings snapshot does not reconcile';
    end if;

    if v_purchase_type = 'artist_self_order' then
        select orders.user_id into v_order_user_id from public.orders where orders.id = new.order_id;
        select artists.user_id into v_artist_user_id from public.artists where artists.id = new.artist_id;
        if v_order_user_id is null or v_artist_user_id is null or v_order_user_id <> v_artist_user_id then
            raise exception 'Artist self-order owner does not match the product artist';
        end if;
        new.cashed_out := true;
        update public.orders set purchase_type = 'artist_self_order', updated_at = now() where id = new.order_id;
    end if;

    return new;
end;
$$;

revoke all on function public.sync_artist_amplify_subscription(jsonb) from public, anon, authenticated;
grant execute on function public.sync_artist_amplify_subscription(jsonb) to service_role;
revoke all on function public.create_amplify_promotion_request(uuid, uuid, text, date, text) from public, anon;
grant execute on function public.create_amplify_promotion_request(uuid, uuid, text, date, text) to authenticated;
