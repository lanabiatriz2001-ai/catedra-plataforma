# Ajustes · Ritmo e metas — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development
> (recomendada) ou superpowers:executing-plans, tarefa por tarefa. Os passos usam caixas
> (`- [ ]`) para acompanhamento.

**Objetivo:** refazer a aba "Ritmo e metas" com perfis prontos, régua única e prévia fixa, e
fazer nível, estratégia, energia e cobrança mudarem o comportamento do app.

**Arquitetura:** tudo dentro do componente único `Catedra.dc.html` (constantes, métodos,
variáveis do `render()` e template) e de `catedra-ui.css` (classes `ct-rm-*`). A lógica nova
fica em métodos pequenos e puros sobre `orient` (`_rm*`), testáveis por `window.__catedraApp`
sem depender do desenho. PR 1 = tarefas 1–4; PR 2 = tarefas 5–6.

**Stack:** HTML/JS do runtime `support.js` (`{{ var }}`, `<sc-if>`, `<sc-for>`), CSS com
tokens, testes Playwright (`tests/run.mjs` Chromium, `tests/run-webkit.mjs` WebKit).

**Especificação:** `docs/superpowers/specs/2026-10-03-ajustes-ritmo-metas-design.md`

## Restrições globais

- Português do Brasil com acentuação completa em código, comentários, commits e interface.
- Sem rede externa, sem CDN, sem fonte externa; sintaxe que o JavaScriptCore aceita.
- Tokens sempre (sem hex fixo, sem px solto no host); sem faixa lateral colorida; sem emoji
  como ícone; texto ≥ 4,5:1; alvos ≥ 44 px no toque; `prefers-reduced-motion` respeitado.
- Chave nova: só `orient.energiaDia`. Nenhuma chave `catedra:` nova, nada novo em
  `_autosaveKeys()`. Estado só de tela (`rmDesfazer`, `rmPrevAberta`) NÃO é salvo.
- O padrão de fábrica (intermediário + ciclo por blocos) gera a volta idêntica à de hoje.
- Bloco concluído nunca é tocado; modo manual do ciclo não muda.
- Teste de aparência MEDE (contraste calculado, caixas, `getComputedStyle`) e olha a captura.
- Semear `localStorage` a partir de `base + '/__semente'`; ler o storage ≥ 1,3 s depois da
  ação; teste que depende de "hoje" fixa o relógio em contexto próprio.
- Não mudar versões de dependências. Um PR por item; `npm test` e `npm run test:webkit`
  verdes antes do commit final de cada PR.

## Foco da revisão

1. Orient vindo de aparelho com versão antiga (sem `energiaDia`) pela nuvem: a migração roda
   de novo e não pode derrubar a base de quem já usa a versão nova sem ter pedido → teste na
   tarefa 1 (`migração idempotente`).
2. Meta digitada à mão fora de ordem (mínimo 300, ideal 120): ao sair do campo a régua se
   ordena sem perder o que a pessoa digitou por último → tarefa 1.
3. Campo de meta vazio ou com texto: nenhum `NaN` na prévia nem no storage → tarefa 1.
4. Nenhum dia marcado na semana: a prévia não divide por zero nem mostra "0 dias" como
   normal → tarefa 3.
5. Trocar a estratégia com todos os blocos da volta concluídos: nada é refeito e nada some
   → tarefa 6.

---

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `Catedra.dc.html` | constante `AJ_RITMO_PERFIS`; métodos `_rm*`/`rm*`; `_enHoje`; render `ajuRitmo`; template da aba; `_genVolta`/`_extrasDoDia` (PR 2) |
| `catedra-ui.css` | classes `ct-rm-*` |
| `tests/ajustes-ritmo.mjs` (novo) | lógica e aparência do PR 1 |
| `tests/ciclo-nivel-estrategia.mjs` (novo) | PR 2 |
| `tests/run.mjs`, `tests/run-webkit.mjs` | ligam os módulos novos |
| `tests/select-host.mjs` | troca `aj-f-cobranca` (deixa de ser select) por `aj-f-banca` |

Arquivo de teste não entra nas listas de cópia dos builds; nenhum arquivo novo do app.

---

### Tarefa 1: lógica de perfis, régua e energia (sem tela)

**Arquivos:**
- Modificar: `Catedra.dc.html` (perto de `AJ_ORIENT_PADRAO` ~6830; `_enMult` ~10441;
  `setOrientVal` ~15451; `setOrientRadio` ~15920; cargas do orient ~7345 e ~8060; leituras de
  `energiaPlano` ~18300–18320 e ~20265)
- Criar: `tests/ajustes-ritmo.mjs`
- Modificar: `tests/run.mjs`, `tests/run-webkit.mjs`

**Interfaces — produz:**
- `AJ_RITMO_PERFIS: [{id, nome, desc, v:{metaMin, metaIdeal, metaForte, blocoPadrao, cobranca}}]`
- `_rmPerfilAtual(orient?) → 'constancia'|'equilibrio'|'intensivo'|''`
- `rmAplicarPerfil(e)` (lê `e.currentTarget.dataset.v`), `rmDesfazerPerfil()`
- `rmPasso(e)` (lê `dataset.k` ∈ metaMin|metaIdeal|metaForte|blocoPadrao e `dataset.d`)
- `rmOrdenarMetas(e)` (no `blur` dos campos; `dataset.k` = campo que a pessoa editou)
- `_enHoje() → 'baixa'|'normal'|'alta'`; `_rmMigrarEnergia(orient) → orient`
- estado de tela `rmDesfazer: null | {antes:{…}, nome:string}`

- [ ] **Passo 1: escrever o teste que falha**

`tests/ajustes-ritmo.mjs`:

```js
/* AJUSTES · RITMO E METAS (03/10/2026). A aba foi refeita: perfis prontos, régua única de
   metas e energia de hoje × energia base. Aqui se prova a LÓGICA pelo componente
   (window.__catedraApp) e, mais abaixo, a aparência medida. */

const semear = async (page, base, orient) => {
  await page.goto(base + '/__semente');
  await page.evaluate((o) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
    set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica');
    set('edital', [
      { disc: 'Direito Civil', peso: 3, questoes: 15, topics: [{ name: 'Obrigações', done: false, subs: [] }, { name: 'Contratos', done: false, subs: [] }] },
      { disc: 'Direito Penal', peso: 2, questoes: 10, topics: [{ name: 'Teoria do crime', done: false, subs: [] }] },
      { disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: [{ name: 'Controle', done: false, subs: [] }] }]);
    set('sessions', []); set('reviews', []); set('errors', []);
    if (o) set('orient', o);
  }, orient || null);
};
const abrir = async (page, base, arquivo) => {
  await page.goto(base + '/' + arquivo);
  await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });
  await page.evaluate(() => window.__catedraApp.setState({ view: 'ajustes', ajSec: 'ritmo' }));
  await page.waitForTimeout(400);
};
const orientSalvo = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('catedra:orient') || '{}'));
const ev = (dados) => ({ currentTarget: { dataset: dados, value: dados.value } });

export async function testarAjustesRitmo(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium';
  const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'RITMO [' + motor + '] ';
  const browser = pageDaSuite.context().browser();

  // ── perfis e régua ─────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'equilibrio', R + 'fábrica é o perfil Equilíbrio');

      await page.evaluate(() => window.__catedraApp.rmAplicarPerfil({ currentTarget: { dataset: { v: 'intensivo' } } }));
      await page.waitForTimeout(1400);
      let o = await orientSalvo(page);
      ok(o.metaMin === '120' && o.metaIdeal === '300' && o.metaForte === '420' && o.blocoPadrao === '60' && o.cobranca === 'rigido',
        R + 'Intensivo grava os cinco valores (' + JSON.stringify([o.metaMin, o.metaIdeal, o.metaForte, o.blocoPadrao, o.cobranca]) + ')');
      ok(o.tempoDia === '300', R + 'tempoDia espelha a meta ideal');
      ok(await page.evaluate(() => window.__catedraApp.state.prefs.metaDiaria) === 5, R + 'prefs.metaDiaria espelha a meta ideal em horas');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === 'intensivo', R + 'perfil em uso passa a ser Intensivo');

      await page.evaluate(() => window.__catedraApp.rmDesfazerPerfil());
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(o.metaIdeal === '180' && o.blocoPadrao === '50' && o.cobranca === 'equilibrado', R + 'Desfazer devolve os valores de antes');

      // régua: + na mínima empurra ideal e forte; nunca mínimo > ideal > forte
      await page.evaluate(() => { const a = window.__catedraApp; for (let i = 0; i < 20; i++) a.rmPasso({ currentTarget: { dataset: { k: 'metaMin', d: '15' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(+o.metaMin === 360 && +o.metaIdeal === 360 && +o.metaForte === 360, R + 'régua empurra as vizinhas (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok(await page.evaluate(() => window.__catedraApp._rmPerfilAtual()) === '', R + 'valores fora da tabela = Personalizado');

      // digitado fora de ordem e campo vazio (Foco da revisão 2 e 3)
      await page.evaluate(() => { const a = window.__catedraApp;
        a.setState(s => ({ orient: { ...s.orient, metaMin: '300', metaIdeal: '120', metaForte: '' } }));
        a.rmOrdenarMetas({ currentTarget: { dataset: { k: 'metaMin' } } }); });
      await page.waitForTimeout(1400);
      o = await orientSalvo(page);
      ok(+o.metaMin === 300 && +o.metaIdeal === 300 && +o.metaForte === 300, R + 'ordenar preserva o campo editado e conserta os outros (' + [o.metaMin, o.metaIdeal, o.metaForte] + ')');
      ok([o.metaMin, o.metaIdeal, o.metaForte, o.tempoDia].every(v => /^\d+$/.test(String(v))), R + 'nenhum NaN nem vazio no storage');
    } finally { await ctx.close(); }
  }

  // ── energia de hoje × base, com relógio fixo ───────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const t = new Date(); t.setHours(14, 0, 0, 0);
    await page.clock.install({ time: t });
    try {
      // legado: energiaPlano 'baixa' sem energiaDia → vira a base (ninguém muda de ritmo sem pedir)
      await semear(page, base, { energia: 'normal', energiaPlano: 'baixa' }); await abrir(page, base, arquivo);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'migração: energia antiga vira a base');
      ok(await page.evaluate(() => window.__catedraApp.state.orient.energia) === 'baixa', R + 'migração grava orient.energia');

      await page.evaluate(() => window.__catedraApp.setOrientRadio({ currentTarget: { dataset: { v: 'alta' } } }));
      await page.waitForTimeout(1400);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'alta', R + 'energia de hoje vale hoje');
      const o = await orientSalvo(page);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(o.energiaDia), R + 'energiaDia carimbado com o dia de estudo');

      // migração idempotente (Foco da revisão 1): reaplicar não troca a base
      ok(await page.evaluate(() => { const a = window.__catedraApp; return a._rmMigrarEnergia({ ...a.state.orient }).energia; }) === 'baixa', R + 'migração não roda duas vezes');

      await page.clock.fastForward(26 * 60 * 60 * 1000);
      ok(await page.evaluate(() => window.__catedraApp._enHoje()) === 'baixa', R + 'no dia seguinte volta à base');
    } finally { await ctx.close(); }
  }
}
```

Em `tests/run.mjs` e `tests/run-webkit.mjs`, junto do import de `select-host.mjs`:

```js
import { testarAjustesRitmo } from './ajustes-ritmo.mjs';
```

e, logo depois da chamada de `testarSelectHost(...)` em cada arquivo (copie os mesmos
argumentos de `base`, `ok` e `opcoes` usados ali):

```js
await testarAjustesRitmo(page, base, ok, { motor: 'chromium' });   // em run-webkit.mjs: motor: 'webkit'
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" CT_SO=RITMO npm test`
(se `run.mjs` não tiver filtro por variável, confira com `grep -n "CT_SO\|process.env" tests/run.mjs | head`
e use o filtro que existir; sem filtro, rode a suíte inteira).
Esperado: FALHA com `_rmPerfilAtual is not a function`.

- [ ] **Passo 3: implementar**

(a) Logo abaixo de `AJ_ORIENT_PADRAO`, e acrescentando `energiaDia:''` a esse objeto:

```js
/* Os três jeitos de estudar da aba Ritmo e metas. O perfil em uso é DEDUZIDO: vale o que
   bate com esta tabela; divergiu, é "Personalizado". Não existe chave "perfil" guardada. */
const AJ_RITMO_PERFIS = [
  {id:'constancia', nome:'Constância', desc:'pouco todo dia, sem falhar',
   v:{metaMin:'60',  metaIdeal:'120', metaForte:'180', blocoPadrao:'40', cobranca:'leve'}},
  {id:'equilibrio', nome:'Equilíbrio', desc:'o padrão do Cátedra',
   v:{metaMin:'60',  metaIdeal:'180', metaForte:'300', blocoPadrao:'50', cobranca:'equilibrado'}},
  {id:'intensivo',  nome:'Intensivo',  desc:'dedicação quase integral',
   v:{metaMin:'120', metaIdeal:'300', metaForte:'420', blocoPadrao:'60', cobranca:'rigido'}}
];
```

(b) Métodos, logo acima de `_persistOrient`:

```js
  /* ═══ RITMO E METAS ═══ */
  _rmNum(x){ return Math.max(0, parseInt(x,10)||0); }
  // a meta ideal é a fonte única de "quanto estudo": tempoDia e prefs.metaDiaria a espelham
  _rmEspelhar(o){ return {...o, tempoDia:String(this._rmNum(o.metaIdeal))}; }
  _rmPrefsDe(prefs, o){ return {...prefs, metaDiaria:Math.max(1, Math.round(this._rmNum(o.metaIdeal)/60))}; }
  _rmPerfilAtual(O){ O=O||this.state.orient||{};
    const p=AJ_RITMO_PERFIS.find(p=>Object.keys(p.v).every(k=>String(O[k])===String(p.v[k]))); return p?p.id:''; }
  _rmGravar(orient, extra){ orient=this._rmEspelhar(orient);
    this.setState(s=>({orient, prefs:this._rmPrefsDe(s.prefs, orient), ...(extra||{})}), ()=>{ this._persistOrient(); this._recomporDia(); }); }
  rmAplicarPerfil = (e)=>{ const p=AJ_RITMO_PERFIS.find(x=>x.id===e.currentTarget.dataset.v); if(!p) return;
    const O=this.state.orient||{}; const antes={}; Object.keys(p.v).forEach(k=>{ antes[k]=O[k]; });
    this._rmGravar({...O, ...p.v}, {rmDesfazer:{antes, nome:p.nome}}); };
  rmDesfazerPerfil = ()=>{ const d=this.state.rmDesfazer; if(!d) return;
    this._rmGravar({...(this.state.orient||{}), ...d.antes}, {rmDesfazer:null}); };
  // mínimo ≤ ideal ≤ forte: quem foi mexido manda, as vizinhas acompanham
  _rmOrdenar(o, k){ let mi=this._rmNum(o.metaMin), id=this._rmNum(o.metaIdeal), fo=this._rmNum(o.metaForte);
    if(k==='metaMin'){ if(id<mi) id=mi; if(fo<id) fo=id; }
    else if(k==='metaForte'){ if(id>fo) id=fo; if(mi>id) mi=id; }
    else { if(mi>id) mi=id; if(fo<id) fo=id; }
    return {...o, metaMin:String(mi), metaIdeal:String(id), metaForte:String(fo)}; }
  rmPasso = (e)=>{ const k=e.currentTarget.dataset.k, d=parseInt(e.currentTarget.dataset.d,10)||0; const O=this.state.orient||{};
    const LIM={metaMin:[15,600], metaIdeal:[30,720], metaForte:[30,900], blocoPadrao:[20,120]}[k]; if(!LIM) return;
    const v=Math.max(LIM[0], Math.min(LIM[1], this._rmNum(O[k])+d));
    let o={...O, [k]:String(v)}; if(k!=='blocoPadrao') o=this._rmOrdenar(o, k);
    this._rmGravar(o, {rmDesfazer:null}); };
  rmOrdenarMetas = (e)=>{ this._rmGravar(this._rmOrdenar(this.state.orient||{}, e.currentTarget.dataset.k), {rmDesfazer:null}); };
  /* Energia: orient.energia é a BASE de todo dia; energiaPlano só vale no dia carimbado em
     energiaDia. Legado (energiaDia vazio): o que estava em energiaPlano era, na prática, a
     energia permanente da pessoa — vira a base, uma vez só ('0' marca "já migrado"). */
  _rmMigrarEnergia(o){ if(!o || o.energiaDia) return o;
    const base=(o.energiaPlano && o.energiaPlano!==o.energia) ? o.energiaPlano : (o.energia||'normal');
    return {...o, energia:base, energiaDia:'0'}; }
  _enHoje(){ const O=this.state.orient||{};
    return (O.energiaDia===this._hoje() && O.energiaPlano) ? O.energiaPlano : (O.energia||'normal'); }
```

(c) Substituir `_enMult`:

```js
  _enMult(){ const e=this._enHoje(); return e==='baixa'?0.7:(e==='alta'?1.2:1); }
```

(d) Substituir `setOrientRadio` e `setOrientVal`:

```js
  setOrientRadio = (e)=>{ const v=e.currentTarget.dataset.v; this.setState(s=>({orient:{...s.orient,energiaPlano:v,energiaDia:this._hoje()}}), ()=>{ this._persistOrient(); this._recomporDia(); }); };
```
```js
  setOrientVal = (e)=>{ const k=e.currentTarget.dataset.k, v=e.currentTarget.dataset.v;
    this.setState(s=>({orient:{...s.orient,[k]:v}, rmDesfazer:(k==='cobranca'?null:s.rmDesfazer)}), ()=>{ this._persistOrient();
      if(['nivel','estrategia','energia'].indexOf(k)>=0) this._recomporDia(); }); };
```

(e) Migração nas duas cargas do orient. Linha ~7345: trocar
`this.state.orient={...this.state.orient, ..._op}` por
`this.state.orient=this._rmMigrarEnergia({...this.state.orient, ..._op, energiaDia:_op.energiaDia||''})`.
Linha ~8060: trocar `patch.orient={...this.state.orient, ...p}` por
`patch.orient=this._rmMigrarEnergia({...this.state.orient, ...p, energiaDia:p.energiaDia||''})`.
(O `energiaDia:…||''` explícito é o que faz o orient de um aparelho antigo, que chega sem o
campo, ser reconhecido como legado em vez de herdar o carimbo local.)

(f) Trocar as duas leituras diretas de `O.energiaPlano` no render (o conselho "Com energia
${O.energiaPlano}" e `_energiaCard`, `const on=O.energiaPlano===k`) por `this._enHoje()`.

(g) Em `setOrient`, no `setState`, espelhar também quando `k==='metaIdeal'`:
acrescentar `patch.orient=this._rmEspelhar(orient);` dentro do `if(k==='metaIdeal'){…}`.

(h) No estado inicial (junto de `ajSec:'perfil'`), acrescentar `rmDesfazer:null, rmPrevAberta:false`.
Nos dois `setState({ajSec:…})` (linhas ~15304 e ~15413), acrescentar `rmDesfazer:null`.

- [ ] **Passo 4: rodar e ver passar**

Mesmo comando do passo 2. Esperado: todos os casos `RITMO […]` verdes, sem `ERRO NA PÁGINA`.

- [ ] **Passo 5: commit**

```bash
git add Catedra.dc.html tests/ajustes-ritmo.mjs tests/run.mjs tests/run-webkit.mjs
git commit -m "Ritmo e metas ganha perfis prontos, régua de metas que se ordena e energia de hoje que volta à base no dia seguinte"
```

---

### Tarefa 2: a tela nova (template, render e CSS)

**Arquivos:**
- Modificar: `Catedra.dc.html` — template da aba (os cinco blocos `<sc-if value="{{ ajSecRitmo }}">`
  ~5360–5515 e o cartão "Meta diária de estudo" ~6589–6596); render (`ajuPrevia` ~16295–16316,
  retorno ~19146)
- Modificar: `catedra-ui.css` (fim do arquivo)

**Interfaces — consome:** tudo da tarefa 1. **Produz** (variáveis do render): `rmPerfis`,
`rmPersonalizado`, `rmDesfazerOn`, `rmDesfazerTxt`, `rmMarcas`, `rmCobrancas`, `rmNiveis`,
`rmEstrategias`, `rmEnergiaBase`, `rmEnergiaHoje`, `rmBlocoTxt`, `rmBarra`, `rmCumpridoTxt`,
`rmRetaTxt`, `rmRetaOn`, `rmPrevAberta`, `rmPrevChevron`; e os seletores de teste
`[data-rm="previa"]`, `[data-rm="perfil"]`, `[data-rm="personalizado"]`, `[data-rm="desfazer"]`,
`[data-rm="barra"]`, `[data-rm="colunas"]`.

- [ ] **Passo 1: render** — logo depois do objeto `ajuPrevia`, acrescentar:

```js
    const _rmO=this.state.orient||{}; const _rmN=(x)=>Math.max(0,parseInt(x,10)||0);
    const _rmAtual=this._rmPerfilAtual(_rmO);
    const _rmCobPct={leve:50, equilibrado:85, rigido:100};
    const _rmOpc=(k,atual,opts)=>opts.map(([v,label,desc])=>({k, v, label, desc:desc||'', on:atual===v, pressed:String(atual===v),
      cls:'ct-rm-opc'+(atual===v?' ct-rm-opc-on':'')}));
    const _rmCor=(disc)=>{ try{ return this._discColor(disc); }catch(_){ return 'var(--accent)'; } };
    const _rmTot=_ajPrevMin||1;
    let _rmDp=null; try{ if(this.state.provaData) _rmDp=Math.ceil((new Date(this.state.provaData+'T00:00:00')-Date.now())/864e5); }catch(_){}
    const _rmRetaCom=_rmN(_rmO.retaFinalCom)||30;
    const ajuRitmo = {
      rmPerfis:AJ_RITMO_PERFIS.map(p=>({ id:p.id, nome:p.nome, desc:p.desc, on:_rmAtual===p.id, pressed:String(_rmAtual===p.id),
        cls:'ct-rm-perfil'+(_rmAtual===p.id?' ct-rm-perfil-on':''),
        resumo:_ajHM(_rmN(p.v.metaIdeal))+' por dia · blocos de '+p.v.blocoPadrao+' min',
        wMin:Math.round(_rmN(p.v.metaMin)/4.2)+'%', wIdeal:Math.round(_rmN(p.v.metaIdeal)/4.2)+'%', wForte:Math.round(_rmN(p.v.metaForte)/4.2)+'%' })),
      rmPersonalizado:!_rmAtual,
      rmDesfazerOn:!!this.state.rmDesfazer,
      rmDesfazerTxt:this.state.rmDesfazer?('Perfil '+this.state.rmDesfazer.nome+' aplicado: metas, bloco e cobrança mudaram.'):'',
      rmMarcas:[['metaMin','Mínimo','o dia não fica em branco'],['metaIdeal','Ideal','a meta do anel do Início'],['metaForte','Forte','dia acima da média']]
        .map(([k,rot,desc])=>({k, rot, desc, id:'aj-f-'+k, v:String(_rmO[k]==null?'':_rmO[k]), hm:_ajHM(_rmN(_rmO[k])),
          menos:'Diminuir '+rot.toLowerCase()+' em 15 minutos', mais:'Aumentar '+rot.toLowerCase()+' em 15 minutos' })),
      rmCobrancas:_rmOpc('cobranca', _rmO.cobranca||'equilibrado', [['leve','Leve'],['equilibrado','Equilibrado'],['rigido','Rígido']])
        .map(c=>({...c, desc:'dia cumprido a partir de '+_ajHM(Math.round(_ajMetaMin*_rmCobPct[c.v]/100)) })),
      rmNiveis:_rmOpc('nivel', _rmO.nivel||'intermediario', [['iniciante','Iniciante','teoria antes, questões curtas'],['intermediario','Intermediário','teoria, depois questões'],['avancado','Avançado','questões antes da teoria']]),
      rmEstrategias:_rmOpc('estrategia', _rmO.estrategia||'ciclo', [['ciclo','Ciclo por blocos','alterna as matérias'],['sequencial','Sequencial','uma matéria por vez'],['revisao','Foco em revisão','revisões vencidas primeiro']]),
      rmEnergiaBase:_rmOpc('energia', _rmO.energia||'normal', [['baixa','Baixa'],['normal','Normal'],['alta','Alta']]),
      rmEnergiaHoje:_rmOpc('energiaPlano', this._enHoje(), [['baixa','Baixa','blocos 30% menores'],['normal','Normal','blocos do tamanho padrão'],['alta','Alta','blocos 20% maiores']]),
      rmBlocoTxt:_rmN(_rmO.blocoPadrao)+' min',
      rmBarra:_ajPrevBlocos.map(b=>({ style:'flex:'+Math.max(1,(+b.min||0))+' 1 0;background:'+_rmCor(b.disc)+';', rot:b.disc+' · '+b.kind+' · '+b.min+' min' })),
      rmCumpridoTxt:_ajMetaMin?('Dia cumprido a partir de '+_ajHM(Math.round(_ajMetaMin*(_rmCobPct[_rmO.cobranca]||85)/100))):'',
      rmRetaOn:(_rmDp!=null && _rmDp>=0),
      rmRetaTxt:(_rmDp==null||_rmDp<0)?'' : (_rmDp<=_rmRetaCom ? 'Reta final em curso' : ('Reta final em '+(_rmDp-_rmRetaCom)+' dias')),
      rmPrevAberta:!!this.state.rmPrevAberta, rmPrevChevron:this.state.rmPrevAberta?'Ocultar blocos':'Ver blocos',
      rmAplicarPerfil:this.rmAplicarPerfil, rmDesfazerPerfil:this.rmDesfazerPerfil, rmPasso:this.rmPasso, rmOrdenarMetas:this.rmOrdenarMetas,
      rmTogglePrev:()=>this.setState(s=>({rmPrevAberta:!s.rmPrevAberta}))
    };
```

Antes de usar `this._discColor`, confirme o nome real da função de cor por matéria:
`grep -n "p.color\|color:this\._" Catedra.dc.html | head` (é a mesma que alimenta
`planRows[].color`); use esse nome em `_rmCor`. Em `ajPrevDias`, trocar a expressão para
tratar zero dias (Foco da revisão 4): se `String(orient.dias||'').split(',').filter(Boolean).length===0`,
o texto é `'nenhum dia marcado'` e `ajPrevSemana` é `'marque ao menos um dia para ver a semana'`;
`_ajDiasN` continua com o `|| 6` só para os cálculos antigos que dependem dele fora da aba.
Espalhar `...ajuRitmo` no objeto de retorno, ao lado de `...ajuPrevia`.

- [ ] **Passo 2: template** — substituir os cinco blocos `<sc-if value="{{ ajSecRitmo }}">` da
aba (do comentário "PRÉVIA AO VIVO" até o fim do cartão "Planejamento da semana") por UM
bloco, e apagar o cartão "Meta diária de estudo" (~6589–6596). Estrutura (os cartões
"Critérios de prioridade", "Planejamento da semana", "Onde praticar questões", "Flashcards —
ajustes avançados" e os campos `aj-f-banca`, `aj-f-modoPadrao`, `aj-f-aoAbrir`,
`aj-f-retaFinalCom`, `ativarReta`, `reduzirTeoria`, `focoEstrategico`, dias e turno são
MOVIDOS com a marcação que já têm, sem reescrever):

```html
<sc-if value="{{ ajSecRitmo }}" hint-placeholder-val="{{ false }}">
<div class="ct-rm" data-rm="colunas">
  <div class="ct-rm-decisoes">

    <section class="ct-rm-sec" aria-labelledby="aj-perfil">
      <h2 id="aj-perfil" class="ct-rm-h">Seu jeito de estudar</h2>
      <p class="ct-rm-sub">Um toque preenche metas, tamanho do bloco e cobrança. Depois você ajusta o que quiser.</p>
      <div class="ct-rm-perfis">
        <sc-for list="{{ rmPerfis }}" as="p" hint-placeholder-count="3">
          <button type="button" data-rm="perfil" data-v="{{ p.id }}" aria-pressed="{{ p.pressed }}" onclick="{{ rmAplicarPerfil }}" class="{{ p.cls }}">
            <span class="ct-rm-perfil-regua" aria-hidden="true"><i style="width:{{ p.wMin }};"></i><i style="width:{{ p.wIdeal }};"></i><i style="width:{{ p.wForte }};"></i></span>
            <span class="ct-rm-perfil-nome">{{ p.nome }}</span>
            <span class="ct-rm-perfil-desc">{{ p.desc }}</span>
            <span class="ct-rm-perfil-resumo">{{ p.resumo }}</span>
          </button>
        </sc-for>
      </div>
      <sc-if value="{{ rmPersonalizado }}" hint-placeholder-val="{{ false }}">
        <div data-rm="personalizado" class="ct-rm-nota">Personalizado: seus valores não batem com nenhum perfil. Escolher um acima preenche tudo de uma vez.</div>
      </sc-if>
      <sc-if value="{{ rmDesfazerOn }}" hint-placeholder-val="{{ false }}">
        <div class="ct-rm-desfazer" role="status"><span>{{ rmDesfazerTxt }}</span><button type="button" data-rm="desfazer" onclick="{{ rmDesfazerPerfil }}" class="ct-btn-2">Desfazer</button></div>
      </sc-if>
    </section>

    <section class="ct-card ct-rm-sec" aria-labelledby="aj-metas">
      <h2 id="aj-metas" class="ct-rm-h">Quanto você estuda</h2>
      <!-- AQUI: o bloco "Dias disponíveis" (ajDiasChips) movido como está -->
      <div class="ct-rm-regua">
        <sc-for list="{{ rmMarcas }}" as="m" hint-placeholder-count="3">
          <div class="ct-rm-marca">
            <label for="{{ m.id }}" class="ct-eb">{{ m.rot }}</label>
            <div class="ct-rm-passo">
              <button type="button" data-k="{{ m.k }}" data-d="-15" aria-label="{{ m.menos }}" onclick="{{ rmPasso }}" class="ct-rm-pm">−</button>
              <input id="{{ m.id }}" type="number" inputmode="numeric" data-k="{{ m.k }}" value="{{ m.v }}" oninput="{{ setOrient }}" onblur="{{ rmOrdenarMetas }}" class="aj-meta ct-campo ct-campo-num ct-rm-num">
              <button type="button" data-k="{{ m.k }}" data-d="15" aria-label="{{ m.mais }}" onclick="{{ rmPasso }}" class="ct-rm-pm">+</button>
            </div>
            <div class="ct-rm-hm">{{ m.hm }} · {{ m.desc }}</div>
          </div>
        </sc-for>
      </div>
      <div class="ct-eb ct-rm-rot">Cobrança · o que conta como dia cumprido</div>
      <div class="ct-rm-opcs" role="group" aria-label="Estilo de cobrança">
        <sc-for list="{{ rmCobrancas }}" as="c" hint-placeholder-count="3">
          <button type="button" data-k="cobranca" data-v="{{ c.v }}" aria-pressed="{{ c.pressed }}" onclick="{{ setOrientVal }}" class="{{ c.cls }}"><b>{{ c.label }}</b><span>{{ c.desc }}</span></button>
        </sc-for>
      </div>
      <!-- AQUI: o bloco "Melhor turno" (orTurnoChips) movido como está -->
    </section>

    <section class="ct-card ct-rm-sec" aria-labelledby="aj-ritmo">
      <h2 id="aj-ritmo" class="ct-rm-h">Como o dia é montado</h2>
      <div class="ct-eb ct-rm-rot">Nível</div>
      <div class="ct-rm-opcs" role="group" aria-label="Nível">
        <sc-for list="{{ rmNiveis }}" as="c" hint-placeholder-count="3"><button type="button" data-k="nivel" data-v="{{ c.v }}" aria-pressed="{{ c.pressed }}" onclick="{{ setOrientVal }}" class="{{ c.cls }}"><b>{{ c.label }}</b><span>{{ c.desc }}</span></button></sc-for>
      </div>
      <div class="ct-eb ct-rm-rot">Estratégia</div>
      <div class="ct-rm-opcs" role="group" aria-label="Estratégia">
        <sc-for list="{{ rmEstrategias }}" as="c" hint-placeholder-count="3"><button type="button" data-k="estrategia" data-v="{{ c.v }}" aria-pressed="{{ c.pressed }}" onclick="{{ setOrientVal }}" class="{{ c.cls }}"><b>{{ c.label }}</b><span>{{ c.desc }}</span></button></sc-for>
      </div>
      <div class="ct-rm-duas">
        <div>
          <label for="aj-f-blocoPadrao" class="ct-eb ct-rm-rot">Tamanho do bloco</label>
          <div class="ct-rm-passo">
            <button type="button" data-k="blocoPadrao" data-d="-5" aria-label="Diminuir o bloco em 5 minutos" onclick="{{ rmPasso }}" class="ct-rm-pm">−</button>
            <input id="aj-f-blocoPadrao" type="number" inputmode="numeric" data-k="blocoPadrao" value="{{ orient.blocoPadrao }}" oninput="{{ setOrient }}" class="ct-campo ct-campo-num ct-rm-num">
            <button type="button" data-k="blocoPadrao" data-d="5" aria-label="Aumentar o bloco em 5 minutos" onclick="{{ rmPasso }}" class="ct-rm-pm">+</button>
          </div>
        </div>
        <div>
          <div class="ct-eb ct-rm-rot">Energia de todo dia</div>
          <div class="ct-rm-opcs ct-rm-opcs-curtas" role="group" aria-label="Energia de todo dia">
            <sc-for list="{{ rmEnergiaBase }}" as="c" hint-placeholder-count="3"><button type="button" data-k="energia" data-v="{{ c.v }}" aria-pressed="{{ c.pressed }}" onclick="{{ setOrientVal }}" class="{{ c.cls }}"><b>{{ c.label }}</b></button></sc-for>
          </div>
        </div>
      </div>
      <div class="ct-eb ct-rm-rot">Energia de hoje · vale só hoje, amanhã volta à de todo dia</div>
      <div class="ct-rm-opcs" role="group" aria-label="Energia de hoje">
        <sc-for list="{{ rmEnergiaHoje }}" as="c" hint-placeholder-count="3"><button type="button" data-v="{{ c.v }}" aria-pressed="{{ c.pressed }}" onclick="{{ setOrientRadio }}" class="{{ c.cls }}"><b>{{ c.label }}</b><span>{{ c.desc }}</span></button></sc-for>
      </div>
      <!-- AQUI: select aj-f-modoPadrao e o rótulo-checkbox focoEstrategico, movidos como estão -->
    </section>

    <!-- AQUI: cartão "Critérios de prioridade" renomeado para "O que pesa na sugestão",
         seguido do cartão "Planejamento da semana" (h2#aj-plan), movidos como estão -->

    <details class="ct-card ct-rm-recolhe"><summary>Reta final</summary>
      <!-- AQUI: select aj-f-retaFinalCom + checkboxes ativarReta e reduzirTeoria -->
    </details>
    <details class="ct-card ct-rm-recolhe"><summary>Prova e prática</summary>
      <!-- AQUI: select aj-f-banca (com a nota), cartão "Onde praticar questões" (aj-plataforma),
           select aj-f-aoAbrir e o conteúdo de "Flashcards — ajustes avançados" (campos aj-f-anki*) -->
    </details>
  </div>

  <aside class="ct-rm-previa" data-rm="previa" aria-label="Seu dia com estes ajustes">
    <div class="ct-rm-previa-eb">Seu dia com estes ajustes</div>
    <div class="ct-rm-previa-num">{{ ajPrevTotal }} <span>de {{ ajPrevMeta }}</span></div>
    <div class="ct-rm-previa-veredito">{{ ajPrevVeredito }}</div>
    <div class="ct-rm-barra" data-rm="barra" role="img" aria-label="Blocos do dia por matéria">
      <sc-for list="{{ rmBarra }}" as="s" hint-placeholder-count="4"><i style="{{ s.style }}" title="{{ s.rot }}"></i></sc-for>
    </div>
    <button type="button" class="ct-rm-previa-abre" aria-expanded="{{ rmPrevAberta }}" onclick="{{ rmTogglePrev }}">{{ rmPrevChevron }}</button>
    <div class="ct-rm-previa-lista" data-aberta="{{ rmPrevAberta }}">
      <sc-for list="{{ ajPrevBlocos }}" as="pb" hint-placeholder-count="5">
        <div class="ct-rm-previa-linha"><span>{{ pb.disc }} <em>· {{ pb.kind }}</em></span><span>{{ pb.min }}</span></div>
      </sc-for>
    </div>
    <div class="ct-rm-previa-fatos">
      <div><span>Semana</span><b>{{ ajPrevSemana }}</b></div>
      <div><span>Disponibilidade</span><b>{{ ajPrevDias }}</b></div>
      <sc-if value="{{ rmRetaOn }}" hint-placeholder-val="{{ false }}"><div><span>Prova</span><b>{{ rmRetaTxt }}</b></div></sc-if>
    </div>
    <div class="ct-rm-previa-cumprido">{{ rmCumpridoTxt }}</div>
  </aside>
</div>
</sc-if>
```

O campo "Tempo médio por dia", os chips "Nível atual"/"Energia padrão" antigos, o select
`aj-f-cobranca`, o select `aj-f-estrategia`, os três cartões-rádio "Plano por energia mental"
e o cartão "Como está ficando" deixam de existir (substituídos pelos blocos acima). Remova do
objeto de retorno do render as variáveis que ficarem sem uso no template (confira com
`grep -c "{{ orEnBaixa" Catedra.dc.html` etc. antes de apagar cada uma).

- [ ] **Passo 3: CSS** — ao fim de `catedra-ui.css`:

```css
/* ═══ AJUSTES · RITMO E METAS (03/10/2026) ═══ */
.ct-rm { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--ct-e5, 20px); align-items: start; }
.ct-rm-decisoes { display: flex; flex-direction: column; gap: var(--ct-e4, 16px); min-width: 0; order: 2; }
.ct-rm-h { margin: 0; font-family: var(--display); font-weight: 700; font-size: var(--fs-xl); letter-spacing: -.01em; color: var(--ink); }
.ct-rm-sub { margin: var(--ct-e1, 4px) 0 var(--ct-e4, 16px); font-size: var(--fs-sm); color: var(--text2); }
.ct-rm-rot { display: block; margin: var(--ct-e4, 16px) 0 var(--ct-e2, 8px); }
.ct-rm-perfis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--ct-e3, 12px); }
.ct-rm-perfil { display: flex; flex-direction: column; gap: var(--ct-e1, 4px); text-align: left; cursor: pointer; font-family: inherit;
  min-height: 132px; padding: var(--ct-e4, 16px); border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--ink);
  transition: border-color .15s, box-shadow .15s, transform .15s; }
.ct-rm-perfil:hover { border-color: var(--accent); transform: translateY(-1px); }
.ct-rm-perfil-on { border-color: var(--accent); background: var(--accentSoft); box-shadow: 0 0 0 2px var(--accent) inset; }
.ct-rm-perfil-regua { display: flex; flex-direction: column; gap: 3px; margin-bottom: var(--ct-e2, 8px); }
.ct-rm-perfil-regua i { display: block; height: 5px; border-radius: 99px; background: var(--accent); }
.ct-rm-perfil-regua i:nth-child(1) { opacity: .35; } .ct-rm-perfil-regua i:nth-child(3) { opacity: .6; }
.ct-rm-perfil-nome { font-family: var(--display); font-weight: 700; font-size: var(--fs-lg); }
.ct-rm-perfil-desc { font-size: var(--fs-sm); color: var(--text2); }
.ct-rm-perfil-resumo { margin-top: auto; font-family: var(--mono); font-size: var(--fs-xs); color: var(--text2); }
.ct-rm-nota { margin-top: var(--ct-e3, 12px); font-size: var(--fs-sm); color: var(--text2); }
.ct-rm-desfazer { margin-top: var(--ct-e3, 12px); display: flex; align-items: center; justify-content: space-between; gap: var(--ct-e3, 12px); flex-wrap: wrap;
  padding: var(--ct-e3, 12px) var(--ct-e4, 16px); border-radius: var(--radius); background: var(--accentSoft); color: var(--accentD); font-size: var(--fs-sm); }
.ct-rm-regua { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--ct-e4, 16px); margin-top: var(--ct-e4, 16px); }
.ct-rm-passo { display: flex; align-items: stretch; gap: var(--ct-e1, 4px); }
.ct-rm-pm { flex: none; width: var(--ct-alvo-toque, 44px); min-height: var(--ct-alvo-toque, 44px); border-radius: var(--r-md, 10px); border: 1px solid var(--border);
  background: var(--surface2); color: var(--ink); font-size: var(--fs-lg); font-weight: 700; cursor: pointer; font-family: inherit; }
.ct-rm-pm:hover { border-color: var(--accent); }
.ct-rm-num { flex: 1; min-width: 0; text-align: center; min-height: var(--ct-alvo-toque, 44px); font-size: var(--fs-md); }
.ct-rm-hm { margin-top: var(--ct-e1, 4px); font-size: var(--fs-xs); color: var(--text2); }
.ct-rm-opcs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--ct-e2, 8px); }
.ct-rm-opcs-curtas { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ct-rm-opc { display: flex; flex-direction: column; gap: 2px; text-align: left; min-height: var(--ct-alvo-toque, 44px); padding: var(--ct-e2, 8px) var(--ct-e3, 12px);
  border-radius: var(--r-md, 10px); border: 1px solid var(--border); background: var(--surface); color: var(--ink); cursor: pointer; font-family: inherit; font-size: var(--fs-sm); }
.ct-rm-opc span { font-size: var(--fs-xs); color: var(--text2); font-weight: 400; }
.ct-rm-opc-on { border-color: var(--accent); background: var(--accentSoft); color: var(--accentD); }
.ct-rm-opc-on span { color: var(--accentD); }
.ct-rm-duas { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--ct-e4, 16px); }
.ct-rm-recolhe > summary { cursor: pointer; min-height: var(--ct-alvo-toque, 44px); display: flex; align-items: center; font-weight: 600; font-size: var(--fs-lg); color: var(--ink); }
.ct-rm-recolhe[open] > summary { margin-bottom: var(--ct-e4, 16px); }

.ct-rm-previa { order: 1; position: sticky; top: 0; z-index: 3; border-radius: var(--radius); padding: var(--ct-e4, 16px) var(--ct-e5, 20px);
  background: var(--heroGrad); color: #fff; }
.ct-rm-previa-eb { font-size: var(--fs-2xs); letter-spacing: .08em; text-transform: uppercase; font-weight: 700; opacity: .85; }
.ct-rm-previa-num { font-family: var(--display); font-weight: 700; font-size: clamp(28px, 4vw, 44px); letter-spacing: -.02em; line-height: 1.05; margin-top: var(--ct-e1, 4px); }
.ct-rm-previa-num span { font-size: .45em; font-weight: 600; opacity: .85; }
.ct-rm-previa-veredito { font-size: var(--fs-sm); line-height: 1.5; margin: var(--ct-e2, 8px) 0 var(--ct-e3, 12px); }
.ct-rm-barra { display: flex; gap: 3px; height: 14px; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.18); }
.ct-rm-barra i { display: block; min-width: 6px; transition: flex-grow .3s; }
.ct-rm-previa-abre { margin-top: var(--ct-e2, 8px); min-height: var(--ct-alvo-toque, 44px); background: transparent; border: none; color: #fff; font: inherit; font-size: var(--fs-sm); font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; }
.ct-rm-previa-lista[data-aberta="false"] { display: none; }
.ct-rm-previa-linha { display: flex; justify-content: space-between; gap: var(--ct-e3, 12px); padding: var(--ct-e2, 8px) 0; border-top: 1px solid rgba(255,255,255,.22); font-size: var(--fs-sm); }
.ct-rm-previa-linha em { font-style: normal; opacity: .85; }
.ct-rm-previa-linha span:last-child { font-family: var(--mono); flex: none; }
.ct-rm-previa-fatos { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--ct-e2, 8px); margin-top: var(--ct-e3, 12px); }
.ct-rm-previa-fatos div { background: rgba(255,255,255,.14); border-radius: var(--r-md, 10px); padding: var(--ct-e2, 8px) var(--ct-e3, 12px); }
.ct-rm-previa-fatos span { display: block; font-size: var(--fs-2xs); opacity: .85; }
.ct-rm-previa-fatos b { font-size: var(--fs-sm); }
.ct-rm-previa-cumprido { margin-top: var(--ct-e2, 8px); font-size: var(--fs-xs); opacity: .9; }

@container (min-width: 1040px) { .ct-rm { grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr); }
  .ct-rm-decisoes { order: 1; } .ct-rm-previa { order: 2; top: var(--ct-e4, 16px); }
  .ct-rm-previa-abre { display: none; } .ct-rm-previa-lista[data-aberta="false"] { display: block; } }
@media (prefers-reduced-motion: reduce) { .ct-rm-perfil, .ct-rm-barra i { transition: none; } .ct-rm-perfil:hover { transform: none; } }
```

Antes de gravar, confira os nomes reais dos tokens de espaçamento e do raio médio com
`grep -n -E "^\s*--ct-e[0-9]|--r-md" catedra-ui.css | head -12` e ajuste os nomes (os valores
de reserva depois da vírgula ficam). Se `#ct-main` (ou o contêiner da view) não for
`container-type: inline-size`, declare `container-type: inline-size` no invólucro da view de
Ajustes em vez de usar `@media`: a largura que importa é a da área de conteúdo, não a da
janela (o menu lateral ocupa parte dela). O `#fff` sobre `--heroGrad` segue o uso que o
próprio app já faz no hero (ver `Catedra.dc.html`, "Respiração guiada"); o contraste é medido
na tarefa 3 — se algum tema ficar abaixo de 4,5:1, troque o fundo da prévia por
`var(--accentFill)` nesse tema.

- [ ] **Passo 4: conferir na tela**

`preview_start` com o servidor de `.claude/launch.json` (ANTES de clicar em qualquer coisa,
confira que não há sessão real: `Object.keys(localStorage).filter(k=>k.startsWith('sb-'))`
deve vir vazio — preview logado sobrescreve a nuvem). Abra Ajustes → Ritmo e metas; tire
captura em 1280 px, 768 px e 390 px, claro e escuro. Aplique Intensivo, veja a prévia mudar e
"Desfazer" aparecer; troque a energia de hoje e veja os minutos dos blocos mudarem.

- [ ] **Passo 5: suíte da aba e commit**

Rode os casos `RITMO` (tarefa 1) e `select-host` (vai falhar em `aj-f-cobranca`: em
`tests/select-host.mjs:55` troque `'aj-f-cobranca'` por `'aj-f-banca'` e, como `aj-f-banca`
agora mora num `<details>` fechado, acrescente ao estado da tela `ajustes` a abertura dele —
no roteiro, antes de medir: `document.querySelectorAll('details.ct-rm-recolhe').forEach(d=>d.open=true)`).
Faça o mesmo em `tests/run.mjs:6623` (`aj-plataforma`) e `:8296` (`aj-f-banca`) se o caso
depender de o campo estar visível.

```bash
git add Catedra.dc.html catedra-ui.css tests/select-host.mjs tests/run.mjs
git commit -m "Ritmo e metas é refeita: perfis no topo, decisões por pergunta e a prévia do dia sempre à vista"
```

---

### Tarefa 3: testes de aparência da tela

**Arquivos:** Modificar `tests/ajustes-ritmo.mjs`.

**Interfaces — consome:** seletores `data-rm` da tarefa 2.

- [ ] **Passo 1: acrescentar ao fim de `testarAjustesRitmo`**

```js
  // ── aparência medida ───────────────────────────────────────────────────────────
  const medir = () => {
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const razao = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
    const fundoDe = (el) => { for (let n = el; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255,255,255)'; };
    const r = {};
    const sc = document.querySelector('#ct-main'); sc.scrollTop = sc.scrollHeight;
    const pv = document.querySelector('[data-rm="previa"]').getBoundingClientRect();
    r.previaVisivel = pv.bottom > 0 && pv.top < innerHeight && pv.height > 60;
    r.semRolagemLateral = document.documentElement.scrollWidth <= innerWidth + 1 && sc.scrollWidth <= sc.clientWidth + 1;
    sc.scrollTop = 0;
    r.contraste = [...document.querySelectorAll('.ct-rm-perfil-nome, .ct-rm-perfil-desc, .ct-rm-perfil-resumo, .ct-rm-opc b, .ct-rm-opc span, .ct-rm-hm, .ct-rm-sub')]
      .map(el => ({ t: el.textContent.trim().slice(0, 24), c: razao(getComputedStyle(el).color, fundoDe(el)) })).filter(x => x.c < 4.5);
    r.alvos = [...document.querySelectorAll('.ct-rm button, .ct-rm summary')].filter(b => b.offsetParent)
      .map(b => { const q = b.getBoundingClientRect(); return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24), w: Math.round(q.width), h: Math.round(q.height) }; })
      .filter(x => x.w < 44 || x.h < 44);
    r.perfis = document.querySelectorAll('[data-rm="perfil"]').length;
    r.marcado = document.querySelectorAll('[data-rm="perfil"][aria-pressed="true"]').length;
    r.segmentos = document.querySelectorAll('[data-rm="barra"] i').length;
    r.emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.querySelector('.ct-rm').textContent);
    return r;
  };
  for (const [w, h, toque] of [[1280, 900, false], [768, 1024, true], [390, 844, true]]) {
    for (const escuro of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque });
      const page = await ctx.newPage();
      try {
        await semear(page, base); await abrir(page, base, arquivo);
        await page.evaluate((d) => window.__catedraApp.setState({ darkMode: d }), escuro); await page.waitForTimeout(300);
        const r = await page.evaluate(medir); const T = R + w + 'px ' + (escuro ? 'escuro' : 'claro') + ': ';
        ok(r.previaVisivel, T + 'prévia continua na janela depois de rolar até o fim');
        ok(r.semRolagemLateral, T + 'sem rolagem lateral');
        ok(r.contraste.length === 0, T + 'textos ≥ 4,5:1 (' + JSON.stringify(r.contraste) + ')');
        if (toque) ok(r.alvos.length === 0, T + 'alvos ≥ 44 px (' + JSON.stringify(r.alvos) + ')');
        ok(r.perfis === 3 && r.marcado === 1, T + 'três perfis, um marcado (fábrica = Equilíbrio)');
        ok(r.segmentos > 0, T + 'barra do dia tem segmentos');
        ok(!r.emoji, T + 'nenhum emoji como ícone');
        if (opcoes.capturas) await page.screenshot({ path: opcoes.capturas + '/ritmo-' + w + (escuro ? '-escuro' : '') + '.png' });
      } finally { await ctx.close(); }
    }
  }

  // ── a prévia branca sobre o gradiente: contraste no ponto mais claro do fundo ──
  // (gradiente não tem "cor de fundo": mede-se o texto contra as duas pontas do --heroGrad)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      const pior = await page.evaluate(() => {
        const g = getComputedStyle(document.querySelector('[data-rm="previa"]')).backgroundImage;
        const cores = g.match(/rgba?\([^)]+\)/g) || [];
        const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
        return { n: cores.length, min: Math.min(...cores.map(c => 1.05 / (lum(c) + .05))) };
      });
      ok(pior.n >= 2 && pior.min >= 4.5, R + 'texto branco da prévia ≥ 4,5:1 nas pontas do gradiente (' + pior.min.toFixed(2) + ')');
    } finally { await ctx.close(); }
  }

  // ── interação pela tela + zero dias (Foco da revisão 4) ─────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    try {
      await semear(page, base); await abrir(page, base, arquivo);
      await page.click('[data-rm="perfil"][data-v="constancia"]'); await page.waitForTimeout(1400);
      ok((await orientSalvo(page)).metaIdeal === '120', R + 'clicar em Constância grava a meta de 2h');
      ok(await page.locator('[data-rm="desfazer"]').isVisible(), R + 'Desfazer aparece depois de aplicar');
      await page.click('[data-rm="desfazer"]'); await page.waitForTimeout(1400);
      ok((await orientSalvo(page)).metaIdeal === '180', R + 'Desfazer pela tela restaura');
      await page.click('button[data-k="metaIdeal"][data-d="15"]'); await page.waitForTimeout(400);
      ok(await page.locator('[data-rm="personalizado"]').isVisible(), R + 'mexer num valor mostra "Personalizado"');
      await page.evaluate(() => window.__catedraApp.setState(s => ({ orient: { ...s.orient, dias: '' } }))); await page.waitForTimeout(300);
      const txt = await page.locator('[data-rm="previa"]').innerText();
      ok(/nenhum dia marcado/i.test(txt) && !/NaN|Infinity/.test(txt), R + 'zero dias: a prévia avisa, sem NaN');
    } finally { await ctx.close(); }
  }
```

- [ ] **Passo 2: rodar** — mesmo comando da tarefa 1, em Chromium e depois
`npm run test:webkit` (ou o filtro equivalente). Esperado: verde. Falha de contraste ou de
alvo é defeito da tarefa 2: corrija o CSS, não o limiar.

- [ ] **Passo 3: olhar as capturas** — rode com `opcoes.capturas` apontando para o scratchpad
e abra os seis PNG. Conferir: nada cortado, prévia legível, hierarquia clara.

- [ ] **Passo 4: commit**

```bash
git add tests/ajustes-ritmo.mjs catedra-ui.css Catedra.dc.html
git commit -m "A aba Ritmo e metas é medida: prévia fixa, contraste, alvos de toque e três larguras"
```

---

### Tarefa 4: fechar o PR 1

- [ ] `node scripts/verificar-segredos.mjs` → sem achados.
- [ ] `CT_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` e
      `npm run test:webkit` inteiros (podem rodar em paralelo). Esperado: verdes. Antes de
      depurar teste lento, confira carga da máquina (`ps -Ao %cpu,comm | sort -nr | head -5`).
- [ ] `git push -u origin ajustes-ritmo-metas` e
      `gh pr create --title "Ritmo e metas refeita: perfis prontos, régua única e prévia do dia sempre à vista" --body "…"`
      (corpo: o que mudou para a pessoa, casos novos, pendências; termina com a linha de
      atribuição do Claude Code).
- [ ] Vincular o PR (`ccd_pr`), esperar a CI verde, `gh pr merge --merge`.
- [ ] Avisar a sessão instaladora ("Fusão de melhorias do Codex") que o PR entrou na `main`
      e precisa de build e instalação no Mac e no iPad.

---

### Tarefa 5 (PR 2): nível muda o conteúdo dos blocos

**Arquivos:**
- Modificar: `Catedra.dc.html` — `_genVolta` (função `proximo`, ~10500–10520)
- Criar: `tests/ciclo-nivel-estrategia.mjs`; ligar em `run.mjs` e `run-webkit.mjs`

Branch nova a partir da `main` já com o PR 1: `git switch -c ciclo-nivel-estrategia origin/main`.

**Interfaces — produz:** `_genVolta(modo, n)` continua com a mesma assinatura e o mesmo
formato de retorno; passa a ler `orient.nivel`.

- [ ] **Passo 1: teste que falha**

`tests/ciclo-nivel-estrategia.mjs`:

```js
/* CICLO × NÍVEL E ESTRATÉGIA (03/10/2026). Nível e estratégia eram enfeite em Ajustes;
   agora mudam a volta. Prova-se pela própria _genVolta, com edital semeado e relógio fixo. */
const EDITAL = [
  { disc: 'Direito Civil', peso: 3, questoes: 15, topics: ['Obrigações', 'Contratos', 'Posse'].map(n => ({ name: n, done: false, subs: [] })) },
  { disc: 'Direito Penal', peso: 2, questoes: 10, topics: ['Teoria do crime', 'Penas'].map(n => ({ name: n, done: false, subs: [] })) },
  { disc: 'Direito Constitucional', peso: 2, questoes: 10, topics: ['Controle', 'Direitos fundamentais'].map(n => ({ name: n, done: false, subs: [] })) }];
// sessões com líquido negativo em "Obrigações": dá sinal de tópico frágil (≥ 6 questões)
const SESSOES = (hoje) => [{ id: 's1', up: 1, date: hoje, disc: 'Direito Civil', topico: 'Obrigações', min: 40, q: 20, a: 6, e: 14, categorias: ['Questões'] }];

const volta = (page, orient) => page.evaluate((o) => { const a = window.__catedraApp;
  a.setState(s => ({ orient: { ...s.orient, ...o } }));
  return a._genVolta('pesos', 1).blocos.map(b => ({ disc: b.disc, kind: b.kind, tag: b.tag, min: b.min })); }, orient);

export async function testarCicloNivelEstrategia(pageDaSuite, base, ok, opcoes = {}) {
  const motor = opcoes.motor || 'chromium'; const arquivo = opcoes.arquivo || 'Catedra.dc.html';
  const R = 'CICLO-NÍVEL [' + motor + '] ';
  const ctx = await pageDaSuite.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  const t = new Date(); t.setHours(14, 0, 0, 0); await page.clock.install({ time: t });
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(([ed, ss]) => { localStorage.clear();
      const set = (k, v) => localStorage.setItem('catedra:' + k, typeof v === 'string' ? v : JSON.stringify(v));
      set('auth', '1'); set('onboarded', '1'); set('areaEstudo', 'juridica'); set('edital', ed); set('sessions', ss); set('reviews', []); set('errors', []);
    }, [EDITAL, SESSOES(t.toISOString().slice(0, 10))]);
    await page.goto(base + '/' + arquivo);
    await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('#ct-main'), null, { timeout: 20000 });

    const padrao = await volta(page, { nivel: 'intermediario', estrategia: 'ciclo' });
    ok(padrao.length >= 4, R + 'a volta de fábrica tem blocos (' + padrao.length + ')');
    ok(JSON.stringify(padrao) === JSON.stringify(opcoes.voltaDeReferencia || padrao), R + 'fábrica gera a volta de antes');
    const primeiroDe = (v, disc) => v.find(b => b.disc === disc);

    const ini = await volta(page, { nivel: 'iniciante', estrategia: 'ciclo' });
    ok(['Direito Civil', 'Direito Penal', 'Direito Constitucional'].every(d => primeiroDe(ini, d).kind === 'Teoria'), R + 'iniciante: nenhuma matéria abre com questões');
    const base = await page.evaluate(() => Math.max(20, Math.round((parseInt(window.__catedraApp.state.orient.blocoPadrao, 10) || 50) * window.__catedraApp._enMult())));
    ok(ini.filter(b => b.kind === 'Questões').every(b => b.min === Math.max(15, Math.round(base * .6))), R + 'iniciante: questões com 0,6 × o bloco');

    const ava = await volta(page, { nivel: 'avancado', estrategia: 'ciclo' });
    const porPonto = {}; ava.forEach(b => { const k = b.disc + '|' + b.tag; (porPonto[k] || (porPonto[k] = [])).push(b.kind); });
    const pontos = Object.keys(porPonto).filter(k => EDITAL.some(e => e.topics.some(tp => k === e.disc + '|' + tp.name)));
    ok(pontos.length > 0 && pontos.every(k => porPonto[k][0] === 'Questões'), R + 'avançado: cada ponto pendente entra primeiro como questões');
    ok(ava.filter(b => b.kind === 'Teoria').every(b => b.min === Math.max(15, Math.round(base * .7))), R + 'avançado: teoria com 0,7 × o bloco');
    return { padrao };
  } finally { await ctx.close(); }
}
```

A referência "volta de antes": ANTES de mexer no app, rode este roteiro uma vez na `main`
(só até `padrao`), grave o JSON impresso em `tests/fixtures/volta-fabrica.json` e passe-o em
`opcoes.voltaDeReferencia` na chamada da suíte:

```js
import voltaFabrica from './fixtures/volta-fabrica.json' with { type: 'json' };
await testarCicloNivelEstrategia(page, base, ok, { motor: 'chromium', voltaDeReferencia: voltaFabrica });
```

(se o Node da CI não aceitar `with { type: 'json' }`, leia com
`JSON.parse(fs.readFileSync(new URL('./fixtures/volta-fabrica.json', import.meta.url)))`.)

- [ ] **Passo 2: rodar e ver falhar** — esperado: FALHA em "iniciante: nenhuma matéria abre
com questões" (Civil abre com o tópico frágil) e em "avançado: …".

- [ ] **Passo 3: implementar** — em `_genVolta`, antes de `const usado={}`:

```js
    /* NÍVEL (03/10/2026): iniciante vê antes de fazer (nunca abre com questões, questões
       curtas); intermediário é o método de sempre; avançado aprende fazendo (questões do ponto
       antes da teoria, teoria curta, revisão geral antes de lei seca e jurisprudência). */
    const nivel=(O.nivel==='iniciante'||O.nivel==='avancado')?O.nivel:'intermediario';
    const mQ=Math.round(base*(nivel==='iniciante'?.6:(nivel==='avancado'?1:.8)));
    const mT=Math.round(base*(nivel==='avancado'?.7:1));
```

e, dentro de `proximo`, trocar o trecho do `if(idx===0 && fraco …)` até o `const GEN=[…]` por:

```js
      if(nivel!=='iniciante' && idx===0 && fraco && fr && !usado[k0(d.disc,'Questões',fr.topico)])
        return pega('Questões', fr.topico, mQ, (fr.dom<=0?'líquido negativo neste tópico':('domínio de '+Math.round(fr.dom*100)+'% neste tópico')));
      const pend=d.pend||[];
      const t1=pend.find(t=>!usado[k0(d.disc,'Teoria',t)]);
      const t2=pend.find(t=>!usado[k0(d.disc,'Questões',t)]);
      if(nivel==='avancado'){
        if(t2) return pega('Questões', t2, mQ, 'avançado: comece pelas questões do ponto');
        if(t1) return pega('Teoria', t1, mT, 'fechar na teoria o que as questões mostraram');
      } else {
        if(t1) return pega('Teoria', t1, mT, (p.diasSem==null?'nunca estudada por aqui':'próximo ponto pendente do edital'));
        if(t2) return pega('Questões', t2, mQ, 'fixar com questões o que já foi visto');
      }
      const GEN0=[['Teoria','ponto seguinte do programa',mT,'sem edital: siga o programa da matéria'],['Questões','questões comentadas',mQ,'fixar com questões'],
        ['Lei seca','artigos mais citados',Math.round(base*.7),'reforço na lei seca'],['Jurisprudência','súmulas e teses',Math.round(base*.7),'o que os tribunais firmaram'],['Revisão','revisão geral',Math.round(base*.6),'manter o domínio']];
      const GEN=(nivel==='avancado') ? [GEN0[1],GEN0[0],GEN0[4],GEN0[2],GEN0[3]] : GEN0;
```

(No intermediário `mQ = round(base×0,8)` e `mT = base`: os mesmos números de hoje.)

- [ ] **Passo 4: rodar e ver passar**; conferir que `tests/ciclo-inteligente.mjs` segue verde.

- [ ] **Passo 5: commit**

```bash
git add Catedra.dc.html tests/ciclo-nivel-estrategia.mjs tests/fixtures/volta-fabrica.json tests/run.mjs tests/run-webkit.mjs
git commit -m "O nível passa a mudar o ciclo: iniciante vê a teoria antes, avançado começa pelas questões"
```

---

### Tarefa 6 (PR 2): estratégia muda a ordem e os extras; a volta se refaz sem tocar no que foi feito

**Arquivos:** Modificar `Catedra.dc.html` (`_genVolta` — laço de intercalação ~10522–10530;
`_extrasDoDia` ~10536–10545; `setOrientVal`/`setOrient`; método novo `_refazerPendentes`);
`tests/ciclo-nivel-estrategia.mjs`.

**Interfaces — produz:** `_refazerPendentes()` — refaz os blocos não concluídos da volta
atual e recompõe o dia; sem efeito no modo manual ou sem volta.

- [ ] **Passo 1: testes que falham** — acrescentar antes do `return { padrao }`:

```js
    const seq = await volta(page, { nivel: 'intermediario', estrategia: 'sequencial' });
    const ordem = seq.map(b => b.disc).filter((d, i, a) => i === 0 || a[i - 1] !== d);
    ok(new Set(ordem).size === ordem.length, R + 'sequencial: nenhuma matéria reaparece depois de outra começar (' + ordem.join(' → ') + ')');
    ok(seq.length === padrao.length, R + 'sequencial: mesma quantidade de blocos da volta padrão');

    // foco em revisão: 3 matérias com revisão vencida → 3 extras de revisão (hoje é 1)
    const extras = (estrategia) => page.evaluate((e) => { const a = window.__catedraApp;
      a.setState(s => ({ orient: { ...s.orient, estrategia: e }, reviews: ['Direito Civil', 'Direito Penal', 'Direito Constitucional', 'Direito Civil']
        .map((d, i) => ({ id: 'r' + i, up: 1, disc: d, topic: 'T' + i, due: -1 })) }));
      return a._extrasDoDia().filter(x => x.kind === 'Revisão').map(x => ({ id: x.id, disc: x.disc, min: x.min })); }, estrategia);
    ok((await extras('ciclo')).length === 1, R + 'ciclo por blocos: um extra de revisão, como hoje');
    const rv = await extras('revisao');
    ok(rv.length === 3 && new Set(rv.map(x => x.disc)).size === 3 && rv.every(x => x.min <= 45), R + 'foco em revisão: 3 extras, um por matéria, ≤ 45 min (' + JSON.stringify(rv) + ')');
    ok(new Set(rv.map(x => x.id)).size === 3, R + 'extras de revisão têm id único');
    const rvVolta = await volta(page, { estrategia: 'revisao' });
    ok(rvVolta.find(b => b.disc === 'Direito Civil').kind === 'Revisão', R + 'foco em revisão: matéria já estudada abre com revisão geral');
    ok(rvVolta.find(b => b.disc === 'Direito Penal').kind !== 'Revisão', R + 'matéria nunca estudada não abre com revisão');

    // trocar a estratégia no meio da volta preserva o que foi concluído
    const antesDepois = await page.evaluate(async () => { const a = window.__catedraApp;
      a.setState(s => ({ orient: { ...s.orient, estrategia: 'ciclo' }, reviews: [], cycleMode: 'pesos' }));
      const V = a._genVolta('pesos', 1); V.blocos[0].done = true; V.blocos[0].doneDate = a._hoje();
      a.setState({ cicloVolta: V, blocks: a._comporDia(V, []), blocksDate: a._hoje() });
      const feito = V.blocos[0].id + '|' + V.blocos[0].disc + '|' + V.blocos[0].tag;
      a.setOrientVal({ currentTarget: { dataset: { k: 'estrategia', v: 'sequencial' } } });
      await new Promise(r => setTimeout(r, 300));
      const N = a.state.cicloVolta; const f = N.blocos.filter(b => b.done);
      return { feito, depois: f.map(b => b.id + '|' + b.disc + '|' + b.tag), ids: N.blocos.map(b => b.id), total: N.blocos.length }; });
    ok(antesDepois.depois.length === 1 && antesDepois.depois[0] === antesDepois.feito, R + 'bloco concluído fica igual depois de trocar a estratégia');
    ok(new Set(antesDepois.ids).size === antesDepois.total, R + 'ids da volta continuam únicos');

    // Foco da revisão 5: tudo concluído → nada é refeito, nada some
    const tudoFeito = await page.evaluate(async () => { const a = window.__catedraApp;
      const V = a._genVolta('pesos', 1); V.blocos.forEach(b => { b.done = true; b.doneDate = a._hoje(); });
      a.setState({ cicloVolta: V, blocks: a._comporDia(V, []), blocksDate: a._hoje() }); const n = V.blocos.length;
      a.setOrientVal({ currentTarget: { dataset: { k: 'estrategia', v: 'ciclo' } } }); await new Promise(r => setTimeout(r, 300));
      return { n, depois: a.state.cicloVolta.blocos.length, feitos: a.state.cicloVolta.blocos.filter(b => b.done).length }; });
    ok(tudoFeito.depois === tudoFeito.n && tudoFeito.feitos === tudoFeito.n, R + 'volta toda concluída não é tocada');
```

- [ ] **Passo 2: rodar e ver falhar.**

- [ ] **Passo 3: implementar**

(a) `_genVolta`, estratégia. Logo depois das constantes de nível:

```js
    const estrategia=(O.estrategia==='sequencial'||O.estrategia==='revisao')?O.estrategia:'ciclo';
    const estudada={}; (this.state.sessions||[]).forEach(s=>{ if(s&&s.disc) estudada[s.disc]=1; });
```

Em `proximo`, como PRIMEIRA linha do corpo (antes do `if` do tópico frágil):

```js
      if(estrategia==='revisao' && idx===0 && estudada[d.disc] && !usado[k0(d.disc,'Revisão','revisão geral')])
        return pega('Revisão', 'revisão geral', Math.round(base*.6), 'foco em revisão: abrir revisando o que já foi visto');
```

No laço de intercalação, trocar a escolha da matéria:

```js
      const d = (estrategia==='sequencial')
        ? (cands.find(c=>c.disc===last) || cands.slice().sort((a,b)=>b.w-a.w)[0])   // termina a matéria antes de abrir outra
        : (cands.find(c=>c.disc!==last)||cands[0]);
```

(a ordenação `cands.sort(...)` anterior continua; no sequencial ela só não decide.)

(b) `_extrasDoDia`: trocar o bloco `if(revs.length){ … }` por:

```js
    if(revs.length){ const por={}; revs.forEach(r=>{ por[r.disc||'—']=(por[r.disc||'—']||0)+1; });
      const ordem=Object.keys(por).sort((a,b)=>por[b]-por[a]);
      const foco=(O.estrategia==='revisao');
      (foco?ordem.slice(0,3):ordem.slice(0,1)).forEach((d,i)=>{ const n=foco?por[d]:revs.length;
        const _rv=revs.find(r=>(r.disc||'—')===d)||{};
        out.push({id:(i===0?'x-rev':'x-rev-'+i), disc:d, kind:'Revisão', tag:_rv.topic||'revisões vencidas', topico:_rv.topic||'', discEdital:(this.state.edital||[]).some(e=>String(e.disc||'').trim()===d)?d:'',
          min:Math.max(15, Math.min(45, n*8)), done:false, extra:true, motivo:(n>1?(n+' revisões vencidas'):'revisão vencida')+' — antes da volta'}); }); }
```

(o primeiro extra mantém o id `x-rev`: quem já marcou a revisão de hoje como feita não a vê
voltar.)

(c) Método novo, logo abaixo de `_recomporDia`:

```js
  /* Nível/estratégia mudaram: refaz só o que AINDA NÃO foi feito na volta. Os concluídos
     ficam com id, conteúdo e data; os pendentes vêm de uma volta nova pela regra de agora,
     sem repetir o que já foi concluído (mesma matéria+tipo+tópico) e com ids que não colidem. */
  _refazerPendentes(){ const m=this.state.cycleMode||'sugestao'; if(m==='manual'){ this.syncManual({}); return; }
    const V=this.state.cicloVolta; if(!V||!(V.blocos||[]).length) return;
    const feitos=V.blocos.filter(b=>b.done||b.pulado); const nPend=V.blocos.length-feitos.length;
    if(nPend<=0) return;
    const chave=(b)=>b.disc+'|'+b.kind+'|'+b.tag; const ja=new Set(feitos.map(chave)); const ids=new Set(feitos.map(b=>b.id));
    let i=0; const novos=this._genVolta(m, V.n||1).blocos.filter(b=>!ja.has(chave(b))).slice(0, nPend)
      .map(b=>{ let id; do{ id='v'+(V.n||1)+'-r'+(i++); }while(ids.has(id)); ids.add(id); return {...b, id}; });
    const blocos=[...feitos, ...novos];
    const nova={...V, blocos, totalMin:blocos.reduce((a,b)=>a+(+b.min||0),0)};
    this.setState({cicloVolta:nova, blocks:this._comporDia(nova, (this.state.blocks||[]).filter(b=>b.done||b.extra||(!b.voltaId&&!b.rotId)))}); }
```

(d) Em `setOrientVal` (tarefa 1) trocar a linha do `_recomporDia` por:

```js
      if(k==='nivel'||k==='estrategia') this._refazerPendentes(); else if(k==='energia') this._recomporDia(); }); };
```

e em `setOrient`, no callback, antes do `if([...].indexOf(k)>=0)`: 
`if(k==='estrategia'||k==='nivel'){ this._refazerPendentes(); return; }`.

- [ ] **Passo 4: rodar e ver passar**; rodar também `ciclo-inteligente` e `registro-sessao`.

- [ ] **Passo 5: conferir na tela** (preview, sem sessão `sb-*`): em Ajustes → Ritmo e metas,
trocar a estratégia e o nível e ver a barra da prévia reordenar; abrir o Ciclo e conferir que
o que estava concluído continua lá.

- [ ] **Passo 6: commit e PR**

```bash
git add Catedra.dc.html tests/ciclo-nivel-estrategia.mjs
git commit -m "A estratégia passa a mudar o ciclo: sequencial junta os blocos da matéria e foco em revisão põe as vencidas na frente"
```

Suítes inteiras (Chromium e WebKit), `git push`, `gh pr create`, CI verde,
`gh pr merge --merge`, aviso à sessão instaladora.

---

## Autorrevisão

- Cobertura da especificação: layout/perfis/régua/prévia (T2, T3); tempo×meta, energia,
  cobrança visível (T1, T2); nível (T5); estratégia e "quando vale" (T6); dados (T1);
  testes (T1, T3, T5, T6). A prévia usa `CYCLE_PRESETS()[modo]`, que passa por `_genVolta`
  — nível e estratégia aparecem nela sem código extra.
- Divergência assumida em relação à especificação: `aj-f-cobranca` e `aj-f-estrategia`
  deixam de existir como `<select>` (viram grupos de botões com `aria-pressed`); o teste
  `select-host` passa a medir `aj-f-banca`.
- Nomes conferidos entre tarefas: `_rmPerfilAtual`, `rmAplicarPerfil`, `rmDesfazerPerfil`,
  `rmPasso`, `rmOrdenarMetas`, `_rmMigrarEnergia`, `_enHoje`, `_refazerPendentes`.
