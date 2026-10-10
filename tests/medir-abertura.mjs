// Mission 002 — diagnóstico, não gate de desempenho nem telemetria de usuários.
// Executa cargas frias em contextos novos, sem login nem dados pessoais.
import fs from 'node:fs';
import path from 'node:path';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { bloqueioLongTasks, resumoAmostras } from './metricas-abertura.mjs';

const raiz = path.resolve('.');
const porta = Number(process.env.CT_PORT || 8138);
const quantidade = Number(process.env.CT_MEDICAO_AMOSTRAS || 3);
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error('CT_PORT inválida');
if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) throw new Error('CT_MEDICAO_AMOSTRAS deve ser inteiro de 1 a 10');
const { srv, url } = await iniciarServidor(raiz, porta);
let browser;
try {
  const lancado = await lancarNavegador();
  browser = lancado.browser;
  const motor = lancado.motor;
  const amostras = [];
  for (let i = 0; i < quantidade; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    let errosDePagina = 0, recursosLocaisFalhos = 0;
    const falhas = [];
    page.on('pageerror', () => { errosDePagina++; });
    const localCritico = request => {
      try {
        const u = new URL(request.url());
        return u.origin === url && ['document', 'script', 'stylesheet'].includes(request.resourceType());
      } catch (_) { return false; }
    };
    page.on('requestfailed', request => {
      if (localCritico(request)) { recursosLocaisFalhos++; falhas.push(new URL(request.url()).pathname); }
    });
    page.on('response', response => {
      const request = response.request();
      if (localCritico(request) && response.status() >= 400) {
        recursosLocaisFalhos++;
        falhas.push(new URL(request.url()).pathname);
      }
    });
    try {
      await page.addInitScript(() => {
        window.__ctDiagnostico = { lcp: null, tarefas: [] };
        try { new PerformanceObserver(lista => {
          const entradas = lista.getEntries();
          if (entradas.length) window.__ctDiagnostico.lcp = entradas[entradas.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (_) {}
        try { new PerformanceObserver(lista => {
          for (const e of lista.getEntries()) window.__ctDiagnostico.tarefas.push({ inicio: e.startTime, duracao: e.duration });
        }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
      });
      if (motor === 'chromium') {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      }
      let timeout = false;
      try {
        await page.goto(url + '/public/index.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!document.querySelector('#ct-main') && !document.querySelector('#ct-carregamento'),
          {}, { timeout: 90000 });
        // LCP na janela da abertura (+1 s), não LCP final da sessão.
        await page.waitForTimeout(1000);
      } catch (_) { timeout = true; }
      const valores = await page.evaluate(() => {
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find(e => e.name === 'first-contentful-paint')?.startTime ?? null;
        const nav = performance.getEntriesByType('navigation')[0];
        const abre = window.CT_ABERTURA_METRICAS;
        const recursos = performance.getEntriesByType('resource')
          .map(e => ({ caminho: new URL(e.name).pathname, bytes: e.transferSize, ms: Math.round(e.duration) }))
          .sort((a, b) => b.bytes - a.bytes).slice(0, 8);
        return {
          mainPronto: !!document.querySelector('#ct-main'),
          casCaPresente: !!document.querySelector('#ct-carregamento'),
          cargaCssEsperada: !!window.CT_CSS_ESPERADO,
          cargaCssPronta: !!window.CT_CSS_PRONTO,
          prontidaoMs: abre?.duracao ?? null,
          fcpMs: fcp,
          lcpMs: window.__ctDiagnostico?.lcp ?? null,
          domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
          tarefas: window.__ctDiagnostico?.tarefas ?? [],
          recursos
        };
      }).catch(() => ({ mainPronto: false, casCaPresente: true, prontidaoMs: null, tarefas: [], recursos: [] }));
      const { tarefas, ...resto } = valores;
      amostras.push({
        rodada: i + 1, ...resto,
        bloqueioLongTasksMs: bloqueioLongTasks(tarefas, valores.fcpMs, valores.prontidaoMs),
        errosDePagina, recursosLocaisFalhos, caminhosFalhos: [...new Set(falhas)], timeout
      });
    } finally { await ctx.close(); }
  }
  const { resumo, amostras: medidas } = resumoAmostras(amostras);
  const resultado = {
    versao: 2, motor,
    perfil: motor === 'chromium' ? '390×844; Chrome CDP 150 ms, 1,6 Mbps, CPU ×4; contextos frios' :
      '390×844; WebKit sem emulação CDP; contextos frios',
    definicao: 'Prontidão visual = #ct-main presente e casca removida; NÃO é login, sync nem sessão iniciada',
    ressalva: 'LCP observado até 1 s após prontidão; bloqueioLongTasksMs NÃO equivale ao TBT do Lighthouse',
    resumo, amostras: medidas
  };
  const destino = process.env.CT_MEDICAO || 'work/abertura-medicao.json';
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado, null, 2));
  if (resumo.invalidas) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => srv.close(resolve));
}
