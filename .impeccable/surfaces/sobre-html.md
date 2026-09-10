---
version: 1
slug: "sobre-html"
primary_target: "sobre.html"
related_targets: ["termos.html","privacidade.html"]
---

# Página pública `/sobre` (sobre.html) e lista de espera

**Escopo e modo.** Página estática na raiz, servida em `/sobre` pela Vercel e embarcada nos apps; o único ponto de entrada de quem ainda não tem conta. Modo **Persuade**: a visita decide se quer entrar. Relacionadas: `termos.html` e `privacidade.html` (modo Read), geradas por `scripts/build-juridico.mjs`.

**Quem, para quê, que ação.** Pessoa em preparação para concurso, núcleo em magistratura (segunda fase: sentença, discursiva, oral), chegando por link. Precisa entender em segundos o que a Cátedra é e por que difere de uma plataforma de questões, e então deixar o e-mail na lista de espera (tabela `lista_espera`, só INSERT para anônimo) ou ir ao app.

**Conteúdo que prova (real, já no repositório).** Espelhos de correção oficiais extraídos quesito a quesito com a pontuação da banca (566 quesitos de 35 espelhos); lei seca e ~14,6 mil verbetes de jurisprudência embarcados, funcionando offline; acervo de contas públicas (TCU + 33 tribunais); banco de discursivas conferido contra o PDF oficial. É isso que a página mostra: o acervo é o produto.

**Restrições que não se negociam.** Nada de depoimentos, clientes, números de adoção, preço, benchmark de aprovação ou imprensa: não existem e não podem ser inventados (PRODUCT.md, "Ausências"). Sem rede externa em tempo de execução (fontes locais, sem CDN). Português do Brasil. Links para Termos e Política sempre visíveis. Direção "vitrine": cor por ramo do direito, tipografia grande, composição ousada; design tímido foi recusado.

**Direção e momento memorável.** O primeiro viewport apresenta o acervo como objeto, não um hero genérico: o critério da banca ao lado do treino, na cor do ramo. A lista de espera é o convite, não um formulário de marketing.

**Em aberto.** Os documentos jurídicos ainda saem como rascunho até `docs/juridico/controlador.json` ser preenchido; não há domínio próprio (só `catedra-plataforma-fawn.vercel.app`); o cadastro está aberto a qualquer pessoa enquanto `beta_allow` estiver vazia — a página fala em lista de espera, o app aceita cadastro direto; apps nativos não têm link público de download.
