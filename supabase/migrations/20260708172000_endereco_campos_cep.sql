-- Campos de endereco separados para BI e preenchimento por CEP.
-- Mantem `endereco` como texto de exibicao/compatibilidade.

alter table crianca
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text;

alter table contato
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text;

-- Backfill suave: endereco legado vira logradouro se ainda nao houver campo separado.
-- Nao tenta quebrar numero/bairro/cidade automaticamente para evitar dados errados.
update crianca
set logradouro = endereco
where endereco is not null
  and logradouro is null;

update contato
set logradouro = endereco
where endereco is not null
  and logradouro is null;
