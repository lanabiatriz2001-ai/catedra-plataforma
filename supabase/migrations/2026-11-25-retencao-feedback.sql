-- ============================================================================
-- 2026-11-25 · Retenção dos relatos enviados pelo app (public.feedback): até 12 meses
-- ----------------------------------------------------------------------------
-- A Política de privacidade 1.3 (§3, §9.6 e a nota "O que mudou nesta versão")
-- promete que cada relato de problema ou sugestão fica guardado por até 12 meses
-- depois do envio e então é apagado automaticamente. Até esta migração nada apagava
-- feedback por idade (só a exclusão da conta pela própria pessoa e a administração,
-- linha a linha). A promessa só vale depois que este arquivo for APLICADO no Supabase
-- vivo e o job diário existir: a Política 1.3 não pode ser publicada antes disso
-- (decisão da dona).
--
-- O número de meses mora em DOIS lugares que têm de bater: o intervalo abaixo e
-- docs/juridico/controlador.json (prazos.retencaoFeedbackMeses), que preenche o
-- texto da Política. tests/juridico-lgpd-retencao.mjs reprova se divergirem.
--
-- Só agendamento, sem RPC nova: a função não tem grant para anon nem authenticated,
-- e nenhum botão do console a chama. Não mexe em public.excluir_minha_conta nem em
-- admin_apagar_usuario.
--
-- Aplicar (SQL Editor do Supabase, projeto vivo — lá a sessão é a do postgres), nesta ordem:
--   1. este arquivo inteiro;
--   2. conferir o agendamento:  select jobname, schedule, command from cron.job
--                               where jobname = 'catedra-purgar-feedback';
--      sem linha = o pg_cron está desligado: ligue a extensão pg_cron
--      (Database → Extensions) e rode de novo só o bloco "do $$ … $$" do fim;
--   3. fumaça, só leitura — quantos relatos já passaram do prazo (hoje deve dar 0:
--      public.feedback nasceu com supabase-admin.sql em 13/08/2026):
--        select count(*) from public.feedback
--        where criado_em < now() - interval '12 months' + interval '1 day';
--   4. depois da primeira madrugada, a execução do job:
--        select status, return_message, start_time from cron.job_run_details
--        where jobid = (select jobid from cron.job where jobname = 'catedra-purgar-feedback')
--        order by start_time desc limit 3;
--      (para rodar a purga na hora, no próprio SQL Editor: select public._purgar_feedback_vencido();
--       devolve quantas linhas apagou)
--   5. com a linha do passo 2 na tela, a dona libera a publicação: preencher
--      publicacao.purgaFeedbackAplicadaEm (AAAA-MM-DD, o dia da aplicação) em
--      docs/juridico/controlador.json. Até lá a CI do PR da Política 1.3 reprova de
--      propósito (travasDePublicacao em scripts/build-juridico.mjs).
-- ============================================================================

begin;

-- Interna: quem chama é o job do pg_cron (dono do banco), sem sessão de usuário.
-- Sem grant para anon nem authenticated: ninguém a chama pela API.
create or replace function public._purgar_feedback_vencido()
returns int language plpgsql security definer set search_path to 'public'
as $$
declare n int;
begin
  -- o job roda uma vez por dia: o corte vem um dia antes para nenhum relato passar dos 12 meses
  delete from public.feedback where criado_em < now() - interval '12 months' + interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public._purgar_feedback_vencido() from public, anon, authenticated;

commit;

-- Agendamento diário (06:20 UTC, 03:20 em Brasília). Fora da transação de cima: sem
-- pg_cron, a função fica criada e este bloco só avisa, sem desfazer nada.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'catedra-purgar-feedback') then
      perform cron.unschedule('catedra-purgar-feedback');
    end if;
    perform cron.schedule('catedra-purgar-feedback', '20 6 * * *', 'select public._purgar_feedback_vencido()');
  else
    raise warning 'pg_cron desligado: os relatos NÃO serão apagados sozinhos. Ligue a extensão pg_cron e rode de novo este bloco.';
  end if;
end $$;
