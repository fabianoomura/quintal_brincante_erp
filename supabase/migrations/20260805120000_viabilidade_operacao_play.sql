-- Dados operacionais externos usados para analisar a viabilidade diária do Play.
-- Presenças continuam sendo a fonte do movimento; esta tabela informa abertura,
-- equipe e custos inclusive nos dias abertos sem nenhuma criança.
create table if not exists public.operacao_play_dia (
  data date primary key,
  aberto boolean not null default true,
  abertura time,
  fechamento time,
  pessoas integer not null default 0 check (pessoas >= 0),
  custo_pessoal numeric(12,2) check (custo_pessoal is null or custo_pessoal >= 0),
  outros_custos numeric(12,2) not null default 0 check (outros_custos >= 0),
  observacao text,
  criado_por uuid references public.colaborador(id) on delete set null,
  atualizado_por uuid references public.colaborador(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operacao_play_horario_valido check (
    abertura is null or fechamento is null or fechamento > abertura
  )
);

comment on table public.operacao_play_dia is
  'Abertura, equipe e custos diários informados manualmente para a análise de viabilidade do Play.';
comment on column public.operacao_play_dia.custo_pessoal is
  'Custo total da equipe naquele dia, informado externamente.';
comment on column public.operacao_play_dia.outros_custos is
  'Outros custos variáveis diretamente atribuídos à operação daquele dia.';

create index if not exists idx_operacao_play_dia_aberto_data
  on public.operacao_play_dia (data)
  where aberto;

alter table public.operacao_play_dia enable row level security;

drop policy if exists colaborador_read_operacao_play_dia on public.operacao_play_dia;
create policy colaborador_read_operacao_play_dia
  on public.operacao_play_dia for select to authenticated
  using (public.is_colaborador());

drop policy if exists admin_all_operacao_play_dia on public.operacao_play_dia;
create policy admin_all_operacao_play_dia
  on public.operacao_play_dia for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.atualizar_operacao_play_dia_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_operacao_play_dia_updated_at on public.operacao_play_dia;
create trigger trg_operacao_play_dia_updated_at
before update on public.operacao_play_dia
for each row execute function public.atualizar_operacao_play_dia_updated_at();
