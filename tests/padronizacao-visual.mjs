export async function testarPadronizacaoVisual(page, base, ok, { motor = 'browser', origem = 'http' } = {}) {
  await page.goto(base + '/Catedra.dc.html');
  await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 30000 });

  const host = await page.evaluate(async () => {
    const area = document.createElement('div');
    area.id = 'pv-area';
    const raizTematizada = Array.from(document.getElementById('dc-root').querySelectorAll('*'))
      .find(el => getComputedStyle(el).getPropertyValue('--accent'));
    area.style.setProperty('--accent', getComputedStyle(raizTematizada).getPropertyValue('--accent'));
    area.innerHTML = '<button id="pv-foco" class="ct-btn" tabindex="1">Continuar</button>'
      + '<button id="pv-ocupado" class="ct-btn" aria-busy="true">Salvando</button>'
      + '<button id="pv-desabilitado" class="ct-btn-2" disabled>Indisponível</button>'
      + '<div id="pv-carregando" class="ct-estado ct-estado-carregando" role="status">'
      + '<div class="ct-estado-titulo">Carregando</div><div class="ct-estado-desc">Aguarde.</div></div>';
    document.body.appendChild(area);
    const ocupado = document.getElementById('pv-ocupado');
    const desabilitado = document.getElementById('pv-desabilitado');
    const estado = document.getElementById('pv-carregando');
    const giro = getComputedStyle(ocupado, '::before');
    const estadoGiro = getComputedStyle(estado, '::before');
    const fonte = await fetch(baseURI()).then(r => r.text());
    function baseURI(){ return location.href; }
    const resultado = {
      ocupadoTemIndicador: giro.content !== 'none' && parseFloat(giro.width) >= 14,
      ocupadoBloqueiaClique: getComputedStyle(ocupado).pointerEvents === 'none',
      desabilitadoDistinto: getComputedStyle(desabilitado).pointerEvents === 'none'
        && parseFloat(getComputedStyle(desabilitado).opacity) < 1,
      estadoTemIndicador: estadoGiro.content !== 'none' && parseFloat(estadoGiro.width) >= 20,
      templateUsaBusy: /aria-busy="\{\{ edAiBusy \}\}"/.test(fonte)
        && /aria-busy="\{\{ redBusy \}\}"/.test(fonte)
        && /aria-busy="\{\{ bancaIABusy \}\}"/.test(fonte),
      adminExplicaEspera: /Carregando o console/.test(fonte) && /role="status"/.test(fonte)
    };
    return resultado;
  });
  for (const [nome, valor] of Object.entries(host)) ok(valor, `VISUAL [${motor}] [${origem}] host ${nome}`);

  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Tab');
  const focoVisivel = await page.evaluate(() => {
    const botao = document.getElementById('pv-foco');
    const estilo = getComputedStyle(botao);
    const resultado = document.activeElement === botao
      && estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) >= 2;
    document.getElementById('pv-area').remove();
    return resultado;
  });
  ok(focoVisivel, `VISUAL [${motor}] [${origem}] host focoVisivel`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const semMovimento = await page.evaluate(() => {
    const b = document.createElement('button'); b.className = 'ct-btn'; b.setAttribute('aria-busy', 'true');
    document.body.appendChild(b); const anim = getComputedStyle(b, '::before').animationName; b.remove(); return anim === 'none';
  });
  ok(semMovimento, `VISUAL [${motor}] [${origem}] ocupado respeita movimento reduzido`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto(base + '/legis-web.html');
  const satelite = await page.evaluate(() => {
    const estado = document.createElement('div');
    estado.className = 'ct-estado ct-estado-carregando';
    estado.innerHTML = '<div class="ct-estado-titulo">Carregando</div><div class="ct-estado-desc">Aguarde.</div>';
    document.body.appendChild(estado);
    const botao = document.createElement('button'); botao.className = 'ct-btn'; botao.setAttribute('aria-busy', 'true'); botao.textContent = 'Abrindo'; document.body.appendChild(botao);
    const r = {
      estadoCompartilhado: getComputedStyle(estado).display === 'flex' && getComputedStyle(estado).borderStyle === 'solid',
      indicadorCompartilhado: getComputedStyle(estado, '::before').content !== 'none',
      botaoCompartilhado: getComputedStyle(botao).pointerEvents === 'none' && getComputedStyle(botao, '::before').content !== 'none'
    };
    estado.remove(); botao.remove(); return r;
  });
  for (const [nome, valor] of Object.entries(satelite)) ok(valor, `VISUAL [${motor}] [${origem}] satélite ${nome}`);
}
