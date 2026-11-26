// scripts/lib/semana-marcadores.mjs — os marcadores do card "O que mudou esta semana" (superação,
// divergência, tese vinculante). Saíram de scripts/build-semana-juris.mjs em 25/11/2026 para poderem
// ser testados sem rodar o build (tests/run.mjs). As regras e os números de calibragem estão no
// comentário do build.

// A coluna do tema no índice do JURIS (juris-index.js: [id, tribunal, fonte, número, título, ramo, tema, …]).
const I = { te: 6 };

export const MARCADORES = [
  {
    chave: 'superacao',
    rotulo: 'Superação de entendimento',
    campos: (t, r) => (t.en || '') + ' . ' + (r[I.te] || ''),   // o " . " é obrigatório: o ponto barra o gap entre campos
    re: /(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:s[úu]mula|s[úu]mulas|verbete|verbetes|enunciado|enunciados|tese|teses|tema|temas|precedente|precedentes|orienta[çc][ãa]o|entendimento|entendimentos|jurisprud[êe]ncia|posicionamento)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:(?!n[ãa]o\s|poder[áã]|em breve|eventual|quando\s|deve-se\s|dever[áã])[^.;:!?]){0,60}(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:cancelad[oa]s?|cancelamento|cancelamentos|cancelou|revogad[oa]s?|revoga[çc][ãa]o|revogou|superad[oa]s?|superou)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:cancelad[oa]s?|cancelamento|cancelamentos|cancelou|revogad[oa]s?|revoga[çc][ãa]o|revogou|superad[oa]s?|superou)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:(?!n[ãa]o\s|poder[áã]|em breve|eventual|quando\s|deve-se\s|dever[áã])[^.;:!?]){0,35}(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:s[úu]mula|s[úu]mulas|verbete|verbetes|enunciado|enunciados|tese|teses|tema|temas|precedente|precedentes|orienta[çc][ãa]o|entendimento|entendimentos|jurisprud[êe]ncia|posicionamento)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])mudan[çc]a de entendimento\s*[!.]|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])alter(?:ou|ando)\s+(?:o\s+|a\s+)?(?:seu|sua)\s+(?:entendimento|orienta[çc][ãa]o|posicionamento|jurisprud[êe]ncia)|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])entendimento\s+(?:anterior|atual)\s+d[eo]\s+(?:STJ|STF|TSE|Superior|Supremo)\s*[:–—-]|(?:(?:^|[.;:!?]\s*)|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?!(?:posterior|anterior|superveniente|eventual|futur[oa]|poss[íi]vel|hip[óo]tese)[^0-9A-Za-zÀ-ÖØ-öø-ÿ])[0-9A-Za-zÀ-ÖØ-öø-ÿ]{1,25}[^0-9A-Za-zÀ-ÖØ-öø-ÿ]{1,3})overruling(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])|(?:^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])(?:revis[ãa]o|modifica[çc][ãa]o|adequa[çc][ãa]o|adapta[çc][ãa]o)\s+d?[aàeo]s?\s*(?:tese|teses|tema|temas)(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])/i,
  },
  {
    chave: 'divergencia',
    rotulo: 'Divergência entre cortes',
    campos: (t, r) => (t.en || ''),                             // só a tese: título, tema e `ob` só trouxeram ruído
    re: /^(?=[\s\S]*(?:(?:^|[\n•·*])\s*|[.?!]\s+)STJ\s*:)(?=[\s\S]*(?:(?:^|[\n•·*])\s*|[.?!]\s+)STF\s*:)|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b1[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b2[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b3[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b4[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|^(?=[\s\S]*(?:diverg|dividid|entendimentos?\s+(?:contr[áa]rios?|opostos?|diversos?)|posi(?:ção|ções)\s+(?:contr[áa]ri|opost|divergent|antagônic|conflitant)|(?:^|[\n•·*-]|:)\s*(?:SIM|NÃO)\s*[.,;:•]))(?=[\s\S]*\b5[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))(?=[\s\S]*\b6[ªa]\s*Turma(?!\s*(?:Recursal|C[íi]vel|Criminal|Regional|do\s+TRF|do\s+TJ|do\s+TRT)))|Tribunais Superiores diverg|(?:jurisprudência|STF|STJ|Supremo|Superior Tribunal|Corte|\d[ªa]\s*(?:Turma|Seção))[^.;!?]{0,60}está\s+dividid|divergência[\s.:;,–—-]{0,8}\d[ªa]\s*(?:Turma|Seção)|divergência\s+(?:n[oa]|d[oa])\s*(?:STF|STJ|Supremo|Superior Tribunal)|divergência\s+entre\s+(?:as?\s+)?(?:\d[ªa]\s*)?(?:Turmas?|Seções|Seção)/i,
  },
  {
    chave: 'vinculante',
    rotulo: 'Tese vinculante',
    campos: (t, r) => [t.en || '', t.fp || '', t.ob || ''].join('\n') + '\n@OG@' + (t.og || ''),
    // Desde a 910 o STJ escreve "( Tema Repetitivo 1469)" / "( Tema repetitivo 1412)"; até a 906, "( Tema 1379)".
    re: /\d{4}\s*\.?\s*\(\s*Temas?\s+(?:repetitivos?\s+)?n?\.?\s*\d|(?:^|\n)[ \t]*(?:Temas?|IAC)\s+n?\.?\s*\d[^\n]{0,90}(?=\n|$)|^(?![\s\S]*@OG@[\s\S]*Turmas?(?![0-9A-Za-zÀ-ÖØ-öø-ÿ]))[\s\S]*?(?:^|[\n.;:)"”'’\]]\s*)Teses?\s+fixadas?(?:\s+pelo\s+STF|\s+para\s+fins\s+de\s+repercuss[ãa]o\s+geral)?\s*:/i,
  },
];

export function marcar(t, r) {
  for (const m of MARCADORES) { try { if (m.re.test(m.campos(t, r))) return m.chave; } catch (_) {} }
  return null;   // sem marcador é resultado legítimo, não falha
}
