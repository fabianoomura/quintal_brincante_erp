-- Não corrige/apaga duplicidades existentes: se houver, a criação falha e exige revisão.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create unique index if not exists idx_presenca_play_crianca_aberta
  on public.presenca (crianca_id)
  where origem = 'espaco_kids' and saida is null;

-- Reabrir também passa pela trava. Se houver conflito, a transação inteira
-- reverte, incluindo a remoção da cobrança pendente; nunca perde o lançamento.
create or replace function public.reabrir_presenca_segura(p_presenca_id uuid)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare p public.presenca;
begin
  select * into p from public.presenca where id=p_presenca_id and saida is not null for update;
  if not found then return false; end if;
  if exists (select 1 from public.lancamento where origem_tipo='presenca'
    and origem_id=p.id and status='pago') then
    raise exception 'Essa sessão já foi paga. Estorne no Financeiro antes de reabrir.';
  end if;
  delete from public.lancamento where origem_tipo='presenca' and origem_id=p.id and status<>'pago';
  update public.presenca set saida=null, valor=null where id=p.id;
  return true;
end $$;
revoke all on function public.reabrir_presenca_segura(uuid) from public, anon;
grant execute on function public.reabrir_presenca_segura(uuid) to authenticated, service_role;
commit;
