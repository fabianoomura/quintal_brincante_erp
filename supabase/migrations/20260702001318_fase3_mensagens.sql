-- Fase 3 — módulo de mensagens: templates de WhatsApp (textos prontos) com status de
-- aprovação da Meta. Os avisos rápidos do play passam a puxar os textos daqui.
create table mensagem_template (
  id               uuid primary key default gen_random_uuid(),
  chave            text not null unique,           -- ex.: 'banheiro', 'aviso_tempo'
  nome             text not null,                  -- rótulo (botão/descrição)
  tipo             text not null default 'aviso_rapido', -- 'aviso_rapido' | 'sistema'
  tipo_ocorrencia  tipo_ocorrencia,                -- p/ avisos rápidos
  texto            text not null,                  -- corpo com {{1}}, {{2}}...
  categoria        text not null default 'utility', -- 'utility' | 'marketing'
  status_aprovacao text not null default 'rascunho', -- rascunho|enviado|aprovado|reprovado
  ativo            boolean not null default true,
  ordem            int not null default 0,
  created_at       timestamptz not null default now()
);

alter table mensagem_template enable row level security;
create policy colab_read_msg on mensagem_template for select to authenticated using (is_colaborador());
create policy admin_all_msg  on mensagem_template for all    to authenticated using (is_admin()) with check (is_admin());
