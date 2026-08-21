/* ==========================================================================
   Gera prioridade-dados.js — a fonte do Painel de prioridade.
   Cruza duas coisas que já existiam no projeto e nunca se falavam:
     · incidencia.json → bloco "provas": citação de dispositivo em prova REAL de
       concurso (o sinal de cobrança) e bloco "diplomas": citação em julgado do
       acervo (o sinal de relevância na jurisprudência);
     · tec-desempenho-*.json → questões, acertos e erros por disciplina no TEC.
   Rode com:  node scripts/build-prioridade.mjs
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = f => JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8'));

/* o arquivo de desempenho é datado: pega o mais recente que existir */
const arqTec = fs.readdirSync(raiz).filter(f=>/^tec-desempenho-.*\.json$/.test(f)).sort().pop();
if(!arqTec) throw new Error('nenhum tec-desempenho-*.json na raiz');

const inc = ler('incidencia.json');
const tec = ler(arqTec);

/* --------------------------------------------------------------------------
   De qual disciplina é cada diploma. É a única parte editorial do arquivo:
   um diploma novo aparece em "semMapa" no fim da execução, para ser incluído.
   -------------------------------------------------------------------------- */
const DISC = {
  l2848_1940:'Direito Penal', l11343_2006:'Direito Penal', l9613_1998:'Direito Penal',
  l12850_2013:'Direito Penal', l11340_2006:'Direito Penal', l10826_2003:'Direito Penal',
  l9503_1997:'Direito Penal', l3688_1941:'Direito Penal', l13344_2016:'Direito Penal',
  l8072_1990:'Direito Penal', l9455_1997:'Direito Penal', l12737_2012:'Direito Penal',

  l3689_1941:'Direito Processual Penal', l7210_1984:'Direito Processual Penal',
  l9807_1999:'Direito Processual Penal', l9296_1996:'Direito Processual Penal',
  l7960_1989:'Direito Processual Penal', l12403_2011:'Direito Processual Penal',

  cf:'Direito Constitucional', l9882_1999:'Direito Constitucional',
  l9868_1999:'Direito Constitucional', l12016_2009:'Direito Constitucional',
  l9507_1997:'Direito Constitucional', l4717_1965:'Direito Constitucional',

  l13105_2015:'Direito Processual Civil', l9494_1997:'Direito Processual Civil',
  l9307_1996:'Direito Processual Civil', l8009_1990:'Direito Processual Civil',
  l9099_1995:'Direito Processual Civil', l7347_1985:'Direito Processual Civil',
  l10259_2001:'Direito Processual Civil', l12153_2009:'Direito Processual Civil',

  l10406_2002:'Direito Civil', l8245_1991:'Direito Civil', l4657_1942:'Direito Civil',
  l6015_1973:'Direito Civil', l6766_1979:'Direito Civil', l10257_2001:'Direito Civil',

  l8078_1990:'Direito do Consumidor',
  l8069_1990:'Direito da Criança e do Adolescente', l12594_2012:'Direito da Criança e do Adolescente',
  l10741_2003:'Direito da Pessoa Idosa',

  l11101_2005:'Direito Empresarial', l9279_1996:'Direito Empresarial',
  l8934_1994:'Direito Empresarial', l6404_1976:'Direito Empresarial',

  l5172_1966:'Direito Tributário', l6830_1980:'Direito Tributário',
  l116_2003:'Direito Tributário', lc87_1996:'Direito Tributário',

  l8429_1992:'Direito Administrativo', l14133_2021:'Direito Administrativo',
  l8987_1995:'Direito Administrativo', l9784_1999:'Direito Administrativo',
  l8112_1990:'Direito Administrativo', l13303_2016:'Direito Administrativo',
  l8666_1993:'Direito Administrativo', l11079_2004:'Direito Administrativo',

  l64_1990:'Direito Eleitoral', l9504_1997:'Direito Eleitoral', l9096_1995:'Direito Eleitoral',
  l4737_1965:'Direito Eleitoral',

  l12651_2012:'Direito Ambiental', l9605_1998:'Direito Ambiental', l9433_1997:'Direito Ambiental',
  l140_2011:'Direito Ambiental', l11445_2007:'Direito Ambiental', l6938_1981:'Direito Ambiental',
  l9985_2000:'Direito Ambiental', l12305_2010:'Direito Ambiental',

  l9717_1998:'Direito Previdenciário', l8213_1991:'Direito Previdenciário',
  l8212_1991:'Direito Previdenciário',

  l5452_1943:'Direito do Trabalho',
};

/* o TEC escreve o nome da disciplina do jeito dele; aqui vira o nome canônico */
const NOME_TEC = {
  'Direito Administrativo (Doutrina e Leis Federais)':'Direito Administrativo',
  'Direito Constitucional (CF/1988 e Doutrina)':'Direito Constitucional',
  'Direito Empresarial (Comercial)':'Direito Empresarial',
};

const semMapa = [];
const disciplinas = {};
const bloco = d => (disciplinas[d] = disciplinas[d] || {
  disc:d, prova:0, julgado:0, questoes:0, erros:0, diplomas:[], artigos:[]
});

/* ---- incidência em PROVA (o sinal de cobrança) ---- */
for(const [id, dip] of Object.entries(inc.provas||{})){
  const d = DISC[id];
  if(!d){ semMapa.push(id+' — '+dip.nome); continue; }
  const b = bloco(d);
  let tot=0;
  for(const [art, a] of Object.entries(dip.artigos||{})){
    tot += a.total;
    const anos = {}, bancas = {};
    (a.provas||[]).forEach(p=>{ if(p.ano) anos[p.ano]=(anos[p.ano]||0)+1;
                                if(p.banca) bancas[p.banca]=(bancas[p.banca]||0)+1; });
    b.artigos.push({ dip:dip.nome, art, n:a.total,
      carreiras:a.carreiras||{}, orgaos:a.orgaos||{}, anos, bancas });
  }
  b.prova += tot;
  b.diplomas.push({ nome:dip.nome, n:tot });
}

/* ---- incidência em JULGADO (o sinal de relevância no acervo) ---- */
for(const [id, dip] of Object.entries(inc.diplomas||{})){
  const d = DISC[id]; if(!d) continue;
  bloco(d).julgado += (dip.total||0);
}

/* ---- desempenho no TEC (o sinal de erro) ---- */
for(const r of (tec.por_disciplina||[])){
  const d = NOME_TEC[r.disciplina] || r.disciplina;
  const b = bloco(d);
  b.questoes += (r.questoes||0);
  b.erros    += (r.erros||0);
}

/* ---- taxa de erro ajustada ----------------------------------------------
   2 questões com 2 erros não são "100% de erro": são ruído. A taxa é puxada
   para a média geral com peso K — quanto menos questão respondida, mais a
   disciplina se comporta como a média, e não como o acidente das duas.
   erroAjustado = (erros + K·médiaGeral) / (questões + K)
   -------------------------------------------------------------------------- */
const K = 10;
const totQ = (tec.total||{}).questoes||0, totE = (tec.total||{}).erros||0;
const media = totQ ? totE/totQ : 0.5;

const linhas = Object.values(disciplinas).map(b=>{
  const bruta = b.questoes ? b.erros/b.questoes : null;
  const aj = (b.erros + K*media) / (b.questoes + K);
  b.diplomas.sort((x,y)=>y.n-x.n);
  b.artigos.sort((x,y)=>y.n-x.n);
  return { ...b, erroBruto:bruta, erroAjustado:aj,
    cego: b.questoes===0,                 // incidência alta e nenhuma questão feita
    scoreProva: b.prova*aj,
    scoreJulgado: b.julgado*aj,
    scoreMisto: 0 };
});
/* score misto: normaliza cada fonte pelo próprio máximo antes de somar, senão
   os 10 mil julgados esmagam as 534 citações de prova */
const maxP = Math.max(1, ...linhas.map(l=>l.prova));
const maxJ = Math.max(1, ...linhas.map(l=>l.julgado));
linhas.forEach(l=>{ l.scoreMisto = ((l.prova/maxP)*0.65 + (l.julgado/maxJ)*0.35) * l.erroAjustado * maxP; });
linhas.sort((a,b)=>b.scoreProva-a.scoreProva);

const saida = {
  meta:{
    gerado: new Date().toISOString().slice(0,10),
    tecArquivo: arqTec,
    tecExtraido: tec.extraido_em||'',
    tecRecorte: tec.recorte||'',
    tecTotal: tec.total||{},
    incGerado: (inc.meta||{}).gerado||'',
    provasCitacoes: ((inc.meta||{}).provas||{}).citacoes||0,
    provasFontes: ((inc.meta||{}).provas||{}).fontes||0,
    julgadoCitacoes: (inc.meta||{}).citacoes||0,
    mediaErro: media, K, semMapa
  },
  disciplinas: linhas
};

fs.writeFileSync(path.join(raiz,'prioridade-dados.js'),
  '// Gerado por scripts/build-prioridade.mjs. Não editar à mão.\n'
 +'// Incidência em prova × taxa de erro no TEC, por disciplina.\n'
 +'window.__CT_PRIORIDADE__='+JSON.stringify(saida)+';\n', 'utf8');

console.log('prioridade-dados.js escrito ·', linhas.length, 'disciplinas · média de erro',
  (media*100).toFixed(1)+'%');
if(semMapa.length) console.log('SEM MAPA (incluir em DISC):', semMapa.join(', '));
