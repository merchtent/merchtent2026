-- Production hardening baseline for Merch Tent.
-- Review against the live schema before applying to production.

alter table if exists public.orders
    add column if not exists tracking_code text,
    add column if not exists tracking_carrier text,
    add column if not exists tracking_url text;

create index if not exists idx_orders_user_created_at
    on public.orders (user_id, created_at desc);

create index if not exists idx_orders_stripe_session_id
    on public.orders (stripe_session_id);

create index if not exists idx_products_public_category
    on public.products (is_published, category);

create index if not exists idx_products_artist_public
    on public.products (artist_id, is_published);

create index if not exists idx_order_items_artist_cashout
    on public.order_items (artist_id, cashed_out);

alter table if exists public.orders enable row level security;
alter table if exists public.artists enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.cash_outs enable row level security;
alter table if exists public.cash_out_items enable row level security;

drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders"
    on public.orders
    for select
    using (auth.uid() = user_id);

drop policy if exists "Artists can read their own payout rows" on public.cash_outs;
create policy "Artists can read their own payout rows"
    on public.cash_outs
    for select
    using (
        exists (
            select 1
            from public.artists a
            where a.id = cash_outs.artist_id
              and a.user_id = auth.uid()
        )
    );

drop policy if exists "Artists can read their own payout items" on public.cash_out_items;
create policy "Artists can read their own payout items"
    on public.cash_out_items
    for select
    using (
        exists (
            select 1
            from public.artists a
            where a.id = cash_out_items.artist_id
              and a.user_id = auth.uid()
        )
    );

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
begin
    select user_id
      into v_artist_user_id
      from public.artists
     where id = p_artist_id;

    if v_artist_user_id is null or v_artist_user_id <> auth.uid() then
        raise exception 'Not allowed to cash out this artist';
    end if;

    create temporary table tmp_cash_out_items on commit drop as
    select
        oi.id as order_item_id,
        oi.artist_id,
        coalesce(oi.qty, 0) * coalesce(p.artist_cut_cents, 0) as amount_cents
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
     where oi.artist_id = p_artist_id
       and coalesce(oi.cashed_out, false) = false
     for update of oi;

    select coalesce(sum(amount_cents), 0), count(*)
      into v_total_cents, v_item_count
      from tmp_cash_out_items;

    if v_item_count = 0 or v_total_cents <= 0 then
        return;
    end if;

    insert into public.cash_outs (artist_id, total_cents, status)
    values (p_artist_id, v_total_cents, 'pending')
    returning id into v_cash_out_id;

    insert into public.cash_out_items (
        cash_out_id,
        order_item_id,
        artist_id,
        amount_cents
    )
    select
        v_cash_out_id,
        order_item_id,
        artist_id,
        amount_cents
      from tmp_cash_out_items;

    update public.order_items oi
       set cashed_out = true
      from tmp_cash_out_items tmp
     where oi.id = tmp.order_item_id;

    cash_out_id := v_cash_out_id;
    total_cents := v_total_cents;
    item_count := v_item_count;
    return next;
end;
$$;

revoke all on function public.create_artist_cash_out(uuid) from public;
grant execute on function public.create_artist_cash_out(uuid) to authenticated;
