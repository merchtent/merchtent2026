create table if not exists public.product_designs (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    artist_id uuid not null references public.artists(id) on delete cascade,
    provider text not null default 'printify',
    template_key text not null,
    design_data jsonb not null,
    rendered_front_path text,
    rendered_back_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, provider)
);

create index if not exists idx_product_designs_artist_created_at
    on public.product_designs (artist_id, created_at desc);

create index if not exists idx_product_designs_product
    on public.product_designs (product_id);

alter table public.product_designs enable row level security;

drop policy if exists "Artists can select their product designs" on public.product_designs;
create policy "Artists can select their product designs"
    on public.product_designs
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.artists a
            where a.id = product_designs.artist_id
              and a.user_id = auth.uid()
        )
    );

drop policy if exists "Artists can insert their product designs" on public.product_designs;
create policy "Artists can insert their product designs"
    on public.product_designs
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.artists a
            where a.id = product_designs.artist_id
              and a.user_id = auth.uid()
        )
    );

drop policy if exists "Artists can update their product designs" on public.product_designs;
create policy "Artists can update their product designs"
    on public.product_designs
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.artists a
            where a.id = product_designs.artist_id
              and a.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.artists a
            where a.id = product_designs.artist_id
              and a.user_id = auth.uid()
        )
    );
