import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

test('controle Railway: migration, locks, gatilhos, bloqueios e permissões no Supabase LOCAL', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261028140000_railway_play_control.sql', import.meta.url), 'utf8')
  const sql = `begin;
  set local statement_timeout = '30s';
  ${migration}
  do $test$
  declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); s jsonb;
    c uuid; p uuid; r bigint; baseline bigint; contact uuid; n uuid;
  begin
    assert not has_function_privilege('authenticated','public.railway_play_control(text,uuid)','execute');
    assert not has_function_privilege('anon','public.railway_play_ping(text)','execute');
    assert has_function_privilege('service_role','public.railway_play_control(text,uuid)','execute');
    s := public.railway_play_control('claim', a);
    assert (s->>'enabled')::boolean = false, 'inicia desabilitado';
    assert public.railway_play_control('claim', b) is null, 'exclusão mútua';
    assert public.railway_play_control('release', b) is null;
    assert public.railway_play_control('check', a) is not null, 'outro owner não libera lock';
    update public.railway_play_state set enabled = true;
    s := public.railway_play_control('check', a);
    assert (s->>'enabled')::boolean = false, 'exige verificar sessão';
    update public.railway_play_state set enabled = false, session_persistence_verified = true;
    baseline := (s->>'blockers')::bigint;
    r := (s->>'revision')::bigint;
    insert into public.crianca(nome) values ('TESTE Railway rollback') returning id into c;
    insert into public.presenca(crianca_id,data,entrada,origem)
      values(c,current_date - 1,'14:00','espaco_kids') returning id into p;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline + 1, 'presença de ontem bloqueia';
    assert (s->>'revision')::bigint > r, 'checkin invalida snapshot anterior';
    update public.presenca set saida = '15:00' where id = p;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline, 'último checkout libera presença';
    assert (s->>'idle_seconds')::numeric < 5, 'checkout inicia margem';
    update public.presenca set saida = null where id = p;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline + 1, 'reabertura bloqueia';
    delete from public.presenca where id = p;
    insert into public.contato(nome,telefone) values ('TESTE Railway', '+19999900001') returning id into contact;
    insert into public.notificacao(crianca_id,contato_id,tipo,status)
      values(c,contact,'boas_vindas','pendente') returning id into n;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline + 1, 'envio pendente bloqueia';
    update public.notificacao set status = 'falha' where id = n;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline + 1, 'falha não significa concluído';
    update public.notificacao set status = 'enviada' where id = n;
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline, 'envio concluído libera';
    assert (s->>'idle_seconds')::numeric < 5, 'envio reinicia margem';
    insert into public.fila_espera(crianca_id,data,status)
      values(c,(clock_timestamp() at time zone 'America/Sao_Paulo')::date,'chamada');
    s := public.railway_play_control('check', a);
    assert (s->>'blockers')::bigint = baseline + 1, 'fila chamada bloqueia';
    update public.railway_play_state set lease_until = clock_timestamp() - interval '1 second';
    assert public.railway_play_control('check', a) is null, 'lease expirado perde autoridade';
    assert public.railway_play_control('claim', b) is not null, 'recupera execução interrompida';
    assert exists (select 1 from cron.job where jobname = 'railway-play-control' and schedule = '* * * * *');
  end $test$;
  rollback;`
  const result = spawnSync('docker', ['exec','-i','supabase_db_quintal_brincante','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', timeout: 60_000 })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})
