import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../sobre.html', import.meta.url), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '');
const frase = 'Quando abrir, R$ 197 por ano (valor previsto, pode mudar).';

test('a caixa do beta traz exatamente a frase aprovada', () => {
  const caixa = html.match(/<div class="honesto">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.ok(caixa.includes(`<p class="preco-beta">${frase}</p>`));
  assert.equal(html.split(frase).length - 1, 1);
});

test('a página não contém outro preço nem termos de assinatura', () => {
  assert.doesNotMatch(html.replace(frase, ''), /R\$|por mês|assinatura por/i);
});
