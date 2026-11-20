-- Regressões dos achados 5, 7, 8, 11 e 12. Rodar com ON_ERROR_STOP em um banco
-- de teste descartável, após as migrações. Os dados sintéticos e funções de
-- apoio pertencem só a esta transação. A leitura do passe usa de fato o papel anon.
begin;

create function pg_temp.exigir(ok boolean, caso text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Regressão: %', caso; end if;
end $$;

create function pg_temp.entrar(p_uid uuid, sessao uuid default null)
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_uid, 'session_id', sessao)::text, true);
$$;

insert into auth.users(id, email, created_at) values
  ('10000000-0000-4000-8000-000000000005','admin@teste.invalid',now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000005','aluna@teste.invalid',now() - interval '3 days'),
  ('30000000-0000-4000-8000-000000000005','colega@teste.invalid',now() - interval '3 days'),
  ('40000000-0000-4000-8000-000000000005','convite@teste.invalid',now() - interval '3 days');
insert into public.admins(user_id) values ('10000000-0000-4000-8000-000000000005');
insert into auth.sessions(id,user_id) values
  ('aaaaaaa1-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000005'),
  ('aaaaaaa2-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000005');
insert into public.grupos(id, nome, codigo) values
  ('50000000-0000-4000-8000-000000000012','Grupo de teste','SEG00012');

-- F5-LEGADO: uma coleção antiga ilegível sobrevive à migração; as outras continuam editáveis.
alter table public.user_data disable trigger validar_colecoes_estudo;
insert into public.user_data(user_id,data) values
  ('30000000-0000-4000-8000-000000000005','{"catedra:sessions":"[incompleto","catedra:edital":"[1]"}');
alter table public.user_data enable trigger validar_colecoes_estudo;
set local role authenticated;
select pg_temp.entrar('30000000-0000-4000-8000-000000000005');
insert into public.user_data(user_id,data) values
  (auth.uid(),'{"catedra:sessions":"[incompleto","catedra:edital":"[1,2]"}')
on conflict (user_id) do update set data = excluded.data;

select pg_temp.entrar('20000000-0000-4000-8000-000000000005');
-- O simulado grava um objeto, as sessões podem chegar como texto e o edital como array.
insert into public.user_data(user_id,data) values
  (auth.uid(),'{"catedra:sim":"{\"acertos\":3}","catedra:sessions":"[{},{}]","catedra:edital":[{}]}');
do $$
begin
  update public.user_data set data = data || '{"catedra:sessions":{}}' where user_id = auth.uid();
  raise exception 'F5-ESCRITA: atualização inválida aceita';
exception when check_violation then null;
end $$;
select pg_temp.entrar('40000000-0000-4000-8000-000000000005');
do $$
begin
  insert into public.user_data(user_id,data) values (auth.uid(),'{"catedra:sessions":"[incompleto"}');
  raise exception 'F5-ESCRITA: inserção inválida aceita';
exception when check_violation then null;
end $$;
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select pg_temp.exigir(public.admin_visao_geral()#>>'{recursos,comSessoes}' = '1','F5-GERAL');
select pg_temp.exigir(public.admin_testador('20000000-0000-4000-8000-000000000005')#>>'{conteudo,sessoes}' = '2','F5-SESSOES');
select pg_temp.exigir(public.admin_testador('30000000-0000-4000-8000-000000000005')#>'{conteudo}' @>
  '{"sessoes":0,"edital":2}'::jsonb,'F5-LEGADO');

-- F7-BETA: a última pessoa convidada encerra sua própria conta em um beta fechado.
select pg_temp.exigir(public.admin_config()->'beta_aberto' = 'false'::jsonb,'F7-MODO-INICIAL');
select public.admin_allow_set('convite@teste.invalid',true);
select pg_temp.entrar('40000000-0000-4000-8000-000000000005');
select pg_temp.exigir(public.meu_email_liberado(),'F7-CONVITE');
select public.excluir_minha_conta();
select pg_temp.entrar('20000000-0000-4000-8000-000000000005');
select pg_temp.exigir(not public.meu_email_liberado(),'F7-BETA');
do $$
begin
  perform public.admin_config_set('beta_aberto','true');
  raise exception 'F7-ADMIN: conta comum abriu o beta';
exception when raise_exception then if sqlerrm <> 'acesso_negado' then raise; end if;
end $$;
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select public.admin_config_set('beta_aberto','true');
select pg_temp.entrar('20000000-0000-4000-8000-000000000005');
select pg_temp.exigir(public.meu_email_liberado(),'F7-ABERTO');

-- F8-PASSES: a aluna e a colega usam widgets independentes no mesmo banco.
select pg_temp.entrar('20000000-0000-4000-8000-000000000005','aaaaaaa1-0000-4000-8000-000000000008');
select set_config('regressao.passe_aluna',public.widget_passe_emitir('Mac fictício'),true);
select public.widget_publicar('{"turma":"A"}',1);
select pg_temp.entrar('30000000-0000-4000-8000-000000000005','aaaaaaa2-0000-4000-8000-000000000008');
select set_config('regressao.passe_colega',public.widget_passe_emitir('iPad fictício'),true);
select public.widget_publicar('{"turma":"B"}',1);
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select pg_temp.exigir(public.admin_desconectar('20000000-0000-4000-8000-000000000005') =
  '{"sessoes":1,"passesRevogados":1}'::jsonb,'F8-CONTAGEM');
set local role anon;
select pg_temp.exigir(public.widget_ler(current_setting('regressao.passe_aluna')) is null,'F8-REVOGADO');
select pg_temp.exigir(public.widget_ler(current_setting('regressao.passe_colega'))#>>'{resumo,turma}' = 'B','F8-OUTRA-CONTA');
set local role authenticated;
select pg_temp.entrar('20000000-0000-4000-8000-000000000005','aaaaaaa1-0000-4000-8000-000000000008');
do $$
begin
  perform public.widget_passe_emitir('sessão encerrada');
  raise exception 'F8-SESSAO: passe emitido sem sessão ativa';
exception when raise_exception then if sqlerrm <> 'sessao_inativa' then raise; end if;
end $$;

-- F11-TETO: o mesmo dia pode chegar em vários lotes legítimos durante o uso offline.
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select public.admin_config_set('telemetria','false');
select pg_temp.entrar('30000000-0000-4000-8000-000000000005');
select pg_temp.exigir(not public.registrar_uso_telas(current_date,'{"inicio":1}'),'F11-DESLIGADA');
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select public.admin_config_set('telemetria','true');
select pg_temp.entrar('30000000-0000-4000-8000-000000000005');
select public.registrar_uso_telas(current_date,'{"inicio":350,"tela-desconhecida":2}');
select public.registrar_uso_telas(current_date,'{"inicio":200}');
select pg_temp.exigir(public.registrar_uso_telas(current_date-1,'{"legis":10}'),'F11-OFFLINE');
select pg_temp.exigir(not public.registrar_uso_telas(current_date+1,'{"inicio":1}'),'F11-DATA-FUTURA');
select pg_temp.exigir(not public.registrar_uso_telas(current_date-10,'{"inicio":1}'),'F11-DATA-ANTERIOR');
reset role;
-- Linhas antigas já gravadas também precisam respeitar a janela e o teto na visão administrativa.
insert into public.uso_telas(user_id,dia,tela,n) values
  ('20000000-0000-4000-8000-000000000005',current_date,'inicio',750),
  ('20000000-0000-4000-8000-000000000005',current_date+1,'inicio',12);
select pg_temp.exigir((select n = 500 from public.uso_telas where user_id = '30000000-0000-4000-8000-000000000005' and dia = current_date and tela = 'inicio'),'F11-TETO');
select pg_temp.exigir(not exists(select 1 from public.uso_telas where tela = 'tela-desconhecida'),'F11-TELA');
set local role authenticated;
select pg_temp.entrar('10000000-0000-4000-8000-000000000005');
select pg_temp.exigir(public.admin_uso_telas(7)->'porTela' @> '[{"tela":"inicio","n":1000,"contas":2}]','F11-LEITURA');
select pg_temp.exigir(not exists(select 1 from jsonb_array_elements(public.admin_uso_telas(7)->'porDia') d where (d->>'dia')::date > current_date),'F11-JANELA');

-- F12-AUDITORIA: repetir uma ação sem mudança não duplica o histórico.
select public.admin_bloquear('20000000-0000-4000-8000-000000000005',true,'teste');
select public.admin_bloquear('20000000-0000-4000-8000-000000000005',true,'teste');
select public.admin_bloquear('20000000-0000-4000-8000-000000000005',false,'teste');
select public.admin_allow_set('outro@teste.invalid',true);
select public.admin_allow_set('outro@teste.invalid',true);
select public.admin_allow_set('outro@teste.invalid',false);
select public.admin_apagar_grupo('50000000-0000-4000-8000-000000000012');
select public.admin_apagar_grupo('50000000-0000-4000-8000-000000000012');
select pg_temp.entrar('30000000-0000-4000-8000-000000000005');
do $$
begin
  perform public.admin_bloquear('20000000-0000-4000-8000-000000000005', true, 'teste');
  raise exception 'F12-PAPEL: conta comum bloqueou';
exception when raise_exception then if sqlerrm <> 'acesso_negado' then raise; end if;
end $$;
reset role;
select pg_temp.exigir((select count(*) = 2 from public.admin_log where acao = 'acesso_ia'
  and admin_uid = '10000000-0000-4000-8000-000000000005' and alvo = '20000000-0000-4000-8000-000000000005'),'F12-BLOQUEIO');
select pg_temp.exigir((select count(*) = 2 and count(distinct acao) = 2 from public.admin_log
  where acao in ('incluir_convite','retirar_convite') and alvo = 'outro@teste.invalid'
    and admin_uid = '10000000-0000-4000-8000-000000000005'),'F12-CONVITES');
select pg_temp.exigir((select count(*) = 1 from public.admin_log where acao = 'apagar_grupo'
  and admin_uid = '10000000-0000-4000-8000-000000000005' and alvo = '50000000-0000-4000-8000-000000000012'),'F12-GRUPO');
select pg_temp.exigir(not exists(select 1 from public.admin_log where admin_uid = '30000000-0000-4000-8000-000000000005'),'F12-RECUSADO');
select pg_temp.exigir((select detalhe = '{"sessoes":1,"passesRevogados":1}' from public.admin_log
  where acao = 'desconectar' and alvo = 'aluna@teste.invalid'),'F8-LOG');

rollback;
