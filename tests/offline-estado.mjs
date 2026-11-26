/* USO SEM INTERNET (25/11/2026) — offline-estado.js e o cartão de Ajustes › Dados.
   Parte 1 (Node, sem navegador): em que lugar o app roda (site, desenvolvimento, app nativo),
   o que o cartão diz em cada estado do worker (completo, parcial por área, offline, instalando,
   sem resposta), o fim do "Baixar o acervo completo" conferido com a releitura, o prazo da
   ponte do build e as listas de cópia.
   Parte 2 (navegador): o cartão pintado nos três lugares — o site numa origem https simulada
   com a ponte de mentira (addInitScript), o desenvolvimento (localhost) e o app do iPad
   (CATEDRA_BUILD) —, com contraste calculado nas oito direções e nas cores de destaque, claro
   e escuro, 44 px no toque, 390 px, a busca dos Ajustes e a contagem que não some no meio.
   Roda sozinho: node tests/offline-estado.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1048576;
function carregar() {
  const caixa = { window: {}, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'offline-estado.js'), 'utf8'), caixa);
  return caixa.window.CT_OFFLINE_ESTADO;
}
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const vez = () => new Promise((r) => setImmediate(r));
// o registro das áreas e as leis das outras áreas: os mesmos arquivos que o app carrega
function daJanela(arquivo, nome) {
  const caixa = { window: {} };
  vm.runInNewContext(ler(arquivo), caixa);
  return caixa.window[nome];
}

/* A ponte do build (window.__catedraOffline), tirada do próprio scripts/build.mjs e rodada com
   service worker, MessageChannel e relógio de mentira: é o texto que vai para o site. */
function ponteDoBuild(navegador) {
  const src = ler('scripts/build.mjs');
  const m = src.match(/window\.__catedraOffline = \(function \(\) \{[\s\S]*?\n\}\)\(\);/);
  if (!m) return null;
  const relogio = [];
  class Canal { constructor() { const a = { onmessage: null }; this.port1 = a; this.port2 = { postMessage: (d) => { if (a.onmessage) a.onmessage({ data: d }); } }; } }
  const janela = {};
  new Function('window', 'navigator', 'MessageChannel', 'setTimeout', 'clearTimeout', m[0])(
    janela, navegador, Canal, (fn, ms) => { relogio.push({ fn, ms }); return relogio.length; }, () => {});
  return { O: janela.__catedraOffline, relogio };
}

// todo texto que o cartão pode pôr na tela, para conferir vocabulário (sem jargão, "arquivos")
function textosDoCartao(c) {
  return [c.nota, c.conexaoSelo, c.conexaoTexto, c.acervoSelo, c.acervoLinha, c.acervoDetalhe, c.versaoRotulo, c.lidoRotulo, c.botaoBaixar, c.aviso]
    .filter(Boolean);
}

export async function testarOfflineEstadoEstatico(ok) {
  const R = 'OFFLINE ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'offline-estado.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && ['contexto', 'montar', 'fimDoBaixar', 'motivoDoErro', 'motivoDoRegistro', 'comPrazo', 'rotuloBuild', 'capacidadesDaArea', 'dependentesDosPesados']
      .every((k) => typeof M[k] === 'function'),
    R + 'publica contexto, montar, fimDoBaixar, motivoDoErro, motivoDoRegistro, comPrazo, rotuloBuild, capacidadesDaArea e dependentesDosPesados');
  const REG = daJanela('area-registry.js', 'CT_AREA_REG');
  // módulo sem a função: as asserções falham uma a uma, em vez de a exceção levar a parte inteira
  const caps = (a) => (typeof M.capacidadesDaArea === 'function' ? M.capacidadesDaArea(REG, a) : null);

  // 1. em que lugar o app roda
  const ctx = (href, alvo) => { const u = new URL(href); return M.contexto({ protocolo: u.protocol, host: u.hostname, alvo }); };
  ok(ctx('https://catedra-plataforma-fawn.vercel.app/index.html', 'web') === 'site' && ctx('https://x.vercel.app/') === 'site',
    R + 'site publicado: https fora de localhost (com ou sem o carimbo do build web)');
  ok(['http://localhost:8210/Catedra.dc.html', 'https://localhost/', 'https://127.0.0.1/', 'http://catedra.app/', 'file:///x/Catedra.dc.html']
      .every((u) => ctx(u) === 'dev'), R + 'localhost, 127.0.0.1, http e arquivo aberto direto são desenvolvimento');
  ok(ctx('file:///Applications/Catedra.app/web/index.html', 'macOS') === 'nativo' && ctx('file:///x/index.html', 'iPadOS') === 'nativo'
      && ctx('http://localhost:8210/', 'iPadOS') === 'nativo', R + 'o carimbo do build nativo (macOS/iPadOS) decide o app nativo');
  // a mesma condição de produção do worker (IS_PROD) e do registro na página (ctProd)
  {
    const sw = ler('sw.js'), build = ler('scripts/build.mjs');
    const condSw = (sw.match(/var IS_PROD = [^\n]*;/) || [])[0];
    const condPag = ((build.match(/var ctProd = [^\n]*;/) || [])[0] || '').replace(/\\\./g, '.');
    const amostras = ['https://catedra.app/', 'https://x.vercel.app/', 'http://localhost:8461/', 'https://localhost/', 'https://127.0.0.1/', 'http://catedra.app/', 'file:///x/index.html'];
    const igual = !!condSw && !!condPag && amostras.every((href) => {
      const loc = new URL(href);
      const noSw = new Function('self', 'var HOST = self.location.hostname; ' + condSw + ' return IS_PROD;')({ location: loc });
      const naPag = new Function('location', condPag + ' return ctProd;')(loc);
      return noSw === naPag && noSw === (ctx(href) === 'site');
    });
    ok(igual, R + 'o cartão chama de "site" exatamente onde o worker e o registro da página operam (' + amostras.length + ' endereços)');
  }

  // 2. o site, com o estado que o worker devolve
  const HOJE = new Date(2026, 10, 25, 14, 32).getTime(), DEPOIS = new Date(2026, 10, 25, 14, 40).getTime();
  const base = { contexto: 'site', online: true, ponte: true, lidoEm: HOJE, agora: DEPOIS, area: 'juridica', capacidades: caps('juridica') };
  const completo = M.montar({ ...base, estado: { prontos: 40, total: 40, bytes: 31.2 * MB, totalBytes: 31.2 * MB, versao: 'catedra-0123456789ab', auto: { prontos: 30, total: 30 } } });
  ok(completo.acervoSituacao === 'completo' && completo.acervoSelo === 'Completo' && completo.acervoTom === 'ok'
     && completo.acervoLinha === '40 arquivos · 31,2 MB', R + 'completo: selo "Completo" (tom bom) e "40 arquivos · 31,2 MB" (' + completo.acervoLinha + ')');
  // "Completo" conta só as listas do worker: não promete o que fica fora delas
  ok(/^Os 40 arquivos desta versão estão neste aparelho\./.test(completo.acervoDetalhe) && /texto das leis no LEGIS/.test(completo.acervoDetalhe)
     && /verbetes do JURIS/.test(completo.acervoDetalhe) && /Central de Contas/.test(completo.acervoDetalhe) && /IA sempre pede conexão/.test(completo.acervoDetalhe)
     && !/Tudo guardado|abre sem internet/.test(completo.acervoDetalhe),
    R + 'completo: diz que os arquivos DESTA versão estão no aparelho e o que fica fora da conta (LEGIS, JURIS, Contas, IA), sem "tudo abre sem internet"');
  ok(!completo.mostrarBaixar && completo.podeReler && completo.versaoRotulo === 'Versão do cache' && completo.versaoValor === 'catedra-0123456789ab',
    R + 'completo: sem botão de baixar, com "Ler de novo" e a versão do cache que o worker informou');
  ok(completo.temLido && completo.lido === 'às 14:32' && completo.lidoRotulo === 'Estado lido', R + 'diz quando o estado foi lido (' + completo.lido + ')');

  // parcial: o que o app guarda sozinho ainda não chegou — aviso, e quanto falta
  const parcial = M.montar({ ...base, estado: { prontos: 12, total: 40, bytes: 8.1 * MB, totalBytes: 31.2 * MB, versao: 'catedra-0123456789ab', auto: { prontos: 12, total: 30 } } });
  ok(parcial.acervoSituacao === 'parcial' && parcial.acervoSelo === 'Parcial' && parcial.acervoTom === 'aviso' && /ct-selo-aviso/.test(parcial.acervoClasse)
     && parcial.acervoLinha === '12 de 40 arquivos · 8,1 de 31,2 MB', R + 'parcial: "k de N arquivos · X de Y MB" em tom de aviso (' + parcial.acervoLinha + ')');
  ok(parcial.mostrarBaixar && !parcial.bloqueiaBaixar && parcial.botaoBaixar === 'Baixar o acervo completo'
     && /guarda sozinho ainda não está neste aparelho/.test(parcial.acervoDetalhe) && /Faltam 23,1 MB no total/.test(parcial.acervoDetalhe),
    R + 'parcial: o botão aparece e o detalhe diz o que falta e quanto baixa antes do toque (' + parcial.acervoDetalhe + ')');
  // só os pesados faltando, área jurídica: neutro, e diz de que telas eles dependem — sem prometer o "estudo do dia"
  const pesados = { prontos: 30, total: 40, bytes: 11 * MB, totalBytes: 31.2 * MB, versao: 'v', auto: { prontos: 30, total: 30 } };
  const soPesados = M.montar({ ...base, estado: pesados });
  ok(soPesados.acervoSelo === 'Parcial' && soPesados.acervoTom === '' && soPesados.acervoClasse === 'ct-selo'
     && /^O que o app guarda sozinho já está aqui\. Faltam 20,2 MB em arquivos pesados, fora do download automático/.test(soPesados.acervoDetalhe)
     && /deles dependem, sem internet, o Simulado misto, as abas Jurisprudência e Bancas reais da Prova oral, o texto completo das provas da Fase Discursiva e a importação de PDF\.$/.test(soPesados.acervoDetalhe),
    R + 'área jurídica, só os pesados faltando: "Parcial" neutro e o detalhe diz que telas dependem deles (' + soPesados.acervoDetalhe + ')');
  // na área jurídica o Modo ENAM (questoes-enam.js) e a aba Lei seca da Prova oral (blocos de leis-seca)
  // usam só a parte automática: o texto não pode dar "o simulado" ou "a Prova oral" inteiros como dependentes
  ok(!/estudo do dia já está guardado|quando você pede|ENAM|o simulado|, a Prova oral/.test(soPesados.acervoDetalhe)
     && M.montar({ ...base, area: '', estado: pesados }).acervoTom === '',
    R + 'sem "estudo do dia guardado", sem "só desce quando você pede" e sem dar o simulado ou a Prova oral inteiros como dependentes; sem área escolhida vale a jurídica');
  // o que o texto cita sai das listas do build: pesados (sob pedido) × parte automática
  {
    const b = ler('scripts/build.mjs');
    const sob = (b.match(/const acervoSobPedido = \[[\s\S]*?\n\];/) || [''])[0], auto = (b.match(/const acervoOffline = \[[\s\S]*?\n\];/) || [''])[0];
    ok(['./juris-text.js', './oral-conteudo.js', './leis-seca-areas.js', './discursivas-textos.js'].every((f) => sob.includes("'" + f + "'")) && /PDFJS\.map/.test(sob)
       && ['./questoes-enam.js', './oral.js', './treino.js'].every((f) => auto.includes("'" + f + "'")) && /dados\/leis-seca\//.test(auto) && !/juris-text|leis-seca-areas/.test(auto),
      R + 'as telas citadas batem com as listas do build: juris-text, oral-conteudo, leis-seca-areas, discursivas-textos e PDF.js são pesados; ENAM, oral.js e os blocos de lei seca são automáticos');
  }
  // o "Parcial" de cada área de estudo, com o registro das áreas de verdade (area-registry.js): cita só
  // as telas que a área abre e que carregam um pesado, e só avisa onde as leis da área estão entre eles
  const AREAS = Object.keys(REG.AREAS), porArea = {};
  AREAS.forEach((a) => { porArea[a] = M.montar({ ...base, area: a, capacidades: caps(a), estado: pesados }); });
  const areas = AREAS.map((a) => porArea[a]);
  const comLeis = ['saude', 'social', 'educacao', 'tecnologia', 'policial', 'fiscal', 'contas', 'administrativa'];
  ok(AREAS.length === 12 && comLeis.every((a) => porArea[a].acervoTom === 'aviso' && /ct-selo-aviso/.test(porArea[a].acervoClasse)
     && porArea[a].acervoDetalhe === 'O que o app guarda sozinho já está aqui, mas as leis da sua área estão entre os arquivos pesados, '
       + 'fora do download automático (faltam 20,2 MB): deles dependem, sem internet, o Simulado misto e a Prova oral.'),
    R + 'as ' + comLeis.length + ' áreas com leis próprias entre os pesados: aviso — o Simulado misto e a Prova oral delas dependem dessas leis');
  // OAB (o simulado é o registro do Exame; sem Prova oral nem Fase Discursiva), Militar e Outra: nada delas carrega um pesado
  ok(['oab', 'militar', 'outra'].every((a) => porArea[a].acervoTom === '' && porArea[a].acervoClasse === 'ct-selo'
     && porArea[a].acervoDetalhe === 'O que o app guarda sozinho já está aqui. Faltam 20,2 MB em arquivos pesados, fora do download automático; '
       + 'nenhuma tela da sua área de estudo depende deles.'),
    R + 'OAB, Militar e Outra: "Parcial" neutro, sem "leis da sua área", sem Simulado e sem Prova oral (' + porArea.oab.acervoDetalhe + ')');
  ok(porArea.juridica.acervoDetalhe === soPesados.acervoDetalhe && JSON.stringify(caps('')) === JSON.stringify(caps('juridica'))
     && M.montar({ ...base, area: '', capacidades: caps(''), estado: pesados }).acervoDetalhe === soPesados.acervoDetalhe,
    R + 'sem área escolhida, valem as capacidades e o texto da jurídica (o host usa areaEstudo || \'juridica\')');
  // o que o "Parcial" cita confere com os dados e com o guarda de rota, área por área
  {
    const leis = daJanela('leis-seca-areas.js', 'CT_LEIS_AREAS') || [];
    const nLeis = (a) => leis.filter((l) => (l.areas || []).indexOf(a) >= 0).length;
    const diverge = [];
    AREAS.forEach((a) => {
      const d = porArea[a].acervoDetalhe;
      // "as leis da sua área" só onde leis-seca-areas.js tem lei dela e a área abre o simulado ou a Prova oral (fora da jurídica)
      if (/as leis da sua área/.test(d) !== (a !== 'juridica' && nLeis(a) > 0 && (REG.tem(a, 'bancoDeQuestoes') || REG.podeAbrir(a, 'oral')))) diverge.push(a + ' leis(' + nLeis(a) + ')');
      // o Simulado misto é o do banco de questões (na OAB, a rota dos simulados é o registro do Exame)
      if (/Simulado misto/.test(d) !== REG.tem(a, 'bancoDeQuestoes')) diverge.push(a + ' simulado');
      if (/Prova oral/.test(d) !== REG.podeAbrir(a, 'oral')) diverge.push(a + ' oral');
      if (/Fase Discursiva|importação de PDF/.test(d) !== REG.podeAbrir(a, 'redacao')) diverge.push(a + ' discursiva');
    });
    // a importação de PDF mora só na Fase Discursiva: o espelho importado na Redação é o único uso do PDF.js
    const host = ler('Catedra.dc.html'), iRed = host.indexOf('importRedGab = ()=>');
    const pdfSoNaRedacao = host.split('this._extractEditalPdf(').length === 2 && host.split('this._pdfLib()').length === 2
      && iRed > 0 && host.indexOf('this._extractEditalPdf(', iRed) > iRed && host.indexOf('this._extractEditalPdf(', iRed) < host.indexOf('inp.click();', iRed);
    ok(leis.length > 0 && diverge.length === 0 && pdfSoNaRedacao,
      R + 'o "Parcial" de cada uma das ' + AREAS.length + ' áreas confere com as leis etiquetadas em leis-seca-areas.js, com as telas que a área abre e com o único uso do PDF'
      + (diverge.length ? ' (diverge: ' + diverge.join(', ') + ')' : '') + (pdfSoNaRedacao ? '' : ' (o PDF tem outro uso além da Redação)'));
  }
  // sem o registro das áreas, o cartão não afirma nada sobre as telas
  ok(typeof M.capacidadesDaArea === 'function' && M.capacidadesDaArea(undefined, 'oab') === null
     && M.montar({ ...base, capacidades: null, estado: pesados }).acervoDetalhe === 'O que o app guarda sozinho já está aqui. Faltam 20,2 MB em arquivos pesados, fora do download automático.'
     && M.montar({ ...base, area: 'saude', capacidades: null, estado: pesados }).acervoTom === '',
    R + 'sem o registro das áreas: "Parcial" neutro, sem citar telas nem leis da área');
  const semAuto = M.montar({ ...base, estado: { prontos: 5, total: 40, bytes: 2 * MB, totalBytes: 31.2 * MB, versao: 'v' } });
  ok(semAuto.acervoTom === 'aviso' && semAuto.acervoDetalhe === 'Faltam 29,2 MB no total; o botão abaixo tenta baixar tudo.',
    R + 'worker sem a parte automática no estado: aviso, só com o que ele mede (' + semAuto.acervoDetalhe + ')');

  // 3. conexão ao vivo
  const parcialOff = M.montar({ ...base, online: false, estado: { prontos: 12, total: 40, bytes: 1, totalBytes: 2, versao: 'v', auto: { prontos: 12, total: 30 } } });
  ok(parcialOff.conexaoSelo === 'Offline' && parcialOff.conexaoTom === '' && parcialOff.conexaoClasse === 'ct-selo' && /o resto espera a conexão/.test(parcialOff.conexaoTexto),
    R + 'offline e parcial: selo "Offline" neutro (offline é a condição normal) e o que abre e o que espera a conexão');
  ok(parcialOff.mostrarBaixar && parcialOff.bloqueiaBaixar && /Para baixar, conecte-se à internet\.$/.test(parcialOff.acervoDetalhe),
    R + 'offline: o botão de baixar fica travado e o motivo aparece');
  const completoOff = M.montar({ ...base, online: false, estado: { prontos: 3, total: 3, bytes: 1, totalBytes: 1, versao: 'v' } });
  ok(/continua abrindo/.test(completoOff.conexaoTexto) && completo.conexaoSelo === 'Online' && completo.conexaoTom === 'ok',
    R + 'offline e completo: "o acervo guardado continua abrindo"; online: selo "Online" em tom bom');

  // 4. sem resposta do worker — o cartão nunca chuta número
  ok(M.motivoDoErro(new Error('sem service worker')) === 'sem-sw' && M.motivoDoErro(new Error('worker não ativo')) === 'inativo'
     && M.motivoDoErro(new Error('sem resposta do worker')) === 'tempo' && M.motivoDoErro({ ctMotivo: 'tempo' }) === 'tempo'
     && M.motivoDoErro(new Error('qualquer')) === 'erro', R + 'cada falha da ponte vira um motivo próprio');
  // o registro responde antes da ponte: instalando (sem ativo) não espera o prazo
  ok(M.motivoDoRegistro(undefined) === '' && M.motivoDoRegistro(null) === '' && M.motivoDoRegistro({ active: {} }) === ''
     && M.motivoDoRegistro({ active: null, installing: {} }) === 'inativo' && M.motivoDoRegistro({ active: null, waiting: {} }) === 'inativo'
     && M.motivoDoRegistro({ active: {}, waiting: {} }) === '', R + 'registro instalando ou esperando, sem worker ativo, vira "instalando"; com ativo, a ponte pergunta');
  const instalando = M.montar({ ...base, estado: null, erro: 'inativo' });
  ok(instalando.acervoSituacao === 'instalando' && instalando.acervoSelo === 'Instalando' && /ainda está sendo instalado/.test(instalando.acervoLinha)
     && /se atualiza quando terminar/.test(instalando.acervoDetalhe) && !instalando.mostrarBaixar && instalando.podeReler,
    R + 'instalando: selo "Instalando", diz que se atualiza ao terminar, sem número e sem baixar');
  const semResp = M.montar({ ...base, estado: null, erro: 'tempo' });
  ok(semResp.acervoSituacao === 'sem-resposta' && semResp.acervoSelo === 'Sem resposta' && /não respondeu a tempo/.test(semResp.acervoLinha)
     && !/\d+ de \d+/.test(semResp.acervoLinha) && !semResp.mostrarBaixar && semResp.podeReler && semResp.versaoValor === '—',
    R + 'sem resposta: diz que não houve resposta, sem número, sem botão de baixar e com "Ler de novo"');
  ok(semResp.lidoRotulo === 'Última tentativa', R + 'sem resposta, o horário é o da última tentativa, não o de uma leitura');
  const linhas = ['sem-sw', 'inativo', 'tempo', 'sem-estado', 'erro'].map((e) => M.montar({ ...base, estado: null, erro: e }).acervoLinha);
  ok(new Set(linhas).size === 5 && /janela privada/.test(M.montar({ ...base, estado: null, erro: 'sem-sw' }).acervoDetalhe),
    R + 'cada motivo tem frase própria (navegador sem o modo sem internet cita a janela privada)');
  const lendo = M.montar({ ...base, lidoEm: 0, estado: null, lendo: true });
  ok(lendo.acervoSituacao === 'lendo' && lendo.relendoAttr === 'true' && !lendo.temLido, R + 'antes da primeira resposta: "lendo", sem horário');
  ok(M.montar({ ...base, ponte: false }).acervoSituacao === 'sem-ponte' && !M.montar({ ...base, ponte: false }).podeReler,
    R + 'site sem a ponte do build: diz que não há dados, sem botão');
  ok(M.montar({ ...base, estado: { prontos: 0, total: 0, bytes: 0, totalBytes: 0, versao: 'v' } }).acervoSituacao === 'sem-lista',
    R + 'worker sem lista do acervo não vira "completo" nem "0 de 0"');

  // 5. desenvolvimento e app nativo
  const dev = M.montar({ contexto: 'dev', online: true });
  ok(/só funciona no site publicado/.test(dev.nota) && dev.acervoSelo === 'Desligado' && /se desliga sozinha/.test(dev.acervoDetalhe)
     && dev.versaoValor === 'nenhuma' && !dev.temAcoes && !dev.temLido, R + 'desenvolvimento: "só funciona no site publicado", sem botão e sem número');
  const ipad = M.montar({ contexto: 'nativo', online: true, build: { versao: 'abc1234', data: '2026-11-25', alvo: 'iPadOS' } });
  ok(ipad.nota === 'No app instalado, o acervo vem embutido no aplicativo.' && ipad.acervoSelo === 'Embutido' && ipad.acervoTom === 'ok'
     && ipad.versaoRotulo === 'Versão do app' && ipad.versaoValor === 'versão abc1234 · iPadOS' && !ipad.temAcoes && /Não há o que baixar/.test(ipad.acervoDetalhe),
    R + 'app instalado: acervo embutido, nada a baixar e a versão do build, sem botão');
  // o mesmo bundle roda no iPhone (carimbo iPadOS) e no Windows (carimbo macOS): o texto não nomeia o aparelho
  const mac = M.montar({ contexto: 'nativo', online: false, build: { versao: 'abc1234', alvo: 'macOS' } });
  ok(mac.nota === ipad.nota && !/Mac|iPad|iPhone|Windows/.test(mac.nota + ipad.nota) && /acervo embutido continua abrindo/.test(mac.conexaoTexto),
    R + 'app instalado offline: o acervo embutido continua abrindo, e o texto serve a qualquer aparelho');
  // a versão do app é a MESMA frase do "Versão e suporte" (buildLabel no render do host)
  {
    const expr = (ler('Catedra.dc.html').match(/buildLabel:(\(\(window\.CATEDRA_BUILD[^\n]*?\|\|'versão de desenvolvimento'\))/) || [])[1];
    const host = expr ? (b) => new Function('window', 'return ' + expr)({ CATEDRA_BUILD: b }) : null;
    const amostras = [null, { versao: 'abc1234', alvo: 'iPadOS' }, { versao: 'ff3c87f', alvo: 'web' }];
    ok(!!host && amostras.every((b) => host(b) === M.rotuloBuild(b)), R + 'a versão do app no cartão é a mesma frase do "Versão e suporte"');
  }

  // 6. o fim do "Baixar o acervo completo"
  const cortou = M.fimDoBaixar({ resultado: { baixados: 28, jaTinha: 10, falhas: 0, cortados: 2, total: 38 } });
  ok(cortou.tipo === 'aviso' && /28 arquivos baixados agora/.test(cortou.texto) && /10 já estavam guardados/.test(cortou.texto)
     && /Ficaram de fora 2 arquivos para não encher o espaço/.test(cortou.texto) && /Liberar espaço no aparelho/.test(cortou.texto),
    R + 'o fim diz quantos desceram, quantos já estavam e quantos o orçamento de espaço do aparelho deixou de fora');
  ok(/Ficou de fora 1 arquivo para/.test(M.fimDoBaixar({ resultado: { baixados: 1, cortados: 1 } }).texto), R + 'um arquivo cortado: concordância no singular');
  const caiu = M.fimDoBaixar({ resultado: { baixados: 5, jaTinha: 0, falhas: 3, cortados: 0 } });
  ok(caiu.tipo === 'aviso' && /3 arquivos não desceram/.test(caiu.texto) && /só o que faltou/.test(caiu.texto), R + 'falha de rede no meio: diz quantos não desceram e que tocar de novo retoma');
  const tudo = M.fimDoBaixar({ resultado: { baixados: 30, jaTinha: 0, falhas: 0, cortados: 0 } }, 0);
  ok(tudo.tipo === 'ok' && tudo.texto === 'Download terminado: 30 arquivos baixados agora. Numa versão nova do app, os arquivos pesados precisam ser baixados de novo.',
    R + 'tudo certo: "Download terminado", sem alarme, e avisa que a versão nova pede o download de novo (' + tudo.texto + ')');
  ok(/não confirmou o fim do download/.test(M.fimDoBaixar({ erro: 'tempo' }).texto) && /continuar de onde parou/.test(M.fimDoBaixar({ erro: 'tempo' }).texto),
    R + 'prazo estourado: o que já desceu fica guardado e tocar de novo continua de onde parou');
  ok(M.fimDoBaixar({ erro: 'sem-sw' }).tipo === 'erro' && /não oferece o modo sem internet/.test(M.fimDoBaixar({ erro: 'sem-sw' }).texto)
     && M.fimDoBaixar({ resultado: null }).tipo === 'erro' && /nada para baixar/.test(M.fimDoBaixar({ resultado: { baixados: 0 } }).texto),
    R + 'download que nem começou, worker que falhou e lista vazia têm frase própria');
  // a releitura feita depois do fim é a palavra final (o cartão some com o botão quando ela acha tudo)
  const tempoCompleto = M.fimDoBaixar({ erro: 'tempo' }, 0);
  const falhaGuardada = M.fimDoBaixar({ resultado: { baixados: 3, falhas: 2 } }, 0);
  ok(tempoCompleto.tipo === 'ok' && /releitura acha o acervo completo/.test(tempoCompleto.texto) && !/de novo para continuar/.test(tempoCompleto.texto)
     && falhaGuardada.tipo === 'ok' && !/não desceram|toque de novo/.test(falhaGuardada.texto),
    R + 'prazo estourado ou falha que a releitura acha guardada: não manda tocar num botão que sumiu');
  const nadaDesceu = M.fimDoBaixar({ resultado: { baixados: 0, jaTinha: 45, falhas: 0, cortados: 4 } }, 4);
  ok(nadaDesceu.tipo === 'aviso' && /^Nada desceu desta vez: 45 já estavam guardados\. Ficaram de fora 4 arquivos/.test(nadaDesceu.texto),
    R + 'segundo toque sem espaço: "Nada desceu desta vez", e não "Download terminado" (' + nadaDesceu.texto.slice(0, 60) + '…)');
  const semMotivo = M.fimDoBaixar({ resultado: { baixados: 6, jaTinha: 43 } }, 2);
  ok(semMotivo.tipo === 'aviso' && /Ainda faltam 2 arquivos neste aparelho/.test(semMotivo.texto),
    R + 'a releitura ainda não acha arquivos que o worker não explicou: o aviso diz quantos faltam');
  const baixando = M.montar({ ...base, lendo: true, baixando: true, estado: { prontos: 25, total: 40, bytes: 18 * MB, totalBytes: 30 * MB, versao: 'v', auto: { prontos: 25, total: 30 } } });
  ok(baixando.botaoBaixar === 'Baixando…' && baixando.baixandoAttr === 'true' && baixando.bloqueiaBaixar && baixando.avisoTipo === 'info'
     && /contagem acima sobe/.test(baixando.aviso) && baixando.acervoLinha === '25 de 40 arquivos · 18,0 de 30,0 MB' && baixando.relendoAttr === 'false',
    R + 'baixando: botão ocupado, aviso honesto e a contagem real do que já está guardado');
  // o giro do aria-busy ocupa o lugar do ícone: dois ícones no mesmo botão confundem
  ok(!baixando.iconeBaixar && completo.iconeReler && parcial.iconeBaixar && !lendo.iconeReler,
    R + 'botão ocupado (baixando ou relendo) mostra só o giro, sem o ícone ao lado');
  const durante = M.montar({ ...base, baixando: true, estado: pesados });
  ok(!/quando você pede/.test(durante.acervoDetalhe) && /fora do download automático/.test(durante.acervoDetalhe),
    R + 'durante o download, o detalhe não diz "só descem quando você pede"');
  ok(M.montar({ ...base, estado: { prontos: 38, total: 40, bytes: 1, totalBytes: 2, versao: 'v' }, fim: { resultado: { baixados: 28, cortados: 2 }, versao: 'v' } }).avisoTipo === 'aviso',
    R + 'o aviso do último download fica no cartão depois que ele termina');
  const outraVersao = M.montar({ ...base, estado: { prontos: 0, total: 40, bytes: 0, totalBytes: 2, versao: 'v2' }, fim: { resultado: { baixados: 28, cortados: 2 }, versao: 'v1' } });
  ok(!outraVersao.temAviso && outraVersao.aviso === '', R + 'saiu versão nova do cache: o aviso do download da versão anterior não fica ao lado de "0 de 40"');
  // o plano do worker corta pela soma da lista inteira, inclusive o já guardado: "ficou de fora"
  // conta só o que a releitura depois do fim não achou (menos o que falhou na rede)
  const jaGuardado = M.montar({ ...base, estado: { prontos: 40, total: 40, bytes: 1, totalBytes: 1, versao: 'v' },
    fim: { resultado: { baixados: 5, jaTinha: 33, falhas: 0, cortados: 2 } } });
  ok(jaGuardado.avisoTipo === 'ok' && !/de fora/.test(jaGuardado.aviso) && jaGuardado.acervoSituacao === 'completo',
    R + 'cortado que a releitura acha guardado não vira "ficou de fora" (' + jaGuardado.aviso + ')');
  const misto = M.fimDoBaixar({ resultado: { baixados: 3, jaTinha: 0, falhas: 1, cortados: 2 } }, 2);
  ok(/1 arquivo não desceu/.test(misto.texto) && /Ficou de fora 1 arquivo para/.test(misto.texto),
    R + 'faltam 2 depois do fim, 1 falhou na rede: só 1 ficou de fora pelo espaço');
  ok(M.fimDoBaixar({ resultado: { baixados: 0, jaTinha: 0, falhas: 0, cortados: 3 } }, 0).texto === 'Nada a baixar: o acervo já estava todo guardado neste aparelho.',
    R + 'tudo cortado, mas tudo já guardado: diz que nada faltava');

  // 7. vocabulário: nada de "service worker" na tela, e a conta é de arquivos
  {
    const cartoes = [completo, parcial, soPesados, semAuto, parcialOff, completoOff, instalando, semResp, lendo, dev, ipad, mac, baixando, jaGuardado,
      M.montar({ ...base, ponte: false }), M.montar({ ...base, estado: { prontos: 0, total: 0, versao: 'v' } }), ...areas,
      ...['sem-sw', 'inativo', 'tempo', 'sem-estado', 'erro'].map((e) => M.montar({ ...base, estado: null, erro: e }))];
    const fins = [cortou, caiu, tudo, tempoCompleto, falhaGuardada, nadaDesceu, semMotivo, misto, M.fimDoBaixar({ erro: 'tempo' }),
      ...['sem-sw', 'inativo', 'sem-estado', 'erro'].map((e) => M.fimDoBaixar({ erro: e })), M.fimDoBaixar({ resultado: null }), M.fimDoBaixar({ resultado: { pulado: 'saveData' } })];
    const todos = cartoes.flatMap(textosDoCartao).concat(fins.map((f) => f.texto));
    const jargao = todos.filter((t) => /service worker|\bworker\b/i.test(t));
    ok(todos.length > 60 && jargao.length === 0, R + 'nenhuma frase de tela fala "service worker" (' + todos.length + ' frases; ' + (jargao[0] || 'nenhuma com jargão') + ')');
    ok(![completo, parcial, soPesados, baixando].some((c) => /\bacervos?\b/.test(c.acervoLinha)) && ![cortou, caiu, misto].some((f) => /\d+ acervos?\b/.test(f.texto)),
      R + 'a contagem é de arquivos (nem tudo na lista é acervo: há satélites, CSS e PDF.js)');
  }

  // 8. números e horas
  ok(M.mb(0) === '0 MB' && M.mb(1024) === '< 0,1 MB' && M.mb(31.2 * MB) === '31,2 MB', R + 'megabytes com vírgula, e poucos KB não viram "0,0"');
  ok(M.hora(new Date(2026, 10, 24, 23, 50).getTime(), DEPOIS) === 'em 24/11 às 23:50' && M.hora(0, DEPOIS) === '', R + 'leitura de outro dia leva a data');

  // 9. prazos: o do host e o da ponte do build
  ok(await M.comPrazo(new Promise((r) => setTimeout(() => r(7), 5)), 500) === 7, R + 'com prazo, a resposta a tempo passa');
  let motivo = '';
  try { await M.comPrazo(new Promise(() => {}), 20); } catch (e) { motivo = M.motivoDoErro(e); }
  ok(motivo === 'tempo' && M.ESPERA_ESTADO_MS > 20000 && M.ESPERA_BAIXAR_MS > 360000,
    R + 'promessa que nunca responde vira "tempo"; o prazo do host fica acima do da ponte (estado e download)');
  // ponte que mudou de forma vira falha com nome, não exceção que derruba a suíte
  try {
    const enviados = [];
    const ativo = { postMessage: (msg, portas) => enviados.push({ msg, porta: portas[0] }) };
    const p = ponteDoBuild({ serviceWorker: { ready: Promise.resolve({ active: ativo }), controller: null } });
    ok(!!p && !!p.O, R + 'a ponte do build (scripts/build.mjs) foi achada e roda');
    if (p && p.O) {
      const pe = p.O.estado(); await vez(); await vez();
      enviados[0].porta.postMessage({ type: 'ctEstadoOffline', ok: true, estado: { prontos: 1, total: 2 } });
      const pb = p.O.baixar(); await vez(); await vez();
      enviados[1].porta.postMessage({ type: 'ctAquecerAcervos', ok: true, resultado: { baixados: 1, cortados: 1 } });
      const [e1, r1] = await Promise.all([pe, pb]);
      ok(p.relogio[0].ms === 20000 && p.relogio[1].ms >= 300000 && enviados[1].msg.type === 'ctAquecerAcervos',
        R + 'a ponte espera o estado 20 s e o download ' + Math.round((p.relogio[1] || {}).ms / 60000) + ' min (o download leva minutos num 4G)');
      ok(e1 && e1.prontos === 1 && r1 && r1.cortados === 1, R + 'a ponte entrega o estado e o resultado do download (com os cortados)');
      const pt = p.O.estado(); await vez(); await vez();
      p.relogio[2].fn();
      let m2 = '';
      try { await pt; } catch (e) { m2 = M.motivoDoErro(e); }
      ok(m2 === 'tempo', R + 'worker mudo: a ponte rejeita e o cartão lê "tempo"');
    }
    const semSw = ponteDoBuild({});
    let m3 = '';
    try { await semSw.O.estado(); } catch (e) { m3 = M.motivoDoErro(e); }
    ok(m3 === 'sem-sw', R + 'navegador sem service worker: a ponte rejeita e o cartão lê "sem-sw"');
  } catch (e) { ok(false, R + 'a ponte do build roda com worker de mentira (' + String(e && e.message || e).split('\n')[0] + ')'); }

  // 10. o arquivo viaja nos dois builds e na casca do worker; nada de estado novo persistido
  {
    const build = ler('scripts/build.mjs'), mac2 = ler('scripts/build-macos.mjs'), host = ler('Catedra.dc.html');
    const copiar = (build.match(/const COPIAR = \[[^\]]*\];/) || [''])[0];
    const casca = (build.match(/const casca = \[[\s\S]*?\];/) || [''])[0];
    const listaMac = (mac2.match(/for \(const f of (\[[^\]]*\])\)/) || [])[1] || '';
    ok(copiar.includes("'offline-estado.js'") && casca.includes("'./offline-estado.js'") && listaMac.includes("'offline-estado.js'"),
      R + 'offline-estado.js está no COPIAR e na casca do site e na lista do bundle nativo');
    ok(/<script src="\.\/offline-estado\.js"><\/script>/.test(host), R + 'o host carrega offline-estado.js no <head>');
    const i = host.indexOf('_autosaveKeys(){'), chaves = i >= 0 ? host.slice(i, host.indexOf('}', i)) : '';
    ok(!!chaves && !/'off[A-Z]/.test(chaves) && !/catedra:off/.test(host), R + 'estado do cartão é só de tela: fora do autosave, sem chave catedra: nova');
    ok(/\{t:'dados',\s*nome:'Uso sem internet'/.test(host), R + 'a busca dos Ajustes acha "Uso sem internet" (índice da aba Dados)');
    // o worker não sabe a área (sw.js); o host sabe, e é ela que decide o tom do "Parcial"
    const vars = host.slice(host.indexOf('_offVars(){'), host.indexOf('_offVars(){') + 2600);
    ok(/area:this\.state\.areaEstudo/.test(vars) && /capacidades:M\.capacidadesDaArea \? M\.capacidadesDaArea\(window\.CT_AREA_REG, this\.state\.areaEstudo\|\|''\)/.test(vars)
       && /_novidTinta\(tk\)/.test(vars) && /tinta\('ok'\)/.test(vars) && /tinta\('warn'\)/.test(vars),
      R + 'o host passa a área de estudo e as capacidades dela (registro das áreas) e pinta a situação com a tinta da casa (ok/warn), não com a cor de destaque');
  }
}

/* ---- Parte 2: navegador ---- */
const ORIGEM_SITE = 'https://catedra.teste';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const DIRECOES = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];
// as cores do seletor de destaque (lidas do host) e o magenta de fábrica do app nativo (build-macos.mjs)
function coresDeDestaque() {
  const m = ler('Catedra.dc.html').match(/const accentOpts = (\[[^\]]*\]);/);
  const lista = m ? new Function('return ' + m[1])() : [];
  const mac = (ler('scripts/build-macos.mjs').match(/setItem\('catedra:accent','"(#[0-9a-f]{6})"'\)/i) || [])[1];
  return lista.concat(mac ? [mac] : []);
}

// mede no próprio navegador: cor do texto composta sobre o fundo efetivo (camadas translúcidas).
// Fundo em gradiente (o .ct-btn da vitrine pinta com background-image, e o background-color fica
// transparente): vale a PIOR parada do gradiente — medir só a cor de fundo daria um falso 1:1.
const MEDIR = (sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const cor = (c) => {
    let m = String(c).match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = String(c).match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const sobre = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) });
  const paradas = (img) => (String(img).match(/rgba?\([^)]*\)|color\(srgb [^)]*\)/g) || []).map(cor).filter(Boolean);
  const branco = { r: 255, g: 255, b: 255 };
  const camadas = []; let bases = [branco];
  for (let e = el; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    const g = /gradient/.test(s.backgroundImage) ? paradas(s.backgroundImage) : [];
    if (g.length) { bases = g.map((c) => sobre(c, branco)); break; }
    const c = cor(s.backgroundColor);
    if (c && c.a > 0) { camadas.push(c); if (c.a >= 1) break; }
  }
  const fundos = bases.map((b0) => { let f = b0; for (let i = camadas.length - 1; i >= 0; i--) f = sobre(camadas[i], f); return f; });
  const cs = getComputedStyle(el), t = cor(cs.color);
  const lum = (x) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(x.r) + 0.7152 * f(x.g) + 0.0722 * f(x.b); };
  const razao = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const r = el.getBoundingClientRect();
  return { razao: t ? Math.min.apply(null, fundos.map((f) => razao(sobre(t, f), f))) : 0,
    w: r.width, h: r.height, cor: cs.color, texto: el.textContent.trim(), ocupado: el.getAttribute('aria-busy'), travado: !!el.disabled };
};

/* Varre as oito direções e as cores de destaque, no claro e no escuro, e mede os seletores
   pedidos. Tudo numa ida ao navegador; volta para o escuro da Planilha, sem cor escolhida. */
const VARRER = (page, seletores, cores, fim) => page.evaluate(async ({ seletores, dirs, cores, medir, fim }) => {
  const medirF = new Function('return (' + medir + ')')();
  const app = window.__catedraApp, ruins = [], cores2 = new Set();
  let n = 0, pior = { razao: 99, onde: '' };
  const aplicar = (patch) => new Promise((r) => app.setState(patch, () => { try { app._temaBroadcast(); } catch (_) {} setTimeout(r, 220); }));
  const medirTudo = (rot) => { for (const sel of seletores) { const m = medirF(sel); n++; if (m) cores2.add(m.cor);
    if (m && m.razao < pior.razao) pior = { razao: m.razao, onde: rot + ' ' + sel };
    if (!m || !(m.w > 0) || !(m.razao >= 4.5)) ruins.push(rot + ' ' + sel + ' ' + (m ? m.razao.toFixed(2) : 'ausente')); } };
  for (const escuro of [false, true]) {
    for (const dir of dirs) { await aplicar({ dir, darkMode: escuro, accent: null }); medirTudo(dir + (escuro ? '/escuro' : '/claro')); }
    for (const accent of cores) { await aplicar({ dir: 'sutil', darkMode: escuro, accent }); medirTudo(accent + (escuro ? '/escuro' : '/claro')); }
  }
  await aplicar(fim);
  // cores2: quantas cores de texto distintas apareceram — prova de que o tema trocou mesmo
  return { ruins, n, pior: pior.razao.toFixed(2) + ' em ' + pior.onde, cores: cores2.size };
}, { seletores, dirs: DIRECOES, cores, medir: MEDIR.toString(), fim });

async function novoContexto(pageDaSuite, opcoes) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 }, ...(opcoes || {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0);
  await page.clock.install({ time: t });
  return { ctx, page };
}

// a origem https de mentira serve os arquivos do repositório: é o "site publicado" para o cartão
async function servirComoSite(ctx) {
  await ctx.route(ORIGEM_SITE + '/**', (rota) => {
    const u = new URL(rota.request().url());
    const p = path.join(RAIZ, decodeURIComponent(u.pathname).slice(1));
    let corpo = null;
    try { if (p.startsWith(RAIZ) && fs.statSync(p).isFile()) corpo = fs.readFileSync(p); } catch (_) {}
    if (!corpo) return rota.fulfill({ status: 404, body: 'nao encontrado' });
    return rota.fulfill({ status: 200, body: corpo, headers: { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' } });
  });
}

/* A ponte do build, de mentira: o teste controla o estado, quando o download termina, quantas
   leituras falham e o que o registro do worker diz (instalando ou ativo). */
async function ponteDeMentira(ctx, cfg) {
  await ctx.addInitScript((c) => {
    const st = { estado: c.estado, falhas: c.falhas || 0, chamadasEstado: 0, chamadasBaixar: 0, fimBaixar: null, registro: c.registro || '' };
    window.__offTeste = st;
    window.CATEDRA_BUILD = { versao: 'abc1234', data: '2026-11-25', alvo: 'web' };
    window.__catedraOffline = {
      estado: () => { st.chamadasEstado++;
        if (st.falhas > 0) { st.falhas--; return Promise.reject(new Error('sem resposta do worker')); }
        return Promise.resolve(JSON.parse(JSON.stringify(st.estado))); },
      baixar: () => { st.chamadasBaixar++; return new Promise((ok) => { st.fimBaixar = ok; }); }
    };
    if (c.registro) {
      // o registro de mentira: 'instalando' (primeira visita, sem worker ativo) ou 'ativo'
      let sw = navigator.serviceWorker;
      if (!sw) { sw = new EventTarget(); sw.controller = null; try { Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true }); } catch (_) {} }
      try { sw.getRegistration = () => Promise.resolve(st.registro === 'instalando' ? { active: null, installing: {}, waiting: null } : { active: {}, installing: null, waiting: null }); } catch (_) {}
    }
  }, cfg);
}

async function semear(page, base, escuro) {
  await page.goto(base + '/__semente');
  await page.evaluate((esc) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, v);
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('dark', esc ? '1' : '0');
    set('edital', JSON.stringify([{ disc: 'Direito Processual Civil', peso: 2, questoes: 10, topics: [{ name: 'Tutela provisória', done: false, subs: [] }] }]));
  }, !!escuro);
}

async function abrirAjustes(page, base, arquivo) {
  await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
  await page.waitForFunction(() => typeof window.__catedraGoView === 'function', null, { timeout: 30000 });
  await page.evaluate(() => window.__catedraGoView('ajustes'));
}
async function abrirDados(page, base, arquivo) {
  await abrirAjustes(page, base, arquivo);
  await page.click('button[data-s="dados"]');
  await page.waitForSelector('[data-offline]', { timeout: 15000 });
}
// o outro caminho até o cartão: a busca dos Ajustes (irParaAjuste), que também precisa ler o estado
async function abrirDadosPelaBusca(page, base) {
  await abrirAjustes(page, base);
  await page.fill('input[aria-label="Buscar nos ajustes"]', 'offline');
  await page.click('button[data-t="dados"]:has-text("Uso sem internet")');
  await page.waitForSelector('[data-offline]', { timeout: 15000 });
}

const texto = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const esperarTexto = (page, sel, re, ms) => page.waitForFunction(([s, f, fl]) => { const e = document.querySelector(s); return !!e && new RegExp(f, fl).test(e.textContent); },
  [sel, re.source, re.flags], { timeout: ms || 10000 });

export async function testarOfflineEstado(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'OFFLINE [' + (opcoes.motor || 'chromium') + '] ';
  const estadoParcial = { prontos: 10, total: 40, bytes: 5 * MB, totalBytes: 30 * MB, versao: 'catedra-0123456789ab', auto: { prontos: 10, total: 30 } };

  // A. site publicado, claro, 1280, fuso de Porto Velho: parcial → baixar com progresso → fim com corte
  {
    const { ctx, page } = await novoContexto(pageDaSuite, { timezoneId: 'America/Porto_Velho' });
    try {
      // registro 'ativo': a ponte pergunta como antes, e o teste pode anunciar uma versão nova (controllerchange)
      await servirComoSite(ctx); await ponteDeMentira(ctx, { estado: estadoParcial, registro: 'ativo' });
      await semear(page, ORIGEM_SITE, false); await abrirDados(page, ORIGEM_SITE);
      await esperarTexto(page, '[data-off-selo="acervo"]', /Parcial/);
      ok(await page.getAttribute('[data-offline]', 'data-offline') === 'site', R + 'site publicado: o cartão "Uso sem internet" está em Ajustes › Dados');
      ok(await texto(page, '[data-off-linha="acervo"]') === '10 de 40 arquivos · 5,0 de 30,0 MB', R + 'parcial: "10 de 40 arquivos · 5,0 de 30,0 MB" (' + await texto(page, '[data-off-linha="acervo"]') + ')');
      ok(/Faltam 25,0 MB no total/.test(await texto(page, '[data-off-detalhe="acervo"]')), R + 'parcial: o tamanho do que falta aparece antes do toque em "Baixar"');
      ok(await texto(page, '[data-off-valor="versao"]') === 'catedra-0123456789ab' && await texto(page, '[data-off-selo="conexao"]') === 'Online',
        R + 'mostra a versão do cache e a conexão "Online"');
      const lido = await texto(page, '[data-off-valor="lido"]');
      const esperado = await page.evaluate(() => { const d = new Date(window.__catedraApp.state.offLidoEm), z = (n) => (n < 10 ? '0' : '') + n; return 'às ' + z(d.getHours()) + ':' + z(d.getMinutes()); });
      ok(!!lido && lido === esperado, R + 'diz quando o estado foi lido, na hora local do aparelho (' + lido + ')');

      // claro: contraste medido
      for (const [sel, nome] of [['[data-off-selo="acervo"]', 'selo "Parcial"'], ['[data-off-selo="conexao"]', 'selo "Online"'],
        ['[data-off-linha="acervo"]', 'linha do acervo'], ['[data-off-detalhe="acervo"]', 'detalhe'], ['[data-off="versao"] .ct-eb', 'rótulo'],
        ['[data-off-valor="versao"]', 'versão do cache'], ['[data-off-baixar]', 'botão de baixar']]) {
        const m = await page.evaluate(MEDIR, sel);
        ok(!!m && m.w > 0 && m.h > 0 && m.razao >= 4.5, R + 'claro: ' + nome + ' pinta com contraste ≥ 4,5:1 (' + (m ? m.razao.toFixed(2) : 'ausente') + ')');
      }

      await page.click('[data-off-baixar]');
      await page.clock.runFor(200);
      const ocupado = await page.evaluate(MEDIR, '[data-off-baixar]');
      ok(!!ocupado && ocupado.ocupado === 'true' && ocupado.travado && /Baixando/.test(ocupado.texto), R + 'baixando: o botão fica ocupado ("Baixando…") e não aceita segundo toque');
      // o giro (::before do aria-busy) pinta; o ícone de baixar sai, para não haver dois ícones
      const giro = await page.evaluate(() => { const b = document.querySelector('[data-off-baixar]'), g = getComputedStyle(b, '::before');
        return { svgs: b.querySelectorAll('svg').length, giro: g.content !== 'none' && parseFloat(g.width) > 0 }; });
      ok(giro.svgs === 0 && giro.giro, R + 'baixando: o botão mostra só o giro, sem o ícone ao lado (' + giro.svgs + ' ícone)');
      ok(/Baixando o acervo/.test(await texto(page, '[data-off-aviso]') || '') && await page.getAttribute('[data-off-aviso]', 'role') === 'status',
        R + 'baixando: o aviso honesto sai numa região role="status"');
      await page.evaluate((mb) => { const s = window.__offTeste.estado; s.prontos = 25; s.bytes = 18 * mb; }, MB);
      await page.clock.runFor(3500);
      await esperarTexto(page, '[data-off-linha="acervo"]', /^\s*25 de 40/);
      ok(await texto(page, '[data-off-linha="acervo"]') === '25 de 40 arquivos · 18,0 de 30,0 MB', R + 'progresso de verdade: a contagem sobe com o que o worker já guardou');
      // uma releitura do progresso que falha não apaga a contagem que já estava na tela
      const antes = await page.evaluate(() => window.__offTeste.chamadasEstado);
      await page.evaluate(() => { window.__offTeste.falhas = 1; });
      await page.clock.runFor(3500);
      await page.waitForFunction((n) => window.__offTeste.falhas === 0 && window.__offTeste.chamadasEstado > n, antes, { timeout: 10000 });
      await page.clock.runFor(100);
      ok(await texto(page, '[data-off-linha="acervo"]') === '25 de 40 arquivos · 18,0 de 30,0 MB' && await texto(page, '[data-off-selo="acervo"]') === 'Parcial',
        R + 'releitura que falha no meio do download não troca a contagem por "Sem resposta"');
      // no fim, o que o app guarda sozinho está todo aqui: faltam só os 2 que o orçamento cortou
      await page.evaluate((mb) => { const s = window.__offTeste; s.estado.prontos = 38; s.estado.bytes = 28 * mb; s.estado.auto = { prontos: 30, total: 30 };
        s.fimBaixar({ baixados: 28, jaTinha: 10, falhas: 0, cortados: 2, total: 38 }); }, MB);
      await page.clock.runFor(500);
      await esperarTexto(page, '[data-off-aviso]', /Ficaram de fora 2 arquivos/);
      await esperarTexto(page, '[data-off-linha="acervo"]', /^\s*38 de 40/);
      const fim = await texto(page, '[data-off-aviso]');
      ok(/28 arquivos baixados agora/.test(fim) && /para não encher o espaço/.test(fim), R + 'no fim, diz o que desceu e o que o orçamento de espaço do aparelho deixou de fora');
      const neutro = await page.evaluate(MEDIR, '[data-off-selo="acervo"]');
      const classeNeutra = await page.getAttribute('[data-off-selo="acervo"]', 'class');
      ok(!!neutro && neutro.razao >= 4.5 && !/ct-selo-aviso/.test(classeNeutra || ''),
        R + 'claro: área jurídica com só os pesados faltando, o selo "Parcial" fica neutro e com contraste ≥ 4,5:1 (' + (neutro ? neutro.razao.toFixed(2) : '—') + ')');
      const depois = await page.evaluate(MEDIR, '[data-off-baixar]');
      ok(!!depois && depois.ocupado === 'false' && !depois.travado && /Baixar o acervo completo/.test(depois.texto)
         && await page.locator('[data-off-baixar] svg').count() === 1, R + 'no fim, o botão volta (com o ícone) para tentar de novo');
      const detalheFim = await texto(page, '[data-off-detalhe="acervo"]');
      ok(/deles dependem, sem internet, o Simulado misto, as abas Jurisprudência e Bancas reais da Prova oral/.test(detalheFim) && !/quando você pede|estudo do dia já está guardado/.test(detalheFim),
        R + 'no fim, o detalhe diz de que telas os pesados dependem, sem "só descem quando você pede" (' + detalheFim + ')');
      const aviso = await page.evaluate(MEDIR, '[data-off-aviso]');
      ok(!!aviso && aviso.razao >= 4.5, R + 'claro: o aviso de corte tem contraste ≥ 4,5:1 (' + (aviso ? aviso.razao.toFixed(2) : '—') + ')');
      const chamadas = await page.evaluate(() => window.__offTeste.chamadasEstado);
      ok(chamadas >= 4, R + 'o estado foi relido durante e depois do download (' + chamadas + ' leituras)');
      // "Ler de novo" é uma leitura limpa: o aviso do download sai
      await page.click('[data-off-reler]');
      await page.waitForFunction(() => { const e = document.querySelector('[data-off-aviso]'); return !!e && e.textContent.trim() === ''; }, null, { timeout: 10000 });
      ok(await texto(page, '[data-off-linha="acervo"]') === '38 de 40 arquivos · 28,0 de 30,0 MB', R + '"Ler de novo" tira o aviso do último download e relê o estado');
      // outro download, que não traz nada; depois sai uma versão nova com o cartão aberto: o aviso
      // daquele download fala da versão anterior do cache e cai sozinho (o host guarda a versão no fim)
      await page.click('[data-off-baixar]');
      await page.clock.runFor(200);
      await page.evaluate(() => window.__offTeste.fimBaixar({ baixados: 0, jaTinha: 38, falhas: 0, cortados: 2, total: 40 }));
      await page.clock.runFor(500);
      await esperarTexto(page, '[data-off-aviso]', /^\s*Nada desceu desta vez/);
      await page.evaluate(() => { const s = window.__offTeste.estado; s.versao = 'catedra-ffffffffffff'; s.prontos = 3; s.bytes = 1048576;
        s.auto = { prontos: 3, total: 30 }; navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); });
      await esperarTexto(page, '[data-off-valor="versao"]', /catedra-ffffffffffff/);
      await page.clock.runFor(100);
      const avisoVelho = await texto(page, '[data-off-aviso]');
      ok(avisoVelho === '' && await texto(page, '[data-off-linha="acervo"]') === '3 de 40 arquivos · 1,0 de 30,0 MB',
        R + 'versão nova depois de um download: o aviso dele, feito sobre a versão anterior do cache, sai sozinho (' + (avisoVelho || 'sem aviso') + ')');
    } catch (e) { ok(false, R + 'site claro exceção: ' + e.message.split('\n')[0]); }
    finally { await ctx.close(); }
  }

  // B. site publicado, escuro, iPad 820×1180 por toque, pela BUSCA dos Ajustes: instalando →
  //    o worker assume a página → sem resposta → ler de novo → contraste em todas as direções e
  //    cores → outra área → offline/online → completo
  {
    const { ctx, page } = await novoContexto(pageDaSuite, { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: false });
    try {
      await servirComoSite(ctx);
      await ponteDeMentira(ctx, { estado: { ...estadoParcial, prontos: 12, bytes: 8.1 * MB }, falhas: 1, registro: 'instalando' });
      await semear(page, ORIGEM_SITE, true); await abrirDadosPelaBusca(page, ORIGEM_SITE);
      await esperarTexto(page, '[data-off-selo="acervo"]', /Instalando|Sem resposta|Parcial/);
      ok(await texto(page, '[data-off-selo="acervo"]') === 'Instalando' && /ainda está sendo instalado/.test(await texto(page, '[data-off-linha="acervo"]'))
         && await page.evaluate(() => window.__offTeste.chamadasEstado) === 0,
        R + 'pela busca dos Ajustes o cartão lê o estado; com o worker instalando, diz "Instalando" na hora, sem esperar o prazo da ponte');
      // o worker termina de instalar e assume a página: o cartão relê sozinho
      await page.evaluate(() => { window.__offTeste.registro = 'ativo'; navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); });
      await esperarTexto(page, '[data-off-selo="acervo"]', /Sem resposta/);
      ok(/não respondeu a tempo/.test(await texto(page, '[data-off-linha="acervo"]')) && await page.locator('[data-off-baixar]').count() === 0
         && await page.locator('[data-off-reler]').count() === 1 && await page.evaluate(() => window.__offTeste.chamadasEstado) === 1,
        R + 'o worker assume a página e o cartão relê sozinho; mudo, diz "não respondeu a tempo", sem número e sem baixar, com "Ler de novo"');
      await page.click('[data-off-reler]');
      await esperarTexto(page, '[data-off-selo="acervo"]', /Parcial/);
      ok(await page.evaluate(() => document.querySelector('[data-toque]').getAttribute('data-toque')) === '1', R + 'iPad: o host está no modo de toque');
      for (const sel of ['[data-off-baixar]', '[data-off-reler]']) {
        const m = await page.evaluate(MEDIR, sel);
        ok(!!m && m.h >= 44 && m.w >= 44, R + 'iPad: ' + sel + ' tem alvo ≥ 44 px (' + (m ? Math.round(m.w) + '×' + Math.round(m.h) : 'ausente') + ')');
      }
      for (const [sel, nome] of [['[data-off-selo="acervo"]', 'selo "Parcial"'], ['[data-off-selo="conexao"]', 'selo "Online"'],
        ['[data-off-linha="acervo"]', 'linha do acervo'], ['[data-off-detalhe="acervo"]', 'detalhe'], ['[data-off="acervo"] .ct-eb', 'rótulo'],
        ['[data-off-nota]', 'nota'], ['[data-off-valor="lido"]', 'hora da leitura'], ['[data-off-reler]', 'botão "Ler de novo"'], ['[data-off-baixar]', 'botão de baixar']]) {
        const m = await page.evaluate(MEDIR, sel);
        ok(!!m && m.w > 0 && m.razao >= 4.5, R + 'escuro: ' + nome + ' com contraste ≥ 4,5:1 (' + (m ? m.razao.toFixed(2) : 'ausente') + ')');
      }
      // os selos de situação (bom: "Online"; aviso: "Parcial") nas oito direções e em toda cor de destaque, claro e escuro
      const cores = coresDeDestaque();
      const v = await VARRER(page, ['[data-off-selo="conexao"]', '[data-off-selo="acervo"]'], cores, { dir: 'sutil', darkMode: true, accent: null });
      ok(cores.length >= 10 && v.n === 2 * 2 * (DIRECOES.length + cores.length) && v.ruins.length === 0 && v.cores >= 8,
        R + 'selos "Online" e "Parcial" ≥ 4,5:1 nas ' + DIRECOES.length + ' direções e nas ' + cores.length + ' cores de destaque, claro e escuro (' + v.n + ' medidas, '
        + v.cores + ' cores de texto, pior ' + v.pior + (v.ruins.length ? '; abaixo: ' + v.ruins.slice(0, 4).join(' | ') : '') + ')');
      // o estudo jurídico com só os pesados faltando: "Parcial" neutro, não alerta
      await page.evaluate((mb) => { const s = window.__offTeste.estado; s.prontos = 30; s.bytes = 11 * mb; s.auto = { prontos: 30, total: 30 }; }, MB);
      await page.click('[data-off-reler]');
      await esperarTexto(page, '[data-off-detalhe="acervo"]', /guarda sozinho já está aqui/);
      const neutro = await page.evaluate(MEDIR, '[data-off-selo="acervo"]');
      ok(!!neutro && neutro.razao >= 4.5 && !/ct-selo-aviso/.test(await page.getAttribute('[data-off-selo="acervo"]', 'class') || '')
         && await texto(page, '[data-off-linha="acervo"]') === '30 de 40 arquivos · 11,0 de 30,0 MB',
        R + 'escuro: só os pesados faltando, "Parcial" neutro com contraste ≥ 4,5:1 (' + (neutro ? neutro.razao.toFixed(2) : '—') + ')');
      // outra área de estudo: as leis dela estão entre os pesados — o host passa a área, o selo vira aviso
      await page.evaluate(() => window.__catedraApp.setState({ areaEstudo: 'saude' }));
      await esperarTexto(page, '[data-off-detalhe="acervo"]', /leis da sua área/);
      const daArea = await page.evaluate(MEDIR, '[data-off-selo="acervo"]');
      ok(/ct-selo-aviso/.test(await page.getAttribute('[data-off-selo="acervo"]', 'class') || '') && !!daArea && daArea.razao >= 4.5,
        R + 'área de saúde: o cartão diz que as leis da área são pesadas, em tom de aviso com contraste ≥ 4,5:1 (' + (daArea ? daArea.razao.toFixed(2) : '—') + ')');
      // OAB (área pública do beta): nenhuma tela dela carrega um pesado — o host passa as capacidades
      // da área e o "Parcial" fica neutro, sem citar leis da área, Simulado ou Prova oral
      await page.evaluate(() => window.__catedraApp.setState({ areaEstudo: 'oab' }));
      await esperarTexto(page, '[data-off-detalhe="acervo"]', /nenhuma tela da sua área de estudo depende deles/);
      const daOab = await page.evaluate(MEDIR, '[data-off-selo="acervo"]'), detalheOab = await texto(page, '[data-off-detalhe="acervo"]');
      ok(!/ct-selo-aviso/.test(await page.getAttribute('[data-off-selo="acervo"]', 'class') || '') && !!daOab && daOab.razao >= 4.5
         && !/leis da sua área|Simulado|Prova oral/.test(detalheOab),
        R + 'OAB: "Parcial" neutro, sem citar leis da área, Simulado ou Prova oral, com contraste ≥ 4,5:1 (' + (daOab ? daOab.razao.toFixed(2) : '—') + ')');
      await page.evaluate(() => window.__catedraApp.setState({ areaEstudo: 'juridica' }));
      await esperarTexto(page, '[data-off-detalhe="acervo"]', /deles dependem, sem internet, o Simulado misto, as abas/);
      await ctx.setOffline(true);
      await esperarTexto(page, '[data-off-selo="conexao"]', /Offline/);
      const travado = await page.evaluate(MEDIR, '[data-off-baixar]');
      ok(/o resto espera a conexão/.test(await texto(page, '[data-off-texto="conexao"]')) && !!travado && travado.travado
         && /conecte-se à internet/.test(await texto(page, '[data-off-detalhe="acervo"]')), R + 'offline ao vivo: selo "Offline", o que espera a conexão e o baixar travado');
      const off = await page.evaluate(MEDIR, '[data-off-selo="conexao"]');
      ok(!!off && off.razao >= 4.5, R + 'escuro: selo "Offline" com contraste ≥ 4,5:1 (' + (off ? off.razao.toFixed(2) : '—') + ')');
      await ctx.setOffline(false);
      await esperarTexto(page, '[data-off-selo="conexao"]', /Online/);
      ok(!(await page.evaluate(MEDIR, '[data-off-baixar]')).travado, R + 'a conexão volta: o botão de baixar destrava sozinho');
      await page.evaluate(() => { const s = window.__offTeste.estado; s.prontos = s.total; s.bytes = s.totalBytes; });
      await page.click('[data-off-reler]');
      await esperarTexto(page, '[data-off-selo="acervo"]', /Completo/);
      ok(await texto(page, '[data-off-linha="acervo"]') === '40 arquivos · 30,0 MB' && await page.locator('[data-off-baixar]').count() === 0
         && /não inclui o texto das leis no LEGIS/.test(await texto(page, '[data-off-detalhe="acervo"]')),
        R + 'completo: "40 arquivos · 30,0 MB", o botão de baixar some e o detalhe diz o que fica fora da conta');
      const comp = await page.evaluate(MEDIR, '[data-off-selo="acervo"]');
      ok(!!comp && comp.razao >= 4.5, R + 'escuro: selo "Completo" com contraste ≥ 4,5:1 (' + (comp ? comp.razao.toFixed(2) : '—') + ')');
      // sai uma versão nova com o cartão aberto: o worker novo assume a página e o cartão relê
      // sozinho — a versão do cache e a contagem passam a ser as da versão nova
      const leiturasAntes = await page.evaluate(() => window.__offTeste.chamadasEstado);
      await page.evaluate(() => { const s = window.__offTeste.estado; s.versao = 'catedra-ffffffffffff'; s.prontos = 3; s.bytes = 1 * 1048576;
        s.auto = { prontos: 3, total: 30 }; navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); });
      await esperarTexto(page, '[data-off-valor="versao"]', /catedra-ffffffffffff/);
      ok(await texto(page, '[data-off-linha="acervo"]') === '3 de 40 arquivos · 1,0 de 30,0 MB' && await texto(page, '[data-off-selo="acervo"]') === 'Parcial'
         && await page.evaluate((n) => window.__offTeste.chamadasEstado === n + 1, leiturasAntes),
        R + 'versão nova com o cartão aberto: ele relê sozinho e mostra a versão e a contagem novas, sem a da versão que saiu');
    } catch (e) { ok(false, R + 'site escuro/iPad exceção: ' + e.message.split('\n')[0]); }
    finally { await ctx.close(); }
  }

  // C. desenvolvimento (localhost), 390 px: o texto honesto, sem botão, conexão ao vivo
  {
    const { ctx, page } = await novoContexto(pageDaSuite, { viewport: { width: 390, height: 844 }, hasTouch: true });
    try {
      await semear(page, base, false); await abrirDados(page, base, opcoes.arquivo);
      ok(await page.getAttribute('[data-offline]', 'data-offline') === 'dev' && /só funciona no site publicado/.test(await texto(page, '[data-off-nota]')),
        R + 'localhost: "o modo sem internet só funciona no site publicado"');
      ok(await texto(page, '[data-off-selo="acervo"]') === 'Desligado' && await texto(page, '[data-off-valor="versao"]') === 'nenhuma'
         && await page.locator('[data-off-baixar], [data-off-reler]').count() === 0, R + 'localhost: nada guardado, versão "nenhuma", sem botão');
      const lado = await page.evaluate(() => { const c = document.querySelector('[data-offline]').getBoundingClientRect();
        return { dir: c.right, larg: window.innerWidth, rolagem: document.documentElement.scrollWidth }; });
      ok(lado.dir <= lado.larg + 1 && lado.rolagem <= lado.larg + 1, R + '390 px: o cartão cabe sem rolagem de lado (' + Math.round(lado.dir) + ' de ' + lado.larg + ')');
      const nota = await page.evaluate(MEDIR, '[data-off-nota]');
      ok(!!nota && nota.razao >= 4.5, R + 'claro: a nota tem contraste ≥ 4,5:1 (' + (nota ? nota.razao.toFixed(2) : '—') + ')');
      await ctx.setOffline(true);
      await esperarTexto(page, '[data-off-selo="conexao"]', /Offline/);
      await ctx.setOffline(false);
      await esperarTexto(page, '[data-off-selo="conexao"]', /Online/);
      ok(true, R + 'localhost: a conexão também é ao vivo (Offline → Online pelos eventos)');
    } catch (e) { ok(false, R + 'localhost exceção: ' + e.message.split('\n')[0]); }
    finally { await ctx.close(); }
  }

  // D. app do iPad (carimbo do build nativo), escuro, por toque, com o tema de fábrica do app
  //    nativo (Fibra, magenta — scripts/build-macos.mjs): acervo embutido e versão do build
  {
    const { ctx, page } = await novoContexto(pageDaSuite, { viewport: { width: 820, height: 1180 }, hasTouch: true });
    try {
      await ctx.addInitScript(() => { window.CATEDRA_BUILD = { versao: 'abc1234', data: '2026-11-25', alvo: 'iPadOS' }; });
      await semear(page, base, true); await abrirDados(page, base, opcoes.arquivo);
      ok(await page.getAttribute('[data-offline]', 'data-offline') === 'nativo'
         && await texto(page, '[data-off-nota]') === 'No app instalado, o acervo vem embutido no aplicativo.', R + 'app instalado: "o acervo vem embutido no aplicativo"');
      ok(await texto(page, '[data-off="versao"] .ct-eb') === 'Versão do app' && await texto(page, '[data-off-valor="versao"]') === 'versão abc1234 · iPadOS'
         && await page.locator('[data-off-baixar], [data-off-reler]').count() === 0, R + 'app instalado: a versão do build ("versão abc1234 · iPadOS"), sem botão');
      const magenta = (ler('scripts/build-macos.mjs').match(/setItem\('catedra:accent','"(#[0-9a-f]{6})"'\)/i) || [])[1] || '#e718ba';
      const dirMac = (ler('scripts/build-macos.mjs').match(/setItem\('catedra:dir','([a-z]+)'\)/) || [])[1] || 'clean';
      for (const escuro of [true, false]) {
        await page.evaluate(({ d, a, e }) => new Promise((r) => window.__catedraApp.setState({ dir: d, accent: a, darkMode: e }, () => setTimeout(r, 220))), { d: dirMac, a: magenta, e: escuro });
        for (const [sel, nome] of [['[data-off-selo="acervo"]', 'selo "Embutido"'], ['[data-off-selo="conexao"]', 'selo "Online"'], ['[data-off-valor="versao"]', 'versão do app'], ['[data-off-detalhe="acervo"]', 'detalhe']]) {
          const m = await page.evaluate(MEDIR, sel);
          ok(!!m && m.razao >= 4.5, R + (escuro ? 'escuro' : 'claro') + ', tema de fábrica do app (' + dirMac + ', ' + magenta + '): ' + nome + ' com contraste ≥ 4,5:1 (' + (m ? m.razao.toFixed(2) : 'ausente') + ')');
        }
      }
    } catch (e) { ok(false, R + 'app do iPad exceção: ' + e.message.split('\n')[0]); }
    finally { await ctx.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  await testarOfflineEstadoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
