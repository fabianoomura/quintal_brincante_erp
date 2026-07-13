-- Fila de espera do play + limite de crianças simultâneas no play.
-- Contexto (2026-07-13): no primeiro dia operacional o play encheu; o teto definido
-- pela operação foi 20 crianças. Acima disso, entra fila: quando abre vaga o sistema
-- chama a próxima criança por WhatsApp; se não aparecer em X min, chama a seguinte.

-- Limite do play (null = sem limite) — separado de capacidade_dia (espaço todo).
alter table config_sistema add column capacidade_play int;
-- Minutos que a família chamada tem para chegar antes de a vaga passar adiante.
alter table config_sistema add column fila_tolerancia_min int not null default 10;

-- Teto decidido pela operação no primeiro dia; segue editável em /configuracoes.
update config_sistema set capacidade_play = 20 where id = 1 and capacidade_play is null;

-- ─────────────────────────────────────────────────────────────
-- Fila de espera (por dia). Ciclo: aguardando → chamada → atendida (fez check-in)
--                                     └→ desistiu (removida pela equipe) / expirada (não veio em X min)
-- ─────────────────────────────────────────────────────────────
create type status_fila as enum ('aguardando', 'chamada', 'atendida', 'desistiu', 'expirada');

create table fila_espera (
  id           uuid primary key default gen_random_uuid(),
  crianca_id   uuid not null references crianca(id) on delete cascade,
  data         date not null,
  status       status_fila not null default 'aguardando',
  chamada_em   timestamptz,               -- quando a vez chegou (inicia a tolerância)
  encerrada_em timestamptz,               -- atendida/desistiu/expirada
  created_at   timestamptz not null default now()
);

-- Posição na fila = ordem de chegada.
create index idx_fila_espera_dia on fila_espera (data, status, created_at);
-- Uma entrada ativa por criança (a de ontem é expirada pelo worker antes de reentrar).
create unique index idx_fila_espera_ativa on fila_espera (crianca_id)
  where status in ('aguardando', 'chamada');

alter table fila_espera enable row level security;
create policy colab_all_fila on fila_espera
  for all to authenticated using (is_colaborador()) with check (is_colaborador());

-- Mudanças na fila (worker chamando/expirando) atualizam os tablets via Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fila_espera'
  ) then
    alter publication supabase_realtime add table fila_espera;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Mensagem "chegou a vez" (template editável em /mensagens)
-- ─────────────────────────────────────────────────────────────
alter type tipo_notificacao add value if not exists 'fila_sua_vez';

insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
values (
  'fila_sua_vez',
  '🎉 Fila: chegou a vez',
  'sistema',
  null,
  '🎉 Boa notícia, {{responsavel_nome}}! Chegou a vez de {{crianca_nome}} no play. Vocês têm {{minutos_tolerancia}} min para chegar — depois disso a vaga passa para a próxima criança da fila. Até já! 💚',
  'utility',
  15
)
on conflict (chave) do nothing;

insert into mensagem_variavel (chave, rotulo, descricao, exemplo, ordem)
values (
  'minutos_tolerancia',
  'Tolerância da fila',
  'Minutos que a família chamada tem para chegar antes de a vaga passar adiante.',
  '10',
  7
)
on conflict (chave) do update
set rotulo = excluded.rotulo,
    descricao = excluded.descricao,
    exemplo = excluded.exemplo,
    ordem = excluded.ordem,
    ativo = true;
