/* Item 2: nota por disciplina, controle independente e histórico real persistido. */
import path from 'path';
import { pathToFileURL } from 'url';

export async function testarPrioridadeDiscursiva(pageBase, base, ok) {
  await import('../prioridade-calc.js');
  const C = globalThis.CT_PRIORIDADE_CALC;
  const est = { hoje: '2026-09-23', edital: [{ disc: 'Direito Civil', peso: 1 }, { disc: 'Direito Penal', peso: 1 }],
    sessions: [], errors: [], reviews: [] };
  const reg = (nota, extra = {}) => ({ id: 'r1', ts: 100, disc: 'Direito Civil', notaTotal: nota, notaMax: 10, ...extra });
  const calc = (hist, ctrl = {}) => C.prioridadeDisciplinas({ ...est, redHist: hist,
    pesos: C.pesosDosControles(ctrl), pesosDiscursiva: C.pesosDosControles(ctrl, true) });
  const antes = C.prioridadeDisciplinas(est);
  const civil = l => l.find(x => x.disc === 'Direito Civil');
  ok(JSON.stringify(antes) === JSON.stringify(calc([])), 'DISCURSIVA sem histórico preserva toda a régua anterior');
  ok(civil(calc([reg(1)])).nota > civil(antes).nota, 'DISCURSIVA nota baixa aumenta a prioridade');
  ok(civil(calc([reg(9)])).nota < civil(calc([reg(1)])).nota, 'DISCURSIVA nota melhor reduz a fragilidade');
  ok(JSON.stringify(calc([reg(1)], { pDiscursiva: 0 }).map(x => [x.disc, x.nota])) === JSON.stringify(antes.map(x => [x.disc, x.nota])), 'DISCURSIVA controle zero desliga o fator');
  ok(JSON.stringify(calc([reg(1, { disc: '' }), reg(null), reg(2, { aproximada: true })])) === JSON.stringify(antes), 'DISCURSIVA legado sem disciplina, nota nula e espelho sugerido não alteram a régua');
  ok(JSON.stringify(calc([reg(1)]).find(x => x.disc === 'Direito Penal')) === JSON.stringify(antes.find(x => x.disc === 'Direito Penal')), 'DISCURSIVA matéria sem correção não perde peso');
  const ultimas = calc([reg(0, { ts: 1 }), ...Array.from({ length: 5 }, (_, i) => reg(10, { id: 'n'+i, ts: 10+i }))]);
  ok(civil(ultimas).fatores.some(f => f.chave === 'discursiva' && f.valor === 0), 'DISCURSIVA só as cinco tentativas mais recentes contam');
  const porQ = calc([{ id: 'multi', ts: 1, quesitos: [{ disc: 'Direito Civil', nota: 0, max: 2 }, { disc: 'Direito Penal', nota: 2, max: 2 }] }]);
  ok(civil(porQ).nota > porQ.find(x => x.disc === 'Direito Penal').nota, 'DISCURSIVA espelho multidisciplinar separa notas por quesito');
  const ponderada = calc([{ id:'p', ts:1, quesitos:[
    {disc:'Direito Civil',nota:1,max:1,peso:9},{disc:'Direito Civil',nota:0,max:1,peso:1},
    {disc:'Direito Civil',nota:0,max:1,peso:0}] }]);
  ok(Math.abs(civil(ponderada).fatores.find(f=>f.chave==='discursiva').valor-0.1)<1e-9, 'DISCURSIVA quesitos respeitam os pontos oficiais e excluem item sem nota');
  ok(JSON.stringify(calc([reg(99),reg(-1,{id:'neg'}),reg(2,{id:'sem',disc:'Outra matéria'})]))===JSON.stringify(antes), 'DISCURSIVA rejeita notas inválidas e disciplina fora do edital');
  ok(civil(calc([reg(0)],{pDiscursiva:10})).nota>civil(calc([reg(0)],{pDiscursiva:1})).nota, 'DISCURSIVA intensidade do controle próprio muda a influência');
  ok(Math.abs(Object.values(C.pesosDosControles({}, true)).reduce((a,b)=>a+b,0)-1)<1e-9, 'DISCURSIVA pesos com fator próprio somam um');

  const ctx = await pageBase.context().browser().newContext({ viewport: { width: 1180, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear(); localStorage.setItem('catedra:auth','1'); localStorage.setItem('catedra:onboarded','1');
      localStorage.setItem('catedra:edital', JSON.stringify([{ disc:'Direito Civil', peso:1, topics:[] }, { disc:'Direito Penal', peso:1, topics:[] }]));
    });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp);
    await page.evaluate(() => {
      const a=window.__catedraApp;
      a._abrirDiscursiva({ id:'teste-disc', disciplina:'Direito Civil', enunciado:'Enunciado sintético para integração.', orgao:'Teste', espelhoTexto:'Espelho sintético.', espelho:[] });
      window.__catedraGoView('redacao');
    });
    const sel=page.locator('#red-disciplina');
    await sel.waitFor({ state:'visible', timeout:5000 });
    ok(await sel.inputValue()==='Direito Civil', 'DISCURSIVA disciplina do banco preenche a seleção');
    ok(await sel.evaluate(e=>e.getBoundingClientRect().height)>=44, 'DISCURSIVA seletor tem alvo de toque de 44px');
    if(process.env.CT_CAPTURAS_DIR){
      for(const dir of ['sutil','aurora']) for(const darkMode of [false,true]){
        await page.evaluate(({dir,darkMode})=>window.__catedraApp.setState({dir,darkMode}),{dir,darkMode});
        await page.waitForTimeout(300); await sel.scrollIntoViewIfNeeded();
        const contraste=await sel.evaluate(e=>{
          const s=getComputedStyle(e), rgb=t=>(t.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
          const lum=t=>rgb(t).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
          const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        });
        ok(contraste>=4.5, 'DISCURSIVA contraste '+dir+'/'+darkMode+' = '+contraste.toFixed(2));
        await page.screenshot({path:path.join(process.env.CT_CAPTURAS_DIR,'discursiva-'+dir+'-'+darkMode+'.png')});
      }
    }
    await sel.selectOption('Direito Penal');
    await page.waitForTimeout(1400);
    await page.reload(); await page.waitForFunction(() => !!window.__catedraApp);
    const gravou=await page.evaluate(async () => {
      const a=window.__catedraApp;
      const manual=a.state.redDisciplina;
      a.setState({ redText:Array(50).fill('resposta').join(' '), redGabarito:'Espelho sintético.', redHist:[] });
      await new Promise(r=>setTimeout(r,300));
      a._redCorrigir=async()=>({ nota:2, criterios:[{ nome:'Conteúdo', nota:2, max:10 }], topicos:[], fortes:[], melhorar:[], geral:'Teste' });
      await a.submitRed();
      await new Promise(r=>setTimeout(r,1400));
      const h=JSON.parse(localStorage.getItem('catedra:redHist')||'[]');
      return { manual, h, completa:a.state.redHistory[0], prioridade:a._prioridade(), ciclo:a._genVolta('inteligente',1).blocos };
    });
    ok(gravou.manual.disc==='Direito Penal' && gravou.manual.origem==='manual', 'DISCURSIVA escolha manual prevalece e sobrevive à recarga');
    ok(gravou.h.length===1 && gravou.h[0].disc==='Direito Penal' && gravou.h[0].notaMax===10 && !!gravou.h[0].up, 'DISCURSIVA correção real salva disciplina e escala no histórico sincronizado');
    ok(gravou.completa.disc==='Direito Penal', 'DISCURSIVA histórico completo preserva a disciplina');
    ok(gravou.prioridade.find(x=>x.disc==='Direito Penal').fatores.some(f=>f.chave==='discursiva'), 'DISCURSIVA histórico alimenta a régua do host');
    ok(gravou.ciclo[0].disc==='Direito Penal', 'DISCURSIVA ciclo inteligente inicia pela prioridade atualizada');
    await page.reload(); await page.waitForFunction(() => !!window.__catedraApp);
    ok(await page.evaluate(()=>window.__catedraApp.state.redHist.some(x=>x.disc==='Direito Penal')), 'DISCURSIVA registro sobrevive ao fechamento');
    await page.evaluate(()=>{ const a=window.__catedraApp; a.setState({ajSec:'ritmo'}); window.__catedraGoView('ajustes'); });
    const slider=page.locator('input[data-k="pDiscursiva"]');
    await slider.waitFor({state:'visible',timeout:5000});
    await slider.fill('0'); await slider.dispatchEvent('input'); await page.waitForTimeout(1400);
    ok(await page.evaluate(()=>window.__catedraApp.state.orient.pDiscursiva===0), 'DISCURSIVA controle próprio altera Ajustes');
    const reidratou=await page.evaluate(async()=>{
      const a=window.__catedraApp, hist=JSON.parse(localStorage.getItem('catedra:redHist'));
      hist.push({id:'outro-aparelho',up:Date.now(),ts:Date.now(),disc:'Direito Civil',notaTotal:1,notaMax:10,quesitos:[]});
      localStorage.setItem('catedra:redHist',JSON.stringify(hist)); a._rehydrateFromLocal();
      await new Promise(r=>setTimeout(r,1400));
      return a.state.redHist.some(h=>h.id==='outro-aparelho')&&JSON.parse(localStorage.getItem('catedra:redHist')).some(h=>h.id==='outro-aparelho');
    });
    ok(reidratou, 'DISCURSIVA reidratação preserva correção vinda de outro aparelho');
    await page.goto(base+'/tests/sync-fixture.html'); await page.waitForFunction(()=>!!window.CatedraSync?._test);
    ok(await page.evaluate(()=>{
      const h={id:'r',up:200,disc:'Direito Penal',notaTotal:2,notaMax:10};
      const m=window.CatedraSync._test.mergeAll({'catedra:redHist':JSON.stringify([{id:'r',up:100}])},{'catedra:redHist':JSON.stringify([h])},false);
      const salvo=JSON.parse(m['catedra:redHist'])[0];
      return salvo.disc===h.disc && salvo.notaMax===10 && salvo.notaTotal===2;
    }), 'DISCURSIVA merge preserva disciplina e escala');
  } finally { await ctx.close(); }
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const {iniciarServidor,lancarNavegador}=await import('./_infra.mjs');
  const {srv,url}=await iniciarServidor(path.resolve(''),+(process.env.CT_PORT||8165));
  const {browser}=await lancarNavegador(); const page=await browser.newPage(); let falhas=0;
  const ok=(v,t)=>{console.log((v?'✓ ':'✗ ')+t);if(!v)falhas++;};
  try{await testarPrioridadeDiscursiva(page,url,ok);}catch(e){ok(false,e.stack);}
  await browser.close();srv.close();process.exitCode=falhas?1:0;
}
