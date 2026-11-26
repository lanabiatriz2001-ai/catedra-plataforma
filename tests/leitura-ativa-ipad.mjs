/* LEITURA ATIVA NO IPAD (LA7, 25/11/2026) — leitura-ativa.js + legis-web.html + o Baralho do host
   Parte 1 (Node, sem navegador): o painel por lei com a régua que o módulo já tinha (progresso);
   o cartão de cada PERGUNTA do dispositivo — o cloze do LA5 tal como é (uma pergunta por cartão,
   no máximo 3 lacunas), com id determinístico; a marca do inciso casada no inciso, nunca no
   tronco do caput; o saneamento do que chega do iframe; a fusão no baralho sem duplicar, sem
   zerar o FSRS e sem apagar cartão já revisado; o aviso único do gesto.
   Parte 2 (navegador):
   · no LEGIS em largura de iPad e com toque, a barra de chips abre depois de uma seleção feita SEM
     mouse (soltar o dedo ou o sistema cancelar o toque), uma vez só e nunca com o dedo na tela; com o
     trecho na metade direita ela não vira coluna; os chips mostram o número da tecla, medem 44 px e
     têm texto ≥ 4,5:1, no claro e no escuro; no "Ler um por vez" o chip leva à pergunta no toque; o
     "Ler daqui" do trilho abre o modo guiado; o Conferir do trilho tem a cara dos outros botões;
   · o painel da lei lista lidos e pendentes (o mesmo que CT_LA.painel calcula), cada linha leva ao
     dispositivo, a conferência aberta não some calada, Esc fecha só ele; numa lei grande abre sem
     procurar cada dispositivo no documento, e cabeçalho e assinaturas não contam;
   · iPad com teclado e trackpad (ponteiro fino, tela de toque): os 44 px continuam; numa janela
     estreita (641 a 760 px) o "Lidos" fica só com o ícone e não espreme o título da lei;
   · no host, marcar põe o cartão da pergunta no Baralho sem passo extra; cada pergunta tem o seu
     (a 4ª, a 5ª…); marcar de novo atualiza o mesmo, sem duplicar nem zerar o FSRS; conferir não
     duplica e o desfazer não o leva; cartão de antes do LA7 é reaproveitado, na marcação e na
     conferência; desmarcar tira o cartão nunca revisado e deixa o revisado; o gesto só mexe nas
     perguntas que mudou; a exportação traz cada cartão uma vez; na baixa estimulação, nada de
     aviso, nem no primeiro cartão de um dispositivo;
   · com o auth.js de verdade (tests/sync-fixture.html), tirar o cartão deixa a lápide do id e a
     cópia velha da nuvem não o traz de volta.
   Roda sozinho: node tests/leitura-ativa-ipad.mjs (só a parte 1). */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
import { abrirComponenteDoLeitor, definirContaLeitora } from './_sessao-leitores.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function carregar() {
  const caixa = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'leitura-ativa.js'), 'utf8'), caixa);
  return caixa.window.CT_LA;
}

const LEI = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
const TXT = 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a propriedade.';
// o leitor desenha 4 dispositivos: Art. 1.239 (gi 0), o parágrafo único (1), Art. 1.240 (2) e o inciso I (3)
const PARAS = ['TÍTULO III', 'Da Propriedade', 'Art. 1.239. ' + TXT, 'Parágrafo único. O texto do parágrafo único.', 'Art. 1.240. Outro artigo, com um inciso:', 'I - primeiro inciso do artigo.'];
const LACUNA = '▁▁▁▁';
// CF, art. 5º: o caput termina em ":" e o texto-base do inciso leva o tronco dele na frente
const CAPUT5 = 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:';
/** O texto-base que o laBase do LEGIS monta para um inciso (tronco + ": " + inciso sem a pontuação final e com a inicial minúscula). */
function baseDoInciso(caput, inciso) {
  const tronco = caput.replace(/:\s*$/, '').replace(/\s+/g, ' ').trim() + ': ';
  let parte = inciso.replace(/[;,.\s]+$/, '');
  if (parte[0] && parte[0] === parte[0].toUpperCase() && parte[0] !== parte[0].toLowerCase()) parte = parte[0].toLowerCase() + parte.slice(1);
  return { txt: tronco + parte + '.', desloc: tronco.length };
}

export function testarLeituraAtivaIpadEstatico(ok) {
  const R = 'LA7 ';
  let LA = null;
  try { LA = carregar(); } catch (e) { ok(false, R + 'leitura-ativa.js carrega em Node puro (' + e.message.split('\n')[0] + ')'); return; }
  const API = ['idCartao', 'acharCartao', 'cartoesDispositivo', 'mudados', 'sanearCartao', 'revisado', 'fundirCartao', 'avisoGesto', 'painel'];
  ok(!!LA && API.every(f => typeof LA[f] === 'function') && !('cartaoDispositivo' in LA),
    R + 'o módulo publica ' + API.join(', ') + ' (e não há mais o cartão único do dispositivo)');
  if (!LA || typeof LA.cartoesDispositivo !== 'function') return;
  const marcar = (it, el, t, txt) => LA.marcar(it, el, { s: (txt || TXT).indexOf(t), t });
  const base = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: TXT });
  const QUEM = 'Aquele que, não sendo proprietário de imóvel rural ou urbano';
  const so = marcar(marcar(base, 'prazo', 'por cinco anos ininterruptos'), 'quem', QUEM);

  // ---- o cloze de UMA pergunta (o da conferência e do cartão) não mudou ----
  const cz = LA.cloze(so, 'prazo', TXT);
  ok(!!cz && cz.front === 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por {{c1::cinco anos}} ininterruptos, sem oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a propriedade.'
    && cz.extra === 'CC · Art. 1.239 · Há prazo? — Prazo de cinco anos, contado de forma ininterrupta e sem oposição'
    && cz.back.includes('por «cinco anos» ininterruptos') && cz.tags.join(',') === 'leitura-ativa,CC,prazo' && cz.termos.join() === 'cinco anos',
    R + 'o cloze de uma pergunta sai letra por letra como no aceite do LA5');

  // ---- os cartões do dispositivo: um por pergunta marcada, cada um o cloze dela ----
  const cs = LA.cartoesDispositivo(so, TXT);
  ok(Object.keys(cs).join() === LA.IDS.join() && LA.IDS.filter(el => cs[el]).join() === 'quem,prazo',
    R + 'cartoesDispositivo devolve as 7 perguntas: cartão nas marcadas (Quem? e Há prazo?), null nas outras');
  ok(LA.IDS.every(el => JSON.stringify(cs[el]) === JSON.stringify(LA.cloze(so, el, TXT))),
    R + 'cada cartão é exatamente o cloze() daquela pergunta — a regra do LA5, não outra');
  ok(!!cs.quem && cs.quem.front.startsWith('{{c1::' + QUEM + '}}') && !cs.quem.front.includes('{{c2') && cs.quem.front.includes('por cinco anos ininterruptos'),
    R + 'um cartão nunca mistura perguntas: o de Quem? deixa o prazo à vista');
  // a 4ª, a 5ª… pergunta marcada também viram cartão (antes, com um cartão único, só as 3 primeiras do texto)
  let cinco = base;
  [['quem', 'Aquele que'], ['oque', 'possua como sua'], ['prazo', 'por cinco anos ininterruptos'], ['excecao', 'sem oposição'], ['como', 'tornando-a produtiva']]
    .forEach(([el, t]) => { cinco = marcar(cinco, el, t); });
  const c5 = LA.cartoesDispositivo(cinco, TXT);
  ok(LA.IDS.filter(el => c5[el]).join() === 'quem,oque,como,prazo,excecao' && !!c5.como && c5.como.front.includes('{{c1::tornando-a produtiva}}') && !!c5.excecao && c5.excecao.front.includes('{{c1::sem oposição}}'),
    R + 'cinco perguntas marcadas, cinco cartões — a 4ª e a 5ª no texto também ganham o seu');
  ok(LA.IDS.every(el => !c5[el] || (c5[el].front.match(/\{\{c\d+::/g) || []).length === 1), R + 'cada cartão esconde só a sua pergunta (um grupo cada, aqui)');
  let quatro = base;
  ['um', 'dois', 'três', 'quatro'].forEach(t => { quatro = LA.marcar(quatro, 'oque', { s: 'um dois três quatro cinco'.indexOf(t), t }); });
  const c4 = LA.cartoesDispositivo(quatro, 'um dois três quatro cinco');
  ok(!!c4.oque && c4.oque.front === '{{c1::um}} {{c2::dois}} {{c3::três}} quatro cinco', R + 'no máximo 3 lacunas por cartão; a 4ª marca da mesma pergunta fica visível (a regra do cloze)');
  ok(Object.keys(LA.cartoesDispositivo(base, TXT)).every(el => LA.cartoesDispositivo(base, TXT)[el] === null) && !Object.keys(LA.cartoesDispositivo(null, TXT)).length,
    R + 'sem marca nenhuma não há cartão');

  // ---- inciso com o tronco do caput na frente: a marca é casada no inciso ----
  const XXXV = baseDoInciso(CAPUT5, 'a lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito;');
  let i35 = LA.nova({ leiId: 'cf', sigla: 'CF', rot: 'Art. 5º, XXXV', gi: 40, txt: 'a lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito;' });
  i35 = LA.marcar(i35, 'quem', { s: 0, t: 'a lei' });
  const z35 = LA.cloze(i35, 'quem', XXXV.txt, { desloc: XXXV.desloc }), sem35 = LA.cloze(i35, 'quem', XXXV.txt);
  ok(!!z35 && z35.front.endsWith('nos termos seguintes: {{c1::a lei}} não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito.') && z35.front.includes('perante a lei,'),
    R + 'inciso (CF, art. 5º, XXXV): "a lei" marcado no inciso vira lacuna NO INCISO, e o "perante a lei" do caput fica à vista');
  ok(!!sem35 && sem35.front.startsWith('Todos são iguais perante {{c1::a lei}}'), R + 'sem o deslocamento a lacuna ia parar no caput (é o defeito que o desloc corrige)');
  const II = 'ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;', bII = baseDoInciso(CAPUT5, II);
  let i2 = LA.nova({ leiId: 'cf', sigla: 'CF', rot: 'Art. 5º, II', gi: 3, txt: II });
  i2 = LA.marcar(i2, 'excecao', { s: II.indexOf('senão em virtude de lei;'), t: 'senão em virtude de lei;' });
  const z2 = LA.cloze(i2, 'excecao', bII.txt, { desloc: bII.desloc });
  ok(!!z2 && z2.front.endsWith('alguma coisa {{c1::senão em virtude de lei}}.') && z2.extra === 'CF · Art. 5º, II · Há exceção? — Ressalva: senão em virtude de lei — fora dela vale a regra',
    R + 'marca que leva o ";" do fim do inciso ainda casa (o texto-base trocou por "."): o cartão nasce');
  const IIm = 'Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;', bIIm = baseDoInciso(CAPUT5, IIm);
  let i2m = LA.nova({ leiId: 'cf', sigla: 'CF', rot: 'Art. 5º, II', gi: 3, txt: IIm });
  i2m = LA.marcar(i2m, 'quem', { s: 0, t: 'Ninguém' });
  const z2m = LA.cloze(i2m, 'quem', bIIm.txt, { desloc: bIIm.desloc });
  ok(!!z2m && z2m.front.includes('nos termos seguintes: {{c1::ninguém}} será obrigado') && z2m.termos.join() === 'ninguém',
    R + 'marca na inicial maiúscula do inciso casa com a minúscula do texto-base, e a lacuna leva o trecho como ele aparece');
  const CAP_P = 'Prescreve em cinco anos, sem oposição de terceiros:', INC_P = 'a pretensão em cinco anos, contados da citação;', bP = baseDoInciso(CAP_P, INC_P);
  let ip = LA.nova({ leiId: 'x', sigla: 'X', rot: 'Art. 9, I', gi: 1, txt: INC_P });
  ip = LA.marcar(ip, 'prazo', { s: INC_P.indexOf('em cinco anos'), t: 'em cinco anos' });
  const zp = LA.cloze(ip, 'prazo', bP.txt, { desloc: bP.desloc });
  ok(!!zp && zp.front.includes('a pretensão em {{c1::cinco anos}}, contados') && zp.front.startsWith('Prescreve em cinco anos, sem oposição') && /Prazo de cinco anos, contados da citação$/.test(zp.extra),
    R + 'o prazo do inciso é explicado pelo que vem depois dele no inciso, não pelo caput');

  // ---- ids e o cartão de antes do LA7 ----
  ok(LA.idCartao(so, 'prazo') === 'fc|la|la|' + LEI + '|0|prazo' && LA.idCartao(so.id, 'prazo') === LA.idCartao(so, 'prazo') && LA.idCartao(so, 'nada') === '' && LA.idCartao('', 'quem') === '' && LA.idCartao(null, 'quem') === '',
    R + 'id determinístico: fc|la| + o id da leitura (lei + dispositivo) + a pergunta');
  const velho = { id: 'fc1700000000000', tipo: 'cloze', front: 'x', la: { id: so.id, el: 'prazo' } };
  ok(LA.acharCartao([velho], so.id, 'prazo') === 'fc1700000000000' && LA.acharCartao([velho, { id: LA.idCartao(so, 'prazo') }], so.id, 'prazo') === LA.idCartao(so, 'prazo')
    && LA.acharCartao([velho], so.id, 'quem') === LA.idCartao(so, 'quem') && LA.acharCartao(null, so.id, 'prazo') === LA.idCartao(so, 'prazo') && LA.acharCartao([velho], so.id, 'nada') === '',
    R + 'acharCartao: o determinístico; senão o cartão que a conferência criou antes do LA7 para a mesma pergunta; senão o id novo');

  // ---- o que o gesto mudou ----
  const m1 = marcar(base, 'quem', 'Aquele que'), m2 = marcar(m1, 'prazo', 'por cinco anos ininterruptos');
  const conf = LA.atualizada(m2, TXT) ? Object.assign({}, m2, { hash: LA.hash(TXT + ' nova redação') }) : m2;
  ok(LA.mudados(null, m1).join() === 'quem' && LA.mudados(m1, m2).join() === 'prazo' && LA.mudados(m2, LA.desmarcar(m2, 'quem', 0)).join() === 'quem'
    && LA.mudados(m2, LA.naoHa(m2, 'prazo', true)).join() === 'prazo' && LA.mudados(m2, LA.naoHa(m2, 'como', true)).join() === '' && LA.mudados(m2, m2).join() === ''
    && LA.mudados(m2, conf).join() === 'quem,prazo' && LA.mudados(m1, null).join() === '',
    R + 'mudados: só as perguntas cujas marcas o gesto mudou (todas as marcadas quando a redação mudou)');

  // ---- o host saneia o que chega do iframe ----
  const s = LA.sanearCartao(Object.assign({}, cs.prazo, { id: 'x', up: 1, dueDate: '2099-01-01', fsrs: { stability: 9 }, intervalo: 9, inventado: 1, els: ['quem'] }));
  ok(!!s && Object.keys(s).sort().join() === 'back,extra,front,tags,termos' && s.front === cs.prazo.front,
    R + 'sanearCartao: só o conteúdo entra (sem id, agenda nem campo inventado)');
  const g = n => Array.from({ length: n }, (_, i) => '{{c' + (i + 1) + '::t' + i + '}}').join(' ');
  ok(LA.sanearCartao({ front: 'sem lacuna', back: 'b' }) === null && LA.sanearCartao({ front: g(4), back: 'b' }) === null
    && LA.sanearCartao({ front: '{{c1::a}} {{c3::b}}', back: 'b' }) === null && LA.sanearCartao({ front: g(1), back: '  ' }) === null
    && LA.sanearCartao(null) === null && LA.sanearCartao('x') === null && !!LA.sanearCartao({ front: g(3), back: 'b' }),
    R + 'sanearCartao recusa o que não é cloze de 1 a 3 grupos seguidos');
  const longo = LA.sanearCartao({ front: 'x'.repeat(2000) + ' {{c1::a}}', back: 'y'.repeat(5000), extra: 'z'.repeat(5000) });
  ok(longo === null || (longo.front.length <= 901 && longo.back.length === 1200 && longo.extra.length === 900), R + 'sanearCartao põe teto no tamanho');

  // ---- a fusão no baralho ----
  const ID = LA.idCartao(so, 'prazo');
  const conteudo = { tipo: 'cloze', front: cs.prazo.front, back: cs.prazo.back, extra: cs.prazo.extra, tags: cs.prazo.tags, el: 'prazo', la: { id: so.id, el: 'prazo' } };
  const outro = { id: 'fcB', front: 'Pergunta', back: 'Resposta', up: 5 };
  const r1 = LA.fundirCartao([outro], ID, conteudo, 1000);
  ok(r1.acao === 'criado' && r1.lista.length === 2 && r1.lista[0].id === ID && r1.lista[0].criado === 1000 && r1.lista[0].up === 1000 && r1.lista[1] === outro && !('dueDate' in r1.lista[0]),
    R + 'fundirCartao cria o cartão novo (sem agenda: vence hoje) e não toca nos outros');
  const r2 = LA.fundirCartao(r1.lista, ID, Object.assign({}, conteudo), 2000);
  ok(r2.acao === 'igual' && r2.lista === r1.lista, R + 'o mesmo conteúdo de novo: nada muda (mesma lista)');
  const fsrs = { version: 6, stability: 25.3, difficulty: 4.9, lastReview: 1500, lapses: 0, history: [{ at: 1500, rating: 3, elapsed: 0, interval: 25 }] };
  const agendado = r1.lista.map(x => x.id === ID ? Object.assign({}, x, { dueDate: '2026-12-20', due: 25, intervalo: 25, repeticoes: 2, facilidade: 2.5, fsrs, up: 1500 }) : x);
  const so2 = marcar(so, 'prazo', 'cinqüenta hectares'), novoPrazo = LA.cloze(so2, 'prazo', TXT);
  const conteudo2 = Object.assign({}, conteudo, { front: novoPrazo.front, back: novoPrazo.back, extra: novoPrazo.extra,
    dueDate: '2000-01-01', due: 0, fsrs: null, repeticoes: 0, criado: 1, id: 'outro', up: 1 });   // agenda no conteúdo não passa
  const r3 = LA.fundirCartao(agendado, ID, conteudo2, 1200);   // relógio ATRÁS do up do cartão
  const novo = r3.lista.find(x => x.id === ID) || {};
  ok(r3.acao === 'atualizado' && r3.lista.length === 2 && r3.lista.filter(x => x.id === ID).length === 1 && novo.front === novoPrazo.front && (novo.front.match(/\{\{c\d+::/g) || []).length === 2,
    R + 'marcar de novo a mesma pergunta atualiza o MESMO cartão: o texto novo entra e nada duplica');
  ok(novo.dueDate === '2026-12-20' && novo.due === 25 && novo.intervalo === 25 && novo.repeticoes === 2 && novo.facilidade === 2.5 && JSON.stringify(novo.fsrs) === JSON.stringify(fsrs) && novo.criado === 1000,
    R + 'o agendamento FSRS e o nascimento do cartão ficam intactos');
  ok(novo.up === 1501 && r3.lista[1] === outro && r3.antes === agendado[0], R + 'o up avança mesmo com o relógio atrás (o merge por id do auth.js vê a edição)');
  // desmarcar: o cartão já revisado FICA; o nunca revisado sai
  const r4 = LA.fundirCartao(r3.lista, ID, null, 3000);
  ok(r4.acao === 'mantido' && r4.lista === r3.lista && r4.antes === novo, R + 'sem marca, o cartão JÁ REVISADO fica no baralho, com agenda e histórico (um toque não apaga o FSRS)');
  ok(LA.revisado({ fsrs: {} }) && LA.revisado({ dueDate: '2026-12-01' }) && LA.revisado({ repeticoes: 1 }) && !LA.revisado({ front: 'x', criado: 1, up: 1 }) && !LA.revisado(null),
    R + 'revisado: tem FSRS, data de revisão ou repetições');
  const r5 = LA.fundirCartao(r1.lista, ID, null, 3000);
  ok(r5.acao === 'removido' && r5.lista.length === 1 && r5.lista[0] === outro && !!r5.antes && r5.antes.id === ID, R + 'sem marca, o cartão NUNCA revisado sai, e só ele');
  const r6 = LA.fundirCartao(r5.lista, ID, null, 3000);
  ok(r6.acao === 'nada' && r6.lista === r5.lista && LA.fundirCartao(null, '', conteudo, 1).acao === 'nada', R + 'tirar o que não está lá (ou sem id) não mexe em nada');

  // ---- o aviso único do gesto ----
  const onde = 'CC · Art. 1.239';
  ok(LA.avisoGesto({ criado: ['prazo'] }, onde) === 'Cartão de CC · Art. 1.239 · Há prazo? no Baralho'
    && LA.avisoGesto({ criado: ['quem', 'prazo'] }, onde) === '2 cartões de CC · Art. 1.239 no Baralho'
    && LA.avisoGesto({ removido: ['prazo'] }, onde) === 'Cartão de CC · Art. 1.239 · Há prazo? saiu do Baralho'
    && LA.avisoGesto({ mantido: ['quem'] }, onde) === 'O cartão de CC · Art. 1.239 · Quem? fica no Baralho: já tem revisões'
    && LA.avisoGesto({ falhou: ['oque'] }, onde) === 'O trecho de O quê? não está no texto de CC · Art. 1.239: o cartão não mudou',
    R + 'avisoGesto: entrou, saiu, ficou por já ter revisões ou não deu para montar — uma frase');
  ok(LA.avisoGesto({ atualizado: ['quem'], igual: ['prazo'] }, onde) === '' && LA.avisoGesto(null, onde) === ''
    && LA.avisoGesto({ removido: ['prazo', 'como'], mantido: ['quem'] }, onde) === '2 cartões de CC · Art. 1.239 saíram do Baralho · O cartão de CC · Art. 1.239 · Quem? fica no Baralho: já tem revisões',
    R + 'atualizar não avisa; vários efeitos do mesmo gesto viram um aviso só');

  // ---- o painel por lei: a régua de "lido ativamente" é a do progresso() (o número do catálogo) ----
  const disp = [{ gi: 0, rot: 'Art. 1.239' }, { gi: 1, rot: 'Art. 1.239, parágrafo único' }, { gi: 2, rot: 'Art. 1.240' }, { gi: 3, rot: 'Art. 1.240, I' }, { gi: 3, rot: 'repetido' }, { rot: 'sem gi' }, null];
  let completo = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1.240, I', gi: 3, txt: 'x' });
  LA.IDS.forEach((el, i) => { completo = i < 2 ? LA.marcar(completo, el, { s: i, t: 't' + i }) : LA.naoHa(completo, el, true); });
  const semResposta = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1.240', gi: 2, txt: 'y' });
  const outraLei = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', sigla: 'CF', rot: 'Art. 5º', gi: 1, txt: 'z' });
  const P = LA.painel([so, completo, semResposta, outraLei], LEI, disp);
  ok(P.total === 4 && P.lidos.map(d => d.gi).join() === '0,2,3' && P.pendentes.map(d => d.gi).join() === '1',
    R + 'painel: lidos e pendentes na ordem do texto; dispositivo repetido conta uma vez e a mesma posição de outra lei não conta');
  ok(P.lidos[0].rot === 'Art. 1.239' && P.lidos[0].respondidas === 2 && P.lidos[0].total === 7 && !P.lidos[0].completo
    && P.lidos[1].respondidas === 0 && P.lidos[2].completo && P.pendentes[0].rot === 'Art. 1.239, parágrafo único',
    R + 'painel: cada lido leva a completude das 7 perguntas; o pendente leva o rótulo do leitor');
  const prog = LA.progresso([so, semResposta, completo], LEI, 4);
  ok(P.nLidos === 3 && P.completos === 1 && P.pct === 75 && prog.lidos === P.nLidos && prog.completos === P.completos && prog.pct === P.pct,
    R + 'painel: "lido ativamente" é ter leitura, a régua do progresso() e do catálogo — não uma nova');
  const fora = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 9', gi: 99, txt: 'w' });
  const P0 = LA.painel(null, LEI, null);
  ok(LA.painel([so, fora], LEI, disp.slice(0, 4)).nLidos === 1 && P0.total === 0 && P0.pct === 0 && !P0.lidos.length && !P0.pendentes.length
    && LA.painel([so], LEI, [{ gi: 0 }]).lidos[0].rot === 'Art. 1.239',
    R + 'painel: leitura de dispositivo que o leitor não desenhou fica fora; sem dados não quebra; sem rótulo usa o da leitura');
}

/* ---- Parte 2: navegador ---- */
async function ajudantes(alvo) {
  await alvo.evaluate(() => {
    const H = window.__la7 = {};
    H.cor = (c) => {
      c = String(c || '').trim(); let m;
      if ((m = c.match(/^rgba?\(([^)]*)\)$/i))) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
      if ((m = c.match(/^color\(srgb\s+([^)]*)\)$/i))) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
      if ((m = c.match(/^#([0-9a-f]{6})$/i))) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
      return null;
    };
    H.sobre = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    H.lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    H.contraste = (a, b) => { const x = H.lum(a), y = H.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // o texto de `el` sobre o fundo dele, composto sobre uma cor opaca de baixo
    H.contrasteSobre = (el, embaixo) => {
      const cs = getComputedStyle(el), fg = H.cor(cs.color), bg = H.cor(cs.backgroundColor), b0 = H.cor(embaixo);
      if (!fg || !bg || !b0) return { ok: false, v: 0, de: cs.color + ' / ' + cs.backgroundColor + ' / ' + embaixo };
      const fundo = H.sobre(bg, b0), texto = fg.a < 1 ? H.sobre(fg, fundo) : fg;
      return { ok: true, v: Math.round(H.contraste(texto, fundo) * 100) / 100 };
    };
    H.caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    H.selecionar = (gr, frase) => {
      const nos = []; const it = document.createNodeIterator(gr, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) nos.push(n);
      const no = nos.find(t => t.nodeValue.includes(frase)); if (!no) return false;
      const r = document.createRange(), i = no.nodeValue.indexOf(frase); r.setStart(no, i); r.setEnd(no, i + frase.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true;
    };
    // uma palavra que o leitor desenhou na metade direita da coluna (o caso que encolhia a barra)
    H.selecionarADireita = (gr) => {
      const nos = []; const it = document.createNodeIterator(gr, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) nos.push(n);
      for (const no of nos) {
        const re = /\S{4,}/g; let m;
        while ((m = re.exec(no.nodeValue))) {
          const r = document.createRange(); r.setStart(no, m.index); r.setEnd(no, m.index + m[0].length);
          const x = r.getBoundingClientRect();
          if (x.width > 0 && x.left > innerWidth * 0.6 && x.right < innerWidth - 8) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; }
        }
      }
      return false;
    };
    // o dedo, como o WebKit do iPad o anuncia: pointer* com pointerType 'touch'
    H.dedo = (tipo, el) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, composed: true, pointerType: 'touch', isPrimary: true, pointerId: 7, clientX: r.left + 4, clientY: r.top + 4 })); };
    H.gr = (gi) => document.querySelector('#rdrDoc .gr[data-gi="' + gi + '"]');
    H.espera = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { try { if (f()) return true; } catch (_) {} await new Promise(r => setTimeout(r, 50)); } try { return !!f(); } catch (_) { return false; } };
    // o que o leitor manda ao host (o canal é o mesmo objeto que o leitor guardou)
    window.__envios = []; window.__conferidas = [];
    const C = window.CT_LA_CANAL;
    if (C && !C.__espiao) {
      const env = C.enviar, conf = C.conferir;
      C.enviar = function (item, cartoes) { window.__envios.push({ item, cartoes }); return env.apply(this, arguments); };
      C.conferir = function (rodada) { window.__conferidas.push(rodada); return conf.apply(this, arguments); };
      C.__espiao = true;
    }
  });
}

/* Seleção feita pelo dedo: o pointerdown de toque, a seleção que o sistema faz, e o fim do toque
   ('pointerup' ao soltar ou 'pointercancel' quando o WebKit assume o toque longo). Sem mouseup.
   Depois que a barra abre, mais um selectionchange e mais um "soltar" (o iPad repete os dois
   quando as alças assentam): a barra não pode se reposicionar para a mesma seleção — conta-se
   quantas vezes ela mediu o trecho (Range.getBoundingClientRect, só o laAbrirBarra usa). */
async function selecionarComODedo(page, gi, frase, fim) {
  return page.evaluate(async ({ gi, frase, fim }) => {
    const H = window.__la7, barra = document.getElementById('grifBar'), gr = H.gr(gi), r = {};
    const medir = Range.prototype.getBoundingClientRect; let medidas = 0;
    Range.prototype.getBoundingClientRect = function () { medidas++; return medir.apply(this, arguments); };
    let mouseups = 0; const contaMouse = () => { mouseups++; }; document.addEventListener('mouseup', contaMouse, true);
    try {
      H.dedo('pointerdown', gr);
      r.selecionou = frase === '<direita>' ? H.selecionarADireita(gr) : H.selecionar(gr, frase);
      await new Promise(res => setTimeout(res, 900));
      r.comODedoNaTelaNaoAbre = !barra.classList.contains('on');
      medidas = 0;
      H.dedo(fim || 'pointerup', gr);
      r.abriu = await H.espera(() => barra.classList.contains('on'), 4000);
      await new Promise(res => setTimeout(res, 600));
      document.dispatchEvent(new Event('selectionchange')); H.dedo('pointerup', gr);
      await new Promise(res => setTimeout(res, 900));
      r.medidas = medidas; r.mouseups = mouseups;
    } finally { Range.prototype.getBoundingClientRect = medir; document.removeEventListener('mouseup', contaMouse, true); }
    const s = getSelection(); r.selecao = s.rangeCount ? H.caixa(s.getRangeAt(0)) : null; r.barra = H.caixa(barra);
    r.abaixo = barra.classList.contains('abaixo'); r.la = barra.classList.contains('la');
    // as linhas da barra: Grifar e os 7 chips, agrupados pelo topo
    const tops = [document.getElementById('grifBtn'), ...barra.querySelectorAll('#grifLA .la-chip')].map(b => Math.round(b.getBoundingClientRect().top));
    r.linhas = tops.filter((t, i) => tops.findIndex(u => Math.abs(u - t) < 6) === i).length;
    return r;
  }, { gi, frase, fim });
}

const medirChipsDaBarra = (page) => page.evaluate(() => {
  const H = window.__la7, barra = document.getElementById('grifBar');
  const chips = [...barra.querySelectorAll('#grifLA .la-chip')], fundo = getComputedStyle(barra).backgroundColor;
  return {
    n: chips.length,
    numeros: chips.map(c => (c.querySelector('.la-num') || {}).textContent || '').join(''),
    ordem: chips.map(c => c.dataset.el).join(','),
    teclas: chips.map(c => c.getAttribute('aria-keyshortcuts')).join(''),
    rotulos: chips.every(c => /\S/.test((c.querySelector('.la-rot') || {}).textContent || '') && /sem resposta/.test(c.getAttribute('aria-label') || '')),
    miudos: chips.filter(c => { const x = H.caixa(c); return x.h < 44 || x.w < 44; }).map(c => c.dataset.el + ' ' + Math.round(H.caixa(c).w) + '×' + Math.round(H.caixa(c).h)),
    alturas: chips.map(c => Math.round(H.caixa(c).h)),
    numeroPinta: chips.length > 0 && chips.every(c => { const n = c.querySelector('.la-num'); if (!n) return false; const cs = getComputedStyle(n), x = H.caixa(n);
      return x.w >= 10 && x.h >= 10 && cs.visibility === 'visible' && cs.display !== 'none' && cs.color === getComputedStyle(c).color && parseFloat(cs.fontSize) >= 10; }),
    contrastes: chips.map(c => H.contrasteSobre(c, fundo)),
  };
});

async function abrirLegisSozinho(ctx, base, paras) {
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e && e.message || e)));
  await page.goto(base + '/__semente');
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
  await abrirComponenteDoLeitor(page, base + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL, null, { timeout: 20000 });
  await page.evaluate((paras) => {
    localStorage.setItem('catedra:leitorLA', '1');
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    window.openReader(CAT.laws.find(l => /l10406/.test(l.u)));
  }, paras || PARAS);
  await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 4, null, { timeout: 40000 });
  await ajudantes(page);
  return { page, erros };
}

async function lerPainel(page) {
  return page.evaluate(() => {
    const H = window.__la7, el = document.getElementById('laPainel'), r = {};
    const LEI = CAT.laws.find(l => /l10406/.test(l.u)).u;
    const lidos = [...el.querySelectorAll('[data-lista="lidos"] .la-pn-linha')], pend = [...el.querySelectorAll('[data-lista="pendentes"] .la-pn-linha')];
    const P = window.CT_LA.painel(window.CT_LA_CANAL.ler(LEI), LEI, [...document.querySelectorAll('#rdrDoc .gr')].map(g => ({ gi: +g.dataset.gi })));
    r.abriu = el.classList.contains('on') && document.getElementById('rdrLAPainel').getAttribute('aria-expanded') === 'true' && document.activeElement === el.querySelector('.la-pn-fechar');
    r.listas = lidos.map(b => b.dataset.gi).join() + '|' + pend.map(b => b.dataset.gi).join();
    r.listasBatemComOModulo = r.listas === P.lidos.map(d => d.gi).join() + '|' + P.pendentes.map(d => d.gi).join();
    r.rotulos = [...lidos, ...pend].map(b => (b.querySelector('.la-pn-rot') || {}).textContent || '');
    r.completude = lidos.map(b => (b.querySelector('.la-pn-resp') || {}).textContent || '');
    r.resumo = ((el.querySelector('.la-pn-resumo') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    const f = el.querySelector('.la-pn-fechar'), cf = f ? H.caixa(f) : { w: 0, h: 0 };
    r.linhas44 = [...lidos, ...pend].every(b => H.caixa(b).h >= 44) && cf.w >= 44 && cf.h >= 44;
    r.cobre = H.caixa(el).w > 600 && H.caixa(el).h > 600;
    const rdr = document.getElementById('rdr'), extremos = ['--rcanA', '--rcanB'].map(v => H.cor(getComputedStyle(rdr).getPropertyValue(v).trim()));
    // a linha (fundo --rcard) sobre os dois extremos do degradê do painel: vale o pior caso
    r.contrastes = [];
    [...lidos, ...pend].forEach(b => {
      const bg = H.cor(getComputedStyle(b).backgroundColor);
      b.querySelectorAll('.la-pn-rot, .la-pn-txt, .la-pn-resp').forEach(t => extremos.forEach(e => {
        const fundo = (bg && e) ? H.sobre(bg, e) : null, fg = H.cor(getComputedStyle(t).color);
        r.contrastes.push(fundo && fg ? Math.round(H.contraste(fg.a < 1 ? H.sobre(fg, fundo) : fg, fundo) * 100) / 100 : 0);
      }));
    });
    r.semEmoji = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(el.textContent);
    return r;
  });
}

/* (A) iPad em retrato, com toque */
async function noIpad(browser, base, ok, R) {
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  try {
    const { page, erros } = await abrirLegisSozinho(ctx, base);
    const amb = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, sinal: document.documentElement.getAttribute('data-la-toque'),
      la: document.getElementById('rdr').classList.contains('la'), largura: innerWidth, dispositivos: document.querySelectorAll('#rdrDoc .gr').length }));
    ok(amb.coarse && amb.sinal === '1' && amb.la && amb.largura === 820 && amb.dispositivos === 4,
      R + 'iPad em retrato: ponteiro grosso, sinal de toque aceso no LEGIS e leitura ativa ligada (' + JSON.stringify(amb) + ')');

    // 0. "Ler um por vez": o chip leva à pergunta no TOQUE (antes só a tecla 1–7 fazia isso); e sair no
    //    último dispositivo rola só o documento — a barra da lei (Leitura ativa e Lidos) não sai da tela
    const gd0 = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('#rdrDoc .la-legenda .la-guiar').click(); await w(200);
      for (let i = 0; i < 21; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(20); }
      const g = document.getElementById('laGuiado'), ch = g.querySelector('.la-gd-chips .la-chip[data-el="prazo"]');
      return { noUltimo: /dispositivo 4 de 4/.test(g.textContent), pergunta: (/Pergunta \d de 7/.exec(g.textContent) || [''])[0], chip: ch ? window.__la7.caixa(ch) : null,
        acao: ch ? ch.getAttribute('data-acao') : '', num: ch ? (ch.querySelector('.la-num') || {}).textContent : '' };
    });
    if (gd0.chip) await page.touchscreen.tap(gd0.chip.x, gd0.chip.y);
    const gd1 = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), g = document.getElementById('laGuiado');
      await window.__la7.espera(() => /Pergunta 5 de 7/.test(g.textContent), 3000);
      const atual = g.querySelector('.la-gd-chips .la-chip.atual');
      return { pergunta: (/Pergunta \d de 7/.exec(g.textContent) || [''])[0], atual: atual ? atual.dataset.el : '', corrente: atual ? atual.getAttribute('aria-current') : '', rotulo: (g.querySelector('.la-perg') || {}).textContent || '' };
    });
    ok(gd0.noUltimo && gd0.pergunta === 'Pergunta 1 de 7' && !!gd0.chip && gd0.chip.h >= 44 && gd0.num === '5' && gd0.acao === 'pergunta'
      && gd1.pergunta === 'Pergunta 5 de 7' && gd1.atual === 'prazo' && gd1.corrente === 'true' && gd1.rotulo === 'Há prazo?',
      R + 'no "Ler um por vez", tocar no chip 5 leva à pergunta 5 — Há prazo? (' + JSON.stringify({ antes: gd0.pergunta, depois: gd1.pergunta, h: gd0.chip && Math.round(gd0.chip.h) }) + ')');
    const gd = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), rdr = document.getElementById('rdr');
      document.querySelector('#laGuiado button[data-acao=sair]').click(); await w(600);
      return { saiu: !rdr.classList.contains('la-guiado'), leitor: rdr.classList.contains('on'), casca: rdr.scrollTop, topo: Math.round(document.querySelector('#rdr .top').getBoundingClientRect().top) };
    });
    ok(gd.saiu && gd.leitor && gd.casca === 0 && gd.topo >= 0, R + 'sair do modo guiado no último dispositivo não tira a barra da lei da tela (' + JSON.stringify(gd) + ')');

    // 1. o dedo seleciona "por cinco anos ininterruptos" e solta: a barra abre sem mouseup
    const t1 = await selecionarComODedo(page, 0, 'por cinco anos ininterruptos', 'pointerup');
    ok(t1.selecionou && t1.comODedoNaTelaNaoAbre, R + 'com o dedo ainda na tela a barra não abre (nada de abrir no meio do arrasto)');
    ok(t1.abriu && t1.la && t1.mouseups === 0, R + 'soltar o dedo abre a barra com os chips — sem mouseup nenhum');
    ok(t1.medidas === 1, R + 'a barra se posiciona uma vez só para a mesma seleção, mesmo com outro selectionchange e outro "soltar" (' + t1.medidas + ')');
    ok(!!t1.selecao && t1.abaixo && t1.barra.top >= t1.selecao.bottom && t1.barra.bottom <= 1180 && t1.barra.left >= 0 && t1.barra.right <= 820,
      R + 'no toque a barra desce para baixo do trecho, longe do menu Copiar do sistema, e fica dentro da tela');
    const ch = await medirChipsDaBarra(page);
    ok(ch.n === 7 && ch.numeros === '1234567' && ch.ordem === 'quem,oque,quando,como,prazo,excecao,proibicao' && ch.teclas === '1234567' && ch.rotulos,
      R + 'os 7 chips mostram o número da tecla ("1 Quem?"), na ordem fixa, com rótulo escrito e atalho anunciado');
    ok(ch.n === 7 && !ch.miudos.length, R + 'cada chip da barra mede 44 px ou mais no toque (alturas ' + ch.alturas.join('/') + (ch.miudos.length ? '; miúdos: ' + ch.miudos.join(', ') : '') + ')');
    ok(ch.numeroPinta, R + 'o número pinta: caixa visível, na mesma tinta do rótulo');
    ok(ch.n === 7 && ch.contrastes.every(x => x.ok && x.v >= 4.5), R + 'texto dos chips ≥ 4,5:1 sobre a barra, no claro (' + ch.contrastes.map(x => x.ok ? x.v : x.de).join(' ') + ')');

    // 2. tocar no chip 5 (toque de verdade) marca "Há prazo?" — e o cartão da pergunta vai junto ao host
    const c5 = await page.evaluate(() => window.__la7.caixa(document.querySelector('#grifLA .la-chip[data-el=prazo]')));
    await page.touchscreen.tap(c5.x, c5.y);
    await page.waitForFunction(() => !!document.querySelector('#rdrDoc .gr[data-gi="0"] mark.la.la-prazo'), null, { timeout: 5000 }).catch(() => {});
    const m1 = await page.evaluate(() => {
      const m = document.querySelector('#rdrDoc .gr[data-gi="0"] mark.la.la-prazo'), e = window.__envios[window.__envios.length - 1] || {}, cs = e.cartoes || {};
      return { t: m ? m.textContent : '', barra: document.getElementById('grifBar').classList.contains('on'), chaves: Object.keys(cs).join(), comCartao: Object.keys(cs).filter(k => cs[k]).join(), prazo: cs.prazo ? cs.prazo.front : '' };
    });
    ok(m1.t === 'por cinco anos ininterruptos' && !m1.barra, R + 'tocar no chip 5 marca "Há prazo?" no trecho e fecha a barra');
    ok(m1.chaves === 'quem,oque,quando,como,prazo,excecao,proibicao' && m1.comCartao === 'prazo' && m1.prazo.includes('por {{c1::cinco anos}} ininterruptos'),
      R + 'a marca viaja ao host com o cartão da pergunta (o cloze de Há prazo?), no mesmo gesto');

    // 3. quando o sistema assume o toque longo (pointercancel), a barra abre do mesmo jeito; a tecla 1 marca
    const t2 = await selecionarComODedo(page, 0, 'Aquele que, não sendo proprietário de imóvel rural ou urbano', 'pointercancel');
    ok(t2.abriu && t2.medidas === 1 && t2.mouseups === 0, R + 'toque cancelado pelo sistema (seleção por toque longo) também abre a barra, uma vez');
    await page.keyboard.press('1');
    // 4. no inciso, de novo pelo dedo: a tecla 2 (teclado do iPad) e, num trecho que também está no caput ("artigo"), a 3
    const t3 = await selecionarComODedo(page, 3, 'primeiro inciso', 'pointerup');
    await page.keyboard.press('2');
    await page.waitForTimeout(150);
    const t3b = await selecionarComODedo(page, 3, 'artigo', 'pointerup');
    await page.keyboard.press('3');
    await page.waitForTimeout(150);
    const m2 = await page.evaluate(() => {
      const e = window.__envios.filter(x => x.item && x.item.gi === 3).pop() || {}, cs = e.cartoes || {};
      return { quem: !!document.querySelector('#rdrDoc .gr[data-gi="0"] mark.la.la-quem'), oque: !!document.querySelector('#rdrDoc .gr[data-gi="3"] mark.la.la-oque'),
        quando: !!document.querySelector('#rdrDoc .gr[data-gi="3"] mark.la.la-quando'), cOque: cs.oque ? cs.oque.front : '', cQuando: cs.quando ? cs.quando.front : '' };
    });
    ok(t3.abriu && t3b.abriu && m2.quem && m2.oque && m2.quando, R + 'as teclas 1–7 continuam marcando a seleção viva');
    ok(m2.cOque === 'Outro artigo, com um inciso: {{c1::primeiro inciso}} do artigo.' && m2.cQuando === 'Outro artigo, com um inciso: primeiro inciso do {{c1::artigo}}.',
      R + 'no inciso, o cartão leva o tronco do caput e a lacuna fica no inciso — mesmo quando o trecho também está no caput (' + m2.cQuando + ')');

    // 4b. com o trecho na metade direita da coluna a barra não vira coluna (no máximo 3 linhas, centrada no trecho)
    const t4 = await selecionarComODedo(page, 0, '<direita>', 'pointerup');
    ok(t4.selecionou && t4.abriu && t4.linhas <= 3 && t4.barra.w >= 300 && t4.barra.left >= 0 && t4.barra.right <= 820,
      R + 'trecho na metade direita: a barra tem a largura do conteúdo, sem virar coluna (' + Math.round(t4.barra.w) + '×' + Math.round(t4.barra.h) + ', ' + t4.linhas + ' linhas)');
    await page.evaluate(() => { try { getSelection().removeAllRanges(); } catch (_) {} document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });

    // 5. o trilho e o botão do painel
    const tr = await page.evaluate(() => {
      const H = window.__la7, t = document.querySelector('#rdrDoc .la-trilho[data-gi="0"]'), alvos = [...t.querySelectorAll('.la-chip, .la-conferir, .la-guiar')];
      const bt = document.getElementById('rdrLAPainel'), b = H.caixa(bt), cf = t.querySelector('.la-conferir'), gd = t.querySelector('.la-guiar');
      const ccf = getComputedStyle(cf), cgd = getComputedStyle(gd), fundo = getComputedStyle(document.getElementById('rdr')).getPropertyValue('--rcard').trim();
      return { n: alvos.length, miudos: alvos.filter(a => { const x = H.caixa(a); return x.h < 44 || x.w < 44; }).map(a => (a.dataset.el || a.className) + ' ' + Math.round(H.caixa(a).w) + '×' + Math.round(H.caixa(a).h)),
        numeros: [...t.querySelectorAll('.la-chip')].map(c => (c.querySelector('.la-num') || {}).textContent || '').join(''),
        conferir: { pad: parseFloat(ccf.paddingLeft), raio: parseFloat(ccf.borderTopLeftRadius), borda: ccf.borderTopStyle + ' ' + ccf.borderTopWidth, fonte: ccf.fontFamily === cgd.fontFamily && ccf.fontWeight === cgd.fontWeight && ccf.fontSize === cgd.fontSize,
          contraste: H.contrasteSobre(cf, fundo) },
        botao: { w: Math.round(b.w), h: Math.round(b.h), vis: getComputedStyle(bt).display !== 'none' && b.w > 0, svg: !!bt.querySelector('svg[aria-hidden="true"]'), nome: bt.getAttribute('aria-label') || '', exp: bt.getAttribute('aria-expanded') } };
    });
    ok(tr.n === 9 && !tr.miudos.length && tr.numeros === '1234567', R + 'o trilho do dispositivo: 7 chips numerados, Conferir e Ler daqui com 44 px no toque' + (tr.miudos.length ? ' (' + tr.miudos.join(', ') + ')' : ''));
    ok(tr.conferir.pad >= 8 && tr.conferir.raio >= 6 && tr.conferir.borda === 'solid 1px' && tr.conferir.fonte && tr.conferir.contraste.ok && tr.conferir.contraste.v >= 4.5,
      R + 'o Conferir do trilho tem a base dos outros botões (padding, raio, borda de 1 px, a mesma fonte) e texto ≥ 4,5:1 (' + JSON.stringify(tr.conferir) + ')');
    ok(tr.botao.vis && tr.botao.w >= 44 && tr.botao.h >= 44 && tr.botao.svg && /Lidos e pendentes/.test(tr.botao.nome) && tr.botao.exp === 'false',
      R + 'o botão do painel está na barra da lei: 44 px, ícone SVG e nome acessível (' + tr.botao.w + '×' + tr.botao.h + ')');
    // "Ler daqui" (antes mudo) abre o modo guiado naquele dispositivo
    const ld = await page.evaluate(() => window.__la7.caixa(document.querySelector('#rdrDoc .la-trilho[data-gi="2"] .la-guiar')));
    await page.touchscreen.tap(ld.x, ld.y);
    const lg = await page.evaluate(async () => {
      const g = document.getElementById('laGuiado'), rdr = document.getElementById('rdr');
      const abriu = await window.__la7.espera(() => rdr.classList.contains('la-guiado'), 3000);
      const r = { abriu, norma: (g.querySelector('.la-norma') || {}).textContent || '' };
      const s = g.querySelector('button[data-acao=sair]'); if (s) s.click(); await new Promise(res => setTimeout(res, 300));
      r.saiu = !rdr.classList.contains('la-guiado'); return r;
    });
    ok(lg.abriu && /Art\. 1\.240$/.test(lg.norma) && lg.saiu, R + '"Ler daqui" no trilho abre o "Ler um por vez" naquele dispositivo (' + lg.norma + ')');
    // a conferência não ganha número: lá 1, 3 e 5 são Errei, Hesitei e Acertei
    const conf = await page.evaluate(async () => {
      document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-conferir').click(); await new Promise(r => setTimeout(r, 120));
      const p = document.getElementById('laConf'), r = { abriu: p.classList.contains('on'), nums: p.querySelectorAll('.la-num').length, fila: p.querySelectorAll('.la-fila .la-chip').length };
      p.querySelector('.la-fechar').click(); await new Promise(res => setTimeout(res, 80)); r.fechou = !p.classList.contains('on'); return r;
    });
    ok(conf.abriu && conf.fila === 2 && conf.nums === 0 && conf.fechou, R + 'na conferência os chips ficam sem número (as teclas de lá são Errei, Hesitei e Acertei)');

    // 6. conferência pela metade + painel: ir a outro dispositivo pelo painel não descarta o que ela respondeu
    const bt = await page.evaluate(() => window.__la7.caixa(document.getElementById('rdrLAPainel')));
    await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)); window.__conferidas.length = 0;
      document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-conferir').click(); await w(120);
      const p = document.getElementById('laConf'); p.querySelector('button[data-acao=mostrar]').click(); await w(60); p.querySelector('button[data-q="1"]').click(); await w(80);
    });
    await page.touchscreen.tap(bt.x, bt.y);
    await page.waitForFunction(() => document.getElementById('laPainel').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
    const lp = await page.evaluate(() => window.__la7.caixa(document.querySelector('#laPainel [data-lista="pendentes"] .la-pn-linha[data-gi="1"]')));
    await page.touchscreen.tap(lp.x, lp.y);
    const parcial = await page.evaluate(async () => {
      await window.__la7.espera(() => !document.getElementById('laPainel').classList.contains('on'), 3000);
      const c = window.__conferidas;
      return { envios: c.length, itens: c[0] ? c[0].itens.map(i => i.el + ':' + i.q).join() : '', conf: document.getElementById('laConf').classList.contains('on') };
    });
    ok(parcial.envios === 1 && parcial.itens === 'quem:1' && !parcial.conf,
      R + 'conferência pela metade e um toque numa linha do painel: o que ela respondeu vai ao host (com o desfazer de sempre), nada some calado (' + JSON.stringify(parcial) + ')');

    // 7. o painel da lei, aberto pelo toque
    await page.touchscreen.tap(bt.x, bt.y);
    await page.waitForFunction(() => document.getElementById('laPainel').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
    const pn = await lerPainel(page);
    ok(pn.abriu, R + 'tocar no botão abre o painel da lei, com o foco no fechar');
    ok(pn.listas === '0,3|1,2' && pn.listasBatemComOModulo, R + 'o painel lista lidos (Art. 1.239 e o inciso) e pendentes, o mesmo que CT_LA.painel calcula (' + pn.listas + ')');
    ok(pn.rotulos.join(' / ') === 'Art. 1.239 / Art. 1.240, I / Art. 1.239, parágrafo único / Art. 1.240' && pn.completude.join() === '2 de 7,2 de 7',
      R + 'cada linha diz o dispositivo e, nos lidos, quantas das 7 perguntas respondeu (' + pn.rotulos.join(' / ') + ' · ' + pn.completude.join() + ')');
    ok(/2 de 4 dispositivos lidos ativamente \(50%\) · 0 com as 7 perguntas respondidas/.test(pn.resumo), R + 'o resumo do painel: ' + pn.resumo);
    ok(pn.linhas44 && pn.cobre, R + 'linhas e fechar do painel com 44 px; o painel cobre o palco do leitor');
    ok(pn.contrastes.length >= 8 && pn.contrastes.every(v => v >= 4.5), R + 'texto do painel ≥ 4,5:1 no claro (mín. ' + (pn.contrastes.length ? Math.min(...pn.contrastes).toFixed(2) : '—') + ')');
    ok(pn.semEmoji, R + 'o painel não usa emoji');

    // 8. tocar numa linha pendente leva ao dispositivo
    const ln = await page.evaluate(() => {
      const bloco = window.__la7.gr(2).closest('.art,.par,.inc,.ali,.txt'); window.__alvoVisto = false;
      new MutationObserver(() => { if (bloco.classList.contains('la-alvo')) window.__alvoVisto = true; }).observe(bloco, { attributes: true, attributeFilter: ['class'] });
      return window.__la7.caixa(document.querySelector('#laPainel [data-lista="pendentes"] .la-pn-linha[data-gi="2"]'));
    });
    await page.touchscreen.tap(ln.x, ln.y);
    const foi = await page.evaluate(async () => {
      const H = window.__la7, el = document.getElementById('laPainel'), bloco = H.gr(2).closest('.art,.par,.inc,.ali,.txt');
      const fechou = await H.espera(() => !el.classList.contains('on'), 3000);
      const visivel = await H.espera(() => { const sc = document.getElementById('rdrScroll').getBoundingClientRect(), b = bloco.getBoundingClientRect(); return b.top >= sc.top - 1 && b.top < sc.bottom - 40; }, 4000);
      // só o documento rola: a barra da lei (com o botão do painel) fica onde estava
      const topo = document.querySelector('#rdr .top').getBoundingClientRect().top;
      return { fechou, visivel, alvo: window.__alvoVisto, exp: document.getElementById('rdrLAPainel').getAttribute('aria-expanded'), leitor: document.getElementById('rdr').classList.contains('on'),
        casca: document.getElementById('rdr').scrollTop, topo: Math.round(topo) };
    });
    ok(foi.fechou && foi.exp === 'false' && foi.alvo && foi.visivel && foi.leitor, R + 'tocar numa linha fecha o painel, rola até o dispositivo e acende o contorno dele (' + JSON.stringify(foi) + ')');
    ok(foi.casca === 0 && foi.topo >= 0, R + 'ir ao último dispositivo rola só o documento: a barra da lei não sai da tela (casca ' + foi.casca + ', topo ' + foi.topo + ')');

    // 9. Esc fecha só o painel (o leitor continua aberto) e devolve o foco ao botão
    await page.touchscreen.tap(bt.x, bt.y);
    await page.waitForFunction(() => document.getElementById('laPainel').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
    const abertoAntes = await page.evaluate(() => document.getElementById('laPainel').classList.contains('on'));
    await page.keyboard.press('Escape');
    const esc = await page.evaluate(() => ({ painel: document.getElementById('laPainel').classList.contains('on'), leitor: document.getElementById('rdr').classList.contains('on'), foco: document.activeElement && document.activeElement.id }));
    ok(abertoAntes && !esc.painel && esc.leitor && esc.foco === 'rdrLAPainel', R + 'Esc fecha só o painel e devolve o foco ao botão (aberto antes: ' + abertoAntes + '; ' + JSON.stringify(esc) + ')');

    // 10. no escuro: chips e painel com o mesmo contraste
    await page.evaluate(() => { if (!document.getElementById('rdr').classList.contains('dark')) document.getElementById('rdrDark').click(); });
    const t5 = await selecionarComODedo(page, 1, 'O texto do parágrafo único', 'pointerup');
    const chE = await medirChipsDaBarra(page);
    const escuro = await page.evaluate(() => document.getElementById('rdr').classList.contains('dark'));
    ok(escuro && t5.abriu && chE.n === 7 && chE.contrastes.every(x => x.ok && x.v >= 4.5) && !chE.miudos.length,
      R + 'no escuro os chips seguem com 44 px e texto ≥ 4,5:1 (' + chE.contrastes.map(x => x.ok ? x.v : x.de).join(' ') + ')');
    // o Conferir do trilho no escuro: o fundo dele é translúcido — vale o pior dos dois extremos do degradê do leitor
    const cfE = await page.evaluate(() => {
      const H = window.__la7, cf = document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-conferir'), rdr = document.getElementById('rdr');
      const fg = H.cor(getComputedStyle(cf).color), bg = H.cor(getComputedStyle(cf).backgroundColor);
      return ['--rcanA', '--rcanB'].map(v => { const e = H.cor(getComputedStyle(rdr).getPropertyValue(v).trim()); if (!fg || !bg || !e) return 0;
        const fundo = H.sobre(bg, e); return Math.round(H.contraste(fg.a < 1 ? H.sobre(fg, fundo) : fg, fundo) * 100) / 100; });
    });
    ok(cfE.length === 2 && cfE.every(v => v >= 4.5), R + 'no escuro o texto do Conferir do trilho segue ≥ 4,5:1 (' + cfE.join(' / ') + ')');
    await page.keyboard.press('3');
    await page.touchscreen.tap(bt.x, bt.y);
    await page.waitForFunction(() => document.getElementById('laPainel').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
    const pnE = await lerPainel(page);
    ok(pnE.listas === '0,1,3|2' && pnE.contrastes.length >= 8 && pnE.contrastes.every(v => v >= 4.5),
      R + 'no escuro o painel acompanha a marca nova e o texto segue ≥ 4,5:1 (' + pnE.listas + '; mín. ' + (pnE.contrastes.length ? Math.min(...pnE.contrastes).toFixed(2) : '—') + ')');
    const fx = await page.evaluate(() => { const f = document.querySelector('#laPainel .la-pn-fechar'); return f ? window.__la7.caixa(f) : null; });
    if (fx) await page.touchscreen.tap(fx.x, fx.y);
    // 11. leitura ativa desligada: o botão do painel some
    const off = await page.evaluate(async () => {
      const r = { painelFechou: !document.getElementById('laPainel').classList.contains('on') };
      document.getElementById('rdrLA').click(); await new Promise(res => setTimeout(res, 80));
      r.botaoSome = getComputedStyle(document.getElementById('rdrLAPainel')).display === 'none';
      document.getElementById('rdrLA').click(); await new Promise(res => setTimeout(res, 80));
      r.botaoVolta = getComputedStyle(document.getElementById('rdrLAPainel')).display !== 'none';
      return r;
    });
    ok(off.painelFechou && off.botaoSome && off.botaoVolta, R + 'o botão do painel só existe com a leitura ativa ligada');
    ok(!erros.length, R + 'sem erro de página no LEGIS (' + erros.slice(0, 2).join(' | ').slice(0, 200) + ')');
  } finally { await ctx.close(); }
}

/* (A2) iPad com teclado e trackpad: o ponteiro principal é fino, mas a tela é de toque */
async function comTrackpad(browser, base, ok, R) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 5 }); } catch (_) {} });
  try {
    const { page, erros } = await abrirLegisSozinho(ctx, base);
    const amb = await page.evaluate(() => {
      const H = window.__la7; H.selecionar(H.gr(0), 'por cinco anos ininterruptos');
      document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return { fino: !matchMedia('(pointer: coarse)').matches, pontos: navigator.maxTouchPoints, sinal: document.documentElement.getAttribute('data-la-toque'), barra: document.getElementById('grifBar').classList.contains('on') };
    });
    const ch = await medirChipsDaBarra(page);
    const tr = await page.evaluate(() => [...document.querySelectorAll('#rdrDoc .la-trilho[data-gi="0"] .la-chip')].map(c => Math.round(c.getBoundingClientRect().height)));
    ok(amb.fino && amb.pontos === 5 && amb.sinal === '1' && amb.barra, R + 'iPad com trackpad: ponteiro fino, tela de toque, sinal aceso e a barra abre no clique (' + JSON.stringify(amb) + ')');
    ok(ch.n === 7 && !ch.miudos.length && ch.numeros === '1234567' && tr.length === 7 && tr.every(h => h >= 44),
      R + 'mesmo com ponteiro fino, chips da barra e do trilho medem 44 px (barra ' + ch.alturas.join('/') + '; trilho ' + tr.join('/') + ')');
    // janela estreita (Split View do iPad, janela do Mac): logo acima dos 640 px o rótulo "Lidos"
    // espremia o título da lei a ~50 px; até 760 px o botão fica só com o ícone, e acima volta o rótulo
    const larguras = [];
    for (const w of [641, 760, 761]) {
      await page.setViewportSize({ width: w, height: 820 });
      await page.waitForTimeout(150);
      larguras.push(await page.evaluate((w) => {
        const top = document.querySelector('#rdr .top'), bt = document.getElementById('rdrLAPainel'), b = bt.getBoundingClientRect();
        const fora = [...top.children].filter(e => { if (getComputedStyle(e).display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5); }).length;
        return { w, rotulo: getComputedStyle(bt.querySelector('span')).display !== 'none', bw: Math.round(b.width), bh: Math.round(b.height),
          titulo: Math.round(document.getElementById('rdrTitle').getBoundingClientRect().width), fora, lateral: document.documentElement.scrollWidth > innerWidth || top.scrollWidth > top.clientWidth + 1 };
      }, w));
    }
    ok(!larguras[0].rotulo && !larguras[1].rotulo && larguras[2].rotulo && larguras.every(x => x.bw >= 44 && x.bh >= 44 && !x.fora && !x.lateral),
      R + 'janela estreita: até 760 px o "Lidos" fica só com o ícone (44 px no toque) e não espreme o título; acima, o rótulo volta; nada sai da barra ('
      + larguras.map(x => x.w + ' px: ' + (x.rotulo ? 'rótulo' : 'ícone') + ', título ' + x.titulo + ' px').join('; ') + ')');
    ok(!erros.length, R + 'sem erro de página com trackpad (' + erros.slice(0, 2).join(' | ').slice(0, 200) + ')');
  } finally { await ctx.close(); }
}

/* (A3) uma lei grande: o painel abre sem procurar cada dispositivo no documento (era O(n²) e travava
   o iPad por segundos no CC) e não conta cabeçalho nem assinaturas; a "Pena" entre artigos conta */
async function leiGrande(browser, base, ok, R) {
  const N = 500, paras = ['LEI No 10.406, DE 10 DE JANEIRO DE 2002.', 'Institui o Código Civil.', 'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:'];
  for (let k = 1; k <= N; k++) {
    paras.push('Art. ' + k + '. Caput do artigo ' + k + ', com prazo de ' + k + ' dias:', 'I - primeiro inciso do artigo ' + k + ';', 'II - segundo inciso do artigo ' + k + '.');
    if (k % 10 === 0) paras.push('Pena - detenção, de um a seis meses, do artigo ' + k + '.');
    paras.push('Parágrafo único. Parágrafo do artigo ' + k + '.');
  }
  paras.push('Brasília, 10 de janeiro de 2002; 181o da Independência e 114o da República.', 'FERNANDO HENRIQUE CARDOSO', 'Aloysio Nunes Ferreira Filho');
  const esperado = N * 4 + N / 10;
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  try {
    const { page, erros } = await abrirLegisSozinho(ctx, base, paras);
    await page.waitForFunction((n) => document.querySelectorAll('#rdrDoc .gr').length >= n && document.querySelectorAll('#rdrDoc .la-trilho').length >= n, esperado + 6, { timeout: 60000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const contar = (proto) => { const orig = proto.querySelector; let n = 0; proto.querySelector = function (s) { if (/^\.gr\[data-gi=/.test(String(s))) n++; return orig.apply(this, arguments); }; return () => { proto.querySelector = orig; return n; }; };
      const fimE = contar(Element.prototype), fimD = contar(Document.prototype);
      const bt = document.getElementById('rdrLAPainel'), el = document.getElementById('laPainel');
      let t0 = performance.now(); bt.click(); const abrir = performance.now() - t0;
      const mais = el.querySelector('button[data-acao="mais"]');
      t0 = performance.now(); if (mais) mais.click(); const todos = performance.now() - t0;
      const buscas = fimE() + fimD();
      const linhas = [...el.querySelectorAll('[data-lista="pendentes"] .la-pn-linha')];
      const textos = linhas.map(b => ((b.querySelector('.la-pn-rot') || {}).textContent || '') + ' | ' + ((b.querySelector('.la-pn-txt') || {}).textContent || ''));
      return { elementos: document.getElementsByTagName('*').length, gr: document.querySelectorAll('#rdrDoc .gr').length, abrir: Math.round(abrir), todos: Math.round(todos), buscas, aberto: el.classList.contains('on'),
        resumo: ((el.querySelector('.la-pn-resumo') || {}).textContent || '').replace(/\s+/g, ' ').trim(), linhas: linhas.length,
        primeira: textos[0] || '', cabecalho: textos.some(t => /LEI No|Institui o Código|PRESIDENTE DA REPÚBLICA/.test(t)), assinatura: textos.some(t => /Brasília|FERNANDO|Aloysio/.test(t)),
        pena: textos.find(t => /Pena - detenção, de um a seis meses, do artigo 10\./.test(t)) || '' };
    });
    ok(r.aberto && r.gr === esperado + 6 && r.buscas === 0,
      R + 'lei grande (' + r.gr + ' blocos, ' + r.elementos + ' elementos): o painel abre sem procurar nenhum dispositivo no documento (' + r.buscas + ' buscas por gi)');
    ok(r.abrir < 2500 && r.todos < 4000, R + 'lei grande: abrir o painel ' + r.abrir + ' ms e "Mostrar os outros" ' + r.todos + ' ms (antes, segundos por causa das buscas)');
    ok(r.resumo.indexOf('0 de ' + esperado + ' dispositivos') >= 0 && r.linhas === esperado && /^Art\. 1º \| Caput do artigo 1,/.test(r.primeira) && !r.cabecalho && !r.assinatura,
      R + 'o painel não conta cabeçalho nem assinaturas como dispositivo (' + r.resumo + '; 1ª linha: ' + r.primeira.slice(0, 40) + ')');
    ok(/^Art\. 10 \| Pena - detenção/.test(r.pena), R + 'a "Pena" entre artigos é dispositivo e entra, com o rótulo do artigo (' + r.pena.slice(0, 40) + ')');
    ok(!erros.length, R + 'sem erro de página na lei grande (' + erros.slice(0, 2).join(' | ').slice(0, 200) + ')');
  } finally { await ctx.close(); }
}

/* (B) o host: o cartão de cada pergunta no Baralho, no mesmo gesto */
async function noHost(browser, base, ok, R) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/__semente');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      localStorage.setItem('catedra:edital', JSON.stringify([{ disc: 'Direito Civil', peso: 1 }]));
    });
    await page.goto(base + '/Catedra.dc.html');
    await page.waitForFunction(() => !!window.__catedraApp && (window.__catedraApp.state.edital || []).some(d => d.disc === 'Direito Civil') && typeof window.__catedraGoView === 'function', null, { timeout: 40000 });
    await definirContaLeitora(page);
    await page.evaluate(() => {
      // registra os avisos simples do app (o toast com "desfazer" é outro, procurado no DOM)
      const app = window.__catedraApp, proto = Object.getPrototypeOf(app); window.__avisos = [];
      app._toast = function (m) { window.__avisos.push(String(m)); return proto._toast.call(this, m); };
      window.__catedraGoView('legis');
    });
    await page.waitForFunction(() => { const f = document.querySelector('iframe[data-ct-view="legis"][data-ct-frame]'); return !!(f && f.contentWindow && f.dataset.ctLoad === '1'); }, null, { timeout: 30000 });
    const frame = await (await page.$('iframe[data-ct-view="legis"][data-ct-frame]')).contentFrame();
    await frame.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL, null, { timeout: 20000 });
    await frame.evaluate((paras) => { window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) }); window.openReader(CAT.laws.find(l => /l10406/.test(l.u))); }, PARAS);
    await frame.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 4, null, { timeout: 15000 });
    await ajudantes(frame);
    const lei = await frame.evaluate(() => { if (!document.getElementById('rdr').classList.contains('la')) document.getElementById('rdrLA').click(); return CAT.laws.find(l => /l10406/.test(l.u)).u; });
    const LEITURA = 'la|' + lei + '|0', id = (el) => 'fc|la|' + LEITURA + '|' + el;
    const marcarNoLegis = (frase, el, gi) => frame.evaluate(({ frase, el, gi }) => {
      const H = window.__la7; H.selecionar(H.gr(gi || 0), frase);
      document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      const ch = document.querySelector('#grifLA .la-chip[data-el="' + el + '"]');
      const r = { barra: document.getElementById('grifBar').classList.contains('on'), mh: getComputedStyle(ch).minHeight, num: (ch.querySelector('.la-num') || {}).textContent };
      ch.click(); return r;
    }, { frase, el, gi });
    const desmarcarNoLegis = (el, n) => frame.evaluate(async ({ el, n }) => {
      for (let i = 0; i < n; i++) { const m = window.__la7.gr(0).querySelector('mark.la.la-' + el); if (m) m.click(); await new Promise(r => setTimeout(r, 120)); }
    }, { el, n });
    const lerFc = () => page.evaluate((LEITURA) => {
      const fc = JSON.parse(localStorage.getItem('catedra:fc') || '[]'), daLeitura = fc.filter(c => c && c.la && c.la.id === LEITURA);
      const por = {}; daLeitura.forEach(c => { por[c.la.el] = c; });
      return { total: fc.length, n: daLeitura.length, els: daLeitura.map(c => c.la.el).sort().join(), por, ids: fc.map(c => c.id), avisos: (window.__avisos || []).filter(t => /Baralho/.test(t)) };
    }, LEITURA);
    const esperarFc = (cond) => page.waitForFunction(({ LEITURA, cond }) => {
      const fc = JSON.parse(localStorage.getItem('catedra:fc') || '[]').filter(c => c && c.la && c.la.id === LEITURA), por = {}; fc.forEach(c => { por[c.la.el] = c; });
      return new Function('fc', 'por', 'return ' + cond)(fc, por);
    }, { LEITURA, cond }, { timeout: 10000 }).catch(() => {});

    // 0. desktop sem tela de toque: nada muda na cara da barra (a regra dos 44 px não vaza)
    const amb = await frame.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches || matchMedia('(any-pointer: coarse)').matches, pontos: navigator.maxTouchPoints || 0, sinal: document.documentElement.getAttribute('data-la-toque') }));
    // 1. marcar Quem? põe o cartão DAQUELA pergunta no Baralho, sem conferir
    const g1 = await marcarNoLegis('Aquele que, não sendo proprietário', 'quem');
    ok(!amb.coarse && amb.pontos === 0 && amb.sinal === null && g1.barra && g1.num === '1' && g1.mh !== '44px',
      R + 'com mouse e sem tela de toque a barra abre no mouseup como antes e o chip não ganha os 44 px do toque (min-height ' + g1.mh + ')');
    await esperarFc('!!por.quem');
    const b1 = await lerFc();
    const rev1 = await page.evaluate(() => (window.__catedraApp.state.reviews || []).length);
    ok(b1.n === 1 && b1.total === 1 && b1.ids[0] === id('quem'), R + 'marcar põe UM cartão no Baralho no mesmo gesto, id fc|la|<leitura>|quem, sem passar pela conferência (' + b1.ids.join() + ')');
    const q1 = b1.por.quem || {};
    ok(q1.tipo === 'cloze' && q1.front.startsWith('{{c1::Aquele que, não sendo proprietário}} de imóvel rural ou urbano') && !/\{\{c2::/.test(q1.front)
      && q1.el === 'quem' && !!q1.la && q1.la.el === 'quem' && q1.disc === 'Direito Civil' && q1.ref === 'CC · Art. 1.239' && q1.origem === 'leitura-ativa' && !q1.dueDate,
      R + 'o cartão: o cloze de Quem? (uma pergunta), disciplina do edital, novo (vence hoje)');
    ok(rev1 === 0, R + 'marcar não cria revisão: revisão continua vindo da conferência');
    ok(b1.avisos.length === 1 && b1.avisos[0] === 'Cartão de CC · Art. 1.239 · Quem? no Baralho', R + 'um aviso só quando o cartão entra (' + b1.avisos.join(' | ') + ')');

    // 2. o Baralho mostra o cartão com a lacuna escrita e a origem legível; "Sei" agenda pelo FSRS
    await page.evaluate(() => window.__catedraGoView('flashcards'));
    await page.waitForFunction(() => [...document.querySelectorAll('#dc-root button')].some(b => /Revisar agora/.test(b.textContent || '')), null, { timeout: 15000 }).catch(() => {});
    const bar = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), r = {};
      const b = [...document.querySelectorAll('#dc-root button')].find(x => /Revisar agora/.test(x.textContent || '')); if (!b) return { erro: 'sem "Revisar agora" no Baralho' };
      b.click();
      for (let i = 0; i < 120 && !document.querySelector('.ct-fc-frente'); i++) await w(50);
      const f = document.querySelector('.ct-fc-frente'); if (!f) return { erro: 'o cartão não abriu no Baralho' };
      const cx = f.getBoundingClientRect(); r.frente = f.textContent; r.pinta = cx.width > 100 && cx.height > 10 && getComputedStyle(f).visibility === 'visible';
      const virar = [...document.querySelectorAll('button')].find(x => /Mostrar a resposta/.test(x.textContent || '')); if (!virar) return { erro: 'sem "Mostrar a resposta"' };
      virar.click(); for (let i = 0; i < 120 && !document.querySelector('.ct-fc-verso'); i++) await w(50);
      r.verso = (document.querySelector('.ct-fc-verso') || {}).textContent || '';
      r.fonte = ((document.querySelector('.ct-fc-fonte') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      const sei = document.querySelector('button.ct-fc-n5'); if (!sei) return { erro: 'sem o botão "Sei"' };
      sei.click(); await w(400);
      return r;
    });
    if (bar.erro) ok(false, R + 'Baralho: ' + bar.erro);
    else {
      ok(bar.pinta && bar.frente.includes('[' + LACUNA + ' Quem?]') && !bar.frente.includes('{{') && bar.frente.includes('de imóvel rural ou urbano'),
        R + 'o Baralho mostra o cartão com a lacuna escrita, nunca a sintaxe do Anki (' + bar.frente.slice(0, 60) + '…)');
      ok(bar.verso.includes('«Aquele que, não sendo proprietário»'), R + 'o verso traz o trecho marcado em destaque');
      ok(bar.fonte === 'de: Leitura ativa — CC · Art. 1.239', R + 'a origem aparece escrita para a pessoa, com a referência, não o identificador (' + bar.fonte + ')');
    }
    const agendado = (await lerFc()).por.quem || {};
    ok(!!agendado.dueDate && agendado.repeticoes === 1 && !!agendado.fsrs && (agendado.fsrs.history || []).length === 1, R + '"Sei" no Baralho agendou o cartão pelo FSRS (vence ' + agendado.dueDate + ')');

    // 3. marcar Há prazo? no mesmo dispositivo: nasce o cartão DELA; o de Quem? fica como estava
    await page.evaluate(() => window.__catedraGoView('legis'));
    await page.waitForFunction(() => { const f = document.querySelector('iframe[data-ct-view="legis"]'); return !!f && getComputedStyle(f).display !== 'none'; }, null, { timeout: 10000 }).catch(() => {});
    await marcarNoLegis('por cinco anos ininterruptos', 'prazo');
    await esperarFc('!!por.prazo');
    const b3 = await lerFc(), p3 = b3.por.prazo || {}, q3 = b3.por.quem || {};
    ok(b3.n === 2 && b3.total === 2 && b3.ids.includes(id('prazo')) && p3.front.includes('por {{c1::cinco anos}} ininterruptos') && !p3.front.includes('{{c2'),
      R + 'marcar outra pergunta cria o cartão dela, com só a lacuna dela (' + b3.els + ')');
    ok(JSON.stringify(q3) === JSON.stringify(agendado), R + 'o cartão de Quem?, já revisado, não é tocado pela marca de outra pergunta');
    ok(b3.avisos.length === 1, R + 'o 2º cartão do mesmo dispositivo nasce calado: o aviso de cartão novo é só o do primeiro (' + b3.avisos.join(' | ') + ')');
    // 3b. mais um trecho em Quem?: o MESMO cartão ganha a 2ª lacuna e a agenda fica
    await marcarNoLegis('de imóvel rural ou urbano', 'quem');
    await esperarFc("!!por.quem && /\\{\\{c2::de imóvel rural ou urbano\\}\\}/.test(por.quem.front)");
    const b3b = await lerFc(), q3b = b3b.por.quem || {};
    ok(b3b.n === 2 && b3b.total === 2 && /\{\{c2::de imóvel rural ou urbano\}\}/.test(q3b.front || ''), R + 'marcar de novo a mesma pergunta atualiza o mesmo cartão (agora com 2 lacunas) e não duplica');
    ok(q3b.dueDate === agendado.dueDate && q3b.repeticoes === agendado.repeticoes && q3b.intervalo === agendado.intervalo
      && JSON.stringify(q3b.fsrs) === JSON.stringify(agendado.fsrs) && q3b.criado === agendado.criado && q3b.up > agendado.up,
      R + 'o agendamento FSRS fica intacto e o up avança');
    ok(b3b.avisos.length === 1, R + 'atualizar o cartão não dá aviso (nada de toast a cada marca)');

    // 4. conferir (Hesitei em Quem?, Errei em Há prazo?) reaproveita os cartões; o desfazer não os leva
    await frame.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)); document.querySelector('#rdrDoc .la-trilho[data-gi="0"] .la-conferir').click(); await w(100);
      const p = document.getElementById('laConf');
      p.querySelector('button[data-acao=mostrar]').click(); await w(50); p.querySelector('button[data-q="3"]').click(); await w(80);
      p.querySelector('button[data-acao=mostrar]').click(); await w(50); p.querySelector('button[data-q="1"]').click(); await w(80);
    });
    await page.waitForFunction(() => { const a = window.__catedraApp.state; return (a.reviews || []).length >= 2 && (a.errors || []).length >= 1; }, null, { timeout: 10000 }).catch(() => {});
    const b4 = await page.evaluate((LEITURA) => {
      const a = window.__catedraApp.state, fc = a.flashcards || [];
      const t = [...document.querySelectorAll('div[role=status]')].find(d => [...d.querySelectorAll('button')].some(b => /desfazer/i.test(b.textContent || '')));
      return { total: fc.length, quem: JSON.stringify(fc.find(c => c.id === 'fc|la|' + LEITURA + '|quem') || null),
        revisoes: (a.reviews || []).map(r => r.id.split('|').pop()).sort().join(), erros: (a.errors || []).length, aviso: t ? t.textContent : '' };
    }, LEITURA);
    ok(b4.total === 2 && b4.quem === JSON.stringify(q3b), R + 'conferir (Hesitei + Errei) reaproveita os cartões das perguntas: seguem dois, com o mesmo texto e a mesma agenda');
    ok(b4.revisoes === 'prazo,quem' && b4.erros === 1 && /2 revisões e 1 erro/.test(b4.aviso) && !/cart[ãa]o/i.test(b4.aviso),
      R + 'a conferência segue criando as revisões e o erro, e o aviso não fala de cartão novo (' + b4.aviso.replace(/\s+/g, ' ').trim() + ')');
    await page.evaluate(() => { const b = [...document.querySelectorAll('div[role=status] button')].find(x => /desfazer/i.test(x.textContent || '')); if (b) b.click(); });
    await page.waitForFunction(() => { const a = window.__catedraApp.state; return !(a.reviews || []).length && !(a.errors || []).length; }, null, { timeout: 10000 }).catch(() => {});
    const b4d = await page.evaluate(() => { const a = window.__catedraApp.state; return { rev: (a.reviews || []).length, err: (a.errors || []).length, n: (a.flashcards || []).length }; });
    ok(b4d.rev === 0 && b4d.err === 0 && b4d.n === 2, R + 'o desfazer da conferência tira revisões e erro e deixa os cartões da marcação');

    // 5. o cartão de antes do LA7 (criado por uma conferência, id 'fc<número>') é reaproveitado, não duplicado
    const VELHO = 'fc1764000000000';
    await page.evaluate(({ LEITURA, VELHO }) => {
      const app = window.__catedraApp, velho = { id: VELHO, tipo: 'cloze', front: 'Aquele que, não sendo proprietário de imóvel rural ou urbano, {{c1::possua}} como sua…', back: 'x', extra: '', disc: 'Direito Civil',
        origem: 'leitura-ativa', ref: 'CC · Art. 1.239', el: 'oque', leituraId: LEITURA, la: { id: LEITURA, el: 'oque' }, criado: 1, up: 1, dueDate: '2026-12-01', repeticoes: 1, intervalo: 6, fsrs: { version: 6, stability: 6 } };
      const fc = [velho, ...(app.state.flashcards || [])]; app.setState({ flashcards: fc }); app._saveFC(fc);
    }, { LEITURA, VELHO });
    await marcarNoLegis('possua como sua', 'oque');
    await esperarFc("!!por.oque && /possua como sua\\}\\}/.test(por.oque.front)");
    const b5 = await lerFc(), o5 = b5.por.oque || {};
    ok(b5.n === 3 && o5.id === VELHO && !b5.ids.includes(id('oque')) && /\{\{c1::possua como sua\}\}/.test(o5.front) && o5.dueDate === '2026-12-01' && o5.repeticoes === 1 && o5.fsrs && o5.fsrs.stability === 6,
      R + 'O quê? já tinha cartão de uma conferência antiga: a marca atualiza esse cartão (mesmo id, mesma agenda) em vez de criar outro (' + b5.ids.join() + ')');

    // 6. a 4ª, a 5ª e a 6ª pergunta marcadas também viram cartão — cada uma o seu
    await marcarNoLegis('tornando-a produtiva por seu trabalho', 'como');
    await marcarNoLegis('sem oposição', 'excecao');
    await marcarNoLegis('não superior a cinqüenta hectares', 'proibicao');
    await esperarFc('!!por.como && !!por.excecao && !!por.proibicao');
    const b6 = await lerFc();
    ok(b6.n === 6 && b6.els === 'como,excecao,oque,prazo,proibicao,quem' && ['como', 'excecao', 'proibicao'].every(el => b6.por[el] && b6.por[el].id === id(el) && (b6.por[el].front.match(/\{\{c\d+::/g) || []).length === 1),
      R + 'seis perguntas marcadas, seis cartões — nenhuma pergunta fica sem o seu (' + b6.els + ')');
    ok(b6.avisos.length === 1, R + 'três perguntas novas no mesmo dispositivo, nenhum aviso a mais (' + b6.avisos.length + ')');

    // 7. a exportação: cada cartão uma vez só, no arquivo de Cloze
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.evaluate(() => window.__catedraApp.exportFlashcardsCSV())]);
    const txt = fs.readFileSync(await dl.path(), 'utf8'), linhas = txt.split('\n').filter(l => l && l[0] !== '#');
    const fcNoDisco = await page.evaluate(() => JSON.parse(localStorage.getItem('catedra:fc') || '[]').filter(c => c.tipo === 'cloze').map(c => c.front.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>').trim()));
    ok(dl.suggestedFilename() === 'catedra-cloze-lei-seca.txt' && /^#separator:tab\n#html:true\n#notetype:Cloze\n#tags column:3\n/.test(txt) && linhas.length === 6 && linhas.every(l => l.split('\t').length === 3)
      && fcNoDisco.every(f => linhas.filter(l => l.split('\t')[0] === f).length === 1) && linhas.some(l => /\tleitura-ativa CC prazo Direito_Civil$/.test(l)),
      R + 'catedra-cloze-lei-seca.txt continua no mesmo formato e traz cada cartão uma vez (' + linhas.length + ' linhas)');

    // 8. desmarcar: o cartão nunca revisado sai; o já revisado (Quem?) FICA, com a agenda
    await desmarcarNoLegis('prazo', 1);
    await esperarFc('!por.prazo');
    const b8 = await lerFc();
    ok(b8.n === 5 && !b8.por.prazo && b8.avisos[b8.avisos.length - 1] === 'Cartão de CC · Art. 1.239 · Há prazo? saiu do Baralho',
      R + 'desmarcar tudo em Há prazo? (cartão nunca revisado) tira o cartão, gravado no disco, com um aviso (' + b8.avisos.slice(-1).join() + ')');
    await desmarcarNoLegis('quem', 2);
    await page.waitForFunction(() => (window.__avisos || []).some(t => /fica no Baralho/.test(t)), null, { timeout: 10000 }).catch(() => {});
    const b8b = await lerFc(), q8 = b8b.por.quem || {};
    const leitura = await page.evaluate((id) => (window.__catedraApp.state.leituras || []).find(x => x.id === id) || null, LEITURA);
    ok(b8b.n === 5 && !!q8.id && q8.dueDate === agendado.dueDate && JSON.stringify(q8.fsrs) === JSON.stringify(agendado.fsrs),
      R + 'desmarcar tudo em Quem? (cartão já revisado) deixa o cartão no Baralho com a agenda e o histórico do FSRS');
    ok(b8b.avisos[b8b.avisos.length - 1] === 'O cartão de CC · Art. 1.239 · Quem? fica no Baralho: já tem revisões', R + 'e diz por quê (' + b8b.avisos.slice(-1).join() + ')');
    ok(!!leitura && !leitura.el.quem.length && !leitura.el.prazo.length, R + 'a leitura continua guardada, sem as marcas tiradas');

    // 8c. o gesto só mexe nas perguntas que ele mudou. Quem? ficou sem marca com o cartão revisado, e
    //     Quando? (nunca marcada) tem um cartão de conferência antiga, nunca revisado: mais um trecho em
    //     Como? atualiza só o de Como? — não repete o "fica no Baralho" nem leva o cartão de Quando?
    const VELHO_Q = 'fc1764000000002';
    await page.evaluate(({ LEITURA, VELHO_Q }) => {
      const app = window.__catedraApp, velho = { id: VELHO_Q, tipo: 'cloze', front: 'Aquele que… {{c1::área de terra em zona rural}}…', back: '«área de terra em zona rural»', extra: '', disc: 'Direito Civil',
        origem: 'leitura-ativa', ref: 'CC · Art. 1.239', el: 'quando', leituraId: LEITURA, la: { id: LEITURA, el: 'quando' }, criado: 1, up: 1 };
      const fc = [...(app.state.flashcards || []), velho]; app.setState({ flashcards: fc }); app._saveFC(fc);
    }, { LEITURA, VELHO_Q });
    const nAvisos8 = (await lerFc()).avisos.length;
    await marcarNoLegis('tendo nela sua moradia', 'como');
    await esperarFc("!!por.como && /\\{\\{c2::tendo nela sua moradia\\}\\}/.test(por.como.front)");
    await page.waitForTimeout(400);
    const b8c = await lerFc(), q8c = b8c.por.quem || {};
    ok(/\{\{c2::tendo nela sua moradia\}\}/.test((b8c.por.como || {}).front || '') && b8c.ids.includes(VELHO_Q) && q8c.dueDate === agendado.dueDate && JSON.stringify(q8c.fsrs) === JSON.stringify(agendado.fsrs),
      R + 'marcar mais um trecho em Como? atualiza só o cartão de Como?: o antigo de Quando? (sem marca, nunca revisado) e o de Quem? (revisado) ficam como estavam (' + b8c.els + ')');
    ok(b8c.avisos.length === nAvisos8, R + 'e não sai aviso de pergunta que o gesto não tocou (' + (b8c.avisos.slice(nAvisos8).join(' | ') || 'nenhum') + ')');

    // 9. baixa estimulação: o cartão volta (novo, sem agenda) e nenhum aviso aparece
    const nAvisos = b8c.avisos.length;
    await page.evaluate(() => { const a = window.__catedraApp; a.setState(s => ({ prefs: Object.assign({}, s.prefs || {}, { baixaEstimulacao: true }) })); });
    await marcarNoLegis('por cinco anos ininterruptos', 'prazo');
    await esperarFc('!!por.prazo');
    const b9 = await lerFc();
    ok(b9.n === b8c.n + 1 && !!b9.por.prazo && b9.por.prazo.id === id('prazo') && !b9.por.prazo.dueDate && !b9.por.prazo.fsrs, R + 'marcar de novo depois de tirar recria o cartão, novo (sem agenda)');
    ok(b9.avisos.length === nAvisos, R + 'na baixa estimulação o gesto não dá aviso');
    // 9b. o que avisa fora da baixa estimulação é o PRIMEIRO cartão de um dispositivo (passo 10):
    //     com ela ligada, o primeiro cartão do parágrafo único nasce calado
    const IDPAR = 'fc|la|la|' + lei + '|1|oque';
    await marcarNoLegis('texto do parágrafo', 'oque', 1);
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem('catedra:fc') || '[]').some(c => c.id === id), IDPAR, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    const b9b = await page.evaluate((id) => ({ tem: JSON.parse(localStorage.getItem('catedra:fc') || '[]').some(c => c.id === id), avisos: (window.__avisos || []).filter(t => /Baralho/.test(t)) }), IDPAR);
    ok(b9b.tem && b9b.avisos.length === nAvisos,
      R + 'na baixa estimulação o PRIMEIRO cartão de um dispositivo (o parágrafo único) nasce sem aviso (' + (b9b.avisos.slice(nAvisos).join(' | ') || 'nenhum') + ')');
    await page.evaluate(() => { const a = window.__catedraApp; a.setState(s => ({ prefs: Object.assign({}, s.prefs || {}, { baixaEstimulacao: false }) })); });

    // 10. inciso cujo caput termina em ":" — no host de verdade: a lacuna fica no inciso, não no caput
    await marcarNoLegis('artigo', 'quem', 3);
    const IDINC = 'fc|la|la|' + lei + '|3|quem';
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem('catedra:fc') || '[]').some(c => c.id === id), IDINC, { timeout: 10000 }).catch(() => {});
    const inc = await page.evaluate((id) => (JSON.parse(localStorage.getItem('catedra:fc') || '[]').find(c => c.id === id) || {}).front || '', IDINC);
    ok(inc === 'Outro artigo, com um inciso: primeiro inciso do {{c1::artigo}}.', R + 'no inciso o cartão leva o tronco do caput e esconde o trecho do inciso, não o "artigo" do caput (' + inc + ')');
    const avInc = await page.evaluate(() => (window.__avisos || []).filter(t => /Baralho/.test(t)).pop() || '');
    ok(avInc === 'Cartão de CC · Art. 1.240, I · Quem? no Baralho', R + 'o primeiro cartão de outro dispositivo avisa de novo (' + avInc + ')');

    // 11. conferir, SEM remarcar, uma leitura de antes do LA7: a marca de O quê? no Art. 1.240 (gi 2)
    //     cujo único cartão é o que uma conferência antiga criou (id fc<número>, já agendado). Monta-se
    //     esse estado trocando o cartão do gesto pelo antigo; o Errei da conferência reaproveita o
    //     antigo e não cria um segundo cartão para a mesma pergunta
    const L2 = 'la|' + lei + '|2', ID2 = 'fc|la|' + L2 + '|oque', VELHO2 = 'fc1764000000004';
    await marcarNoLegis('Outro artigo', 'oque', 2);
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem('catedra:fc') || '[]').some(c => c.id === id), ID2, { timeout: 10000 }).catch(() => {});
    const troca = await page.evaluate(({ L2, ID2, VELHO2 }) => {
      const app = window.__catedraApp, velho = { id: VELHO2, tipo: 'cloze', front: '{{c1::Outro artigo}}, com um inciso (redação de uma conferência antiga)', back: '«Outro artigo», com um inciso', extra: '',
        disc: 'Direito Civil', origem: 'leitura-ativa', ref: 'CC · Art. 1.240', el: 'oque', leituraId: L2, la: { id: L2, el: 'oque' }, criado: 1, up: 1,
        dueDate: '2026-12-03', repeticoes: 1, intervalo: 3, fsrs: { version: 6, stability: 3 } };
      const antes = app.state.flashcards || [], tinha = antes.some(c => c.id === ID2);
      const fc = antes.filter(c => c.id !== ID2).concat([velho]); app.setState({ flashcards: fc }); app._saveFC(fc);
      return { tinha, depois: (app.state.flashcards || []).filter(c => c && c.la && c.la.id === L2).map(c => c.id).join() };
    }, { L2, ID2, VELHO2 });
    ok(troca.tinha && troca.depois === VELHO2, R + 'montado o estado de antes do LA7 no Art. 1.240: a marca de O quê? e só o cartão antigo dela (' + troca.depois + ')');
    const conf11 = await frame.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), b = document.querySelector('#rdrDoc .la-trilho[data-gi="2"] .la-conferir');
      if (!b) return 'sem o Conferir no trilho do Art. 1.240';
      b.click(); await w(120);
      const p = document.getElementById('laConf'), fila = p.querySelectorAll('.la-fila .la-chip').length;
      p.querySelector('button[data-acao=mostrar]').click(); await w(60); p.querySelector('button[data-q="1"]').click(); await w(100);
      return fila === 1 ? '' : 'a rodada tem ' + fila + ' perguntas';
    });
    await page.waitForFunction((L2) => (window.__catedraApp.state.reviews || []).some(r => r.id === 'rv|la|' + L2 + '|oque'), L2, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);
    const b11 = await page.evaluate(({ L2, VELHO2 }) => {
      const a = window.__catedraApp.state, cs = (a.flashcards || []).filter(c => c && c.la && c.la.id === L2), v = cs.find(c => c.id === VELHO2) || {};
      const t = [...document.querySelectorAll('div[role=status]')].filter(d => [...d.querySelectorAll('button')].some(b => /desfazer/i.test(b.textContent || ''))).pop();
      return { ids: cs.map(c => c.id).join(), agenda: v.dueDate === '2026-12-03' && v.repeticoes === 1, rev: (a.reviews || []).some(r => r.id === 'rv|la|' + L2 + '|oque'),
        erro: (a.errors || []).some(e => e.id === 'e|la|' + L2 + '|oque'), aviso: t ? t.textContent.replace(/\s+/g, ' ').trim() : '' };
    }, { L2, VELHO2 });
    ok(!conf11 && b11.rev && b11.erro && b11.ids === VELHO2 && b11.agenda,
      R + 'conferir (Errei) uma pergunta cujo cartão veio de uma conferência de antes do LA7 reaproveita esse cartão, com a agenda: nada de um segundo (' + (conf11 || b11.ids) + ')');
    ok(/1 revisão e 1 erro/.test(b11.aviso) && !/cart[ãa]o/i.test(b11.aviso), R + 'e o aviso da conferência não fala de cartão novo (' + b11.aviso + ')');
  } finally { await ctx.close(); }
}

/* (C) a lápide: o cartão tirado pelo gesto sai pelo mesmo setItem de toda exclusão de cartão, e o
   auth.js de verdade (tests/sync-fixture.html, Supabase de mentira) grava a lápide do id — a cópia
   velha da nuvem não o traz de volta; recriar o cartão (marcar de novo) apaga a lápide. */
async function lapideNoSync(browser, base, ok, R) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/tests/sync-fixture.html');
    await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test, null, { timeout: 15000 });
    await page.addScriptTag({ url: base + '/leitura-ativa.js' });
    const r = await page.evaluate(() => {
      const LA = window.CT_LA, J = JSON.stringify, r = {}, ID = LA.idCartao('la|https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm|0', 'quem');
      localStorage.removeItem('catedra:_tomb');
      const conteudo = { tipo: 'cloze', front: '{{c1::Aquele que}} possua', back: '«Aquele que» possua', extra: '', tags: ['leitura-ativa'], el: 'quem' };
      const criado = LA.fundirCartao([{ id: 'fcB', front: 'P', back: 'R', up: 1 }], ID, conteudo, Date.now()).lista;
      localStorage.setItem('catedra:fc', J(criado));
      const tirado = LA.fundirCartao(criado, ID, null, Date.now()).lista;
      localStorage.setItem('catedra:fc', J(tirado));   // o mesmo setItem do _saveFC, pelo gancho do auth.js
      const t1 = (JSON.parse(localStorage.getItem('catedra:_tomb') || '{}').arr || {})['catedra:fc'] || {};
      r.lapide = !!t1[ID] && !t1.fcB;
      // a nuvem ainda tem o cartão (de antes da exclusão): o merge por id não o traz de volta
      const srv = { 'catedra:fc': J(criado.map(c => Object.assign({}, c, { up: 1 }))) };
      const m = JSON.parse(window.CatedraSync._test.mergeAll(srv, { 'catedra:fc': J(tirado) }, false)['catedra:fc']);
      r.naoVolta = !m.some(c => c.id === ID) && m.some(c => c.id === 'fcB');
      const denovo = LA.fundirCartao(tirado, ID, conteudo, Date.now() + 5).lista;
      localStorage.setItem('catedra:fc', J(denovo));
      const t2 = (JSON.parse(localStorage.getItem('catedra:_tomb') || '{}').arr || {})['catedra:fc'] || {};
      r.recriarTiraLapide = !t2[ID] && denovo.some(c => c.id === ID);
      localStorage.removeItem('catedra:fc'); localStorage.removeItem('catedra:_tomb');
      return r;
    });
    ok(r.lapide, R + 'tirar o cartão do gesto deixa a lápide do id no auth.js de verdade (e só dele)');
    ok(r.naoVolta, R + 'a cópia velha da nuvem não traz o cartão tirado de volta (merge por id com a lápide)');
    ok(r.recriarTiraLapide, R + 'marcar de novo recria o cartão com o mesmo id e a lápide sai');
  } finally { await ctx.close(); }
}

export async function testarLeituraAtivaIpad(pageDaSuite, base, ok, opcoes = {}) {
  const R = 'LA7 [' + (opcoes.motor || 'chromium') + '] ';
  const browser = pageDaSuite.context().browser();
  for (const [nome, f] of [['iPad', noIpad], ['trackpad', comTrackpad], ['lei grande', leiGrande], ['host', noHost], ['lápide', lapideNoSync]]) {
    try { await f(browser, base, ok, R); }
    catch (e) { ok(false, R + nome + ' exceção: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let falhas = 0, total = 0;
  testarLeituraAtivaIpadEstatico((c, m) => { total++; if (!c) { falhas++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); });
  console.log(falhas ? ('\nFALHAS: ' + falhas + ' de ' + total) : ('\n' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
}
