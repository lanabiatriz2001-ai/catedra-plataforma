-- Exclusão de conta pela própria pessoa, versão 2: "Excluir minha conta" passa a apagar TUDO o que
-- é da pessoa no servidor, como prometem Ajustes ("apaga o cadastro e todos os dados de estudo, na
-- nuvem"), o confirm ("apaga TUDO") e a Política 9.2.
--
-- O que a versão 1 (2026-09-08-excluir-minha-conta.sql) deixava para trás, sem prazo:
--   · erros_cliente e uso_telas (telemetria P17): sem FK para auth.users, ficavam órfãs;
--   · ia_plano (cota de IA P18): sem FK, ficava órfã;
--   · beta_allow: o e-mail continuava na allowlist da IA;
--   · grupos.criador: o uid continuava como criador dos grupos.
-- Telemetria e plano de IA são APAGADOS, não anonimizados.
--
-- Este arquivo é idempotente (pode rodar de novo) e não mexe nas migrações antigas. Tem três partes,
-- que o roteiro docs/aplicar-exclusao-conta-2026-09-25.md manda rodar UMA DE CADA VEZ no SQL Editor:
--   (A1) limpeza de órfãos — DESTRUTIVA;
--   (A2) FKs em cascata (not valid) + índice;  (A3) validação das FKs;
--   (B)  a função nova.
-- Merge deste arquivo NÃO conserta nada sozinho: o defeito só fecha quando ele for aplicado no
-- Supabase vivo (catedraplataforma, frcnfqxniwzdyykvgqqu) e a fumaça do roteiro passar.


-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- (A1) LIMPEZA DE ÓRFÃOS — DESTRUTIVA E IRREVERSÍVEL.
-- Apaga, nas três tabelas sem FK, as linhas cujo user_id já não existe em auth.users. Sem isso a FK
-- da parte (A2) não valida. Em erros_cliente e uso_telas todo user_id nasceu de auth.uid(): órfão só
-- pode ser de conta excluída. Em ia_plano pode haver uid digitado errado à mão no SQL Editor, que
-- também é lixo. Rode ANTES os `select count(*)` do roteiro e só siga com o sim da dona.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.erros_cliente') is not null then
    delete from public.erros_cliente e
     where not exists (select 1 from auth.users u where u.id = e.user_id);
  end if;
  if to_regclass('public.uso_telas') is not null then
    delete from public.uso_telas t
     where not exists (select 1 from auth.users u where u.id = t.user_id);
  end if;
  if to_regclass('public.ia_plano') is not null then
    delete from public.ia_plano p
     where not exists (select 1 from auth.users u where u.id = p.user_id);
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- (A2) FKs `references auth.users(id) on delete cascade`.
-- Cobrem o que a função não alcança: o caminho da administração (admin_apagar_usuario), a telemetria
-- que já estava em voo quando a conta caiu (o token segue válido por alguns minutos e o insert
-- atrasado passa a falhar com 23503 em vez de recriar linha) e um admin_ia_plano_set com uid
-- inexistente. `not valid` encurta o bloqueio de auth.users (o login grava last_sign_in_at nela);
-- a validação vem em (A3), em comando separado.
-- Índice: a PK de uso_telas já começa por user_id e a de ia_plano é o próprio user_id; só
-- erros_cliente precisa de índice para a cascata não varrer a tabela.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.erros_cliente') is not null then
    if not exists (select 1 from pg_constraint
                    where conname = 'erros_cliente_user_fk'
                      and conrelid = to_regclass('public.erros_cliente')) then
      alter table public.erros_cliente add constraint erros_cliente_user_fk foreign key (user_id) references auth.users (id) on delete cascade not valid;
    end if;
    create index if not exists erros_cliente_user_idx on public.erros_cliente (user_id);
  end if;

  if to_regclass('public.uso_telas') is not null then
    if not exists (select 1 from pg_constraint
                    where conname = 'uso_telas_user_fk'
                      and conrelid = to_regclass('public.uso_telas')) then
      alter table public.uso_telas add constraint uso_telas_user_fk foreign key (user_id) references auth.users (id) on delete cascade not valid;
    end if;
  end if;

  if to_regclass('public.ia_plano') is not null then
    if not exists (select 1 from pg_constraint
                    where conname = 'ia_plano_user_fk'
                      and conrelid = to_regclass('public.ia_plano')) then
      alter table public.ia_plano add constraint ia_plano_user_fk foreign key (user_id) references auth.users (id) on delete cascade not valid;
    end if;
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- (A3) Validação das FKs. Validar uma FK já válida não faz nada, então rodar de novo é seguro.
-- Se falhar com 23503, sobrou órfão (a parte A1 não rodou, ou entrou linha nova entre A1 e A3):
-- rode A1 de novo e depois A3.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.erros_cliente') is not null
     and exists (select 1 from pg_constraint where conname = 'erros_cliente_user_fk' and conrelid = to_regclass('public.erros_cliente')) then
    alter table public.erros_cliente validate constraint erros_cliente_user_fk;
  end if;
  if to_regclass('public.uso_telas') is not null
     and exists (select 1 from pg_constraint where conname = 'uso_telas_user_fk' and conrelid = to_regclass('public.uso_telas')) then
    alter table public.uso_telas validate constraint uso_telas_user_fk;
  end if;
  if to_regclass('public.ia_plano') is not null
     and exists (select 1 from pg_constraint where conname = 'ia_plano_user_fk' and conrelid = to_regclass('public.ia_plano')) then
    alter table public.ia_plano validate constraint ia_plano_user_fk;
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- (B) A FUNÇÃO. Mesma assinatura, mesmo retorno jsonb, mesmos revoke/grant: o app (auth.js) não muda.
-- Ordem que importa:
--   1. travas (nao_autenticado, admin_nao_pode) antes de qualquer escrita;
--   2. o e-mail é lido de auth.users ANTES dos deletes (sem ele o delete de beta_allow fica mudo);
--   3. grupos: sai de todos (grupo vazio é apagado) e deixa de ser criadora;
--   4. os deletes por user_id; os das tabelas criadas só em migração vão com guarda to_regclass —
--      sem ela, um banco sem a tabela quebraria a função na hora de rodar e NINGUÉM conseguiria
--      excluir a conta, o que é pior que o órfão (obrigação legal, Política 9.2). Os deletes são
--      redundantes com a cascata de (A2), mas protegem um banco em que (A2) ainda não rodou;
--   5. a trilha em admin_log ('versao', 2);
--   6. auth.users por último.
-- FICAM, de propósito:
--   · admin_log — trilha de auditoria (Política §2 e §3, 12 meses); a própria exclusão grava nela;
--   · admins — a trava admin_nao_pode impede conta de administração de chegar aqui;
--   · lista_espera — DECISÃO DA DONA, ainda em aberto: o cadastro veio da página pública (sobre.html),
--     antes da conta e sem vínculo com ela. Se ela decidir apagar, a linha é
--       if to_regclass('public.lista_espera') is not null and em is not null then
--         delete from public.lista_espera where lower(email) = lower(em); end if;
--     e o teste tests/exclusao-conta-cobertura.mjs tira lista_espera da lista de RETIDAS.
-- ════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.excluir_minha_conta()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid; em text; res jsonb; n_grupos int := 0; g record;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'admin_nao_pode'; end if;

  select email into em from auth.users where id = uid;

  for g in select id from public.grupos where membros @> jsonb_build_array(jsonb_build_object('uid', uid::text)) loop
    update public.grupos
       set membros = (
         select coalesce(jsonb_agg(m order by ord), '[]'::jsonb)
         from jsonb_array_elements(membros) with ordinality as t(m, ord)
         where m->>'uid' is distinct from uid::text
       )
     where id = g.id;
    delete from public.grupos where id = g.id and jsonb_array_length(membros) = 0;
    n_grupos := n_grupos + 1;
  end loop;
  update public.grupos set criador = null where criador = uid;

  delete from public.grupo_atividade where user_id = uid;
  delete from public.feedback where user_id = uid;
  delete from public.ai_uso where user_id = uid;
  delete from public.beta_acesso where user_id = uid;
  delete from public.user_data where user_id = uid;
  if to_regclass('public.erros_cliente') is not null then delete from public.erros_cliente where user_id = uid; end if;
  if to_regclass('public.uso_telas') is not null then delete from public.uso_telas where user_id = uid; end if;
  if to_regclass('public.ia_plano') is not null then delete from public.ia_plano where user_id = uid; end if;
  if em is not null then delete from public.beta_allow where lower(email) = lower(em); end if;

  res := jsonb_build_object('uid', uid, 'grupos', n_grupos, 'quando', now());
  insert into public.admin_log (quando, admin_uid, admin_email, acao, alvo, detalhe)
    values (now(), uid, null, 'conta_excluida_pela_pessoa', uid::text, jsonb_build_object('grupos', n_grupos, 'versao', 2));

  delete from auth.users where id = uid;
  return res;
end $function$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
