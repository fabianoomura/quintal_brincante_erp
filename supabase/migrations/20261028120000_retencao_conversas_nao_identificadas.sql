-- Limpeza automática SOMENTE do histórico do ERP (Supabase).
-- Não apaga no celular, não chama a Evolution e não desliga serviços.
-- Primeira execução no próximo agendamento: 03h20 de America/Sao_Paulo (UTC-3).

create or replace function public.whatsapp_telefone_chave(p_telefone text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  with numero as (
    select nullif(regexp_replace(p_telefone, '[^0-9]', '', 'g'), '') as d
  )
  select case
    when length(d) = 12 and left(d, 2) = '55' and substring(d, 5, 1) in ('6','7','8','9')
      then left(d, 4) || '9' || substring(d, 5)
    else d
  end from numero;
$$;

create index if not exists idx_contato_whatsapp_telefone_chave
  on public.contato (public.whatsapp_telefone_chave(telefone))
  where telefone is not null;

create table public.whatsapp_limpeza_execucao (
  id bigint generated always as identity primary key,
  executada_em timestamptz not null default now(),
  conversas_identificadas int not null,
  conversas_excluidas int not null,
  mensagens_excluidas int not null
);
alter table public.whatsapp_limpeza_execucao enable row level security;
revoke all on public.whatsapp_limpeza_execucao from anon, authenticated;
grant select on public.whatsapp_limpeza_execucao to authenticated;
grant all on public.whatsapp_limpeza_execucao to service_role;
create policy admin_read_whatsapp_limpeza on public.whatsapp_limpeza_execucao
  for select to authenticated using (public.is_admin());

create or replace function public.whatsapp_limpar_nao_identificadas()
returns jsonb
language plpgsql security definer
set search_path = ''
set lock_timeout = '3s'
set statement_timeout = '30s'
as $$
declare
  v_corte timestamptz := now() - interval '7 days';
  v_identificadas int := 0;
  v_conversas int := 0;
  v_mensagens int := 0;
  v_quantidade int;
  v_id uuid;
begin
  -- Serializa as execuções e não disputa cadastros em andamento: se o lock não
  -- puder ser obtido rapidamente, o job falha sem qualquer exclusão parcial.
  perform pg_catalog.pg_advisory_xact_lock(28102026, 7);
  lock table public.contato in share mode;

  -- Antes de excluir, resolve cadastros posteriores, inclusive telefone formatado
  -- e com/sem o nono dígito. Ambiguidade protege a conversa sem escolher uma pessoa.
  with correspondencias as (
    select w.id, (array_agg(c.id order by c.id))[1] as contato_id
    from public.whatsapp_conversa w
    join public.contato c
      on public.whatsapp_telefone_chave(c.telefone) = public.whatsapp_telefone_chave(w.telefone)
    where w.contato_id is null
    group by w.id
    having count(*) = 1
  )
  update public.whatsapp_conversa w
     set contato_id = c.contato_id
    from correspondencias c
   where w.id = c.id and w.contato_id is null;
  get diagnostics v_identificadas = row_count;

  for v_id in
    select w.id
      from public.whatsapp_conversa w
     where w.contato_id is null
       and w.created_at < v_corte
       and coalesce(w.ultima_mensagem_em, w.created_at) < v_corte
       and not exists (
         select 1 from public.contato c
          where public.whatsapp_telefone_chave(c.telefone) = public.whatsapp_telefone_chave(w.telefone)
       )
       and not exists (
         select 1 from public.whatsapp_mensagem m
          where m.conversa_id = w.id
            and (m.created_at >= v_corte or m.data_mensagem >= v_corte
                 or m.crianca_id is not null or m.presenca_id is not null
                 or m.enviado_por is not null or m.direcao = 'saida')
       )
     order by w.created_at, w.id
     limit 500
     for update of w skip locked
  loop
    -- O lock FOR UPDATE da conversa impede inserção concorrente de mensagens
    -- (FK). Conversas já ocupadas por outra transação são preservadas neste lote.
    select count(*) into v_quantidade from public.whatsapp_mensagem where conversa_id = v_id;
    -- Revalida em nova instrução/snapshot depois de obter o lock: uma mensagem
    -- pode ter sido confirmada enquanto o SELECT inicial escolhia o lote.
    delete from public.whatsapp_conversa w
     where w.id = v_id and w.contato_id is null
       and w.created_at < v_corte
       and coalesce(w.ultima_mensagem_em, w.created_at) < v_corte
       and not exists (
         select 1 from public.whatsapp_mensagem m
          where m.conversa_id = w.id
            and (m.created_at >= v_corte or m.data_mensagem >= v_corte
                 or m.crianca_id is not null or m.presenca_id is not null
                 or m.enviado_por is not null or m.direcao = 'saida')
       );
    if found then
      v_conversas := v_conversas + 1;
      v_mensagens := v_mensagens + v_quantidade;
    end if;
  end loop;

  -- Auditoria só de contagens: não mantém cópia de telefone, conteúdo ou payload.
  insert into public.whatsapp_limpeza_execucao
    (conversas_identificadas, conversas_excluidas, mensagens_excluidas)
  values (v_identificadas, v_conversas, v_mensagens);
  return jsonb_build_object('identificadas', v_identificadas,
    'conversas_excluidas', v_conversas, 'mensagens_excluidas', v_mensagens);
end;
$$;

revoke all on function public.whatsapp_limpar_nao_identificadas() from public, anon, authenticated;
grant execute on function public.whatsapp_limpar_nao_identificadas() to service_role;

-- pg_cron é o mesmo mecanismo já usado pelos workers do projeto. A ausência da
-- extensão interrompe a migration, em vez de informar uma automação inexistente.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('whatsapp-limpar-nao-identificadas', '20 6 * * *',
  $$select public.whatsapp_limpar_nao_identificadas();$$);
