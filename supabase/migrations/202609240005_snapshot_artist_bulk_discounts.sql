alter table public.order_items
    add column if not exists artist_bulk_discount_cents integer not null default 0,
    add column if not exists artist_bulk_discount_bps integer not null default 0;

alter table public.order_items
    drop constraint if exists order_items_artist_bulk_discount_cents_check,
    drop constraint if exists order_items_artist_bulk_discount_bps_check;

alter table public.order_items
    add constraint order_items_artist_bulk_discount_cents_check
        check (artist_bulk_discount_cents >= 0),
    add constraint order_items_artist_bulk_discount_bps_check
        check (artist_bulk_discount_bps between 0 and 10000);

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
    v_bulk_discount_text text;
    v_bulk_discount_bps_text text;
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

    v_bulk_discount_text := coalesce(new.metadata->>'artist_bulk_discount_cents', '0');
    new.artist_bulk_discount_cents := case when v_bulk_discount_text ~ '^[0-9]+$' then v_bulk_discount_text::integer else 0 end;
    v_bulk_discount_bps_text := coalesce(new.metadata->>'artist_bulk_discount_bps', '0');
    new.artist_bulk_discount_bps := case when v_bulk_discount_bps_text ~ '^[0-9]+$' then v_bulk_discount_bps_text::integer else 0 end;

    v_artist_cut_text := coalesce(new.metadata->>'artist_cut_cents', '');
    if v_artist_cut_text ~ '^[0-9]+$' then
        new.artist_cut_cents := v_artist_cut_text::integer;
    elsif tg_op = 'INSERT' or new.artist_cut_cents is null then
        select coalesce(product.artist_cut_cents, 0) into new.artist_cut_cents
          from public.products product where product.id = new.product_id;
        new.artist_cut_cents := coalesce(new.artist_cut_cents, 0);
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
