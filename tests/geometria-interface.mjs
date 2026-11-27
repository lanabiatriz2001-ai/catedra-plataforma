// Medidas de elementos pintados. Um erro de até um pixel CSS acomoda as frações de coluna nos dois motores.
import { abrirComponenteDoLeitor } from './_sessao-leitores.mjs';

const perto = (a, b) => Math.abs(a - b) <= 1;

async function conferirEntrada(pagina, base, ok) {
  await pagina.goto(base + '/tests/auth-gate-fixture.html');
  await pagina.locator('#cts').waitFor();
  for (const [width, height] of [[390, 740], [1440, 900], [760, 340]]) {
    await pagina.setViewportSize({ width, height });
    const medidas = await pagina.evaluate(() => {
      const caixa = seletor => document.querySelector(seletor).getBoundingClientRect();
      const senha = document.querySelector('#ctp');
      const olho = caixa('[data-olho]');
      const campos = ['#cte', '#ctp', '#cts', '#ctmagic'].map(caixa);
      return {
        alturas: campos.map(r => r.height), esquerdas: campos.map(r => r.left), direitas: campos.map(r => r.right),
        textoAte: senha.getBoundingClientRect().right - parseFloat(getComputedStyle(senha).paddingRight),
        inicioDoOlho: olho.left, titulo: caixa('#catedra-auth-gate h2').top,
        capa: caixa('#catedra-auth-gate .ct-hero').width
      };
    });
    const mesmoValor = valores => valores.every(v => perto(v, valores[0]));
    ok(mesmoValor(medidas.esquerdas) && mesmoValor(medidas.direitas) &&
      mesmoValor(medidas.alturas) && medidas.alturas[0] >= 44,
      'GEOMETRIA entrada ' + width + ': os campos e as ações ocupam a mesma coluna e altura (' + medidas.alturas.join('/') + ')');
    ok(medidas.textoAte <= medidas.inicioDoOlho && medidas.titulo >= 0,
      'GEOMETRIA entrada ' + width + ': o título e a área de digitação ficam livres');
    ok((medidas.capa > 0) === (width > 760), 'GEOMETRIA entrada ' + width + ': o painel de apresentação acompanha a janela');
  }
  // Com pouco espaço a ação por e-mail quebra em duas linhas até nas fontes mais estreitas.
  // A altura mínima continua alinhada e pode crescer quando o texto precisa de mais linhas.
  const duasLinhas = await pagina.locator('#ctmagic').evaluate(acao => {
    acao.style.maxWidth = '15rem';
    const texto = Array.from(acao.childNodes).find(no => no.nodeType === Node.TEXT_NODE && no.textContent.trim());
    const faixa = document.createRange();
    faixa.selectNodeContents(texto);
    return { linhas: faixa.getClientRects().length, altura: acao.getBoundingClientRect().height,
      alturaEntrar: document.getElementById('cts').getBoundingClientRect().height };
  });
  ok(duasLinhas.linhas === 2 && perto(duasLinhas.altura, duasLinhas.alturaEntrar),
    'GEOMETRIA entrada: a ação de e-mail em duas linhas mantém a altura de Entrar (' + duasLinhas.altura + ')');
}

async function conferirPaginas(pagina, base, width, margem, ok) {
  await pagina.goto(base + '/__semente');
  await pagina.evaluate(() => {
    localStorage.setItem('catedra:auth', '1');
    localStorage.setItem('catedra:onboarded', '1');
  });
  await pagina.goto(base + '/Catedra.dc.html');
  await pagina.waitForFunction(() => window.__catedraApp);
  await pagina.evaluate(() => {
    const app = window.__catedraApp;
    app.setState({ cycleMode: 'magistratura', prefs: { ...app.state.prefs, fontScale: 'grande' } });
  });
  const resumos = ['revisoes', 'calendario', 'edital', 'flashcards', 'analise'];
  const telas = ['inicio', 'ciclo', ...resumos, 'ajustes', 'prioridade'];
  if (width === 1024) telas.push('simulados', 'historico', 'redacao', 'oral', 'bancas', 'bemestar', 'conquistas', 'comunidade');
  const largurasResumo = [];
  for (const tela of telas) {
    await pagina.evaluate(v => window.__catedraGoView(v), tela);
    const painel = pagina.locator('.ct-scroll[data-design-view="' + tela + '"]');
    await painel.waitFor();
    const medidas = await painel.evaluate((el, tela) => {
      const pagina = el.firstElementChild.getBoundingClientRect();
      const barra = document.querySelector('.ct-topbar');
      const r = barra.getBoundingClientRect(), css = getComputedStyle(barra);
      const esquerda = r.left + parseFloat(css.paddingLeft);
      const direita = r.right - parseFloat(css.paddingRight);
      const seletores = { inicio: '.cth-bancada', ciclo: '.cm', prioridade: 'iframe[data-ct-view="prioridade"]' };
      const conteudo = el.querySelector(seletores[tela] || '.ct-design-hero');
      const caixa = conteudo?.getBoundingClientRect();
      return { recuo: esquerda - r.left, esquerda, direita, pagina: [pagina.left, pagina.right],
        conteudo: caixa ? [caixa.left, caixa.right] : null, rolagem: el.scrollWidth - el.clientWidth };
    }, tela);
    const eixo = ([a,b]) => perto(a, medidas.esquerda) && perto(b, medidas.direita);
    ok(perto(medidas.recuo, margem) && eixo(medidas.pagina) && medidas.rolagem <= 1,
      'GEOMETRIA ' + tela + ' a ' + width + ': a página acompanha os eixos da barra (margem ' + medidas.recuo + ')');
    if (['inicio', 'ciclo', 'prioridade', ...resumos].includes(tela)) ok(medidas.conteudo && eixo(medidas.conteudo), 'GEOMETRIA ' + tela + ' a ' + width + ': o conteúdo visível alcança ambos os eixos');
    if (resumos.includes(tela)) {
      const numeros = painel.locator('.ct-design-numeros').first();
      largurasResumo.push((await numeros.boundingBox()).width);
    }
    if (tela === 'analise') {
      const abas = painel.locator('button[data-d]');
      const cabem = await abas.evaluateAll((botoes, toque) => botoes.length === 6 && botoes.every(botao => {
        const texto = document.createRange();
        texto.selectNodeContents(botao);
        const rotulo = texto.getBoundingClientRect(), caixa = botao.getBoundingClientRect();
        return rotulo.left >= caixa.left && rotulo.right <= caixa.right && (!toque || caixa.height >= 44);
      }), width <= 1024);
      ok(cabem, 'GEOMETRIA desempenho a ' + width + ': os seis rótulos cabem nos próprios botões');
      const ultima = abas.last();
      await ultima.scrollIntoViewIfNeeded();
      const alcancavel = await ultima.evaluate(botao => {
        const faixa = botao.parentElement.getBoundingClientRect(), caixa = botao.getBoundingClientRect();
        return caixa.left >= faixa.left - 1 && caixa.right <= faixa.right + 1;
      });
      ok(alcancavel, 'GEOMETRIA desempenho a ' + width + ': a última aba fica inteiramente visível ao rolar');
    }
    if (tela === 'inicio' || tela === 'calendario') {
      const ritmos = tela === 'inicio';
      const botoes = painel.locator(ritmos ? '.cth-ritmos button:not([title])' : '.ct-cal-movimento > button');
      const caixas = await botoes.evaluateAll(nos => nos.map(no => {
        const {width, height} = no.getBoundingClientRect(); return {width, height};
      }));
      ok(caixas.length === (ritmos ? 4 : 3) && caixas.every(c => perto(c.height, caixas[0].height) &&
        (!ritmos || perto(c.width, caixas[0].width))), 'GEOMETRIA ' + tela + ' a ' + width + ': controles irmãos têm medidas equivalentes');
    }
    if (tela === 'prioridade') {
      const quadro = pagina.frameLocator('iframe[data-ct-view="prioridade"]');
      const linha = quadro.locator('header.top > .l1');
      await linha.waitFor();
      const recuo = await linha.evaluate(e => e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft));
      ok(perto(recuo, 0), 'GEOMETRIA prioridade embutida a ' + width + ': o iframe usa a margem que já recebeu do host');
    }
  }
  ok(largurasResumo.every(l => perto(l, largurasResumo[0])),
    'GEOMETRIA a ' + width + ': os cinco resumos reservam a mesma largura de indicadores (' + largurasResumo.join('/') + ')');
}

async function conferirModulos(pagina, base, width, margem, ok) {
  for (const tela of ['legis', 'juris', 'area', 'ritos', 'pecas', 'prioridade', 'segunda-fase']) {
    await abrirComponenteDoLeitor(pagina, base + '/' + tela + '-web.html');
    await pagina.locator('.wrap').first().waitFor();
    const m = await pagina.evaluate(() => {
      const conteudo = document.querySelector('.wrap'), cab = document.querySelector('header.top > .l1') || conteudo.querySelector('.head');
      const eixo = e => {
        const r = e.getBoundingClientRect(), css = getComputedStyle(e);
        return [r.left + parseFloat(css.paddingLeft), r.right - parseFloat(css.paddingRight)];
      };
      return { cab: eixo(cab), corpo: eixo(conteudo), largura: document.documentElement.clientWidth,
        estouro: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    ok(perto(m.cab[0], margem) && perto(m.cab[1], m.largura - margem) &&
      perto(m.cab[0], m.corpo[0]) && perto(m.cab[1], m.corpo[1]) && m.estouro <= 1,
      'GEOMETRIA ' + tela + ' avulso a ' + width + ': cabeçalho e conteúdo compartilham margens (' + m.cab + ', ' + m.corpo + ')');
  }
}

export async function testarGeometriaInterface(browser, base, ok) {
  const compacta = await browser.newPage({ viewport: { width: 320, height: 700 }, hasTouch: true });
  try { await conferirModulos(compacta, base, 320, 16, ok); } finally { await compacta.close(); }
  const entrada = await browser.newPage();
  try { await conferirEntrada(entrada, base, ok); } finally { await entrada.close(); }
  for (const [width, margem] of [[390,16], [1024,24], [1600,32]]) {
    const pagina = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width <= 1024 });
    try {
      await conferirPaginas(pagina, base, width, margem, ok);
      await conferirModulos(pagina, base, width, margem, ok);
    } finally { await pagina.close(); }
  }
}
