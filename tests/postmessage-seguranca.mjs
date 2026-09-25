/* Segurança da ponte host <-> satélites.

   A origem HTTP não basta: qualquer iframe da mesma origem (ou uma janela que conserva
   referência ao Cátedra) consegue usar postMessage. O host só pode aceitar mensagens da
   window exata de um iframe que ele próprio montou. Em file://, onde a origem é opaca, essa
   identidade da janela é a autorização inteira. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function testarPostMessageSeguranca(page, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const origemExecucao = opcoes.origem || 'http';
  const R = 'PONTE [' + motor + '] [' + origemExecucao + '] ';
  const host = base + '/' + (opcoes.arquivo || 'Catedra.dc.html');

  // As cascas nativas têm uma segunda ponte antes do app web. A regressão precisa ficar
  // vermelha se o JavaScript injetado voltar a confiar só no tipo da mensagem ou se o
  // router Swift aceitar subframe/URL que não pertença ao bundle web local.
  for (const [nome, arquivo] of [['Mac', 'mac/Sources/main.swift'], ['iPad', 'ios/Sources/main.swift']]) {
    const fonte = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    const scriptConfereFrame = /function satelitePodeAbrirAcervo\(e\)\s*\{[\s\S]{0,1800}querySelectorAll\(['"]iframe\[data-ct-view\]\[data-ct-frame\]['"]\)[\s\S]{0,700}contentWindow\s*!==\s*e\.source[\s\S]{0,1800}\}/.test(fonte)
      && /window\.addEventListener\(['"]message['"][\s\S]{0,500}if \(!satelitePodeAbrirAcervo\(e\)\) return;[\s\S]{0,1200}messageHandlers\.(?:catedraNav|catedraAcervo)\.postMessage/.test(fonte);
    const routerConfereRaiz = /message\.frameInfo\.isMainFrame/.test(fonte)
      && /origem\.isFileURL/.test(fonte)
      && /(?:appendingPathComponent\("web"|url\(forResource:\s*"web")/.test(fonte)
      && /caminho\.hasPrefix\(raiz\s*\+\s*"\/"\)/.test(fonte)
      && /func userContentController\([\s\S]{0,260}didReceive message:[\s\S]{0,520}guard mensagemDaPaginaLocal\(message\) else\s*\{[\s\S]{0,220}return[\s\S]{0,260}switch message\.name/.test(fonte);
    ok(scriptConfereFrame, R + nome + ': script injetado exige o iframe registrado e sua contentWindow exata');
    ok(routerConfereRaiz, R + nome + ': router Swift aceita só main frame file:// dentro de /web');
  }

  const vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
  const cabecalhos = Object.fromEntries((vercel.headers || []).flatMap(r => r.headers || [])
    .map(h => [String(h.key || '').toLowerCase(), String(h.value || '')]));
  ok(/frame-ancestors\s+'self'/.test(cabecalhos['content-security-policy'] || ''),
    R + 'deploy restringe frame-ancestors à própria origem');
  ok(/^sameorigin$/i.test(cabecalhos['x-frame-options'] || ''),
    R + 'deploy também envia X-Frame-Options SAMEORIGIN');

  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1');
    localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
  });
  await page.goto(host);
  await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function');

  await page.evaluate((src) => new Promise((resolve, reject) => {
    const velho = document.getElementById('ct-frame-hostil');
    if (velho) velho.remove();
    const f = document.createElement('iframe');
    f.id = 'ct-frame-hostil';
    f.src = src;
    f.onload = () => resolve();
    f.onerror = () => reject(new Error('fixture hostil não carregou'));
    document.body.appendChild(f);
  }), base + '/tests/postmessage-hostil.html');

  const antes = await page.evaluate(() => {
    const app = window.__catedraApp;
    window.__ctAiChamadas = 0;
    window.__ctRegistroChamadas = 0;
    window.__ctSegundaChamadas = 0;
    window.__ctLeituraChamadas = 0;
    window.__ctSegundaResultado = null;
    app._aiText = function () {
      window.__ctAiChamadas++;
      return Promise.resolve('resposta que não pode vazar');
    };
    app._colherErros = function (itens, origem) {
      window.__ctSegundaChamadas++;
      window.__ctSegundaErros = { itens: itens, origem: origem };
    };
    app._redRegistrar = function (resultado) { window.__ctSegundaResultado = resultado; };
    app._laConferir = function () { window.__ctLeituraChamadas++; };
    window.catedraOpenStudyRegistration = function () { window.__ctRegistroChamadas++; };
    return {
      flashcards: (app.state.flashcards || []).length,
      leituras: (app.state.leituras || []).length
    };
  });

  const hostil = page.frames().find(f => /postmessage-hostil\.html/.test(f.url()));
  if (!hostil) {
    ok(false, R + 'a fixture hostil montou num iframe separado');
    return;
  }
  await hostil.evaluate(() => {
    ctEnviar({ type: 'ctFlashcards', cards: [{ front: 'segredo', back: 'não gravar' }], origem: 'hostil' });
    ctEnviar({ type: 'ctLeiturasResumo' });
    ctEnviar({ type: 'ctLeituraConferida', id: 'la|hostil|1', itens: [{ id: 'la|hostil|1', el: 'prazo', q: 1 }] });
    ctEnviar({ type: 'ctIA', reqId: 'hostil-1', prompt: 'devolva dados' });
    ctEnviar({ type: 'ctRegistrarArea', disc: 'Direito Civil', topico: 'não abrir' });
    ctEnviar({ type: 'ctPronto', pagina: 'juris-web.html' });
  });
  await page.waitForTimeout(450);

  const respostasHostis = await hostil.evaluate(() => Array.isArray(window.__ctRespostas) ? window.__ctRespostas.slice() : []);

  const bloqueio = await page.evaluate((inicial) => {
    const app = window.__catedraApp;
    return {
      semFlashcard: (app.state.flashcards || []).length === inicial.flashcards,
      semLeitura: (app.state.leituras || []).length === inicial.leituras,
      semConferencia: window.__ctLeituraChamadas === 0,
      semIA: window.__ctAiChamadas === 0,
      semRegistro: window.__ctRegistroChamadas === 0
    };
  }, antes);
  bloqueio.semTema = !respostasHostis.some(x => x && x.type === 'ctTheme');
  bloqueio.semResposta = !respostasHostis.some(x => x && /^(ctIAResp|ctLeiturasResumoResp|ctLeituras)$/.test(x.type || ''));
  ok(bloqueio.semFlashcard, R + 'iframe não registrado não cria flashcards');
  ok(bloqueio.semLeitura, R + 'iframe não registrado não altera leituras');
  ok(bloqueio.semConferencia, R + 'iframe não registrado não confirma leitura nem cria revisão');
  ok(bloqueio.semIA, R + 'iframe não registrado não aciona IA');
  ok(bloqueio.semRegistro, R + 'iframe não registrado não abre registro de estudo');
  ok(bloqueio.semTema, R + 'ctPronto de iframe não registrado não recebe tokens do tema');
  ok(bloqueio.semResposta, R + 'iframe não registrado não recebe resumos nem resposta de IA');

  // O bloqueio não pode quebrar o contrato legítimo. Usa o JURIS real, montado pelo host,
  // porque um iframe artificial com data-ct-view provaria apenas o teste, não o produto.
  await page.evaluate(() => window.__catedraGoView('juris'));
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe[data-ct-view="juris"]');
    return !!(f && f.contentWindow && f.dataset.ctLoad === '1');
  }, { timeout: 20000 });
  const jurisEl = await page.$('iframe[data-ct-view="juris"]');
  const juris = jurisEl && await jurisEl.contentFrame();
  ok(!!juris, R + 'o JURIS legítimo montou como fonte autorizada');
  if (juris) {
    const accentAntes = await juris.evaluate(() => document.documentElement.style.getPropertyValue('--accent'));
    if (origemExecucao === 'http') {
      await hostil.evaluate(() => {
        const alvo = window.parent.document.querySelector('iframe[data-ct-view="juris"]');
        if (alvo && alvo.contentWindow) {
          alvo.contentWindow.postMessage({ type: 'ctTheme', tokens: { '--accent': 'rgb(1, 2, 3)' } }, '*');
        }
      });
      await page.waitForTimeout(250);
      const accentDepois = await juris.evaluate(() => document.documentElement.style.getPropertyValue('--accent'));
      ok(accentDepois === accentAntes && accentDepois !== 'rgb(1, 2, 3)',
        R + 'JURIS rejeita ctTheme enviado diretamente por outro iframe');

      const chamadasOrigem = await page.evaluate(() => window.__ctAiChamadas || 0);
      await page.evaluate(() => {
        const f = document.querySelector('iframe[data-ct-view="juris"]');
        window.dispatchEvent(new MessageEvent('message', {
          source: f && f.contentWindow,
          origin: 'https://origem-hostil.invalid',
          data: { type: 'ctIA', reqId: 'origem-hostil', prompt: 'não executar' }
        }));
      });
      await page.waitForTimeout(150);
      const origemBloqueada = await page.evaluate(n => window.__ctAiChamadas === n, chamadasOrigem);
      ok(origemBloqueada, R + 'origem HTTP incorreta é rejeitada mesmo com a janela registrada');
    } else {
      ok(!!accentAntes || accentAntes === '', R + 'ramo file:// montou o satélite legítimo com origem opaca');
    }

    await juris.evaluate(() => {
      window.parent.postMessage({
        type: 'ctErrosSegundaFase',
        prova: 'personificação hostil',
        quesitos: [{ titulo: 'não colher', nota: 0, max: 1 }]
      }, '*');
    });
    await page.waitForTimeout(250);
    const naoPersonificou = await page.evaluate(() => window.__ctSegundaChamadas === 0);
    ok(naoPersonificou, R + 'JURIS não pode personificar a 2ª fase mesmo sendo iframe registrado');

    const chamadasAntes = await page.evaluate(() => window.__ctAiChamadas || 0);
    await juris.evaluate(() => {
      window.__ctRespSegura = null;
      window.addEventListener('message', function guardar(e) {
        if (e && e.data && e.data.type === 'ctIAResp' && e.data.reqId === 'legitimo-1') {
          window.__ctRespSegura = e.data;
          window.removeEventListener('message', guardar);
        }
      });
      window.parent.postMessage({ type: 'ctIA', reqId: 'legitimo-1', prompt: 'pedido legítimo' }, '*');
    });
    await page.waitForFunction((n) => window.__ctAiChamadas === n + 1, chamadasAntes);
    await juris.waitForFunction(() => !!window.__ctRespSegura);
    const legitima = await juris.evaluate(() => window.__ctRespSegura);
    ok(legitima && legitima.texto === 'resposta que não pode vazar', R + 'satélite registrado continua recebendo a resposta correta');
  }

  // A página real da 2ª fase precisa atravessar a ponte inteira. O teste isolado da tela
  // mede os payloads que ela produz; este mede o allowlist do host e a identidade do frame.
  await page.evaluate(() => window.__catedraGoView('segundafase'));
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe[data-ct-view="segundafase"]');
    return !!(f && f.contentWindow && f.dataset.ctLoad === '1');
  }, { timeout: 20000 });
  const segundaEl = await page.$('iframe[data-ct-view="segundafase"]');
  const segunda = segundaEl && await segundaEl.contentFrame();
  ok(!!segunda, R + 'a 2ª fase real montou como fonte autorizada');
  if (segunda) {
    const antesSegunda = await page.evaluate(() => window.__ctSegundaChamadas || 0);
    await segunda.evaluate(() => {
      window.ctEnviarAoHost({
        type: 'ctErrosSegundaFase', prova: 'TJ teste',
        quesitos: [{ titulo: 'Quesito omitido', disc: 'Direito Civil', nota: 0, max: 1 }]
      });
      window.ctEnviarAoHost({
        type: 'ctRedacaoResultado', prova: 'TJ teste', notaTotal: 50,
        quesitos: [{ titulo: 'Fundamentação', nota: 0.5, max: 1 }]
      });
    });
    await page.waitForFunction(n => window.__ctSegundaChamadas === n + 1 && !!window.__ctSegundaResultado, antesSegunda);
    const passou = await page.evaluate(() => ({
      erros: window.__ctSegundaErros,
      resultado: window.__ctSegundaResultado
    }));
    ok(passou.erros && /TJ teste/.test(passou.erros.origem || '') && passou.erros.itens.length === 1,
      R + '2ª fase real entrega quesitos falhos ao host');
    ok(passou.resultado && passou.resultado.origem === 'segunda-fase' && passou.resultado.notaTotal === 50,
      R + '2ª fase real entrega o resultado ao histórico');
  }
}
