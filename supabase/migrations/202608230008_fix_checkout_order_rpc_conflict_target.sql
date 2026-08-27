do $$
declare
    v_function_sql text;
begin
    select pg_get_functiondef('public.process_stripe_checkout_order(jsonb,jsonb)'::regprocedure)
      into v_function_sql;

    v_function_sql := replace(
        v_function_sql,
        'on conflict (order_id) do update',
        'on conflict on constraint fulfillment_jobs_order_id_key do update'
    );

    execute v_function_sql;
end;
$$;

revoke all on function public.process_stripe_checkout_order(jsonb, jsonb) from public;
revoke all on function public.process_stripe_checkout_order(jsonb, jsonb) from anon;
grant execute on function public.process_stripe_checkout_order(jsonb, jsonb) to service_role;
