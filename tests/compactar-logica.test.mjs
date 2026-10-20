import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { compactarLogica } from '../scripts/compactar-logica.mjs';

const abrir = '<script type="text/x-dc" data-dc-script="">';
const htmlDe = codigo => '<!doctype html><main>Estudo sintético</main>' + abrir + codigo + '</script><footer>Fim</footer>';
const codigoDe = html => html.match(/<script\b[^>]*\bdata-dc-script[^>]*>([\s\S]*?)<\/script\s*>/i)[1];

// Mesmo contrato de evalDcLogic em support.js, em contexto isolado e sem navegador.
function avaliar(codigo) {
  const gravados = new Map();
  class Base {
    constructor() { this.state = {}; }
    setState(estado) { Object.assign(this.state, estado); }
  }
  const contexto = vm.createContext({ DCLogic: Base, StreamableLogic: Base,
    React: { createElement: (tag, props, texto) => ({tag, props, texto}) },
    localStorage: { setItem: (chave, valor) => gravados.set(chave, valor), getItem: chave => gravados.get(chave) ?? null },
    window: {}, console: { log() {}, warn() {}, error() {} } });
  const Component = new vm.Script('(function(DCLogic,StreamableLogic,React){\n' + codigo
    + '\n;return (typeof Component!=="undefined"&&Component)||undefined;\n})(DCLogic,StreamableLogic,React)').runInContext(contexto);
  return { Component, gravados };
}

const sintetico = [
  '//! @license teste sintético',
  'class Component extends DCLogic {',
  '  constructor() { super(); this.state = { sessoes: [], minutos: 0 }; }',
  '  registrar(materia, minutos) {',
  '    const sessao = { id: `sessao-${this.state.sessoes.length + 1}`, materia, minutos };',
  '    this.setState({ sessoes: [...this.state.sessoes, sessao], minutos: this.state.minutos + minutos });',
  "    localStorage.setItem('catedra:sessoes-sinteticas', JSON.stringify(this.state));",
  '    return sessao.id;',
  '  }',
  String.raw`  analisar(texto) { return /^(Civil|Penal)\s+(\d+)\/m$/u.exec(texto)?.slice(1) ?? []; }`,
  '  modelo(nome) { return `Estudo de ${nome}:  espaços  preservados\nlinha seguinte`; }',
  '  bruto() { return String.raw`a\\nb`; }',
  '  asi() { return',
  '    { ignorado: true };',
  '  }',
  '  soma() { let n = 1',
  '    n++',
  '    return n',
  '  }',
  '  tipo() { return [Component.name, this.registrar.name, DCLogic === StreamableLogic]; }',
  "  elemento() { return React.createElement('strong', { id: 'sintetico' }, 'Concluído'); }",
  "  terminador() { return '<' + '/script>'; }",
  '}'
].join('\n');

function exercitar(codigo) {
  const { Component, gravados } = avaliar(codigo);
  const instancia = new Component();
  const ids = [instancia.registrar('Civil', 25), instancia.registrar('Penal', 15)];
  return {
    nome: Component.name, ids, estado: JSON.stringify(instancia.state), gravados: [...gravados],
    regex: JSON.stringify(instancia.analisar('Civil 25/m')),
    template: instancia.modelo('Processo Civil'), bruto: instancia.bruto(),
    asi: instancia.asi(), soma: instancia.soma(), tipo: JSON.stringify(instancia.tipo()),
    elemento: JSON.stringify(instancia.elemento()), terminador: instancia.terminador()
  };
}

test('compactação preserva ações, persistência sintética, regex, templates, ASI e nomes', () => {
  const compacto = codigoDe(compactarLogica(htmlDe(sintetico)));
  const original = exercitar(sintetico);
  assert.deepEqual(exercitar(compacto), original);
  assert.equal(original.estado, '{"sessoes":[{"id":"sessao-1","materia":"Civil","minutos":25},{"id":"sessao-2","materia":"Penal","minutos":15}],"minutos":40}');
  assert.equal(original.regex, '["Civil","25"]');
  assert.equal(original.template, 'Estudo de Processo Civil:  espaços  preservados\nlinha seguinte');
  assert.equal(original.bruto, 'a\\nb');
  assert.equal(original.asi, undefined);
  assert.equal(original.soma, 2);
  assert.equal(original.tipo, '["Component","registrar",true]');
  assert.equal(original.terminador, '</script>');
});

test('só o corpo da lógica muda, inclusive com atributos reordenados e conteúdo HTML em strings', () => {
  const prefixo = '<style>main { color: red; }</style><script src="auth.js"></script>'
    + '<script>window.registro = "  preservar  ";</script><main>{{ titulo }}</main>'
    + "<script data-props='{}' data-dc-script type='text/x-dc'>";
  const sufixo = '</script><script src="support.js"></script><p>  Preservar\n layout </p>';
  const codigo = 'class Component extends DCLogic { html() { return "<script> sintético"; } }';
  const out = compactarLogica(prefixo + codigo + sufixo);
  assert.ok(out.startsWith(prefixo));
  assert.ok(out.endsWith(sufixo));
  assert.equal(new (avaliar(codigoDe(out)).Component)().html(), '<script> sintético');
});

test('segunda compactação mantém comportamento e bytes estáveis', () => {
  const uma = compactarLogica(htmlDe(sintetico));
  const duas = compactarLogica(uma);
  assert.deepEqual(exercitar(codigoDe(duas)), exercitar(codigoDe(uma)));
  assert.equal(duas, uma);
});

test('ausência, duplicação, fechamento ausente e erro de sintaxe abortam sem saída parcial', () => {
  assert.throws(() => compactarLogica('<main>Sem lógica</main>'), /encontrados 0/);
  assert.throws(() => compactarLogica(htmlDe(sintetico) + htmlDe(sintetico)), /encontrados 2/);
  assert.throws(() => compactarLogica(abrir + sintetico), /sem fechamento/);
  assert.throws(() => compactarLogica(htmlDe('class Component extends {')), /Transform failed/);
  const marcado = codigoDe(compactarLogica(htmlDe(sintetico)));
  assert.throws(() => compactarLogica(htmlDe(marcado + '\nconst =;')), /Transform failed/);
  assert.throws(() => compactarLogica('<script type="text/x-dc" type="text/javascript" data-dc-script></script>'), /atributo duplicado/);
  assert.throws(() => compactarLogica('<script data-type="text/x-dc" data-dc-script></script>'), /encontrados 0/);
});

test('lógica real continua avaliável pelo contrato do runtime, com Component e métodos preservados', () => {
  const fonte = readFileSync(new URL('../Catedra.dc.html', import.meta.url), 'utf8');
  const compacto = compactarLogica(fonte);
  const original = avaliar(codigoDe(fonte)).Component;
  const distribuido = avaliar(codigoDe(compacto)).Component;
  assert.equal(original.name, 'Component');
  assert.equal(distribuido.name, original.name);
  assert.deepEqual(Object.getOwnPropertyNames(distribuido.prototype), Object.getOwnPropertyNames(original.prototype));
  assert.equal(distribuido.prototype.renderVals.name, original.prototype.renderVals.name);
  assert.ok(Buffer.byteLength(compacto) < Buffer.byteLength(fonte));
});
