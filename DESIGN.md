---
name: Cátedra
description: Plataforma de estudo para concurso — oito direções visuais sobre um só sistema de tokens, offline e em três alvos.
colors:
  bg: "#f4f1ea"
  surface: "#fffdf8"
  surface2: "#f0ece1"
  border: "#e3ddce"
  ink: "#1f1c17"
  text2: "#5c564a"
  text3: "#6f695f"
  accent: "#0f7a57"
  accent-deep: "#0b5e43"
  accent-soft: "#e6f0ea"
  accent-ring: "#c2e0d1"
  on-accent: "#ffffff"
  sidebar-bg: "#1e2b3a"
  sidebar-text: "#b9c3cf"
  sidebar-active-text: "#7fd4b5"
  bg-dark: "#16140f"
  surface-dark: "#201d17"
  border-dark: "#332f23"
  ink-dark: "#ece7db"
  accent-dark: "#34b88a"
typography:
  display:
    fontFamily: "'Spectral', Georgia, serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
  micro:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "11px"
  lg: "14px"
  pill: "99px"
spacing:
  e1: "4px"
  e2: "8px"
  e3: "12px"
  e4: "16px"
  e5: "24px"
  e6: "32px"
  e7: "48px"
components:
  item-colorido:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "15px 18px"
  botao-primario:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    typography: "{typography.body}"
  botao-primario-hover:
    backgroundColor: "{colors.accent-deep}"
  chip:
    backgroundColor: "{colors.surface2}"
    textColor: "{colors.text2}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.mono}"
  barra-progresso:
    backgroundColor: "{colors.surface2}"
    rounded: "{rounded.pill}"
    height: "8px"
---

# Cátedra — sistema visual

## Overview

O Cátedra é uma plataforma de estudo para concurso que roda em três alvos a partir do mesmo HTML: navegador, app de macOS e app de iPad. O sistema visual existe para sustentar sessões longas de leitura densa de material jurídico — lei seca, jurisprudência, espelhos de correção — sem cansar e sem exigir internet.

A espinha é **um conjunto de tokens e oito direções visuais** que os preenchem. A direção é escolha da pessoa, não do desenvolvedor: `sutil` (Planilha, a identidade aprovada), `premium` (Tribunal), `clean` (Fibra), `moderno` (Neon), `aurora`, `solar`, `terminal`, `holo`. Cada uma traz paleta clara e escura completas, mais tipografia e raio próprios. **Nenhuma tela pode escrever cor, fonte ou raio na mão** — se escrever, ela quebra em sete das oito direções.

Os tokens do frontmatter acima são os da direção `sutil` em modo claro: papel quente, serifa calma, verde-oliva e navy de cabeçalho. Ela é a referência quando algo precisa de um valor concreto.

## Colors

A cor faz três trabalhos distintos, e confundi-los é o erro mais caro do projeto:

1. **Cor de tema** (`--accent`, `--bg`, `--surface`, `--ink`) — vem da direção ativa. Sempre por token.
2. **Cor de matéria/ramo** — identidade de disciplina, vinda do edital (`--ct-item-cor`, `--rc`, `--lc`, `d.color`). É *dado*, não decoração: dizer "isto é Processual Civil" de relance.
3. **Cor de situação** — `--ok`, `--warn`, `--danger` para atraso, alerta e erro.

**Cor-identidade e cor-texto não são a mesma cor.** Uma cor de disciplina que passa em 3:1 como preenchimento de gráfico não passa em 4,5:1 como texto. Quando a cor da matéria precisa virar texto, escureça com a própria tinta: `color-mix(in srgb, var(--lei) 72%, var(--ink))`.

Sombras derivam do tema, nunca de um hex fixo. Um halo de cor com deslocamento zero é decoração — use elevação com deslocamento e desfoque, e prefira neutro quando o elemento já é colorido.

## Typography

Três vozes, com papéis fixos:

- **Spectral** (`--display`) — serifa editorial. Títulos, saudação, números grandes. É o que dá cara de estudo jurídico e não de painel de SaaS.
- **Inter** (`--body`) — a interface densa: rótulos, listas, parágrafos.
- **JetBrains Mono** (`--mono`) — só onde há medida: percentuais, contadores, cronômetro, número de artigo, tempo. Nunca como fantasia de "técnico".

As fontes são locais, em `./fonts` (woff2). O app precisa abrir igual sem rede — nenhuma fonte pode vir de CDN.

Escala do host: `--fs-3xs` 10.5 · `--fs-2xs` 11 · `--fs-xs` 11.5 · `--fs-sm` 12.5 · `--fs-base` 13.5 · `--fs-md` 14.5 · `--fs-lg` 15.5 · `--fs-xl` 17 · `--fs-2xl` 19. Ela é multiplicada por `fontScale` das preferências, então **nenhum tamanho vai escrito em px numa tela do host**.

Os satélites em iframe usam uma escala própria, de quatro degraus a razão ~1.25 — `--t-micro` 12 · `--t-corpo` 15 · `--t-titulo` 19 · `--t-display` 24. Ela existe porque cada satélite havia acumulado oito ou nove tamanhos entre 10,5px e 20px, tão próximos que nenhum estabelecia hierarquia.

## Layout

Casca de duas colunas no desktop: barra lateral escura fixa (navegação por seções) e área de conteúdo rolável. No mobile a lateral vira gaveta e aparece uma barra inferior de cinco alvos.

Espaçamento pela escala `--ct-e1`…`--ct-e7` (4/8/12/16/24/32/48). Grupo apertado, separação generosa: mais espaço acima de um título do que abaixo dele.

Medida de leitura limitada a 74ch nos blocos de texto corrido — material jurídico é lido, não escaneado.

Alvo de toque mínimo de 44px: o iPad é um alvo de primeira classe, não uma adaptação.

## Elevation & Depth

A profundidade é **por direção**, aplicada em `[data-dir="…"]`:

- `terminal` — sem sombra; o relevo vem da borda.
- `clean` — sem sombra nos cartões.
- `premium` — sombra quente e funda, clima editorial.
- `aurora` — sombra fria azulada. `moderno`/`holo` — dupla, iridescente.
- demais — elevação neutra com deslocamento e desfoque.

Toda sombra tem deslocamento vertical e desfoque macio. Sombra colorida só quando a direção a assume como identidade (Neon, Aurora, Holo); fora disso, elevação neutra.

## Shapes

Raio vem da direção (`--radius`, de 6px no Terminal a 20px no Holo), com `--r-sm` e `--r-md` derivados. Barras de progresso e chips usam pílula (99px).

Bordas são de 1px. **Uma borda colorida acima de 1px em um lado do cartão está proibida** — ver Do's and Don'ts.

## Components

**Item colorido (`.ct-item`)** — a linha que carrega uma cor de matéria ou situação. A cor entra por `--ct-item-cor` e produz duas coisas: a borda inteira tingida (`color-mix(… 38%, var(--border))`) e uma lavagem curta que atravessa o cartão da esquerda para a direita (`color-mix(… 18%, transparent)` até 46%). A leitura de relance é a mesma de uma faixa lateral; o carimbo, não.

**Barra de progresso** — trilha com `overflow:hidden` e preenchimento de largura total deslocado por `transform: translateX(calc(N% - 100%))`. Nunca anime `width`: além do custo de layout, várias dessas barras tiquetaqueiam de segundo em segundo durante horas. `translateX` preserva as pontas arredondadas, coisa que `scaleX` achataria.

**Satélites em iframe** — `legis-web`, `juris-web`, `ritos-web`, `pecas-web`, `area-web`, `prioridade-web`, `segunda-fase-web`. Custom properties **não cruzam iframe**: o host envia os tokens por `postMessage` e `tema-satelite.js` os aplica. Todo valor no satélite é escrito como `var(--x, padrão)` para que a página aberta avulsa continue coerente — e o padrão é a identidade do app, nunca a fonte do sistema.

**Estados** — `hover`, `disabled`, `loading`, `error` e vazio fazem parte do componente. O estado vazio tem título, descrição e ação; não é uma frase solta.

## Gramática de composição

Uma regra decide a forma de cada aba: **o espelho mostra o critério; a bancada faz o trabalho.** Quem foi conferir a própria situação lê um espelho de banca; quem veio executar encontra uma bancada. O contrato completo está no comentário `CONTRATO DE DIREÇÃO` no topo do `<body>` do host (seed `605bfe26`).

**Espelho** (`.ct-esp-cab`, `.ct-esp-ex`, `.ct-q`, `.ct-q-exig`, `.ct-q-peso`, `.ct-esp-fecho`) — a unidade de layout é o quesito, do jeito que a banca escreve: a exigência em serifa à esquerda, o peso em mono alinhado à direita, o estado (`--st`) tingindo a borda e lavando a linha. Abre com o que a tela exige e fecha com quanto de quanto foi atendido. Abas: Edital, Reta final, Redação, Simulados, Análise, Conquistas, Histórico (só cabeçalho — a tabela fica), e o satélite da 2ª fase. **Pendente:** Prioridade (satélite) — as barras foram corrigidas, mas a tipografia do quesito ainda não entrou; Oral — hero + abas já funcionam como bancada informal, e converter renderia pouco.

**Régua** (`.ct-regua`) — a linha do tempo até a prova como componente, nunca como moldura global. Só entra onde o prazo *é* o critério: Edital e Reta final.

**Bancada** (`.ct-bc`, `.ct-bc-foco`, `.ct-bc-apoio`, `.ct-bc-fila`, `.ct-bc-cd`) — três zonas que não trocam de lugar: a tarefa de agora no centro em escala grande, o material que ela exige à direita, a fila embaixo. Abas: Início (a próxima ação absorve "continuar de onde parei"; dos quatro KPIs ficam os dois que mudam a decisão), Ciclo, Revisões.

**Exceções declaradas** (com o motivo comentado no código) — Calendário (já é um eixo de tempo), Bancas (navegação por acervo), LEGIS e JURIS (leitura pura), Comunidade, Bem-estar, Ajustes, Admin (social ou formulário). Forçar a gramática nelas seria enfeite, e enfeite é o que a gramática recusa.

## Do's and Don'ts

**Faça**

- Escreva cor, fonte, raio e espaçamento por token. Teste a tela em pelo menos duas direções e nos dois modos.
- Trate a cor de matéria como dado: ela deve sobreviver a uma troca de tema.
- Anime `transform` e `opacity`. Se precisar animar tamanho, repense a forma.
- Escureça a cor de identidade antes de usá-la como texto, e verifique 4,5:1.
- Mantenha as fontes locais e o app funcionando sem rede.

**Não faça**

- **Faixa colorida de 3–4px na lateral de cartão, item, aviso ou alerta.** É o tell mais reconhecível de interface gerada por máquina, e o projeto acabou de remover 35 delas. A cor tinge a borda e lava o fundo — não fica encostada.
- Halo de cor com deslocamento zero (`box-shadow: 0 0 Npx <cor>`). Um anel de estado (`0 0 0 3px`) é outra coisa e é permitido.
- Hex fixo em sombra, borda ou fundo. Uma sombra azul-céu numa tela de tema vinho é um vazamento de template.
- Tamanho de fonte em px numa tela do host — quebra o `fontScale` de quem aumentou o texto.
- Fonte, ícone ou script vindo de CDN.
- Seis tamanhos de fonte separados por meio pixel. Menos degraus, mais contraste.
- Emoji no lugar de ícone em elemento novo de interface.
