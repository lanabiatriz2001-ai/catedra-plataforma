/* Sem Dizer o Direito e sem os mapas das Súmulas Vinculantes — decisão da dona (25/09/2026).
   Saíram do app, na web e no JURIS nativo: o juris-mapas-sv.html (aba "Mapas mentais" do
   JURIS web, que se declarava feito "a partir do Dizer o Direito"), o rótulo vademecum_dod
   da web e a fonte .vadeMecumDOD dos Swift do Mac e do iPad, com a seção "DOD & Precedentes"
   rebatizada de "Precedentes" (sobram nela os precedentes obrigatórios).
   Aqui:
   · (a) fonte: o arquivo não existe, o juris-web.html não o cita nem tem a aba, e as listas de
         cópia e de precache dos dois builds não o levam;
   · (b) saída: varredura de public/ (o que a Vercel serve) e do bundle nativo (mac/build/web e
         o Contents/Resources de cada .app em mac/build) atrás de "juris-mapas-sv",
         "vademecum_dod", "Vade Mecum DOD" e "Dizer o Direito" — nomes de arquivo e conteúdo.
         O corpus.json do .app é LIDO: nenhum registro de fonte vademecum_dod nem id DOD-.
         Pasta que não existe na máquina (a CI não gera o bundle) fica de fora COM aviso —
         nunca fingida;
   · (c) Swift: nenhum case, rótulo ou rawValue DOD nos módulos JURIS do Mac e do iPad, que
         continuam iguais no JurisEntry.swift;
   · (d) navegador: o JURIS abre com as quatro abas que sobraram, cada uma mostra o próprio
         painel, e não há iframe nem painel de mapas.
   "Dizer o Direito" é procurado com maiúsculas: "dizer o direito" em minúsculas é a juris
   dictio e aparece em enunciado legítimo (INF2024-0343, arguição oral). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROIBIDOS = ['juris-mapas-sv', 'vademecum_dod', 'Vade Mecum DOD', 'Dizer o Direito'];
const TEXTO = /\.(html?|m?js|cjs|json|css|webmanifest|txt|md|svg|xml|plist)$/i;
const SWIFT_DOD = /\bvadeMecumDOD\b|"vademecum_dod"|Vade Mecum DOD|"VM DOD"|DOD & Precedentes/;

function varrer(dir) {
  const achados = [];
  let arquivos = 0;
  const anda = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { anda(p); continue; }
      arquivos++;
      const rel = path.relative(RAIZ, p);
      if (/juris-mapas-sv/i.test(ent.name)) achados.push(rel + ' (nome do arquivo)');
      if (!TEXTO.test(ent.name)) continue;
      const txt = fs.readFileSync(p, 'utf8');
      for (const s of PROIBIDOS) if (txt.includes(s)) achados.push(rel + ' → "' + s + '"');
    }
  };
  anda(dir);
  return { achados, arquivos };
}

/** Casos estáticos: fonte, listas de build, saídas geradas e Swift. */
export function testarSemDodEstatico(ok, opcoes = {}) {
  const R = 'SEM DOD [' + (opcoes.motor || 'node') + '] ';
  const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

  // (a) fonte e listas
  ok(!fs.existsSync(path.join(RAIZ, 'juris-mapas-sv.html')), R + '(a) o juris-mapas-sv.html saiu do repositório');
  const jw = ler('juris-web.html');
  ok(!/juris-mapas-sv|mapasFrame|paneMapas|data-pane="mapas"/.test(jw),
    R + '(a) o juris-web.html não tem mais a aba, o painel nem o iframe dos mapas');
  ok(!/vademecum_dod|Vade Mecum DOD|Dizer o Direito/.test(jw), R + '(a) o juris-web.html não tem rótulo do DOD');
  const b = ler('scripts/build.mjs'), bm = ler('scripts/build-macos.mjs');
  // a lista do build web virou "const COPIAR = [...]" (#154); a do nativo segue no for
  const listaCopia = (src) => { let i = src.indexOf("const COPIAR = ['support.js'"); if (i < 0) i = src.indexOf("for (const f of ['support.js'"); return i < 0 ? null : src.slice(i, src.indexOf(']', i)); };
  const lb = listaCopia(b), lbm = listaCopia(bm);
  ok(!!lb && !!lbm && /'juris-web\.html'/.test(lb) && /'juris-web\.html'/.test(lbm),
    R + '(a) as duas listas de cópia foram achadas (e levam o juris-web.html)');
  ok(!!lb && !!lbm && !/juris-mapas-sv/.test(lb) && !/juris-mapas-sv/.test(lbm),
    R + '(a) nem o build web nem o nativo copiam o juris-mapas-sv.html');
  ok(!/juris-mapas-sv/.test(bm), R + '(a) o build nativo não cita mais o arquivo');
  ok(!/'\.\/juris-mapas-sv\.html'/.test(b), R + '(a) o precache do worker não aquece mais os mapas');
  ok(/for \(const f of \['juris-mapas-sv\.html'\]\) rmSync\(join\(pub, f\)/.test(b),
    R + '(a) o build web apaga a cópia velha de um public/ antigo');

  // (b) saídas geradas
  const saidas = [['public', path.join(RAIZ, 'public')], ['mac/build/web', path.join(RAIZ, 'mac', 'build', 'web')]];
  const macBuild = path.join(RAIZ, 'mac', 'build');
  if (fs.existsSync(macBuild)) for (const n of fs.readdirSync(macBuild)) {
    if (n.endsWith('.app')) saidas.push(['mac/build/' + n + '/Contents/Resources', path.join(macBuild, n, 'Contents', 'Resources')]);
  }
  for (const [rotulo, dir] of saidas) {
    if (!fs.existsSync(dir)) { console.log('  · ' + R + rotulo + ' não existe nesta máquina — fica de fora da varredura'); continue; }
    const { achados, arquivos } = varrer(dir);
    ok(arquivos > 0 && achados.length === 0, R + '(b) ' + rotulo + ': nada de DOD nem dos mapas em ' + arquivos + ' arquivos'
      + (achados.length ? ' (' + achados.slice(0, 5).join(' | ') + ')' : ''));
  }
  const corpora = saidas.filter(([r]) => /\.app\//.test(r)).map(([r, d]) => [r + '/corpus.json', path.join(d, 'corpus.json')]);
  corpora.push(['VadeMecumJuris (origem)', path.join(process.env.HOME || '', 'App Jurisprudências', 'VadeMecumJuris', 'Sources', 'VadeMecum', 'Resources', 'corpus.json')]);
  for (const [rotulo, f] of corpora) {
    if (!fs.existsSync(f)) { console.log('  · ' + R + rotulo + ' não existe nesta máquina — fica de fora'); continue; }
    let recs = null; try { recs = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) {}
    const dod = Array.isArray(recs) ? recs.filter(r => r && (r.fonte === 'vademecum_dod' || /^DOD-/.test(r.id || ''))).length : -1;
    ok(Array.isArray(recs) && recs.length > 10000 && dod === 0,
      R + '(b) ' + rotulo + ': ' + (recs ? recs.length : '?') + ' registros, nenhum do Vade Mecum DOD (' + dod + ')');
  }

  // (c) Swift
  const swifts = [];
  for (const d of ['mac/vendor/juris', 'ios/vendor/juris', 'mac/Sources', 'ios/Sources']) {
    const abs = path.join(RAIZ, d);
    if (!fs.existsSync(abs)) continue;
    const anda = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) {
      const p = path.join(x, e.name); if (e.isDirectory()) anda(p); else if (e.name.endsWith('.swift')) swifts.push(p); } };
    anda(abs);
  }
  const comDod = swifts.filter(p => SWIFT_DOD.test(fs.readFileSync(p, 'utf8'))).map(p => path.relative(RAIZ, p));
  ok(swifts.length > 20 && comDod.length === 0, R + '(c) nenhum dos ' + swifts.length + ' .swift tem case, rótulo ou rawValue do DOD'
    + (comDod.length ? ' (' + comDod.join(', ') + ')' : ''));
  const jeMac = ler('mac/vendor/juris/Models/JurisEntry.swift'), jeIos = ler('ios/vendor/juris/Models/JurisEntry.swift');
  ok(jeMac === jeIos, R + '(c) JurisEntry.swift do Mac e do iPad continuam iguais');
  ok(/case \.outros: return "Precedentes"\n/.test(jeMac) && /case \.precedentesObrig, \.outro:\s*return \.outros/.test(jeMac),
    R + '(c) a seção .outros se chama "Precedentes" e ainda tem os precedentes obrigatórios');
  // Depois do redesenho nativo (#143) a seção saiu da barra lateral e mora em JurisDestinos
  ok(/item\("dod", "Precedentes"/.test(ler('mac/vendor/juris/Views/JurisDestinos.swift'))
    && /item\("dod", "Precedentes"/.test(ler('ios/vendor/juris/Views/JurisDestinos.swift'))
    && !/DOD & Precedentes/.test(ler('mac/vendor/juris/Views/SidebarView.swift'))
    && /selecao: \.central\(\.outros\), rotulo: "Precedentes"/.test(ler('ios/vendor/juris/Views/JurisCompacto.swift')),
    R + '(c) a barra do Mac e o menu compacto do iPad dizem "Precedentes"');
}

/** Caso de navegador: o JURIS abre com as abas que sobraram. `base` sem barra final. */
export async function testarSemDodNavegador(page, base, ok, opcoes = {}) {
  const R = 'SEM DOD [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const erros = [];
  const pegaErro = (e) => erros.push(String(e && e.message || e));
  page.on('pageerror', pegaErro);
  try {
    await page.goto(base + '/juris-web.html');
    await page.waitForTimeout(1800);
    const r = await page.evaluate(async () => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      const abas = [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.pane);
      const PAINEL = { acervo: 'paneAcervo', dia: 'paneDia', infos: 'paneInfos', tribunais: 'paneTribunais' };
      const trocas = [];
      for (const a of abas) {
        document.querySelector('#tabs .tab[data-pane="' + a + '"]').click(); await w(250);
        const visiveis = Object.entries(PAINEL).filter(([, id]) => { const el = document.getElementById(id); return el && !el.hidden; }).map(([k]) => k);
        const on = document.querySelector('#tabs .tab.on');
        trocas.push(visiveis.length === 1 && visiveis[0] === a && on && on.dataset.pane === a && on.getAttribute('aria-pressed') === 'true');
      }
      document.querySelector('#tabs .tab[data-pane="acervo"]').click();
      return { abas, trocas, iframes: document.querySelectorAll('iframe').length,
        mapas: !!document.getElementById('paneMapas') || !!document.getElementById('mapasFrame'),
        texto: /Vade Mecum DOD|Dizer o Direito/.test(document.body.innerText) };
    });
    ok(r.abas.join(',') === 'acervo,dia,infos,tribunais', R + 'o JURIS tem as quatro abas que sobraram (' + r.abas.join(',') + ')');
    ok(r.trocas.length === 4 && r.trocas.every(Boolean), R + 'cada aba mostra o próprio painel e só ele (' + r.trocas.join(',') + ')');
    ok(r.iframes === 0 && !r.mapas, R + 'sem iframe nem painel de mapas no JURIS');
    ok(!r.texto, R + 'nenhum texto do DOD na tela do JURIS');
    /* Em file:// o WebKit rejeita o fetch do manifesto das fatias (dados/…/manifesto.json,
       "access control checks") e o CTDados cai para o <script> de propósito — é o caminho do
       iPad, não defeito desta mudança. Só esse aviso sai da conta, e só fora do http. */
    const reais = erros.filter(m => !(opcoes.origem !== 'http' && /manifesto\.json due to access control/.test(m)));
    ok(!reais.length, R + 'sem erro de página (' + reais.slice(0, 1).join('').slice(0, 120) + ')');
  } finally {
    page.off('pageerror', pegaErro);
  }
}
