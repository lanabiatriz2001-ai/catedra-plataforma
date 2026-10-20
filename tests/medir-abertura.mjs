// Mission 002 — diagnóstico, não gate de desempenho nem telemetria de usuários.
// Executa cargas frias em contextos novos, sem login nem dados pessoais.
import fs from 'node:fs';
import path from 'node:path';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { bloqueioLongTasks, resumoAmostras } from './metricas-abertura.mjs';

const raiz = path.resolve('.');
const porta = Number(process.env.CT_PORT || 8138);
const quantidade = Number(process.env.CT_MEDICAO_AMOSTRAS || 3);
const limiteMs = Number(process.env.CT_MEDICAO_TIMEOUT_MS || 90000);
const traceDir = process.env.CT_TRACE_DIR && path.resolve(process.env.CT_TRACE_DIR);
const execucao = Date.now() + '-' + process.pid;
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error('CT_PORT inválida');
if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) throw new Error('CT_MEDICAO_AMOSTRAS deve ser inteiro de 1 a 10');
if (!Number.isInteger(limiteMs) || limiteMs < 5000 || limiteMs > 300000) throw new Error('CT_MEDICAO_TIMEOUT_MS deve ser inteiro de 5000 a 300000');
if (process.env.CT_REDE === 'livre') throw new Error('Medição exige a infraestrutura sem rede: remova CT_REDE=livre');

async function comPrazo(promise, ms) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, rejeitar) => {
      timer = setTimeout(() => { const e = new Error('Limite de coleta'); e.name = 'TimeoutError'; rejeitar(e); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}

async function salvarTrace(cdp, destino) {
  const completo = comPrazo(new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve)), 10000);
  // A promessa já possui tratador caso o comando falhe antes do evento.
  completo.catch(() => {});
  await cdp.send('Tracing.end');
  const { stream } = await completo;
  if (!stream) throw new Error('Chrome não devolveu o trace');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const fd = fs.openSync(destino, 'w');
  try {
    let eof = false;
    while (!eof) {
      const bloco = await comPrazo(cdp.send('IO.read', { handle: stream }), 10000);
      fs.writeSync(fd, Buffer.from(bloco.data, bloco.base64Encoded ? 'base64' : 'utf8'));
      eof = bloco.eof;
    }
  } finally {
    fs.closeSync(fd);
    await cdp.send('IO.close', { handle: stream });
  }
}

const { srv, url } = await iniciarServidor(raiz, porta);
let browser;
try {
  const lancado = await lancarNavegador();
  browser = lancado.browser;
  const motor = lancado.motor;
  if (traceDir && motor !== 'chromium') throw new Error('CT_TRACE_DIR exige Chrome/Chromium CDP');
  const amostras = [];
  for (let i = 0; i < quantidade; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    // Mesma política de tests/rede-externa.mjs para o artefato publicado: a rota mais
    // recente aborta TUDO fora da origem, inclusive o fallback de CDN servido pelo harness.
    const externos = [];
    await ctx.route(u => /^https?:|^wss?:/.test(u.protocol) && u.origin !== url, rota => {
      externos.push({ host: new URL(rota.request().url()).host, tipo: rota.request().resourceType() });
      return rota.abort('blockedbyclient');
    });
    const page = await ctx.newPage();
    let errosDePagina = 0, ultimaAtividadeLocal = Date.now();
    const pedidos = new Map(), pendentes = new Set(), falhos = new Set();
    page.on('pageerror', () => { errosDePagina++; });
    const local = request => { try { return new URL(request.url()).origin === url; } catch (_) { return false; } };
    const concluir = request => {
      if (!local(request)) return;
      pendentes.delete(request);
      ultimaAtividadeLocal = Date.now();
      const pedido = pedidos.get(request);
      if (pedido) pedido.tempos = request.timing();
    };
    ctx.on('request', request => {
      if (!local(request)) return;
      pendentes.add(request);
      ultimaAtividadeLocal = Date.now();
      pedidos.set(request, { caminho: new URL(request.url()).pathname, tipo: request.resourceType(), estado: 'pendente' });
    });
    ctx.on('requestfinished', request => {
      concluir(request);
      const pedido = pedidos.get(request);
      if (pedido && pedido.estado === 'pendente') pedido.estado = 'completo';
    });
    ctx.on('requestfailed', request => {
      concluir(request);
      if (!local(request)) return;
      falhos.add(request);
      Object.assign(pedidos.get(request), { estado: 'falhou', falha: request.failure()?.errorText || 'requestfailed' });
    });
    ctx.on('response', response => {
      const request = response.request();
      const pedido = pedidos.get(request);
      if (pedido) pedido.status = response.status();
      if (local(request) && response.status() >= 400) {
        falhos.add(request);
        if (pedido) pedido.estado = 'falhou';
      }
    });
    let cdp, traceIniciado = false, erroTrace = null, traceArquivo = null;
    try {
      await page.addInitScript(() => {
        const tipos = PerformanceObserver.supportedEntryTypes || [];
        window.__ctDiagnostico = { lcp: null, lcpElemento: null, tarefas: [],
          capacidades: { lcp: tipos.includes('largest-contentful-paint'), longtask: tipos.includes('longtask') } };
        performance.setResourceTimingBufferSize(5000);
        try { new PerformanceObserver(lista => {
          const entradas = lista.getEntries();
          if (!entradas.length) return;
          const e = entradas[entradas.length - 1], el = e.element;
          window.__ctDiagnostico.lcp = e.startTime;
          // Contexto novo e sintético: nunca reutiliza perfil ou sessão da pessoa.
          window.__ctDiagnostico.lcpElemento = el ? { tag: el.tagName.toLowerCase(), id: el.id,
            classe: el.getAttribute('class') || '', texto: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100) } : null;
        }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (_) {}
        try { new PerformanceObserver(lista => {
          for (const e of lista.getEntries()) window.__ctDiagnostico.tarefas.push({ inicio: e.startTime, duracao: e.duration });
        }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
      });
      if (motor === 'chromium') {
        cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        if (traceDir) {
          await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,loading,v8', transferMode: 'ReturnAsStream' });
          traceIniciado = true;
        }
      }
      let timeout = false, erroColeta = null, fase = 'navegacao';
      const prazo = Date.now() + limiteMs;
      const restante = () => Math.max(1, prazo - Date.now());
      try {
        await page.goto(url + '/public/index.html', { waitUntil: 'domcontentloaded', timeout: restante() });
        fase = 'conteudo';
        await page.waitForFunction(() => !!document.querySelector('#ct-main') && !document.querySelector('#ct-carregamento'),
          {}, { timeout: restante() });
        fase = 'fontes_e_recursos';
        await comPrazo(page.evaluate(() => {
          window.__ctDiagnostico.fontesResolvidas = false;
          document.fonts.ready.then(() => { window.__ctDiagnostico.fontesResolvidas = true; });
        }), restante());
        const inicioEspera = Date.now();
        while (true) {
          if (Date.now() >= prazo) { const e = new Error('Recursos não concluíram'); e.name = 'TimeoutError'; throw e; }
          const fontesProntas = await comPrazo(page.evaluate(() => document.fonts.status === 'loaded'
            && window.__ctDiagnostico.fontesResolvidas), restante());
          if (fontesProntas && !pendentes.size && Date.now() - Math.max(inicioEspera, ultimaAtividadeLocal) >= 1000) break;
          await page.waitForTimeout(Math.min(100, restante()));
        }
        fase = 'concluida';
      } catch (e) {
        timeout = e.name === 'TimeoutError';
        erroColeta = { fase, nome: e.name || 'Error' };
      }
      const valores = await comPrazo(page.evaluate(() => {
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find(e => e.name === 'first-contentful-paint')?.startTime ?? null;
        const nav = performance.getEntriesByType('navigation')[0];
        const abre = window.CT_ABERTURA_METRICAS;
        const tempos = e => ({ inicioMs: e.startTime, fimMs: e.responseEnd, duracaoMs: e.duration,
          dnsInicioMs: e.domainLookupStart, dnsFimMs: e.domainLookupEnd,
          conexaoInicioMs: e.connectStart, conexaoFimMs: e.connectEnd,
          pedidoMs: e.requestStart, respostaMs: e.responseStart,
          bytes: e.transferSize, bytesComprimidos: e.encodedBodySize, bytesDescomprimidos: e.decodedBodySize });
        const recursos = performance.getEntriesByType('resource')
          .filter(e => new URL(e.name).origin === location.origin)
          .map(e => ({ caminho: new URL(e.name).pathname, tipo: e.initiatorType, ...tempos(e) }));
        const fontes = [...document.fonts].map(f => ({ familia: f.family, peso: f.weight, estilo: f.style, estado: f.status }));
        return {
          mainPronto: !!document.querySelector('#ct-main'),
          casCaPresente: !!document.querySelector('#ct-carregamento'),
          cargaCssEsperada: !!window.CT_CSS_ESPERADO,
          cargaCssPronta: !!window.CT_CSS_PRONTO,
          prontidaoMs: abre?.duracao ?? null,
          prontidaoNavegacaoMs: abre?.pronto ?? null,
          fcpMs: fcp,
          lcpMs: window.__ctDiagnostico?.lcp ?? null,
          lcpElemento: window.__ctDiagnostico?.lcpElemento ?? null,
          domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
          tarefas: window.__ctDiagnostico?.tarefas ?? [],
          capacidades: window.__ctDiagnostico?.capacidades ?? {},
          fontesProntas: document.fonts.status === 'loaded' && window.__ctDiagnostico?.fontesResolvidas === true,
          fontesFalhas: fontes.filter(f => f.estado === 'error').length,
          fontes, navegacao: nav ? { caminho: new URL(nav.name).pathname, ...tempos(nav) } : null,
          gateDeLoginPresente: !!document.getElementById('catedra-auth-gate'),
          fimObservacaoMs: performance.now(), recursos
        };
      }), 5000).catch(e => {
        if (e.name === 'TimeoutError') timeout = true;
        erroColeta = { fase: 'diagnostico', nome: e.name || 'Error' };
        return { mainPronto: false, casCaPresente: true, prontidaoMs: null, tarefas: [], recursos: [] };
      });
      if (traceIniciado) {
        const destino = path.join(traceDir, execucao + '-amostra-' + String(i + 1).padStart(2, '0') + '.trace.json');
        try { await salvarTrace(cdp, destino); traceArquivo = path.relative(raiz, destino); }
        catch (e) { erroTrace = { nome: e.name || 'Error' }; }
        traceIniciado = false;
      }
      const { tarefas, ...resto } = valores;
      amostras.push({
        rodada: i + 1, ...resto,
        bloqueioLongTasksMs: valores.capacidades?.longtask ? bloqueioLongTasks(tarefas, valores.fcpMs, valores.prontidaoNavegacaoMs) : null,
        errosDePagina, recursosLocaisFalhos: falhos.size, recursosLocaisPendentes: pendentes.size,
        caminhosFalhos: [...new Set([...falhos].map(r => new URL(r.url()).pathname))],
        caminhosPendentes: [...new Set([...pendentes].map(r => new URL(r.url()).pathname))],
        pedidosLocais: [...pedidos.values()], externosBloqueados: externos,
        timeout, fase, erroColeta, traceArquivo, erroTrace
      });
    } finally { await ctx.close(); }
  }
  const { resumo, amostras: medidas } = resumoAmostras(amostras);
  const resultado = {
    versao: 3, motor, limiteMs,
    perfil: motor === 'chromium' ? '390×844; Chrome CDP 150 ms, 1,6 Mbps, CPU ×4; contextos frios' :
      '390×844; WebKit sem emulação CDP; contextos frios',
    definicao: 'Contexto virgem sintético, sem login: #ct-main presente atrás do portão de autenticação e casca removida. prontidaoMs parte do início da casca; prontidaoNavegacaoMs parte de performance.timeOrigin.',
    ressalva: 'LCP observado até fontes concluídas e 1 s sem pedidos locais, dentro do limite. bloqueioLongTasksMs usa FCP até prontidaoNavegacaoMs e NÃO equivale ao TBT do Lighthouse. Timings de pedidosLocais são os do Playwright; tempos dos recursos são relativos à navegação.',
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
