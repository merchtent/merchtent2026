alter table if exists public.products
    add column if not exists fulfillment_flow text not null default 'supplier_on_demand';

alter table if exists public.products
    drop constraint if exists products_fulfillment_flow_check;

alter table if exists public.products
    add constraint products_fulfillment_flow_check
    check (fulfillment_flow in ('legacy_manual', 'manual_fulfillment', 'supplier_on_demand'));

update public.products
   set fulfillment_flow = 'legacy_manual',
       readiness_notes = case
           when readiness_notes is null or readiness_notes = '' then
               'Legacy product: manually fulfilled and excluded from supplier automation.'
           when readiness_notes not ilike '%legacy product:%' then
               readiness_notes || ' Legacy product: manually fulfilled and excluded from supplier automation.'
           else readiness_notes
       end
 where fulfillment_flow <> 'legacy_manual';

create index if not exists idx_products_fulfillment_flow
    on public.products (fulfillment_flow, is_published, created_at desc);
