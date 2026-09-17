-- Web Kivora Finance V2.6
-- Integra Contas e Transações com vínculo seguro e baixa atômica.
-- Execute este arquivo no SQL Editor do Supabase após 001_initial_schema.sql.

alter table public.transactions
  add column if not exists source_account_id uuid references public.accounts(id) on delete set null;

create unique index if not exists transactions_source_account_uidx
  on public.transactions(source_account_id);

create index if not exists transactions_user_source_account_idx
  on public.transactions(user_id, source_account_id);

comment on column public.transactions.source_account_id is
  'Conta que originou automaticamente esta movimentação.';

create or replace function public.settle_account(p_account_id uuid, p_date date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_transaction public.transactions;
begin
  select *
    into v_account
    from public.accounts
   where id = p_account_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Conta não encontrada ou sem permissão.';
  end if;

  update public.accounts
     set status = case when v_account.kind = 'pagar' then 'pago' else 'recebido' end,
         updated_at = now()
   where id = v_account.id
     and user_id = auth.uid()
  returning * into v_account;

  insert into public.transactions (
    user_id,
    type,
    description,
    category,
    amount,
    date,
    payment_method,
    status,
    notes,
    source_account_id
  ) values (
    v_account.user_id,
    case when v_account.kind = 'pagar' then 'despesa' else 'receita' end,
    v_account.name,
    v_account.category,
    v_account.amount,
    p_date,
    v_account.payment_method,
    'confirmado',
    coalesce(nullif(v_account.notes, ''), nullif(v_account.description, '')),
    v_account.id
  )
  on conflict (source_account_id) do update set
    type = excluded.type,
    description = excluded.description,
    category = excluded.category,
    amount = excluded.amount,
    date = excluded.date,
    payment_method = excluded.payment_method,
    status = 'confirmado',
    notes = excluded.notes,
    updated_at = now()
  returning * into v_transaction;

  return jsonb_build_object(
    'account', to_jsonb(v_account),
    'transaction', to_jsonb(v_transaction)
  );
end;
$$;

create or replace function public.reopen_account(p_account_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account public.accounts;
begin
  select *
    into v_account
    from public.accounts
   where id = p_account_id
     and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Conta não encontrada ou sem permissão.';
  end if;

  delete from public.transactions
   where source_account_id = v_account.id
     and user_id = auth.uid();

  update public.accounts
     set status = case when v_account.kind = 'pagar' then 'pendente' else 'previsto' end,
         updated_at = now()
   where id = v_account.id
     and user_id = auth.uid()
  returning * into v_account;

  return jsonb_build_object('account', to_jsonb(v_account));
end;
$$;

revoke all on function public.settle_account(uuid, date) from public;
revoke all on function public.reopen_account(uuid) from public;
grant execute on function public.settle_account(uuid, date) to authenticated;
grant execute on function public.reopen_account(uuid) to authenticated;
