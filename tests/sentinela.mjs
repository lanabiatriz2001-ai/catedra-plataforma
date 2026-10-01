// tests/sentinela.mjs — régua do vigia das fontes oficiais.
//
// Cada caso aqui nasceu de um erro MEDIDO em 15/09/2026, rodando o sentinela contra o
// Planalto, o STF e o STJ de verdade. Não são hipóteses: são os quatro jeitos pelos quais
// este vigia já anunciou novidade jurídica que não existia, mais os dois jeitos pelos
// quais ele poderia esconder que falhou.
//
// Sem rede: as fixtures são recortes do texto real das fontes (os informativos, pelos
// títulos e status das páginas oficiais em tests/fixtures/informativos/manifesto.json).
// Assim a suíte roda em qualquer lugar, e uma quebra aponta o parser, não a conexão. Nenhum caso toca a rede:
// o S12 confere a validade do intermediário EMBUTIDO, lendo o próprio arquivo, e o S14
// roda o caminho inteiro do rodar() com as leituras das fontes TROCADAS por funções locais.
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import {
  COBERTURA, carimbar, classificarVigencia, compararArtigos, conteudoNovidades, edicaoIncorporada, edicaoNaPagina, edicoesNovasAlem, itemPlanalto,
  lerIdsPropostos, mesclarNovidades, modificadorasDaDiferenca, parseSuspeito, recuoDoAcervo, rodar, semente, textoProprio,
  ultimasDeArquivo, ultimasDoIndice,
} from '../scripts/sentinela.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const globaisDe = (...arquivos) => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of arquivos) vm.runInContext(readFileSync(path.join(RAIZ, f), 'utf8'), ctx);
  return ctx.window;
};
// Lei de mentira com N artigos de cabeçalho verdadeiro — o bastante para o rodar() comparar.
const leiFalsa = (sigla, n) => ({
  sigla, nome: 'Lei ' + sigla, url: 'https://www.planalto.gov.br/ccivil_03/' + sigla.toLowerCase() + '.htm',
  artigos: Array.from({ length: n }, (_, i) => ({ rot: 'Art. ' + (i + 1), txt: `Art. ${i + 1}. Dispositivo número ${i + 1} da lei ${sigla}, com texto suficiente.` })),
});

export async function testarSentinela(ok) {
  // ── S1 — o básico: inclusão, alteração e artigo ausente ────────────────────
  // Artigo que some da leitura é `ausente`, não revogação: o Planalto mantém o artigo
  // revogado no texto compilado, com a anotação (S18c/S18d).
  {
    const antes = [{ rot: 'Art. 1º', txt: 'Art. 1º O texto velho.' }, { rot: 'Art. 2º', txt: 'Art. 2º Some.' }];
    const depois = [{ rot: 'Art. 1º', txt: 'Art. 1º O texto novo.' }, { rot: 'Art. 3º', txt: 'Art. 3º Chegou agora.' }];
    const d = compararArtigos(antes, depois);
    const t = (x) => d.find((y) => y.tipo === x);
    ok(d.length === 3 && t('alteracao') && t('inclusao') && t('ausente') && !t('revogacao'),
      'S1 compararArtigos separa alteração, inclusão e artigo ausente — ausência não é declarada revogação');
    ok(t('alteracao').antes === 'Art. 1º O texto velho.' && t('alteracao').depois === 'Art. 1º O texto novo.',
      'S1b a versão anterior é preservada no item — dá para comparar antes e depois');
    ok(t('ausente').antes && t('ausente').depois === null,
      'S1c o artigo ausente guarda o texto do acervo, não o descarta');
  }

  // ── S2 — anotação de margem NÃO é alteração jurídica ───────────────────────
  // Caso real: o art. 77 da Lei 14.133 foi acusado de alteração porque a página ganhou
  // os rótulos de link "Regulamento" e "Vigência" soltos no meio do artigo.
  {
    const base = 'Art. 77. Para a venda de bens imóveis, será concedido direito de preferência. (Incluído pela Lei nº 15.266, de 2025) ';
    const antes = [{ rot: 'Art. 77', txt: base + 'Parágrafo único. Os procedimentos serão definidos em regulamento.' }];
    const depois = [{ rot: 'Art. 77', txt: base + 'Regulamento Vigência Parágrafo único. Os procedimentos serão definidos em regulamento.' }];
    ok(compararArtigos(antes, depois).length === 0,
      'S2 ganhar "Regulamento"/"Vigência" de margem não vira alteração jurídica');
    // Controle: a régua precisa ENXERGAR uma mudança de verdade no mesmo artigo.
    const real = [{ rot: 'Art. 77', txt: base + 'Parágrafo único. Os procedimentos serão definidos em LEI.' }];
    ok(compararArtigos(antes, real).length === 1,
      'S2b controle — mudança real de palavra no mesmo artigo continua sendo detectada');
  }

  // ── S3 — remissão em minúscula não vira artigo novo ────────────────────────
  // Caso real: "art. 927 da Lei nº 13.105" dentro de um dispositivo do CTN virou um
  // "art. 927" incluído no CTN — que tem 108 artigos.
  {
    const antes = [{ rot: 'Art. 151', txt: 'Art. 151. Suspendem a exigibilidade.' }];
    const depois = [
      { rot: 'Art. 151', txt: 'Art. 151. Suspendem a exigibilidade.' },
      { rot: 'art. 927', txt: 'art. 927 da Lei nº 13.105, de 16 de março de 2015 (Código de Processo Civil);' },
    ];
    ok(compararArtigos(antes, depois).length === 0,
      'S3 remissão com rótulo minúsculo ("art. 927 da Lei…") não vira dispositivo incluído');
    const real = [...antes, { rot: 'Art. 152', txt: 'Art. 152. Artigo de verdade, com cabeçalho em maiúscula.' }];
    ok(compararArtigos(antes, real).length === 1 && compararArtigos(antes, real)[0].tipo === 'inclusao',
      'S3b controle — artigo novo de verdade ("Art. 152") continua sendo detectado');
  }

  // ── S4 — artigo cortado no teto compara só o trecho comum, e avisa ─────────
  // O acervo guarda no máximo 4.000 caracteres por artigo. Num artigo no teto, ganhar
  // palavras no meio empurra a cauda para fora e as duas versões diferem sozinhas.
  {
    const enche = (n) => 'x'.repeat(n);
    const antes = [{ rot: 'Art. 5º', txt: 'Art. 5º ' + enche(3995) }];
    const depois = [{ rot: 'Art. 5º', txt: 'Art. 5º ' + enche(3995) + 'cauda diferente' }];
    const d = compararArtigos(antes, depois);
    ok(d.length === 0, 'S4 diferença só na cauda de artigo no teto de tamanho não vira alteração');
    const mudou = [{ rot: 'Art. 5º', txt: 'Art. 5º MUDOU ' + enche(3995) }];
    const d2 = compararArtigos(antes, mudou);
    ok(d2.length === 1 && d2[0].parcial === true,
      'S4b mudança no começo de artigo no teto é detectada E sai marcada como comparação parcial');
  }

  // ── S5/S6 — vigência: publicada ≠ em vigor ─────────────────────────────────
  {
    const hoje = new Date(2026, 8, 15);
    const futura = classificarVigencia('Art. 1º Nova regra. (Vigência) a partir de 01/01/2027', hoje);
    ok(futura.vigencia === 'aguardando' && futura.vigenciaEm === '01/01/2027',
      'S5 alteração com marcador de vigência e data futura fica "aguardando vigência"');
    const passada = classificarVigencia('Art. 1º Regra. (Vigência) desde 01/01/2020', hoje);
    ok(passada.vigencia === 'em-vigor', 'S5b marcador de vigência com data já alcançada fica em vigor');
    const semData = classificarVigencia('Art. 1º Regra nova. (Vigência)', hoje);
    ok(semData.vigencia === 'indeterminada',
      'S6 marcador de vigência SEM data não é declarado em vigor — fica indeterminado, para conferência');
    const limpo = classificarVigencia('Art. 1º Regra comum, sem marcador.', hoje);
    ok(limpo.vigencia === 'em-vigor', 'S6b texto compilado sem marcador de vigência é o texto em vigor');
    ok(limpo.efeitos === null && limpo.efeitosEm === null, 'S6b2 sem marcador de produção de efeitos, nenhum aviso de efeitos');
    // A data só é da vigência quando vem colada ao marcador. Caso real (CP art. 83): a única
    // data do artigo é a da lei que deu a redação, e ela saía como "em vigor desde 11/07/1984".
    ok(classificarVigencia('Art. 83 - O juiz poderá conceder: (Redação dada pela Lei nº 7.209, de 11.7.1984) V - cumpridos (Incluído pela Lei nº 13.344, de 2016) (Vigência) Parágrafo único', hoje).vigencia === 'indeterminada',
      'S6f a data da lei modificadora não vira data de vigência');
    ok(classificarVigencia('§ 1º Regra. (Vigência) § 2º Valeu até 31.12.2019.', hoje).vigencia === 'indeterminada',
      'S6g data solta longe do marcador não decide a vigência');
    ok(classificarVigencia('§ 1º (Vigência) a partir de 01/01/2027 § 2º (Vigência)', hoje).vigencia === 'indeterminada',
      'S6h um marcador sem data deixa o artigo indeterminado');
  }

  // ── S5c — produção de efeitos é separada da vigência (E10) ─────────────────
  // Recorte real da CF (art. 20, EC 102/2019), com o espaço que o Planalto deixa às vezes
  // dentro do parêntese. Antes, este marcador virava "vigência indeterminada".
  {
    const hoje = new Date(2026, 9, 1);
    const cf = 'Art. 20. São bens da União: ... compensação financeira por essa exploração. (Redação dada pela Emenda Constitucional nº 102, de 2019) (Produção de efeito ) § 2º A faixa de fronteira';
    const v = classificarVigencia(cf, hoje);
    ok(v.vigencia === 'em-vigor' && v.efeitos === 'marcador-proprio' && v.efeitosEm === null,
      'S5c "(Produção de efeito)" sem data não mexe na vigência: avisa efeitos em data própria, sem inventar a data');
    const comData = classificarVigencia('Art. 1º Regra. (Vigência) desde 01/01/2020 (Produção de efeitos a partir de 01/01/2027)', hoje);
    ok(comData.vigencia === 'em-vigor' && comData.vigenciaEm === '01/01/2020' && comData.efeitosEm === '01/01/2027',
      'S5d com as duas datas na página, a da vigência e a dos efeitos não se confundem');
    const so = classificarVigencia('Art. 1º Regra. (Produção de efeitos a partir de 01/01/2027)', hoje);
    ok(so.vigencia === 'em-vigor' && so.vigenciaEm === null && so.efeitosEm === '01/01/2027',
      'S5e a data que está DENTRO do marcador de efeitos não é lida como data de vigência');
    const lei = { sigla: 'CF', nome: 'Constituição Federal', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm' };
    // Diferença com anotação nova (autoria conhecida), em vigor, sem recorte: o ÚNICO motivo
    // de revisão que sobra é a data dos efeitos que a página não traz.
    const nova = (t) => t.replace('essa exploração.', 'essa exploração, na forma da lei. (Redação dada pela Emenda Constitucional nº 140, de 2026)');
    const it = itemPlanalto(lei, { tipo: 'alteracao', rot: 'Art. 20', antes: cf, depois: nova(cf) }, 'x', hoje);
    ok(it.efeitos === 'marcador-proprio' && it.efeitosEm === null && it.vigencia === 'em-vigor'
      && it.modificadora === 'Emenda Constitucional nº 140, de 2026' && it.revisar === true,
      'S5f o item leva efeitos/efeitosEm à parte e, sem a data dos efeitos, vai para revisão');
    const semEf = cf.replace(' (Produção de efeito )', '');
    const ctl = itemPlanalto(lei, { tipo: 'alteracao', rot: 'Art. 20', antes: semEf, depois: nova(semEf) }, 'x', hoje);
    ok(ctl.efeitos === null && ctl.revisar === false,
      'S5f2 controle — a mesma alteração sem o marcador de efeitos não vai para revisão');
    const rev = itemPlanalto(lei, { tipo: 'revogacao', rot: 'Art. 21', antes: cf, depois: null }, 'x', hoje);
    ok(rev.efeitos === null && rev.efeitosEm === null, 'S5g dispositivo revogado não herda aviso de efeitos do texto que saiu');
  }

  // ── S6c — a norma modificadora é a anotação nova, não uma anotação antiga do artigo ──
  {
    const antes = 'Art. 4º Direito à convivência familiar. (Incluído pela Lei nº 15.240, de 2025)';
    const depois = 'Art. 4º Direito à natureza e à convivência familiar. (Redação dada pela Lei nº 15.512, de 2026) (Incluído pela Lei nº 15.240, de 2025)';
    const mods = modificadorasDaDiferenca(antes, depois);
    ok(mods.length === 1 && mods[0].norma === 'Lei nº 15.512, de 2026',
      'S6c modificadora da diferença aponta a lei nova, não a anotação antiga que já estava no artigo');
  }

  // ── S6i — parêntese que o Planalto não fecha não arrasta o artigo para o nome da norma ──
  // Trechos REAIS do leis-seca.js (01/10/2026): CLT art. 139 e Marco Civil art. 8º-C.
  {
    const nomes = (t) => modificadorasDaDiferenca('', t).map((m) => m.norma);
    const clt = 'Art. 139 - Poderão ser concedidas férias coletivas a todos os empregados de uma empresa ou de determinados estabelecimentos ou setores da empresa. (Redação dada pelo Decreto-lei nº 1.535, de 13.4.1977 § 1º - As férias poderão ser gozadas em 2 (dois) períodos anuais desde que nenhum deles seja inferior a 10 (dez) dias corridos. (Redação dada pelo Decreto-lei nº 1.535, de 13.4.1977)';
    const mp = 'Art. 8º-C. … nos termos do disposto no § 6º do art. 18 da Lei nº 8.078, de 11 de setembro de 1990 ; (Incluído pela Medida Provisória nº 1.068, de 2021 (Rejeitada) III - requerimento do ofendido';
    ok(JSON.stringify(nomes(clt)) === JSON.stringify(['Decreto-lei nº 1.535, de 13.4.1977', 'Decreto-lei nº 1.535, de 13.4.1977'])
      && JSON.stringify(nomes(mp)) === JSON.stringify(['Medida Provisória nº 1.068, de 2021']),
      'S6i sem o ")" de fecho, o nome da norma para no "§" ou no "(" seguinte — não leva "§ 1º - As férias…" nem "(Rejeitada"');
    // CLT art. 145, real: dois parênteses sem fecho, o segundo no fim do artigo.
    const c145 = 'Art. 145 - … indicação do início e do termo das férias. (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977 SEÇÃO V DOS EFEITOS DA CESSAÇÃO DO CONTRATO DE TRABALHO (Redação dada pelo Decreto-lei nº 1.535, de 13.4.1977';
    ok(JSON.stringify(nomes(c145)) === JSON.stringify(['Decreto-lei nº 1.535, de 13.4.1977', 'Decreto-lei nº 1.535, de 13.4.1977'])
      && JSON.stringify(nomes('Art. 169. Texto. (Redação dada pela pela Emenda Constitucional nº 19, de 1998)')) === JSON.stringify(['Emenda Constitucional nº 19, de 1998'])
      && JSON.stringify(nomes('Art. 21. XI - explorar os serviços; (Redação dada pela Emenda Constitucional nº 8, de 15/08/95:)')) === JSON.stringify(['Emenda Constitucional nº 8, de 15/08/95'])
      && JSON.stringify(nomes('Art. 2º Texto. (Redação dada pela Lei nº 13.019, de 2014, com a redação dada pela Lei nº 13.204, de 2015)')) === JSON.stringify(['Lei nº 13.019, de 2014'])
      // Artigo cortado no teto que acaba no meio da anotação: "Emenda" não é nome de norma.
      && nomes('Art. 5º Texto longo cortado no teto do acervo. (Redação dada pela Emenda').length === 0,
      'S6j o nome da norma termina na data dela: sem fecho nem "(" por perto, o resto do artigo não entra; "pela pela" e "de 15/08/95:" saem limpos; anotação cortada pelo teto não vira norma');
  }

  // ── S6d — diferença sem anotação nova não ganha autoria emprestada ─────────
  {
    const lei = { sigla: 'CPC', nome: 'Código de Processo Civil', url: 'https://www.planalto.gov.br/x.htm' };
    const d = { tipo: 'alteracao', rot: 'Art. 1.030',
      antes: 'Art. 1.030. Recebida a petição. (Redação dada pela Lei nº 13.256, de 2016)',
      depois: 'Art. 1.030. Recebida a petição do recurso. (Redação dada pela Lei nº 13.256, de 2016)' };
    const it = itemPlanalto(lei, d, '2026-10-01T00:00:00.000Z', new Date(2026, 9, 1));
    ok(it.modificadora === null && it.modificadoras.length === 0 && it.revisar === true,
      'S6d alteração sem anotação nova sai sem norma modificadora e vai para revisão — nunca com a lei antiga do artigo');
    const rev = itemPlanalto(lei, { tipo: 'revogacao', rot: 'Art. 9', antes: d.antes, depois: null }, 'x');
    ok(rev.modificadora === null, 'S6e dispositivo que sumiu da página não ganha como "modificadora" a anotação antiga dele');
  }

  // ── S3c — inclusão no meio de um trecho com vários artigos não altera o vizinho ──
  // Caso real (CTN, 15/09/2026): o 211-A entrou entre o 211 e o 212, e o trecho do 211
  // perdeu o 212 — sem uma vírgula de mudança no art. 211.
  {
    const a211 = 'Art. 211. Incumbe ao Conselho Técnico prestar assistência técnica aos governos estaduais e municipais.';
    const a212 = 'Art. 212. Os Poderes Executivos expedirão, por decreto, a consolidação da legislação vigente.';
    ok(textoProprio(a211 + ' ' + a212) === textoProprio(a211), 'S3c o texto próprio do artigo para no cabeçalho do artigo seguinte');
    const lei = { sigla: 'CTN', nome: 'Código Tributário Nacional', url: 'https://www.planalto.gov.br/y.htm' };
    const it = itemPlanalto(lei, { tipo: 'alteracao', rot: 'Art. 211', antes: a211 + ' ' + a212, depois: a211 }, 'x');
    ok(it.recorte === true && it.revisar === true && /outro artigo/.test(it.pendencia || ''),
      'S3d diferença só de recorte sai marcada como recorte, com a pendência por extenso, e vai para revisão');
    const real = itemPlanalto(lei, { tipo: 'alteracao', rot: 'Art. 211', antes: a211, depois: a211.replace('assistência', 'apoio') + ' (Redação dada pela Lei Complementar nº 236, de 2026)' }, 'x');
    ok(real.recorte === false && real.modificadora === 'Lei Complementar nº 236, de 2026',
      'S3e controle — mudança no próprio artigo não é tomada por recorte');

    // O Planalto guarda a redação riscada e, logo depois, a nova com o MESMO cabeçalho. Texto
    // REAL do CF art. 101 no leis-seca.js: "Art. 101. … sessenta e cinco anos … Art. 101. …
    // setenta anos … (Redação dada pela Emenda Constitucional nº 122, de 2022)". Cortar no
    // segundo "Art. 101" fazia uma troca na redação EM VIGOR sair como recorte, sem autoria.
    const cf = (globaisDe('leis-seca.js').CT_LEIS || []).find((l) => l.sigla === 'CF');
    const a101 = cf && cf.artigos.find((x) => x.rot.replace(/\s+/g, ' ') === 'Art. 101');
    const t101 = a101 ? String(a101.txt).replace(/\s+/g, ' ').trim() : '';
    const n101 = t101.replace('setenta anos', 'setenta e cinco anos') + ' (Redação dada pela Emenda Constitucional nº 140, de 2026)';
    const i101 = itemPlanalto({ sigla: 'CF', nome: 'Constituição Federal', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm' },
      { tipo: 'alteracao', rot: 'Art. 101', antes: t101, depois: n101 }, 'x', new Date(2026, 9, 1));
    ok((t101.match(/Art\. 101\./g) || []).length === 2 && n101 !== t101
      && i101.recorte === false && !('pendencia' in i101) && i101.modificadora === 'Emenda Constitucional nº 140, de 2026',
      'S3f artigo com a redação antiga e a nova sob o mesmo cabeçalho (CF art. 101 real): a troca na redação em vigor é do artigo, com a emenda nova como autora — não recorte');
    ok(textoProprio('Art. 111-A. Redação antiga. Art. 111-A. Redação nova. (Incluído pela Emenda Constitucional nº 45, de 2004) Art. 112. Outro artigo.')
      === 'Art. 111-A. Redação antiga. Art. 111-A. Redação nova. (Incluído pela Emenda Constitucional nº 45, de 2004)'
      && textoProprio('Art. 83 - O juiz poderá conceder. Art. 84 - As penas.') === 'Art. 83 - O juiz poderá conceder.'
      && textoProprio('Art. 83 - O juiz poderá, antes. Art. 83 - O juiz poderá, agora. (Redação dada pela Lei nº 7.209, de 11.7.1984) Art. 84 - As penas.')
        === 'Art. 83 - O juiz poderá, antes. Art. 83 - O juiz poderá, agora. (Redação dada pela Lei nº 7.209, de 11.7.1984)',
      'S3g o texto próprio vai até o cabeçalho de OUTRO número — "Art. 111-A" repetido fica, "Art. 112" corta; "Art. 83 - O" não vira 83-O');
  }

  // ── S7/S8 — a edição é reconhecida pelo NÚMERO PEDIDO no <title> ──────────
  // Títulos e status REAIS de 01/10/2026 (tests/fixtures/informativos/manifesto.json). O STJ
  // responde 200, com a página de busca vazia e um título genérico sem número, para edição
  // que não saiu; o tamanho não distingue (a 903 real é MENOR que a vazia). A régua antiga
  // procurava marcadores no corpo e perdia as edições reais 901 e 903.
  const MAN = JSON.parse(readFileSync(path.join(RAIZ, 'tests/fixtures/informativos/manifesto.json'), 'utf8'));
  const PAG = Object.fromEntries(MAN.paginas.map((p) => [p.pagina, p]));
  const pagina = (p) => ({ status: p.status, tam: p.bytes, texto: p.titulo == null ? '' : `<html><head><title>${p.titulo}</title></head><body>…</body></html>` });
  const ve = (fonte, nome, n, extra) => edicaoNaPagina(fonte, pagina(PAG[nome]), n, extra).estado;
  {
    ok(ve('stj', 'stj-0901', 901) === 'existe' && ve('stj', 'stj-0903', 903) === 'existe' && ve('stj', 'stj-0902', 902) === 'existe',
      'S7 as edições REAIS 901, 902 e 903 do STJ são reconhecidas pelo número no título');
    ok(ve('stj', 'stj-0904', 904) === 'nao-existe' && ve('stj', 'stj-7777', 7777) === 'nao-existe' && ve('stj', 'stj-EE34', 34, true) === 'nao-existe',
      'S7b a página genérica do STJ (HTTP 200, título sem número) é edição inexistente — 904, 7777 e a extraordinária 34');
    ok(ve('stj', 'stj-EE29', 29, true) === 'existe' && ve('stj', 'stj-EE33', 33, true) === 'existe',
      'S7c extraordinária real é reconhecida por "Edição Extraordinária n. N" no título');
    ok(ve('stj', 'stj-0901', 902) === 'nao-existe' && ve('stj', 'stj-EE29', 29, false) === 'nao-existe' && ve('stj', 'stj-0901', 901, true) === 'nao-existe',
      'S7d o número tem de ser o PEDIDO, e na série certa: a 901 não vale pela 902, nem ordinária por extraordinária');
    ok(edicaoNaPagina('stj', { status: 503, texto: '' }, 901).estado === 'falha'
      && edicaoNaPagina('stj', { status: 200, texto: '<title>Request Rejected</title>' }, 901).estado === 'falha',
      'S7e STJ com 503, ou 200 com página que não é a do Informativo, é FALHA da edição — não "edição vazia"');
    // Se um dia a página vier em UTF-8, lida em latin1 cada letra acentuada vira duas.
    const utf8 = (nome) => ({ ...PAG[nome], titulo: Buffer.from(PAG[nome].titulo, 'utf8').toString('latin1') });
    ok(edicaoNaPagina('stj', pagina(utf8('stj-0901')), 901).estado === 'existe' && edicaoNaPagina('stj', pagina(utf8('stj-EE29')), 29, true).estado === 'existe'
      && edicaoNaPagina('stf', pagina(utf8('stf-1225')), 1225).estado === 'existe' && edicaoNaPagina('stj', pagina(utf8('stj-0904')), 904).estado === 'nao-existe',
      'S7f o título continua reconhecido se a página passar a vir em UTF-8 (acentos lidos como dois caracteres)');
    ok(ve('stf', 'stf-1225', 1225) === 'existe' && ve('stf', 'stf-1230', 1230) === 'existe' && ve('stf', 'stf-1224', 1224) === 'existe',
      'S8 edição real do STF é reconhecida por "Nº N" no título');
    ok(ve('stf', 'stf-1231', 1231) === 'nao-existe', 'S8b edição inexistente do STF (404) não vira novidade');
    ok(ve('stf', 'stf-1225', 1226) === 'falha'
      && edicaoNaPagina('stf', { status: 403, texto: '<title>Access Denied</title>' }, 1225).estado === 'falha'
      && edicaoNaPagina('stf', { status: 500, texto: '' }, 1225).estado === 'falha',
      'S8c no STF, 200 sem o número pedido, 403 do escudo e 500 são falha — só o 404 é "não existe"');
  }

  // ── S9 — falha NUNCA se disfarça de "sem novidade" ─────────────────────────
  // O coração do pedido: a última tentativa anda sempre; a última consulta BEM-SUCEDIDA
  // só anda quando deu certo.
  {
    const ontem = '2026-09-14T12:00:00.000Z';
    const hoje = '2026-09-15T12:00:00.000Z';
    const anterior = { ultimoSucesso: ontem, resultado: 'sem-novidade' };
    const falhou = carimbar('stf', anterior, { estado: 'falha', erro: 'fetch failed', itens: [] }, hoje);
    ok(falhou.resultado === 'falha' && falhou.erro === 'fetch failed',
      'S9 fonte que não respondeu fica com resultado "falha" e o erro por extenso');
    ok(falhou.ultimaTentativa === hoje && falhou.ultimoSucesso === ontem,
      'S9b falha move a última TENTATIVA mas preserva a última consulta BEM-SUCEDIDA');
    const vazio = carimbar('stf', anterior, { estado: 'sem-novidade', erro: null, itens: [] }, hoje);
    ok(vazio.resultado === 'sem-novidade' && vazio.ultimoSucesso === hoje,
      'S9c "nenhuma novidade" é resultado de SUCESSO e avança o carimbo — é outra coisa que falha');
    ok(falhou.resultado !== vazio.resultado,
      'S9d "não foi possível consultar" e "nenhuma novidade" nunca são o mesmo resultado');
    const semHistorico = carimbar('stj', {}, { estado: 'falha', erro: 'x', itens: [] }, hoje);
    ok(semHistorico.ultimoSucesso === null,
      'S9e fonte que nunca deu certo não ganha carimbo de sucesso nenhum');
  }

  // ── S10 — cobertura declarada e limites visíveis ───────────────────────────
  {
    const fontes = Object.keys(COBERTURA);
    ok(fontes.length === 3 && fontes.every((f) => COBERTURA[f].rotulo && COBERTURA[f].monitora),
      'S10 as três fontes declaram por extenso o que monitoram');
    ok(fontes.every((f) => Array.isArray(COBERTURA[f].limites) && COBERTURA[f].limites.length > 0),
      'S10b toda fonte declara ao menos um limite — nada de prometer cobertura integral');
    ok(/SCON/i.test(COBERTURA.stj.limites.join(' ')) && /BDJur|Revista de Súmulas/i.test(COBERTURA.stj.limites.join(' ')),
      'S10c o limite das súmulas do STJ distingue SCON bloqueado e BDJur ainda não integrado');
    ok(carimbar('stf', {}, { estado: 'sem-novidade', itens: [] }, 'x').limites.length > 0,
      'S10d os limites viajam no estado, para a tela poder mostrá-los');
  }

  // ── S10e — E9: o Planalto diz QUAIS normas confere e quantas ficam de fora ──
  // Os números do limite são medidos nos arquivos do acervo: se o catálogo do LEGIS ou a
  // lei seca crescer, a régua reprova até o texto mostrado à pessoa ser corrigido.
  {
    const W = globaisDe('leis-seca.js', 'leis-catalogo.js', 'leis-seca-areas.js');
    const norm = (u) => String(u).replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
    const cat = new Set((W.CT_LEIS_CAT || []).map((c) => norm(c.u)));
    const leis = W.CT_LEIS || [], areas = W.CT_LEIS_AREAS || [];
    const lim = COBERTURA.planalto.limites.join(' ');
    const n = (re) => { const m = re.exec(lim); return m ? Number(m[1]) : NaN; };
    const foraDoCatalogo = cat.size - leis.filter((l) => cat.has(norm(l.url))).length;
    ok(n(/só as (\d+) normas/) === leis.length && n(/outras (\d+) leis do catálogo/) === foraDoCatalogo
      && n(/entre elas as (\d+) leis secas/) === areas.length,
      `S10e o limite do Planalto bate com os arquivos: ${leis.length} conferidas, ${foraDoCatalogo} do catálogo fora, ${areas.length} das outras áreas entre elas`);
    ok(areas.every((a) => cat.has(norm(a.url)) && !leis.some((l) => norm(l.url) === norm(a.url))),
      'S10f as leis das outras áreas estão no catálogo e fora da lei seca conferida — por isso são "entre elas", não somadas');
    const c = carimbar('planalto', {}, { estado: 'sem-novidade', itens: [], normas: leis.map((l) => ({ sigla: l.sigla, nome: l.nome })) }, 'x');
    ok(Array.isArray(c.normas) && c.normas.length === leis.length && c.normas.every((x) => x.sigla && x.nome && !('artigos' in x)),
      'S10g o estado do Planalto leva a lista de normas conferidas (sigla e nome, sem o texto)');
    const caiu = carimbar('planalto', { normas: c.normas }, { estado: 'falha', erro: 'x', itens: [] }, 'y');
    ok(caiu.normas.length === leis.length, 'S10h numa falha sem leitura do acervo, a lista de normas do carimbo anterior fica');
    ok(!('normas' in carimbar('stf', {}, { estado: 'sem-novidade', itens: [] }, 'x')), 'S10i só o Planalto leva a lista de normas');
  }

  // ── S11 — o acervo gerado existe e tem a forma que o app espera ────────────
  {
    const p = path.join(RAIZ, 'novidades.js');
    if (existsSync(p)) {
      const s = readFileSync(p, 'utf8');
      ok(/^\/\*/.test(s) && s.includes('window.CT_NOVIDADES = '),
        'S11 novidades.js expõe window.CT_NOVIDADES com o cabeçalho de arquivo gerado');
      const ctx = {};
      // eslint-disable-next-line no-new-func
      new Function('window', s)(ctx);
      const N = ctx.CT_NOVIDADES;
      ok(N && N.fontes && Array.isArray(N.itens), 'S11b novidades.js tem { geradoEm, fontes, itens }');
      const ids = N.itens.map((i) => i.id);
      ok(ids.length === new Set(ids).size,
        'S11c nenhum id repetido — automático e manual convergem no mesmo registro, não duplicam');
      ok(N.itens.every((i) => i.urlOficial && i.fonte && i.detectadoEm),
        'S11d todo item aponta a fonte oficial e a data em que foi detectado');
      ok(N.itens.every((i) => i.tipo !== 'alteracao' || (i.antes && i.depois)),
        'S11e toda alteração carrega antes E depois — a versão anterior nunca se perde');
      ok(!N.itens.some((i) => /^art[^A-Z]/.test(String(i.disp || ''))),
        'S11f nenhum item com rótulo minúsculo escapou para o acervo publicado');
      ok(Object.entries(N.fontes || {}).every(([f, e]) => COBERTURA[f] && JSON.stringify(e.limites) === JSON.stringify(COBERTURA[f].limites)),
        'S11g os limites gravados no novidades.js são os da COBERTURA atual — a tela não mostra limite velho');
      const F = N.fontes || {};
      ok(Object.keys(COBERTURA).every((f) => F[f] && F[f].rotulo && F[f].monitora && Array.isArray(F[f].limites))
        && F.planalto && Array.isArray(F.planalto.normas) && F.planalto.normas.length > 0,
        'S11h as três fontes estão no pacote com a cobertura — o Planalto com a lista das normas conferidas');
      ok(Object.values(F).every((e) => e.resultado != null || (e.ultimaTentativa == null && e.ultimoSucesso == null)),
        'S11i fonte sem resultado não carrega data de consulta — "nunca consultada" não finge conferência');
      // Decisão da dona (01/10/2026): o pacote versionado sai VAZIO de novidades até a
      // primeira varredura revisada. Enquanto geradoEm for nulo, ele tem de ser byte a byte
      // o que `--semente` escreve hoje — assim cobertura, limites e normas nunca ficam velhos.
      ok(N.geradoEm !== null || (N.itens.length === 0 && s === conteudoNovidades(semente())),
        'S11j sem varredura publicada, novidades.js é exatamente a semente: nenhum item e a cobertura atual (node scripts/sentinela.mjs --semente)');
    } else {
      ok(false, 'S11 novidades.js não existe — rode: node scripts/sentinela.mjs');
    }
  }

  // ── S12 — o certificado embutido do STF ainda serve ────────────────────────
  // O STF manda a cadeia TLS incompleta e o intermediário vai embutido no repositório.
  // Quando ele vencer, a consulta ao STF passa a falhar — melhor descobrir aqui.
  {
    const { CA_ALPHASSL_2025 } = await import('../scripts/lib/tls-fontes.mjs');
    const { X509Certificate } = await import('node:crypto');
    const c = new X509Certificate(CA_ALPHASSL_2025);
    const dias = Math.round((new Date(c.validTo) - Date.now()) / 86400000);
    ok(dias > 60,
      `S12 o intermediário embutido do STF ainda vale por ${dias} dias (troque antes de vencer — a receita está em scripts/lib/tls-fontes.mjs)`);
  }

  const ULT = { stf: 1224, stj: 900, stjExtra: 33 };   // o acervo do JURIS em 01/10/2026

  // ── S13 — E11: a junção não duplica, guarda o que é da pessoa e dá baixa ───
  {
    const T1 = '2026-10-01T12:00:00.000Z', T2 = '2026-10-02T12:00:00.000Z';
    const lei = { sigla: 'CTN', nome: 'Código Tributário Nacional', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm' };
    const pln = (q) => itemPlanalto(lei, { tipo: 'alteracao', rot: 'Art. 174',
      antes: 'Art. 174. A ação para a cobrança do crédito tributário prescreve em cinco anos.',
      depois: 'Art. 174. A ação para a cobrança do crédito tributário prescreve em cinco anos, contados da constituição definitiva. (Redação dada pela Lei Complementar nº 236, de 2026)' }, q, new Date(2026, 9, 1));
    const inf = (n, q) => ({ id: 'INF-STF-' + n, fonte: 'stf', tipo: 'informativo', norma: 'STF', disp: 'Informativo ' + n + ' do STF',
      revisar: true, pendencia: 'edição detectada na fonte oficial; o conteúdo entra no acervo quando scripts/atualizar-informativos.py rodar',
      urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo' + n + '.htm', detectadoEm: q, lido: false });
    const acha = (itens, id) => itens.find((i) => i.id === id);

    const r1 = mesclarNovidades([], [pln(T1), inf(1225, T1)], ULT);
    ok(r1.itens.length === 2 && r1.novos === 2 && acha(r1.itens, 'INF-STF-1225').revisar === true && !acha(r1.itens, 'INF-STF-1225').incorporado,
      'S13 primeira rodada: dois itens novos, e o informativo ainda fora do acervo segue pendente');
    const lidos = r1.itens.map((i) => (i.fonte === 'planalto' ? { ...i, lido: true } : i));
    const r2 = mesclarNovidades(lidos, [pln(T2), inf(1225, T2)], ULT);
    ok(r2.itens.length === 2 && r2.novos === 0 && r2.novosItens.length === 0 && r2.achados.length === 2,
      'S13b mesclarNovidades rodado de novo com os mesmos achados não duplica nem conta nada como novo');
    ok(r2.itens.every((i) => i.detectadoEm === T1) && r2.itens.find((i) => i.fonte === 'planalto').lido === true,
      'S13c a segunda rodada mantém o "detectado em" da primeira vez e o "lido" que a pessoa marcou');
    const r3 = mesclarNovidades([{ ...pln(T1), revisar: true, pendencia: 'regra antiga' }], [pln(T2)], ULT);
    ok(pln(T2).revisar === false && r3.itens[0].revisar === false && !('pendencia' in r3.itens[0]),
      'S13d revisar e pendência vêm da regra de agora — o item antigo não arrasta a marcação velha');
    // A rotina semanal incorporou a 1225: o juris-index.js passou à 1226.
    const ULT2 = { ...ULT, stf: 1226 };
    const r4 = mesclarNovidades(r2.itens, [], ULT2);
    const b = acha(r4.itens, 'INF-STF-1225');
    ok(r4.itens.length === 2 && b.incorporado === true && b.revisar === false && !('pendencia' in b) && b.detectadoEm === T1,
      'S13e informativo cuja edição já está no juris-index.js recebe baixa (incorporado, fora da revisão, sem pendência) e não some');
    ok(JSON.stringify(mesclarNovidades(r4.itens, [], ULT2).itens) === JSON.stringify(r4.itens),
      'S13f dar baixa duas vezes dá o mesmo resultado');
    ok(edicaoIncorporada({ id: 'INF-STJ-EE33' }, ULT) && !edicaoIncorporada({ id: 'INF-STJ-EE34' }, ULT)
      && !edicaoIncorporada({ id: 'INF-STJ-901' }, ULT) && edicaoIncorporada({ id: 'INF-STJ-900' }, ULT)
      && !edicaoIncorporada({ id: 'INF-STF-1225' }, { stf: null, stj: null, stjExtra: 27 })
      && !edicaoIncorporada({ id: pln(T1).id }, ULT2),
      'S13g extraordinária compara com a última extraordinária; sem acervo legível ninguém recebe baixa; item do Planalto nunca');
    // O selo da tela lê `incorporadoTxt`: informativo do STF ou do STJ está no JURIS.
    const stj = { ...inf(901, T1), id: 'INF-STJ-901', fonte: 'stj', norma: 'STJ' };
    const bStj = acha(mesclarNovidades([stj], [], { ...ULT, stj: 901 }).itens, 'INF-STJ-901');
    ok(b.incorporadoTxt === 'já no JURIS' && bStj.incorporado === true && bStj.incorporadoTxt === 'já no JURIS'
      && !('incorporadoTxt' in acha(r1.itens, 'INF-STF-1225')),
      'S13k a baixa grava onde o informativo já está ("já no JURIS", no STF e no STJ); item pendente não leva o texto');
  }

  // ── S14 — o caminho inteiro do rodar(), sem rede: fonte fora do ar e consulta repetida ──
  {
    const ANTES = '2001-01-01T00:00:00.000Z';
    const anterior = { fontes: { planalto: { ultimoSucesso: ANTES, resultado: 'sem-novidade' }, stf: { ultimoSucesso: ANTES, resultado: 'sem-novidade' } } };
    const caiu = async () => { throw new Error('getaddrinfo ENOTFOUND (simulado)'); };
    const r = await rodar({ fontes: ['planalto', 'stf'], busca: { baixarLei: caiu, buscar: caiu }, leis: [leiFalsa('LA', 30)],
      ultimas: ULT, anterior, atuais: [], silencioso: true });
    const p = r.estado.fontes.planalto, s = r.estado.fontes.stf;
    ok(p.resultado === 'falha' && s.resultado === 'falha' && /ENOTFOUND/.test(p.erro || '') && /ENOTFOUND/.test(s.erro || ''),
      'S14 com a busca falhando, rodar() devolve "falha" com o erro por extenso — nunca "sem novidade"');
    ok(p.ultimoSucesso === ANTES && s.ultimoSucesso === ANTES && p.ultimaTentativa > ANTES && s.ultimaTentativa > ANTES,
      'S14b a falha anda a última tentativa e preserva a última consulta bem-sucedida');
    ok(r.itens.length === 0 && r.novos === 0, 'S14c fonte fora do ar não inventa item');

    const lei = leiFalsa('LB', 30);
    const mudada = lei.artigos.map((a, i) => (i === 4
      ? { ...a, txt: a.txt.replace('suficiente', 'suficiente e novo') + ' (Redação dada pela Lei nº 15.999, de 2026)' } : a));
    const ler = async () => mudada;
    const o1 = await rodar({ fontes: ['planalto'], busca: { baixarLei: ler }, leis: [lei], ultimas: ULT, anterior: r.estado, atuais: [], silencioso: true });
    const o2 = await rodar({ fontes: ['planalto'], busca: { baixarLei: ler }, leis: [lei], ultimas: ULT, anterior: o1.estado, atuais: o1.itens, silencioso: true });
    const e1 = o1.estado.fontes.planalto;
    ok(e1.resultado === 'novidades' && o1.novos === 1 && o1.itens[0].modificadora === 'Lei nº 15.999, de 2026'
      && o2.novos === 0 && o2.itens.length === 1 && o2.itens[0].detectadoEm === o1.itens[0].detectadoEm,
      'S14d consulta repetida acha a mesma alteração e não duplica: um item, com o "detectado em" da primeira vez');
    ok(e1.ultimoSucesso === e1.ultimaTentativa && e1.normas.length === 1 && e1.normas[0].sigla === 'LB',
      'S14e a fonte que volta avança o último sucesso, e o estado leva as normas que foram conferidas');
  }

  // ── S15 — E13: página lida pela metade é falha daquela norma, não revogação em massa ──
  {
    const lei = leiFalsa('LC', 50), outra = leiFalsa('LD', 30);
    ok(parseSuspeito(lei.artigos, lei.artigos.slice(0, 39)) === 'parse suspeito: 39 de 50 artigos'
      && parseSuspeito(lei.artigos, lei.artigos.slice(0, 40)) === null,
      'S15 menos de 80% dos artigos esperados é parse suspeito; 80% passa');
    const fantasmas = Array.from({ length: 20 }, (_, i) => ({ rot: 'art. ' + (900 + i), txt: 'art. ' + (900 + i) + ' da Lei nº 13.105' }));
    ok(parseSuspeito(lei.artigos, [...lei.artigos.slice(0, 30), ...fantasmas]) === 'parse suspeito: 30 de 50 artigos',
      'S15b remissão em minúscula não completa a contagem de artigos lidos');
    const meia = async (url) => (url === lei.url ? lei.artigos.slice(0, 20) : outra.artigos);
    const r = await rodar({ fontes: ['planalto'], busca: { baixarLei: meia }, leis: [lei, outra], ultimas: ULT, anterior: { fontes: {} }, atuais: [], silencioso: true });
    const e = r.estado.fontes.planalto;
    ok(e.resultado === 'parcial' && /LC: parse suspeito: 20 de 50 artigos/.test(e.erro || '') && e.detalhe === '1/2 normas lidas',
      'S15c a norma lida pela metade sai como falha dela ("parse suspeito: 20 de 50 artigos") e a fonte fica parcial');
    ok(r.itens.length === 0, 'S15d os 30 artigos que a página não trouxe NÃO viram 30 revogações');
    const tudo = await rodar({ fontes: ['planalto'], busca: { baixarLei: async () => lei.artigos.slice(0, 5) }, leis: [lei], ultimas: ULT, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(tudo.estado.fontes.planalto.resultado === 'falha' && tudo.itens.length === 0 && /parse suspeito: 5 de 50/.test(tudo.estado.fontes.planalto.erro || ''),
      'S15e com todas as normas suspeitas, a fonte é falha — e nada é registrado como revogado');
  }

  // ── S13h–j — rodada só de baixa, e o PR que a dona fechou sem mesclar ──────
  {
    // O novidades.js da main tem o STF 1225 pendente; a rotina semanal já o incorporou.
    const pend = { id: 'INF-STF-1225', fonte: 'stf', tipo: 'informativo', norma: 'STF', disp: 'Informativo 1225 do STF', revisar: true,
      pendencia: 'edição detectada na fonte oficial', urlOficial: 'https://www.stf.jus.br/arquivo/informativo/documento/informativo1225.htm',
      detectadoEm: '2026-09-20T12:00:00.000Z', lido: false };
    const so1225 = async (url) => (/informativo1225\.htm$/.test(url) ? pagina(PAG['stf-1225']) : { status: 404, tam: 0, texto: '' });
    const bx = await rodar({ fontes: ['stf'], busca: { buscar: so1225 }, ultimas: { ...ULT, stf: 1225 }, anterior: { fontes: {} }, atuais: [pend], silencioso: true });
    ok(bx.novos === 0 && bx.baixas === 1 && bx.itens.length === 1 && bx.itens[0].incorporado === true && bx.itens[0].revisar === false
      && bx.estado.fontes.stf.resultado === 'sem-novidade',
      'S13h rodada só de baixa: nenhum item novo, mas baixas=1 — o workflow grava o novidades.js também por ela');
    const bx2 = await rodar({ fontes: ['stf'], busca: { buscar: so1225 }, ultimas: { ...ULT, stf: 1225 }, anterior: bx.estado, atuais: bx.itens, silencioso: true });
    ok(bx2.baixas === 0 && bx2.itens[0].incorporado === true, 'S13h2 a baixa do informativo conta uma vez só: a rodada seguinte não a reconta');
    // Rede de segurança (no workflow, a trava de recuo para o job antes — S21g): o
    // novidades.js de partida diz "já no JURIS" para a 1225, mas o juris-index.js desta
    // árvore só vai até a 1224. Ele não pode continuar dizendo.
    const caiu = async () => { throw new Error('ECONNRESET (simulado)'); };
    const vt = await rodar({ fontes: ['stf'], busca: { buscar: caiu }, ultimas: ULT, anterior: bx.estado, atuais: bx.itens, silencioso: true });
    const it1225 = vt.itens[0];
    ok(vt.estado.fontes.stf.resultado === 'falha' && vt.baixas === 1 && vt.novos === 0 && !('incorporado' in it1225)
      && !('incorporadoTxt' in it1225) && it1225.revisar === true && /ainda não está no CátedraJURIS/.test(it1225.pendencia || '')
      && it1225.detectadoEm === pend.detectadoEm,
      'S13l a baixa segue o acervo desta árvore: sem a edição no juris-index.js, o item volta a pendente (e conta como baixa: o novidades.js muda)');
    const semAcervo = mesclarNovidades(bx.itens, [], { stf: null, stj: null, stjExtra: 27 });
    ok(semAcervo.baixas === 0 && semAcervo.itens[0].incorporado === true,
      'S13l2 sem acervo legível, a baixa também não é desfeita — nada se afirma');

    const lz = leiFalsa('LZ', 30);
    const mud = lz.artigos.map((a, i) => (i === 2 ? { ...a, txt: a.txt + ' Novo. (Redação dada pela Lei nº 15.900, de 2026)' } : a));
    const dia = (ja) => rodar({ fontes: ['planalto'], busca: { baixarLei: async () => mud }, leis: [lz], ultimas: ULT,
      anterior: { fontes: {} }, atuais: [], jaPropostos: ja, silencioso: true });
    const p1 = await dia();
    const dir = mkdtempSync(path.join(os.tmpdir(), 'sentinela-'));
    const arq = path.join(dir, 'novidades-recusado.js');
    writeFileSync(arq, conteudoNovidades({ geradoEm: 'x', fontes: {}, itens: p1.itens }));
    const ids = lerIdsPropostos(arq);
    rmSync(dir, { recursive: true, force: true });
    const p2 = await dia(ids);
    ok(p1.novos === 1 && ids.length === 1 && ids[0] === p1.itens[0].id && p2.novos === 0 && p2.novosItens.length === 0 && p2.itens.length === 1,
      'S13i item de PR fechado sem merge não conta como novo outra vez (não reabre PR todo dia), mas segue no resultado');
    ok(lerIdsPropostos(path.join(RAIZ, 'arquivo-que-nao-existe.js')).length === 0,
      'S13j sem o novidades.js do PR recusado, a lista de já propostos fica vazia e a rodada segue');
  }

  // ── S17 — informativos de ponta a ponta, com os títulos reais de 01/10/2026 ──
  {
    const porUrl = new Map(MAN.paginas.map((p) => [p.url, p]));
    // STF 1226 a 1229 não foram baixadas: o título segue o formato REAL de 1225 e 1230.
    const stfFormato = (n) => ({ status: 200, bytes: 250000, titulo: `Brasília, ${n - 1205} de setembro de 2026 Nº ${n}` });
    const chamadas = [];
    const real = async (url) => {
      chamadas.push(url);
      const p = porUrl.get(url);
      if (p) return pagina(p);
      const m = /informativo(\d+)\.htm$/.exec(url);
      if (m) return +m[1] >= 1226 && +m[1] <= 1229 ? pagina(stfFormato(+m[1])) : { status: 404, tam: 0, texto: '' };
      return pagina(PAG['stj-7777']);   // STJ: edição que não saiu volta 200 com o título genérico
    };
    const A = MAN.acervoNaData;
    const ids = (r) => JSON.stringify(r.itens.map((i) => i.id).sort());
    const stj = await rodar({ fontes: ['stj'], busca: { buscar: real }, ultimas: A, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(ids(stj) === JSON.stringify(['INF-STJ-901', 'INF-STJ-902', 'INF-STJ-903']) && stj.estado.fontes.stj.resultado === 'novidades',
      'S17 STJ com os títulos reais: 901, 902 e 903 são novas, e nenhuma extraordinária');
    ok(['0033E', '0034E', '0035E', '0036E'].every((k) => chamadas.some((u) => u.includes('%27' + k + '%27'))),
      'S17b as extraordinárias são consultadas (a âncora 33 e as três seguintes) — o fim das ordinárias não as pula');
    ok(chamadas[0].includes('%270900%27'), 'S17c a âncora 900, já no acervo, é a primeira consulta — reconhecida antes de qualquer conclusão');
    const stf = await rodar({ fontes: ['stf'], busca: { buscar: real }, ultimas: A, anterior: { fontes: {} }, atuais: [], silencioso: true });
    ok(ids(stf) === JSON.stringify([1225, 1226, 1227, 1228, 1229, 1230].map((n) => 'INF-STF-' + n)) && stf.estado.fontes.stf.resultado === 'novidades',
      'S17d STF: 1225 a 1230 são novas, e o 404 da 1231 encerra a busca');

    const ANT = '2026-09-01T00:00:00.000Z';
    const ant = (f) => ({ fontes: { [f]: { ultimoSucesso: ANT, resultado: 'sem-novidade' } } });
    for (const [f, st] of [['stj', 503], ['stf', 503], ['stf', 403]]) {
      const r = await rodar({ fontes: [f], busca: { buscar: async () => ({ status: st, tam: 0, texto: '' }) }, ultimas: A, anterior: ant(f), atuais: [], silencioso: true });
      const e = r.estado.fontes[f];
      ok(e.resultado === 'falha' && new RegExp('HTTP ' + st).test(e.erro || '') && e.ultimoSucesso === ANT && r.itens.length === 0,
        `S17e ${f.toUpperCase()} respondendo ${st} é falha, com o erro por extenso e o último sucesso preservado — nunca "sem novidade"`);
    }
    const soAncora = async (url) => (url === PAG['stj-0900'].url || url === PAG['stj-EE33'].url ? pagina(porUrl.get(url)) : { status: 503, tam: 0, texto: '' });
    const r2 = await rodar({ fontes: ['stj'], busca: { buscar: soAncora }, ultimas: A, anterior: ant('stj'), atuais: [], silencioso: true });
    ok(r2.estado.fontes.stj.resultado === 'falha' && /nenhuma edição nova pôde ser conferida/.test(r2.estado.fontes.stj.erro || '')
      && r2.estado.fontes.stj.ultimoSucesso === ANT,
      'S17f âncora reconhecida mas toda edição nova com 503: falha, e o último sucesso não anda');
    const meio = async (url) => (url === PAG['stj-0902'].url ? { status: 503, tam: 0, texto: '' } : real(url));
    const r3 = await rodar({ fontes: ['stj'], busca: { buscar: meio }, ultimas: A, anterior: ant('stj'), atuais: [], silencioso: true });
    ok(r3.estado.fontes.stj.resultado === 'parcial' && /edição 902: HTTP 503/.test(r3.estado.fontes.stj.erro || '')
      && ids(r3) === JSON.stringify(['INF-STJ-901', 'INF-STJ-903']),
      'S17g uma edição com 503 no meio deixa a fonte parcial, nomeando a edição — as outras continuam valendo');
    const mudou = async () => ({ status: 200, tam: 300000, texto: '<title>STJ - Informativo de Jurisprudência n. 901</title>' });
    const r4 = await rodar({ fontes: ['stj'], busca: { buscar: mudou }, ultimas: A, anterior: ant('stj'), atuais: [], silencioso: true });
    ok(r4.estado.fontes.stj.resultado === 'falha' && r4.itens.length === 0 && r4.estado.fontes.stj.ultimoSucesso === ANT
      && /a régua não reconheceu a edição 900, que já está no acervo: a página mudou de formato/.test(r4.estado.fontes.stj.erro || ''),
      'S17h âncora não reconhecida: falha "a régua não reconheceu a edição 900, que já está no acervo", com o último sucesso preservado');
    const r5 = await rodar({ fontes: ['stf'], busca: { buscar: async () => ({ status: 200, tam: 9000, texto: '<title>Supremo Tribunal Federal</title>' }) },
      ultimas: A, anterior: ant('stf'), atuais: [], silencioso: true });
    ok(r5.estado.fontes.stf.resultado === 'falha' && /a régua não reconheceu a edição 1224/.test(r5.estado.fontes.stf.erro || ''),
      'S17i o mesmo vale para o STF: a 1224 do acervo sem "Nº 1224" no título é falha da fonte');
  }

  // ── S21 — workflow: incorporar, detectar e dar baixa na MESMA rodada ──────
  // O workflow roda scripts/atualizar-informativos.py e só depois o sentinela, com
  // --detectar-desde apontando o juris-index.js de ANTES da incorporação. A detecção parte
  // dele (a edição que acabou de entrar vira item, com a URL oficial) e a baixa compara com
  // o juris-index.js de agora — o novidades.js do PR diz "já no JURIS" exatamente para o que
  // o juris-index.js do mesmo PR traz.
  {
    const porUrl = new Map(MAN.paginas.map((p) => [p.url, p]));
    const real = async (url) => { const p = porUrl.get(url); return p ? pagina(p) : pagina(PAG['stj-7777']); };
    const ANTES = MAN.acervoNaData;                      // { stf: 1224, stj: 900, stjExtra: 33 }
    const DEPOIS = { ...ANTES, stj: 903 };               // a incorporação trouxe 901 a 903
    const opc = { fontes: ['stj'], busca: { buscar: real }, anterior: { fontes: {} }, silencioso: true };
    const ids = (r) => JSON.stringify(r.itens.map((i) => i.id).sort());
    const tres = JSON.stringify(['INF-STJ-901', 'INF-STJ-902', 'INF-STJ-903']);

    const w = await rodar({ ...opc, ultimas: DEPOIS, ultimasConsulta: ANTES, atuais: [] });
    ok(ids(w) === tres && w.novos === 3 && w.itens.every((i) => i.incorporado === true && i.incorporadoTxt === 'já no JURIS' && i.revisar === false && !('pendencia' in i))
      && /a partir da edição 901/.test(w.estado.fontes.stj.detalhe || ''),
      'S21 incorporar e depois detectar a partir do acervo de antes: 901 a 903 viram itens e saem "já no JURIS" no mesmo novidades.js');
    const sem = await rodar({ ...opc, ultimas: DEPOIS, atuais: [] });
    ok(sem.itens.length === 0 && /a partir da edição 904/.test(sem.estado.fontes.stj.detalhe || ''),
      'S21b controle — detectando a partir do acervo de agora, as edições recém-incorporadas nem aparecem: por isso o --detectar-desde');
    const falhou = await rodar({ ...opc, ultimas: ANTES, ultimasConsulta: ANTES, atuais: [] });
    ok(ids(falhou) === tres && falhou.itens.every((i) => !i.incorporado && i.revisar === true && /ainda não está no CátedraJURIS/.test(i.pendencia || '')),
      'S21c a incorporação não trouxe nada (página que não respondeu): as edições detectadas ficam "Conferir" — o PR não afirma o que não traz');
    const recusado = await rodar({ ...opc, ultimas: DEPOIS, ultimasConsulta: ANTES, atuais: [], jaPropostos: JSON.parse(tres) });
    ok(recusado.novos === 0 && recusado.baixas === 0 && recusado.itens.length === 3,
      'S21d o que a dona já recusou (PR fechado sem merge) não conta como novo nem como baixa — sozinho, não reabre PR');

    const ue = ultimasDoIndice([
      ['INF2026-STF-1203-01', 'STF', 'informativo_stf', 1203], ['INF2026-STF-1224-02', 'STF', 'informativo_stf', 1224],
      ['INF2026-STF-1224-03', 'STF', 'informativo_stf', 1224],
      ['INF2026-STJ-900-01', 'STJ', 'informativo_stj', 900], ['INF2026-STJ-EE33-01', 'STJ', 'informativo_stj', 33],
      ['TJRO-SUM-1', 'TJRO', 'tjro', 1],
    ]);
    ok(ue.stf === 1224 && ue.stj === 900 && ue.stjExtra === 33
      && JSON.stringify(ue.presentes) === JSON.stringify({ stf: [1203, 1224], stj: [900], stjExtra: [33] }),
      'S21e as últimas edições saem do índice — STF e STJ pelo número, extraordinária pelo id -EE<n>- — e também QUAIS edições estão lá (a linha da extraordinária não conta como ordinária 33)');
    const PR = { stf: 1230, stj: 903, stjExtra: 33 };
    ok(recuoDoAcervo(PR, PR) === null && recuoDoAcervo(PR, { ...PR, stf: 1231 }) === null
      && /STF: o PR aberto vai até a edição 1230, esta rodada só até a 1224/.test(recuoDoAcervo(PR, { ...PR, stf: 1224 }) || '')
      && /STJ: .*nenhuma/.test(recuoDoAcervo(PR, { ...PR, stj: null }) || '')
      && recuoDoAcervo({ stf: null, stj: null, stjExtra: null }, { stf: 1, stj: 1, stjExtra: 1 }) === null,
      'S21f a guarda acusa a incorporação que ficou ATRÁS do PR aberto (vazio nunca apaga cheio) e aceita a que ficou igual ou à frente');

    // LACUNA: o atualizar-informativos.py segue adiante depois de UMA edição que não respondeu
    // ("nada", e a seguinte responde) — o acervo sai com a 901 e a 903, sem a 902. Pelo número
    // máximo, a 902 seria "já no JURIS" e a trava de recuo não veria nada.
    const linhaStj = (n) => [`INF2026-STJ-${n}-01`, 'STJ', 'informativo_stj', n];
    const fixos = [['INF2026-STF-1224-01', 'STF', 'informativo_stf', 1224], ['INF2026-STJ-EE33-01', 'STJ', 'informativo_stj', 33]];
    const ANTES_L = ultimasDoIndice([...fixos, linhaStj(900)]);
    const PR_L = ultimasDoIndice([...fixos, linhaStj(900), linhaStj(901), linhaStj(902), linhaStj(903)]);
    const HOJE_L = ultimasDoIndice([...fixos, linhaStj(900), linhaStj(901), linhaStj(903)]);
    const lac = await rodar({ ...opc, ultimas: HOJE_L, ultimasConsulta: ANTES_L, atuais: [] });
    const est = (id) => lac.itens.find((i) => i.id === id) || {};
    ok(ids(lac) === tres && est('INF-STJ-901').incorporadoTxt === 'já no JURIS' && est('INF-STJ-903').incorporadoTxt === 'já no JURIS'
      && !est('INF-STJ-902').incorporado && est('INF-STJ-902').revisar === true && /ainda não está no CátedraJURIS/.test(est('INF-STJ-902').pendencia || ''),
      'S21i lacuna no acervo (901 e 903, sem a 902): a 902 fica "Conferir" — "já no JURIS" segue a presença da edição, não o número máximo');
    ok(/STJ: o PR aberto traz a edição 902, que esta rodada não trouxe/.test(recuoDoAcervo(PR_L, HOJE_L) || '') && recuoDoAcervo(PR_L, PR_L) === null
      && recuoDoAcervo({ stf: 1225, stj: 900, stjExtra: 33, presentes: { stf: [1203, 1224, 1225], stj: [900], stjExtra: [33] } },
        { stf: 1225, stj: 900, stjExtra: 33, presentes: { stf: [1224, 1225], stj: [900], stjExtra: [33] } }, { stf: 1224 }) === null,
      'S21j a trava de recuo acusa a edição do PR que esta rodada não trouxe, mesmo com a última igual; edição que a main tirou (abaixo da última dela) não é recuo');

    // Referência = PR fechado SEM merge, que trazia 901 e 902 (a dona recusou).
    const REC = ultimasDoIndice([...fixos, linhaStj(900), linhaStj(901), linhaStj(902)]);
    const hoje = (...ns) => ultimasDoIndice([...fixos, linhaStj(900), ...ns.map(linhaStj)]);
    const MAIN_903 = ultimasDoIndice([...fixos, linhaStj(900), linhaStj(901), linhaStj(902), linhaStj(903)]);
    ok(edicoesNovasAlem(ANTES_L, hoje(), REC).length === 0
      && edicoesNovasAlem(ANTES_L, hoje(901), REC).length === 0
      && edicoesNovasAlem(ANTES_L, hoje(901, 902), REC).length === 0
      && JSON.stringify(edicoesNovasAlem(ANTES_L, hoje(901, 902, 903), REC)) === JSON.stringify(['STJ 903'])
      && edicoesNovasAlem(MAIN_903, MAIN_903, REC).length === 0,
      'S21l com o PR recusado como referência, só reabre PR a edição nova de verdade: rodada sem rede, rodada com menos e rodada igual ao recusado não; a 903 sim; o que a main ganhou por outro PR também não');

    // As duas portas da linha de comando que o workflow usa, sem rede. O processo filho sobe
    // com a rede BLOQUEADA (toda conexão TCP lança): se uma regressão levar a linha de comando
    // a consultar as fontes, o caso falha na hora, em vez de sair para o Planalto e os tribunais.
    const dir = mkdtempSync(path.join(os.tmpdir(), 'sentinela-acervo-'));
    const bloqueio = path.join(dir, 'bloqueia-rede.cjs');
    writeFileSync(bloqueio, "require('node:net').Socket.prototype.connect = function () { throw new Error('rede bloqueada na régua'); };\n");
    const cli = (...args) => spawnSync(process.execPath, ['-r', bloqueio, path.join(RAIZ, 'scripts/sentinela.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8', timeout: 60000 });
    const idx = (linhas) => { const f = path.join(dir, 'juris-index-' + Math.random().toString(36).slice(2) + '.js'); writeFileSync(f, 'window.__JURIS_IDX__=' + JSON.stringify(linhas) + ';\n'); return f; };
    try {
      const aqui = ultimasDeArquivo(path.join(RAIZ, 'juris-index.js'));
      const prAFrente = cli('--conferir-recuo', idx([['INF2099-STF-99999-01', 'STF', 'informativo_stf', 99999]]));
      const emDia = cli('--conferir-recuo', idx([['INF2026-STF-' + aqui.stf + '-01', 'STF', 'informativo_stf', aqui.stf]]));
      const ruim = cli('--conferir-recuo', path.join(dir, 'nao-existe.js'));
      ok(prAFrente.status === 1 && /ficou atrás do PR aberto — STF: o PR aberto vai até a edição 99999/.test(prAFrente.stderr)
        && emDia.status === 0 && ruim.status === 2,
        'S21g --conferir-recuo sai 1 quando o PR aberto tem edição que esta rodada não trouxe, 0 quando está em dia, 2 quando não consegue comparar');
      // Lacuna pela linha de comando: o PR traz uma edição do STF ABAIXO da última do acervo
      // daqui e que o acervo daqui não tem (o acervo real tem lacunas antigas).
      const lacuna = aqui.presentes.stf.length ? [...Array(aqui.stf).keys()].find((n) => n > 0 && !aqui.presentes.stf.includes(n)) : undefined;
      const prLacuna = idx([['INF2026-STF-' + lacuna + '-01', 'STF', 'informativo_stf', lacuna], ['INF2026-STF-' + aqui.stf + '-01', 'STF', 'informativo_stf', aqui.stf]]);
      const comLacuna = cli('--conferir-recuo', prLacuna);
      const mainSemEla = cli('--conferir-recuo', prLacuna, '--desde', idx([['INF2026-STF-' + aqui.stf + '-01', 'STF', 'informativo_stf', aqui.stf]]));
      ok(lacuna > 0 && comLacuna.status === 1 && new RegExp(`o PR aberto traz a edição ${lacuna}, que esta rodada não trouxe`).test(comLacuna.stderr)
        && mainSemEla.status === 0,
        'S21j2 --conferir-recuo sai 1 com a edição do PR que falta no acervo daqui; com --desde, a que está abaixo da última da main não é recuo');

      // PR fechado SEM merge como referência: só reabre PR a edição que a incorporação de HOJE
      // trouxe (está aqui e não na main, --desde) e o recusado não tinha. Acervo apenas
      // DIFERENTE do recusado não basta: a rodada sem rede (acervo = main) e a que trouxe menos
      // que o recusado também diferem dele.
      const so1 = idx([['INF2026-STF-1-01', 'STF', 'informativo_stf', 1]]);   // "main" com quase nada
      const recusadoTudo = cli('--novas-alem-de', path.join(RAIZ, 'juris-index.js'), '--desde', so1);
      const recusadoPouco = cli('--novas-alem-de', so1, '--desde', so1);
      const semDesde = cli('--novas-alem-de', so1);
      ok(/novas=nao\s*$/.test(recusadoTudo.stdout) && recusadoTudo.status === 0
        && /novas=sim\s*$/.test(recusadoPouco.stdout) && recusadoPouco.status === 0
        && semDesde.status === 2 && !/novas=/.test(semDesde.stdout),
        'S21k --novas-alem-de: "novas=nao" quando o recusado já tinha tudo o que a rodada trouxe, "novas=sim" quando não; sem --desde é erro (saída 2), nunca "nada novo"');
      const desde = cli('--detectar-desde', path.join(dir, 'nao-existe.js'), '--dry-run');
      ok(desde.status === 2 && /--detectar-desde:/.test(desde.stderr),
        'S21h --detectar-desde com acervo ilegível para antes de qualquer consulta — nunca detecta a partir de "nenhuma"');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }

  // ── S18 — Planalto: identidade da mudança, leitura que não confirma, revogação anotada ──
  {
    const hoje = new Date(2026, 9, 1);
    const ANT = '2026-09-01T00:00:00.000Z';
    // Mesma mudança jurídica; no dia 2 a página ganha o rótulo de margem "Regulamento" (S2).
    const lx = leiFalsa('LX', 30);
    const dia1 = lx.artigos.map((a, i) => (i === 4 ? { ...a, txt: a.txt.replace('suficiente', 'suficiente e novo') + ' (Redação dada pela Lei nº 15.999, de 2026)' } : a));
    const dia2 = dia1.map((a, i) => (i === 4 ? { ...a, txt: a.txt.replace('com texto', 'com Regulamento texto') } : a));
    const o1 = await rodar({ fontes: ['planalto'], busca: { baixarLei: async () => dia1 }, leis: [lx], ultimas: ULT, anterior: { fontes: {} }, atuais: [], silencioso: true });
    const o2 = await rodar({ fontes: ['planalto'], busca: { baixarLei: async () => dia2 }, leis: [lx], ultimas: ULT, anterior: o1.estado, atuais: o1.itens, silencioso: true });
    ok(compararArtigos(dia1, dia2).length === 0 && o1.novos === 1 && o2.novos === 0 && o2.itens.length === 1
      && o2.itens[0].id === o1.itens[0].id && o2.itens[0].detectadoEm === o1.itens[0].detectadoEm,
      'S18 rótulo de margem novo num artigo já alterado não cria segundo item: mesma mudança, mesmo id, nada novo');

    // Leituras divergentes não confirmam nada: não contam como norma lida.
    const tres = [leiFalsa('LA', 30), leiFalsa('LB', 30), leiFalsa('LC', 30)];
    let k = 0;
    const oscila = async (url) => { k++; return tres.find((x) => x.url === url).artigos.map((a, i) => (i === 2 ? { ...a, txt: a.txt + ' variação ' + k } : a)); };
    const dv = await rodar({ fontes: ['planalto'], busca: { baixarLei: oscila }, leis: tres, ultimas: ULT,
      anterior: { fontes: { planalto: { ultimoSucesso: ANT } } }, atuais: [], silencioso: true });
    const e = dv.estado.fontes.planalto;
    ok(e.resultado === 'falha' && e.ultimoSucesso === ANT && e.detalhe === '0/3 normas lidas' && /leituras divergentes/.test(e.erro || '') && dv.itens.length === 0,
      'S18b com todas as normas em leituras divergentes, nada foi confirmado: falha, "0/3 normas lidas" e o último sucesso não anda');

    // Revogação no texto compilado: o artigo FICA, com "(Revogado pela…)".
    const cp = { sigla: 'CP', nome: 'Código Penal', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm' };
    const a240 = 'Art. 240. Cometer adultério: Pena - detenção, de quinze dias a seis meses.';
    const [d240] = compararArtigos([{ rot: 'Art. 240', txt: a240 }], [{ rot: 'Art. 240', txt: a240 + ' (Revogado pela Lei nº 15.700, de 2026)' }]);
    const rv = itemPlanalto(cp, d240, 'x', hoje);
    ok(rv.tipo === 'revogacao' && rv.modificadora === 'Lei nº 15.700, de 2026' && rv.antes === a240 && /Revogado pela/.test(rv.depois || ''),
      'S18c caput que ganha "(Revogado pela…)" é revogação — com o antes, o depois e a norma revogadora');
    const a5 = 'Art. 5º A regra geral vale para todos. § 1º Primeira exceção. § 2º Segunda exceção.';
    const [d5] = compararArtigos([{ rot: 'Art. 5º', txt: a5 }], [{ rot: 'Art. 5º', txt: a5 + ' (Revogado pela Lei nº 15.700, de 2026)' }]);
    const par = itemPlanalto(cp, d5, 'x', hoje);
    ok(par.tipo === 'alteracao' && par.modificadora === 'Lei nº 15.700, de 2026',
      'S18c2 controle — revogação só de parágrafo continua alteração do artigo, com a norma revogadora');
    const velho = 'Art. 117. Texto antigo do artigo. (Revogado pela Emenda Constitucional nº 24, de 1999)';
    const [dv2] = compararArtigos([{ rot: 'Art. 117', txt: velho }], [{ rot: 'Art. 117', txt: velho.replace('antigo', 'antigo,') }]);
    ok(itemPlanalto(cp, dv2, 'x', hoje).tipo === 'alteracao',
      'S18c3 artigo revogado há tempo não vira revogação nova quando o texto oscila — a anotação não é nova');

    // Artigos que somem: leitura suspeita da norma, não revogação.
    const cem = leiFalsa('LR', 100), ls = leiFalsa('LS', 30);
    const pr = await rodar({ fontes: ['planalto'], busca: { baixarLei: async (url) => (url === cem.url ? cem.artigos.slice(0, 81) : ls.artigos) },
      leis: [cem, ls], ultimas: ULT, anterior: { fontes: {} }, atuais: [], silencioso: true });
    const ep = pr.estado.fontes.planalto;
    ok(ep.resultado === 'parcial' && pr.itens.length === 0 && ep.detalhe === '1/2 normas lidas'
      && /LR: 19 artigo\(s\) do acervo sumiram da página \(Art\. 82, Art\. 83/.test(ep.erro || ''),
      'S18d página que perde 19 de 100 artigos (acima do piso de 80%) não gera 19 revogações: a norma falha e a fonte fica parcial');

    // Recorte: a anotação nova é do artigo VIZINHO embutido no trecho.
    const ctn = { sigla: 'CTN', nome: 'Código Tributário Nacional', url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm' };
    const a111 = 'Art. 111. Interpreta-se literalmente a legislação tributária que disponha sobre suspensão do crédito. (Redação dada pela Lei Complementar nº 104, de 2001)';
    const a112 = 'Art. 112. A lei tributária que define infrações interpreta-se da maneira mais favorável ao acusado.';
    const a112n = 'Art. 112. A lei tributária que define infrações interpreta-se da maneira mais favorável ao contribuinte. (Redação dada pela Lei Complementar nº 240, de 2026)';
    const rc = itemPlanalto(ctn, { tipo: 'alteracao', rot: 'Art. 111', antes: a111 + ' ' + a112, depois: a111 + ' ' + a112n }, 'x', hoje);
    ok(rc.recorte === true && rc.modificadora === null && rc.modificadoras.length === 0 && rc.revisar === true,
      'S18e no recorte, a anotação nova do artigo vizinho não vira a norma modificadora do artigo que não mudou');
  }

  // ── S19 — baixa do Planalto: só quando o acervo de agora TEM o texto do item ──
  {
    const opc = { fontes: ['planalto'], ultimas: ULT, anterior: { fontes: {} }, silencioso: true };
    const lei = leiFalsa('LP', 30);
    const mudar = (arts, trecho, norma) => arts.map((a, i) => (i === 6
      ? { ...a, txt: a.txt.replace('suficiente', 'suficiente ' + trecho) + ` (Redação dada pela ${norma})` } : a));
    const pag1 = mudar(lei.artigos, 'e mudado', 'Lei nº 15.888, de 2026');
    const r1 = await rodar({ ...opc, busca: { baixarLei: async () => pag1 }, leis: [lei], atuais: [] });
    const id = r1.itens[0].id;
    const de = (r) => r.itens.find((i) => i.id === id);
    // A rotina regerou o leis-seca.js: o acervo passa a ter o texto novo; a página segue igual.
    const leiNova = { ...lei, artigos: pag1 };
    const r2 = await rodar({ ...opc, busca: { baixarLei: async () => pag1 }, leis: [leiNova], atuais: r1.itens });
    ok(r2.baixas === 1 && r2.novos === 0 && de(r2).incorporado === true && de(r2).revisar === false && !('pendencia' in de(r2)),
      'S19 acervo regerado com o texto novo: o item do Planalto recebe baixa (incorporado, fora da revisão)');
    const r3 = await rodar({ ...opc, busca: { baixarLei: async () => pag1 }, leis: [leiNova], atuais: r2.itens });
    ok(r3.baixas === 0 && de(r3).incorporado === true, 'S19b a baixa conta uma vez só');
    const volta = await rodar({ ...opc, busca: { baixarLei: async () => lei.artigos }, leis: [lei], atuais: r1.itens });
    ok(volta.baixas === 0 && !de(volta).incorporado,
      'S19c página que voltou atrás (o acervo segue com o texto antigo) não vira "já no acervo"');
    const pag2 = mudar(lei.artigos, 'e mudado outra vez', 'Lei nº 15.889, de 2026');
    const d2 = await rodar({ ...opc, busca: { baixarLei: async () => pag2 }, leis: [lei], atuais: r1.itens });
    const d2b = await rodar({ ...opc, busca: { baixarLei: async () => pag2 }, leis: [{ ...lei, artigos: pag2 }], atuais: d2.itens });
    ok(!de(d2).incorporado && d2.novos === 1 && !de(d2b).incorporado,
      'S19d mudança substituída (D1→D2) não marca D1 como "já no acervo" — nem antes nem depois de o acervo receber D2');
    let k = 0;
    const casos = [
      ['leituras divergentes', async () => pag1.map((a, i) => (i === 9 ? { ...a, txt: a.txt + ' variação ' + (++k) } : a))],
      ['artigo ausente', async () => pag1.slice(0, 29)],
      ['falha de leitura', async () => { throw new Error('HTTP 503'); }],
    ];
    for (const [nome, ler] of casos) {
      const x = await rodar({ ...opc, busca: { baixarLei: ler }, leis: [leiNova], atuais: r1.itens });
      ok(x.baixas === 0 && !de(x).incorporado, `S19e ${nome} na norma não dá baixa: sem leitura conclusiva, nada muda`);
    }
    ok(de(r2).incorporadoTxt === 'já no LEGIS',
      'S19f a baixa da mudança de lei diz "já no LEGIS" — o selo não afirma o JURIS para item do Planalto');

    // Artigo cortado no teto (4.000 caracteres): a comparação é só do começo do texto, e o
    // item sai parcial. Acervo regerado com o mesmo começo NÃO prova que o artigo inteiro
    // entrou — o item parcial nunca recebe baixa.
    const lt = leiFalsa('LT', 30);
    const corpo = 'Disposição extensa da lei LT, repetida para alcançar o teto do acervo de lei seca. ';
    const longo = ('Art. 7. ' + corpo.repeat(60)).slice(0, 4000);
    const ltAntes = { ...lt, artigos: lt.artigos.map((a, i) => (i === 6 ? { ...a, txt: longo } : a)) };
    const novoTxt = longo.replace('Disposição extensa', 'Disposição extensa e alterada (Redação dada pela Lei nº 15.777, de 2026)').slice(0, 4000);
    const pagT = ltAntes.artigos.map((a, i) => (i === 6 ? { ...a, txt: novoTxt } : a));
    const t1 = await rodar({ ...opc, busca: { baixarLei: async () => pagT }, leis: [ltAntes], atuais: [] });
    const itP = t1.itens[0];
    const t2 = await rodar({ ...opc, busca: { baixarLei: async () => pagT }, leis: [{ ...ltAntes, artigos: pagT }], atuais: t1.itens });
    const itP2 = t2.itens.find((i) => i.id === itP.id);
    ok(t1.itens.length === 1 && itP.parcial === true && itP.revisar === true
      && t2.baixas === 0 && itP2 && !itP2.incorporado && !('incorporadoTxt' in itP2) && itP2.revisar === true,
      'S19g item de comparação parcial (artigo no teto) não recebe baixa nem com o acervo regerado — começo igual não prova o artigo inteiro');
    const sempre = () => true;
    const soParcial = mesclarNovidades([itP], [], ULT, sempre);
    const controle = mesclarNovidades([{ ...itP, parcial: false }], [], ULT, sempre);
    ok(!soParcial.itens[0].incorporado && soParcial.baixas === 0 && controle.itens[0].incorporado === true,
      'S19g2 a trava é do item parcial: com o mesmo "está no acervo", o item inteiro recebe baixa e o parcial não');

    // O teto pelo lado do ACERVO: o item D1 é inteiro (artigo abaixo do teto), mas a página
    // trocou D1 por um D2 longo e o leis-seca.js regerado guarda o artigo no teto. A conferência
    // compara só o começo — que D1 e D2 têm igual — e o LEGIS não tem o texto de D1.
    const lu = leiFalsa('LU', 30);
    const base7 = 'Art. 7. ' + 'Disposição extensa da lei LU para chegar perto do teto do acervo. '.repeat(45);
    const dU1 = base7 + ' Parágrafo único. Prazo de 10 dias. (Incluído pela Lei nº 15.701, de 2026)';
    const dU2 = (base7 + ' Parágrafo único. Prazo de 30 dias, contados em dobro. (Redação dada pela Lei nº 15.702, de 2026) ' + 'Texto acrescentado. '.repeat(80)).slice(0, 4000);
    const com7 = (txt) => lu.artigos.map((a, i) => (i === 6 ? { ...a, txt } : a));
    const u1 = await rodar({ ...opc, busca: { baixarLei: async () => com7(dU1) }, leis: [{ ...lu, artigos: com7(base7) }], atuais: [] });
    const iD1 = u1.itens[0];
    const u2 = await rodar({ ...opc, busca: { baixarLei: async () => com7(dU2) }, leis: [{ ...lu, artigos: com7(dU2) }], atuais: u1.itens });
    const iD1b = u2.itens.find((i) => i.id === iD1.id);
    ok(u1.itens.length === 1 && iD1.parcial === false && dU1.length < 3990 && dU2.length >= 3990 && !dU2.includes('Prazo de 10 dias')
      && u2.baixas === 0 && iD1b && !iD1b.incorporado && !('incorporadoTxt' in iD1b),
      'S19h item inteiro não recebe baixa quando o artigo do acervo regerado está no teto — a comparação só do começo não prova que o LEGIS tem o texto dele');
  }

  // ── S20 — prazo da função serverless: o que não coube sai parcial/falha, nunca 504 ──
  // Relógio falso: cada leitura "gasta" 1 s, e a folga é de 3 s.
  {
    const real = Date.now;
    let t = real();
    Date.now = () => t;
    try {
      const tres = [leiFalsa('LA', 30), leiFalsa('LB', 30), leiFalsa('LC', 30)];
      const devagar = async (url) => { t += 1000; return tres.find((l) => l.url === url).artigos; };
      const ANT = '2026-09-30T12:00:00.000Z';
      const ant = { fontes: { planalto: { ultimoSucesso: ANT }, stj: { ultimoSucesso: ANT } } };
      const a = await rodar({ fontes: ['planalto'], busca: { baixarLei: devagar }, leis: tres, ultimas: ULT, anterior: ant, atuais: [], silencioso: true, prazo: t + 3500 });
      const ea = a.estado.fontes.planalto;
      ok(ea.resultado === 'parcial' && /tempo da consulta esgotado antes de ler: LB, LC/.test(ea.erro || '') && ea.detalhe === '1/3 normas lidas',
        'S20 o que não coube no prazo sai parcial, com as normas não lidas por extenso');
      const z = await rodar({ fontes: ['planalto'], busca: { baixarLei: devagar }, leis: tres, ultimas: ULT, anterior: ant, atuais: [], silencioso: true, prazo: t + 2000 });
      ok(z.estado.fontes.planalto.resultado === 'falha' && z.estado.fontes.planalto.ultimoSucesso === ANT,
        'S20b sem tempo para nada é falha, e o último sucesso conhecido fica');
      const pag = async (url) => { t += 1000; return pagina(PAG[/0033E/.test(url) ? 'stj-EE33' : 'stj-0900']); };
      const i = await rodar({ fontes: ['stj'], busca: { buscar: pag }, ultimas: ULT, anterior: ant, atuais: [], silencioso: true, prazo: t + 4500 });
      ok(i.estado.fontes.stj.resultado === 'falha' && /tempo da consulta esgotado antes da edição 901/.test(i.estado.fontes.stj.erro || '')
        && i.estado.fontes.stj.ultimoSucesso === ANT,
        'S20c no STJ, âncoras conferidas e o tempo acabando antes da 901: falha por tempo, nunca "sem novidade"');
    } finally { Date.now = real; }
    const { buscarFonte } = await import('../scripts/lib/tls-fontes.mjs');
    let erro = '';
    try { await buscarFonte('https://www.stf.jus.br/arquivo/informativo/documento/informativo1225.htm', { prazo: Date.now() - 1 }); } catch (e) { erro = e.message; }
    ok(erro === 'tempo da consulta esgotado', 'S20d leitura com o prazo já vencido nem sai para a rede');
  }

  // ── S16 — um parser só: o build da lei seca importa o recorte desta lib ──
  // Até 01/10/2026 eram duas cópias (scripts/lib/planalto.mjs e scripts/build-leis-seca.mjs).
  // Ajustar uma só passaria a acusar "alterações" que são só diferença de recorte entre as duas.
  {
    const b = readFileSync(path.join(RAIZ, 'scripts/build-leis-seca.mjs'), 'utf8');
    const importa = /import\s*\{[^}]*\blimparHTML\b[^}]*\bmelhorParse\b[^}]*\}\s*from\s*'\.\/lib\/planalto\.mjs'/.test(b);
    const copiaPropria = /function\s+(limparHTML|artigos|artigosCorrido|melhorParse|catalogo)\s*\(|const NAMED\s*=|alt\.length > arts\.length/.test(b);
    ok(importa && !copiaPropria, 'S16 o build da lei seca usa limparHTML e melhorParse de scripts/lib/planalto.mjs, sem cópia própria do parser');
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
  await testarSentinela(ok);
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
  process.exit(falhas.length ? 1 : 0);
}
