import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { spawnSync, spawn } from 'node:child_process'

test('PostgreSQL isolado: índice concorrente, histórico e rollback da reabertura', async () => {
  const name = `quintal-play-test-${randomUUID()}`
  const docker = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 })
  const pg = (sql: string) => docker(['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], sql)
  const child = '00000000-0000-0000-0000-000000000001'
  const run = docker(['run', '-d', '--network', 'none', '--name', name,
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17'])
  assert.equal(run.status, 0, run.stderr)
  try {
    for (let i = 0; i < 40; i++) {
      if (docker(['exec', name, 'pg_isready', '-U', 'postgres']).status === 0) break
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    const migration = readFileSync(new URL('../supabase/migrations/20261105220000_play_entrada_unica.sql', import.meta.url), 'utf8')
    const setup = pg(`create role anon; create role authenticated; create role service_role;
      create table presenca(id uuid primary key default gen_random_uuid(), crianca_id uuid not null,
        data date default current_date, entrada time default '14:00', saida time, origem text default 'espaco_kids', valor numeric);
      create table lancamento(id uuid primary key default gen_random_uuid(), origem_tipo text, origem_id uuid, status text);
      ${migration}
      insert into presenca(crianca_id,saida) values('${child}','15:00'),('${child}','16:00');`)
    assert.equal(setup.status, 0, setup.stderr)
    const race = () => new Promise<{ code: number | null; stderr: string }>(resolve => {
      const p = spawn('docker', ['exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'])
      let stderr = ''
      p.stderr.on('data', data => { stderr += data })
      p.stdout.resume()
      p.on('close', code => resolve({ code, stderr }))
      p.stdin.end(`begin; insert into presenca(crianca_id) values('${child}'); select pg_sleep(0.2); commit;`)
    })
    const results = await Promise.all([race(), race()])
    assert.equal(results.filter(r => r.code === 0).length, 1)
    assert.match(results.find(r => r.code !== 0)!.stderr, /idx_presenca_play_crianca_aberta/)
    const checks = pg(`do $$ declare p uuid; begin
      select id into p from presenca where saida='15:00';
      insert into lancamento(origem_tipo,origem_id,status) values('presenca',p,'pendente');
      begin perform reabrir_presenca_segura(p); raise exception 'Reabertura deveria falhar';
      exception when unique_violation then null; end;
      assert exists(select 1 from lancamento where origem_id=p), 'Cobrança preservada';
      assert exists(select 1 from presenca where id=p and saida is not null), 'Saída preservada';
      update presenca set saida='17:00' where saida is null;
      assert reabrir_presenca_segura(p), 'Pode reabrir quando não existe outra aberta';
      assert not exists(select 1 from lancamento where origem_id=p), 'Cobrança pendente removida após sucesso';
      assert not has_function_privilege('anon','reabrir_presenca_segura(uuid)','execute');
      assert has_function_privilege('authenticated','reabrir_presenca_segura(uuid)','execute');
    end $$;`)
    assert.equal(checks.status, 0, checks.stderr)
  } finally {
    // Somente o container de teste criado acima, sem portas nem volumes compartilhados.
    docker(['rm', '-f', '-v', name])
  }
})
