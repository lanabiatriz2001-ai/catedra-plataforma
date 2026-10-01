// tests/sentinela.mjs — régua do vigia das fontes oficiais.
//
// Cada caso aqui nasceu de um erro MEDIDO em 15/09/2026, rodando o sentinela contra o
// Planalto, o STF e o STJ de verdade. Não são hipóteses: são os quatro jeitos pelos quais
// este vigia já anunciou novidade jurídica que não existia, mais os dois jeitos pelos
// quais ele poderia esconder que falhou.
//
// Sem rede: as fixtures são recortes do texto real das fontes. Assim a suíte roda em
// qualquer lugar, e uma quebra aponta o parser, não a conexão. O único caso que toca a
// rede é o S11 (validade do certificado) e ele se cala quando está offline.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  COBERTURA, carimbar, classificarVigencia, compararArtigos, modificadorasDaDiferenca, pareceInformativo,
} from '../scripts/sentinela.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function testarSentinela(ok) {
  // ── S1 — o básico: inclusão, alteração e revogação de dispositivo ──────────
  {
    const antes = [{ rot: 'Art. 1º', txt: 'Art. 1º O texto velho.' }, { rot: 'Art. 2º', txt: 'Art. 2º Some.' }];
    const depois = [{ rot: 'Art. 1º', txt: 'Art. 1º O texto novo.' }, { rot: 'Art. 3º', txt: 'Art. 3º Chegou agora.' }];
    const d = compararArtigos(antes, depois);
    const t = (x) => d.find((y) => y.tipo === x);
    ok(d.length === 3 && t('alteracao') && t('inclusao') && t('revogacao'),
      'S1 compararArtigos separa alteração, inclusão e revogação');
    ok(t('alteracao').antes === 'Art. 1º O texto velho.' && t('alteracao').depois === 'Art. 1º O texto novo.',
      'S1b a versão anterior é preservada no item — dá para comparar antes e depois');
    ok(t('revogacao').antes && t('revogacao').depois === null,
      'S1c revogação guarda o texto revogado, não o descarta');
  }

  // ── S2 — anotação de margem NÃO é alteração jurídica ───────────────────────
  // Caso real: o art. 77 da Lei 14.133 foi acusado de alteração porque a página ganhou
  // os rótulos de link "Regulamento" e "Vigência" soltos no meio do artigo.
  {
    const base = 'Art. 77. Para a venda de bens imóveis, será concedido direito de preferência. (Incluído pela Lei nº 15.266, de 2025) ';
    const antes = [{ rot: 'Art. 77', txt: base + 'Parágrafo único. Os procedimentos serão definidos em regulamento.' }];
    const depois = [{ rot: 'Art. 77', txt: base + 'Regulamento Vigência Parágrafo único. Os procedimentos serão definidos em regulamento.' }];
    ok(compararArtigos(antes, depois).length === 0,
      'S2 ganhar "Regulamento"/"Vigência" de margem não vira alteração jurídica');
    // Controle: a régua precisa ENXERGAR uma mudança de verdade no mesmo artigo.
    const real = [{ rot: 'Art. 77', txt: base + 'Parágrafo único. Os procedimentos serão definidos em LEI.' }];
    ok(compararArtigos(antes, real).length === 1,
      'S2b controle — mudança real de palavra no mesmo artigo continua sendo detectada');
  }

  // ── S3 — remissão em minúscula não vira artigo novo ────────────────────────
  // Caso real: "art. 927 da Lei nº 13.105" dentro de um dispositivo do CTN virou um
  // "art. 927" incluído no CTN — que tem 108 artigos.
  {
    const antes = [{ rot: 'Art. 151', txt: 'Art. 151. Suspendem a exigibilidade.' }];
    const depois = [
      { rot: 'Art. 151', txt: 'Art. 151. Suspendem a exigibilidade.' },
      { rot: 'art. 927', txt: 'art. 927 da Lei nº 13.105, de 16 de março de 2015 (Código de Processo Civil);' },
    ];
    ok(compararArtigos(antes, depois).length === 0,
      'S3 remissão com rótulo minúsculo ("art. 927 da Lei…") não vira dispositivo incluído');
    const real = [...antes, { rot: 'Art. 152', txt: 'Art. 152. Artigo de verdade, com cabeçalho em maiúscula.' }];
    ok(compararArtigos(antes, real).length === 1 && compararArtigos(antes, real)[0].tipo === 'inclusao',
      'S3b controle — artigo novo de verdade ("Art. 152") continua sendo detectado');
  }

  // ── S4 — artigo cortado no teto compara só o trecho comum, e avisa ─────────
  // O acervo guarda no máximo 4.000 caracteres por artigo. Num artigo no teto, ganhar
  // palavras no meio empurra a cauda para fora e as duas versões diferem sozinhas.
  {
    const enche = (n) => 'x'.repeat(n);
    const antes = [{ rot: 'Art. 5º', txt: 'Art. 5º ' + enche(3995) }];
    const depois = [{ rot: 'Art. 5º', txt: 'Art. 5º ' + enche(3995) + 'cauda diferente' }];
    const d = compararArtigos(antes, depois);
    ok(d.length === 0, 'S4 diferença só na cauda de artigo no teto de tamanho não vira alteração');
    const mudou = [{ rot: 'Art. 5º', txt: 'Art. 5º MUDOU ' + enche(3995) }];
    const d2 = compararArtigos(antes, mudou);
    ok(d2.length === 1 && d2[0].parcial === true,
      'S4b mudança no começo de artigo no teto é detectada E sai marcada como comparação parcial');
  }

  // ── S5/S6 — vigência: publicada ≠ em vigor ─────────────────────────────────
  {
    const hoje = new Date(2026, 8, 15);
    const futura = classificarVigencia('Art. 1º Nova regra. (Vigência) a partir de 01/01/2027', hoje);
    ok(futura.vigencia === 'aguardando' && futura.vigenciaEm === '01/01/2027',
      'S5 alteração com marcador de vigência e data futura fica "aguardando vigência"');
    const passada = classificarVigencia('Art. 1º Regra. (Vigência) desde 01/01/2020', hoje);
    ok(passada.vigencia === 'em-vigor', 'S5b marcador de vigência com data já alcançada fica em vigor');
    const semData = classificarVigencia('Art. 1º Regra nova. (Vigência)', hoje);
    ok(semData.vigencia === 'indeterminada',
      'S6 marcador de vigência SEM data não é declarado em vigor — fica indeterminado, para conferência');
    const limpo = classificarVigencia('Art. 1º Regra comum, sem marcador.', hoje);
    ok(limpo.vigencia === 'em-vigor', 'S6b texto compilado sem marcador de vigência é o texto em vigor');
  }

  // ── S6c — a norma modificadora é a anotação nova, não uma anotação antiga do artigo ──
  {
    const antes = 'Art. 4º Direito à convivência familiar. (Incluído pela Lei nº 15.240, de 2025)';
    const depois = 'Art. 4º Direito à natureza e à convivência familiar. (Redação dada pela Lei nº 15.512, de 2026) (Incluído pela Lei nº 15.240, de 2025)';
    const mods = modificadorasDaDiferenca(antes, depois);
    ok(mods.length === 1 && mods[0].norma === 'Lei nº 15.512, de 2026',
      'S6c modificadora da diferença aponta a lei nova, não a anotação antiga que já estava no artigo');
  }

  // ── S7 — o STJ responde 200 para edição que não existe ─────────────────────
  // Medido: a edição inexistente 7777 devolveu a MESMA página de 257 KB da 901, contendo
  // "PROCESSO" e "RAMO DO DIREITO" (que vêm do formulário). O vigia anunciou 15 edições
  // fantasmas. Só a página real traz a contagem de resultados e o cabeçalho em caixa alta.
  {
    const vazia = { status: 200, tam: 257391, texto: 'Informativo de Jurisprudência ... PROCESSO ... RAMO DO DIREITO ... Edição n. 5 Edição n. 4' };
    const real = { status: 200, tam: 349510, texto: 'EDIÇÃO N. 900 ... 20registros encontrados ... PROCESSO ... RAMO DO DIREITO' };
    ok(pareceInformativo('stj', vazia) === false,
      'S7 página de busca vazia do STJ (HTTP 200) NÃO é contada como edição nova');
    ok(pareceInformativo('stj', real) === true,
      'S7b controle — a página de uma edição real do STJ é reconhecida');
  }

  // ── S8 — o STF, ao contrário, devolve 404 limpo ────────────────────────────
  {
    ok(pareceInformativo('stf', { status: 404, tam: 0, texto: '' }) === false,
      'S8 edição inexistente do STF (404) não vira novidade');
    ok(pareceInformativo('stf', { status: 200, tam: 214838, texto: 'INFORMATIVO\r\nSTF  Brasília, 5 de setembro' }) === true,
      'S8b controle — edição real do STF é reconhecida');
    ok(pareceInformativo('stf', { status: 200, tam: 900, texto: 'INFORMATIVO STF' }) === false,
      'S8c página curta demais não é aceita como edição, mesmo com 200');
  }

  // ── S9 — falha NUNCA se disfarça de "sem novidade" ─────────────────────────
  // O coração do pedido: a última tentativa anda sempre; a última consulta BEM-SUCEDIDA
  // só anda quando deu certo.
  {
    const ontem = '2026-09-14T12:00:00.000Z';
    const hoje = '2026-09-15T12:00:00.000Z';
    const anterior = { ultimoSucesso: ontem, resultado: 'sem-novidade' };
    const falhou = carimbar('stf', anterior, { estado: 'falha', erro: 'fetch failed', itens: [] }, hoje);
    ok(falhou.resultado === 'falha' && falhou.erro === 'fetch failed',
      'S9 fonte que não respondeu fica com resultado "falha" e o erro por extenso');
    ok(falhou.ultimaTentativa === hoje && falhou.ultimoSucesso === ontem,
      'S9b falha move a última TENTATIVA mas preserva a última consulta BEM-SUCEDIDA');
    const vazio = carimbar('stf', anterior, { estado: 'sem-novidade', erro: null, itens: [] }, hoje);
    ok(vazio.resultado === 'sem-novidade' && vazio.ultimoSucesso === hoje,
      'S9c "nenhuma novidade" é resultado de SUCESSO e avança o carimbo — é outra coisa que falha');
    ok(falhou.resultado !== vazio.resultado,
      'S9d "não foi possível consultar" e "nenhuma novidade" nunca são o mesmo resultado');
    const semHistorico = carimbar('stj', {}, { estado: 'falha', erro: 'x', itens: [] }, hoje);
    ok(semHistorico.ultimoSucesso === null,
      'S9e fonte que nunca deu certo não ganha carimbo de sucesso nenhum');
  }

  // ── S10 — cobertura declarada e limites visíveis ───────────────────────────
  {
    const fontes = Object.keys(COBERTURA);
    ok(fontes.length === 3 && fontes.every((f) => COBERTURA[f].rotulo && COBERTURA[f].monitora),
      'S10 as três fontes declaram por extenso o que monitoram');
    ok(fontes.every((f) => Array.isArray(COBERTURA[f].limites) && COBERTURA[f].limites.length > 0),
      'S10b toda fonte declara ao menos um limite — nada de prometer cobertura integral');
    ok(/SCON/i.test(COBERTURA.stj.limites.join(' ')) && /BDJur|Revista de Súmulas/i.test(COBERTURA.stj.limites.join(' ')),
      'S10c o limite das súmulas do STJ distingue SCON bloqueado e BDJur ainda não integrado');
    ok(carimbar('stf', {}, { estado: 'sem-novidade', itens: [] }, 'x').limites.length > 0,
      'S10d os limites viajam no estado, para a tela poder mostrá-los');
  }

  // ── S11 — o acervo gerado existe e tem a forma que o app espera ────────────
  {
    const p = path.join(RAIZ, 'novidades.js');
    if (existsSync(p)) {
      const s = readFileSync(p, 'utf8');
      ok(/^\/\*/.test(s) && s.includes('window.CT_NOVIDADES = '),
        'S11 novidades.js expõe window.CT_NOVIDADES com o cabeçalho de arquivo gerado');
      const ctx = {};
      // eslint-disable-next-line no-new-func
      new Function('window', s)(ctx);
      const N = ctx.CT_NOVIDADES;
      ok(N && N.fontes && Array.isArray(N.itens), 'S11b novidades.js tem { geradoEm, fontes, itens }');
      const ids = N.itens.map((i) => i.id);
      ok(ids.length === new Set(ids).size,
        'S11c nenhum id repetido — automático e manual convergem no mesmo registro, não duplicam');
      ok(N.itens.every((i) => i.urlOficial && i.fonte && i.detectadoEm),
        'S11d todo item aponta a fonte oficial e a data em que foi detectado');
      ok(N.itens.every((i) => i.tipo !== 'alteracao' || (i.antes && i.depois)),
        'S11e toda alteração carrega antes E depois — a versão anterior nunca se perde');
      ok(!N.itens.some((i) => /^art[^A-Z]/.test(String(i.disp || ''))),
        'S11f nenhum item com rótulo minúsculo escapou para o acervo publicado');
    } else {
      ok(false, 'S11 novidades.js não existe — rode: node scripts/sentinela.mjs');
    }
  }

  // ── S12 — o certificado embutido do STF ainda serve ────────────────────────
  // O STF manda a cadeia TLS incompleta e o intermediário vai embutido no repositório.
  // Quando ele vencer, a consulta ao STF passa a falhar — melhor descobrir aqui.
  {
    const { CA_ALPHASSL_2025 } = await import('../scripts/lib/tls-fontes.mjs');
    const { X509Certificate } = await import('node:crypto');
    const c = new X509Certificate(CA_ALPHASSL_2025);
    const dias = Math.round((new Date(c.validTo) - Date.now()) / 86400000);
    ok(dias > 60,
      `S12 o intermediário embutido do STF ainda vale por ${dias} dias (troque antes de vencer — a receita está em scripts/lib/tls-fontes.mjs)`);
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const falhas = [];
  const ok = (c, l) => { console.log((c ? '  ok  ' : '  X   ') + l); if (!c) falhas.push(l); };
  await testarSentinela(ok);
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo verde');
  process.exit(falhas.length ? 1 : 0);
}
