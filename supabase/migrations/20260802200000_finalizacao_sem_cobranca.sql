-- Resolve presenças antigas esquecidas sem inventar cobrança.
alter table public.presenca
  add column if not exists sem_cobranca_motivo text,
  add column if not exists sem_cobranca_em timestamptz,
  add column if not exists sem_cobranca_por uuid references public.colaborador(id) on delete set null;

comment on column public.presenca.sem_cobranca_motivo is
  'Justificativa obrigatória ao finalizar uma presença sem gerar cobrança.';

create or replace function public.excluir_presenca_esquecida(p_presenca_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem excluir presenças.' using errcode = '42501';
  end if;

  select id into v_id
  from public.presenca
  where id = p_presenca_id
    and saida is null
    and data < current_date
  for update;

  if v_id is null then return false; end if;

  delete from public.lancamento where origem_tipo = 'presenca' and origem_id = v_id;
  delete from public.presenca where id = v_id;
  return true;
end;
$$;

revoke all on function public.excluir_presenca_esquecida(uuid) from public;
grant execute on function public.excluir_presenca_esquecida(uuid) to authenticated;
