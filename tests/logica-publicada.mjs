// Artefato REAL publicado; dados sintéticos, sem login real. CT_BROWSER=chromium|webkit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = path.join(raiz, 'public/index.html');
assert.ok(fs.existsSync(arquivo), 'Gere public/index.html antes desta regressão');
assert.notEqual(process.env.CT_REDE, 'livre', 'A regressão exige bloqueio de rede externa');
const capturas = process.env.CT_CAPTURAS_PUBLICADA && path.resolve(process.env.CT_CAPTURAS_PUBLICADA);
const origem = process.env.CT_PUBLICADA_ORIGEM || 'todos';
assert.ok(['todos', 'http', 'file'].includes(origem), 'CT_PUBLICADA_ORIGEM deve ser todos, http ou file');
if (capturas) fs.mkdirSync(capturas, { recursive: true });
const { srv, url } = await iniciarServidor(raiz, +(process.env.CT_PORT || 8141));
let browser;
try {
  const lancado = await lancarNavegador(); browser = lancado.browser;
  const dirs = ['sutil', 'premium', 'clean', 'moderno', 'aurora', 'solar', 'terminal', 'holo'];
  const casos = dirs.flatMap(dir => [false, true].map(dark => ({ dir, dark, file: false })));
  casos.push({ dir: 'clean', dark: false, file: true }, { dir: 'terminal', dark: true, file: true });
  if (origem === 'http') console.log('NOT RUN neste comando: file://; execute CT_PUBLICADA_ORIGEM=file separadamente.');
  for (const caso of casos.filter(c => origem === 'todos' || (origem === 'file') === c.file)) {
    const rotulo = `${lancado.motor}/${caso.file ? 'file-http-bloqueado' : 'http'}/${caso.dir}/${caso.dark ? 'dark' : 'light'}`;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    try {
      // Esta rota tem precedência sobre o fallback de CDN da infra: nenhum recurso é mascarado.
      // file:// usa recursos locais sem HTTP(S), inclusive localhost, nos DOIS motores.
      // navigator.onLine permanece true: setOffline(true) impede até HTML vazio no WebKit.
      await ctx.route(u => /^(https?|wss?):$/.test(u.protocol) && (caso.file || u.origin !== url), r => r.abort('blockedbyclient'));
      await ctx.addInitScript(({ dir, dark }) => {
        if (window !== window.top || !location.pathname.endsWith('/public/index.html')) return;
        // Executa antes do runtime; na recarga, NÃO repõe dados perdidos pelo aplicativo.
        if (window.name === '__ct_publicada_seed_m002') return;
        window.name = '__ct_publicada_seed_m002';
        const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
        set('dir', dir); set('dark', dark ? '1' : '0'); set('onboarded', '1'); set('areaEstudo', 'juridica');
        set('edital', [{ id: 'm002-edital', disc: 'Direito Civil', peso: 2, questoes: 10,
          topics: [{ id: 'm002-topico', name: 'Obrigações sintéticas', done: false, subs: [] }] }]);
        set('sessions', [{ id: 'm002-sessao', ts: 1790812800000, date: '2026-10-01', disc: 'Direito Civil',
          topico: 'Obrigações sintéticas', categoria: 'Teoria', categorias: ['Teoria'], min: 25, questoes: 0, acertos: 0 }]);
        set('reviews', []); set('errors', []);
      }, caso);
      const p = await ctx.newPage(), erros = [], falhos = [], httpPermitidos = [], pendentes = new Set(), completos = new Set();
      const critico = r => ['document', 'script', 'stylesheet', 'font'].includes(r.resourceType())
        && (r.url().startsWith(url + '/') || r.url().startsWith(pathToFileURL(path.join(raiz, 'public')).href + '/'));
      p.on('pageerror', e => erros.push(e.message));
      ctx.on('request', r => { if (critico(r)) pendentes.add(r); });
      ctx.on('requestfinished', r => { pendentes.delete(r); if (critico(r)) completos.add(r.resourceType()); });
      ctx.on('requestfailed', r => { pendentes.delete(r); if (critico(r)) falhos.push(r.url()); });
      ctx.on('response', r => {
        if (caso.file && /^https?:/.test(r.url())) httpPermitidos.push(r.url());
        if (critico(r.request()) && r.status() >= 400) falhos.push(r.url() + ':' + r.status());
      });
      const conferir = async () => {
        await p.waitForFunction(() => window.__catedraApp && document.querySelector('#ct-main')
          && !document.querySelector('#ct-carregamento') && window.CT_CSS_ESPERADO && window.CT_CSS_PRONTO,
        null, { timeout: 60000 });
        await p.evaluate(async () => {
          const tema = window.__catedraApp.THEMES()[window.__catedraApp.state.dir];
          await Promise.all([document.fonts.load('16px ' + tema.body), document.fonts.load('16px ' + tema.display)]);
          await document.fonts.ready;
        });
        await p.waitForTimeout(1300); // ultrapassa o autosave; não é medição de desempenho.
        for (let i = 0; pendentes.size && i < 50; i++) await p.waitForTimeout(100);
        const v = await p.evaluate(() => {
          const a = window.__catedraApp, main = document.querySelector('#ct-main');
          const root = main.closest('[data-dir][data-dark]'), css = getComputedStyle(root);
          const tema = a.THEMES()[a.state.dir], paleta = tema[a.state.darkMode ? 'dark' : 'light'];
          const normalizar = cor => { const e = document.createElement('i'); e.style.color = cor;
            root.appendChild(e); const v = getComputedStyle(e).color; e.remove(); return v; };
          const gate = document.querySelector('#catedra-auth-gate');
          const folhas = [...document.styleSheets].filter(s => /\/catedra-ui\.css(?:[?#]|$)/.test(s.href || ''));
          return { online: navigator.onLine, dir: root.dataset.dir, dark: root.dataset.dark, stateDir: a.state.dir, stateDark: a.state.darkMode,
            bg: getComputedStyle(main).backgroundColor, esperado: normalizar(paleta.bg),
            fonte: css.fontFamily.split(',')[0].replace(/["']/g, '').trim(), fonteEsperada: tema.body.split(',')[0].replace(/["']/g, '').trim(),
            cssReal: folhas.length === 1 && !folhas[0].disabled && css.getPropertyValue('--ct-alvo-toque').trim() === '44px',
            fontes: document.fonts.status === 'loaded' && [tema.body, tema.display].every(lista => [...document.fonts].some(f =>
              f.status === 'loaded' && f.family.replace(/["']/g, '') === lista.split(',')[0].replace(/["']/g, '').trim())),
            pronto: window.CT_ABERTURA_METRICAS?.estado === 'pronto', gate: !!gate && getComputedStyle(gate).display !== 'none',
            inerte: !!main.closest('[inert]'), semConta: !!window.CatedraSync && window.CatedraSync.email === ''
              && !Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k)),
            edital: JSON.parse(localStorage.getItem('catedra:edital') || '[]'), sessoes: JSON.parse(localStorage.getItem('catedra:sessions') || '[]') };
        });
        assert.equal(v.dir, caso.dir, rotulo + ': direção DOM'); assert.equal(v.stateDir, caso.dir);
        assert.equal(v.dark, caso.dark ? '1' : '0'); assert.equal(v.stateDark, caso.dark);
        assert.equal(v.bg, v.esperado, rotulo + ': cor calculada'); assert.equal(v.fonte, v.fonteEsperada, rotulo + ': fonte calculada');
        assert.ok(v.cssReal && v.fontes && v.pronto, rotulo + ': CSS completo, fontes carregadas e casca concluída');
        assert.ok(v.gate && v.inerte && v.semConta, rotulo + ': portão visível, conteúdo inerte e nenhuma conta real');
        assert.ok(v.edital.some(d => d.id === 'm002-edital' && d.peso === 3 && d.topics.some(t => t.id === 'm002-topico')),
          rotulo + ': edital sintético alterado e persistido');
        assert.ok(v.sessoes.some(s => s.id === 'm002-sessao' && s.min === 25), rotulo + ': sessão sintética preservada');
        assert.deepEqual(erros, [], rotulo + ': erros JavaScript'); assert.deepEqual(falhos, [], rotulo + ': recursos críticos falhos');
        if (caso.file) { assert.equal(v.online, true, rotulo + ': modo sem HTTP, não API offline');
          assert.deepEqual(httpPermitidos, [], rotulo + ': nenhuma resposta HTTP(S), carga ou recarga'); }
        assert.equal(pendentes.size, 0, rotulo + ': recursos críticos pendentes');
        for (const tipo of ['document', 'script', 'stylesheet', 'font']) assert.ok(completos.has(tipo), rotulo + ': carregou ' + tipo);
      };
      await p.goto(caso.file ? pathToFileURL(arquivo).href : url + '/public/index.html', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 60000 });
      // Exercita a lógica real atrás do portão por API do componente; não simula autenticação.
      await p.evaluate(() => window.__catedraApp.setState(s => ({ edital: s.edital.map(d => ({ ...d, peso: 3 })) })));
      await conferir();
      await p.reload({ waitUntil: 'domcontentloaded' }); await conferir();
      if (capturas && caso.dir === 'clean' && !caso.dark) await p.screenshot({ path: path.join(capturas, rotulo.replaceAll('/', '-') + '.png') });
      console.log('✓ PUBLICADA ' + rotulo + ' · carga e recarga preservadas');
    } finally { await ctx.close(); }
  }
} finally { if (browser) await browser.close(); await new Promise(r => srv.close(r)); }
