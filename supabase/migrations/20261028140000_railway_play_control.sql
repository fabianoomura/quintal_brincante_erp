-- Estado durável no SUPABASE do ERP, nunca no Postgres que será desligado.
create table public.railway_play_state (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  session_persistence_verified boolean not null default false,
  margin_seconds integer not null default 600 check (margin_seconds >= 300),
  monitoring_since timestamptz not null default now(),
  last_activity_at timestamptz not null default clock_timestamp(),
  revision bigint not null default 0,
  lease_owner uuid,
  lease_until timestamptz
);
insert into public.railway_play_state (id) values (true);
alter table public.railway_play_state enable row level security;
revoke all on public.railway_play_state from anon, authenticated;
grant all on public.railway_play_state to service_role;

create function public.railway_play_control(p_action text, p_owner uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.railway_play_state; n bigint; t timestamptz := clock_timestamp();
begin
  if p_owner is null or p_action not in ('claim','check','touch','release') then
    raise exception 'ação inválida';
  end if;
  select * into strict s from public.railway_play_state where id for update;
  if p_action = 'claim' then
    if s.lease_until > t and s.lease_owner is distinct from p_owner then return null; end if;
    update public.railway_play_state set lease_owner = p_owner, lease_until = t + interval '240 seconds' where id;
  elsif s.lease_owner is distinct from p_owner or s.lease_until <= t then
    return null;
  elsif p_action = 'release' then
    update public.railway_play_state set lease_owner = null, lease_until = null where id;
    return null;
  elsif p_action = 'touch' then
    update public.railway_play_state set last_activity_at = t, revision = revision + 1 where id
      returning * into s;
  end if;
  -- Sem filtro por dia nas presenças: uma criança esquecida aberta bloqueia a parada.
  select
    (select count(*) from public.presenca where origem = 'espaco_kids' and saida is null) +
    (select count(*) from public.fila_espera
      where data = (t at time zone 'America/Sao_Paulo')::date and status in ('aguardando','chamada')) +
    (select count(*) from public.notificacao where status = 'pendente' or
      (status = 'falha' and created_at >= s.monitoring_since)) +
    (select count(*) from public.whatsapp_mensagem where direcao = 'saida' and
      (status = 'pendente' or (status = 'falha' and created_at >= s.monitoring_since)))
    into n;
  return jsonb_build_object('enabled', s.enabled and s.session_persistence_verified,
    'revision', s.revision, 'idle_seconds', greatest(0, extract(epoch from (t - s.last_activity_at))),
    'blockers', n, 'margin_seconds', s.margin_seconds);
end $$;
revoke all on function public.railway_play_control(text, uuid) from public, anon, authenticated;
grant execute on function public.railway_play_control(text, uuid) to service_role;

-- Todo fluxo de saída (normal, desacordo, exclusão e sem cobrança), reabertura,
-- fila e desfecho de envio reinicia a margem. Independe do caminho do aplicativo.
create function public.railway_play_activity() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.railway_play_state set last_activity_at = clock_timestamp(), revision = revision + 1 where id;
  return null;
end $$;
revoke all on function public.railway_play_activity() from public, anon, authenticated;
create trigger railway_play_presence after insert or update or delete on public.presenca
  for each row execute function public.railway_play_activity();
create trigger railway_play_queue after insert or update or delete on public.fila_espera
  for each row execute function public.railway_play_activity();
create trigger railway_play_notification after insert or update or delete on public.notificacao
  for each row execute function public.railway_play_activity();
create trigger railway_play_message after insert or update or delete on public.whatsapp_mensagem
  for each row execute function public.railway_play_activity();

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create function public.railway_play_ping(p_action text default 'tick') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare u text; k text;
begin
  if p_action not in ('tick', 'wake') then raise exception 'ação inválida'; end if;
  if not exists (select 1 from public.railway_play_state where id and enabled and session_persistence_verified) then return; end if;
  select decrypted_secret into u from vault.decrypted_secrets where name = 'play_control_url';
  select decrypted_secret into k from vault.decrypted_secrets where name = 'play_control_secret';
  if u is null or k is null then raise exception 'Configurar play_control_url e play_control_secret no Vault'; end if;
  perform net.http_post(url := rtrim(u, '/') || '/' || p_action,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || k),
    body := '{}'::jsonb, timeout_milliseconds := 180000);
end $$;
revoke all on function public.railway_play_ping(text) from public, anon, authenticated;
grant execute on function public.railway_play_ping(text) to service_role;
select cron.schedule('railway-play-control', '* * * * *', $$select public.railway_play_ping('tick');$$);

-- pg_net envia depois do commit. Cobre também entrada/reabertura fora da UI.
create function public.railway_play_wake() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.origem = 'espaco_kids' and new.saida is null then
    -- Falha de configuração/pg_net não pode desfazer um check-in real.
    begin perform public.railway_play_ping('wake');
    exception when others then raise warning 'railway-play: wake não agendado'; end;
  end if;
  return null;
end $$;
revoke all on function public.railway_play_wake() from public, anon, authenticated;
create trigger railway_play_wake after insert or update of saida on public.presenca
  for each row execute function public.railway_play_wake();
