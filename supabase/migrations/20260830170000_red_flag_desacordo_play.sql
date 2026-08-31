-- Encerramento excepcional do Play e alerta persistente no cadastro.
-- "Cortesia" continua sendo uma modalidade de recebimento; "desacordo" fecha
-- sem gerar receita e registra uma ocorrencia auditavel.

alter table public.crianca
  add column if not exists alerta_ativo boolean not null default false,
  add column if not exists alerta_texto text,
  add column if not exists alerta_em timestamptz,
  add column if not exists alerta_por uuid references public.colaborador(id) on delete set null;

comment on column public.crianca.alerta_ativo is
  'Red flag operacional visivel para a equipe nos proximos atendimentos.';
comment on column public.crianca.alerta_texto is
  'Resumo atual do cuidado, perfil ou ocorrido que motivou a red flag.';

alter table public.presenca
  add column if not exists sem_cobranca_tipo text;

update public.presenca
set sem_cobranca_tipo = 'outro'
where sem_cobranca_em is not null
  and sem_cobranca_tipo is null;

alter table public.presenca
  drop constraint if exists presenca_sem_cobranca_tipo_check;
alter table public.presenca
  add constraint presenca_sem_cobranca_tipo_check
  check (sem_cobranca_tipo is null or sem_cobranca_tipo in ('outro', 'desacordo'));

comment on column public.presenca.sem_cobranca_tipo is
  'Classifica finalizacoes sem cobranca: outro ou desacordo.';

create or replace function public.encerrar_play_por_desacordo(
  p_presenca_id uuid,
  p_relato text,
  p_marcar_alerta boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_crianca_id uuid;
  v_colaborador_id uuid;
  v_relato text := btrim(coalesce(p_relato, ''));
  v_nota text;
begin
  if not public.is_colaborador() then
    raise exception 'Apenas colaboradores ativos podem encerrar o Play.'
      using errcode = '42501';
  end if;

  if char_length(v_relato) < 10 then
    raise exception 'Descreva o desacordo ou ocorrido com pelo menos 10 caracteres.'
      using errcode = '22023';
  end if;

  if char_length(v_relato) > 1000 then
    raise exception 'O relato deve ter no maximo 1000 caracteres.'
      using errcode = '22023';
  end if;

  select id into v_colaborador_id
  from public.colaborador
  where user_id = auth.uid() and ativo
  limit 1;

  select crianca_id into v_crianca_id
  from public.presenca
  where id = p_presenca_id
    and origem = 'espaco_kids'
    and saida is null
  for update;

  if v_crianca_id is null then
    return null;
  end if;

  v_nota := 'Encerrado por desacordo: ' || v_relato;

  update public.presenca
  set saida = (now() at time zone 'America/Sao_Paulo')::time,
      valor = null,
      pausada_em = null,
      obs = concat_ws(E'\n', nullif(btrim(obs), ''), v_nota),
      sem_cobranca_tipo = 'desacordo',
      sem_cobranca_motivo = v_relato,
      sem_cobranca_em = now(),
      sem_cobranca_por = v_colaborador_id
  where id = p_presenca_id;

  insert into public.ocorrencia (
    crianca_id, presenca_id, tipo, descricao, criado_por
  ) values (
    v_crianca_id,
    p_presenca_id,
    'comportamento'::public.tipo_ocorrencia,
    v_nota,
    auth.uid()
  );

  if coalesce(p_marcar_alerta, false) then
    update public.crianca
    set alerta_ativo = true,
        alerta_texto = v_relato,
        alerta_em = now(),
        alerta_por = v_colaborador_id
    where id = v_crianca_id;
  end if;

  return v_crianca_id;
end;
$$;

revoke all on function public.encerrar_play_por_desacordo(uuid, text, boolean) from public;
grant execute on function public.encerrar_play_por_desacordo(uuid, text, boolean) to authenticated;
