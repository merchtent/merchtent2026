alter table public.products
    add column if not exists artist_archived_at timestamptz;

alter table public.products
    add constraint products_artist_archived_not_published
    check (artist_archived_at is null or is_published = false);

create index if not exists products_artist_active_created_idx
    on public.products (artist_id, created_at desc)
    where artist_archived_at is null;

create or replace view public.products_with_first_image
with (security_invoker = true)
as
select
    p.id,
    p.slug,
    p.title,
    p.description,
    p.price_cents,
    p.currency,
    p.is_published,
    p.production_status,
    p.moderation_status,
    p.artist_id,
    p.created_at,
    pi.path as primary_image_path,
    p.artist_archived_at
from public.products p
left join lateral (
    select product_images.path
    from public.product_images
    where product_images.product_id = p.id
    order by product_images.sort_order, product_images.id
    limit 1
) pi on true;

update storage.buckets
set file_size_limit = 52428800
where id = 'product-images';
