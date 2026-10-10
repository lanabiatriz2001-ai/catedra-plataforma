# Estúdio de Materiais — piloto offline

## Objetivo
Unir funcionalidades solicitadas pela dona em uma **página independente** do Cátedra, sem trocar o host, tocar no sincronizador nem instalar dependências de fornecedores desconhecidos.

## Acesso
- No ambiente de desenvolvimento: `/estudio-materiais.html`
- No build web: `/estudio-materiais.html`
- Mac/iPad: arquivo incluído na cópia do bundle nativo, com entrada **Estúdio de Materiais** no menu lateral e link de retorno ao Cátedra.
- O arquivo só estará publicado em produção depois de incorporar o PR. No site, o acesso direto será `/estudio-materiais.html`.

## Funcionalidades reais desta etapa
1. Importação local de PDF de até 40 MB; renderização de página com PDF.js congelado do repositório; navegação por setas e botões.
2. Extração do texto pesquisável da página quando o arquivo permite; aviso explícito quando a página não contém texto.
3. Leitura em voz alta do texto colado ou importado da página, com velocidade ajustável e alternância de vozes em português, quando houver duas vozes disponíveis.
4. Exercício de lacuna literal: só oculta termo de fato presente no texto-base; botão para revelar. Nenhum conteúdo jurídico é inventado.
5. Comparação visual de regra e exceção preenchidas pelo estudante.
6. Conferência textual de requisitos: corresponde exatamente a linhas fornecidas, sem afirmar que testou funcionalidades ou que realizou revisão semântica.

## Limites deliberados
- **Não instala** OpenZine, Plancast, Superintelligent UI, Oh My Design, Agente de QA ou Promptiff de terceiros. Usa uma implementação própria, limitada, inspirada nas necessidades apontadas.
- Não implementa livro 3D completo, podcast gerado por IA, OCR, auditoria semântica, tradução nem armazenamento persistente.
- O áudio depende de `speechSynthesis` disponível no navegador/WKWebView e pode não funcionar em todos os aparelhos.
- O documento e as anotações do piloto permanecem somente na memória da página; fechar ou recarregar perde os dados do piloto.
- Não há alteração do esquema do banco, permissões, login ou `auth.js`.

## Segurança e privacidade
- O PDF é lido em memória por `FileReader`, sem upload.
- Textos preenchidos aparecem por `textContent`; não são interpretados como HTML.
- A página não envia conteúdo para APIs externas.
- Não use conteúdo processual sigiloso em ambientes públicos compartilhados, mesmo sem upload.
- `catedra-ui.css` e `vendor/pdfjs/pdf.min.js` são dependências locais já versionadas.

## Validação
- Teste de navegador `node tests/estudio-materiais.mjs` conectado à CI do PR, incluindo geração de PDF textual válido e renderização por PDF.js, extração de texto, launcher e botão de retorno.
- Rodar `node scripts/build.mjs` e `node scripts/build-macos.mjs`; confirmar arquivo em ambos os bundles.
- Rodar `npm test` e `npm run test:webkit` para regressão.
- Teste físico de áudio e leitura de arquivo no Mac e no iPad ainda pendente; nenhuma instalação física foi feita neste ambiente.
- Analisar comportamento de PDF com texto e PDF escaneado.

## Próximas decisões
- Verificar o item no menu do Mac/iPad após instalação física; o acesso no menu lateral já está implementado na versão de build.
- Decidir se a experiência de leitura deve ser evoluída para flipbook 3D real.
- Estudar integração com pipeline de verificação de requisitos da engenharia do Cátedra, sem duplicar a governança do Mission Control.
