create table if not exists public.merch_credit_reservations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    stripe_session_id text,
    points integer not null check (points > 0),
    discount_cents integer not null check (discount_cents > 0),
    currency text not null default 'AUD',
    status text not null default 'reserved',
    idempotency_key text not null,
    metadata jsonb not null default '{}'::jsonb,
    expires_at timestamptz not null,
    redeemed_at timestamptz,
    released_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint merch_credit_reservations_status_check
        check (status in ('reserved', 'redeemed', 'released', 'expired'))
);

create unique index if not exists idx_merch_credit_reservations_idempotency
    on public.merch_credit_reservations (idempotency_key);

create unique index if not exists idx_merch_credit_reservations_stripe_session
    on public.merch_credit_reservations (stripe_session_id)
    where stripe_session_id is not null;

create index if not exists idx_merch_credit_reservations_user_status_expires
    on public.merch_credit_reservations (user_id, status, expires_at desc);

alter table public.merch_credit_reservations enable row level security;

drop policy if exists merch_credit_reservations_select_own_or_admin on public.merch_credit_reservations;
create policy merch_credit_reservations_select_own_or_admin
    on public.merch_credit_reservations
    for select
    to authenticated
    using (user_id = auth.uid() or public.is_admin());

drop trigger if exists trg_merch_credit_reservations_updated_at on public.merch_credit_reservations;
create trigger trg_merch_credit_reservations_updated_at
before update on public.merch_credit_reservations
for each row execute function public.set_updated_at();

create or replace function public.reserve_merch_credits(
    p_user_id uuid,
    p_points integer,
    p_discount_cents integer,
    p_currency text,
    p_idempotency_key text,
    p_expires_at timestamptz,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_actor uuid := auth.uid();
    v_balance public.merch_credit_balances%rowtype;
    v_reserved_points integer;
    v_reservation public.merch_credit_reservations%rowtype;
begin
    if p_user_id is null then
        raise exception 'user id is required';
    end if;

    if v_actor is not null and v_actor <> p_user_id and not public.is_admin() then
        raise exception 'not authorised to reserve credits for this user';
    end if;

    if p_points is null or p_points <= 0 then
        raise exception 'points must be greater than zero';
    end if;

    if p_discount_cents is null or p_discount_cents <= 0 then
        raise exception 'discount must be greater than zero';
    end if;

    if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
        raise exception 'idempotency key is required';
    end if;

    select *
      into v_reservation
      from public.merch_credit_reservations
     where idempotency_key = p_idempotency_key
     limit 1;

    if found then
        return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'reservation_id', v_reservation.id,
            'points', v_reservation.points,
            'discount_cents', v_reservation.discount_cents
        );
    end if;

    insert into public.merch_credit_balances (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    select *
      into v_balance
      from public.merch_credit_balances
     where user_id = p_user_id
     for update;

    select coalesce(sum(points), 0)
      into v_reserved_points
      from public.merch_credit_reservations
     where user_id = p_user_id
       and status = 'reserved'
       and expires_at > now();

    if v_balance.points_balance - v_reserved_points < p_points then
        raise exception 'insufficient available merch credits';
    end if;

    insert into public.merch_credit_reservations (
        user_id,
        points,
        discount_cents,
        currency,
        idempotency_key,
        expires_at,
        metadata
    )
    values (
        p_user_id,
        p_points,
        p_discount_cents,
        coalesce(nullif(p_currency, ''), 'AUD'),
        p_idempotency_key,
        p_expires_at,
        coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_reservation;

    return jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'reservation_id', v_reservation.id,
        'points', v_reservation.points,
        'discount_cents', v_reservation.discount_cents
    );
end;
$$;

create or replace function public.attach_merch_credit_reservation(
    p_reservation_id uuid,
    p_stripe_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_reservation_id is null or nullif(trim(coalesce(p_stripe_session_id, '')), '') is null then
        raise exception 'reservation and stripe session are required';
    end if;

    update public.merch_credit_reservations
       set stripe_session_id = p_stripe_session_id
     where id = p_reservation_id
       and status = 'reserved';

    if not found then
        raise exception 'active merch credit reservation not found';
    end if;
end;
$$;

create or replace function public.release_merch_credit_reservation(
    p_reservation_id uuid,
    p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.merch_credit_reservations
       set status = 'released',
           released_at = now(),
           metadata = metadata || jsonb_build_object('release_reason', p_reason)
     where id = p_reservation_id
       and status = 'reserved';
end;
$$;

create or replace function public.redeem_merch_credit_reservation(
    p_reservation_id uuid,
    p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_reservation public.merch_credit_reservations%rowtype;
    v_redemption jsonb;
begin
    select *
      into v_reservation
      from public.merch_credit_reservations
     where id = p_reservation_id
     for update;

    if not found then
        raise exception 'merch credit reservation not found';
    end if;

    if v_reservation.status = 'redeemed' then
        return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'reservation_id', v_reservation.id,
            'points', v_reservation.points
        );
    end if;

    if v_reservation.status <> 'reserved' then
        raise exception 'merch credit reservation is not redeemable';
    end if;

    v_redemption := public.redeem_merch_credits(
        v_reservation.user_id,
        v_reservation.points,
        'reservation:' || v_reservation.id::text,
        p_order_id,
        format('Redeemed %s merch credits for order %s.', v_reservation.points, p_order_id),
        v_reservation.metadata || jsonb_build_object(
            'reservation_id', v_reservation.id,
            'discount_cents', v_reservation.discount_cents,
            'stripe_session_id', v_reservation.stripe_session_id
        )
    );

    update public.merch_credit_reservations
       set status = 'redeemed',
           order_id = p_order_id,
           redeemed_at = now()
     where id = v_reservation.id;

    return v_redemption || jsonb_build_object(
        'reservation_id', v_reservation.id,
        'discount_cents', v_reservation.discount_cents
    );
end;
$$;

revoke all on function public.reserve_merch_credits(uuid, integer, integer, text, text, timestamptz, jsonb) from public;
revoke all on function public.reserve_merch_credits(uuid, integer, integer, text, text, timestamptz, jsonb) from anon;
grant execute on function public.reserve_merch_credits(uuid, integer, integer, text, text, timestamptz, jsonb) to authenticated;
grant execute on function public.reserve_merch_credits(uuid, integer, integer, text, text, timestamptz, jsonb) to service_role;

revoke all on function public.attach_merch_credit_reservation(uuid, text) from public;
revoke all on function public.attach_merch_credit_reservation(uuid, text) from anon;
grant execute on function public.attach_merch_credit_reservation(uuid, text) to service_role;

revoke all on function public.release_merch_credit_reservation(uuid, text) from public;
revoke all on function public.release_merch_credit_reservation(uuid, text) from anon;
grant execute on function public.release_merch_credit_reservation(uuid, text) to service_role;

revoke all on function public.redeem_merch_credit_reservation(uuid, uuid) from public;
revoke all on function public.redeem_merch_credit_reservation(uuid, uuid) from anon;
grant execute on function public.redeem_merch_credit_reservation(uuid, uuid) to service_role;
