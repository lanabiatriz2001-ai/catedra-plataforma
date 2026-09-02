// scripts/corrigir-acentos-acervo.mjs — devolve os acentos ao METADADO do acervo de 2ª fase.
//
// DE ONDE VEM O PROBLEMA: o `tema`, o `orgao` e o `cargo` das provas nascem do HTML de
// origem (scripts/fontes/acervo-provas-discursivas-espelhos.html), que foi coletado já
// achatado — 876 KB e duas ocorrências de "ção" no arquivo inteiro. Não é falha do
// extrator de PDF: em 31 dos 37 registros com tema achatado o ENUNCIADO, esse sim vindo
// do PDF, está perfeitamente acentuado. Reextrair não consertaria nada.
//
// POR QUE UMA LISTA EXPLÍCITA, E NÃO UMA TABELA DE PALAVRAS: a primeira tentativa foi um
// mapa "licitacao→licitação" aplicado a tudo. Ele consertava as palavras da tabela e
// deixava as de fora, produzindo "Violencia domestica: competência e prevencao" — texto
// misturado, que lê pior que o achatado e disfarça um problema conhecido de coleta como
// erro de digitação. Aqui cada string foi reescrita INTEIRA e conferida uma a uma.
//
// Idempotente: rodar de novo não muda nada (só grava quando o valor atual difere).
//
// Uso:  node scripts/corrigir-acentos-acervo.mjs --check   (lista o que mudaria)
//       node scripts/corrigir-acentos-acervo.mjs           (aplica)
//       depois:  node scripts/build-discursivas-split.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIMULA = process.argv.includes('--check');

// id → campos corrigidos. Revisado item a item contra o enunciado da própria prova.
const TEMAS = {
'tj-go-2026-1': 'Constitucionalidade formal e material de lei estadual de IPVA; responsabilidade solidária do devedor fiduciante; competência concorrente e normas gerais',
'tj-go-2026-2': 'Improbidade administrativa após a Lei 14.230/2021: sujeito passivo, reexame necessário, frustração de licitude de licitação sem dano ao erário, unificação de sanções',
'tj-go-2026-3': 'Lei 14.905/2024: juros de mora e correção monetária (Selic/IPCA), consectários legais de ofício em apelação, honorários por apreciação equitativa (art. 85, § 8º, do CPC)',
'tj-go-2026-4': 'Violência doméstica: competência e prevenção, cadeia de custódia de prints de WhatsApp, materialidade da lesão corporal, consunção da violação de domicílio, descumprimento de medida protetiva com consentimento da vítima, ameaça e nemo tenetur se detegere',
'tj-go-2026-5': 'Wrongful conception: responsabilidade do fabricante por interação medicamentosa, risco do desenvolvimento, nexo causal e prova pericial, danos morais e pensionamento, habilitação de sucessora, litigância de má-fé e danos reflexos causados por advogado',
'tj-go-2026-6': 'Importunação sexual (art. 215-A do CP) em relação de hospitalidade; porte de droga para consumo pessoal após o RE 635.659; ingresso em quarto de hotel sem mandado e fishing expedition; crime único x continuidade; reincidência, maus antecedentes e agravantes; valor mínimo indenizatório',
'tj-to-2025-1': 'Norma de eficácia limitada e direito social; iniciativa legislativa e simetria; mora no poder regulamentar; prazo legal para regulamento e separação dos poderes; metódica estruturante de Friedrich Müller',
'tj-to-2025-2': 'Coação como vício do consentimento; solidariedade do terceiro que dela se aproveita (art. 154 do CC); lucros cessantes e dano moral; juros e correção após a Lei 14.905/2024 (Selic menos IPCA)',
'tj-go-2024-3': 'Atipicidade do porte sem guia de tráfego e da queda de placa; concussão exigida por policial e momento consumativo; posição de vítima do particular que tenta pagar',
'tj-go-2024-4': 'Inércia e omissão judicial e meios de impugnação no CPC fora do sistema recursal (representação, ação autônoma de honorários, rescisória, reclamação, pedido de ajuste do saneador)',
'tj-ms-2023-q03': 'Questão aberta - identificação e solução de controvérsia',
'tj-mt-2024-esp1': 'Culpabilidade - exigibilidade de conduta diversa; Inexigibilidade de conduta diversa - exculpação; Coação moral irresistível; …',
'tj-pr-2021-esp3': 'Extinção da punibilidade pela morte; Preclusão e matéria de ordem pública; Verbo-núcleo do tipo; …',
'tj-se-2024-esp1': 'Injúria; Divulgação de segredo; Violação de correspondência; …',
'tj-se-2024-esp2': 'Competência relativa - direito pessoal; Ilegitimidade passiva - teoria da asserção; Interesse de agir e conciliação prévia; …',
'trf-3-2025-esp2': 'Competência - subseções, conexão e perpetuatio jurisdictionis; Condições da ação; Legitimidade ativa e passiva e litisconsórcio; …',
'tj-rj-2021-esp1': 'Inadimplemento antecipado do contrato (imóvel na planta) e dano moral; Seguro de vida e embriaguez do segurado; Competência do Juizado Especial da Fazenda Pública com litisconsorte privado; …',
'tj-rj-2022-esp1': 'Ordem lógica de enfrentamento das preliminares; Habilitação de crédito tributário e concurso de preferências; Prazo de resposta e revelia nos embargos de terceiro; …',
'tj-rj-2022-esp2': 'Incompetência absoluta e continência com o Juízo da Infância; Roubo circunstanciado, emprego de arma de fogo e prova da majorante; Desvio subjetivo de conduta (CP, art. 29, § 2º); …',
'tj-rj-2023-esp1': 'Cumulação de dano moral e estético, lucros cessantes e dano hipotético; Alimentos gravídicos, compensatórios e avoengos; Coisa julgada progressiva e termo inicial da ação rescisória; …',
'tj-rj-2025-esp1': 'Privacidade x intimidade de pessoa pública e dano moral; Nexo causal e responsabilidade do fabricante por defeito de airbag; Prova deferida no saneamento e não produzida; venire contra factum proprium; preclusão sobre a distribuição do ônus da prova; …',
'tj-rj-2025-esp2': 'Conexão por prejudicialidade externa; Teoria da asserção; Intervenção do MP; …',
'tj-rj-2025-esp3': 'Crimes contra a dignidade sexual: materialidade e autoria; Estupro de vulnerável (art. 217-A) e critério biológico; Crime continuado em crimes sexuais; …',
'tj-go-2024-esp1': 'Competência, prevenção e conexão; Ação negatória de paternidade e interesse sucessório dos herdeiros; Alteração subjetiva da demanda; …',
'tj-go-2023-esp1': 'Poder de administração dos bens dos filhos e nulidade da garantia; Impenhorabilidade do bem de família e novação; Idioma oficial; …',
'tj-go-2025-esp1': 'Competência legislativa concorrente e competência plena do Estado em matéria de IPVA; Iniciativa parlamentar e simetria; Sujeição passiva do IPVA na alienação fiduciária - propriedade resolúvel x posse direta; …',
'trf-2-2025-esp1': 'Competência da Justiça Federal em execução fiscal movida pela União (art. 109, I, da CF); Capacidade tributária ativa quanto às contribuições de terceiros (Sistema S) após a Lei 11.457/2007; Contagem do prazo do art. 40 da LEF e Tema 566/STJ; …',
'trf-2-2025-esp2': 'Nulidade das gravações ambientais provocadas pelo MPRJ e competência aparente; Captação ambiental por um dos interlocutores sem autorização judicial (Tema 237/STF); Alegada infiltração de agentes; …',
'trf-3-2022-esp1': 'Nulidades do acordo de colaboração, da investigação pela Polícia Civil, do reconhecimento fotográfico e da busca e apreensão; Definição da responsabilidade penal de cada acusado; Enquadramento típico, bis in idem e concurso formal entre roubo e extorsão; …',
'trf-3-2022-esp2': "Legitimidade ativa de associação com menos de um ano em ação coletiva (art. 5º, V, 'a', e § 4º, da LACP); Falta de interesse processual e desnecessidade de prévia tentativa de TAC; Litispendência entre ação civil pública e ação popular; …",
'trf-3-2022-esp3': 'Direito ao esquecimento x liberdade de expressão; Aposentadoria especial do contribuinte individual (Previdenciário); Interpretação de tratado internacional em matéria tributária e incidência de PIS/COFINS; …',
'trf2-2024-ac1': 'Competência do juiz federal de 1º grau em causa entre Estado-membro e União/autarquia federal; Inadequação da ação popular usada como sucedâneo de ação civil pública; Duplo grau invertido na ação popular',
'camaradosdeputados-2025-ac1': 'Câmara dos Deputados 2025 - Nível Superior',
'anatel-2024-ac1': 'ANATEL 2024 - Especialista em Regulação',
'anatel-2024-ac2': 'ANATEL 2024 - Especialista em Regulação',
'anatel-2024-ac3': 'ANATEL 2024 - Especialista em Regulação',
'inss-2022-ac1': 'INSS 2022 - Curso de Formação',
'inss-2022-ac2': 'INSS 2022 - Curso de Formação',
'tjrj-2020-ac1': 'TJ/RJ 2020 - Analista Judiciário',
'tjrj-2020-ac2': 'TJ/RJ 2020 - Analista Judiciário',
'tjrj-2020-ac3': 'TJ/RJ 2020 - Analista Judiciário',
'tjrj-2020-ac4': 'TJ/RJ 2020 - Analista Judiciário',
};
for (const n of [1,2,3,4,5,6,7,8]) TEMAS['stj-2024-ac'+n] = 'STJ 2024 - Servidores (Analista e Técnico Judiciário)';

// Vocabulário fechado de nomes próprios de órgão, cargo, disciplina e peça. Só nome —
// nada de prosa. Chave = valor achatado exato; valor = grafia correta.
const NOMES = {
  'Direito Tributario': 'Direito Tributário', 'Direito Previdenciario': 'Direito Previdenciário',
  'Direito Empresarial e Falimentar': 'Direito Empresarial e Falimentar',
  'ANM - Agencia Nacional de Mineracao': 'ANM — Agência Nacional de Mineração',
  'TSE / Justica Eleitoral (CPNU-JE)': 'TSE / Justiça Eleitoral (CPNU-JE)',
  'TRF 6a Regiao (MG)': 'TRF 6ª Região (MG)', 'TRT 8a Regiao (PA/AP)': 'TRT 8ª Região (PA/AP)',
  'Analista Judiciario': 'Analista Judiciário', 'Analista e Tecnico Judiciario': 'Analista e Técnico Judiciário',
  'Analista de Tecnologia da Informacao': 'Analista de Tecnologia da Informação',
  'Analista em Desenvolvimento Regional': 'Analista em Desenvolvimento Regional',
  'Especialista em Regulacao': 'Especialista em Regulação',
  'Especialista em Regulacao de Servicos Publicos de Telecomunicacoes': 'Especialista em Regulação de Serviços Públicos de Telecomunicações',
  'Especialista em Gestao de Telecomunicacoes': 'Especialista em Gestão de Telecomunicações',
  'Especialista em Recursos Minerais': 'Especialista em Recursos Minerais',
  'Suporte a Gestao, Estrategia e Governanca': 'Suporte à Gestão, Estratégia e Governança',
  'Suporte em Tecnologia da Informacao': 'Suporte em Tecnologia da Informação',
  'Tecnologia da Informacao': 'Tecnologia da Informação',
  'Engenharia Eletrica': 'Engenharia Elétrica', 'Engenharia Mecanica': 'Engenharia Mecânica',
  'Auditor Fiscal da Receita Estadual': 'Auditor Fiscal da Receita Estadual',
  'Nivel Superior': 'Nível Superior', 'Execucao de Mandados': 'Execução de Mandados',
  'Concurso Publico Nacional Unificado da Justica Eleitoral': 'Concurso Público Nacional Unificado da Justiça Eleitoral',
  'Juiz Federal Substituto': 'Juiz Federal Substituto', 'Procurador do Estado': 'Procurador do Estado',
  'sentenca civel': 'sentença cível', 'sentenca penal': 'sentença penal',
  'Sentenca': 'Sentença', 'Sentenca civel': 'Sentença cível', 'Sentenca penal': 'Sentença penal',
};

// Mapa por PALAVRA, e só para os campos de NOME (órgão, cargo, disciplina, peça, fase).
// Aqui ele é legítimo — e no `tema` não seria — porque o vocabulário desses campos é
// FECHADO e foi enumerado por inteiro: as 286 palavras distintas sem acento que existem
// hoje nesses campos foram revisadas uma a uma. A maioria não leva acento mesmo
// (Administrador, Analista, Federal, Juiz, autoria…) e por isso não está aqui.
// DELIBERADAMENTE FORA: siglas (SEFAZ, ANATEL, CODEVASF…) e "esta", que tanto pode ser
// "esta" quanto "está" conforme a frase — palavra ambígua não entra em troca automática.
const PALAVRAS = {
  Administracao:'Administração', Agrario:'Agrário', Agronomo:'Agrônomo', Analise:'Análise',
  Area:'Área', Biologicas:'Biológicas', Camara:'Câmara', Cibernetica:'Cibernética',
  Ciencia:'Ciência', Ciencias:'Ciências', civel:'cível', Civel:'Cível',
  Computacao:'Computação', dissertacao:'dissertação', Economicos:'Econômicos',
  Eletrica:'Elétrica', Eletronica:'Eletrônica', Enfase:'Ênfase', Estrategia:'Estratégia',
  Execucao:'Execução', Financas:'Finanças', Formacao:'Formação', Gestao:'Gestão',
  Governanca:'Governança', Informacao:'Informação', Inovacao:'Inovação',
  Judiciaria:'Judiciária', Judiciario:'Judiciário', manha:'manhã', Mecanica:'Mecânica',
  Microinformatica:'Microinformática', Ministerio:'Ministério', Nivel:'Nível',
  Orcamentaria:'Orçamentária', Orcamentarios:'Orçamentários', Orcamento:'Orçamento',
  pratica:'prática', Pratica:'Prática', Programacao:'Programação',
  Publica:'Pública', Publicos:'Públicos', Publico:'Público', Questao:'Questão',
  questoes:'questões', Questoes:'Questões', Regiao:'Região', Regulacao:'Regulação',
  Seguranca:'Segurança', sentenca:'sentença', Sentenca:'Sentença', Servicos:'Serviços',
  Solucoes:'Soluções', Tecnico:'Técnico', Tecnicos:'Técnicos',
  Telecomunicacoes:'Telecomunicações', Tributario:'Tributário',
};
// "6a Região" / "2a turma": ordinal feminino escrito com "a" solto.
const RE_ORDINAL = /\b(\d+)a(?=\s)/g;
const acentuarNome = (v) => String(v)
  .replace(/[A-Za-zÀ-ÿ]+/g, (w) => PALAVRAS[w] || w)
  .replace(RE_ORDINAL, '$1ª')
  // crase que o mapa por palavra não alcança (ela depende do par, não da palavra)
  .replace(/\bSuporte a Gest/g, 'Suporte à Gest');

const CAMPOS_NOME = ['orgao', 'cargo', 'disciplina', 'peca', 'fase'];
const mudancas = [];

function passar(registros, marca) {
  for (const r of registros) {
    if (TEMAS[r.id] && r.tema !== TEMAS[r.id]) { mudancas.push([marca, r.id, 'tema', r.tema, TEMAS[r.id]]); r.tema = TEMAS[r.id]; }
    for (const c of CAMPOS_NOME) {
      const v = r[c];
      if (typeof v !== 'string' || !v) continue;
      const alvo = NOMES[v] || acentuarNome(v);      // nome inteiro conhecido primeiro; senão, palavra a palavra
      if (alvo !== v) { mudancas.push([marca, r.id, c, v, alvo]); r[c] = alvo; }
    }
  }
}

const JSON_P = join(ROOT, 'discursivas.json');
const dados = JSON.parse(readFileSync(JSON_P, 'utf8'));
const lista = Array.isArray(dados) ? dados : (dados.provas || Object.values(dados).find(Array.isArray));
passar(lista, 'json');

const COMP_P = join(ROOT, 'discursivas-completo.js');
const w = {};
new Function('window', readFileSync(COMP_P, 'utf8'))(w);
passar(w.CT_DISCURSIVAS, 'js');

const ids = new Set(mudancas.map((m) => m[1]));
console.log(`registros tocados: ${ids.size} · campos alterados: ${mudancas.length}`);
for (const [, id, c, a, b] of mudancas.filter((m) => m[0] === 'js')) {
  console.log(`  ${id} · ${c}\n    - ${a}\n    + ${b}`);
}
if (SIMULA) { console.log('\n--check: nada foi escrito.'); process.exit(0); }

/* Reescreve PRESERVANDO a forma de cada arquivo. A primeira versão deste script
   reserializou os dois do jeito que deu na telha: o .json virou indentado (0 → 38.872
   linhas) e o .js perdeu o cabeçalho que documenta a política de fontes do acervo. Um
   diff de 85 mil linhas para corrigir 228 campos esconde a mudança real, e apagar
   documentação de origem é pior ainda. */
writeFileSync(JSON_P, JSON.stringify(dados));                      // .json: uma linha, como estava
const bruto = readFileSync(COMP_P, 'utf8');
const marca = 'window.CT_DISCURSIVAS = [';
const cabecalho = bruto.slice(0, bruto.indexOf(marca));            // preserva o comentário de topo
const corpo = w.CT_DISCURSIVAS.map((r) => ' ' + JSON.stringify(r, null, 1).split('\n').join('\n ')).join(',\n');
writeFileSync(COMP_P, cabecalho + marca + '\n' + corpo + '\n];\n');
console.log('\n✓ discursivas.json e discursivas-completo.js reescritos.');
console.log('  Agora rode: node scripts/build-discursivas-split.mjs');
