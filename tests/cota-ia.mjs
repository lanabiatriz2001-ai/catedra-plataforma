/* COTA DE IA VISÍVEL (abertura para outros estudantes).
   A cota diária (P18) só aparecia quando estourava, e a mensagem mandava "falar com quem te
   convidou". Agora a pessoa vê quanto resta — em Ajustes e ao lado de "Estruturar com IA" no
   edital, o primeiro gasto de quem acaba de chegar — e a mensagem diz quando a cota volta.
   A leitura vem da RPC minha_cota_ia; se ela falhar (res.error — o supabase-js NÃO rejeita),
   nada de "0 de 0": o contador simplesmente não aparece. */
import { mensagemCota } from '../api/complete.js';

export async function testarCotaIA(page, base, ok) {
  const msg = mensagemCota({ limite: 40, usadas: 40 });
  ok(!/quem te convidou/.test(msg) && /amanhã/.test(msg), 'COTA/IA a mensagem de cota esgotada diz quando volta, sem supor padrinho ("' + msg + '")');
  ok(/chamadas de IA de hoje/.test(msg), 'COTA/IA a mensagem ainda casa com o toast do portão (/chamadas de IA de hoje/)');

  await page.goto(base + '/__semente');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(base + '/Catedra.dc.html'); await page.waitForTimeout(1600);
  const m = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp, r = {};
    let resp = { data: { plano: 'beta', limite: 40, usadas: 12, restante: 28 }, error: null }, chamadas = 0;
    app._sb = () => ({ rpc: async (n) => { if (n === 'minha_cota_ia') { chamadas++; return resp; } return { data: null, error: { message: 'x' } }; } });
    await app._carregarCotaIA(); await w(300);
    window.__catedraGoView('ajustes'); await w(600);
    const aba = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'dados'); if (aba) { aba.click(); await w(600); }
    const aj = document.querySelector('main [data-ia-cota]');
    r.ajustes = aj ? aj.textContent.replace(/\s+/g, ' ').trim() : null;
    window.__catedraGoView('edital'); await w(600);
    app.setState({ edRaw: 'DIREITO CIVIL\n1 Prescrição' }); await w(300);
    const ed = document.querySelector('main [data-ia-cota-edital]');
    r.edital = ed ? ed.textContent.replace(/\s+/g, ' ').trim() : null;
    if (ed) { const cs = getComputedStyle(ed); r.editalCor = cs.color; }
    // depois de uma chamada de IA, a contagem é relida
    const antes = chamadas;
    app.setState({ iaConsentimento: { versao: app.IA_CONSENT_VERSAO, ts: Date.now() } });
    // sem IA no ambiente de teste, instala uma falsa e o portão por cima — senão o caso passaria por vacuidade
    if (!window.claude) { window.claude = { complete: async (p) => 'resp:' + p }; app._instalarPortaoIA(); }
    const c = window.claude; if (c && c.__ctSemPortao) { try { await c.complete('x'); } catch (_) {} }
    for (let i = 0; i < 40 && chamadas === antes; i++) await w(50);
    r.relidaAposChamada = chamadas > antes;
    r.temPortao = !!(c && c.__ctSemPortao);
    // RPC com erro: o contador some, não vira "0 de 0"
    resp = { data: null, error: { message: 'relation "ia_cota" does not exist' } };
    await app._carregarCotaIA(); await w(300);
    r.somemNoErro = !document.querySelector('main [data-ia-cota-edital]');
    return r;
  });
  ok(m.ajustes && /IA hoje: 12 de 40/.test(m.ajustes), 'COTA/IA Ajustes mostra o uso do dia (' + m.ajustes + ')');
  ok(m.edital && /28/.test(m.edital) && /Reconhecer sem IA/.test(m.edital), 'COTA/IA o edital avisa quantas restam e aponta a saída sem IA (' + m.edital + ')');
  ok(m.temPortao && m.relidaAposChamada, 'COTA/IA a contagem é relida depois de uma chamada de IA (portão=' + m.temPortao + ')');
  ok(m.somemNoErro, 'COTA/IA com a RPC em erro o aviso some em vez de mostrar número inventado');
}
