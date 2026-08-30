update public.supplier_catalog_provider_shipping
set shipping_method = case
    when lower(trim(shipping_method)) in ('standard', 'express') then lower(trim(shipping_method))
    else 'standard'
end;

alter table public.supplier_catalog_provider_shipping
    drop constraint if exists supplier_catalog_provider_shipping_method_check;

alter table public.supplier_catalog_provider_shipping
    add constraint supplier_catalog_provider_shipping_method_check
    check (shipping_method in ('standard', 'express'));
