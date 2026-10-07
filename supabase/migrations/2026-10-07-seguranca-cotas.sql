-- Reserva indivisível: complete e tts compartilham a mesma cota por conta/dia.
-- Aplicar ANTES de publicar as funções que chamam reservar_uso_ia.
create or replace function public.reservar_uso_ia(p_endpoint text, p_chars integer)
returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); pl text; lim integer; usadas integer; inicio timestamptz;
begin
  if uid is null then raise exception 'nao_autenticado'; end if;
  if p_endpoint not in ('complete','tts') or p_endpoint is null or p_chars is null or p_chars < 0 or p_chars > 60000 then raise exception 'valor_invalido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catedra:ia:' || uid::text, 0));
  pl := coalesce((select plano from public.ia_plano where user_id = uid), 'beta');
  lim := coalesce((select chamadas_dia from public.ia_cota where plano = pl), (select chamadas_dia from public.ia_cota where plano = 'beta'), 40);
  inicio := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  select count(*) into usadas from public.ai_uso where user_id = uid and criado_em >= inicio;
  if usadas >= lim then
    return jsonb_build_object('reservada', false, 'plano', pl, 'limite', lim, 'usadas', usadas, 'restante', 0);
  end if;
  insert into public.ai_uso(user_id, endpoint, chars) values (uid,p_endpoint,p_chars);
  return jsonb_build_object('reservada', true, 'plano', pl, 'limite', lim, 'usadas', usadas+1, 'restante', greatest(lim-usadas-1,0));
end $function$;
revoke all on function public.reservar_uso_ia(text, integer) from public, anon;
grant execute on function public.reservar_uso_ia(text, integer) to authenticated;
-- Clientes antigos continuam compatíveis, mas não podem inundar ai_uso fora da cota.
create or replace function public.registrar_uso_ia(p_endpoint text, p_chars integer)
returns void language plpgsql security definer set search_path to 'public'
as $function$ begin perform public.reservar_uso_ia(p_endpoint,p_chars); end $function$;
