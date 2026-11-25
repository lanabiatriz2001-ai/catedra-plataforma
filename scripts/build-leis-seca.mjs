// scripts/build-leis-seca.mjs — texto das leis mais cobradas, em artigos, para o treino.
//
// Por que existe: a prova oral e o simulado de LEI SECA rodam dentro do Cátedra (web), e o
// texto da lei vinha do proxy /api/law — que só existe no deploy. No app (Mac e iPad) a
// página roda em file:// e o proxy não responde: a tela ficava vazia. Aqui o texto entra no
// bundle, já quebrado em artigos, e o treino funciona off-line nos três lugares.
//
// Fonte: planalto.gov.br (texto compilado oficial). Guardamos só o que a lei diz — é
// domínio público, e o mesmo texto que o CátedraLEGIS já lê.
//
// Saída: leis-seca.js → window.CT_LEIS = [{sigla, nome, url, artigos:[{rot, txt}]}]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// Um parser só: o sentinela (scripts/sentinela.mjs) compara a página de hoje com o que este
// build gravou, e qualquer diferença de recorte entre os dois viraria "alteração" falsa. Até
// 01/10/2026 havia aqui uma cópia própria de limparHTML/artigos/artigosCorrido/catalogo; ela
// saiu depois de conferida, saída a saída, contra a da lib (14 leis × 3 formatos de página).
import { ROOT, catalogo, lerLeisSeca } from './lib/planalto.mjs';

// Uso alternativo (leis de OUTRAS áreas de estudo): node scripts/build-leis-seca.mjs <alvos.json> <saida.js> <NOME_GLOBAL>
//   alvos.json = [["SIGLA","título como está no catálogo do legis-web"], …]
//   --aceitar-queda=SIGLA[,SIGLA]  grava mesmo com a lei abaixo de 80% dos artigos do arquivo atual
const ARGV = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ACEITAR_QUEDA = new Set(((process.argv.find((a) => a.startsWith('--aceitar-queda=')) || '').split('=')[1] || '').split(',').filter(Boolean));
const SAIDA = ARGV[1] || 'leis-seca.js';
const GLOBAL = ARGV[2] || 'CT_LEIS';
const ALVOS = ARGV[0] ? JSON.parse(readFileSync(ARGV[0], 'utf8')) : [
  ['CF', 'Constituição Federal'], ['CC', 'Código Civil'], ['CPC', 'Código de Processo Civil'],
  ['CP', 'Código Penal'], ['CPP', 'Código de Processo Penal'], ['CDC', 'Código de Defesa do Consumidor'],
  ['CTN', 'Código Tributário Nacional'], ['CLT', 'Consolidação das Leis do Trabalho'],
  ['LIA', 'Lei de Improbidade Administrativa'], ['Lei 14.133/2021', 'Lei de Licitações e Contratos'],
  ['ECA', 'Estatuto da Criança e do Adolescente'], ['LEP', 'Lei de Execução Penal'],
  ['Maria da Penha', 'Lei Maria da Penha'], ['Lei de Drogas', 'Lei de Drogas'],
];

const CAT = catalogo();
// O arquivo atual, para a trava de leitura parcial: quantos artigos cada lei tinha (só os de rótulo
// "Art…"; até 25/11/2026 o acervo também guardava remissões "art. …" como se fossem artigos).
const ANTERIORES = (() => {
  try {
    const w = {};
    new Function('window', readFileSync(join(ROOT, SAIDA), 'utf8'))(w);
    return new Map((w[GLOBAL] || []).map((l) => [l.sigla, l.artigos.filter((a) => /^Art/.test(a.rot)).length]));
  } catch (_) { return new Map(); }
})();
// Lei que falha NÃO some do acervo: até 25/11/2026 o build seguia sem ela e gravava o arquivo com
// uma lei a menos (o DL 200 saiu assim de leis-seca-areas.js numa queda de rede). Agora cada lei
// tem três tentativas; se alguma ainda falhar, nada é gravado e o build sai com erro.
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function baixarHTML(url) {
  let erro;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      // Prazo de 60 s por tentativa: sem ele, o fetch espera até 300 s por cabeçalho e por pedaço do corpo.
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.arrayBuffer();
    } catch (e) {
      erro = e;
      if (tentativa < 3) await esperar(2000 * tentativa);
    }
  }
  throw erro;
}
// A leitura continua pelo fetch (baixarHTML, acima); o recorte e as travas vêm da lib. Não usar
// baixarLei: o filtro de hosts dela (planalto/stf/stj) recusaria uma lei do catálogo hospedada fora do
// Planalto.
const { saida, falhas } = await lerLeisSeca(ALVOS, { cat: CAT, baixar: baixarHTML, anteriores: ANTERIORES, aceitarQueda: ACEITAR_QUEDA, log: console.log });
if (falhas.length) {
  console.error(`\nNada gravado: ${falhas.length} de ${ALVOS.length} lei(s) falharam (${falhas.join('; ')}). ${SAIDA} ficou como estava.`);
  process.exit(1);
}

const cab = `/* Cátedra — TEXTO DAS LEIS MAIS COBRADAS, em artigos.
 *
 * Gerado por scripts/build-leis-seca.mjs a partir do texto compilado do Planalto.
 * Alimenta a prova oral e o simulado de LEI SECA dentro do Cátedra — que antes dependiam
 * do proxy /api/law e por isso não funcionavam no app (file://).
 *
 * Não editar à mão: rode o script para atualizar quando a lei mudar.
 */
`;
writeFileSync(join(ROOT, SAIDA), cab + 'window.' + GLOBAL + ' = ' + JSON.stringify(saida) + ';\n');
const tot = saida.reduce((s, l) => s + l.artigos.length, 0);
console.log(`\n${SAIDA}: ${saida.length} leis, ${tot.toLocaleString('pt-BR')} artigos`);
