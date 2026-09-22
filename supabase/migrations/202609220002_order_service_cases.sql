create sequence if not exists public.order_service_case_reference_seq;

create table if not exists public.order_service_cases (
    id uuid primary key default gen_random_uuid(),
    case_number text not null unique default (
        'MT-C' || lpad(nextval('public.order_service_case_reference_seq')::text, 6, '0')
    ),
    order_id uuid not null references public.orders(id) on delete cascade,
    case_type text not null,
    status text not null default 'open',
    priority text not null default 'normal',
    summary text not null,
    customer_request text,
    resolution text,
    order_item_ids uuid[] not null default '{}'::uuid[],
    refund_amount_cents integer,
    stripe_refund_id text,
    supplier_reference text,
    opened_by uuid references public.profiles(id) on delete set null,
    assigned_to uuid references public.profiles(id) on delete set null,
    resolved_by uuid references public.profiles(id) on delete set null,
    resolved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint order_service_cases_type_check
        check (case_type in ('return', 'reprint', 'refund', 'cancellation')),
    constraint order_service_cases_status_check
        check (status in ('open', 'awaiting_customer', 'awaiting_supplier', 'approved', 'in_progress', 'resolved', 'rejected', 'cancelled')),
    constraint order_service_cases_priority_check
        check (priority in ('low', 'normal', 'high', 'urgent')),
    constraint order_service_cases_summary_check
        check (length(btrim(summary)) between 5 and 500),
    constraint order_service_cases_refund_amount_check
        check (refund_amount_cents is null or refund_amount_cents >= 0)
);

create index if not exists idx_order_service_cases_order_created_at
    on public.order_service_cases (order_id, created_at desc);

create index if not exists idx_order_service_cases_open_queue
    on public.order_service_cases (status, priority, created_at)
    where status not in ('resolved', 'rejected', 'cancelled');

create table if not exists public.order_service_case_events (
    id uuid primary key default gen_random_uuid(),
    service_case_id uuid not null references public.order_service_cases(id) on delete cascade,
    order_id uuid not null references public.orders(id) on delete cascade,
    actor_user_id uuid references public.profiles(id) on delete set null,
    event_type text not null,
    from_status text,
    to_status text,
    note text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_order_service_case_events_case_created_at
    on public.order_service_case_events (service_case_id, created_at desc);

create table if not exists public.order_reprint_jobs (
    id uuid primary key default gen_random_uuid(),
    service_case_id uuid not null unique references public.order_service_cases(id) on delete cascade,
    order_id uuid not null references public.orders(id) on delete cascade,
    order_item_ids uuid[] not null default '{}'::uuid[],
    status text not null default 'pending',
    supplier text,
    supplier_reference text,
    notes text,
    requested_at timestamptz not null default now(),
    submitted_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint order_reprint_jobs_status_check
        check (status in ('pending', 'approved', 'in_progress', 'submitted', 'completed', 'failed', 'cancelled'))
);

create index if not exists idx_order_reprint_jobs_status_requested_at
    on public.order_reprint_jobs (status, requested_at);

alter table public.order_service_cases enable row level security;
alter table public.order_service_case_events enable row level security;
alter table public.order_reprint_jobs enable row level security;

create policy order_service_cases_select_admin
    on public.order_service_cases for select to authenticated
    using (public.is_admin());

create policy order_service_case_events_select_admin
    on public.order_service_case_events for select to authenticated
    using (public.is_admin());

create policy order_reprint_jobs_select_admin
    on public.order_reprint_jobs for select to authenticated
    using (public.is_admin());

create trigger trg_order_service_cases_updated_at
before update on public.order_service_cases
for each row execute function public.set_updated_at();

create trigger trg_order_reprint_jobs_updated_at
before update on public.order_reprint_jobs
for each row execute function public.set_updated_at();

create or replace function public.admin_create_order_service_case(
    p_order_id uuid,
    p_actor_user_id uuid,
    p_case_type text,
    p_summary text,
    p_priority text default 'normal',
    p_customer_request text default null,
    p_order_item_ids uuid[] default '{}'::uuid[],
    p_refund_amount_cents integer default null,
    p_stripe_refund_id text default null
)
returns public.order_service_cases
language plpgsql
security definer
set search_path = public
as $$
declare
    v_case public.order_service_cases%rowtype;
begin
    if p_actor_user_id is null or not exists (
        select 1 from public.profiles p
        where p.id = p_actor_user_id and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if not exists (select 1 from public.orders o where o.id = p_order_id) then
        raise exception 'order not found';
    end if;

    if p_case_type not in ('return', 'reprint', 'refund', 'cancellation') then
        raise exception 'invalid service case type';
    end if;

    if p_priority not in ('low', 'normal', 'high', 'urgent') then
        raise exception 'invalid service case priority';
    end if;

    if length(btrim(coalesce(p_summary, ''))) < 5 then
        raise exception 'a summary is required';
    end if;

    if exists (
        select 1 from unnest(coalesce(p_order_item_ids, '{}'::uuid[])) item_id
        where not exists (
            select 1 from public.order_items oi
            where oi.id = item_id and oi.order_id = p_order_id
        )
    ) then
        raise exception 'service case contains an item from another order';
    end if;

    insert into public.order_service_cases (
        order_id, case_type, priority, summary, customer_request,
        order_item_ids, refund_amount_cents, stripe_refund_id, opened_by
    ) values (
        p_order_id, p_case_type, p_priority, btrim(p_summary), nullif(btrim(coalesce(p_customer_request, '')), ''),
        coalesce(p_order_item_ids, '{}'::uuid[]), p_refund_amount_cents, p_stripe_refund_id, p_actor_user_id
    ) returning * into v_case;

    insert into public.order_service_case_events (
        service_case_id, order_id, actor_user_id, event_type, to_status, note, metadata
    ) values (
        v_case.id, p_order_id, p_actor_user_id, 'created', v_case.status, v_case.summary,
        jsonb_build_object('case_type', v_case.case_type, 'priority', v_case.priority)
    );

    if p_case_type = 'reprint' then
        insert into public.order_reprint_jobs (
            service_case_id, order_id, order_item_ids, notes
        ) values (
            v_case.id, p_order_id, v_case.order_item_ids, v_case.summary
        );
    end if;

    perform public.log_platform_event(
        'customer_service', 'service_case_created',
        case when p_priority in ('high', 'urgent') then 'warning' else 'info' end,
        p_actor_user_id, p_order_id, null, null, null, v_case.case_number,
        'Admin opened an order service case.',
        jsonb_build_object('case_id', v_case.id, 'case_type', v_case.case_type, 'priority', v_case.priority)
    );

    return v_case;
end;
$$;

create or replace function public.admin_update_order_service_case(
    p_case_id uuid,
    p_actor_user_id uuid,
    p_status text,
    p_note text,
    p_resolution text default null,
    p_assigned_to uuid default null,
    p_supplier_reference text default null
)
returns public.order_service_cases
language plpgsql
security definer
set search_path = public
as $$
declare
    v_case public.order_service_cases%rowtype;
    v_previous_status text;
begin
    if p_actor_user_id is null or not exists (
        select 1 from public.profiles p
        where p.id = p_actor_user_id and p.role = 'admin'
    ) then
        raise exception 'admin access required';
    end if;

    if p_status not in ('open', 'awaiting_customer', 'awaiting_supplier', 'approved', 'in_progress', 'resolved', 'rejected', 'cancelled') then
        raise exception 'invalid service case status';
    end if;

    if length(btrim(coalesce(p_note, ''))) < 3 then
        raise exception 'an update note is required';
    end if;

    select * into v_case
    from public.order_service_cases c
    where c.id = p_case_id
    for update;

    if not found then
        raise exception 'service case not found';
    end if;

    v_previous_status := v_case.status;

    update public.order_service_cases
    set status = p_status,
        assigned_to = coalesce(p_assigned_to, assigned_to),
        supplier_reference = coalesce(nullif(btrim(coalesce(p_supplier_reference, '')), ''), supplier_reference),
        resolution = case
            when p_status in ('resolved', 'rejected', 'cancelled')
                then coalesce(nullif(btrim(coalesce(p_resolution, '')), ''), btrim(p_note))
            else coalesce(nullif(btrim(coalesce(p_resolution, '')), ''), resolution)
        end,
        resolved_by = case when p_status in ('resolved', 'rejected', 'cancelled') then p_actor_user_id else null end,
        resolved_at = case when p_status in ('resolved', 'rejected', 'cancelled') then now() else null end,
        updated_at = now()
    where id = p_case_id
    returning * into v_case;

    insert into public.order_service_case_events (
        service_case_id, order_id, actor_user_id, event_type,
        from_status, to_status, note, metadata
    ) values (
        v_case.id, v_case.order_id, p_actor_user_id, 'status_updated',
        v_previous_status, p_status, btrim(p_note),
        jsonb_build_object('supplier_reference', v_case.supplier_reference)
    );

    if v_case.case_type = 'reprint' then
        update public.order_reprint_jobs
        set status = case p_status
                when 'approved' then 'approved'
                when 'in_progress' then 'in_progress'
                when 'awaiting_supplier' then 'submitted'
                when 'resolved' then 'completed'
                when 'rejected' then 'cancelled'
                when 'cancelled' then 'cancelled'
                else status
            end,
            supplier_reference = coalesce(v_case.supplier_reference, supplier_reference),
            submitted_at = case when p_status = 'awaiting_supplier' then coalesce(submitted_at, now()) else submitted_at end,
            completed_at = case when p_status = 'resolved' then now() else completed_at end,
            cancelled_at = case when p_status in ('rejected', 'cancelled') then now() else cancelled_at end,
            updated_at = now()
        where service_case_id = v_case.id;
    end if;

    perform public.log_platform_event(
        'customer_service', 'service_case_updated',
        case when p_status in ('rejected', 'cancelled') then 'warning' else 'info' end,
        p_actor_user_id, v_case.order_id, null, null, null, v_case.case_number,
        'Admin updated an order service case.',
        jsonb_build_object('case_id', v_case.id, 'from_status', v_previous_status, 'to_status', p_status)
    );

    return v_case;
end;
$$;

revoke all on function public.admin_create_order_service_case(uuid, uuid, text, text, text, text, uuid[], integer, text) from public, anon, authenticated;
grant execute on function public.admin_create_order_service_case(uuid, uuid, text, text, text, text, uuid[], integer, text) to service_role;

revoke all on function public.admin_update_order_service_case(uuid, uuid, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_service_case(uuid, uuid, text, text, text, uuid, text) to service_role;

create or replace view public.order_service_case_operational_exceptions
with (security_invoker = true)
as
select
    c.id,
    c.case_number,
    c.order_id,
    o.order_number,
    c.case_type,
    c.status,
    c.priority,
    c.summary,
    c.assigned_to,
    c.created_at,
    extract(epoch from (now() - c.created_at))::bigint as age_seconds,
    case
        when c.priority = 'urgent' and c.created_at < now() - interval '4 hours' then 'urgent_case_over_4_hours'
        when c.priority = 'high' and c.created_at < now() - interval '1 day' then 'high_case_over_1_day'
        when c.created_at < now() - interval '3 days' then 'open_case_over_3_days'
        else null
    end as exception_reason
from public.order_service_cases c
join public.orders o on o.id = c.order_id
where c.status not in ('resolved', 'rejected', 'cancelled')
  and (
      (c.priority = 'urgent' and c.created_at < now() - interval '4 hours')
      or (c.priority = 'high' and c.created_at < now() - interval '1 day')
      or c.created_at < now() - interval '3 days'
  );

revoke all on table public.order_service_case_operational_exceptions from public, anon;
grant select on table public.order_service_case_operational_exceptions to authenticated, service_role;
