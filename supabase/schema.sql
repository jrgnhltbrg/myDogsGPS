-- Tabellen som håller koll på varje medlem utöver inloggningsuppgifterna
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Varje användare får läsa sin egen rad
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admin-konton får läsa alla rader
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Bara admin-konton får ändra en rad (t.ex. godkänna/neka)
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Skapar automatiskt en profiles-rad (status: pending) när någon registrerar sig
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Kör separat, en gång, efter att du själv registrerat ditt första konto i appen:
-- update public.profiles set role = 'admin', status = 'approved' where email = 'din@email.se';
