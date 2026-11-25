/* ENAM DEPOIS DA PROVA (25/11/2026) — enam.js + Trilha ENAM no host
   (a) Contagem só com edição FUTURA cadastrada: futura = antes do fim da prova (início + 5 h, no
       fuso da prova). Sem ela, nenhuma contagem em lugar nenhum (chip, trilha, régua, Ajustes, a
       frase "a próxima edição é…") e, onde ela ficava, a linha neutra CT_ENAM.SEM_EDICAO.
   (b) Resultado: por disciplina, acertos, erros, brancos e líquido (acertos − erros: no ENAM o
       erro não desconta) e os dois cortes do edital lado a lado, no total e proporcional à cota.
   Parte 1 (Node, sem navegador): as funções puras. Parte 2 (navegador): relógio fixo com
   timezoneId America/Sao_Paulo (claro) e America/Porto_Velho (escuro), iPad 820×1180 com toque.
   Roda sozinho: node tests/enam-pos-prova.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const src = fs.readFileSync(path.join(RAIZ, 'enam.js'), 'utf8');
  const caixa = { window: {} };
  vm.runInNewContext(src, caixa);
  return { E: caixa.window.CT_ENAM, src };
}
const SP = 'America/Sao_Paulo', PV = 'America/Porto_Velho';
const EN_2026_2 = { edicao: '2026.2', data: '2026-11-29', inicio: '13:00', fuso: SP, duracaoMin: 300, metaAcertos: 56, ativo: true };
/** 80 itens sintéticos na ordem do edital: as 51 primeiras certas, as 25 seguintes erradas, 4 brancas no fim. */
function provaSintetica(E) {
  const its = []; E.AREAS.forEach(a => { for (let i = 0; i < a.cota; i++) its.push({ id: a.id + '-' + i, area: a.id, ramo: a.nome, certo: 'C', alternativas: [] }); });
  const resp = {}; its.forEach((it, i) => { if (i < 51) resp[it.id] = 'C'; else if (i < 76) resp[it.id] = 'A'; });
  return { its, resp };
}

export function testarEnamPosProvaEstatico(ok) {
  const R = 'ENAM PÓS-PROVA ';
  let E = null, src = '';
  try { ({ E, src } = carregar()); } catch (e) { ok(false, R + 'enam.js carrega (' + String(e.message).split('\n')[0] + ')'); return; }
  ok(!!E && typeof E.contagem === 'function' && typeof E.futura === 'function' && typeof E.alvo === 'function', R + 'publica futura, alvo e contagem');

  // o contrato "Manter": edições com data e hora, 80 questões em 5 h, cortes 56/40
  ok(E.EDICOES.map(e => e.id + '@' + e.data + ' ' + e.inicio).join(' ') === '2024.1@2024-04-14 13:00 2024.2@2024-10-20 13:00 2025.1@2025-05-18 13:00 2025.2@2025-10-26 13:00 2026.1@2026-06-07 13:00 2026.2@2026-11-29 13:00', R + 'edições com data e hora intactas');
  ok(E.QUESTOES === 80 && E.DURACAO_MIN === 300 && E.META_PADRAO === 56 && E.META_COTA === 40 && E.CORTES.join('/') === '56/40', R + '80 questões, 5 h e cortes 56/40 intactos');
  const semComentario = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/=>|`|\blet\s|\bconst\s/.test(semComentario), R + 'enam.js segue em sintaxe conservadora (sem =>, crase, let ou const) por causa do JavaScriptCore');

  // (a) edição futura = antes do FIM da prova, no fuso da prova
  const em = iso => new Date(iso), ed = E.edicao('2026.2');
  ok(new Date(E.fimDaProva(ed)).toISOString() === '2026-11-29T21:00:00.000Z', R + 'a prova de 29/11 termina às 18h de Brasília (21h UTC): início + 5 h');
  ok(E.futura(ed, em('2026-11-29T17:59:59-03:00')) && !E.futura(ed, em('2026-11-29T18:00:00-03:00')), R + 'a 2026.2 é futura até 17h59min59s de Brasília e deixa de ser às 18h');
  const casos = [
    ['25/11 10h em Brasília', '2026-11-25T10:00:00-03:00', SP, 'faltam 4 dias'],
    ['25/11 10h em Porto Velho', '2026-11-25T10:00:00-04:00', PV, 'faltam 4 dias'],
    ['28/11 23h30 em Porto Velho', '2026-11-28T23:30:00-04:00', PV, 'falta 1 dia'],
    ['29/11 10h em Brasília', '2026-11-29T10:00:00-03:00', SP, 'é hoje'],
    ['29/11 10h em Porto Velho', '2026-11-29T10:00:00-04:00', PV, 'é hoje'],
    ['29/11 17h59 em Brasília, prova correndo', '2026-11-29T17:59:00-03:00', SP, 'é hoje'],
    ['29/11 18h em Brasília, fim da prova', '2026-11-29T18:00:00-03:00', SP, null],
    ['29/11 16h59 em Porto Velho', '2026-11-29T16:59:00-04:00', PV, 'é hoje'],
    ['29/11 17h em Porto Velho (18h de Brasília)', '2026-11-29T17:00:00-04:00', PV, null],
    ['29/11 19h em Brasília', '2026-11-29T19:00:00-03:00', SP, null],
    ['29/11 19h em Porto Velho', '2026-11-29T19:00:00-04:00', PV, null],
    ['30/11 10h em Brasília', '2026-11-30T10:00:00-03:00', SP, null],
    ['30/11 10h em Porto Velho', '2026-11-30T10:00:00-04:00', PV, null],
  ];
  for (const [rot, iso, fuso, esperado] of casos) {
    const c = E.contagem(EN_2026_2, em(iso), fuso);
    ok(esperado === null ? c === null : (!!c && c.rotulo === esperado && c.id === '2026.2' && c.daPessoa === true),
      R + rot + ': ' + (esperado || 'sem contagem') + ' (veio ' + (c ? c.rotulo : 'null') + ')');
  }
  ok(E.proxima(em('2026-11-25T10:00:00-03:00')).id === '2026.2' && E.proxima(em('2026-11-29T17:59:00-03:00')).id === '2026.2', R + 'proxima() é a 2026.2 até o fim da prova');
  ok(E.proxima(em('2026-11-29T19:00:00-03:00')) === null && E.proxima(em('2026-11-30T10:00:00-04:00')) === null, R + 'proxima() devolve null quando todas as edições passaram (antes devolvia a 2026.2)');
  ok(E.contagem(null, em('2026-11-30T10:00:00-03:00'), SP) === null && E.alvo(null, em('2026-11-30T10:00:00-03:00')) === null, R + 'sem catedra:enam e sem edição futura em EDICOES, nenhum alvo e nenhuma contagem');
  const kiri = E.contagem(EN_2026_2, em('2026-11-29T17:30:00-03:00'), 'Pacific/Kiritimati');
  ok(!!kiri && kiri.dias === 0 && kiri.rotulo === 'é hoje', R + 'aparelho num fuso adiante (Kiritimati, já 30/11) com a prova correndo: "é hoje", nunca dias negativos');

  // a contagem volta com edição futura: a da pessoa ou a de EDICOES
  const dias167 = Math.round((Date.UTC(2027, 4, 16) - Date.UTC(2026, 10, 30)) / 864e5);
  const cPessoa = E.contagem({ edicao: '2027.1', data: '2027-05-16', inicio: '13:00', fuso: SP, ativo: true }, em('2026-11-30T10:00:00-03:00'), SP);
  ok(!!cPessoa && cPessoa.daPessoa === true && cPessoa.id === '2027.1' && cPessoa.dias === dias167 && cPessoa.rotulo === 'faltam ' + dias167 + ' dias', R + 'data futura cadastrada pela pessoa: a contagem volta (' + (cPessoa ? cPessoa.rotulo : 'null') + ')');
  E.EDICOES.push({ id: '2027.1', numero: 'VII', data: '2027-05-16', inicio: '13:00', edital: 'edição de teste' });
  try {
    const px = E.proxima(em('2026-11-30T10:00:00-03:00')), c2 = E.contagem(EN_2026_2, em('2026-11-30T10:00:00-03:00'), SP);
    ok(!!px && px.id === '2027.1' && !!c2 && c2.id === '2027.1' && c2.daPessoa === false && c2.dias === dias167, R + 'edição futura em EDICOES: a contagem volta para ela, mesmo com a pessoa ainda na 2026.2');
    ok(E.contagem(EN_2026_2, em('2026-11-25T10:00:00-03:00'), SP).id === '2026.2', R + 'antes da prova, a edição da pessoa continua mandando');
  } finally { E.EDICOES.pop(); }
  ok(/^Nenhuma edição futura cadastrada; /.test(E.SEM_EDICAO) && !/\d/.test(E.SEM_EDICAO) && !/realizad|passou|atras/i.test(E.SEM_EDICAO), R + 'a linha neutra não traz número nem alarme');

  // (b) corrigir: por área, erros, brancos e líquido; os dois cortes, no total e por área
  const { its, resp } = provaSintetica(E);
  const c = E.corrigir(its, resp, 56, { segundos: 16920 });
  const area = id => c.porAreaEdital.find(a => a.area === id);
  ok(c.acertos === 51 && c.erros === 25 && c.brancos === 4 && c.respondidas === 76 && c.habilitaria === false && c.margem === -5 && c.meta === 56
    && c.porAreaEdital.length === 8 && c.porArea.length === 8 && area('constitucional').alvo === 11.2 && area('constitucional').alvoInt === 11 && area('penal').deficit === 8.4,
    R + 'corrigir mantém o que já devolvia (51/80, 25 erros, 4 brancos, margem −5, alvo e déficit por área)');
  const linha = id => { const a = area(id); return [a.ok, a.erros, a.brancos, a.liquido].join('/'); };
  ok(linha('constitucional') === '16/0/0/16' && linha('civil') === '1/11/0/-10' && linha('empresarial') === '0/6/0/-6' && linha('penal') === '0/8/4/-8',
    R + 'por área, acertos/erros/brancos/líquido (Constitucional ' + linha('constitucional') + ', Civil ' + linha('civil') + ', Penal ' + linha('penal') + ')');
  ok(c.porAreaEdital.every(a => a.ok + a.erros + a.brancos === a.n && a.liquido === a.ok - a.erros), R + 'em toda área, acertos + erros + brancos = questões e líquido = acertos − erros');
  ok(c.porAreaEdital.reduce((s, a) => s + a.erros, 0) === c.erros && c.porAreaEdital.reduce((s, a) => s + a.brancos, 0) === c.brancos && c.liquido === 26, R + 'as áreas somam os erros e brancos do total; líquido total 51 − 25 = 26');
  ok(c.porArea.every(a => 'liquido' in a && 'erros' in a && 'brancos' in a && Array.isArray(a.cortes)), R + 'a lista por déficit ("Onde faltou") traz os mesmos campos novos');
  const t56 = c.cortes.find(x => x.meta === 56), t40 = c.cortes.find(x => x.meta === 40);
  ok(c.cortes.map(x => x.meta + ':' + x.pct).join(' ') === '56:70 40:50' && t56.habilitaria === false && t56.faltam === 5 && t56.margem === -5 && t40.habilitaria === true && t40.margem === 11 && t40.faltam === 0,
    R + 'no total, lado a lado: 56/80 (70%) faltaram 5; 40/80 (50%) habilitaria com margem +11');
  const k = (id, m) => area(id).cortes.find(x => x.meta === m);
  ok(k('constitucional', 56).alvo === 11.2 && k('constitucional', 56).atingiu && k('constitucional', 40).alvo === 8 && k('constitucional', 40).atingiu
    && k('civil', 56).faltam === 8 && k('civil', 40).faltam === 5 && k('penal', 56).faltam === 9 && k('penal', 40).faltam === 6 && k('empresarial', 40).alvo === 3 && k('empresarial', 40).faltam === 3,
    R + 'por área, a régua proporcional para os dois cortes (cota × corte ÷ 80)');
  ok(c.porAreaEdital.every(a => { const x = a.cortes.find(y => y.meta === 56); return x.alvo === a.alvo && x.alvoInt === a.alvoInt && x.faltam === (a.deficit > 0 ? Math.ceil(a.deficit) : 0); }),
    R + 'o corte da meta escolhida é a mesma régua das barras e do "Onde faltou"');
  const rb = {}; its.forEach(it => { const n = +it.id.split('-').pop(); rb[it.id] = ((it.area === 'constitucional' && n < 11) || (it.area === 'humanistica' && n < 3)) ? 'C' : 'A'; });
  const cb = E.corrigir(its, rb, 56), kb = (id, m) => cb.porAreaEdital.find(a => a.area === id).cortes.find(x => x.meta === m);
  ok(kb('constitucional', 56).faltam === 1 && kb('constitucional', 56).atingiu === false && kb('humanistica', 40).atingiu === true && kb('humanistica', 40).faltam === 0,
    R + 'na borda: 11 de 16 ainda não é 70% (falta 1); 3 de 6 já é 50%');
  const r56 = {}; its.forEach((it, i) => { r56[it.id] = i < 56 ? 'C' : 'A'; });
  const c56 = E.corrigir(its, r56, 56);
  ok(c56.habilitaria === true && c56.erros === 24 && c56.liquido === 32 && c56.cortes.find(x => x.meta === 56).habilitaria === true, R + 'o erro não desconta: 56 acertos com 24 erros habilitam (o líquido 32 é medida de treino)');
  const ca = E.corrigir(its.concat([{ id: 'x1', area: 'civil', certo: 'A', anulada: true }]), Object.assign({}, resp, { x1: 'B' }), 56);
  ok(ca.anuladas === 1 && ca.porAreaEdital.find(a => a.area === 'civil').erros === 11 && ca.porAreaEdital.find(a => a.area === 'civil').n === 12, R + 'anulada não entra em erro nem em branco');
  const c40 = E.corrigir(its, resp, 40);
  ok(c40.meta === 40 && c40.habilitaria === true && c40.margem === 11 && c40.cortes.map(x => x.meta).join('/') === '56/40', R + 'com a meta 40 o resultado principal muda, os dois cortes continuam na mesma ordem');

  // o host: nada de "prova realizada" e todo chamador de proxima() trata o null
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  ok(!/prova realizada|'realizado'|A prova já passou/.test(host), R + 'o host não tem mais "prova realizada", "realizado" nem "A prova já passou"');
  ok(!/proxima\(\)\.id/.test(host), R + 'nenhum chamador lê proxima().id sem tratar o null');
}

/* ---- Parte 2: navegador ---- */
function instalarMedidas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const px = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  // o fundo efetivo: as camadas de fundo do elemento para cima, compostas até a primeira opaca
  const fundo = (el) => { const camadas = []; for (let e = el; e; e = e.parentElement) { const p = px(getComputedStyle(e).backgroundColor); if (p[3] > 0) { camadas.push(p); if (p[3] >= 0.99) break; } }
    let b = [255, 255, 255]; for (let i = camadas.length - 1; i >= 0; i--) { const [r, g, bl, a] = camadas[i]; b = [r * a + b[0] * (1 - a), g * a + b[1] * (1 - a), bl * a + b[2] * (1 - a)]; } return b; };
  const lum = (v) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
  const contraste = (el) => { const t = px(getComputedStyle(el).color), b = fundo(el); const tc = [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3])); const x = lum(tc), y = lum(b); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; };
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  window.__ctMedir = { px, fundo, contraste, caixa };
}

export async function testarEnamPosProva(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const browser = pageDaSuite.context().browser();
  const sims = (() => {   // uma tentativa antiga (10/11): o histórico e o resultado continuam depois da prova
    const ts = Date.parse('2026-11-10T15:00:00-03:00');
    const okDe = { constitucional: 12, administrativo: 7, humanistica: 4, dh: 4, processocivil: 8, civil: 7, empresarial: 3, penal: 5 };
    const cotas = { constitucional: 16, administrativo: 10, humanistica: 6, dh: 6, processocivil: 12, civil: 12, empresarial: 6, penal: 12 };
    return [{ id: 'enam' + ts, ts, up: ts, quando: new Date(ts).toISOString(), edicao: '2026.2', meta: 56, total: 80, acertos: 50, brancos: 4, erros: 26, habilitaria: false, margem: -6,
      porArea: Object.keys(okDe).map(a => ({ area: a, ok: okDe[a], cota: cotas[a], n: cotas[a] })), idsUsados: [], tempoTotalSeg: 16000, comPausa: false, foraDoEnam: 0 }];
  })();
  const contextos = [[SP, false, true], [PV, true, false]];   // [fuso, escuro, roteiro completo]
  for (const [fuso, escuro, completo] of contextos) {
    const R = 'ENAM PÓS-PROVA [' + motor + '] [' + fuso.split('/')[1].replace('_', ' ') + (escuro ? ', escuro' : ', claro') + '] ';
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, timezoneId: fuso });
    const page = await ctx.newPage();
    const errosPagina = []; page.on('pageerror', e => errosPagina.push(String(e && e.message || e).split('\n')[0]));
    const off = fuso === PV ? '-04:00' : '-03:00';
    const quando = iso => new Date(iso + off);   // relógio de parede do fuso do aparelho
    try {
      await page.clock.install({ time: quando('2026-11-25T10:00:00') });
      await page.goto(base + '/__semente');
      await page.evaluate(({ escuro, en, sims }) => {
        localStorage.clear();
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        localStorage.setItem('catedra:enam', JSON.stringify(Object.assign({}, en, { up: 1 })));
        localStorage.setItem('catedra:enamSim', JSON.stringify(sims));
        if (escuro) localStorage.setItem('catedra:dark', '1');
      }, { escuro, en: EN_2026_2, sims });
      await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
      await page.waitForFunction(() => window.__catedraApp && window.__catedraGoView && window.CT_ENAM && window.CT_ENAM.contagem, null, { timeout: 30000 });
      await page.evaluate(instalarMedidas);
      await page.evaluate(() => window.__catedraGoView('inicio'));
      await page.waitForSelector('main [data-trilha-enam]', { timeout: 15000 });

      const ler = () => page.evaluate(() => {
        const t = (e) => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
        const chip = [...document.querySelectorAll('.cth-chip')].find(c => /ENAM/.test(c.textContent));
        const bloco = document.querySelector('main [data-trilha-enam]');
        const dias = bloco && bloco.querySelector('.ct-trilha-dias');
        const sec = [...document.querySelectorAll('main .cth-sec')].find(s => /Trilha ENAM/.test(s.textContent));
        return { chip: t(chip), bloco: !!bloco, dias: t(dias), sub: dias ? t(dias.nextElementSibling) : null,
          sem: t(bloco && bloco.querySelector('[data-enam-sem-edicao]')), texto: t(bloco) || '', meta: t(sec && sec.querySelector('.meta')) || '',
          acao: t(bloco && bloco.querySelector('.ct-trilha-acao')), ult: t(bloco && bloco.querySelector('.ct-trilha-ult')), semEdicao: window.CT_ENAM.SEM_EDICAO };
      });
      // muda o relógio e repinta o Início; espera o estado pedido (sob carga o commit atrasa) e então mede
      const momento = async (iso, pronto) => {
        await page.clock.setSystemTime(quando(iso));
        await page.evaluate(() => { window.__catedraGoView('inicio'); window.__catedraApp.setState({}); });
        await page.waitForFunction(pronto, null, { timeout: 10000 }).catch(() => {});
        return ler();
      };

      // 25/11 10h: faltam 4 dias
      let v = await momento('2026-11-25T10:00:00', () => /faltam 4 dias/.test((document.querySelector('main') || document.body).textContent + [...document.querySelectorAll('.cth-chip')].map(c => c.textContent).join(' ')));
      ok(!!v.chip && /ENAM 2026\.2/.test(v.chip) && /faltam 4 dias/.test(v.chip), R + '25/11 10h: o chip conta 4 dias (' + v.chip + ')');
      ok(v.dias === '4' && /dias para a prova/.test(v.sub || '') && v.sem === null, R + '25/11 10h: a trilha mostra 4 dias para a prova, sem a linha neutra');
      // a Reta final pintada: a régua só existe lá e no Edital (o Início também diz "dias para a prova")
      const naReta = async () => page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms)), app = window.__catedraApp;
        window.__catedraGoView('reta-final');
        for (let i = 0; i < 100 && !(app.state.view === 'reta-final' && document.querySelector('main .ct-regua')); i++) await w(100);
        const n = document.querySelector('main .ct-regua-n');
        const r = { tx: document.querySelector('main').textContent.replace(/\s+/g, ' '), n: n ? n.textContent.replace(/\s+/g, ' ').trim() : null, marco: !!document.querySelector('main .ct-regua-marca2') };
        window.__catedraGoView('inicio'); await w(300);
        return r;
      });
      if (completo) {
        const reta = await naReta();
        ok(/dias para o ENAM 2026\.2/.test(reta.tx) && reta.n === '4 dias', R + '25/11: a régua da Reta final conta o ENAM (' + reta.n + ')');
      }

      // 29/11 10h: é hoje
      v = await momento('2026-11-29T10:00:00', () => /é hoje/.test([...document.querySelectorAll('.cth-chip')].map(c => c.textContent).join(' ')));
      ok(!!v.chip && /ENAM 2026\.2/.test(v.chip) && /é hoje/.test(v.chip), R + '29/11 10h: o chip diz "é hoje" (' + v.chip + ')');
      ok(v.dias === 'hoje' && /A prova é hoje/.test(v.sub || '') && v.sem === null, R + '29/11 10h: a trilha diz que a prova é hoje');

      // 29/11 19h: a prova acabou e não há edição futura — nenhuma contagem, só a linha neutra
      v = await momento('2026-11-29T19:00:00', () => !!document.querySelector('main [data-enam-sem-edicao]'));
      ok(v.chip === null, R + '29/11 19h: sem edição futura, o chip do Início some');
      ok(v.bloco && v.dias === null && v.sem === v.semEdicao, R + '29/11 19h: na trilha, a linha neutra no lugar do número (' + v.sem + ')');
      const contagemNaTrilha = (v.texto.match(/realizad|já passou|faltam \d|falta 1 dia|é hoje|dias? para a prova/i) || [])[0];
      ok(!contagemNaTrilha, R + '29/11 19h: nenhuma contagem nem "prova realizada" na trilha' + (contagemNaTrilha ? ' (achou "' + contagemNaTrilha + '")' : ''));
      ok(/^ENAM · meta 56 acertos/.test(v.meta) && !/2026\.2/.test(v.meta), R + '29/11 19h: o cabeçalho da trilha fica "ENAM · meta 56", sem a edição passada (' + v.meta + ')');
      ok(/50\s*\/\s*80/.test(v.ult || '') && /Simulado no formato da prova/.test(v.acao || ''), R + '29/11 19h: a última tentativa continua e a ação é o simulado no formato, sem prazo');
      const ap = await page.evaluate(() => {
        const M = window.__ctMedir, sem = document.querySelector('main [data-enam-sem-edicao]'), bt = document.querySelector('main [data-trilha-enam] .ct-trilha-acao button');
        return { caixa: M.caixa(sem), fonte: parseFloat(getComputedStyle(sem).fontSize), contraste: M.contraste(sem), botao: bt ? M.caixa(bt) : null, acaoBotao: bt ? bt.dataset.acao : '' };
      });
      ok(ap.caixa.w > 0 && ap.caixa.h > 0 && ap.fonte >= 12, R + 'a linha neutra pinta e é legível (' + ap.caixa.w + '×' + ap.caixa.h + ', ' + ap.fonte + ' px)');
      ok(ap.contraste >= 4.5, R + 'contraste da linha neutra ≥ 4,5:1 (' + ap.contraste + ')');
      ok(!!ap.botao && ap.botao.h >= 44 && ap.acaoBotao === 'simulado', R + 'o botão do simulado tem alvo ≥ 44 px no toque (' + (ap.botao ? ap.botao.w + '×' + ap.botao.h : 'ausente') + ')');
      if (completo) {
        const reta19 = await naReta();
        const outros = await page.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms)), r = {};
          window.__catedraGoView('ajustes'); for (let i = 0; i < 60 && !document.querySelector('main .aj-abas button[data-s="enam"]'); i++) await w(100);
          document.querySelector('main .aj-abas button[data-s="enam"]').click();
          for (let i = 0; i < 60 && !document.querySelector('main [data-enam-aj-linha]'); i++) await w(100);
          const linha = document.querySelector('main [data-enam-aj-linha]');
          r.ajLinha = linha ? linha.textContent.replace(/\s+/g, ' ').trim() : null;
          r.ajSemContagem = !/prova realizada|faltam \d+ dias|falta 1 dia|é hoje/.test(document.querySelector('main').textContent);
          r.ajOpcoes = [...document.querySelectorAll('#aj-enam-edicao option')].map(o => o.value).join(',');
          window.__catedraGoView('inicio'); await w(300);
          return r;
        });
        ok(!/ENAM/.test(reta19.tx) && !reta19.marco && reta19.n === '— dias', R + '29/11 19h: a régua da Reta final não conta mais o ENAM (fica "' + reta19.n + '", sem marco)');
        ok(outros.ajLinha === v.semEdicao && outros.ajSemContagem, R + '29/11 19h: em Ajustes → ENAM, a linha neutra no lugar dos dias (' + outros.ajLinha + ')');
        ok(outros.ajOpcoes === '2026.2', R + '29/11 19h: Ajustes não oferece edição passada como futura (opções: ' + outros.ajOpcoes + ')');
      }

      // 30/11 10h: idem, e proxima() é null
      v = await momento('2026-11-30T10:00:00', () => !!document.querySelector('main [data-enam-sem-edicao]'));
      const px30 = await page.evaluate(() => ({ px: window.CT_ENAM.proxima(), nome: window.__catedraApp._enamNome() }));
      ok(v.chip === null && v.dias === null && v.sem === v.semEdicao && px30.px === null, R + '30/11 10h: sem contagem, linha neutra e proxima() null');
      ok(px30.nome === 'ENAM 2026.2 · simulado', R + '30/11 10h: sem edição futura, o simulado leva a edição que a pessoa guardou (' + px30.nome + ')');
      if (completo) {
        const vazio = await page.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms)), app = window.__catedraApp;
          app.setState({ enam: Object.assign({}, app.state.enam, { ativo: false }) }); await w(200);
          window.__catedraGoView('ajustes'); for (let i = 0; i < 60 && !document.querySelector('main .aj-abas button[data-s="enam"]'); i++) await w(100);
          document.querySelector('main .aj-abas button[data-s="enam"]').click();
          let d = null; for (let i = 0; i < 60 && !(d = [...document.querySelectorAll('main .ct-estado')].find(x => /Vai fazer o ENAM/.test(x.textContent))); i++) await w(100);
          const tx = d ? d.textContent.replace(/\s+/g, ' ') : '';
          app.setState({ enam: Object.assign({}, app.state.enam, { ativo: true }) }); window.__catedraGoView('inicio'); await w(300);
          return tx;
        });
        ok(vazio.includes('Nenhuma edição futura cadastrada') && !/próxima edição é a 2026\.2/.test(vazio), R + '30/11: com a trilha desligada, Ajustes não diz mais "a próxima edição é a 2026.2"');
      }

      // 30/11 com uma edição futura cadastrada: a contagem volta
      await page.evaluate(() => window.CT_ENAM.EDICOES.push({ id: '2027.1', numero: 'VII', data: '2027-05-16', inicio: '13:00', edital: 'edição de teste' }));
      v = await momento('2026-11-30T10:00:00', () => /ENAM 2027\.1/.test([...document.querySelectorAll('.cth-chip')].map(c => c.textContent).join(' ')));
      const dias167 = Math.round((Date.UTC(2027, 4, 16) - Date.UTC(2026, 10, 30)) / 864e5);
      ok(!!v.chip && /ENAM 2027\.1/.test(v.chip) && v.chip.includes('faltam ' + dias167 + ' dias'), R + '30/11 com a 2027.1 cadastrada: o chip volta (' + v.chip + ')');
      ok(v.dias === String(dias167) && v.sem === null && /ENAM 2027\.1/.test(v.meta), R + '30/11 com a 2027.1 cadastrada: a trilha volta a contar, sem a linha neutra');
      if (completo) {
        const aj = await page.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms)), app = window.__catedraApp, r = {};
          window.__catedraGoView('ajustes'); for (let i = 0; i < 60 && !document.querySelector('main .aj-abas button[data-s="enam"]'); i++) await w(100);
          document.querySelector('main .aj-abas button[data-s="enam"]').click();
          for (let i = 0; i < 60 && !document.querySelector('main [data-enam-aj-linha]'); i++) await w(100);
          r.linha = (document.querySelector('main [data-enam-aj-linha]') || {}).textContent || '';
          r.sel = (document.querySelector('#aj-enam-edicao') || {}).value || '';
          app.setState({ enam: Object.assign({}, app.state.enam, { ativo: false }) });
          let d = null; for (let i = 0; i < 60 && !(d = [...document.querySelectorAll('main .ct-estado')].find(x => /Vai fazer o ENAM/.test(x.textContent))); i++) await w(100);
          r.vazio = d ? d.textContent.replace(/\s+/g, ' ') : '';
          app.setState({ enam: Object.assign({}, app.state.enam, { ativo: true }) }); window.__catedraGoView('inicio'); await w(300);
          return r;
        });
        ok(/^faltam \d+ dias · o chip do Início/.test(aj.linha.trim()) && aj.sel === '2027.1', R + '30/11 com a 2027.1: Ajustes conta e seleciona a edição futura (' + aj.sel + ')');
        ok(/A próxima edição é a 2027\.1/.test(aj.vazio), R + '30/11 com a 2027.1: a frase "a próxima edição é…" volta, com a edição certa');
        // a pessoa ainda guarda a 2026.2: o nome do simulado e a agenda seguem a edição que a contagem conta
        const ag = await page.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms)), app = window.__catedraApp, r = {};
          r.guardada = app.state.enam.edicao; r.nome = app._enamNome();
          const doEnam = () => (app.state.eventos || []).filter(e => /^enam:sim:/.test(String(e.id))).map(e => String(e.id).slice(9)).sort();
          r.esperado = window.CT_ENAM.cadencia(new Date(), '2027-05-16'); r.antes = doEnam().length;
          app.enamAgendar(); for (let i = 0; i < 40 && doEnam().length === r.antes; i++) await w(50);
          r.agenda = doEnam();
          app.setState({ eventos: (app.state.eventos || []).filter(e => !/^enam:sim:/.test(String(e.id))) }); await w(100);
          return r;
        });
        ok(ag.guardada === '2026.2' && ag.nome === 'ENAM 2027.1 · simulado', R + '30/11 com a 2027.1: o simulado leva a edição contada, não a guardada (' + ag.nome + ')');
        ok(ag.antes === 0 && ag.esperado.length > 0 && ag.agenda.join() === ag.esperado.join() && ag.agenda[ag.agenda.length - 1] === '2027-05-09',
          R + '"Colocar na agenda" usa a cadência da 2027.1, a mesma das datas da trilha (' + ag.agenda.length + ' datas, a última ' + ag.agenda[ag.agenda.length - 1] + ')');
      }
      await page.evaluate(() => window.CT_ENAM.EDICOES.pop());

      // (b) a tela de resultado: líquido por disciplina e os dois cortes lado a lado
      const res = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms)), app = window.__catedraApp, E = window.CT_ENAM, M = window.__ctMedir, r = {};
        const its = []; E.AREAS.forEach(a => { for (let i = 0; i < a.cota; i++) its.push({ id: 'pp-' + a.id + '-' + i, area: a.id, ramo: a.nome, disciplina: a.nome, certo: 'C', alternativas: [] }); });
        const resp = {}; its.forEach((it, i) => { if (i < 51) resp[it.id] = 'C'; else if (i < 76) resp[it.id] = 'A'; });
        window.__catedraGoView('simulados'); await w(400);
        app.setState({ simAba: 'treino', sjModo: 'enam', sjAberto: true, sjFim: true, sjItens: its, sjResp: resp, sjRel: null, enamCor: E.corrigir(its, resp, 56, { segundos: 16920 }) });
        for (let i = 0; i < 100 && !document.querySelector('main [data-enam-tab] tbody tr'); i++) await w(100);
        const t = document.querySelector('main [data-enam-tab]'); if (!t) return { semTabela: true };
        const cel = tr => [...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim());
        const linhas = [...t.querySelectorAll('tbody tr')];
        r.nomes = linhas.map(l => cel(l)[0]).join(',');
        const da = id => { const l = linhas.find(x => x.getAttribute('data-area') === id); return l ? cel(l).slice(1).join(' | ') : ''; };
        r.const = da('constitucional'); r.civil = da('civil'); r.penal = da('penal');
        r.total = cel(t.querySelector('tfoot tr')).join(' | ');
        r.cab = cel(t.querySelector('thead tr')).join(' | ');
        r.nota = (document.querySelector('main [data-enam-liq-nota]') || {}).textContent || '';
        r.selo = (document.querySelector('main .ct-enam-selo') || {}).textContent || '';
        const warn = t.querySelector('tbody td[data-ok=""]'), okc = t.querySelector('tbody td[data-ok="1"]');
        r.contrastes = [['faltaram', warn], ['atingiu', okc], ['número', t.querySelector('tbody td:not([data-ok])')], ['disciplina', t.querySelector('tbody th')],
          ['cabeçalho', t.querySelector('thead th')], ['total', t.querySelector('tfoot td')], ['situação do total', t.querySelector('tfoot td[data-ok]')],
          ['nota do líquido', document.querySelector('main [data-enam-liq-nota]')]].map(([n, el]) => [n, el ? M.contraste(el) : 0]);
        r.corSituacao = !!warn && !!okc && getComputedStyle(warn).color !== getComputedStyle(okc).color && getComputedStyle(warn).color !== getComputedStyle(t.querySelector('tbody td:not([data-ok])')).color;
        r.monoNumeros = /mono|Menlo|Courier|SF Mono/i.test(getComputedStyle(t.querySelector('tbody td')).fontFamily);
        r.fonteCorpo = Math.min(...[...t.querySelectorAll('tbody td, tbody th, tfoot td, tfoot th')].map(e => parseFloat(getComputedStyle(e).fontSize)));
        r.caixa = M.caixa(t); r.linhaAlta = Math.min(...linhas.map(l => M.caixa(l).h));
        r.semRolagem820 = document.documentElement.scrollWidth <= innerWidth + 2;
        r.caixaRola = getComputedStyle(t.parentElement).overflowX;
        // meta 40: a coluna "sua meta" troca de lado; o resto da tabela não muda
        app.setState({ enamCor: E.corrigir(its, resp, 40, { segundos: 16920 }) }); await w(50);
        for (let i = 0; i < 60 && !/40\/80 · 50%\s*sua meta/.test(cel(document.querySelector('main [data-enam-tab] thead tr')).join(' | ')); i++) await w(100);
        r.cab40 = cel(document.querySelector('main [data-enam-tab] thead tr')).join(' | ');
        r.total40 = cel(document.querySelector('main [data-enam-tab] tfoot tr')).join(' | ');
        return r;
      });
      if (res.semTabela) ok(false, R + 'a tabela por disciplina aparece no resultado do Modo ENAM');
      else {
        ok(res.nomes === 'Constitucional,Administrativo,Formação Humanística,Direitos Humanos,Processual Civil,Civil,Empresarial,Penal', R + 'resultado: uma linha por disciplina, na ordem do edital (' + res.nomes + ')');
        ok(res.const === '16 | 0 | 0 | 16 | atingiu | atingiu' && res.civil === '1 | 11 | 0 | −10 | faltaram 8 | faltaram 5' && res.penal === '0 | 8 | 4 | −8 | faltaram 9 | faltaram 6',
          R + 'resultado: acertos, erros, brancos, líquido e os dois cortes por disciplina (Civil: ' + res.civil + ')');
        ok(res.total === 'Total | 51 | 25 | 4 | 26 | faltaram 5 | habilitaria (+11)', R + 'resultado: no total, os dois cortes lado a lado (' + res.total + ')');
        ok(/56\/80 · 70%\s*sua meta/.test(res.cab) && !/40\/80 · 50%\s*sua meta/.test(res.cab) && /Líquido/.test(res.cab), R + 'resultado: o cabeçalho marca a meta escolhida (' + res.cab + ')');
        ok(/^Líquido = acertos − erros; no ENAM o erro não desconta/.test(res.nota.trim()), R + 'resultado: o rótulo do líquido é explícito');
        ok(res.selo.trim() === 'faltaram 5 acertos', R + 'resultado: o selo principal continua respondendo pela meta escolhida');
        const fracos = res.contrastes.filter(([, c]) => c < 4.5);
        ok(fracos.length === 0, R + 'resultado: todo texto da tabela ≥ 4,5:1 (' + res.contrastes.map(([n, c]) => n + ' ' + c).join(', ') + ')');
        ok(res.corSituacao && res.monoNumeros && res.fonteCorpo >= 12, R + 'resultado: situação em cor de --ok/--warn além da palavra, números em mono, corpo ≥ 12 px (' + res.fonteCorpo + ')');
        ok(res.caixa.w > 300 && res.caixa.h > 8 * 20 && res.linhaAlta >= 20, R + 'resultado: a tabela pinta (' + res.caixa.w + '×' + res.caixa.h + ')');
        ok(res.semRolagem820 && res.caixaRola === 'auto', R + 'resultado: a 820 px a página não rola de lado; a caixa da tabela rola sozinha se precisar');
        ok(/40\/80 · 50%\s*sua meta/.test(res.cab40) && res.total40 === 'Total | 51 | 25 | 4 | 26 | faltaram 5 | habilitaria (+11)', R + 'resultado com meta 40: "sua meta" troca de coluna e o total não muda');
        await page.setViewportSize({ width: 390, height: 844 });
        const estreito = await page.evaluate(() => new Promise(r => setTimeout(() => r(document.documentElement.scrollWidth <= innerWidth + 2), 300)));
        ok(estreito, R + 'resultado: a 390 px a página não rola de lado');
        await page.setViewportSize({ width: 820, height: 1180 });
      }
      ok(errosPagina.length === 0, R + 'sem erro de JS na página' + (errosPagina.length ? ' (' + errosPagina[0].slice(0, 140) + ')' : ''));
    } catch (e) { ok(false, R + 'exceção: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
    finally { await ctx.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarEnamPosProvaEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
