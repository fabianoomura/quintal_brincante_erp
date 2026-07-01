-- Fase 3 — play com preço PROPORCIONAL: valor/hora do período (grade/feriado) travado no
-- check-in; o valor final = piso de 1h + proporcional, calculado no check-out.
alter table presenca add column tarifa_hora numeric(10,2);

-- Antecedência do aviso de tempo (min) migra p/ config (a tarifa por hora foi aposentada).
alter table config_sistema add column aviso_antecedencia_min int not null default 15;
