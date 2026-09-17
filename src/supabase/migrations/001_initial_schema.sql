-- Web Kivora Finance V2
-- Schema inicial para Supabase/PostgreSQL com Row Level Security.
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário' check (char_length(display_name) between 1 and 80),
  mode text not null default 'pessoal' check (mode in ('pessoal', 'empresa')),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  description text not null check (char_length(description) between 1 and 180),
  category text not null check (char_length(category) between 1 and 80),
  amount numeric(14,2) not null check (amount > 0),
  date date not null,
  payment_method text not null default 'PIX' check (char_length(payment_method) between 1 and 80),
  status text not null default 'confirmado' check (status in ('confirmado', 'pendente')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pagar', 'receber')),
  name text not null check (char_length(name) between 1 and 180),
  description text not null default '' check (char_length(description) <= 500),
  category text not null check (char_length(category) between 1 and 80),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  status text not null check (status in ('pendente', 'pago', 'atrasado', 'recebido', 'previsto')),
  payment_method text not null default 'PIX' check (char_length(payment_method) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_status_matches_kind check (
    (kind = 'pagar' and status in ('pendente', 'pago', 'atrasado')) or
    (kind = 'receber' and status in ('previsto', 'recebido', 'atrasado'))
  )
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  description text not null default '' check (char_length(description) <= 500),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount numeric(14,2) not null default 0 check (saved_amount >= 0),
  monthly_amount numeric(14,2) not null default 0 check (monthly_amount >= 0),
  target_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices usados pelas consultas e pelas políticas RLS.
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists accounts_user_due_date_idx on public.accounts(user_id, due_date);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_user_target_date_idx on public.goals(user_id, target_date);

-- Atualiza updated_at automaticamente.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();

DROP TRIGGER IF EXISTS transactions_set_updated_at ON public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function private.set_updated_at();

DROP TRIGGER IF EXISTS accounts_set_updated_at ON public.accounts;
create trigger accounts_set_updated_at before update on public.accounts
for each row execute function private.set_updated_at();

DROP TRIGGER IF EXISTS goals_set_updated_at ON public.goals;
create trigger goals_set_updated_at before update on public.goals
for each row execute function private.set_updated_at();

-- Cria automaticamente o perfil quando um usuário se cadastra no Supabase Auth.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, mode)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Usuário'), '@', 1)),
    'pessoal'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Ativa RLS em toda tabela exposta usada pela aplicação.
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.accounts enable row level security;
alter table public.goals enable row level security;

-- Princípio do menor privilégio: anônimo não acessa dados financeiros.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.accounts from anon, authenticated;
revoke all on table public.goals from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant update(display_name, mode, updated_at) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.goals to authenticated;

-- Remove políticas antigas caso este script seja reaplicado.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

-- Perfil: cada usuário enxerga e altera somente o próprio registro.
create policy "profiles_select_own" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id and role = 'user');

create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id and role = 'user')
with check ((select auth.uid()) = id and role = 'user');

-- Transações.
create policy "transactions_select_own" on public.transactions
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "transactions_insert_own" on public.transactions
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "transactions_update_own" on public.transactions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "transactions_delete_own" on public.transactions
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Contas.
create policy "accounts_select_own" on public.accounts
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "accounts_insert_own" on public.accounts
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "accounts_update_own" on public.accounts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "accounts_delete_own" on public.accounts
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Metas.
create policy "goals_select_own" on public.goals
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "goals_insert_own" on public.goals
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "goals_update_own" on public.goals
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goals_delete_own" on public.goals
for delete to authenticated
using ((select auth.uid()) = user_id);
