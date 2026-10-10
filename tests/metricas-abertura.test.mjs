import test from 'node:test';
import assert from 'node:assert/strict';
import { mediana, bloqueioLongTasks, validarAmostra, resumoAmostras } from './metricas-abertura.mjs';

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
  const base={mainPronto:true,casCaPresente:false,prontidaoMs:3000,cargaCssEsperada:true,cargaCssPronta:true,errosDePagina:0,recursosLocaisFalhos:0};
  assert.deepEqual(validarAmostra(base), []);
  assert.deepEqual(validarAmostra({...base,cargaCssPronta:false,recursosLocaisFalhos:1}), ['css_nao_pronto','recurso_local_falhou']);
  assert.deepEqual(validarAmostra({...base,mainPronto:false,errosDePagina:1}), ['conteudo_nao_pronto','erro_javascript']);
});

test('resumo separa amostras invalidadas de medidas válidas', () => {
  const ok={mainPronto:true,casCaPresente:false,cargaCssEsperada:true,cargaCssPronta:true,errosDePagina:0,recursosLocaisFalhos:0};
  const {resumo,amostras}=resumoAmostras([
    {...ok,prontidaoMs:4000,fcpMs:500,lcpMs:3800,bloqueioLongTasksMs:100},
    {...ok,prontidaoMs:6000,fcpMs:600,lcpMs:5200,bloqueioLongTasksMs:200},
    {...ok,prontidaoMs:1,fcpMs:1,lcpMs:1,recursosLocaisFalhos:1}
  ]);
  assert.equal(resumo.total, 3);
  assert.equal(resumo.validas, 2);
  assert.equal(resumo.invalidas, 1);
  assert.equal(resumo.medianasMs.prontidaoMs, 5000);
  assert.equal(resumo.medianasMs.fcpMs, 550);
  assert.deepEqual(amostras[2].falhas, ['recurso_local_falhou']);
});
