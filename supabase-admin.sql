-- ============================================================================
-- Cátedra · Painel de administrador (só a dona acessa)
-- ----------------------------------------------------------------------------
-- ESPELHO do que está aplicado em produção (frcnfqxniwzdyykvgqqu), regenerado a
-- partir das definições reais do banco (pg_get_functiondef). Rode no SQL Editor
-- como postgres.
--
-- MODELO DE SEGURANÇA: "só a dona" vale no SERVIDOR. Cada RPC de admin começa
-- checando is_admin() e FALHA COM EXCEÇÃO se não for admin — nunca devolve vazio
-- (vazio é indistinguível de "não tem dado" e esconderia erro de configuração).
-- Esconder o item do menu no cliente é só conveniência.
--
-- Por que uma TABELA de admins e não o metadata do JWT: o próprio usuário escreve
-- no user_metadata dele via supabase.auth.updateUser — confiar nisso deixaria
-- qualquer um se promover. A tabela só é escrita por quem tem acesso ao banco.
--
-- LIMITE DE PRIVACIDADE: o painel NÃO devolve conteúdo de estudo (texto de
-- anotação, redação, caderno de erros). Só agregados: contagens, tamanhos, datas
-- e uso de IA. auth.users fornece e-mail/datas (a dona convidou os testadores).
-- ============================================================================

-- ── TABELAS ─────────────────────────────────────────────────────────────────

-- Quem é admin. RLS ligada, ZERO grant direto — só as funções definer a leem.
create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
-- BOOTSTRAP (troque o uuid pela conta admin):
--   insert into public.admins(user_id) values ('<uuid>') on conflict do nothing;

-- Acesso ao beta: pausar a IA de uma conta.
create table if not exists public.beta_acesso (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  bloqueado     boolean not null default false,
  motivo        text,
  atualizado_em timestamptz not null default now()
);
alter table public.beta_acesso enable row level security;
revoke all on table public.beta_acesso from anon, authenticated;

-- Caixa de bugs/feedback (com status e nota interna — mini-quadro de tarefas).
create table if not exists public.feedback (
  id        bigint generated always as identity primary key,
  user_id   uuid references auth.users(id) on delete set null,
  email     text,
  mensagem  text not null,
  contexto  jsonb,
  lido      boolean not null default false,
  status    text not null default 'novo',   -- novo | andamento | resolvido
  nota_admin text,
  criado_em timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;
alter table public.feedback add column if not exists status text not null default 'novo';
alter table public.feedback add column if not exists nota_admin text;

-- Log de uso de IA (uma linha por chamada) — base das métricas de custo do painel.
create table if not exists public.ai_uso (
  id        bigint generated always as identity primary key,
  user_id   uuid references auth.users(id) on delete set null,
  endpoint  text,          -- 'complete' | 'tts'
  chars     int,
  criado_em timestamptz not null default now()
);
alter table public.ai_uso enable row level security;
revoke all on table public.ai_uso from anon, authenticated;
create index if not exists ai_uso_criado_idx on public.ai_uso (criado_em);
create index if not exists ai_uso_user_idx   on public.ai_uso (user_id);

-- Allowlist do beta (gerida pelo painel). Vazia = qualquer conta autenticada entra.
create table if not exists public.beta_allow (
  email     text primary key,
  criado_em timestamptz not null default now()
);
alter table public.beta_allow enable row level security;
revoke all on table public.beta_allow from anon, authenticated;

-- ── FUNÇÕES DO USUÁRIO (checadas pela API com o token da própria conta) ──────

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- ATENÇÃO: esta é a versão 1. O CONSOLE (v2), no fim do arquivo, REDEFINE esta
-- função para somar o kill switch global da IA ao bloqueio individual. Rodando o
-- arquivo de cima para baixo, a definição de lá é a que fica — que é a de produção.
create or replace function public.meu_acesso_bloqueado()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select bloqueado from public.beta_acesso where user_id = auth.uid()), false); $$;
revoke all on function public.meu_acesso_bloqueado() from public, anon;
grant  execute on function public.meu_acesso_bloqueado() to authenticated;

-- Lista vazia => libera todo mundo (mantém o beta aberto).
create or replace function public.meu_email_liberado()
returns boolean language plpgsql stable security definer set search_path to 'public'
as $$
declare em text; tem int;
begin
  select count(*) into tem from public.beta_allow;
  if tem = 0 then return true; end if;
  select email into em from auth.users where id = auth.uid();
  return exists(select 1 from public.beta_allow where lower(email) = lower(em));
end $$;
revoke all on function public.meu_email_liberado() from public, anon;
grant  execute on function public.meu_email_liberado() to authenticated;

create or replace function public.registrar_uso_ia(p_endpoint text, p_chars int)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null then return; end if;  -- silencioso: log não pode quebrar a IA
  insert into public.ai_uso(user_id, endpoint, chars)
  values (auth.uid(), left(coalesce(p_endpoint,'?'),20), greatest(0, coalesce(p_chars,0)));
end $$;
revoke all on function public.registrar_uso_ia(text, int) from public, anon;
grant  execute on function public.registrar_uso_ia(text, int) to authenticated;

create or replace function public.enviar_feedback(p_mensagem text, p_contexto jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare em text;
begin
  if auth.uid() is null then raise exception 'nao_autenticado'; end if;
  if coalesce(trim(p_mensagem), '') = '' then raise exception 'vazio'; end if;
  select email into em from auth.users where id = auth.uid();
  insert into public.feedback(user_id, email, mensagem, contexto)
  values (auth.uid(), em, left(p_mensagem, 4000),
          case when p_contexto is null then null else jsonb_strip_nulls(p_contexto) end);
end $$;
revoke all on function public.enviar_feedback(text, jsonb) from public, anon;
grant  execute on function public.enviar_feedback(text, jsonb) to authenticated;

-- ── FUNÇÕES DE ADMIN (a 1ª linha SEMPRE checa is_admin()) ────────────────────

-- helper: parseia o valor jsonb-string e conta o array (0 se não for array). SÓ contagem.
create or replace function public._cta(d jsonb, k text)
returns int language sql immutable set search_path to 'public'
as $$ select case when (d->>k) ~ '^\[' then jsonb_array_length((d->>k)::jsonb) else 0 end $$;

-- Visão geral: saúde + uso de recursos + crescimento + retenção + IA + testadores.
create or replace function public.admin_visao_geral()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'geradoEm', now(),
    'saude', (select jsonb_build_object(
        'contas',        count(*),
        'confirmados',   count(*) filter (where email_confirmed_at is not null),
        'ativos7d',      count(*) filter (where last_sign_in_at > now()-interval '7 days'),
        'ativos30d',     count(*) filter (where last_sign_in_at > now()-interval '30 days'),
        'nuncaVoltaram', count(*) filter (where last_sign_in_at is null or last_sign_in_at < created_at + interval '1 day')
      ) from auth.users where email not like '%@catedra.app'),
    'recursos', (select jsonb_build_object(
        'comEdital',    count(*) filter (where public._cta(data,'catedra:edital')  > 0),
        'comSessoes',   count(*) filter (where public._cta(data,'catedra:sessions')> 0),
        'comRedacao',   count(*) filter (where public._cta(data,'catedra:red')     > 0),
        'comSimulados', count(*) filter (where public._cta(data,'catedra:sim')     > 0),
        'comAnki',      count(*) filter (where public._cta(data,'catedra:fc')      > 0),
        'comErros',     count(*) filter (where public._cta(data,'catedra:errors')  > 0),
        'comRevisoes',  count(*) filter (where public._cta(data,'catedra:reviews') > 0),
        'comMetas',     count(*) filter (where public._cta(data,'catedra:metas')   > 0),
        'comGrupos',    (select count(distinct (m->>'uid')) from public.grupos, jsonb_array_elements(membros) m)
      ) from public.user_data),
    'crescimento', (select coalesce(jsonb_agg(jsonb_build_object('semana', s, 'cadastros', c) order by s),'[]'::jsonb)
        from (select date_trunc('week', created_at)::date s, count(*) c
              from auth.users where email not like '%@catedra.app' and created_at > now()-interval '6 weeks'
              group by 1) g),
    'retencao', (select jsonb_build_object(
        'voltaram',  count(*) filter (where last_sign_in_at > created_at + interval '1 day'),
        'total',     count(*)
      ) from auth.users where email not like '%@catedra.app'),
    'ia', (select jsonb_build_object(
        'chamadasTotal', count(*),
        'chamadas7d',    count(*) filter (where criado_em > now()-interval '7 days'),
        'chamadasHoje',  count(*) filter (where criado_em > date_trunc('day', now())),
        'contasUsaram',  count(distinct user_id)
      ) from public.ai_uso),
    'testadores', (select coalesce(jsonb_agg(t order by (t->>'ultimoLogin') desc nulls last),'[]'::jsonb)
      from (
        select jsonb_build_object(
          'uid', u.id, 'email', u.email, 'criadoEm', u.created_at,
          'ultimoLogin', u.last_sign_in_at, 'ultimaSync', d.updated_at,
          'confirmado', (u.email_confirmed_at is not null),
          'bloqueado', coalesce(b.bloqueado,false), 'admin', (a.user_id is not null),
          'nSessoes', public._cta(d.data,'catedra:sessions'),
          'nDiscEdital', public._cta(d.data,'catedra:edital'),
          'blobKb', case when d.data is null then 0 else round(pg_column_size(d.data)/1024.0,1) end
        ) t
        from auth.users u
        left join public.user_data d on d.user_id=u.id
        left join public.beta_acesso b on b.user_id=u.id
        left join public.admins a on a.user_id=u.id
        where u.email not like '%@catedra.app'
      ) s)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_visao_geral() from public, anon;
grant  execute on function public.admin_visao_geral() to authenticated;

-- Drill-down de um testador (agregado; sem conteúdo de estudo).
create or replace function public.admin_testador(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'uid', u.id, 'email', u.email,
    'criadoEm', u.created_at, 'ultimoLogin', u.last_sign_in_at,
    'confirmado', (u.email_confirmed_at is not null),
    'ultimaSync', d.updated_at,
    'bloqueado', coalesce(b.bloqueado,false), 'motivoBloqueio', b.motivo,
    'admin', (a.user_id is not null),
    'blobKb', case when d.data is null then 0 else round(pg_column_size(d.data)/1024.0,1) end,
    'conteudo', jsonb_build_object(
      'edital',    public._cta(d.data,'catedra:edital'),
      'sessoes',   public._cta(d.data,'catedra:sessions'),
      'revisoes',  public._cta(d.data,'catedra:reviews'),
      'flashcards',public._cta(d.data,'catedra:fc'),
      'redacoes',  public._cta(d.data,'catedra:red'),
      'simulados', public._cta(d.data,'catedra:sim'),
      'erros',     public._cta(d.data,'catedra:errors'),
      'metas',     public._cta(d.data,'catedra:metas'),
      'eventos',   public._cta(d.data,'catedra:eventos')
    ),
    'grupos', (select count(*) from public.grupos g where g.membros @> jsonb_build_array(jsonb_build_object('uid', u.id::text))),
    'ia', (select jsonb_build_object(
        'total', count(*), 'ultimos7d', count(*) filter (where criado_em > now()-interval '7 days'),
        'ultimoUso', max(criado_em)
      ) from public.ai_uso where user_id = u.id)
  ) into res
  from auth.users u
  left join public.user_data d on d.user_id=u.id
  left join public.beta_acesso b on b.user_id=u.id
  left join public.admins a on a.user_id=u.id
  where u.id = p_uid;
  if res is null then raise exception 'nao_encontrado'; end if;
  return res;
end $$;
revoke all on function public.admin_testador(uuid) from public, anon;
grant  execute on function public.admin_testador(uuid) to authenticated;

-- Uso de IA detalhado (série por dia + top contas + por endpoint).
create or replace function public.admin_uso_ia()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'porDia', (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'chamadas', c, 'chars', ch) order by dia),'[]'::jsonb)
        from (select date_trunc('day', criado_em)::date dia, count(*) c, coalesce(sum(chars),0) ch
              from public.ai_uso where criado_em > now()-interval '14 days' group by 1) s),
    'porConta', (select coalesce(jsonb_agg(jsonb_build_object('email', em, 'chamadas', c) order by c desc),'[]'::jsonb)
        from (select coalesce(u.email,'(conta removida)') em, count(*) c
              from public.ai_uso x left join auth.users u on u.id=x.user_id group by 1 order by 2 desc limit 20) s),
    'total', (select count(*) from public.ai_uso),
    'porEndpoint', (select coalesce(jsonb_object_agg(coalesce(endpoint,'?'), c),'{}'::jsonb)
        from (select endpoint, count(*) c from public.ai_uso group by 1) s)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_uso_ia() from public, anon;
grant  execute on function public.admin_uso_ia() to authenticated;

-- Moderação da comunidade: listar e apagar grupos.
create or replace function public.admin_grupos()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'nome', g.nome, 'codigo', g.codigo, 'criadoEm', g.criado_em,
      'nMembros', jsonb_array_length(g.membros),
      'criador', (select email from auth.users where id = g.criador),
      'membros', (select coalesce(jsonb_agg(m->>'nome'),'[]'::jsonb) from jsonb_array_elements(g.membros) m)
    ) order by g.criado_em desc),'[]'::jsonb) into res
  from public.grupos g;
  return res;
end $$;
revoke all on function public.admin_grupos() from public, anon;
grant  execute on function public.admin_grupos() to authenticated;

create or replace function public.admin_apagar_grupo(p_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.grupos where id = p_id;   -- a FK do ranking cai em cascata
end $$;
revoke all on function public.admin_apagar_grupo(uuid) from public, anon;
grant  execute on function public.admin_apagar_grupo(uuid) to authenticated;

-- Feedback: listar, marcar lido, e definir status + nota.
create or replace function public.admin_feedback()
returns setof public.feedback language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  return query select * from public.feedback order by criado_em desc limit 200;
end $$;
revoke all on function public.admin_feedback() from public, anon;
grant  execute on function public.admin_feedback() to authenticated;

create or replace function public.admin_marcar_feedback(p_id bigint, p_lido boolean)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  update public.feedback set lido = coalesce(p_lido, true) where id = p_id;
end $$;
revoke all on function public.admin_marcar_feedback(bigint, boolean) from public, anon;
grant  execute on function public.admin_marcar_feedback(bigint, boolean) to authenticated;

create or replace function public.admin_feedback_set(p_id bigint, p_status text, p_nota text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  update public.feedback
     set status = coalesce(nullif(trim(p_status),''), status),
         nota_admin = p_nota,
         lido = true
   where id = p_id;
end $$;
revoke all on function public.admin_feedback_set(bigint, text, text) from public, anon;
grant  execute on function public.admin_feedback_set(bigint, text, text) to authenticated;

-- Bloquear/liberar a IA de uma conta. Não dá para se auto-bloquear.
create or replace function public.admin_bloquear(p_user_id uuid, p_bloq boolean, p_motivo text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_user_id = auth.uid() then raise exception 'nao_bloqueie_a_si'; end if;
  insert into public.beta_acesso(user_id, bloqueado, motivo, atualizado_em)
  values (p_user_id, coalesce(p_bloq, false), p_motivo, now())
  on conflict (user_id) do update
    set bloqueado = excluded.bloqueado, motivo = excluded.motivo, atualizado_em = now();
end $$;
revoke all on function public.admin_bloquear(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_bloquear(uuid, boolean, text) to authenticated;

-- Allowlist: listar e liberar/remover e-mail.
create or replace function public.admin_allow_list()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('email', email, 'criadoEm', criado_em) order by criado_em desc),'[]'::jsonb)
    into res from public.beta_allow;
  return res;
end $$;
revoke all on function public.admin_allow_list() from public, anon;
grant  execute on function public.admin_allow_list() to authenticated;

create or replace function public.admin_allow_set(p_email text, p_incluir boolean)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_email),'')='' then raise exception 'email_vazio'; end if;
  if p_incluir then
    insert into public.beta_allow(email) values (lower(trim(p_email))) on conflict (email) do nothing;
  else
    delete from public.beta_allow where email = lower(trim(p_email));
  end if;
end $$;
revoke all on function public.admin_allow_set(text, boolean) from public, anon;
grant  execute on function public.admin_allow_set(text, boolean) to authenticated;

-- ============================================================================
-- Cátedra · CONSOLE DE ADMINISTRAÇÃO (v2) — poderes destrutivos + controle do app
-- ----------------------------------------------------------------------------
-- Tudo aqui é ADITIVO: nenhuma função antiga é apagada. As duas exceções são
-- `meu_acesso_bloqueado()` (ganha o kill switch global da IA) e o menu do app.
--
-- REGRA DE OURO destas funções: a 1ª linha checa is_admin() e FALHA COM EXCEÇÃO.
-- As destrutivas exigem, ALÉM disso, que o e-mail do alvo seja digitado igual —
-- e a conferência é feita AQUI, no servidor, não na tela. Um clique errado no
-- cliente não apaga ninguém.
-- ============================================================================

-- ── TABELAS ─────────────────────────────────────────────────────────────────

-- Chaves globais do app (kill switch da IA, aviso na tela, manutenção).
create table if not exists public.app_config (
  chave         text primary key,
  valor         jsonb not null default 'null'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on table public.app_config from anon, authenticated;

-- Trilha de auditoria: toda ação destrutiva do painel deixa rastro com quem fez.
create table if not exists public.admin_log (
  id          bigint generated always as identity primary key,
  quando      timestamptz not null default now(),
  admin_uid   uuid,
  admin_email text,
  acao        text not null,
  alvo        text,
  detalhe     jsonb
);
alter table public.admin_log enable row level security;
revoke all on table public.admin_log from anon, authenticated;
create index if not exists admin_log_quando_idx on public.admin_log (quando desc);

-- ── HELPER INTERNO ──────────────────────────────────────────────────────────
-- Sem grant para ninguém: só as funções definer abaixo (que rodam como postgres)
-- conseguem chamar. Ninguém forja uma linha de auditoria pela API.
create or replace function public._admin_log(p_acao text, p_alvo text, p_detalhe jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into public.admin_log(admin_uid, admin_email, acao, alvo, detalhe)
  values (auth.uid(), (select email from auth.users where id = auth.uid()),
          left(p_acao,40), left(coalesce(p_alvo,''),200), p_detalhe);
end $$;
revoke all on function public._admin_log(text, text, jsonb) from public, anon, authenticated;

-- ── KILL SWITCH GLOBAL DA IA ────────────────────────────────────────────────
-- A API (api/complete.js e api/tts.js) já pergunta meu_acesso_bloqueado() antes de
-- gastar token. Pendurar o interruptor global AQUI faz o botão do painel valer no
-- servidor sem tocar em uma linha das funções serverless. Admin nunca se tranca
-- para fora: o interruptor global não vale para quem administra.
create or replace function public.meu_acesso_bloqueado()
returns boolean language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if coalesce((select bloqueado from public.beta_acesso where user_id = auth.uid()), false)
    then return true; end if;
  if coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'ia_pausada'), false)
     and not public.is_admin()
    then return true; end if;
  return false;
end $$;
revoke all on function public.meu_acesso_bloqueado() from public, anon;
grant  execute on function public.meu_acesso_bloqueado() to authenticated;

-- Aviso global + manutenção, lidos por QUALQUER conta logada (é o recado da dona
-- aparecendo na tela de todo mundo). Só devolve o que é público por natureza.
create or replace function public.app_avisos()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'aviso',      coalesce((select valor->>'texto' from public.app_config where chave = 'aviso'), ''),
    'avisoTipo',  coalesce((select valor->>'tipo'  from public.app_config where chave = 'aviso'), 'info'),
    'manutencao', coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'manutencao'), false),
    'iaPausada',  coalesce((select valor = 'true'::jsonb from public.app_config where chave = 'ia_pausada'), false)
  )
$$;
revoke all on function public.app_avisos() from public, anon;
grant  execute on function public.app_avisos() to authenticated;

-- ── CONTAS: os poderes que faltavam ─────────────────────────────────────────

-- REMOVER CONTA. Apaga de verdade: auth.users cai e leva junto, por FK em cascata,
-- user_data, admins, beta_acesso, sessões e identidades. O que NÃO tem FK (membros
-- do grupo, que é jsonb, e grupo_atividade) é limpo à mão aqui — senão sobra um
-- fantasma no ranking com o uid de uma conta que não existe mais.
-- Guardas: nunca a si mesma; nunca outra admin (rebaixe antes); e o e-mail exato
-- tem de ser digitado.
create or replace function public.admin_apagar_usuario(p_uid uuid, p_confirmacao text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare em text; resumo jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_uid is null then raise exception 'nao_encontrado'; end if;
  if p_uid = auth.uid() then raise exception 'nao_apague_a_si'; end if;
  if exists(select 1 from public.admins where user_id = p_uid) then raise exception 'alvo_admin'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  if lower(trim(coalesce(p_confirmacao,''))) <> lower(em) then raise exception 'confirmacao_invalida'; end if;

  select jsonb_build_object(
    'blobKb', coalesce((select round(pg_column_size(data)/1024.0,1) from public.user_data where user_id = p_uid), 0),
    'grupos', (select count(*) from public.grupos g where g.membros @> jsonb_build_array(jsonb_build_object('uid', p_uid::text))),
    'iaChamadas', (select count(*) from public.ai_uso where user_id = p_uid)
  ) into resumo;

  update public.grupos g
     set membros = (select coalesce(jsonb_agg(m),'[]'::jsonb)
                      from jsonb_array_elements(g.membros) m
                     where m->>'uid' <> p_uid::text)
   where g.membros @> jsonb_build_array(jsonb_build_object('uid', p_uid::text));
  delete from public.grupo_atividade where user_id = p_uid;
  update public.grupos set criador = null where criador = p_uid;
  delete from public.beta_allow where lower(email) = lower(em);
  delete from auth.users where id = p_uid;

  perform public._admin_log('apagar_usuario', em, resumo);
  return resumo;
end $$;
revoke all on function public.admin_apagar_usuario(uuid, text) from public, anon;
grant  execute on function public.admin_apagar_usuario(uuid, text) to authenticated;

-- ZERAR DADOS mantendo a conta: a pessoa entra de novo e começa do zero. Serve para
-- o testador que pediu "reseta pra mim" sem perder o login. Mesma confirmação por
-- e-mail, porque isto apaga edital, sessões e redações de uma vez.
create or replace function public.admin_zerar_dados(p_uid uuid, p_confirmacao text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare em text; kb numeric;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_uid = auth.uid() then raise exception 'nao_zere_a_si'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  if lower(trim(coalesce(p_confirmacao,''))) <> lower(em) then raise exception 'confirmacao_invalida'; end if;
  select coalesce(round(pg_column_size(data)/1024.0,1),0) into kb from public.user_data where user_id = p_uid;
  delete from public.user_data where user_id = p_uid;
  perform public._admin_log('zerar_dados', em, jsonb_build_object('blobKb', coalesce(kb,0)));
  return jsonb_build_object('blobKb', coalesce(kb,0));
end $$;
revoke all on function public.admin_zerar_dados(uuid, text) from public, anon;
grant  execute on function public.admin_zerar_dados(uuid, text) to authenticated;

-- PROMOVER / REBAIXAR admin. Ninguém se rebaixa sozinho (seria a única forma de
-- ficar sem nenhuma admin no ar) e a última admin não pode sumir.
create or replace function public.admin_set_admin(p_uid uuid, p_admin boolean)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare em text;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if p_uid = auth.uid() then raise exception 'nao_rebaixe_a_si'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  if coalesce(p_admin,false) then
    insert into public.admins(user_id) values (p_uid) on conflict do nothing;
  else
    if (select count(*) from public.admins) <= 1 then raise exception 'ultima_admin'; end if;
    delete from public.admins where user_id = p_uid;
  end if;
  perform public._admin_log(case when coalesce(p_admin,false) then 'promover_admin' else 'rebaixar_admin' end, em, null);
end $$;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- CONFIRMAR E-MAIL na mão: o convite caiu no spam e a pessoa não consegue entrar.
create or replace function public.admin_confirmar_email(p_uid uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare em text;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  -- só email_confirmed_at: auth.users.confirmed_at é coluna GERADA
  -- (LEAST(email_confirmed_at, phone_confirmed_at)) e escrever nela dá erro.
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = p_uid;
  perform public._admin_log('confirmar_email', em, null);
end $$;
revoke all on function public.admin_confirmar_email(uuid) from public, anon;
grant  execute on function public.admin_confirmar_email(uuid) to authenticated;

-- FORÇAR LOGOUT: derruba as sessões da conta em todos os aparelhos. É o que se faz
-- quando um celular perdido continua logado.
create or replace function public.admin_desconectar(p_uid uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare em text; n int;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select email into em from auth.users where id = p_uid;
  if em is null then raise exception 'nao_encontrado'; end if;
  delete from auth.sessions where user_id = p_uid;
  get diagnostics n = row_count;
  perform public._admin_log('desconectar', em, jsonb_build_object('sessoes', n));
  return jsonb_build_object('sessoes', n);
end $$;
revoke all on function public.admin_desconectar(uuid) from public, anon;
grant  execute on function public.admin_desconectar(uuid) to authenticated;

-- ── SUPORTE ─────────────────────────────────────────────────────────────────

create or replace function public.admin_apagar_feedback(p_id bigint)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.feedback where id = p_id;
  perform public._admin_log('apagar_feedback', p_id::text, null);
end $$;
revoke all on function public.admin_apagar_feedback(bigint) from public, anon;
grant  execute on function public.admin_apagar_feedback(bigint) to authenticated;

-- ── CONTROLE DO APP (interruptores globais) ─────────────────────────────────

create or replace function public.admin_config()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select coalesce(jsonb_object_agg(chave, valor), '{}'::jsonb) into res from public.app_config;
  return res;
end $$;
revoke all on function public.admin_config() from public, anon;
grant  execute on function public.admin_config() to authenticated;

create or replace function public.admin_config_set(p_chave text, p_valor jsonb)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  if coalesce(trim(p_chave),'') = '' then raise exception 'chave_vazia'; end if;
  -- lista fechada: o painel não vira um editor de banco genérico
  if p_chave not in ('ia_pausada','manutencao','aviso') then raise exception 'chave_desconhecida'; end if;
  insert into public.app_config(chave, valor, atualizado_em)
  values (p_chave, coalesce(p_valor,'null'::jsonb), now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  perform public._admin_log('config', p_chave, coalesce(p_valor,'null'::jsonb));
end $$;
revoke all on function public.admin_config_set(text, jsonb) from public, anon;
grant  execute on function public.admin_config_set(text, jsonb) to authenticated;

-- Faxina do log de IA: a tabela cresce uma linha por chamada e nunca encolhe.
create or replace function public.admin_purgar_ia(p_dias int)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare n int; d int := greatest(1, coalesce(p_dias, 30));
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  delete from public.ai_uso where criado_em < now() - (d || ' days')::interval;
  get diagnostics n = row_count;
  perform public._admin_log('purgar_ia', d || 'd', jsonb_build_object('linhas', n));
  return jsonb_build_object('linhas', n);
end $$;
revoke all on function public.admin_purgar_ia(int) from public, anon;
grant  execute on function public.admin_purgar_ia(int) to authenticated;

-- ── AUDITORIA + SAÚDE DO SISTEMA ────────────────────────────────────────────

create or replace function public.admin_logs(p_limit int)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'quando', quando, 'admin', admin_email, 'acao', acao, 'alvo', alvo, 'detalhe', detalhe
    ) order by quando desc), '[]'::jsonb) into res
  from (select * from public.admin_log order by quando desc limit greatest(1, least(coalesce(p_limit,100), 500))) s;
  return res;
end $$;
revoke all on function public.admin_logs(int) from public, anon;
grant  execute on function public.admin_logs(int) to authenticated;

-- Saúde da instalação: peso dos dados, sessões abertas, contas sem confirmar e as
-- contas que mais ocupam espaço (é o que decide quando a conta grátis do Supabase
-- vai apertar).
create or replace function public.admin_sistema()
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'acesso_negado'; end if;
  select jsonb_build_object(
    'armazenamentoKb', coalesce((select round(sum(pg_column_size(data))/1024.0,1) from public.user_data), 0),
    'linhasUserData',  (select count(*) from public.user_data),
    'linhasIa',        (select count(*) from public.ai_uso),
    'linhasFeedback',  (select count(*) from public.feedback),
    'linhasLog',       (select count(*) from public.admin_log),
    'grupos',          (select count(*) from public.grupos),
    'sessoesAbertas',  (select count(*) from auth.sessions),
    -- mesmo recorte de admin_visao_geral: as contas internas %@catedra.app ficam
    -- de fora, senão o "pede atenção" do console aponta para uma conta que a aba
    -- de Contas não lista.
    'naoConfirmados',  (select count(*) from auth.users
                         where email_confirmed_at is null and email not like '%@catedra.app'),
    'admins',          (select count(*) from public.admins),
    'maiores', (select coalesce(jsonb_agg(jsonb_build_object('email', em, 'kb', kb) order by kb desc), '[]'::jsonb)
      from (select coalesce(u.email,'(sem conta)') em, round(pg_column_size(d.data)/1024.0,1) kb
              from public.user_data d left join auth.users u on u.id = d.user_id
             where u.email is null or u.email not like '%@catedra.app'
             order by pg_column_size(d.data) desc limit 5) s)
  ) into res;
  return res;
end $$;
revoke all on function public.admin_sistema() from public, anon;
grant  execute on function public.admin_sistema() to authenticated;
