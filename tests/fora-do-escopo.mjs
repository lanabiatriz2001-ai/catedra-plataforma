/* FORA DO ESCOPO (item 14, 25/11/2026)
   O Cátedra não compete em sentença inédita apostando no próximo edital, correção por
   magistrado, videoaula da correção e ranking de turma. O que existir disso no código fica
   atrás de flag, desligada. Parte 1 (Node): a fonte. Parte 2 (navegador): a Comunidade sem e
   com a flag. Roda sozinho: node tests/fora-do-escopo.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function testarForaDoEscopoEstatico(ok) {
  const R = 'ESCOPO ';
  const fonte = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const m = fonte.match(/FORA_DO_ESCOPO = \{([^}]*)\}/);
  ok(!!m && /rankingTurma:false/.test(m[1]), R + 'a flag rankingTurma existe e nasce desligada');
  ok(/data-com-ranking/.test(fonte) && /<sc-if value="\{\{ flagRankingTurma \}\}"[^>]*>\s*<!-- RANKING SEMANAL/.test(fonte), R + 'o ranking semanal da Comunidade está dentro do portão da flag');
  const auth = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
  ok(!/ct_flag/.test(auth) && /localStorage\.getItem\('ct_flag:'\+nome\)/.test(fonte), R + 'a flag de teste mora em ct_flag:, fora do sync (não viaja entre aparelhos)');
  // nenhum dos quatro recursos ganhou tela: não há view nem botão que os ofereça
  const tpl = fonte.slice(0, fonte.indexOf('<script'));
  ok(!/senten[çc]a in[ée]dita|pr[óo]ximo edital/i.test(tpl) && !/corre[çc][ãa]o (por|de) magistrad/i.test(tpl) && !/videoaula da corre/i.test(tpl), R + 'sentença inédita, correção por magistrado e videoaula da correção não aparecem em nenhuma tela');
}

export async function testarForaDoEscopo(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'ESCOPO [' + (opcoes.motor || 'chromium') + '] ';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1180, height: 900 } });
  const page = await ctx.newPage();
  try {
    const abrir = async (flag) => {
      await page.goto(base + '/__semente');
      await page.evaluate((flag) => { localStorage.clear(); const set = (k, v) => localStorage.setItem('catedra:' + k, v);
        set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); if (flag) localStorage.setItem('ct_flag:rankingTurma', '1'); }, flag);
      await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
      await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
      await page.evaluate(() => window.__catedraGoView('comunidade'));
      await page.waitForSelector('text=Ao vivo na sala de estudos', { timeout: 8000 });
    };
    await abrir(false);
    const sem = await page.evaluate(() => ({ ranking: !!document.querySelector('[data-com-ranking]'), lugar: !!document.querySelector('[data-com-lugar]'),
      txt: document.querySelector('main') ? document.querySelector('main').innerText : document.body.innerText }));
    ok(!sem.ranking && !sem.lugar && !/Ranking da semana|Suba no ranking|seu lugar/i.test(sem.txt), R + 'flag desligada: nem ranking, nem "seu lugar", nem convite a subir no ranking');
    ok(/Ao vivo na sala de estudos/.test(sem.txt) && /Estude junto\./.test(sem.txt) && !/ranking/i.test(sem.txt), R + 'o resto da Comunidade (sala ao vivo e grupos) continua, e a palavra ranking some da tela');
    await abrir(true);
    ok(await page.locator('[data-com-ranking]').count() === 1 && await page.locator('text=Ranking da semana').count() === 1, R + 'flag ligada neste aparelho: o ranking volta, intacto');
  } catch (e) { ok(false, R + 'exceção: ' + e.message.split('\n')[0]); }
  finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarForaDoEscopoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
