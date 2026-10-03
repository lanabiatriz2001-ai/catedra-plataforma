/* Sem anotação pronta no JURIS — decisão da dona (03/10/2026): no verbete fica o texto oficial
   e o que a pessoa mesma marca e anota. Os mapas mentais já tinham saído (tests/sem-dod.mjs e
   tests/sem-mapas-mentais.mjs). Aqui, o resto, na web e no acervo:
   · (a) fonte: o juris-web.html não tem mais o roteiro de estudo escrito pela IA, o quadro
         "Não confunda com" nem o quiz que vinha do roteiro; não pinta bloco chamado
         "Comentário" nem "Observação"; a prova oral (quem escreve é a pessoa) continua;
   · (b) acervo: nenhuma anotação autoral em co/ob — nem no juris-text.js, nem nas fatias de
         dados/juris-text que o app de fato lê, nem no corpus.json nativo (origem e .app de
         mac/build; o que não existe nesta máquina fica de fora COM aviso). A régua é a mesma
         função que limpou (scripts/limpar-anotacoes-juris.mjs): passar de novo não muda nada.
         O que é texto da fonte (inteiro teor do informativo, questão submetida) continua lá;
   · (c) Swift, Mac e iPad: o JURIS nativo não tem mais o roteiro de estudo (modelo, cache, tela e
         gerador local), o quadro comparativo, a "nota de estudo" não oficial (modelo, carga do
         notas.json e cartão), o resumo semanal, o comparador STF × STJ com IA nem a linha do
         tempo do tema; o modo Estudar do verbete fica com as
         anotações da pessoa e a prova oral; o que a fonte publica junto do verbete abre como
         "Texto e informações da fonte"; os builds não copiam o notas.json e nenhum .app de
         mac/build o carrega;
   · (e) navegador: o campo "Minhas anotações" do verbete pinta (caixa e contraste medidos), grava
         sozinho por verbete em catedra:notaJuris:<id>, volta depois de recarregar, some da
         memória quando esvaziado, e as setas dentro dele não trocam de verbete;
   · (d) navegador: um verbete com os dois campos abre mostrando "Texto da fonte" e
         "Informações da fonte" PINTADOS (caixa, cor e contraste medidos), com o conteúdo do
         acervo; não há botão de roteiro, quadro nem quiz; a prova oral está lá; e o roteiro
         de IA que estava guardado no aparelho é apagado na abertura. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { limpaCampo } from '../scripts/limpar-anotacoes-juris.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => { try { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch (_) { return ''; } };
const carrega = (f, g) => { const e = {}; new Function('window', ler(f)).call(null, e); return e[g] || {}; };

const FONTE_PROIBIDA = [
  ['(guarda) campo de anotação ausente', /^(?![\s\S]*id="jrNota")/],
  ['prompt do roteiro', /promptRoteiro|Gerar roteiro de estudo/],
  ['cache do roteiro regravado', /setItem\(\s*(RK|kr|'catedraJurisRoteiros')/],
  ['botão e blocos do roteiro', /estGerar|estRefazer|estQuiz|estChave|estFrase/],
  ['quadro "Não confunda com"', /naoConfunda|N[ãa]o confunda com|qdBloco|renderQuadro|promptQuadro|estQd/],
  ['quiz do roteiro', /montaQuiz|ctFlashcards/],
  ['rótulo "Comentário"', />Coment[áa]rio</],
  ['rótulo "Observação"', />Observa[çc][ãa]o</],
];

const SWIFT_PROIBIDO = [
  ['roteiro de estudo (modelo, cache, tela, gerador)', /\bRoteiro(Estudo|EstudoView|Cache|Local)\b|roteiro de estudo"/],
  ['quadro comparativo', /\bQuadroRelacionados(Calc|View)?\b|\bJurisVizinhoLinha\b|"N[ãa]o confunda com"/],
  ['nota de estudo não oficial', /\bNotaEstudo\b|\bRamoNota\b|\bnotaApp(Card)?\b|\bnotasApp\b|NOTA DE ESTUDO|carregarNotas/],
  ['resumo semanal', /\bResumoSemanal(IA|Cache|Card)?\b/],
  ['comparador STF × STJ com IA e linha do tempo do tema', /\b(Comparador|LinhaTempo)View\b|compararSTFxSTJ|\blinhaDoTempo\b|Comparar STF × STJ|"Linha do tempo do tema"/],
  ['rótulo "Comentário e observação"', /"Coment[áa]rio e observa[çc][ãa]o"/],
];

/** Todos os .swift dos módulos JURIS e LEGIS nativos, sem as saídas de build. */
function swiftDosModulos() {
  const lista = [];
  const anda = (d) => {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name === 'build' || ent.name.startsWith('.')) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) anda(p);
      else if (ent.name.endsWith('.swift')) lista.push(p);
    }
  };
  for (const d of ['mac/vendor', 'mac/Sources', 'ios/vendor', 'ios/Sources']) anda(path.join(RAIZ, d));
  return lista;
}

/** Os campos que a limpeza mudaria — vazio quando o acervo está limpo. */
function sujos(T, campos) {
  const out = [];
  for (const id of Object.keys(T)) for (const [campo, chave] of campos) {
    const v = T[id] && T[id][chave];
    if (typeof v === 'string' && v && limpaCampo(id, campo, v) !== v) out.push(id + '.' + chave);
  }
  return out;
}
const mostra = (a) => a.length ? ' (' + a.length + ': ' + a.slice(0, 3).join(', ') + ')' : '';

export function testarSemAnotacoesEstatico(ok, opcoes = {}) {
  const R = 'SEM ANOTAÇÕES [' + (opcoes.motor || 'node') + '] ';

  // (a) fonte
  const jw = ler('juris-web.html');
  ok(jw.length > 50000, R + '(a) o juris-web.html foi lido');
  for (const [nome, re] of FONTE_PROIBIDA) ok(!re.test(jw), R + '(a) o JURIS web não tem mais: ' + nome);
  ok(/function oralIniciar\(/.test(jw) && /id="estOral"/.test(jw) && /function iaPede\(/.test(jw),
    R + '(a) a prova oral e a ponte de IA que ela usa continuam');
  ok(/removeItem\('catedraJurisRoteiros'\)/.test(jw), R + '(a) o roteiro guardado no aparelho é apagado na abertura');

  // (b) acervo web
  const WEB = [['co', 'co'], ['ob', 'ob']];
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const n = Object.keys(TXT).length;
  ok(n > 10000, R + '(b) o juris-text.js foi lido (' + n + ' verbetes)');
  ok(sujos(TXT, WEB).length === 0, R + '(b) nenhuma anotação autoral no juris-text.js' + mostra(sujos(TXT, WEB)));
  const comTexto = Object.values(TXT).filter(v => v.co).length, comInfo = Object.values(TXT).filter(v => v.ob).length;
  ok(comTexto > 500 && comInfo > 1000,
    R + '(b) o texto da própria fonte ficou: ' + comTexto + ' verbetes com o inteiro teor, ' + comInfo + ' com informações da fonte');
  const dirF = path.join(RAIZ, 'dados', 'juris-text');
  let fatias = 0; const sujasF = [];
  for (const f of fs.existsSync(dirF) ? fs.readdirSync(dirF) : []) {
    if (!/^\d+-[0-9a-f]+\.json$/.test(f)) continue;
    fatias++;
    sujasF.push(...sujos(JSON.parse(fs.readFileSync(path.join(dirF, f), 'utf8')), WEB));
  }
  ok(fatias > 10 && sujasF.length === 0, R + '(b) nenhuma anotação autoral nas ' + fatias + ' fatias de dados/juris-text' + mostra(sujasF));

  // (b) acervo nativo — lido onde existir
  const NAT = [['co', 'comentario'], ['ob', 'observacao']];
  const corpora = [['VadeMecumJuris (origem)', path.join(process.env.HOME || '', 'App Jurisprudências', 'VadeMecumJuris', 'Sources', 'VadeMecum', 'Resources')]];
  const macBuild = path.join(RAIZ, 'mac', 'build');
  if (fs.existsSync(macBuild)) for (const nome of fs.readdirSync(macBuild)) {
    if (nome.endsWith('.app')) corpora.push(['mac/build/' + nome, path.join(macBuild, nome, 'Contents', 'Resources')]);
  }
  for (const [rotulo, dir] of corpora) {
    const f = path.join(dir, 'corpus.json');
    if (!fs.existsSync(f)) { console.log('  · ' + R + rotulo + '/corpus.json não existe nesta máquina — fica de fora'); continue; }
    const nat = Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).map(r => [r.id, r]));
    const s = sujos(nat, NAT);
    ok(s.length === 0, R + '(b) ' + rotulo + ': nenhuma anotação autoral no corpus.json nativo' + mostra(s));
  }

  // (c) Swift do Mac e do iPad
  const swifts = swiftDosModulos();
  ok(swifts.length > 100, R + '(c) os .swift dos hosts nativos foram lidos (' + swifts.length + ')');
  for (const [nome, re] of SWIFT_PROIBIDO) {
    const onde = swifts.filter(f => re.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(RAIZ, f));
    ok(onde.length === 0, R + '(c) nenhum Swift tem mais: ' + nome + mostra(onde));
  }
  for (const p of ['mac', 'ios']) {
    const j = p + '/vendor/juris/';
    for (const f of ['Views/QuadroRelacionados.swift', 'Views/RoteiroLocal.swift', 'Views/ResumoSemanalView.swift', 'Views/AnaliseViews.swift'])
      ok(!fs.existsSync(path.join(RAIZ, j + f)), R + '(c) ' + j + f + ' saiu');
    const det = ler(j + 'Views/EntryDetailView.swift'), est = ler(j + 'Views/JurisEstudoViews.swift');
    ok(/anotacaoCard\n\s*ProvaOralDoVerbete\(entry: entry\)/.test(det) && /struct ProvaOralDoVerbete: View/.test(est) && /struct ProvaOralView: View/.test(est),
      R + '(c) ' + p + ': o modo Estudar do verbete fica com as anotações da pessoa e a prova oral');
    ok(/Text\("Texto e informações da fonte"\)/.test(det) && /Label\("Texto e informações da fonte"/.test(det)
      && /Text\("Texto da fonte"\)/.test(det) && /Text\("Informações da fonte"\)/.test(det) && !/Material de apoio/.test(det),
      R + '(c) ' + p + ': o que a fonte publica abre como "Texto e informações da fonte", sem chamá-lo de material de apoio');
    ok(/removeItem\(at: base\.appendingPathComponent\(nome\)\)/.test(ler(j + 'Store/LibraryStore.swift')) && /"roteiros-estudo\.json", "roteiros-estudo-local\.json"/.test(ler(j + 'Store/LibraryStore.swift')),
      R + '(c) ' + p + ': os roteiros guardados no aparelho são apagados na carga do acervo');
  }
  ok(ler('mac/vendor/juris/Views/TextoVerbete.swift') !== '' && ler('mac/vendor/juris/Views/TextoVerbete.swift') === ler('ios/vendor/juris/Views/TextoVerbete.swift'),
    R + '(c) os utilitários de texto da prova oral (TextoVerbete.swift) são iguais no Mac e no iPad');
  for (const sh of ['mac/build-app.sh', 'ios/build-ipad.sh']) {
    const semComentario = ler(sh).replace(/^\s*#.*$/gm, '');
    ok(semComentario.length > 1000 && !/notas\.json/.test(semComentario) && /for f in corpus\.json indice\.json; do/.test(semComentario),
      R + '(c) ' + sh + ' não copia mais o notas.json para o bundle');
  }
  for (const [rotulo, dir] of corpora.slice(1)) {
    ok(!fs.existsSync(path.join(dir, 'notas.json')), R + '(c) ' + rotulo + ' não carrega o notas.json');
  }
}

export async function testarSemAnotacoesNavegador(page, base, ok, opcoes = {}) {
  const R = 'SEM ANOTAÇÕES [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const id = Object.keys(TXT).find(k => /^INF/.test(k) && TXT[k].co && TXT[k].ob);
  if (!id) { ok(false, R + '(d) há verbete com texto e informações da fonte para abrir'); return; }
  const erros = [];
  const pegaErro = (e) => erros.push(String(e && e.message || e));
  page.on('pageerror', pegaErro);
  try {
    // o cache do roteiro é lido (e agora apagado) no boot do satélite: semeia e recarrega
    await page.goto(base + '/juris-web.html');
    await page.waitForFunction(() => typeof window.openVerbete === 'function', null, { timeout: 20000 });
    await page.evaluate(() => localStorage.setItem('catedraJurisRoteiros', JSON.stringify({ x: { ts: 1, frase: 'roteiro antigo' } })));
    await page.reload();
    await page.waitForFunction(() => typeof window.jurisAbrirPorId === 'function' && window.jurisTemId('x') !== null, null, { timeout: 20000 });
    ok(await page.evaluate(() => localStorage.getItem('catedraJurisRoteiros')) === null,
      R + '(d) o roteiro de IA guardado no aparelho é apagado quando o JURIS abre');

    await page.evaluate((i) => window.jurisAbrirPorId(i), id);
    await page.waitForFunction(() => !!document.querySelector('#jrDoc .venun .bd .gr'), null, { timeout: 20000 });
    const r = await page.evaluate(() => {
      // color-mix devolve "color(srgb 0.99 0.95 0.96)" (0–1), não rgb(): as duas formas são lidas
      const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); if (/^color\(/.test(String(c))) { m[0] *= 255; m[1] *= 255; m[2] *= 255; } const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return { l: 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), a: m.length > 3 ? m[3] : 1 }; };
      const fundoDe = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (lum(b).a >= 0.99) return b; } return 'rgb(255,255,255)'; };
      const contraste = (el) => { const a = lum(getComputedStyle(el).color).l, b = lum(fundoDe(el)).l; return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const blocos = [...document.querySelectorAll('#jrDoc .vblk')].map((b) => {
        const lbl = b.querySelector('.lbl'), bd = b.querySelector('.bd'), cx = bd.getBoundingClientRect(), cs = getComputedStyle(bd);
        return { rotulo: lbl.textContent.trim(), texto: bd.textContent, largura: Math.round(cx.width), altura: Math.round(cx.height),
          visivel: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.9,
          contraste: +contraste(bd).toFixed(2), contrasteRotulo: +contraste(lbl).toFixed(2) };
      });
      const oral = document.getElementById('estOral'), co = oral && oral.getBoundingClientRect();
      return { blocos, rotulosNaTela: [...document.querySelectorAll('#jrDoc .lbl, #jrDoc h4')].map(e => e.textContent.trim()),
        sobras: ['#estGerar', '#estQdSlot', '#estQuiz', '#estRefazer', '.estQd', '.qdCab', '.qalt'].filter(s => !!document.querySelector(s)),
        oral: !!oral && co.width > 0 && co.height > 0 && getComputedStyle(oral).display !== 'none' };
    });
    const porRotulo = Object.fromEntries(r.blocos.map(b => [b.rotulo, b]));
    const tf = porRotulo['Texto da fonte'], inf = porRotulo['Informações da fonte'];
    ok(r.blocos.length === 2 && !!tf && !!inf,
      R + '(d) ' + id + ' abre com dois blocos além do enunciado: "Texto da fonte" e "Informações da fonte" (' + r.blocos.map(b => b.rotulo).join(' | ') + ')');
    ok(!!tf && tf.texto === TXT[id].co && !!inf && inf.texto === TXT[id].ob, R + '(d) …com o conteúdo do acervo, sem nada por cima');
    for (const b of [tf, inf].filter(Boolean)) {
      ok(b.visivel && b.largura > 200 && b.altura >= 16 && b.contraste >= 4.5 && b.contrasteRotulo >= 4.5,
        R + '(d) "' + b.rotulo + '" PINTA: ' + b.largura + '×' + b.altura + ' px, contraste do texto ' + b.contraste + ':1 e do rótulo ' + b.contrasteRotulo + ':1');
    }
    ok(!r.rotulosNaTela.some(t => /^(Coment[áa]rio|Observa[çc][ãa]o|Em uma frase|Pegadinha de prova|N[ãa]o confunda com|Pontos que a prova cobra)$/i.test(t)),
      R + '(d) nenhum rótulo de anotação pronta na tela (' + r.rotulosNaTela.join(' | ') + ')');
    ok(r.sobras.length === 0, R + '(d) sem botão de roteiro, quadro nem quiz (' + (r.sobras.join(', ') || 'nada') + ')');
    ok(r.oral, R + '(d) o botão "Modo prova oral" continua e pinta');

    // (e) o campo em que quem escreve é a pessoa: pinta, grava por verbete, sobrevive ao recarregar
    const chave = 'catedra:notaJuris:' + id, TEXTO = 'Cai em prova: conferir o prazo.\nSegunda linha.';
    const campo = await page.evaluate(() => {
      const el = document.getElementById('jrNota'), lb = document.querySelector('label[for="jrNota"]');
      if (!el || !lb) return null;
      const cx = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); if (/^color\(/.test(String(c))) { m[0] *= 255; m[1] *= 255; m[2] *= 255; } const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return { l: 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), a: m.length > 3 ? m[3] : 1 }; };
      const fundo = (e0) => { for (let e = e0; e; e = e.parentElement) { const g = getComputedStyle(e).backgroundColor; if (lum(g).a >= 0.99) return g; } return 'rgb(255,255,255)'; };
      const ct = (e0) => { const a = lum(getComputedStyle(e0).color).l, g = lum(fundo(e0)).l; return +((Math.max(a, g) + 0.05) / (Math.min(a, g) + 0.05)).toFixed(2); };
      return { rotulo: lb.textContent.trim(), largura: Math.round(cx.width), altura: Math.round(cx.height), visivel: cs.display !== 'none' && cs.visibility !== 'hidden',
        vazio: el.value === '', contraste: ct(el), contrasteRotulo: ct(lb), antesDaOral: !!(el.compareDocumentPosition(document.getElementById('estOral')) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    ok(!!campo && campo.rotulo === 'Minhas anotações' && campo.visivel && campo.largura > 200 && campo.altura >= 96 && campo.contraste >= 4.5 && campo.contrasteRotulo >= 4.5 && campo.vazio && campo.antesDaOral,
      R + '(e) o campo "Minhas anotações" PINTA vazio, antes da prova oral: ' + (campo ? campo.largura + '×' + campo.altura + ' px, contraste ' + campo.contraste + ':1 (rótulo ' + campo.contrasteRotulo + ':1)' : 'ausente'));
    await page.click('#jrNota');
    await page.keyboard.type('Cai em prova: conferir o prazo.');
    await page.keyboard.press('Shift+Enter').catch(() => {});
    await page.evaluate((v) => { const el = document.getElementById('jrNota'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, TEXTO);
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
    ok(await page.evaluate(() => window.jurisVerbeteAberto()) === id, R + '(e) seta dentro do campo anda no texto, não troca de verbete');
    await page.waitForTimeout(1300);
    const gravou = await page.evaluate((k) => ({ v: localStorage.getItem(k), st: document.getElementById('jrNotaSt').textContent }), chave);
    ok(gravou.v === TEXTO && /salva/.test(gravou.st), R + '(e) a anotação é gravada sozinha em ' + chave + ' e a tela avisa ("' + gravou.st + '")');
    await page.reload();
    await page.waitForFunction(() => typeof window.jurisAbrirPorId === 'function' && window.jurisTemId('x') !== null, null, { timeout: 20000 });
    await page.evaluate((i) => window.jurisAbrirPorId(i), id);
    await page.waitForFunction(() => !!document.getElementById('jrNota'), null, { timeout: 20000 });
    ok(await page.evaluate(() => document.getElementById('jrNota').value) === TEXTO, R + '(e) depois de recarregar, o verbete reabre com a anotação no campo');
    await page.evaluate(() => { const el = document.getElementById('jrNota'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); el.dispatchEvent(new Event('blur')); });
    await page.waitForTimeout(300);
    ok(await page.evaluate((k) => localStorage.getItem(k), chave) === null, R + '(e) apagar o texto tira a chave: nota vazia não fica gravada');
    ok(!erros.length, R + '(d) sem erro de página (' + erros.slice(0, 1).join('').slice(0, 140) + ')');
  } finally {
    page.off('pageerror', pegaErro);
    try { await page.evaluate((k) => localStorage.removeItem(k), 'catedra:notaJuris:' + id); } catch (_) {}
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  testarSemAnotacoesEstatico((c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas.push(m); });
  if (falhas.length) { console.error('\n' + falhas.length + ' falha(s).'); process.exit(1); }
}
