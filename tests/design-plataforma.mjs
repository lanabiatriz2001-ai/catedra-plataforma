import assert from 'node:assert/strict';
import fs from 'node:fs';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';

const { srv, url } = await iniciarServidor(process.cwd(), +(process.env.CT_PORT || 9491));
const { browser, motor } = await lancarNavegador();
const titulos = {
  revisoes: 'Fila de revisão',
  flashcards: 'Cartões para revisar',
  edital: 'Cobertura por disciplina',
  calendario: 'Agenda de estudos',
  analise: 'Tempo de estudo e cobertura',
};
const cenarios = [
  { largura: 390, dir: 'holo', escuro: false },
  { largura: 1024, dir: 'sutil', escuro: true },
  { largura: 1440, dir: 'holo', escuro: false },
];

function dadosDeEstudo() {
  const s = window.__catedraApp.state;
  return { sessoes: s.sessions, editais: s.editais, revisoes: s.reviews, cartoes: s.flashcards,
    preferencias: s.prefs, destaque: s.accent, direcao: s.dir, escuro: s.darkMode };
}

try {
  for (const cenario of cenarios) {
    const { largura } = cenario;
    const pagina = await browser.newPage({ viewport: { width: largura, height: 1000 }, hasTouch: largura <= 1024 });
    const erros = [];
    pagina.on('pageerror', erro => erros.push(erro.message));
    await pagina.goto(url + '/__semente');
    await pagina.evaluate(() => {
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
    });
    await pagina.goto(url + '/Catedra.dc.html');
    await pagina.waitForFunction(() => window.__catedraApp);
    await pagina.evaluate(({ dir, escuro }) => {
      const app = window.__catedraApp;
      app.setState({ dir, darkMode: escuro, prefs: { ...app.state.prefs, fontScale: 'grande' } });
    }, cenario);
    await pagina.waitForFunction(({ dir, escuro }) => {
      const s = window.__catedraApp.state;
      return s.dir === dir && s.darkMode === escuro && s.prefs.fontScale === 'grande';
    }, cenario);
    const antes = await pagina.evaluate(dadosDeEstudo);

    for (const [tela, titulo] of Object.entries(titulos)) {
      await pagina.evaluate(v => window.__catedraGoView(v), tela);
      const conteudo = pagina.locator('[data-design-view="' + tela + '"]');
      const resumo = conteudo.getByRole('region', { name: titulo, exact: true });
      await resumo.waitFor();
      assert.equal(await conteudo.locator('.ct-design-hero').count(), 1, tela);
      const medidas = await resumo.evaluate(el => {
        const titulo = el.querySelector('h2');
        const numero = el.querySelector('.ct-design-numeros b');
        const legenda = el.querySelector('.ct-design-numeros div > span');
        const metricas = el.querySelector('.ct-design-numeros').getBoundingClientRect();
        const texto = el.querySelector('.ct-design-intro').getBoundingClientRect();
        const caixa = el.getBoundingClientRect();
        const tam = no => parseFloat(getComputedStyle(no.querySelector('.sc-interp') || no).fontSize);
        return {
          hierarquia: tam(titulo) > tam(legenda) && tam(numero) > tam(legenda),
          semSobreposicao: metricas.top >= texto.bottom - 1 || metricas.left >= texto.right - 1,
          dentro: metricas.left >= caixa.left - 1 && metricas.right <= caixa.right + 1,
          paginaCabe: document.documentElement.scrollWidth <= innerWidth + 2,
        };
      });
      for (const [criterio, passou] of Object.entries(medidas)) {
        assert.ok(passou, tela + ' a ' + largura + ' px · ' + criterio);
      }
      if (process.env.CT_CAPTURAS) {
        fs.mkdirSync(process.env.CT_CAPTURAS, { recursive: true });
        await pagina.screenshot({ path: process.env.CT_CAPTURAS + '/' + tela + '-' + largura + '-' + motor + '.png' });
      }
    }
    assert.deepEqual(await pagina.evaluate(dadosDeEstudo), antes, 'Preserva os dados e as preferências');
    assert.deepEqual(erros, []);
    await pagina.close();
    console.log(motor + ': cinco telas a ' + largura + ' px · título, indicadores, fonte grande e dados preservados');
  }
} finally {
  await browser.close();
  srv.close();
}
