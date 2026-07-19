-- Exclusão administrativa de uma operação de teste do Play.
-- Lançamento e presença são removidos na mesma transação; cadastro e conversas permanecem.
create or replace function public.excluir_operacao_play(p_presenca_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_excluida uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem excluir operações.'
      using errcode = '42501';
  end if;

  select id into v_excluida
  from public.presenca
  where id = p_presenca_id
    and origem = 'espaco_kids'
  for update;

  if v_excluida is null then
    return false;
  end if;

  delete from public.lancamento
  where origem_tipo = 'presenca'
    and origem_id = p_presenca_id;

  delete from public.presenca
  where id = v_excluida;

  return true;
end;
$$;

revoke all on function public.excluir_operacao_play(uuid) from public;
grant execute on function public.excluir_operacao_play(uuid) to authenticated;
