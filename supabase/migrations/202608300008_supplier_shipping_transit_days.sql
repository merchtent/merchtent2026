alter table public.supplier_catalog_provider_shipping
    add column if not exists delivery_min_days integer,
    add column if not exists delivery_max_days integer;

update public.supplier_catalog_provider_shipping
set
    delivery_min_days = coalesce(
        delivery_min_days,
        nullif((regexp_match(coalesce(delivery_time_label, ''), '([0-9]+)'))[1], '')::integer
    ),
    delivery_max_days = coalesce(
        delivery_max_days,
        nullif((regexp_match(coalesce(delivery_time_label, ''), '([0-9]+)[^0-9]+([0-9]+)'))[2], '')::integer,
        nullif((regexp_match(coalesce(delivery_time_label, ''), '([0-9]+)'))[1], '')::integer
    )
where delivery_time_label is not null;

alter table public.supplier_catalog_provider_shipping
    drop constraint if exists supplier_catalog_provider_shipping_delivery_days_check;

alter table public.supplier_catalog_provider_shipping
    add constraint supplier_catalog_provider_shipping_delivery_days_check
    check (
        (delivery_min_days is null or delivery_min_days between 1 and 20)
        and (delivery_max_days is null or delivery_max_days between 1 and 20)
        and (
            delivery_min_days is null
            or delivery_max_days is null
            or delivery_min_days <= delivery_max_days
        )
    );
