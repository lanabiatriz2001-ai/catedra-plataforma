-- Pedido de aviso de venda do Banco de Espelhos: ler, apagar depois do envio, apagar sem envio (venda cancelada ou
-- prazo-limite) e atender a remoção a pedido — sempre pela administração e com registro em admin_log.
-- NÃO APLICADA. Aplicar no catedraplataforma DEPOIS de 2026-11-25-lista-espera-interesse-venda.sql (é ela que separa
-- as duas listas por índice parcial). Decisão da dona; preparada na revisão adversarial da Política 1.3 (25/11/2026).
--
-- Por que existe: a Política 1.3 promete que o pedido de aviso de venda é apagado depois do envio ou se a venda for
-- cancelada (§3 e §9.5), e a §10.1 diz que as ações administrativas ficam na trilha de auditoria. Sem estas funções,
-- cumprir a promessa dependeria de um DELETE escrito à mão no editor, sem trilha, e um delete só por e-mail tiraria a
-- pessoa também da lista do beta.
--
-- Decisões de desenho:
--   · admin_lista_espera (a leitura da lista do beta) deixa de devolver os pedidos de aviso de venda: os dados de uma
--     lista não servem à outra (Política 1.3, frase depois da tabela da §3);
--   · apagar depois do envio é pelos ids LIDOS, não por data: quem pediu depois da leitura não perde o aviso, e um
--     corte de linhas na leitura não apaga quem ficou de fora;
--   · nada disso entra em entrar_lista_espera, que roda como anon, sem trilha.
--
-- Uso pelo editor SQL, em transações separadas. Cada uma começa com
--   select set_config('request.jwt.claims', '{"sub":"<uid da conta de administração>","role":"authenticated"}', true);
-- para que auth.uid() seja a conta de administração (is_admin() e a trilha dependem dele).
--   1. select id, email from public.admin_aviso_venda();                       -- lê (fica na trilha)
--   2. enviar o aviso a esses endereços, uma mensagem por pessoa (nunca a lista em Para ou Cc);
--   3. select public.admin_aviso_venda_apagar(array[<ids lidos>]::bigint[]);  -- apaga os que receberam
--   Venda cancelada ou prazo-limite: select public.admin_aviso_venda_expirar(now());
--   Remoção a pedido (§9.5):          select public.admin_lista_espera_remover('<e-mail>', true);   -- false = lista do beta

create or replace function public.admin_lista_espera()
returns setof public.lista_espera language sql stable security definer set search_path to 'public'
as $$ select * from public.lista_espera where public.is_admin() and area is distinct from 'banco-espelhos' order by criado_em desc; $$;
revoke all on function public.admin_lista_espera() from public, anon;
grant execute on function public.admin_lista_espera() to authenticated;

create or replace function public.admin_aviso_venda()
returns setof public.lista_espera language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  perform public._admin_log('ler_aviso_venda', 'banco-espelhos', null);
  return query select * from public.lista_espera where area = 'banco-espelhos' order by id;
end $$;
revoke all on function public.admin_aviso_venda() from public, anon;
grant execute on function public.admin_aviso_venda() to authenticated;

create or replace function public.admin_aviso_venda_apagar(p_ids bigint[])
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.lista_espera where area = 'banco-espelhos' and id = any(coalesce(p_ids, '{}'::bigint[]));
  get diagnostics n = row_count;
  perform public._admin_log('apagar_aviso_venda', 'enviados', jsonb_build_object('linhas', n));
  return jsonb_build_object('linhas', n);
end $$;
revoke all on function public.admin_aviso_venda_apagar(bigint[]) from public, anon;
grant execute on function public.admin_aviso_venda_apagar(bigint[]) to authenticated;

create or replace function public.admin_aviso_venda_expirar(p_ate timestamptz)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_ate is null then raise exception 'valor_invalido'; end if;
  delete from public.lista_espera where area = 'banco-espelhos' and criado_em <= p_ate;
  get diagnostics n = row_count;
  perform public._admin_log('expirar_aviso_venda', p_ate::text, jsonb_build_object('linhas', n));
  return jsonb_build_object('linhas', n);
end $$;
revoke all on function public.admin_aviso_venda_expirar(timestamptz) from public, anon;
grant execute on function public.admin_aviso_venda_expirar(timestamptz) to authenticated;

create or replace function public.admin_lista_espera_remover(p_email text, p_venda boolean)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.lista_espera where lower(email) = lower(trim(p_email))
    and case when coalesce(p_venda, false) then area = 'banco-espelhos' else area is distinct from 'banco-espelhos' end;
  get diagnostics n = row_count;
  perform public._admin_log(case when coalesce(p_venda, false) then 'remover_aviso_venda' else 'remover_lista_espera' end,
    lower(trim(p_email)), jsonb_build_object('linhas', n));
  return jsonb_build_object('linhas', n);
end $$;
revoke all on function public.admin_lista_espera_remover(text, boolean) from public, anon;
grant execute on function public.admin_lista_espera_remover(text, boolean) to authenticated;
