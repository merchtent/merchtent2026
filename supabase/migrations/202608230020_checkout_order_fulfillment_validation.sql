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
    v_raw_user_id text;
    v_payment_intent text;
    v_item_count integer;
    v_fulfillment_job_id uuid;
    v_status_before text;
    v_country text;
    v_currency text;
    v_email text;
    v_first_name text;
    v_last_name text;
    v_line1 text;
    v_line2 text;
    v_city text;
    v_state text;
    v_postal_code text;
    v_phone text;
begin
    if p_session is null or nullif(btrim(p_session->>'stripe_session_id'), '') is null then
        raise exception 'stripe_session_id is required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'at least one checkout product line item is required';
    end if;

    v_raw_user_id := nullif(btrim(p_session->>'user_id'), '');
    if v_raw_user_id is not null and v_raw_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception 'user_id must be a valid uuid when supplied';
    end if;

    v_user_id := v_raw_user_id::uuid;
    v_payment_intent := nullif(btrim(p_session->>'stripe_payment_intent'), '');
    v_country := upper(nullif(btrim(p_session->>'country'), ''));
    v_currency := upper(coalesce(nullif(btrim(p_session->>'currency'), ''), 'AUD'));
    v_email := nullif(btrim(p_session->>'email'), '');
    v_first_name := nullif(btrim(p_session->>'first_name'), '');
    v_last_name := nullif(btrim(p_session->>'last_name'), '');
    v_line1 := nullif(btrim(p_session->>'line1'), '');
    v_line2 := nullif(btrim(p_session->>'line2'), '');
    v_city := nullif(btrim(p_session->>'city'), '');
    v_state := nullif(btrim(p_session->>'state'), '');
    v_postal_code := nullif(btrim(p_session->>'postal_code'), '');
    v_phone := nullif(btrim(p_session->>'phone'), '');

    if v_email is null then
        raise exception 'customer email is required for paid checkout orders';
    end if;

    if v_first_name is null or v_last_name is null or v_line1 is null or v_city is null
       or v_state is null or v_postal_code is null or v_country is null or v_phone is null then
        raise exception 'complete shipping contact and address fields are required for paid checkout orders';
    end if;

    if v_country !~ '^[A-Z]{2}$' then
        raise exception 'shipping country must be a two-letter ISO country code';
    end if;

    if v_currency !~ '^[A-Z]{3}$' then
        raise exception 'currency must be a three-letter ISO currency code';
    end if;

    if exists (
        select 1
          from jsonb_array_elements(p_items) item
         where nullif(btrim(item->>'stripe_line_item_id'), '') is null
            or nullif(btrim(item->>'product_id'), '') is null
            or (item->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            or (nullif(btrim(item->>'artist_id'), '') is not null and (item->>'artist_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
            or case
                when coalesce(item->>'qty', '') ~ '^[0-9]+$'
                    then (item->>'qty')::integer <= 0
                else true
            end
            or case
                when coalesce(item->>'unit_price_cents', '') ~ '^[0-9]+$'
                    then (item->>'unit_price_cents')::integer < 0
                else true
            end
    ) then
        raise exception 'checkout line items must include stripe_line_item_id, product_id, positive qty, and non-negative unit_price_cents';
    end if;

    insert into public.orders (
        user_id, email, stripe_session_id, stripe_payment_intent, subtotal_cents,
        total_cents, currency, shipping_method, voucher_code, first_name, last_name,
        line1, line2, city, state, postal_code, country, phone, status, operational_status
    )
    values (
        v_user_id,
        v_email,
        btrim(p_session->>'stripe_session_id'),
        v_payment_intent,
        coalesce((p_session->>'subtotal_cents')::integer, 0),
        coalesce((p_session->>'total_cents')::integer, 0),
        v_currency,
        nullif(btrim(p_session->>'shipping_method'), ''),
        nullif(btrim(p_session->>'voucher_code'), ''),
        v_first_name,
        v_last_name,
        v_line1,
        v_line2,
        v_city,
        v_state,
        v_postal_code,
        v_country,
        v_phone,
        'paid',
        'recorded'
    )
    on conflict (stripe_session_id) where stripe_session_id is not null do update
       set user_id = coalesce(public.orders.user_id, excluded.user_id),
           email = excluded.email,
           stripe_payment_intent = coalesce(public.orders.stripe_payment_intent, excluded.stripe_payment_intent),
           subtotal_cents = excluded.subtotal_cents,
           total_cents = excluded.total_cents,
           currency = excluded.currency,
           shipping_method = coalesce(public.orders.shipping_method, excluded.shipping_method),
           voucher_code = coalesce(public.orders.voucher_code, excluded.voucher_code),
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           line1 = excluded.line1,
           line2 = excluded.line2,
           city = excluded.city,
           state = excluded.state,
           postal_code = excluded.postal_code,
           country = excluded.country,
           phone = excluded.phone,
           updated_at = now()
    returning public.orders.id, public.orders.order_number, public.orders.status
      into v_order_id, v_order_number, v_existing_status;

    if v_order_number is null then
        v_order_number := 'MT-' || lpad(nextval('public.order_reference_seq')::text, 6, '0');

        update public.orders
           set order_number = v_order_number
         where public.orders.id = v_order_id
           and public.orders.order_number is null;
    end if;

    insert into public.order_status_events (order_id, from_status, to_status, reason, metadata)
    values (
        v_order_id,
        null,
        coalesce(v_existing_status, 'paid'),
        'stripe_checkout_session_completed',
        jsonb_build_object('stripe_session_id', p_session->>'stripe_session_id')
    )
    on conflict do nothing;

    insert into public.order_items (
        order_id, stripe_line_item_id, product_id, artist_id, title, qty,
        unit_price_cents, currency, sku, color_label, size_label, metadata
    )
    select
        v_order_id,
        nullif(btrim(item->>'stripe_line_item_id'), ''),
        nullif(btrim(item->>'product_id'), '')::uuid,
        nullif(btrim(item->>'artist_id'), '')::uuid,
        coalesce(nullif(btrim(item->>'title'), ''), 'Product'),
        coalesce((item->>'qty')::integer, 1),
        coalesce((item->>'unit_price_cents')::integer, 0),
        upper(coalesce(nullif(btrim(item->>'currency'), ''), v_currency)),
        nullif(btrim(item->>'sku'), ''),
        nullif(btrim(item->>'color_label'), ''),
        nullif(btrim(item->>'size_label'), ''),
        coalesce(item->'metadata', '{}'::jsonb)
    from jsonb_array_elements(p_items) item
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

    select coalesce(sum(coalesce(public.order_items.qty, 0)), 0)
      into v_item_count
      from public.order_items
     where public.order_items.order_id = v_order_id
       and coalesce(public.order_items.unit_price_cents, 0) > 0;

    if v_item_count <= 0 then
        raise exception 'paid checkout order must contain at least one paid product unit';
    end if;

    perform public.award_merch_credits_for_order(v_user_id, v_order_id, v_item_count, 3);

    select public.fulfillment_jobs.status
      into v_status_before
      from public.fulfillment_jobs
     where public.fulfillment_jobs.order_id = v_order_id;

    insert into public.fulfillment_jobs (order_id, provider, status, priority, queued_at)
    values (v_order_id, 'merch_tent', 'pending', 'normal', now())
    on conflict on constraint fulfillment_jobs_order_id_key do update
       set updated_at = now()
    returning public.fulfillment_jobs.id into v_fulfillment_job_id;

    if v_status_before is null then
        insert into public.fulfillment_job_events (
            fulfillment_job_id, order_id, from_status, to_status, reason, metadata
        )
        values (
            v_fulfillment_job_id,
            v_order_id,
            null,
            'pending',
            'stripe_checkout_session_completed',
            jsonb_build_object('stripe_session_id', p_session->>'stripe_session_id')
        )
        on conflict do nothing;
    end if;

    update public.orders
       set operational_status = 'ready_for_fulfillment',
           updated_at = now()
     where public.orders.id = v_order_id;

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
    fj.status as fulfillment_status,
    case
        when count(oi.id) = 0 then 'missing_order_items'
        when fj.id is null then 'missing_fulfillment_job'
        when nullif(btrim(o.email), '') is null then 'missing_customer_email'
        when nullif(btrim(o.first_name), '') is null
          or nullif(btrim(o.last_name), '') is null
          or nullif(btrim(o.line1), '') is null
          or nullif(btrim(o.city), '') is null
          or nullif(btrim(o.state), '') is null
          or nullif(btrim(o.postal_code), '') is null
          or nullif(btrim(o.country), '') is null
          or nullif(btrim(o.phone), '') is null
            then 'missing_fulfillment_address'
        when upper(coalesce(o.country, '')) !~ '^[A-Z]{2}$' then 'invalid_shipping_country'
        else 'unknown'
    end as exception_reason
from public.orders o
left join public.order_items oi on oi.order_id = o.id
left join public.fulfillment_jobs fj on fj.order_id = o.id
where o.status in ('paid', 'in_production', 'shipped', 'delivered')
group by o.id, fj.id
having count(oi.id) = 0
    or fj.id is null
    or nullif(btrim(o.email), '') is null
    or nullif(btrim(o.first_name), '') is null
    or nullif(btrim(o.last_name), '') is null
    or nullif(btrim(o.line1), '') is null
    or nullif(btrim(o.city), '') is null
    or nullif(btrim(o.state), '') is null
    or nullif(btrim(o.postal_code), '') is null
    or nullif(btrim(o.country), '') is null
    or nullif(btrim(o.phone), '') is null
    or upper(coalesce(o.country, '')) !~ '^[A-Z]{2}$';

revoke all on public.orders_operational_exceptions from public;
revoke all on public.orders_operational_exceptions from anon;
grant select on public.orders_operational_exceptions to authenticated;
