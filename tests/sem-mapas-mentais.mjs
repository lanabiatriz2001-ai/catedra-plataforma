/* Sem mapas mentais — decisão da dona (25/09/2026). O mapa das Súmulas Vinculantes da web já
   saiu (tests/sem-dod.mjs). Aqui, o resto:
   · (a) JURIS nativo, Mac e iPad: a ferramenta "Mapa mental / fluxograma…" do verbete (menu
         de ferramentas, menu "Mais" e o gancho de ensaio -jurisFolha mapa), a folha com o
         canvas de exportação PNG/PDF (MapaMentalView.swift), a galeria (JurisMapasGaleria.swift),
         a seção .mapas (sidebar, Início, Meu material, menu do iPhone, -jurisIr mapas), o
         exportador do mapa e a prévia escalada que só o mapa usava. Nenhum .swift de mac/ ou ios/
         cita nada disso — nem em comentário;
   · (b) dado antigo: o state.json guarda mapasFeitos/mapasSeeded de quem usou a galeria. O
         formato do disco saiu do LibraryStore para JurisEstadoPersistido.swift (igual nas duas
         cópias); o LibraryStore não lê nem semeia a galeria, só devolve ao disco o que veio
         (LegadoGaleria). No Mac, scripts/testar-estado-juris.sh compila o arquivo e decodifica
         um state.json antigo (fora do macOS, pulado com aviso);
   · (c) web: o formato "mapa" da geração por IA (dormente desde que a tela Multiformato saiu)
         deixa o render e o prompt; quem tinha "mapa" salvo cai no texto, e o mfGen antigo
         continua no armazenamento. Nenhum HTML/JS do app (satélites incluídos) fala em mapa
         mental — os acervos de conteúdo (discursivas, juris-text, oral-conteudo…) ficam de fora.
   O "Mapa do artigo" do LEGIS (esquema estrutural do dispositivo) e o Mapa de Processo e peças
   (mapa-processual.js) são outras coisas e ficam. */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// arquivo ausente vira '' — cada caso falha por conta própria, sem derrubar o roteiro
const ler = (f) => { try { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch (_) { return ''; } };

const SWIFT_PROIBIDO = [
  ['MapaMentalView', /\bMapaMental(View|Sheet)\b/],
  ['JurisMapasGaleria', /\bJurisMapasGaleria\b/],
  ['case .mapas / Selecao.mapas', /\bcase\s+mapas\b|\.mapas\b|"mapas"/],
  ['mostrarMapa / registrarMapa / mapasEntries', /\bmostrarMapa\b|\bregistrarMapa\b|\bremoverMapa\b|\bmapasEntries\b/],
  ['exportador do mapa', /\bmapa(PNG|PDF|NSImage)\b/],
  ['prévia escalada do mapa', /\bJurisPreviaEscalada\b/],
  ['ensaio da folha do mapa', /case\s+"mapa"\s*:\s*mostrar|-jurisFolha mapa\b/],
  ['"mapa mental" (qualquer caixa)', /mapa mental/i],
  ['"mapas mentais" (qualquer caixa)', /mapas mentais/i],
];

/** Todos os .swift dos hosts nativos (Sources e vendor), sem as saídas de build. */
function swiftDosHosts() {
  const lista = [];
  const anda = (d) => {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name === 'build' || ent.name.startsWith('.')) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) anda(p);
      else if (ent.name.endsWith('.swift')) lista.push(p);
    }
  };
  for (const d of ['mac/vendor', 'mac/Sources', 'ios/vendor', 'ios/Sources']) anda(path.join(RAIZ, d));
  return lista;
}

/** Acervos de CONTEÚDO (texto jurídico de terceiros ou gerado): podem citar "mapa mental" com
    toda a legitimidade — não são tela do app. */
const CONTEUDO = /^(discursivas|juris-text|juris-index|oral-conteudo|questoes-|leis-seca|informativos|semana-juris|sumulas|teses)/i;

export function testarSemMapasMentaisEstatico(ok, opcoes = {}) {
  const R = 'SEM MAPAS MENTAIS [' + (opcoes.motor || 'node') + '] ';

  // (a) Swift
  for (const plat of ['mac', 'ios']) {
    const sumiram = ['MapaMentalView.swift', 'JurisMapasGaleria.swift']
      .filter((f) => fs.existsSync(path.join(RAIZ, plat, 'vendor', 'juris', 'Views', f)));
    ok(sumiram.length === 0, R + '(a) ' + plat + ': a folha do mapa e a galeria saíram do JURIS (' + sumiram.join(', ') + ')');
  }
  const arquivos = swiftDosHosts();
  const achados = [];
  for (const f of arquivos) {
    const linhas = fs.readFileSync(f, 'utf8').split('\n');
    linhas.forEach((l, i) => {
      for (const [nome, re] of SWIFT_PROIBIDO) {
        if (re.test(l)) achados.push(path.relative(RAIZ, f) + ':' + (i + 1) + ' ' + nome);
      }
    });
  }
  ok(arquivos.length > 100 && achados.length === 0,
    R + '(a) nenhum .swift do Mac nem do iPad (' + arquivos.length + ' arquivos) cita o mapa mental, a galeria ou a seção .mapas'
    + (achados.length ? ' — ' + achados.slice(0, 6).join('; ') : ''));
  for (const plat of ['mac', 'ios']) {
    const ed = ler(plat + '/vendor/juris/Views/EntryDetailView.swift');
    ok(/Comparar STF × STJ \(com IA\)/.test(ed) && /Linha do tempo do tema/.test(ed),
      R + '(a) ' + plat + ': as outras ferramentas do verbete (comparador, linha do tempo) continuam');
  }
  // o LEGIS não perdeu o esquema do artigo, que não é mapa mental
  ok(fs.existsSync(path.join(RAIZ, 'mac/vendor/legis/ArticleMapView.swift'))
    && fs.existsSync(path.join(RAIZ, 'ios/vendor/legis/ArticleMapView.swift')),
    R + '(a) o "Mapa do artigo" do LEGIS (esquema estrutural) continua no Mac e no iPad');

  // (b) dado antigo
  const estMac = ler('mac/vendor/juris/Store/JurisEstadoPersistido.swift');
  const estIos = ler('ios/vendor/juris/Store/JurisEstadoPersistido.swift');
  ok(estMac !== '' && estMac === estIos, R + '(b) o formato do disco do JURIS é o mesmo no Mac e no iPad');
  ok(/var mapasFeitos: \[String\]\?/.test(estMac) && /var mapasSeeded: Bool\?/.test(estMac),
    R + '(b) os campos da galeria continuam no formato do disco (opcionais: arquivo antigo abre)');
  for (const plat of ['mac', 'ios']) {
    const ls = ler(plat + '/vendor/juris/Store/LibraryStore.swift');
    const usos = (ls.match(/\bmapasFeitos\b|\bmapasSeeded\b/g) || []).length;
    ok(usos === 0 && !/RECUPERAÇÃO/.test(ls),
      R + '(b) ' + plat + ': o LibraryStore não lê, não semeia nem grava a galeria (' + usos + ' uso(s))');
    ok(/legadoGaleria = Persisted\.LegadoGaleria\(de: s\)/.test(ls)
      && (ls.match(/legadoGaleria\.aplicar\(em: &s\)/g) || []).length === 2,
      R + '(b) ' + plat + ': o legado lido do disco volta nas duas gravações (state.json/iCloud e backup)');
    ok(!/private struct Persisted\b/.test(ls) && /typealias Persisted = JurisEstadoPersistido/.test(ls),
      R + '(b) ' + plat + ': o LibraryStore grava pelo JurisEstadoPersistido (o mesmo que o teste compila)');
  }
  if (process.platform !== 'darwin') {
    ok(true, R + '(b) decodificação do state.json antigo — pulada fora do macOS (no Mac: bash scripts/testar-estado-juris.sh)');
  } else {
    let saida = '', passou = true;
    try {
      saida = execFileSync('bash', [path.join(RAIZ, 'scripts', 'testar-estado-juris.sh')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      passou = false;
      saida = String(e.stdout || '') + String(e.stderr || '');
    }
    const casos = (saida.match(/^✓ /gm) || []).length;
    ok(passou && casos >= 10,
      R + '(b) state.json antigo com mapasFeitos abre, e a gravação devolve os campos iguais sem criá-los em quem não tinha ('
      + casos + ' conferências Swift)'
      + (passou ? '' : ' — ' + saida.split('\n').filter((l) => l.startsWith('✗') || /error:/.test(l)).join('; ').slice(0, 400)));
  }

  // (c) web
  const dc = ler('Catedra.dc.html');
  ok(!/mapa:\s*'Crie um MAPA MENTAL/.test(dc) && !/mapa:\s*'Mapa mental'/.test(dc),
    R + '(c) a geração por IA não tem mais o formato "mapa" (prompt e rótulo)');
  ok(!/\bisFmtMapa\b|\bfmtMapaShow\b|\bfmtMapaBtn\b|\bmfNodes\b|\b_mfPal\b/.test(dc),
    R + '(c) o render não monta mais o mapa (nós, paleta, botão, visibilidade)');
  ok(/texto:'Resumo em texto',audio:'Narração em áudio',cards:'Flashcards'/.test(dc)
    && /isFmtTexto:_mf==='texto', isFmtAudio:_mf==='audio'/.test(dc) && /isFmtCards:_mf==='cards'/.test(dc),
    R + '(c) texto, áudio e cards seguem como estavam');
  ok(/\['video','mapa'\]\.indexOf\(this\._load\('multiFmt', 'texto'\)\)>=0\?'texto'/.test(dc),
    R + '(c) preferência "mapa" salva cai no texto na abertura');
  const web = fs.readdirSync(RAIZ).filter((f) => /\.(html?|m?js|css)$/i.test(f) && !CONTEUDO.test(f));
  const falam = web.filter((f) => /mapa mental|mapas mentais|mindmap|mind map/i.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
  ok(web.length > 20 && falam.length === 0,
    R + '(c) nenhum HTML/JS/CSS do app (' + web.length + ' arquivos, satélites incluídos) fala em mapa mental'
    + (falam.length ? ' — ' + falam.join(', ') : ''));
  ok(fs.existsSync(path.join(RAIZ, 'mapa-processual.js')), R + '(c) o Mapa de Processo e peças continua (é outra coisa)');
}

/** Navegador: quem tinha "mapa" salvo abre no texto, e o que a IA gerou antes fica guardado. */
export async function testarSemMapasMentaisNavegador(page, base, ok, opcoes = {}) {
  const R = 'SEM MAPAS MENTAIS [' + (opcoes.motor || '?') + '] [' + (opcoes.origem || '?') + '] ';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const emArquivo = String(base).startsWith('file:');
  const erros = [];
  const pegaErro = (e) => {
    const m = String(e && e.message || e);
    if (!(emArquivo && /access control checks|Cross origin requests|Access-Control/i.test(m))) erros.push(m);
  };
  page.on('pageerror', pegaErro);
  try {
    // semeia SEM o app aberto (o autosave de 500 ms regravaria por cima)
    await page.goto(emArquivo ? base + '/' + arquivo : base + '/__semente');
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      localStorage.setItem('catedra:multiFmt', JSON.stringify('mapa'));
      localStorage.setItem('catedra:mfGen', JSON.stringify({ 'b1:mapa': { nodes: [{ title: 'Nó', text: 'guardado' }] }, 'b1:texto': { paras: ['p'] } }));
    });
    await page.goto(base + '/' + arquivo);
    await page.waitForFunction(() => !!window.__catedraApp, null, { timeout: 20000 });
    await page.waitForTimeout(1400);
    const r = await page.evaluate(() => {
      const app = window.__catedraApp;
      let gen = {};
      try { gen = JSON.parse(localStorage.getItem('catedra:mfGen') || '{}') || {}; } catch (_) {}
      return { fmt: app.state.multiFmt, estado: Object.keys(app.state.mfGen || {}).sort().join(','),
        disco: Object.keys(gen).sort().join(','), noDisco: !!(gen['b1:mapa'] && gen['b1:mapa'].nodes) };
    });
    ok(r.fmt === 'texto', R + 'preferência "mapa" salva abre como texto (' + r.fmt + ')');
    ok(r.estado === 'b1:mapa,b1:texto' && r.disco === 'b1:mapa,b1:texto' && r.noDisco,
      R + 'o que a IA gerou antes continua guardado, no estado e no disco (' + r.disco + ')');
    ok(!erros.length, R + 'sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
  } finally {
    page.off('pageerror', pegaErro);
    try { await page.evaluate(() => { localStorage.removeItem('catedra:multiFmt'); localStorage.removeItem('catedra:mfGen'); }); } catch (_) {}
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  testarSemMapasMentaisEstatico((c, l) => { console.log((c ? '✓ ' : '✗ ') + l); if (!c) falhas.push(l); });
  process.exit(falhas.length ? 1 : 0);
}
