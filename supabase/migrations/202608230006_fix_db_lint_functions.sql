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

    insert into public.cash_out_items (
        cash_out_id,
        order_item_id,
        artist_id,
        amount_cents
    )
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
           and public.orders.order_number is null;
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
        )
        on conflict do nothing;
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
