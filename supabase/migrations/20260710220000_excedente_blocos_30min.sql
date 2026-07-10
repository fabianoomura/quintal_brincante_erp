-- Excedente do Play passa a ser cobrado em blocos de 30 minutos pela aplicação.
-- A tolerância inicial fica zerada, mas continua editável em Configurações.
update config_sistema
set tolerancia_min = 0
where id = 1;
