-- Consolidate public RLS, storage, view, and function exposure.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.owns_artist(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.artists a
        where a.id = p_artist_id
          and a.user_id = (select auth.uid())
    );
$$;

revoke all on function public.owns_artist(uuid) from public;
grant execute on function public.owns_artist(uuid) to authenticated;

alter table if exists public.artists enable row level security;
alter table if exists public.backstage_polaroids enable row level security;
alter table if exists public.cash_out_items enable row level security;
alter table if exists public.cash_outs enable row level security;
alter table if exists public.contact_messages enable row level security;
alter table if exists public.fan_shouts enable row level security;
alter table if exists public.journal enable row level security;
alter table if exists public.newsletter_subscribers enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.page_views enable row level security;
alter table if exists public.product_colors enable row level security;
alter table if exists public.product_designs enable row level security;
alter table if exists public.product_images enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.tour_dates enable row level security;
alter table if exists public.vouchers enable row level security;

do $$
declare
    r record;
begin
    for r in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'artists',
              'backstage_polaroids',
              'cash_out_items',
              'cash_outs',
              'contact_messages',
              'fan_shouts',
              'journal',
              'newsletter_subscribers',
              'order_items',
              'orders',
              'page_views',
              'product_colors',
              'product_designs',
              'product_images',
              'products',
              'profiles',
              'tour_dates',
              'vouchers'
          )
    loop
        execute format(
            'drop policy if exists %I on %I.%I',
            r.policyname,
            r.schemaname,
            r.tablename
        );
    end loop;
end $$;

create policy artists_select_anon_public
    on public.artists
    for select
    to anon
    using (is_public = true);

create policy artists_select_authenticated
    on public.artists
    for select
    to authenticated
    using (is_public = true or user_id = (select auth.uid()) or public.is_admin());

create policy artists_insert_self
    on public.artists
    for insert
    to authenticated
    with check (user_id = (select auth.uid()) or public.is_admin());

create policy artists_update_self_or_admin
    on public.artists
    for update
    to authenticated
    using (user_id = (select auth.uid()) or public.is_admin())
    with check (user_id = (select auth.uid()) or public.is_admin());

create policy artists_delete_admin
    on public.artists
    for delete
    to authenticated
    using (public.is_admin());

create policy backstage_polaroids_select_public
    on public.backstage_polaroids
    for select
    to anon, authenticated
    using (true);

create policy backstage_polaroids_insert_admin
    on public.backstage_polaroids
    for insert
    to authenticated
    with check (public.is_admin());

create policy backstage_polaroids_update_admin
    on public.backstage_polaroids
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy backstage_polaroids_delete_admin
    on public.backstage_polaroids
    for delete
    to authenticated
    using (public.is_admin());

create policy cash_outs_select_artist_or_admin
    on public.cash_outs
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

create policy cash_out_items_select_artist_or_admin
    on public.cash_out_items
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

create policy contact_messages_insert_public
    on public.contact_messages
    for insert
    to anon, authenticated
    with check (
        length(btrim(name)) between 1 and 200
        and length(btrim(email)) between 3 and 320
        and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
        and length(btrim(message)) between 1 and 5000
        and (subject is null or length(subject) <= 300)
    );

create policy contact_messages_select_admin
    on public.contact_messages
    for select
    to authenticated
    using (public.is_admin());

create policy fan_shouts_select_published
    on public.fan_shouts
    for select
    to anon, authenticated
    using (is_published = true);

create policy journal_select_anon_published
    on public.journal
    for select
    to anon
    using (status = 'published');

create policy journal_select_authenticated
    on public.journal
    for select
    to authenticated
    using (status = 'published' or public.is_admin());

create policy journal_insert_admin
    on public.journal
    for insert
    to authenticated
    with check (public.is_admin());

create policy journal_update_admin
    on public.journal
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy journal_delete_admin
    on public.journal
    for delete
    to authenticated
    using (public.is_admin());

create policy newsletter_select_admin
    on public.newsletter_subscribers
    for select
    to authenticated
    using (public.is_admin());

create policy order_items_select_authenticated
    on public.order_items
    for select
    to authenticated
    using (
        public.is_admin()
        or public.owns_artist(artist_id)
        or exists (
            select 1
            from public.orders o
            where o.id = order_items.order_id
              and o.user_id = (select auth.uid())
        )
    );

create policy orders_select_authenticated
    on public.orders
    for select
    to authenticated
    using (user_id = (select auth.uid()) or public.is_admin());

create policy product_colors_select_anon_published
    on public.product_colors
    for select
    to anon
    using (
        exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and p.is_published = true
        )
    );

create policy product_colors_select_authenticated
    on public.product_colors
    for select
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and (p.is_published = true or public.owns_artist(p.artist_id))
        )
    );

create policy product_colors_insert_owner_or_admin
    on public.product_colors
    for insert
    to authenticated
    with check (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy product_colors_update_owner_or_admin
    on public.product_colors
    for update
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and public.owns_artist(p.artist_id)
        )
    )
    with check (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy product_colors_delete_owner_or_admin
    on public.product_colors
    for delete
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_colors.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy product_designs_select_owner_or_admin
    on public.product_designs
    for select
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin());

create policy product_designs_insert_owner_or_admin
    on public.product_designs
    for insert
    to authenticated
    with check (
        (public.owns_artist(artist_id) or public.is_admin())
        and exists (
            select 1
            from public.products p
            where p.id = product_designs.product_id
              and p.artist_id = product_designs.artist_id
        )
    );

create policy product_designs_update_owner_or_admin
    on public.product_designs
    for update
    to authenticated
    using (public.owns_artist(artist_id) or public.is_admin())
    with check (
        (public.owns_artist(artist_id) or public.is_admin())
        and exists (
            select 1
            from public.products p
            where p.id = product_designs.product_id
              and p.artist_id = product_designs.artist_id
        )
    );

create policy product_images_select_anon_published
    on public.product_images
    for select
    to anon
    using (
        exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and p.is_published = true
        )
    );

create policy product_images_select_authenticated
    on public.product_images
    for select
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and (p.is_published = true or public.owns_artist(p.artist_id))
        )
    );

create policy product_images_insert_owner_or_admin
    on public.product_images
    for insert
    to authenticated
    with check (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy product_images_update_owner_or_admin
    on public.product_images
    for update
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and public.owns_artist(p.artist_id)
        )
    )
    with check (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy product_images_delete_owner_or_admin
    on public.product_images
    for delete
    to authenticated
    using (
        public.is_admin()
        or exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and public.owns_artist(p.artist_id)
        )
    );

create policy products_select_anon_published
    on public.products
    for select
    to anon
    using (is_published = true);

create policy products_select_authenticated
    on public.products
    for select
    to authenticated
    using (is_published = true or public.owns_artist(artist_id) or public.is_admin());

create policy products_insert_owner_or_admin
    on public.products
    for insert
    to authenticated
    with check (artist_id is not null and (public.owns_artist(artist_id) or public.is_admin()));

create policy products_update_owner_or_admin
    on public.products
    for update
    to authenticated
    using (artist_id is not null and (public.owns_artist(artist_id) or public.is_admin()))
    with check (artist_id is not null and (public.owns_artist(artist_id) or public.is_admin()));

create policy products_delete_admin
    on public.products
    for delete
    to authenticated
    using (public.is_admin());

create policy profiles_select_own
    on public.profiles
    for select
    to authenticated
    using (id = (select auth.uid()));

create policy tour_dates_select_public
    on public.tour_dates
    for select
    to anon, authenticated
    using (true);

create policy tour_dates_insert_admin
    on public.tour_dates
    for insert
    to authenticated
    with check (public.is_admin());

create policy tour_dates_update_admin
    on public.tour_dates
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy tour_dates_delete_admin
    on public.tour_dates
    for delete
    to authenticated
    using (public.is_admin());

create or replace view public.artists_public
with (security_invoker = true)
as
select
    id,
    display_name,
    slug,
    featured,
    hero_image_path,
    bio,
    facebook_url,
    instagram_url,
    bandcamp_url,
    spotify_url,
    website_url
from public.artists
where is_public = true
  and coalesce(display_name, '') <> '';

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

create or replace function public.validate_product_design_artist()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if not exists (
        select 1
        from public.products p
        where p.id = new.product_id
          and p.artist_id = new.artist_id
    ) then
        raise exception 'product_designs artist_id must match products.artist_id';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_product_designs_validate_artist on public.product_designs;
create trigger trg_product_designs_validate_artist
before insert or update on public.product_designs
for each row
execute function public.validate_product_design_artist();

alter function public.artists_slug_maintain() set search_path = public;
alter function public.get_random_recent_products(integer) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.slugify_artist_name(text, uuid) set search_path = public;
alter function public.update_cash_outs_timestamp() set search_path = public;

revoke all on function public.create_artist_cash_out(uuid) from public;
revoke all on function public.create_artist_cash_out(uuid) from anon;
grant execute on function public.create_artist_cash_out(uuid) to authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from public;
revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from anon;
revoke all on function public.subscribe_newsletter(text, text, text, text, boolean) from authenticated;
grant execute on function public.subscribe_newsletter(text, text, text, text, boolean) to service_role;

do $$
declare
    r record;
begin
    for r in
        select policyname
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
              'Admins can delete polaroids',
              'Admins can update polaroids',
              'Admins can upload polaroids',
              'Admins delete backstage polaroids',
              'Admins update backstage polaroids',
              'Admins upload backstage polaroids',
              'Authenticated can view polaroids',
              'auth can delete own product-images',
              'auth can insert product-images',
              'auth can update own product-images',
              'public read product-images'
          )
    loop
        execute format('drop policy if exists %I on storage.objects', r.policyname);
    end loop;
end $$;

create policy storage_backstage_polaroids_admin_insert
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'backstage-polaroids' and public.is_admin());

create policy storage_backstage_polaroids_admin_update
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'backstage-polaroids' and public.is_admin())
    with check (bucket_id = 'backstage-polaroids' and public.is_admin());

create policy storage_backstage_polaroids_admin_delete
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'backstage-polaroids' and public.is_admin());

create policy storage_product_images_artist_insert
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'product-images'
        and exists (
            select 1
            from public.products p
            where p.id::text = (storage.foldername(name))[1]
              and public.owns_artist(p.artist_id)
        )
    );

create policy storage_product_images_artist_update
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'product-images'
        and (
            public.is_admin()
            or exists (
                select 1
                from public.products p
                where p.id::text = (storage.foldername(name))[1]
                  and public.owns_artist(p.artist_id)
            )
        )
    )
    with check (
        bucket_id = 'product-images'
        and (
            public.is_admin()
            or exists (
                select 1
                from public.products p
                where p.id::text = (storage.foldername(name))[1]
                  and public.owns_artist(p.artist_id)
            )
        )
    );

create policy storage_product_images_artist_delete
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'product-images'
        and (
            public.is_admin()
            or exists (
                select 1
                from public.products p
                where p.id::text = (storage.foldername(name))[1]
                  and public.owns_artist(p.artist_id)
            )
        )
    );

update storage.buckets
set
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('artist-images', 'backstage-polaroids', 'product-images');
