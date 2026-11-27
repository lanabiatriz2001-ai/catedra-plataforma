/* ADMINISTRAÇÃO: PANORAMA E RESPOSTA POR E-MAIL (25/11/2026) — admin-console.js
   Parte 1 (Node, sem navegador): os seis números do Panorama (o que falha vira "indisponível"
   com o motivo, nunca 0), o mailto: da resposta, a nota com prefixo datado e o status depois
   da resposta — conferidos contra o SQL (tetos, valores de status, checagem de is_admin).
   Parte 2 (navegador): o cartão na Visão geral e o "Responder por e-mail" → "Registrar
   resposta" no Suporte, com as RPCs simuladas, no iPad (820×1180, toque) e em UTC−4. Também:
   relato com emoji no corte (o render não cai), "Marcar como lido", rascunho por relato, as
   escritas que releem a nota (status, Nota interna, registro), apagar uma nota de várias linhas,
   cada fonte que falha sozinha (e os painéis vizinhos sem a visão geral) e o app do Mac, onde o
   mailto: não sai do WKWebView e o link vira "Copiar endereço".
   Roda sozinho: node tests/admin-visao-feedback.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'admin-console.js'), 'utf8'), caixa);
  return caixa.window.CT_ADMIN;
}
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const DIA = 864e5;

export function testarAdminVisaoFeedbackEstatico(ok) {
  const R = 'ADMIN ';
  let A = null;
  try { A = carregar(); } catch (e) { ok(false, R + 'admin-console.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!A && typeof A.panorama === 'function' && typeof A.mailtoResposta === 'function' && typeof A.notaComResposta === 'function', R + 'publica panorama, mailtoResposta e notaComResposta');

  /* ---- Panorama ---- */
  const AGORA = Date.UTC(2026, 10, 26, 1, 30);
  const visao = { saude: { contas: 13, ativos7d: 2, ativos30d: 5, nuncaVoltaram: 3 }, testadores: [
    { criadoEm: new Date(AGORA - 2 * DIA).toISOString() }, { criadoEm: new Date(AGORA - 7 * DIA).toISOString() },
    { criadoEm: new Date(AGORA - 7 * DIA - 1).toISOString() }, { criadoEm: new Date(AGORA - 40 * DIA).toISOString() },
    { criadoEm: null }, { criadoEm: 'lixo' }] };
  // não lido (lido=false) e em aberto (status ≠ resolvido) dão números diferentes de propósito
  const FB = [{ id: 1, lido: false, status: 'resolvido' }, { id: 2, lido: true, status: 'novo' }, { id: 3, lido: true, status: 'andamento' }, { id: 4, lido: false, status: 'novo' }];
  const ERR = [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }];
  const pano = (extra) => {
    const lista = A.panorama(Object.assign({ carregado: true, agora: AGORA, visao, feedback: FB, erros: ERR, listaEspera: { n: 4, motivo: '' }, telemetria: true }, extra || {}));
    const m = {}; lista.forEach(x => { m[x.id] = x; }); return { lista, m };
  };
  const { lista, m } = pano();
  ok(lista.map(x => x.id).join() === 'contas,ativas7,ativas30,espera,naoLidos,erros24', R + 'o Panorama tem os seis números pedidos, nesta ordem (' + lista.map(x => x.id).join() + ')');
  ok(m.contas.valor === '13' && m.contas.detalhe === '2 nos últimos 7 dias', R + 'contas criadas: o total e quantas nos últimos 7 dias, com o 7º dia dentro e data inválida fora (' + m.contas.detalhe + ')');
  ok(m.ativas7.valor === '2' && m.ativas30.valor === '5' && m.ativas7.rotulo === 'Ativas em 7 dias' && m.ativas30.rotulo === 'Ativas em 30 dias', R + 'ativas em 7 e em 30 dias vêm da saúde da visão geral');
  // o SQL conta last_sign_in_at (login novo, não uso): o detalhe diz "fizeram login", não "entraram"
  ok(m.ativas7.detalhe === 'fizeram login na última semana' && m.ativas30.detalhe === 'fizeram login no último mês' && /'ativos7d',\s+count\(\*\) filter \(where last_sign_in_at/.test(ler('supabase-admin.sql')),
    R + 'o detalhe de "ativas" diz o que o SQL conta: login, não uso (' + m.ativas7.detalhe + ')');
  ok(m.espera.valor === '4' && !m.espera.indisponivel, R + 'lista de espera conta os inscritos');
  ok(m.naoLidos.valor === '2' && m.naoLidos.detalhe === 'de 4 relatos' && FB.filter(f => f.status !== 'resolvido').length === 3, R + 'não lidos contam lido=false (2), não os em aberto (3)');
  ok(m.erros24.valor === '3' && m.erros24.detalhe === 'recebidos pela telemetria', R + 'erros das últimas 24 h: a contagem do que admin_erros_cliente(24) devolveu');
  ok(lista.every(x => typeof x.valor === 'string' && typeof x.detalhe === 'string' && x.indisponivel === false), R + 'tudo carregado: nenhum item indisponível');

  // lista de espera: ausente, com erro, sem rede ou resposta estranha → indisponível com motivo, nunca 0
  const ausente = A.listaEspera({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.admin_lista_espera without parameters in the schema cache' } });
  ok(ausente.n === null && ausente.motivo === 'função ausente no banco', R + 'RPC fora do banco (PGRST202) é "função ausente no banco"');
  const semFuncao = pano({ listaEspera: ausente }).m.espera;
  ok(semFuncao.valor === 'indisponível' && semFuncao.detalhe === 'função ausente no banco' && semFuncao.indisponivel === true, R + 'RPC ausente: o número vira "indisponível" com o motivo — nunca 0');
  ok(A.listaEspera({ data: null, error: { code: '42883', message: 'function public.admin_lista_espera() does not exist' } }).motivo === 'função ausente no banco', R + 'função inexistente no Postgres (42883) também é "função ausente"');
  ok(A.listaEspera({ data: null, error: { message: 'acesso_negado', code: 'P0001' } }).motivo === 'sem permissão', R + 'acesso_negado é "sem permissão"');
  ok(A.listaEspera({ data: null, error: new TypeError('Failed to fetch') }).motivo === 'sem conexão' && A.listaEspera({ data: null, error: new TypeError('Load failed') }).motivo === 'sem conexão', R + 'falha de rede (Chrome e Safari) é "sem conexão"');
  ok(A.listaEspera({ data: null, error: { message: 'boom', code: 'XX000' } }).motivo === 'falha ao consultar', R + 'outro erro do servidor é "falha ao consultar"');
  ok(A.listaEspera({ data: { x: 1 }, error: null }).n === null && A.listaEspera(null).n === null && A.listaEspera(undefined).motivo === 'sem resposta', R + 'resposta fora da forma também não vira número');
  const vazia = A.listaEspera({ data: [], error: null });
  ok(vazia.n === 0 && pano({ listaEspera: vazia }).m.espera.valor === '0', R + 'zero de verdade (lista vazia) aparece como 0');
  // admin_lista_espera não tem LIMIT; o PostgREST corta em 1000 por padrão: no teto, "1000+", não um 1000 que parece exato
  const cheia = pano({ listaEspera: A.listaEspera({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null }) }).m.espera;
  const quase = pano({ listaEspera: { n: 999, motivo: '' } }).m.espera;
  ok(A.LIMITES.espera === 1000 && cheia.valor === '1000+' && cheia.detalhe === 'a consulta para em 1000 inscritos' && !cheia.indisponivel && quase.valor === '999' && quase.detalhe === 'inscritos pela página pública',
    R + 'lista de espera no teto de 1000 linhas da resposta: "1000+", não 1000 (' + cheia.valor + ' · ' + cheia.detalhe + ')');

  // outras fontes que falham, carga e permissão
  const semVisao = pano({ visao: null }).m;
  ok(['contas', 'ativas7', 'ativas30'].every(k => semVisao[k].indisponivel && semVisao[k].valor === 'indisponível' && semVisao[k].detalhe === 'visão geral não carregou'), R + 'sem a visão geral, contas e ativas ficam indisponíveis');
  ok(pano({ feedback: null }).m.naoLidos.indisponivel && pano({ erros: null }).m.erros24.indisponivel, R + 'sem feedback ou sem erros, o número correspondente fica indisponível');
  const carregando = A.panorama({ carregado: false });
  ok(carregando.length === 6 && carregando.every(x => x.valor === '—' && x.detalhe === 'carregando…' && !x.indisponivel), R + 'antes da primeira carga: traço e "carregando…"');
  ok(A.panorama({ carregado: true, acessoNegado: true }).every(x => x.indisponivel && x.detalhe === 'sem permissão'), R + 'conta sem permissão: tudo indisponível, nada de 0');
  const teto = pano({ feedback: Array.from({ length: 200 }, (_, i) => ({ id: i, lido: i >= 5 })), erros: Array.from({ length: 200 }, (_, i) => ({ id: i })) }).m;
  ok(teto.naoLidos.valor === '5' && teto.naoLidos.detalhe === 'entre os 200 relatos mais recentes' && teto.erros24.valor === '200+', R + 'no teto de 200 linhas do SQL, o cartão avisa (200+ e "entre os 200 mais recentes")');
  ok(pano({ telemetria: false }).m.erros24.detalhe === 'telemetria desligada: nada novo chega', R + 'telemetria desligada aparece junto da contagem de erros');
  // admin_config falhou: o estado do interruptor é desconhecido — o cartão não afirma "desligada"
  const telDesc = pano({ telemetria: null }).m.erros24;
  ok(telDesc.valor === '3' && !telDesc.indisponivel && telDesc.detalhe === 'estado da telemetria indisponível' && pano({ telemetria: undefined }).m.erros24.detalhe === 'estado da telemetria indisponível',
    R + 'sem a configuração, a contagem de erros fica e o detalhe diz que o estado da telemetria é desconhecido (' + telDesc.detalhe + ')');
  ok(pano({ visao: { saude: { contas: 13, ativos7d: 2, ativos30d: 5 } } }).m.contas.detalhe === 'no total', R + 'sem a lista de contas, o cartão não inventa as novas');
  ok(pano({ feedback: [] }).m.naoLidos.detalhe === 'nenhum relato ainda' && pano({ feedback: [{ id: 9, lido: false }] }).m.naoLidos.detalhe === 'de 1 relato', R + 'detalhe dos não lidos no singular e sem relatos');
  ok(A.novasEm(visao.testadores, AGORA + 10 * DIA, 7) === 0 && A.novasEm([{ criadoEm: new Date(AGORA + 3 * DIA).toISOString() }], AGORA, 7) === 0 && A.novasEm(null, AGORA) === null, R + 'novas em 7 dias: data futura (relógio torto) não conta e lista ausente dá null');

  const sqlAdm = ler('supabase-admin.sql'), sqlTel = ler('supabase/migrations/2026-09-08-telemetria.sql');
  ok(/from public\.feedback order by criado_em desc limit 200;/.test(sqlAdm) && /order by ts desc limit 200\) e;/.test(sqlTel) && A.LIMITES.feedback === 200 && A.LIMITES.erros === 200, R + 'os tetos do módulo são os do SQL (200 relatos, 200 erros)');

  /* ---- resposta por e-mail ---- */
  const quando = new Date(2026, 10, 25, 8, 41);   // hora local, em qualquer fuso
  ok(A.carimbo(quando) === '25/11/2026 08:41' && A.dataCurta(quando) === '25/11/2026' && A.carimbo('lixo') === '', R + 'carimbo dd/mm/aaaa hh:mm na hora local');
  const nota = A.notaComResposta('Ligar de volta  \n', 'Corrigido na versão 3.2.\r\nObrigada!', quando);
  ok(nota === 'Ligar de volta\n\n[resposta por e-mail em 25/11/2026 08:41] Corrigido na versão 3.2.\nObrigada!', R + 'a resposta entra DEPOIS da nota anterior, com prefixo datado (' + JSON.stringify(nota) + ')');
  ok(A.notaComResposta('', 'Oi', quando) === '[resposta por e-mail em 25/11/2026 08:41] Oi' && A.notaComResposta(null, ' Oi ', quando) === '[resposta por e-mail em 25/11/2026 08:41] Oi', R + 'sem nota anterior, só a resposta datada');
  ok(A.notaComResposta('x', '   \n ', quando) === null && A.notaComResposta('x', null, quando) === null, R + 'resposta vazia não grava nada');
  const duas = A.notaComResposta(nota, 'Segunda', new Date(2026, 10, 26, 9, 5));
  ok(duas === nota + '\n\n[resposta por e-mail em 26/11/2026 09:05] Segunda', R + 'a segunda resposta acumula, não sobrescreve');
  // "Nota interna" (campo de uma linha) numa nota de várias linhas: o texto entra no fim, sem colar as linhas
  ok(A.acrescentarNota(duas + '  \n', ' Liguei de novo\r\n') === duas + '\nLiguei de novo' && A.acrescentarNota(null, 'x') === 'x' && A.acrescentarNota(duas, '  ') === null && A.acrescentarNota(duas, null) === null,
    R + 'acrescentar à nota guarda as linhas que havia e põe o texto novo no fim; vazio não grava');

  // status: os valores vêm do SQL (o comentário da coluna; um CHECK, se um dia existir, manda)
  const comentario = (sqlAdm.match(/status\s+text not null default 'novo',\s*--\s*([^\n]+)/) || [])[1] || '';
  const migracoes = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).map(f => ler('supabase/migrations/' + f)).join('\n');
  const check = (sqlAdm + '\n' + migracoes).match(/check\s*\(\s*status\s+in\s*\(([^)]*)\)/i);
  const valores = (check ? check[1].split(',') : comentario.split('|')).map(s => s.trim().replace(/'/g, '')).filter(Boolean);
  ok(valores.join() === 'novo,andamento,resolvido', R + 'os status do SQL são novo, andamento e resolvido (' + valores.join() + (check ? ', por CHECK' : ', sem CHECK') + ')');
  ok(A.statusAposResposta('novo') === 'andamento' && A.statusAposResposta(undefined) === 'andamento' && A.statusAposResposta('andamento') === 'andamento' && A.statusAposResposta('resolvido') === 'resolvido', R + 'responder tira de "novo" e não rebaixa "resolvido"');
  ok(['novo', 'andamento', 'resolvido', undefined, '', 'x'].every(s => valores.includes(A.statusAposResposta(s))), R + 'o status gravado é sempre um valor do SQL');

  // mailto:
  const f = { email: 'pessoa@exemplo.test', mensagem: 'O cronômetro parou\nquando troquei de aba.', criado_em: new Date(2026, 10, 20, 10, 0) };
  const mt = A.mailtoResposta(f);
  const [, para, qs] = mt.match(/^mailto:([^?]*)\?(.*)$/) || [];
  const prm = {}; String(qs || '').split('&').forEach(kv => { const i = kv.indexOf('='); prm[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
  ok(para === 'pessoa@exemplo.test' && Object.keys(prm).join() === 'subject,body', R + 'mailto: para o e-mail do relato, com assunto e corpo');
  ok(prm.subject === 'Cátedra: resposta ao seu relato de 20/11/2026', R + 'assunto inicial com a data do relato (' + prm.subject + ')');
  ok(/^Olá,\r\n\r\nObrigada por escrever pelo app da Cátedra\. Sobre o que você relatou em 20\/11\/2026:\r\n\r\n/.test(prm.body || '') && prm.body.includes('> O cronômetro parou\r\n> quando troquei de aba.\r\n\r\n') && !/[^\r]\n/.test(prm.body), R + 'corpo inicial: saudação, parágrafo com maiúscula depois do vocativo e o relato citado, quebras em CRLF');
  ok(!/\+/.test(qs || '') && /%0D%0A/.test(qs || '') && /%20/.test(qs || ''), R + 'espaço vira %20 e quebra de linha vira %0D%0A (RFC 6068)');
  const inj = A.mailtoResposta({ email: 'a@b.com&bcc=c', mensagem: 'x' });
  ok(inj.startsWith('mailto:a@b.com%26bcc%3Dc?subject=') && inj.split('?').length === 2 && (inj.match(/&/g) || []).length === 1, R + 'o endereço não injeta cabeçalho no mailto: (& e = ficam codificados)');
  ok(A.mailtoResposta({ email: null, mensagem: 'x' }) === '' && A.mailtoResposta({ email: 'anônimo', mensagem: 'x' }) === '' && A.mailtoResposta({ email: 'a@b@c.com' }) === '' && !A.emailValido(''), R + 'relato sem e-mail válido não ganha mailto:');
  const corpoLongo = decodeURIComponent(A.mailtoResposta({ email: 'p@e.test', mensagem: 'palavra '.repeat(200) }).split('&body=')[1]);
  ok(corpoLongo.length < 600 && /palavra…\r\n\r\n$/.test(corpoLongo), R + 'relato longo é citado só até 400 caracteres, cortado na palavra, com reticências');
  ok(decodeURIComponent(A.mailtoResposta({ email: 'p@e.test', mensagem: 'x' }).split('?subject=')[1].split('&')[0]) === 'Cátedra: resposta ao seu relato', R + 'sem data, o assunto não inventa uma');
  // O corte de 400 conta unidades UTF-16: sem espaço antes, ele partia um emoji ao meio e o
  // encodeURIComponent lançava URIError — dentro do render, o app inteiro da administração caía.
  const SOLTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  const semLancar = (msg) => { try { return { href: A.mailtoResposta({ email: 'p@e.test', mensagem: msg }) }; } catch (e) { return { erro: e.name + ': ' + e.message }; } };
  const casosEmoji = [['"a" + 300 emoji colados', 'a' + '\u{1F621}'.repeat(300)], ['link longo com emoji na posição 399', 'https://exemplo.test/' + 'x'.repeat(378) + '\u{1F621}\u{1F621} fim'], ['"Socorro" + 200 emoji', 'Socorro' + '\u{1F62D}'.repeat(200)]];
  const resEmoji = casosEmoji.map(([nome, msg]) => { const r = semLancar(msg); let corpo = ''; try { corpo = r.href ? decodeURIComponent(r.href.split('&body=')[1]) : ''; } catch (e) { corpo = ''; }
    return { nome, ok: !r.erro && /^mailto:p@e\.test\?subject=/.test(r.href || '') && /…\r\n\r\n$/.test(corpo) && !SOLTO.test(corpo), det: r.erro || (corpo ? 'ok' : 'corpo ilegível') }; });
  ok(resEmoji.every(r => r.ok), R + 'relato com emoji no corte dos 400: o mailto: sai inteiro, sem meio emoji e sem exceção (' + resEmoji.map(r => r.nome + ': ' + r.det).join(' · ') + ')');
  const comSolto = semLancar('meio emoji ' + String.fromCharCode(0xD83D) + ' solto no texto');
  ok(comSolto.href === '', R + 'relato com substituto solto (texto de terceiro) não ganha link e não lança (' + (comSolto.erro || JSON.stringify(comSolto.href)) + ')');

  /* ---- contrato com o host, o build e o SQL ---- */
  const host = ler('Catedra.dc.html'), build = ler('scripts/build.mjs'), buildMac = ler('scripts/build-macos.mjs');
  ok(/<script src="\.\/admin-console\.js"><\/script>/.test(host) && /'admin-console\.js'/.test(build) && /'\.\/admin-console\.js'/.test(build) && /'admin-console\.js'/.test(buildMac), R + 'o módulo entra no <head>, na cópia e na casca do site e no bundle nativo');
  const fnSet = (sqlAdm.match(/create or replace function public\.admin_feedback_set\(p_id bigint, p_status text, p_nota text\)[\s\S]*?end \$\$;/) || [''])[0];
  ok(/if not public\.is_admin\(\) then raise exception 'acesso_negado'/.test(fnSet) && /nota_admin = p_nota/.test(fnSet), R + 'admin_feedback_set segue com is_admin e grava a nota inteira (por isso o cliente manda a anterior junto)');
  // o corpo de cada escrita em admin_feedback_set (o registro novo, os botões de status e a "Nota interna")
  const corpo = (marca) => { const i = host.indexOf(marca); return i < 0 ? '' : host.slice(i, host.indexOf('\n  };', i)); };
  const corpoReg = corpo('admRegistrarResposta = async'), corpoSt = corpo('_adminFeedbackStatus = async'), corpoNota = corpo('_admNotaFeedback = async'), corpoReler = corpo('_admRelerFeedback = async');
  ok(/sb\.rpc\('admin_feedback_set', \{p_id:Number\(id\), p_status:st, p_nota:nota\}\); if\(r\.error\) throw r\.error;/.test(corpoReg), R + 'o registro usa a assinatura atual de admin_feedback_set e olha res.error antes de dar por gravado');
  // admin_feedback_set regrava a nota INTEIRA: as três escritas releem a linha antes (a nota de agora, não a da tela)
  const releAntes = (c) => { const iLe = c.indexOf('this._admRelerFeedback(sb, id)'), iGrava = c.indexOf("sb.rpc('admin_feedback_set'"); return iLe > 0 && iGrava > iLe && /if\(!f\)\{ this\._admRelatoSumiu\(\); return; \}/.test(c); };
  ok(/sb\.rpc\('admin_feedback'\); if\(!r \|\| r\.error\) throw/.test(corpoReler) && /Array\.isArray\(r\.data\)/.test(corpoReler) && releAntes(corpoReg) && releAntes(corpoSt) && releAntes(corpoNota),
    R + 'registro, status e nota interna releem a linha antes de regravar a nota inteira (e não gravam se a leitura falhar ou o relato sumir)');
  ok(!/this\.state\.adminFeedback\|\|\[\]\)\.(find|reduce)/.test(corpoReg + corpoSt + corpoNota) && /p_nota:f\.nota_admin\|\|null/.test(corpoSt) && /this\._admRespGravando/.test(corpoReg),
    R + 'nenhuma escrita usa a nota guardada na tela (o status manda a nota relida); clique duplo não grava a resposta duas vezes');
  // o relato é texto de terceiro: o mailto: no render fica atrás de try/catch, e o link só aparece com mailto: de verdade
  ok(/let _mt=''; try\{ _mt=window\.CT_ADMIN \? window\.CT_ADMIN\.mailtoResposta\(f\) : ''; \}catch\(_\)\{ _mt=''; \}/.test(host) && /temEmail:!!_mt && !_mailMudo, mailto:_mailMudo\?'':_mt,/.test(host),
    R + 'no render, o mailto: de cada relato fica atrás de try/catch e o link só aparece quando ele existe');
  // No app do Mac o mailto: não sai do WKWebView (decidePolicyFor só manda http(s) para fora): lá o botão copia o endereço.
  const swiftMac = ler('mac/Sources/main.swift'), swiftIos = ler('ios/Sources/main.swift');
  const politicaMac = (swiftMac.match(/func webView\(_ wv: WKWebView, decidePolicyFor action: WKNavigationAction,[\s\S]*?\n    \}\n/) || [''])[0];
  const politicaIos = (swiftIos.match(/decidePolicyFor action: WKNavigationAction,[\s\S]*?\n    \}\n/) || [''])[0];
  const pontesIos = (swiftIos.match(/for nome in \[([\s\S]*?)\]/) || ['', ''])[1];
  // trava: no dia em que a política do Mac abrir mailto:, o host tem de declarar __catedraMailto (e o link volta)
  const macAbreMailto = /mailto|\["http", "https", "file"/.test(politicaMac), macDeclara = /__catedraMailto\s*=\s*true/.test(swiftMac);
  ok(!!politicaMac && /"catedraBackup"/.test(swiftMac) && !/"catedraAcervo"/.test(swiftMac) && /"catedraBackup"/.test(pontesIos) && /"catedraAcervo"/.test(pontesIos)
    && /\["http", "https", "file"/.test(politicaIos) && macAbreMailto === macDeclara,
    R + 'o Mac se distingue pela ponte catedraBackup sem a catedraAcervo (só o iPad tem); o iPad abre mailto: e o Mac só declara __catedraMailto se abrir (hoje: ' + (macAbreMailto ? 'abre' : 'não abre') + ')');
  ok(/_admMailtoMudo\(\)\{ try\{ const mh=window\.webkit&&window\.webkit\.messageHandlers; return !!\(mh&&mh\.catedraBackup&&!mh\.catedraAcervo\) && window\.__catedraMailto!==true; \}/.test(host)
    && /copiaEmail:_mailMudo && !!\(window\.CT_ADMIN && window\.CT_ADMIN\.emailValido\(f\.email\)\)/.test(host) && /data-adm-copiar="1" onclick="\{\{ admCopiarEndereco \}\}">Copiar endereço</.test(host),
    R + 'no app do Mac (e só lá, até o host declarar __catedraMailto), o link vira "Copiar endereço"');
  // "Nota interna" de várias linhas: o texto entra no fim da nota RELIDA logo antes de gravar (não da lida antes do campo),
  // e o campo vazio, confirmado, apaga a nota — sem passar por cima de uma nota que mudou nesse meio-tempo
  ok(/const nota=limpar \? '' : varias \? A\.acrescentarNota\(agora, dig\) : dig;/.test(corpoNota) && /if\(limpar && !window\.confirm\(/.test(corpoNota) && /if\(\(!varias \|\| limpar\) && agora!==atual\)\{/.test(corpoNota),
    R + 'Nota interna: acrescenta à nota de agora, apaga só com confirmação e não grava por cima de nota que mudou');
  ok(/naoLido:f\.lido===false/.test(host) && /data-adm-naolido="1"/.test(host) && /data-adm-ler="1" onclick="\{\{ adminLerFeedback \}\}"/.test(host) && /sb\.rpc\('admin_marcar_feedback', \{p_id:Number\(id\), p_lido:true\}\); if\(!r \|\| r\.error\)/.test(host),
    R + 'o Suporte marca os relatos não lidos (lido=false, a conta do Panorama) e "Marcar como lido" usa admin_marcar_feedback olhando res.error');
  const fnMarcar = (sqlAdm.match(/create or replace function public\.admin_marcar_feedback\(p_id bigint, p_lido boolean\)[\s\S]*?end \$\$;/) || [''])[0];
  ok(/if not public\.is_admin\(\) then raise exception 'acesso_negado'/.test(fnMarcar) && /revoke all on function public\.admin_marcar_feedback\(bigint, boolean\) from public, anon;/.test(sqlAdm), R + 'admin_marcar_feedback segue com is_admin e sem execução para anon');
  // o módulo roda no JavaScriptCore do WKWebView: só sintaxe ES5 (fora dos comentários)
  const semComentarios = ler('admin-console.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
  ok(!/=>|\blet\s|\bconst\s|`|\?\.|\?\?|\.\.\./.test(semComentarios), R + 'admin-console.js só usa sintaxe ES5 (sem seta, let/const, crase, ?., ?? nem ...)');
  const le = ler('supabase/migrations/2026-09-08-lista-espera.sql');
  ok(/function public\.admin_lista_espera\(\)[\s\S]*security definer[\s\S]*public\.is_admin\(\)/.test(le) && /revoke all on function public\.admin_lista_espera\(\) from public, anon;/.test(le), R + 'admin_lista_espera existe na migração, com is_admin e sem execução para anon');
  ok(/function public\.admin_feedback\(\)\s*returns setof public\.feedback/.test(sqlAdm) && /select \* from public\.feedback order by/.test(sqlAdm) && /\n\s*email\s+text,/.test(sqlAdm), R + 'admin_feedback devolve a linha inteira, com a coluna email (sem migração para o e-mail)');
  ok(/consultar\('admin_ia_cota',undefined,'cotas'\), esperaP/.test(host) && /falhas\.length===11 &&/.test(host), R + 'a lista de espera não entra na conta de falhas do console (a faixa vermelha continua só das 11)');
  // sem admin_visao_geral, os painéis vizinhos do Panorama não mostram 0, "nenhum cadastro" nem "beta saudável"
  ok(/const admRecursos=_semVisao \? \[\] :/.test(host) && /admSemCrescimento:!_semVisao && admCrescimento\.length===0/.test(host) && /admSemAtencao:admSemAtencao && !_semVisao, admAtencaoIndisp:admSemAtencao && _semVisao/.test(host)
    && (host.match(/data-adm-fonte="\{\{ admVisaoFonte \}\}">\{\{ admVisaoAviso \}\}</g) || []).length === 3,
    R + 'sem a visão geral, recursos, cadastros por semana e "Pede atenção" dizem que não carregou (três avisos), em vez de 0 e "saudável"');
}

/* ---- Parte 2: navegador ---- */
const rgb = (c) => { const s = String(c).trim(); if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); return (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const [r, g, b] = rgb(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const misturar = (a, b, t) => 'rgb(' + rgb(a).map((v, i) => Math.round(v * t + rgb(b)[i] * (1 - t))).join(', ') + ')';

const INSTALA_UTC = '2026-11-26T01:00:00Z';   // 21:00 de 25/11 em Porto Velho (UTC−4)
const REGISTRO_UTC = '2026-11-26T01:30:00Z';  // 21:30 local — em UTC já é dia 26

// Abre (ou recarrega) o console com as RPCs simuladas. `espera` escolhe a resposta de admin_lista_espera;
// `opc.falhar` lista as RPCs que voltam {error}; `opc.cenario === 'emoji'` troca os relatos por texto difícil.
async function abrirConsole(page, espera, opc = {}) {
  await page.evaluate(async ({ espera, agoraIso, falhar, cenario }) => {
    const app = window.__catedraApp, DIA = 864e5, agora = Date.parse(agoraIso);
    const iso = (d) => new Date(agora - d * DIA).toISOString();
    window.__admChamadas = []; window.__admFalharSet = 0; window.__admFalharLeitura = 0; window.__admFalharMarcar = 0; window.__admMudarNaLeitura = null;
    const falha = (nome) => falhar.indexOf(nome) >= 0;
    const visao = { saude: { contas: 13, ativos7d: 2, ativos30d: 5, nuncaVoltaram: 3 }, recursos: {}, crescimento: [], retencao: { voltaram: 4, total: 13 },
      ia: { chamadasTotal: 7, chamadas7d: 3, chamadasHoje: 1, contasUsaram: 2 },
      testadores: [
        { uid: 'u1', email: 'a@exemplo.test', criadoEm: iso(2), ultimoLogin: iso(1), confirmado: true },
        { uid: 'u2', email: 'b@exemplo.test', criadoEm: iso(6), ultimoLogin: iso(3), confirmado: true },
        { uid: 'u3', email: 'c@exemplo.test', criadoEm: iso(8), ultimoLogin: iso(8), confirmado: true },
        { uid: 'u4', email: 'd@exemplo.test', criadoEm: iso(40), ultimoLogin: null, confirmado: false }] };
    // não lidos: 101 e 102 (2); em aberto (≠ resolvido): 101, 103 e 104 (3)
    const feedback = cenario === 'emoji' ? [
      // sem espaço antes do corte dos 400, o meio emoji fazia o mailto: lançar dentro do render
      { id: 301, email: 'emoji@exemplo.test', mensagem: 'Socorro' + '\u{1F62D}'.repeat(200), criado_em: '2026-11-24T13:00:00Z', lido: false, status: 'novo', nota_admin: null },
      // texto de terceiro com um substituto solto (montado aqui: a serialização do teste o trocaria)
      { id: 302, email: 'solto@exemplo.test', mensagem: 'meio emoji ' + String.fromCharCode(0xD83D) + ' solto', criado_em: '2026-11-24T14:00:00Z', lido: false, status: 'novo', nota_admin: null }] : [
      { id: 101, email: 'pessoa@exemplo.test', mensagem: 'O cronômetro parou\nquando troquei de aba.', criado_em: '2026-11-20T13:00:00Z', lido: false, status: 'novo', nota_admin: 'Ligar de volta', contexto: { tela: 'inicio' } },
      { id: 102, email: null, mensagem: 'Sugestão sem e-mail', criado_em: '2026-11-21T13:00:00Z', lido: false, status: 'resolvido', nota_admin: null },
      { id: 103, email: 'outra@exemplo.test', mensagem: 'Já visto', criado_em: '2026-11-22T13:00:00Z', lido: true, status: 'andamento', nota_admin: null },
      { id: 104, email: 'mais@exemplo.test', mensagem: 'Outro relato', criado_em: '2026-11-23T13:00:00Z', lido: true, status: 'novo', nota_admin: null }];
    // a "tabela": admin_feedback lê daqui e admin_feedback_set grava aqui, como no SQL (status por coalesce, nota inteira, lido)
    window.__admFb = feedback;
    const erros = [1, 2, 3].map(i => ({ id: i, quando: new Date(agora - i * 36e5).toISOString(), build: 'x', alvo: 'web', tela: 'inicio', mensagem: 'TypeError ' + i, conta: 'abcd1234' }));
    app._sb = () => ({ rpc: async (nome, args) => {
      window.__admChamadas.push({ nome, args: args === undefined ? null : JSON.parse(JSON.stringify(args)) });
      if (falha(nome)) return { data: null, error: { message: 'falha simulada em ' + nome } };
      if (nome === 'admin_visao_geral') return { data: visao, error: null };
      if (nome === 'admin_feedback') {
        if (window.__admFalharLeitura > 0) { window.__admFalharLeitura--; return { data: null, error: { message: 'falha simulada na leitura' } }; }
        // outro aparelho muda a nota depois de `pular` leituras (a "Nota interna" lê antes e depois do campo)
        const mud = window.__admMudarNaLeitura;
        if (mud) { if (mud.pular > 0) mud.pular--; else { const l = window.__admFb.find(x => x.id === mud.id); if (l) l.nota_admin = mud.nota; window.__admMudarNaLeitura = null; } }
        return { data: window.__admFb.map(f => ({ ...f })), error: null };
      }
      if (nome === 'admin_erros_cliente') return { data: erros, error: null };
      if (nome === 'admin_config') return { data: { telemetria: true }, error: null };
      if (nome === 'admin_lista_espera') return espera === 'ausente'
        ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.admin_lista_espera without parameters in the schema cache' } }
        : { data: [{ id: 1 }, { id: 2 }], error: null };
      if (nome === 'admin_feedback_set') {
        if (window.__admFalharSet > 0) { window.__admFalharSet--; return { data: null, error: { message: 'falha simulada' } }; }
        const linha = window.__admFb.find(x => x.id === args.p_id);
        if (linha) { if (String(args.p_status || '').trim()) linha.status = args.p_status; linha.nota_admin = args.p_nota; linha.lido = true; }
        return { data: null, error: null };
      }
      if (nome === 'admin_marcar_feedback') {   // como no SQL: só põe lido
        if (window.__admFalharMarcar > 0) { window.__admFalharMarcar--; return { data: null, error: { message: 'falha simulada' } }; }
        const linha = window.__admFb.find(x => x.id === args.p_id); if (linha) linha.lido = args.p_lido !== false;
        return { data: null, error: null };
      }
      if (nome === 'admin_uso_telas' || nome === 'admin_uso_ia' || nome === 'admin_sistema') return { data: {}, error: null };
      return { data: [], error: null };
    } });
    await new Promise(r => app.setState({ isAdmin: true, view: 'admin', admTab: 'visao' }, r));
    await app._loadAdmin();
    await new Promise(r => app.setState({}, r));   // só volta depois da pintura do que _loadAdmin gravou
  }, { espera, agoraIso: REGISTRO_UTC, falhar: opc.falhar || [], cenario: opc.cenario || '' });
  await page.waitForSelector('[data-adm="panorama"] [data-pano="erros24"]', { timeout: 15000 });
}

const medirPanorama = (page) => page.evaluate(() => {
  const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
  const itens = [...document.querySelectorAll('[data-adm="panorama"] [data-pano]')].map(c => {
    const b = c.querySelector(':scope > b'), s = c.querySelector(':scope > span'), i = c.querySelector(':scope > i'), r = c.getBoundingClientRect();
    const num = b.querySelector('.sc-interp') || b;
    return { id: c.dataset.pano, indisp: c.dataset.indisp, valor: b.textContent.trim(), rotulo: s.textContent.trim(), detalhe: i.textContent.trim(), w: r.width, h: r.height, y: r.top,
      fundo: fundo(c), corValor: getComputedStyle(num).color, corRotulo: getComputedStyle(s).color, corDetalhe: getComputedStyle(i).color,
      fonteValor: parseFloat(getComputedStyle(num).fontSize), fonteDetalhe: parseFloat(getComputedStyle(i).fontSize) };
  });
  return { cartoes: document.querySelectorAll('[data-adm="panorama"]').length, itens,
    kpis: [...document.querySelectorAll('.adm-kpi')].map(k => [...k.children].map(c => c.textContent.trim()).join(' · ')),
    // o que PINTA o número de cada indicador (o <span class="sc-interp"> de dentro do <b>)
    kpiNum: [...document.querySelectorAll('.adm-kpi')].map(k => { const b = k.querySelector(':scope > b'), n = b.querySelector('.sc-interp') || b, s = k.querySelector(':scope > span'), cs = getComputedStyle(n);
      return { fonte: parseFloat(cs.fontSize), caixa: cs.textTransform, cor: cs.color, fundo: getComputedStyle(k).backgroundColor, fonteRotulo: parseFloat(getComputedStyle(s).fontSize) }; }),
    // a cor que PINTA o número: o runtime põe o texto num <span class="sc-interp"> dentro do <b>
    nunca: (() => { const k = [...document.querySelectorAll('.adm-kpi')].find(x => /Nunca voltaram/.test(x.textContent)); if (!k) return ''; const b = k.querySelector(':scope > b'); return getComputedStyle(b.querySelector('.sc-interp') || b).color; })(),
    // o rótulo e o detalhe de cada indicador, como PINTAM (o texto mora no <span class="sc-interp"> do runtime)
    kpiTexto: [...document.querySelectorAll('.adm-kpi')].map(k => { const s = k.querySelector(':scope > span'), i = k.querySelector(':scope > i');
      const si = s.querySelector('.sc-interp') || s, ii = i.querySelector('.sc-interp') || i, cs = getComputedStyle(ii);
      return { caixa: cs.textTransform, peso: +cs.fontWeight, cor: cs.color, fundo: getComputedStyle(k).backgroundColor, margemRotulo: si === s ? '0px' : getComputedStyle(si).marginTop }; }),
    cabecalho: (() => { const hp = document.querySelector('[data-adm="panorama"] > header p'); return hp ? { texto: hp.textContent.trim(), cor: getComputedStyle(hp).color, fundo: getComputedStyle(hp.closest('.adm-panel')).backgroundColor } : null; })(),
    live: [...document.querySelectorAll('.adm-live b')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
    warn: getComputedStyle(document.querySelector('.adm')).getPropertyValue('--k-warn').trim(),
    erro: window.__catedraApp.state.adminErro, escuro: (document.querySelector('[data-dark]') || {}).getAttribute ? document.querySelector('[data-dark]').getAttribute('data-dark') : '' };
});

// Os painéis vizinhos do Panorama que também vêm de admin_visao_geral: o que eles PINTAM (texto, aviso e cor do aviso).
const medirVizinhos = (page) => page.evaluate(() => {
  const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
  const ler = (titulo) => {
    const p = [...document.querySelectorAll('.adm-panel')].find(x => { const h = x.querySelector(':scope > header h3'); return h && h.textContent.trim() === titulo; });
    if (!p) return null;
    return { texto: p.textContent.replace(/\s+/g, ' ').trim(), numeros: [...p.querySelectorAll('.adm-num')].map(n => n.textContent.replace(/\s+/g, ' ').trim()),
      avisos: [...p.querySelectorAll('[data-adm-fonte]')].map(a => { const r = a.getBoundingClientRect(); return { fonte: a.getAttribute('data-adm-fonte'), texto: a.textContent.trim(), cor: getComputedStyle(a).color, fundo: fundo(a), h: r.height }; }) };
  };
  return { recursos: ler('Uso de recursos'), cadastros: ler('Cadastros por semana'), atencao: ler('Pede atenção') };
});

export async function testarAdminVisaoFeedback(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'ADMIN [' + (opcoes.motor || 'chromium') + '] ';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, timezoneId: 'America/Porto_Velho', locale: 'pt-BR' });
  const page = await ctx.newPage();
  const errosPagina = [];
  page.on('pageerror', e => { errosPagina.push(String(e.message).slice(0, 160)); console.log('ERRO NA PÁGINA:', e.message); });
  try {
    await page.clock.install({ time: new Date(INSTALA_UTC) });
    // tema escuro com a RPC da lista de espera ausente; depois claro com a lista presente
    for (const [escuro, espera] of [['1', 'ausente'], ['0', 'presente']]) {
      const T = R + (escuro === '1' ? '(escuro) ' : '(claro) ');
      await page.goto(base + '/__semente');
      await page.evaluate((d) => { localStorage.clear(); localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.setItem('catedra:dark', d); }, escuro);
      await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'));
      await page.waitForFunction(() => !!window.__catedraApp && !!window.CT_ADMIN, null, { timeout: 30000 });
      if (escuro === '1') {
        // sem cliente do Supabase: o cartão sai de "carregando…" para "indisponível", nunca 0
        await page.evaluate(async () => { const app = window.__catedraApp; app._sb = () => null;
          await new Promise(r => app.setState({ isAdmin: true, view: 'admin', admTab: 'visao' }, r)); });
        // antes da primeira carga, os painéis que vêm da visão geral dizem "Carregando…" (nada de 0 nem de "saudável")
        await page.waitForSelector('[data-adm-fonte="carregando"]', { timeout: 15000 });
        const car = await medirVizinhos(page);
        const avisosCar = car.recursos && car.cadastros && car.atencao ? [car.recursos, car.cadastros, car.atencao].map(v => v.avisos).flat() : [];
        ok(avisosCar.length === 3 && avisosCar.every(a => a.fonte === 'carregando' && a.texto === 'Carregando…' && contraste(a.cor, a.fundo) >= 4.5) && !/Beta saudável|Nenhum cadastro/.test(car.atencao.texto + car.cadastros.texto),
          T + 'antes da primeira carga, recursos, cadastros e "Pede atenção" dizem "Carregando…", legível (' + avisosCar.map(a => contraste(a.cor, a.fundo).toFixed(2)).join(' · ') + ':1)');
        await page.evaluate(() => window.__catedraApp._loadAdmin());
        await page.waitForSelector('[data-adm="panorama"] [data-pano="espera"][data-indisp="1"]', { timeout: 15000 });
        const sem = await page.evaluate(() => [...document.querySelectorAll('[data-adm="panorama"] [data-pano]')].map(c => c.dataset.indisp + ':' + c.querySelector(':scope > b').textContent.trim() + ':' + c.querySelector(':scope > i').textContent.trim()));
        ok(sem.length === 6 && sem.every(s => /^1:indisponível:/.test(s)) && sem[3] === '1:indisponível:sem conexão', T + 'sem conexão com o servidor: os seis números dizem "indisponível" e o porquê (' + sem.join(' | ') + ')');
        // os vizinhos do Panorama também vêm da visão geral: sem ela, nada de "0 · 0%", "nenhum cadastro" nem "beta saudável"
        const viz = await medirVizinhos(page);
        const avisosViz = viz.recursos && viz.cadastros && viz.atencao ? [viz.recursos, viz.cadastros, viz.atencao].map(v => v.avisos) : [];
        ok(avisosViz.length === 3 && avisosViz.every(a => a.length === 1 && a[0].fonte === 'falhou' && a[0].texto === 'Indisponível: a visão geral não carregou.')
          && viz.recursos.numeros.length === 0 && !/Nenhum cadastro/.test(viz.cadastros.texto) && !/Beta saudável/.test(viz.atencao.texto),
          T + 'sem a visão geral, recursos, cadastros por semana e "Pede atenção" dizem que ela não carregou (' + [viz.recursos, viz.cadastros, viz.atencao].map(v => v ? v.texto.slice(0, 60) : '—').join(' | ') + ')');
        const cViz = avisosViz.flat().map(a => contraste(a.cor, a.fundo));
        ok(cViz.length === 3 && cViz.every(c => c >= 4.5), T + 'o aviso desses painéis pinta legível (' + cViz.map(c => c.toFixed(2)).join(' · ') + ':1)');
      }
      await abrirConsole(page, espera);
      const p = await medirPanorama(page);
      const m = {}; p.itens.forEach(x => { m[x.id] = x; });
      ok(p.escuro === escuro, T + 'o app abriu no tema semeado (data-dark=' + p.escuro + ')');
      ok(p.cartoes === 1 && p.itens.map(x => x.id).join() === 'contas,ativas7,ativas30,espera,naoLidos,erros24', T + 'um cartão Panorama com os seis números (' + p.itens.map(x => x.id).join() + ')');
      ok(m.contas.valor === '13' && m.contas.detalhe === '2 nos últimos 7 dias' && m.ativas7.valor === '2' && m.ativas30.valor === '5', T + 'contas criadas (13, 2 em 7 dias) e ativas em 7 e 30 dias (2 e 5)');
      ok(m.naoLidos.valor === '2' && m.naoLidos.detalhe === 'de 4 relatos' && m.erros24.valor === '3', T + 'feedbacks não lidos (2 de 4) e erros das últimas 24 h (3)');
      if (espera === 'ausente') {
        ok(m.espera.valor === 'indisponível' && m.espera.detalhe === 'função ausente no banco' && m.espera.indisp === '1', T + 'RPC da lista de espera ausente: "indisponível" e o motivo, não 0 (' + m.espera.valor + ' · ' + m.espera.detalhe + ')');
        ok(p.erro === '', T + 'a ausência da lista de espera não acende a faixa de erro do console (' + p.erro + ')');
        ok(contraste(m.espera.corValor, m.espera.fundo) >= 4.5 && m.espera.fonteValor >= m.espera.fonteDetalhe, T + '"indisponível" pinta legível (' + contraste(m.espera.corValor, m.espera.fundo).toFixed(2) + ':1)');
      } else {
        ok(m.espera.valor === '2' && m.espera.indisp === '0', T + 'com a RPC no banco, a lista de espera mostra 2 inscritos');
      }
      ok(p.itens.every(x => x.w > 0 && x.h > 0), T + 'as seis caixas pintam (' + p.itens.map(x => Math.round(x.w) + '×' + Math.round(x.h)).join(' ') + ')');
      // no iPad em pé (cartão de ~780 px), duas fileiras de três: contas em cima, operação embaixo — sem caixa órfã
      const fileiras = {}; p.itens.forEach(x => { const k = Math.round(x.y); (fileiras[k] = fileiras[k] || []).push(x.id); });
      const grade = Object.keys(fileiras).sort((a, b) => a - b).map(k => fileiras[k].join()).join(' | ');
      ok(grade === 'contas,ativas7,ativas30 | espera,naoLidos,erros24', T + 'no iPad, duas fileiras de três (' + grade + ')');
      const num = p.itens.filter(x => x.indisp !== '1');
      ok(num.every(x => x.fonteValor >= 1.5 * x.fonteDetalhe), T + 'o número é a maior coisa da caixa (' + num.map(x => x.fonteValor + '/' + x.fonteDetalhe).join(' ') + ' px)');
      const piores = p.itens.map(x => Math.min(contraste(x.corValor, x.fundo), contraste(x.corRotulo, x.fundo), contraste(x.corDetalhe, x.fundo)));
      ok(piores.every(c => c >= 4.5), T + 'número, rótulo e detalhe ≥ 4,5:1 sobre a caixa (pior ' + Math.min(...piores).toFixed(2) + ':1)');
      ok(p.kpis.length === 4 && p.kpis.some(t => /^3 · Nunca voltaram · /.test(t)) && !p.kpis.some(t => /^13 · Contas/.test(t)), T + 'a fileira antiga saiu; "Nunca voltaram" foi para os indicadores (' + p.kpis.join(' | ') + ')');
      ok(p.kpiNum.every(k => k.fonte >= 2 * k.fonteRotulo && k.caixa === 'none' && contraste(k.cor, k.fundo) >= 4.5), T + 'o número dos indicadores pinta grande, sem caixa alta, ≥ 4,5:1 (' + p.kpiNum.map(k => k.fonte + 'px ' + k.caixa).join(' | ') + ')');
      ok(contraste(p.nunca, rgb(p.warn).join(',')) < 1.05, T + '"Nunca voltaram" acima de zero pinta na cor de alerta (' + p.nunca + ')');
      // o detalhe dos indicadores pintava em caixa alta e negrito, e o rótulo levava a margem duas vezes
      ok(p.kpiTexto.length === 4 && p.kpiTexto.every(k => k.caixa === 'none' && k.peso < 700 && k.margemRotulo === '0px' && contraste(k.cor, k.fundo) >= 4.5),
        T + 'detalhe dos indicadores sem caixa alta nem negrito, ≥ 4,5:1, e rótulo sem margem dobrada (' + p.kpiTexto.map(k => k.caixa + '/' + k.peso + '/' + k.margemRotulo + '/' + contraste(k.cor, k.fundo).toFixed(2)).join(' ') + ')');
      // o --k-dim2 do Catedra.dc.html daria 3,45:1, mas catedra-ui.css (.adm .adm-panel > header p) põe --k-dim: mede o que pinta
      ok(!!p.cabecalho && p.cabecalho.texto === 'o essencial do beta num cartão' && contraste(p.cabecalho.cor, p.cabecalho.fundo) >= 4.5,
        T + 'subtítulo do cartão Panorama ≥ 4,5:1 (' + (p.cabecalho ? contraste(p.cabecalho.cor, p.cabecalho.fundo).toFixed(2) : '—') + ':1)');
      ok(p.kpis.some(t => /^7 · Chamadas de IA · 3 em 7 dias · 1 hoje$/.test(t)) && p.live.includes('IA hoje 1'), T + 'com a visão geral carregada, os indicadores e a barra mostram os números dela (' + p.live.join(' | ') + ')');
      // com a visão geral carregada, os zeros dela são dado de verdade (recursos {} e crescimento [] no simulado)
      const vz = await medirVizinhos(page);
      ok(!!vz.recursos && vz.recursos.numeros.length === 9 && vz.recursos.numeros.every(n => n === '0 · 0%') && /Nenhum cadastro nas últimas semanas\./.test(vz.cadastros.texto)
        && [vz.recursos, vz.cadastros, vz.atencao].every(v => v.avisos.length === 0), T + 'com a visão geral carregada, recursos e cadastros mostram o que ela trouxe, sem aviso de falha');
    }

    /* ---- Suporte: responder por e-mail e registrar a resposta (claro, lista presente) ---- */
    await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ admTab: 'suporte' }, r)));
    await page.waitForSelector('[data-adm-responder]');
    const naoLidosNaLista = () => page.evaluate(() => [...document.querySelectorAll('[data-adm-naolido]')].map(p => p.closest('[data-adm-relato]').dataset.admRelato).join());
    const sup = await page.evaluate(() => {
      const links = [...document.querySelectorAll('[data-adm-responder]')];
      const selo = document.querySelector('.adm-tab[data-t="suporte"] u');
      const pilula = document.querySelector('[data-adm-naolido]'), cs = pilula ? getComputedStyle(pilula) : null;
      return { ids: links.map(a => a.dataset.id), href: (links.find(a => a.dataset.id === '101') || { getAttribute: () => '' }).getAttribute('href'), selo: selo ? selo.textContent.trim() : '',
        pilula: cs ? { cor: cs.color, painel: getComputedStyle(pilula.closest('.adm-panel')).backgroundColor, acc: getComputedStyle(document.querySelector('.adm')).getPropertyValue('--k-acc').trim(), texto: pilula.textContent.trim() } : null,
        ler: [...document.querySelectorAll('[data-adm-ler]')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, w: r.width, h: r.height }; }) };
    });
    ok(sup.ids.join() === '101,103,104', R + 'só relato com e-mail ganha "Responder por e-mail" (o anônimo 102 não) (' + sup.ids.join() + ')');
    ok(sup.selo === '3', R + 'o selo da aba Suporte continua contando os em aberto (3), não os não lidos (2)');
    // o "Feedbacks não lidos" do Panorama tem correspondente na lista: quais são, e como marcar sem mexer em status
    ok(await naoLidosNaLista() === '101,102' && sup.ler.map(b => b.id).join() === '101,102', R + 'a lista marca os não lidos (101 e 102, os mesmos dois do Panorama) e só eles têm "Marcar como lido"');
    ok(!!sup.pilula && sup.pilula.texto === 'não lido' && contraste(sup.pilula.cor, misturar(sup.pilula.acc, sup.pilula.painel, 0.3)) >= 4.5 && contraste(sup.pilula.cor, sup.pilula.painel) >= 4.5,
      R + 'o selo "não lido" é legível (' + (sup.pilula ? contraste(sup.pilula.cor, misturar(sup.pilula.acc, sup.pilula.painel, 0.3)).toFixed(2) : '—') + ':1)');
    ok(sup.ler.every(b => b.w >= 44 && b.h >= 44), R + 'no toque, "Marcar como lido" tem ≥ 44 px (' + sup.ler.map(b => Math.round(b.w) + '×' + Math.round(b.h)).join(' ') + ')');
    const [, para, qs] = String(sup.href).match(/^mailto:([^?]*)\?(.*)$/) || [];
    const prm = {}; String(qs || '').split('&').forEach(kv => { const i = kv.indexOf('='); prm[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    ok(para === 'pessoa@exemplo.test' && prm.subject === 'Cátedra: resposta ao seu relato de 20/11/2026' && /> O cronômetro parou\r\n> quando troquei de aba\./.test(prm.body || ''), R + 'o link é mailto: com o e-mail do relato, assunto e corpo iniciais (' + prm.subject + ')');

    await page.evaluate(() => {
      window.__mailto = null;
      // observa o clique DEPOIS do app (bolha na window) e só então segura o mailto:, para o teste não abrir o Mail
      window.addEventListener('click', (ev) => { const a = ev.target && ev.target.closest && ev.target.closest('a[href^="mailto:"]'); if (!a) return;
        window.__mailto = { prevenido: ev.defaultPrevented, href: a.getAttribute('href') }; ev.preventDefault(); });
    });
    await page.click('[data-adm-responder][data-id="101"]');
    await page.waitForSelector('[data-adm-resp] textarea', { timeout: 8000 });
    const clique = await page.evaluate(() => window.__mailto);
    ok(!!clique && clique.prevenido === false && clique.href === sup.href, R + 'o clique segue para o mailto: (o app não cancela o link) e abre o registro da resposta');

    const caixa = await page.evaluate(() => {
      const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
      const t = document.querySelector('#adm-resp-txt'), l = document.querySelector('[data-adm-resp] label');
      const alvos = [...document.querySelectorAll('[data-adm-responder][data-id="101"], [data-adm-resp] button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: r.width, h: r.height }; });
      return { rotulos: t ? t.labels.length : 0, rotulo: l ? l.textContent.replace(/\s+/g, ' ').trim() : '', corRotulo: l ? getComputedStyle(l).color : '', fundo: l ? fundo(l) : '', alvos,
        toque: document.querySelector('[data-toque]').getAttribute('data-toque') };
    });
    ok(caixa.rotulos === 1 && /O que você respondeu a pessoa@exemplo\.test/.test(caixa.rotulo), R + 'o campo da resposta tem rótulo próprio, com o destinatário');
    ok(contraste(caixa.corRotulo, caixa.fundo) >= 4.5, R + 'rótulo do campo ≥ 4,5:1 (' + contraste(caixa.corRotulo, caixa.fundo).toFixed(2) + ':1)');
    ok(caixa.toque === '1' && caixa.alvos.length === 3 && caixa.alvos.every(a => a.h >= 44 && a.w >= 44), R + 'no toque (iPad 820), responder, registrar e cancelar têm ≥ 44 px (' + caixa.alvos.map(a => a.t + ' ' + Math.round(a.w) + '×' + Math.round(a.h)).join(' · ') + ')');

    const nSet = () => page.evaluate(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').length);
    await page.click('[data-adm-resp] .adm-btn.ok');
    await page.waitForTimeout(400);
    ok(await nSet() === 0 && await page.locator('[data-adm-resp]').count() === 1, R + 'sem texto, "Registrar resposta" não grava nada e o campo fica aberto');

    await page.fill('#adm-resp-txt', 'Corrigido na versão 3.2.\nObrigada!');
    await page.clock.setFixedTime(new Date(REGISTRO_UTC));
    // a releitura da linha falha: sem a nota de agora, regravar poderia apagar o que mudou — nada é gravado
    const nLeituras = () => page.evaluate(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback').length);
    const leiturasAntes = await nLeituras();
    await page.evaluate(() => { window.__admFalharLeitura = 1; });
    await page.click('[data-adm-resp] .adm-btn.ok');
    await page.waitForFunction((n) => window.__admChamadas.filter(c => c.nome === 'admin_feedback').length > n, leiturasAntes, { timeout: 8000 });
    await page.waitForTimeout(400);
    const semLeitura = await page.evaluate(() => ({ nota: window.__catedraApp.state.adminFeedback.find(f => f.id === 101).nota_admin, aberto: document.querySelectorAll('[data-adm-resp]').length, txt: (document.querySelector('#adm-resp-txt') || {}).value }));
    ok(await nSet() === 0 && semLeitura.nota === 'Ligar de volta' && semLeitura.aberto === 1 && /Corrigido na versão 3\.2\./.test(semLeitura.txt || ''), R + 'sem conseguir reler a nota atual, nada é gravado e o texto continua no campo');
    await page.evaluate(() => { window.__admFalharSet = 1; });
    await page.click('[data-adm-resp] .adm-btn.ok');
    await page.waitForFunction(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').length === 1, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const falhou = await page.evaluate(() => ({ nota: window.__catedraApp.state.adminFeedback.find(f => f.id === 101).nota_admin, aberto: document.querySelectorAll('[data-adm-resp]').length, txt: (document.querySelector('#adm-resp-txt') || {}).value }));
    ok(falhou.nota === 'Ligar de volta' && falhou.aberto === 1 && /Corrigido na versão 3\.2\./.test(falhou.txt || ''), R + 'erro do servidor (res.error) não finge que gravou: a nota fica como estava e o texto continua no campo');

    // Com o console aberto, outro aparelho acrescentou uma linha à nota: a gravação parte da nota de AGORA
    // (relida), não da que o console carregou. E dois cliques no mesmo instante gravam uma vez só.
    await page.evaluate(() => { window.__admFb.find(f => f.id === 101).nota_admin = 'Ligar de volta\nLiguei pelo iPad'; });
    await page.evaluate(() => { const b = document.querySelector('[data-adm-resp] .adm-btn.ok'); b.click(); b.click(); });
    await page.waitForFunction(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').length >= 2, null, { timeout: 8000 });
    await page.waitForSelector('[data-adm-resp]', { state: 'detached', timeout: 8000 });
    await page.waitForTimeout(400);
    const sets = await page.evaluate(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').map(c => c.args));
    const args = sets[sets.length - 1];
    const ESPERADA = 'Ligar de volta\nLiguei pelo iPad\n\n[resposta por e-mail em 25/11/2026 21:30] Corrigido na versão 3.2.\nObrigada!';
    ok(sets.length === 2, R + 'dois cliques seguidos em "Registrar resposta" gravam uma vez só (' + sets.length + ' chamadas ao todo, contando a que falhou)');
    ok(!!args && Object.keys(args).join() === 'p_id,p_status,p_nota' && args.p_id === 101 && args.p_status === 'andamento' && args.p_nota === ESPERADA,
      R + 'Registrar resposta chama admin_feedback_set(p_id, p_status, p_nota) com a nota de agora (relida, com a linha do iPad) + a resposta datada (' + JSON.stringify(args) + ')');
    ok(!!args && !/26\/11\/2026/.test(args.p_nota), R + 'às 21:30 em UTC−4 a data gravada é 25/11 (a do lugar), não a do UTC');

    const ui = await page.evaluate(() => {
      const a = document.querySelector('[data-adm-responder][data-id="101"]'), item = a.closest('.adm-acts').parentElement;
      const nota = item.querySelector('[data-adm-nota]'), cs = getComputedStyle(nota), painel = item.closest('.adm-panel');
      return { texto: nota.innerText, ws: cs.whiteSpace, cor: cs.color, fundo: getComputedStyle(painel).backgroundColor,
        acc: getComputedStyle(document.querySelector('.adm')).getPropertyValue('--k-acc').trim(), status: item.querySelector('.adm-pill').textContent.trim(),
        lido: window.__catedraApp.state.adminFeedback.find(f => f.id === 101).lido, selo: (document.querySelector('.adm-tab[data-t="suporte"] u') || {}).textContent };
    });
    ok(ui.texto.includes(ESPERADA) && ui.ws === 'pre-wrap', R + 'a nota mostra a anterior e a resposta datada, em linhas separadas (white-space ' + ui.ws + ')');
    const cNota = contraste(ui.cor, ui.fundo), cDegrade = contraste(ui.cor, misturar(ui.acc, ui.fundo, 0.19));
    ok(cNota >= 4.5 && cDegrade >= 4.5, R + 'texto da nota ≥ 4,5:1 sobre o painel e sobre o começo do degradê (' + cNota.toFixed(2) + ' e ' + cDegrade.toFixed(2) + ':1)');
    ok(ui.status === 'andamento' && ui.lido === true && String(ui.selo).trim() === '3', R + 'o relato sai de "novo" para "andamento", fica lido, e o selo (em aberto) não muda');

    await page.evaluate(() => new Promise(r => window.__catedraApp.setState({ admTab: 'visao' }, r)));
    await page.waitForSelector('[data-pano="naoLidos"]');
    const nl = (await page.textContent('[data-pano="naoLidos"] > b') || '').trim();
    ok(nl === '1', R + 'de volta à Visão geral, o Panorama mostra 1 não lido (eram 2) (' + nl + ')');

    const vaiPara = (aba) => page.evaluate((a) => new Promise(r => window.__catedraApp.setState({ admTab: a }, r)), aba);
    const conta = (nome) => page.evaluate((n) => window.__admChamadas.filter(c => c.nome === n).length, nome);
    const ultimoSet = () => page.evaluate(() => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').pop().args);
    const servidor = (id) => page.evaluate((i) => ({ ...window.__admFb.find(f => f.id === i) }), id);
    const aviso = () => page.evaluate(() => { const t = window.__catedraApp._toastEl; return t ? t.textContent : ''; });

    /* ---- "Marcar como lido" (102): o número do Panorama cai sem mexer em status nem em nota ---- */
    await vaiPara('suporte');
    await page.waitForSelector('[data-adm-ler][data-id="102"]');
    ok(await naoLidosNaLista() === '102', R + 'registrada a resposta, o 101 sai dos não lidos da lista (sobra o 102)');
    await page.evaluate(() => { window.__admFalharMarcar = 1; });
    await page.click('[data-adm-ler][data-id="102"]');
    await page.waitForFunction(() => window.__admChamadas.some(c => c.nome === 'admin_marcar_feedback'), null, { timeout: 8000 });
    await page.waitForTimeout(400);
    ok(await naoLidosNaLista() === '102' && /Não deu para marcar como lido/.test(await aviso()), R + 'erro do servidor ao marcar como lido: o relato continua não lido e o aviso diz isso');
    await page.click('[data-adm-ler][data-id="102"]');
    await page.waitForSelector('[data-adm-ler][data-id="102"]', { state: 'detached', timeout: 8000 });
    const marcar = await page.evaluate(() => window.__admChamadas.filter(c => c.nome === 'admin_marcar_feedback').map(c => c.args));
    ok(marcar.length === 2 && JSON.stringify(marcar[1]) === JSON.stringify({ p_id: 102, p_lido: true }) && await naoLidosNaLista() === '' && (await servidor(102)).status === 'resolvido',
      R + '"Marcar como lido" chama admin_marcar_feedback {p_id:102, p_lido:true}, o selo some e o status fica (' + JSON.stringify(marcar[marcar.length - 1]) + ')');
    await vaiPara('visao');
    await page.waitForFunction(() => (document.querySelector('[data-pano="naoLidos"] > b') || { textContent: '' }).textContent.trim() === '0', null, { timeout: 8000 }).catch(() => {});
    const nl0 = (await page.textContent('[data-pano="naoLidos"] > b') || '').trim();
    ok(nl0 === '0', R + 'de volta à Visão geral, o Panorama mostra 0 não lidos (' + nl0 + ')');

    /* ---- Um rascunho por relato: abrir a resposta de outro não perde o que foi escrito ---- */
    await vaiPara('suporte');
    await page.waitForSelector('[data-adm-responder][data-id="103"]');
    const textoAberto = () => page.evaluate(() => { const t = document.querySelector('#adm-resp-txt'); return t ? t.closest('[data-adm-relato]').dataset.admRelato + ':' + t.value : ''; });
    await page.click('[data-adm-responder][data-id="103"]');
    await page.waitForSelector('[data-adm-relato="103"] #adm-resp-txt');
    await page.fill('#adm-resp-txt', 'Rascunho para a 103');
    await page.click('[data-adm-responder][data-id="104"]');
    await page.waitForSelector('[data-adm-relato="104"] #adm-resp-txt');
    const naOutra = await textoAberto();
    await page.click('[data-adm-responder][data-id="103"]');
    await page.waitForSelector('[data-adm-relato="103"] #adm-resp-txt');
    const deVolta = await textoAberto();
    ok(naOutra === '104:' && deVolta === '103:Rascunho para a 103', R + 'abrir a resposta de outro relato guarda o rascunho deste, e voltar a ele o traz de volta (' + naOutra + ' → ' + deVolta + ')');
    await page.click('[data-adm-resp] .adm-btn.ghost');   // Cancelar descarta o rascunho daquele relato
    await page.waitForSelector('[data-adm-resp]', { state: 'detached' });
    await page.click('[data-adm-responder][data-id="103"]');
    await page.waitForSelector('[data-adm-relato="103"] #adm-resp-txt');
    ok(await textoAberto() === '103:', R + '"Cancelar" descarta o rascunho do relato');
    await page.click('[data-adm-resp] .adm-btn.ghost');
    await page.waitForSelector('[data-adm-resp]', { state: 'detached' });

    /* ---- Console velho: os botões de status partem da nota de AGORA, não da que a tela carregou ---- */
    const RESP_IPAD = 'Pedi o print\n\n[resposta por e-mail em 25/11/2026 21:00] Já corrigi na 3.2.';
    await page.evaluate((n) => { window.__admFb.find(f => f.id === 104).nota_admin = n; }, RESP_IPAD);   // registrada no iPad; esta tela tem null
    let sets0 = await conta('admin_feedback_set');
    await page.click('button[data-id="104"][data-status="resolvido"]');
    await page.waitForFunction((n) => window.__admChamadas.filter(c => c.nome === 'admin_feedback_set').length > n, sets0, { timeout: 8000 });
    await page.waitForTimeout(400);
    const stArgs = await ultimoSet(), stTela = await page.evaluate(() => (document.querySelector('[data-adm-relato="104"] [data-adm-nota]') || { innerText: '' }).innerText);
    ok(stArgs.p_id === 104 && stArgs.p_status === 'resolvido' && stArgs.p_nota === RESP_IPAD && (await servidor(104)).nota_admin === RESP_IPAD && stTela.includes('[resposta por e-mail em 25/11/2026 21:00]'),
      R + '"Resolvido" num console carregado antes manda a nota relida: a resposta registrada no outro aparelho fica (' + JSON.stringify(stArgs) + ')');
    await page.evaluate(() => { window.__admFalharLeitura = 1; });
    sets0 = await conta('admin_feedback_set'); const leit0 = await conta('admin_feedback');
    await page.click('button[data-id="104"][data-status="andamento"]');
    await page.waitForFunction((n) => window.__admChamadas.filter(c => c.nome === 'admin_feedback').length > n, leit0, { timeout: 8000 });
    await page.waitForTimeout(400);
    ok(await conta('admin_feedback_set') === sets0 && (await servidor(104)).status === 'resolvido' && /Não deu para atualizar/.test(await aviso()), R + 'sem conseguir reler a linha, o botão de status não grava nada');

    /* ---- Nota interna: parte da nota relida; numa nota de várias linhas, o texto entra no fim ---- */
    const notaInterna = async (id, digitado) => {
      let dlg = null;
      page.once('dialog', async (d) => { dlg = { tipo: d.type(), msg: d.message(), padrao: d.defaultValue() }; await d.accept(digitado); });
      const leit = await conta('admin_feedback');
      await page.locator('button[data-id="' + id + '"]', { hasText: 'Nota interna' }).click();
      // a nota é relida antes do campo e de novo antes de gravar
      await page.waitForFunction((n) => window.__admChamadas.filter(c => c.nome === 'admin_feedback').length >= n + 2, leit, { timeout: 8000 });
      await page.waitForTimeout(400);
      return dlg;
    };
    sets0 = await conta('admin_feedback_set');
    const d1 = await notaInterna(104, 'Liguei de novo');
    const n1 = await ultimoSet();
    ok(!!d1 && d1.tipo === 'prompt' && d1.padrao === '' && /várias linhas/.test(d1.msg) && await conta('admin_feedback_set') === sets0 + 1 && n1.p_nota === RESP_IPAD + '\nLiguei de novo' && n1.p_status === 'resolvido' && (await servidor(104)).nota_admin === RESP_IPAD + '\nLiguei de novo',
      R + 'Nota interna numa nota de várias linhas: o campo de uma linha não a reescreve, o texto entra no fim e as linhas ficam (' + JSON.stringify(n1.p_nota) + ')');
    // o outro aparelho registra uma resposta ENTRE a leitura de antes do campo e a de antes de gravar: o texto entra no
    // fim da nota de AGORA (acrescentar à de antes do campo apagaria, calada, a resposta registrada lá)
    const N104 = RESP_IPAD + '\nLiguei de novo', N104_IPAD = N104 + '\n\n[resposta por e-mail em 25/11/2026 21:15] Resposta do iPad';
    await page.evaluate((n) => { window.__admMudarNaLeitura = { id: 104, nota: n, pular: 1 }; }, N104_IPAD);
    sets0 = await conta('admin_feedback_set');
    const d1b = await notaInterna(104, 'Novo texto');
    const n1b = await ultimoSet();
    ok(!!d1b && d1b.padrao === '' && await conta('admin_feedback_set') === sets0 + 1 && n1b.p_nota === N104_IPAD + '\nNovo texto' && /Resposta do iPad\nNovo texto$/.test((await servidor(104)).nota_admin),
      R + 'nota de várias linhas que muda no outro aparelho com o campo aberto: o texto entra no fim da nota relida e a resposta registrada lá fica (' + JSON.stringify(n1b.p_nota.slice(-40)) + ')');

    // Apagar a nota de várias linhas (resposta registrada no relato errado): campo vazio + confirmação
    const notaComDialogos = async (id, respostas, leituras) => {
      const vistos = [];
      const h = async (d) => { const r = respostas[vistos.length]; vistos.push({ tipo: d.type(), msg: d.message() }); if (r && r.aceitar) await d.accept(r.texto); else await d.dismiss(); };
      page.on('dialog', h);
      try {
        const leit = await conta('admin_feedback');
        await page.locator('button[data-id="' + id + '"]', { hasText: 'Nota interna' }).click();
        for (let i = 0; i < 80 && vistos.length < respostas.length; i++) await page.waitForTimeout(100);
        await page.waitForFunction((n) => window.__admChamadas.filter(c => c.nome === 'admin_feedback').length >= n, leit + leituras, { timeout: 8000 });
        await page.waitForTimeout(400);
      } finally { page.off('dialog', h); }
      return vistos;
    };
    const N104b = N104_IPAD + '\nNovo texto';
    sets0 = await conta('admin_feedback_set');
    const v1 = await notaComDialogos(104, [{ aceitar: true, texto: '' }, { aceitar: false }], 1);
    ok(v1.length === 2 && v1[0].tipo === 'prompt' && /apagar a nota inteira/.test(v1[0].msg) && v1[1].tipo === 'confirm' && /Não tem desfazer/.test(v1[1].msg) && await conta('admin_feedback_set') === sets0 && (await servidor(104)).nota_admin === N104b,
      R + 'nota de várias linhas com o campo vazio pede confirmação para apagar; sem confirmar, nada muda (' + v1.map(v => v.tipo).join(' → ') + ')');
    const v2 = await notaComDialogos(104, [{ aceitar: true, texto: '' }, { aceitar: true }], 2);
    const n2b = await ultimoSet();
    const semNotaNaTela = await page.evaluate(() => !!document.querySelector('[data-adm-relato="104"]') && !document.querySelector('[data-adm-relato="104"] [data-adm-nota]'));
    ok(v2.length === 2 && await conta('admin_feedback_set') === sets0 + 1 && n2b.p_id === 104 && n2b.p_nota === '' && n2b.p_status === 'resolvido' && (await servidor(104)).nota_admin === '' && semNotaNaTela && /Nota apagada/.test(await aviso()),
      R + 'confirmado, o campo vazio apaga a nota de várias linhas e o status fica (' + JSON.stringify(n2b) + ')');
    // a nota muda no outro aparelho entre as leituras: apagar não passa por cima do que não se viu
    await page.evaluate(() => { window.__admFb.find(f => f.id === 104).nota_admin = 'A\nB'; window.__admMudarNaLeitura = { id: 104, nota: 'A\nB\nC do iPad', pular: 1 }; });
    sets0 = await conta('admin_feedback_set');
    const v3 = await notaComDialogos(104, [{ aceitar: true, texto: '' }, { aceitar: true }], 2);
    ok(v3.length === 2 && await conta('admin_feedback_set') === sets0 && (await servidor(104)).nota_admin === 'A\nB\nC do iPad' && /mudou em outro aparelho/.test(await aviso()),
      R + 'se a nota de várias linhas muda no outro aparelho antes de apagar, nada é apagado e o aviso diz isso');
    await page.evaluate(() => { window.__admFb.find(f => f.id === 103).nota_admin = 'Ver depois'; });   // escrita no outro aparelho; esta tela tem null
    sets0 = await conta('admin_feedback_set');
    const d2 = await notaInterna(103, 'Ver depois: feito');
    const n2 = await ultimoSet();
    ok(!!d2 && d2.padrao === 'Ver depois' && await conta('admin_feedback_set') === sets0 + 1 && n2.p_id === 103 && n2.p_nota === 'Ver depois: feito' && n2.p_status === 'andamento',
      R + 'Nota interna abre com a nota relida do servidor, não com a que a tela carregou (' + (d2 && JSON.stringify(d2.padrao)) + ')');
    // a nota muda no outro aparelho com o campo aberto: nada é gravado por cima
    await page.evaluate(() => { window.__admMudarNaLeitura = { id: 103, nota: 'Mudou no iPad', pular: 1 }; });
    sets0 = await conta('admin_feedback_set');
    const d3 = await notaInterna(103, 'Por cima');
    ok(!!d3 && d3.padrao === 'Ver depois: feito' && await conta('admin_feedback_set') === sets0 && (await servidor(103)).nota_admin === 'Mudou no iPad' && /mudou em outro aparelho/.test(await aviso()),
      R + 'se a nota muda em outro aparelho com o campo aberto, nada é gravado por cima e o aviso diz isso');

    /* ---- Relato que sumiu do servidor: o registro não finge que gravou ---- */
    await page.click('[data-adm-responder][data-id="104"]');
    await page.waitForSelector('[data-adm-relato="104"] #adm-resp-txt');
    await page.fill('#adm-resp-txt', 'Respondi por e-mail');
    await page.evaluate(() => { window.__admFb = window.__admFb.filter(f => f.id !== 104); });   // apagado em outro aparelho
    sets0 = await conta('admin_feedback_set');
    await page.click('[data-adm-resp] .adm-btn.ok');
    await page.waitForSelector('[data-adm-relato="104"]', { state: 'detached', timeout: 8000 });
    ok(await conta('admin_feedback_set') === sets0 && /não está mais no servidor/.test(await aviso()), R + 'relato apagado no servidor: "Registrar resposta" não grava, avisa e recarrega o console (o relato sai da lista)');

    /* ---- App do Mac: o mailto: não sai do WKWebView (decidePolicyFor só manda http(s) para fora) ---- */
    // As pontes nativas são simuladas como o WKWebView as expõe: o Mac tem catedraBackup e não tem catedraAcervo.
    const hostNativo = (pontes, declara) => page.evaluate(({ pontes, declara }) => {
      if (!('__webkitOriginal' in window)) window.__webkitOriginal = Object.getOwnPropertyDescriptor(window, 'webkit') || null;
      if (pontes) { const mh = {}; pontes.forEach(n => { mh[n] = { postMessage: () => Promise.resolve({ ok: false }) }; });
        Object.defineProperty(window, 'webkit', { value: { messageHandlers: mh }, configurable: true, writable: true }); }
      else if (window.__webkitOriginal) Object.defineProperty(window, 'webkit', window.__webkitOriginal);
      else delete window.webkit;
      if (declara) window.__catedraMailto = true; else delete window.__catedraMailto;
      return new Promise(r => window.__catedraApp.setState({}, r));
    }, { pontes, declara });
    const acoesResposta = () => page.evaluate(() => ({ links: [...document.querySelectorAll('[data-adm-responder]')].map(a => a.dataset.id).join(), copiar: [...document.querySelectorAll('[data-adm-copiar]')].map(b => b.dataset.id).join() }));
    const web = await acoesResposta();
    await hostNativo(['catedraBackup'], false);
    const mac = await acoesResposta();
    ok(web.links === '101,103' && web.copiar === '' && mac.links === '' && mac.copiar === '101,103', R + 'no app do Mac não há link mailto: (não abriria nada): os relatos com e-mail ganham "Copiar endereço" (web ' + JSON.stringify(web) + ' · Mac ' + JSON.stringify(mac) + ')');
    await page.evaluate(() => { window.__copiado = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } }, configurable: true }); });
    await page.click('[data-adm-copiar][data-id="103"]');
    await page.waitForSelector('[data-adm-relato="103"] #adm-resp-txt', { timeout: 8000 });
    await page.waitForFunction(() => window.__copiado !== null && /Endereço copiado/.test((window.__catedraApp._toastEl || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    const copia = await page.evaluate(() => { const b = document.querySelector('[data-adm-copiar][data-id="103"]'), r = b.getBoundingClientRect(), l = document.querySelector('[data-adm-resp] label');
      return { copiado: window.__copiado, w: r.width, h: r.height, rotulo: l ? l.textContent.replace(/\s+/g, ' ').trim() : '' }; });
    ok(copia.copiado === 'outra@exemplo.test' && /Endereço copiado: escreva a resposta no Mail/.test(await aviso()) && /O que você respondeu a outra@exemplo\.test/.test(copia.rotulo),
      R + '"Copiar endereço" põe o e-mail do relato na área de transferência, avisa e abre o mesmo registro da resposta (' + copia.copiado + ')');
    ok(copia.w >= 44 && copia.h >= 44, R + 'no toque, "Copiar endereço" tem ≥ 44 px (' + Math.round(copia.w) + '×' + Math.round(copia.h) + ')');
    await page.click('[data-adm-resp] .adm-btn.ghost');
    await page.waitForSelector('[data-adm-resp]', { state: 'detached' });
    // sem área de transferência: o aviso não finge que copiou, e o endereço segue no rótulo do registro
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('negado')) }, configurable: true });
      document.execCommand = () => false; });
    await page.click('[data-adm-copiar][data-id="101"]');
    await page.waitForSelector('[data-adm-relato="101"] #adm-resp-txt', { timeout: 8000 });
    await page.waitForFunction(() => /Não deu para copiar/.test((window.__catedraApp._toastEl || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    ok(/Não deu para copiar: o endereço está no campo abaixo/.test(await aviso()) && /O que você respondeu a pessoa@exemplo\.test/.test(await page.evaluate(() => (document.querySelector('[data-adm-resp] label') || { textContent: '' }).textContent)),
      R + 'sem área de transferência, "Copiar endereço" avisa que não copiou e o endereço fica no rótulo do registro');
    await page.evaluate(() => { delete document.execCommand; delete navigator.clipboard; });
    await page.click('[data-adm-resp] .adm-btn.ghost');
    await page.waitForSelector('[data-adm-resp]', { state: 'detached' });
    // iPad (catedraAcervo; o host já abre mailto:) e Mac depois da mudança em Swift (declara __catedraMailto): o link volta
    await hostNativo(['catedraBackup', 'catedraAcervo'], false);
    const ipad = await acoesResposta();
    await hostNativo(['catedraBackup'], true);
    const macComMail = await acoesResposta();
    await hostNativo(null, false);
    const deVoltaWeb = await acoesResposta();
    ok(ipad.links === '101,103' && ipad.copiar === '' && macComMail.links === '101,103' && macComMail.copiar === '' && deVoltaWeb.links === '101,103',
      R + 'no iPad, e no Mac que declara abrir o Mail, o link mailto: continua (iPad ' + JSON.stringify(ipad) + ' · Mac declarado ' + JSON.stringify(macComMail) + ')');

    /* ---- Uma fonte que falha sozinha: só o número dela vira "indisponível" ---- */
    for (const [rpc, confere] of [
      ['admin_feedback', (m) => m.naoLidos.indisp === '1' && m.naoLidos.detalhe === 'relatos não carregaram' && ['contas', 'ativas7', 'ativas30', 'espera', 'erros24'].every(k => m[k].indisp === '0')],
      ['admin_erros_cliente', (m) => m.erros24.indisp === '1' && m.erros24.detalhe === 'erros não carregaram' && ['contas', 'ativas7', 'ativas30', 'espera', 'naoLidos'].every(k => m[k].indisp === '0')],
      ['admin_config', (m) => m.erros24.indisp === '0' && m.erros24.valor === '3' && m.erros24.detalhe === 'estado da telemetria indisponível'],
      ['admin_visao_geral', (m) => ['contas', 'ativas7', 'ativas30'].every(k => m[k].indisp === '1' && m[k].detalhe === 'visão geral não carregou') && ['espera', 'naoLidos', 'erros24'].every(k => m[k].indisp === '0')]]) {
      await abrirConsole(page, 'presente', { falhar: [rpc] });
      const p = await medirPanorama(page); const m = {}; p.itens.forEach(x => { m[x.id] = x; });
      ok(confere(m), R + 'só ' + rpc + ' falha: o Panorama marca indisponível só o que depende dela (' + p.itens.map(x => x.id + '=' + x.valor + ' · ' + x.detalhe).join(' | ') + ')');
      if (rpc === 'admin_visao_geral') {
        ok(p.kpis.length === 4 && p.kpis.every(t => /^— · .+ · visão geral não carregou$/.test(t)) && p.live.includes('IA hoje —') && p.live.includes('contas —'),
          R + 'sem a visão geral, os indicadores e a barra dizem "—" e o porquê, nada de 0 (' + p.kpis.join(' | ') + ' || ' + p.live.join(' | ') + ')');
        // os relatos carregaram (3 em aberto): "Pede atenção" lista o que sabe, e recursos e cadastros avisam que não carregaram
        const vz = await medirVizinhos(page);
        ok(vz.recursos.numeros.length === 0 && vz.recursos.avisos.length === 1 && vz.recursos.avisos[0].fonte === 'falhou' && vz.cadastros.avisos.length === 1 && !/Nenhum cadastro/.test(vz.cadastros.texto)
          && /3 relato\(s\) em aberto/.test(vz.atencao.texto) && !/Beta saudável/.test(vz.atencao.texto),
          R + 'só a visão geral falha: recursos e cadastros avisam em vez de "0 · 0%" e "nenhum cadastro"; "Pede atenção" mostra os relatos em aberto (' + vz.recursos.texto.slice(0, 70) + ' | ' + vz.cadastros.texto.slice(0, 70) + ')');
      }
    }

    /* ---- Relato com emoji no corte dos 400 (texto de terceiro): o app da administração não cai ---- */
    const errosAntes = errosPagina.length;
    await abrirConsole(page, 'presente', { cenario: 'emoji' });
    const e1 = await page.evaluate(() => ({ quebra: !!document.querySelector('.sc-logic-error'), itens: document.querySelectorAll('[data-adm="panorama"] [data-pano]').length,
      naoLidos: (document.querySelector('[data-pano="naoLidos"] > b') || { textContent: '' }).textContent.trim() }));
    ok(!e1.quebra && e1.itens === 6 && e1.naoLidos === '2', R + 'relato com emoji partido no corte dos 400 não derruba o render: o Panorama pinta (' + JSON.stringify(e1) + ')');
    await vaiPara('suporte');
    await page.waitForSelector('[data-adm-relato="302"]', { timeout: 8000 });
    const e2 = await page.evaluate(() => { const a = document.querySelector('[data-adm-responder][data-id="301"]'); let corpo = null;
      try { corpo = a ? decodeURIComponent(a.getAttribute('href').split('&body=')[1]) : null; } catch (e) { corpo = 'ERRO ' + e.message; }
      return { quebra: !!document.querySelector('.sc-logic-error'), relatos: document.querySelectorAll('[data-adm-relato]').length, ids: [...document.querySelectorAll('[data-adm-responder]')].map(x => x.dataset.id).join(), fim: corpo == null ? null : corpo.slice(-5) }; });
    ok(!e2.quebra && e2.relatos === 2 && e2.ids === '301' && e2.fim === '…\r\n\r\n', R + 'no Suporte, o relato com emoji ganha o link (citação cortada sem meio emoji) e o de substituto solto fica sem link (' + JSON.stringify(e2) + ')');
    ok(errosPagina.length === errosAntes, R + 'nenhum erro de página com os relatos de emoji (' + errosPagina.slice(errosAntes).join(' | ') + ')');
  } catch (e) { ok(false, R + 'exceção: ' + e.message.split('\n')[0]); }
  finally { await ctx.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarAdminVisaoFeedbackEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
