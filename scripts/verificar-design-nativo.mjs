// scripts/verificar-design-nativo.mjs — catraca de design do LEGIS/JURIS nativos.
//
// POR QUE ISTO EXISTE: a reformulação de 25/09/2026 criou uma base visual única
// (ios/vendor/design). Fora dela, cada hex, .white/.black literal, .system(size:) e emoji
// usado como ícone é dívida a migrar (spec §9). Esta checagem CONTA essas ocorrências em
// {mac,ios}/vendor/{legis,juris} e FALHA se alguma contagem subir em relação à linha de base
// (scripts/design-nativo-base.json). A base só desce: `--atualizar` recusa gravar aumento.
//
//   node scripts/verificar-design-nativo.mjs              confere
//   node scripts/verificar-design-nativo.mjs --atualizar  grava a contagem atual (só se não subiu)
//   node scripts/verificar-design-nativo.mjs --criar      grava a primeira linha de base
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'scripts', 'design-nativo-base.json');
const LADOS = ['mac', 'ios'];
const PASTAS = ['vendor/legis', 'vendor/juris'];

export const PADROES = {
  cores: /Color\(\s*(?:hex|red|white):|Color\(\s*\.sRGB|NSColor\(\s*(?:srgbRed|red|white|calibratedRed|deviceRed):|Color\.(?:red|blue|green|orange|yellow|purple|pink|gray|grey|indigo|teal|mint|cyan|brown)\b/g,
  pretoBranco: /\.(?:white|black)\b/g,
  tamanhos: /\.system\(\s*size:/g,
  emoji: /\p{Extended_Pictographic}/gu,
};

// Emoji que é DADO, não ícone — com o motivo. Qualquer outro emoji conta.
export const PERMITIDOS = [
  { arquivo: 'vendor/juris/Views/EntryDetailView.swift', trecho: /\("(?:Ícones de estudo|Jurídicos|Setas|Marcadores)"/,
    motivo: 'paleta de símbolos que a pessoa insere no texto da própria nota' },
  { arquivo: 'vendor/legis/RichNoteEditor.swift', trecho: /^\s*\("(?:❓|❗|💡|🚩)"|allTags/,
    motivo: 'etiquetas já gravadas nas notas — trocar apagaria o significado do que está salvo' },
  { arquivo: 'vendor/juris/Store/Exporter.swift', trecho: /Inverte o operador/,
    motivo: 'setas (↔) dentro de um texto explicativo' },
];

const semComentario = (linha) => linha.replace(/(^|\s)\/\/.*$/, '$1');

function arquivosSwift(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? arquivosSwift(p) : e.name.endsWith('.swift') ? [p] : [];
  });
}

export function contar(lado) {
  const tot = { cores: 0, pretoBranco: 0, tamanhos: 0, emoji: 0 };
  for (const pasta of PASTAS) {
    for (const f of arquivosSwift(join(ROOT, lado, pasta))) {
      const rel = relative(join(ROOT, lado), f).split('\\').join('/');
      for (const linha of readFileSync(f, 'utf8').split('\n')) {
        const cod = semComentario(linha);
        for (const k of ['cores', 'pretoBranco', 'tamanhos']) tot[k] += (cod.match(PADROES[k]) || []).length;
        const em = cod.match(PADROES.emoji) || [];
        if (em.length && !PERMITIDOS.some((a) => a.arquivo === rel && a.trecho.test(cod))) tot.emoji += em.length;
      }
    }
  }
  return tot;
}

export function verificar() {
  const atual = Object.fromEntries(LADOS.map((l) => [l, contar(l)]));
  if (!existsSync(BASE)) return { atual, base: null, falhas: ['sem linha de base — rode com --criar'] };
  const base = JSON.parse(readFileSync(BASE, 'utf8'));
  const falhas = [];
  for (const lado of LADOS) {
    for (const [k, v] of Object.entries(atual[lado])) {
      const b = base[lado]?.[k];
      if (b === undefined) falhas.push(`${lado}.${k}: sem linha de base`);
      else if (v > b) falhas.push(`${lado}.${k}: ${v} (a base é ${b} — migre para ios/vendor/design em vez de somar)`);
    }
  }
  return { atual, base, falhas };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const criar = process.argv.includes('--criar');
  const atualizar = process.argv.includes('--atualizar');
  const r = verificar();
  if (criar) {
    if (r.base) { console.error('✗ a linha de base já existe — use --atualizar'); process.exit(1); }
    writeFileSync(BASE, JSON.stringify(r.atual, null, 2) + '\n');
    console.log('✓ linha de base criada:', JSON.stringify(r.atual));
  } else if (r.falhas.length) {
    console.error('\n✗ BUILD ABORTADO — a dívida visual do LEGIS/JURIS nativos subiu:\n  ' + r.falhas.join('\n  ') + '\n');
    process.exit(1);
  } else if (atualizar) {
    writeFileSync(BASE, JSON.stringify(r.atual, null, 2) + '\n');
    console.log('✓ linha de base rebaixada:', JSON.stringify(r.atual));
  } else {
    console.log('  ✓ design nativo: nenhuma dívida visual nova —', LADOS.map((l) => `${l} ${JSON.stringify(r.atual[l])}`).join(' · '));
  }
}
