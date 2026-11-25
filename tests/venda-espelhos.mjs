/* PÁGINA DE VENDA DO BANCO DE ESPELHOS (banco-espelhos-venda.html) — 25/11/2026

   A oferta decidida pela dona: R$ 197 por um mês, sem renovação automática; bônus de atualização de
   12 meses; fila do corretor com entrada antecipada e pelo menos 20% de desconto. O que estes casos
   seguram:
   · todo número sobre o acervo bate com espelhos.js — a página não pode envelhecer calada nem
     prometer o que o acervo não tem (84 quesitos sem valor, 6 provas sem valor nenhum, 1 sem caderno);
   · nada de concorrente pelo nome, "correção por IA", "único" ou promessa de aprovação; a comparação
     de mercado fica no que o brief de setembro sustenta;
   · não há checkout: o botão registra interesse pela RPC da lista de espera, área "banco-espelhos",
     a mesma que a migração 2026-11-25 separa da lista do beta;
   · a aparência é MEDIDA nos dois esquemas: contraste de cada texto contra o fundo que pinta atrás
     dele (degradê dos cartões incluído), borda do campo a 3:1, alvos de 44 px, serifa carregada,
     preço em destaque, ícones de 16 px, uma coluna em 390 px sem rolagem lateral.
   O módulo abre um contexto próprio: não muda tamanho nem esquema de cor da página de quem o chama.
   Ciclo curto: CT_SO=venda-espelhos npm test */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

export async function testarVendaEspelhos(page, URL0, ok) {
  const r = {};
  const html = ler('banco-espelhos-venda.html');
  const visivel = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/&nbsp;/g, ' ');
  const ctx0 = { window: {} }; new Function('window', ler('espelhos.js'))(ctx0.window);
  const E = ctx0.window.CT_ESPELHOS, tribs = [...new Set(E.provas.map(p => p.trib))].sort();
  const n = (k) => Number((visivel.match(new RegExp('data-n="' + k + '">(\\d+)<')) || [])[1]);
  const porTipo = (t) => E.provas.filter(p => p.tipo === t).reduce((a, p) => a + p.quesitos.length, 0);
  const temValor = (q) => typeof q.valor === 'number' && !isNaN(q.valor);
  const anos = [...new Set(E.provas.map(p => p.ano))].sort();
  r.numerosBatemComOAcervo = n('quesitos') === E.meta.quesitos && n('provas') === E.meta.provas && n('tribunais') === tribs.length && n('anos') === anos.length && visivel.includes('de ' + anos[0] + ' a ' + anos[anos.length - 1]);
  r.tribunaisListados = tribs.every(t => visivel.includes(t));
  r.divisaoPorTipo = visivel.includes(porTipo('Discursiva') + ' quesitos de discursiva') && visivel.includes(porTipo('Sentença') + ' de sentença') && porTipo('Discursiva') + porTipo('Sentença') === E.meta.quesitos;
  // "com a pontuação da banca" valia para 502 dos 586: a página diz quantos têm valor e quais provas não têm nenhum
  const comValor = E.provas.reduce((a, p) => a + p.quesitos.filter(temValor).length, 0);
  const zerados = E.provas.filter(p => !p.quesitos.some(temValor));
  const honesto = (visivel.match(/<div class="honesto">([\s\S]*?)<\/div>/) || [])[1] || '';
  r.pontuacaoSemExagero = visivel.includes('Em ' + comValor + ' o banco mostra o valor do quesito; nos outros ' + (E.meta.quesitos - comValor)) && !/quesitos com a pontuação da banca|Traz o valor de cada quesito\.|com a pontuação que a banca atribuiu/.test(html);
  r.provasSemValorNomeadas = honesto.includes('Em ' + zerados.length + ' das ' + E.meta.provas + ' provas o espelho não dá o valor de nenhum quesito') && zerados.every(p => honesto.includes(p.trib) && honesto.includes(String(p.ano)));
  r.cadernoSemExagero = !/cada quesito tem o link do PDF/.test(visivel) && (E.provas.every(p => p.prova) || /e o do caderno quando a banca o publicou/.test(visivel)) && E.provas.every(p => p.url && p.conc);
  // banca por tribunal: o que a prova diz pelo link (Vunesp) vence o rótulo genérico "Banca própria"
  const banca = (p) => /vunesp/i.test(p.url || '') ? 'Vunesp' : (p.banca === 'FGV' ? 'FGV' : 'banca própria');
  const ORDEM = ['FGV', 'banca própria', 'Vunesp'];
  r.tribunaisEBancas = tribs.every(t => {
    const ps = E.provas.filter(p => p.trib === t), b = ORDEM.filter(x => ps.some(p => banca(p) === x)).join(' e ');
    return visivel.includes('<li data-trib="' + t + '"><b>' + t + '</b><span>' + ps.length + (ps.length === 1 ? ' prova' : ' provas') + ' · ' + b + '</span></li>');
  });
  const fgv = E.provas.filter(p => banca(p) === 'FGV').length, vun = E.provas.filter(p => banca(p) === 'Vunesp');
  r.totaisPorBanca = visivel.includes(fgv + ' das ' + E.meta.provas + ' provas são da FGV') && visivel.includes('Das outras ' + (E.meta.provas - fgv) + ', ' + (E.meta.provas - fgv - vun.length) + ' são de banca própria do tribunal') && vun.every(p => visivel.includes(p.trib + ' de ' + p.ano + ', foi aplicada pela Vunesp')) && visivel.includes('Das 36 provas, ' + fgv + ' são da FGV');
  // os filtros prometidos são os que o Simulado entrega: dois seletores e uma busca que cobre ano, banca, disciplina e tema
  const sf = ler('segunda-fase-web.html'), tr = ler('treino.js');
  r.filtrosQueExistem = /id="ftrib"/.test(sf) && /id="ftipo"/.test(sf) && /id="fq"/.test(sf) && /norm\(\[p\.trib, p\.ano, p\.banca, p\.tipo,/.test(tr) && /q\.tema \+ ' ' \+ q\.disc/.test(tr) && /Escolha o tribunal e o tipo de prova, ou busque por ano, banca, disciplina e tema/.test(visivel) && !/Filtre por/.test(visivel);
  // a lista "não localizados" mistura concursos, bancas e notas e não aparece no banco entregue: a página não a conta
  r.semContagemDeNaoLocalizados = !/data-n="naoLocalizados"/.test(html) && !/aparecem no banco como não localizados/.test(visivel);
  r.oferta = /R\$ 197 por um mês de acesso/.test(visivel) && /Não renova sozinho/.test(visivel) && /sem renovação automática/.test(visivel) && /Durante 12 meses a partir da compra/.test(visivel) && /pelo menos 20% de desconto/.test(visivel) && !/2[1-5]\s?%/.test(visivel) && /Dois bônus para quem comprar o banco/.test(visivel);
  // preços na tela: o da oferta e as faixas datadas da comparação de mercado, nada além
  // e "R$" nunca fica sozinho no fim da linha: no corpo, o espaço depois dele é &nbsp;
  const corpo = html.slice(html.indexOf('<body>')).replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  r.precosDaOfertaEDaComparacao = [...new Set((visivel.match(/R\$ \d+(?:\.\d{3})*/g) || []))].sort().join('|') === 'R$ 1.359|R$ 197|R$ 2.797|R$ 555|R$ 799' && !/R\$ (?=\d)/.test(corpo) && (corpo.match(/R\$&nbsp;\d/g) || []).length === 7;
  r.comparacaoNoQueOBriefSustenta = !/corrigidas por professor|Escrito pelo professor|Caso inédito, sem prova|Pontuação estimada/.test(visivel) && /em dois, não foi possível ler a oferta inteira/.test(visivel) && /o mais caro inclui aulas teóricas/.test(visivel);
  r.oQueNaoE = /Não é curso/.test(visivel) && /Não é correção individual/.test(visivel) && /Não é banco de questões objetivas/.test(visivel) && /Não é espelho inventado/.test(visivel) && /Não cobre todo concurso/.test(visivel);
  r.semConcorrentePeloNome = !/CP Iuris|Jusfederal|EMAP|Verbo Jur|G7|Em Foco|TEC Concursos|QConcursos/i.test(html);
  r.semPromessaNemInvencao = !/correção por IA|aprovação garantida|alunos aprovados|depoimento|\b[oa] únic[oa] (lugar|plataforma|banco|curso)|\d+ (mil )?(alunos|usuári)/i.test(visivel) && /nenhuma plataforma pode prometê-la/.test(visivel);
  r.perguntaSemGenero = !/ser cobrad[ao]\b/.test(visivel);
  r.vendaNaoAbriu = (visivel.match(/A venda ainda não abriu/g) || []).length === 2 && /Nada é cobrado agora/.test(visivel);
  r.foraDosBuscadores = /<meta name="robots" content="noindex">/.test(html);
  r.campoSemNome = !/<input[^>]*\sname=/.test(html);
  r.semRedeExterna = !/https?:\/\/(cdn|fonts\.|unpkg|jsdelivr|googleapis|gstatic)/i.test(html) && /url\('\.\/fonts\/spectral-700-normal\.woff2'\)/.test(html) && /prefers-color-scheme: dark/.test(html) && /prefers-reduced-motion/.test(html);
  r.semFaixaLateralNemEmoji = !/border-left:\s*[3-9]px/.test(html) && !/[\u{1F300}-\u{1FAFF}\u2705\u274C\u2728]/u.test(html) && (html.match(/<svg aria-hidden="true"/g) || []).length === (html.match(/<svg/g) || []).length;
  r.ligacoes = /href="\.\/termos\.html"/.test(html) && /href="\.\/privacidade\.html"/.test(html) && /href="\.\/sobre\.html"/.test(html);
  const build = ler('scripts/build.mjs'), buildMac = ler('scripts/build-macos.mjs'), vercel = JSON.parse(ler('vercel.json'));
  r.buildsERota = /'banco-espelhos-venda\.html'/.test(build) && /'banco-espelhos-venda\.html'/.test(buildMac) && (vercel.rewrites || []).some(x => x.source === '/banco-de-espelhos' && x.destination === '/banco-espelhos-venda.html');
  const prod = ler('PRODUCT.md');
  r.productMdRegistraOPreco = /\*\*Preço:\*\*[^\n]*R\$ 197 por um mês/.test(prod);
  r.documentosComOsNumerosDoAcervo = !/566 quesitos/.test(prod) && prod.includes(E.meta.quesitos + ' quesitos de ' + E.meta.provas + ' provas') && !/566 quesitos/.test(ler('.impeccable/surfaces/sobre-html.md')) && fs.existsSync(path.join(RAIZ, '.impeccable/surfaces/banco-espelhos-venda.md'));
  // a área que a página manda é a que a migração separa da lista do beta
  const mig = path.join(RAIZ, 'supabase/migrations/2026-11-25-lista-espera-interesse-venda.sql');
  r.migracaoDoInteresse = fs.existsSync(mig) && /p_area: 'banco-espelhos'/.test(html) && /lista_espera_venda_email_uidx/.test(fs.readFileSync(mig, 'utf8')) && fs.readFileSync(mig, 'utf8').includes("'banco-espelhos'");
  for (const [k, v] of Object.entries(r)) ok(v, 'PÚBLICO/venda estático ' + k);

  const navegador = page.context().browser();
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const p = await ctx.newPage();
    for (const esquema of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: esquema });
      await p.goto(URL0 + '/banco-espelhos-venda.html');
      await p.waitForFunction(() => typeof window.ctEmailValido === 'function');
      await p.evaluate(() => document.fonts.ready);
      const m = await p.evaluate(() => {
        // contraste WCAG medido no que pinta. As cores chegam como rgb(), rgba() ou color(srgb …) (color-mix);
        // formato desconhecido reprova em vez de passar calado.
        const desconhecidas = [];
        const cor = (s) => {
          let x = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(s);
          if (x) return [+x[1], +x[2], +x[3], x[4] == null ? 1 : (x[5] ? x[4] / 100 : +x[4])];
          x = /^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/.exec(s);
          if (x) return [x[1] * 255, x[2] * 255, x[3] * 255, x[4] == null ? 1 : (x[5] ? x[4] / 100 : +x[4])];
          if (s === 'transparent') return [0, 0, 0, 0];
          desconhecidas.push(s); return [0, 0, 0, 0];
        };
        const sobre = (c, b) => [c[0] * c[3] + b[0] * (1 - c[3]), c[1] * c[3] + b[1] * (1 - c[3]), c[2] * c[3] + b[2] * (1 - c[3]), 1];
        // fundo opaco atrás do elemento; com o degradê de .cartao/.preco, também a faixa de cima, que é a mais tingida
        const fundos = (el) => {
          const pilha = []; for (let e = el; e; e = e.parentElement) pilha.push(e);
          let base = [255, 255, 255, 1], tinta = null;
          for (const e of pilha.reverse()) {
            const cs = getComputedStyle(e); base = sobre(cor(cs.backgroundColor), base); if (tinta) tinta = sobre(cor(cs.backgroundColor), tinta);
            const g = /linear-gradient\((?:[^,()]*deg,\s*)?((?:rgba?|color)\([^)]*\))/.exec(cs.backgroundImage);
            if (g) tinta = sobre(cor(g[1]), base);
            else if (cs.backgroundImage !== 'none' && !/^url/.test(cs.backgroundImage) && e.matches('.cartao, .preco')) desconhecidas.push(cs.backgroundImage.slice(0, 60));
          }
          return tinta ? [base, tinta] : [base];
        };
        const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const L = p => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
        const contra = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
        const razao = (el) => Math.min(...fundos(el).map(f => contra(sobre(cor(getComputedStyle(el).color), f), f)));
        const alvos = [...document.querySelectorAll('h1, h1 em, h2, h3, main p, main li, .preco-topo small, .mosaico b, .mosaico span, .tribs b, .tribs span, .cartao .n, .botao, .botao-2, label, .rodape span, .rodape a')].filter(e => e.getClientRects().length && e.textContent.trim());
        let pior = 99, quem = ''; for (const e of alvos) { const x = razao(e); if (x < pior) { pior = x; quem = (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 30); } }
        const r = {};
        r.contraste = { ok: pior >= 4.5 && alvos.length > 60, det: pior.toFixed(2) + ' em "' + quem + '" (' + alvos.length + ' textos)' };
        // a borda é o que mostra o campo: 3:1 contra o fundo do campo e contra o fundo em volta (WCAG 1.4.11)
        const campo = document.getElementById('email'), cb = cor(getComputedStyle(campo).borderTopColor);
        const borda = Math.min(...[...fundos(campo), ...fundos(campo.parentElement)].map(f => contra(sobre(cb, f), f)));
        r.bordaDoCampo = { ok: borda >= 3, det: borda.toFixed(2) + ':1' };
        r.alvos44 = { ok: [...document.querySelectorAll('.botao, .botao-2, button, .rodape a, .marca')].every(b => b.getBoundingClientRect().height >= 44) && campo.getBoundingClientRect().height >= 44, det: '' };
        r.serifaNoTitulo = { ok: /Spectral/.test(getComputedStyle(document.querySelector('h1')).fontFamily) && document.fonts.check('700 40px Spectral'), det: '' };
        // o preço aparece como preço: tamanho e cor da tinta, não do corpo (a especificidade de .hero p e .preco p já o apagou)
        const tinta = getComputedStyle(document.querySelector('h1')).color, pt = getComputedStyle(document.querySelector('.preco-topo')), va = getComputedStyle(document.querySelector('.valor'));
        r.precoEmDestaque = { ok: parseFloat(pt.fontSize) >= 24 && pt.color === tinta && /Spectral/.test(pt.fontFamily) && parseFloat(va.fontSize) >= 48 && va.color === tinta && /R\$\s197/.test(document.querySelector('.valor').textContent) && parseFloat(getComputedStyle(document.querySelector('.nota')).fontSize) <= 15, det: 'topo ' + pt.fontSize + ' ' + pt.color + ' · valor ' + va.fontSize + ' ' + va.color };
        r.semRolagemLateral = { ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth, det: document.documentElement.scrollWidth > document.documentElement.clientWidth ? document.documentElement.scrollWidth + ' > ' + document.documentElement.clientWidth : '' };
        r.iconesDe16 = { ok: [...document.querySelectorAll('.cartao .n svg')].length === 4 && [...document.querySelectorAll('.cartao .n svg')].every(s => Math.round(s.getBoundingClientRect().width) === 16), det: '' };
        r.coresLidas = { ok: desconhecidas.length === 0, det: desconhecidas.slice(0, 2).join(' | ') };
        return r;
      });
      for (const [k, v] of Object.entries(m)) ok(v.ok, 'PÚBLICO/venda ' + esquema + ' ' + k + (v.det ? ' — ' + v.det : ''));
    }
    await p.emulateMedia({ colorScheme: 'light' });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(URL0 + '/banco-espelhos-venda.html');
    const estreito = await p.evaluate(() => ({ semRolagem: document.documentElement.scrollWidth <= document.documentElement.clientWidth, umaColuna: document.querySelector('.hero > div').getBoundingClientRect().width > 300 && document.querySelector('.mosaico').getBoundingClientRect().top > document.querySelector('.hero .acoes').getBoundingClientRect().bottom, anosNumaLinha: [...document.querySelectorAll('.mosaico b')].every(b => b.getClientRects().length === 1 && b.getBoundingClientRect().height < parseFloat(getComputedStyle(b).fontSize) * 1.6) }));
    ok(estreito.semRolagem && estreito.umaColuna && estreito.anosNumaLinha, 'PÚBLICO/venda em 390 px: uma coluna, sem rolagem lateral, números do mosaico numa linha só');
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto(URL0 + '/banco-espelhos-venda.html');
    await p.waitForFunction(() => typeof window.ctEmailValido === 'function');
    const f = await p.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const r = {}, chamadas = [];
      window.fetch = async (u, o) => { chamadas.push({ u: String(u), o }); return { ok: true, status: 204 }; };
      const inE = document.getElementById('email'), erro = document.getElementById('erro'), ok = document.getElementById('ok'), form = document.getElementById('formCompra');
      inE.value = 'invalido@'; form.requestSubmit(); await w(100);
      r.invalidoNaoEnvia = chamadas.length === 0 && /e-mail válido/.test(erro.textContent) && document.activeElement === inE && ok.getAttribute('data-mostra') !== '1';
      inE.value = '  Pessoa@Exemplo.com '; form.requestSubmit(); await w(200);
      const c = chamadas[0], corpo = c ? JSON.parse(c.o.body) : {};
      r.validoRegistraInteresse = chamadas.length === 1 && /\/rest\/v1\/rpc\/entrar_lista_espera$/.test(c.u) && c.o.method === 'POST' && !!c.o.headers.apikey && corpo.p_email === 'pessoa@exemplo.com' && corpo.p_area === 'banco-espelhos';
      r.confirmaSemRedirecionarNemCobrar = ok.getAttribute('data-mostra') === '1' && /anotamos o seu interesse/.test(ok.textContent) && /banco-espelhos-venda\.html$/.test(location.pathname) && !location.search && inE.value === '' && getComputedStyle(ok).display !== 'none';
      window.fetch = async () => ({ ok: false, status: 400, json: async () => ({ code: 'P0001', message: 'lista_temporariamente_indisponivel' }) });
      inE.value = 'y@exemplo.com'; form.requestSubmit(); await w(200);
      r.listaFechadaNaoPedeInstantes = /não está aceitando e-mails agora/.test(erro.textContent) && !/em instantes/.test(erro.textContent) && document.getElementById('enviar').disabled === false;
      window.fetch = async () => { throw new Error('rede'); };
      inE.value = 'x@exemplo.com'; form.requestSubmit(); await w(200);
      r.falhaDeRedeExplica = /Não deu para registrar agora/.test(erro.textContent) && document.getElementById('enviar').disabled === false && document.getElementById('enviar').textContent === 'Quero meu mês no banco';
      return r;
    });
    for (const [k, v] of Object.entries(f)) ok(v, 'PÚBLICO/venda formulário ' + k);
  } finally {
    await ctx.close();
  }
}
