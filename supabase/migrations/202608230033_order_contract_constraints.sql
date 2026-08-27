alter table if exists public.orders
    drop constraint if exists orders_status_contract_check;

alter table if exists public.orders
    add constraint orders_status_contract_check
    check (
        status in (
            'pending',
            'processing',
            'paid',
            'in_production',
            'shipped',
            'delivered',
            'fulfilled',
            'cancelled',
            'refunded'
        )
    ) not valid;

alter table if exists public.orders
    drop constraint if exists orders_operational_status_contract_check;

alter table if exists public.orders
    add constraint orders_operational_status_contract_check
    check (
        operational_status in (
            'recorded',
            'ready_for_fulfillment'
        )
    ) not valid;

alter table if exists public.orders
    drop constraint if exists orders_shipping_method_contract_check;

alter table if exists public.orders
    add constraint orders_shipping_method_contract_check
    check (
        shipping_method is null
        or shipping_method in ('standard', 'express')
    ) not valid;

alter table if exists public.orders
    drop constraint if exists orders_currency_contract_check;

alter table if exists public.orders
    add constraint orders_currency_contract_check
    check (currency ~ '^[A-Z]{3}$') not valid;

alter table if exists public.orders
    drop constraint if exists orders_amounts_non_negative_check;

alter table if exists public.orders
    add constraint orders_amounts_non_negative_check
    check (
        subtotal_cents >= 0
        and total_cents >= 0
    ) not valid;
