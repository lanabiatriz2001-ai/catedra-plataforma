// Funções puras para a medição controlada da abertura do Cátedra.
// Aceitam apenas tempos, contagens e caminhos relativos: nunca conteúdo de estudo.
export function mediana(valores) {
  const validos = valores.filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (!validos.length) return null;
  const meio = Math.floor(validos.length / 2);
  return validos.length % 2 ? validos[meio] : (validos[meio - 1] + validos[meio]) / 2;
}

export function bloqueioLongTasks(tarefas, inicio, fim) {
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) return null;
  return Math.round(tarefas.reduce((total, t) => {
    if (!Number.isFinite(t.inicio) || !Number.isFinite(t.duracao) || t.duracao < 0) return total;
    const intersecao = Math.max(0, Math.min(fim, t.inicio + t.duracao) - Math.max(inicio, t.inicio));
    return total + Math.max(0, intersecao - 50);
  }, 0));
}

export function validarAmostra(a) {
  const falhas = [];
  if (!a || !a.mainPronto || a.casCaPresente) falhas.push('conteudo_nao_pronto');
  if (!a || !Number.isFinite(a.prontidaoMs) || a.prontidaoMs < 0) falhas.push('tempo_de_prontidao_ausente');
  if (!a || !Number.isFinite(a.prontidaoNavegacaoMs) || a.prontidaoNavegacaoMs < 0) falhas.push('prontidao_de_navegacao_ausente');
  for (const chave of ['fcpMs', 'lcpMs', 'domContentLoadedMs']) {
    if (!a || !Number.isFinite(a[chave]) || a[chave] <= 0) falhas.push(chave + '_ausente');
  }
  if (a && a.timeout) falhas.push('timeout');
  if (a && a.erroColeta) falhas.push('erro_de_coleta');
  if (a && a.erroTrace) falhas.push('erro_de_trace');
  if (a && a.cargaCssEsperada && !a.cargaCssPronta) falhas.push('css_nao_pronto');
  if (a && a.errosDePagina > 0) falhas.push('erro_javascript');
  if (!a || !['recursosLocaisFalhos', 'recursosLocaisPendentes'].every(k => Number.isInteger(a[k]) && a[k] >= 0)) falhas.push('diagnostico_de_rede_ausente');
  if (a && a.recursosLocaisFalhos > 0) falhas.push('recurso_local_falhou');
  if (a && a.recursosLocaisPendentes > 0) falhas.push('recurso_local_pendente');
  if (!a || a.fontesProntas !== true) falhas.push('fontes_nao_prontas');
  if (!a || !Number.isInteger(a.fontesFalhas) || a.fontesFalhas < 0) falhas.push('diagnostico_de_fontes_ausente');
  if (a && a.fontesFalhas > 0) falhas.push('fonte_falhou');
  return [...new Set(falhas)];
}

export function resumoAmostras(amostras) {
  const validadas = amostras.map(a => ({ ...a, falhas: validarAmostra(a) }));
  const boas = validadas.filter(a => !a.falhas.length);
  const resumo = {
    total: validadas.length,
    validas: boas.length,
    invalidas: validadas.length - boas.length,
    medianasMs: {}
  };
  const denominadores = resumo.denominadores = {};
  for (const chave of ['prontidaoMs','prontidaoNavegacaoMs','fcpMs','lcpMs','domContentLoadedMs','bloqueioLongTasksMs']) {
    resumo.medianasMs[chave] = mediana(boas.map(a => a[chave]));
    denominadores[chave] = boas.filter(a => Number.isFinite(a[chave]) && a[chave] >= 0).length;
  }
  return { resumo, amostras: validadas };
}
