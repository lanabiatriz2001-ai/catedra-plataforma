import test from 'node:test';
import assert from 'node:assert/strict';
import { mediana, bloqueioLongTasks, validarAmostra, resumoAmostras } from './metricas-abertura.mjs';

const base = { mainPronto:true, casCaPresente:false, prontidaoMs:3000, prontidaoNavegacaoMs:3200,
  fcpMs:500, lcpMs:3000, domContentLoadedMs:3100,
  cargaCssEsperada:true, cargaCssPronta:true, errosDePagina:0,
  recursosLocaisFalhos:0, recursosLocaisPendentes:0, fontesProntas:true, fontesFalhas:0, timeout:false };

test('mediana ignora valores ausentes e mede pares e ímpares', () => {
  assert.equal(mediana([14, 10, 12, null, -1, NaN]), 12);
  assert.equal(mediana([10, 20, 30, 40]), 25);
  assert.equal(mediana([null, NaN, -1]), null);
});

test('bloqueioLongTasks delimita ao intervalo da primeira pintura à prontidão', () => {
  assert.equal(bloqueioLongTasks([
    {inicio:0,duracao:100}, {inicio:180,duracao:110}, {inicio:400,duracao:200}
  ], 200, 500), 40 + 50);
  assert.equal(bloqueioLongTasks([], null, 500), null);
});

test('amostra não vira verde com CSS ausente, script falho ou conteúdo travado', () => {
  assert.deepEqual(validarAmostra(base), []);
  assert.deepEqual(validarAmostra({...base,cargaCssPronta:false,recursosLocaisFalhos:1}), ['css_nao_pronto','recurso_local_falhou']);
  assert.deepEqual(validarAmostra({...base,mainPronto:false,errosDePagina:1}), ['conteudo_nao_pronto','erro_javascript']);
});

test('timeout invalida mesmo uma tela pronta com tempos rápidos', () => {
  assert.deepEqual(validarAmostra({...base, timeout:true}), ['timeout']);
  assert.deepEqual(validarAmostra({...base, erroColeta:{fase:'fontes_e_recursos'}}), ['erro_de_coleta']);
  assert.deepEqual(validarAmostra({...base, erroTrace:{nome:'Error'}}), ['erro_de_trace']);
});

test('fonte falha ou requisição local pendente impede amostra válida', () => {
  assert.deepEqual(validarAmostra({...base, recursosLocaisFalhos:1, fontesFalhas:1}), ['recurso_local_falhou','fonte_falhou']);
  assert.deepEqual(validarAmostra({...base, recursosLocaisPendentes:1, fontesProntas:false}), ['recurso_local_pendente','fontes_nao_prontas']);
  assert.deepEqual(validarAmostra({...base, recursosLocaisPendentes:undefined, fontesFalhas:undefined}),
    ['diagnostico_de_rede_ausente','diagnostico_de_fontes_ausente']);
});

test('métricas obrigatórias ausentes não entram no denominador silenciosamente', () => {
  assert.deepEqual(validarAmostra({...base, fcpMs:null, lcpMs:NaN, domContentLoadedMs:0, prontidaoNavegacaoMs:null}),
    ['prontidao_de_navegacao_ausente','fcpMs_ausente','lcpMs_ausente','domContentLoadedMs_ausente']);
});

test('longtasks usam o instante da prontidão relativo à navegação, não a duração da casca', () => {
  const a = {...base, prontidaoMs:1000, prontidaoNavegacaoMs:2000};
  assert.equal(bloqueioLongTasks([{inicio:1500,duracao:200}], a.fcpMs, a.prontidaoNavegacaoMs), 150);
  assert.equal(bloqueioLongTasks([{inicio:1500,duracao:200}], a.fcpMs, a.prontidaoMs), 0);
});

test('resumo separa amostras invalidadas de medidas válidas', () => {
  const {resumo,amostras}=resumoAmostras([
    {...base,prontidaoMs:4000,fcpMs:500,lcpMs:3800,bloqueioLongTasksMs:100},
    {...base,prontidaoMs:6000,fcpMs:600,lcpMs:5200,bloqueioLongTasksMs:200},
    {...base,prontidaoMs:1,fcpMs:1,lcpMs:1,recursosLocaisFalhos:1},
    {...base,prontidaoMs:1,fcpMs:1,lcpMs:1,timeout:true}
  ]);
  assert.equal(resumo.total, 4);
  assert.equal(resumo.validas, 2);
  assert.equal(resumo.invalidas, 2);
  assert.equal(resumo.medianasMs.prontidaoMs, 5000);
  assert.equal(resumo.medianasMs.fcpMs, 550);
  assert.equal(resumo.denominadores.fcpMs, 2);
  assert.deepEqual(amostras[2].falhas, ['recurso_local_falhou']);
  assert.deepEqual(amostras[3].falhas, ['timeout']);
});

test('capacidade de longtask indisponível mantém null e expõe denominador zero', () => {
  const {resumo} = resumoAmostras([{...base,bloqueioLongTasksMs:null}]);
  assert.equal(resumo.validas, 1);
  assert.equal(resumo.medianasMs.bloqueioLongTasksMs, null);
  assert.equal(resumo.denominadores.bloqueioLongTasksMs, 0);
});
