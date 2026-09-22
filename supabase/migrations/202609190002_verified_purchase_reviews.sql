alter table if exists public.fan_shouts
    add column if not exists user_id uuid references public.profiles(id) on delete set null,
    add column if not exists order_item_id uuid references public.order_items(id) on delete set null,
    add column if not exists verified_purchase boolean not null default false,
    add column if not exists reviewed_at timestamptz;

create unique index if not exists idx_fan_shouts_order_item_review_once
    on public.fan_shouts (order_item_id)
    where order_item_id is not null;

create index if not exists idx_fan_shouts_product_published_created
    on public.fan_shouts (product_id, created_at desc)
    where is_published = true;

create or replace function public.submit_verified_product_review(
    p_order_item_id uuid,
    p_rating integer,
    p_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_review_id uuid;
    v_name text;
begin
    if v_user_id is null then raise exception 'sign in required'; end if;
    if p_rating not between 1 and 5 then raise exception 'rating must be 1-5'; end if;
    if length(btrim(coalesce(p_text, ''))) not between 10 and 2000 then raise exception 'review must be 10-2000 characters'; end if;

    select nullif(btrim(coalesce(p.display_name, '')), '') into v_name
    from public.profiles p where p.id = v_user_id;

    insert into public.fan_shouts (
        user_id, order_item_id, product_id, artist_id, name, rating, text,
        verified_purchase, reviewed_at, is_published
    )
    select
        v_user_id, oi.id, oi.product_id, oi.artist_id,
        coalesce(v_name, 'Verified customer'), p_rating, btrim(p_text),
        true, now(), true
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = p_order_item_id
      and o.user_id = v_user_id
      and o.status in ('delivered', 'fulfilled')
    returning id into v_review_id;

    if v_review_id is null then raise exception 'review is not eligible'; end if;
    return v_review_id;
exception
    when unique_violation then raise exception 'this item has already been reviewed';
end;
$$;

revoke all on function public.submit_verified_product_review(uuid, integer, text) from public;
grant execute on function public.submit_verified_product_review(uuid, integer, text) to authenticated;

create or replace function public.eligible_product_review_items(p_product_id uuid)
returns table(order_item_id uuid, order_number text)
language sql
security definer
set search_path = public
as $$
    select oi.id, o.order_number
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    left join public.fan_shouts fs on fs.order_item_id = oi.id
    where auth.uid() is not null
      and o.user_id = auth.uid()
      and oi.product_id = p_product_id
      and o.status in ('delivered', 'fulfilled')
      and fs.id is null
    order by o.created_at desc;
$$;

revoke all on function public.eligible_product_review_items(uuid) from public;
grant execute on function public.eligible_product_review_items(uuid) to authenticated;
