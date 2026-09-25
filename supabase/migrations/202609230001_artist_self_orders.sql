alter table public.orders
    add column if not exists purchase_type text not null default 'retail';

alter table public.orders
    drop constraint if exists orders_purchase_type_check;

alter table public.orders
    add constraint orders_purchase_type_check
    check (purchase_type in ('retail', 'artist_self_order'));

alter table public.order_items
    add column if not exists purchase_type text not null default 'retail',
    add column if not exists artist_discount_cents integer not null default 0;

alter table public.order_items
    drop constraint if exists order_items_purchase_type_check,
    drop constraint if exists order_items_artist_discount_cents_check;

alter table public.order_items
    add constraint order_items_purchase_type_check
        check (purchase_type in ('retail', 'artist_self_order')),
    add constraint order_items_artist_discount_cents_check
        check (artist_discount_cents >= 0);

create index if not exists idx_order_items_artist_purchase_type
    on public.order_items (artist_id, purchase_type, cashed_out);

create or replace function public.apply_order_item_purchase_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_purchase_type text;
    v_discount_text text;
    v_order_user_id uuid;
    v_artist_user_id uuid;
begin
    v_purchase_type := coalesce(nullif(new.metadata->>'purchase_type', ''), 'retail');
    if v_purchase_type not in ('retail', 'artist_self_order') then
        raise exception 'Unsupported order item purchase type';
    end if;

    v_discount_text := coalesce(new.metadata->>'artist_discount_cents', '0');
    new.purchase_type := v_purchase_type;
    new.artist_discount_cents := case
        when v_discount_text ~ '^[0-9]+$' then v_discount_text::integer
        else 0
    end;

    if v_purchase_type = 'artist_self_order' then
        select o.user_id into v_order_user_id
          from public.orders o
         where o.id = new.order_id;

        select a.user_id into v_artist_user_id
          from public.artists a
         where a.id = new.artist_id;

        if v_order_user_id is null or v_artist_user_id is null or v_order_user_id <> v_artist_user_id then
            raise exception 'Artist self-order owner does not match the product artist';
        end if;

        new.cashed_out := true;
        update public.orders
           set purchase_type = 'artist_self_order',
               updated_at = now()
         where id = new.order_id;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_order_items_purchase_type on public.order_items;
create trigger trg_order_items_purchase_type
before insert or update of metadata on public.order_items
for each row execute function public.apply_order_item_purchase_type();

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

    if exists (
        select 1
          from public.orders o
         where o.id = p_order_id
           and o.purchase_type = 'artist_self_order'
    ) then
        return 0;
    end if;

    v_points := p_item_count * coalesce(p_points_per_item, 3);

    insert into public.merch_credit_balances (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    insert into public.merch_credit_ledger (
        user_id, order_id, points, reason, description, metadata
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

create or replace function public.create_artist_cash_out(p_artist_id uuid)
returns table(cash_out_id uuid, total_cents integer, item_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_artist_user_id uuid;
    v_cash_out_id uuid;
    v_total_cents integer;
    v_item_count integer;
    v_order_item_ids uuid[];
begin
    select user_id
      into v_artist_user_id
      from public.artists
     where id = p_artist_id;

    if v_artist_user_id is null or v_artist_user_id <> auth.uid() then
        raise exception 'Not allowed to cash out this artist';
    end if;

    select coalesce(array_agg(locked_items.order_item_id), '{}'::uuid[])
      into v_order_item_ids
      from (
        select oi.id as order_item_id
          from public.order_items oi
         where oi.artist_id = p_artist_id
           and oi.purchase_type = 'retail'
           and coalesce(oi.cashed_out, false) = false
         for update of oi
      ) locked_items;

    with cash_out_items_to_create as (
        select
            oi.id as order_item_id,
            oi.artist_id,
            coalesce(oi.qty, 0) * coalesce(p.artist_cut_cents, 0) as amount_cents
          from public.order_items oi
          left join public.products p on p.id = oi.product_id
         where oi.id = any(v_order_item_ids)
    )
    select coalesce(sum(amount_cents), 0), count(*)
      into v_total_cents, v_item_count
      from cash_out_items_to_create;

    if v_item_count = 0 or v_total_cents <= 0 then
        return;
    end if;

    insert into public.cash_outs (artist_id, total_cents, status)
    values (p_artist_id, v_total_cents, 'pending')
    returning id into v_cash_out_id;

    insert into public.cash_out_items (cash_out_id, order_item_id, artist_id, amount_cents)
    select
        v_cash_out_id,
        oi.id,
        oi.artist_id,
        coalesce(oi.qty, 0) * coalesce(p.artist_cut_cents, 0)
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
     where oi.id = any(v_order_item_ids);

    update public.order_items oi
       set cashed_out = true
     where oi.id = any(v_order_item_ids);

    cash_out_id := v_cash_out_id;
    total_cents := v_total_cents;
    item_count := v_item_count;
    return next;
end;
$$;

revoke all on function public.create_artist_cash_out(uuid) from public;
revoke all on function public.create_artist_cash_out(uuid) from anon;
grant execute on function public.create_artist_cash_out(uuid) to authenticated;
