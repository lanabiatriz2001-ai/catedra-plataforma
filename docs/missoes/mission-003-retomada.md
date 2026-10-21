# Mission 003 — rascunho da sessão em andamento

Execução iniciada em **20/10/2026**, a partir da `main` confirmada em `9ae54c01d63abcf37b4fb6c95a639984311ad3f4`, branch `mission-003`.

## Escopo adotado e resultado esperado

A [conversa fornecida pela usuária](https://chatgpt.com/share/6ad81eb3-0d38-83e9-9c3c-cbb1db7c9a27) orienta a modernização do Cátedra, com fluxos completos para iniciar e retomar o estudo, oito direções visuais e preservação de dados/offline. Ela não contém um briefing numerado da Mission 003. Nesta execução, o escopo foi definido e comunicado como **verificar a jornada real de iniciar/retomar e corrigir a falha de maior impacto reproduzida**, sem presumir autorização de publicação.

Uma sessão pausada de dez minutos preservava seu tempo, atividade e etapa ao recarregar, mas perdia o novo texto digitado em **“Onde parei nesta sessão”** e **“Próxima ação desta sessão”** antes da confirmação do registro. Os campos voltavam ao checkpoint anteriormente confirmado. Isso foi reproduzido em Chromium e WebKit, com dados sintéticos e o mesmo dia no relógio. Os checkpoints já registrados não se perdiam.

A correção guarda esses dois campos no snapshot local já existente `ct_timer`. Digitar ou recarregar continua sem registrar sessão, concluir etapa ou alterar o edital. A confirmação no botão de salvar mantém seu papel de registrar o estudo e atualizar o checkpoint confirmado.

## Contrato de persistência

- O snapshot opcional `atv.cmRascunho` contém somente os dois textos e a proveniência: conta, namespace do ciclo/área/concurso, atividade e etapa. Não foi criada chave sincronizada ou migração de dados.
- A origem nasce ao vincular a sessão; ticks e fechamento não podem atribuir texto antigo à conta/área nova. Mudanças de contexto invalidam somente os novos campos pendentes e sua origem; os contadores seguem a política anterior.
- A restauração exige atividade vigente e proveniência correspondente. Ausência de snapshot ou campo com tipo inválido mantém o fallback legado do checkpoint; string vazia é uma limpeza intencional. Os limites continuam em 300 e 500 caracteres.
- A troca de etapa, a desvinculação para sessão avulsa e a troca de disciplina atualizam imediatamente o snapshot. O rascunho pertence à etapa aberta, sem criar um histórico paralelo de versões por etapa.
- `ct_timer` permanece local ao aparelho, fora da sincronização do `auth.js`. Login, hidratação, merge do Supabase, backups e o caminho de confirmação não foram alterados.

**Limites preservados:** o timer continua sendo descartado em outro dia e quando não há tempo nem execução. Portanto, a garantia desta correção vale para uma sessão com tempo em andamento/pausada no mesmo dia. Não é uma promessa de sincronização de rascunho entre aparelhos, persistência após limpeza do navegador, modo privado sem storage ou recuperação se o armazenamento local falhar.

Trocar conta, área ou concurso interrompe esse rascunho. Os novos campos não são reatribuídos ao destino; o timer/vínculo legado segue sua política anterior. Textos digitados nesse draft sem origem só voltam a persistir após revincular a atividade no contexto atual. A proteção não transforma o timer legado em um histórico por conta.

## Evidência comparável

O teste principal usa a UI real em contexto descartável: timer pausado de 600 s, um checkpoint antigo, digitação nos dois inputs, recarga e reabertura do registro. Não chama `_saveTimer` após o input. Há sessões e edital sintéticos preexistentes para verificar que os dados não mudaram.

| Resultado | Fonte base | Fonte corrigida |
|---|---|---|
| Chromium, texto novo após recarga | FAIL: voltou ao texto antigo | PASS: os dois campos novos reaparecem |
| WebKit, texto novo após recarga | FAIL: voltou ao texto antigo | PASS: os dois campos novos reaparecem |
| Tempo/vínculo/etapa/sessões/edital | Preservados | Preservados, sem registro automático |

O baseline de falha é válido: os processos terminam com saída 1 porque a asserção de preservação do texto falha. Não é uma amostra de desempenho quebrada nem um PASS do produto. A fonte base tem SHA-256 `7d7939b0d011a3db897cd04da3b62d8b574dae3a409887cc5deb71842b915a16`.

O levantamento complementar percorreu doze combinações (Chromium/WebKit × 390/1024/1280 px × início/retomada), com 84 observações, sem exceção JavaScript ou overflow horizontal. Registro confirmado, recarga e retomada funcionaram nos doze percursos. Dois pontos ficam para outra alteração: o botão “Começar sessão” oferece uma nova sessão durante pausa, mas a guarda mostra aviso; em WebKit 1024 px há uma sobreposição visual entre rótulo e matéria. Não foram corrigidos nem declarados resolvidos neste PR.

Esta missão mede **correção funcional**, sem alegar redução de LCP, ganho de velocidade, significância estatística ou melhora de aprendizagem. O teste novo está incluído nos dois jobs de CI, além dos testes existentes.

## Validação e publicação

Gates locais concluídos antes do commit: **npm test: 5.402 verificações, saída 0**; **npm run test:webkit: 2.909 verificações, saída 0**; regressão nova com 20 cenários por motor (9 grupos); três regressões existentes em ambos os motores; 14 unidades de métricas/compactação; build e verificador de segredos. A fonte e o teste novo ficaram estáveis na rodada final.

O artefato web passou em 18 casos Chromium (16 HTTP + 2 arquivo local com HTTP bloqueado) e 16 WebKit HTTP, sem erros JavaScript nesses ensaios. A suíte histórica WebKit passou suas asserções e inclui 70 verificações do bundle; preserva mensagens de access-control e ResizeObserver já presentes na Mission 002. Isso não comprova zero pageerrors nem a leitura estrita de arquivo local no proxy WebKit, que não foi repetida como gate independente nesta missão.

Mac e iPad compilaram em série com saída 0, arm64, 20 fontes por bundle e assinatura ad-hoc verificada. Os payloads correspondem ao SHA-256 da candidata. O carimbo `9ae54c0` identifica o HEAD anterior ao commit; os hashes atestam o código compilado. Não distribuir esses bundles sintéticos: corpus externo opcional foi omitido, widget Mac removido pelo ramo ad-hoc e nenhuma assinatura Apple/provisionamento/notarização foi validada. Os hashes do executável e Info.plist do aplicativo Mac instalado permaneceram idênticos.

O recibo [evidencias/mission-003-2026-10-20.json](evidencias/mission-003-2026-10-20.json) identifica o baseline, a candidata e a regressão focada. Os resultados das suítes completas, compilações e CI ficam na descrição atualizada do PR e no relatório da execução. As suítes usam fixtures sintéticas; não comprovam autenticação real na conta pessoal nem sincronização entre aparelhos físicos.

O registro de sessão grava imediatamente seu conteúdo no armazenamento local. A projeção do checkpoint no ciclo continua seguindo o autosave existente: o teste de confirmação aguarda essa gravação antes de recarregar, sem chamar manualmente um método de persistência. Uma primeira execução que recarregou antes desse debounce falhou e foi conservada como resultado intermediário; não foi contabilizada como PASS integral.

Compilações nativas, se concluídas, são somente builds em staging descartável: sem instalação, abertura ou substituição dos aplicativos atuais. Alterar um bundle ID sozinho não isola os diretórios compartilhados dos hosts. Instalação/execução física permanece um gate separado, sem PASS presumido.

O preview automático de `mission-003` está desabilitado em `vercel.json`. **Merge e deploy de produção exigem autorização específica para Mission 003.** A autorização anterior da Mission 002 não é reutilizada. Rollback do código é um revert por PR; um host antigo ignora o novo campo opcional e conserva o comportamento legado do timer. Não há migração nem desfazimento de registros de estudo.

## Reproduzir

```bash
npm ci --no-audit --no-fund
npm run build
CT_BROWSER=chromium node tests/retomada-sessao-pendente.mjs
CT_BROWSER=webkit node tests/retomada-sessao-pendente.mjs
node --test tests/metricas-abertura.test.mjs tests/compactar-logica.test.mjs
node tests/ciclo-plataforma.mjs
node tests/ciclo-retomada.mjs
node tests/ciclo-sessao-intencional.mjs
node tests/logica-publicada.mjs
CT_BROWSER=webkit CT_PUBLICADA_ORIGEM=http node tests/logica-publicada.mjs
npm test
npm run test:webkit
npm run verificar:segredos
```

Para reproduzir a falha anterior, execute o teste novo numa cópia isolada da base, mantendo a mesma infraestrutura de teste. Não substitua os aplicativos instalados nem use os dados pessoais como fixture.
