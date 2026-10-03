/* IMPORTADOR DE EDITAL — PENTE FINO (03/10/2026)

   O importador ("Reconhecer sem IA") não tinha teste nenhum, e três dos formatos mais comuns
   do país saíam errados:
   · CEBRASPE escreve a disciplina inteira num parágrafo ("DIREITO X: 1 Tema. 1.1 Sub. 2 Tema.")
     e tudo virava UM tópico com os números dentro;
   · FGV põe a matéria numa linha e parágrafos "Título: resto" embaixo — o primeiro "Título:"
     tomava o lugar da disciplina, e "Língua Portuguesa" sumia;
   · bloco numerado em romano ou letra ("I - DIREITO PENAL", "A) DIREITO CIVIL") caía numa
     "Nova disciplina" só.
   E o modelo aplicado num concurso NOVO trazia os tópicos mas deixava as disciplinas que já
   existiam no acervo marcadas como "fora do concurso".

   O que se prova aqui:
   · o parser, formato por formato, contra o parseEdital REAL da tela (não uma cópia);
   · o caminho da pessoa: colar → Reconhecer → conferir a prévia → Adicionar → fechar e reabrir;
   · importar duas vezes não duplica, e não apaga o que já estava concluído;
   · modelo aplicado num concurso novo põe as disciplinas DENTRO dele;
   · todo modelo do índice tem conteúdo, e as contagens do cartão batem com o arquivo. */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORMATOS = {
  cebraspe: `DIREITO CONSTITUCIONAL: 1 Constituição. 1.1 Conceito, objeto,
elementos e classificações. 1.2 Supremacia da Constituição. 2 Poder
constituinte. 2.1 Características. 3 Direitos e garantias fundamentais (art. 5 da Constituição de 1988). 4 Lei nº 8.112. 5 Organização do Estado.
CRIMINALÍSTICA: 1 Locais de crime. 2 Vestígios. 2.1 Cadeia de custódia.
NOÇÕES DE DIREITO PENAL: 1 Aplicação da lei penal.`,
  fgv: `Língua Portuguesa
Elementos de construção do texto e seu sentido: gênero do texto (literário e não literário, narrativo, descritivo e argumentativo); interpretação e organização interna. Semântica: sentido e emprego dos vocábulos.
Direito Civil
Lei de Introdução às Normas do Direito Brasileiro. Pessoas naturais: personalidade e capacidade.`,
  fcc: `Direito Constitucional: Constituição: conceito, objeto e classificações. Dos princípios fundamentais. Dos direitos e garantias fundamentais: dos direitos e deveres individuais e coletivos.
Direito Administrativo: Princípios básicos da Administração Pública. Lei nº 8.112/1990. Lei nº 9.784/1999.
Criminologia: Conceito. Métodos. Escolas.`,
  vunesp: `CONHECIMENTOS GERAIS
Língua Portuguesa: Leitura e interpretação de diversos tipos de textos. Sinônimos e antônimos. Pontuação.
Matemática: Operações com números reais. Mínimo múltiplo comum. Razão e proporção.
CONHECIMENTOS ESPECÍFICOS
Direito Penal: Código Penal - artigos 293 a 305; 307; 308.
Direito Processual Penal: Código de Processo Penal - artigos 251 a 258.`,
  oab: `Direitos Humanos
1. Teoria geral dos direitos humanos
2. Sistema global de proteção
Ética Profissional (8 questões)
1. Estatuto da Advocacia e da OAB
2. Código de Ética e Disciplina`,
  romano: `I - DIREITO PENAL
1. Princípios. 2. Teoria do crime.
II - DIREITO PROCESSUAL PENAL
1. Inquérito policial.`,
  letras: `A) DIREITO CIVIL
1. Pessoas. 2. Bens. 3. Fatos jurídicos.
B) DIREITO EMPRESARIAL
1. Empresário. 2. Sociedades.`,
  livro: `DIREITO ELEITORAL
1 Direitos políticos
1.1 Sufrágio e voto
1.2 Inelegibilidade de
Magistrado e membro do MP
1.3 Ação de impugnação (AIRC)
2 Partidos políticos
2.1 Registro
DIREITO CIVIL
1 Pessoas
1.1 Capacidade`,
  /* Trechos REAIS do Anexo II do edital do 48º Exame de Ordem (FGV, 21/09/2026), com tudo o que
     o PDF e o próprio edital fazem de errado: marcador em fonte de símbolo (U+F034) antes do
     cabeçalho, número separado do título pela quebra de linha ("5" + "Licitações", "espaço 4" +
     "Imunidades"), ponto esquecido antes do número, minúscula depois dele ("19 legislação"),
     e rabo de frase sozinho na linha depois de quebra de página ("legislação."). */
  oab2fase: `\uf034DIREITO ADMINISTRATIVO:
1. Princípios, fontes e interpretação. 1.1 Lei nº 13.655/2018 e suas disposições sobre segurança jurídica e
eficiência na criação e na aplicação do direito público. 2 Atividade e estrutura administrativa. 3 Poderes
administrativos. 3.1 Poder hierárquico. 4 Atos administrativos: conceito, atributos, classificação, espécies, extinção. 5
Licitações e contratos. Lei 8.666/93 e Lei 14.133/2021. 6 Serviços públicos.

\uf034DIREITO EMPRESARIAL:
1 Do Direito de Empresa. 2 Da Sociedade. 3 Do Estabelecimento. 4 Dos Institutos Complementares: 4.1 Registro Empresarial e sua

legislação. 4.2 Nome empresarial. 5 Da Sociedade Anônima.

\uf034DIREITO PROCESSUAL PENAL:
1 Princípios constitucionais e processuais penais. 2 Sistemas processuais penais. 3 Aplicação da lei processual
penal. 3.1 Interpretação e integração da lei processual penal. 3.2 A lei processual penal no tempo e no espaço 4
Imunidades processuais penais. 5 Inquérito Policial. 6 Nulidades. 7 legislação extravagante. 8 Recursos. 8.1
Processo coletivo passivo. 9 Súmulas e Precedentes qualificados dos Tribunais Superiores.`,
  /* Anexo inteiro colado, como sai do PDF (padrão do TJ-PE 2026, FGV): cabeçalho de página que
     se repete, rótulos que não são matéria, preâmbulo, itens numerados com continuação em linha
     sem número, e linhas que terminam penduradas ("do", "-"). */
  anexo: `TRIBUNAL DE JUSTIÇA DO ESTADO | CONCURSO PÚBLICO 2026
51
ANEXO I – CONTEÚDO PROGRAMÁTICO
CARGO: JUIZ SUBSTITUTO
O conteúdo programático contempla legislação, jurisprudência e doutrina pertinentes aos temas.
BLOCO I
DIREITO CIVIL
1. Lei de Introdução às Normas do Direito Brasileiro. 2. Sistema do Código Civil. Princípios gerais do Direito.
Unidade sistemática e pluralidade de fontes. 3. Direito subjetivo.
TRIBUNAL DE JUSTIÇA DO ESTADO | CONCURSO PÚBLICO 2026
52
DIREITO PROCESSUAL PENAL
1. Do Juiz, do
Ministério Público, do Acusado e Defensor (Título VIII do Livro I -
CPP). 2. Da Prisão.
TRIBUNAL DE JUSTIÇA DO ESTADO | CONCURSO PÚBLICO 2026
53
OBSERVAÇÕES:
Considerar-se-á a legislação vigente.`,
  // disciplina numerada no nível 1 e tópicos no nível 2 (padrão da PC-PR 2026, FGV)
  discNumerada: `1. DIREITO PENAL
1.1 Princípios fundamentais do Direito Penal. 1.2 Teoria do crime. 1.2.1 Tipicidade.
2. DIREITO PROCESSUAL PENAL
2.1 Inquérito policial. 2.2 Ação penal.`,
  /* Padrões colhidos de 28 cargos de editais de 2026 (FGV, FCC, Cebraspe, Cesgranrio). */
  // TJ-SC (FGV): "Matéria - 1 Tópico", com travessão no lugar dos dois-pontos
  travessao: `Língua Portuguesa - 1 Compreensão e interpretação de textos de gêneros variados. 2 Reconhecimento de tipos e gêneros textuais.
Gestão de Pessoas e Comportamento Organizacional - 1. Gestão de pessoas. 1.1 Função estratégica de recursos humanos. 2. Desenvolvimento e desempenho.
Direito Constitucional – Constituição Federal de 1988. 1. Aplicabilidade das normas constitucionais: 1.1 Normas de eficácia plena. 2. Princípios fundamentais.`,
  // PC-AP (Cesgranrio): título solto, sem caixa-alta e sem nome conhecido, antes de "1. …"
  tituloSolto: `Criminologia
1. Conceito e objeto. 2. Criminologia contemporânea.
História do Amapá
1. História do Amapá. 2. Ocupação e povoamento.
Direito Processual Penal e Legislação Processual Penal Especial
1. Aplicação da lei processual penal. 2. Inquérito policial.`,
  // Sefaz-SP (FCC): matéria em linha própria com PARTES "Título: conteúdo" embaixo
  partes: `Economia
Teoria Microeconômica: Eficiência e bem-estar. Falhas de mercado.
Teoria Macroeconômica: Crescimento econômico e produtividade. Modelos de determinação da renda.
Matemática Financeira / Estatística
Matemática Financeira: Regimes de capitalização. Taxas de juros.
Estatística: Estatística descritiva. Probabilidade.
Direito Administrativo
Teoria Geral, Princípios e Organização Administrativa: Regime jurídico-administrativo. Administração direta e indireta.`,
  // PC-PR (FGV) e TCE-SC (FGV): disciplina numerada em caixa-alta, nome longo, e "área de habilitação"
  numeradaLonga: `7. DIREITOS HUMANOS: 7.1 Teoria Geral dos Direitos Humanos. 7.2 Sistema global.
8. CIÊNCIAS FORENSES: 8.1 Medicina Legal. 8.1.1 Conceito. 8.2 Criminalística.
9. REALIDADE ÉTNICA, SOCIAL, HISTÓRICA, GEOGRÁFICA, CULTURAL, POLÍTICA E
ECONÔMICA DO ESTADO DO PARANÁ: 9.1 Aspectos históricos. 9.2 Aspectos geográficos.
ÁREA DE HABILITAÇÃO: CIÊNCIAS CONTÁBEIS
1 Contabilidade Aplicada ao Setor Público. 1.1 Conceito. 2 Auditoria.`,
  // TJ-BA, TJ-GO, TJ-RS (FGV): miudezas de PDF que picotavam itens
  miudezas: `DIREITO DIGITAL
1. 4ª Revolução industrial. Transformação Digital no Poder Judiciário. 2. Persecução Penal e
novas tecnologias. 3. Noções gerais de contratos inteligentes.
DIREITO CONSTITUCIONAL
1. Tratados de que o Brasil seja parte. 2. Convenção Americana sobre Direitos Humanos (Pacto de San José da Costa Rica, de
22 de novembro de 1969, promulgado pelo Decreto nº 678/1992). 3. Recuperação judicial: a) objetivo;
b) legitimidade ativa; c) requisitos. 4. Responsabilidade fiscal (Lei Complementar nº 101/2000.
DIREITO AMBIENTAL
1. Meio Ambiente. 2. Súmulas do Supremo Tribunal Federal e do
Tribunal de Justiça do Estado.
DIREITO PENAL Princípios aplicáveis ao Direito Penal. Aplicação da lei penal.`,
  // o edital repete "Disposições gerais" e "Conceito" a cada assunto; e repete o título em itens seguidos
  repetidos: `Direito Civil: Pessoas jurídicas. Disposições gerais. Associações. Negócio jurídico. Disposições gerais. Prescrição. Disposições gerais.
DIREITO DE FAMÍLIA
1. Direito das famílias. Direitos pessoais. Casamento. 2. Direito das famílias. Direitos patrimoniais. Alimentos. 3. Sucessões.`,
  caps: `DIREITO CIVIL
LEI DE INTRODUÇÃO
PESSOAS NATURAIS
DIREITO PENAL
APLICAÇÃO DA LEI PENAL`,
};

export async function testarImportadorEdital(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const R = 'IMPORTADOR [' + motor + '] ';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  try {
    await semear(page, base, []);
    await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
    await formatos(page, ok, R);
    await caminhoDaPessoa(page, base, ok, R, arquivo);
    await modeloEmConcursoNovo(page, base, ok, R, arquivo);
    await integridadeDosModelos(page, ok, R);
  } catch (e) { ok(false, R + 'roteiro quebrou: ' + (e && e.message)); }
  finally { await ctx.close(); }
}

async function semear(page, base, edital) {
  await page.goto(base + '/__semente');
  await page.evaluate((ed) => {
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    localStorage.clear();
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', ed); set('sessions', []); set('reviews', []); set('errors', []);
  }, edital);
}

async function formatos(page, ok, R) {
  const r = await page.evaluate((F) => {
    const app = window.__catedraApp, out = {};
    for (const k of Object.keys(F)) out[k] = app.parseEdital(F[k]).map(d => ({ disc: d.disc, q: d.questoes, t: d.topics.map(t => ({ n: t.name, s: t.subs })) }));
    return out;
  }, FORMATOS);
  const nomes = k => (r[k] || []).map(d => d.disc).join(' | ');
  const tops = (k, i) => (((r[k] || [])[i] || {}).t || []).map(t => t.n);
  const subs = (k, i, j) => ((((r[k] || [])[i] || {}).t || [])[j] || {}).s || [];

  // CEBRASPE, com as linhas partidas do PDF
  ok(nomes('cebraspe') === 'Direito Constitucional | Criminalística | Noções de Direito Penal',
    R + 'Cebraspe: as três disciplinas, inclusive a que não tem "Direito" no nome (' + nomes('cebraspe') + ')');
  ok(tops('cebraspe', 0).length === 5 && tops('cebraspe', 0)[1] === '2 Poder constituinte',
    R + 'Cebraspe: "1 … 2 … 3 …" na mesma linha vira um tópico por número (' + tops('cebraspe', 0).length + ')');
  ok(subs('cebraspe', 0, 0).length === 2 && /^1\.1 Conceito, objeto, elementos e classificações$/.test(subs('cebraspe', 0, 0)[0]),
    R + 'Cebraspe: "1.1" e "1.2" viram subtópicos do 1, com a linha partida do PDF recosturada');
  ok(/art\. 5 da Constituição de 1988/.test(tops('cebraspe', 0)[2] || '') && /^4 Lei nº 8\.112$/.test(tops('cebraspe', 0)[3] || ''),
    R + 'Cebraspe: "art. 5" e "Lei nº 8.112" não são confundidos com numeração de item');

  // FGV
  ok(nomes('fgv') === 'Língua Portuguesa | Direito Civil',
    R + 'FGV: a matéria em linha própria é a disciplina — "Título:" do parágrafo não toma o lugar dela (' + nomes('fgv') + ')');
  ok(tops('fgv', 0).length === 2 && /^Semântica: /.test(tops('fgv', 0)[1] || ''),
    R + 'FGV: cada frase do parágrafo é um tópico, não subtópico da primeira');

  // FCC e VUNESP: "Disciplina: itens" na mesma linha
  ok(nomes('fcc') === 'Direito Constitucional | Direito Administrativo | Criminologia', R + 'FCC: "Disciplina: itens" na mesma linha (' + nomes('fcc') + ')');
  ok(tops('fcc', 1).join(' | ') === 'Princípios básicos da Administração Pública | Lei nº 8.112/1990 | Lei nº 9.784/1999',
    R + 'FCC: duas leis seguidas são dois tópicos — o ano fecha a frase, o "8.112" não (' + tops('fcc', 1).join(' | ') + ')');
  ok(nomes('vunesp') === 'Língua Portuguesa | Matemática | Direito Penal | Direito Processual Penal',
    R + 'Vunesp: "CONHECIMENTOS GERAIS/ESPECÍFICOS" não vira disciplina vazia (' + nomes('vunesp') + ')');

  // OAB / lista simples, com nº de questões
  ok(nomes('oab') === 'Direitos Humanos | Ética Profissional' && (r.oab[1] || {}).q === 8,
    R + 'lista numerada simples: disciplinas e o "(8 questões)" lido do cabeçalho');

  // blocos numerados
  ok(nomes('romano') === 'Direito Penal | Direito Processual Penal' && tops('romano', 0).join(' | ') === 'Princípios | Teoria do crime',
    R + '"I - DIREITO PENAL" abre disciplina e "1. A. 2. B." vira dois tópicos (' + nomes('romano') + ')');
  ok(nomes('letras') === 'Direito Civil | Direito Empresarial' && tops('letras', 0).length === 3,
    R + '"A) DIREITO CIVIL": a letra do bloco não entra no nome (' + nomes('letras') + ')');

  // edital REAL da OAB (2ª fase), com os tropeços do PDF e do próprio edital
  const numeros = i => tops('oab2fase', i).map(n => (n.match(/^\d+/) || ['?'])[0]).join(',');
  ok(nomes('oab2fase') === 'Direito Administrativo | Direito Empresarial | Direito Processual Penal',
    R + 'OAB real: marcador invisível do PDF não estraga o nome, e rabo de frase ("legislação.", "Processo coletivo passivo.") não vira disciplina (' + nomes('oab2fase') + ')');
  ok(numeros(0) === '1,2,3,4,5,6' && tops('oab2fase', 0)[4] === '5 Licitações e contratos',
    R + 'OAB real: número que ficou no fim da linha desce para o título dele (' + numeros(0) + ')');
  ok(numeros(1) === '1,2,3,4,5' && subs('oab2fase', 1, 3).join(' | ') === '4.1 Registro Empresarial e sua legislação | 4.2 Nome empresarial',
    R + 'OAB real: frase cortada pela quebra de página é recosturada (' + subs('oab2fase', 1, 3).join(' | ') + ')');
  ok(numeros(2) === '1,2,3,4,5,6,7,8,9' && /^7 legislação extravagante$/.test(tops('oab2fase', 2)[6] || '') && subs('oab2fase', 2, 7)[0] === '8.1 Processo coletivo passivo',
    R + 'OAB real: ponto esquecido antes do número e minúscula depois dele não escondem o item (' + numeros(2) + ')');

  // anexo inteiro, como sai do PDF
  ok(nomes('anexo') === 'Direito Civil | Direito Processual Penal',
    R + 'anexo colado: cabeçalho de página repetido, "CARGO:", "ANEXO", "BLOCO", preâmbulo e "OBSERVAÇÕES" não viram disciplina (' + nomes('anexo') + ')');
  ok(tops('anexo', 0).length === 3 && subs('anexo', 0, 1).join(' | ') === 'Princípios gerais do Direito | Unidade sistemática e pluralidade de fontes',
    R + 'anexo colado: linha sem número depois de um item numerado é continuação DELE (' + subs('anexo', 0, 1).join(' | ') + ')');
  ok(tops('anexo', 1).join(' | ') === 'Do Juiz, do Ministério Público, do Acusado e Defensor (Título VIII do Livro I - CPP) | Da Prisão',
    R + 'anexo colado: linha que termina em "do" ou "-" emenda na seguinte, mesmo em caixa-alta (' + tops('anexo', 1).join(' | ') + ')');
  ok(nomes('discNumerada') === 'Direito Penal | Direito Processual Penal' && tops('discNumerada', 0).length === 2 && subs('discNumerada', 0, 1).length === 1 && tops('discNumerada', 1).length === 2,
    R + '"1. DIREITO PENAL" + "1.1 …": a disciplina é o nível 1, então 1.1 e 1.2 são TÓPICOS e 1.2.1 é subtópico (' + tops('discNumerada', 0).join(' | ') + ')');

  // padrões de 28 cargos reais de 2026
  ok(nomes('travessao') === 'Língua Portuguesa | Gestão de Pessoas e Comportamento Organizacional | Direito Constitucional' && tops('travessao', 1).length === 2,
    R + '"Matéria - 1 Tópico": travessão no lugar dos dois-pontos abre disciplina (' + nomes('travessao') + ')');
  ok(nomes('tituloSolto') === 'Criminologia | História do Amapá | Direito Processual Penal e Legislação Processual Penal Especial' && tops('tituloSolto', 0).length === 2,
    R + 'título solto antes de "1. …" abre disciplina mesmo sem nome conhecido, e nome conhecido pode ser comprido (' + nomes('tituloSolto') + ')');
  ok(nomes('partes') === 'Economia | Matemática Financeira / Estatística | Direito Administrativo' && /^Teoria Macroeconômica: /.test(tops('partes', 0)[2] || ''),
    R + 'matéria com partes: "Título: conteúdo" logo abaixo do cabeçalho é parte DELA, não outra disciplina (' + nomes('partes') + ')');
  ok(nomes('numeradaLonga') === 'Direitos Humanos | Ciências Forenses | Realidade Étnica, Social, Histórica, Geográfica, Cultural, Política e Econômica do Estado do Paraná | Ciências Contábeis'
    && tops('numeradaLonga', 1).length === 2 && subs('numeradaLonga', 1, 0).length === 1,
    R + '"8. CIÊNCIAS FORENSES:", nome longo em duas linhas e "ÁREA DE HABILITAÇÃO: X" abrem disciplina (' + nomes('numeradaLonga') + ')');
  ok(nomes('miudezas') === 'Direito Digital | Direito Constitucional | Direito Ambiental | Direito Penal',
    R + 'parêntese que o edital esqueceu de fechar não engole o cabeçalho seguinte, e "DIREITO PENAL Princípios…" (sem dois-pontos) abre disciplina (' + nomes('miudezas') + ')');
  ok(tops('miudezas', 0).length === 3 && tops('miudezas', 1).length === 4 && /22 de novembro de 1969/.test(tops('miudezas', 1)[1] || '')
    && /a\) objetivo; b\) legitimidade ativa; c\) requisitos/.test(subs('miudezas', 1, 2).join(' ') + ' ' + (tops('miudezas', 1)[2] || '')),
    R + 'item que começa por dígito ("1. 4ª Revolução"), "seja parte. 2.", data no começo da linha e alíneas "b) …" não picotam os itens (' + tops('miudezas', 0).length + '/' + tops('miudezas', 1).length + ')');
  ok(/Tribunal de Justiça do Estado$/.test(tops('miudezas', 2)[1] || ''),
    R + 'linha quebrada que termina em "do" emenda na de baixo (' + (tops('miudezas', 2)[1] || '') + ')');

  // nome de tópico é identidade: repetido, a 2ª ocorrência sumia ao entrar no edital
  ok(tops('repetidos', 0).join(' | ') === 'Pessoas jurídicas | Pessoas jurídicas — Disposições gerais | Associações | Negócio jurídico | Negócio jurídico — Disposições gerais | Prescrição | Prescrição — Disposições gerais',
    R + 'tópico repetido sem subtópicos ganha o assunto a que pertence (' + tops('repetidos', 0).join(' | ') + ')');
  ok(tops('repetidos', 1).join(' | ') === 'Direito das famílias | Sucessões' && subs('repetidos', 1, 0).join(' | ') === 'Direitos pessoais | Casamento | Direitos patrimoniais | Alimentos',
    R + 'título repetido em itens seguidos é o mesmo tópico: os subtópicos se juntam no primeiro (' + subs('repetidos', 1, 0).join(' | ') + ')');

  // o que já funcionava continua funcionando
  ok(nomes('livro') === 'Direito Eleitoral | Direito Civil' && subs('livro', 0, 0).length === 3
    && subs('livro', 0, 0)[1] === '1.2 Inelegibilidade de Magistrado e membro do MP',
    R + 'sumário de livro: título partido em duas linhas continua sendo recosturado');
  ok(nomes('caps') === 'Direito Civil | Direito Penal' && tops('caps', 0).join(' | ') === 'Lei de Introdução | Pessoas Naturais',
    R + 'edital todo em CAIXA-ALTA: disciplinas pelo nome, e os tópicos saem legíveis (' + tops('caps', 0).join(' | ') + ')');
}

async function caminhoDaPessoa(page, base, ok, R, arquivo) {
  await semear(page, base, [{ disc: 'Direito Civil', peso: 2, questoes: 10, color: '#6366f1',
    topics: [{ name: '1 Pessoas', done: true, subs: [{ name: '1.1 Capacidade', done: true }] }] }]);
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const importar = async (texto) => page.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(900);
    const ta = [...document.querySelectorAll('textarea')].find(x => /programátic|cole aqui/i.test(x.placeholder || ''));
    if (!ta) return { semCaixa: true };
    ta.focus(); ta.select(); document.execCommand('insertText', false, t); await w(500);
    [...document.querySelectorAll('button')].find(b => /^Reconhecer sem IA$/.test((b.textContent || '').trim())).click(); await w(700);
    const previa = [...document.querySelectorAll('.ct-titulo')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).find(x => /^Reconhecemos/.test(x)) || '';
    const card = ta.closest('.ct-card');
    const add = [...card.querySelectorAll('button')].find(b => /^Adicionar ao edital$/.test((b.textContent || '').trim()));
    const visivel = !!add && add.getBoundingClientRect().height > 0;
    if (add) add.click();
    await w(1500);
    return { previa, visivel, caixa: ta.value, salvo: JSON.parse(localStorage.getItem('catedra:edital') || '[]') };
  }, texto);

  const a = await importar(FORMATOS.livro);
  ok(!a.semCaixa && /Reconhecemos 2 disciplinas, 3 tópicos e 5 subtópicos/.test(a.previa), R + 'tela: a prévia diz o que foi reconhecido (' + a.previa + ')');
  ok(a.visivel, R + 'tela: o botão "Adicionar ao edital" da prévia aparece (medido, não só no DOM)');
  const civ = (a.salvo || []).find(d => d.disc === 'Direito Civil') || {}, ele = (a.salvo || []).find(d => d.disc === 'Direito Eleitoral') || {};
  ok(a.salvo.length === 2 && (ele.topics || []).length === 2 && ele.topics[0].subs.length === 3 && ele.topics[0].subs[0].name === '1.1 Sufrágio e voto',
    R + 'adicionar grava no aparelho: disciplina nova com tópicos e subtópicos {name, done}');
  ok(civ.peso === 2 && (civ.topics || []).length === 1 && civ.topics[0].done === true && civ.topics[0].subs.length === 1 && civ.topics[0].subs[0].done === true,
    R + 'importar por cima NÃO duplica o que já existia nem apaga o que estava concluído');
  ok(a.caixa === '', R + 'depois de adicionar, a caixa de colar esvazia');

  const b = await importar(FORMATOS.livro);
  const ele2 = (b.salvo || []).find(d => d.disc === 'Direito Eleitoral') || {};
  ok(b.salvo.length === 2 && (ele2.topics || []).length === 2 && ele2.topics[0].subs.length === 3,
    R + 'importar o MESMO edital duas vezes não duplica disciplina, tópico nem subtópico');

  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const c = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(900);
    return { n: (window.__catedraApp.state.edital || []).length, tela: /Direito Eleitoral/.test(document.body.innerText) };
  });
  ok(c.n === 2 && c.tela, R + 'fechar e reabrir: o edital importado continua lá, e a tela o mostra');

  const d = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp; app.setState({ edRaw: 'isto não é um edital' }); await w(300);
    [...document.querySelectorAll('button')].find(b => /^Reconhecer sem IA$/.test((b.textContent || '').trim())).click(); await w(600);
    return { parsed: app.state.edParsed, n: app.state.edital.length };
  });
  ok(d.n === 2, R + 'texto que não é edital não mexe no edital');
}

async function modeloEmConcursoNovo(page, base, ok, R, arquivo) {
  await semear(page, base, [{ disc: 'Direito Civil', peso: 2, questoes: 10, color: '#6366f1', topics: [{ name: 'Meu tópico', done: true, subs: [] }] }]);
  await page.goto(base + '/' + arquivo); await page.waitForTimeout(1900);
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    window.__catedraGoView('edital'); await w(1000);
    window.prompt = () => 'TJ novo';
    [...document.querySelectorAll('button')].find(b => /^Novo concurso$/.test((b.textContent || '').trim())).click(); await w(900);
    const foraAntes = (app.state.edital.find(d => d.disc === 'Direito Civil') || {}).foraDoConcurso;
    await app._carregarModelos();
    const discs = app._modeloDiscs('magistratura');
    const iCivil = discs.findIndex(m => m[0] === 'Direito Civil'), iOutra = discs.findIndex(m => m[0] !== 'Direito Civil');
    app.setState({ modeloId: 'magistratura', modeloSel: [iCivil, iOutra] }); await w(200);
    app.aplicarModelo(); await w(1500);
    const civ = app.state.edital.find(d => d.disc === 'Direito Civil') || {};
    const outra = app.state.edital.find(d => d.disc === discs[iOutra][0]) || {};
    const E = JSON.parse(localStorage.getItem('catedra:editais') || '[]');
    const C = E.find(e => e.nome === 'TJ novo') || { discs: {} }, P = E.find(e => e.id === 'ed-principal') || { discs: {} };
    return { foraAntes, foraCivil: civ.foraDoConcurso, meu: (civ.topics || []).some(t => t.name === 'Meu tópico' && t.done), nTop: (civ.topics || []).length,
      foraOutra: outra.foraDoConcurso, noNovo: C.discs['Direito Civil'], outraNoNovo: C.discs[discs[iOutra][0]], noPrincipal: P.discs['Direito Civil'] };
  });
  ok(r.foraAntes === true, R + 'concurso novo nasce com as disciplinas do acervo marcadas como fora (o ponto de partida)');
  ok(r.foraCivil === false && r.noNovo && r.noNovo.fora === false,
    R + 'aplicar modelo num concurso novo põe DENTRO dele a disciplina que já existia no acervo');
  ok(r.foraOutra === false && r.outraNoNovo && r.outraNoNovo.fora === false, R + 'a disciplina que o modelo cria também entra no concurso ativo');
  ok(r.meu && r.nTop > 1, R + 'o modelo soma tópicos sem apagar o que já estava estudado');
  ok(r.noPrincipal && r.noPrincipal.fora === false && r.noPrincipal.peso === 2, R + 'o outro concurso não é tocado: Direito Civil segue nele, com o peso dele');
}

async function integridadeDosModelos(page, ok, R) {
  const r = await page.evaluate(async () => {
    const app = window.__catedraApp; await app._carregarModelos();
    const D = window.CT_MODELOS_DATA || {};
    return { cont: Object.keys(D).map(id => { let nt = 0, ns = 0, ruim = 0, repetidos = 0; const vazias = [];
      (D[id] || []).forEach(([n, c, t]) => { if (!n || !/^#[0-9a-f]{6}$/i.test(c || '')) ruim++; if (!(t || []).length) vazias.push(n);
        const vistos = {}; (t || []).forEach(([x]) => { const k = String(x).trim().toLowerCase(); if (vistos[k]) repetidos++; vistos[k] = 1; });
        (t || []).forEach(([x, s]) => { nt++; ns += (s || []).length; if (!String(x || '').trim()) ruim++; (s || []).forEach(y => { if (!String(y || '').trim()) ruim++; }); }); });
      return { id, nd: (D[id] || []).length, nt, ns, ruim, vazias, repetidos }; }) };
  });
  // o índice (cartões) é lido do arquivo que o app carrega, não copiado para cá
  const m = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8').match(/^const CT_MODELOS = (\[.*\]);$/m);
  r.idx = m ? JSON.parse(m[1]) : null;
  if (!r.idx) { ok(false, R + 'modelos: não achei o índice CT_MODELOS no app'); return; }
  const porId = {}; r.cont.forEach(c => { porId[c.id] = c; });
  const semDado = r.idx.filter(m => !porId[m.id] || !porId[m.id].nd).map(m => m.id);
  const errados = r.idx.filter(m => porId[m.id] && (porId[m.id].nd !== m.nd || porId[m.id].nt !== m.nt || porId[m.id].ns !== m.ns)).map(m => m.id);
  const orfaos = r.cont.filter(c => !r.idx.some(m => m.id === c.id)).map(c => c.id);
  const ruins = r.cont.filter(c => c.ruim).map(c => c.id + '(' + c.ruim + ')');
  ok(!semDado.length, R + 'modelos: todo modelo do índice tem conteúdo no arquivo' + (semDado.length ? ' — sem: ' + semDado.join(', ') : ' (' + r.idx.length + ')'));
  ok(!errados.length, R + 'modelos: disciplinas, tópicos e subtópicos do cartão batem com o arquivo' + (errados.length ? ' — divergem: ' + errados.join(', ') : ''));
  ok(!orfaos.length, R + 'modelos: nenhum conteúdo sem cartão' + (orfaos.length ? ' — ' + orfaos.join(', ') : ''));
  ok(!ruins.length, R + 'modelos: nenhuma disciplina sem nome ou sem cor, nem tópico em branco' + (ruins.length ? ' — ' + ruins.join(', ') : ''));
  const comRepetido = r.cont.filter(c => c.repetidos).map(c => c.id + '(' + c.repetidos + ')');
  ok(!comRepetido.length, R + 'modelos: nenhum tópico de nome repetido dentro da mesma disciplina — o repetido sumia ao aplicar' + (comRepetido.length ? ' — ' + comRepetido.join(', ') : ''));
  /* Disciplina SEM tópicos só existe onde o edital nomeia a matéria e não dá programa — hoje, a
     1ª fase da OAB — e tem de estar declarada em "semPrograma" no índice das fontes. */
  const indice = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts', 'fontes', 'editais', 'indice.json'), 'utf8'));
  const declaradas = {}; indice.modelos.forEach(x => { declaradas[x.id] = (x.semPrograma || []).slice().sort().join(' | '); });
  const vaziasErradas = r.cont.filter(c => c.vazias.slice().sort().join(' | ') !== (declaradas[c.id] || '')).map(c => c.id);
  ok(!vaziasErradas.length, R + 'modelos: disciplina sem tópicos só onde o edital não traz programa, e declarada na fonte' + (vaziasErradas.length ? ' — ' + vaziasErradas.join(', ') : ''));
  const semFonte = indice.modelos.filter(x => !/^https:\/\//.test(x.url || '') || !x.orgao || !x.banca || !x.paginas || !(x.disciplinas || []).length).map(x => x.id);
  ok(indice.modelos.length >= 36 && !semFonte.length, R + 'modelos de 2026: cada um tem órgão, banca, endereço oficial, páginas e a lista de disciplinas conferida (' + indice.modelos.length + ')' + (semFonte.length ? ' — falta em: ' + semFonte.join(', ') : ''));
  /* O gerador relê os textos oficiais pelo importador DA TELA e exige que as disciplinas batam com
     as do edital: se o importador regredir, ou alguém editar o arquivo gerado à mão, ele acusa. */
  let gerador = '';
  try { gerador = execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build-modelos-edital.mjs'), '--conferir'], { encoding: 'utf8' }); }
  catch (e) { gerador = 'FALHOU: ' + String((e && (e.stdout || '') + (e.stderr || '')) || e).split('\n').filter(Boolean).slice(-3).join(' / '); }
  ok(/em dia\s*$/.test(gerador), R + 'modelos de 2026: gerados do texto oficial e em dia com as fontes (' + gerador.trim().split('\n').pop().slice(0, 200) + ')');
  // na tela: o modelo novo aparece entre os da área e entra no edital
  const tela = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const app = window.__catedraApp;
    app.setState({ edital: [], editais: [], modeloOpen: false, modeloSel: [] }); await w(300);
    window.__catedraGoView('edital'); await w(600);
    app.toggleModelo(); await w(900);
    const chips = [...document.querySelectorAll('button[data-id]')].map(b => b.dataset.id);
    const chip = document.querySelector('button[data-id="oab2Civil"]');
    const caixa = chip ? chip.getBoundingClientRect() : { height: 0 };
    if (chip) chip.click(); await w(700);
    app.aplicarModelo(); await w(700);
    return { temOab: chips.indexOf('oab1') >= 0 && chips.indexOf('juizTJPE') >= 0, alto: caixa.height,
      ed: (app.state.edital || []).map(d => d.disc + ':' + d.topics.length).join(' | ') };
  });
  ok(tela.temOab && tela.alto > 0, R + 'tela: OAB e os concursos de 2026 aparecem entre os modelos da área jurídica (chip medido: ' + Math.round(tela.alto) + ' px)');
  ok(tela.ed === 'Direito Civil:26 | Direito Processual Civil:37', R + 'tela: escolher "OAB · 2ª fase · Civil" e aplicar põe as duas disciplinas no edital (' + tela.ed + ')');
}
