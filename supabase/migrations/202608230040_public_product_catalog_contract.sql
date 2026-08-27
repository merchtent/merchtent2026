drop view if exists public.products_with_first_image;

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
    pi.path as primary_image_path
from public.products p
left join lateral (
    select product_images.path
    from public.product_images
    where product_images.product_id = p.id
    order by product_images.sort_order, product_images.id
    limit 1
) pi on true;
