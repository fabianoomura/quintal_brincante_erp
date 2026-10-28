// Teste destrutivo apenas dentro de uma transação revertida no Supabase LOCAL.
// Não lê .env, não usa URL/chave de produção e nunca executa COMMIT.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

test('retenção real no Postgres: proteção, expurgo, cascata, cron e privilégios', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261028120000_retencao_conversas_nao_identificadas.sql', import.meta.url), 'utf8')
  const sql = `
begin;
set local statement_timeout = '60s';
-- Permite testar tanto antes como depois de aplicar a migration no ambiente local.
-- A tabela original (se existir), nome, dados, cron e funções voltam no ROLLBACK.
do $preparo$
begin
  if to_regclass('public.whatsapp_limpeza_execucao') is not null then
    execute format('alter table public.whatsapp_limpeza_execucao rename to %I',
      '_retencao_original_' || txid_current());
  end if;
end $preparo$;
${migration}
do $test$
declare
  v_antigo timestamptz := now() - interval '10 days';
  v_contato uuid; v_ambiguo uuid; v_crianca uuid; v_presenca uuid; v_colaborador uuid;
  v_id uuid; v_mensagem uuid; v_caso text;
  v_excluir uuid[] := '{}'; v_proteger uuid[] := '{}';
begin
  assert public.whatsapp_telefone_chave('+55 (43) 9120-3404') = '5543991203404', 'normalização BR';
  assert public.whatsapp_telefone_chave('+5543991203404') = '5543991203404', 'nono dígito';
  assert public.whatsapp_telefone_chave('+554332123456') = '554332123456', 'fixo não muda';
  assert public.whatsapp_telefone_chave('') is null, 'vazio não casa';

  insert into public.contato (nome, telefone) values ('TESTE retenção cadastrado depois', '+55 (99) 9123-0001') returning id into v_contato;
  insert into public.contato (nome, telefone) values ('TESTE retenção ambíguo 1', '+559991230002') returning id into v_ambiguo;
  insert into public.contato (nome, telefone) values ('TESTE retenção ambíguo 2', '+5599991230002');
  insert into public.crianca (nome) values ('TESTE retenção') returning id into v_crianca;
  insert into public.presenca (crianca_id, data, entrada, saida, origem)
    values (v_crianca, current_date - 10, '14:00', '15:00', 'espaco_kids') returning id into v_presenca;
  insert into public.colaborador (nome) values ('TESTE retenção') returning id into v_colaborador;

  foreach v_caso in array array['antiga', 'vazia', 'recente', 'limite', 'importada_agora',
    'crianca', 'presenca', 'equipe', 'saida', 'identificada', 'cadastro_posterior', 'ambiguo']
  loop
    insert into public.whatsapp_conversa (telefone, contato_id, created_at)
    values (case v_caso
        when 'cadastro_posterior' then '+5599991230001'
        when 'ambiguo' then '+5599991230002'
        else '+1999' || lpad((cardinality(v_excluir) + cardinality(v_proteger))::text, 8, '0') end,
      case when v_caso = 'identificada' then v_contato end,
      case when v_caso = 'recente' then now()
           when v_caso = 'limite' then now() - interval '7 days' else v_antigo end)
    returning id into v_id;

    if v_caso <> 'vazia' then
      insert into public.whatsapp_mensagem (conversa_id, direcao, conteudo, created_at, data_mensagem,
        crianca_id, presenca_id, enviado_por)
      values (v_id, case when v_caso = 'saida' then 'saida'::public.direcao_mensagem else 'entrada'::public.direcao_mensagem end,
        'TESTE retenção', case when v_caso = 'importada_agora' then now() else v_antigo end,
        v_antigo, case when v_caso = 'crianca' then v_crianca end,
        case when v_caso = 'presenca' then v_presenca end,
        case when v_caso = 'equipe' then v_colaborador end)
      returning id into v_mensagem;
    end if;
    if v_caso in ('antiga', 'vazia') then
      v_excluir := array_append(v_excluir, v_id);
    else
      v_proteger := array_append(v_proteger, v_id);
    end if;
  end loop;

  perform public.whatsapp_limpar_nao_identificadas();
  assert not exists (select 1 from public.whatsapp_conversa where id = any(v_excluir)), 'antigas sem vínculo excluídas';
  assert not exists (select 1 from public.whatsapp_mensagem where conversa_id = any(v_excluir)), 'cascata remove mensagens';
  assert (select count(*) from public.whatsapp_conversa where id = any(v_proteger)) = cardinality(v_proteger), 'todos os casos protegidos preservados';
  assert (select contato_id from public.whatsapp_conversa where telefone = '+5599991230001') = v_contato, 'cadastro posterior identificado';
  assert (select contato_id from public.whatsapp_conversa where telefone = '+5599991230002') is null, 'ambiguidade não escolhe cadastro';
  assert (select count(*) from public.whatsapp_limpeza_execucao) = 1, 'execução auditada';
  assert (select conversas_excluidas >= 2 and mensagens_excluidas >= 1 from public.whatsapp_limpeza_execucao), 'contagens auditadas';

  perform public.whatsapp_limpar_nao_identificadas();
  assert (select count(*) from public.whatsapp_conversa where id = any(v_proteger)) = cardinality(v_proteger), 'reexecução preserva vínculos';
  assert (select conversas_excluidas from public.whatsapp_limpeza_execucao order by id desc limit 1) = 0, 'reexecução idempotente';
  assert not has_function_privilege('anon', 'public.whatsapp_limpar_nao_identificadas()', 'execute'), 'anônimo sem acesso';
  assert not has_function_privilege('authenticated', 'public.whatsapp_limpar_nao_identificadas()', 'execute'), 'usuário sem execução';
  assert has_function_privilege('service_role', 'public.whatsapp_limpar_nao_identificadas()', 'execute'), 'serviço com execução';
  assert not has_table_privilege('anon', 'public.whatsapp_limpeza_execucao', 'select'), 'auditoria não pública';
  assert not has_table_privilege('authenticated', 'public.whatsapp_limpeza_execucao', 'delete'), 'usuário não apaga auditoria';
  assert (select count(*) from cron.job where jobname = 'whatsapp-limpar-nao-identificadas' and schedule = '20 6 * * *' and active) = 1, 'job diário ativo';
end $test$;
rollback;
select 'RETENCAO_ROLLBACK_OK';
`
  const result = spawnSync('docker', [
    'exec', '-i', 'supabase_db_quintal_brincante', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql, encoding: 'utf8', timeout: 90_000, maxBuffer: 2 * 1024 * 1024 })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr + result.stdout)
  assert.match(result.stdout, /RETENCAO_ROLLBACK_OK/)
})
