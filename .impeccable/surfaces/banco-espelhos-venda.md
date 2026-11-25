---
version: 1
slug: "banco-espelhos-venda"
primary_target: "banco-espelhos-venda.html"
related_targets: ["sobre.html","privacidade.html","termos.html","espelhos.js"]
---

# Página de venda do Banco de Espelhos (`/banco-de-espelhos`)

**Escopo e modo.** Página estática na raiz, servida em `/banco-de-espelhos` pela Vercel (rewrite em `vercel.json`) e embarcada nos apps sem link a partir deles. Modo **Persuade**, com uma restrição: a venda ainda não abriu, então a ação é deixar o e-mail para o aviso de abertura (RPC `entrar_lista_espera`, área `banco-espelhos`). Fora dos buscadores (`noindex`) enquanto o preço é hipótese de teste.

**Quem, para quê, que ação.** Quem passou da 1ª fase da magistratura e vai escrever sentença e discursiva. Precisa entender que espelho oficial (o que a banca pontuou) e espelho próprio de curso (o que o curso acha que vale) são coisas diferentes, ver se o tribunal e a banca dela estão no acervo, e decidir se R$ 197 por um mês vale.

**Conteúdo que prova (real, já no repositório).** Tudo vem de `espelhos.js` e o teste (`tests/venda-espelhos.mjs`) confere: 586 quesitos de 36 provas, 11 tribunais, 2021 a 2026; 328 de discursiva e 258 de sentença; valor do quesito em 502, nos outros 84 não; 6 provas sem valor nenhum, nomeadas; 19 provas da FGV, 16 de banca própria e 1 da Vunesp. A comparação de mercado usa só faixas de preço datadas (setembro de 2026) do brief competitivo da dona.

**Restrições que não se negociam.** Sem nome de concorrente; sem "único lugar" (o brief não leu dois dos oito); sem "correção por IA"; sem promessa de aprovação, depoimento ou número de adoção. Nenhum preço além do R$ 197 e das faixas da comparação; "R$" nunca separado do valor. Quantidade e característica do acervo só como o dado mostra (CDC, art. 37, § 1º). Pergunta e texto sem marca de gênero. Sem rede externa em tempo de execução.

**Direção e momento memorável.** "Vitrine": título grande em serifa, mosaico com cor por ramo nos números do acervo, cartões com degradê do ramo, e o contraste entre os dois espelhos como o argumento central. Cor de identidade vira texto só escurecida (`--accentD`, cores com `color-mix` na tinta).

**Formulário e rodapé.** O que o envio autoriza (um único e-mail, a Política, quando o cadastro é apagado e o canal para sair) fica ANTES do botão, ligado a ele por `aria-describedby`. O rodapé identifica o fornecedor (Decreto 7.962/2013, art. 2º). Os marcadores entre colchetes dos dois lugares são preenchidos pelos builds a partir de `docs/juridico/controlador.json`; o pedido é "pedido de aviso de abertura da venda", nunca "lista de espera" (essa é a do beta).

**Em aberto (decisões da dona, em `docs/pedidos-claude-code.md`).** Aprovar a Política 1.3; preencher o controlador; aplicar a migração `2026-11-25-lista-espera-interesse-venda.sql` antes do merge; por onde o aviso sai; prazo máximo do pedido; rótulo do botão de envio; o que os R$ 197 compram se o acervo já é público e o Simulado o entrega; garantir ou ressalvar o preço de teste; como o bônus chega depois do mês; base, prazo e condição do desconto do corretor; parecer de direito autoral; como medir o teste.
