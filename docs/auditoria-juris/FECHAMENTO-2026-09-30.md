# Fechamento da auditoria LEGIS/JURIS — 30/09/2026

## Conclusão operacional

A auditoria deixa de ser uma fila aberta de correções pontuais e passa a ter guarda contínua por fonte oficial.

- **Saldo corrigível do CátedraJURIS:** fechado nos lotes anteriores, com os defeitos confirmados e com fonte suficiente já tratados no acervo web e nativo.
- **Formulação correta herdada do fechamento de 23/09:** saldo confirmado encerrado; auditoria integral ainda limitada pelas fontes pendentes. Este arquivo não substitui o relatório do Claude nem reabre os achados já fechados.
- **O que não vira correção automática:** casos sem fonte oficial acessível, bases que só respondem por formulário/SCON, transcrições de banca e trechos sem edição ou sem prova humana suficiente continuam explicitamente fora da afirmação "auditado".
- **Nova regra permanente:** Planalto, STF e STJ agora são verificados por `scripts/sentinela.mjs`; falha de consulta nunca é apresentada como "sem novidade".

## Cobertura automática

| Frente | Fonte oficial | O que o sentinela faz | Limite assumido |
|---|---|---|---|
| LEGIS | Planalto — texto compilado | compara artigo a artigo as normas já cadastradas em `leis-seca.js`, com dupla leitura quando há diferença | não descobre norma nova sozinho, porque o índice do Planalto não é uma fonte automatizável confiável |
| JURIS/STF | Informativo de Jurisprudência do STF | detecta edições novas a partir da última presente em `juris-index.js` | não substitui inteiro teor, súmulas ou temas de repercussão geral |
| JURIS/STJ | Informativo de Jurisprudência do STJ | detecta edições ordinárias e extraordinárias novas, recusando a página de busca vazia que responde HTTP 200 | súmulas não entram neste sentinela; SCON segue bloqueado e a rota oficial BDJur/Revista de Súmulas, já usada na auditoria, ainda não foi integrada à rotina diária; repetitivos seguem fora nesta versão |

## Método implantado

- `scripts/sentinela.mjs` roda manualmente ou por GitHub Actions e escreve `novidades.js` + `dados/sentinela/estado.json`.
- `.github/workflows/sentinela.yml` roda diariamente às 9h de Brasília e abre PR rascunho com as novidades, sem publicar atualização jurídica sem revisão.
- `api/sentinela.js` permite consulta sob demanda pela Vercel, autenticada pela sessão do Supabase, sem gravar no repositório.
- `scripts/atualizar-informativos.py` continua sendo o dono da incorporação do HTML dos informativos ao acervo; o sentinela detecta e o workflow chama esse script.
- `tests/sentinela.mjs` cobre os casos que já geraram falso positivo: anotações de margem do Planalto, remissões em minúscula, artigos truncados, página vazia do STJ com HTTP 200, 404 do STF e separação entre falha e ausência de novidade.

## Pendências deliberadas

Estas frentes permanecem fora do sentinela diário ou da auditoria integral por ausência de fonte automatizável segura nesta etapa, por cobertura parcial da fonte disponível ou por exigirem revisão humana:

- súmulas do STJ que dependem do SCON ou das 49 sem fonte local suficiente; a rota BDJur/Revista de Súmulas cobre parte relevante do universo, mas não foi integrada a este método diário;
- repetitivos do STJ por rota própria, ainda fora deste sentinela;
- temas de repercussão geral e súmulas do STF fora do informativo;
- transcrições de banca e material que exige conferência humana;
- norma nova do Planalto antes de entrar no catálogo do CátedraLEGIS.

Isso é uma limitação de cobertura, não uma lacuna silenciosa: o estado gerado pelo sentinela carrega `limites` por fonte para que a interface e os PRs não prometam mais do que foi realmente verificado.
