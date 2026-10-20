// Compacta somente a lógica inerte do dc-runtime na cópia que será distribuída.
// O fonte, o template, o CSS e os scripts executáveis do host não são reescritos.
import { transformSync } from 'esbuild';

const MARCA = '/*! Cátedra: lógica compactada; esbuild 0.27.0; whitespace. */\n';

function localizarLogica(html) {
  const abertura = /<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  const fechamento = /<\/script\s*>/gi;
  const encontrados = [];
  let tag;
  while ((tag = abertura.exec(html))) {
    const atributos = new Map();
    const atributo = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let a;
    while ((a = atributo.exec(tag[1]))) {
      const nome = a[1].toLowerCase();
      if (atributos.has(nome)) throw new Error('Compactação abortada: atributo duplicado em <script>: ' + nome);
      atributos.set(nome, a[2] ?? a[3] ?? a[4] ?? '');
    }
    fechamento.lastIndex = abertura.lastIndex;
    const fim = fechamento.exec(html);
    if (!fim) throw new Error('Compactação abortada: <script> sem fechamento.');
    if ((atributos.get('type') || '').trim().toLowerCase() === 'text/x-dc' && atributos.has('data-dc-script')) {
      encontrados.push({ inicio: abertura.lastIndex, fim: fim.index });
    }
    // Conteúdo de script é texto bruto: um "<script" dentro da lógica não abre outra tag.
    abertura.lastIndex = fechamento.lastIndex;
  }
  if (encontrados.length !== 1) {
    throw new Error('Compactação abortada: esperado um único <script type="text/x-dc" data-dc-script>; encontrados ' + encontrados.length + '.');
  }
  return encontrados[0];
}

export function compactarLogica(html) {
  const { inicio, fim } = localizarLogica(html);
  const fonte = html.slice(inicio, fim);
  const { code } = transformSync(fonte, {
    loader: 'js', sourcefile: 'Catedra.dc.html:logica',
    minifyWhitespace: true, minifyIdentifiers: false, minifySyntax: false,
    target: 'esnext', legalComments: 'inline', keepNames: true, charset: 'utf8',
    // Os avisos de chaves duplicadas preexistentes continuam visíveis no build.
    logLevel: 'warning'
  });
  // esbuild conhece o contexto de script inline e escapa seus terminadores. Se isso
  // deixar de valer, abortamos em vez de reescrever strings ou alterar o limite HTML.
  if (/<\/script/i.test(code)) throw new Error('Compactação abortada: terminador HTML no JavaScript gerado.');
  // keepNames pode acrescentar auxiliares ao recompilar a própria saída. A marca
  // legal deixa a operação idempotente; a compilação acima continua validando-a.
  if (fonte.startsWith(MARCA)) return html;
  return html.slice(0, inicio) + MARCA + code + html.slice(fim);
}
