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
  if (a && a.cargaCssEsperada && !a.cargaCssPronta) falhas.push('css_nao_pronto');
  if (a && a.errosDePagina > 0) falhas.push('erro_javascript');
  if (a && a.recursosLocaisFalhos > 0) falhas.push('recurso_local_falhou');
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
  for (const chave of ['prontidaoMs','fcpMs','lcpMs','domContentLoadedMs','bloqueioLongTasksMs']) {
    resumo.medianasMs[chave] = mediana(boas.map(a => a[chave]));
  }
  return { resumo, amostras: validadas };
}
