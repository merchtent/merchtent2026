create table if not exists public.tax_settings (
    id boolean primary key default true check (id),
    gst_registered boolean not null default false,
    gst_effective_from date,
    gst_rate_bps integer not null default 1000 check (gst_rate_bps between 0 and 10000),
    pricing_mode text not null default 'preserve_margins' check (pricing_mode in ('absorb', 'preserve_margins')),
    legal_name text not null default 'Merch Tent',
    abn text,
    turnover_alert_thresholds_cents bigint[] not null default array[5500000, 6500000, 7000000]::bigint[],
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tax_settings_registration_check check (
        not gst_registered
        or (gst_effective_from is not null and nullif(btrim(abn), '') is not null)
    ),
    constraint tax_settings_abn_format_check check (
        abn is null or regexp_replace(abn, '[^0-9]', '', 'g') ~ '^[0-9]{11}$'
    )
);

insert into public.tax_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists trg_tax_settings_updated_at on public.tax_settings;
create trigger trg_tax_settings_updated_at
before update on public.tax_settings
for each row execute function public.set_updated_at();

alter table public.tax_settings enable row level security;

drop policy if exists tax_settings_public_select on public.tax_settings;
create policy tax_settings_public_select
    on public.tax_settings
    for select
    to anon, authenticated
    using (true);

drop policy if exists tax_settings_admin_update on public.tax_settings;
create policy tax_settings_admin_update
    on public.tax_settings
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

revoke all on public.tax_settings from public;
grant select on public.tax_settings to anon, authenticated;
grant update on public.tax_settings to authenticated;

alter table public.orders
    add column if not exists tax_registered boolean,
    add column if not exists tax_rate_bps integer,
    add column if not exists gross_cents integer,
    add column if not exists net_cents integer,
    add column if not exists gst_cents integer,
    add column if not exists seller_legal_name text,
    add column if not exists seller_abn text;

alter table public.orders
    drop constraint if exists orders_tax_snapshot_check;
alter table public.orders
    add constraint orders_tax_snapshot_check check (
        tax_registered is null
        or (
            tax_rate_bps between 0 and 10000
            and gross_cents >= 0
            and net_cents >= 0
            and gst_cents >= 0
            and gross_cents = net_cents + gst_cents
        )
    ) not valid;

alter table public.order_items
    add column if not exists gross_unit_cents integer,
    add column if not exists net_unit_cents integer,
    add column if not exists gst_unit_cents integer,
    add column if not exists line_gross_cents integer,
    add column if not exists line_net_cents integer,
    add column if not exists line_gst_cents integer,
    add column if not exists supplier_cost_ex_gst_cents integer,
    add column if not exists supplier_cost_gst_cents integer,
    add column if not exists supplier_cost_inc_gst_cents integer,
    add column if not exists supplier_tax_invoice_reference text,
    add column if not exists supplier_tax_recorded_at timestamptz;

alter table public.order_items
    drop constraint if exists order_items_tax_snapshot_check;
alter table public.order_items
    add constraint order_items_tax_snapshot_check check (
        line_gross_cents is null
        or (
            gross_unit_cents >= 0
            and net_unit_cents >= 0
            and gst_unit_cents >= 0
            and line_gross_cents >= 0
            and line_net_cents >= 0
            and line_gst_cents >= 0
            and line_gross_cents = line_net_cents + line_gst_cents
        )
    ) not valid;

alter table public.order_items
    drop constraint if exists order_items_supplier_tax_check;
alter table public.order_items
    add constraint order_items_supplier_tax_check check (
        supplier_cost_inc_gst_cents is null
        or (
            supplier_cost_ex_gst_cents >= 0
            and supplier_cost_gst_cents >= 0
            and supplier_cost_inc_gst_cents = supplier_cost_ex_gst_cents + supplier_cost_gst_cents
            and nullif(btrim(supplier_tax_invoice_reference), '') is not null
            and supplier_tax_recorded_at is not null
        )
    ) not valid;

create or replace function public.gst_component_from_inclusive(
    p_gross_cents integer,
    p_rate_bps integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
    select case
        when coalesce(p_gross_cents, 0) <= 0 or coalesce(p_rate_bps, 0) <= 0 then 0
        else round((p_gross_cents::numeric * p_rate_bps::numeric) / (10000 + p_rate_bps))::integer
    end;
$$;

revoke all on function public.gst_component_from_inclusive(integer, integer) from public;

create or replace function public.apply_order_tax_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_settings public.tax_settings%rowtype;
    v_gross integer;
begin
    if tg_op = 'INSERT' then
        select * into v_settings from public.tax_settings where id = true;

        new.tax_registered := coalesce(v_settings.gst_registered, false)
            and v_settings.gst_effective_from is not null
            and (coalesce(new.created_at, now()) at time zone 'Australia/Sydney')::date >= v_settings.gst_effective_from;
        new.tax_rate_bps := case when new.tax_registered then v_settings.gst_rate_bps else 0 end;
        new.seller_legal_name := coalesce(nullif(btrim(v_settings.legal_name), ''), 'Merch Tent');
        new.seller_abn := case when new.tax_registered then nullif(btrim(v_settings.abn), '') else null end;
    end if;

    if tg_op = 'INSERT' or new.total_cents is distinct from old.total_cents then
        v_gross := greatest(coalesce(new.total_cents, new.subtotal_cents, 0), 0);
        new.gross_cents := v_gross;
        new.gst_cents := case
            when coalesce(new.tax_registered, false)
                then public.gst_component_from_inclusive(v_gross, coalesce(new.tax_rate_bps, 0))
            else 0
        end;
        new.net_cents := v_gross - new.gst_cents;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_orders_tax_snapshot on public.orders;
create trigger trg_orders_tax_snapshot
before insert or update of total_cents on public.orders
for each row execute function public.apply_order_tax_snapshot();

create or replace function public.apply_order_item_tax_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tax_registered boolean := false;
    v_rate_bps integer := 0;
    v_line_gross integer;
begin
    select coalesce(o.tax_registered, false), coalesce(o.tax_rate_bps, 0)
      into v_tax_registered, v_rate_bps
      from public.orders o
     where o.id = new.order_id;

    new.gross_unit_cents := greatest(coalesce(new.unit_price_cents, 0), 0);
    new.gst_unit_cents := case
        when v_tax_registered then public.gst_component_from_inclusive(new.gross_unit_cents, v_rate_bps)
        else 0
    end;
    new.net_unit_cents := new.gross_unit_cents - new.gst_unit_cents;

    v_line_gross := case
        when coalesce(new.metadata->>'amount_total', '') ~ '^[0-9]+$'
            then (new.metadata->>'amount_total')::integer
        else new.gross_unit_cents * greatest(coalesce(new.qty, 1), 1)
    end;
    new.line_gross_cents := v_line_gross;
    new.line_gst_cents := case
        when v_tax_registered then public.gst_component_from_inclusive(v_line_gross, v_rate_bps)
        else 0
    end;
    new.line_net_cents := v_line_gross - new.line_gst_cents;

    return new;
end;
$$;

drop trigger if exists trg_order_items_tax_snapshot on public.order_items;
create trigger trg_order_items_tax_snapshot
before insert or update of unit_price_cents, qty, metadata on public.order_items
for each row execute function public.apply_order_item_tax_snapshot();

update public.orders
set
    tax_registered = false,
    tax_rate_bps = 0,
    gross_cents = greatest(coalesce(total_cents, subtotal_cents, 0), 0),
    net_cents = greatest(coalesce(total_cents, subtotal_cents, 0), 0),
    gst_cents = 0,
    seller_legal_name = 'Merch Tent',
    seller_abn = null
where tax_registered is null;

update public.order_items
set
    gross_unit_cents = greatest(coalesce(unit_price_cents, 0), 0),
    net_unit_cents = greatest(coalesce(unit_price_cents, 0), 0),
    gst_unit_cents = 0,
    line_gross_cents = greatest(coalesce(unit_price_cents, 0), 0) * greatest(coalesce(qty, 1), 1),
    line_net_cents = greatest(coalesce(unit_price_cents, 0), 0) * greatest(coalesce(qty, 1), 1),
    line_gst_cents = 0
where line_gross_cents is null;

alter table public.orders
    alter column tax_registered set not null,
    alter column tax_rate_bps set not null,
    alter column gross_cents set not null,
    alter column net_cents set not null,
    alter column gst_cents set not null,
    alter column seller_legal_name set not null;

alter table public.order_items
    alter column gross_unit_cents set not null,
    alter column net_unit_cents set not null,
    alter column gst_unit_cents set not null,
    alter column line_gross_cents set not null,
    alter column line_net_cents set not null,
    alter column line_gst_cents set not null;

create or replace view public.gst_turnover_status
with (security_invoker = true)
as
with turnover as (
    select
        coalesce(sum(o.gross_cents), 0)::bigint as current_turnover_cents,
        coalesce(sum(o.gross_cents) filter (where o.created_at >= now() - interval '90 days'), 0)::bigint as last_90_days_cents
    from public.orders o
    where o.created_at >= now() - interval '12 months'
      and coalesce(o.status, '') not in ('cancelled', 'refunded', 'failed')
), settings as (
    select * from public.tax_settings where id = true
)
select
    turnover.current_turnover_cents,
    round(turnover.last_90_days_cents::numeric * 365 / 90)::bigint as projected_turnover_cents,
    settings.gst_registered,
    settings.gst_effective_from,
    settings.turnover_alert_thresholds_cents,
    case
        when greatest(turnover.current_turnover_cents, round(turnover.last_90_days_cents::numeric * 365 / 90)::bigint) >= 7000000 then 'urgent'
        when greatest(turnover.current_turnover_cents, round(turnover.last_90_days_cents::numeric * 365 / 90)::bigint) >= 6500000 then 'high'
        when greatest(turnover.current_turnover_cents, round(turnover.last_90_days_cents::numeric * 365 / 90)::bigint) >= 5500000 then 'watch'
        else 'normal'
    end as alert_level
from turnover cross join settings;

revoke all on public.gst_turnover_status from public, anon;
grant select on public.gst_turnover_status to authenticated;
