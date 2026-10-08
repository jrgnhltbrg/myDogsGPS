create table if not exists public.dog_search_areas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  dog_id uuid not null
    references public.dogs(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  route_geojson jsonb not null,
  area_geojson jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists dog_search_areas_owner_dog_created_idx
  on public.dog_search_areas (owner_id, dog_id, created_at desc);

alter table public.dog_search_areas enable row level security;

grant select, insert, update, delete on public.dog_search_areas to authenticated;

drop policy if exists "Members can select own dog search areas" on public.dog_search_areas;
drop policy if exists "Members can insert own dog search areas" on public.dog_search_areas;
drop policy if exists "Members can update own dog search areas" on public.dog_search_areas;
drop policy if exists "Members can delete own dog search areas" on public.dog_search_areas;

create policy "Members can select own dog search areas"
  on public.dog_search_areas for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_search_areas.dog_id
        and d.owner_id = (select auth.uid())
    )
  );

create policy "Members can insert own dog search areas"
  on public.dog_search_areas for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_search_areas.dog_id
        and d.owner_id = (select auth.uid())
    )
  );

create policy "Members can update own dog search areas"
  on public.dog_search_areas for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_search_areas.dog_id
        and d.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_search_areas.dog_id
        and d.owner_id = (select auth.uid())
    )
  );

create policy "Members can delete own dog search areas"
  on public.dog_search_areas for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
    and exists (
      select 1
      from public.dogs d
      where d.id = dog_search_areas.dog_id
        and d.owner_id = (select auth.uid())
    )
  );