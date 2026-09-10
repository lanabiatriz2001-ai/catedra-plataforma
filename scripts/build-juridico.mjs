// scripts/build-juridico.mjs — Termos de uso e Política de privacidade DENTRO do app.
//
// Lê docs/juridico/termos-de-uso.md e docs/juridico/politica-de-privacidade.md e gera, na
// raiz do repositório (versionados, como questoes-enam.js):
//   · termos.html e privacidade.html — páginas avulsas, sem rede, sem CDN, com os tokens do
//     design (var(--x, fallback)) e modo escuro por prefers-color-scheme; abrem no site, no
//     app do Mac/iPad (file://) e dentro do host por <iframe>;
//   · juridico.js — window.CT_JURIDICO: a versão e a data vigentes de cada documento e
//     aceiteVigente(), a função pura que o portão de login (auth.js) e o host consultam.
//
// Conversor Markdown→HTML mínimo e próprio: só o que os dois documentos usam (títulos, parágrafos,
// negrito, itálico, listas, tabela, nota de rodapé). Sem dependência externa. O TEXTO dos
// documentos não é alterado aqui — quem muda o texto muda o .md.
//
// A única coisa que o build PREENCHE são os dados do controlador e os prazos, lidos de
// docs/juridico/controlador.json (o único lugar a editar antes de publicar). Enquanto faltar
// algum, o marcador entre colchetes fica no texto e a página sai carimbada como rascunho; com
// tudo preenchido, o carimbo e a nota de rodapé "¹ Os campos entre colchetes…" somem sozinhos.
//
// Importado pelos dois builds (scripts/build.mjs e scripts/build-macos.mjs), que copiam os três
// arquivos; roda também sozinho: `node scripts/build-juridico.mjs`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = [
  { id: 'termos', md: 'docs/juridico/termos-de-uso.md', html: 'termos.html', titulo: 'Termos de uso', irmao: { html: 'privacidade.html', titulo: 'Política de privacidade' } },
  { id: 'privacidade', md: 'docs/juridico/politica-de-privacidade.md', html: 'privacidade.html', titulo: 'Política de privacidade', irmao: { html: 'termos.html', titulo: 'Termos de uso' } },
];

export function escapar(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/** Negrito, itálico e links dentro de uma linha (o texto já vem escapado). */
export function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

/** Cabeçalho do documento: "**Versão 1.0 — …**" e "**Data: 02/09/2026**". */
export function cabecalho(md) {
  const v = /\*\*Vers[ãa]o\s+([\d.]+)([^*]*)\*\*/i.exec(md), d = /\*\*Data:\s*([\d/]+)\*\*/i.exec(md);
  const iso = d ? d[1].split('/').reverse().join('-') : '';
  return { versao: v ? v[1] : '', nota: v ? v[2].replace(/^\s*[—-]\s*/, '').trim() : '', data: d ? d[1] : '', dataISO: iso };
}

/** Marcadores do texto → campo de docs/juridico/controlador.json. Os prazos carregam a proposta no próprio marcador. */
export const CAMPOS = [
  { campo: 'controlador', re: /\[RAZÃO SOCIAL \/ NOME DO CONTROLADOR\]/g, rotulo: 'razão social ou nome do controlador' },
  { campo: 'cnpjCpf', re: /\[CNPJ\/CPF\]/g, rotulo: 'CNPJ ou CPF' },
  { campo: 'endereco', re: /\[ENDEREÇO\]/g, rotulo: 'endereço' },
  { campo: 'emailContato', re: /\[E-MAIL DE CONTATO\]/g, rotulo: 'e-mail de contato' },
  { campo: 'emailEncarregado', re: /\[E-MAIL DO ENCARREGADO\]/g, rotulo: 'e-mail do encarregado' },
  { campo: 'prazos.avisoEncerramentoDias', re: /\[ENCERRAMENTO:\s*\d+\]/g, rotulo: 'prazo de aviso de encerramento', numero: true },
  { campo: 'prazos.avisoMudancaDias', re: /\[MUDANÇA:\s*\d+\]/g, rotulo: 'prazo de aviso de mudança', numero: true },
  { campo: 'prazos.exclusaoNuvemDias', re: /\[EXCLUSÃO:\s*\d+\]/g, rotulo: 'prazo de exclusão da nuvem', numero: true },
  { campo: 'prazos.retencaoIaMeses', re: /\[RETENÇÃO IA:\s*\d+\]/g, rotulo: 'retenção da contagem de IA', numero: true },
];

export function lerControlador() {
  const p = join(ROOT, 'docs/juridico/controlador.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/**
 * Preenche os marcadores com os dados do controlador. Pura: devolve o Markdown preenchido e a lista
 * do que ainda falta (rótulos). Campo vazio mantém o marcador; com tudo preenchido, a nota de rodapé
 * "¹ Os campos entre colchetes…" e as chamadas "¹" no texto saem, porque deixam de ser verdade.
 */
export function preencher(md, dados) {
  const d = dados || {}, faltam = [];
  let s = String(md || '');
  for (const c of CAMPOS) {
    const v = c.campo.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : ''), d);
    const val = String(v).trim();
    if (!val || (c.numero && !/^\d+$/.test(val))) { faltam.push(c.rotulo); continue; }
    s = s.replace(c.re, val.replace(/\$/g, '$$$$'));
  }
  if (!faltam.length) s = s.replace(/^¹ Os campos entre colchetes[^\n]*\n?/m, '').replace(/¹(?=[\s.,;)]|$)/gm, '');
  return { md: s, faltam };
}

/** Markdown → HTML: só as construções que os documentos jurídicos usam. */
export function converterMarkdown(md) {
  const linhas = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = []; let par = [], lista = null, tabela = null;
  const fecharPar = () => { if (par.length) { out.push('<p>' + inline(escapar(par.join(' '))) + '</p>'); par = []; } };
  const fecharLista = () => { if (lista) { out.push('<ul>' + lista.map((x) => '<li>' + inline(escapar(x)) + '</li>').join('') + '</ul>'); lista = null; } };
  const fecharTabela = () => {
    if (!tabela) return;
    const [cab, ...corpo] = tabela;
    const cel = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    let h = '<div class="tabela"><table><thead><tr>' + cel(cab).map((c) => '<th>' + inline(escapar(c)) + '</th>').join('') + '</tr></thead><tbody>';
    for (const l of corpo) h += '<tr>' + cel(l).map((c) => '<td>' + inline(escapar(c)) + '</td>').join('') + '</tr>';
    out.push(h + '</tbody></table></div>'); tabela = null;
  };
  const fecharTudo = () => { fecharPar(); fecharLista(); fecharTabela(); };
  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    if (!l.trim()) { fecharTudo(); continue; }
    const h = /^(#{1,3})\s+(.+)$/.exec(l);
    if (h) { fecharTudo(); const n = h[1].length; const id = escapar(h[2]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); out.push('<h' + n + (n > 1 ? ' id="' + id + '"' : '') + '>' + inline(escapar(h[2])) + '</h' + n + '>'); continue; }
    if (/^\|/.test(l)) { fecharPar(); fecharLista(); if (/^\|\s*-{2,}/.test(l)) continue; (tabela = tabela || []).push(l); continue; }
    if (/^[-*]\s+/.test(l)) { fecharPar(); fecharTabela(); (lista = lista || []).push(l.replace(/^[-*]\s+/, '')); continue; }
    if (/^---+$/.test(l)) { fecharTudo(); out.push('<hr>'); continue; }
    if (/^[¹²³⁴⁵⁶⁷⁸⁹]/.test(l)) { fecharTudo(); out.push('<p class="nota">' + inline(escapar(l)) + '</p>'); continue; }
    if (lista && /^\s{2,}/.test(bruta)) { lista[lista.length - 1] += ' ' + l.trim(); continue; }
    fecharLista(); fecharTabela(); par.push(l.trim());
  }
  fecharTudo();
  return out.join('\n');
}

const CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg, #f7f4ec); color: var(--ink, #1c1a16); font-family: var(--body, -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif); line-height: 1.65; -webkit-font-smoothing: antialiased; }
@media (prefers-color-scheme: dark) { body { background: var(--bg, #15171a); color: var(--ink, #ecebe6); } .topo, .rodape { border-color: var(--border, #2b3138) !important; } th, td { border-color: var(--border, #2b3138) !important; } .nota, .meta { color: var(--text3, #9aa4ad) !important; } a { color: var(--accentD, #7fd4b5) !important; } }
main { max-width: 760px; margin: 0 auto; padding: 28px clamp(16px, 4vw, 40px) 64px; }
.topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px clamp(16px, 4vw, 40px); border-bottom: 1px solid var(--border, #e6e1d4); font-size: 13px; }
.topo b { font-family: var(--display, "Spectral", Georgia, serif); font-size: 16px; }
.topo nav { display: flex; gap: 14px; flex-wrap: wrap; }
h1 { font-family: var(--display, "Spectral", Georgia, serif); font-size: clamp(26px, 4vw, 34px); line-height: 1.15; letter-spacing: -.01em; margin: 0 0 6px; }
h2 { font-family: var(--display, "Spectral", Georgia, serif); font-size: 20px; margin: 30px 0 8px; letter-spacing: -.01em; }
h3 { font-size: 16px; margin: 20px 0 6px; }
p { margin: 0 0 12px; }
ul { margin: 0 0 12px; padding-left: 22px; }
li { margin: 4px 0; }
a { color: var(--accentD, #0b5a40); text-underline-offset: 2px; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--accent, #0f7a57); outline-offset: 2px; }
.meta { font-size: 13px; color: var(--text3, #7a7368); margin-bottom: 20px; }
.nota { font-size: 13px; color: var(--text3, #7a7368); border-top: 1px dashed var(--border, #e6e1d4); padding-top: 10px; margin-top: 24px; }
.tabela { overflow-x: auto; margin: 0 0 14px; }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
th, td { border: 1px solid var(--border, #e6e1d4); padding: 8px 10px; text-align: left; vertical-align: top; }
th { font-weight: 700; }
.rodape { border-top: 1px solid var(--border, #e6e1d4); margin-top: 32px; padding-top: 14px; font-size: 13px; display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.rodape a, .topo a { min-height: 44px; display: inline-flex; align-items: center; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`;

export function montarPagina(doc, md, faltam) {
  const cab = cabecalho(md);
  if (faltam && faltam.length) cab.nota = (cab.nota ? cab.nota + ' — ' : '') + 'rascunho: faltam ' + faltam.length + ' dado(s) do controlador';
  const corpo = converterMarkdown(md.replace(/^\*\*Vers[ãa]o[^\n]*\n\*\*Data:[^\n]*\n?/m, ''));
  return '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + escapar(doc.titulo) + ' — Cátedra</title>\n<meta name="robots" content="noindex">\n<style>' + CSS + '</style>\n</head>\n<body>\n'
    + '<header class="topo"><b>Cátedra</b><nav><a href="./' + doc.irmao.html + '">' + doc.irmao.titulo + '</a><a href="#" data-fechar="1" onclick="if(window.parent!==window){window.parent.postMessage({type:\'ctFecharDoc\'},\'*\');}else if(history.length>1){history.back();}else{location.href=\'./\';}return false;">Voltar ao app</a></nav></header>\n'
    + '<main>\n<div class="meta">Versão ' + escapar(cab.versao) + (cab.nota ? ' — ' + escapar(cab.nota) : '') + (cab.data ? ' · ' + escapar(cab.data) : '') + '</div>\n' + corpo + '\n'
    + '<footer class="rodape"><a href="./' + doc.irmao.html + '">' + doc.irmao.titulo + '</a><span>Versão ' + escapar(cab.versao) + (cab.data ? ' · ' + escapar(cab.data) : '') + '</span></footer>\n</main>\n</body>\n</html>\n';
}

/** Gera os três arquivos e devolve o resumo. */
export function gerar() {
  const info = {}, dados = lerControlador();
  let faltamTotal = [];
  for (const doc of DOCS) {
    const { md, faltam } = preencher(readFileSync(join(ROOT, doc.md), 'utf8'), dados);
    const cab = cabecalho(md);
    if (!cab.versao) throw new Error(doc.md + ': sem linha "**Versão X.Y …**" no cabeçalho — o aceite é versionado e precisa dela');
    writeFileSync(join(ROOT, doc.html), montarPagina(doc, md, faltam));
    info[doc.id] = { versao: cab.versao, data: cab.dataISO, titulo: doc.titulo, arquivo: doc.html };
    faltamTotal = faltamTotal.concat(faltam.filter((f) => !faltamTotal.includes(f)));
  }
  if (faltamTotal.length) console.warn('  ⚠ Termos/Política saem como RASCUNHO — faltam em docs/juridico/controlador.json: ' + faltamTotal.join(', '));
  // a versão vigente do aceite é o par: mudou qualquer um dos dois, pede-se aceite de novo
  const versao = info.termos.versao + '/' + info.privacidade.versao;
  const js = '// juridico.js — GERADO por scripts/build-juridico.mjs a partir de docs/juridico/*.md. Não editar à mão.\n'
    + '// A versão vigente do aceite é "termos/privacidade"; catedra:aceite guarda {versao, ts}.\n'
    + '(function (raiz) {\n  var J = ' + JSON.stringify({ versao, termos: info.termos, privacidade: info.privacidade }) + ';\n'
    + '  /** true quando o aceite guardado ({versao, ts}, objeto ou JSON) é da versão vigente. Puro, sem estado. */\n'
    + '  J.aceiteVigente = function (v) { try { if (typeof v === "string") v = JSON.parse(v); } catch (e) { return false; } return !!(v && v.versao === J.versao && +v.ts > 0); };\n'
    + '  raiz.CT_JURIDICO = J;\n})(typeof window !== "undefined" ? window : globalThis);\n';
  writeFileSync(join(ROOT, 'juridico.js'), js);
  return { versao, info };
}

const r = gerar();
console.log('  ✓ termos.html + privacidade.html + juridico.js (aceite versão ' + r.versao + ')');
