/* ==========================================================================
   plataformas-questoes.js — para onde o Cátedra manda praticar questões.

   POR QUE EXISTE: a Lana já assina TEC Concursos e QConcursos. O Cátedra não
   copia nada dessas plataformas — nem por raspagem, nem por iframe, nem por
   colagem — e nenhuma credencial delas passa por aqui. O que ele faz é UM LINK
   DE SAÍDA já filtrado no assunto em que ela está fraca, para o clique sair do
   diagnóstico e cair direto na prática.

   POR QUE EM ARQUIVO SEPARADO: as URLs de busca dessas plataformas mudam. Quando
   mudarem, conserta-se aqui — em um lugar só — e não em cinco telas.

   Publica window.CT_PLATAFORMAS = { ordem:[...], lista:{chave:{nome, cor, busca(q)}} }
   onde `q` é {disciplina, assunto, banca, ano, texto}.
   ========================================================================== */
(function () {
  const enc = (s) => encodeURIComponent(String(s || '').trim());
  // A consulta é montada com o que existir, do mais específico ao mais geral: o
  // assunto fraco manda mais que a disciplina, e o texto do enunciado só entra
  // quando é o único sinal (buscar por um enunciado inteiro não acha nada).
  const termos = (q) => [q && q.assunto, q && q.disciplina, q && q.banca, q && q.ano]
    .filter(Boolean).join(' ').trim()
    || String((q && q.texto) || '').split(/\s+/).slice(0, 12).join(' ').trim();

  const lista = {
    tec: {
      nome: 'TEC Concursos',
      cor: '#0f766e',
      // caminho alinhado com o que os apps Swift deste repositório e a especificação já
      // usam; /questoes/pesquisa devolveu 404 na medição
      busca: (q) => 'https://www.tecconcursos.com.br/questoes?texto=' + enc(termos(q)),
    },
    qc: {
      nome: 'QConcursos',
      cor: '#1d4ed8',
      busca: (q) => 'https://www.qconcursos.com/questoes-de-concursos/questoes?utf8=%E2%9C%93&q=' + enc(termos(q)),
    },
    estrategia: {
      nome: 'Estratégia Questões',
      cor: '#b91c1c',
      busca: (q) => 'https://questoes.estrategia.com/busca?q=' + enc(termos(q)),
    },
  };

  window.CT_PLATAFORMAS = {
    ordem: ['tec', 'qc', 'estrategia'],
    padrao: 'tec',
    lista,
    /** URL de prática na plataforma escolhida (cai na padrão se a chave não existir). */
    link(chave, q) {
      const p = lista[chave] || lista[this.padrao];
      try { return p.busca(q || {}); } catch (_) { return ''; }
    },
    nome(chave) { return (lista[chave] || lista[this.padrao]).nome; },
  };
})();
