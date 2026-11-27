# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Pessoas em preparação para concurso público, com o núcleo em **magistratura** (segunda fase: sentença, discursiva, oral) e extensão declarada para as áreas **saúde**, **social** e **policial**. O uso acontece em sessões longas de estudo, num de três lugares: navegador (Vercel), app de Mac e app de iPad — frequentemente sem internet confiável.

Há dois papéis reais no sistema: a pessoa que estuda e uma conta administrativa (console de administração, aviso global, kill switch da IA, auditoria). A intenção declarada é que qualquer estudante em preparação possa usar — portanto primeiro uso, estados vazios e a primeira impressão são requisitos de produto, não polimento opcional.

## Product Purpose

Reunir num só lugar o ciclo inteiro de preparação: o que estudar (edital, prioridade, ciclo), com o que estudar (lei seca, jurisprudência, informativos, acervo de contas públicas), como treinar (discursivas, sentenças, simulados, questões, oral) e como saber se está funcionando (histórico, análise, revisões, conquistas).

Sucesso é a pessoa conseguir sentar e estudar sem antes ter que decidir onde estudar — o app responde "o que faço agora" e entrega o material junto.

## Positioning

O diferencial não é volume de questões: é o **acervo primário verificado + o critério da banca no mesmo lugar do treino**. Concretamente:

- espelhos de correção **oficiais** extraídos quesito a quesito, com a pontuação que a banca de fato atribuiu — treino corrigido pelo critério publicado, não por opinião;
- lei seca e jurisprudência embarcadas no binário, funcionando offline;
- acervo de contas públicas (TCU + 33 tribunais de contas) como segundo acervo dentro do CátedraJURIS.

Uma plataforma vizinha de questões não consegue copiar isso sem coletar e verificar os mesmos documentos primários.

## Operating Context

- **Três alvos de execução**: web (Vercel), app nativo de macOS e app nativo de iPad. O host é um único documento HTML (`Catedra.dc.html`, ~1,5 MB) com satélites em iframe (`legis-web`, `juris-web`, `ritos-web`, `pecas-web`, `area-web`, `prioridade-web`, `segunda-fase-web`).
- **LEGIS/JURIS nativo é SwiftUI de verdade** (~48 arquivos em `*/vendor/legis/`), não uma casca em volta da web: leitor de lei, marcação com cor livre, flashcards, repetição espaçada, índice remissivo, comparação de redações.
- **Offline é requisito**, não otimização: fontes locais em `./fonts`, service worker, acervos embarcados. O app precisa abrir igual sem internet.
- **Sem console em iPad/Mac**: existe uma faixa de erro em tela e `catedra:_lastErr` em localStorage porque uma tela branca seria indepurável.
- **Sincronização via Supabase** com histórico de perda de dados: `supabase-js` não rejeita promise em erro, o que já produziu "conta vazia" e apagou edital. Qualquer trabalho que toque persistência precisa preservar as travas existentes.
- Toda mudança termina instalada nos dois aparelhos (Mac e iPad), não apenas commitada.

## Capabilities and Constraints

**24 telas** no host: início, edital, ciclo, prioridade, revisões, calendário, roteiros, simulados, histórico, análise, redação, segunda fase, casos, oral, bancas, reta final, legis, juris, comunidade, conquistas, bem-estar, área/módulos, ajustes, admin.

**Restrições técnicas duráveis:**
- documento único e grande — nada de bundler; scripts são carregados por `<script src>` e o build costura fatias;
- CSS custom properties **não cruzam iframe**: satélites recebem os tokens por cópia do host;
- WKWebView usa JavaScriptCore, não V8 — sintaxe moderna demais quebra silenciosamente no app nativo;
- assinatura e notarização da Apple com Team ID real, runtime endurecido, timestamp e **zero entitlements**;
- o binário do iPad se chama `Catedra` sem acento.

**Terminologia do domínio** (não traduzir nem "simplificar"): espelho de correção, quesito, discursiva, sentença, peça, rito, informativo, verbete, súmula, tema repetitivo, repercussão geral, lei seca, edital, banca, ciclo.

## Brand Commitments

- Nome: **Cátedra**; submarcas **CátedraLEGIS** e **CátedraJURIS**.
- Idioma: português do Brasil, em toda a interface e em todo o conteúdo.
- Direção visual aprovada e vinculante: **"vitrine"** — cor por matéria e por ramo do direito, tipografia grande, composição ousada. Design tímido foi explicitamente recusado.
- A escolha de tema da pessoa (claro/escuro) é dela e não pode ser desfeita por sincronização.

## Evidence on Hand

Conteúdo real, verificado, já no repositório — nada aqui precisa ser inventado:

- `espelhos.js` + `banco-espelhos.html` — 586 quesitos de 36 provas com espelho oficial de magistratura (11 tribunais, 2021–2026), com a exigência da banca e os dispositivos citados; em 502 o valor do quesito está no espelho, nos outros 84 ele não vem separado;
- `discursivas.json` / `discursivas-completo.js` (~8 MB) — banco de discursivas coletado e conferido contra o PDF oficial, sem lacunas;
- `leis-seca.js` e `leis-seca-areas.js` — lei seca embarcada, 35 leis etiquetadas por área;
- `juris-text.js` / `juris-index.js` — ~14,6 mil verbetes de jurisprudência;
- `corpus-contas.json` / `contas-text.js` — acervo de contas públicas (TCU + 33 tribunais);
- `questoes-prova.js` — 83 questões de prova real (ampliação em sessões espaçadas por causa do anti-bot da fonte);
- `oral-conteudo.js`, `pecas.js`, `ritos.js`, `fluxos.js`, `modelos-edital.js`, `incidencia.json`.

**Ausências que trabalho futuro não pode fabricar:** não há depoimentos, clientes, números de adoção, benchmark de aprovação ou imprensa. Nenhum desses pode aparecer numa tela.

**Preço:** são dois, decididos pela dona em 25/11/2026. O do Banco de Espelhos da Magistratura, hipótese de teste: R$ 197 por um mês de acesso, pagamento único, sem renovação automática, com bônus de atualização de 12 meses e fila do corretor (entrada antecipada e pelo menos 20% de desconto); ele aparece só em `banco-espelhos-venda.html`. O do beta: R$ 197 por ano, como valor previsto que pode mudar, só na caixa `.honesto` de `sobre.html` ("Quando abrir, R$ 197 por ano (valor previsto, pode mudar)."), feito pelo Codex num PR à parte (item 2 do pedido de 25/11/2026). Não há checkout: a página registra só o pedido de aviso de abertura da venda (RPC `entrar_lista_espera`, área `banco-espelhos`), que fica na tabela da lista de espera do beta mas não faz parte dela: serve para um único e-mail no dia em que a venda abrir e é apagado depois (Política de privacidade 1.3, §3 e §9.5); esses endereços não entram em convite do beta nem em outro e-mail. Nenhum outro preço da Cátedra pode aparecer em tela; a página do Banco de Espelhos só mostra, como comparação, faixas de preço de mercado datadas (setembro de 2026), sem nome de concorrente, e não usa "correção por IA" como argumento. O que falta decidir antes de divulgar o link está em `docs/pedidos-claude-code.md`, "Decisões minhas".

## Product Principles

1. **O acervo é o produto.** Fundamento jurídico só entra na tela se veio de fonte primária verificada; conteúdo plausível-porém-não-conferido é pior que ausência.
2. **Offline é a condição normal, não o modo degradado.** Se uma tela só funciona conectada, ela está quebrada.
3. **O critério da banca vence a opinião.** Correção, pontuação e prioridade se ancoram no que a banca publicou.
4. **Nenhuma sincronização apaga trabalho da pessoa.** Em dúvida entre sobrescrever e preservar, preserva.
5. **Uma mudança só existe quando está instalada nos três alvos** — web, Mac e iPad.

## Accessibility & Inclusion

Sem necessidade pessoal declarada. Padrão alvo: **WCAG 2.1 AA** como higiene — contraste de texto ≥ 4,5:1, alvos de toque ≥ 44px no iPad, `prefers-reduced-motion` respeitado, foco visível. Tratar como piso de qualidade, não como restrição de produto que justifique recuar na direção "vitrine".

## Preparação para OAB

O modo OAB possui caderno separado de Magistratura: edital, ciclo, sessões, revisões FSRS, cartões e rascunhos. Contempla a primeira fase e as sete áreas da prova prático-profissional. O ciclo segue o edital ativo; cada atividade guarda o ponto de retomada e só avança por conclusão explícita. Os treinos escritos usam enunciado e espelho trazidos pela pessoa, com comparação própria e histórico completo. Provas/espelhos de Magistratura e arguição oral não pertencem a este modo. O banco oficial OAB não está integrado: o acesso às provas oficiais é externo e os resultados entram pelo Raio X. Regras exibidas conferidas no edital oficial do 48º Exame, itens 3 e 4.
