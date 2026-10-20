// Diagnóstico sintético serial; Lighthouse é ferramenta externa, não dependência do app.
// CT_LIGHTHOUSE_ROOT aponta para node_modules que contém lighthouse e chrome-launcher.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { iniciarServidor } from './_infra.mjs';
import { mediana } from './metricas-abertura.mjs';

const require = createRequire(import.meta.url);
const resolver = nome => require.resolve(nome, { paths: [process.env.CT_LIGHTHOUSE_ROOT || process.cwd()] });
const { default: lighthouse } = await import(pathToFileURL(resolver('lighthouse')).href);
const { launch } = await import(pathToFileURL(resolver('chrome-launcher')).href);
const quantidade = Number(process.env.CT_MEDICAO_AMOSTRAS || 3);
const porta = Number(process.env.CT_PORT || 8139);
if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) throw new Error('Quantidade inválida');
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error('Porta inválida');
const destino = process.env.CT_MEDICAO_DIR || 'work/lighthouse';
fs.mkdirSync(destino, { recursive: true });
const { srv, url } = await iniciarServidor(path.resolve('.'), porta);
// Chrome procura /favicon.ico mesmo sem <link rel=icon>. No servidor sintético,
// use o ícone real já embarcado; não aceite um 404 como carga completa.
const servir = srv.listeners('request')[0];
srv.removeAllListeners('request');
srv.on('request', (req, res) => {
  if (req.url === '/favicon.ico') req.url = '/public/icon-180.png';
  servir(req, res);
});
const amostras = [];
try {
  for (let rodada = 1; rodada <= quantidade; rodada++) {
    // Perfil descartável do chrome-launcher: nenhum dado do Chrome pessoal é usado.
    const chrome = await launch({ chromePath: process.env.CT_CHROME,
      chromeFlags: ['--headless=new', '--no-first-run', '--disable-background-networking'] });
    try {
      const resultado = await lighthouse(url + '/public/index.html', {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyAudits: ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
          'cumulative-layout-shift', 'network-requests', 'mainthread-work-breakdown', 'bootup-time', 'errors-in-console'],
        formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
        throttlingMethod: 'devtools', throttling: { requestLatencyMs: 150,
          downloadThroughputKbps: 1600, uploadThroughputKbps: 750, cpuSlowdownMultiplier: 4 },
        maxWaitForLoad: 90000, maxWaitForFcp: 60000,
        blockedUrlPatterns: ['*supabase.co/*', '*googleapis.com/*', '*unpkg.com/*', '*jsdelivr.net/*']
      });
      const { lhr, artifacts } = resultado;
      fs.writeFileSync(path.join(destino, rodada + '.lhr.json'), JSON.stringify(lhr, null, 2));
      fs.writeFileSync(path.join(destino, rodada + '.trace.json'), JSON.stringify(artifacts.Trace));
      fs.writeFileSync(path.join(destino, rodada + '.devtools.json'), JSON.stringify(artifacts.DevtoolsLog));
      const recursos = lhr.audits['network-requests']?.details?.items || [];
      const falhos = recursos.filter(r => r.url.startsWith(url + '/') &&
        ((r.statusCode >= 400) || r.statusCode < 200 || r.failed || !r.finished));
      const mensagens = lhr.audits['errors-in-console']?.details?.items || [];
      // O parser HTML vê SVGs do template antes de o dc-runtime resolver {{ }}.
      // Preserve esses avisos no relatório; exceções JS e outros erros continuam inválidos.
      const avisosTemplate = mensagens.filter(e => e.source === 'rendering' &&
        /<path> attribute d: Expected moveto.*\{\{/.test(e.description));
      const erros = mensagens.filter(e => !avisosTemplate.includes(e));
      const metricas = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint',
        'total-blocking-time', 'cumulative-layout-shift'].map(k => [k, lhr.audits[k]?.numericValue ?? null]));
      const falhas = [];
      if (lhr.runtimeError) falhas.push(lhr.runtimeError.code);
      if (falhos.length) falhas.push('recurso_local_falhou');
      if (erros.length) falhas.push('erro_console');
      for (const [nome, valor] of Object.entries(metricas)) {
        if (!Number.isFinite(valor) || valor < 0 ||
          (nome.endsWith('contentful-paint') && valor === 0)) falhas.push(nome + '_ausente');
      }
      if (!recursos.some(r => /\/fonts\/.*\.woff2/.test(r.url) && r.statusCode === 200)) falhas.push('fontes_ausentes');
      amostras.push({ rodada, versao: lhr.lighthouseVersion, navegador: lhr.environment,
        perfil: lhr.configSettings, metricas, bytes: recursos.reduce((s, r) => s + (r.transferSize || 0), 0),
        falhas, caminhosFalhos: falhos.map(r => new URL(r.url).pathname), erros, avisosTemplate });
      console.log(JSON.stringify({ rodada, metricas, falhas }));
    } finally { await chrome.kill(); }
  }
  const boas = amostras.filter(a => !a.falhas.length);
  const resumo = { total: amostras.length, validas: boas.length, invalidas: amostras.length - boas.length,
    medianas: Object.fromEntries(Object.keys(amostras[0].metricas).map(k => [k, mediana(boas.map(a => a.metricas[k]))])) };
  fs.writeFileSync(path.join(destino, 'resumo.json'), JSON.stringify({ resumo, amostras }, null, 2));
  console.log(JSON.stringify(resumo));
  if (resumo.invalidas) process.exitCode = 1;
} finally { await new Promise(resolve => srv.close(resolve)); }
