-- Exclusão de conta pela própria pessoa (P14 / Termos 10.1 / Política 9 e 11).
-- Uma função só, security definer, que só age sobre auth.uid(): apaga o blob de estudo,
-- sai de todos os grupos (grupo vazio é apagado, como em sair_grupo), remove a atividade
-- publicada nos grupos, o feedback enviado, o registro de uso da IA e o acesso beta, e por
-- fim a própria linha em auth.users. Conta de administração não pode se apagar por aqui.
-- Aplicada no projeto catedraplataforma (frcnfqxniwzdyykvgqqu) em 08/09/2026.
create or replace function public.excluir_minha_conta()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid; res jsonb; n_grupos int := 0; g record;
begin
  uid := auth.uid();
  if uid is null then raise exception 'nao_autenticado'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'admin_nao_pode'; end if;

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

  delete from public.grupo_atividade where user_id = uid;
  delete from public.feedback where user_id = uid;
  delete from public.ai_uso where user_id = uid;
  delete from public.beta_acesso where user_id = uid;
  delete from public.user_data where user_id = uid;

  res := jsonb_build_object('uid', uid, 'grupos', n_grupos, 'quando', now());
  insert into public.admin_log (quando, admin_uid, admin_email, acao, alvo, detalhe)
    values (now(), uid, null, 'conta_excluida_pela_pessoa', uid::text, jsonb_build_object('grupos', n_grupos));

  delete from auth.users where id = uid;
  return res;
end $function$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
