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
   · (c) navegador: um verbete com os dois campos abre mostrando "Texto da fonte" e
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
  ['prompt do roteiro', /promptRoteiro|Gerar roteiro de estudo/],
  ['cache do roteiro regravado', /setItem\(\s*(RK|kr|'catedraJurisRoteiros')/],
  ['botão e blocos do roteiro', /estGerar|estRefazer|estQuiz|estChave|estFrase/],
  ['quadro "Não confunda com"', /naoConfunda|N[ãa]o confunda com|qdBloco|renderQuadro|promptQuadro|estQd/],
  ['quiz do roteiro', /montaQuiz|ctFlashcards/],
  ['rótulo "Comentário"', />Coment[áa]rio</],
  ['rótulo "Observação"', />Observa[çc][ãa]o</],
];

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
}

export async function testarSemAnotacoesNavegador(page, base, ok, opcoes = {}) {
  const R = 'SEM ANOTAÇÕES [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const id = Object.keys(TXT).find(k => /^INF/.test(k) && TXT[k].co && TXT[k].ob);
  if (!id) { ok(false, R + '(c) há verbete com texto e informações da fonte para abrir'); return; }
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
      R + '(c) o roteiro de IA guardado no aparelho é apagado quando o JURIS abre');

    await page.evaluate((i) => window.jurisAbrirPorId(i), id);
    await page.waitForFunction(() => !!document.querySelector('#jrDoc .venun .bd .gr'), null, { timeout: 20000 });
    const r = await page.evaluate(() => {
      const lum = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
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
      R + '(c) ' + id + ' abre com dois blocos além do enunciado: "Texto da fonte" e "Informações da fonte" (' + r.blocos.map(b => b.rotulo).join(' | ') + ')');
    ok(!!tf && tf.texto === TXT[id].co && !!inf && inf.texto === TXT[id].ob, R + '(c) …com o conteúdo do acervo, sem nada por cima');
    for (const b of [tf, inf].filter(Boolean)) {
      ok(b.visivel && b.largura > 200 && b.altura >= 16 && b.contraste >= 4.5 && b.contrasteRotulo >= 4.5,
        R + '(c) "' + b.rotulo + '" PINTA: ' + b.largura + '×' + b.altura + ' px, contraste do texto ' + b.contraste + ':1 e do rótulo ' + b.contrasteRotulo + ':1');
    }
    ok(!r.rotulosNaTela.some(t => /^(Coment[áa]rio|Observa[çc][ãa]o|Em uma frase|Pegadinha de prova|N[ãa]o confunda com|Pontos que a prova cobra)$/i.test(t)),
      R + '(c) nenhum rótulo de anotação pronta na tela (' + r.rotulosNaTela.join(' | ') + ')');
    ok(r.sobras.length === 0, R + '(c) sem botão de roteiro, quadro nem quiz (' + (r.sobras.join(', ') || 'nada') + ')');
    ok(r.oral, R + '(c) o botão "Modo prova oral" continua e pinta');
    ok(!erros.length, R + '(c) sem erro de página (' + erros.slice(0, 1).join('').slice(0, 140) + ')');
  } finally {
    page.off('pageerror', pegaErro);
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  testarSemAnotacoesEstatico((c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas.push(m); });
  if (falhas.length) { console.error('\n' + falhas.length + ' falha(s).'); process.exit(1); }
}
