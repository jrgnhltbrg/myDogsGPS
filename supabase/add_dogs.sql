create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  breed text check (breed is null or char_length(btrim(breed)) <= 100),
  birth_date date,
  created_at timestamptz not null default now()
);

alter table public.dogs enable row level security;

create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'approved'
  );
$$;

revoke all on function public.is_approved_member() from public;
grant execute on function public.is_approved_member() to authenticated;

grant select, insert, update, delete on public.dogs to authenticated;

drop policy if exists "Approved members can select own dogs" on public.dogs;
drop policy if exists "Approved members can insert own dogs" on public.dogs;
drop policy if exists "Approved members can update own dogs" on public.dogs;
drop policy if exists "Approved members can delete own dogs" on public.dogs;

create policy "Approved members can select own dogs"
  on public.dogs for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
  );

create policy "Approved members can insert own dogs"
  on public.dogs for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
  );

create policy "Approved members can update own dogs"
  on public.dogs for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
  )
  with check (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
  );

create policy "Approved members can delete own dogs"
  on public.dogs for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select public.is_approved_member())
  );