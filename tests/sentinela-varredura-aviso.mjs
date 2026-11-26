/* SENTINELA — VARREDURA POR ITEM E AVISO NO INÍCIO (25/11/2026) — revisao-oficial.js
   Parte 1 (Node, sem navegador): a última varredura de CADA item — do diário da coleção dele quando
   o pacote o traz (e a frase NOMEIA a coleção), senão do da fonte —, com a tentativa que falhou
   depois do último sucesso, a leitura parcial e a fonte sem dado; a frase; o link só para https de
   host oficial; e a contagem "conferida, aguardando o acervo" (conferida e já no acervo não conta;
   comparação parcial não conta, nem conferida).
   Parte 2 (navegador): a Central, o painel "Revisão oficial" e as abas oficiais do LEGIS e do JURIS
   com a data da última varredura e o link da fonte oficial em cada item; o chip do Início, que some
   com zero e abre a Central já filtrada (também com item da busca ao vivo); tudo MEDIDO (contraste
   ≥ 4,5:1, 44 px no toque, escuro, 390 px) e com a data LOCAL às 21 h em UTC−4
   (America/Porto_Velho), quando a data por toISOString já virou o dia.
   O contrato do item: detecção separada da incorporação — a marca "conferido" não incorpora nada.
   Roda sozinho: node tests/sentinela-varredura-aviso.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
import { abrirComponenteDoLeitor } from './_sessao-leitores.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  // URL entra na caixa: o módulo a usa para conferir o endereço oficial (no app é a do navegador)
  const caixa = { window: {}, URL };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'revisao-oficial.js'), 'utf8'), caixa);
  return caixa.window.CT_REVISAO_OFICIAL;
}

/* Relógio da parte 2: 25/11/2026 às 21:00 em Porto Velho (UTC−4) — em UTC já é 26/11. */
export const AGORA = '2026-11-26T01:00:00.000Z';
const URL_CDC = 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm';
const lei = (n, extra) => ({ fonte: 'planalto', tipo: 'alteracao', norma: 'CDC', normaNome: 'Código de Defesa do Consumidor', disp: 'Art. ' + n,
  titulo: 'Art. ' + n + ' — CDC', antes: 'antes do art. ' + n, depois: 'depois do art. ' + n, vigencia: 'em-vigor', revisar: false, urlOficial: URL_CDC, ...extra });

export const PACOTE = {
  geradoEm: '2026-11-25T13:30:00.000Z',
  fontes: {
    planalto: { rotulo: 'Planalto — texto compilado das normas', monitora: 'o texto compilado das normas do acervo', limites: ['só as normas do acervo de lei seca'],
      resultado: 'novidades', ultimaTentativa: '2026-11-25T12:30:00.000Z', ultimoSucesso: '2026-11-25T12:30:00.000Z', erro: null, detalhe: '' },
    // a fonte em dia ("parcial", com o último sucesso DELA agora) e as súmulas sem leitura: o item da coleção
    // não pode herdar a data da fonte. O motor de hoje deixaria a fonte "falha" (pior() das coleções); esse
    // formato é o da busca ao vivo do cenário A, que responde com as súmulas em falha.
    stf: { rotulo: 'STF — Informativo, repercussão geral e súmulas', monitora: 'o Informativo, a repercussão geral e as súmulas', limites: ['cobre o Informativo, não o inteiro teor'],
      resultado: 'parcial', ultimaTentativa: '2026-11-25T13:00:00.000Z', ultimoSucesso: '2026-11-25T13:00:00.000Z', erro: 'Súmulas: HTTP 503', detalhe: '',
      colecoes: {
        informativo: { rotulo: 'STF — Informativo de Jurisprudência', rotuloCurto: 'Informativo', resultado: 'sem-novidade', ultimaTentativa: '2026-11-25T11:15:00.000Z', ultimoSucesso: '2026-11-25T11:15:00.000Z', erro: null, detalhe: '' },
        rg: { rotulo: 'STF — Repercussão geral', rotuloCurto: 'Repercussão geral', resultado: 'novidades', ultimaTentativa: '2026-11-25T10:45:00.000Z', ultimoSucesso: '2026-11-25T10:45:00.000Z', erro: null, detalhe: '' },
        sumulas: { rotulo: 'STF — Súmulas e súmulas vinculantes', rotuloCurto: 'Súmulas', resultado: 'falha', ultimaTentativa: '2026-11-25T13:00:00.000Z', ultimoSucesso: null, erro: 'HTTP 503', detalhe: '' } } },
    // pacote de antes das coleções: o STJ sem `colecoes` — vale o diário da fonte, que falhou DEPOIS do último sucesso
    stj: { rotulo: 'STJ — Informativo de Jurisprudência', monitora: 'edições novas do Informativo', limites: ['SCON bloqueado para consulta automatizada'],
      resultado: 'falha', ultimaTentativa: '2026-11-26T00:30:00.000Z', ultimoSucesso: '2026-11-20T15:00:00.000Z', erro: 'ERRO-ISCA do portal do STJ', detalhe: '' },
  },
  itens: [
    lei('12', { id: 'pl-conf', detectadoEm: '2026-11-24T12:00:00.000Z' }),
    // já no acervo; e o endereço termina num host que só COMEÇA como o do Planalto
    lei('13', { id: 'pl-acervo', incorporado: true, incorporadoTxt: 'já no LEGIS', urlOficial: 'https://www.planalto.gov.br.isca.example/l8078.htm', detectadoEm: '2026-11-23T12:00:00.000Z' }),
    lei('14', { id: 'pl-parcial', parcial: true, revisar: true, urlOficial: 'http://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm', detectadoEm: '2026-11-22T12:00:00.000Z' }),
    { id: 'STF-RG-1234-tese', fonte: 'stf', colecao: 'rg', colecaoRotulo: 'STF — Repercussão geral', tipo: 'tese-fixada', numero: 1234, titulo: 'Tema 1234 — STF', disp: 'Tema 1234 — STF',
      norma: 'STF', normaNome: 'STF — Repercussão geral', antes: null, depois: 'Tese fixada no tema.', revisar: true,
      urlOficial: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?numeroTema=1234', detectadoEm: '2026-11-25T10:45:00.000Z' },
    { id: 'STF-SUM-999-nova', fonte: 'stf', colecao: 'sumulas', colecaoRotulo: 'STF — Súmulas', tipo: 'sumula-nova', numero: 999, titulo: 'Súmula 999 — STF', disp: 'Súmula 999 — STF',
      norma: 'STF', antes: null, depois: 'Enunciado novo.', revisar: true, urlOficial: 'https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp', detectadoEm: '2026-11-21T12:00:00.000Z' },
    // informativo de antes das coleções: sem `colecao`, é o Informativo
    { id: 'INF-STF-1300', fonte: 'stf', tipo: 'informativo', norma: 'STF', normaNome: 'STF — Informativo', disp: 'Informativo 1300 do STF', titulo: 'Informativo 1300 do STF',
      revisar: true, pendencia: 'edição detectada na fonte oficial', urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo1300.htm', detectadoEm: '2026-11-20T12:00:00.000Z' },
    { id: 'INF-STJ-950', fonte: 'stj', tipo: 'informativo', norma: 'STJ', normaNome: 'STJ — Informativo', disp: 'Informativo 950 do STJ', titulo: 'Informativo 950 do STJ', revisar: true,
      urlOficial: 'https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%270950%27.cod.', detectadoEm: '2026-11-19T12:00:00.000Z' },
  ],
};
/* As marcas da pessoa: duas conferidas fora do acervo (contam), uma conferida já no acervo (não
   conta) e uma só lida. O parcial fica sem marca. */
export const MARCAS = [{ id: 'pl-conf', up: 1, st: 'conferido' }, { id: 'pl-acervo', up: 1, st: 'conferido' },
  { id: 'STF-RG-1234-tese', up: 1, st: 'conferido' }, { id: 'INF-STF-1300', up: 1, st: 'lida' }];

export function testarSentinelaVarreduraAvisoEstatico(ok) {
  const R = 'VARREDURA/AVISO ';
  let M = null;
  try { M = carregar(); } catch (e) { ok(false, R + 'revisao-oficial.js carrega (' + e.message.split('\n')[0] + ')'); return; }
  ok(!!M && ['varreduraItem', 'varreduraTxt', 'urlSegura', 'aguardaAcervo', 'conferidosAguardando'].every((f) => typeof M[f] === 'function'),
    R + 'o módulo publica varreduraItem, varreduraTxt, urlSegura, aguardaAcervo e conferidosAguardando');

  // ── a última varredura por item ──
  const F = PACOTE.fontes, D = (iso) => 'D[' + iso + ']';
  const it = (id) => PACOTE.itens.find((i) => i.id === id);
  const v = (id) => M.varreduraItem(it(id), F);
  const vp = v('pl-conf');
  ok(vp.nivel === 'fonte' && vp.sucessoEm === F.planalto.ultimoSucesso && !vp.falhouDepois && !vp.semDado,
    R + 'lei do Planalto: vale o diário da fonte, com o último sucesso dela (' + JSON.stringify(vp) + ')');
  ok(M.varreduraTxt(vp, D) === 'Última varredura da fonte: D[2026-11-25T12:30:00.000Z]', R + 'a frase traz a data do último sucesso, no formatador de quem mostra');
  const vrg = v('STF-RG-1234-tese');
  ok(vrg.nivel === 'colecao' && vrg.sucessoEm === '2026-11-25T10:45:00.000Z' && !vrg.falhouDepois,
    R + 'item de coleção (repercussão geral) usa o diário da COLEÇÃO, não o da fonte (' + vrg.sucessoEm + ')');
  // a data é da coleção, e o cartão da fonte mostra outra ao lado: a frase não pode dizer "da fonte"
  ok(M.varreduraTxt(vrg, D) === 'Última varredura da coleção Repercussão geral (STF): D[2026-11-25T10:45:00.000Z]',
    R + 'a frase do item de coleção NOMEIA a coleção (rotuloCurto do pacote) e a fonte, sem dizer "da fonte" (' + M.varreduraTxt(vrg, D) + ')');
  const vsum = v('STF-SUM-999-nova');
  ok(vsum.sucessoEm === null && vsum.falhouDepois && vsum.falhaEm === '2026-11-25T13:00:00.000Z' && !vsum.semDado,
    R + 'coleção que falhou sem nenhum sucesso: sem data de sucesso, com a falha — embora a fonte esteja "parcial" com sucesso agora');
  ok(M.varreduraTxt(vsum, D) === 'Última varredura da coleção Súmulas (STF): nenhuma concluída · última tentativa falhou em D[2026-11-25T13:00:00.000Z]',
    R + 'a frase diz que nenhuma varredura da coleção se concluiu e quando a última tentativa falhou');
  const vinf = v('INF-STF-1300');
  ok(vinf.nivel === 'colecao' && vinf.sucessoEm === '2026-11-25T11:15:00.000Z', R + 'informativo sem `colecao` (pacote antigo) é da coleção Informativo');
  ok(M.varreduraTxt(vinf, D) === 'Última varredura da coleção Informativo (STF): D[2026-11-25T11:15:00.000Z]', R + 'e a frase diz "coleção Informativo (STF)"');
  ok(/^Última varredura da fonte: /.test(M.varreduraTxt(vp, D)) && /^Última varredura da fonte: /.test(M.varreduraTxt(v('INF-STJ-950'), D)),
    R + 'item sem diário de coleção (Planalto; STJ de pacote sem coleções) continua "da fonte"');
  const vnova = M.varreduraItem({ fonte: 'stj', colecao: 'nova' }, { stj: { colecoes: { nova: { resultado: 'novidades', ultimaTentativa: '2026-11-25T10:00:00Z', ultimoSucesso: '2026-11-25T10:00:00Z' } } } });
  ok(M.varreduraTxt(vnova, D) === 'Última varredura da coleção nova (STJ): D[2026-11-25T10:00:00Z]', R + 'coleção sem nome curto nem reserva: o id dela, sem inventar nome');
  const vstj = v('INF-STJ-950');
  ok(vstj.nivel === 'fonte' && vstj.falhouDepois && vstj.sucessoEm === '2026-11-20T15:00:00.000Z' && vstj.falhaEm === '2026-11-26T00:30:00.000Z',
    R + 'fonte sem coleções que falhou DEPOIS do último sucesso: guarda o sucesso e aponta a falha');
  ok(M.varreduraTxt(vstj, D) === 'Última varredura da fonte: D[2026-11-20T15:00:00.000Z] · última tentativa falhou em D[2026-11-26T00:30:00.000Z]',
    R + 'a frase traz as duas datas: o último sucesso e a tentativa que falhou depois dele');
  const vsem = M.varreduraItem({ id: 'x', fonte: 'stj' }, {});
  ok(vsem.semDado && vsem.nivel === '' && M.varreduraTxt(vsem, D) === 'Última varredura da fonte: não informada',
    R + 'fonte sem dado no pacote: "não informada" — nunca "nunca" nem uma data inventada');
  const vnula = M.varreduraItem({ id: 'x', fonte: 'planalto' }, { planalto: { resultado: null, ultimaTentativa: null, ultimoSucesso: null } });
  ok(vnula.semDado && vnula.nivel === 'fonte' && M.varreduraTxt(vnula, D) === 'Última varredura da fonte: não informada', R + 'fonte com o diário vazio (semente): "não informada"');
  ok(M.varreduraTxt(null, D) === 'Última varredura da fonte: não informada', R + 'sem varredura nenhuma, a frase não quebra');
  const vpar = M.varreduraItem({ fonte: 'planalto' }, { planalto: { resultado: 'parcial', ultimaTentativa: '2026-11-25T13:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z' } });
  ok(!vpar.falhouDepois && !vpar.parcial && vpar.sucessoEm === '2026-11-25T12:00:00Z', R + 'tentativa mais nova sem falha gravada no diário não vira "falhou" (nem "parcial": o sucesso mostrado é de antes)');
  // a rodada parcial MOVE o último sucesso (carimbar do motor): a data mostrada é a dela, e a frase avisa
  const vpp = M.varreduraItem({ fonte: 'planalto', norma: 'CDC' }, { planalto: { resultado: 'parcial', erro: 'CDC: leituras divergentes', ultimaTentativa: '2026-11-25T12:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z' } });
  ok(vpp.parcial && !vpp.falhouDepois && M.varreduraTxt(vpp, D) === 'Última varredura da fonte: D[2026-11-25T12:00:00Z] (leitura parcial)',
    R + 'rodada parcial do Planalto: a data ganha "(leitura parcial)" — a norma que não se leu pode ser a do item (' + M.varreduraTxt(vpp, D) + ')');
  const vcp = M.varreduraItem({ fonte: 'stj', colecao: 'repetitivos' }, { stj: { resultado: 'parcial', ultimaTentativa: '2026-11-25T12:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z',
    colecoes: { repetitivos: { rotuloCurto: 'Repetitivos', resultado: 'parcial', ultimaTentativa: '2026-11-25T12:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z' } } } });
  ok(M.varreduraTxt(vcp, D) === 'Última varredura da coleção Repetitivos (STJ): D[2026-11-25T12:00:00Z] (leitura parcial)', R + 'coleção com leitura parcial: a mesma ressalva');
  const vcpf = M.varreduraItem({ fonte: 'stj', colecao: 'repetitivos' }, { stj: { resultado: 'falha', ultimaTentativa: '2026-11-25T20:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z',
    colecoes: { repetitivos: { rotuloCurto: 'Repetitivos', resultado: 'parcial', ultimaTentativa: '2026-11-25T12:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z' } } } });
  ok(M.varreduraTxt(vcpf, D) === 'Última varredura da coleção Repetitivos (STJ): D[2026-11-25T12:00:00Z] (leitura parcial) · última tentativa falhou em D[2026-11-25T20:00:00Z]',
    R + 'leitura parcial seguida de falha do pedido inteiro: as duas ressalvas, cada uma no seu lugar');
  ok(!M.varreduraItem({ fonte: 'planalto' }, { planalto: { resultado: 'novidades', ultimaTentativa: '2026-11-25T12:00:00Z', ultimoSucesso: '2026-11-25T12:00:00Z' } }).parcial,
    R + 'leitura inteira não leva a ressalva');
  const vant = M.varreduraItem({ fonte: 'planalto' }, { planalto: { resultado: 'falha', ultimaTentativa: '2026-11-24T10:00:00Z', ultimoSucesso: '2026-11-25T10:00:00Z' } });
  ok(!vant.falhouDepois, R + 'falha ANTERIOR ao último sucesso (já superada) não aparece');
  const vlixo = M.varreduraItem({ fonte: 'planalto' }, { planalto: { resultado: 'falha', ultimaTentativa: 'ontem', ultimoSucesso: 'x' } });
  ok(vlixo.semDado && !vlixo.falhouDepois, R + 'data ilegível conta como ausente');
  const vcol = M.varreduraItem({ fonte: 'stf', colecao: 'repetitivos' }, F);
  ok(vcol.nivel === 'fonte' && vcol.sucessoEm === F.stf.ultimoSucesso, R + 'coleção que o pacote não descreve: vale o diário da fonte');
  // o pedido inteiro falhou NESTE aparelho (sem rede): o host grava só o diário da fonte
  const COLS = { informativo: { resultado: 'sem-novidade', ultimaTentativa: '2026-11-25T11:15:00.000Z', ultimoSucesso: '2026-11-25T11:15:00.000Z' },
    rg: { resultado: 'novidades', ultimaTentativa: '2026-11-25T10:45:00.000Z', ultimoSucesso: '2026-11-25T10:45:00.000Z' },
    sumulas: { resultado: 'falha', ultimaTentativa: '2026-11-25T09:00:00.000Z', ultimoSucesso: null } };
  const FL = { stf: { resultado: 'falha', ultimaTentativa: '2026-11-25T20:00:00.000Z', ultimoSucesso: '2026-11-25T13:00:00.000Z', colecoes: COLS } };
  const vfl = M.varreduraItem({ fonte: 'stf', colecao: 'rg' }, FL);
  ok(vfl.nivel === 'colecao' && vfl.sucessoEm === COLS.rg.ultimoSucesso && vfl.falhouDepois && vfl.falhaEm === FL.stf.ultimaTentativa && vfl.tentativaEm === FL.stf.ultimaTentativa,
    R + 'falha do pedido inteiro (só no diário da fonte, mais nova que toda coleção): o item da coleção guarda o sucesso DELA e mostra a falha (' + JSON.stringify(vfl) + ')');
  const vfls = M.varreduraItem({ fonte: 'stf', colecao: 'sumulas' }, FL);
  ok(vfls.falhouDepois && vfls.falhaEm === FL.stf.ultimaTentativa && vfls.sucessoEm === null, R + 'falha do pedido inteiro mais nova que a falha da própria coleção: vale a mais nova');
  ok(M.varreduraTxt(vfl, D) === 'Última varredura da coleção Repercussão geral (STF): D[2026-11-25T10:45:00.000Z] · última tentativa falhou em D[2026-11-25T20:00:00.000Z]',
    R + 'a frase do item da coleção diz a falha do pedido inteiro (o nome curto vem da reserva quando o pacote não o traz)');
  // rodada filtrada: só as súmulas rodaram (com a data da fonte) e falharam; a repercussão geral não rodou
  const FC = { stf: { resultado: 'falha', ultimaTentativa: '2026-11-25T20:00:00.000Z', ultimoSucesso: '2026-11-25T13:00:00.000Z',
    colecoes: { ...COLS, sumulas: { resultado: 'falha', ultimaTentativa: '2026-11-25T20:00:00.000Z', ultimoSucesso: null } } } };
  const vfc = M.varreduraItem({ fonte: 'stf', colecao: 'rg' }, FC);
  ok(!vfc.falhouDepois && vfc.sucessoEm === COLS.rg.ultimoSucesso, R + 'rodada só de uma coleção, que falhou: a coleção que não rodou não herda a falha alheia');
  ok(M.varreduraItem({ fonte: 'stf', colecao: 'sumulas' }, FC).falhaEm === '2026-11-25T20:00:00.000Z', R + 'a coleção que rodou e falhou mostra a própria falha');
  const FS = { stf: { resultado: 'sem-novidade', ultimaTentativa: '2026-11-25T20:00:00.000Z', ultimoSucesso: '2026-11-25T20:00:00.000Z', colecoes: COLS } };
  ok(!M.varreduraItem({ fonte: 'stf', colecao: 'rg' }, FS).falhouDepois, R + 'fonte sem falha não acende falha no item da coleção');
  const padrao = M.varreduraTxt(vstj);
  ok(/^Última varredura da fonte: .+ · última tentativa falhou em .+$/.test(padrao) && !/\d{4}-\d\d-\d\dT/.test(padrao),
    R + 'sem formatador, a data curta com hora do próprio módulo — nunca o ISO cru (' + padrao + ')');
  const reserva = M.varreduraTxt(vp, () => { throw new Error('formatador quebrado'); });
  ok(/^Última varredura da fonte: \d\d\/\d\d\/2026 \d\d:\d\d$/.test(reserva), R + 'formatador que falha cai na data e hora LOCAIS, não no recorte do ISO (' + reserva + ')');

  // ── o link da fonte oficial ──
  const U = M.urlSegura;
  ok(U(URL_CDC) === URL_CDC && U('https://portal.stf.jus.br/x?a=1') === 'https://portal.stf.jus.br/x?a=1' && !!U('https://processo.stj.jus.br/y') && !!U('https://stj.jus.br/z'),
    R + 'https de host oficial (e subdomínio dele) vira link');
  ok(['http://www.planalto.gov.br/x', 'https://www.planalto.gov.br.isca.example/x', 'https://isca-planalto.gov.br/x', 'javascript:alert(1)', 'ftp://www.stf.jus.br/x', '', null, 'nada']
    .every((u) => U(u) === ''), R + 'http, host que só começa como o oficial, outro esquema, vazio e texto solto não viram link');

  // ── conferida, aguardando o acervo ──
  const marcas = M.marcasDe(MARCAS);
  ok(M.conferidosAguardando(PACOTE.itens, marcas) === 2, R + 'duas conferidas fora do acervo na fixture (' + M.conferidosAguardando(PACOTE.itens, marcas) + ')');
  ok(M.aguardaAcervo(it('pl-conf'), marcas) && M.aguardaAcervo(it('STF-RG-1234-tese'), marcas), R + 'conferida e não incorporada conta');
  ok(!M.aguardaAcervo(it('pl-acervo'), marcas) && M.statusItem(it('pl-acervo'), marcas) === 'incorporado', R + 'conferida E já no acervo não conta: o status é "No acervo"');
  ok(!M.aguardaAcervo({ id: 'p', fonte: 'planalto', incorporado: true, parcial: true }, { p: { st: 'conferido' } }),
    R + 'incorporada com comparação parcial e conferida não conta: o acervo já a tem');
  ok(!M.aguardaAcervo(it('pl-parcial'), marcas) && M.statusItem(it('pl-parcial'), marcas) === 'parcial', R + 'parcial (sem a marca da pessoa) não conta');
  // o motor nunca dá baixa em item parcial (mesclarNovidades): contado, o aviso ficaria aceso para sempre
  ok(!M.aguardaAcervo({ id: 'r', fonte: 'planalto', parcial: true }, { r: { st: 'conferido' } })
    && M.statusItem({ id: 'r', fonte: 'planalto', parcial: true }, { r: { st: 'conferido' } }) === 'conferido',
    R + 'comparação parcial não conta nem conferida (o motor nunca a incorpora); a marca da pessoa continua "Conferido"');
  ok(M.conferidosAguardando(PACOTE.itens.concat([{ id: 'r', fonte: 'planalto', parcial: true }]), { ...marcas, r: { st: 'conferido', up: 1 } }) === 2,
    R + 'a contagem da fixture não muda com um parcial conferido a mais');
  ok(!M.aguardaAcervo(it('INF-STF-1300'), marcas) && !M.aguardaAcervo(it('INF-STJ-950'), marcas), R + 'lida não é conferida; sem marca também não conta');
  ok(M.conferidosAguardando(null, marcas) === 0 && M.conferidosAguardando([], marcas) === 0 && M.conferidosAguardando(PACOTE.itens, {}) === 0,
    R + 'lista vazia, nula ou sem marcas: zero (o chip some)');

  // ── itens(): o painel recebe a frase e o link prontos ──
  const L = M.itens(PACOTE, marcas), por = (id) => L.find((i) => i.id === id) || {};
  ok(por('pl-conf').fonteUrl === URL_CDC && por('pl-conf').temFonte === true && !por('pl-parcial').temFonte && !por('pl-acervo').temFonte && por('STF-RG-1234-tese').temFonte,
    R + 'itens(): o link só sai pronto para https de host oficial');
  ok(PACOTE.itens.every((i) => por(i.id).varreduraTxt === M.varreduraTxt(M.varreduraItem(i, F))), R + 'itens(): cada item traz a frase do SEU diário');
  ok(por('pl-conf').varreduraTxt === por('pl-parcial').varreduraTxt && por('STF-RG-1234-tese').varreduraTxt !== por('STF-SUM-999-nova').varreduraTxt,
    R + 'itens(): mesmo diário, mesma frase; coleções diferentes da mesma fonte, frases diferentes');
  ok(por('pl-conf').status === 'conferido' && por('pl-acervo').status === 'incorporado' && por('pl-parcial').status === 'parcial',
    R + 'itens(): o vocabulário de status não mudou (Conferido, No acervo, Parcial)');

  // ── o módulo continua ES5 (JavaScriptCore do WKWebView, file://) ──
  const src = fs.readFileSync(path.join(RAIZ, 'revisao-oficial.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const novo = (src.match(/=>|`|\blet\s|\bconst\s|\.\.\./g) || []);
  ok(novo.length === 0, R + 'revisao-oficial.js continua ES5: sem arrow, template, let/const nem spread (' + (novo.slice(0, 4).join(' ') || 'nenhum') + ')');

  // ── o host ──
  const host = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const auto = (host.match(/_autosaveKeys\(\)\{[^}]*\}/) || [''])[0];
  ok(!!auto && !auto.includes("'novidAguardando'"), R + 'o filtro "conferidas aguardando o acervo" é estado só de tela: fora do _autosaveKeys (nenhuma chave catedra: nova)');
  const ini = host.indexOf('<div class="cth-chips">'), chips = ini < 0 ? '' : host.slice(ini, host.indexOf('</header>', ini));
  ok(/<sc-if value="\{\{ nvConfAguardaShow \}\}"[^>]*><button type="button" class="cth-chip" data-acao="conferidas-aguardando" onclick="\{\{ novidVerConferidas \}\}"/.test(chips),
    R + 'o aviso do Início é um chip na fileira do cabeçalho, guardado por sc-if (some com zero) — não um bloco novo');
  ok(/\{\{ nvConfAguardaLabel \}\}<span aria-hidden="true">→<\/span><\/button>/.test(chips),
    R + 'o chip termina em "→" (leva a outra tela, como o "edições novas aguardando o acervo →"), fora do nome acessível');
  const p0 = host.indexOf('id="ct-revisao-oficial"'), painel = p0 < 0 ? '' : host.slice(p0, host.indexOf('<!-- EDITAR SESSÃO DO HISTÓRICO -->', p0));
  ok(painel.includes('data-of-varredura') && /<a class="ct-of-btn" data-acao="oficial" href="\{\{ n\.fonteUrl \}\}" target="_blank" rel="noopener noreferrer" aria-describedby="of-t-\{\{ n\.id \}\}">Fonte oficial/.test(painel)
    && /<div class="ct-of-titulo" id="of-t-\{\{ n\.id \}\}"/.test(painel) && !/href="\{\{ n\.urlOficial \}\}"/.test(painel),
    R + 'painel: a frase da varredura e o link "Fonte oficial" pelo endereço JÁ conferido (fonteUrl), descrito pelo título do item, nunca o cru');
  ok(/data-novid-varredura[^>]*>\{\{ n\.varreduraTxt \}\}/.test(host), R + 'Central: a linha da varredura no cartão de cada novidade');
  ok(/novidVerConferidas = \(\)=>\{\s*if\(this\._irPara\('novidades', \{[^}]*novidSoNaoLidas:false, novidAguardando:true\}\)/.test(host)
    && /novidLimparFiltros = \(\)=> this\.setState\(\{[^}]*novidAguardando:false\}\)/.test(host),
    R + 'o chip abre a Central só nas conferidas (sem o "Só não lidas", que as esconderia) e "Limpar os filtros" desliga o filtro');
  const ver0 = host.indexOf('  novidVerConferidas = ()=>{'), verCorpo = ver0 < 0 ? '' : host.slice(ver0, host.indexOf('\n  };\n', ver0));
  ok(/aria-label="Filtrar por situação" data-novid-situacao/.test(host) && verCorpo.includes("document.querySelector('[data-novid-situacao]')"),
    R + 'o chip desce até o filtro "Situação" (os itens logo abaixo), não até o título da lista, que no celular deixava os itens fora da vista');
  // quem mantém o filtro DIZ (o chip liga, a pílula de volta mantém): a tela de partida não serve de sinal —
  // "estava no LEGIS/JURIS" também é quem sai dele pelo menu, e aí a Central abria filtrada sem pedido
  ok(/if\(v==='novidades' && !\('novidAguardando' in x\)\) x\.novidAguardando=false;/.test(host) && !/novidAguardando[^\n]*this\.state\.view!=='legis'/.test(host),
    R + '_irPara: entrar na Central sem dizer nada do filtro (menu, paleta, inclusive saindo do LEGIS/JURIS da web) o desliga, sem adivinhar pela tela de partida');
  const vol0 = host.indexOf('  _voltarDoAcervo(de){'), volCorpo = vol0 < 0 ? '' : host.slice(vol0, host.indexOf('\n  }\n', vol0));
  ok(/const recorte=\(v==='novidades'\) \? \{novidAguardando:!!this\.state\.novidAguardando\} : \{\};/.test(volCorpo)
    && /this\._irPara\(v, \{acervoDe:null, acervoBusca:'', origemAbrir:q\.join\('&'\), origemAbrirView:v, \.\.\.recorte\}\)/.test(volCorpo),
    R + '_voltarDoAcervo: a pílula "Voltar à Central de novidades" devolve o filtro em que ela estava, dito ao _irPara');
  // os satélites leem o mesmo itens(): a frase e o endereço já conferido, nunca o urlOficial cru
  for (const [arq, rotulo] of [['legis-web.html', 'Ver no Planalto'], ['juris-web.html', 'Registro oficial']]) {
    const s = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
    ok(/\(i\.varreduraTxt\?'<div class="ct-of-meta" data-of-varredura>'\+R\.esc\(i\.varreduraTxt\)\+'<\/div>':''\)/.test(s)
      && new RegExp("\\(i\\.fonteUrl\\?'<a class=\"ct-of-btn\" href=\"'\\+R\\.esc\\(i\\.fonteUrl\\)\\+'\" target=\"_blank\" rel=\"noopener\">" + rotulo).test(s)
      && !/href="'\+R\.esc\(i\.urlOficial\)/.test(s),
      R + arq + ': a frase da varredura em cada item e o link "' + rotulo + '" pelo fonteUrl (nunca o urlOficial cru)');
  }
  // chave que nasce no _novidVM só pode ser usada dentro do bloco da Central (a régua do D16)
  const vm0 = host.indexOf('  _novidVM(){'), vm1 = host.indexOf('\n  }\n', vm0);
  const corpoVM = vm0 < 0 ? '' : host.slice(vm0, vm1);
  const n0 = host.indexOf('<sc-if value="{{ isNovid }}"'), n1 = host.indexOf('<!-- ================= CONQUISTAS ================= -->', n0);
  const usos = (k) => [...host.matchAll(new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g'))].map((m) => m.index);
  const daCentral = ['novidTemAguardando', 'novidAguardandoAttr', 'novidAguardandoEstilo', 'novidAguardandoRotulo', 'novidAguardandoTgl'];
  ok(daCentral.every((k) => corpoVM.includes(k + ':') && usos(k).length > 0 && usos(k).every((i) => i > n0 && i < n1)),
    R + 'as chaves do filtro nascem no _novidVM e só aparecem dentro do bloco da Central');
  ok(['nvConfAguardaShow', 'nvConfAguardaLabel', 'novidVerConferidas'].every((k) => !corpoVM.includes(k + ':') && new RegExp('\\b' + k + ':').test(host)),
    R + 'as chaves do chip nascem no render comum (o Início não monta o _novidVM)');
  // o filtro e o chip na MESMA régua do módulo: com a do host (_novidStatus), o parcial conferido entraria na lista
  // filtrada enquanto o chip e o rótulo do filtro diriam 1
  ok(/if\(st\.novidAguardando && !\(RO && RO\.aguardaAcervo\(it, mRO\)\)\) return false;/.test(corpoVM)
    && /const nAguarda=RO \? RO\.conferidosAguardando\(todos, mRO\) : 0;/.test(corpoVM)
    && /_nvRO\.conferidosAguardando\(_nvBase\.itens, _nvRO\.marcasDe\(this\.state\.novidLidas\)\)/.test(host),
    R + 'o filtro da Central, o rótulo dele e o chip do Início contam pela régua do módulo (aguardaAcervo), nunca pela do host');
  // trechos novos sem cor fixa: tokens sempre
  const novas = host.split('\n').filter((l) => /data-novid-varredura|data-of-varredura|data-novid-situacao|varreduraTxt|varreduraItem|frasesVarr|nvConfAguarda|_nvRO\b|novidAguardando|conferidas-aguardando|novidVerConferidas/.test(l));
  const sujas = novas.filter((l) => /#[0-9a-fA-F]{3,8}\b|rgba?\(|var\(--[\w-]+\s*,\s*#|\d+px/.test(l));
  ok(novas.length >= 8 && sujas.length === 0, R + 'as linhas novas do host não têm cor fixa nem px solto (' + novas.length + ' linhas; ' + (sujas.length ? sujas[0].trim().slice(0, 90) : 'nenhuma suja') + ')');
}

/* ---- Parte 2: navegador ---- */

/** Medidas na página: contraste WCAG do texto contra o fundo que fica atrás dele (camadas
 *  translúcidas compostas até uma opaca), lendo rgb(), rgba() e color(srgb …). */
const MEDIDAS = `(function(){
  function cor(s){ s=String(s||''); var m=(s.match(/-?\\d*\\.?\\d+(e-?\\d+)?/g)||[]).map(Number);
    if(/^color\\(srgb/.test(s)) return [m[0]*255,m[1]*255,m[2]*255,m.length>3?m[3]:1];
    return [m[0]||0,m[1]||0,m[2]||0,m.length>3?m[3]:1]; }
  function comp(c,b){ return [0,1,2].map(function(i){ return c[i]*c[3]+b[i]*(1-c[3]); }).concat([1]); }
  function lum(c){ var f=function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
  window.__vaContraste=function(el){
    var camadas=[]; for(var e=el;e;e=e.parentElement){ var b=cor(getComputedStyle(e).backgroundColor); if(b[3]>0) camadas.push(b); if(b[3]>0.99) break; }
    var fundo=camadas.reduceRight(function(acc,c){ return comp(c,acc); },[255,255,255,1]);
    var fg=cor(getComputedStyle(el).color); if(fg[3]<1) fg=comp(fg,fundo);
    var a=lum(fg), b2=lum(fundo); return Math.round(((Math.max(a,b2)+0.05)/(Math.min(a,b2)+0.05))*100)/100;
  };
})();`;

export async function testarSentinelaVarreduraAviso(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'VARREDURA/AVISO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();

  /** contexto próprio: relógio fixo, semente em base+'/__semente' ANTES de abrir o app (o autosave
   *  de 500 ms não corre com a semente) e o pacote de novidades trocado pela fixture */
  async function abrir({ viewport = { width: 1280, height: 900 }, toque = false, escuro = false, fuso = null, movimento = null, marcas = MARCAS } = {}) {
    const ctx = await browser.newContext({ viewport, hasTouch: toque, isMobile: false,
      ...(fuso ? { timezoneId: fuso } : {}), ...(movimento ? { reducedMotion: movimento } : {}) });
    try {
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', (e) => erros.push(String(e && e.message || e)));
      await page.clock.install({ time: new Date(AGORA) });
      // registradas DEPOIS da rota do harness: têm precedência
      await ctx.route('**/novidades.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8',
        body: '/* fixture */\nwindow.CT_NOVIDADES = ' + JSON.stringify(PACOTE) + ';' }));
      const api = [];
      await ctx.route('**/api/sentinela**', (r) => { api.push(r.request().url()); return r.fulfill({ status: 599, body: 'sem roteiro' }); });
      await page.goto(base + '/__semente');
      await page.evaluate(({ marcas, escuro }) => {
        localStorage.clear();
        const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
        set('auth', '1'); set('onboarded', '1'); set('aceite', { termos: 1, privacidade: 1, ts: Date.now() });
        set('areaEstudo', JSON.stringify('juridica'));
        if (marcas) set('novidLidas', marcas);
        if (escuro) localStorage.setItem('catedra:dark', '1');
      }, { marcas, escuro });
      // 60 s: com a máquina carregada a primeira carga do host passa dos 30 s (é carga, não defeito)
      await page.goto(base + '/' + (opcoes.arquivo || 'Catedra.dc.html'), { timeout: 60000 });
      await page.waitForFunction(() => !!window.__catedraApp && typeof window.__catedraGoView === 'function' && !!window.CT_REVISAO_OFICIAL, null, { timeout: 30000 });
      if (toque) {
        await page.waitForFunction(() => !!document.querySelector('[data-toque]'), null, { timeout: 20000 }).catch(() => {});
        await page.evaluate(() => { const a = window.__catedraApp; if (!a._toque) { a._toque = true; a.setState({}); } });
      }
      await page.evaluate(MEDIDAS);
      await page.waitForTimeout(900);
      return { ctx, page, erros, api };
    } catch (e) { await ctx.close().catch(() => {}); throw e; }
  }
  const ir = (page, v) => page.evaluate((v) => new Promise((r) => { window.__catedraGoView(v); setTimeout(r, 700); }), v);
  const CHIP = '.cth-chips button[data-acao="conferidas-aguardando"]';
  /** O nome acessível do chip (sem a seta aria-hidden) e a seta à parte. */
  const nomeChip = (page) => page.evaluate((CHIP) => {
    const b = document.querySelector(CHIP); if (!b) return { tem: false, nome: '', seta: '' };
    const c = b.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((x) => x.remove());
    const s = b.querySelector('span[aria-hidden="true"]');
    return { tem: true, nome: c.textContent.replace(/\s+/g, ' ').trim(), seta: s ? s.textContent.trim() : '' };
  }, CHIP);
  /** Depois do toque no chip: o filtro "Situação" abaixo da barra do topo, na tela, e o 1º item à vista. */
  const vistaDoFiltro = (page) => page.evaluate(() => {
    const g = document.querySelector('[data-novid-situacao]'), r = g && g.getBoundingClientRect();
    const cab = document.querySelector('.ct-topbar'), topo = cab ? cab.getBoundingClientRect().bottom : 0;
    const i1 = document.querySelector('[data-novid-item]'), ri = i1 && i1.getBoundingClientRect();
    return { ok: !!r && r.top >= topo - 1 && r.bottom <= innerHeight && !!ri && ri.top < innerHeight - 40 && ri.bottom > topo,
      medidas: r ? Math.round(r.top) + '/' + Math.round(topo) + ' · 1º item em ' + (ri ? Math.round(ri.top) : '?') + ' de ' + innerHeight : 'sem o filtro',
      rola: document.documentElement.scrollWidth - innerWidth };
  });

  /* ---------- A: mesa, claro, movimento reduzido ---------- */
  {
    let X = null;
    try {
      X = await abrir({ movimento: 'reduce' });
      const { page, erros, api } = X;
      await ir(page, 'inicio');
      const ini = await page.evaluate((CHIP) => {
        const b = document.querySelector(CHIP), r = b && b.getBoundingClientRect(), s = b && b.querySelector('svg');
        const M = window.CT_REVISAO_OFICIAL;
        return { tem: !!b, txt: b ? b.textContent.replace(/\s+/g, ' ').trim() : '', w: r ? r.width : 0, h: r ? r.height : 0,
          c: b ? window.__vaContraste(b) : 0, fs: b ? parseFloat(getComputedStyle(b).fontSize) : 0,
          ico: s ? s.getAttribute('width') + '|' + s.getAttribute('aria-hidden') : '',
          n: M.conferidosAguardando(window.CT_NOVIDADES.itens, M.marcasDe(window.__catedraApp.state.novidLidas)),
          enxuto: !document.querySelector('#ct-fontes-oficiais,#ct-semana,.cth-foco')
            && ![...document.querySelectorAll('main h2, main h3')].some((h) => /^(Fontes oficiais|O que mudou esta semana)$/.test(h.textContent.trim())) };
      }, CHIP);
      const nm = await nomeChip(page);
      ok(ini.tem && nm.nome === '2 novidades conferidas aguardando o acervo' && ini.n === 2,
        R + 'Início: o chip conta as conferidas fora do acervo pela régua do módulo (' + JSON.stringify(nm.nome) + ', módulo: ' + ini.n + ')');
      ok(nm.seta === '→', R + 'o chip termina em "→", escondido do leitor de tela: diz que leva a outra tela (' + JSON.stringify(ini.txt) + ')');
      ok(ini.w > 0 && ini.h > 0 && ini.c >= 4.5 && ini.fs >= 12, R + 'o chip pinta: caixa ' + Math.round(ini.w) + '×' + Math.round(ini.h) + ', contraste ' + ini.c + ':1, fonte ' + ini.fs + ' px');
      ok(ini.ico === '16|true', R + 'o ícone do chip é SVG de 16 px com aria-hidden (' + ini.ico + ')');
      ok(ini.enxuto, R + 'Início enxuto: o chip não traz de volta o resumo das fontes nem o bloco da semana');

      // o chip abre a Central já filtrada nas conferidas fora do acervo, descendo até a lista
      await page.click(CHIP);
      await page.waitForFunction(() => window.__catedraApp.state.view === 'novidades', null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const cen = await page.evaluate(() => {
        const t = document.querySelector('button[data-campo="novidAguardando"]'), g = t && t.closest('[role="group"]');
        const st = (id) => ((document.querySelector('[data-novid-item="' + id + '"] [data-selo="status"]') || {}).textContent || '').trim();
        return { view: window.__catedraApp.state.view, ag: window.__catedraApp.state.novidAguardando,
          ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')).sort().join(','),
          pressed: t ? t.getAttribute('aria-pressed') : '', rot: t ? t.textContent.replace(/\s+/g, ' ').trim() : '', grupo: g ? g.getAttribute('aria-label') : '',
          stConf: st('pl-conf'), incorporou: !!(window.CT_NOVIDADES.itens.find((i) => i.id === 'pl-conf') || {}).incorporado };
      });
      ok(cen.view === 'novidades' && cen.ag === true && cen.ids === 'STF-RG-1234-tese,pl-conf',
        R + 'o chip abre a Central só nas conferidas fora do acervo (' + cen.view + ': ' + cen.ids + ')');
      ok(cen.pressed === 'true' && cen.rot === 'Conferidas aguardando o acervo · 2' && cen.grupo === 'Filtrar por situação',
        R + 'o filtro aparece ligado (aria-pressed=true), com a mesma contagem do chip (' + cen.rot + ')');
      const vA = await vistaDoFiltro(page);
      ok(vA.ok, R + 'a Central abre já no filtro "Situação", abaixo da barra do topo (sticky), com o 1º item à vista (' + vA.medidas + ')');
      ok(cen.stConf === 'Conferido' && !cen.incorporou && api.length === 0,
        R + 'detecção separada da incorporação: a conferida segue "Conferido", não vira "No acervo", e nada foi pedido ao servidor');

      await page.click('button[data-campo="novidAguardando"]'); await page.waitForTimeout(400);
      const fora = await page.evaluate(() => ({ n: document.querySelectorAll('[data-novid-item]').length,
        pressed: (document.querySelector('button[data-campo="novidAguardando"]') || {}).getAttribute('aria-pressed') }));
      ok(fora.n === 7 && fora.pressed === 'false', R + 'desligar o filtro devolve as sete novidades (' + fora.n + ', aria-pressed=' + fora.pressed + ')');

      // a linha da varredura em cada cartão da Central, com a data por extenso dos cartões de fonte
      const lin = await page.evaluate(() => {
        const app = window.__catedraApp, F = window.CT_NOVIDADES.fontes, X = (iso) => app._novidDataExtenso(iso);
        const t = (id) => ((document.querySelector('[data-novid-item="' + id + '"] [data-novid-varredura]') || {}).textContent || '').replace(/\s+/g, ' ').trim();
        const els = [...document.querySelectorAll('[data-novid-item] [data-novid-varredura]')];
        return {
          casos: [
            ['pl-conf', t('pl-conf'), 'Última varredura da fonte: ' + X(F.planalto.ultimoSucesso)],
            ['STF-RG-1234-tese', t('STF-RG-1234-tese'), 'Última varredura da coleção Repercussão geral (STF): ' + X(F.stf.colecoes.rg.ultimoSucesso)],
            ['STF-SUM-999-nova', t('STF-SUM-999-nova'), 'Última varredura da coleção Súmulas (STF): nenhuma concluída · última tentativa falhou em ' + X(F.stf.colecoes.sumulas.ultimaTentativa)],
            ['INF-STF-1300', t('INF-STF-1300'), 'Última varredura da coleção Informativo (STF): ' + X(F.stf.colecoes.informativo.ultimoSucesso)],
            ['INF-STJ-950', t('INF-STJ-950'), 'Última varredura da fonte: ' + X(F.stj.ultimoSucesso) + ' · última tentativa falhou em ' + X(F.stj.ultimaTentativa)],
          ],
          // o cartão da fonte (STF) e o item da coleção mostram datas diferentes — e o item diz de quem é a dele
          rgNaoEhDaFonte: !t('STF-RG-1234-tese').includes(X(F.stf.ultimoSucesso)) && !/da fonte/.test(t('STF-RG-1234-tese'))
            && ((document.querySelector('[data-novid-fonte="stf"]') || {}).textContent || '').includes(X(F.stf.ultimoSucesso)),
          n: els.length, total: document.querySelectorAll('[data-novid-item]').length,
          detectada: [...document.querySelectorAll('[data-novid-item]')].every((e) => /detectada em/.test(e.innerText)),
          contraste: Math.min(...els.map((e) => window.__vaContraste(e))), altura: Math.min(...els.map((e) => e.getBoundingClientRect().height)),
          fonte: Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))) };
      });
      const erradas = lin.casos.filter(([, a, b]) => a !== b);
      ok(erradas.length === 0, R + 'Central: cada cartão diz a última varredura do SEU diário — fonte, coleção, falha depois do sucesso e coleção sem sucesso'
        + (erradas.length ? ' — diferem: ' + erradas.map(([id, a, b]) => id + ' «' + a + '» ≠ «' + b + '»').join(' | ').slice(0, 300) : ''));
      ok(lin.rgNaoEhDaFonte, R + 'Central: o tema de repercussão geral não mostra a data da fonte inteira nem diz "da fonte" — o cartão do STF, ao lado, mostra a dela');
      ok(lin.n === lin.total && lin.total === 7 && lin.detectada, R + 'Central: todo cartão tem "detectada em" e a linha da varredura (' + lin.n + '/' + lin.total + ')');
      ok(lin.contraste >= 4.5 && lin.altura > 0 && lin.fonte >= 11, R + 'Central: a linha da varredura pinta com contraste ≥ 4,5:1 (pior ' + lin.contraste + ':1, fonte ' + lin.fonte + ' px)');

      // o link da fonte oficial na Central e a mesma lista de hosts do módulo
      const lk = await page.evaluate(() => {
        const a = (id) => !!document.querySelector('a[data-acao="oficial"][data-id="' + id + '"]');
        const app = window.__catedraApp, M = window.CT_REVISAO_OFICIAL;
        const urls = ['https://www.planalto.gov.br/x', 'http://www.planalto.gov.br/x', 'https://portal.stf.jus.br/y?z=1', 'https://processo.stj.jus.br/z',
          'https://www.planalto.gov.br.isca.example/x', 'https://isca-planalto.gov.br/', 'javascript:alert(1)', '', 'nada'];
        return { conf: a('pl-conf'), rg: a('STF-RG-1234-tese'), stj: a('INF-STJ-950'), parcial: a('pl-parcial'), acervo: a('pl-acervo'),
          diferem: urls.filter((u) => app._novidUrl(u) !== M.urlSegura(u)) };
      });
      ok(lk.conf && lk.rg && lk.stj && !lk.parcial && !lk.acervo, R + 'Central: link da fonte oficial nos itens com https de host oficial; http e host falso ficam sem link');
      ok(lk.diferem.length === 0, R + 'a Central e o módulo aceitam exatamente os mesmos endereços (' + (lk.diferem.join(', ') || 'nenhuma diferença') + ')');

      // o painel "Revisão oficial": a mesma informação, na data curta do painel, e o link "Fonte oficial"
      await page.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await page.waitForTimeout(500);
      const dl = await page.evaluate(() => {
        const M = window.CT_REVISAO_OFICIAL, P = window.CT_NOVIDADES;
        const art = (id) => document.querySelector('#ct-revisao-oficial article[data-id="' + id + '"]');
        const lin = (id) => { const e = art(id) && art(id).querySelector('[data-of-varredura]'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
        const esp = (id) => M.varreduraTxt(M.varreduraItem(P.itens.find((i) => i.id === id), P.fontes));
        const link = (id) => { const a = art(id) && art(id).querySelector('a[data-acao="oficial"]'); if (!a) return null; const s = a.querySelector('svg');
          const desc = document.getElementById(a.getAttribute('aria-describedby') || '');
          return { href: a.href, target: a.target, rel: a.rel, txt: a.textContent.replace(/\s+/g, ' ').trim(), ico: s ? s.getAttribute('width') + '|' + s.getAttribute('aria-hidden') : '',
            c: window.__vaContraste(a), h: a.getBoundingClientRect().height,
            desc: !!desc && art(id).contains(desc) && desc.textContent.replace(/\s+/g, ' ').trim() === P.itens.find((i) => i.id === id).titulo }; };
        const ids = P.itens.map((i) => i.id);
        return { diferem: ids.filter((id) => lin(id) !== esp(id)), stj: lin('INF-STJ-950'), sum: lin('STF-SUM-999-nova'), pl: lin('pl-conf'),
          detectado: ids.every((id) => art(id) && /detectado em/.test(art(id).innerText)),
          conf: link('pl-conf'), rg: link('STF-RG-1234-tese'), parcial: link('pl-parcial'), acervo: link('pl-acervo'),
          contraste: Math.min(...ids.map((id) => { const e = art(id) && art(id).querySelector('[data-of-varredura]'); return e ? window.__vaContraste(e) : 0; })) };
      });
      ok(dl.diferem.length === 0, R + 'painel: cada item traz a frase da última varredura do seu diário (diferem: ' + (dl.diferem.join(', ') || 'nenhum') + ')');
      ok(/ · última tentativa falhou em /.test(dl.stj || '') && /^Última varredura da coleção Súmulas \(STF\): nenhuma concluída · /.test(dl.sum || '') && !/falhou/.test(dl.pl || ''),
        R + 'painel: a falha depois do sucesso e a coleção sem sucesso (nomeada) aparecem; a fonte em dia não fala em falha (' + dl.sum + ')');
      ok(dl.detectado, R + 'painel: "detectado em" continua em cada item');
      ok(!!dl.conf && dl.conf.href === URL_CDC && dl.conf.target === '_blank' && /noopener/.test(dl.conf.rel) && /noreferrer/.test(dl.conf.rel)
        && dl.conf.txt === 'Fonte oficial (abre em nova janela)' && dl.conf.ico === '16|true',
        R + 'painel: "Fonte oficial" é link https para o Planalto, em janela nova, noopener noreferrer, ícone SVG 16 px oculto (' + JSON.stringify(dl.conf) + ')');
      ok(!!dl.conf && dl.conf.desc && !!dl.rg && dl.rg.desc,
        R + 'painel: cada "Fonte oficial" é descrito pelo título do SEU item (aria-describedby) — sete links iguais não se distinguiam na lista de links');
      ok(!!dl.rg && /^https:\/\/portal\.stf\.jus\.br\//.test(dl.rg.href) && dl.parcial === null && dl.acervo === null,
        R + 'painel: tema do STF com link; http e host falso sem link');
      ok(dl.contraste >= 4.5 && !!dl.conf && dl.conf.c >= 4.5, R + 'painel: frase e link com contraste ≥ 4,5:1 (frase ' + dl.contraste + ':1, link ' + (dl.conf && dl.conf.c) + ':1)');
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      ok(api.length === 0 && erros.length === 0, R + 'sem pedido ao servidor e sem erro de página (' + api.length + ' pedidos; ' + erros.slice(0, 1).join('').slice(0, 120) + ')');
      if (process.env.CT_CAPTURA) {
        await ir(page, 'inicio'); await page.locator('.cth-welcome').screenshot({ path: process.env.CT_CAPTURA + '-inicio.png' }).catch(() => {});
        await page.click(CHIP); await page.waitForTimeout(700); await page.screenshot({ path: process.env.CT_CAPTURA + '-central.png' }).catch(() => {});
        await page.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await page.waitForTimeout(500);
        await page.locator('#ct-revisao-oficial').screenshot({ path: process.env.CT_CAPTURA + '-painel.png' }).catch(() => {});
        await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      }

      // sem rede NESTE aparelho: "Buscar atualizações agora" do STF falha inteiro e o host grava só o
      // diário da fonte — o item de cada coleção do STF diz que a última tentativa falhou; o Planalto não muda
      await X.ctx.unroute('**/api/sentinela**');
      await X.ctx.route('**/api/sentinela**', (r) => { api.push(r.request().url()); return r.abort(); });
      await page.evaluate(() => { const a = window.__catedraApp; a.novidLimparFiltros(); return a.novidBuscar({ currentTarget: { dataset: { fonte: 'stf' } } }); });
      await page.waitForTimeout(600);
      const sr = await page.evaluate(() => {
        const app = window.__catedraApp, X = (iso) => app._novidDataExtenso(iso), F = window.CT_NOVIDADES.fontes, R = app.state.novidResultado || {};
        const t = (id) => ((document.querySelector('[data-novid-item="' + id + '"] [data-novid-varredura]') || {}).textContent || '').replace(/\s+/g, ' ').trim();
        const falha = ' · última tentativa falhou em ' + X(R.quando);
        return { falhas: (R.falhas || []).join(','), quando: String(R.quando || ''),
          fonte: ((document.querySelector('[data-novid-fonte="stf"] .ct-selo') || {}).textContent || '').trim(),
          casos: [
            ['STF-RG-1234-tese', t('STF-RG-1234-tese'), 'Última varredura da coleção Repercussão geral (STF): ' + X(F.stf.colecoes.rg.ultimoSucesso) + falha],
            ['INF-STF-1300', t('INF-STF-1300'), 'Última varredura da coleção Informativo (STF): ' + X(F.stf.colecoes.informativo.ultimoSucesso) + falha],
            ['STF-SUM-999-nova', t('STF-SUM-999-nova'), 'Última varredura da coleção Súmulas (STF): nenhuma concluída' + falha],
            ['pl-conf', t('pl-conf'), 'Última varredura da fonte: ' + X(F.planalto.ultimoSucesso)],
            ['INF-STJ-950', t('INF-STJ-950'), 'Última varredura da fonte: ' + X(F.stj.ultimoSucesso) + ' · última tentativa falhou em ' + X(F.stj.ultimaTentativa)],
          ] };
      });
      const difSr = sr.casos.filter(([, a, b]) => a !== b);
      ok(sr.falhas === 'stf' && !!sr.quando && sr.fonte === 'Falhou' && api.length === 1,
        R + 'sem rede, a busca do STF falha neste aparelho e o cartão da fonte diz "Falhou" (' + JSON.stringify({ falhas: sr.falhas, fonte: sr.fonte, pedidos: api.length }) + ')');
      ok(difSr.length === 0, R + 'falha do pedido inteiro: cada item de coleção do STF diz que a última tentativa falhou, com o sucesso da SUA coleção; Planalto e STJ não mudam'
        + (difSr.length ? ' — diferem: ' + difSr.map(([id, a, b]) => id + ' «' + a + '» ≠ «' + b + '»').join(' | ').slice(0, 320) : ''));
      ok(erros.length === 0, R + 'A: sem erro de página depois da busca sem rede (' + erros.slice(0, 1).join('').slice(0, 120) + ')');

      // busca ao vivo que RESPONDE: as súmulas falham (a fonte inteira sai "Falhou", o pior das coleções)
      // e a repercussão geral traz um tema novo. O cartão do STF diz "Falhou"; o item diz a data DA
      // COLEÇÃO dele, nomeada. Depois o tema vivo, marcado como conferido, entra no chip e no filtro.
      const T2 = '2026-11-26T01:30:00.000Z';   // depois da tentativa sem rede (o relógio da página anda)
      const col = (rotuloCurto, resultado, ultimoSucesso, erro) => ({ rotuloCurto, resultado, ultimaTentativa: T2, ultimoSucesso, erro: erro || null, detalhe: '' });
      const VIVO = { fontes: { stf: { resultado: 'falha', ultimaTentativa: T2, ultimoSucesso: null, erro: 'Súmulas: HTTP 503', detalhe: '',
          colecoes: { informativo: col('Informativo', 'sem-novidade', T2), rg: col('Repercussão geral', 'novidades', T2), sumulas: col('Súmulas', 'falha', null, 'HTTP 503') } } },
        itens: [{ id: 'STF-RG-777-tese', fonte: 'stf', colecao: 'rg', colecaoRotulo: 'STF — Repercussão geral', tipo: 'tese-fixada', numero: 777, titulo: 'Tema 777 — STF',
          disp: 'Tema 777 — STF', norma: 'STF', normaNome: 'STF — Repercussão geral', antes: null, depois: 'Tese fixada no tema.', revisar: true,
          urlOficial: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?numeroTema=777', detectadoEm: T2 }],
        resumo: { novidades: 1, encontradas: 1, exigemRevisao: 1 } };
      await X.ctx.unroute('**/api/sentinela**');
      await X.ctx.route('**/api/sentinela**', (r) => { api.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VIVO) }); });
      await page.evaluate(() => window.__catedraApp.novidBuscar({ currentTarget: { dataset: { fonte: 'stf' } } }));
      await page.waitForTimeout(600);
      const vv = await page.evaluate((T2) => {
        const app = window.__catedraApp, X = (iso) => app._novidDataExtenso(iso);
        const t = (id) => ((document.querySelector('[data-novid-item="' + id + '"] [data-novid-varredura]') || {}).textContent || '').replace(/\s+/g, ' ').trim();
        const card = document.querySelector('[data-novid-fonte="stf"]');
        return { fonte: ((card && card.querySelector('.ct-selo')) || {}).textContent, vivo: !!document.querySelector('[data-novid-item="STF-RG-777-tese"]'),
          casos: [
            ['STF-RG-777-tese', t('STF-RG-777-tese'), 'Última varredura da coleção Repercussão geral (STF): ' + X(T2)],
            ['STF-SUM-999-nova', t('STF-SUM-999-nova'), 'Última varredura da coleção Súmulas (STF): nenhuma concluída · última tentativa falhou em ' + X(T2)],
          ] };
      }, T2);
      const difVv = vv.casos.filter(([, a, b]) => a !== b);
      ok(vv.fonte && vv.fonte.trim() === 'Falhou' && vv.vivo && difVv.length === 0 && api.length === 2,
        R + 'busca ao vivo com uma coleção em falha: o cartão do STF diz "Falhou" e o tema vivo diz a varredura DA COLEÇÃO dele, nomeada — sem contradizer o cartão'
        + (difVv.length ? ' — diferem: ' + difVv.map(([id, a, b]) => id + ' «' + a + '» ≠ «' + b + '»').join(' | ').slice(0, 320) : ' (' + JSON.stringify(vv.fonte) + ')'));
      await page.evaluate(() => window.__catedraApp._novidMarcar('STF-RG-777-tese', 'conferido')); await page.waitForTimeout(400);
      await ir(page, 'inicio');
      const nv = await nomeChip(page);
      ok(nv.nome === '3 novidades conferidas aguardando o acervo', R + 'item da busca ao vivo marcado como conferido entra no chip (' + JSON.stringify(nv.nome) + ')');
      await page.click(CHIP);
      await page.waitForFunction(() => window.__catedraApp.state.view === 'novidades', null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const fv = await page.evaluate(() => ({ ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')).sort().join(','),
        st: ((document.querySelector('[data-novid-item="STF-RG-777-tese"] [data-selo="status"]') || {}).textContent || '').trim() }));
      ok(fv.ids === 'STF-RG-1234-tese,STF-RG-777-tese,pl-conf' && fv.st === 'Conferido' && api.length === 2,
        R + 'o chip abre a Central filtrada com o item vivo; ele segue "Conferido" (nada incorporado, nenhum pedido novo ao servidor) (' + fv.ids + ')');
      ok(erros.length === 0, R + 'A: sem erro de página depois da busca ao vivo (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } catch (e) { ok(false, R + 'A: exceção ' + String(e && e.message || e).split('\n')[0]); }
    finally { if (X) await X.ctx.close(); }
  }

  /* ---------- B: iPad no toque (820×1180), escuro, 21 h em Porto Velho (UTC−4) ---------- */
  {
    let X = null;
    try {
      X = await abrir({ viewport: { width: 820, height: 1180 }, toque: true, escuro: true, fuso: 'America/Porto_Velho' });
      const { page, erros } = X;
      await ir(page, 'inicio');
      const bi = await page.evaluate((CHIP) => {
        const b = document.querySelector(CHIP), r = b && b.getBoundingClientRect(), raiz = document.querySelector('[data-dir]');
        return { tem: !!b, h: r ? r.height : 0, w: r ? r.width : 0, c: b ? window.__vaContraste(b) : 0,
          escuro: raiz ? raiz.getAttribute('data-dark') : '', toque: raiz ? raiz.getAttribute('data-toque') : '', rola: document.documentElement.scrollWidth - innerWidth };
      }, CHIP);
      ok(bi.tem && bi.escuro === '1' && bi.toque === '1', R + 'iPad/escuro: o chip aparece com o toque e o tema escuro ligados (' + JSON.stringify({ escuro: bi.escuro, toque: bi.toque }) + ')');
      ok(bi.h >= 44 && bi.w >= 44 && bi.c >= 4.5 && bi.rola <= 0, R + 'iPad/escuro: o chip mede ' + Math.round(bi.w) + '×' + Math.round(bi.h) + ' (≥ 44), contraste ' + bi.c + ':1, sem rolagem lateral');
      if (process.env.CT_CAPTURA) await page.locator('.cth-welcome').screenshot({ path: process.env.CT_CAPTURA + '-ipad-escuro-inicio.png' }).catch(() => {});
      await page.tap(CHIP);
      await page.waitForFunction(() => window.__catedraApp.state.view === 'novidades', null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const bc = await page.evaluate(() => {
        const t = document.querySelector('button[data-campo="novidAguardando"]'), r = t && t.getBoundingClientRect();
        const els = [...document.querySelectorAll('[data-novid-varredura]')];
        return { h: r ? r.height : 0, ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')).sort().join(','),
          contraste: els.length ? Math.min(...els.map((e) => window.__vaContraste(e))) : 0, rola: document.documentElement.scrollWidth - innerWidth };
      });
      ok(bc.ids === 'STF-RG-1234-tese,pl-conf' && bc.h >= 44 && bc.contraste >= 4.5 && bc.rola <= 0,
        R + 'iPad/escuro: o toque no chip abre a Central filtrada; o filtro mede ' + Math.round(bc.h) + ' px; a linha da varredura tem ' + bc.contraste + ':1');
      if (process.env.CT_CAPTURA) await page.screenshot({ path: process.env.CT_CAPTURA + '-ipad-escuro-central.png' }).catch(() => {});
      await page.tap('button[data-campo="novidAguardando"]'); await page.waitForTimeout(400);
      const stj = await page.evaluate(() => ((document.querySelector('[data-novid-item="INF-STJ-950"] [data-novid-varredura]') || {}).textContent || '').replace(/\s+/g, ' ').trim());
      ok(/fonte: 20 de novembro de 2026/.test(stj) && /11:00/.test(stj) && /falhou em 25 de novembro de 2026/.test(stj) && /20:30/.test(stj) && !/26 de novembro/.test(stj),
        R + 'às 21 h em UTC−4 a falha das 00:30 UTC sai no dia LOCAL (25/11, 20:30), não no dia de Greenwich (' + stj + ')');
      await page.evaluate(() => window.__catedraApp.oficialPainelAbrir()); await page.waitForTimeout(500);
      const bd = await page.evaluate(() => {
        const a = document.querySelector('#ct-revisao-oficial article[data-id="pl-conf"] a[data-acao="oficial"]'), r = a && a.getBoundingClientRect();
        const m = document.querySelector('#ct-revisao-oficial article[data-id="INF-STJ-950"] [data-of-varredura]');
        return { h: r ? r.height : 0, w: r ? r.width : 0, c: a ? window.__vaContraste(a) : 0, cm: m ? window.__vaContraste(m) : 0, s: m ? m.textContent.replace(/\s+/g, ' ').trim() : '' };
      });
      ok(bd.h >= 44 && bd.w >= 44 && bd.c >= 4.5 && bd.cm >= 4.5,
        R + 'iPad/escuro: "Fonte oficial" no painel mede ' + Math.round(bd.w) + '×' + Math.round(bd.h) + ' (≥ 44) e tem ' + bd.c + ':1; a frase da varredura ' + bd.cm + ':1');
      ok(/fonte: 20 de nov/.test(bd.s) && /falhou em 25 de nov/.test(bd.s) && /20:30/.test(bd.s) && !/26 de nov/.test(bd.s),
        R + 'painel às 21 h em UTC−4: a data curta também é a local (' + bd.s + ')');
      ok(erros.length === 0, R + 'iPad/escuro: sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } catch (e) { ok(false, R + 'B: exceção ' + String(e && e.message || e).split('\n')[0]); }
    finally { if (X) await X.ctx.close(); }
  }

  /* ---------- C: celular (390 px, toque): sem conferida fora do acervo o chip some; marcar, abrir (a
     lista filtrada = o que o chip conta), ir ao LEGIS e voltar pela pílula (o filtro fica), sair e
     voltar pelo menu, do Início e do LEGIS (o filtro sai); desmarcar ---------- */
  {
    let X = null;
    try {
      X = await abrir({ viewport: { width: 390, height: 844 }, toque: true, movimento: 'reduce',
        marcas: [{ id: 'pl-acervo', up: 1, st: 'conferido' }, { id: 'pl-parcial', up: 1, st: 'conferido' }] });
      const { page, erros } = X;
      await ir(page, 'inicio');
      const c0 = await page.evaluate((CHIP) => ({ chip: !!document.querySelector(CHIP), show: window.__catedraApp.renderVals().nvConfAguardaShow }), CHIP);
      ok(!c0.chip && c0.show === false, R + 'com zero, o chip não aparece: conferida já no acervo e parcial conferida não contam');
      await page.evaluate(() => window.__catedraApp._novidMarcar('pl-conf', 'conferido')); await page.waitForTimeout(400);
      const c1 = (await nomeChip(page)).nome;
      ok(c1 === '1 novidade conferida aguardando o acervo', R + 'marcar uma como conferida acende o chip, no singular (' + JSON.stringify(c1) + ')');
      // no celular o cartão de filtros ocupa a primeira tela: o toque desce até o filtro, com o item logo abaixo
      await page.tap(CHIP);
      await page.waitForFunction(() => window.__catedraApp.state.view === 'novidades', null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const vC = await vistaDoFiltro(page);
      ok(vC.ok && vC.rola <= 0, R + '390 px: o toque no chip mostra o filtro "Situação" ligado e o item conferido, sem rolagem lateral (' + vC.medidas + ')');
      if (process.env.CT_CAPTURA) await page.screenshot({ path: process.env.CT_CAPTURA + '-fone-central.png' }).catch(() => {});
      // a lista filtrada mostra o que o chip conta: aqui há um parcial conferido e uma conferida já no acervo,
      // que nenhuma das duas réguas pode deixar entrar — o chip diz 1, o filtro diz 1, a lista tem 1
      const listaC = () => page.evaluate(() => { const t = document.querySelector('button[data-campo="novidAguardando"]');
        return { view: window.__catedraApp.state.view, ag: window.__catedraApp.state.novidAguardando,
          ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')).sort().join(','),
          rot: t ? t.textContent.replace(/\s+/g, ' ').trim() : '', pressed: t ? t.getAttribute('aria-pressed') : '' }; });
      const fC = await listaC();
      ok(fC.ids === 'pl-conf' && fC.rot === 'Conferidas aguardando o acervo · 1' && fC.pressed === 'true',
        R + 'a Central filtrada mostra só o que o chip conta: a conferida fora do acervo, sem o parcial conferido nem a já no acervo (' + JSON.stringify(fC) + ')');
      // ida ao LEGIS da web pelo item e volta pela pílula "Voltar à Central de novidades": o recorte volta junto.
      // A tela do LEGIS é posta direto (o _irPara('legis') real pede a conta do leitor), na mesma volta do
      // relógio da ida: o estado é o que conta, e o iframe do leitor nem chega a montar.
      const volta = await page.evaluate(() => new Promise((r) => { const a = window.__catedraApp;
        a.setState({ view: 'legis', acervoDe: a._origemAqui() }); const de = a.state.acervoDe, res = a._voltarDoAcervo(de);
        setTimeout(() => r({ res, de: de && de.view, view: a.state.view, ag: a.state.novidAguardando,
          ids: [...document.querySelectorAll('[data-novid-item]')].map((e) => e.getAttribute('data-novid-item')).sort().join(',') }), 700); }));
      ok(volta.res === true && volta.de === 'novidades' && volta.view === 'novidades' && volta.ag === true && volta.ids === 'pl-conf',
        R + 'a pílula de volta do LEGIS devolve a Central no recorte em que ela estava (' + JSON.stringify(volta) + ')');
      // sair e voltar pela navegação comum (menu, paleta): a Central abre inteira, sem o filtro que o chip ligou
      await ir(page, 'inicio'); await ir(page, 'novidades');
      const cm = await page.evaluate(() => ({ ag: window.__catedraApp.state.novidAguardando, n: document.querySelectorAll('[data-novid-item]').length,
        pressed: (document.querySelector('button[data-campo="novidAguardando"]') || { getAttribute: () => '' }).getAttribute('aria-pressed') }));
      ok(cm.ag === false && cm.n === 7 && cm.pressed === 'false', R + 'pelo menu, a Central abre com as sete novidades e o filtro desligado (' + JSON.stringify(cm) + ')');
      // e também quando a pessoa está no LEGIS da web e vai à Central pelo menu (não pela pílula): antes o
      // _irPara tomava "estava no LEGIS/JURIS" por volta do acervo e a Central abria filtrada sem pedido
      await ir(page, 'inicio'); await page.tap(CHIP);
      await page.waitForFunction(() => window.__catedraApp.state.view === 'novidades' && window.__catedraApp.state.novidAguardando === true, null, { timeout: 8000 }).catch(() => {});
      await page.evaluate(() => new Promise((r) => { const a = window.__catedraApp;
        a.setState({ view: 'legis', acervoDe: null }); window.__catedraGoView('novidades'); setTimeout(r, 700); }));
      const doLegis = await listaC();
      ok(doLegis.view === 'novidades' && doLegis.ag === false && doLegis.ids.split(',').length === 7 && doLegis.pressed === 'false',
        R + 'do LEGIS da web para a Central pelo menu: ela abre inteira, com o filtro desligado (' + JSON.stringify({ ag: doLegis.ag, n: doLegis.ids.split(',').length, pressed: doLegis.pressed }) + ')');
      await ir(page, 'inicio');
      // baixa estimulação: o chip informa sobre o acervo, não cobra nada da pessoa — fica, e parado
      await page.evaluate(() => new Promise((r) => { const a = window.__catedraApp; a.setState({ prefs: { ...(a.state.prefs || {}), baixaEstimulacao: true } }, () => setTimeout(r, 300)); }));
      const c2 = await page.evaluate((CHIP) => { const b = document.querySelector(CHIP), cs = b && getComputedStyle(b), raiz = document.querySelector('[data-dir]');
        return { baixa: raiz ? raiz.getAttribute('data-baixa') : '', vis: !!b && b.getBoundingClientRect().height > 0, anim: cs ? cs.animationName : '', gam: !!(b && b.closest('.ct-gam')) }; }, CHIP);
      ok(c2.baixa === '1' && c2.vis && (c2.anim === 'none' || c2.anim === '') && !c2.gam, R + 'baixa estimulação: o chip continua (é informação, não pressão), sem animação (' + JSON.stringify(c2) + ')');
      await page.evaluate(() => window.__catedraApp._novidMarcar('pl-conf', 'lida')); await page.waitForTimeout(400);
      ok(!(await page.evaluate((CHIP) => !!document.querySelector(CHIP), CHIP)), R + '"Manter em revisão" (a marca volta a lida): o chip some');
      ok(erros.length === 0, R + 'C: sem erro de página (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } catch (e) { ok(false, R + 'C: exceção ' + String(e && e.message || e).split('\n')[0]); }
    finally { if (X) await X.ctx.close(); }
  }

  /* ---------- D: "Mudanças oficiais" (LEGIS) e "Informativos oficiais" (JURIS) na web: a mesma
     frase da varredura e o mesmo link conferido em cada item, lidos do mesmo itens() ---------- */
  {
    let ctx = null;
    try {
      ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.route('**/novidades.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8',
        body: '/* fixture */\nwindow.CT_NOVIDADES = ' + JSON.stringify(PACOTE) + ';' }));
      const page = await ctx.newPage();
      // a carga do acervo do JURIS passa dos 30 s com a máquina carregada (é carga, não defeito)
      page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
      const erros = []; page.on('pageerror', (e) => erros.push(String(e && e.message || e)));
      const ler = async (caixa, n) => {
        await page.waitForFunction(({ caixa, n }) => document.querySelectorAll(caixa + ' article[data-id]').length >= n, { caixa, n }, { timeout: 30000 }).catch(() => {});
        await page.evaluate(MEDIDAS);
        return page.evaluate((caixa) => {
          const M = window.CT_REVISAO_OFICIAL, P = window.CT_NOVIDADES;
          return [...document.querySelectorAll(caixa + ' article[data-id]')].map((a) => {
            const id = a.getAttribute('data-id'), it = P.itens.find((i) => i.id === id) || {}, m = a.querySelector('[data-of-varredura]'), l = a.querySelector('a.ct-of-btn');
            return { id, txt: m ? m.textContent.replace(/\s+/g, ' ').trim() : null, esp: M.varreduraTxt(M.varreduraItem(it, P.fontes)),
              c: m ? window.__vaContraste(m) : 0, h: m ? m.getBoundingClientRect().height : 0, href: l ? l.href : null, url: M.urlSegura(it.urlOficial) || null };
          });
        }, caixa);
      };
      const conferir = (nome, L, ids) => {
        const porId = Object.fromEntries(L.map((x) => [x.id, x]));
        const faltam = ids.filter((id) => !porId[id]);
        const frase = L.filter((x) => x.txt !== x.esp);
        const link = L.filter((x) => x.href !== x.url);
        ok(faltam.length === 0 && frase.length === 0, R + nome + ': cada item traz a frase da última varredura do SEU diário'
          + (faltam.length ? ' — faltam: ' + faltam.join(', ') : '') + (frase.length ? ' — diferem: ' + frase.map((x) => x.id + ' «' + x.txt + '» ≠ «' + x.esp + '»').join(' | ').slice(0, 300) : ''));
        ok(L.length > 0 && Math.min(...L.map((x) => x.c)) >= 4.5 && Math.min(...L.map((x) => x.h)) > 0,
          R + nome + ': a frase pinta com contraste ≥ 4,5:1 (pior ' + (L.length ? Math.min(...L.map((x) => x.c)) : 0) + ':1)');
        ok(link.length === 0, R + nome + ': o link da fonte só sai para https de host oficial, pelo endereço já conferido'
          + (link.length ? ' — diferem: ' + link.map((x) => x.id + ' ' + x.href + ' ≠ ' + x.url).join(' | ').slice(0, 300) : ''));
        return porId;
      };
      await abrirComponenteDoLeitor(page, base + '/legis-web.html?area=juridica&oficial=pl-conf');
      const L = conferir('LEGIS "Mudanças oficiais"', await ler('#oficialLegis', 3), ['pl-conf', 'pl-acervo', 'pl-parcial']);
      ok(!!L['pl-conf'] && L['pl-conf'].href === URL_CDC && L['pl-parcial'] && L['pl-parcial'].href === null && L['pl-acervo'] && L['pl-acervo'].href === null,
        R + 'LEGIS: "Ver no Planalto" no item https; o http e o host falso ficam sem link (antes o endereço cru virava link)');
      if (process.env.CT_CAPTURA) await page.locator('#oficialLegis article[data-id="pl-conf"]').screenshot({ path: process.env.CT_CAPTURA + '-legis.png' }).catch(() => {});
      await abrirComponenteDoLeitor(page, base + '/juris-web.html?oficial=INF-STF-1300');
      const J = conferir('JURIS "Informativos oficiais"', await ler('#oficialJuris', 4), ['STF-RG-1234-tese', 'STF-SUM-999-nova', 'INF-STF-1300', 'INF-STJ-950']);
      ok(!!J['STF-SUM-999-nova'] && /^Última varredura da coleção Súmulas \(STF\): nenhuma concluída · última tentativa falhou em /.test(J['STF-SUM-999-nova'].txt || '')
        && !!J['INF-STJ-950'] && /^Última varredura da fonte: .+ · última tentativa falhou em /.test(J['INF-STJ-950'].txt || ''),
        R + 'JURIS: a coleção sem sucesso e a fonte que falhou depois do sucesso aparecem como no Cátedra (' + (J['STF-SUM-999-nova'] || {}).txt + ')');
      if (process.env.CT_CAPTURA) await page.locator('#oficialJuris').screenshot({ path: process.env.CT_CAPTURA + '-juris.png' }).catch(() => {});
      ok(erros.length === 0, R + 'D: sem erro de página nos satélites (' + erros.slice(0, 1).join('').slice(0, 120) + ')');
    } catch (e) { ok(false, R + 'D: exceção ' + String(e && e.message || e).split('\n')[0]); }
    finally { if (ctx) await ctx.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarSentinelaVarreduraAvisoEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
