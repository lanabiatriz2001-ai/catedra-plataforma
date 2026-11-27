/* TERMOS E PRIVACIDADE — versão no rodapé, LGPD e IA fora do Brasil, retenção dos relatos (25/11/2026)
   Parte 1 (Node, sem navegador): o build gera a versão e a data DA POLÍTICA (1.3, 25/11/2026) separadas das
   dos Termos e a linha de rodapé em juridico.js; os gerados versionados batem com as fontes; a frase da LGPD
   liga a IA fora do Brasil às bases legais só com artigos que o documento já usava e que o texto da lei no
   acervo (leis-seca-areas.js) confirma, sem dar ao provedor a garantia que é do controlador; a nota "O que
   mudou nesta versão" diz o teor da mudança; o prazo dos relatos sai de docs/juridico/controlador.json e a
   purga no banco usa o MESMO número, sem passar dele e sem RPC nova. A trava da publicação (controlador.json ›
   publicacao): na CI, reprova DE PROPÓSITO enquanto a dona não confirmar a purga no banco e antes de 30/11/2026
   (o novo aceite vale para todas as contas); fora da CI, só avisa.
   Parte 2 (navegador): a linha "Política de privacidade · versão 1.3 · 25/11/2026" pinta — medida, com
   contraste calculado — no cartão de Ajustes (iPad por toque, claro e escuro, alinhada aos botões), no portão
   de login e de aceite (iPad por toque, claro e escuro: título visível, frase de consentimento e textos do aceite
   ≥ 4,5:1; "Não aceito", os dois botões dos documentos e o rótulo do checkbox com 44 px), no rodapé do
   sobre.html e no das páginas geradas.
   Roda sozinho: node tests/juridico-lgpd-retencao.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
// A versão e a data da Política num lugar só: no dia da publicação, muda aqui, no .md e no P14 de tests/run.mjs.
export const POLITICA = { versao: '1.3', data: '25/11/2026', dataISO: '2026-11-25' };
export const LINHA = 'Política de privacidade · versão ' + POLITICA.versao + ' · ' + POLITICA.data;
const LINHA_TERMOS = 'Termos de uso · versão 1.0 · 02/09/2026';
const MIGRACAO = 'supabase/migrations/2026-11-25-retencao-feedback.sql';
const GERADOS = ['termos.html', 'privacidade.html', 'juridico.js'];
// Lidos quando este módulo carrega: antes de qualquer build da suíte (o D9 de tests/run.mjs, o import do P14)
// regravar os três a partir das fontes — depois disso, comparar disco com fonte não provaria nada.
const GERADOS_NO_INICIO = Object.fromEntries(GERADOS.map((f) => { try { return [f, ler(f)]; } catch (_) { return [f, null]; } }));

const texto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const secao = (txt, de, ate) => { const i = txt.indexOf(de), j = txt.indexOf(ate, i + 1); return i < 0 || j < 0 ? '' : txt.slice(i, j); };
const semComentariosSql = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

// O dia de hoje no fuso da dona (AAAA-MM-DD), para a trava de calendário: toISOString daria o dia de UTC, que
// vira às 20h no fuso dela.
function hojeNoFuso(agora) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Porto_Velho', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora || new Date())) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day;
}

function carregarJuridico() {
  const caixa = { window: {} };
  vm.runInNewContext(ler('juridico.js'), caixa);
  return caixa.window.CT_JURIDICO;
}
// O inciso, do jeito que está no texto compilado do Planalto guardado no acervo (até o próximo inciso).
function inciso(txtArtigo, rom) {
  const linhas = String(txtArtigo || '').split('\n'), i = linhas.findIndex((l) => l.startsWith(rom + ' - '));
  if (i < 0) return '';
  const fim = linhas.findIndex((l, k) => k > i && /^([IVXLC]+ - |Parágrafo|§)/.test(l));
  return linhas.slice(i, fim < 0 ? undefined : fim).join(' ');
}

export async function testarJuridicoLgpdRetencaoEstatico(ok) {
  const R = 'JURÍDICO/LGPD ';
  let BJ = null;
  try { BJ = await import('../scripts/build-juridico.mjs'); }
  catch (e) { ok(false, R + 'scripts/build-juridico.mjs carrega (' + String(e.message).split('\n')[0] + ')'); return; }
  // (0) os gerados versionados batem com as fontes: o disco de quando a suíte começou contra o que o build monta em
  //     memória (sem gravar). Na CI o passo "Build da plataforma" regrava os três antes da suíte: lá a referência é o commit.
  const montado = BJ.montarArquivos();
  ok(GERADOS.every((f) => GERADOS_NO_INICIO[f] === montado.arquivos[f]),
    R + 'termos.html, privacidade.html e juridico.js, como estavam no disco quando a suíte começou, são o que o build gera de docs/juridico (senão: node scripts/build-juridico.mjs)');
  if (process.env.GITHUB_ACTIONS === 'true') {
    const doCommit = (f) => { try { return execFileSync('git', ['show', 'HEAD:' + f], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (_) { return null; } };
    ok(GERADOS.every((f) => doCommit(f) === montado.arquivos[f]), R + 'na CI: os três gerados do commit são o que o build gera de docs/juridico');
  }

  const mdP = ler('docs/juridico/politica-de-privacidade.md'), mdT = ler('docs/juridico/termos-de-uso.md');
  const ctl = JSON.parse(ler('docs/juridico/controlador.json'));

  // (a) versão e data da POLÍTICA, separadas das dos Termos, e a linha de rodapé pronta em juridico.js
  const cabP = BJ.cabecalho(mdP), cabT = BJ.cabecalho(mdT);
  ok(cabP.versao === POLITICA.versao && cabP.data === POLITICA.data && cabP.dataISO === POLITICA.dataISO, R + 'a Política sobe para a versão ' + POLITICA.versao + ', de ' + POLITICA.data + ' (' + cabP.versao + ', ' + cabP.data + ')');
  ok(cabT.versao === '1.0' && cabT.data === '02/09/2026', R + 'os Termos seguem na versão 1.0, de 02/09/2026');
  ok(BJ.linhaDeRodape('Política de privacidade', POLITICA.versao, POLITICA.data) === LINHA, R + 'linhaDeRodape monta "Título · versão X · DD/MM/AAAA"');
  ok(BJ.linhaDeRodape('Termos de uso', '1.0', '') === 'Termos de uso · versão 1.0' && BJ.linhaDeRodape('Termos de uso', '', '02/09/2026') === 'Termos de uso',
    R + 'sem data, a linha não termina em " · "; sem versão, fica só o título');
  const J = carregarJuridico();
  ok(!!J && J.versao === '1.0/' + POLITICA.versao, R + 'juridico.js: a versão do aceite vira 1.0/' + POLITICA.versao + ' (' + (J && J.versao) + ')');
  ok(!!J && J.privacidade.data === POLITICA.dataISO && J.privacidade.dataBR === POLITICA.data && J.termos.data === '2026-09-02' && J.termos.dataBR === '02/09/2026',
    R + 'juridico.js expõe a data da Política separada da data dos Termos (ISO e DD/MM/AAAA)');
  ok(!!J && J.privacidade.rodape === LINHA && J.termos.rodape === LINHA_TERMOS, R + 'juridico.js traz a linha de rodapé de cada documento, pronta para o app');
  ok(!!J && J.aceiteVigente({ versao: J.versao, ts: 1 }) === true && J.aceiteVigente({ versao: '1.0/1.2', ts: 1 }) === false,
    R + 'quem aceitou a 1.0/1.2 é chamado a aceitar de novo (o aceite é versionado)');
  // a versão vigente SEM carimbo (ou com carimbo zero) não vale: com o literal velho aqui, o ramo do ts ficava sem teste
  ok(!!J && J.aceiteVigente({ versao: J.versao }) === false && J.aceiteVigente({ versao: J.versao, ts: 0 }) === false && J.aceiteVigente('{"versao":"' + J.versao + '"}') === false,
    R + 'aceite da versão vigente sem carimbo de hora não conta como aceito');

  // rodapé das páginas geradas: cada uma diz a própria versão e data e as do outro documento, no link
  const termos = ler('termos.html'), priv = ler('privacidade.html');
  const rodape = (h) => (h.match(/<footer class="rodape">([\s\S]*?)<\/footer>/) || [, ''])[1];
  ok(rodape(priv) === '<a href="./termos.html">' + LINHA_TERMOS + '</a><span>' + LINHA + '</span>', R + 'rodapé de privacidade.html: "' + LINHA + '"');
  ok(rodape(termos) === '<a href="./privacidade.html">' + LINHA + '</a><span>' + LINHA_TERMOS + '</span>', R + 'rodapé de termos.html: o link da Política leva a versão e a data dela');
  const pag = BJ.montarPagina({ titulo: 'T', irmao: { html: 'x.html', titulo: 'X' } }, '**Versão 2.0**\n**Data: 01/01/2027**\n\ncorpo', []);
  ok(/<footer class="rodape"><a href="\.\/x\.html">X<\/a><span>T · versão 2\.0 · 01\/01\/2027<\/span><\/footer>/.test(pag), R + 'montarPagina sem o cabeçalho do irmão mantém o link só com o título');

  // (b) LGPD pelo nome e a IA fora do Brasil ligada às bases legais — sem artigo novo
  const txtP = texto(priv);
  const nome = 'Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018)';
  ok(txtP.split(nome).length - 1 === 1 && mdP.split('13.709').length - 1 === 1, R + 'a Política nomeia a Lei nº 13.709/2018 uma vez, sem duplicar a menção');
  const frase = secao(txtP, 'O tratamento segue a Lei Geral de Proteção de Dados Pessoais', 'como detalha a seção 7.');
  const citadas = (frase.match(/art\. \d+º?, [IVX]+/g) || []).sort();
  ok(/inteligência artificial/.test(frase) && /fora do Brasil/.test(frase) && /transferência internacional/.test(frase),
    R + 'uma frase liga o uso de IA fora do Brasil à base legal do tratamento e à da transferência internacional');
  ok(citadas.join('|') === ['art. 33, II', 'art. 33, VIII', 'art. 7º, I'].join('|'), R + 'a frase cita só art. 7º, I, e art. 33, II e VIII (' + citadas.join('; ') + ')');
  // art. 33, II: quem oferece e comprova as garantias é o CONTROLADOR; a frase repete a redação da §7.2
  ok(/e, quanto aos provedores, em garantias contratuais compatíveis com a LGPD \(art\. 33, II\)/.test(frase) && !/garantias contratuais dos provedores/.test(txtP),
    R + 'a frase não atribui ao provedor a garantia do art. 33, II: "quanto aos provedores, garantias contratuais compatíveis com a LGPD", como a §7.2');
  const s72 = secao(txtP, '7.2. Fundamentos', '7.3. ');
  ok(/\(art\. 33, VIII; art\. 8º\)/.test(s72) && /quanto aos provedores, garantias contratuais compatíveis com a LGPD \(art\. 33, II\), conforme o regulamento da ANPD/.test(s72)
    && /Consentimento específico ao acionar o recurso \(inciso I; art\. 8º\)/.test(txtP),
    R + 'os mesmos artigos já estavam na §7.2 e na tabela da §3, que seguem intactas');
  {
    const caixa = { window: {} };
    let lgpd = null;
    try { vm.runInNewContext(ler('leis-seca-areas.js'), caixa); lgpd = (caixa.window.CT_LEIS_AREAS || []).find((l) => l.sigla === 'LGPD'); } catch (_) {}
    const art = (rot) => ((lgpd && lgpd.artigos.find((a) => a.rot === rot)) || {}).txt || '';
    ok(!!lgpd && /l13709\.htm$/.test(lgpd.url), R + 'o acervo traz o texto da LGPD (Lei nº 13.709/2018, Planalto)');
    ok(/mediante o fornecimento de consentimento pelo titular/.test(inciso(art('Art. 7º'), 'I')), R + 'art. 7º, I, da LGPD é o consentimento do titular (texto da lei no acervo)');
    ok(/consentimento específico e em destaque para a transferência/.test(inciso(art('Art. 33'), 'VIII')), R + 'art. 33, VIII, é o consentimento específico e em destaque para a transferência');
    ok(/quando o controlador oferecer e comprovar garantias de cumprimento/.test(inciso(art('Art. 33'), 'II')) && /cláusulas contratuais/.test(inciso(art('Art. 33'), 'II')),
      R + 'art. 33, II, são as garantias que o controlador oferece e comprova, por cláusulas contratuais');
  }

  // a nota "O que mudou nesta versão" (LGPD, art. 8º, § 6º: o teor da alteração com destaque), logo abaixo do título
  const iMudou = txtP.indexOf('O que mudou nesta versão'), mudou = secao(txtP, 'O que mudou nesta versão', 'Esta política explica');
  ok(iMudou > 0 && iMudou < txtP.indexOf('Esta política explica') && iMudou < txtP.indexOf('1. Controlador e encarregado') && /<p><strong>O que mudou nesta versão<\/strong>:/.test(priv),
    R + 'a Política abre com a nota "O que mudou nesta versão", em destaque, antes do texto');
  ok(/segue a LGPD/.test(mudou) && /inteligência artificial/.test(mudou) && /fora do Brasil/.test(mudou) && /por até 12 meses depois do envio e então são apagados automaticamente \(seções 3 e 9\.6\)/.test(mudou)
    && /Nada mudou no que coletamos nem com quem compartilhamos\./.test(mudou), R + 'a nota diz o teor das duas mudanças (frase da LGPD e prazo dos relatos) e que a coleta e o compartilhamento não mudaram');

  // (c) retenção dos relatos: o número vem de controlador.json pelo marcador do build
  const campo = BJ.CAMPOS.find((c) => c.campo === 'prazos.retencaoFeedbackMeses');
  ok(!!campo && campo.numero === true && ctl.prazos && ctl.prazos.retencaoFeedbackMeses === '12', R + 'controlador.json tem prazos.retencaoFeedbackMeses = "12" e o build o conhece como prazo');
  ok((mdP.match(/\[RETENÇÃO FEEDBACK: 12\]/g) || []).length === 3, R + 'o texto da Política usa o marcador [RETENÇÃO FEEDBACK: 12] na nota do topo, na tabela da §3 e na §9.6');
  const cheio = BJ.preencher(mdP, ctl), seis = BJ.preencher(mdP, { ...ctl, prazos: { ...ctl.prazos, retencaoFeedbackMeses: '6' } });
  const vazio = BJ.preencher(mdP, { ...ctl, prazos: { ...ctl.prazos, retencaoFeedbackMeses: '' } });
  ok((cheio.md.match(/por até 12 meses depois do envio/g) || []).length === 3 && !/RETENÇÃO FEEDBACK/.test(cheio.md), R + 'preenchido, o texto diz "por até 12 meses depois do envio" nos três lugares');
  ok((seis.md.match(/por até 6 meses depois do envio/g) || []).length === 3 && /\[RETENÇÃO IA/.test(mdP) && /até 12 meses depois da remoção/.test(seis.md),
    R + 'o número é o do controlador.json (6 vira 6) e não mexe no prazo da IA');
  ok(vazio.faltam.includes('retenção dos relatos enviados pelo app') && (vazio.md.match(/\[RETENÇÃO FEEDBACK: 12\]/g) || []).length === 3,
    R + 'vazio, o marcador fica entre colchetes e o prazo conta como faltante (página carimbada como rascunho)');
  const s3 = secao(txtP, '3. Finalidades', '4. Dados sensíveis'), s96 = secao(txtP, '9.6. Relatos enviados pelo app', '10. Segurança');
  ok(/Enquanto a conta existir, por até 12 meses depois do envio, quando é apagado automaticamente \(a administração pode apagar o relato antes\)/.test(s3),
    R + 'a §3 dá o prazo dos relatos: até 12 meses depois do envio, e então apagados');
  ok(/fica guardado por até 12 meses depois do envio e, passado esse prazo, é apagado automaticamente/.test(s96) && /com a conta ativa ou já removida pela administração/.test(s96),
    R + 'a §9.6 escreve a regra: guardado por até 12 meses e depois apagado, com a conta ativa ou removida');
  ok(/mantém os relatos que você enviou pelo app/.test(txtP) && /por até 12 meses depois da remoção/.test(txtP) && /inclusive os relatos que você enviou pelo app/.test(txtP),
    R + 'o que a Política já dizia sobre exclusão (9.2, 9.3, 9.4) continua lá — só acréscimo');

  // a promessa só vale com a purga no banco: migração em arquivo, com o MESMO número de meses
  const temMig = fs.existsSync(path.join(RAIZ, MIGRACAO));
  ok(temMig, R + 'a purga dos relatos está em ' + MIGRACAO);
  if (temMig) {
    const sql = semComentariosSql(ler(MIGRACAO)).replace(/\s+/g, ' ').toLowerCase();
    const meses = [...sql.matchAll(/interval '(\d+) months'/g)].map((m) => m[1]);
    ok(meses.length === 1 && meses[0] === ctl.prazos.retencaoFeedbackMeses, R + 'o intervalo da purga (' + meses.join(', ') + ' meses) é o de controlador.json (' + ctl.prazos.retencaoFeedbackMeses + ')');
    // o job roda uma vez por dia: cortar em "12 meses" deixava um relato viver até 12 meses e um dia
    ok(/delete from public\.feedback where criado_em < now\(\) - interval '\d+ months' \+ interval '1 day';/.test(sql),
      R + 'a purga apaga de public.feedback pela data do envio (criado_em), um dia antes do prazo, porque o job é diário');
    ok(/create table if not exists public\.feedback \([\s\S]*?criado_em\s+timestamptz not null default now\(\)/.test(ler('supabase-admin.sql')), R + 'public.feedback tem mesmo a coluna criado_em, preenchida no envio');
    ok(/revoke all on function public\._purgar_feedback_vencido\(\) from public, anon, authenticated;/.test(sql) && !/grant /.test(sql),
      R + 'a função da purga não é chamável pela API (nenhum grant na migração)');
    ok(!/admin_purgar_feedback/.test(sql) && (sql.match(/create or replace function/g) || []).length === 1,
      R + 'sem RPC nova: só a função interna que o job chama (nenhuma tela chamaria uma RPC de faxina)');
    ok(/if exists \(select 1 from pg_extension where extname = 'pg_cron'\) then/.test(sql) && /cron\.schedule\('catedra-purgar-feedback', '[^']+', 'select public\._purgar_feedback_vencido\(\)'\)/.test(sql),
      R + 'o apagamento automático é um job diário do pg_cron, com guarda para o pg_cron desligado');
    ok(!/excluir_minha_conta|admin_apagar_usuario|drop |truncate /.test(sql), R + 'a migração não toca na RPC excluir_minha_conta nem apaga estrutura');
    const cab = ler(MIGRACAO);
    ok(/select count\(\*\) from public\.feedback/.test(cab) && /cron\.job_run_details/.test(cab) && !/select public\.admin_purgar_feedback/.test(cab),
      R + 'a fumaça descrita na migração roda no SQL Editor (contagem e cron.job_run_details), sem depender de sessão de admin');
    ok(/publicacao\.purgaFeedbackAplicadaEm/.test(cab), R + 'o passo a passo da migração termina em como liberar a publicação (publicacao.purgaFeedbackAplicadaEm)');
  }

  // (d) a trava da publicação (controlador.json › publicacao). A Política promete apagar os relatos e a versão nova pede
  //     novo aceite a todas as contas: na CI — a main só aceita PR com as checagens verdes — reprova enquanto houver trava.
  const pub = ctl.publicacao || {};
  ok(typeof pub.purgaFeedbackAplicadaEm === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pub.naoAntesDe || '') && pub.naoAntesDe >= '2026-11-30',
    R + 'controlador.json tem a trava: publicacao.purgaFeedbackAplicadaEm (a dona preenche) e publicacao.naoAntesDe a partir de 2026-11-30 (' + pub.naoAntesDe + ')');
  const comPub = (em, nao) => ({ ...ctl, publicacao: { purgaFeedbackAplicadaEm: em, naoAntesDe: nao } });
  const tv = (dados, hoje, md) => BJ.travasDePublicacao(md == null ? mdP : md, dados, hoje);
  const t25 = tv(comPub('', '2026-11-30'), '2026-11-25');
  ok(t25.length === 2 && t25[0].includes(MIGRACAO) && /cron\.job/.test(t25[0]) && /publicacao\.purgaFeedbackAplicadaEm/.test(t25[0]) && /só a partir de 2026-11-30/.test(t25[1]),
    R + 'trava: sem a purga confirmada e antes de 30/11 são duas, e cada uma diz o que fazer');
  ok(tv(comPub('2026-12-01', '2026-11-30'), '2026-12-01').length === 0, R + 'trava: purga confirmada e a partir de 30/11, publicação liberada');
  ok(tv(comPub('2026-11-26', '2026-11-30'), '2026-11-29').length === 1 && tv(comPub('2026-11-26', '2026-11-30'), '2026-11-30').length === 0,
    R + 'trava de calendário: 29/11 ainda trava, 30/11 libera');
  ok(['', '  ', '01/12/2026', '2026-02-30', '2026-11-24', '2026-12-02'].every((em) => tv(comPub(em, ''), '2026-12-01').length === 1),
    R + 'trava da purga: vazio, fora do formato, dia que não existe, antes da migração ou depois de hoje não liberam');
  ok(tv(comPub('', ''), '2026-12-01', mdP.replace(/\[RETENÇÃO FEEDBACK: \d+\]/g, '12')).length === 0,
    R + 'trava da purga: sem a promessa no texto da Política, não há purga a confirmar');
  ok(tv(comPub('2026-12-01', 'dezembro'), '2026-12-01').length === 1 && tv(comPub('2026-12-01', '2026-11-30'), '01/12/2026').length === 1,
    R + 'trava: data inválida em naoAntesDe ou no "hoje" não passa calada');
  ok(hojeNoFuso(new Date('2026-11-30T03:59:00Z')) === '2026-11-29' && hojeNoFuso(new Date('2026-11-30T04:00:00Z')) === '2026-11-30',
    R + 'o "hoje" da trava é o do fuso da dona (UTC−4): 23h59 de 29/11 ainda é 29/11');
  const travas = BJ.travasDePublicacao(mdP, ctl, hojeNoFuso());
  if (process.env.GITHUB_ACTIONS === 'true') {
    ok(travas.length === 0, R + 'na CI: publicação liberada' + (travas.length ? ' — reprovação DE PROPÓSITO, não é defeito; só a dona libera: ' + travas.join(' · ') : ''));
  } else if (travas.length) console.log('  ⓘ ' + R + 'publicação travada — a CI reprova até a dona liberar: ' + travas.join(' · '));

  // fiação: as quatro telas leem a mesma linha de juridico.js, nunca a data dos Termos
  const host = ler('Catedra.dc.html'), auth = ler('auth.js'), sobre = ler('sobre.html');
  ok(/<span class="ct-dado" data-politica-rodape="1">\{\{ juridicoRodape \}\}<\/span>/.test(host) && /juridicoRodape:\(\(\)=>\{ try\{ return window\.CT_JURIDICO\.privacidade\.rodape\|\|''; \}/.test(host)
    && !/CT_JURIDICO\.termos\.data/.test(host), R + 'host: o cartão de Ajustes mostra a linha da Política (e não mais a data dos Termos)');
  ok(/<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">\s*<button type="button" data-doc="termos"/.test(host),
    R + 'host: a fileira dos botões do cartão centra a linha na altura dos botões (align-items, sem px)');
  ok((auth.match(/\+ rodapePolitica\('\d+px'\)/g) || []).length === 2 && /J\.privacidade\.rodape/.test(auth) && /data-politica-rodape="1" style="font-size:11\.5px;color:' \+ LAB \+ ';/.test(auth)
    && /\[data-politica-rodape\]:empty\{display:none\}/.test(auth) && /addEventListener\('DOMContentLoaded', function \(\) \{\s*var p = el\.querySelector\('\[data-politica-rodape\]'\);/.test(auth),
    R + 'auth.js: a linha no pé do login e do aceite, completada no DOMContentLoaded quando o juridico.js chega depois');
  // aspas de SERIF dentro de style="…" fechavam o atributo: nenhum <h2> do portão leva a família no style
  ok(!/<h2 style="font-family:' \+ SERIF/.test(auth) && (auth.match(/<h2 style="font-size:2[68]px;font-weight:700;color:' \+ INK \+ ';margin:0;/g) || []).length === 3
    && /'#catedra-auth-gate h1,#catedra-auth-gate h2\{font-family:' \+ SERIF \+ '\}'/.test(auth),
    R + 'auth.js: os três <h2> do portão sem SERIF no style (a família vem da regra do <style>)');
  ok(/<p style="font-size:11\.5px;color:' \+ LAB \+ ';text-align:center;margin:8px 0 0;line-height:1\.6;">Ao entrar ou criar conta/.test(auth)
    && /<p style="font-size:14px;color:' \+ LAB \+ ';margin:8px 0 16px;line-height:1\.55;">Para usar a Cátedra/.test(auth)
    && /<p style="font-size:12\.5px;color:' \+ LAB \+ ';text-align:center;margin:14px 0 0;"><a href="#" id="ctacsair" style="color:' \+ LAB \+ ';min-height:44px;display:inline-flex;align-items:center;">/.test(auth),
    R + 'auth.js: a frase do consentimento e os textos do aceite em LAB (MUT dava 3,48:1 no claro); "Não aceito" com alvo de 44 px');
  // no aceite, que toda conta vai ver: o min-height dos botões vem ANTES do GHOST (o que vem depois das aspas de SANS
  // não chega ao style) e o rótulo do checkbox tem 44 px
  ok((auth.match(/data-doc="(termos|privacidade)\.html" style="min-height:44px;' \+ GHOST \+ '/g) || []).length === 2
    && /<label style="display:flex;align-items:flex-start;gap:10px;min-height:44px;[^"]*"><input id="ctac"/.test(auth),
    R + 'auth.js: no aceite, os dois botões dos documentos levam min-height:44px antes do GHOST e o rótulo do checkbox tem 44 px');
  const iJur = sobre.indexOf('<script src="./juridico.js"></script>'), iInline = sobre.indexOf('<script>\n// Lista pública');
  ok(iJur > 0 && iInline > iJur && /<a href="\.\/privacidade\.html" data-politica-rodape="1">Política de privacidade<\/a>/.test(sobre) && /a\.textContent = J\.privacidade\.rodape/.test(sobre),
    R + 'sobre.html: o link do rodapé ganha a versão e a data de juridico.js (sem ele, fica o nome)');
  const build = ler('scripts/build.mjs'), mac = ler('scripts/build-macos.mjs');
  ok(['juridico.js', 'sobre.html', 'privacidade.html', 'termos.html'].every((f) => build.includes("'" + f + "'") && mac.includes("'" + f + "'")), R + 'os quatro arquivos seguem nas listas de cópia do site e do app nativo');
}

/* ---- Parte 2: navegador ---- */
const lumRgb = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contraste = (a, b) => { const x = lumRgb(a), y = lumRgb(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Cor do texto e fundo efetivo (camadas até a primeira opaca), lidos pelo canvas: aceita qualquer formato de cor.
function medir(alvo, sel) {
  return alvo.evaluate((sel) => {
    const e = document.querySelector(sel); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const camadas = [];
    for (let n = e; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (getComputedStyle(n).backgroundColor !== 'rgba(0, 0, 0, 0)' && b[3] > 0) { camadas.push(b); if (b[3] >= 1) break; } }
    let fundo = [255, 255, 255];
    for (let i = camadas.length - 1; i >= 0; i--) { const [r, g, b, a] = camadas[i]; fundo = [r * a + fundo[0] * (1 - a), g * a + fundo[1] * (1 - a), b * a + fundo[2] * (1 - a)]; }
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const meio = document.elementFromPoint(Math.round(r.left + Math.min(r.width / 2, 40)), Math.round(r.top + r.height / 2));
    return { texto: e.textContent.trim(), cor: rgba(cs.color).slice(0, 3), fundo, w: r.width, h: r.height, fonte: parseFloat(cs.fontSize), familia: cs.fontFamily,
      pinta: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.width > 0 && r.height > 0, naFrente: !!meio && (meio === e || e.contains(meio)) };
  }, sel);
}
// Marca o primeiro <p> do portão cujo texto casa com o padrão, para medir pelo seletor [data-ct-medir].
const marcar = (page, padrao, nome) => page.evaluate(([padrao, nome]) => {
  const p = [...document.querySelectorAll('#catedra-auth-gate p')].find((x) => new RegExp(padrao).test(x.textContent));
  if (p) p.setAttribute('data-ct-medir', nome);
  return !!p;
}, [padrao, nome]);

async function semearHost(page, base, extra) {
  await page.goto(base + '/__semente');
  await page.evaluate((extra) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, v);
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    Object.keys(extra || {}).forEach((k) => set(k, extra[k]));
  }, extra || {});
}
async function abrirCartao(page, base) {
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => typeof window.__catedraGoView === 'function', null, { timeout: 60000 });
  await page.evaluate(() => window.__catedraGoView('ajustes'));
  await page.click('main .aj-abas button[data-s="dados"]', { timeout: 20000 });
  await page.waitForSelector('main [data-card="juridico"] [data-politica-rodape]', { timeout: 20000 });
}
function conferir(ok, R, onde, m, { alvo44 = false } = {}) {
  if (!m) { ok(false, R + onde + ': a linha existe'); return; }
  const c = contraste(m.cor, m.fundo);
  ok(m.texto === LINHA, R + onde + ': "' + m.texto + '"');
  ok(m.pinta && m.naFrente && m.fonte >= 11, R + onde + ': pinta na frente, caixa ' + Math.round(m.w) + '×' + Math.round(m.h) + ', ' + m.fonte + ' px');
  ok(c >= 4.5, R + onde + ': contraste ' + c.toFixed(2) + ':1 (≥ 4,5)');
  if (alvo44) ok(m.h >= 44, R + onde + ': alvo de toque ' + Math.round(m.h) + ' px (≥ 44)');
}
// Texto do portão que não é a linha: pinta e passa de 4,5:1 sobre o fundo medido.
function legivel(ok, R, onde, m) {
  const c = m ? contraste(m.cor, m.fundo) : 0;
  ok(!!m && m.pinta && c >= 4.5, R + onde + ': contraste ' + c.toFixed(2) + ':1 (≥ 4,5)');
}

export async function testarJuridicoLgpdRetencao(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'JURÍDICO/LGPD [' + (opcoes.motor || 'chromium') + '] ';
  const browser = pageDaSuite.context().browser();
  // (A) iPad por toque: cartão de Ajustes (claro e escuro), sobre.html e as páginas geradas
  {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('ERRO NA PÁGINA (juridico-lgpd):', e.message));
    try {
      await semearHost(page, base);
      await abrirCartao(page, base);
      conferir(ok, R, 'Ajustes claro', await medir(page, 'main [data-card="juridico"] [data-politica-rodape]'));
      const bt = await page.evaluate(() => {
        const b = document.querySelector('main [data-card="juridico"] button[data-doc="privacidade"]'), s = document.querySelector('main [data-card="juridico"] [data-politica-rodape]');
        if (!b || !s) return null;
        const rb = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(s); const rt = rg.getBoundingClientRect();
        return { w: rb.width, h: rb.height, meioBotao: rb.top + rb.height / 2, meioTexto: rt.top + rt.height / 2, mesmaLinha: rt.top < rb.bottom && rt.bottom > rb.top };
      });
      ok(!!bt && bt.h >= 44 && bt.w >= 44, R + 'Ajustes: o botão "Política de privacidade" ao lado mede ' + (bt ? Math.round(bt.w) + '×' + Math.round(bt.h) : '—') + ' (≥ 44 no toque)');
      // a linha fica na altura do rótulo dos botões, não colada no topo da fileira de 44 px (antes: 14 px acima)
      ok(!!bt && bt.mesmaLinha && Math.abs(bt.meioTexto - bt.meioBotao) <= 2,
        R + 'Ajustes: a linha está centrada na altura do botão (diferença ' + (bt ? (bt.meioTexto - bt.meioBotao).toFixed(1) : '—') + ' px, ≤ 2)');

      await page.goto(base + '/sobre.html');
      await page.waitForSelector('.rodape [data-politica-rodape]');
      conferir(ok, R, 'sobre.html claro', await medir(page, '.rodape [data-politica-rodape]'), { alvo44: true });
      await page.emulateMedia({ colorScheme: 'dark' });
      const sEsc = await medir(page, '.rodape [data-politica-rodape]');
      ok(!!sEsc && lumRgb(sEsc.fundo) < 0.1 && contraste(sEsc.cor, sEsc.fundo) >= 4.5, R + 'sobre.html escuro: contraste ' + (sEsc ? contraste(sEsc.cor, sEsc.fundo).toFixed(2) : '—') + ':1 sobre fundo escuro');

      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(base + '/privacidade.html');
      conferir(ok, R, 'privacidade.html claro', await medir(page, 'footer.rodape span'));
      await page.emulateMedia({ colorScheme: 'dark' });
      const pEsc = await medir(page, 'footer.rodape span');
      ok(!!pEsc && lumRgb(pEsc.fundo) < 0.1 && contraste(pEsc.cor, pEsc.fundo) >= 4.5, R + 'privacidade.html escuro: contraste ' + (pEsc ? contraste(pEsc.cor, pEsc.fundo).toFixed(2) : '—') + ':1');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(base + '/termos.html');
      const tLink = await medir(page, 'footer.rodape a');
      ok(!!tLink && tLink.texto === LINHA && tLink.h >= 44 && contraste(tLink.cor, tLink.fundo) >= 4.5, R + 'termos.html: o link do rodapé diz "' + (tLink && tLink.texto) + '"');

      await semearHost(page, base, { dark: '1' });
      await abrirCartao(page, base);
      const esc = await medir(page, 'main [data-card="juridico"] [data-politica-rodape]');
      conferir(ok, R, 'Ajustes escuro', esc);
      ok(!!esc && lumRgb(esc.fundo) < 0.1, R + 'Ajustes escuro: o fundo medido é mesmo escuro (luminância ' + (esc ? lumRgb(esc.fundo).toFixed(3) : '—') + ')');
    } catch (e) { ok(false, R + '(A) exceção: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
    finally { await ctx.close(); }
  }
  // (B) portão: login e aceite com o auth.js de verdade (tests/auth-ipad-fixture.html), no iPad por toque, no claro e
  // no escuro. O juridico.js chega só no DOMContentLoaded — como no app, onde o build põe o auth.js antes dele —, então
  // a linha do login prova o completar. Todas as contas passam pelo aceite novo: o título e os textos dele têm de ser lidos.
  for (const tema of ['claro', 'escuro']) {
    const FIX = base + '/tests/auth-ipad-fixture.html';
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
    await ctx.addInitScript({ content: 'document.addEventListener("DOMContentLoaded", function () {\n' + ler('juridico.js') + '\n}, true);' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('ERRO NA PÁGINA (juridico-lgpd portão):', e.message));
    const linhaDoPortao = () => page.waitForFunction(() => { const p = document.querySelector('#catedra-auth-gate [data-politica-rodape]'); return !!p && p.textContent.trim().length > 0; }, null, { timeout: 20000 });
    const T = ' ' + tema;
    try {
      // o portão lê catedra:dark ao abrir: semeia na fixture (sem portão no meio) e só então abre
      await page.goto(FIX + '?semente');
      await page.evaluate((t) => { localStorage.clear(); sessionStorage.clear(); if (t === 'escuro') localStorage.setItem('catedra:dark', '1'); }, tema);
      await page.goto(FIX);
      await page.waitForSelector('#catedra-auth-gate #ctf', { timeout: 20000 });
      await linhaDoPortao();
      const linha = await medir(page, '#catedra-auth-gate [data-politica-rodape]');
      conferir(ok, R, 'login' + T, linha);
      if (tema === 'escuro') ok(!!linha && lumRgb(linha.fundo) < 0.1, R + 'login escuro: o fundo medido é mesmo escuro');
      const h2 = await medir(page, '#catedra-auth-gate h2');
      ok(!!h2 && h2.texto === 'Bem-vinda de volta' && h2.fonte === 28 && /Spectral/.test(h2.familia),
        R + 'login' + T + ': o título "' + (h2 && h2.texto) + '" recebe o estilo (28 px: ' + (h2 && h2.fonte) + '; família serifada da regra: ' + !!(h2 && /Spectral/.test(h2.familia)) + ')');
      legivel(ok, R, 'login' + T + ': título', h2);
      ok(await marcar(page, '^Ao entrar ou criar conta', 'frase'), R + 'login' + T + ': a frase do consentimento está no portão');
      legivel(ok, R, 'login' + T + ': frase do consentimento', await medir(page, '#catedra-auth-gate [data-ct-medir="frase"]'));

      await page.evaluate(() => {
        localStorage.setItem('__ct:signIn', JSON.stringify({ id: 'u1', email: 'pessoa@exemplo.invalid' }));
        localStorage.setItem('__ct:select', JSON.stringify({ data: null, error: null }));
        document.querySelector('#cte').value = 'pessoa@exemplo.invalid';
        document.querySelector('#ctp').value = 'senha-de-teste-1';
        document.querySelector('#cts').click();
      });
      await page.waitForSelector('#catedra-auth-gate #ctacok', { timeout: 20000 });
      conferir(ok, R, 'aceite' + T, await medir(page, '#catedra-auth-gate [data-politica-rodape]'));
      const h2a = await medir(page, '#catedra-auth-gate h2');
      ok(!!h2a && h2a.texto === 'Antes de continuar' && h2a.fonte === 26, R + 'aceite' + T + ': o título "' + (h2a && h2a.texto) + '" recebe o estilo (26 px: ' + (h2a && h2a.fonte) + ')');
      legivel(ok, R, 'aceite' + T + ': título', h2a);
      ok(await marcar(page, '^Para usar a Cátedra', 'paragrafo'), R + 'aceite' + T + ': o parágrafo do aceite está no portão');
      legivel(ok, R, 'aceite' + T + ': parágrafo', await medir(page, '#catedra-auth-gate [data-ct-medir="paragrafo"]'));
      const sair = await medir(page, '#catedra-auth-gate #ctacsair');
      legivel(ok, R, 'aceite' + T + ': "Não aceito — sair da conta"', sair);
      ok(!!sair && sair.h >= 44, R + 'aceite' + T + ': "Não aceito — sair da conta" é alvo de toque de ' + (sair ? Math.round(sair.w) + '×' + Math.round(sair.h) : '—') + ' (≥ 44)');
      // os dois botões dos documentos e o rótulo do checkbox (mediam 336×43 e 336×42 no iPad)
      const alvos = await page.evaluate(() => {
        const caixa = (e) => { if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left + r.width / 2, topo: r.top }; };
        const chk = document.querySelector('#catedra-auth-gate #ctac');
        return { termos: caixa(document.querySelector('#catedra-auth-gate button[data-doc="termos.html"]')), politica: caixa(document.querySelector('#catedra-auth-gate button[data-doc="privacidade.html"]')), rotulo: caixa(chk && chk.closest('label')) };
      });
      const tam = (c) => (c ? Math.round(c.w) + '×' + Math.round(c.h) : '—');
      ok(!!alvos.termos && !!alvos.politica && alvos.termos.h >= 44 && alvos.politica.h >= 44,
        R + 'aceite' + T + ': os botões "Termos de uso" (' + tam(alvos.termos) + ') e "Política de privacidade" (' + tam(alvos.politica) + ') são alvos de 44 px');
      ok(!!alvos.rotulo && alvos.rotulo.h >= 44, R + 'aceite' + T + ': o rótulo "Li e aceito…", alvo do checkbox de 18 px, mede ' + tam(alvos.rotulo) + ' (≥ 44)');
      // o ponto a 43 px do topo do rótulo é dele (com os 42 px de antes, caía fora). O teste de acerto vem antes do
      // toque porque o Chromium ajusta o toque para o alvo mais próximo e, sozinho, o toque passaria também antes.
      const pe = alvos.rotulo ? { x: alvos.rotulo.x, y: alvos.rotulo.topo + 43 } : null;
      const doRotulo = !!pe && await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y), l = e && e.closest('label'); return !!l && !!l.querySelector('#ctac'); }, pe);
      if (pe) await page.touchscreen.tap(pe.x, pe.y);
      const marcou = await page.evaluate(() => ({ chk: !!(document.querySelector('#catedra-auth-gate #ctac') || {}).checked, ok: !(document.querySelector('#catedra-auth-gate #ctacok') || { disabled: true }).disabled }));
      ok(doRotulo && marcou.chk && marcou.ok, R + 'aceite' + T + ': o ponto a 43 px do topo do rótulo é dele, e o toque ali marca o checkbox e libera "Aceitar e continuar"');
    } catch (e) { ok(false, R + '(B' + T + ') exceção: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
    finally { await ctx.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  await testarJuridicoLgpdRetencaoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
