-- Casos das funções do widget (2026-10-01-widget.sql). Rodar no SQL Editor ou pelo execute_sql do MCP DEPOIS
-- de aplicar a migração. Tudo acontece dentro de um bloco que TERMINA EM ERRO de propósito: o Postgres desfaz
-- tudo, e o resultado vem na mensagem ("RESULTADO: W1 ok; …"). Nada fica gravado. Precisa de duas contas em auth.users.
do $$
declare u1 uuid; u2 uuid; p1 text; p2 text; ok boolean; j jsonb; n int; res text := ''; i int;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users where id <> u1 order by created_at limit 1;
  if u2 is null then raise exception 'precisa de duas contas em auth.users'; end if;
  -- As duas contas podem já ter resumo: limpa para os casos partirem do zero (desfeito pelo desfazer final, por erro).
  delete from public.widget_resumo where user_id in (u1, u2);

  perform set_config('request.jwt.claims', json_build_object('sub', u1)::text, true);
  ok := public.widget_publicar('{"v":1,"x":1}'::jsonb, 1000);
  res := res || case when ok then 'W1 ok; ' else 'W1 FALHOU; ' end;
  ok := public.widget_publicar('{"v":1,"x":2}'::jsonb, 999);
  select resumo into j from public.widget_resumo where user_id = u1;
  res := res || case when not ok and j->>'x' = '1' then 'W2 ok; ' else 'W2 FALHOU (carimbo velho gravou); ' end;
  ok := public.widget_publicar('{"v":1,"x":3}'::jsonb, 1000);
  select resumo into j from public.widget_resumo where user_id = u1;
  res := res || case when ok and j->>'x' = '3' then 'W3 ok; ' else 'W3 FALHOU (mesmo carimbo não regravou); ' end;
  begin
    perform public.widget_publicar(jsonb_build_object('t', repeat('a', 70000)), 2000);
    res := res || 'W4 FALHOU (aceitou > 64 KB); ';
  exception when others then
    res := res || case when sqlerrm = 'resumo_grande' then 'W4 ok; ' else 'W4 FALHOU (' || sqlerrm || '); ' end;
  end;
  begin
    perform public.widget_publicar('{"v":1,"x":9}'::jsonb, (extract(epoch from now()) * 1000)::bigint + 86400000);
    res := res || 'W4b FALHOU (aceitou carimbo 1 dia no futuro); ';
  exception when others then
    res := res || case when sqlerrm = 'carimbo_futuro' then 'W4b ok; ' else 'W4b FALHOU (' || sqlerrm || '); ' end;
  end;

  p1 := public.widget_passe_emitir('Mac de teste');
  j := public.widget_ler(p1);
  res := res || case when (j->'resumo'->>'x') = '3' and (j->>'carimbo')::bigint = 1000 then 'W5 ok; ' else 'W5 FALHOU (' || coalesce(j::text, 'null') || '); ' end;
  res := res || case when public.widget_ler('passe-que-nao-existe-0000000000') is null then 'W6 ok; ' else 'W6 FALHOU; ' end;

  perform set_config('request.jwt.claims', json_build_object('sub', u2)::text, true);
  p2 := public.widget_passe_emitir('iPad de teste');
  j := public.widget_ler(p2);
  res := res || case when j->'resumo' = 'null'::jsonb then 'W7 ok; ' else 'W7 FALHOU (passe de outra conta leu: ' || j::text || '); ' end;
  ok := public.widget_passe_revogar(p1);
  res := res || case when not ok and public.widget_ler(p1) is not null then 'W8 ok; ' else 'W8 FALHOU (revogou passe alheio); ' end;

  perform set_config('request.jwt.claims', json_build_object('sub', u1)::text, true);
  ok := public.widget_passe_revogar(p1);
  res := res || case when ok and public.widget_ler(p1) is null then 'W9 ok; ' else 'W9 FALHOU; ' end;
  for i in 1..11 loop perform public.widget_passe_emitir('aparelho ' || i); end loop;
  n := public.widget_passes_ativos();
  res := res || case when n = 10 then 'W10 ok; ' else 'W10 FALHOU (' || n || ' ativos); ' end;
  n := public.widget_passe_revogar_todos();
  res := res || case when n = 10 and public.widget_passes_ativos() = 0 then 'W11 ok; ' else 'W11 FALHOU; ' end;

  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.widget_publicar('{"v":1}'::jsonb, 5000);
    res := res || 'W12 FALHOU (anônimo publicou); ';
  exception when others then
    res := res || case when sqlerrm = 'nao_autenticado' then 'W12 ok; ' else 'W12 FALHOU (' || sqlerrm || '); ' end;
  end;

  raise exception 'RESULTADO: %', res;
end $$;
