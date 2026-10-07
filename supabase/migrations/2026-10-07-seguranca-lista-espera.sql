-- Entrada pública com armazenamento limitado, sem leitura dos e-mails.
-- Preparar a função antes de publicar sobre.html; cortar o INSERT direto depois.
-- A aplicação integral é o corte final. Nenhum registro existente é apagado.
drop policy if exists lista_espera_insert_anon on public.lista_espera;
revoke insert on public.lista_espera from anon, authenticated;
revoke insert (email, area, origem) on public.lista_espera from anon, authenticated;
create or replace function public.entrar_lista_espera(p_email text, p_area text default null)
returns void language plpgsql volatile security definer set search_path to 'public'
as $function$
declare em text := lower(trim(p_email)); total bigint; recentes bigint;
begin
  if em is null or em !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(em)>254 or length(coalesce(p_area,''))>60 then raise exception 'valor_invalido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catedra:lista-espera',0));
  select count(*), count(*) filter (where criado_em >= now()-interval '1 minute') into total,recentes from public.lista_espera;
  if total>=10000 or recentes>=60 then raise exception 'lista_temporariamente_indisponivel'; end if;
  -- O limite vale também para duplicados: não revela cadastros quando a fila lota.
  if exists(select 1 from public.lista_espera where lower(email)=em) then return; end if;
  insert into public.lista_espera(email,area,origem) values(em,nullif(p_area,''),'sobre');
end $function$;
revoke all on function public.entrar_lista_espera(text,text) from public;
grant execute on function public.entrar_lista_espera(text,text) to anon, authenticated;
