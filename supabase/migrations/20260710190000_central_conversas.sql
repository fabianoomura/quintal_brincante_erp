-- Central de Conversas WhatsApp — fase 1 (fundação).
-- O ERP é a fonte de verdade do histórico; a Evolution é só gateway de envio/recebimento.
-- Toda mensagem (enviada pelo sistema, digitada pela equipe ou recebida do responsável)
-- vive nestas tabelas.

create type direcao_mensagem as enum ('entrada', 'saida');
create type tipo_mensagem_whatsapp as enum ('texto', 'outro');

-- Conversa = 1 por telefone (do responsável). Pertence ao CONTATO, não à criança;
-- contato_id null = número que escreveu e não bate com nenhum cadastro.
create table whatsapp_conversa (
  id                 uuid primary key default gen_random_uuid(),
  contato_id         uuid references contato(id) on delete set null,
  telefone           text not null unique,   -- E.164 canônico (celular BR sempre com o 9)
  ultima_mensagem    text,
  ultima_mensagem_em timestamptz,
  nao_lidas          int not null default 0,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now()
);

create table whatsapp_mensagem (
  id                 uuid primary key default gen_random_uuid(),
  conversa_id        uuid not null references whatsapp_conversa(id) on delete cascade,
  crianca_id         uuid references crianca(id) on delete set null,   -- vínculo opcional
  presenca_id        uuid references presenca(id) on delete set null,  -- vínculo opcional (permanência)
  direcao            direcao_mensagem not null,
  status             status_notificacao not null default 'pendente',
  tipo               tipo_mensagem_whatsapp not null default 'texto',
  conteudo           text,
  provider_msg_id    text,
  resposta_de_msg_id text,                    -- provider id da mensagem citada (quando houver)
  enviado_por        uuid references colaborador(id) on delete set null, -- null = sistema/recebida
  data_mensagem      timestamptz not null default now(),
  raw_payload        jsonb,                   -- payload cru da Evolution (debug; sujeito a expurgo)
  created_at         timestamptz not null default now()
);

-- Dedupe: reentrega do webhook E duplo registro sistema+webhook (fromMe) caem aqui.
create unique index uq_whatsapp_msg_provider
  on whatsapp_mensagem (conversa_id, provider_msg_id) where provider_msg_id is not null;
create index idx_whatsapp_msg_conversa on whatsapp_mensagem (conversa_id, data_mensagem);
create index idx_whatsapp_msg_crianca  on whatsapp_mensagem (crianca_id) where crianca_id is not null;

-- Contadores da conversa atualizados por trigger (atômico: webhooks concorrentes
-- não perdem incremento de não lidas).
create or replace function whatsapp_conversa_apos_mensagem() returns trigger
language plpgsql as $$
begin
  update whatsapp_conversa
     set ultima_mensagem    = left(coalesce(new.conteudo, '[sem texto]'), 200),
         ultima_mensagem_em = new.data_mensagem,
         nao_lidas          = nao_lidas + (case when new.direcao = 'entrada' then 1 else 0 end)
   where id = new.conversa_id;
  return new;
end $$;

create trigger trg_whatsapp_msg_conversa
  after insert on whatsapp_mensagem
  for each row execute function whatsapp_conversa_apos_mensagem();

-- RLS Tier A: atendimento é operação (qualquer colaborador ativo).
alter table whatsapp_conversa enable row level security;
alter table whatsapp_mensagem enable row level security;
create policy colab_all_whatsapp_conversa on whatsapp_conversa
  for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_whatsapp_mensagem on whatsapp_mensagem
  for all to authenticated using (is_colaborador()) with check (is_colaborador());

-- Realtime (chat ao vivo). Guard idempotente p/ db reset.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_conversa'
  ) then
    alter publication supabase_realtime add table whatsapp_conversa;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_mensagem'
  ) then
    alter publication supabase_realtime add table whatsapp_mensagem;
  end if;
end $$;
