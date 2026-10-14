-- Etapa 4 — Base: extensões, esquema privado, funções auxiliares, tipos e perfis.

create extension if not exists btree_gist with schema extensions;

-- Funções auxiliares ficam fora do esquema "public" para não serem expostas
-- pela API REST (PostgREST expõe apenas "public").
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- Administrador: papel definido em app_metadata (o usuário não consegue
-- alterar) e sessão com MFA concluído (aal2).
create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- "Hoje" no fuso do negócio, para regras de datas de estadia.
create function private.today_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Período de estadia válido: [check-in, check-out) com limites finitos.
create function private.is_valid_stay(p_stay daterange)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_stay is not null
     and not isempty(p_stay)
     and not lower_inf(p_stay)
     and not upper_inf(p_stay);
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.today_sp() to anon, authenticated, service_role;
grant execute on function private.is_valid_stay(daterange) to anon, authenticated, service_role;

-- Tipos
create type public.property_type as enum ('casa', 'apartamento', 'cobertura', 'terreno', 'outro');
create type public.property_status as enum ('draft', 'published', 'archived');
create type public.media_kind as enum ('image', 'video', 'tour');
create type public.rental_mode as enum ('seasonal', 'monthly');
create type public.fee_calc as enum ('fixed', 'per_night', 'per_guest_per_night', 'percent');
create type public.fee_applies_to as enum ('seasonal', 'monthly', 'both');
create type public.booking_status as enum ('pending', 'approved', 'declined', 'cancelled', 'expired');
create type public.block_kind as enum ('booking', 'owner', 'maintenance');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.inquiry_kind as enum ('contact', 'visit', 'sale_interest');
create type public.inquiry_status as enum ('new', 'in_progress', 'closed');

-- Perfis (um por usuário do Auth)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone ~ '^[0-9]{10,13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
