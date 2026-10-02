// scripts/lib-cores-ramo.mjs — a tabela CT_CORES_RAMO e a função CT_COR_RAMO lidas do PRÓPRIO Catedra.dc.html
// (fonte única da cor por matéria), para scripts e testes que rodam fora do navegador.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function carregarCoresRamo(raiz) {
  const html = readFileSync(join(raiz, 'Catedra.dc.html'), 'utf8');
  const ini = html.indexOf('const CT_CORES_RAMO = {');
  const fn = ini < 0 ? -1 : html.indexOf('function CT_COR_RAMO(', ini);
  const fim = fn < 0 ? -1 : html.indexOf('\n}\n', fn);
  if (ini < 0 || fn < 0 || fim < 0) throw new Error('CT_CORES_RAMO/CT_COR_RAMO não encontrados no Catedra.dc.html');
  return new Function(html.slice(ini, fim + 2) + '\nreturn { tabela: CT_CORES_RAMO, corRamo: CT_COR_RAMO };')();
}
