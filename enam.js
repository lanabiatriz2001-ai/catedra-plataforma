/* enam.js — o que o app sabe sobre o ENAM (Exame Nacional da Magistratura, FGV/ENFAM).
   Constante ÚNICA das oito áreas do quadro de distribuição (Edital de Abertura n. 02/2026,
   6º ENAM, item 8.6) — 80 questões A–E, cinco horas, 56 acertos habilitam (70 %), 40 para
   quem se autodeclara (50 %). Consumida pelo build do banco (scripts/build-questoes-enam.mjs),
   pelo simulado no formato (E3) e pela correção (E4). Sem rede, sem dependência; sintaxe
   conservadora porque o WKWebView do iPad/Mac usa JavaScriptCore. */
(function (raiz) {
  'use strict';
  var AREAS = [
    { id: 'constitucional', nome: 'Direito Constitucional', cota: 16,
      disciplinasApp: ['Direito Constitucional', 'Direito Constitucional do Trabalho', 'Direito Tributário', 'Normas Constitucionais de Processo Penal'],
      cabecalhos: ['DIREITO CONSTITUCIONAL'] },
    { id: 'administrativo', nome: 'Direito Administrativo', cota: 10,
      disciplinasApp: ['Direito Administrativo'], cabecalhos: ['DIREITO ADMINISTRATIVO'] },
    { id: 'humanistica', nome: 'Noções Gerais de Direito e Formação Humanística', cota: 6,
      disciplinasApp: ['Noções Gerais de Direito e Formação Humanística'],
      cabecalhos: ['NOÇÕES GERAIS DE DIREITO E FORMAÇÃO HUMANÍSTICA'] },
    { id: 'dh', nome: 'Direitos Humanos', cota: 6,
      disciplinasApp: ['Direitos Humanos'], cabecalhos: ['DIREITOS HUMANOS'] },
    { id: 'processocivil', nome: 'Direito Processual Civil', cota: 12,
      disciplinasApp: ['Direito Processual Civil'], cabecalhos: ['DIREITO PROCESSUAL CIVIL', 'DIREITOS PROCESSUAL CIVIL'] },
    { id: 'civil', nome: 'Direito Civil', cota: 12,
      disciplinasApp: ['Direito Civil'], cabecalhos: ['DIREITO CIVIL'] },
    { id: 'empresarial', nome: 'Direito Empresarial', cota: 6,
      disciplinasApp: ['Direito Empresarial'], cabecalhos: ['DIREITO EMPRESARIAL'] },
    { id: 'penal', nome: 'Direito Penal', cota: 12,
      disciplinasApp: ['Direito Penal'], cabecalhos: ['DIREITO PENAL'] }
  ];
  var TOTAL = 0;
  for (var i = 0; i < AREAS.length; i++) TOTAL += AREAS[i].cota;
  raiz.CT_ENAM = {
    AREAS: AREAS,
    QUESTOES: TOTAL,                 // 80
    ALTERNATIVAS: ['A', 'B', 'C', 'D', 'E'],
    DURACAO_MIN: 300,                // 5 horas (item 8.1)
    META_PADRAO: 56, META_COTA: 40,  // 70 % e 50 % (itens 3.7 e 9.2)
    EDITAL: 'Edital de Abertura n. 02/2026 — 6º ENAM (FGV/ENFAM)',
    areaDe: function (id) { for (var k = 0; k < AREAS.length; k++) if (AREAS[k].id === id) return AREAS[k]; return null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
