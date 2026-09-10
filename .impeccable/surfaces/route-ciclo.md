---
version: 1
slug: "route-ciclo"
primary_target: "route:/ciclo"
related_targets: ["ciclo"]
---

# Ciclo (view `ciclo` do host: abas Executar e Configurar)

**Escopo e modo.** Tela Ciclo do `Catedra.dc.html`, com as abas Executar (o dia) e Configurar (a volta e, no manual, a agenda da semana). Modo **Operate**: a pessoa está numa tarefa; escaneabilidade e consistência vencem expressão. A marca entra na cor da matéria e na linha do ciclo, não em ornamento.

**Quem, para quê, que ação.** Estudante em sessão longa, muitas vezes offline, que abre a tela para responder "o que faço agora". Dois jeitos de usar: automático/inteligente (a volta é montada pela mesma régua da tela Prioridade) e manual com roteiro de orientador (o caso da dona do app: agenda da semana + ciclo manual com ponteiro). Ações centrais: ver o próximo bloco e o porquê dele, marcar feito (o ponteiro avança), pular, reorganizar e cadastrar a semana sem sair da tela.

**Conteúdo que prova.** Cada bloco carrega motivo escrito e vínculo ao tópico do edital; a linha do ciclo mostra a volta inteira com "onde parei"; a coluna do dia mostra a carga ("3 atividades · 2h25"); revisões vencidas, simulado de reta final e flashcards são extras do dia, fora da volta.

**Restrições que não se negociam.** O planner é um **ciclo com ponteiro, não um calendário** (decisão de produto de 09/09/2026): nunca mapear matéria a dia da semana no automático; a agenda semanal existe só no manual, para quem segue roteiro. Estado do dia (`blocks`) é derivado da volta; o que é só de tela (`agEditId`, `cicloExtrasFora`) não entra no autosave nem na nuvem. Tokens sempre; sem faixa lateral colorida (a cor entra por `--ct-item-cor`); texto ≥ 4,5:1 com a cor da matéria escurecida; alvos ≥ 44 px no toque; movimento respeita `prefers-reduced-motion`; funciona em file:// no Mac e no iPad.

**Direção e momento memorável.** Direção "vitrine": hero da tela com KPIs (hoje, volta N, revisões), a **linha do ciclo** como assinatura (feito escuro, hoje com anel, por vir lavado), lista de blocos `.ct-item` na cor da matéria. A agenda da semana (PR #49) segue a mesma gramática: cartões legíveis, edição de um por vez, a semana quebra linha em vez de rolar.

**Em aberto.** `CYCLE_PRESETS()` roda quatro gerações de volta por render dos Ajustes; ids da volta repetem entre gerações (`vN-i`); chave `byTopic` vazia vs "Geral" no registro; a agenda ainda não roda na suíte WebKit; `opcoes.relogio` sem chamador no teste do Registro.
