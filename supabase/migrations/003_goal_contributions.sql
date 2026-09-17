-- Web Kivora Finance V2.8
-- Histórico de aportes em metas e atualização atômica do valor acumulado.
-- Execute este arquivo no SQL Editor do Supabase após as migrações anteriores.

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  contribution_date date not null default current_date,
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_user_id_idx
  on public.goal_contributions(user_id);

create index if not exists goal_contributions_goal_date_idx
  on public.goal_contributions(goal_id, contribution_date desc);

alter table public.goal_contributions enable row level security;

revoke all on table public.goal_contributions from anon, authenticated;
grant select, insert, delete on table public.goal_contributions to authenticated;

drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
drop policy if exists "goal_contributions_insert_own" on public.goal_contributions;
drop policy if exists "goal_contributions_delete_own" on public.goal_contributions;

create policy "goal_contributions_select_own" on public.goal_contributions
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "goal_contributions_insert_own" on public.goal_contributions
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
      from public.goals g
     where g.id = goal_id
       and g.user_id = (select auth.uid())
  )
);

create policy "goal_contributions_delete_own" on public.goal_contributions
for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.add_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_date date,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_goal public.goals;
  v_contribution public.goal_contributions;
  v_remaining numeric(14,2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um aporte maior que zero.';
  end if;

  if p_date is null then
    raise exception 'Informe a data do aporte.';
  end if;

  if p_date > current_date then
    raise exception 'A data do aporte não pode estar no futuro.';
  end if;

  if p_notes is not null and char_length(p_notes) > 300 then
    raise exception 'A observação pode ter no máximo 300 caracteres.';
  end if;

  select *
    into v_goal
    from public.goals
   where id = p_goal_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Meta não encontrada ou sem permissão.';
  end if;

  v_remaining := greatest(0, v_goal.target_amount - v_goal.saved_amount);

  if v_remaining <= 0 then
    raise exception 'Esta meta já foi concluída.';
  end if;

  if p_amount > v_remaining then
    raise exception 'O aporte não pode ultrapassar o valor restante da meta.';
  end if;

  insert into public.goal_contributions (
    user_id,
    goal_id,
    amount,
    contribution_date,
    notes
  ) values (
    auth.uid(),
    v_goal.id,
    p_amount,
    p_date,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_contribution;

  update public.goals
     set saved_amount = saved_amount + p_amount,
         updated_at = now()
   where id = v_goal.id
     and user_id = auth.uid()
  returning * into v_goal;

  return jsonb_build_object(
    'goal', to_jsonb(v_goal),
    'contribution', to_jsonb(v_contribution)
  );
end;
$$;

create or replace function public.remove_goal_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contribution public.goal_contributions;
  v_goal public.goals;
begin
  select *
    into v_contribution
    from public.goal_contributions
   where id = p_contribution_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Aporte não encontrado ou sem permissão.';
  end if;

  select *
    into v_goal
    from public.goals
   where id = v_contribution.goal_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Meta não encontrada ou sem permissão.';
  end if;

  delete from public.goal_contributions
   where id = v_contribution.id
     and user_id = auth.uid();

  update public.goals
     set saved_amount = greatest(0, saved_amount - v_contribution.amount),
         updated_at = now()
   where id = v_goal.id
     and user_id = auth.uid()
  returning * into v_goal;

  return jsonb_build_object('goal', to_jsonb(v_goal));
end;
$$;

revoke all on function public.add_goal_contribution(uuid, numeric, date, text) from public;
revoke all on function public.remove_goal_contribution(uuid) from public;
grant execute on function public.add_goal_contribution(uuid, numeric, date, text) to authenticated;
grant execute on function public.remove_goal_contribution(uuid) to authenticated;
