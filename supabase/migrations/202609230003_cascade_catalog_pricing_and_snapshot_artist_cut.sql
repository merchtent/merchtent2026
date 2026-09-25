alter table public.order_items
    add column if not exists artist_cut_cents integer;

update public.order_items item
set artist_cut_cents = case
    when coalesce(item.metadata->>'artist_cut_cents', '') ~ '^[0-9]+$'
        then (item.metadata->>'artist_cut_cents')::integer
    else coalesce(product.artist_cut_cents, 0)
end
from public.products product
where product.id = item.product_id
  and item.artist_cut_cents is null;

update public.order_items
set artist_cut_cents = 0
where artist_cut_cents is null;

alter table public.order_items
    alter column artist_cut_cents set default 0,
    alter column artist_cut_cents set not null,
    drop constraint if exists order_items_artist_cut_cents_check;

alter table public.order_items
    add constraint order_items_artist_cut_cents_check
    check (artist_cut_cents >= 0);

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

    v_artist_cut_text := coalesce(new.metadata->>'artist_cut_cents', '');
    if v_artist_cut_text ~ '^[0-9]+$' then
        new.artist_cut_cents := v_artist_cut_text::integer;
    elsif tg_op = 'INSERT' or new.artist_cut_cents is null then
        select coalesce(product.artist_cut_cents, 0)
          into new.artist_cut_cents
          from public.products product
         where product.id = new.product_id;
        new.artist_cut_cents := coalesce(new.artist_cut_cents, 0);
    end if;

    if v_purchase_type = 'artist_self_order' then
        select orders.user_id into v_order_user_id
          from public.orders
         where orders.id = new.order_id;

        select artists.user_id into v_artist_user_id
          from public.artists
         where artists.id = new.artist_id;

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

create or replace function public.cascade_supplier_catalog_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.supplier <> 'printify' then
        return new;
    end if;

    update public.products product
       set price_cents = new.default_price_cents + case
               when design.design_data->>'printSideCount' = '2'
                    and coalesce(new.included_print_sides, 1) < 2
                   then coalesce(new.additional_print_side_retail_cents, 0)
               else 0
           end,
           artist_cut_cents = new.artist_profit_cents
      from public.product_designs design
     where design.product_id = product.id
       and design.printify_blueprint_id::text = new.supplier_product_id;

    return new;
end;
$$;

drop trigger if exists trg_supplier_catalog_pricing_cascade on public.supplier_catalog_product_pricing;
create trigger trg_supplier_catalog_pricing_cascade
after insert or update of default_price_cents, artist_profit_cents, included_print_sides, additional_print_side_retail_cents
on public.supplier_catalog_product_pricing
for each row execute function public.cascade_supplier_catalog_pricing();

update public.products product
set price_cents = pricing.default_price_cents + case
        when design.design_data->>'printSideCount' = '2'
             and coalesce(pricing.included_print_sides, 1) < 2
            then coalesce(pricing.additional_print_side_retail_cents, 0)
        else 0
    end,
    artist_cut_cents = pricing.artist_profit_cents
from public.product_designs design
join public.supplier_catalog_product_pricing pricing
  on pricing.supplier = 'printify'
 and pricing.supplier_product_id = design.printify_blueprint_id::text
where design.product_id = product.id;

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
        select item.id as order_item_id
          from public.order_items item
         where item.artist_id = p_artist_id
           and item.purchase_type = 'retail'
           and coalesce(item.cashed_out, false) = false
         for update of item
      ) locked_items;

    select
        coalesce(sum(coalesce(item.qty, 0) * item.artist_cut_cents), 0),
        count(*)
      into v_total_cents, v_item_count
      from public.order_items item
     where item.id = any(v_order_item_ids);

    if v_item_count = 0 or v_total_cents <= 0 then
        return;
    end if;

    insert into public.cash_outs (artist_id, total_cents, status)
    values (p_artist_id, v_total_cents, 'pending')
    returning id into v_cash_out_id;

    insert into public.cash_out_items (cash_out_id, order_item_id, artist_id, amount_cents)
    select
        v_cash_out_id,
        item.id,
        item.artist_id,
        coalesce(item.qty, 0) * item.artist_cut_cents
      from public.order_items item
     where item.id = any(v_order_item_ids);

    update public.order_items item
       set cashed_out = true
     where item.id = any(v_order_item_ids);

    cash_out_id := v_cash_out_id;
    total_cents := v_total_cents;
    item_count := v_item_count;
    return next;
end;
$$;

revoke all on function public.create_artist_cash_out(uuid) from public;
revoke all on function public.create_artist_cash_out(uuid) from anon;
grant execute on function public.create_artist_cash_out(uuid) to authenticated;
