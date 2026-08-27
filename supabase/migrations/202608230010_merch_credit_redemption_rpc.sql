alter table public.merch_credit_ledger
    add column if not exists idempotency_key text;

create unique index if not exists idx_merch_credit_ledger_redemption_idempotency
    on public.merch_credit_ledger (idempotency_key)
    where reason = 'redemption' and idempotency_key is not null;

create or replace function public.redeem_merch_credits(
    p_user_id uuid,
    p_points integer,
    p_idempotency_key text,
    p_order_id uuid default null,
    p_description text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_balance public.merch_credit_balances%rowtype;
    v_existing public.merch_credit_ledger%rowtype;
    v_actor uuid := auth.uid();
begin
    if p_user_id is null then
        raise exception 'user id is required';
    end if;

    if p_points is null or p_points <= 0 then
        raise exception 'points must be greater than zero';
    end if;

    if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
        raise exception 'idempotency key is required';
    end if;

    if v_actor is not null and v_actor <> p_user_id and not public.is_admin() then
        raise exception 'not authorised to redeem credits for this user';
    end if;

    select *
      into v_existing
      from public.merch_credit_ledger
     where reason = 'redemption'
       and idempotency_key = p_idempotency_key
     limit 1;

    if found then
        return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'ledger_id', v_existing.id,
            'points', abs(v_existing.points)
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

    if not found then
        raise exception 'credit balance not found';
    end if;

    if v_balance.points_balance < p_points then
        raise exception 'insufficient merch credits';
    end if;

    update public.merch_credit_balances
       set points_balance = points_balance - p_points,
           redeemed_points = redeemed_points + p_points,
           updated_at = now()
     where user_id = p_user_id;

    insert into public.merch_credit_ledger (
        user_id,
        order_id,
        points,
        reason,
        description,
        metadata,
        idempotency_key
    )
    values (
        p_user_id,
        p_order_id,
        -p_points,
        'redemption',
        coalesce(p_description, format('Redeemed %s merch credits.', p_points)),
        coalesce(p_metadata, '{}'::jsonb),
        p_idempotency_key
    )
    returning * into v_existing;

    return jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'ledger_id', v_existing.id,
        'points', p_points
    );
end;
$$;

revoke all on function public.redeem_merch_credits(uuid, integer, text, uuid, text, jsonb) from public;
revoke all on function public.redeem_merch_credits(uuid, integer, text, uuid, text, jsonb) from anon;
grant execute on function public.redeem_merch_credits(uuid, integer, text, uuid, text, jsonb) to authenticated;
grant execute on function public.redeem_merch_credits(uuid, integer, text, uuid, text, jsonb) to service_role;
