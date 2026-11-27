-- Interesse na venda do Banco de Espelhos (banco-espelhos-venda.html) ao lado da lista do beta (sobre.html).
-- NÃO APLICADA. Aplicar no projeto catedraplataforma é passo da dona, antes de divulgar o link da página.
--
-- O defeito que ela fecha: o índice único em lower(email) e o "return" no duplicado faziam a RPC descartar,
-- em silêncio, o interesse de quem já estava na lista do beta — a página dizia "anotamos" e nada era gravado.
-- E o INSERT gravava origem 'sobre' em tudo, sem separar as páginas.
--
-- Unicidade por finalidade, não por área livre (área vem do cliente; unicidade por e-mail+área deixaria
-- qualquer um criar linhas sem fim trocando p_area): a lista do beta segue com uma linha por e-mail, em
-- qualquer área, como hoje; o interesse no banco ganha no máximo uma linha própria. O teto e o limite por
-- minuto ficam como estavam, e o duplicado segue silencioso (não revela cadastro). Nenhum registro é apagado.
create unique index if not exists lista_espera_beta_email_uidx on public.lista_espera (lower(email)) where area is distinct from 'banco-espelhos';
create unique index if not exists lista_espera_venda_email_uidx on public.lista_espera (lower(email)) where area = 'banco-espelhos';
drop index if exists public.lista_espera_email_uidx;
create or replace function public.entrar_lista_espera(p_email text, p_area text default null)
returns void language plpgsql volatile security definer set search_path to 'public'
as $function$
declare em text := lower(trim(p_email)); venda boolean := coalesce(p_area,'') = 'banco-espelhos'; total bigint; recentes bigint;
begin
  if em is null or em !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(em)>254 or length(coalesce(p_area,''))>60 then raise exception 'valor_invalido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catedra:lista-espera',0));
  select count(*), count(*) filter (where criado_em >= now()-interval '1 minute') into total,recentes from public.lista_espera;
  if total>=10000 or recentes>=60 then raise exception 'lista_temporariamente_indisponivel'; end if;
  -- O limite vale também para duplicados: não revela cadastros quando a fila lota.
  if venda then
    if exists(select 1 from public.lista_espera where lower(email)=em and area = 'banco-espelhos') then return; end if;
  else
    if exists(select 1 from public.lista_espera where lower(email)=em and area is distinct from 'banco-espelhos') then return; end if;
  end if;
  insert into public.lista_espera(email,area,origem)
    values(em, nullif(p_area,''), case when venda then 'banco-de-espelhos' else 'sobre' end);
end $function$;
revoke all on function public.entrar_lista_espera(text,text) from public;
grant execute on function public.entrar_lista_espera(text,text) to anon, authenticated;
