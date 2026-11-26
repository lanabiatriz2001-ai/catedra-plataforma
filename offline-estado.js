/* ==========================================================================
   offline-estado.js — o cartão "Uso sem internet" de Ajustes › Dados (25/11/2026).

   POR QUE EXISTE: o worker (sw.js) já guarda o acervo e já sabe dizer quanto dele está
   no aparelho (mensagem ctEstadoOffline), e o build do site já dá ao host a ponte
   window.__catedraOffline { estado(), baixar() }. Nada disso aparecia na tela: a única
   pista de "sem internet" era o selo da sincronização. Este módulo decide, sem
   navegador, o que o cartão diz — e diz diferente em cada lugar onde o app roda:

     · site publicado (https fora de localhost — a mesma condição do sw.js e do registro
       do worker na página): os números vêm do service worker;
     · desenvolvimento (localhost, http, arquivo aberto direto): o worker se AUTODESTRÓI
       de propósito (sw.js), então nada fica guardado — o cartão diz isso, em vez de "0 de 40";
     · app nativo (Mac/iPad, WKWebView em file://): não há service worker; o acervo vem
       dentro do aplicativo, e a versão que importa é a do build (window.CATEDRA_BUILD).

   Regras:
     1. NÚMERO SÓ DO WORKER. "Completo" e "k de N" saem do estado que o worker devolveu;
        sem resposta, o cartão diz que não houve resposta — nunca chuta.
     2. SÓ PROMETE O QUE O WORKER MEDE. A conta é de ARQUIVOS das listas do sw.js (nem
        tudo nelas é acervo: há satélites, CSS, PDF.js). "Completo" não quer dizer "tudo
        abre sem internet": o texto das leis no LEGIS (proxy /api/law), o dos verbetes do
        JURIS (dados/juris-text/) e a Central de Contas ficam fora das listas e só ficam
        guardados quando abertos com internet. Os pesados (sob pedido) ficam fora do
        download automático, e o "Parcial" cita só as telas que a ÁREA DE ESTUDO abre e
        que carregam um deles (as capacidades de area-registry.js, ver dependentesDosPesados):
        na OAB, em Militar e em Outra, nenhuma.
     3. FALHA TEM NOME. Cada jeito de a ponte falhar vira uma frase própria, sem jargão.
     4. O "BAIXAR" PRESTA CONTAS. O fim diz quantos desceram, quantos falharam e quantos o
        orçamento de espaço do aparelho deixou de fora (o campo `cortados` do worker) — tudo
        conferido com a releitura do estado feita depois do fim, que é a palavra final.

   Publica window.CT_OFFLINE_ESTADO = { contexto, montar, fimDoBaixar, motivoDoErro,
   motivoDoRegistro, comPrazo, rotuloBuild, capacidadesDaArea, dependentesDosPesados, mb, hora,
   ESPERA_ESTADO_MS, ESPERA_BAIXAR_MS, INTERVALO_PROGRESSO_MS }.
   ========================================================================== */
(function () {
  // A ponte espera o worker 20 s, mas só DEPOIS do navigator.serviceWorker.ready — que
  // nunca resolve quando o registro falhou. Sem prazo próprio, o cartão ficaria em
  // "lendo" para sempre.
  var ESPERA_ESTADO_MS = 25000;
  // A ponte dá 6 min ao download (Chrome e Firefox encerram o evento do worker aos 5);
  // este prazo do host é só a rede de segurança acima do dela.
  var ESPERA_BAIXAR_MS = 390000;
  // Durante o download o cartão relê o estado do worker neste intervalo: o progresso é o
  // que já está guardado de verdade, não uma barra que anda sozinha.
  var INTERVALO_PROGRESSO_MS = 3000;

  // tom do selo: 'ok' (situação boa), 'aviso' (falta algo que pesa) ou '' (neutro). A cor
  // sai da tinta de situação do host (texto puxado para --ink), não da cor de destaque: o
  // .ct-selo-hoje pinta --accentD sobre --accentSoft e cai abaixo de 4,5:1 no escuro com
  // a maioria das cores que ela pode escolher.
  var CLASSE = { ok: 'ct-selo ct-selo-hoje', aviso: 'ct-selo ct-selo-aviso', '': 'ct-selo' };

  // Por que a leitura do estado falhou: [linha curta, explicação]
  var SEM_RESPOSTA = {
    'sem-sw': ['O modo sem internet não está disponível neste navegador', 'Em janela privada, ou com o recurso desligado, o app não fica guardado para uso sem internet.'],
    'inativo': ['O modo sem internet ainda está sendo instalado', 'Leva alguns segundos com internet. O cartão se atualiza quando terminar; se demorar, toque em “Ler de novo”.'],
    'tempo': ['O modo sem internet não respondeu a tempo', 'Toque em “Ler de novo”.'],
    'sem-estado': ['O modo sem internet não disse o que está guardado', 'Ele respondeu, mas sem o estado do acervo. Toque em “Ler de novo”.'],
    'erro': ['Não deu para ler o estado agora', 'Toque em “Ler de novo”.']
  };
  // O mesmo motivo, dito no fim de um "Baixar" que nem começou
  var NAO_BAIXOU = {
    'sem-sw': 'este navegador não oferece o modo sem internet aqui',
    'inativo': 'o modo sem internet ainda está sendo instalado',
    'sem-estado': 'o modo sem internet não respondeu direito',
    'erro': 'o navegador recusou o pedido'
  };
  // O que o "Completo" NÃO cobre: fica fora das listas do worker (sw.js e scripts/build.mjs)
  var FORA_DA_CONTA = 'Isso não inclui o texto das leis no LEGIS, o dos verbetes do JURIS nem a Central de Contas, '
    + 'que vão sendo guardados conforme você os abre com internet; e a IA sempre pede conexão.';

  /** Onde o app está rodando. amb = { protocolo, host, alvo } — location + CATEDRA_BUILD. */
  function contexto(amb) {
    var a = amb || {};
    var alvo = String(a.alvo || ''), p = String(a.protocolo || ''), h = String(a.host || '');
    // O build nativo carimba o alvo (scripts/build-macos.mjs: macOS ou iPadOS); o do site, 'web'.
    if (alvo && alvo !== 'web') return 'nativo';
    // A condição de produção do sw.js (IS_PROD) e do registro na página (ctProd): fora dela
    // o worker não opera, e prometer offline seria mentira.
    if (p === 'https:' && h !== 'localhost' && h !== '127.0.0.1' && h !== '') return 'site';
    return 'dev';
  }

  /** O mesmo texto do "Versão e suporte" (buildLabel, no render do host). */
  function rotuloBuild(b) {
    return b ? ('versão ' + b.versao + ' · ' + b.alvo) : 'versão de desenvolvimento';
  }

  function numMB(bytes) {
    var v = Math.max(0, +bytes || 0) / 1048576;
    if (v === 0) return '0';
    if (v < 0.05) return '< 0,1';   // poucos KB não viram "0,0"
    return v.toFixed(1).replace('.', ',');
  }
  function mb(bytes) { return numMB(bytes) + ' MB'; }

  function dois(n) { return (n < 10 ? '0' : '') + n; }
  /** "às 14:32" no mesmo dia; "em 24/11 às 14:32" em outro. Hora local do aparelho. */
  function hora(ts, agora) {
    if (!ts) return '';
    var d = new Date(ts), h = new Date(agora || ts);
    var hm = dois(d.getHours()) + ':' + dois(d.getMinutes());
    var mesmoDia = d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
    return mesmoDia ? ('às ' + hm) : ('em ' + dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ' às ' + hm);
  }

  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  /** O erro da ponte (ou do prazo do host) vira um código. */
  function motivoDoErro(err) {
    if (err && err.ctMotivo) return String(err.ctMotivo);
    var m = String((err && err.message) || err || '');
    if (/sem service worker/i.test(m)) return 'sem-sw';
    if (/n[ãa]o ativo/i.test(m)) return 'inativo';
    if (/sem resposta|prazo/i.test(m)) return 'tempo';
    return 'erro';
  }

  /** O registro do worker (navigator.serviceWorker.getRegistration()) antes de perguntar.
      A ponte só pergunta depois do .ready, que só resolve com um worker ATIVO: na primeira
      visita, com ele ainda instalando, o cartão ficaria 25 s em "lendo" e diria "não
      respondeu a tempo". Instalando ou esperando, sem ativo: 'inativo'. Sem registro (ou
      sem a API), '' — a ponte decide. */
  function motivoDoRegistro(reg) {
    if (!reg || typeof reg !== 'object') return '';
    return (!reg.active && (reg.installing || reg.waiting)) ? 'inativo' : '';
  }

  /** A promessa, com prazo: passado o prazo, rejeita com ctMotivo 'tempo'. */
  function comPrazo(promessa, ms) {
    return new Promise(function (ok, falha) {
      var t = setTimeout(function () {
        var e = new Error('sem resposta no prazo'); e.ctMotivo = 'tempo'; falha(e);
      }, ms);
      Promise.resolve(promessa).then(function (v) { clearTimeout(t); ok(v); },
                                     function (e) { clearTimeout(t); falha(e); });
    });
  }

  /** O que dizer quando o "Baixar o acervo completo" termina. fim = { resultado, erro };
      faltam = quantos itens a releitura feita depois do fim ainda não achou no aparelho
      (null quando não houve releitura). A releitura é a palavra final: o worker conta o
      que tentou, ela conta o que ficou. */
  function fimDoBaixar(fim, faltam) {
    if (!fim) return null;
    var sabeFaltam = typeof faltam === 'number' && faltam >= 0;
    var completo = sabeFaltam && faltam === 0;
    if (fim.erro === 'tempo') {
      // o worker pode ter terminado sem a confirmação chegar até a página
      if (completo) return { tipo: 'ok', texto: 'O navegador não confirmou o fim do download, mas a releitura acha o acervo completo neste aparelho.' };
      return { tipo: 'aviso', texto: 'O navegador não confirmou o fim do download. O que já desceu fica guardado; toque em “Baixar o acervo completo” de novo para continuar de onde parou.' };
    }
    if (fim.erro) return { tipo: 'erro', texto: 'Não deu para baixar: ' + (NAO_BAIXOU[fim.erro] || NAO_BAIXOU.erro) + '.' };
    var res = fim.resultado;
    if (!res) return { tipo: 'erro', texto: 'O navegador não conseguiu baixar agora. Tente de novo com internet.' };
    if (res.pulado) {
      return { tipo: 'aviso', texto: 'Nada foi baixado desta vez' + (res.pulado === 'saveData' ? ' (economia de dados ligada).' : '.') };
    }
    var baixados = res.baixados | 0, ja = res.jaTinha | 0, falhas = res.falhas | 0, cortados = res.cortados | 0;
    var semMotivo = 0;
    if (sabeFaltam) {
      // Falha ou corte que a releitura acha guardado (o aquecimento automático ou a tela aberta
      // com internet trouxe) não "ficou de fora". E o plano do worker soma a lista inteira
      // contra o orçamento, inclusive o que já estava guardado: cortado guardado não conta.
      falhas = Math.min(falhas, faltam);
      cortados = Math.min(cortados, Math.max(0, faltam - falhas));
      semMotivo = Math.max(0, faltam - falhas - cortados);
    }
    if (!baixados && !ja && !falhas && !cortados && !semMotivo) {
      return { tipo: 'ok', texto: completo ? 'Nada a baixar: o acervo já estava todo guardado neste aparelho.'
        : 'Não havia nada para baixar nesta versão.' };
    }
    var partes = [];
    if (baixados) partes.push(plural(baixados, 'arquivo baixado', 'arquivos baixados') + ' agora');
    if (ja) partes.push(plural(ja, 'já estava guardado', 'já estavam guardados'));
    var texto = (baixados || !(falhas || cortados || semMotivo) ? 'Download terminado' : 'Nada desceu desta vez')
      + (partes.length ? ': ' + partes.join('; ') : '') + '.';
    var tipo = 'ok';
    if (falhas) {
      tipo = 'aviso';
      texto += ' ' + plural(falhas, 'arquivo não desceu', 'arquivos não desceram') + ' (a conexão caiu ou o servidor não respondeu): toque de novo para tentar só o que faltou.';
    }
    if (cortados) {
      // O worker corta pelo orçamento (sw.js): o menor entre o teto do pedido (ORCAMENTO_PEDIDO,
      // 42 MB) e uma fração do espaço livre que o navegador dá ao app (FOLGA_COTA), porque cota
      // cheia faz o navegador apagar tudo. A lista inteira mede ~39 MB no build de 25/11/2026,
      // abaixo do teto: hoje quem corta é o espaço livre do aparelho.
      tipo = 'aviso';
      texto += ' ' + (cortados === 1 ? 'Ficou' : 'Ficaram') + ' de fora ' + plural(cortados, 'arquivo', 'arquivos')
        + ' para não encher o espaço que o navegador dá ao app neste aparelho (cheio, ele apagaria o que já está guardado). Liberar espaço no aparelho pode ajudar.';
    }
    if (semMotivo) {
      tipo = 'aviso';
      texto += ' Ainda ' + (semMotivo === 1 ? 'falta 1 arquivo' : ('faltam ' + semMotivo + ' arquivos')) + ' neste aparelho: toque de novo para tentar.';
    }
    // O cache é por versão publicada (sw.js): numa versão nova, só a parte automática volta sozinha.
    if (tipo === 'ok' && baixados) texto += ' Numa versão nova do app, os arquivos pesados precisam ser baixados de novo.';
    return { tipo: tipo, texto: texto };
  }

  function situacao(r, cod, selo, tom, linha, detalhe) {
    r.acervoSituacao = cod; r.acervoSelo = selo; r.acervoTom = tom || '';
    r.acervoClasse = CLASSE[r.acervoTom] || CLASSE[''];
    r.acervoLinha = linha; r.acervoDetalhe = detalhe || '';
  }
  function fechar(r) {
    r.temDetalhe = !!r.acervoDetalhe;
    r.temAviso = !!r.aviso;
    r.temAcoes = r.mostrarBaixar || r.podeReler;
    return r;
  }

  // As capacidades da área (area-registry.js) que decidem que telas carregam um pesado
  var CAPS = ['bancoDeQuestoes', 'provaOral', 'jurisprudencia', 'provaOralBancas', 'redacaoDiscursiva'];
  /** As capacidades da área, perguntadas ao registro das áreas (window.CT_AREA_REG). Sem área
      escolhida vale a jurídica, como no host (areaEstudo || 'juridica'). Sem o registro, null:
      o cartão não afirma nada sobre as telas. */
  function capacidadesDaArea(reg, area) {
    if (!reg || typeof reg.tem !== 'function') return null;
    var id = area ? String(area) : 'juridica', c = {};
    for (var i = 0; i < CAPS.length; i++) {
      try { c[CAPS[i]] = !!reg.tem(id, CAPS[i]); } catch (_) { c[CAPS[i]] = false; }
    }
    return c;
  }

  function juntar(l) { return l.length < 2 ? (l[0] || '') : (l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]); }

  /** As telas que a área abre e que carregam um arquivo pesado (sob pedido), falhando sem ele,
      e se as leis da área estão entre os pesados. Quem carrega o quê:
        juris-text.js — o Simulado misto e a aba Jurisprudência da Prova oral, onde a área tem
          jurisprudência (treino.js: acervoJuris);
        leis-seca-areas.js — fora da área jurídica, o Simulado misto e a aba Lei seca da Prova
          oral juntam as leis da área (treino.js: acervoLeisArea; na jurídica ele não carrega nada);
        oral-conteudo.js — a aba Bancas reais da Prova oral;
        discursivas-textos.js e PDF.js — o texto completo das provas e a importação do espelho
          em PDF, na Fase Discursiva.
      O Modo ENAM e a aba Lei seca da área jurídica usam só a parte automática. Na OAB o
      simulado é o registro do Exame; em Militar e em Outra nem o simulado nem a Prova oral abrem. */
  function dependentesDosPesados(caps, area) {
    var c = caps || {}, juridica = !area || area === 'juridica', telas = [], abas = [];
    if (c.bancoDeQuestoes && (c.jurisprudencia || !juridica)) telas.push('o Simulado misto');
    if (c.provaOral) {
      // fora da jurídica a aba Lei seca também pesa: a Prova oral inteira depende deles
      if (!juridica) telas.push('a Prova oral');
      else {
        if (c.jurisprudencia) abas.push('Jurisprudência');
        if (c.provaOralBancas) abas.push('Bancas reais');
        if (abas.length) telas.push((abas.length > 1 ? 'as abas ' : 'a aba ') + juntar(abas) + ' da Prova oral');
      }
    }
    if (c.redacaoDiscursiva) telas.push('o texto completo das provas da Fase Discursiva', 'a importação de PDF');
    return { telas: telas, leisDaArea: !juridica && !!(c.bancoDeQuestoes || c.provaOral) };
  }

  /** O que falta, quando o estado do worker diz que o acervo está pela metade. */
  function detalheParcial(est, caps, area) {
    var auto = (est.auto && typeof est.auto === 'object') ? est.auto : null;
    var autoTotal = auto ? Math.max(0, auto.total | 0) : 0;
    var autoPronto = !!(auto && autoTotal > 0 && (auto.prontos | 0) >= autoTotal);
    var falta = mb(Math.max(0, (+est.totalBytes || 0) - (+est.bytes || 0)));
    if (!autoPronto) {
      return { tom: 'aviso', texto: (auto ? 'Parte do que o app guarda sozinho ainda não está neste aparelho. ' : '')
        + 'Faltam ' + falta + ' no total; o botão abaixo tenta baixar tudo.' };
    }
    var d = caps ? dependentesDosPesados(caps, area) : null;
    // As leis da área entre os pesados: o simulado e a Prova oral dela param sem eles — aviso.
    if (d && d.leisDaArea) {
      return { tom: 'aviso', texto: 'O que o app guarda sozinho já está aqui, mas as leis da sua área estão entre os arquivos pesados, '
        + 'fora do download automático (faltam ' + falta + '): deles dependem, sem internet, ' + juntar(d.telas) + '.' };
    }
    // Faltar só os pesados (fora do download automático) é o estado de quem não pediu: neutro.
    var texto = 'O que o app guarda sozinho já está aqui. Faltam ' + falta + ' em arquivos pesados, fora do download automático';
    if (!d) return { tom: '', texto: texto + '.' };
    return { tom: '', texto: texto + (d.telas.length ? ': deles dependem, sem internet, ' + juntar(d.telas) + '.'
      : '; nenhuma tela da sua área de estudo depende deles.') };
  }

  /** Tudo o que o cartão mostra, a partir das entradas:
      { contexto, online, ponte, lendo, estado, erro, lidoEm, agora, baixando, fim, build, area,
        capacidades } — capacidades: as da área de estudo (capacidadesDaArea), que o host pede ao
        registro das áreas; o worker não sabe a área. */
  function montar(e) {
    var x = e || {};
    var ctx = (x.contexto === 'site' || x.contexto === 'nativo') ? x.contexto : 'dev';
    var online = x.online !== false;
    var r = {
      contexto: ctx,
      conexaoSelo: online ? 'Online' : 'Offline',
      // "Offline é a condição normal, não o modo degradado" (PRODUCT.md): o selo fica neutro.
      // Quando faltar acervo, o alerta é do selo do acervo, não da conexão.
      conexaoTom: online ? 'ok' : '',
      conexaoClasse: online ? CLASSE.ok : CLASSE[''],
      conexaoTexto: online ? 'Com internet agora.' : 'Sem internet agora.',
      acervoSituacao: '', acervoSelo: '', acervoTom: '', acervoClasse: CLASSE[''], acervoLinha: '', acervoDetalhe: '', temDetalhe: false,
      versaoRotulo: 'Versão do cache', versaoValor: '',
      lido: '', lidoRotulo: 'Estado lido', temLido: false, nota: '',
      // ícone: ocupado, o giro do aria-busy toma o lugar dele (dois ícones no botão confundem)
      mostrarBaixar: false, bloqueiaBaixar: true, baixandoAttr: 'false', botaoBaixar: 'Baixar o acervo completo', iconeBaixar: true,
      podeReler: false, relendoAttr: 'false', iconeReler: true,
      aviso: '', avisoTipo: '', temAviso: false, temAcoes: false
    };

    if (ctx === 'nativo') {
      // O carimbo diz macOS ou iPadOS, mas o mesmo bundle roda no iPhone e no Windows: o
      // nome do aparelho ficaria errado lá. "App instalado" vale para todos.
      r.nota = 'No app instalado, o acervo vem embutido no aplicativo.';
      situacao(r, 'embutido', 'Embutido', 'ok', 'Dentro do aplicativo', 'Não há o que baixar. A IA e a sincronização continuam pedindo internet.');
      r.versaoRotulo = 'Versão do app';
      r.versaoValor = rotuloBuild(x.build);
      if (!online) r.conexaoTexto = 'Sem internet agora — o acervo embutido continua abrindo.';
      return fechar(r);
    }

    if (ctx === 'dev') {
      r.nota = 'O modo sem internet só funciona no site publicado.';
      situacao(r, 'desligado', 'Desligado', '', 'Nada guardado neste endereço',
        'Fora do site publicado (localhost, arquivo aberto direto), a parte do app que guarda o acervo se desliga sozinha, para não servir arquivo velho.');
      r.versaoValor = 'nenhuma';   // o porquê já está no detalhe do acervo; aqui é dado, em mono
      return fechar(r);
    }

    // site publicado
    r.nota = 'O que este aparelho já guardou para o app abrir sem internet.';
    r.versaoValor = '—';   // só o worker sabe a versão do cache; sem resposta dele, não há o que mostrar
    var est = (x.estado && typeof x.estado === 'object') ? x.estado : null;
    r.podeReler = !!x.ponte;
    r.relendoAttr = (x.lendo && !x.baixando) ? 'true' : 'false';
    r.iconeReler = r.relendoAttr !== 'true';
    if (!x.ponte) {
      situacao(r, 'sem-ponte', 'Sem dados', '', 'Sem dados do modo sem internet', 'Esta página não trouxe a ligação com o modo sem internet.');
    } else if (!est && x.erro === 'inativo') {
      situacao(r, 'instalando', 'Instalando', '', SEM_RESPOSTA.inativo[0], SEM_RESPOSTA.inativo[1]);
    } else if (!est && x.erro) {
      var sr = SEM_RESPOSTA[x.erro] || SEM_RESPOSTA.erro;
      situacao(r, 'sem-resposta', 'Sem resposta', '', sr[0], sr[1]);
    } else if (!est) {
      situacao(r, 'lendo', 'Lendo', '', 'Perguntando ao navegador o que está guardado…', '');
    } else {
      var total = Math.max(0, est.total | 0), prontos = Math.max(0, Math.min(total, est.prontos | 0));
      r.versaoValor = String(est.versao || '—');
      if (!total) {
        situacao(r, 'sem-lista', 'Sem lista', '', 'Sem lista do acervo', 'Esta versão do app não informa o que guardar.');
      } else if (prontos >= total) {
        situacao(r, 'completo', 'Completo', 'ok', plural(total, 'arquivo', 'arquivos') + ' · ' + mb(est.totalBytes),
          (total === 1 ? 'O único arquivo desta versão está neste aparelho. ' : ('Os ' + total + ' arquivos desta versão estão neste aparelho. ')) + FORA_DA_CONTA);
      } else {
        var caps = (x.capacidades && typeof x.capacidades === 'object') ? x.capacidades : null;
        var p = detalheParcial(est, caps, x.area ? String(x.area) : '');
        situacao(r, 'parcial', 'Parcial', p.tom,
          prontos + ' de ' + plural(total, 'arquivo', 'arquivos') + ' · ' + numMB(est.bytes) + ' de ' + mb(est.totalBytes), p.texto);
        r.mostrarBaixar = true;
        r.bloqueiaBaixar = !online;
        if (!online && !x.baixando) r.acervoDetalhe += ' Para baixar, conecte-se à internet.';
      }
    }
    if (x.lidoEm) {
      r.lido = hora(x.lidoEm, x.agora); r.temLido = !!r.lido;
      // sem estado, o horário é o da tentativa que falhou — não o de uma leitura
      r.lidoRotulo = est ? 'Estado lido' : 'Última tentativa';
    }
    if (!online) {
      r.conexaoTexto = r.acervoSituacao === 'completo' ? 'Sem internet agora — o acervo guardado neste aparelho continua abrindo.'
        : r.acervoSituacao === 'parcial' ? 'Sem internet agora — abre o que já está guardado; o resto espera a conexão voltar.'
        : 'Sem internet agora.';
    }
    // O aviso de um download feito sobre OUTRA versão do cache (saiu versão nova depois)
    // não fala mais do que está no aparelho.
    var fim = x.fim || null;
    if (fim && fim.versao && est && est.versao && String(fim.versao) !== String(est.versao)) fim = null;
    if (x.baixando) {
      r.mostrarBaixar = true; r.bloqueiaBaixar = true; r.baixandoAttr = 'true'; r.botaoBaixar = 'Baixando…'; r.iconeBaixar = false;
      r.aviso = 'Baixando o acervo. Pode levar alguns minutos, e dá para continuar usando o app: a contagem acima sobe conforme os arquivos chegam.';
      r.avisoTipo = 'info';
    } else if (fim) {
      // o host só mostra o fim depois de reler o estado: é ele que diz o que ainda falta
      var faltam = (est && (est.total | 0) > 0) ? Math.max(0, (est.total | 0) - (est.prontos | 0)) : null;
      var f = fimDoBaixar(fim, faltam);
      if (f) { r.aviso = f.texto; r.avisoTipo = f.tipo; }
    }
    return fechar(r);
  }

  window.CT_OFFLINE_ESTADO = {
    contexto: contexto, montar: montar, fimDoBaixar: fimDoBaixar, motivoDoErro: motivoDoErro,
    motivoDoRegistro: motivoDoRegistro, comPrazo: comPrazo, rotuloBuild: rotuloBuild,
    capacidadesDaArea: capacidadesDaArea, dependentesDosPesados: dependentesDosPesados, mb: mb, hora: hora,
    ESPERA_ESTADO_MS: ESPERA_ESTADO_MS, ESPERA_BAIXAR_MS: ESPERA_BAIXAR_MS, INTERVALO_PROGRESSO_MS: INTERVALO_PROGRESSO_MS
  };
})();
