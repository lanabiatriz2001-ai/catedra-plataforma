# Reformulação LEGIS/JURIS nativos — Entrega 4: quatro destinos — Plano

**Goal:** A lateral do LEGIS (14 itens + matérias) e a do JURIS (21 itens + coleções) passam a ter os mesmos 4 destinos: **Hoje · Acervo · Treinar · Novidades**. Acervo e Treinar abrem uma **vitrine** de cartões com tudo o que antes era linha solta. No JURIS, **Meu material** vai para o pé da lateral. Nenhuma função fica sem caminho.

**Spec:** §6. Base: `redesenho-nativo-3-leitor-juris` (PR #147).

## Tarefas
1. **Base (testada):** `ios/vendor/design/Destinos.swift`, com `enum Destino { hoje, acervo, treinar, novidades }` (título e símbolo), `ItemHub`, `SecaoHub` e `DestinoHub` (vitrine em grade, com cor do ramo e contagem). Teste no harness: os 4 destinos na ordem, com títulos e símbolos.
2. **LEGIS (Mac e iPad):**
   - `SidebarItem.destino(Destino)`; a lateral mostra 4 linhas e as subseções acendem o destino-pai.
   - Hoje = Início (painel atual; a entrega 5 o reduz).
   - Acervo = Todas as normas, Favoritos, Índice das normas, Assuntos, Buscar em tudo, e as matérias em vitrine com "Nova matéria".
   - Treinar = Simulado, Prova oral, Incidência, Plano de leitura, Checklist.
   - Novidades = Novidades, Diário Oficial, Atualizações.
3. **JURIS (Mac e iPad):**
   - `Selecao.destino(Destino)`; lateral com 4 linhas e "Meu material" no pé.
   - Hoje = Início.
   - Acervo = Todos, Ramos, Informativos, STF, STJ, TSE, Tribunais, Contas, Índice, Favoritos e Coleções (com "Nova coleção").
   - Treinar = Simulado, Prova oral, Prova oral das bancas, Revisar hoje, Julgado do dia, Plano de leitura, Checklist.
   - Novidades = Novidades.
   - Meu material = Minhas anotações, Mapas mentais, DOD & Precedentes.
4. **Rastreio:** tabela com os 35 itens antigos e o novo caminho de cada um (no PR). Builds, suítes, capturas, revisor, instalação e PR.

## Ajuste à spec (Ruling)
- **"Revisar hoje, julgado do dia, plano e checklist" do JURIS ficam na vitrine Treinar, além do Início.** O Início atual não garante link para todos eles, e o destino Hoje continua sendo o painel até a entrega 5.
- **O iPad compacto e o iPhone** (`LegisCompacto`/`JurisCompacto`) mantêm a navegação própria nesta entrega. As abas embaixo ficam para a entrega 5.
