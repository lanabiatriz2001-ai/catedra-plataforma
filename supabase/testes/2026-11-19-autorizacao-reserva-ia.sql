-- Exercitar em banco de testes com as migrações aplicadas; os dados são fictícios.
begin;
insert into auth.users (id, email) values ('2db320f6-1990-42c3-b55b-d548dc7ce25a', 'reserva@example.invalid');
insert into public.beta_allow (email) values ('reserva@example.invalid');
insert into public.app_config (chave, valor) values ('ia_pausada', 'false'), ('beta_aberto', 'false')
  on conflict (chave) do update set valor = excluded.valor;
insert into public.ia_cota (plano, chamadas_dia) values ('beta', 4)
  on conflict (plano) do update set chamadas_dia = excluded.chamadas_dia;
select set_config('request.jwt.claims', '{"sub":"2db320f6-1990-42c3-b55b-d548dc7ce25a"}', true);
set local role authenticated;
do $$
begin
  if (public.reservar_uso_ia('complete', 12)->'reservada') is distinct from 'true'::jsonb then
    raise exception 'A conta convidada deveria poder reservar.';
  end if;
end $$;
reset role;
insert into public.beta_acesso (user_id, bloqueado) values ('2db320f6-1990-42c3-b55b-d548dc7ce25a', true);
set local role authenticated;
do $$
begin
  if (public.reservar_uso_ia('tts', 12)->'acesso_negado') is distinct from 'true'::jsonb then
    raise exception 'O bloqueio individual deveria impedir a reserva.';
  end if;
  perform public.registrar_uso_ia('tts', 12);
end $$;
reset role;
delete from public.beta_acesso where user_id = '2db320f6-1990-42c3-b55b-d548dc7ce25a';
update public.app_config set valor = 'true' where chave = 'ia_pausada';
set local role authenticated;
do $$
begin
  if (public.reservar_uso_ia('complete', 12)->'acesso_negado') is distinct from 'true'::jsonb then
    raise exception 'A pausa global deveria impedir a reserva.';
  end if;
end $$;
reset role;
update public.app_config set valor = 'false' where chave = 'ia_pausada';
delete from public.beta_allow where email = 'reserva@example.invalid';
set local role authenticated;
do $$
begin
  if (public.reservar_uso_ia('complete', 12)->'acesso_negado') is distinct from 'true'::jsonb then
    raise exception 'A revogação do convite deveria impedir a reserva.';
  end if;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.ai_uso where user_id = '2db320f6-1990-42c3-b55b-d548dc7ce25a') <> 1 then
    raise exception 'Só a reserva da conta autorizada deveria consumir cota.';
  end if;
end $$;
rollback;
