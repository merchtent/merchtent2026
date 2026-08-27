create unique index if not exists idx_merch_credit_ledger_manual_adjustment_idempotency
    on public.merch_credit_ledger (idempotency_key)
    where reason = 'manual_adjustment' and idempotency_key is not null;

create or replace function public.admin_adjust_merch_credits(
    p_actor_user_id uuid,
    p_user_id uuid,
    p_points integer,
    p_description text,
    p_idempotency_key text,
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
    v_clean_description text := nullif(btrim(coalesce(p_description, '')), '');
    v_clean_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
begin
    if p_actor_user_id is null or not exists (
        select 1
          from public.profiles p
         where p.id = p_actor_user_id
           and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if p_user_id is null then
        raise exception 'user id is required';
    end if;

    if p_points is null or p_points = 0 then
        raise exception 'points must be non-zero';
    end if;

    if v_clean_description is null or length(v_clean_description) < 8 then
        raise exception 'adjustment description is required';
    end if;

    if v_clean_idempotency_key is null then
        raise exception 'idempotency key is required';
    end if;

    select *
      into v_existing
      from public.merch_credit_ledger
     where reason = 'manual_adjustment'
       and idempotency_key = v_clean_idempotency_key
     limit 1;

    if found then
        return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'ledger_id', v_existing.id,
            'points', v_existing.points
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

    if v_balance.points_balance + p_points < 0 then
        raise exception 'adjustment would make merch credit balance negative';
    end if;

    update public.merch_credit_balances
       set points_balance = points_balance + p_points,
           lifetime_points = case
               when p_points > 0 then lifetime_points + p_points
               else lifetime_points
           end,
           redeemed_points = case
               when p_points < 0 then redeemed_points + abs(p_points)
               else redeemed_points
           end,
           updated_at = now()
     where user_id = p_user_id;

    insert into public.merch_credit_ledger (
        user_id,
        points,
        reason,
        description,
        metadata,
        idempotency_key
    )
    values (
        p_user_id,
        p_points,
        'manual_adjustment',
        v_clean_description,
        jsonb_build_object(
            'actor_user_id', p_actor_user_id,
            'source', 'admin_adjust_merch_credits'
        ) || coalesce(p_metadata, '{}'::jsonb),
        v_clean_idempotency_key
    )
    returning * into v_existing;

    perform public.log_platform_event(
        'credits',
        'admin_merch_credit_adjusted',
        case when p_points < 0 then 'warning' else 'info' end,
        p_actor_user_id,
        null,
        null,
        null,
        null,
        v_existing.id::text,
        'Admin manually adjusted merch credits.',
        jsonb_build_object(
            'target_user_id', p_user_id,
            'points', p_points,
            'description', v_clean_description,
            'idempotency_key', v_clean_idempotency_key
        ) || coalesce(p_metadata, '{}'::jsonb)
    );

    return jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'ledger_id', v_existing.id,
        'points', p_points
    );
end;
$$;

revoke all on function public.admin_adjust_merch_credits(uuid, uuid, integer, text, text, jsonb) from public;
revoke all on function public.admin_adjust_merch_credits(uuid, uuid, integer, text, text, jsonb) from anon;
grant execute on function public.admin_adjust_merch_credits(uuid, uuid, integer, text, text, jsonb) to service_role;
