# Redação — Mesa de prova: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer a etapa 2 da view `redacao` como uma mesa de prova: questão ao lado da folha, papel como caminho padrão com conferência própria quesito a quesito, folha pautada para quem digita, e espelho que diz se serve para corrigir.

**Architecture:** Tudo vive no componente único `Catedra.dc.html` (template com `{{ }}`, `<sc-if>`, `<sc-for>`; `render()` devolve as variáveis) e em `catedra-ui.css`. A lógica nova entra como métodos pequenos ao lado dos `red*` existentes; o único estado persistido novo é `redTempoMs`. `submitRed` e o corretor não são tocados, salvo um campo a mais na entrada do histórico.

**Tech Stack:** HTML/JS do runtime `support.js` (semântica de React, `setState` síncrono), CSS com tokens, Playwright (`playwright-core`) em Chromium e WebKit.

**Spec:** `docs/superpowers/specs/2026-10-03-redacao-mesa-de-prova-design.md`

## Global Constraints

- Português do Brasil com acentuação completa em código, comentários, commits e interface.
- Tokens sempre: nenhum hex fixo, nenhum px solto no host. Sem faixa lateral colorida. Ícones Lucide 16 px via `<svg class="ct-ico" …><use href="#ct-i-NOME"></use></svg>` com `aria-hidden="true"`; sem emoji.
- Texto ≥ 4,5:1; alvos ≥ 44 px no toque (`min-height:var(--ct-alvo-toque)`); `prefers-reduced-motion` respeitado.
- Nada de rede externa; sintaxe que o JavaScriptCore aceita (sem `?.` encadeado em excesso não é problema, mas nada de recursos de 2024+; `ResizeObserver` sempre com guarda de existência).
- Chaves que NÃO mudam nem migram: `redText`, `redTextTs`, `redGabarito`, `redEnunciado`, `redMarcas`, `redDisciplina`, `redHist`, `catedra:red`.
- Estado persistido novo: só `redTempoMs`, que entra em **três** listas ao lado de `redTextTs`: `_autosaveKeys()`, a lista de `_rehydrateFromLocal` e `AREA_PROPRIA`.
- `submitRed`, `_corrigeRedacaoLivre`, `_redFallbackLivre` e o prompt não são alterados, exceto `tempoMs` na entrada do histórico.
- Teste que prova aparência mede (caixas, `getComputedStyle`, contraste calculado) e olha a captura. Semear por `base + '/__semente'`; ler o storage ≥ 1,3 s depois da ação; relógio fixo em contexto próprio.
- Não rodar build nativo nem instalar: a instalação é da sessão "Fusão de melhorias do Codex".
- Trabalhar só no worktree `.claude/worktrees/redacao-mesa-de-prova`, branch `redacao-mesa-de-prova`. Conferir `git branch --show-current` antes de cada commit.
- Os números de linha deste plano são os da `main` em 241c563; localize pelo texto citado, não pelo número.

## Review Focus

1. Fechar o app com o cronômetro andando: o tempo decorrido desde o último "dobrar" não pode sumir (dobra a cada 15 s e em `visibilitychange`). Teste na Task 2.
2. Espelho com números repetidos ou fora de ordem ("1." duas vezes): a conferência indexa por posição, não por `q.n`; marcar um não marca o outro. Teste na Task 5.
3. Trocar de "Digitar" para "À mão" com texto digitado: o rascunho não é apagado nem enviado; voltar a "Digitar" mostra o mesmo texto. Teste na Task 2.
4. Colar um espelho novo no meio da conferência: as notas marcadas são descartadas (os quesitos mudaram) e "Registrar" volta a ficar desabilitado. Teste na Task 5.
5. Nota única em prosa com vírgula ("7,5"), vazia ou fora de 0–10: vírgula é aceita; vazio e fora da faixa mantêm "Registrar" desabilitado. Teste na Task 5.

## Convenções deste plano

- **Seletores de teste:** todo elemento novo que um teste toca leva `data-red="…"`. Nomes fixos: `mesa`, `questao`, `questao-toggle`, `chip-limite`, `chip-comandos`, `editar-questao`, `marcas-toggle`, `folha`, `modo-mao`, `modo-digitar`, `sugestao-papel`, `crono`, `crono-btn`, `terminei`, `linhas`, `barra`, `salvo`, `foco`, `pauta`, `espelho`, `gab-estado`, `gab-vista-quesitos`, `gab-vista-texto`, `gab-quesito`, `linhas-mao`, `linhas-mao-msg`, `conf-item`, `conf-opcao`, `conf-unica`, `conf-soma`, `conf-registrar`.
- **Rodar só o módulo novo:** `CT_SO=redacao-mesa node tests/run.mjs` (a Task 1 cria esse atalho).
- **Mensagem de commit:** uma frase em português dizendo o que mudou para a pessoa, terminando com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File Structure

| Arquivo | Responsabilidade nesta fatia |
|---|---|
| `Catedra.dc.html` | Template da etapa 2 e ajustes da etapa 3; métodos `red*` novos; bindings no `render()`; `redTempoMs` nas três listas |
| `catedra-ui.css` | Classes `.ct-mesa*`, `.ct-folha*`, `.ct-seg`, `.ct-conf*` |
| `tests/redacao-mesa.mjs` (novo) | Os casos desta fatia, exporta `testarRedacaoMesa(page, base, ok, opcoes)` |
| `tests/run.mjs`, `tests/run-webkit.mjs` | Importam e chamam o módulo; `run.mjs` ganha o atalho `CT_SO` |

---

### Task 1: Arranjo lado a lado e campo da questão

**Files:**
- Create: `tests/redacao-mesa.mjs`
- Modify: `tests/run.mjs` (import perto da linha 43; chamada perto da 9714), `tests/run-webkit.mjs` (import perto da 48; chamada perto da 171)
- Modify: `Catedra.dc.html` (template: bloco "ETAPA 2 · RESPONDER", ~3512–3652; estado inicial ~6989; bindings ~19655–19730)
- Modify: `catedra-ui.css` (fim do arquivo)

**Interfaces:**
- Produces: contêiner `[data-red="mesa"]` com filhos `[data-red="questao"]` e `[data-red="folha"]`, e `[data-red="espelho"]` depois da grade. Helper de teste `semear(page, base, extra)` e `abrirRedacao(page, base)` em `tests/redacao-mesa.mjs`, usados por todas as tasks seguintes. Bindings: `redChipLimite`, `redChipComandos`, `redPodeEditarEnun`, `redEditandoEnun`, `redMarcasAberto`, `redQuestaoAberta`, `toggleRedEditarEnun`, `toggleRedMarcas`, `toggleRedQuestao`.

- [ ] **Step 1: Criar o módulo de teste com os helpers e os casos do arranjo**

```js
/* REDAÇÃO — MESA DE PROVA (03/10/2026)
   A etapa de responder discursiva: questão ao lado da folha, papel primeiro, folha pautada
   e espelho com quesitos. Spec: docs/superpowers/specs/2026-10-03-redacao-mesa-de-prova-design.md
   Cada bloco roda em contexto próprio (relógio fixo, storage isolado). */

export const ENUN = 'TJ-SP · Juiz Substituto · 2025 — VUNESP\n\nConsidere a seguinte situação hipotética: o autor obteve tutela antecipada antecedente e o réu não recorreu. Responda, em até 30 linhas:\n\na) Há estabilização da tutela?\nb) Qual o prazo da ação de revisão?\nc) Forma-se coisa julgada?';
export const GAB = 'Instruções gerais da banca.\n1. Reconhece a estabilização da tutela, art. 304 do CPC [escala: 0,00/0,10/0,20/0,30]\n2. Indica o prazo de dois anos, art. 304, § 5º, do CPC [escala: 0,00/0,10/0,20/0,30]\n3. Afasta a coisa julgada, art. 304, § 6º, do CPC (0,40 ponto)';

export async function novoContexto(pageDaSuite, viewport) {
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0);
  await page.clock.install({ time: t });
  return { ctx, page };
}

export async function semear(page, base, extra) {
  await page.goto(base + '/__semente');
  await page.evaluate(({ ENUN, GAB, extra }) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [{ disc: 'Direito Processual Civil', peso: 2, questoes: 10, topics: [{ name: 'Tutela provisória', done: false, subs: [] }] }]);
    set('redEnunciado', JSON.stringify(ENUN)); set('redGabarito', JSON.stringify(GAB));
    Object.keys(extra || {}).forEach(k => set(k, JSON.stringify(extra[k])));
  }, { ENUN, GAB, extra: extra || {} });
}

export async function abrirRedacao(page, base, arquivo) {
  await page.goto(base + '/' + (arquivo || 'Catedra.dc.html'));
  await page.waitForFunction(() => typeof window.__catedraGoView === 'function');
  await page.evaluate(() => window.__catedraGoView('redacao'));
  await page.waitForSelector('[data-red="mesa"]', { timeout: 8000 });
}

const caixa = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

export async function testarRedacaoMesa(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'MESA [' + (opcoes.motor || 'chromium') + '] ';
  const blocos = [arranjo];
  for (const b of blocos) {
    try { await b(pageDaSuite, base, ok, R, opcoes); }
    catch (e) { ok(false, R + b.name + ' exceção: ' + e.message); }
  }
}

async function arranjo(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    let q = await caixa(page, '[data-red="questao"]'), f = await caixa(page, '[data-red="folha"]'), e = await caixa(page, '[data-red="espelho"]');
    ok(!!q && !!f && Math.abs(q.y - f.y) < 4 && f.x > q.x + q.w - 2, R + '1280: questão e folha lado a lado, mesmo topo');
    ok(!!e && e.y >= Math.max(q.y + q.h, f.y + f.h) - 2 && e.w > q.w + f.w - 4, R + '1280: faixa do espelho abaixo, em largura total');
    ok((await page.textContent('[data-red="chip-limite"]')).includes('30 linhas'), R + 'chip do limite de linhas vem do enunciado');
    ok((await page.textContent('[data-red="chip-comandos"]')).includes('3 comandos'), R + 'chip conta os comandos do enunciado');
    ok(await page.evaluate(() => !!document.querySelector('[data-red="questao"] #red-disciplina')), R + 'seletor de disciplina mora na coluna da questão');
    ok(await page.locator('[data-red="editar-questao"]').count() === 1, R + 'questão colada pode ser editada');
    await page.click('[data-red="editar-questao"]');
    ok(await page.locator('[data-red="questao"] textarea').count() === 1, R + 'editar abre o enunciado num campo');
    await page.click('[data-red="editar-questao"]');
    await page.click('[data-red="marcas-toggle"]');
    ok(await page.locator('[data-red="questao"] :text("Nada marcado ainda")').count() === 1, R + 'marcações abrem dentro da coluna da questão');
    await page.screenshot({ path: 'tests/_capturas/mesa-1280.png', fullPage: true }).catch(() => {});

    await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(400);
    q = await caixa(page, '[data-red="questao"]'); f = await caixa(page, '[data-red="folha"]');
    ok(f.y >= q.y + q.h - 2 && Math.abs(f.x - q.x) < 4, R + '768: empilhado, questão acima da folha');
    await page.click('[data-red="questao-toggle"]'); await page.waitForTimeout(200);
    const q2 = await caixa(page, '[data-red="questao"]');
    ok(q2.h < q.h / 2, R + '768: questão recolhe e sobra só o cabeçalho');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), R + '768: nada estoura na horizontal');
    await page.screenshot({ path: 'tests/_capturas/mesa-768.png', fullPage: true }).catch(() => {});
  } finally { await ctx.close(); }

  // questão do banco não é editável
  const b = await novoContexto(pageDaSuite);
  try {
    await semear(b.page, base, { redProvaId: 'x1' }); await abrirRedacao(b.page, base);
    await b.page.evaluate(() => { const c = window.__catedraApp; if (c) c.setState({ redModoProva: true }); });
    await b.page.waitForTimeout(200);
    ok(await b.page.locator('[data-red="editar-questao"]').count() === 0, R + 'questão do banco não mostra "Editar questão"');
  } finally { await b.ctx.close(); }
}
```

`window.__catedraApp` é o gancho que o próprio app expõe (linha ~7796: `window.__catedraApp = this`); os testes o usam só para pôr estado que a interface não alcança de forma barata.

- [ ] **Step 2: Ligar o módulo nos dois runners e criar o atalho `CT_SO`**

Em `tests/run.mjs`, junto dos imports (perto de `import { testarPrioridadeDiscursiva }`):

```js
import { testarRedacaoMesa } from './redacao-mesa.mjs';
```

Logo depois de `URL0`, `page` e `ok` estarem definidos e ANTES do primeiro bloco de testes, o atalho (ajuste o fechamento ao padrão do fim do arquivo: mesmo resumo e mesmo `process.exit`):

```js
// CT_SO=redacao-mesa roda só o módulo pedido — para o ciclo curto de uma tela.
if (process.env.CT_SO === 'redacao-mesa') {
  await testarRedacaoMesa(page, URL0, ok, { motor });
  await encerrar();   // a mesma rotina de fecho que o fim do arquivo usa (resumo + exit)
}
```

Se o fim do arquivo não tiver uma função de fecho, extraia as linhas finais (fechar navegador, servidor, imprimir resumo, `process.exit(falhas?1:0)`) para `async function encerrar()` e chame-a nos dois lugares.

Junto da chamada de `testarPrioridadeDiscursiva`:

```js
try { await testarRedacaoMesa(page, URL0, ok, { motor }); } catch(e) { ok(false, 'MESA exceção: '+e.message); }
```

Em `tests/run-webkit.mjs`, o mesmo import e, junto da chamada de `testarPrioridadeDiscursiva`:

```js
    try { await testarRedacaoMesa(page, base, ok, { motor: 'webkit' }); } catch(e) { ok(false, 'MESA exceção: '+e.message); }
```

Crie a pasta das capturas: `mkdir -p tests/_capturas && grep -q "_capturas" .gitignore || echo "tests/_capturas/" >> .gitignore`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: FALHA em `abrirRedacao` (timeout esperando `[data-red="mesa"]`).

- [ ] **Step 4: CSS do arranjo em `catedra-ui.css` (fim do arquivo)**

```css
/* ===== Redação · mesa de prova (03/10/2026) =====
   Questão à esquerda, folha à direita; empilha quando o conteúdo tem menos de 1024px.
   A decisão é pela largura do CONTÊINER (iPad deitado fica lado a lado, em pé empilha). */
.ct-mesa-caixa { container-type: inline-size; container-name: mesa; }
.ct-mesa { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--ct-e4); align-items: start; }
@container mesa (min-width: 1024px) {
  .ct-mesa { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); }
  .ct-mesa-questao { position: sticky; top: var(--ct-e3); max-height: calc(100vh - var(--ct-e5)); overflow: auto; }
  .ct-mesa-recolher { display: none; }
}
@supports not (container-type: inline-size) {
  @media (min-width: 1280px) {
    .ct-mesa { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); }
    .ct-mesa-questao { position: sticky; top: var(--ct-e3); max-height: calc(100vh - var(--ct-e5)); overflow: auto; }
    .ct-mesa-recolher { display: none; }
  }
}
.ct-mesa-questao, .ct-mesa-folha { min-width: 0; padding: 0; overflow: hidden; }
.ct-mesa-chips { display: flex; gap: var(--ct-e2); flex-wrap: wrap; margin-top: var(--ct-e2); }
.ct-mesa-chip { font-family: var(--mono); font-size: var(--fs-xs); padding: 2px var(--ct-e2); border-radius: 99px; background: color-mix(in srgb, var(--onAccent, #fff) 18%, transparent); color: inherit; }
.ct-mesa-corpo { padding: var(--ct-e4) var(--ct-e5); }
.ct-mesa-rodape { border-top: 1px solid var(--border); padding: var(--ct-e3) var(--ct-e5); }
.ct-mesa-linha { display: flex; align-items: center; gap: var(--ct-e2); flex-wrap: wrap; }
.ct-mesa-acao { display: inline-flex; align-items: center; gap: var(--ct-e2); min-height: var(--ct-alvo-toque); padding: 0 var(--ct-e2); background: transparent; border: none; color: var(--text2); font: inherit; font-size: var(--fs-sm); cursor: pointer; border-radius: var(--r-md); }
.ct-mesa-acao:hover { color: var(--ink); background: var(--surface2); }
.ct-mesa-acao:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

`--onAccent`, `--r-md` e `--radius` são tokens em uso no sistema. O chip mora dentro de `.ct-hero`: confira no olho e na medição da Task 6 que o texto do chip passa 4,5:1 sobre o herói em claro e escuro.

- [ ] **Step 5: Template — reorganizar a etapa 2**

Dentro de `<sc-if value="{{ redEtapa2 }}">`, mantenha a faixa "Rascunho salvo" como está. Substitua os dois cartões seguintes (o cartão do enunciado com `ct-enun-grid` e o cartão "Sua resposta") por esta estrutura. O conteúdo marcado como MOVER é recortado do template atual sem alteração.

```html
<div class="ct-mesa-caixa">
  <div class="ct-mesa" data-red="mesa">
    <!-- QUESTÃO -->
    <section class="ct-card ct-mesa-questao" data-red="questao" aria-label="Questão">
      <div class="ct-hero" style="border-radius:0;">
        <div class="ct-mesa-linha" style="justify-content:space-between;">
          <div class="ct-hero-eb">Questão</div>
          <button class="ct-mesa-acao ct-mesa-recolher" data-red="questao-toggle" onclick="{{ toggleRedQuestao }}" aria-expanded="{{ redQuestaoAberta }}" style="color:inherit;">{{ redQuestaoToggleTxt }}</button>
        </div>
        <h2 class="ct-hero-tit" style="font-size:var(--fs-2xl);">{{ redProvaTitulo }}</h2>
        <div class="ct-mesa-chips">
          <sc-if value="{{ redChipLimite }}" hint-placeholder-val="{{ false }}"><span class="ct-mesa-chip" data-red="chip-limite">{{ redChipLimite }}</span></sc-if>
          <sc-if value="{{ redChipComandos }}" hint-placeholder-val="{{ false }}"><span class="ct-mesa-chip" data-red="chip-comandos">{{ redChipComandos }}</span></sc-if>
        </div>
      </div>
      <sc-if value="{{ redQuestaoAberta }}" hint-placeholder-val="{{ true }}">
        <div class="ct-mesa-corpo">
          <sc-if value="{{ redEditandoEnun }}" hint-placeholder-val="{{ false }}">
            <textarea class="ct-campo" value="{{ redEnunciado }}" oninput="{{ onRedEnun }}" rows="12" aria-label="Enunciado da questão" style="width:100%;box-sizing:border-box;"></textarea>
          </sc-if>
          <sc-if value="{{ redLendoEnun }}" hint-placeholder-val="{{ true }}">
            <!-- MOVER: o <div id="ct-enun" …> inteiro, com o sc-for de redBlocos e o link do PDF -->
            <!-- MOVER: o bloco "Marcar trecho" (título, redSelDica e o sc-for de redCores) -->
          </sc-if>
          <div class="ct-mesa-linha" style="margin-top:var(--ct-e3);">
            <button class="ct-mesa-acao" data-red="marcas-toggle" onclick="{{ toggleRedMarcas }}" aria-expanded="{{ redMarcasAberto }}">
              <svg class="ct-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#ct-i-highlighter"></use></svg>
              Marcações e notas <span class="ct-dado">{{ redMarcasN }}</span>
            </button>
            <sc-if value="{{ redPodeEditarEnun }}" hint-placeholder-val="{{ false }}">
              <button class="ct-mesa-acao" data-red="editar-questao" onclick="{{ toggleRedEditarEnun }}" aria-pressed="{{ redEditandoEnun }}" style="margin-left:auto;">
                <svg class="ct-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#ct-i-pen-line"></use></svg>
                {{ redEditarEnunTxt }}
              </button>
            </sc-if>
          </div>
          <sc-if value="{{ redMarcasAberto }}" hint-placeholder-val="{{ false }}">
            <!-- MOVER: o aviso redSemMarcas e o sc-for de redMarcasList (cartões com textarea de nota) -->
          </sc-if>
        </div>
        <div class="ct-mesa-rodape">
          <!-- MOVER: label + select#red-disciplina + p#red-disciplina-ajuda, sem alteração -->
        </div>
      </sc-if>
    </section>

    <!-- FOLHA (as Tasks 2 e 3 substituem o miolo) -->
    <section class="ct-card ct-mesa-folha" data-red="folha" aria-label="Sua resposta">
      <div class="ct-mesa-corpo">
        <!-- MOVER: o cabeçalho "Sua resposta" + contador, o <textarea> da resposta e a linha do botão submitRed com redDicaEtapa2 -->
      </div>
    </section>
  </div>
</div>
```

Depois da grade, embrulhe TUDO o que hoje vem em seguida na etapa 2 (os `sc-if` de `redSemEspelho`, `redEspSugerido`, `redEspelhoOculto` e `redEspelhoAberto`) em:

```html
<div data-red="espelho" style="display:flex;flex-direction:column;gap:var(--ct-e4);">
  <!-- MOVER: os quatro sc-if do espelho, sem alteração nesta task -->
</div>
```

Os ícones `highlighter`, `lock`, `maximize-2` e `minimize-2` NÃO existem no sprite (só `pen-line`, linha ~705). Acrescente os quatro `<symbol id="ct-i-NOME" viewBox="0 0 24 24">` ao lado de `ct-i-pen-line`, copiando os `path` do Lucide de mesmo nome no formato dos vizinhos (o repositório é offline: os traços vão no arquivo, nada de CDN). Remova as regras `.ct-enun-grid` e `.ct-enun-lado` do `<style>` (linhas ~208–210) só depois de `grep -n "ct-enun-grid\|ct-enun-lado" Catedra.dc.html tests/` não mostrar outro uso; se algum teste as usa, troque o seletor do teste por `[data-red="questao"]`.

- [ ] **Step 6: Estado de tela e bindings**

No estado inicial, ao lado de `redRascunhoOculto:false,`:

```js
      redQuestaoAberta:true, redMarcasAberto:false, redEditandoEnun:false,   // mesa de prova: só de tela
```

Métodos, logo abaixo de `onRedEnun`:

```js
  // ===== MESA DE PROVA (03/10/2026): a etapa de responder =====
  toggleRedQuestao = ()=> this.setState({redQuestaoAberta:!this.state.redQuestaoAberta});
  toggleRedMarcas = ()=> this.setState({redMarcasAberto:!this.state.redMarcasAberto});
  toggleRedEditarEnun = ()=>{ if(this.state.redModoProva) return; this.setState({redEditandoEnun:!this.state.redEditandoEnun}); };
```

No objeto do `render()`, junto de `redPasso1`:

```js
      redQuestaoAberta:this.state.redQuestaoAberta, toggleRedQuestao:this.toggleRedQuestao,
      redQuestaoToggleTxt:this.state.redQuestaoAberta?'Recolher':'Mostrar questão',
      redMarcasAberto:this.state.redMarcasAberto, toggleRedMarcas:this.toggleRedMarcas,
      redPodeEditarEnun:!this.state.redModoProva,
      redEditandoEnun:!this.state.redModoProva && this.state.redEditandoEnun, toggleRedEditarEnun:this.toggleRedEditarEnun,
      redLendoEnun:!!this.state.redModoProva || !this.state.redEditandoEnun,
      redEditarEnunTxt:this.state.redEditandoEnun?'Concluir edição':'Editar questão',
      redChipLimite:(()=>{ const l=this._redLimiteLinhas(this.state.redEnunciado); return l?('até '+l+' linhas'):''; })(),
      redChipComandos:(()=>{ const n=this._redBlocos(this._desquebrar(String(this.state.redEnunciado||''))).filter(b=>b.ehItem).length;
        return n>1?(n+' comandos'):''; })(),
```

Confira o nome da propriedade que marca item em `_redBlocos` (`grep -n "ehItem" Catedra.dc.html | head -5`); o binding de `redBlocos` no render mostra o mapeamento real. Em `redReset` e em `_abrirDiscursiva`, acrescente ao `setState`: `redEditandoEnun:false, redQuestaoAberta:true`.

- [ ] **Step 7: Rodar e ver passar; rodar a regressão do rascunho**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: todos os casos `MESA … arranjo` verdes. Abra `tests/_capturas/mesa-1280.png` e `mesa-768.png` e confira no olho: colunas alinhadas, nenhum texto cortado, herói legível.

Run: `node tests/run.mjs 2>&1 | grep -E "U4|DISCURSIVA|✗" | head -30`
Expected: casos U4 e DISCURSIVA verdes. Se algum teste U4 depende de `document.querySelector('main textarea')` ser a resposta, ele segue certo: com `redEditandoEnun` falso, o primeiro `textarea` de `main` na etapa 2 continua sendo o da resposta só se as notas de marcação estiverem fechadas (estão, por padrão). Mesmo assim, troque em `redRascunhoOk` o seletor por `[data-red="folha"] textarea`.

- [ ] **Step 8: Commit**

```bash
git branch --show-current
git add tests/redacao-mesa.mjs tests/run.mjs tests/run-webkit.mjs Catedra.dc.html catedra-ui.css .gitignore
git commit -m "Na discursiva, a questão fica ao lado da resposta e o comando não some da tela enquanto se escreve

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Papel primeiro — modos "À mão" e "Digitar" e o cronômetro

**Files:**
- Modify: `Catedra.dc.html` (estado inicial ~7285; `_autosaveKeys` ~8738; lista de `_rehydrateFromLocal` ~11898; `AREA_PROPRIA` ~8598; métodos junto dos da Task 1; `redZerarRascunho`, `redReset`, `_abrirDiscursiva`; entrada do histórico em `submitRed`; bindings; template da folha)
- Modify: `catedra-ui.css`
- Test: `tests/redacao-mesa.mjs`

**Interfaces:**
- Consumes: `semear`, `abrirRedacao`, `novoContexto`; `[data-red="folha"]`.
- Produces: estado persistido `redTempoMs:number`; estado de tela `redModoResposta:'mao'|'digitar'`, `redCronoOn:boolean`, `redCronoTick:number`; métodos `_redTempoAgora():number` (ms acumulados incluindo o trecho em curso), `_redCronoIniciar()`, `_redCronoPausar()`, `_redCronoZerar()`, `_redFmtTempo(ms):string`, `setRedModo(e)`, `toggleRedCrono()`. Bindings `redModoMao`, `redModoDigitar`, `redCronoTxt`, `redCronoBtnTxt`.

- [ ] **Step 1: Testes que falham — acrescentar o bloco `papel` e incluí-lo em `blocos`**

```js
const lerStore = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem('catedra:' + k)); } catch (_) { return null; } }, k);

async function papel(pageDaSuite, base, ok, R) {
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    ok(await page.getAttribute('[data-red="modo-mao"]', 'aria-pressed') === 'true', R + 'questão nova abre em "À mão"');
    ok(await page.locator('[data-red="folha"] textarea').count() === 0, R + 'à mão não mostra campo de digitar');
    ok((await page.textContent('[data-red="crono"]')).trim() === '00:00', R + 'cronômetro parado em 00:00 antes de começar');
    await page.clock.runFor(5000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '00:00', R + 'cronômetro à mão não anda sozinho');
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(65000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '01:05', R + '"Começar" faz o tempo andar com o relógio');
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(30000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '01:05', R + '"Pausar" congela o tempo');
    await page.clock.runFor(1500);
    ok(Math.abs((await lerStore(page, 'redTempoMs')) - 65000) < 1500, R + 'tempo pausado é salvo');
    // Review Focus 1: fechar com o cronômetro andando não perde o que passou
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(40000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(1500);
    ok((await lerStore(page, 'redTempoMs')) >= 100000, R + 'tempo em curso é salvo quando a janela some');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
    await abrirRedacao(page, base);
    ok(/^01:4\d$/.test((await page.textContent('[data-red="crono"]')).trim()), R + 'tempo volta depois de recarregar');
    // sair da view pausa
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(2000);
    const antes = (await page.textContent('[data-red="crono"]')).trim();
    await page.evaluate(() => window.__catedraGoView('inicio')); await page.clock.runFor(20000);
    await page.evaluate(() => window.__catedraGoView('redacao')); await page.waitForSelector('[data-red="crono"]');
    ok((await page.textContent('[data-red="crono"]')).trim() === antes, R + 'sair da Redação pausa o cronômetro');
  } finally { await ctx.close(); }

  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redText: 'Rascunho digitado em outra sessão.', redTextTs: Date.now() - 3600e3, redTempoMs: 120000 });
    await abrirRedacao(page, base);
    ok(await page.getAttribute('[data-red="modo-digitar"]', 'aria-pressed') === 'true', R + 'com rascunho digitado abre em "Digitar"');
    ok(/manuscrita/i.test(await page.textContent('[data-red="sugestao-papel"]')), R + 'digitando, a tela sugere o papel');
    ok((await page.textContent('[data-red="crono"]')).trim() === '02:00', R + 'tempo do rascunho volta com ele');
    // Review Focus 3: trocar de modo não apaga nem envia o rascunho
    await page.click('[data-red="modo-mao"]'); await page.click('[data-red="modo-digitar"]');
    ok((await page.inputValue('[data-red="folha"] textarea')) === 'Rascunho digitado em outra sessão.', R + 'trocar de modo preserva o texto digitado');
    await page.clock.runFor(1500);
    ok((await lerStore(page, 'redText')) === 'Rascunho digitado em outra sessão.', R + 'trocar de modo não mexe no rascunho salvo');
    // digitando, o cronômetro começa na primeira tecla
    await page.locator('[data-red="folha"] textarea').pressSequentially(' x'); await page.clock.runFor(10000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '02:10', R + 'digitar a primeira tecla dispara o cronômetro');
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Começar do zero")'); await page.clock.runFor(1500);
    ok((await lerStore(page, 'redTempoMs')) === 0, R + '"Começar do zero" zera o tempo junto com o rascunho');
  } finally { await ctx.close(); }
}
```

Na lista: `const blocos = [arranjo, papel];`. Se a faixa "Rascunho salvo" não estiver visível nesse ponto (ela some depois de editar o texto), semeie de novo e clique em "Começar do zero" antes de digitar; o que o caso prova é `redTempoMs === 0`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: FALHA em `papel` (`[data-red="modo-mao"]` não existe).

- [ ] **Step 3: Estado e as três listas**

Estado inicial, na linha de `redText:this._load('redText', '')`: acrescente `redTempoMs:this._load('redTempoMs', 0),`. Ao lado dos estados de tela da Task 1:

```js
      redModoResposta:(String(this._load('redText','')||'').trim()?'digitar':'mao'), redCronoOn:false, redCronoTick:0,
```

Em `_autosaveKeys()`: acrescente `'redTempoMs'` logo depois de `'redTextTs'` (se `redTextTs` não estiver nessa lista, procure onde `redText` está e ponha `redTempoMs` ao lado). Na lista de `_rehydrateFromLocal` (a que contém `'sessions','profile'`): idem. Em `AREA_PROPRIA`: `'redText','redTextTs','redTempoMs',`. Conferência final:

```bash
grep -c "'redTempoMs'" Catedra.dc.html
```

Expected: pelo menos 3 ocorrências entre aspas (as três listas). Rode também o teste que confere as listas juntas, se existir: `grep -n "_autosaveKeys" tests/run.mjs | head -3`.

- [ ] **Step 4: Métodos do cronômetro e do modo**

Abaixo dos métodos da Task 1:

```js
  // Cronômetro da resposta. `redTempoMs` é o acumulado SALVO; o trecho em curso vive em
  // this._redCronoDesde e é "dobrado" para o estado a cada 15 s, ao pausar e quando a janela
  // some — dobrar a cada segundo recarimbaria a chave e acordaria o sync à toa.
  _redFmtTempo(ms){ const s=Math.max(0,Math.floor((+ms||0)/1000)); const p=(n)=>String(n).padStart(2,'0');
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
    return h?(h+':'+p(m)+':'+p(s%60)):(p(m)+':'+p(s%60)); }
  _redTempoAgora(){ return (+this.state.redTempoMs||0) + (this._redCronoDesde?(Date.now()-this._redCronoDesde):0); }
  _redCronoDobrar(){ if(!this._redCronoDesde) return; const agora=Date.now();
    const soma=(+this.state.redTempoMs||0)+(agora-this._redCronoDesde); this._redCronoDesde=agora;
    this.setState({redTempoMs:soma}); }
  _redCronoIniciar(){ if(this._redCronoDesde) return; this._redCronoDesde=Date.now(); this._redCronoDobra=Date.now();
    this.setState({redCronoOn:true});
    if(!this._redCronoT) this._redCronoT=setInterval(()=>{
      // quem decide se ainda vale contar é o tique: a view muda por vários caminhos
      if(this.state.view!=='redacao' || this.state.redResult || this.state.redBusy || !(this.state.redEnunciado||'').trim()){ this._redCronoPausar(); return; }
      if(Date.now()-this._redCronoDobra>=15000){ this._redCronoDobra=Date.now(); this._redCronoDobrar(); }
      this.setState({redCronoTick:Date.now()});
    },1000); }
  _redCronoPausar(){ if(this._redCronoT){ clearInterval(this._redCronoT); this._redCronoT=null; }
    if(this._redCronoDesde){ const soma=(+this.state.redTempoMs||0)+(Date.now()-this._redCronoDesde); this._redCronoDesde=0;
      this.setState({redTempoMs:soma, redCronoOn:false}); }
    else if(this.state.redCronoOn) this.setState({redCronoOn:false}); }
  _redCronoZerar(){ if(this._redCronoT){ clearInterval(this._redCronoT); this._redCronoT=null; } this._redCronoDesde=0;
    this.setState({redTempoMs:0, redCronoOn:false});
    try{ localStorage.setItem(this._chave('redTempoMs'),JSON.stringify(0)); }catch(_){} }
  toggleRedCrono = ()=>{ if(this.state.redBusy) return; if(this._redCronoDesde) this._redCronoPausar(); else this._redCronoIniciar(); };
  setRedModo = (e)=>{ const m=e.currentTarget.dataset.m==='digitar'?'digitar':'mao';
    if(m===this.state.redModoResposta || this.state.redBusy) return;
    this.setState({redModoResposta:m}); };
```

No `visibilitychange` já existente (linha ~7728, o que chama `this._saveTimer()`), dentro do ramo `hidden`, acrescente `try{ this._redCronoPausar(); }catch(_){}` ANTES da gravação pendente, para o tempo dobrado entrar nela. Em `componentWillUnmount`: `if(this._redCronoT) clearInterval(this._redCronoT);`.

Em `onRedText`, dispare na primeira tecla:

```js
  onRedText = (e)=>{ if(!this._redCronoDesde && !this.state.redBusy) this._redCronoIniciar();
    this.setState({redText:e.currentTarget.value, redTextTs:Date.now()}); };
```

Zerar junto com o rascunho: chame `this._redCronoZerar();` no começo de `redZerarRascunho` (depois do `confirm`), de `redReset` (depois do `confirm`) e de `_abrirDiscursiva` (antes do `setState`), e acrescente `redModoResposta:'mao'` ao `setState` de `redReset` e de `_abrirDiscursiva`. Em `submitRed`: `this._redCronoPausar();` logo depois da checagem do gabarito; `const _tempoMs=this._redTempoAgora();` antes de montar `entry`; acrescente `tempoMs:_tempoMs` ao objeto `entry`; depois de gravar o histórico, `this._redCronoZerar();`.

- [ ] **Step 5: Template da folha — seletor de modo, cronômetro e painel "À mão"**

Substitua o miolo de `[data-red="folha"]` por:

```html
<div class="ct-folha-barra">
  <div class="ct-seg" role="group" aria-label="Como você vai responder">
    <button data-red="modo-mao" data-m="mao" onclick="{{ setRedModo }}" aria-pressed="{{ redModoMao }}">À mão</button>
    <button data-red="modo-digitar" data-m="digitar" onclick="{{ setRedModo }}" aria-pressed="{{ redModoDigitar }}">Digitar</button>
  </div>
  <span class="ct-folha-crono" data-red="crono" role="timer" aria-label="Tempo de prova">{{ redCronoTxt }}</span>
</div>
<sc-if value="{{ redModoMao }}" hint-placeholder-val="{{ true }}">
  <div class="ct-mesa-corpo ct-folha-mao">
    <div class="ct-eb">Faça à mão</div>
    <p class="ct-folha-mao-tit">Escreva na sua folha, como na prova.</p>
    <p class="ct-nota">{{ redMaoDica }}</p>
    <div class="ct-mesa-linha" style="margin-top:var(--ct-e4);">
      <button class="ct-btn-2" data-red="crono-btn" onclick="{{ toggleRedCrono }}" aria-pressed="{{ redCronoOn }}">{{ redCronoBtnTxt }}</button>
    </div>
  </div>
</sc-if>
<sc-if value="{{ redModoDigitar }}" hint-placeholder-val="{{ false }}">
  <div class="ct-mesa-corpo">
    <p class="ct-nota" data-red="sugestao-papel">A prova é manuscrita: treinar à mão rende mais.
      <button class="ct-mesa-acao" data-m="mao" onclick="{{ setRedModo }}">Fazer à mão</button></p>
    <!-- MANTER: cabeçalho "Sua resposta" + contador, o <textarea> da resposta e a linha do botão submitRed (a Task 3 refaz este trecho) -->
  </div>
</sc-if>
```

Bindings no `render()`:

```js
      redModoMao:this.state.redModoResposta!=='digitar', redModoDigitar:this.state.redModoResposta==='digitar', setRedModo:this.setRedModo,
      redCronoTxt:this._redFmtTempo(this._redTempoAgora()), redCronoOn:!!this.state.redCronoOn, toggleRedCrono:this.toggleRedCrono,
      redCronoBtnTxt:this.state.redCronoOn?'Pausar':((+this.state.redTempoMs||0)>0?'Continuar':'Começar'),
      redMaoDica:(()=>{ const l=this._redLimiteLinhas(this.state.redEnunciado);
        return (l?('A banca dá até '+l+' linhas. '):'')+'Ligue o cronômetro, responda no papel e, ao terminar, confira o padrão de respostas quesito a quesito.'; })(),
```

CSS:

```css
.ct-folha-barra { display: flex; align-items: center; gap: var(--ct-e3); flex-wrap: wrap; padding: var(--ct-e3) var(--ct-e5); border-bottom: 1px solid var(--border); }
.ct-folha-crono { margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: var(--fs-md); color: var(--ink); }
.ct-seg { display: inline-flex; padding: 2px; border-radius: var(--radius); background: var(--surface2); border: 1px solid var(--border); }
.ct-seg > button { min-height: var(--ct-alvo-toque); padding: 0 var(--ct-e4); border: none; background: transparent; color: var(--text2); font: inherit; font-size: var(--fs-sm); font-weight: 600; border-radius: calc(var(--radius) - 2px); cursor: pointer; }
.ct-seg > button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px color-mix(in srgb, var(--ink) 16%, transparent); }
.ct-seg > button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ct-folha-mao-tit { font-family: var(--display); font-size: var(--fs-2xl); font-weight: 600; color: var(--ink); margin: var(--ct-e2) 0 var(--ct-e2); line-height: 1.2; }
```

Antes de criar `.ct-seg`, confira se já existe um segmentado no sistema (`grep -n "ct-seg\|ct-abas\|aria-pressed" catedra-ui.css | head`); se houver componente equivalente, use-o e não crie outro.

- [ ] **Step 6: Rodar e ver passar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: `arranjo` e `papel` verdes.

- [ ] **Step 7: Commit**

```bash
git add tests/redacao-mesa.mjs Catedra.dc.html catedra-ui.css
git commit -m "A discursiva passa a sugerir fazer à mão, com cronômetro que guarda o tempo da resposta

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: A folha pautada (modo "Digitar") e o modo foco

**Files:**
- Modify: `Catedra.dc.html` (template do ramo `redModoDigitar`; métodos; bindings; `componentDidMount`/onde a view é montada para o `ResizeObserver`)
- Modify: `catedra-ui.css`
- Test: `tests/redacao-mesa.mjs`

**Interfaces:**
- Consumes: `redModoDigitar`, `_redFmtTempo`, `_redCronoIniciar`, `_redLimiteLinhas`.
- Produces: estado de tela `redLinhasN:number|null` (null = folha estreita, vale a estimativa), `redFoco:boolean`; métodos `_redMedirFolha()`, `toggleRedFoco()`; bindings `redLinhasTxt`, `redBarraShow`, `redBarraStyle`, `redSalvoTxt`, `redPautaNums`, `redPautaShow`. Atributo `data-red-foco` em `document.documentElement`.

- [ ] **Step 1: Testes que falham — bloco `folha`**

```js
async function folha(pageDaSuite, base, ok, R) {
  const linha = 'palavra '.repeat(11).trim();           // ~1 linha de prova
  const texto = n => Array.from({ length: n }, () => linha).join('\n');
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { redText: texto(5), redTextTs: Date.now() - 60e3 }); await abrirRedacao(page, base);
    const m = await page.evaluate(() => { const t = document.querySelector('[data-red="folha"] textarea'); const cs = getComputedStyle(t);
      const passo = /(\d+(?:\.\d+)?)px\)?\s*$/.exec(cs.backgroundSize) || /(\d+(?:\.\d+)?)px/.exec(cs.backgroundSize.split(' ').pop());
      return { lh: parseFloat(cs.lineHeight), bg: cs.backgroundImage, passo: passo ? parseFloat(passo[1]) : null }; });
    ok(/gradient/.test(m.bg) && m.passo != null && Math.abs(m.passo - m.lh) < 0.6, R + 'pauta desenhada no passo exato da linha do texto');
    ok((await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ').includes('5 / 30 linhas'), R + 'contador mostra as linhas escritas contra o limite');
    ok(await page.locator('[data-red="pauta"] > *').count() >= 30, R + 'numeração cobre pelo menos o limite da banca');
    const cor = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-red="barra"] > div')).backgroundColor);
    const tok = n => page.evaluate(n => { const d = document.createElement('div'); d.style.background = 'var(' + n + ')'; document.querySelector('[data-red="folha"]').appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }, n);
    ok(await cor() === await tok('--accent'), R + 'barra na cor do tema dentro do limite');
    await page.fill('[data-red="folha"] textarea', texto(28)); await page.waitForTimeout(300);
    ok(await cor() === await tok('--warn') && /faltam 2/.test(await page.textContent('[data-red="linhas"]')), R + 'perto do limite a barra avisa e o rótulo diz quantas faltam');
    await page.fill('[data-red="folha"] textarea', texto(32)); await page.waitForTimeout(300);
    ok(await cor() === await tok('--danger') && /passou 2/.test(await page.textContent('[data-red="linhas"]')), R + 'acima do limite a barra e o rótulo dizem quanto passou');
    ok(/Salvo às \d{2}:\d{2}/.test(await page.textContent('[data-red="salvo"]')), R + 'a folha diz a hora em que salvou');
    // modo foco
    const nav = () => page.evaluate(() => { const a = document.querySelector('aside'); const r = a.getBoundingClientRect(); return r.width * r.height; });
    ok(await nav() > 0, R + 'navegação visível fora do foco');
    await page.click('[data-red="foco"]'); await page.waitForTimeout(200);
    ok(await nav() === 0 && await page.locator('[data-red="questao"]').isVisible() && await page.locator('[data-red="folha"]').isVisible(), R + 'foco esconde a navegação e mantém questão e folha');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(await nav() > 0, R + 'Esc sai do foco');
    // folha estreita: estimativa por palavras, sem numeração
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    await page.fill('[data-red="folha"] textarea', texto(4)); await page.waitForTimeout(300);
    ok(/4 \/ 30 linhas/.test((await page.textContent('[data-red="linhas"]')).replace(/\s+/g, ' ')) && await page.locator('[data-red="pauta"]').count() === 0, R + 'em tela estreita vale a estimativa e a numeração some');
  } finally { await ctx.close(); }

  const s = await novoContexto(pageDaSuite);
  try {
    await semear(s.page, base, { redEnunciado: 'Disserte sobre tutela provisória.', redText: 'Um texto qualquer.', redTextTs: Date.now() });
    await abrirRedacao(s.page, base);
    ok(await s.page.locator('[data-red="barra"]').count() === 0 && /^\s*\d+ linhas?/.test(await s.page.textContent('[data-red="linhas"]')), R + 'sem limite no enunciado: sem barra e sem "/ L"');
  } finally { await s.ctx.close(); }
}
```

Na lista: `const blocos = [arranjo, papel, folha];`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: FALHA em `folha` ("pauta desenhada…").

- [ ] **Step 3: CSS da folha**

```css
/* A folha: mesma medida para a linha do texto e para o passo da pauta (um token só). */
.ct-folha { --ct-folha-linha: calc(var(--fs-lg) * 1.9); --ct-folha-medida: 62ch; display: flex; gap: var(--ct-e2); align-items: flex-start; }
.ct-folha-pauta { flex: none; width: 2.2em; padding-top: var(--ct-e3); text-align: right; font-family: var(--mono); font-size: var(--fs-2xs); color: var(--text3); user-select: none; }
.ct-folha-pauta > span { display: block; height: var(--ct-folha-linha); line-height: var(--ct-folha-linha); }
.ct-folha-campo { position: relative; flex: 1; min-width: 0; max-width: var(--ct-folha-medida); font-family: var(--display); font-size: var(--fs-lg); }
.ct-folha-campo textarea, .ct-folha-medidor {
  display: block; width: 100%; box-sizing: border-box; margin: 0; border: none; padding: var(--ct-e3) 0;
  font: inherit; line-height: var(--ct-folha-linha); color: var(--ink); white-space: pre-wrap; overflow-wrap: break-word; }
.ct-folha-campo textarea { min-height: calc(var(--ct-folha-linha) * 18 + var(--ct-e3) * 2); resize: none; overflow: hidden; outline: none; background-color: transparent;
  background-image: linear-gradient(to bottom, transparent calc(100% - 1px), var(--border) calc(100% - 1px));
  background-size: 100% var(--ct-folha-linha); background-position: 0 var(--ct-e3); background-repeat: repeat-y; }
.ct-folha-campo textarea:focus-visible { box-shadow: inset 0 -2px 0 var(--accent); }
.ct-folha-medidor { position: absolute; left: 0; top: 0; visibility: hidden; pointer-events: none; height: auto; }
.ct-folha-progresso { height: 3px; background: var(--surface2); }
.ct-folha-progresso > div { height: 100%; transition: width .2s ease, background-color .2s ease; }
@media (prefers-reduced-motion: reduce) { .ct-folha-progresso > div { transition: none; } }
.ct-folha-rodape { display: flex; align-items: center; gap: var(--ct-e3); flex-wrap: wrap; border-top: 1px solid var(--border); padding: var(--ct-e3) var(--ct-e5); }
.ct-folha-salvo { font-size: var(--fs-sm); color: var(--text2); display: inline-flex; align-items: center; gap: var(--ct-e1); }
/* Modo foco: só a mesa. O atributo vai na raiz porque a navegação mora fora da view. */
[data-red-foco] aside, [data-red-foco] [data-red-fora-do-foco] { display: none !important; }
```

A pauta usa `background-size: 100% var(--ct-folha-linha)` — é esse valor em px que o teste lê em `backgroundSize`. Marque com `data-red-fora-do-foco` os elementos da view da Redação que não são a mesa nem a faixa do espelho: a barra de passos/título no topo da view, a faixa "Rascunho salvo", e a barra inferior do mobile se existir (`grep -n "barra inferior\|bottom" Catedra.dc.html | head`).

- [ ] **Step 4: Métodos**

```js
  // Mede a folha. Com a folha na medida cheia, conta as linhas RENDERIZADAS (medidor
  // invisível com a mesma tipografia); mais estreita que a medida, devolve null e quem
  // mostra o número cai na estimativa por palavras — nunca dois números ao mesmo tempo.
  _redMedirFolha = ()=>{
    try{
      const ta=document.querySelector('[data-red="folha"] textarea'); const med=document.querySelector('.ct-folha-medidor');
      if(!ta||!med){ if(this.state.redLinhasN!=null) this.setState({redLinhasN:null}); return; }
      const cs=getComputedStyle(ta); const lh=parseFloat(cs.lineHeight)||1;
      const pad=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
      const txt=String(ta.value||'');
      med.textContent = txt + (/\n$/.test(txt)?'​':'');
      const linhas = txt.trim()? Math.max(1, Math.round((med.offsetHeight-pad)/lh)) : 0;
      ta.style.height = Math.max(med.offsetHeight, 0)+'px';      // a folha cresce com o texto: sem rolagem interna, a numeração acompanha
      const caixa=ta.parentElement; const max=parseFloat(getComputedStyle(caixa).maxWidth);
      const cheia = !(max>0) || caixa.offsetWidth >= max-1;
      const n = cheia? linhas : null;
      if(n!==this.state.redLinhasN) this.setState({redLinhasN:n});
    }catch(_){}
  };
  _redVigiarFolha(){ try{
      const caixa=document.querySelector('.ct-folha-campo');
      if(caixa===this._redFolhaVista) return;
      if(this._redFolhaRO){ this._redFolhaRO.disconnect(); this._redFolhaRO=null; }
      this._redFolhaVista=caixa; if(!caixa) return;
      if(typeof ResizeObserver==='function'){ this._redFolhaRO=new ResizeObserver(()=>this._redMedirFolha()); this._redFolhaRO.observe(caixa); }
      this._redMedirFolha();
    }catch(_){} }
  toggleRedFoco = ()=> this._redFocoPor(!this.state.redFoco);
  _redFocoPor(on){ this.setState({redFoco:!!on});
    try{ if(on) document.documentElement.setAttribute('data-red-foco',''); else document.documentElement.removeAttribute('data-red-foco'); }catch(_){}
    if(on && !this._redFocoEsc){ this._redFocoEsc=(e)=>{ if(e.key==='Escape' && this.state.redFoco) this._redFocoPor(false); }; document.addEventListener('keydown', this._redFocoEsc); } }
```

Ligações:
- Em `onRedText`, depois do `setState`: `requestAnimationFrame(this._redMedirFolha);`.
- `_redVigiarFolha()` roda depois de cada pintura: no `componentDidUpdate` existente (linha ~8464), acrescente `if(this.state.view==='redacao') this._redVigiarFolha();`. Não há laço: `_redVigiarFolha` só mede quando a caixa da folha é outra, e `_redMedirFolha` só chama `setState` quando o número muda.
- Sair do foco ao sair da view: no tique do cronômetro não basta (pode estar pausado). Em `_irPara`, no começo: `if(this.state.redFoco && v!=='redacao') this._redFocoPor(false);`. Em `submitRed`, antes do `setState` de `redBusy`: `if(this.state.redFoco) this._redFocoPor(false);`.
- Estado inicial: `redLinhasN:null, redFoco:false,`.

- [ ] **Step 5: Template do ramo "Digitar"**

Substitua o trecho marcado MANTER da Task 2 (deixando a linha `sugestao-papel` acima) e acrescente à `.ct-folha-barra`, antes do cronômetro, o contador e o botão de foco:

```html
<!-- na .ct-folha-barra, só no modo digitar -->
<sc-if value="{{ redModoDigitar }}" hint-placeholder-val="{{ false }}">
  <span data-red="linhas" class="ct-dado" aria-live="polite" style="margin-left:auto;">{{ redLinhasTxt }} <span style="color:var(--text3);">· {{ redWords }} palavras</span></span>
  <button class="ct-mesa-acao" data-red="foco" onclick="{{ toggleRedFoco }}" aria-pressed="{{ redFoco }}" aria-label="Modo foco" title="Modo foco">
    <svg class="ct-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="{{ redFocoIco }}"></use></svg>
  </button>
</sc-if>
```

Com o contador ocupando o `margin-left:auto`, tire o `margin-left:auto` de `.ct-folha-crono` quando ele vier depois (use `.ct-folha-barra > [data-red="linhas"] ~ .ct-folha-crono { margin-left: 0; }`).

```html
<!-- logo abaixo da .ct-folha-barra, só no modo digitar -->
<sc-if value="{{ redBarraShow }}" hint-placeholder-val="{{ false }}">
  <div class="ct-folha-progresso" data-red="barra" role="progressbar" aria-label="Linhas usadas" aria-valuemin="0" aria-valuemax="{{ redLimiteN }}" aria-valuenow="{{ redLinhasAgora }}"><div style="{{ redBarraStyle }}"></div></div>
</sc-if>

<!-- corpo do modo digitar -->
<div class="ct-folha">
  <sc-if value="{{ redPautaShow }}" hint-placeholder-val="{{ false }}">
    <div class="ct-folha-pauta" data-red="pauta" aria-hidden="true"><sc-for list="{{ redPautaNums }}" as="n"><span>{{ n }}</span></sc-for></div>
  </sc-if>
  <div class="ct-folha-campo">
    <textarea value="{{ redText }}" oninput="{{ onRedText }}" readonly="{{ redBusy }}" aria-label="Sua resposta" placeholder="Escreva como escreveria na prova: enfrente o comando na ordem em que ele foi feito, fundamente com o dispositivo e conclua de forma expressa."></textarea>
    <div class="ct-folha-medidor" aria-hidden="true"></div>
  </div>
</div>
<div class="ct-folha-rodape">
  <span class="ct-folha-salvo" data-red="salvo">{{ redSalvoTxt }}</span>
  <span style="font-size:var(--fs-sm);color:var(--text3);line-height:1.5;flex:1;min-width:200px;">{{ redDicaEtapa2 }}</span>
  <button class="ct-btn" onclick="{{ submitRed }}" disabled="{{ redBtnDisabled }}" aria-busy="{{ redBusy }}">{{ redBtnLabel }}</button>
</div>
```

A `.ct-folha` fica dentro de `.ct-mesa-corpo`; a `.ct-folha-rodape` fica fora, colada na base do cartão. Se `<use href="{{ … }}">` não reagir à troca no runtime (armadilha conhecida com `src="{{ }}"`), use dois `<sc-if>` com os dois ícones fixos (`#ct-i-maximize-2` e `#ct-i-minimize-2`, acrescentados ao sprite na Task 1).

- [ ] **Step 6: Bindings**

```js
      ...(()=>{ const lim=this._redLimiteLinhas(this.state.redEnunciado);
        const est=Math.ceil(redWords/11);
        const med=this.state.redLinhasN; const n=(med!=null?med:est);
        const base=lim?(n+' / '+lim+' linhas'):(n+(n===1?' linha':' linhas'));
        const extra=!lim?'':(n>lim?(' · passou '+(n-lim)):(n>=lim*0.9?(' · faltam '+(lim-n)):''));
        const cor=!lim?'var(--accent)':(n>lim?'var(--danger)':(n>=lim*0.9?'var(--warn)':'var(--accent)'));
        const ts=+this.state.redTextTs||0;
        const tot=Math.max(18, n+1, lim||0);
        return { redLinhasTxt:base+extra, redLinhasAgora:String(n), redLimiteN:String(lim||0),
          redBarraShow:!!lim, redBarraStyle:'width:'+(lim?Math.min(100,Math.round(n/lim*100)):0)+'%;background-color:'+cor+';',
          redPautaShow:med!=null, redPautaNums:Array.from({length:tot},(_,i)=>String(i+1)),
          redSalvoTxt:ts?('Salvo às '+new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):'Ainda não salvo' }; })(),
      redFoco:!!this.state.redFoco, toggleRedFoco:this.toggleRedFoco, redFocoIco:this.state.redFoco?'#ct-i-minimize-2':'#ct-i-maximize-2',
```

`redWords` já existe no `render()` (definido antes do objeto de retorno). O binding antigo `redLimiteTxt` deixa de ser usado no template: remova-o do objeto se `grep -n "redLimiteTxt" Catedra.dc.html tests/` não mostrar outro uso.

- [ ] **Step 7: Rodar e ver passar; olhar a captura**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: `arranjo`, `papel`, `folha` verdes. Acrescente ao fim do primeiro contexto de `folha` uma captura (`tests/_capturas/mesa-folha.png`, viewport 1280, texto de 12 linhas) e confira no olho: a linha do texto assenta sobre a pauta do começo ao fim, os números ficam na altura das linhas, nada treme ao digitar.

- [ ] **Step 8: Commit**

```bash
git add tests/redacao-mesa.mjs Catedra.dc.html catedra-ui.css
git commit -m "Quem digita a discursiva escreve numa folha pautada que conta as linhas contra o limite da banca e mostra quando salvou

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: O campo do espelho

**Files:**
- Modify: `Catedra.dc.html` (template dentro de `[data-red="espelho"]`: os `sc-if` de `redEspelhoOculto` e `redEspelhoAberto`; `importRedGab`; `onRedGab`; bindings)
- Modify: `catedra-ui.css`
- Test: `tests/redacao-mesa.mjs`

**Interfaces:**
- Consumes: `_redQuesitos(gab)` → `[{n, texto, max, escala}]` (existente).
- Produces: `_redNum(x):string` (número em pt-BR com 2 casas); `_redEspelhoResumo():{qs, total, estado:'quesitos'|'prosa'|'vazio', txt}`; estado de tela `redGabVista:'quesitos'|'texto'|''`, `redGabErro:string`, `redGabOk:string`; bindings `redGabEstadoTxt`, `redGabQuesitos` (lista `{n, texto, pts}`), `redGabVistaQuesitos`, `redGabVistaTexto`, `redGabTemQuesitos`, `redGabMsg`, `redGabMsgAlerta`, `setRedGabVista`.

- [ ] **Step 1: Testes que falham — bloco `espelho`**

```js
async function espelho(pageDaSuite, base, ok, R) {
  const { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base, { redText: 'Texto digitado.', redTextTs: Date.now() }); await abrirRedacao(page, base);
    await page.evaluate(() => { const c = window.__catedraApp; c.setState({ redEspelhoOculto: true }); }); await page.waitForTimeout(200);
    const est = (await page.textContent('[data-red="gab-estado"]')).replace(/\s+/g, ' ');
    ok(/3 quesitos/.test(est) && /1,00 ponto/.test(est) && /pronto para corrigir/.test(est), R + 'espelho guardado diz quantos quesitos e pontos reconheceu');
    ok(!/estabilização/.test(await page.textContent('[data-red="espelho"]')), R + 'espelho guardado não entrega o conteúdo dos quesitos');
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Ver mesmo assim")'); await page.waitForTimeout(200);
    ok(await page.getAttribute('[data-red="gab-vista-quesitos"]', 'aria-pressed') === 'true' && await page.locator('[data-red="gab-quesito"]').count() === 3, R + 'aberto, o espelho lista os 3 quesitos');
    ok(/0,30/.test(await page.textContent('[data-red="gab-quesito"] >> nth=0')) && /0,40/.test(await page.textContent('[data-red="gab-quesito"] >> nth=2')), R + 'cada quesito mostra a pontuação máxima');
    await page.click('[data-red="gab-vista-texto"]');
    ok(await page.locator('[data-red="espelho"] textarea').count() === 1, R + 'vista Texto mostra o espelho editável');
    await page.fill('[data-red="espelho"] textarea', 'A resposta deve reconhecer a estabilização da tutela e afastar a coisa julgada.'); await page.waitForTimeout(200);
    ok(/prosa/i.test(await page.textContent('[data-red="gab-estado"]')) && await page.locator('[data-red="gab-vista-quesitos"]').count() === 0, R + 'espelho em prosa avisa e fica só na vista Texto');
    await page.fill('[data-red="espelho"] textarea', ''); await page.waitForTimeout(200);
    ok(/Falta o espelho/.test(await page.textContent('[data-red="gab-estado"]')), R + 'sem espelho, a faixa diz que falta');
    // importação: erro fica na faixa, com role=alert
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Importar PDF/TXT")')]);
    await fc.setFiles({ name: 'espelho.pdf', mimeType: 'application/pdf', buffer: Buffer.from('isto não é um pdf') });
    await page.waitForSelector('[data-red="espelho"] [role="alert"]', { timeout: 8000 });
    ok(/Não consegui ler espelho\.pdf/.test(await page.textContent('[data-red="espelho"] [role="alert"]')), R + 'falha de importação aparece na faixa do espelho');
    const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Importar PDF/TXT")')]);
    await fc2.setFiles({ name: 'espelho.txt', mimeType: 'text/plain', buffer: Buffer.from('1. Reconhece a estabilização da tutela (0,50 ponto)\n2. Afasta a coisa julgada material (0,50 ponto)') });
    await page.waitForFunction(() => /espelho\.txt importado/.test((document.querySelector('[data-red="espelho"]') || {}).textContent || ''), null, { timeout: 8000 });
    ok(/2 quesitos/.test(await page.textContent('[data-red="gab-estado"]')), R + 'importação diz o arquivo e atualiza a contagem');
  } finally { await ctx.close(); }
}
```

Na lista: `const blocos = [arranjo, papel, folha, espelho];`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: FALHA em `espelho` (`[data-red="gab-estado"]` não existe).

- [ ] **Step 3: Métodos**

```js
  _redNum(x){ return (Math.round((+x||0)*100)/100).toFixed(2).replace('.',','); }
  // O que o espelho em uso permite: correção por quesito, por cobertura, ou nada.
  _redEspelhoResumo(){ const g=String(this.state.redGabarito||'');
    if(!g.trim()) return {qs:[], total:0, estado:'vazio', txt:'Falta o espelho'};
    const qs=this._redQuesitos(g);
    if(!qs.length) return {qs, total:0, estado:'prosa', txt:'Espelho em prosa — a correção será por cobertura'};
    const total=qs.reduce((a,q)=>a+(q.max!=null?q.max:1),0);
    return {qs, total, estado:'quesitos',
      txt:qs.length+(qs.length===1?' quesito':' quesitos')+' · '+this._redNum(total)+(total===1?' ponto':' pontos')+' · pronto para corrigir'}; }
  setRedGabVista = (e)=> this.setState({redGabVista:e.currentTarget.dataset.v==='texto'?'texto':'quesitos'});
```

`total===1` com "1,00 ponto" é o que o teste espera para a soma 0,30+0,30+0,40.

Em `onRedGab`, limpe as mensagens: troque o `setState` final por `this.setState({redGabarito:v, redGabErro:'', redGabOk:''});`.

Reescreva `importRedGab` trocando os toasts pelo estado da faixa:

```js
  importRedGab = ()=>{ try{ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/pdf,.pdf,text/plain,.txt';
    inp.onchange=async ()=>{ const f=inp.files&&inp.files[0]; if(!f) return; this.setState({redGabBusy:true, redGabFile:f.name, redGabErro:'', redGabOk:''});
      try{ let txt=''; if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){ txt=await this._extractEditalPdf(f); }
        else { txt=await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result||'')); r.onerror=rej; r.readAsText(f); }); }
        if(!String(txt||'').trim()) throw new Error('vazio');
        this._deixaDeSerSugerido();   // espelho vindo de fora não é mais o sugerido
        this.setState({redGabarito:String(txt).trim(), redGabBusy:false, redGabOk:f.name+' importado', redGabVista:''});
      }catch(err){ this.setState({redGabBusy:false, redGabErro:'Não consegui ler '+f.name}); } };
    inp.click(); }catch(e){} };
```

Estado inicial: `redGabVista:'', redGabErro:'', redGabOk:'',`. Limpe os três em `redReset` e `_abrirDiscursiva`.

- [ ] **Step 4: Bindings**

```js
      ...(()=>{ const r=this._redEspelhoResumo(); const tem=r.estado==='quesitos';
        const vista=tem?(this.state.redGabVista||'quesitos'):'texto';
        const msg=this.state.redGabBusy?('Lendo '+(this.state.redGabFile||'arquivo')+'…'):(this.state.redGabErro||this.state.redGabOk||'');
        return { redGabEstadoTxt:r.txt, redGabTemQuesitos:tem, redGabVazio:r.estado==='vazio',
          redGabVistaQuesitos:vista==='quesitos', redGabVistaTexto:vista==='texto', setRedGabVista:this.setRedGabVista,
          redGabQuesitos:r.qs.map((q,i)=>({ i:String(i), n:String(q.n), texto:q.texto,
            pts:(q.escala&&q.escala.length?('escala '+q.escala.map(x=>this._redNum(x)).join(' / ')):('até '+this._redNum(q.max!=null?q.max:1))) })),
          redGabMsg:msg, redGabMsgShow:!!msg, redGabMsgAlerta:!!this.state.redGabErro && !this.state.redGabBusy }; })(),
```

- [ ] **Step 5: Template**

Faixa guardada (substitui o miolo do `sc-if redEspelhoOculto`):

```html
<div class="ct-card ct-mesa-linha" style="justify-content:space-between;gap:var(--ct-e4);">
  <span class="ct-ladrilho" aria-hidden="true"><svg class="ct-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#ct-i-lock"></use></svg></span>
  <div style="flex:1;min-width:200px;">
    <div class="ct-eb">{{ redEspeloTitulo }}</div>
    <div data-red="gab-estado" style="font-size:var(--fs-base);color:var(--ink);font-weight:600;margin-top:var(--ct-e1);">{{ redGabEstadoTxt }}</div>
    <div class="ct-nota" style="margin-top:var(--ct-e1);max-width:520px;">O conteúdo aparece depois que você entregar. Saber que existe um quesito de preclusão já entrega a resposta.</div>
  </div>
  <button onclick="{{ revelarEspelho }}" class="ct-btn-2">Ver mesmo assim</button>
</div>
```

Aberto (substitui o miolo do `sc-if redEspelhoAberto`):

```html
<div class="ct-card">
  <div class="ct-mesa-linha" style="justify-content:space-between;gap:var(--ct-e3);">
    <div>
      <div class="ct-eb">Espelho / padrão de respostas</div>
      <div data-red="gab-estado" style="font-size:var(--fs-base);color:var(--ink);font-weight:600;margin-top:var(--ct-e1);">{{ redGabEstadoTxt }}</div>
    </div>
    <div class="ct-mesa-linha">
      <sc-if value="{{ redGabTemQuesitos }}" hint-placeholder-val="{{ false }}">
        <div class="ct-seg" role="group" aria-label="Como ver o espelho">
          <button data-red="gab-vista-quesitos" data-v="quesitos" onclick="{{ setRedGabVista }}" aria-pressed="{{ redGabVistaQuesitos }}">Quesitos</button>
          <button data-red="gab-vista-texto" data-v="texto" onclick="{{ setRedGabVista }}" aria-pressed="{{ redGabVistaTexto }}">Texto</button>
        </div>
      </sc-if>
      <button onclick="{{ importRedGab }}" class="ct-btn-2" disabled="{{ redGabBusy }}">Importar PDF/TXT</button>
    </div>
  </div>
  <sc-if value="{{ redGabMsgShow }}" hint-placeholder-val="{{ false }}">
    <sc-if value="{{ redGabMsgAlerta }}" hint-placeholder-val="{{ false }}"><p role="alert" class="ct-nota" style="color:var(--danger);margin-top:var(--ct-e2);">{{ redGabMsg }}</p></sc-if>
    <sc-if value="{{ redGabMsgNormal }}" hint-placeholder-val="{{ false }}"><p role="status" class="ct-nota" style="margin-top:var(--ct-e2);">{{ redGabMsg }}</p></sc-if>
  </sc-if>
  <sc-if value="{{ redGabVistaQuesitos }}" hint-placeholder-val="{{ false }}">
    <ol class="ct-gab-lista">
      <sc-for list="{{ redGabQuesitos }}" as="q"><li data-red="gab-quesito"><span class="ct-gab-n">{{ q.n }}</span><span class="ct-gab-t">{{ q.texto }}</span><span class="ct-dado ct-gab-p">{{ q.pts }}</span></li></sc-for>
    </ol>
  </sc-if>
  <sc-if value="{{ redGabVistaTexto }}" hint-placeholder-val="{{ true }}">
    <!-- MANTER: o <textarea value="{{ redGabarito }}" oninput="{{ onRedGab }}" …> atual e a linha "{{ redGabWords }} palavras no espelho" -->
  </sc-if>
</div>
```

Acrescente o binding `redGabMsgNormal:!!msg && !(…alerta)` no bloco do Step 4 (`redGabMsgNormal: !!msg && !(!!this.state.redGabErro && !this.state.redGabBusy)`). Se `var(--danger)` como texto não passar 4,5:1 sobre `--surface` em algum tema, use `color-mix(in srgb, var(--danger) 72%, var(--ink))` (a Task 6 mede).

CSS:

```css
.ct-gab-lista { list-style: none; margin: var(--ct-e3) 0 0; padding: 0; display: flex; flex-direction: column; }
.ct-gab-lista > li { display: grid; grid-template-columns: 2em minmax(0, 1fr) auto; gap: var(--ct-e3); align-items: baseline; padding: var(--ct-e3) 0; border-top: 1px solid var(--border); font-size: var(--fs-base); line-height: 1.55; color: var(--ink); }
.ct-gab-n { font-family: var(--mono); color: var(--text2); text-align: right; }
.ct-gab-p { white-space: nowrap; }
@container mesa (max-width: 560px) { .ct-gab-lista > li { grid-template-columns: 2em minmax(0, 1fr); } .ct-gab-p { grid-column: 2; } }
```

A lista do espelho está fora de `.ct-mesa-caixa`; mova o `<div data-red="espelho">` para DENTRO de `.ct-mesa-caixa` (depois de `.ct-mesa`) para a container query valer.

- [ ] **Step 6: Rodar e ver passar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: quatro blocos verdes. Confira que nenhum outro teste esperava o toast "Gabarito importado" (`grep -n "Gabarito importado\|Não consegui ler o arquivo" tests/*.mjs`); se houver, aponte-o para o texto da faixa.

- [ ] **Step 7: Commit**

```bash
git add tests/redacao-mesa.mjs Catedra.dc.html catedra-ui.css
git commit -m "O espelho da discursiva diz quantos quesitos e pontos reconheceu e mostra a importação na própria faixa

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Conferência própria

**Files:**
- Modify: `Catedra.dc.html` (painel "À mão"; template do espelho; etapa 3 ~3654–3770; métodos; bindings `redOrigemLabel` ~19783)
- Modify: `catedra-ui.css`
- Test: `tests/redacao-mesa.mjs`

**Interfaces:**
- Consumes: `_redEspelhoResumo()`, `_redNum`, `_redCronoPausar`, `_redCronoZerar`, `_redTempoAgora`, `_redConceito(nota)`, `_normTopicos(arr)`, `_redSave(hist)`, `_redRegistrar(reg)`, `_redLimiteLinhas`.
- Produces: estado de tela `redConferindo:boolean`, `redConf:object` (índice do quesito → nota; `unica` → texto da nota única), `redLinhasMao:string`; métodos `terminarMao()`, `marcarConf(e)`, `onConfUnica(e)`, `onLinhasMao(e)`, `registrarConferencia()`, `_redConfOpcoes(q):number[]`; `res.propria===true` no resultado; entrada do histórico com `origem:'conferencia-propria'`, `tempoMs`, `linhas`.

- [ ] **Step 1: Testes que falham — bloco `conferencia`**

```js
async function conferencia(pageDaSuite, base, ok, R) {
  let { ctx, page } = await novoContexto(pageDaSuite);
  try {
    await semear(page, base); await abrirRedacao(page, base);
    await page.evaluate(() => window.__catedraApp.setState({ redEspelhoOculto: true }));
    await page.click('[data-red="crono-btn"]'); await page.clock.runFor(600000);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    await page.clock.runFor(30000);
    ok((await page.textContent('[data-red="crono"]')).trim() === '10:00', R + '"Terminei" congela o tempo');
    ok(await page.locator('[data-red="conf-item"]').count() === 3, R + 'conferência abre um item por quesito');
    const ops = await page.locator('[data-red="conf-item"] >> nth=0').locator('[data-red="conf-opcao"]').allTextContents();
    ok(ops.map(s => s.trim()).join('|') === '0,00|0,10|0,20|0,30', R + 'quesito com escala só oferece os degraus da banca');
    const ops3 = await page.locator('[data-red="conf-item"] >> nth=2').locator('[data-red="conf-opcao"]').allTextContents();
    ok(ops3.map(s => s.trim()).join('|') === '0,00|0,20|0,40', R + 'quesito sem escala oferece zero, metade e cheio');
    ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'registrar fica desabilitado enquanto falta quesito');
    const marcar = (i, txt) => page.locator('[data-red="conf-item"] >> nth=' + i).locator('[data-red="conf-opcao"]', { hasText: txt }).click();
    await marcar(0, '0,30'); await marcar(1, '0,10');
    ok(/0,40 \/ 1,00/.test(await page.textContent('[data-red="conf-soma"]')) && /falta 1/.test(await page.textContent('[data-red="conf-soma"]')), R + 'soma acompanha e diz quantos faltam');
    await marcar(2, '0,40');
    await page.fill('[data-red="linhas-mao"]', '33');
    ok(/passou 3 linhas/.test(await page.textContent('[data-red="linhas-mao-msg"]')), R + 'linhas informadas acima do limite avisam quanto passou');
    await page.fill('[data-red="linhas-mao"]', '28');
    ok(/dentro do limite/.test(await page.textContent('[data-red="linhas-mao-msg"]')), R + 'linhas dentro do limite são confirmadas');
    ok(!(await page.isDisabled('[data-red="conf-registrar"]')), R + 'com tudo marcado, registrar habilita');
    await page.click('[data-red="conf-registrar"]'); await page.waitForTimeout(400);
    ok(/8[.,]0/.test(await page.textContent('.ct-hero')), R + 'etapa 3 abre com a nota proporcional (0,80 de 1,00 → 8,0)');
    ok(/Conferência própria/i.test(await page.textContent('.ct-hero')), R + 'o resultado diz que é conferência própria');
    const corpo = await page.textContent('main');
    ok(!/Critérios/.test(corpo) && !/Pontos fortes/.test(corpo) && !/A melhorar/.test(corpo), R + 'blocos que dependem de IA não aparecem');
    await page.clock.runFor(1500);
    const h = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:red') || '[]')[0]);
    ok(!!h && h.origem === 'conferencia-propria' && h.nota === 8 && Math.abs(h.tempoMs - 600000) < 2000 && h.linhas === 28 && h.texto === '', R + 'histórico guarda nota, tempo e linhas da conferência');
    const ev = await lerStore(page, 'redHist');
    ok(Array.isArray(ev) && ev.length === 1 && ev[0].quesitos.length === 3 && ev[0].quesitos[1].nota === 0.1, R + 'a evolução recebe a nota por quesito');
    ok((await lerStore(page, 'redTempoMs')) === 0, R + 'depois de registrar, o cronômetro zera');
  } finally { await ctx.close(); }

  // Review Focus 2 e 4: números repetidos; espelho trocado no meio
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: '1. Reconhece a estabilização da tutela antecipada (0,50 ponto)\n1. Afasta a formação de coisa julgada (0,50 ponto)' });
    await abrirRedacao(page, base);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-item"]');
    await page.locator('[data-red="conf-item"] >> nth=0').locator('[data-red="conf-opcao"]', { hasText: '0,50' }).click();
    ok(await page.locator('[data-red="conf-item"] >> nth=1').locator('[data-red="conf-opcao"][aria-pressed="true"]').count() === 0, R + 'quesitos com o mesmo número não se marcam juntos');
    await page.click('[data-red="gab-vista-texto"]');
    await page.fill('[data-red="espelho"] textarea', '1. Quesito novo com outro conteúdo qualquer (1,00 ponto)'); await page.waitForTimeout(200);
    await page.click('[data-red="gab-vista-quesitos"]');
    ok(await page.locator('[data-red="conf-opcao"][aria-pressed="true"]').count() === 0 && await page.isDisabled('[data-red="conf-registrar"]'), R + 'trocar o espelho descarta as notas marcadas');
  } finally { await ctx.close(); }

  // Review Focus 5: espelho em prosa, nota única
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: 'A resposta deve reconhecer a estabilização da tutela e afastar a coisa julgada.' });
    await abrirRedacao(page, base);
    await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-unica"]');
    ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'nota única vazia não registra');
    await page.fill('[data-red="conf-unica"]', '12'); ok(await page.isDisabled('[data-red="conf-registrar"]'), R + 'nota única fora de 0 a 10 não registra');
    await page.fill('[data-red="conf-unica"]', '7,5'); ok(!(await page.isDisabled('[data-red="conf-registrar"]')), R + 'nota única aceita vírgula');
    await page.click('[data-red="conf-registrar"]'); await page.waitForTimeout(400);
    ok(/7[.,]5/.test(await page.textContent('.ct-hero')), R + 'nota única vira a nota do resultado');
  } finally { await ctx.close(); }

  // sem espelho: não há o que conferir
  ({ ctx, page } = await novoContexto(pageDaSuite));
  try {
    await semear(page, base, { redGabarito: '' }); await abrirRedacao(page, base);
    ok(/Colar ou importar o padrão/.test(await page.textContent('[data-red="terminei"]')), R + 'sem espelho, o botão pede o padrão antes de conferir');
    await page.click('[data-red="terminei"]'); await page.waitForTimeout(200);
    ok(await page.locator('[data-red="espelho"] textarea').count() === 1 && await page.locator('[data-red="conf-registrar"]').count() === 0, R + 'sem espelho, abre o campo para colar e não a conferência');
  } finally { await ctx.close(); }
}
```

Na lista: `const blocos = [arranjo, papel, folha, espelho, conferencia];`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: FALHA em `conferencia` (`[data-red="terminei"]` não existe).

- [ ] **Step 3: Métodos**

```js
  // ===== CONFERÊNCIA PRÓPRIA: fez à mão, confere o padrão por conta =====
  // Os degraus que a pessoa pode se dar num quesito: a escala da banca quando há; senão
  // zero, metade e cheio. Nota fora da escala não existe (mesma regra do corretor local).
  _redConfOpcoes(q){ if(q.escala&&q.escala.length) return q.escala.slice();
    const max=q.max!=null?q.max:1; return [0, Math.round(max*50)/100, max]; }
  terminarMao = ()=>{
    this._redCronoPausar();
    const r=this._redEspelhoResumo();
    if(r.estado==='vazio'){ this.setState({redEspelhoOculto:false, redGabVista:'texto'}); return; }
    this.setState({redConferindo:true, redEspelhoOculto:false, redGabVista:'quesitos', redConf:{}});
  };
  marcarConf = (e)=>{ const i=e.currentTarget.dataset.i, v=parseFloat(e.currentTarget.dataset.v);
    if(i==null || isNaN(v)) return; this.setState({redConf:{...(this.state.redConf||{}), [i]:v}}); };
  onConfUnica = (e)=> this.setState({redConf:{...(this.state.redConf||{}), unica:e.currentTarget.value}});
  onLinhasMao = (e)=> this.setState({redLinhasMao:String(e.currentTarget.value||'').replace(/[^\d]/g,'').slice(0,3)});
  _redConfUnica(){ const s=String((this.state.redConf||{}).unica==null?'':(this.state.redConf||{}).unica).trim().replace(',','.');
    if(!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null; const u=parseFloat(s); return (u>=0&&u<=10)?u:null; }
  registrarConferencia = ()=>{
    const r=this._redEspelhoResumo(); const conf=this.state.redConf||{};
    if(r.estado==='vazio') return;
    let nota=0, cobertura=0; const topicos=[], quesitos=[];
    if(r.estado==='quesitos'){
      if(r.qs.some((q,i)=>conf[i]==null)) return;
      let obt=0;
      r.qs.forEach((q,i)=>{ const max=q.max!=null?q.max:1; const n=+conf[i]||0; obt+=n; const p=max?n/max:0;
        topicos.push({ponto:'Quesito '+q.n+' — '+q.texto.slice(0,150)+(q.texto.length>150?'…':''),
          status:p>=0.99?'coberto':(p>0?'parcial':'faltou'), comentario:'Nota '+this._redNum(n)+' de '+this._redNum(max)});
        quesitos.push({quesito:'Quesito '+q.n, obtido:n, pontos:max}); });
      nota=r.total?Math.round(obt/r.total*100)/10:0; cobertura=r.total?Math.round(obt/r.total*100):0;
    } else {
      const u=this._redConfUnica(); if(u==null) return;
      nota=Math.round(u*10)/10; cobertura=Math.round(nota*10);
      quesitos.push({quesito:'Nota geral', obtido:nota, pontos:10});
    }
    const enun=(this.state.redEnunciado||'').trim();
    const titulo=enun? enun.replace(/\s+/g,' ').slice(0,80) : 'Questão discursiva';
    const aprox=!!this.state.espSugAtual; const disc={...(this.state.redDisciplina||{})};
    const tempoMs=this._redTempoAgora(); const linhas=this.state.redLinhasMao?+this.state.redLinhasMao:null;
    const res={ nota, notaStr:nota.toFixed(1), notaColor:nota>=8?'var(--ok)':nota>=6?'var(--warn)':'var(--danger)',
      conceito:this._redConceito(nota), cobertura, topicos:this._normTopicos(topicos), criterios:[], fortes:[], melhorar:[],
      geral:'Você respondeu à mão e conferiu o padrão de respostas por conta própria'
        +(tempoMs?(', em '+this._redFmtTempo(tempoMs)):'')+(linhas?(', usando '+linhas+' linhas'):'')+'.',
      aiUsed:false, propria:true, livre:false, enunciado:enun, aproximada:aprox, quesitos };
    const agora=Date.now();
    const entry={ id:'rd'+agora, up:agora, tema:titulo, words:0, nota, ts:agora, disc:disc.disc||'', disciplinaOrigem:disc.origem||'',
      res, texto:'', gabarito:this.state.redGabarito, aproximada:aprox, origem:'conferencia-propria', tempoMs, ...(linhas!=null?{linhas}:{}) };
    const hist=[entry, ...this.state.redHistory].slice(0,12); this._redSave(hist);
    this.setState({redResult:res, redHistory:hist, redConferindo:false, redConf:{}, redLinhasMao:'', redSubText:'', redSubGab:this.state.redGabarito});
    this._redCronoZerar(); this.flashSync();
    try{ this._redRegistrar({origem:'redacao', prova:titulo, notaTotal:nota, notaMax:10, disc:disc.disc, disciplinaOrigem:disc.origem, aproximada:aprox,
      quesitos:quesitos.map(q=>({titulo:q.quesito, nota:q.obtido, max:q.pontos})) }); }catch(_){}
  };
```

Antes de usar, leia `_normTopicos` (linha ~14450) e confirme que aceita `{ponto,status,comentario}` e não descarta itens além do teto de 40 que o corretor já usa. Se o teste do histórico esperar `ev[0].quesitos[1].nota === 0.1`, confirme que `_redRegistrar` arredonda com 2 casas (arredonda: `Math.round(nota*100)/100`).

Descartar as notas quando o espelho muda (Review Focus 4): em `onRedGab`, acrescente `redConf:{}` ao `setState`; em `importRedGab`, idem no `setState` de sucesso. Estado inicial: `redConferindo:false, redConf:{}, redLinhasMao:'',`. Em `redReset`, `_abrirDiscursiva` e `setRedModo` (ao ir para `digitar`): `redConferindo:false, redConf:{}`.

- [ ] **Step 4: Bindings**

```js
      ...(()=>{ const r=this._redEspelhoResumo(); const conf=this.state.redConf||{}; const on=!!this.state.redConferindo && r.estado!=='vazio';
        const itens=r.qs.map((q,i)=>({ i:String(i), n:String(q.n), texto:q.texto,
          opcoes:this._redConfOpcoes(q).map(v=>({ i:String(i), v:String(v), l:this._redNum(v), on:conf[i]===v })) }));
        const faltam=r.qs.filter((q,i)=>conf[i]==null).length;
        const obt=r.qs.reduce((a,q,i)=>a+(+conf[i]||0),0);
        const prosa=r.estado==='prosa';
        const pode=prosa?(this._redConfUnica()!=null):(r.estado==='quesitos' && faltam===0);
        const lim=this._redLimiteLinhas(this.state.redEnunciado); const lm=this.state.redLinhasMao?+this.state.redLinhasMao:null;
        return { redConferindo:on, redConfQuesitos:on && !prosa, redConfProsa:on && prosa, redConfItens:itens,
          redConfSomaTxt:this._redNum(obt)+' / '+this._redNum(r.total)+(faltam?(' · falta'+(faltam===1?'':'m')+' '+faltam):' · tudo marcado'),
          redConfNaoPode:!pode, redConfUnica:String(conf.unica==null?'':conf.unica),
          redLinhasMao:this.state.redLinhasMao||'',
          redLinhasMaoMsg:(lm==null||!lim)?'':(lm>lim?('passou '+(lm-lim)+(lm-lim===1?' linha':' linhas')+' do limite'):'dentro do limite de '+lim+' linhas'),
          redTermineiTxt:r.estado==='vazio'?'Colar ou importar o padrão para conferir':'Terminei — conferir pelo padrão',
          redEspelhoPadrao:!on,   // a vista normal do espelho some enquanto se confere
          marcarConf:this.marcarConf, onConfUnica:this.onConfUnica, onLinhasMao:this.onLinhasMao,
          terminarMao:this.terminarMao, registrarConferencia:this.registrarConferencia }; })(),
```

Troque `redOrigemLabel` por:

```js
      redOrigemLabel:(this.state.redResult&&this.state.redResult.propria)?'conferência própria'
        :((this.state.redResult&&this.state.redResult.aiUsed===false)?'estimativa local — conecte a IA':'corrigido por IA'),
      redResultIA:!(this.state.redResult&&this.state.redResult.propria),
```

- [ ] **Step 5: Template**

No painel "À mão" (Task 2), depois do botão do cronômetro, na mesma `.ct-mesa-linha`:

```html
<button class="ct-btn" data-red="terminei" onclick="{{ terminarMao }}" disabled="{{ redConferindo }}">{{ redTermineiTxt }}</button>
```

Dentro de `[data-red="espelho"]`, ANTES do cartão do espelho aberto, o cartão da conferência; e embrulhe as vistas Quesitos/Texto e o seletor do cartão aberto num `<sc-if value="{{ redEspelhoPadrao }}">`, mantendo sempre acessível o seletor de vista para a pessoa poder corrigir o espelho (Review Focus 4): durante a conferência o seletor continua, a vista Quesitos é substituída pela lista de conferência e a vista Texto continua a mesma.

```html
<sc-if value="{{ redConferindo }}" hint-placeholder-val="{{ false }}">
  <div class="ct-card">
    <div class="ct-eb">Conferência pelo padrão</div>
    <p class="ct-nota" style="margin-top:var(--ct-e1);">Leia cada quesito, procure na sua folha e dê a nota dentro da escala da banca.</p>
    <div class="ct-mesa-linha" style="margin-top:var(--ct-e3);">
      <label for="red-linhas-mao" class="ct-eb">Quantas linhas você usou?</label>
      <input id="red-linhas-mao" data-red="linhas-mao" class="ct-campo ct-campo-num" inputmode="numeric" value="{{ redLinhasMao }}" oninput="{{ onLinhasMao }}" style="width:6em;min-height:var(--ct-alvo-toque);" aria-describedby="red-linhas-mao-msg">
      <span id="red-linhas-mao-msg" data-red="linhas-mao-msg" class="ct-nota">{{ redLinhasMaoMsg }}</span>
    </div>
    <sc-if value="{{ redConfQuesitos }}" hint-placeholder-val="{{ true }}">
      <sc-if value="{{ redGabVistaQuesitos }}" hint-placeholder-val="{{ true }}">
        <ol class="ct-gab-lista">
          <sc-for list="{{ redConfItens }}" as="q">
            <li data-red="conf-item" class="ct-conf-item">
              <span class="ct-gab-n">{{ q.n }}</span>
              <span class="ct-gab-t">{{ q.texto }}</span>
              <span class="ct-seg ct-conf-ops" role="group" aria-label="Nota do quesito {{ q.n }}">
                <sc-for list="{{ q.opcoes }}" as="o"><button data-red="conf-opcao" data-i="{{ o.i }}" data-v="{{ o.v }}" onclick="{{ marcarConf }}" aria-pressed="{{ o.on }}">{{ o.l }}</button></sc-for>
              </span>
            </li>
          </sc-for>
        </ol>
      </sc-if>
    </sc-if>
    <sc-if value="{{ redConfProsa }}" hint-placeholder-val="{{ false }}">
      <div class="ct-leitura" style="margin-top:var(--ct-e3);white-space:pre-wrap;color:var(--ink);line-height:1.7;">{{ redGabarito }}</div>
      <div class="ct-mesa-linha" style="margin-top:var(--ct-e3);">
        <label for="red-conf-unica" class="ct-eb">Sua nota, de 0 a 10</label>
        <input id="red-conf-unica" data-red="conf-unica" class="ct-campo ct-campo-num" inputmode="decimal" value="{{ redConfUnica }}" oninput="{{ onConfUnica }}" style="width:6em;min-height:var(--ct-alvo-toque);">
      </div>
    </sc-if>
    <div class="ct-mesa-linha" style="margin-top:var(--ct-e4);justify-content:space-between;">
      <sc-if value="{{ redConfQuesitos }}" hint-placeholder-val="{{ true }}"><span data-red="conf-soma" class="ct-dado" aria-live="polite">{{ redConfSomaTxt }}</span></sc-if>
      <button class="ct-btn" data-red="conf-registrar" onclick="{{ registrarConferencia }}" disabled="{{ redConfNaoPode }}">Registrar conferência</button>
    </div>
  </div>
</sc-if>
```

O seletor Quesitos/Texto e a vista Texto ficam no cartão do espelho aberto, que continua renderizado durante a conferência; nele, a lista só de leitura da vista Quesitos é que ganha o `sc-if redEspelhoPadrao` (para não duplicar os quesitos na tela). Confira que `sc-for` aninhado (opções dentro de itens) funciona no runtime: `grep -n "<sc-for" Catedra.dc.html | head -40` e procure um caso aninhado existente; se não houver, achate — `redConfItens` vira uma lista só, em que cada item carrega `op0…op3` e flags `tem0…tem3`.

Etapa 3: embrulhe a `ct-grade-larga` de "Pontos fortes"/"A melhorar" e o cartão "Critérios" em `<sc-if value="{{ redResultIA }}" hint-placeholder-val="{{ true }}">…</sc-if>`. O comparativo já some porque `res.livre` é falso.

CSS:

```css
.ct-conf-item { grid-template-columns: 2em minmax(0, 1fr) !important; }
.ct-conf-ops { grid-column: 2; justify-self: start; flex-wrap: wrap; }
.ct-conf-ops > button { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.ct-conf-ops > button[aria-pressed="true"] { background: var(--accentSolid, var(--accent)); color: var(--onAccent); box-shadow: none; }
```

`--accentSolid` é o fundo que `.ct-btn` usa para carregar texto `--onAccent` com contraste medido; o degrau marcado segue a mesma dupla.

- [ ] **Step 6: Rodar e ver passar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: cinco blocos verdes. Capture `tests/_capturas/mesa-conferencia.png` (1280, dois quesitos marcados) e confira no olho.

- [ ] **Step 7: Abrir do histórico**

Confirme à mão no teste (acrescente ao fim do primeiro contexto de `conferencia`): clicar em "Nova prova" (aceitando o `confirm`), reabrir a entrada pelo histórico (`[data-id]` da lista "Suas correções") e ver `Conferência própria` no herói, sem erro de página. `redOpenHist` usa `h.texto||this.state.redText`; com `texto:''` isso não muda nada, que é o esperado.

```js
    page.once('dialog', d => d.accept());
    await page.click('button:has-text("Nova prova")'); await page.waitForTimeout(300);
    await page.locator('[data-id^="rd"]').first().click(); await page.waitForTimeout(300);
    ok(/Conferência própria/i.test(await page.textContent('.ct-hero')), R + 'conferência reabre pelo histórico');
```

Run: `CT_SO=redacao-mesa node tests/run.mjs` — Expected: verde.

- [ ] **Step 8: Commit**

```bash
git add tests/redacao-mesa.mjs Catedra.dc.html catedra-ui.css
git commit -m "Quem responde a discursiva à mão confere o padrão quesito a quesito, na escala da banca, e a nota entra no histórico e na evolução

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Acessibilidade medida, WebKit, suíte inteira e PR

**Files:**
- Modify: `tests/redacao-mesa.mjs`
- Modify: `Catedra.dc.html`, `catedra-ui.css` (só o que as medições reprovarem)

**Interfaces:**
- Consumes: tudo das tasks anteriores.

- [ ] **Step 1: Bloco `acessivel` — contraste calculado e alvos**

```js
async function acessivel(pageDaSuite, base, ok, R) {
  const medir = () => page.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const fundo = el => { let e = el; while (e) { const b = getComputedStyle(e).backgroundColor; const m = b.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] >= 0.99)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
    const sels = ['[data-red="crono"]', '[data-red="modo-mao"]', '[data-red="modo-digitar"]', '[data-red="gab-estado"]', '[data-red="terminei"]', '.ct-folha-mao .ct-nota', '[data-red="marcas-toggle"]', '[data-red="chip-limite"]'];
    return sels.map(s => { const el = document.querySelector(s); if (!el) return { s, falta: true };
      const a = lum(getComputedStyle(el).color), b = lum(fundo(el)); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const bx = el.getBoundingClientRect(); return { s, r: Math.round(r * 100) / 100, h: Math.round(bx.height), w: Math.round(bx.width) }; });
  });
  let page;
  for (const esquema of ['light', 'dark']) {
    const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, colorScheme: esquema });
    page = await ctx.newPage(); const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
    try {
      await semear(page, base); await abrirRedacao(page, base);
      const m = await medir();
      for (const x of m) {
        ok(!x.falta && x.r >= 4.5, R + esquema + ': contraste de ' + x.s + ' ≥ 4,5:1 (mediu ' + (x.falta ? 'ausente' : x.r) + ')');
      }
      for (const x of m.filter(x => /modo-|terminei|marcas-toggle/.test(x.s))) ok(x.h >= 44, R + esquema + ': alvo de ' + x.s + ' ≥ 44 px (mediu ' + x.h + ')');
      await page.click('[data-red="terminei"]'); await page.waitForSelector('[data-red="conf-opcao"]');
      const alvos = await page.evaluate(() => [...document.querySelectorAll('[data-red="conf-opcao"]')].map(b => Math.round(b.getBoundingClientRect().height)));
      ok(alvos.every(h => h >= 44), R + esquema + ': degraus da conferência ≥ 44 px (mínimo ' + Math.min(...alvos) + ')');
      ok(await page.evaluate(() => [...document.querySelectorAll('[data-red="mesa"] button, [data-red="espelho"] button, [data-red="mesa"] input, [data-red="mesa"] textarea, [data-red="espelho"] input')].every(e => (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.id && document.querySelector('label[for="' + e.id + '"]')))), R + esquema + ': todo controle da mesa tem nome');
      ok(await page.evaluate(() => !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(document.querySelector('[data-red="mesa"]').textContent + document.querySelector('[data-red="espelho"]').textContent)), R + esquema + ': nenhum emoji como ícone');
    } finally { await ctx.close(); }
  }
}
```

Como o app escolhe claro/escuro: confira se ele segue `prefers-color-scheme` ou uma preferência salva (`grep -n "temaAuto\|colorScheme\|prefers-color-scheme" Catedra.dc.html | head -5`); se for preferência salva, semeie a chave que liga o escuro em vez de `colorScheme`. Na lista: `const blocos = [arranjo, papel, folha, espelho, conferencia, acessivel];`.

- [ ] **Step 2: Rodar, corrigir o que reprovar**

Run: `CT_SO=redacao-mesa node tests/run.mjs`
Expected: verde depois dos ajustes. Correção típica: texto em cor de situação (`--warn`, `--danger`) escurecido com a tinta — `color-mix(in srgb, var(--danger) 72%, var(--ink))` —, e `min-height:var(--ct-alvo-toque)` no que ficou baixo.

- [ ] **Step 3: `prefers-reduced-motion`**

Acrescente ao bloco `acessivel` um contexto com `reducedMotion: 'reduce'` e meça:

```js
      ok(await page.evaluate(() => { const b = document.querySelector('[data-red="barra"] > div'); return !b || getComputedStyle(b).transitionDuration.split(',').every(d => parseFloat(d) === 0); }), R + 'movimento reduzido: a barra não anima');
```

(abra em "Digitar" semeando `redText`, para a barra existir).

- [ ] **Step 4: WebKit**

Run: `npm run test:webkit 2>&1 | grep -E "MESA|✗" | head -60`
Expected: todos os `MESA [webkit]` verdes. Pontos que costumam divergir: `backgroundSize` devolvido em outra forma (ajuste a leitura do passo no teste para aceitar `100% 28.5px` e `auto 28.5px`), `line-height` com fração, container query (WebKit do Playwright suporta), `select` reescrito pelo tema (o `#red-disciplina` já usa `ct-campo`).

- [ ] **Step 5: Suíte inteira nos dois motores**

Run: `node scripts/verificar-segredos.mjs && CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`
Expected: verde (~13 min). Em paralelo, noutro terminal: `npm run test:webkit`.
Se um caso alheio à Redação falhar, rode-o isolado antes de mexer: D9 falha na primeira rodada de worktree novo e TASK8 oscila sob carga.

- [ ] **Step 6: Build do site (confere as listas de cópia)**

Run: `node scripts/build.mjs && ls public/catedra-ui.css public/Catedra.dc.html`
Expected: os dois existem. Nenhum arquivo novo do app foi criado nesta fatia, então as listas de `build.mjs` e `build-macos.mjs` não mudam; `tests/redacao-mesa.mjs` não vai para o build.

- [ ] **Step 7: Commit, push e PR**

```bash
git branch --show-current
git add -A tests/redacao-mesa.mjs Catedra.dc.html catedra-ui.css
git commit -m "A mesa de prova da discursiva passa nas medições de contraste, toque e movimento nos dois motores

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin redacao-mesa-de-prova
gh pr create --base main --title "Discursiva: mesa de prova com papel primeiro, folha pautada e conferência pelo padrão" --body "$(cat <<'EOF'
## O que muda para a pessoa
- A questão fica ao lado da resposta; o comando não some enquanto se escreve.
- A tela sugere sempre fazer à mão: cronômetro, limite de linhas e, ao terminar, conferência do padrão de respostas quesito a quesito, na escala da banca. A nota entra no histórico e na evolução como conferência própria.
- Quem digita escreve numa folha pautada que conta as linhas contra o limite e mostra quando salvou; há modo foco.
- O espelho diz quantos quesitos e pontos reconheceu, e a importação mostra o estado na própria faixa.

## Dados
- Estado persistido novo: `redTempoMs` (em `_autosaveKeys`, `_rehydrateFromLocal` e `AREA_PROPRIA`).
- Entrada do histórico ganha `tempoMs`, `linhas` e `origem:'conferencia-propria'`, todos opcionais.
- O corretor (`submitRed`, prompt, corretor local) não foi alterado.

## Testes
`tests/redacao-mesa.mjs` (Chromium e WebKit): arranjo, papel primeiro, folha, espelho, conferência, acessibilidade medida.

Spec: `docs/superpowers/specs/2026-10-03-redacao-mesa-de-prova-design.md`
Fatia 1 de 3 (seguem: motor da correção; resultado anotado).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Depois do PR: ligar o PR à sessão (ferramentas `ccd_pr`), esperar as duas checagens verdes, `gh pr merge --merge`, e avisar a sessão "Fusão de melhorias do Codex" para o build e a instalação no Mac e no iPad.

- [ ] **Step 8: Relatório final para a dona**

Listar: arquivos alterados; casos de teste novos (contagem por bloco); o que ficou pendente (fatias 2 e 3; contagem regressiva; persistir as notas da conferência em andamento); e o que ela precisa decidir, se algo apareceu na execução.
