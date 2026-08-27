# Pente fino — 27/08/2026

Oito frentes de auditoria com refutação adversarial (36 agentes): modal de registro,
desquebrador, integridade do banco de discursivas, régua e testes, varredura web viva
(13 views × 3 áreas + 5 satélites), Swift nativo, infra de publicação e a Tabela de
Leitura ago/2026. **24 defeitos confirmados, 4 acusações refutadas.** Tudo o que está
como "consertado" abaixo foi aplicado e verificado em fumaça no navegador nesta mesma
data.

## O achado que pagou o pente sozinho

**A coleta do PR #32 nunca chegou à tela.** O app carrega o catálogo GERADO
(`discursivas.js`) e o PR atualizou só a fonte — e três padrões de resposta viviam
apenas no arquivo gerado, onde o próximo split os apagaria em silêncio. A suíte estava
verde porque testava contra a fonte. Consertado: fonte completada, 17 ids duplicados
removidos, split com guarda que **aborta** quando regenerar apagaria conteúdo
publicado, artefatos web + nativo regenerados (631 questões).

## Consertado nesta rodada

- **Área no comando** — simulado fora das áreas com jurisprudência carrega SÓ as leis
  da área (modo exclusivo em `acervoLeisArea`), 100% lei seca, sem prova real de
  magistratura; a prova oral dispara o loader do modo final (Saúde/Social ficavam
  presas em "Carregando o texto das leis…" para sempre); aba "Diretrizes", intro por
  capacidades, placeholders por carreira, `_atividades()` sem oferta jurídica onde não
  há acervo.
- **Editar sessão** — a lista fixa de 6 tipos jurídicos negava a categoria real
  ('Caso clínico' abria sem nada marcado); agora oferece o que o Registrar oferece,
  mais as categorias que a sessão já tem, no visual novo.
- **Desquebrador** — `ehItem` reconhece romanos minúsculos ("ii)") e incisos com
  travessão ("III –"); o corte da 1ª linha só acontece no padrão que o app mesmo
  grava; o comparativo da correção respeita as quebras (pre-wrap).
- **Restrito na tela** — mensagem, toast e selo do card dizem "a banca só deu vista
  aos candidatos" em vez de mandar colar um PDF que não existe.
- **Sync** — escrita dos satélites em iframe agora carimba e marca sujo (evento
  `storage` no topo); `_bkpAutoTry` saiu da nuvem (EXCLUDE); textão das discursivas
  entrou no "Baixar tudo" e o carregador avisa e re-tenta em falha de rede.
- **Tabela de Leitura** — CPC dia 52 fecha 636–638; Recursos Hídricos dia 102 vira
  23–57 (fecha a lei); corrigido nas 6 cópias (web + Swift + planos).
- **Régua** — detecta mojibake pela assinatura ("Ã"+byte de continuação); medido:
  pega o deformado real e zero falso positivo nas 631 questões.
- **Swift** — Simulado nativo decodifica `espelhoTexto` (414 questões deixavam de
  mentir "banca não publicou" com o padrão dentro do app) e conhece 'restrito';
  Incidência ganhou o gatilho de redesenho (mesmo padrão da Oral·bancas); falha de
  carga do JURIS aparece em linguagem de produto em vez de abrir vazio.
- **Testes** — mojibake coberto; ids únicos no banco travados; FASE4-troca não passa
  mais vazio.
- **Aprovados do olho de usuário** — card da discursiva mostra "abrindo a prova…";
  Registrar abre enxuto com "Mais detalhes" expandível; Ajustes fixo no rodapé do
  menu; **filtro do Ciclo** por disciplina, tipo e assunto (com contador honesto e
  "nada desta seleção neste dia").

## Refutados (não eram defeito)

Espelho "cru" ao lado do enunciado tratado (o painel já tratava); `hl@area` fora do
merge (tem rota própria); truncamentos da LEP/Licitações (fiéis ao método declarado da
tabela); Súmula TSE 73 (existe na fonte usada).

## Fica registrado como pendente

- **Build C do pente de 21/08** (unificação visual LEGIS/JURIS Swift, 63 achados de
  design): programa à parte, não é bug — os 4 bugs do item 6 daquele plano JÁ estavam
  corrigidos, confirmado nesta auditoria.
- **Abrir a Redação para Saúde/Social** filtrada pelas provas da área (Revalida etc.):
  decisão de produto — o texto do bloqueio agora diz a verdade e promete exatamente
  isso.
- Teste de lacuna interna absoluta para a Tabela de Leitura (a rotina só compara com a
  versão anterior); tile nativo "720 dias" a conferir na próxima rodada da tabela.
