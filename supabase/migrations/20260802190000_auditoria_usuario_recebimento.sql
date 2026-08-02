-- Identifica o colaborador que efetivamente deu baixa manual no lançamento.
-- Registros antigos e pagamentos automáticos permanecem nulos e são rotulados pela aplicação.
alter table public.lancamento
  add column if not exists recebido_por uuid references public.colaborador(id) on delete set null;

create index if not exists idx_lancamento_recebido_por
  on public.lancamento (recebido_por)
  where recebido_por is not null;

comment on column public.lancamento.recebido_por is
  'Colaborador que registrou a baixa manual; null em registros antigos ou conciliação automática.';
