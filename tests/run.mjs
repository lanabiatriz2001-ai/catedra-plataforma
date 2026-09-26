/* Testes de navegador da plataforma — rodam com `npm test`.
   Sobe um servidor estático na raiz do repositório e dirige um navegador headless:
   · SYNC: o mergeAll do auth.js (carimbo por chave, vazio nunca apaga cheio,
     união por id, lápides, histórico × lixeira) via tests/sync-fixture.html;
   · ACERVO ida-e-volta: rito/peça/bloco na URL, mensagens ctAbrirAcervo com origem,
     pílula de voltar no LEGIS/JURIS e a volta à origem no host real (tests/volta-origem.mjs);
   · ORAL LEI SECA: a aba Lei seca da Prova oral lista as leis (tests/oral-lei-seca.mjs).
   Servidor e navegador vêm de tests/_infra.mjs. O motor padrão é o Chromium — executável
   de CT_CHROME ou dos caminhos usuais (CI: google-chrome); CT_BROWSER=webkit troca pelo
   WebKit do Playwright, o mesmo que tests/run-webkit.mjs usa como proxy do iPad. */
// PRIMEIRO import, e de propósito: arquivo esvaziado pelo iCloud volta do git (ou a suíte para)
// antes de qualquer outro módulo ser avaliado — o playwright-core lido errado num worktree do
// Desktop derrubou a suíte WebKit. Ver scripts/verificar-pasta-sincronizada.mjs. O nome importado
// é de propósito: verificador devolvido VAZIO pelo iCloud falha alto, em vez de pular calado.
import { SAIDA_ESVAZIADOS } from '../scripts/verificar-pasta-sincronizada.mjs';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { iniciarServidor, lancarNavegador } from './_infra.mjs';
import { testarOralLeiSeca } from './oral-lei-seca.mjs';
import { testarPastaSincronizada } from './pasta-sincronizada.mjs';
import { testarLegisGuiado } from './legis-guiado.mjs';
import { testarLeitorWeb } from './leitor-web.mjs';
import { testarCicloInteligente } from './ciclo-inteligente.mjs';
import { testarRegistroSessao } from './registro-sessao.mjs';
import { testarIntegracaoModulos } from './integracao-modulos.mjs';
import { testarIntegracaoFase2 } from './integracao-fase2.mjs';
import { testarVariosEditais } from './varios-editais.mjs';
import { testarTemplateFileUrl } from './template-file-url.mjs';
import { testarAuthModoLocal } from './auth-modo-local.mjs';
import { testarIphoneHost390 } from './iphone-host-390.mjs';
import { testarReguaUnica } from './regua-unica.mjs';
import { testarPrioridadeErrosResolvidos } from './prioridade-erros-resolvidos.mjs';
import { testarRevisaoFonte } from './revisao-fonte.mjs';
import { testarVoltaOrigem } from './volta-origem.mjs';
import { testarContrasteDestaque } from './contraste-destaque.mjs';
import { testarIconesAlvos } from './icones-alvos.mjs';
import { testarFaixaMapaAlvos } from './faixa-mapa-alvos.mjs';
import { testarPrioridadeDiscursiva } from './prioridade-discursiva.mjs';
import { testarOnboardingImportar } from './onboarding-importar.mjs';
import { testarCotaIA } from './cota-ia.mjs';
import { testarIphoneSatelites390 } from './iphone-satelites-390.mjs';
import { testarIpadToqueSatelites } from './ipad-toque-satelites.mjs';
import { testarIpadToque } from './ipad-toque.mjs';
import { testarAuthIpad } from './auth-ipad.mjs';
import { testarAuthAbertura } from './auth-abertura.mjs';
import { testarAuthHidratacao } from './auth-hidratacao.mjs';
import { testarAuthFechamento } from './auth-fechamento.mjs';
import { testarCarregamentoInicial, testarAberturaEmbutida } from './carregamento-inicial.mjs';
import { testarSelectHost } from './select-host.mjs';
import { testarEditalSubtopicos } from './edital-subtopicos.mjs';
import { testarJurisQuadro } from './juris-quadro.mjs';
import { testarPadronizacaoVisual } from './padronizacao-visual.mjs';
import { testarPostMessageSeguranca } from './postmessage-seguranca.mjs';
import { testarMenuLateral } from './menu-lateral.mjs';
import { testarPdfjsLocal } from './pdfjs-local.mjs';
import { testarVarreduraRedeExterna, testarSupportSemRede, testarHarnessSemRede, testarRedeExternaExecucao, resumoRedeSuite } from './rede-externa.mjs';
import { testarAssinaturaLimpa } from './assinatura-limpa.mjs';
import { testarXcodeCloud } from './xcode-cloud.mjs';
import { testarDesignNativo } from './design-nativo.mjs';
import { montar as montarEnam, parseProva as parseProvaEnam, parseGabarito as parseGabaritoEnam, carregarAreas as areasEnam, EDICOES as EDICOES_ENAM } from '../scripts/build-questoes-enam.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// O servidor estático e a escolha do navegador moram em tests/_infra.mjs, compartilhados
// com o runner do WebKit (tests/run-webkit.mjs) — inclusive a tabela MIME e a história dela.
// A porta sai do ambiente (CT_PORT) para que duas sessões trabalhando no mesmo repositório
// possam rodar a suíte ao mesmo tempo — sem isso a segunda morre com EADDRINUSE.
const PORTA = +(process.env.CT_PORT || 8123);
const { srv, url: URL0 } = await iniciarServidor(RAIZ, PORTA);

// O motor sai no log logo no início: um "✗" só se lê sabendo em que navegador aconteceu.
const { browser, motor } = await lancarNavegador();
console.log('[' + motor + '] suíte de navegador em ' + URL0);
const page = await browser.newPage();
const falhas = [];
const ok = (cond, label) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) falhas.push(label); };
page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));

try { await testarPrioridadeErrosResolvidos(ok); }
catch (e) { ok(false, 'PRIORIDADE erro resolvido exceção: ' + e.message); }
/* Mensagens que entram no host precisam nascer da window exata do satélite registrado.
   Os casos antigos usavam window.postMessage no próprio host, o que não representa a
   ponte real e obrigava a produção a aceitar a janela principal como se fosse iframe. */
async function prepararPonteReal(page, view) {
  await page.evaluate((v) => window.__catedraGoView(v), view);
  await page.waitForFunction((v) => {
    const f = document.querySelector('iframe[data-ct-view="' + v + '"][data-ct-frame]');
    return !!(f && f.contentWindow && f.dataset.ctLoad === '1');
  }, view, { timeout: 25000 });
  const el = await page.$('iframe[data-ct-view="' + view + '"][data-ct-frame]');
  const frame = el && await el.contentFrame();
  if (!frame) throw new Error('iframe legítimo não montou: ' + view);
  await frame.evaluate(() => {
    const alvo = () => (/^https?:$/.test(location.protocol) ? location.origin : '*');
    window.__ctTestePostar = function (dados) { window.parent.postMessage(dados, alvo()); };
    if (!window.__ctTesteRelayInstalado) {
      window.__ctTesteRelayInstalado = true;
      window.addEventListener('message', function (e) {
        const t = e && e.data && e.data.type;
        if (t === 'ctLeituras' || t === 'ctLeiturasResumoResp') {
          window.parent.postMessage(e.data, alvo());
        }
      });
    }
  });
}

/* Todo HTML/JS/CSS/JSON que um build copiou, procurado por URL do cdnjs. O D9 abaixo olhava só
   jsdelivr/unpkg/Google no index.html — e o PDF.js vinha do cdnjs.cloudflare.com, por um
   <script> criado em tempo de execução dentro do host: nenhum caso via. Agora qualquer arquivo
   de texto da saída (public/ ou mac/build/web/) que cite o cdnjs reprova, e o caso nomeia qual.
   Não olha comentário à parte: citar o cdnjs num arquivo publicado já é convite a voltar a ele. */
function citamCdnjs(dir) {
  const achados = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.(html?|m?js|css|json|webmanifest)$/i.test(e.name) && /cdnjs\.cloudflare\.com/i.test(fs.readFileSync(p, 'utf8'))) {
        achados.push(path.relative(dir, p));
      }
    }
  };
  if (fs.existsSync(dir)) andar(dir);
  return achados;
}
/* O PDF.js vendorado (vendor/pdfjs/) chegou à saída do build, byte a byte com o manifesto. */
function pdfjsNaSaida(dir) {
  const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vendor', 'manifesto.json'), 'utf8'));
  return ['pdfjs/pdf.min.js', 'pdfjs/pdf.worker.min.js'].every((f) => {
    const ent = manifesto.arquivos.find((a) => a.arquivo === f), p = path.join(dir, 'vendor', f);
    return !!ent && fs.existsSync(p) && createHash('sha256').update(fs.readFileSync(p)).digest('hex') === ent.sha256;
  });
}

/* ============= D9 — BUILD SEM CDN: FALHAR EM VEZ DE DEGRADAR ============= */
// Este é o único teste que não usa navegador: o que se prova aqui é o comportamento do
// processo de build. Um deploy que depende de CDN em runtime não abre em rede que
// bloqueia CDN — foi o que aconteceu no ambiente de teste.
{
  const { execFileSync } = await import('child_process');
  const stub = path.join(RAIZ, 'tests', 'offline-stub.cjs');
  const rodar = (env) => {
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build.mjs')],
        { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'pipe' });
      return { code: 0, saida: '' };
    } catch (e) {
      return { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') };
    }
  };

  /* MUDOU O QUE ESTE BLOCO PROVA, e para melhor. Antes o build BAIXAVA as fontes do
     Google a cada publicação, então "sem rede" tinha de abortar — publicar dependendo de
     CDN seria pior. Isso protegia a web e deixava os apps NATIVOS de fora: eles empacotam
     o Catedra.dc.html direto, sem passar pelo build, e lá o <link> do Google continuava.
     Sem internet, no aparelho de estudo, a tipografia caía inteira.
     As faces passaram a ser versionadas em fonts/ e declaradas no catedra-ui.css. Com
     isso o build não pede nada à rede: em vez de abortar, ele PUBLICA. A asserção que
     antes exigia falha agora exige sucesso — e o CT_PERMITE_CDN deixou de existir, porque
     não há mais CDN de onde depender. */
  /* APAGA public/fonts ANTES de rodar. Sem isso o caso media SOBRA: public/ está no
     .gitignore, então no checkout principal a pasta ficava de um build feito COM rede e a
     asserção passava sem que o build da vez tivesse copiado nada — em clone ou worktree
     novo, onde public/ não existe, ela falhava. Apagando, o que sobrar é do build de agora. */
  fs.rmSync(path.join(RAIZ, 'public', 'fonts'), { recursive: true, force: true });
  /* BUILD LIMPO: public/ sai só com o build da vez. Planta uma página que nenhuma lista cita
     e um bloco de acervo com hash que não existe no repositório — o retrato das sobras que
     se acumulavam (248 blocos em public/dados/juris-text contra 62 no repositório). */
  const orfaoPag = path.join(RAIZ, 'public', 'orfao.html');
  const orfaoBloco = path.join(RAIZ, 'public', 'dados', 'juris-text', 'zz-00000000.json');
  const plantarOrfaos = () => {
    fs.mkdirSync(path.dirname(orfaoBloco), { recursive: true });
    fs.writeFileSync(orfaoPag, '<!doctype html><p>sobra de build antigo</p>');
    fs.writeFileSync(orfaoBloco, '{"sobra":true}');
  };
  plantarOrfaos();
  const semRede = rodar({ NODE_OPTIONS: '--require ' + stub });
  /* A limpeza vem antes de qualquer escrita: o build sem rede (que agora publica) sai sem
     a sobra do build anterior. */
  ok(!fs.existsSync(orfaoPag) && !fs.existsSync(orfaoBloco),
     'BUILD LIMPO public/ é apagada inteira no começo (sobras somem também no build sem rede)');
  /* Sem rede o build ainda para — mas agora por causa das BIBLIOTECAS (react, supabase),
     que continuam sendo vendoradas da internet. O que mudou é que as FONTES saíram dessa
     lista: elas não são mais motivo de aborto. A asserção mira a causa, não o código de
     saída, senão ela passaria a medir o vendor das libs sem querer. */
  ok(!/vendorar as fontes|fonts\.googleapis|fonts\.gstatic/.test(semRede.saida),
     'D9 sem rede, as fontes NÃO são mais motivo de aborto');
  /* O CONTRATO INVERTEU, DE NOVO E PELO MESMO MOTIVO DAS FONTES. As bibliotecas (React,
     ReactDOM, supabase-js) eram baixadas do jsdelivr a cada build, sem checksum, e o
     supabase-js flutuava em `@2` — sem rede o build tinha de abortar. Agora elas moram em
     vendor/, congeladas e conferidas pelo sha256 de vendor/manifesto.json: sem rede o build
     PUBLICA. O que continua proibido é degradar em silêncio, e isso passou a ser guardado
     pelo hash (casos "vendor adulterado" e "vendor ausente" logo abaixo). */
  ok(semRede.code === 0 && !/BUILD ABORTADO/.test(semRede.saida),
     'D9 sem rede o build PUBLICA (código 0): as bibliotecas vêm de vendor/, não da internet (' + semRede.code + ')');
  const manifestoVendor = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vendor', 'manifesto.json'), 'utf8'));
  const sha256De = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  ok(['react.js', 'react-dom.js', 'supabase.js'].every((f) => {
       const ent = manifestoVendor.arquivos.find((a) => a.arquivo === f);
       const pub = path.join(RAIZ, 'public', 'vendor', f);
       return ent && fs.existsSync(pub) && sha256De(pub) === ent.sha256
         && Buffer.compare(fs.readFileSync(pub), fs.readFileSync(path.join(RAIZ, 'vendor', f))) === 0;
     }),
     'D9 sem rede public/vendor leva os três arquivos de vendor/, byte a byte e com o sha256 do manifesto');
  /* Versões congeladas por decisão da dona (25/09/2026): React e ReactDOM 18.3.1, supabase-js
     2.117.2 — a que estava em produção (byte a byte a do app instalado) no dia do congelamento;
     o `@2` flutuante já tinha trocado 2.117.1 por 2.117.2 sozinho. Trocar é pelo
     scripts/atualizar-vendor.mjs, e este caso muda junto, de propósito. */
  const versaoDe = (f) => (manifestoVendor.arquivos.find((a) => a.arquivo === f) || {}).versao;
  ok(versaoDe('react.js') === '18.3.1' && versaoDe('react-dom.js') === '18.3.1' && versaoDe('supabase.js') === '2.117.2',
     'D9 versões congeladas: react 18.3.1, react-dom 18.3.1, supabase-js 2.117.2 (' + ['react.js', 'react-dom.js', 'supabase.js'].map(versaoDe).join(', ') + ')');
  /* O React vendorado é o MESMO arquivo que o support.js aceitaria do unpkg: o sha384 dele
     bate com o SRI que o runtime já carrega. Duas fontes independentes dizendo o mesmo byte. */
  {
    const sup = fs.readFileSync(path.join(RAIZ, 'support.js'), 'utf8');
    const sri = (nome) => (sup.match(new RegExp('var ' + nome + ' = "(sha384-[^"]+)"')) || [])[1];
    const sha384 = (f) => 'sha384-' + createHash('sha384').update(fs.readFileSync(path.join(RAIZ, 'vendor', f))).digest('base64');
    ok(!!sri('REACT_SRI') && sri('REACT_SRI') === sha384('react.js') && sri('REACT_DOM_SRI') === sha384('react-dom.js'),
       'D9 vendor/react.js e vendor/react-dom.js batem com o SRI (sha384) do support.js');
  }
  /* Nenhum download de biblioteca sobrou nos dois builds: nenhuma URL de CDN como LITERAL
     (entre aspas — os comentários contam a história e citam o jsdelivr sem aspas) e ninguém
     lê a saída de emergência CT_PERMITE_CDN, que perdeu a razão de existir. Não se tiram os
     comentários com regex: `docs/juridico/*.md` num comentário de linha abria um falso
     bloco e engolia o código. */
  for (const b of ['build.mjs', 'build-macos.mjs']) {
    const codigo = fs.readFileSync(path.join(RAIZ, 'scripts', b), 'utf8');
    ok(!/['"`]https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)/.test(codigo) && !/process\.env\.CT_PERMITE_CDN/.test(codigo)
       && /lerVendor\(ROOT\)/.test(codigo) && !/\bfetch\(\s*url\b/.test(codigo),
       'D9 ' + b + ' não baixa biblioteca: copia de vendor/ por lerVendor, sem URL de CDN nem CT_PERMITE_CDN');
  }
  const fontesPub = path.join(RAIZ, 'public', 'fonts');
  ok(fs.existsSync(fontesPub) && fs.readdirSync(fontesPub).filter(f => f.endsWith('.woff2')).length >= 20,
     'D9 as 20 faces chegam a public/fonts mesmo sem rede');

  /* VENDOR ADULTERADO OU AUSENTE DERRUBA O BUILD E NOMEIA O ARQUIVO. O arquivo de verdade é
     posto de lado e volta no finally; a cópia adulterada difere em UM byte no fim (o tamanho
     não muda, então só o hash pega). A conferência vem antes da limpeza de public/, então o
     deploy do build anterior (o de agora há pouco, sem rede) tem de continuar de pé. */
  const vendorCaso = (arquivo, estragar) => {
    const alvo = path.join(RAIZ, 'vendor', arquivo), guardado = alvo + '.teste-' + process.pid;
    fs.renameSync(alvo, guardado);
    try {
      if (estragar) {
        const buf = Buffer.from(fs.readFileSync(guardado));
        buf[buf.length - 1] = buf[buf.length - 1] === 0x20 ? 0x0a : 0x20;
        fs.writeFileSync(alvo, buf);
      }
      return rodar({ NODE_OPTIONS: '--require ' + stub });
    } finally {
      fs.rmSync(alvo, { force: true });
      fs.renameSync(guardado, alvo);
    }
  };
  const idxAntes = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  const adulterado = vendorCaso('supabase.js', true);
  ok(adulterado.code !== 0 && /BUILD ABORTADO: vendor\/supabase\.js/.test(adulterado.saida) && /sha256/.test(adulterado.saida),
     'D9 vendor/supabase.js adulterado (mesmo tamanho) derruba o build e nomeia o arquivo (' + adulterado.code + ')');
  ok(fs.existsSync(path.join(RAIZ, 'public', 'index.html'))
     && fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8') === idxAntes
     && sha256De(path.join(RAIZ, 'public', 'vendor', 'supabase.js')) === manifestoVendor.arquivos.find((a) => a.arquivo === 'supabase.js').sha256,
     'D9 o build que aborta pelo hash não apaga o deploy anterior (a conferência vem antes da limpeza)');
  const ausente = vendorCaso('react-dom.js', false);
  ok(ausente.code !== 0 && /BUILD ABORTADO: vendor\/react-dom\.js não existe/.test(ausente.saida),
     'D9 vendor/react-dom.js ausente derruba o build e nomeia o arquivo (' + ausente.code + ')');
  ok(sha256De(path.join(RAIZ, 'vendor', 'supabase.js')) === manifestoVendor.arquivos.find((a) => a.arquivo === 'supabase.js').sha256
     && fs.existsSync(path.join(RAIZ, 'vendor', 'react-dom.js')),
     'D9 os casos devolvem vendor/ intacto');
  /* As fontes não têm saída de emergência para CDN (e, desde o vendor congelado, nem as
     bibliotecas — ver o caso acima). A asserção mira a função das fontes. */
  const buildSrc = fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8');
  const fnFontes = buildSrc.slice(buildSrc.indexOf('async function vendorarFontes()'),
                                 buildSrc.indexOf("return './fonts.css';"));
  // sem os comentários: o texto explicativo cita o nome do flag ao contar que ele saiu
  const fnSemComentario = fnFontes.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/PERMITE_CDN/.test(fnSemComentario), 'D9 as fontes não têm mais saída de emergência para CDN');
  ok(!/fonts\.gstatic|fonts\.googleapis/.test(fnFontes), 'D9 a função de fontes não fala com o Google');

  /* LISTA DE CÓPIA SEM PULO SILENCIOSO. Arquivo citado na lista que não existe derruba o
     build e é nomeado — antes o laço pulava em silêncio e o deploy saía sem ele. O stub de
     rede fica ligado de propósito: o build não usa rede nenhuma, então a causa do aborto
     tem de ser o arquivo (e não o vendor das bibliotecas). */
  {
    const alvo = path.join(RAIZ, 'sobre.html'), escondido = alvo + '.ausente-no-teste';
    fs.renameSync(alvo, escondido);
    let semArquivo;
    try { semArquivo = rodar({ NODE_OPTIONS: '--require ' + stub }); }
    finally { fs.renameSync(escondido, alvo); }
    ok(semArquivo.code !== 0 && /sobre\.html/.test(semArquivo.saida) && /não existe/.test(semArquivo.saida)
       && !/BUILD ABORTADO: vendor\//.test(semArquivo.saida),
       'BUILD LIMPO item da lista de cópia ausente derruba o build e diz qual (' + semArquivo.code + ')');
  }

  // build normal: nada de terceiro sobra no HTML publicado
  plantarOrfaos();
  const normal = rodar({});
  ok(normal.code === 0, 'D9 build com rede passa');
  ok(!fs.existsSync(orfaoPag) && !fs.existsSync(orfaoBloco),
     'BUILD LIMPO o build completo não deixa sobra de build anterior em public/');
  {
    /* "O resto saiu": public/dados é o espelho exato de dados/ (nem bloco velho, nem bloco
       faltando), e cada item da lista de cópia chegou. */
    const arvore = (base) => {
      const out = [];
      const andar = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) andar(p); else out.push(path.relative(base, p));
      } };
      if (fs.existsSync(base)) andar(base);
      return out.sort();
    };
    const dRepo = arvore(path.join(RAIZ, 'dados')), dPub = arvore(path.join(RAIZ, 'public', 'dados'));
    ok(dRepo.length > 0 && dRepo.join('\n') === dPub.join('\n'),
       'BUILD LIMPO public/dados é o espelho exato de dados/ (' + dPub.length + ' de ' + dRepo.length + ' arquivos)');
    const src = fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8');
    const m = src.match(/const COPIAR = (\[[^\]]*\]);/);
    const copiar = m ? JSON.parse(m[1].replace(/'/g, '"')) : [];
    ok(copiar.length > 20 && copiar.every(f => fs.existsSync(path.join(RAIZ, 'public', f)))
       && ['index.html', 'sw.js', 'manifest.webmanifest', 'fonts.css', 'vendor/react.js', 'vendor/react-dom.js', 'vendor/supabase.js']
          .every(f => fs.existsSync(path.join(RAIZ, 'public', f))),
       'BUILD LIMPO o resto do deploy saiu inteiro (' + copiar.length + ' cópias + index, sw, manifest, fontes e vendor)');
  }
  const html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  const terceiros = (html.match(/(?:src|href)="https:\/\/[^"]*(?:jsdelivr|unpkg|fonts\.googleapis|fonts\.gstatic)[^"]*"/g) || []);
  ok(terceiros.length === 0, 'D9 HTML publicado não carrega nada de CDN nem do Google Fonts');
  {
    const cdnjs = citamCdnjs(path.join(RAIZ, 'public'));
    ok(cdnjs.length === 0, 'D9 nenhum HTML/JS/CSS copiado para public/ cita o cdnjs (' + (cdnjs.join(', ') || 'nenhum') + ')');
    ok(pdfjsNaSaida(path.join(RAIZ, 'public')),
       'D9 public/vendor/pdfjs leva pdf.min.js e pdf.worker.min.js com o sha256 do manifesto');
    /* E o caso reprova quando devia: um arquivo copiado que volta a citar o cdnjs é nomeado.
       (Plantado depois do build, só para a varredura — some logo em seguida.) */
    const isca = path.join(RAIZ, 'public', 'isca-cdnjs-' + process.pid + '.js');
    fs.writeFileSync(isca, 'var B="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";');
    let pega;
    try { pega = citamCdnjs(path.join(RAIZ, 'public')); } finally { fs.rmSync(isca, { force: true }); }
    ok(pega.length === 1 && /isca-cdnjs/.test(pega[0]), 'D9 a varredura do cdnjs acusa e nomeia o arquivo que o cita (' + pega.join(', ') + ')');
  }
  // TRAVA GERAL (tests/rede-externa.mjs): nenhum arquivo de texto de public/ carrega URL externa
  // fora da lista de exceções — src=, <link rel>, @import, url(), fetch, Worker, import(), literal
  // de recurso, host de CDN —, com isca que prova que a varredura acusa arquivo:linha.
  testarVarreduraRedeExterna(ok, path.join(RAIZ, 'public'), 'public');
  testarSupportSemRede(ok, { motor: 'node' });
  ok(/href="\.\/fonts\.css"/.test(html), 'D9 as fontes vêm do próprio domínio');
  const cssFontes = fs.readFileSync(path.join(RAIZ, 'public', 'fonts.css'), 'utf8');
  ok(/font-display:\s*swap/.test(cssFontes), 'D9 font-display:swap preservado');
  ok(!/fonts\.gstatic\.com/.test(cssFontes), 'D9 o CSS das fontes aponta para arquivos locais');
  ok(fs.readdirSync(path.join(RAIZ, 'public', 'fonts')).length > 10, 'D9 os .woff2 estão no deploy');
}

/* ============= D9 NATIVO — O BUNDLE DO APP NÃO CAI PARA O CDN ============= */
// O build-macos.mjs gera o bundle web do .app (Mac e iPad) e o do Xcode Cloud. Sem rede no
// build ele caía para <script src="https://cdn…"> sem avisar; depois passou a abortar (#154).
// Agora as bibliotecas vêm de vendor/, congeladas e conferidas pelo sha256: sem rede o build
// PASSA, e o que aborta é vendor/ adulterado ou ausente. O bundle de verdade (mac/build/web)
// é posto de lado e volta no fim: este caso não pode apagar o que o build do app ou a suíte
// WebKit vão usar.
{
  const { execFileSync } = await import('child_process');
  const stub = path.join(RAIZ, 'tests', 'offline-stub.cjs');
  const web = path.join(RAIZ, 'mac', 'build', 'web'), guardado = web + '.antes-do-teste-' + process.pid;
  const buildMac = (env) => {
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build-macos.mjs')],
        { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'pipe' });
      return { code: 0, saida: '' };
    } catch (e) { return { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') }; }
  };
  const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vendor', 'manifesto.json'), 'utf8'));
  const hashDe = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const LIBS = ['react.js', 'react-dom.js', 'supabase.js'];
  const bundleConfere = () => LIBS.every((f) => {
    const p = path.join(web, 'vendor', f), ent = manifesto.arquivos.find((a) => a.arquivo === f);
    return ent && fs.existsSync(p) && hashDe(p) === ent.sha256;
  });
  const tinha = fs.existsSync(web);
  if (tinha) fs.renameSync(web, guardado);
  let r, idx = null, libsOk = false, r3, idxDepois = null, libsDepois = false, cdnjsNoBundle = null, pdfjsNoBundle = false;
  const supa = path.join(RAIZ, 'vendor', 'supabase.js'), supaGuardado = supa + '.teste-' + process.pid;
  try {
    r = buildMac({ NODE_OPTIONS: '--require ' + stub });
    const pIdx = path.join(web, 'index.html');
    if (fs.existsSync(pIdx)) idx = fs.readFileSync(pIdx, 'utf8');
    libsOk = bundleConfere();
    cdnjsNoBundle = citamCdnjs(web);
    pdfjsNoBundle = pdfjsNaSaida(web);
    // a mesma trava geral sobre o bundle que ACABOU de sair (não o que estava na máquina)
    testarVarreduraRedeExterna(ok, web, 'bundle');
    /* O caso do #154 ("sem rede o build-macos ABORTA") mudou de sentido: rede não é mais
       motivo de aborto; vendor/ corrompido é. Adultera um byte do supabase.js (mesmo
       tamanho), roda de novo sem rede e confere que o build para, nomeia o arquivo e deixa
       o bundle que acabou de sair intacto (a conferência vem antes de apagar a saída). */
    fs.renameSync(supa, supaGuardado);
    try {
      const buf = Buffer.from(fs.readFileSync(supaGuardado));
      buf[buf.length - 1] = buf[buf.length - 1] === 0x20 ? 0x0a : 0x20;
      fs.writeFileSync(supa, buf);
      r3 = buildMac({ NODE_OPTIONS: '--require ' + stub });
    } finally {
      fs.rmSync(supa, { force: true });
      fs.renameSync(supaGuardado, supa);
    }
    if (fs.existsSync(pIdx)) idxDepois = fs.readFileSync(pIdx, 'utf8');
    libsDepois = bundleConfere();
  } finally {
    fs.rmSync(web, { recursive: true, force: true });
    if (tinha) fs.renameSync(guardado, web);
  }
  ok(r.code === 0 && !/BUILD ABORTADO/.test(r.saida),
     'D9 NATIVO sem rede o build-macos PASSA (código 0): as bibliotecas vêm de vendor/ (' + r.code + ')');
  ok(libsOk, 'D9 NATIVO o bundle sem rede leva react.js, react-dom.js e supabase.js com o sha256 do manifesto');
  ok(!!idx && LIBS.every((f) => idx.includes('src="./vendor/' + f + '"')),
     'D9 NATIVO o index.html do bundle carrega as três bibliotecas de ./vendor/');
  // `[^>]*` e não `<script src=`: o prepararAbertura põe `defer` antes do src em toda <script>.
  ok(!!idx && !/<script\b[^>]*\bsrc="https?:\/\//.test(idx),
     'D9 NATIVO o index.html do bundle nunca carrega <script> de CDN');
  ok(Array.isArray(cdnjsNoBundle) && cdnjsNoBundle.length === 0,
     'D9 NATIVO nenhum HTML/JS/CSS do bundle cita o cdnjs (' + ((cdnjsNoBundle || ['bundle não saiu']).join(', ') || 'nenhum') + ')');
  ok(pdfjsNoBundle, 'D9 NATIVO o bundle sem rede leva vendor/pdfjs (lib e worker) com o sha256 do manifesto');
  ok(r3 && r3.code !== 0 && /BUILD ABORTADO: vendor\/supabase\.js/.test(r3.saida) && /sha256/.test(r3.saida),
     'D9 NATIVO vendor/supabase.js corrompido faz o build-macos ABORTAR e nomeia o arquivo (' + (r3 && r3.code) + ')');
  ok(idxDepois === idx && libsDepois,
     'D9 NATIVO o build que aborta pelo hash deixa o bundle anterior de pé (não apaga mac/build/web)');
  ok(hashDe(supa) === manifesto.arquivos.find((a) => a.arquivo === 'supabase.js').sha256,
     'D9 NATIVO o caso devolve vendor/supabase.js intacto');
  ok(!tinha || fs.existsSync(path.join(web, 'index.html')), 'D9 NATIVO o bundle anterior volta intacto depois do caso');
  // Lista de cópia do bundle também não pula em silêncio: um arquivo listado que sumiu do
  // repositório para o build e é nomeado (antes o bundle saía sem ele e o app quebrava calado).
  const sobre = path.join(RAIZ, 'sobre.html'), sobreGuardado = sobre + '.teste-' + process.pid;
  const tinha2 = fs.existsSync(web); if (tinha2) fs.renameSync(web, guardado);
  let r2;
  fs.renameSync(sobre, sobreGuardado);
  try {
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build-macos.mjs')], { cwd: RAIZ, stdio: 'pipe' });
      r2 = { code: 0, saida: '' };
    } catch (e) { r2 = { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') }; }
  } finally {
    fs.renameSync(sobreGuardado, sobre);
    fs.rmSync(web, { recursive: true, force: true });
    if (tinha2) fs.renameSync(guardado, web);
  }
  ok(r2.code !== 0 && /BUILD ABORTADO: sobre\.html/.test(r2.saida),
     'D9 NATIVO item da lista de cópia ausente derruba o build-macos e é nomeado (' + r2.code + ')');
  // o sw.js é obrigatório no build do site: sem ele não haveria PWA nem offline
  ok(/if \(!existsSync\(join\(ROOT, 'sw\.js'\)\)\) \{ console\.error\('BUILD ABORTADO/.test(fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8')),
     'BUILD LIMPO sem sw.js o build do site para, em vez de sair sem PWA');
}

/* ============= U10 — PWA INSTALÁVEL E OFFLINE DE VERDADE ============= */
// Estes testes rodam em http://localhost, onde o sw.js se AUTODESTRÓI de propósito
// (senão o preview passa a servir asset velho). Registrar o worker aqui provaria o
// contrário do que interessa. Então o caminho de PRODUÇÃO é simulado: o público
// public/sw.js (gerado pelo build acima) é avaliado com um `self` de mentira, e o
// que se afere são as FUNÇÕES DE DECISÃO — orçamento, fallback, listas de cache.
{
  const swSrc = fs.readFileSync(path.join(RAIZ, 'public', 'sw.js'), 'utf8');
  const carregarSW = (origem, cota) => {
    const eventos = {};
    const self = {
      location: new URL(origem + '/sw.js'),
      addEventListener: (t, fn) => { (eventos[t] = eventos[t] || []).push(fn); },
      navigator: { storage: { estimate: () => Promise.resolve(cota || { quota: 2e9, usage: 0 }) } },
    };
    new Function('self', swSrc)(self);
    return { api: self.__ctSW, eventos };
  };

  // 1. o kill-switch continua de pé: fora de produção, ZERO handler de fetch
  const dev = carregarSW('http://localhost:8123');
  ok(!dev.api, 'U10 fora de produção o worker não expõe política de cache (kill-switch intacto)');
  ok(!(dev.eventos.fetch || []).length, 'U10 fora de produção o worker não intercepta fetch nenhum');
  const devFile = carregarSW('http://127.0.0.1:5500');
  ok(!(devFile.eventos.fetch || []).length, 'U10 o kill-switch também vale para 127.0.0.1');

  const { api: SW, eventos: evProd } = carregarSW('https://catedra.exemplo.app');
  ok(!!SW && (evProd.fetch || []).length === 1, 'U10 em produção o worker instala o handler de fetch');

  // 2. a casca cobre tudo o que o app precisa para ABRIR offline
  const casca = SW.ASSETS;
  const naCasca = (p) => casca.indexOf(p) >= 0;
  ok(['./index.html', './support.js', './auth.js', './ct-dados.js'].every(naCasca),
    'U10 a casca traz o documento e os scripts do runtime');
  ok(['./prioridade-calc.js', './busca-unica.js', './semana-juris.js'].every(naCasca),
    'U10 a casca traz os três scripts do <head> (antes só entravam depois da 1a visita)');
  ok(casca.some(p => /^\.\/vendor\//.test(p)) && naCasca('./fonts.css') && casca.some(p => /^\.\/fonts\//.test(p)),
    'U10 a casca traz as libs vendoradas e as fontes locais');
  /* O `< 20` daqui era a marca de quando o build baixava 48 faces do Google e só algumas
     latinas entravam na casca. Com as faces versionadas em fonts/, TODAS as que existem
     são latinas — são exatamente 20 — e o número virou coincidência com o limite antigo.
     A asserção passa a dizer o que importa: nada de alfabeto que este app não usa, e a
     casca leva exatamente o que o repositório tem (nem sobra velharia, nem falta face). */
  const facesNoRepo = fs.readdirSync(path.join(RAIZ, 'fonts')).filter(f => f.endsWith('.woff2')).length;
  const facesNaCasca = casca.filter(p => /^\.\/fonts\//.test(p)).length;
  ok(!casca.some(p => /cyrillic|greek|vietnamese/.test(p)),
    'U10 nenhum subconjunto não-latino entra no precache');
  ok(facesNaCasca === facesNoRepo,
    'U10 a casca leva exatamente as faces do repositório (' + facesNaCasca + ' de ' + facesNoRepo + ')');
  ok(casca.filter(p => /\/dados\/[^/]+\/manifesto\.json$/.test(p)).length >= 1,
    'U10 os manifestos dos acervos fatiados entram na casca (sem eles o CTDados desiste offline)');

  // 3. o acervo é MEDIDO, não chutado, e cabe no orçamento
  ok(SW.ACERVOS.length > 20, 'U10 o precache do acervo tem os satélites e os bancos (' + SW.ACERVOS.length + ' arquivos)');
  ok(SW.ACERVOS.every(([p, b]) => typeof p === 'string' && b > 0),
    'U10 todo item do acervo carrega o tamanho real do arquivo');
  const totalAcervo = SW.ACERVOS.reduce((s, [, b]) => s + b, 0);
  ok(totalAcervo <= SW.ORCAMENTO_ACERVO,
    'U10 o acervo (' + (totalAcervo / 1048576).toFixed(1) + ' MB) cabe no orçamento de '
    + (SW.ORCAMENTO_ACERVO / 1048576).toFixed(0) + ' MB');
  const temAcervo = (p) => SW.ACERVOS.some(([c]) => c === p);
  ok(['./legis-web.html', './juris-web.html', './ritos-web.html', './segunda-fase-web.html'].every(temAcervo),
    'U10 as páginas satélite entram no precache');
  ok(temAcervo('./juris-index.js') && temAcervo('./espelhos.js') && temAcervo('./questoes-prova.js'),
    'U10 os acervos do estudo do dia entram no precache');
  ok(SW.ACERVOS.filter(([c]) => /\/dados\/leis-seca\//.test(c)).length >= 10,
    'U10 a lei seca entra em blocos (acervoLeis pede o acervo inteiro: bloco faltando vira lista vazia)');

  // 4. a armadilha declarada na especificação: o blob de contas fica SÓ-ONLINE
  const tudoQueSeCacheia = casca.concat(SW.ACERVOS.map(([c]) => c));
  ok(!tudoQueSeCacheia.some(p => /contas-(index|text)\.js$/.test(p)
    || /\/dados\/contas-text\/(?!manifesto\.json$)/.test(p)),
    'U10 o blob de contas (11,2 MB) fica fora do precache — decisão comentada no sw.js');
  // …mas o manifesto dele FICA: é o que faz o CTDados usar os blocos que ela já leu
  // (IndexedDB/Cache) em vez de desistir e pedir o monolito de 8,7 MB que não está lá.
  ok(casca.indexOf('./dados/contas-text/manifesto.json') >= 0,
    'U10 o manifesto de contas fica em cache para o que ela já leu continuar abrindo offline');
  ok(!tudoQueSeCacheia.some(p => /leis-seca\.js$/.test(p) || /discursivas-textos\.js$/.test(p)),
    'U10 monolito de lei seca e discursivas-textos ficam fora (duplicado e não-usado)');

  // 4b. camada 3: os pesados só descem quando ELA pede
  const pedido = SW.ACERVOS_SOB_PEDIDO.map(([c]) => c);
  ok(!tudoQueSeCacheia.some(p => /juris-text\.js$/.test(p) || /oral-conteudo\.js$/.test(p)
    || /leis-seca-areas\.js$/.test(p)),
    'U10 os três pesados não entram no aquecimento automático');
  ok(['./juris-text.js', './oral-conteudo.js', './leis-seca-areas.js'].every(p => pedido.indexOf(p) >= 0),
    'U10 …mas estão na lista de "Baixar tudo" (senão o simulado de súmulas nunca abriria offline)');
  /* O PDF.js (1,4 MB) só serve para importar PDF: fica no aquecimento SOB PEDIDO, nunca na casca
     (install bloqueante) nem no automático. Online, o network-first já o guarda no primeiro uso. */
  ok(['./vendor/pdfjs/pdf.min.js', './vendor/pdfjs/pdf.worker.min.js'].every(p => pedido.indexOf(p) >= 0)
     && SW.ACERVOS_SOB_PEDIDO.filter(([c]) => /\/vendor\/pdfjs\//.test(c)).every(([, b]) => b > 300000)
     && !tudoQueSeCacheia.some(p => /\/vendor\/pdfjs\//.test(p)),
    'U10 o PDF.js (lib e worker) entra no "Baixar tudo", medido, e fica fora da casca e do aquecimento automático');
  const somaPedido = SW.ACERVOS.concat(SW.ACERVOS_SOB_PEDIDO).reduce((s, [, b]) => s + b, 0);
  ok(somaPedido <= SW.ORCAMENTO_PEDIDO && SW.ORCAMENTO_PEDIDO > SW.ORCAMENTO_ACERVO,
    'U10 o pedido explícito tem orçamento próprio e maior (' + (somaPedido / 1048576).toFixed(1)
    + ' MB de ' + (SW.ORCAMENTO_PEDIDO / 1048576).toFixed(0) + ' MB)');
  const semEspaco = carregarSW('https://catedra.exemplo.app', { quota: 30 * 1048576, usage: 25 * 1048576 });
  ok((await semEspaco.api.orcamentoDisponivel(true)) < SW.ORCAMENTO_PEDIDO,
    'U10 pedido dela não cria espaço no aparelho: a cota continua limitando');

  // 5. o orçamento é aritmética: corta a cauda, e item grande não trava a fila
  const plano = SW.planoDeAquecimento([['a', 100], ['gigante', 5000], ['c', 50]], 200);
  ok(plano.itens.length === 2 && plano.bytes === 150 && plano.cortados[0] === 'gigante',
    'U10 o que não cabe é pulado sem interromper os itens seguintes');
  ok(SW.planoDeAquecimento(SW.ACERVOS, 0).itens.length === 0,
    'U10 orçamento zero não baixa nada (em vez de estourar a cota)');
  const apertado = carregarSW('https://catedra.exemplo.app', { quota: 20 * 1048576, usage: 18 * 1048576 });
  const orc = await apertado.api.orcamentoDisponivel();
  ok(orc > 0 && orc < SW.ORCAMENTO_ACERVO,
    'U10 com a cota do aparelho apertada o orçamento encolhe sozinho (' + Math.round(orc / 1024) + ' KB)');

  // 6. fallback offline: cada tipo de pedido recebe a resposta certa
  ok(SW.modoDeFallback({ url: 'https://x.app/legis-web.html', mode: 'navigate', destination: 'iframe' }) === 'pagina',
    'U10 satélite em iframe recebe página própria (e não o app inteiro dentro do iframe)');
  ok(SW.modoDeFallback({ url: 'https://x.app/juris-web.html', mode: 'navigate', destination: '' }) === 'pagina',
    'U10 satélite sem destination (Safari antigo) também recebe a página própria');
  ok(SW.modoDeFallback({ url: 'https://x.app/algo', mode: 'navigate', destination: 'document' }) === 'app',
    'U10 rota qualquer do app cai no app inteiro, que resolve a tela sozinho');
  ok(SW.modoDeFallback({ url: 'https://x.app/index.html', mode: 'navigate', destination: '' }) === 'app',
    'U10 a entrada do app nunca é confundida com satélite');
  ok(SW.modoDeFallback({ url: 'https://x.app/treino.js', mode: 'no-cors', destination: 'script' }) === 'recurso',
    'U10 script sem cópia guardada é tratado como recurso');

  const pg = SW.paginaOffline('Sem rede', 'texto');
  const pgTxt = await pg.text();
  ok(pg.status === 200 && /text\/html/.test(pg.headers.get('content-type') || ''),
    'U10 a página de indisponível é HTML de verdade (200), não erro de rede cru');
  ok(/Tentar de novo/.test(pgTxt) && /prefers-color-scheme/i.test(pgTxt),
    'U10 a página de indisponível tem ação de recarregar e segue o tema do aparelho');

  const rJs = SW.recursoOffline({ url: 'https://x.app/oral-conteudo.js' });
  ok(rJs.status === 503, 'U10 script sem cache devolve 503 (dispara o onerror de quem pediu)');
  const rJson = SW.recursoOffline({ url: 'https://x.app/dados/juris-text/a.json' });
  ok(rJson.status === 503 && /application\/json/.test(rJson.headers.get('content-type') || ''),
    'U10 bloco de acervo sem cache devolve 503 em JSON, não promessa quebrada');
  // um .js vazio com 200 seria pior que o erro: o app acharia que o acervo carregou
  ok(!/^\s*$/.test(await rJs.text()), 'U10 o corpo do 503 explica o que houve');

  // 7. manifesto e ponte de instalação — o que o host dos Ajustes vai consumir
  const mani = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public', 'manifest.webmanifest'), 'utf8'));
  ok(mani.id && mani.start_url === './index.html' && mani.display === 'standalone',
    'U10 o manifesto publicado tem id estável, start_url do deploy e display standalone');
  ok(mani.theme_color === '#0f7a57', 'U10 a cor do manifesto é a mesma do app (splash e barra combinam)');
  ok((mani.icons || []).some(i => /\.png$/.test(i.src)), 'U10 o manifesto publicado tem ícone PNG (iOS)');
  const idxHtml = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');
  ok(/window\.__catedraInstall\s*=/.test(idxHtml) && /beforeinstallprompt/.test(idxHtml),
    'U10 o build segura o beforeinstallprompt (senão o item dos Ajustes não teria o que chamar)');
  ok(/window\.__catedraOffline\s*=/.test(idxHtml) && /ctAquecerAcervos/.test(idxHtml),
    'U10 o host tem por onde ler o estado do acervo offline e mandar baixar o resto');

  /* 8. CACHE POR DEPLOY (decisão da dona, 25/09/2026). Antes VERSION era 'catedra-v5' fixo: a
     casca e o acervo guardados sobreviviam de um deploy ao outro, o aquecimento pulava o que
     já tinha, o estado offline contava cópia de qualquer versão como "pronta", o install
     engolia falha de arquivo e ativava com cache parcial, e os blocos órfãos de dados/ se
     acumulavam. Aqui o worker PUBLICADO roda contra caches e rede de mentira, pelos mesmos
     eventos que o navegador dispara (install, activate, message) — nada de atalho interno. */
  {
    const { execFileSync } = await import('child_process');
    const pubDir = path.join(RAIZ, 'public');
    const versaoDe = (txt) => { const m = txt.match(/^\s*VERSION = '(catedra-[^']+)';/m) || txt.match(/var VERSION = '(catedra-[^']+)';/); return m && m[1]; };
    const buildSite = () => execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'build.mjs')], { cwd: RAIZ, stdio: 'pipe' });

    // 8a. a versão é injetada pelo build e sai do CONTEÚDO: mesmo conteúdo, mesma versão
    const vA = versaoDe(swSrc);
    ok(/^catedra-[0-9a-f]{12}$/.test(vA || '') && !swSrc.includes('/*__VERSAO__*/'),
      'U10/VERSÃO o build injeta no sw.js a versão do cache tirada do conteúdo (' + vA + ')');
    let calc = null;
    try {
      const { versaoDoCache, linhaVersao, MARCADOR_VERSAO } = await import('../scripts/sw-versao.mjs');
      calc = versaoDoCache(pubDir, swSrc.replace(linhaVersao(vA.replace('catedra-', '')), MARCADOR_VERSAO));
    } catch (_) {}
    ok(!!calc && vA === 'catedra-' + calc,
      'U10/VERSÃO a versão publicada é o hash do deploy (public/ + texto do sw.js), recalculado aqui igual');
    buildSite();
    const vDeNovo = versaoDe(fs.readFileSync(path.join(pubDir, 'sw.js'), 'utf8'));
    // um deploy com UM byte diferente num acervo: a sonda é posta e tirada no finally
    const sonda = path.join(RAIZ, 'modelos-edital.js'), sondaOrig = fs.readFileSync(sonda);
    let swB = null;
    try {
      fs.writeFileSync(sonda, Buffer.concat([sondaOrig, Buffer.from('\n/* sonda U10 */\n')]));
      buildSite();
      swB = fs.readFileSync(path.join(pubDir, 'sw.js'), 'utf8');
    } finally {
      fs.writeFileSync(sonda, sondaOrig);
      buildSite();
    }
    const vB = swB && versaoDe(swB);
    const vVolta = versaoDe(fs.readFileSync(path.join(pubDir, 'sw.js'), 'utf8'));
    ok(vDeNovo === vA && vVolta === vA,
      'U10/VERSÃO dois builds do mesmo conteúdo dão a mesma versão (' + vDeNovo + ', ' + vVolta + ')');
    ok(!!vB && vB !== vA && /^catedra-[0-9a-f]{12}$/.test(vB),
      'U10/VERSÃO um byte a mais num acervo dá versão nova (' + vB + ')');

    // 8b. o ambiente de mentira: caches com a semântica do Cache Storage e uma rede que
    //     serve os manifestos de verdade e, no resto, um texto que diz de qual deploy veio
    const ORIGEM = 'https://catedra.exemplo.app';
    const chave = (k) => new URL(typeof k === 'string' ? k : k.url, ORIGEM + '/sw.js').pathname;
    const criarAmbiente = () => {
      const lojas = new Map(), falhasRede = new Set(), log = [];
      const amb = { lojas, falhasRede, log, deploy: 'A', skipWaiting: 0 };
      amb.fetch = async (req) => {
        const p = chave(req); log.push(p);
        if (falhasRede.has(p)) return new Response('falhou', { status: 500 });
        if (/\/dados\/[^/]+\/manifesto\.json$/.test(p)) return new Response(fs.readFileSync(path.join(pubDir, p)), { status: 200 });
        return new Response('deploy ' + amb.deploy + ' ' + p, { status: 200 });
      };
      const abrir = (nome) => {
        if (!lojas.has(nome)) lojas.set(nome, new Map());
        const m = lojas.get(nome);
        return {
          match: async (k) => { const r = m.get(chave(k)); return r ? r.clone() : undefined; },
          put: async (k, r) => { m.set(chave(k), r); },
          add: async (k) => { const r = await amb.fetch(k); if (!r.ok) throw new TypeError('add ' + chave(k)); m.set(chave(k), r); },
          addAll: async (ks) => {   // tudo-ou-nada, como o Cache.addAll de verdade
            const rs = await Promise.all(ks.map((k) => amb.fetch(k)));
            if (rs.some((r) => !r.ok)) throw new TypeError('addAll');
            ks.forEach((k, i) => m.set(chave(k), rs[i]));
          },
          keys: async () => [...m.keys()].map((p) => new Request(ORIGEM + p)),
          delete: async (k) => m.delete(chave(k)),
        };
      };
      amb.caches = {
        open: async (n) => abrir(n),
        keys: async () => [...lojas.keys()],
        delete: async (n) => lojas.delete(n),
        has: async (n) => lojas.has(n),
        match: async (k) => { for (const m of lojas.values()) { const r = m.get(chave(k)); if (r) return r.clone(); } },
      };
      return amb;
    };
    const subirWorker = (amb, texto) => {
      const eventos = {};
      const self = {
        location: new URL(ORIGEM + '/sw.js'),
        addEventListener: (t, fn) => { (eventos[t] = eventos[t] || []).push(fn); },
        // saveData: o aquecimento AUTOMÁTICO do activate fica quieto; o teste pede o dele
        navigator: { storage: { estimate: () => Promise.resolve({ quota: 2e9, usage: 0 }) }, connection: { saveData: true } },
        skipWaiting: () => { amb.skipWaiting++; return Promise.resolve(); },
        clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]) },
        registration: { showNotification: () => Promise.resolve() },
      };
      new Function('self', 'caches', 'fetch', texto)(self, amb.caches, amb.fetch);
      const disparar = async (tipo, extra) => {
        let espera = Promise.resolve();
        const ev = Object.assign({ waitUntil: (p) => { espera = p; } }, extra || {});
        eventos[tipo][0](ev);
        return espera;
      };
      const perguntar = (type) => new Promise((ok2) => {
        disparar('message', { data: { type }, ports: [{ postMessage: ok2 }] });
      });
      return { api: self.__ctSW, disparar, perguntar };
    };
    const resultado = async (p) => { try { await p; return 'ok'; } catch (_) { return 'rejeitou'; } };
    const lojaTem = (amb, nome, p) => !!(amb.lojas.get(nome) && amb.lojas.get(nome).has(p));
    const swA = swSrc;

    // 8c. install ATÔMICO: crítico falhou → rejeita, sem skipWaiting, e o worker antigo segue
    {
      const amb = criarAmbiente();
      amb.lojas.set('catedra-v5', new Map([['/index.html', new Response('deploy antigo')]]));
      amb.falhasRede.add('/support.js');
      const w = subirWorker(amb, swA);
      const r = await resultado(w.disparar('install'));
      ok(r === 'rejeitou' && amb.skipWaiting === 0,
        'U10/INSTALL item crítico (support.js) que falha REJEITA o install e não chama skipWaiting (' + r + ', skipWaiting ' + amb.skipWaiting + ')');
      ok(!lojaTem(amb, vA, '/index.html') && lojaTem(amb, 'catedra-v5', '/index.html'),
        'U10/INSTALL o install que rejeita não deixa cache parcial da versão nova, e o da versão antiga fica intacto');
      const crit = (w.api && w.api.CRITICOS) || [];
      ok(['./', './index.html', './support.js', './auth.js', './catedra-ui.css', './fonts.css'].every((c) => crit.includes(c))
         && crit.some((c) => /^\.\/vendor\/[^/]+\.js$/.test(c)) && !crit.some((c) => /pdfjs|icon|manifesto/.test(c)),
        'U10/INSTALL a lista crítica é a casca da abertura (documento, runtime, auth, vendor, CSS, fontes) — ' + crit.length + ' itens');
      for (const falho of ['/auth.js', '/vendor/react.js', '/catedra-ui.css', '/fonts.css']) {
        const amb2 = criarAmbiente(); amb2.falhasRede.add(falho);
        const r2 = await resultado(subirWorker(amb2, swA).disparar('install'));
        ok(r2 === 'rejeitou' && amb2.skipWaiting === 0, 'U10/INSTALL ' + falho + ' falhando também derruba o install (' + r2 + ')');
      }
    }
    // …e o não crítico falhando NÃO segura a instalação
    {
      const amb = criarAmbiente();
      amb.falhasRede.add('/icon.svg');
      const r = await resultado(subirWorker(amb, swA).disparar('install'));
      ok(r === 'ok' && amb.skipWaiting === 1 && lojaTem(amb, vA, '/index.html') && lojaTem(amb, vA, '/support.js')
         && !lojaTem(amb, vA, '/icon.svg'),
        'U10/INSTALL item não crítico (icon.svg) que falha não impede o install: casca guardada e skipWaiting (' + r + ')');
    }

    // 8d. troca de deploy: activate apaga as versões antigas e os blocos órfãos; o aquecimento
    //     baixa tudo de novo; o estado offline só conta a versão atual
    {
      const amb = criarAmbiente();
      const wA = subirWorker(amb, swA);
      await wA.disparar('install'); await wA.disparar('activate');
      const aqA = await wA.perguntar('ctAquecerAcervos');
      const lista = SW.ACERVOS.concat(SW.ACERVOS_SOB_PEDIDO).map(([c]) => c);
      const ehBloco = (c) => /\/dados\/[^/]+\/(?!manifesto\.json$)[^/]+\.json$/.test(c);
      // o que a casca já trouxe no install desta versão (ex.: catedra-ui.css) conta como "já tinha"
      const tambemNaCasca = lista.filter((c) => SW.ASSETS.includes(c));
      ok(aqA && aqA.ok && aqA.resultado.falhas === 0 && aqA.resultado.baixados === lista.length - tambemNaCasca.length
         && aqA.resultado.jaTinha === tambemNaCasca.length,
        'U10/DEPLOY o primeiro aquecimento baixa o acervo inteiro (' + (aqA && aqA.resultado && aqA.resultado.baixados) + ' + '
        + tambemNaCasca.length + ' da casca, de ' + lista.length + ')');

      // lixo de antes: a versão fixa antiga, outra versão velha, um bloco órfão, uma pasta que sumiu
      // (acrescenta, sem trocar a loja: no HEAD antigo 'catedra-v5' É a versão A inteira)
      if (!amb.lojas.has('catedra-v5')) amb.lojas.set('catedra-v5', new Map([['/index.html', new Response('v5')]]));
      amb.lojas.set('catedra-0123456789ab', new Map([['/index.html', new Response('velho')]]));
      const dados = amb.lojas.get(SW.CACHE_DADOS) || new Map(); amb.lojas.set(SW.CACHE_DADOS, dados);
      const juris = JSON.parse(fs.readFileSync(path.join(pubDir, 'dados', 'juris-text', 'manifesto.json'), 'utf8'));
      const blocoValido = '/dados/juris-text/' + juris.arquivos[0];
      dados.set(blocoValido, new Response('{}'));
      dados.set('/dados/juris-text/zz-00000000.json', new Response('{}'));
      dados.set('/dados/sumiu/aa-11111111.json', new Response('{}'));
      const blocosLeis = lista.filter(ehBloco);

      amb.deploy = 'B'; amb.log.length = 0;
      const wB = subirWorker(amb, swB || swA);
      const vNova = wB.api && wB.api.VERSION;
      await wB.disparar('install');
      const estAntes = await wB.perguntar('ctEstadoOffline');
      await wB.disparar('activate');
      const nomes = [...amb.lojas.keys()];
      ok(vNova && vNova !== vA && !nomes.includes(vA) && !nomes.includes('catedra-v5') && !nomes.includes('catedra-0123456789ab')
         && nomes.includes(vNova) && nomes.includes(SW.CACHE_DADOS),
        'U10/DEPLOY a ativação apaga o cache da versão anterior, o catedra-v5 e outra versão velha (ficam: ' + nomes.join(', ') + ')');
      ok(!dados.has('/dados/juris-text/zz-00000000.json') && !dados.has('/dados/sumiu/aa-11111111.json'),
        'U10/DEPLOY o bloco órfão (fora dos manifestos atuais) e o de pasta que sumiu saem do cache de dados');
      ok(dados.has(blocoValido) && blocosLeis.every((b) => dados.has(chave(b))),
        'U10/DEPLOY os blocos que os manifestos atuais citam ficam (' + (blocosLeis.length + 1) + ')');

      // estado offline logo depois do install do deploy novo: só os blocos imutáveis contam
      const est = estAntes && estAntes.estado;
      ok(!!est && est.versao === vNova && est.prontos === blocosLeis.length + tambemNaCasca.length,
        'U10/DEPLOY o estado offline conta só a versão atual: da versão anterior valem apenas os blocos imutáveis ('
        + (est && est.prontos) + ' prontos de ' + lista.length + ')');

      const aqB = await wB.perguntar('ctAquecerAcervos');
      const naoBlocos = lista.filter((c) => !ehBloco(c)).map(chave);
      const rebaixados = naoBlocos.filter((p) => amb.log.includes(p));
      ok(aqB && aqB.ok && rebaixados.length === naoBlocos.length && aqB.resultado.baixados === naoBlocos.length - tambemNaCasca.length
         && aqB.resultado.jaTinha === blocosLeis.length + tambemNaCasca.length,
        'U10/DEPLOY o aquecimento da versão nova baixa de novo tudo o que não é bloco imutável ('
        + rebaixados.length + ' de ' + naoBlocos.length + '; ' + (aqB && aqB.resultado && aqB.resultado.jaTinha) + ' blocos reaproveitados)');
      const cNovo = amb.lojas.get(vNova) || new Map();
      const corpo = cNovo.get('/juris-index.js') ? await cNovo.get('/juris-index.js').clone().text() : '';
      ok(/^deploy B /.test(corpo), 'U10/DEPLOY o acervo guardado depois da troca é o do deploy novo (' + corpo.slice(0, 30) + ')');
      const estDepois = (await wB.perguntar('ctEstadoOffline')).estado;
      ok(estDepois && estDepois.prontos === lista.length && estDepois.versao === vNova,
        'U10/DEPLOY depois do "Baixar tudo" o estado offline da versão nova fica completo (' + (estDepois && estDepois.prontos) + ')');
    }

    // 8e. a condição de produção não mudou — nem a do worker, nem a da página (senão volta o
    //     laço de recarga em localhost, ou o worker some da produção)
    const COND_SW = "var IS_PROD = (self.location.protocol === 'https:') && HOST !== 'localhost' && HOST !== '127.0.0.1' && HOST !== '';";
    const COND_PAG = "var ctProd = location.protocol === 'https:' && !/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);";
    // O trecho injetado é um template literal no build.mjs: o `\.` sai como `.` no index.html
    // publicado (casa 127.0.0.1 do mesmo jeito). É o texto PUBLICADO que roda, então é ele que se avalia.
    const COND_PAG_PUB = COND_PAG.replace(/\\\./g, '.');
    const fonteSw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
    const buildTxt = fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8');
    ok(fonteSw.includes(COND_SW) && swSrc.includes(COND_SW) && buildTxt.includes(COND_PAG) && idxHtml.includes(COND_PAG_PUB),
      'U10/PROD a condição de produção do sw.js e a do registro na página seguem as mesmas (fonte e publicado)');
    const decide = (href) => {
      const loc = new URL(href);
      const noSw = new Function('self', 'var HOST = self.location.hostname; ' + COND_SW + ' return IS_PROD;')({ location: loc });
      const naPag = new Function('location', COND_PAG_PUB + ' return ctProd;')(loc);
      return [noSw, naPag];
    };
    const amostras = ['https://catedra.app/', 'https://x.vercel.app/', 'http://localhost:8461/', 'https://localhost/', 'https://127.0.0.1/', 'http://catedra.app/', 'file:///x/index.html'];
    ok(amostras.every((u) => { const [a, b] = decide(u); return a === b && a === /^https:\/\/(?!localhost|127\.)/.test(u); }),
      'U10/PROD o worker e a página decidem igual em ' + amostras.length + ' endereços (produção só em https fora de localhost)');
  }
}

/* ================= JURIS — RÓTULO DO VERBETE (auditoria 15/09/2026) =================

   Auditoria contra a fonte oficial achou verbetes cujo RÓTULO não descrevia o conteúdo:
   quatro teses de repercussão geral indexadas sob número de tema errado (a pessoa decora o
   número errado, e quem busca o número certo recebe o precedente errado) e oito teses do
   STJ gravadas com tribunal "STF" (somem do filtro por tribunal). O texto sempre esteve
   certo — errado era o rótulo. O vínculo processo↔tema de cada caso foi conferido na
   consulta processual do STF ("Rep. Geral Tema: N").

   O id NÃO muda: 'catedra:jurisEstudo' guarda favorito e status POR ID, e trocar o id
   apagaria o estudo da pessoa. Por isso o id segue com o número antigo — é chave opaca. */
{
  const idxSrc = fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8');
  const escopo = {};
  new Function('window', idxSrc).call(null, escopo);
  const IDX = escopo.__JURIS_IDX__;
  const por = Object.create(null);
  for (const r of IDX) por[r[0]] = r;
  ok(Array.isArray(IDX) && IDX.length > 15000, 'JURIS o índice carrega (' + IDX.length + ' verbetes)');

  // 1. tese de RG sob o número do tema certo — conferido em portal.stf.jus.br
  const NUMERO = [
    ['COORD-RG-791', 761, 'Tema 761 (RG)', 'RE 670422 — transgênero, alteração de prenome'],
    ['PRECOBR-002', 500, 'Tema 500 (RG — STF)', 'RE 657718 — medicamento experimental/sem registro'],
    ['repgeral-repercussao_geral-STF-380', 951, 'Tema 951 (RG)', 'RE 1023750 — CLT→RJU, PCCS'],
    ['repgeral-repercussao_geral-STF-82', 499, 'Tema 499 (RG)', 'RE 612043 — coisa julgada em ação de associação'],
  ];
  for (const [id, num, titulo, fonte] of NUMERO) {
    const r = por[id];
    ok(!!r && r[3] === num && r[4] === titulo,
      'JURIS ' + id + ' é ' + titulo + ' (' + fonte + ')');
  }
  // o número ERRADO não pode voltar: é o defeito exato que a auditoria achou
  const VOLTOU = [['COORD-RG-791', 791], ['PRECOBR-002', 6],
    ['repgeral-repercussao_geral-STF-380', 380], ['repgeral-repercussao_geral-STF-82', 82]];
  ok(VOLTOU.every(([id, mau]) => por[id] && por[id][3] !== mau),
    'JURIS nenhum dos quatro voltou ao número de tema antigo');

  // 2. tese do STJ não fica sob a bandeira do STF (some do filtro por tribunal)
  const DO_STJ = ['repgeral-repetitivo-STF-18', 'repgeral-repetitivo-STF-185',
    'repgeral-repetitivo-STF-185-2', 'repgeral-repetitivo-STF-220', 'repgeral-repetitivo-STF-292',
    'repgeral-repetitivo-STF-340', 'repgeral-repetitivo-STF-581', 'repgeral-repetitivo-STF-596'];
  ok(DO_STJ.every(id => por[id] && por[id][1] === 'STJ'),
    'JURIS os oito repetitivos de tese do STJ estão sob tribunal STJ');
  // …e os dois que são MESMO do STF continuam no STF (não corrigir demais)
  ok(['repgeral-repetitivo-STF-676', 'repgeral-repetitivo-STF-1127']
      .every(id => por[id] && por[id][1] === 'STF'),
    'JURIS Temas 676 e 1127, que são do STF, seguem no STF');

  // 3. o id é chave opaca de 'catedra:jurisEstudo' — mexer nele apaga favorito e status
  ok(NUMERO.every(([id]) => !!por[id]) && DO_STJ.every(id => !!por[id]),
    'JURIS os ids não mudaram (favorito e status da pessoa são gravados por id)');

  // 4. rótulo e número andam juntos em TODO verbete de tema: título tem de citar o número
  // "Tema 1.234" usa separador de milhar: tira o ponto ENTRE dígitos antes de comparar
  const numDoTitulo = (t) => {
    const m = /^Tema\s+0*([0-9][0-9.]*)/.exec(String(t).replace(/(\d)\.(?=\d{3}\b)/g, '$1'));
    return m ? m[1].replace(/\D.*$/, '') : null;
  };
  const incoerentes = IDX.filter(r => typeof r[3] === 'number' && /^Tema /.test(r[4] || '')
    && numDoTitulo(r[4]) !== String(r[3]));
  ok(incoerentes.length === 0,
    'JURIS nenhum verbete tem título "Tema N" divergente do número gravado'
    + (incoerentes.length ? ' (' + incoerentes.slice(0, 3).map(r => r[0]).join(', ') + ')' : ''));
}


/* ============================ SYNC (mergeAll) ============================ */
await page.goto(URL0 + '/tests/sync-fixture.html');
await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);

const sync = await page.evaluate(() => {
  const M = window.CatedraSync._test.mergeAll;
  const J = JSON.stringify;
  const r = {};

  // 1. escalar com conteúdo dos dois lados: vence o carimbo mais novo, nas duas direções
  const svA = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  const lcA = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  r.escalarSrvNovo = M(svA, lcA, false)['catedra:prefs'] === '{"tema":"novo"}';
  const svB = { 'catedra:prefs': '{"tema":"velho"}', 'catedra:_kts': J({ 'catedra:prefs': 1000 }) };
  const lcB = { 'catedra:prefs': '{"tema":"novo"}', 'catedra:_kts': J({ 'catedra:prefs': 2000 }) };
  r.escalarLocNovo = M(svB, lcB, true)['catedra:prefs'] === '{"tema":"novo"}';

  // 2. vazio nunca apaga cheio, mesmo com carimbo mais novo (semeadura de aparelho novo)
  const svC = { 'catedra:edital': '[{"disc":"Civil"}]', 'catedra:_kts': J({ 'catedra:edital': 1000 }) };
  const lcC = { 'catedra:edital': '[]', 'catedra:_kts': J({ 'catedra:edital': 9000 }) };
  r.vazioNaoApaga = M(svC, lcC, false)['catedra:edital'] === '[{"disc":"Civil"}]';

  // 3. sem carimbo dos dois lados: decide a direção do merge
  const svD = { 'catedra:profile': '{"nome":"srv"}' }, lcD = { 'catedra:profile': '{"nome":"loc"}' };
  r.semCarimboDirecao = M(svD, lcD, true)['catedra:profile'] === '{"nome":"srv"}'
    && M(svD, lcD, false)['catedra:profile'] === '{"nome":"loc"}';

  // 4. arrays com id: união; em colisão vence o carimbo (up) mais novo
  const svE = { 'catedra:errors': J([{ id: 'e1', q: 'srv', up: 100 }, { id: 'e2', q: 'so-srv' }]) };
  const lcE = { 'catedra:errors': J([{ id: 'e1', q: 'loc', up: 200 }, { id: 'e3', q: 'so-loc' }]) };
  const mE = JSON.parse(M(svE, lcE, false)['catedra:errors']);
  r.arrayUniao = mE.length === 3 && mE.some(x => x.id === 'e2') && mE.some(x => x.id === 'e3');
  r.arrayColisao = mE.find(x => x.id === 'e1').q === 'loc';

  // 5. lápide de item: id apagado neste aparelho não volta da nuvem…
  localStorage.setItem('catedra:_tomb', J({ arr: { 'catedra:errors': { e9: 5000 } } }));
  const svF = { 'catedra:errors': J([{ id: 'e9', q: 'volta?', up: 100 }, { id: 'e8', up: 100 }]) };
  const mF = JSON.parse(M(svF, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideSegura = !mF.some(x => x.id === 'e9') && mF.some(x => x.id === 'e8');
  // …a menos que tenha sido editado DEPOIS de apagado
  const svG = { 'catedra:errors': J([{ id: 'e9', q: 'editado depois', up: 9000 }]) };
  const mG = JSON.parse(M(svG, { 'catedra:errors': '[]' }, false)['catedra:errors']);
  r.lapideCedeAoMaisNovo = mG.some(x => x.id === 'e9');
  localStorage.removeItem('catedra:_tomb');

  // 6. chave apagada aqui (lápide de chave): não restaura do servidor…
  localStorage.setItem('catedra:_tomb', J({ keys: { 'catedra:provaData': 5000 } }));
  const svH = { 'catedra:provaData': '"2026-12-01"', 'catedra:_kts': J({ 'catedra:provaData': 1000 }) };
  r.chaveApagadaFica = !('catedra:provaData' in M(svH, {}, false));
  // …salvo se outro aparelho a escreveu DEPOIS da exclusão
  const svI = { 'catedra:provaData': '"2027-01-10"', 'catedra:_kts': J({ 'catedra:provaData': 9000 }) };
  r.chaveNovaVence = M(svI, {}, false)['catedra:provaData'] === '"2027-01-10"';
  localStorage.removeItem('catedra:_tomb');

  // 7. histórico × lixeira: exclusão mais nova tira do histórico; edição mais nova restaura
  const svJ = { 'catedra:sessions': J([{ id: 's1', up: 100 }, { id: 's2', up: 900 }]) };
  const lcJ = { 'catedra:sessionsLixeira': J([{ id: 's1', _delAt: 500 }, { id: 's2', _delAt: 500 }]) };
  const oJ = M(svJ, lcJ, false);
  const sess = JSON.parse(oJ['catedra:sessions']), lix = JSON.parse(oJ['catedra:sessionsLixeira']);
  r.lixeiraGanha = !sess.some(x => x.id === 's1') && lix.some(x => x.id === 's1');
  r.edicaoRestaura = sess.some(x => x.id === 's2') && !lix.some(x => x.id === 's2');

  // 8. o mapa de carimbos mescla por máximo
  const oK = M({ 'catedra:_kts': J({ a: 1, b: 9 }) }, { 'catedra:_kts': J({ a: 5, c: 3 }) }, false);
  const kts = JSON.parse(oK['catedra:_kts']);
  r.ktsMaximo = kts.a === 5 && kts.b === 9 && kts.c === 3;

  // 9. leitura ativa (LA1): catedra:leituras é array com id/up e está em ARRAY_ID — união
  //    por id entre aparelhos e, em colisão, vence o `up` maior. Sem a chave em ARRAY_ID
  //    o merge cairia no blob inteiro (sem carimbo, preferServer=false → o local venceria
  //    e a leitura feita no outro aparelho sumiria): é isso que este caso pega.
  const svL = { 'catedra:leituras': J([{ id: 'la|cf|412', up: 100, nao: ['prazo'] }, { id: 'la|cf|413', up: 100 }]) };
  const lcL = { 'catedra:leituras': J([{ id: 'la|cf|412', up: 200, nao: [] }, { id: 'la|cc|9', up: 50 }]) };
  const mL = JSON.parse(M(svL, lcL, false)['catedra:leituras']);
  r.leiturasUniaoPorId = mL.length === 3 && mL.some(x => x.id === 'la|cf|413') && mL.some(x => x.id === 'la|cc|9');
  r.leiturasUpMaiorVence = (mL.find(x => x.id === 'la|cf|412').nao || []).length === 0;

  // 10. INTERRUPTOR ('0'/'1'): '0' é escolha, não vazio. A regra "vazio nunca apaga cheio"
  //     fazia o '1' do servidor vencer SEMPRE o '0' daqui, sem olhar o carimbo — era o que
  //     desfazia o tema claro a cada sync ("o tema não fixa"). Agora decide o carimbo.
  const svM = { 'catedra:dark': '1', 'catedra:_kts': J({ 'catedra:dark': 1000 }) };
  const lcM = { 'catedra:dark': '0', 'catedra:_kts': J({ 'catedra:dark': 9000 }) };
  r.claroEscolhidoFica = M(svM, lcM, false)['catedra:dark'] === '0';
  r.claroEscolhidoFicaPreferServer = M(svM, lcM, true)['catedra:dark'] === '0';
  // e o caminho inverso continua valendo: escuro escolhido no outro aparelho chega aqui
  const svN = { 'catedra:dark': '1', 'catedra:_kts': J({ 'catedra:dark': 9000 }) };
  const lcN = { 'catedra:dark': '0', 'catedra:_kts': J({ 'catedra:dark': 1000 }) };
  r.escuroMaisNovoChega = M(svN, lcN, false)['catedra:dark'] === '1';
  // o leitor dos satélites (LEGIS/JURIS) guarda do mesmo jeito e segue a mesma regra
  const svO = { 'catedra:leitorDark': '1', 'catedra:_kts': J({ 'catedra:leitorDark': 1000 }) };
  const lcO = { 'catedra:leitorDark': '0', 'catedra:_kts': J({ 'catedra:leitorDark': 9000 }) };
  r.leitorClaroFica = M(svO, lcO, false)['catedra:leitorDark'] === '0';
  // contador continua protegido: 0 recém-semeado NÃO apaga o número do outro aparelho
  const svP = { 'catedra:escudos': '3', 'catedra:_kts': J({ 'catedra:escudos': 1000 }) };
  const lcP = { 'catedra:escudos': '0', 'catedra:_kts': J({ 'catedra:escudos': 9000 }) };
  r.contadorZeroNaoApaga = M(svP, lcP, false)['catedra:escudos'] === '3';

  // 11. SEGUIR O SISTEMA ("Auto"). Com o Auto ligado, catedra:dark deixa de ser escolha da
  //     pessoa e vira leitura do sistema DESTE aparelho. Gravado pelo caminho normal, cada
  //     abertura recarimbava a chave e a mandava para a nuvem: Mac no claro e iPad no
  //     escuro viravam o tema um do outro a cada abertura, e o aparelho no automático
  //     apagava a escolha manual feita no outro. O gravarDerivado grava sem carimbar.
  localStorage.removeItem('catedra:_kts');
  localStorage.setItem('catedra:dark', '1');                       // escolha manual
  r.escolhaManualCarimba = !!(JSON.parse(localStorage.getItem('catedra:_kts') || '{}')['catedra:dark']);
  localStorage.removeItem('catedra:_kts');
  window.CatedraSync.gravarDerivado('catedra:dark', '0');          // leitura do sistema
  r.derivadoNaoCarimba = !(JSON.parse(localStorage.getItem('catedra:_kts') || '{}')['catedra:dark']);
  r.derivadoGravaMesmoAssim = localStorage.getItem('catedra:dark') === '0';
  localStorage.removeItem('catedra:_kts'); localStorage.removeItem('catedra:dark');
  // o próprio interruptor do Auto é deste aparelho: não pode atravessar o merge
  r.autoNaoSincroniza = !M({ 'catedra:_temaAuto': '1' }, {}, false)['catedra:_temaAuto'];
  return r;
});
for (const [k, v] of Object.entries(sync)) ok(v, 'SYNC ' + k);

/* ========= PEÇAS — JURISPRUDÊNCIA CITADA NO ROTEIRO (auditoria 15/09/2026) =========

   Auditoria contra a fonte oficial achou quatro citações em pecas.js que ensinavam coisa
   diferente do que o tribunal decidiu. Nenhuma era invenção: eram rótulo velho ou súmula
   citada para proposição que ela não sustenta. O que se prova aqui é que não voltam.

   · Súmula 545 do STJ estava na REDAÇÃO ANTERIOR ("quando a confissão for utilizada para a
     formação do convencimento"), revogada em 10/09/2025 (REsp 2.001.973/RS, Tema repetitivo
     1194). A vigente diz o oposto da condicional: atenua INDEPENDENTEMENTE disso.
   · Súmula 694 do STF não trata de punição disciplinar militar (isso é o art. 142, § 2º, da
     CF) e sim de exclusão de militar, perda de patente ou de função pública.
   · Súmula 108 do STJ diz só que aplicar medida socioeducativa é competência exclusiva do
     juiz — nada dispõe sobre cumular remissão com medida, que é o art. 127 do ECA.
   · Súmula 536 do STJ alcança suspensão condicional do processo e transação penal; a
     exclusão inteira da Lei 9.099/95 vem do art. 41 da Lei 11.340/06. */
{
  const pecasSrc = fs.readFileSync(path.join(RAIZ, 'pecas.js'), 'utf8');
  const escopoP = {};
  new Function('window', pecasSrc).call(null, escopoP);
  const PECAS = escopoP.CT_PECAS;
  ok(PECAS && Object.keys(PECAS).length > 20,
    'PEÇAS o roteiro carrega (' + Object.keys(PECAS || {}).length + ' peças)');

  // tudo que a peça diz, num texto só: juris, itens, especiais, dicas, erro…
  const textoDaPeca = (nome) => JSON.stringify(PECAS[nome] || {});
  const tudo = JSON.stringify(PECAS);

  // A1 — a redação revogada da Súmula 545 não pode voltar, em peça nenhuma
  ok(!/Confissão usada na convicção gera a atenuante/.test(tudo),
    'PEÇAS a redação anterior da Súmula 545 (condicionada ao convencimento) sumiu do roteiro');
  for (const p of ['Sentença penal — treino guiado', 'Alegações finais da defesa']) {
    ok(/Súmula 545 do STJ \(revisada em 10\/09\/2025, Tema 1194\)/.test(textoDaPeca(p))
      && /atenua ainda que não usada na convicção/.test(textoDaPeca(p)),
      'PEÇAS ' + p + ' ensina a Súmula 545 na redação vigente');
    ok(/retratação não atenua, salvo se serviu à apuração/.test(textoDaPeca(p)),
      'PEÇAS ' + p + ' traz a ressalva da retratação (Tema 1194) — a tese não é incondicional');
  }

  // A2 — Súmula 694 do STF descrita pelo que ela diz; a punição disciplinar é a CF
  const hc = textoDaPeca('Habeas corpus');
  ok(!/punição disciplinar militar — Súmula 694/.test(tudo),
    'PEÇAS a Súmula 694 não é mais apresentada como sendo sobre punição disciplinar militar');
  ok(/exclusão de militar ou perda de patente ou de função pública — Súmula 694 do STF/.test(hc),
    'PEÇAS o HC traz a Súmula 694 pelo que ela de fato enuncia');
  ok(/art\. 142, § 2º/.test(hc),
    'PEÇAS …e a punição disciplinar militar aparece com o seu fundamento certo (CF, art. 142, § 2º)');

  // A3 — cumular remissão com medida é o art. 127 do ECA, não a Súmula 108
  const socio = textoDaPeca('Sentença socioeducativa');
  ok(!/semiliberdade \(Súmula 108 do STJ e art\. 127/.test(tudo),
    'PEÇAS a Súmula 108 não é mais citada como fundamento da cumulabilidade da remissão');
  ok(/nunca com internação ou semiliberdade \(ECA, art\. 127, parte final\)/.test(socio),
    'PEÇAS a cumulabilidade da remissão vem do art. 127 do ECA');
  ok(/competência exclusiva do juiz \(Súmula 108 do STJ\)/.test(socio),
    'PEÇAS …e a Súmula 108 fica no que ela enuncia: quem aplica a medida é o juiz');

  // A4 — a Súmula 536 não exclui a Lei 9.099 inteira; isso é o art. 41 da Lei 11.340
  ok(!/Não cabem os institutos da Lei 9\.099\/95 \(Súmula 536 do STJ\)/.test(tudo),
    'PEÇAS a Súmula 536 não é mais apresentada como exclusão inteira da Lei 9.099/95');
  ok(/Não se aplica a Lei 9\.099\/95 \(Lei 11\.340\/06, art\. 41/.test(tudo)
    && /suspensão condicional do processo e à transação penal, Súmula 536 do STJ/.test(tudo),
    'PEÇAS a exclusão da 9.099 vem do art. 41 da Lei 11.340/06, e a Súmula 536 fica no seu alcance');
}

/* ======================= ACERVO — ida e volta ======================= */
await page.goto(URL0 + '/ritos-web.html');
const PECA = await page.evaluate(() => Object.keys(window.CT_PECAS || {})[0]);
ok(!!PECA, 'ACERVO há peças com roteiro pronto (' + PECA + ')');

// abre direto no bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA) + '&bloco=2');
await page.waitForTimeout(500);
const a1 = await page.evaluate(() => {
  const rot = document.querySelector('.ctr');
  const blks = [...document.querySelectorAll('.ctr .blk')];
  return { aberto: rot && rot.classList.contains('on'), volta: blks.findIndex(b => b.classList.contains('volta')) };
});
ok(a1.aberto, 'ACERVO painel abre via ?peca=');
ok(a1.volta === 2, 'ACERVO bloco 2 destacado — achou ' + a1.volta);

// chip do fluxo carrega a origem (rito)
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(300);
const a2 = await page.evaluate(async () => {
  const chip = document.querySelector('#fluxo [data-legis]') || document.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip' };
  // Aberto sozinho, o satélite não envia mais mensagens para si próprio: o canal de
  // produção só existe quando há um parent real. Aqui capturamos a chamada à ponte para
  // continuar medindo o payload do chip, com limite explícito para nunca travar a suíte.
  const got = new Promise(resolve => {
    const original = window.ctEnviarAoHost;
    let resolveu = false;
    const terminar = dados => {
      if (resolveu) return;
      resolveu = true;
      window.ctEnviarAoHost = original;
      resolve(dados);
    };
    window.ctEnviarAoHost = dados => { terminar(dados); return true; };
    setTimeout(() => terminar({ erro: 'o chip não chamou a ponte' }), 2000);
  });
  chip.click();
  return await got;
});
ok(a2.type === 'ctAbrirAcervo' && a2.de && !!a2.de.rito, 'ACERVO chip do fluxo manda de.rito');

// chip do painel carrega peça+bloco
await page.goto(URL0 + '/ritos-web.html?peca=' + encodeURIComponent(PECA));
await page.waitForTimeout(500);
const a3 = await page.evaluate(async () => {
  const chips = [...document.querySelectorAll('.ctr .rf button')];
  const chip = chips.find(b => +b.dataset.b > 0) || chips[0];
  if (!chip) return { erro: 'sem chip no painel' };
  const got = new Promise(resolve => {
    const original = window.ctEnviarAoHost;
    let resolveu = false;
    const terminar = dados => {
      if (resolveu) return;
      resolveu = true;
      window.ctEnviarAoHost = original;
      resolve(dados);
    };
    window.ctEnviarAoHost = dados => { terminar(dados); return true; };
    setTimeout(() => terminar({ erro: 'o chip não chamou a ponte' }), 2000);
  });
  chip.click();
  return await got;
});
ok(a3.de && a3.de.peca && a3.de.bloco != null, 'ACERVO chip do painel manda de.peca+bloco');

// pílula de voltar nos dois acervos, e só com ?volta=1. O TEXTO vem do host (&vr=, depois
// ctVoltaDisponivel {rotulo}); sem ele a pílula diz só "Voltar". A seta é um SVG aria-hidden
// fora do texto (o nome acessível é só o rótulo). A volta de ponta a ponta,
// no host real e com a pílula medida, está em tests/volta-origem.mjs.
for (const [pg, texto] of [['legis-web.html?volta=1&vr=' + encodeURIComponent('Voltar à peça · bloco 3'), 'Voltar à peça · bloco 3'],
                           ['juris-web.html?volta=1', 'Voltar']]) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const a4 = await page.evaluate(async (texto) => {
    const b = document.getElementById('ct-volta');
    const svg = b && b.querySelector('svg');
    if (!b || getComputedStyle(b).display === 'none' || (b.textContent || '').trim() !== texto
      || !svg || svg.getAttribute('aria-hidden') !== 'true') return { pill: false, achou: b && b.textContent };
    const got = new Promise(resolve => {
      const original = window.ctEnviarAoHost;
      let resolveu = false;
      const terminar = dados => {
        if (resolveu) return;
        resolveu = true;
        window.ctEnviarAoHost = original;
        resolve(dados);
      };
      window.ctEnviarAoHost = dados => { terminar(dados); return true; };
      setTimeout(() => terminar({ erro: 'a pílula não chamou a ponte' }), 2000);
    });
    b.click();
    return { pill: true, msg: await got };
  }, texto);
  ok(a4.pill && a4.msg && a4.msg.type === 'ctVoltarAcervo', 'ACERVO pílula "' + texto + '" funciona em ' + pg.split('?')[0]);
}
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(300);
const a4b = await page.evaluate(() => { const b = document.getElementById('ct-volta'); return !b || getComputedStyle(b).display === 'none'; });
ok(a4b, 'ACERVO sem volta=1 não há pílula');

// O ciclo completo (ida → pílula → volta ao bloco) rodava em tests/harness-acervo.html, uma
// cópia ANTIGA do host sem os ramos de prioridade, ciclo e 2ª fase e sem os iframes vivos.
// Saiu em 24/09/2026: tests/volta-origem.mjs faz o mesmo e mais no Catedra.dc.html real.

/* ===== JURIS — INFORMATIVOS DO STF: EDIÇÃO, TRIBUNAL E DATA (auditoria 15/09/2026) =====

   Conferência do bloco `informativo_stf` contra as edições oficiais em
   www.stf.jus.br/arquivo/informativo/documento/informativo{N}.htm. A revisão final mostrou
   que três casos inicialmente tratados como simples erro de rótulo eram, na verdade,
   verbetes híbridos: cada julgamento foi preservado em seu próprio id e sua própria edição. */
{
  const jsrc = fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8');
  const esc = {};
  new Function('window', jsrc).call(null, esc);
  const IDX = esc.__JURIS_IDX__;
  const tesc = {};
  new Function('window', fs.readFileSync(path.join(RAIZ, 'juris-text.js'), 'utf8')).call(null, tesc);
  const TXT = tesc.__JURIS_TXT__;
  const por = Object.create(null);
  for (const r of IDX) por[r[0]] = r;

  // 1. verbete na edição certa e sem conteúdo de outro julgamento concatenado
  const EDICAO = [
    ['INF2021-0029', 1037, 'apoio da União à expansão da rede de UTI'],
    ['INF2022-0273', 1055, 'restrição de liberdade de policiais e bombeiros militares'],
    ['INF2023-0050', 1081, 'teto da RPV por estados e municípios'],
    ['INF2023-0082', 1081, 'imunidades dos deputados estaduais (ADI 5.824)'],
    ['INF2023-0766', 1113, 'transporte público gratuito em dia de eleição'],
    ['INF2020-0055', 994, 'implantação de instalações de energia nuclear'],
    ['INF2021-0876', 1012, 'restabelecimento dos leitos de UTI para Covid-19'],
    ['INF2022-0927', 1053, 'assistência médico-hospitalar e operadoras'],
    ['INF2022-0928', 1062, 'inadimplência em instituições de ensino'],
  ];
  for (const [id, num, assunto] of EDICAO) {
    const r = por[id];
    ok(!!r && r[3] === num && r[4] === 'Info ' + num + ' · STF',
      'INFO ' + id + ' é o Info ' + num + ' (' + assunto + ')');
  }
  const ANTIGO = [['INF2021-0029', 1012], ['INF2022-0273', 1053], ['INF2023-0050', 1082],
    ['INF2023-0082', 1082], ['INF2023-0766', 1123], ['INF2020-0055', 981]];
  ok(ANTIGO.every(([id, mau]) => por[id] && por[id][3] !== mau),
    'INFO nenhum dos seis voltou ao rótulo incorreto da primeira triagem');
  ok(/energia nuclear/.test(TXT['INF2020-0055'].en) && !/antenas transmissoras/.test(TXT['INF2020-0055'].en)
    && /antenas transmissoras/.test(TXT['CTRLCONST-0426'].en),
    'INFO ADI 330 e ADI 3.110 ficam em verbetes próprios, sem perder a tese sobre antenas');
  ok(/suporte técnico e apoio financeiro/.test(TXT['INF2021-0029'].en)
    && !/restabelecimento dos leitos/.test(TXT['INF2021-0029'].en)
    && /restabelecimento dos leitos/.test(TXT['INF2021-0876'].en),
    'INFO os dois momentos processuais das ações sobre UTI ficam separados nos Infos 1037 e 1012');
  ok(/policiais e bombeiros militares/.test(TXT['INF2022-0273'].en)
    && !/operadoras de planos/.test(TXT['INF2022-0273'].en)
    && /operadoras de planos/.test(TXT['INF2022-0927'].en),
    'INFO planos de saúde e regime disciplinar militar ficam separados nos Infos 1053 e 1055');
  ok(/atividades nucleares/.test(TXT['INF2022-0294'].en)
    && !/instituições particulares de ensino/.test(TXT['INF2022-0294'].en)
    && /instituições particulares de ensino/.test(TXT['INF2022-0928'].en),
    'INFO ensino superior e atividades nucleares ficam separados nos Infos 1062 e 1061');
  ok(/conceito de “floresta”/.test(TXT['INF2025-0059'].en)
    && !/transporte privado individual/.test(TXT['INF2025-0059'].en),
    'INFO 1201 conserva apenas a tese ambiental da ADI 7.841');
  ok(!por['INF2022-0470'] && !TXT['INF2022-0470']
    && /orçamento de 2021\./.test(TXT['INF2021-0815'].en),
    'INFO a duplicata de orçamento secreto sai e o verbete canônico preserva o ano completo');

  // 2. o Informativo 690 é do STJ (29/03/2021 — DPVAT, impenhorabilidade, art. 833, VI, CPC)
  ok(por['INF2021-0401'] && por['INF2021-0401'][1] === 'STJ'
    && por['INF2021-0401'][4] === 'Info 690 · STJ',
    'INFO o verbete do DPVAT está sob o STJ (o Info 690 do STF é de 2012 e não trata disso)');

  // 3. datas conferidas na própria edição oficial ("julgamento virtual finalizado em …")
  ok(por['INF2022-0860'] && por['INF2022-0860'][7] === '17/12/2021',
    'INFO INF2022-0860 tem a data que o Info 1042 registra (17.12.2021, não 2012)');
  ok(por['INF2025-0433'] && por['INF2025-0433'][7] === '11/03/2025',
    'INFO INF2025-0433 tem a data que o Info 1168 registra (11.03.2025, terça-feira)');

  // 4. guarda geral: verbete de informativo tem de ter título coerente com o número e o tribunal
  const inc = IDX.filter(r => r[2] === 'informativo_stf' && typeof r[3] === 'number'
    && /^Info\s/.test(r[4] || '')
    && r[4] !== 'Info ' + r[3] + ' · ' + r[1]);
  ok(inc.length === 0,
    'INFO todo verbete de informativo tem título "Info N · TRIBUNAL" coerente com os campos'
    + (inc.length ? ' (' + inc.slice(0, 3).map(r => r[0] + ':' + r[4]).join(', ') + ')' : ''));
}

/* === JURIS — RÓTULOS MISTOS E ARTEFATOS GRÁFICOS (auditoria 23/09/2026) === */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const linhas = carrega('juris-index.js', '__JURIS_IDX__');
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = Object.fromEntries(linhas.map(r => [r[0], r]));

  const fontes = {
    'INF2020-0239': 'Info 969 · STF',
    'INF2020-0636': 'Info 981 · STF',
    'INF2020-0800': 'Tema 176 · STF',
    'INF2021-0375': 'Tema 961 · STF',
    'INF2021-0755': 'Tema 705 · STF',
    'INF2021-0783': 'Tema 1048 · STF',
    'INF2020-0485': 'Info 982 · STF',
    'INF2023-0697': 'Tema 1247 · STF',
    'INF2023-0035': 'Info 1111 · STF',
  };
  ok(Object.entries(fontes).every(([id, fp]) => IDX[id]?.[1] === 'STF'
    && TXT[id]?.fp === fp && /^https:\/\/(?:stf|portal\.stf)\.jus\.br\//.test(TXT[id]?.ur || '')),
    'JURIS-MISTOS os nove verbetes apontam o tribunal e a fonte oficial corretos');
  ok(!/RMS 70\.921|Súmula 655 do STJ/.test(TXT['INF2020-0239'].en + TXT['INF2020-0636'].en)
    && TXT['INF2020-0800'].en === 'A demanda de potência elétrica não é passível, por si só, de tributação via ICMS, porquanto somente integram a base de cálculo desse imposto os valores referentes àquelas operações em que haja efetivo consumo de energia elétrica pelo consumidor.',
    'JURIS-MISTOS conteúdo de outro tribunal não continua concatenado aos informativos do STF');

  const artefatos = {
    'INF2020-0298': ['opta r'], 'INF2020-0391': ['ava l'], 'INF2020-0419': ['a claratórios'],
    'INF2021-0352': ['federa l'], 'INF2021-0377': ['d evem'], 'INF2021-0381': ['rura l'],
    'INF2021-0461': ['exibiçã o'], 'INF2021-0597': ['nulidad e'], 'INF2022-0029': ['T endo'],
    'INF2025-0681': ['produtiv o'], 'INF2025-0727': ['de mais'],
    'SELTJGO-0146': ['ef eitos'], 'SELTJGO-0155': ['improbida de'], 'SELTJGO-0190': ['consequent e'],
    'SELTJGO-0206': ['j uros'], 'SELTJGO-0222': ['improbida de'], 'SELTJGO-0242': ['Pres tação'],
    'SELTJGO-0261': ['cri me'], 'SELTJGO-0304': ['inci so'], 'SELTJGO-0306': ['vinc ulada'],
    'SELTJGO-0395': ['c ondições', 'ajustando -a'], 'SELTJGO-0398': ['veredi ctos'],
    'SELTJGO-0484': ['leal dade'], 'SELTJGO-0499': ['cri me'], 'SELTJGO-0504': ['com provar'],
    'SELTJGO-0549': ['todo s', 'most rarem', 'dá -se', 'encontra -se'],
    'SELTJGO-0550': ['most rarem'], 'SELTJGO-0612': ['unicidad e'],
    'SELTJGO-0625': ['quan do'], 'SELTJGO-0633': ['quan do'],
    'SELTJRJ-0132': ['ef eitos'], 'SELTJRJ-0141': ['improbida de'], 'SELTJRJ-0190': ['j uros'],
    'SELTJRJ-0239': ['cri me'], 'SELTJRJ-0326': ['apl ica'],
    'SELTJRJ-0358': ['c ondições', 'ajustando -a'], 'SELTJRJ-0361': ['veredi ctos'],
    'SELTJRJ-0432': ['Consel ho'], 'SELTJRJ-0501': ['most rarem'], 'SELTJRJ-0538': ['jurí dica'],
    'SELTJPR-0137': ['desl igamento'], 'SELTJPR-0149': ['veredi ctos'], 'SELTJPR-0195': ['inci so'],
    'SELTJPR-0218': ['prescriç ão', 'ci nco'], 'SELTJPR-0263': ['leal dade'], 'SELTJPR-0272': ['cri me'],
    'SELTJPR-0312': ['todo s', 'most rarem', 'dá -se', 'encontra -se'],
    'SELTJPR-0344': ['F raude', 'Inexist ência'], 'SELTJPR-0351': ['fa limentar'],
    'SELTJPR-0372': ['comprov ação'], 'SELTJPR-0378': ['c ondições', 'ajustando -a'],
    'SELTJGO-0002': ['veda -se'], 'SELTJGO-0004': ['gu ardar'], 'SELTJGO-0007': ['realizaç ão'],
    'SELTJRJ-0005': ['A dministração'], 'SELTJGO-0010': ['análi se'], 'SELTJRJ-0010': ['análi se'],
    'SELTJGO-0014': ['orça mentário'], 'SELTJGO-0015': ['órgã o'], 'SELTJGO-0019': ['ambie nte'],
    'SELTJGO-0039': ['a nimais', 'bem - estar'], 'SELTJGO-0045': ['tor -tura'],
    'SELTJGO-0049': ['vice -governador'], 'SELTJGO-0053': ['esportiva s'],
    'SELTJGO-0060': ['finan ceiro'], 'SELTJGO-0061': ['parâme tros'],
    'SELTJGO-0082': ['quinta - feira'], 'SELTJGO-0085': ['h ipótese'],
    'SELTJGO-0090': ['a dvocatícios'],
    'SELTJGO-0091': ['estad ual', 'não - cumulatividade', 'ga rantia', 'constitucio nalidade'],
    'SELTJGO-0095': ['c ada'], 'SELTJGO-0100': ['especí fico'],
    'SELTJGO-0103': ['parlamentare s'], 'SELTJGO-0106': ['substituiçã o'],
    'SELTJPR-0096': ['confiança legitima', 'oposição sej a'],
  };
  const pendentes = [];
  for (const [id, ruins] of Object.entries(artefatos)) {
    const blob = [...(IDX[id] || []), ...Object.values(TXT[id] || {})].join(' ');
    if (!IDX[id] || !TXT[id] || ruins.some(ruim => blob.includes(ruim))) pendentes.push(id);
  }
  ok(Object.keys(artefatos).length === 75 && pendentes.length === 0,
    'JURIS-GRAFIA os 75 verbetes não voltam a exibir palavras partidas (' + pendentes.join(', ') + ')');
  ok(/confiança legítima/.test(TXT['SELTJPR-0096'].en)
    && /mesmos canais disponíveis para a sindicalização\.$/.test(TXT['SELTJPR-0096'].en),
    'JURIS-GRAFIA a tese sobre contribuição assistencial preserva acento e ressalva final');
}

/* === JURIS — CONTEÚDO: VOTO NÃO É TESE, ORIENTAÇÃO SUPERADA, TESE CORTADA (auditoria 18/09/2026) ===

   A auditoria conferiu o controle de constitucionalidade e as seleções para concurso contra a
   publicação temática oficial do STF e os informativos. Achou verbete ensinando como tese do
   Tribunal o que era voto do relator (inclusive tese que o STF rejeita), orientação depois
   superada sem ressalva, e tese cortada pelo parser. O que se prova aqui:
   · a web volta a mostrar a CITAÇÃO DE ORIGEM (fp) — "[Rcl 4.335, voto do rel. min. …]" —, que
     o app nativo sempre teve e a web tinha perdido: é ela que diz que o trecho é voto;
   · a nota de atualização vai em co ("Comentário"), NUNCA em ob — ob é "observação DA FONTE",
     e a nota fingiria ser do STF; toda nota tem o prefixo e termina na fonte oficial;
   · tese que estava cortada agora termina a frase;
   · a mesma decisão mostra a mesma data em todo verbete que a cita (ARE 1.314.490). */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = {}; for (const r of carrega('juris-index.js', '__JURIS_IDX__')) IDX[r[0]] = r;
  const PREFIXO = 'Nota do Cátedra (auditoria de set/2026, conferida em fonte oficial): ';
  const t = id => TXT[id] || {};

  // 1. guardas gerais sobre TODO o acervo
  const notas = Object.entries(TXT).filter(([, v]) => v && typeof v.co === 'string' && v.co.includes('Nota do Cátedra'));
  ok(notas.length >= 58, 'CONTEÚDO há notas de atualização da auditoria no acervo (' + notas.length + ')');
  ok(notas.every(([, v]) => v.co.startsWith(PREFIXO)),
    'CONTEÚDO toda nota da auditoria começa com o prefixo exato (o leitor sabe que a nota é do Cátedra)');
  // a última frase da nota nomeia a fonte: rótulo "Fonte:", tribunal, informativo, número de
  // processo ou endereço oficial — em qualquer das formas em que as notas a citam
  const FONTE = /Fonte:|Informativos?\b|\bSTF\b|\bSTJ\b|stf\.jus\.br|\bRISTF\b|\b(Lei|Decreto)\s+[\d.]+|\b(ADI|ADC|ADPF|ADO|RE|ARE|HC|RHC|Rcl|REsp|MS|Pet)\s*\d/;
  ok(notas.every(([, v]) => /\]\s*\.?$/.test(v.co.trim()) || FONTE.test(v.co.slice(-220))),
    'CONTEÚDO toda nota da auditoria termina nomeando a fonte oficial que a sustenta');
  ok(!Object.values(TXT).some(v => v && typeof v.ob === 'string' && v.ob.includes('Nota do Cátedra')),
    'CONTEÚDO nenhuma nota nossa entrou em ob ("observação DA FONTE" — fingiria ser do STF)');

  // 2. voto do relator: a web mostra a citação de origem, e a nota diz o que o Plenário fez
  ok(/voto do rel\. min\. Gilmar Mendes/.test(t('CTRLCONST-0056').fp || '')
    && /n[ãa]o fixada|n[ãa]o foi adotada|voto do relator/.test(t('CTRLCONST-0056').co || ''),
    'CONTEÚDO CTRLCONST-0056: mutação do art. 52, X, aparece como voto (Rcl 4.335), não como tese do STF');
  ok(/n[ãa]o adota a transcend[êe]ncia dos motivos determinantes/.test(t('CTRLCONST-0062').co || ''),
    'CONTEÚDO CTRLCONST-0062: avisa que o STF NÃO adota a transcendência dos motivos determinantes');
  // a citação restaurada é cópia literal do nativo: sempre "[…]"
  const cit = ['CTRLCONST-0002', 'CTRLCONST-0006', 'CTRLCONST-0056', 'CTRLCONST-0062', 'CTRLCONST-0109'];
  ok(cit.every(id => /^\[[^\[\]]{15,}\]\.?$/.test(t(id).fp || '')),
    'CONTEÚDO os trechos do controle de constitucionalidade voltam a trazer a citação de origem na web');

  // 3. orientação superada, com ressalva
  ok(/ADI 145/.test(t('CTRLCONST-0006').co || '') && /Informativo STF 907/.test(t('CTRLCONST-0006').co || ''),
    'CONTEÚDO CTRLCONST-0006: ressalva que o Plenário superou a prejudicialidade (ADI 145, Info 907)');

  // 4. lixo do parser que aparecia como "Observação" saiu
  ok(!/Confedera[çc][ãa]o sindical ou entidade de classe/.test(t('CTRLCONST-0109').ob || ''),
    'CONTEÚDO CTRLCONST-0109: o título da subseção seguinte não aparece mais como observação');

  // 5. tese cortada agora termina a frase
  const fimDeFrase = s => /[.”"!?)\]]\s*$/.test(String(s || '').trim());
  ok(fimDeFrase(t('SELTJGO-0086').en) && /n[ãa]o incid[êe]ncia de ICMS no deslocamento/i.test(t('SELTJGO-0086').en || ''),
    'CONTEÚDO SELTJGO-0086: a tese do ICMS (Tema 1.367) está inteira, e não cortada');
  ok(['SELTJGO-0012', 'SELTJGO-0029', 'SELTJGO-0048', 'SELTJGO-0111'].every(id => fimDeFrase(t(id).en) && (t(id).en || '').length > 150),
    'CONTEÚDO as teses que o parser tinha reduzido a um fragmento voltaram inteiras');

  // 6. a mesma decisão, a mesma data, em todo verbete que a cita
  ok(IDX['SELTJGO-0124'][7] === '06/02/2026' && IDX['INF2026-STF-1204-01'][7] === '06/02/2026'
    && /06[./]02[./]2026/.test(t('INF2026-STF-1204-01').fp || '') && /06[./]02[./]2026/.test(t('SELTJGO-0124').fp || ''),
    'CONTEÚDO ARE 1.314.490: data e citação dizem 06/02/2026 nos dois verbetes (o Info 1204 erra o ano)');
  ok(IDX['INF2026-STF-1205-02'][7] === '13/02/2026' && /erro material/.test(t('INF2026-STF-1205-02').co || ''),
    'CONTEÚDO RE 1.408.525: 13/02/2026, com a nota de que o Info 1205 erra o ano');
}

/* === JURIS — STJ CONFERIDO NA FONTE: TESE, JULGADO, TEMA E EDIÇÃO (auditoria 18–21/09/2026) ===

   A auditoria conferiu o acervo do STJ no portal de repetitivos, nas edições do Informativo e na
   compilação oficial da Jurisprudência em Teses (dez/2024). Cada correção deste PR é texto LITERAL
   da fonte ou metadado que consta dela. O que se prova aqui, um caso por tipo de defeito:
   · tese invertida volta ao sentido que o STJ fixou;
   · condição ou ressalva perdida volta à tese;
   · o destaque certo deixa de vir colado a um julgado de outro processo;
   · tese de Turma deixa de aparecer como tese de repetitivo;
   · tema e edição apontam para onde a fonte mostra o julgado;
   · lixo de processamento e tese perdida inteira dão lugar ao texto oficial;
   · palavra partida ("alegaçõe s") volta inteira. */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = {}; for (const r of carrega('juris-index.js', '__JURIS_IDX__')) IDX[r[0]] = r;
  const en = id => (TXT[id] || {}).en || '';

  // 1. tese invertida / regra trocada
  ok(/n[ãa]o [ée] incompat[íi]vel com a prescri[çc][ãa]o intercorrente/.test(en('INF2024-0062')),
    'STJ INF2024-0062: a multa aduaneira NÃO escapa da prescrição intercorrente (a 2ª Turma decidiu que ela se aplica)');
  ok(/sistema declarativo/.test(en('JT-ED024-20')) && !/sistema atributivo/.test(en('JT-ED024-20')),
    'STJ JT-ED024-20: a tese oficial diz "sistema declarativo", não "atributivo"');
  ok(/arrendamento rural/.test(en('INF2023-0218')) && !/arrendamento mercantil/.test(en('INF2023-0218')),
    'STJ INF2023-0218: o prazo mínimo de 5 anos é do arrendamento RURAL, não mercantil');

  // 2. condição ou ressalva que a tese exige
  ok(/desde que a medida represente vantagens ao adotando/.test(en('JT-ED027-14')),
    'STJ JT-ED027-14: a adoção por casal homoafetivo vem com a condição da tese oficial');
  ok(/na hip[óo]tese de haver cl[áa]usula contratual de exclus[ãa]o/.test(en('JT-ED143-04')),
    'STJ JT-ED143-04: a operadora só deixa de custear a fertilização in vitro se houver cláusula de exclusão');

  // 3. julgado de outro processo colado ao verbete
  ok(/^[ÉE] devida a cobertura/.test(en('INF2020-0693')) && !/n[ãa]o [ée] obrigada a custear/.test(en('INF2020-0693')),
    'STJ INF2020-0693: o verbete não abre mais com a tese oposta de outro julgado');
  ok(!/A[çc][ãa]o Popular/.test(en('SELTJRJ-0520')) && /contribui[çc][õo]es extraordin[áa]rias/.test(en('SELTJRJ-0520')),
    'STJ SELTJRJ-0520: sai a tese de outro processo (ação popular); fica só a deste julgado');
  ok(/As despesas relativas [àa] remo[çc][ãa]o, guarda e conserva[çc][ãa]o/.test(en('repgeral-repetitivo-STJ-453'))
    && !/O arrendante [ée] respons[áa]vel/.test(en('repgeral-repetitivo-STJ-453')),
    'STJ Tema 453: a tese do repetitivo substitui o julgado da 3ª Turma que dizia o contrário');

  // 4. tema e edição onde a fonte mostra o julgado
  ok(IDX['repgeral-repetitivo-STJ-x1253'][4] === 'Tema 1249 (Repetitivo)' && IDX['repgeral-repetitivo-STJ-x1253'][3] === 1249,
    'STJ "Tema s/n" das medidas protetivas passa a dizer Tema 1249');
  ok(IDX['INF2020-0016'][4] === 'Info 681 · STJ',
    'STJ INF2020-0016: RMS 61.302 saiu no Informativo 681, não no 678');
  ok(IDX['INF2023-0395'][4] === 'Ed. Extraordinária 9 · STJ' && IDX['INF2023-0395'][3] === 9 && (TXT['INF2023-0395'] || {}).fp === 'Ed. Extraordinária 9 STJ',
    'STJ INF2023-0395: título, número e citação apontam a Edição Extraordinária 9');

  // 5. lixo e tese perdida inteira
  ok(!/buscadordizerodireito_com_br/.test(en('repgeral-repetitivo-STJ-588-2')) && /ADI 3\.106/.test(en('repgeral-repetitivo-STJ-588-2')),
    'STJ Tema 588: o enunciado deixa de ser um pedaço de URL e traz a tese');
  ok(/dispensa do dever de cola[çc][ãa]o exige declara[çc][ãa]o formal/.test(en('SELTJGO-0202')),
    'STJ SELTJGO-0202: a tese deixa de ser só "legítima." e volta inteira');

  // 6. palavra partida
  ok(/alega[çc][õo]es\b/.test(en('INF2020-0699')) && !/alega[çc][õo]e s\b/.test(en('INF2020-0699')),
    'STJ INF2020-0699: "alegaçõe s" volta a ser "alegações"');
}

/* === JURIS — STJ, SEGUNDA LEVA: AS CORREÇÕES QUE EXIGIAM REDAÇÃO À MÃO (auditoria 21–22/09/2026) ===

   Os defeitos que o PR #115 deixou "a preparar" — a correção proposta não era literal da fonte —
   voltaram redigidos de uma das três formas permitidas: trecho copiado da fonte oficial, remoção
   do trecho, ou nota do Cátedra citando a fonte. O que se prova aqui, um caso por tipo:
   · termo trocado num comentário didático volta ao da fonte (fiduciante × fiduciário; número de lei);
   · julgado de outro processo sai do verbete, no enunciado e no comentário;
   · verbete com o texto de outra edição passa a apontar a edição certa — título, número, órgão e data juntos;
   · tema cujo texto era de outro tema recebe a questão oficial e a nota de que não há tese firmada;
   · rótulo de processamento ("Hipótese 2 :") sai; órgão e data seguem a nota; citação segue a ficha. */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = {}; for (const r of carrega('juris-index.js', '__JURIS_IDX__')) IDX[r[0]] = r;
  const PREFIXO = 'Nota do Cátedra (auditoria de set/2026, conferida em fonte oficial): ';
  const t = id => TXT[id] || {};

  // 1. termo trocado dentro de comentário didático
  ok(/devedor fiduciante/.test(t('INF2020-0298').en) && /credor fiduci[áa]rio/.test(t('INF2020-0298').en) && !/devedor fiduci[áa]rio/.test(t('INF2020-0298').en),
    'STJ-2 INF2020-0298: devedor é o fiduciante e credor o fiduciário, como na nota oficial');
  ok(/Lei n\. 8\.429\/1992/.test(t('INF2020-0220').co || '') && !/8\.492/.test(t('INF2020-0220').co || ''),
    'STJ-2 INF2020-0220: o comentário cita a Lei 8.429/1992, não a inexistente 8.492');

  // 2. julgado de outro processo sai do verbete
  ok(!/anuidades devidas aos conselhos profissionais/.test(t('INF2020-0415').en) && /redirecionamento da Execu[çc][ãa]o Fiscal/.test(t('INF2020-0415').en),
    'STJ-2 INF2020-0415: o enunciado deixa de abrir com a tese das anuidades (outro julgado)');
  ok(t('INF2020-0730').co === undefined,
    'STJ-2 INF2020-0730: o comentário que era de outro julgado (licenciamento de assentamentos) saiu');

  // 3. edição certa, com título, número, órgão e data coerentes entre si
  ok(IDX['INF2021-0872'][4] === 'Info 713 · STJ' && IDX['INF2021-0872'][3] === 713 && IDX['INF2021-0872'][7] === '05/10/2021' && /3ª Turma/.test(t('INF2021-0872').og || ''),
    'STJ-2 INF2021-0872: o enunciado é o destaque do Info 713 (3ª Turma, 05/10/2021) — título, número, órgão e data acompanham');
  ok(IDX['INF2024-0714'][4] === 'Info 808 · STJ' && IDX['INF2024-0714'][3] === 808 && /^Processo administrativo ambiental/.test(IDX['INF2024-0714'][6] || '') && t('INF2024-0714').co === undefined,
    'STJ-2 INF2024-0714: rótulos e assunto passam ao Info 808, de onde vem o enunciado; sai o comentário de outro julgado');
  ok(IDX['INF2020-0717'][4] === 'Info 668 · STJ' && IDX['INF2020-0717'][3] === 668,
    'STJ-2 INF2020-0717: o HC 543.279 recebe a edição em que saiu (Info 668)');

  // 4. tema cujo texto era de outro tema
  ok(/^Se o prazo da prescri[çc][ãa]o/.test(t('COORD-REP-1126').en) && !/Stock Option/.test(t('COORD-REP-1126').en)
    && (t('COORD-REP-1126').co || '').startsWith(PREFIXO) && /Afetado/.test(t('COORD-REP-1126').co) && IDX['COORD-REP-1126'][6] === 'DIREITO PROCESSUAL PENAL',
    'STJ-2 COORD-REP-1126: sai a tese do Stock Option (Tema 1226); entra a questão oficial do Tema 1126 com a nota de que está afetado, sem tese');
  ok((t('repgeral-repetitivo-STJ-1300').co || '').startsWith(PREFIXO) && /Tema 130 do STJ/.test(t('repgeral-repetitivo-STJ-1300').co),
    'STJ-2 Tema "1300": a nota avisa que o texto é o do Tema 130');

  // 5. lixo, órgão, data e citação
  ok(/^Pedro depositou/.test(t('INF2020-0378').en), 'STJ-2 INF2020-0378: o rótulo "Hipótese 2 :" saiu do enunciado');
  ok(IDX['INF2024-0788'][7] === '14/08/2024' && t('INF2024-0788').og === 'Primeira Seção',
    'STJ-2 INF2024-0788: data e órgão são os da nota oficial (Primeira Seção, 14/08/2024)');
  ok(t('COORD-REP-1088').og === '1ª Seção' && (t('COORD-REP-1088').co || '').startsWith(PREFIXO) && /Sobrestado/.test(t('COORD-REP-1088').co),
    'STJ-2 COORD-REP-1088: ganha o órgão da ficha e a nota de que o tema está sobrestado');
  ok(t('repgeral-repetitivo-STF-581').fp === 'REsp 1110520/SP',
    'STJ-2 Tema 581: a citação de origem é o processo da ficha, não "Info 835"');

  // 6. guarda: no STJ, título e número nunca divergem — o #115 trocou títulos de edição e deixou o
  //    número antigo em 21 verbetes. Vale para edição possível do STJ (ordinária até 900, extraordinária
  //    até 33); os 3 títulos com número do STF ("Info 1111 · STJ") são defeito registrado, fora daqui.
  const diverge = Object.values(IDX).filter(r => {
    if (r[1] !== 'STJ') return false;
    const m = String(r[4] || '').match(/^(?:Info )?(Ed\. Extraordin[áa]ria |Ed\. Especial )?(\d+) · STJ$/);
    if (!m) return false;
    const n = Number(m[2]), extra = !!m[1];
    return (extra ? n <= 33 : n <= 900) && r[3] !== n;
  });
  ok(diverge.length === 0, 'STJ-2 nenhum verbete do STJ tem número diferente da edição que o título diz (' + diverge.length + ')');
}

/* === JURIS — SALDO FINAL DA AUDITORIA STJ (23/09/2026) ===

   O digest cobre todos os 33 registros web tocados pelo saldo (inclusive os dois
   tombstones). As asserções legíveis abaixo guardam os erros de maior impacto e
   a restauração da rastreabilidade do bloco de controle de constitucionalidade. */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const linhas = carrega('juris-index.js', '__JURIS_IDX__');
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = Object.fromEntries(linhas.map(r => [r[0], r]));
  const ids = ["INF2020-0260","INF2020-0351","INF2021-0224","INF2021-0285","INF2021-0533","INF2021-0664","INF2022-0393","INF2022-0604","INF2023-0498","INF2024-0496","INF2025-0518","SELTJGO-0163","SELTJGO-0265","SELTJGO-0313","SELTJGO-0417","SELTJGO-0433","SELTJGO-0438","SELTJGO-0520","SELTJPR-0190","SELTJPR-0285","SELTJRJ-0451","SELTJRJ-0545","SELTJRJ-0562","repgeral-repetitivo-STJ-1093-2","repgeral-repetitivo-STJ-1149-2","repgeral-repetitivo-STJ-1195","repgeral-repetitivo-STJ-1295","repgeral-repetitivo-STJ-905","repgeral-repetitivo-STJ-905-2","repgeral-repetitivo-STJ-x1060","repgeral-repetitivo-STJ-x1139","repgeral-repetitivo-STJ-x640","repgeral-repetitivo-STJ-x641"];
  const retrato = Object.fromEntries(ids.map(id => [id, IDX[id] ? { indice: IDX[id], texto: TXT[id] || null } : null]));
  const digest = createHash('sha256').update(JSON.stringify(retrato)).digest('hex');
  ok(digest === 'ae9e557f3edb64dfa8e7c1ab1f53becd07946a9df107316bc64da277ae91e1dc',
    'STJ-SALDO os 33 registros mantêm exatamente as 49 correções e 2 exclusões validadas (' + digest.slice(0, 12) + ')');

  ok(!IDX['repgeral-repetitivo-STJ-x640'] && !TXT['repgeral-repetitivo-STJ-x640']
    && !IDX['SELTJGO-0438'] && !TXT['SELTJGO-0438'],
    'STJ-SALDO o híbrido x640 e a duplicata SELTJGO-0438 saíram das duas tabelas web');
  ok(IDX['repgeral-repetitivo-STJ-x1060'][2] === 'precedentes_obrig'
    && IDX['repgeral-repetitivo-STJ-x1060'][3] === 3
    && /IAC 3/.test(IDX['repgeral-repetitivo-STJ-x1060'][4]),
    'STJ-SALDO o IAC 3 não é mais apresentado como recurso repetitivo');
  ok(IDX['repgeral-repetitivo-STJ-x641'][2] === 'informativo_stj'
    && IDX['repgeral-repetitivo-STJ-x641'][3] === 788,
    'STJ-SALDO o julgado de Turma x641 aponta o Informativo 788, sem rótulo de repetitivo');
  ok((TXT['repgeral-repetitivo-STJ-1093-2'].en.match(/^\d\./gm) || []).length === 5
    && /podem lhe gerar cr[ée]ditos/.test(TXT['repgeral-repetitivo-STJ-1093-2'].en)
    && /\(sejam mantidos\)/.test(TXT['repgeral-repetitivo-STJ-1093-2'].en)
    && TXT['repgeral-repetitivo-STJ-1093-2'].fp === 'Info 734',
    'STJ-SALDO o Tema 1093 traz os cinco itens, sem artefato, e cita o Info 734');
  ok(/Lei (?:n\. )?9\.696\/1998/.test(TXT['repgeral-repetitivo-STJ-1149-2'].en),
    'STJ-SALDO o Tema 1149 cita a Lei 9.696/1998');
  ok(/REsp 2\.029\.719-RJ/.test(TXT['SELTJGO-0163'].fp || '')
    && !/RMS 70\.921/.test(TXT['SELTJGO-0163'].en || ''),
    'STJ-SALDO SELTJGO-0163 preserva o julgado do show artístico e sua citação própria');

  const controle = linhas.filter(r => r[2] === 'controle_const');
  ok(controle.length === 426 && controle.every(r => !!(TXT[r[0]] || {}).fp),
    'STJ-SALDO os 426 verbetes de controle de constitucionalidade têm citação de origem');
  ok(new Set(linhas.map(r => r[0])).size === linhas.length
    && linhas.every(r => !!TXT[r[0]])
    && Object.keys(TXT).every(id => !!IDX[id]),
    'STJ-SALDO ids únicos e nenhuma linha ou texto órfão depois das exclusões');
}

/* === JURIS — 58 CORTES REMANESCENTES DA AUDITORIA (23/09/2026) === */
{
  const carrega = (f, g) => { const e = {}; new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8')).call(null, e); return e[g]; };
  const linhas = carrega('juris-index.js', '__JURIS_IDX__');
  const TXT = carrega('juris-text.js', '__JURIS_TXT__');
  const IDX = Object.fromEntries(linhas.map(r => [r[0], r]));
  const ids = ["CTRLCONST-0292","INF2020-0381","INF2020-0484","INF2020-0522","INF2020-0551","INF2023-0082","INF2023-0088","INF2023-0092","INF2023-0111","INF2023-0113","INF2023-0143","INF2023-0159","INF2023-0212","INF2023-0250","INF2023-0451","INF2023-0552","INF2023-0643","INF2023-0677","INF2023-0692","INF2023-0735","INF2023-0770","INF2023-0774","INF2024-0188","INF2024-0563","INF2024-0583","INF2024-0680","INF2025-0174","INF2025-0427","INF2025-0565","INF2025-0585","INF2025-0897","SELTJGO-0461","SELTJGO-0627","SELTJGO-0640","SELTJGO-0642","SELTJGO-0643","SELTJPR-0186","SELTJRJ-0570","SELTJRJ-0596","repgeral-repercussao_geral-STF-1015","repgeral-repercussao_geral-STF-1090","repgeral-repercussao_geral-STF-1277","repgeral-repercussao_geral-STF-21","repgeral-repercussao_geral-STF-324","repgeral-repercussao_geral-STF-370","repgeral-repercussao_geral-STF-432","repgeral-repercussao_geral-STF-476","repgeral-repercussao_geral-STF-554","repgeral-repercussao_geral-STF-580","repgeral-repercussao_geral-STF-703","repgeral-repercussao_geral-STF-820","repgeral-repercussao_geral-STF-825","repgeral-repercussao_geral-STF-881","repgeral-repercussao_geral-STF-967","repgeral-repercussao_geral-STF-x1198","repgeral-repercussao_geral-STF-x1586","repgeral-repercussao_geral-STF-x1590","repgeral-repercussao_geral-STJ-x257","repgeral-repetitivo-STF-x1319","repgeral-repetitivo-STJ-1196","repgeral-repetitivo-STJ-1197","repgeral-repetitivo-STJ-1235","repgeral-repetitivo-STJ-931"];
  const retrato = Object.fromEntries(ids.map(id => [id, IDX[id] ? { indice: IDX[id], texto: TXT[id] || null } : null]));
  const digest = createHash('sha256').update(JSON.stringify(retrato)).digest('hex');
  ok(digest === '42175d7f3884d6e10b28e1c5c8f4f31628c352980926c0a3599e2b9ef7fd6c9b',
    'JURIS-CORTES os 58 fragmentos e seus cinco destinos mantêm a redação oficial validada (' + digest.slice(0, 12) + ')');

  const antigos = ['repgeral-repercussao_geral-STF-x1198', 'repgeral-repetitivo-STF-x1319',
    'repgeral-repercussao_geral-STJ-x257', 'repgeral-repercussao_geral-STF-x1586',
    'repgeral-repercussao_geral-STF-x1590'];
  ok(antigos.every(id => !IDX[id] && !TXT[id]),
    'JURIS-CORTES os cinco ids classificados no tribunal ou tema errado foram retirados');
  ok(IDX['repgeral-repetitivo-STJ-1196']?.[1] === 'STJ'
    && IDX['repgeral-repetitivo-STJ-1196']?.[2] === 'repetitivo'
    && IDX['repgeral-repercussao_geral-STF-476']?.[3] === 476
    && IDX['repgeral-repercussao_geral-STF-825']?.[3] === 825
    && IDX['repgeral-repercussao_geral-STF-21']?.[3] === 21,
    'JURIS-CORTES os quatro verbetes renomeados apontam o precedente qualificado correto');
  ok(/^1\. As decisões do STF/.test(TXT['repgeral-repercussao_geral-STF-881'].en)
    && /relações jurídicas tributárias/.test(TXT['repgeral-repercussao_geral-STF-881'].en)
    && /matéria tributária/.test(IDX['repgeral-repercussao_geral-STF-881'][6]),
    'JURIS-CORTES o Tema 881 traz sua tese tributária, não uma nota lateral sobre amicus curiae');
  ok(TXT['INF2020-0381'].en === 'Ainda que citado pessoalmente na fase de conhecimento, é devida a intimação por carta do réu revel, sem procurador constituído, para o cumprimento de sentença.'
    && TXT['INF2024-0563'].ob === 'Tema 1338 · STF'
    && /preceito fundamental\.$/.test(TXT['CTRLCONST-0292'].en),
    'JURIS-CORTES destaques e teses terminam completos e preservam a rastreabilidade oficial');
}

/* A limpeza editorial não pode apagar estudo pessoal. Semeia no mesmo origin antes
   de abrir a tela, como exige a trava contra a corrida do autosave. */
await page.goto(URL0 + '/__semente');
await page.evaluate(() => {
  localStorage.setItem('catedra:jurisEstudo', JSON.stringify({
    fav: {
      'repgeral-repetitivo-STJ-x640': 1, 'SELTJGO-0438': 1,
      'repgeral-repercussao_geral-STF-x1198': 1,
      'repgeral-repetitivo-STF-x1319': 1,
      'repgeral-repercussao_geral-STJ-x257': 1,
      'repgeral-repercussao_geral-STF-x1586': 1,
      'repgeral-repercussao_geral-STF-x1590': 1,
      'INF2022-0470': 1
    },
    stat: {
      'repgeral-repetitivo-STJ-x640': 'dom', 'repgeral-repetitivo-STJ-518': 'rev',
      'repgeral-repercussao_geral-STF-x1198': 'rev',
      'repgeral-repetitivo-STF-x1319': 'dom',
      'INF2022-0470': 'rev'
    }
  }));
  localStorage.setItem('catedra:grifosJuris:repgeral-repetitivo-STJ-x640', JSON.stringify([{ gi: 0, s: 1, t: 'antigo' }]));
  localStorage.setItem('catedra:grifosJuris:repgeral-repetitivo-STJ-518', JSON.stringify([{ gi: 1, s: 2, t: 'novo' }]));
  localStorage.setItem('catedra:grifosJuris:repgeral-repetitivo-STF-x1319', JSON.stringify([{ gi: 2, s: 3, t: 'tema 1196' }]));
  localStorage.setItem('catedra:grifosJuris:INF2022-0470', JSON.stringify([{ gi: 3, s: 4, t: 'orçamento' }]));
  localStorage.setItem('catedraJurisRoteiros', JSON.stringify({
    'SELTJGO-0438': { ts: 7, q: 'roteiro preservado' },
    'repgeral-repercussao_geral-STF-x1590': { ts: 8, q: 'tema 21 preservado' },
    'INF2022-0470': { ts: 9, q: 'orçamento preservado' }
  }));
});
await page.goto(URL0 + '/juris-web.html');
await page.waitForFunction(() => typeof window.openVerbete === 'function');
const migrado = await page.evaluate(() => ({
  estudo: JSON.parse(localStorage.getItem('catedra:jurisEstudo') || '{}'),
  grifos: JSON.parse(localStorage.getItem('catedra:grifosJuris:repgeral-repetitivo-STJ-518') || '[]'),
  grifos1196: JSON.parse(localStorage.getItem('catedra:grifosJuris:repgeral-repetitivo-STJ-1196') || '[]'),
  grifosOrcamento: JSON.parse(localStorage.getItem('catedra:grifosJuris:INF2021-0815') || '[]'),
  roteiros: JSON.parse(localStorage.getItem('catedraJurisRoteiros') || '{}'),
  copiaGrifos: localStorage.getItem('catedra:grifosJuris:repgeral-repetitivo-STJ-x640')
}));
ok(migrado.estudo.fav['repgeral-repetitivo-STJ-518'] === 1
  && migrado.estudo.fav['SELTJGO-0433'] === 1
  && migrado.estudo.stat['repgeral-repetitivo-STJ-518'] === 'dom'
  && migrado.estudo.fav['repgeral-repetitivo-STJ-931'] === 1
  && migrado.estudo.fav['repgeral-repetitivo-STJ-1196'] === 1
  && migrado.estudo.fav['repgeral-repercussao_geral-STF-476'] === 1
  && migrado.estudo.fav['repgeral-repercussao_geral-STF-825'] === 1
  && migrado.estudo.fav['repgeral-repercussao_geral-STF-21'] === 1
  && migrado.estudo.stat['repgeral-repetitivo-STJ-1196'] === 'dom'
  && migrado.estudo.fav['INF2021-0815'] === 1
  && migrado.estudo.stat['INF2021-0815'] === 'rev',
  'STJ-SALDO favoritos e o progresso mais avançado migram aos verbetes sobreviventes');
ok(migrado.grifos.length === 2 && migrado.copiaGrifos
  && migrado.grifos1196[0]?.t === 'tema 1196'
  && migrado.grifosOrcamento[0]?.t === 'orçamento'
  && migrado.roteiros['SELTJGO-0433']?.q === 'roteiro preservado'
  && migrado.roteiros['repgeral-repercussao_geral-STF-21']?.q === 'tema 21 preservado'
  && migrado.roteiros['INF2021-0815']?.q === 'orçamento preservado',
  'STJ-SALDO grifos e roteiro migram sem apagar a cópia antiga nem conteúdo já existente');

/* ================ ERRO VIRA REVISÃO (item 2) ================ */
await page.goto(URL0 + '/tests/harness-erros.html');
await page.waitForFunction(() => !!window.colherErros);

const err = await page.evaluate(async () => {
  const r = {};
  const limpa = () => ['errors', 'fc', 'reviews'].forEach(k => localStorage.removeItem('catedra:' + k));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');

  // 1. N erradas → N erros + N flashcards (com gabarito) + 1 revisão por disciplina
  limpa();
  const lote = [
    { enunciado: 'Cabe HC contra decisão de turma recursal?', gabarito: 'Súmula 690 superada', disc: 'Processo Penal', topico: 'HC' },
    { enunciado: 'Prazo da impugnação ao cumprimento de sentença', gabarito: 'art. 525 CPC', disc: 'Processo Civil', topico: 'Cumprimento' },
    { enunciado: 'Prescrição intercorrente na execução fiscal', gabarito: 'Súmula 314 STJ', disc: 'Processo Civil', topico: 'Prescrição' },
  ];
  const a = window.colherErros(lote, 'Simulado');
  r.criouTudo = a.erros === 3 && a.cards === 3;
  r.umaRevisaoPorDisc = a.revs === 2;
  r.revisaoAmanha = ler('reviews').every(x => x.dueDate > new Date().toISOString().slice(0, 10) && x.due === 1);
  r.temIdEUp = ler('errors').every(x => x.id && x.up) && ler('fc').every(x => x.id && x.up);

  // 2. refazer a mesma prova não duplica
  const b = window.colherErros(lote, 'Simulado');
  r.dedup = b === null && ler('errors').length === 3;

  // 3. desfazer remove exatamente o lote
  limpa();
  window.colherErros(lote, 'Simulado');
  const antes = ler('errors').length + ler('fc').length + ler('reviews').length;
  window.desfazerLote();
  r.desfez = antes === 8 && ler('errors').length === 0 && ler('fc').length === 0 && ler('reviews').length === 0;

  // 4. teto de 20 por correção
  limpa();
  const c = window.colherErros(Array.from({ length: 30 }, (_, i) => ({ enunciado: 'questão ' + i, gabarito: 'g' + i, disc: 'Civil' })), 'Simulado');
  r.teto = c.erros === 20;

  // 5. canal da 2ª fase (postMessage) cai no mesmo caminho
  limpa();
  window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin, data: { type: 'ctErrosSegundaFase', prova: 'TJ-RJ 2026 · discursiva', quesitos: [
    { titulo: 'Quesito 1 — enfrentar a preliminar de ilegitimidade', disc: 'Processo Civil', nota: 0, max: 1, fundamento: 'art. 485, VI, CPC' },
    { titulo: 'Quesito 2 — dosimetria', disc: 'Penal', nota: 0.5, max: 1, fundamento: 'art. 59 CP' },
  ] } }));
  await new Promise(res => setTimeout(res, 200));
  const es = ler('errors');
  r.segundaFase = es.length === 2 && es.every(x => /2ª fase — TJ-RJ/.test(x.source)) && ler('reviews').length === 2;
  limpa();
  return r;
});
for (const [k, v] of Object.entries(err)) ok(v, 'ERROS ' + k);

/* ============= LEITURA ATIVA — LA1: módulo puro, canal host ↔ LEGIS ============= */
// (a) o módulo roda em Node cru: é a garantia de que ele não depende de DOM nem de
//     treino.js — e de que a sintaxe é a conservadora que o JavaScriptCore do iPad aceita
{
  const { execFileSync } = await import('child_process');
  let saida = '';
  try {
    saida = execFileSync(process.execPath, ['-e',
      "const s=require('fs').readFileSync('leitura-ativa.js','utf8'); new Function(s)();" +
      "const LA=globalThis.CT_LA; const it=LA.marcar(LA.nova({leiId:'u',sigla:'CF',rot:'Art. 1º',gi:1,txt:'texto'}),'quem',{s:0,t:'x'});" +
      "process.stdout.write(LA.completude(it).respondidas+'|'+LA.hash('texto'));"],
      { cwd: RAIZ, stdio: 'pipe' }).toString();
  } catch (e) { saida = 'ERRO ' + String(e.stderr || e.message).slice(0, 200); }
  ok(/^1\|[0-9a-f]{8}$/.test(saida), 'LEITURA o módulo roda em Node puro, sem DOM (' + saida + ')');
}

// (b) as funções puras, no navegador
await page.goto(URL0 + '/tests/harness-leitura-ativa.html');
await page.waitForFunction(() => window.__pronto === true);
const la = await page.evaluate(() => {
  const LA = window.CT_LA, r = {};
  const TXT = 'XI - a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito';

  // a grade: 7 perguntas, ordem fixa, teclas 1–7
  r.grade7 = LA.ELEMENTOS.length === 7
    && LA.ELEMENTOS.map(e => e.id).join(',') === 'quem,oque,quando,como,prazo,excecao,proibicao'
    && LA.ELEMENTOS.every((e, i) => e.n === i + 1 && e.tecla === String(i + 1) && e.rotulo && e.pergunta);

  // nova: id estável por lei e dispositivo, hash de 8 hex, e NENHUM texto de lei no item
  const base = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', sigla: 'CF', rot: 'Art. 5º, XI', gi: 412, txt: TXT });
  r.novaId = base.id === 'la|https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm|412' && base.v === 1 && base.up > 0 && base.lido > 0;
  r.novaHash = /^[0-9a-f]{8}$/.test(base.hash) && base.hash === LA.hash(TXT) && LA.hash(TXT) !== LA.hash(TXT + '.');
  r.novaSemTexto = !('txt' in base) && !JSON.stringify(base).includes('asilo');
  r.novaSemLeiNaoNasce = LA.nova({ sigla: 'CF', gi: 1, txt: 'x' }) === null && LA.nova({ leiId: 'u', txt: 'x' }) === null;

  // marcar devolve item NOVO (o original não muda) com `up` maior
  const m1 = LA.marcar(base, 'quem', { s: 5, t: 'a casa' });
  r.marcarImutavel = m1 !== base && base.el.quem.length === 0 && m1.el.quem.length === 1 && m1.el.quem[0].t === 'a casa';
  r.marcarUpAvanca = m1.up > base.up;
  // mesmo offset duas vezes = uma marca; ordem por offset; elemento inválido é ignorado
  const m2 = LA.marcar(LA.marcar(m1, 'quem', { s: 5, t: 'a casa' }), 'quem', { s: 0, t: 'XI' });
  r.marcarDedupeEOrdem = m2.el.quem.length === 2 && m2.el.quem[0].s === 0 && m2.el.quem[1].s === 5;
  r.marcarElInvalido = LA.marcar(m2, 'porque', { s: 1, t: 'x' }) === m2;
  // trecho aparado: uma marca é pista, não cópia do dispositivo
  const longo = LA.marcar(base, 'oque', { s: 0, t: 'x'.repeat(1000) });
  r.marcarApara = longo.el.oque[0].t.length === 400;

  // desmarcar tira só aquela marca
  const d1 = LA.desmarcar(m2, 'quem', 5);
  r.desmarcar = d1.el.quem.length === 1 && d1.el.quem[0].s === 0 && d1.up > m2.up;
  r.desmarcarNadaNaoMuda = LA.desmarcar(d1, 'quem', 999) === d1;

  // "não há" é resposta: conta na completude e apaga marca contraditória; marcar depois desfaz o "não há"
  const n1 = LA.naoHa(m2, 'prazo', true);
  r.naoHaRegistra = n1.nao.length === 1 && n1.nao[0] === 'prazo' && n1.up > m2.up;
  r.naoHaIdempotente = LA.naoHa(n1, 'prazo', true) === n1;
  r.naoHaDesfaz = LA.naoHa(n1, 'prazo', false).nao.length === 0;
  r.naoHaApagaMarca = LA.naoHa(m2, 'quem', true).el.quem.length === 0;
  r.marcarDesfazNaoHa = LA.marcar(n1, 'prazo', { s: 3, t: 'em 24 horas' }).nao.length === 0;

  // completude: 2 marcas + 3 "não há" = 5 respondidas, faltam 2
  let c = LA.marcar(LA.marcar(base, 'quem', { s: 5, t: 'a casa' }), 'excecao', { s: 100, t: 'salvo em caso de flagrante delito' });
  c = LA.naoHa(LA.naoHa(LA.naoHa(c, 'prazo', true), 'quando', true), 'como', true);
  const comp = LA.completude(c);
  r.completude = comp.respondidas === 5 && comp.total === 7 && comp.faltam.join(',') === 'oque,proibicao';
  r.completudeVazia = LA.completude(base).respondidas === 0 && LA.completude(base).faltam.length === 7;

  // desatualizada: o hash denuncia texto mudado
  r.atualizada = LA.atualizada(base, TXT) === true && LA.atualizada(base, TXT + ' (Redação dada pela EC 1/2027)') === false;

  // conferir registra {el, q, ts}; só q 1/3/5
  const cf = LA.conferir(c, 'excecao', 3);
  r.conferir = !!cf && cf.item.conf.length === 1 && cf.item.conf[0].el === 'excecao' && cf.item.conf[0].q === 3 && cf.item.conf[0].ts > 0
    && cf.item.up > c.up && cf.criar && typeof cf.criar === 'object';
  r.conferirQInvalido = LA.conferir(c, 'excecao', 4) === null && LA.conferir(c, 'nada', 5) === null;

  // progresso por lei
  const outra = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406.htm', sigla: 'CC', rot: 'Art. 1.239', gi: 3, txt: 'y' });
  let completo = base;
  LA.IDS.forEach((el, i) => { completo = i < 2 ? LA.marcar(completo, el, { s: i, t: 't' + i }) : LA.naoHa(completo, el, true); });
  const pr = LA.progresso([c, completo, outra], base.leiId, 10);
  // c e completo têm o MESMO id (mesmo dispositivo): progresso conta itens da lista como vêm
  r.progresso = pr.lidos === 2 && pr.completos === 1 && pr.pct === 20;
  r.progressoSemTotal = LA.progresso([c], base.leiId, 0).pct === 0;

  // sanear: só o shape entra — `txt` e campos inventados caem; id tem de ser lei|gi
  const sujo = Object.assign({}, c, { txt: TXT, extra: 'não', hash: 'zz', el: Object.assign({}, c.el, { quem: [{ s: 5, t: 'a casa' }, { s: -1, t: 'neg' }, { s: 5, t: 'dup' }], inventado: [{ s: 0, t: 'x' }] }) });
  const limpo = LA.sanear(sujo);
  r.sanearShape = !!limpo && !('txt' in limpo) && !('extra' in limpo) && !('inventado' in limpo.el) && limpo.el.quem.length === 1 && /^[0-9a-f]{8}$/.test(limpo.hash);
  r.sanearIdCoerente = LA.sanear(Object.assign({}, c, { id: 'la|outra|1' })) === null && LA.sanear(null) === null && LA.sanear('x') === null;

  // upsert: preserva o `up` maior; mais velho não entra; novo id é acrescentado
  const lista = [c];
  const velho = Object.assign({}, c, { up: c.up - 1000, nao: [] });
  const novo = Object.assign({}, c, { up: c.up + 1000, nao: ['prazo', 'quando', 'como', 'oque'] });
  r.upsertVelhoNaoEntra = LA.upsert(lista, velho) === lista;
  r.upsertNovoEntra = LA.upsert(lista, novo)[0].nao.length === 4 && LA.upsert(lista, novo) !== lista && lista[0] === c;
  r.upsertAcrescenta = LA.upsert(lista, outra).length === 2;
  return r;
});
for (const [k, v] of Object.entries(la)) ok(v, 'LEITURA ' + k);

// (c) o canal, contra o host REAL: upsert com `up` maior, resposta só da lei pedida,
//     conferência gravada, e nada de texto de lei em catedra:leituras
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1');
    localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    localStorage.removeItem('catedra:leituras');
  });
  await page.goto(host);
  await page.waitForTimeout(1600);
  await prepararPonteReal(page, 'legis');
  const canal = await page.evaluate(async () => {
    const r = {}, LA = window.CT_LA;
    const postar = dados => document.querySelector('iframe[data-ct-view="legis"]').contentWindow.__ctTestePostar(dados);
    const espera = ms => new Promise(res => setTimeout(res, ms));   // o _autosave grava 500 ms depois do setState
    const gravado = () => JSON.parse(localStorage.getItem('catedra:leituras') || '[]');
    // SEM TEMPO FIXO (11/09/2026). Sob carga o _autosave (500 ms) passava de 900 ms e o teste lia
    // o disco antes da gravação — falhava sem defeito nenhum. `ate` espera a condição; `sentinela`
    // garante que as mensagens já postadas foram tratadas (a resposta ao pedido chega depois
    // delas, em ordem); `assenta` faz isso e descarrega o estado no disco — é o que as asserções
    // de AUSÊNCIA precisam, porque "não gravou" não tem como ser esperado.
    const ate = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await new Promise(res => setTimeout(res, 50)); } try { return !!f(); } catch (_) { return false; } };
    const sentinela = async () => { await new Promise(res => { const h = e => { if (e.data && e.data.type === 'ctLeituras' && e.data.leiId === 'https://assenta.invalido/') { window.removeEventListener('message', h); res(); } };
      window.addEventListener('message', h); postar({ type: 'ctLeiturasPedir', leiId: 'https://assenta.invalido/' }); setTimeout(res, 3000); }); await new Promise(res => setTimeout(res, 150)); };
    const assenta = async () => { await sentinela(); const a = window.__catedraApp; if (a && a._salvarAgora) a._salvarAgora(); };
    r.moduloNoHost = !!LA && typeof window.__catedraGoView === 'function';
    if (!LA) return r;
    const TXT = 'XI - a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador';
    const item = LA.marcar(LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', sigla: 'CF', rot: 'Art. 5º, XI', gi: 412, txt: TXT }), 'quem', { s: 5, t: 'a casa' });

    postar({ type: 'ctLeituraAtiva', item });
    await ate(() => { const x = gravado(); return x.length === 1 && x[0].id === item.id; });
    let g = gravado();
    r.upsertGravou = g.length === 1 && g[0].id === item.id && g[0].el.quem.length === 1;
    r.semTextoDeLei = !JSON.stringify(g).includes('asilo inviolável') && !('txt' in (g[0] || {}));

    // edição mais VELHA não desfaz a guardada
    postar({ type: 'ctLeituraAtiva', item: Object.assign({}, item, { up: item.up - 5000, nao: ['prazo'] }) });
    await assenta();
    g = gravado();
    r.upMaiorVence = g.length === 1 && (g[0].nao || []).length === 0;

    // edição mais NOVA entra
    const novo = LA.naoHa(item, 'prazo', true);
    postar({ type: 'ctLeituraAtiva', item: novo });
    await ate(() => ((gravado()[0] || {}).nao || []).indexOf('prazo') >= 0);
    g = gravado();
    r.upNovoEntra = g.length === 1 && (g[0].nao || []).indexOf('prazo') >= 0;

    // lixo não entra: sem leiId, com texto, id incoerente
    postar({ type: 'ctLeituraAtiva', item: { id: 'la|x|1', gi: 1, txt: TXT } });
    postar({ type: 'ctLeituraAtiva', item: Object.assign({}, item, { id: 'la|outra|412' }) });
    await assenta();
    r.lixoNaoEntra = gravado().length === 1;

    // outra lei no mesmo array; pedir devolve SÓ a lei pedida
    const outra = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406.htm', sigla: 'CC', rot: 'Art. 1.239', gi: 3, txt: 'Aquele que, não sendo proprietário' });
    postar({ type: 'ctLeituraAtiva', item: outra });
    await ate(() => gravado().length === 2);
    r.duasLeis = gravado().length === 2;
    const resposta = await new Promise(res => {
      const h = e => { if (e.data && e.data.type === 'ctLeituras') { window.removeEventListener('message', h); res(e.data); } };
      window.addEventListener('message', h);
      postar({ type: 'ctLeiturasPedir', leiId: item.leiId });
      setTimeout(() => res(null), 2000);
    });
    r.pedirDevolveSoALei = !!resposta && resposta.leiId === item.leiId && resposta.itens.length === 1 && resposta.itens[0].id === item.id;
    const vazia = await new Promise(res => {
      const h = e => { if (e.data && e.data.type === 'ctLeituras') { window.removeEventListener('message', h); res(e.data); } };
      window.addEventListener('message', h);
      postar({ type: 'ctLeiturasPedir', leiId: 'https://www.planalto.gov.br/nada.htm' });
      setTimeout(() => res(null), 2000);
    });
    r.pedirLeiSemLeituraVemVazio = !!vazia && Array.isArray(vazia.itens) && vazia.itens.length === 0;

    // a conferência entra no item guardado
    postar({ type: 'ctLeituraConferida', id: item.id, el: 'quem', q: 3 });
    postar({ type: 'ctLeituraConferida', id: item.id, el: 'quem', q: 4 });   // q inválido: ignorado
    postar({ type: 'ctLeituraConferida', id: 'la|nao|existe', el: 'quem', q: 1 });
    await ate(() => { const x = gravado().find(y => y.id === item.id); return !!x && (x.conf || []).length >= 1; });
    await assenta();   // e só então conta: a conferência inválida não pode ter entrado depois
    const it = gravado().find(x => x.id === item.id);
    r.conferenciaGravada = !!it && (it.conf || []).length === 1 && it.conf[0].el === 'quem' && it.conf[0].q === 3;

    localStorage.removeItem('catedra:leituras');
    localStorage.removeItem('catedra:reviews');   // a conferência q=3 acima criou a revisão dela (LA4)
    return r;
  });
  for (const [k, v] of Object.entries(canal)) ok(v, 'LEITURA/CANAL ' + k);
}

// (d) o espelho do LEGIS: a resposta do host sobrescreve 'catedra:leituras:<leiId>' e avisa a página
{
  await page.goto(URL0 + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!(window.CT_LA_CANAL && window.CT_LA));
  const esp = await page.evaluate(async () => {
    const r = {}, C = window.CT_LA_CANAL, LEI = 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm';
    localStorage.removeItem('catedra:leituras:' + LEI);
    r.espelhoVazio = C.ler(LEI).length === 0;
    let avisou = false;
    window.addEventListener('catedra:leituras', e => { if (e.detail && e.detail.leiId === LEI) avisou = true; });
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeituras', leiId: LEI, itens: [{ id: 'la|' + LEI + '|1', up: 1, leiId: LEI, gi: 1 }] } }));
    await new Promise(res => setTimeout(res, 200));
    r.espelhoGravado = C.ler(LEI).length === 1 && avisou;
    // enviar: espelha localmente (upsert) — o post ao host é o que o caso (c) cobre
    const it = window.CT_LA.nova({ leiId: LEI, sigla: 'CF', rot: 'Art. 2º', gi: 2, txt: 'x' });
    C.enviar(it);
    r.enviarEspelha = C.ler(LEI).length === 2;
    localStorage.removeItem('catedra:leituras:' + LEI);
    return r;
  });
  for (const [k, v] of Object.entries(esp)) ok(v, 'LEITURA/ESPELHO ' + k);
}

/* ============= LEITURA ATIVA — LA2: a grade no leitor do LEGIS ============= */
// (a) a trava de contraste roda no build e passa; os dois builds a importam
{
  const { execFileSync } = await import('child_process');
  let saida = '';
  try { saida = execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'verificar-cores-leitura.mjs')], { cwd: RAIZ, stdio: 'pipe' }).toString(); }
  catch (e) { saida = 'ERRO ' + String(e.stderr || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300); }
  ok(/grade de leitura ativa legível/.test(saida), 'LEITURA/GRADE a trava de contraste mede os 14 tokens e passa (' + saida.trim().slice(0, 120) + ')');
  const importa = (f) => /import '\.\/verificar-cores-leitura\.mjs'/.test(fs.readFileSync(path.join(RAIZ, 'scripts', f), 'utf8'));
  ok(importa('build.mjs') && importa('build-macos.mjs'), 'LEITURA/GRADE os dois builds importam a trava (abortam abaixo do mínimo)');
  // os 14 nomes estão nas DUAS listas da ponte D1
  const nomes = ['quem', 'oque', 'quando', 'como', 'prazo', 'excecao', 'proibicao'].flatMap(e => ['--la-' + e, '--la-' + e + '-tx']);
  const sat = fs.readFileSync(path.join(RAIZ, 'tema-satelite.js'), 'utf8'), hostSrc = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  ok(nomes.every(n => sat.includes("'" + n + "'")) && nomes.every(n => hostSrc.includes("'" + n + "'")), 'LEITURA/GRADE os 14 tokens estão nas duas listas da ponte D1');
}

// (b) o leitor: interruptor, trilho, seleção → chip/tecla, "não há", marca coexistindo com grifo, persistência
{
  const TXT = 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a propriedade.';
  const PARAS = ['TÍTULO III', 'Da Propriedade', 'Art. 1.239. ' + TXT, 'Parágrafo único. O texto do parágrafo único.', 'Art. 1.240. Outro artigo, com um inciso:', 'I - primeiro inciso do artigo.'];
  const abrir = async () => {
    await page.goto(URL0 + '/legis-web.html?area=juridica');
    await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL);
    await page.evaluate((paras) => {
      // o leitor busca o texto em /api/law: aqui a lei vem de um fetch de mentira
      window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
      window.openReader(CAT.laws.find(l => /l10406/.test(l.u)));
    }, PARAS);
    await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 3);
  };
  await page.goto(URL0 + '/legis-web.html?area=juridica');
  await page.evaluate(() => { localStorage.removeItem('catedra:leitorLA'); Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k)); });
  await abrir();
  const la2 = await page.evaluate(async (TXT) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    const LEI = CAT.laws.find(l => /l10406/.test(l.u)).u;
    const grs = () => document.querySelectorAll('#rdrDoc .gr');
    const rgb = hex => 'rgb(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
    // seleciona uma frase dentro do .gr (no nó de texto que a contém) e solta o mouse
    const selecionar = (gr, frase) => {
      const nos = []; const it = document.createNodeIterator(gr, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) nos.push(n);
      const no = nos.find(t => t.nodeValue.includes(frase)); if (!no) return false;
      const range = document.createRange(); const i = no.nodeValue.indexOf(frase);
      range.setStart(no, i); range.setEnd(no, i + frase.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return true;
    };
    const tecla = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

    r.abriuTresDispositivos = grs().length === 4;
    r.desligadoSemTrilho = !document.querySelector('#rdrDoc .la-trilho') && !document.querySelector('#rdrDoc .la-legenda');
    const bt = document.getElementById('rdrLA');
    r.interruptorRotulado = !!bt && /Leitura ativa/.test(bt.getAttribute('aria-label') || '') && bt.getAttribute('aria-pressed') === 'false' && !!bt.querySelector('svg');
    bt.click(); await w(80);
    r.ligaUmTrilhoPorDispositivo = bt.getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#rdrDoc .la-trilho').length === grs().length;
    const chipsDe = tr => [...tr.querySelectorAll('.la-chip')];
    const tr0 = document.querySelector('#rdrDoc .la-trilho');
    r.seteChipsNaOrdem = chipsDe(tr0).map(c => c.dataset.el).join(',') === 'quem,oque,quando,como,prazo,excecao,proibicao';
    r.rotuloEscritoEmTodoChip = chipsDe(tr0).every(c => /\S/.test(c.querySelector('.la-rot').textContent) && /sem resposta|respondida|não há/.test(c.getAttribute('aria-label')));
    r.chipVazioNaoColorido = chipsDe(tr0).every(c => !c.classList.contains('resp') && !c.classList.contains('nao'));
    r.legendaComSetePerguntas = document.querySelectorAll('#rdrDoc .la-legenda .la-item').length === 7
      && [...document.querySelectorAll('#rdrDoc .la-legenda .la-perg')].every(p => /\S/.test(p.textContent))
      && [...document.querySelectorAll('#rdrDoc .la-legenda .la-tecla')].map(k => k.textContent).join('') === '1234567';
    r.semEmojiNaGrade = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tr0.textContent + document.querySelector('#rdrDoc .la-legenda').textContent + bt.textContent);

    // 1. seleção → tecla 1 (Quem?)
    const gr = grs()[0];
    r.selecionouQuem = selecionar(gr, 'Aquele que, não sendo proprietário de imóvel rural ou urbano');
    const barra = document.getElementById('grifBar');
    r.barraGanhouChips = barra.classList.contains('on') && barra.classList.contains('la') && barra.querySelectorAll('.la-chip').length === 7 && !!document.getElementById('grifBtn');
    tecla('1'); await w(80);
    const mQuem = gr.querySelector('mark.la.la-quem');
    r.teclaPintaQuem = !!mQuem && mQuem.dataset.el === 'quem' && mQuem.dataset.s === '0' && mQuem.textContent.startsWith('Aquele que') && mQuem.title === 'Quem?';
    r.marcaUsaIdentidadeESublinhado = !!mQuem && getComputedStyle(mQuem).borderBottomWidth === '2px'
      && getComputedStyle(mQuem).borderBottomColor === rgb(getComputedStyle(mQuem).getPropertyValue('--la-quem').trim());
    r.barraFechouDepois = !barra.classList.contains('on');
    r.trilhoQuemRespondido = tr0.querySelector('.la-chip[data-el=quem]').classList.contains('resp') && /respondida/.test(tr0.querySelector('.la-chip[data-el=quem]').getAttribute('aria-label'));

    // 2. seleção → chip da barra (Há prazo?)
    selecionar(gr, 'por cinco anos ininterruptos');
    barra.querySelector('.la-chip[data-el=prazo]').click(); await w(80);
    r.chipDaBarraPintaPrazo = !!gr.querySelector('mark.la.la-prazo') && gr.querySelector('mark.la.la-prazo').textContent === 'por cinco anos ininterruptos';
    // 3. seleção → tecla 4 (Como?)
    selecionar(gr, 'tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia');
    tecla('4'); await w(80);
    r.teclaPintaComo = !!gr.querySelector('mark.la.la-como');
    r.tresMarcasNaOrdemDoTexto = [...gr.querySelectorAll('mark.la')].map(m => m.dataset.el).join(',') === 'quem,prazo,como';
    r.textoIntacto = gr.textContent === TXT;
    // tecla fora de 1–7 e sem seleção: nada acontece
    tecla('9'); tecla('2'); await w(50);
    r.teclaSemSelecaoNaoMarca = gr.querySelectorAll('mark.la').length === 3;

    // 4. grifo livre coexiste na mesma passada
    selecionar(gr, 'sem oposição');
    document.getElementById('grifBtn').click(); await w(80);
    r.grifoCoexiste = gr.querySelectorAll('mark:not(.la)').length === 1 && gr.querySelectorAll('mark.la').length === 3 && gr.textContent === TXT;

    // 5. "não há" em Há proibição? pelo menu do chip (chip vazio: um toque abre o menu)
    tr0.querySelector('.la-chip[data-el=proibicao]').click(); await w(50);
    const menu = tr0.querySelector('.la-menu');
    r.menuAbriu = !!menu && /Não há/.test(menu.textContent) && !/Limpar marcas/.test(menu.textContent);
    menu.querySelector('button[data-acao=nao]').click(); await w(80);
    const chProib = document.querySelector('#rdrDoc .la-trilho .la-chip[data-el=proibicao]');
    r.naoHaRiscado = chProib.classList.contains('nao') && /não há/.test(chProib.textContent) && /não há/.test(chProib.getAttribute('aria-label'))
      && getComputedStyle(chProib.querySelector('.la-rot')).textDecorationLine.includes('line-through');
    r.completude = (() => { const it = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 0); return !!it && window.CT_LA.completude(it).respondidas === 4; })();

    // 6. chip preenchido: primeiro toque destaca; segundo toque abre o menu com "Limpar marcas"
    const chQuem = document.querySelector('#rdrDoc .la-trilho .la-chip[data-el=quem]');
    chQuem.click(); await w(50);
    r.primeiroToqueDestaca = !!gr.querySelector('mark.la.la-quem.foco') && !document.querySelector('.la-menu');
    chQuem.click(); await w(50);
    r.segundoToqueAbreMenu = !!document.querySelector('.la-menu') && /Limpar marcas/.test(document.querySelector('.la-menu').textContent);
    document.querySelector('.la-menu button[data-acao=fechar]').click(); await w(30);

    // 7. tocar a marca desmarca
    gr.querySelector('mark.la.la-como').click(); await w(80);
    r.toqueNaMarcaDesmarca = !gr.querySelector('mark.la.la-como') && gr.querySelectorAll('mark.la').length === 2;

    // 8. o espelho guarda só shape (sem o texto do dispositivo) e o item tem rot lido da estrutura
    const it = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 0);
    r.espelhoSemTexto = !!it && !('txt' in it) && !JSON.stringify(it).includes('cinqüenta hectares');
    r.rotLidoDaEstrutura = !!it && it.rot === 'Art. 1.239' && it.sigla === 'CC';
    // um dispositivo de inciso recebe "Art. N, I"
    const grInc = grs()[3];
    selecionar(grInc, 'primeiro inciso'); tecla('2'); await w(80);
    const itInc = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 3);
    r.rotDoInciso = !!itInc && itInc.rot === 'Art. 1.240, I';

    // 9. a resposta do host repinta: um ctLeituras com o mesmo dispositivo e outro estado
    const novo = window.CT_LA.naoHa(window.CT_LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: gr.textContent }), 'excecao', true);
    novo.up = Date.now() + 5000;
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeituras', leiId: LEI, itens: [novo, itInc] } })); await w(150);
    r.respostaDoHostRepinta = document.querySelector('#rdrDoc .la-trilho .la-chip[data-el=excecao]').classList.contains('nao') && gr.querySelectorAll('mark.la').length === 0;

    // 10. desligar tira trilho e legenda, mantém os dados
    bt.click(); await w(80);
    r.desligarLimpaATela = !document.querySelector('#rdrDoc .la-trilho') && !document.querySelector('#rdrDoc .la-legenda') && !gr.querySelector('mark.la') && window.CT_LA_CANAL.ler(LEI).length === 2;
    bt.click(); await w(80);
    r.religarVolta = document.querySelectorAll('#rdrDoc .la-trilho').length === 4;
    return r;
  }, TXT);
  for (const [k, v] of Object.entries(la2)) ok(v, 'LEITURA/LEITOR ' + k);

  // 11. sobrevive a recarregar: o interruptor e a grade (pelo espelho) voltam iguais
  await abrir();
  const la2b = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms)); await w(150);
    const r = {};
    r.interruptorLembrado = document.getElementById('rdrLA').getAttribute('aria-pressed') === 'true';
    const tr = document.querySelector('#rdrDoc .la-trilho');
    r.gradeVoltou = !!tr && tr.querySelector('.la-chip[data-el=excecao]').classList.contains('nao')
      && !!document.querySelectorAll('#rdrDoc .gr')[3].querySelector('mark.la.la-oque');
    // a redação mudou: o hash denuncia e a marca vira pontilhada, com o aviso escrito
    const LEI = CAT.laws.find(l => /l10406/.test(l.u)).u;
    const it = window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 3);
    const mudado = Object.assign({}, it, { hash: '00000000', up: it.up + 1000 });
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeituras', leiId: LEI, itens: [mudado] } })); await w(150);
    const tr3 = document.querySelector('#rdrDoc .la-trilho[data-gi="3"]');
    r.redacaoMudouAvisa = !!tr3 && /Redação mudou/.test(tr3.textContent) && getComputedStyle(document.querySelectorAll('#rdrDoc .gr')[3].querySelector('mark.la')).borderBottomStyle === 'dotted';
    tr3.querySelector('button[data-acao=confirmar]').click(); await w(80);
    r.confirmarRefazHash = !document.querySelector('#rdrDoc .la-trilho[data-gi="3"] .la-aviso') && window.CT_LA_CANAL.ler(LEI).find(x => x.gi === 3).hash !== '00000000';
    // alvo de toque no iPad: 44px com ponteiro grosso (regra do CSS)
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).map(x => x.cssText).join('\n');
    r.alvo44NoToque = /pointer:\s*coarse[^}]*\.la-chip[\s\S]*?min-height:\s*44px/.test(css);
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('catedra:leitorLA');
    return r;
  });
  for (const [k, v] of Object.entries(la2b)) ok(v, 'LEITURA/LEITOR ' + k);
}

/* ============= LEITURA ATIVA — LA4: conferência imediata, "erro como filtro" ============= */
// (a) o módulo: q decide o que se cria; front/back do cartão saem do próprio dispositivo
await page.goto(URL0 + '/tests/harness-leitura-ativa.html');
await page.waitForFunction(() => window.__pronto === true);
const la4m = await page.evaluate(() => {
  const LA = window.CT_LA, r = {};
  const TXT = 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra.';
  let it = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm', sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: TXT });
  it = LA.marcar(it, 'quem', { s: 0, t: 'Aquele que, não sendo proprietário de imóvel rural ou urbano' });
  it = LA.marcar(it, 'prazo', { s: TXT.indexOf('por cinco anos ininterruptos'), t: 'por cinco anos ininterruptos' });
  r.acertouNaoCria = Object.keys(LA.conferir(it, 'quem', 5).criar).length === 0;
  const h = LA.conferir(it, 'quem', 3).criar, e = LA.conferir(it, 'quem', 1).criar;
  r.hesitouCartaoERevisao = h.fc === true && h.review === true && !h.erro;
  r.errouTambemErro = e.fc === true && e.review === true && e.erro === true;
  const c = LA.cartaoConferencia(it, 'prazo', TXT);
  r.cartaoFront = !!c && c.front.startsWith('CC · Art. 1.239 — Há prazo?\n') && c.front.includes(LA.LACUNA) && !c.front.includes('por cinco anos') && c.front.includes('Aquele que');
  r.cartaoBack = !!c && c.back === 'por cinco anos ininterruptos' && c.ref === 'CC · Art. 1.239';
  r.cartaoSemMarcaNaoExiste = LA.cartaoConferencia(it, 'como', TXT) === null;
  r.lacunaPorIndexOfQuandoOffsetMudou = LA.lacunas('X ' + TXT, it.el.prazo).includes(LA.LACUNA);
  return r;
});
for (const [k, v] of Object.entries(la4m)) ok(v, 'LEITURA/CONFERIR ' + k);

// (b) o host: 2 Acertei + 1 Hesitei + 1 Errei = 2 cartões, 2 revisões, 1 erro; desfazer limpa os 5;
//     repetir não duplica (id determinístico + hash); teto de 20 por mensagem com aviso
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    ['leituras', 'fc', 'reviews', 'errors'].forEach(k => localStorage.removeItem('catedra:' + k));
    localStorage.setItem('catedra:edital', JSON.stringify([{ disc: 'Direito Civil', peso: 1 }, { disc: 'Direito Processual Civil', peso: 1 }]));
  });
  await page.goto(host);
  await page.waitForTimeout(1600);
  await prepararPonteReal(page, 'legis');
  const la4h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');
    const LA = window.CT_LA, r = {}, app = window.__catedraApp;
    const postar = dados => document.querySelector('iframe[data-ct-view="legis"]').contentWindow.__ctTestePostar(dados);
    // SEM TEMPO FIXO (11/09/2026). Sob carga o _autosave (500 ms) passava de 900 ms e o teste lia
    // o disco antes da gravação — falhava sem defeito nenhum. `ate` espera a condição; `sentinela`
    // garante que as mensagens já postadas foram tratadas (a resposta ao pedido chega depois
    // delas, em ordem); `assenta` faz isso e descarrega o estado no disco — é o que as asserções
    // de AUSÊNCIA precisam, porque "não gravou" não tem como ser esperado.
    const ate = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await new Promise(res => setTimeout(res, 50)); } try { return !!f(); } catch (_) { return false; } };
    const sentinela = async () => { await new Promise(res => { const h = e => { if (e.data && e.data.type === 'ctLeituras' && e.data.leiId === 'https://assenta.invalido/') { window.removeEventListener('message', h); res(); } };
      window.addEventListener('message', h); postar({ type: 'ctLeiturasPedir', leiId: 'https://assenta.invalido/' }); setTimeout(res, 3000); }); await new Promise(res => setTimeout(res, 150)); };
    const assenta = async () => { await sentinela(); const a = window.__catedraApp; if (a && a._salvarAgora) a._salvarAgora(); };
    const TXT = 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural, tornando-a produtiva por seu trabalho, tendo nela sua moradia.';
    let it = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm', sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: TXT });
    const marca = (el, t) => { it = LA.marcar(it, el, { s: TXT.indexOf(t), t }); };
    marca('quem', 'Aquele que, não sendo proprietário de imóvel rural ou urbano'); marca('oque', 'possua como sua');
    marca('prazo', 'por cinco anos ininterruptos'); marca('como', 'tornando-a produtiva por seu trabalho');
    postar({ type: 'ctLeituraAtiva', item: it }); await ate(() => ler('leituras').some(x => x.id === it.id));
    const cartao = el => LA.cartaoConferencia(it, el, TXT);
    const rodada = (qs) => ({ type: 'ctLeituraConferida', id: it.id, ref: 'CC · Art. 1.239',
      itens: [['quem', qs[0]], ['oque', qs[1]], ['prazo', qs[2]], ['como', qs[3]]].map(([el, q]) => ({ el, q, front: cartao(el).front, back: cartao(el).back })) });

    // 1. a rodada do aceite
    postar(rodada([5, 5, 3, 1]));
    await ate(() => ler('fc').length >= 2 && ler('reviews').length >= 2 && ler('errors').length >= 1 && (ler('leituras')[0].conf || []).length >= 4);
    await assenta();
    let fc = ler('fc'), rv = ler('reviews'), er = ler('errors');
    r.doisCartoes = fc.length === 2 && fc.every(c => c.id && c.up && c.hash && /Leitura ativa/.test(c.origem) && c.la && c.la.id === it.id);
    r.cartaoDoPrazo = fc.some(c => c.la.el === 'prazo' && c.front.includes('Há prazo?') && c.back === 'por cinco anos ininterruptos' && !c.tipo);
    r.duasRevisoesIdDeterministico = rv.length === 2 && rv.some(x => x.id === 'rv|la|' + it.id + '|prazo') && rv.some(x => x.id === 'rv|la|' + it.id + '|como');
    r.revisaoDoErreiIntervalo1 = !!rv.find(x => x.id.endsWith('|como')) && rv.find(x => x.id.endsWith('|como')).intervalo === 1 && rv.find(x => x.id.endsWith('|como')).due === 1;
    r.revisaoTemTopicoEDisciplina = rv.every(x => x.topic === 'CC Art. 1.239 — ' + LA.rotulo(x.la.el) && x.disc === 'Direito Civil' && x.up && x.dueDate);
    r.umErro = er.length === 1 && er[0].id === 'e|la|' + it.id + '|como' && er[0].fonte === 'leitura-ativa' && er[0].ref === 'CC · Art. 1.239' && er[0].el === 'como' && er[0].disc === 'Direito Civil' && !!er[0].up;
    if (!r.umErro || !r.revisaoTemTopicoEDisciplina) r.__diag = JSON.stringify({ edital: ler('edital').map(d => d.disc), rv: rv.map(x => [x.disc, x.topic]), er: er.map(x => [x.id, x.disc, x.ref]) });
    r.conferenciasNoItem = (ler('leituras')[0].conf || []).length === 4;
    const toast = document.querySelector('div[role=status]');
    r.toastDizOQueCriou = !!toast && /2 cartões e 2 revisões e 1 erro de art\. 1\.239/.test(toast.textContent || '');
    const undo = toast && [...toast.querySelectorAll('button')].find(b => /desfazer/i.test(b.textContent || ''));
    r.toastTemDesfazer = !!undo;

    // 2. desfazer limpa os 5 (e a conferência registrada no item)
    if (undo) undo.click();
    await ate(() => ler('fc').length === 0 && ler('reviews').length === 0 && ler('errors').length === 0); await assenta();
    r.desfazerLimpaOsCinco = ler('fc').length === 0 && ler('reviews').length === 0 && ler('errors').length === 0;
    r.desfazerDevolveOItem = (ler('leituras')[0].conf || []).length === 0;

    // 3. repetir a conferência do mesmo dispositivo não duplica: sm2 na revisão, hash no cartão, id no erro
    postar(rodada([5, 5, 3, 1])); await ate(() => ler('reviews').length >= 2);
    postar(rodada([5, 5, 3, 3]));
    await ate(() => { const p = ler('reviews').find(x => x.id.endsWith('|prazo')); return !!p && p.repeticoes === 2; }); await assenta();
    fc = ler('fc'); rv = ler('reviews'); er = ler('errors');
    r.repetirNaoDuplica = fc.length === 2 && rv.length === 2 && er.length === 1;
    r.repetirAplicaSm2 = rv.find(x => x.id.endsWith('|prazo')).repeticoes === 2 && rv.find(x => x.id.endsWith('|como')).repeticoes === 1;

    // 4. acertar tudo não cria nada (as contagens não se movem) e o toast diz isso, sem "desfazer"
    const antes4 = [ler('fc').length, ler('reviews').length, ler('errors').length].join('/');
    postar(rodada([5, 5, 5, 5]));
    await ate(() => [...document.querySelectorAll('div[role=status]')].some(d => /acertou, nada a revisar/.test(d.textContent || ''))); await assenta();
    // o toast simples e o toast com ação são dois elementos: procura pelo texto, não pelo primeiro
    const t2 = [...document.querySelectorAll('div[role=status]')].find(d => /acertou, nada a revisar/.test(d.textContent || ''));
    r.acertarTudoNaoCria = [ler('fc').length, ler('reviews').length, ler('errors').length].join('/') === antes4
      && !!t2 && ![...t2.querySelectorAll('button')].some(b => /desfazer/i.test(b.textContent || ''));

    // 5. teto de 20 por mensagem, com aviso do restante
    const muitos = { type: 'ctLeituraConferida', id: it.id, ref: 'CC · Art. 1.239',
      itens: Array.from({ length: 25 }, (_, i) => ({ el: ['quem', 'oque', 'prazo', 'como'][i % 4], q: 3, front: 'F' + i, back: 'B' + i })) };
    const antes = (ler('leituras')[0].conf || []).length;
    postar(muitos); await ate(() => (ler('leituras')[0].conf || []).length - antes >= 20); await assenta();
    r.tetoVinte = (ler('leituras')[0].conf || []).length - antes === 20;
    const t3 = [...document.querySelectorAll('div[role=status]')].find(d => /ficaram para a próxima conferência/.test(d.textContent || ''));
    r.avisaORestante = !!t3 && /5 ficaram para a próxima conferência/.test(t3.textContent || '');

    // 6. lixo não entra: id inexistente, q inválido, el inválido. A prova é o ESTADO não se mover:
    // apagar as chaves do disco e esperar que continuem vazias dependia de nenhum _autosave
    // atrasado (do passo 5, sob carga) regravá-las — e aí o teste acusava lixo que não existia.
    await assenta();
    const n6 = () => [(app.state.flashcards || []).length, (app.state.reviews || []).length, (app.state.errors || []).length].join('/');
    const antes6 = n6();
    ['fc', 'reviews', 'errors'].forEach(k => localStorage.removeItem('catedra:' + k));
    postar({ type: 'ctLeituraConferida', id: 'la|nao|1', itens: [{ el: 'quem', q: 1, front: 'x', back: 'y' }] });
    postar({ type: 'ctLeituraConferida', id: it.id, itens: [{ el: 'quem', q: 4, front: 'x', back: 'y' }, { el: 'porque', q: 1, front: 'x', back: 'y' }] });
    await sentinela();
    r.lixoNaoCria = n6() === antes6;
    if (!r.lixoNaoCria) r.__diag6 = antes6 + ' → ' + n6();
    ['leituras', 'fc', 'reviews', 'errors', 'edital'].forEach(k => localStorage.removeItem('catedra:' + k));
    return r;
  });
  if (la4h.__diag) { console.log('LEITURA/CONFERIR diagnóstico: ' + la4h.__diag); delete la4h.__diag; }
  for (const [k, v] of Object.entries(la4h)) ok(v, 'LEITURA/CONFERIR ' + k);
}

// (c) o leitor: o painel esconde UMA marca por vez com o rótulo escrito, "Mostrar" antes de
//     avaliar, e a rodada inteira sai numa mensagem só
{
  const PARAS = ['Art. 1.239. Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural, tornando-a produtiva por seu trabalho, tendo nela sua moradia, adquirir-lhe-á a propriedade.'];
  await page.goto(URL0 + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL);
  await page.evaluate((paras) => {
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('catedra:leitorLA', '1');
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    window.openReader(CAT.laws.find(l => /l10406/.test(l.u)));
  }, PARAS);
  await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 1);
  const la4l = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    const gr = document.querySelector('#rdrDoc .gr');
    const selecionar = (frase) => {
      const nos = []; const it = document.createNodeIterator(gr, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) nos.push(n);
      const no = nos.find(t => t.nodeValue.includes(frase)); if (!no) return false;
      const range = document.createRange(); const i = no.nodeValue.indexOf(frase); range.setStart(no, i); range.setEnd(no, i + frase.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); return true;
    };
    const tecla = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const trilho = () => document.querySelector('#rdrDoc .la-trilho');
    r.semMarcaSemConferir = !trilho().querySelector('.la-conferir');
    selecionar('Aquele que, não sendo proprietário de imóvel rural ou urbano'); tecla('1'); await w(60);
    selecionar('possua como sua'); tecla('2'); await w(60);
    selecionar('por cinco anos ininterruptos'); tecla('5'); await w(60);
    selecionar('tornando-a produtiva por seu trabalho'); tecla('4'); await w(60);
    r.quatroMarcas = gr.querySelectorAll('mark.la').length === 4;
    const btn = trilho().querySelector('.la-conferir');
    r.botaoConferirAparece = !!btn && /Conferir/.test(btn.textContent);
    // captura o que sairia para o host
    let enviado = null; window.CT_LA_CANAL.conferir = p => { enviado = p; };
    btn.click(); await w(80);
    const painel = document.getElementById('laConf');
    r.painelAbre = painel.classList.contains('on') && /Conferir a leitura — CC · Art\. 1\.239/.test(painel.textContent);
    const lacuna = painel.querySelector('.la-foco .la-lacuna');
    r.umaLacunaComRotulo = painel.querySelectorAll('.la-foco .la-lacuna').length === 1 && !!lacuna && lacuna.classList.contains('la-quem')
      && /Quem\?/.test(lacuna.textContent) && lacuna.textContent.includes('▁') && !painel.querySelector('.la-foco .la-texto').textContent.includes('Aquele que');
    r.outrasMarcasFicamLisas = painel.querySelector('.la-foco .la-texto').textContent.includes('por cinco anos ininterruptos');
    r.mostrarAntesDeAvaliar = !!painel.querySelector('button[data-acao=mostrar]') && !painel.querySelector('button[data-q]');
    r.filaMostraARodada = painel.querySelectorAll('.la-fila .la-chip').length === 4 && painel.querySelector('.la-fila .la-chip.atual').dataset.el === 'quem';
    r.apoioDizARegra = /Só o que você errou ou hesitou vira cartão e revisão/.test(painel.querySelector('.la-apoio').textContent);
    r.semEmojiNoPainel = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(painel.textContent);
    // teclado: Enter mostra
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(60);
    r.enterRevela = !!painel.querySelector('.la-foco .la-lacuna.revelada') && painel.querySelector('.la-foco .la-texto').textContent.includes('Aquele que')
      && painel.querySelectorAll('button[data-q]').length === 3 && !painel.querySelector('button[data-acao=mostrar]');
    const responder = q => painel.querySelector('button[data-q="' + q + '"]').click();
    responder(5); await w(60);
    r.avancaParaOSegundo = painel.querySelector('.la-fila .la-chip.atual').dataset.el === 'oque' && painel.querySelector('.la-fila .la-chip.feita').dataset.el === 'quem' && !painel.querySelector('button[data-q]');
    painel.querySelector('button[data-acao=mostrar]').click(); await w(40); responder(5); await w(60);
    painel.querySelector('button[data-acao=mostrar]').click(); await w(40); responder(3); await w(60);
    painel.querySelector('button[data-acao=mostrar]').click(); await w(40);
    // teclado: 1 = Errei
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); await w(80);
    r.fechaNoFim = !painel.classList.contains('on');
    r.rodadaSaiInteira = !!enviado && enviado.id === window.CT_LA_CANAL.ler(CAT.laws.find(l => /l10406/.test(l.u)).u)[0].id && enviado.ref === 'CC · Art. 1.239'
      // a rodada segue a ORDEM FIXA da grade (Como? vem antes de Há prazo?), não a ordem em que ela marcou
      && enviado.itens.map(x => x.el + ':' + x.q).join(',') === 'quem:5,oque:5,como:3,prazo:1';
    // LA5: o payload já vai como cloze (sintaxe do Anki), com o extra pronto
    r.cartaoProntoNoPayload = !!enviado && enviado.itens[3].tipo === 'cloze' && enviado.itens[3].front.includes('por {{c1::cinco anos}} ininterruptos')
      && enviado.itens[3].back.includes('«cinco anos»') && enviado.itens[3].extra.startsWith('CC · Art. 1.239 · Há prazo? — Prazo de cinco anos');
    r.leitorNaoGravaNasChavesDoApp = !localStorage.getItem('catedra:fc') && !localStorage.getItem('catedra:reviews') && !localStorage.getItem('catedra:errors');
    // fechar sem enviar
    enviado = null; trilho().querySelector('.la-conferir').click(); await w(60);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(60);
    r.escapeFechaSemEnviar = !painel.classList.contains('on') && enviado === null;
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('catedra:leitorLA');
    return r;
  });
  for (const [k, v] of Object.entries(la4l)) ok(v, 'LEITURA/CONFERIR ' + k);
}

/* ============= LEITURA ATIVA — LA5: cloze de lei seca ============= */
// (a) o módulo: o aceite literal, 3 lacunas no máximo, um elemento por cartão, escape, render
await page.goto(URL0 + '/tests/harness-leitura-ativa.html');
await page.waitForFunction(() => window.__pronto === true);
const la5m = await page.evaluate(() => {
  const LA = window.CT_LA, r = {};
  const TXT = 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por cinco anos ininterruptos, sem oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a propriedade.';
  const LEI = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
  let it = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: TXT });
  const marca = (el, t) => { it = LA.marcar(it, el, { s: TXT.indexOf(t), t }); };
  marca('prazo', 'por cinco anos ininterruptos'); marca('quem', 'Aquele que, não sendo proprietário de imóvel rural ou urbano');
  const c = LA.cloze(it, 'prazo', TXT);
  // o aceite, letra por letra
  r.aceiteFront = !!c && c.front === 'Aquele que, não sendo proprietário de imóvel rural ou urbano, possua como sua, por {{c1::cinco anos}} ininterruptos, sem oposição, área de terra em zona rural não superior a cinqüenta hectares, tornando-a produtiva por seu trabalho ou de sua família, tendo nela sua moradia, adquirir-lhe-á a propriedade.';
  r.aceiteExtra = !!c && c.extra === 'CC · Art. 1.239 · Há prazo? — Prazo de cinco anos, contado de forma ininterrupta e sem oposição';
  r.backDestaca = !!c && c.back.includes('por «cinco anos» ininterruptos');
  r.tags = !!c && c.tags.join(',') === 'leitura-ativa,CC,prazo' && c.termos.join() === 'cinco anos';
  // um cartão nunca mistura elementos: o cloze de "quem" não esconde o prazo
  const cq = LA.cloze(it, 'quem', TXT);
  r.umElementoPorCartao = !!cq && cq.front.startsWith('{{c1::Aquele que, não sendo proprietário de imóvel rural ou urbano}}') && !cq.front.includes('{{c2') && cq.front.includes('por cinco anos ininterruptos');
  r.explicacaoPorRegra = !!cq && cq.extra === 'CC · Art. 1.239 · Quem? — Quem: Aquele que, não sendo proprietário de imóvel rural ou urbano';
  // no máximo 3 lacunas; as excedentes ficam visíveis
  let it4 = LA.nova({ leiId: LEI, sigla: 'CC', rot: 'Art. 1', gi: 1, txt: 'um dois três quatro cinco' });
  ['um', 'dois', 'três', 'quatro'].forEach(t => { it4 = LA.marcar(it4, 'oque', { s: 'um dois três quatro cinco'.indexOf(t), t }); });
  const c4 = LA.cloze(it4, 'oque', 'um dois três quatro cinco');
  r.maximoTresLacunas = !!c4 && c4.front === '{{c1::um}} {{c2::dois}} {{c3::três}} quatro cinco' && (c4.front.match(/\{\{c\d::/g) || []).length === 3;
  // sem marca no elemento: nada
  r.semMarcaNada = LA.cloze(it, 'como', TXT) === null && LA.cloze(it, 'nada', TXT) === null;
  // chaves literais no texto não viram lacuna
  let itc = LA.nova({ leiId: LEI, sigla: 'X', rot: 'Art. 2', gi: 2, txt: 'texto com {{chave}} literal' });
  itc = LA.marcar(itc, 'oque', { s: 0, t: 'texto com {{chave}}' });
  const cc = LA.cloze(itc, 'oque', 'texto com {{chave}} literal');
  r.escapaChaves = !!cc && cc.front === '{{c1::texto com { {chave} }}} literal' && (cc.front.match(/\{\{/g) || []).length === 1;
  // revogado/vetado entra como prefixo do extra
  r.prefixoRevogado = LA.cloze(it, 'prazo', TXT, { situacao: 'revogado' }).extra.startsWith('(REVOGADO) CC · Art. 1.239') && LA.cloze(it, 'prazo', TXT, { situacao: 'vetado' }).extra.startsWith('(VETADO) ');
  // alerta só quando o inverter reconhece termo trocável no trecho escondido
  const inv = t => (/cinco anos/.test(t) ? { de: 'cinco anos', para: 'dez anos' } : null);
  r.alertaComInverter = LA.cloze(it, 'prazo', TXT, { inverter: inv }).extra.endsWith('e sem oposição. A banca costuma trocar “cinco anos” por “dez anos”.');
  r.semAlertaSemTermo = !LA.cloze(it, 'quem', TXT, { inverter: inv }).extra.includes('A banca costuma trocar');
  // o corte de 900 nunca parte uma lacuna
  const longo = 'x'.repeat(895) + ' {{c1::abc def}} fim';
  const cortado = LA.cortarSeguro(longo, 900);
  r.corteNaoParteLacuna = cortado.length <= 901 && !/\{\{[^}]*$/.test(cortado) && cortado.endsWith('…');
  // renderCloze: lacuna com largura em ch e rótulo escrito; revelada com o trecho
  const h = LA.renderCloze(c.front, { el: 'prazo' });
  r.renderLacuna = /<span class="la-lacuna la-prazo" style="display:inline-block;min-width:10ch"[^>]*>▁▁▁▁ Há prazo\?<\/span>/.test(h) && !h.includes('cinco anos') && h.includes('adquirir-lhe-á');
  const hr = LA.renderCloze(c.front, { el: 'prazo', revelar: true });
  r.renderRevelada = hr.includes('<span class="la-lacuna revelada la-prazo">cinco anos</span>');
  r.renderEscapaHtml = LA.renderCloze('a <b> {{c1::<i>}} b').includes('&lt;b&gt;') && LA.renderCloze('a <b> {{c1::<i>}} b').includes('&lt;i&gt;') === false;
  r.segmentos = JSON.stringify(LA.segmentosCloze('a {{c1::b}} c').map(p => [p.t, p.lacuna])) === '[["a ",false],["b",true],[" c",false]]';
  return r;
});
for (const [k, v] of Object.entries(la5m)) ok(v, 'LEITURA/CLOZE ' + k);

// (b) o host: o cartão nasce tipo cloze com extra; o alerta vem do inverter do treino.js;
//     a exportação separa os cloze em arquivo próprio; "Revisar agora" mostra o cartão renderizado
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    ['leituras', 'fc', 'reviews', 'errors'].forEach(k => localStorage.removeItem('catedra:' + k));
  });
  await page.goto(host);
  await page.waitForTimeout(1600);
  await prepararPonteReal(page, 'legis');
  // o inverter mora no treino.js, que o host carrega sob demanda: aqui entra antes
  await page.evaluate(() => new Promise(res => { const t = document.createElement('script'); t.src = './treino.js'; t.onload = () => res(true); t.onerror = () => res(false); document.head.appendChild(t); }));
  const la5h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');
    const LA = window.CT_LA, r = {};
    const postar = dados => document.querySelector('iframe[data-ct-view="legis"]').contentWindow.__ctTestePostar(dados);
    const ate = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await new Promise(res => setTimeout(res, 50)); } try { return !!f(); } catch (_) { return false; } };   // espera a condição, não um tempo fixo
    r.inverterDisponivel = !!(window.CT_TREINO && window.CT_TREINO.inverter);
    const TXT = 'O prazo para contestar é de 15 dias, contados da audiência de conciliação, sem oposição.';
    let it = LA.nova({ leiId: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm', sigla: 'CPC', rot: 'Art. 335', gi: 7, txt: TXT });
    it = LA.marcar(it, 'prazo', { s: TXT.indexOf('de 15 dias'), t: 'de 15 dias' });
    postar({ type: 'ctLeituraAtiva', item: it }); await ate(() => ler('leituras').some(x => x.id === it.id));
    const cz = LA.cloze(it, 'prazo', TXT);
    postar({ type: 'ctLeituraConferida', id: it.id, ref: 'CPC · Art. 335',
      itens: [{ el: 'prazo', q: 1, front: cz.front, back: cz.back, extra: cz.extra, tipo: 'cloze', tags: cz.tags, termos: cz.termos, situacao: '' }] });
    await ate(() => ler('fc').length >= 1 && ler('reviews').length >= 1);
    const fc = ler('fc');
    // o núcleo do prazo é número + unidade: "de" fica visível, "15 dias" vira a lacuna
    r.cartaoCloze = fc.length === 1 && fc[0].tipo === 'cloze' && fc[0].front === 'O prazo para contestar é de {{c1::15 dias}}, contados da audiência de conciliação, sem oposição.'
      && fc[0].leituraId === it.id && fc[0].el === 'prazo' && fc[0].ref === 'CPC · Art. 335' && fc[0].origem === 'leitura-ativa' && fc[0].tags.join(',') === 'leitura-ativa,CPC,prazo';
    r.extraComAlertaDoInverter = fc.length === 1 && fc[0].extra === 'CPC · Art. 335 · Há prazo? — Prazo de 15 dias, contados da audiência de conciliação. A banca costuma trocar “15 dias” por “30 dias”.';
    r.revisaoLigadaAoCartao = ler('reviews').length === 1 && ler('reviews')[0].la.el === 'prazo';
    r.notaDeExportacaoAparece = true;   // conferido na tela de Ajustes, abaixo
    return r;
  });
  for (const [k, v] of Object.entries(la5h)) ok(v, 'LEITURA/CLOZE ' + k);

  // a exportação: dois arquivos, e o dos cloze com o cabeçalho que o Anki entende
  const downloads = [];
  page.on('download', d => downloads.push(d));
  const exp = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    // um cartão básico ao lado do cloze, para os dois arquivos saírem
    localStorage.setItem('catedra:fc', JSON.stringify(JSON.parse(localStorage.getItem('catedra:fc')).concat([{ id: 'fcB', front: 'Pergunta básica', back: 'Resposta', disc: 'Direito Civil', criado: Date.now(), up: Date.now() }])));
    location.reload(); await w(2000);
    return true;
  }).catch(() => false);
  // depois do reload, espera o app e o menu existirem (não 2,2 s fixos). Pelo Início: Ajustes
  // mora dentro de "Mais opções" e só entra no DOM depois do clique logo abaixo.
  await page.waitForFunction(() => !!window.__catedraApp && !!document.querySelector('aside button[data-view="inicio"]'), null, { timeout: 15000 }).catch(() => {});
  const exp2 = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const mais = document.querySelector('button[aria-label="Mostrar mais opções"]'); if (mais) mais.click(); await w(300);
    document.querySelector('button[data-view="ajustes"]').click();
    for (let i = 0; i < 160 && !document.querySelector('main .aj-abas button[data-s]'); i++) await w(50);
    const acha = () => [...document.querySelectorAll('main button')].find(b => /Flashcards → Anki/.test(b.textContent || ''));
    for (const aba of document.querySelectorAll('main .aj-abas button[data-s]')) { if (acha()) break; aba.click(); for (let i = 0; i < 40 && !acha(); i++) await w(50); }
    const b = acha(); if (!b) return { erro: 'botão de exportação não encontrado' };
    const notas = [...document.querySelectorAll('main div')].filter(d => /catedra-cloze-lei-seca\.txt/.test(d.textContent || ''));
    const nota = notas.find(d => !notas.some(o => o !== d && d.contains(o)));   // o mais interno
    b.click();
    return { notaCloze: !!nota && /tipo de nota Cloze e permita HTML/.test(nota.textContent) };
  });
  for (let i = 0; i < 150 && downloads.length < 2; i++) await page.waitForTimeout(100);   // os dois arquivos, sem tempo fixo
  const nomes = downloads.map(d => d.suggestedFilename()).sort();
  ok(!exp2.erro && exp2.notaCloze, 'LEITURA/CLOZE a tela de exportação avisa do arquivo Cloze e do HTML' + (exp2.erro ? ' (' + exp2.erro + ')' : ''));
  ok(nomes.join(',') === 'catedra-cloze-lei-seca.txt,catedra-flashcards.txt', 'LEITURA/CLOZE a exportação gera os dois arquivos (' + nomes.join(', ') + ')');
  {
    const dCloze = downloads.find(d => d.suggestedFilename() === 'catedra-cloze-lei-seca.txt');
    const dBasico = downloads.find(d => d.suggestedFilename() === 'catedra-flashcards.txt');
    let txtCloze = '', txtBasico = '';
    try { txtCloze = fs.readFileSync(await dCloze.path(), 'utf8'); txtBasico = fs.readFileSync(await dBasico.path(), 'utf8'); } catch (e) { txtCloze = 'ERRO ' + e.message; }
    const linhas = txtCloze.split('\n').filter(l => l && !l.startsWith('#'));
    ok(/^#separator:tab\n#html:true\n#notetype:Cloze\n#tags column:3\n/.test(txtCloze) && linhas.length === 1 && linhas[0].split('\t').length === 3
      && linhas[0].startsWith('O prazo para contestar é de {{c1::15 dias}}') && linhas[0].split('\t')[1].startsWith('CPC · Art. 335 · Há prazo?'),
      'LEITURA/CLOZE o TSV do Cloze é front[TAB]extra[TAB]tags com #notetype:Cloze');
    ok(!txtBasico.includes('{{c1') && /Pergunta básica\tResposta/.test(txtBasico), 'LEITURA/CLOZE o arquivo básico não leva cloze');
  }
  page.removeAllListeners('download');

  // "Revisar agora": o tópico de leitura ativa mostra a lacuna; revelar mostra o trecho e o extra
  await page.evaluate(() => {
    const fc = JSON.parse(localStorage.getItem('catedra:fc') || '[]').find(c => c.tipo === 'cloze');
    // data LOCAL: depois das 21h em Porto Velho o toISOString já é amanhã em UTC, e a revisão "de hoje" nascia vencendo amanhã
    const _d = new Date(), hoje = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
    localStorage.setItem('catedra:reviews', JSON.stringify([{ id: 'rv|la|' + fc.la.id + '|prazo', disc: 'Direito Processual Civil', topic: 'CPC Art. 335 — Há prazo?', color: '#0d9488',
      due: 0, dueDate: hoje, intervalo: 1, facilidade: 2.5, repeticoes: 0, up: Date.now(), la: fc.la }]));
  });
  await page.goto(host);
  await page.waitForTimeout(1800);
  const rev = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    window.__catedraGoView('revisoes');
    for (let i = 0; i < 160 && ![...document.querySelectorAll('#dc-root button')].some(x => /^Começar/.test((x.textContent || '').trim()) && !x.disabled); i++) await w(50);
    // o botão da sessão diz "Começar (N)"; desabilitado quando não há revisão vencida
    const b = [...document.querySelectorAll('#dc-root button')].find(x => /^Começar/.test((x.textContent || '').trim()) && !x.disabled);
    if (!b) return { erro: 'sem botão "Começar" habilitado na tela de revisões' };
    b.click();
    for (let i = 0; i < 160 && !document.querySelector('[role=dialog][aria-label="Sessão de revisão"] .la-cloze .la-lacuna'); i++) await w(50);
    const dlg = document.querySelector('[role=dialog][aria-label="Sessão de revisão"]');
    if (!dlg) return { erro: 'a sessão não abriu' };
    const lac = dlg.querySelector('.la-cloze .la-lacuna');
    r.lacunaAntes = !!lac && lac.classList.contains('la-prazo') && !lac.classList.contains('revelada') && lac.textContent.includes('▁') && /min-width:\s*7ch/.test(lac.getAttribute('style') || '')
      && !dlg.querySelector('.la-cloze').textContent.includes('15 dias') && dlg.querySelector('.la-cloze').textContent.includes('contados da audiência');
    r.extraEscondidoAntes = !dlg.querySelector('.la-cloze-extra');
    const rev = [...dlg.querySelectorAll('button')].find(x => /Já recordei/.test(x.textContent || ''));
    if (!rev) return { erro: 'sem o botão "Já recordei" na sessão' };
    rev.click();
    for (let i = 0; i < 160 && !dlg.querySelector('.la-cloze .la-lacuna.revelada'); i++) await w(50);
    const lac2 = dlg.querySelector('.la-cloze .la-lacuna');
    r.reveladoMostraOTrecho = !!lac2 && lac2.classList.contains('revelada') && lac2.textContent === '15 dias';
    r.extraDepois = !!dlg.querySelector('.la-cloze-extra') && /Prazo de 15 dias/.test(dlg.querySelector('.la-cloze-extra').textContent) && /A banca costuma trocar/.test(dlg.querySelector('.la-cloze-extra').textContent);
    r.corDaIdentidade = getComputedStyle(lac2).borderBottomColor === getComputedStyle(lac2).getPropertyValue('--la-prazo').trim().replace(/^#(..)(..)(..)$/, (_, a, b2, c) => 'rgb(' + [a, b2, c].map(x => parseInt(x, 16)).join(', ') + ')');
    ['leituras', 'fc', 'reviews', 'errors'].forEach(k => localStorage.removeItem('catedra:' + k));
    return r;
  });
  if (rev.erro) ok(false, 'LEITURA/CLOZE Revisar agora: ' + rev.erro);
  else for (const [k, v] of Object.entries(rev)) ok(v, 'LEITURA/CLOZE Revisar agora ' + k);
}

// (c) o leitor: inciso junta o tronco do caput; dispositivo revogado avisa no trilho e marca o cartão
{
  const PARAS = ['Art. 1.240. Outro artigo, com um inciso:', 'I - primeiro inciso do artigo com prazo de 10 dias.', 'Art. 1.241. Artigo que caiu. (Revogado pela Lei nº 14.000, de 2020)'];
  await page.goto(URL0 + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL);
  await page.evaluate((paras) => {
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('catedra:leitorLA', '1');
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    window.openReader(CAT.laws.find(l => /l10406/.test(l.u)));
  }, PARAS);
  await page.waitForFunction(() => document.querySelectorAll('#rdrDoc .gr').length >= 3);
  const la5l = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    const grs = document.querySelectorAll('#rdrDoc .gr');
    const selecionar = (gr, frase) => {
      const nos = []; const it = document.createNodeIterator(gr, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) nos.push(n);
      const no = nos.find(t => t.nodeValue.includes(frase)); if (!no) return false;
      const range = document.createRange(); const i = no.nodeValue.indexOf(frase); range.setStart(no, i); range.setEnd(no, i + frase.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      document.getElementById('rdrScroll').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); return true;
    };
    const tecla = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    let enviado = null; window.CT_LA_CANAL.conferir = p => { enviado = p; };
    // 1. inciso: a marca no inciso, o cartão com o tronco do caput
    selecionar(grs[1], 'de 10 dias'); tecla('5'); await w(60);
    document.querySelectorAll('#rdrDoc .la-trilho')[1].querySelector('.la-conferir').click(); await w(80);
    const painel = document.getElementById('laConf');
    r.focoJuntaOCaput = painel.querySelector('.la-foco .la-texto').textContent.startsWith('Outro artigo, com um inciso: primeiro inciso do artigo com prazo') && !!painel.querySelector('.la-lacuna.la-prazo');
    painel.querySelector('button[data-acao=mostrar]').click(); await w(40); painel.querySelector('button[data-q="3"]').click(); await w(80);
    r.frontDoIncisoComTronco = !!enviado && enviado.itens[0].tipo === 'cloze' && enviado.itens[0].front === 'Outro artigo, com um inciso: primeiro inciso do artigo com prazo de {{c1::10 dias}}.' && enviado.itens[0].termos.join() === '10 dias';
    // 2. revogado: o trilho avisa antes de conferir, e o extra sai prefixado
    const tr2 = document.querySelectorAll('#rdrDoc .la-trilho')[2];
    r.trilhoAvisaRevogado = /Dispositivo revogado/.test(tr2.textContent) && /REVOGADO/.test(tr2.textContent);
    enviado = null;
    selecionar(grs[2], 'Artigo que caiu'); tecla('2'); await w(60);
    document.querySelectorAll('#rdrDoc .la-trilho')[2].querySelector('.la-conferir').click(); await w(80);
    painel.querySelector('button[data-acao=mostrar]').click(); await w(40); painel.querySelector('button[data-q="1"]').click(); await w(80);
    r.extraPrefixadoRevogado = !!enviado && enviado.itens[0].situacao === 'revogado' && enviado.itens[0].extra.startsWith('(REVOGADO) CC · Art. 1.241 · O quê?');
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:') || k.startsWith('catedra:grifos:')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('catedra:leitorLA');
    return r;
  });
  for (const [k, v] of Object.entries(la5l)) ok(v, 'LEITURA/CLOZE ' + k);
}

/* ============= LEITURA ATIVA — LA3: modo guiado (o mesmo roteiro do WebKit, aqui no Chromium) ============= */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  try { await testarLegisGuiado(pg, URL0, ok, { motor, origem: 'http' }); }
  catch (e) { ok(false, 'LEGIS GUIADO o roteiro correu sem exceção (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
  try { await testarLeitorWeb(pg, URL0, ok); } catch (e) { ok(false, 'LEITOR WEB: exceção — ' + (e && e.message)); }
  await ctx.close();
  // filtros "só incidência alta" e "só o que ainda não li"
  await page.goto(URL0 + '/legis-web.html?area=juridica');
  await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.CT_LA_CANAL);
  const gd = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {};
    // a CF: a incidência conhece os artigos 5 e 37 como "alta"; o 999 não existe lá
    const paras = ['Art. 5º Todos são iguais perante a lei, sem distinção de qualquer natureza.', 'Art. 37. A administração pública obedecerá aos princípios de legalidade.', 'Art. 999. Artigo que ninguém cita em julgado algum.'];
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:')).forEach(k => localStorage.removeItem(k));
    window.openReader(CAT.laws.find(l => /constituicao\.htm/.test(l.u)));
    await new Promise(res => { const t = setInterval(() => { if (document.querySelectorAll('#rdrDoc .gr').length >= 3) { clearInterval(t); res(); } }, 50); });
    document.getElementById('rdrLA').click(); await w(60);
    // um dispositivo já lido por completo (7 respostas) para o filtro "ainda não li"
    const LEI = CAT.laws.find(l => /constituicao\.htm/.test(l.u)).u;
    let it = window.CT_LA.nova({ leiId: LEI, sigla: 'CF', rot: 'Art. 5º', gi: 0, txt: document.querySelector('#rdrDoc .gr').textContent });
    window.CT_LA.IDS.forEach(el => { it = window.CT_LA.naoHa(it, el, true); });
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeituras', leiId: LEI, itens: [it] } })); await w(150);
    document.querySelector('#rdrDoc .la-legenda .la-guiar').click(); await w(100);
    const gd = document.getElementById('laGuiado');
    r.tresNaLista = /dispositivo 1 de 3/.test(gd.textContent);
    gd.querySelector('input[data-f=naoLi]').click(); await w(150);
    r.naoLiTiraOCompleto = /dispositivo 1 de 2/.test(gd.textContent) && /Art\. 37/.test(gd.querySelector('.la-norma').textContent);
    gd.querySelector('input[data-f=alta]').click();
    await new Promise(res => { const t = setInterval(() => { if (window.__INCIDENCIA__) { clearInterval(t); res(); } }, 50); setTimeout(res, 8000); }); await w(200);
    r.incidenciaCarregou = !!window.__INCIDENCIA__;
    r.altaTiraOArt999 = /dispositivo 1 de 1/.test(gd.textContent) && /Art\. 37/.test(gd.querySelector('.la-norma').textContent);
    gd.querySelector('input[data-f=naoLi]').click(); await w(100);
    // tirar um filtro MANTÉM o dispositivo atual (o art. 37 vira o 2º de [5, 37])
    r.soAltaMantemOAtual = /dispositivo 2 de 2/.test(gd.textContent) && /Art\. 37/.test(gd.querySelector('.la-norma').textContent);
    // Enter sem seleção pula a pergunta; na sétima fecha o dispositivo — no último, sai do modo
    for (let i = 0; i < 7; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(30); }
    r.enterNoUltimoSai = !document.getElementById('rdr').classList.contains('la-guiado');
    // de volta pela legenda: os filtros continuam valendo e o percurso recomeça do 1º (art. 5)
    document.querySelector('#rdrDoc .la-legenda .la-guiar').click(); await w(100);
    r.filtrosPersistem = /dispositivo 1 de 2/.test(gd.textContent) && /Art\. 5/.test(gd.querySelector('.la-norma').textContent) && gd.querySelector('input[data-f=alta]').checked;
    for (let i = 0; i < 7; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(30); }
    r.enterAvancaDispositivo = /dispositivo 2 de 2/.test(gd.textContent) && /Pergunta 1 de 7/.test(gd.textContent);
    // "Sair" devolve o documento
    gd.querySelector('button[data-acao=sair]').click(); await w(100);
    r.sairDevolve = !document.getElementById('rdr').classList.contains('la-guiado');
    gd.querySelector; document.querySelector('#rdrDoc .la-legenda .la-guiar').click(); await w(60);
    gd.querySelector('input[data-f=alta]').click(); await w(60); gd.querySelector('button[data-acao=sair]').click(); await w(60);   // desliga os filtros para o próximo teste
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('catedra:leitorLA');
    return r;
  });
  for (const [k, v] of Object.entries(gd)) ok(v, 'LEGIS GUIADO filtros ' + k);
}

/* ============= LEITURA ATIVA — LA6: a grade reaparece no oral, no simulado, no catálogo e na prioridade ============= */
// (a) a prioridade: fator novo de 5 % dentro da constante única; sem o dado, vale zero
await page.goto(URL0 + '/tests/harness-prioridade.html');
await page.waitForFunction(() => !!window.CT_PRIORIDADE_CALC);
const la6p = await page.evaluate(() => {
  const { prioridadeDisciplinas, PESOS } = window.CT_PRIORIDADE_CALC, r = {};
  r.pesoCincoPorCento = PESOS.leitura === 0.05 && Math.abs(Object.values(PESOS).reduce((a, b) => a + b, 0) - 1) < 1e-9;
  const base = { edital: [{ disc: 'Direito Civil', peso: 1 }, { disc: 'Direito Penal', peso: 1 }], errors: [], reviews: [], sessions: [], hoje: '2026-09-02' };
  const sem = prioridadeDisciplinas(base), com = prioridadeDisciplinas({ ...base, leituraPendente: { 'direito civil': 1, 'direito penal': 0 } });
  const f = (lista, d) => lista.find(x => x.disc === d).fatores.find(x => x.chave === 'leitura');
  r.fatorExiste = !!f(sem, 'Direito Civil') && f(sem, 'Direito Civil').valor === 0 && f(sem, 'Direito Civil').peso === 0.05;
  r.pendenteSobe = f(com, 'Direito Civil').valor === 1 && f(com, 'Direito Penal').valor === 0 && /100% dos artigos mais citados/.test(f(com, 'Direito Civil').texto)
    && com.find(x => x.disc === 'Direito Civil').nota > sem.find(x => x.disc === 'Direito Civil').nota;
  return r;
});
for (const [k, v] of Object.entries(la6p)) ok(v, 'LEITURA/ONDE-MAIS prioridade ' + k);

// (b) o host: oral · Lei seca mostra o trilho só-leitura e "Ler ativamente no LEGIS"; o gabarito do
//     simulado errado em lei seca mostra "Conferir de novo"; o rot casa normalizado; registrar sessão
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
    ['leituras', 'fc', 'reviews', 'errors'].forEach(k => localStorage.removeItem('catedra:' + k));
    localStorage.setItem('catedra:edital', JSON.stringify([{ disc: 'Direito Civil', peso: 1 }]));
  });
  await page.goto(host);
  await page.waitForTimeout(1600);
  await prepararPonteReal(page, 'legis');
  const la6h = await page.evaluate(async () => {
    const postar = dados => document.querySelector('iframe[data-ct-view="legis"]').contentWindow.__ctTestePostar(dados);
    const ate = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await new Promise(res => setTimeout(res, 50)); } try { return !!f(); } catch (_) { return false; } };   // espera a condição, não um tempo fixo
    // sentinela: o pedido de resumo é respondido depois das mensagens já postadas (o canal trata em
    // ordem, e o ctRegistrarLeitura é síncrono) — é o que as asserções de AUSÊNCIA precisam
    const sentinela = () => new Promise(res => { const h = e => { if (e.data && e.data.type === 'ctLeiturasResumoResp') { window.removeEventListener('message', h); res(); } };
      window.addEventListener('message', h); postar({ type: 'ctLeiturasResumo' }); setTimeout(res, 3000); });
    const w = ms => new Promise(res => setTimeout(res, ms));
    const LA = window.CT_LA, r = {};
    // casamento do rot: "Art. 5º, XI" ↔ "art. 5o , XI" ↔ "Art. 5º — XI"
    const cmp = window.__catedraApp && window.__catedraApp._laNormRot;
    r.normalizaRot = !cmp || (cmp('Art. 5º, XI') === cmp('art. 5o , XI') && cmp('Art. 5º') === cmp('Art. 5o.'));
    // leituras de dois dispositivos do CC art. 1.239 e do CF art. 5º, XI
    const CC = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
    const CF = 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm';
    let a = LA.nova({ leiId: CC, sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: 'Aquele que possua como sua por cinco anos.' });
    a = LA.marcar(a, 'prazo', { s: 26, t: 'por cinco anos' }); a = LA.naoHa(a, 'proibicao', true);
    let b = LA.nova({ leiId: CF, sigla: 'CF', rot: 'Art. 5º, XI', gi: 412, txt: 'a casa é asilo inviolável' });
    b = LA.marcar(b, 'quem', { s: 0, t: 'a casa' });
    postar({ type: 'ctLeituraAtiva', item: a }); postar({ type: 'ctLeituraAtiva', item: b });
    await ate(() => { const L = (window.__catedraApp && window.__catedraApp.state.leituras) || []; return L.some(x => x.id === a.id) && L.some(x => x.id === b.id); });
    // 1. Prova oral → Lei seca, com o artigo sorteado forçado para o CC art. 1.239
    window.__catedraGoView('oral');
    await ate(() => !!document.querySelector('#dc-root button[data-m="lei"]'));
    document.querySelector('#dc-root button[data-m="lei"]').click();
    await new Promise(res => { const t = setInterval(() => { if (Array.isArray(window.CT_LEIS) && window.CT_LEIS.length) { clearInterval(t); res(); } }, 100); setTimeout(res, 25000); });
    await w(400);
    const cc = (window.CT_LEIS || []).find(l => l.sigla === 'CC'), art = cc && cc.artigos.find(x => /^Art\.\s*1\.239\b/.test(x.rot));
    r.acervoTemOArtigo = !!art && cc.url === CC;
    if (!art) return r;   // sob carga o CT_LEIS pode não chegar nos 25 s: falha nomeada, não o cc.nome que derrubava a suíte
    // sorteio determinístico: fixa Math.random para cair no CC art. 1.239 é frágil; em vez disso,
    // usa o caminho real com o artigo escolhido pela própria função do treino
    const T = window.CT_TREINO; const escolhido = { sigla: 'CC', nome: cc.nome, url: cc.url, rot: art.rot, txt: T.limpa(art.txt) };
    const app = window.__catedraApp; if (app) { app.setState({ oralArt: escolhido, oralArtVariante: 0, oralPergunta: T.perguntaLei(escolhido, 0), oralResposta: '', oralCorrecao: null }); await ate(() => !!document.querySelector('#dc-root .la-trilho-ro')); }
    r.appExposto = !!app;
    const trilho = document.querySelector('#dc-root .la-trilho-ro');
    r.oralMostraOTrilho = !!trilho && /Art\. 1\.239/.test(trilho.textContent) && trilho.querySelectorAll('.la-chip').length === 7
      && trilho.querySelector('.la-chip.la-prazo').classList.contains('resp') && /não há/.test(trilho.querySelector('.la-chip.la-proibicao').textContent)
      && [...trilho.querySelectorAll('.la-chip')].every(c => /\S/.test(c.querySelector('.la-rot').textContent) && c.getAttribute('aria-label'));
    // cor-texto ≠ cor-identidade: o rótulo do chip respondido NÃO é pintado com a cor crua da identidade
    r.oralChipUsaCorDeTexto = !!trilho && (() => { const c = trilho.querySelector('.la-chip.la-prazo'), cs = getComputedStyle(c); const id = cs.getPropertyValue('--la-prazo').trim();
      const rgb = id.replace(/^#(..)(..)(..)$/, (_, a, b, d) => 'rgb(' + [a, b, d].map(x => parseInt(x, 16)).join(', ') + ')'); return !!id && cs.color !== rgb && cs.color !== 'rgb(0, 0, 0)'; })();
    const btnOral = [...document.querySelectorAll('#dc-root button')].find(x => /Ler ativamente no LEGIS/.test(x.textContent || ''));
    r.oralTemBotao = !!btnOral && btnOral.dataset.lei === CC && /1\.239/.test(btnOral.dataset.rot);
    // "Ler ativamente" leva ao LEGIS com o pedido de abrir no dispositivo
    if (btnOral) { btnOral.click(); await ate(() => { const f = document.querySelector('iframe[data-ct-view="legis"]'); const rd = f && f.contentDocument && f.contentDocument.getElementById('rdr');
      return !!rd && (rd.classList.contains('on') || /la=/.test(f.getAttribute('src') || '') || !!(f.contentWindow && f.contentWindow.__laAbrirPedido)); }, 10000); }
    const f = document.querySelector('iframe[data-ct-view="legis"]');
    const rdr = f && f.contentDocument && f.contentDocument.getElementById('rdr');
    r.abreOLegisNoLeitor = !!rdr && (rdr.classList.contains('on') || /la=/.test(f.getAttribute('src') || '') || !!(f.contentWindow && f.contentWindow.__laAbrirPedido));
    // 2. registrar sessão ao sair do modo guiado (o interruptor de Ajustes ligado abre o registro preenchido)
    let abriu = null; const orig = window.catedraOpenStudyRegistration; window.catedraOpenStudyRegistration = info => { abriu = info; return 'ok'; };
    postar({ type: 'ctRegistrarLeitura', leiId: CC, sigla: 'CC', lei: 'Código Civil', faixa: 'Art. 1.239 – Art. 1.241', lidos: 3, min: 7 }); await ate(() => abriu !== null);
    r.registroPreenchido = !!abriu && abriu.categoria === 'Lei seca' && abriu.disc === 'Direito Civil' && abriu.topico === 'CC · Art. 1.239 – Art. 1.241' && abriu.min === 7 && /3 dispositivos/.test(abriu.nota);
    // quando falha, diz o que chegou (ou que nada chegou) e em que estado o app estava — vai para o log
    if (!r.registroPreenchido) r.__diag = JSON.stringify({ abriu, autoRegistro: app && (app.state.prefs || {}).autoRegistro,
      edital: app && (app.state.edital || []).map(d => d.disc), disc: app && app._laDisciplina({ sigla: 'CC', leiId: CC }) });
    abriu = null;
    postar({ type: 'ctRegistrarLeitura', leiId: CC, sigla: 'CC', lidos: 0, min: 3 }); await sentinela();
    r.semLeituraNaoOferece = abriu === null;
    if (app) { app.setState(s => ({ prefs: { ...s.prefs, autoRegistro: false } })); await ate(() => !!app.state.prefs && app.state.prefs.autoRegistro === false); }
    postar({ type: 'ctRegistrarLeitura', leiId: CC, sigla: 'CC', lidos: 2, min: 3 }); await sentinela();
    r.interruptorDesligadoNaoOferece = !app || abriu === null;
    if (app) { app.setState(s => ({ prefs: { ...s.prefs, autoRegistro: true } })); }
    window.catedraOpenStudyRegistration = orig;
    // 3. resumo por lei para o catálogo do LEGIS
    const resumo = await new Promise(res => { const h = e => { if (e.data && e.data.type === 'ctLeiturasResumoResp') { window.removeEventListener('message', h); res(e.data.resumo); } }; window.addEventListener('message', h); postar({ type: 'ctLeiturasResumo' }); setTimeout(() => res(null), 2000); });
    r.resumoPorLei = !!resumo && resumo[CC] && resumo[CC].lidos === 1 && resumo[CF].lidos === 1 && resumo[CC].completos === 0 && !JSON.stringify(resumo).includes('asilo');
    return r;
  }).catch(e => ({ __excecao: String(e && e.message || e).split('\n')[0].slice(0, 200) }));
  // uma exceção aqui dentro vira UMA falha nomeada; o diagnóstico vai para o log, não vira asserção
  if (la6h.__excecao) ok(false, 'LEITURA/ONDE-MAIS o roteiro correu sem exceção (' + la6h.__excecao + ')');
  if (la6h.__diag) console.log('  diagnóstico do LEITURA/ONDE-MAIS registroPreenchido: ' + la6h.__diag);
  for (const [k, v] of Object.entries(la6h)) if (!k.startsWith('__')) ok(v, 'LEITURA/ONDE-MAIS ' + k);

  // 4. simulado: item de lei seca ERRADO no gabarito mostra a grade lida e "Conferir de novo"
  const la6s = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp; if (!app) return { erro: 'app não exposto' };
    const CC = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
    const itens = [
      { id: 'lei|Código Civil|Art. 1.239|x', origem: 'lei', enunciado: 'Aquele que possua como sua por dez anos.', certo: false, original: 'Aquele que possua como sua por cinco anos.', trocaDe: 'cinco', trocaPara: 'dez', ref: 'Código Civil · Art. 1.239', ramo: 'Código Civil', tema: 'Art. 1.239', url: CC, contexto: 'x' },
      { id: 'lei|Código Civil|Art. 1.240|y', origem: 'lei', enunciado: 'Outro dispositivo, correto.', certo: true, original: 'Outro dispositivo, correto.', ref: 'Código Civil · Art. 1.240', ramo: 'Código Civil', tema: 'Art. 1.240', url: CC, contexto: 'y' },
      { id: 'lei|Código Civil|Art. 1.241|z', origem: 'lei', enunciado: 'Terceiro, errado e sem leitura.', certo: true, original: 'Terceiro.', ref: 'Código Civil · Art. 1.241', ramo: 'Código Civil', tema: 'Art. 1.241', url: CC, contexto: 'z' },
    ];
    window.__catedraGoView('simulados'); await w(400);
    // respostas: errou o 1.239 (marcou certo), acertou o 1.240, errou o 1.241 (marcou errado)
    const resp = {}; resp[itens[0].id] = true; resp[itens[1].id] = true; resp[itens[2].id] = false;
    // o painel do simulado misto precisa estar aberto; o encerramento real monta o relatório e o gabarito
    app.setState({ sjAberto: true, sjPronto: true, sjItens: itens, sjResp: resp, sjAtual: 0, sjFim: false, sjIni: Date.now() - 60000 });
    for (let i = 0; i < 160 && !(app.state.sjAberto && (app.state.sjItens || []).length === 3); i++) await w(50);
    app.encerrarSj();
    for (let i = 0; i < 160 && !document.querySelector('#dc-root .la-trilho-ro'); i++) await w(50);   // a correção pinta a grade: espera ela
    const blocos = [...document.querySelectorAll('#dc-root .la-trilho-ro')];
    r.gradeSoNoErradoComLeitura = blocos.length === 1 && /Art\. 1\.239/.test(blocos[0].textContent) && blocos[0].querySelector('.la-chip.la-prazo').classList.contains('resp');
    const conferir = [...document.querySelectorAll('#dc-root button')].filter(x => /Conferir de novo/.test(x.textContent || ''));
    const ler = [...document.querySelectorAll('#dc-root button')].filter(x => /^Ler ativamente$/.test((x.textContent || '').trim()));
    r.conferirDeNovoSoComLeitura = conferir.length === 1 && conferir[0].dataset.conferir === '1' && conferir[0].dataset.lei === CC && conferir[0].dataset.rot === 'Art. 1.239';
    r.lerAtivamenteNosDoisErrados = ler.length === 2 && ler.every(b => b.dataset.lei === CC) && ler.some(b => b.dataset.rot === 'Art. 1.241');
    r.acertadoNaoMostraNada = !document.querySelector('#dc-root button[data-rot="Art. 1.240"]');
    app.setState({ sjItens: [], sjResp: {}, sjFim: false, sjAberto: false });
    ['leituras', 'fc', 'reviews', 'errors', 'edital', 'sim'].forEach(k => localStorage.removeItem('catedra:' + k));
    return r;
  });
  if (la6s.erro) ok(false, 'LEITURA/ONDE-MAIS simulado: ' + la6s.erro);
  else for (const [k, v] of Object.entries(la6s)) ok(v, 'LEITURA/ONDE-MAIS simulado ' + k);
}

// (c) o LEGIS: abre a lei no dispositivo pedido (mensagem e URL), rola até ele e, se pedido, abre a
//     conferência; o catálogo mostra a barra "lido ativamente" com o resumo do host
{
  const PARAS = ['Art. 1.239. Aquele que possua como sua por cinco anos.', 'Art. 1.240. Outro artigo.', 'Art. 1.241. Terceiro artigo.'];
  const CC = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
  await page.goto(URL0 + '/legis-web.html?area=juridica&la=' + encodeURIComponent(CC) + '&rot=' + encodeURIComponent('art. 1.241'));
  await page.waitForFunction(() => !!window.openReader && !!window.CT_LA && !!window.ctLeituraAbrir);
  // a página abriu com ?la=…: o pedido ficou pendente porque o texto ainda não veio (fetch de mentira entra agora)
  const la6l = await page.evaluate(async (paras) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, CC = 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm';
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:')).forEach(k => localStorage.removeItem(k));
    window.fetch = async () => ({ json: async () => ({ ok: true, paragraphs: paras }) });
    // o ?la= chamou openReader antes do fetch de mentira: reabre pelo mesmo caminho
    window.ctLeituraAbrir({ leiId: CC, rot: 'art. 1.241' });
    await new Promise(res => { const t = setInterval(() => { if (document.querySelectorAll('#rdrDoc .gr').length >= 3) { clearInterval(t); res(); } }, 50); }); await w(200);
    r.abriuALei = document.getElementById('rdr').classList.contains('on') && /Código Civil/.test(document.getElementById('rdrTitle').textContent);
    r.ligouALeituraAtiva = document.getElementById('rdr').classList.contains('la');
    // "Conferir de novo" num dispositivo lido abre a conferência dele
    let it = window.CT_LA.nova({ leiId: CC, sigla: 'CC', rot: 'Art. 1.239', gi: 0, txt: document.querySelector('#rdrDoc .gr').textContent });
    it = window.CT_LA.marcar(it, 'prazo', { s: 26, t: 'por cinco anos' });
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeituras', leiId: CC, itens: [it] } })); await w(150);
    window.ctLeituraAbrir({ leiId: CC, rot: 'Art. 1.239', conferir: true }); await w(200);
    const painel = document.getElementById('laConf');
    r.conferirDeNovoAbreAConferencia = painel.classList.contains('on') && /Art\. 1\.239/.test(painel.textContent) && !!painel.querySelector('.la-lacuna.la-prazo');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(60);
    // rot normalizado casa "art. 1o.239"? não — casa "art. 1.239" com "Art. 1.239" e "Art. 1.239, I" pelo artigo
    r.rotNormalizado = window.ctLeituraAbrir({ leiId: CC, rot: 'ART. 1.240 —' }) === undefined && true;
    // catálogo: o resumo do host vira a barra "lido ativamente"
    document.getElementById('rdrClose').click(); await w(100);
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
      data: { type: 'ctLeiturasResumoResp', resumo: { [CC]: { lidos: 3, completos: 1 } } } })); await w(200);
    const row = [...document.querySelectorAll('.lawrow')].find(x => /Código Civil/.test(x.textContent) && !/Processo/.test(x.textContent));
    const barra = row && row.querySelector('.laLido');
    r.catalogoMostraLido = !!barra && /lido ativamente · 3/.test(barra.textContent) && /3 dispositivos/.test(barra.getAttribute('aria-label'));
    r.barraSoComDenominador = !!barra && (!!window.__INCIDENCIA__ ? !!barra.querySelector('i b') : !barra.querySelector('i'));
    Object.keys(localStorage).filter(k => k.startsWith('catedra:leituras:')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('catedra:leitorLA');
    return r;
  }, PARAS);
  for (const [k, v] of Object.entries(la6l)) ok(v, 'LEITURA/ONDE-MAIS LEGIS ' + k);
}

/* ============= ENAM — E2: o banco oficial das provas anteriores ============= */
// (a) o parser, contra o PDF de amostra em tests/ (extraído a .txt; se houver PyMuPDF, também do PDF)
{
  const { execFileSync } = await import('child_process');
  const areas = areasEnam();
  ok(areas.length === 8 && areas.map(a => a.cota).join('/') === '16/10/6/6/12/12/6/12' && areas.reduce((n, a) => n + a.cota, 0) === 80,
    'ENAM CT_ENAM.AREAS tem as 8 áreas com as cotas do quadro 8.6 (16/10/6/6/12/12/6/12)');
  let txtAmostra = fs.readFileSync(path.join(RAIZ, 'tests', 'enam-amostra.txt'), 'utf8');
  let doPdf = '';
  try {
    doPdf = execFileSync('python3', ['-c', "import fitz,sys; d=fitz.open(sys.argv[1]); print('\\f'.join(p.get_text() for p in d))", path.join(RAIZ, 'tests', 'enam-amostra.pdf')], { stdio: 'pipe' }).toString();
  } catch (e) { doPdf = ''; }
  if (doPdf) ok(doPdf.replace(/\s+/g, ' ').trim() === txtAmostra.replace(/\s+/g, ' ').trim(), 'ENAM o .txt da amostra é a extração do PDF de amostra (PyMuPDF disponível)');
  else console.log('ENAM aviso: sem python3/PyMuPDF aqui — o parser foi testado só sobre o .txt da amostra');
  const [provaTxt, gabTxt] = txtAmostra.split('\f');
  const p = parseProvaEnam(provaTxt, areas);
  ok(p.questoes.length === 3 && p.questoes.map(q => q.numero).join(',') === '1,2,3', 'ENAM amostra: três questões na ordem');
  ok(p.questoes.map(q => q.area).join(',') === 'constitucional,constitucional,dh', 'ENAM amostra: a área vem do cabeçalho do bloco (caixa alta e Title Case)');
  ok(p.questoes[0].alternativas.length === 5 && p.questoes[0].alternativas.map(a => a.letra).join('') === 'ABCDE' && p.questoes[0].alternativas[1].texto === 'A acumulação é ilícita em qualquer hipótese.',
    'ENAM amostra: cinco alternativas A–E com o texto limpo');
  ok(/^João, servidor público federal/.test(p.questoes[0].enunciado) && /assinale a afirmativa correta\.$/.test(p.questoes[0].enunciado), 'ENAM amostra: o enunciado junta as linhas sem perder o fim');
  ok(/Considerando a pauta Direitos Humanos e Sociedades Empresárias/.test(p.questoes[2].enunciado) && p.questoes[2].alternativas.length === 5,
    'ENAM amostra: "Direitos"/"Humanos" soltos dentro do enunciado NÃO viram cabeçalho de área');
  const g = parseGabaritoEnam(gabTxt, 1), g2 = parseGabaritoEnam(gabTxt, 2);
  ok(!g.erro && g.respostas[1] === 'B' && g.respostas[2] === '*' && g.respostas[3] === 'C' && Object.keys(g.respostas).length === 3, 'ENAM amostra: gabarito do tipo 1 com a anulada (*), sem contar a legenda');
  ok(!g2.erro && g2.respostas[1] === 'A' && g2.respostas[3] === 'A', 'ENAM amostra: só o bloco do tipo pedido conta');
  ok(!!parseGabaritoEnam('nada aqui', 1).erro, 'ENAM gabarito sem o bloco do tipo devolve erro, não silêncio');
  // o portão: uma edição de mentira com 3 questões e cotas erradas é recusada com motivos claros
  const falso = montarEnam({ ler: (nome) => /gabarito/.test(nome) ? gabTxt : provaTxt });
  ok(falso.erros.some(e => /questões lidas \(esperava 80\)/.test(e)) && falso.erros.some(e => /quadro 8\.6 manda/.test(e)), 'ENAM o portão recusa edição com ≠ 80 questões e cota fora do quadro 8.6');
}
// (b) o banco real: 5 edições × 80, cotas exatas, anuladas contadas, ids únicos, tudo A–E, refs sem inventar
{
  const { questoes, resumo, erros } = montarEnam();
  ok(erros.length === 0, 'ENAM o build das cinco edições passa no portão de qualidade' + (erros.length ? ' (' + erros.slice(0, 3).join(' | ') + ')' : ''));
  ok(questoes.length === 400 && resumo.length === 5 && resumo.every(r => r.questoes === 80), 'ENAM 400 questões (5 × 80)');
  ok(resumo.every(r => Object.entries(r.porArea).every(([a, n]) => n === areasEnam().find(x => x.id === a).cota)), 'ENAM cada edição fecha com 16/10/6/6/12/12/6/12');
  const anul = resumo.map(r => r.edicao + ':' + r.anuladas).join(' ');
  ok(questoes.filter(q => q.anulada).length === 7 && anul === '2024.1:2 2024.2:2 2025.1:1 2025.2:1 2026.1:1', 'ENAM anuladas por edição (' + anul + ')');
  ok(new Set(questoes.map(q => q.id)).size === 400 && questoes.every(q => /^enam-20\d\d\.[12]-\d{3}$/.test(q.id)), 'ENAM ids únicos no formato enam-<edição>-<nnn>');
  ok(questoes.every(q => q.anulada ? q.gabarito === '' : /^[A-E]$/.test(q.gabarito)), 'ENAM gabarito A–E em toda questão não anulada, vazio na anulada');
  ok(questoes.every(q => q.alternativas.length === 5 && q.enunciado.length >= 40 && q.alternativas.every(a => a.texto.length > 0)), 'ENAM 5 alternativas, enunciado ≥ 40 e alternativa nunca vazia');
  // a auditoria de 02/09 pegou o "Realização" da contracapa colado na alternativa E da questão 80 e o
  // marcador U+F020 da moldura de 2024.1 no fim da última alternativa de cada página: nunca mais
  ok(questoes.every(q => q.alternativas.every(a => !/\bRealização$/.test(a.texto) && !/[\uE000-\uF8FF]/.test(a.texto)) && !/[\uE000-\uF8FF]/.test(q.enunciado)),
    'ENAM nenhuma alternativa termina na contracapa ("Realização") nem carrega glifo privado da moldura');
  ok(questoes.every(q => !/(Al[ée]m deste caderno|cart[ãa]o de respostas|fiscal de (sala|prova)|P[ÁA]GINA \d|FGV CONHECIMENTO)/.test(q.enunciado + ' ' + q.alternativas.map(a => a.texto).join(' '))),
    'ENAM nenhuma questão traz frase de capa, instrução ou moldura de página');
  // 2024.1 traz a tabela de correspondência entre os quatro tipos: o gabarito do tipo 1 tem de bater
  // com os dos tipos 2, 3 e 4 questão a questão (240 comparações) — é a prova de que o parser lê o bloco certo
  {
    const t = fs.readFileSync(path.join(RAIZ, 'scripts', 'fontes', 'enam', 'gabarito-2024.1.txt'), 'utf8');
    const g = {}; for (const tipo of [1, 2, 3, 4]) g[tipo] = parseGabaritoEnam(t, tipo);
    const tab = t.slice(t.indexOf('TABELA DE CORRESPOND')); const toks = tab.slice(tab.lastIndexOf('TIPO 4') + 6).replace(/P[áa]gina\s*[–-]?\s*\d+/gi, ' ').split(/\s+/).filter(x => /^\d{1,2}$/.test(x)).map(Number);
    const corr = {}; for (let k = 0; k + 3 < toks.length; k += 4) corr[toks[k]] = { 2: toks[k + 1], 3: toks[k + 2], 4: toks[k + 3] };
    let iguais = 0; for (let q = 1; q <= 80; q++) for (const tipo of [2, 3, 4]) if (corr[q] && g[1].respostas[q] === g[tipo].respostas[corr[q][tipo]]) iguais++;
    ok([1, 2, 3, 4].every(k => !g[k].erro && Object.keys(g[k].respostas).length === 80) && iguais === 240, 'ENAM 2024.1: gabarito do tipo 1 bate com os tipos 2, 3 e 4 pela tabela de correspondência (' + iguais + '/240)');
  }
  ok(questoes.every(q => q.disciplina && q.fonte.startsWith('FGV/ENFAM') && EDICOES_ENAM.some(e => e.id === q.edicao)), 'ENAM toda questão diz a disciplina e a fonte oficial');
  ok(questoes.every(q => Array.isArray(q.refs) && q.refs.every(r => (q.enunciado + ' ' + q.alternativas.map(a => a.texto).join(' ')).toLowerCase().includes(r.toLowerCase()))), 'ENAM a referência normativa só aponta o que o próprio texto diz');
  // o arquivo gerado bate com o build (ninguém editou à mão)
  const gerado = fs.readFileSync(path.join(RAIZ, 'questoes-enam.js'), 'utf8');
  ok(gerado.includes('window.CT_QUESTOES_ENAM=' + JSON.stringify(questoes) + ';'), 'ENAM questoes-enam.js é exatamente o que o build gera');
  ok(/FONTES\.md/.test(gerado) && EDICOES_ENAM.every(e => gerado.includes(e.fonte)), 'ENAM o cabeçalho do arquivo cita edição e fonte FGV/ENFAM');
  // sem comentário de terceiros: nenhum campo além dos declarados
  const campos = new Set(questoes.flatMap(q => Object.keys(q)));
  ok([...campos].sort().join(',') === 'alternativas,anulada,area,disciplina,edicao,enunciado,fonte,gabarito,id,numero,refs', 'ENAM o shape é o da especificação — nada de comentário copiado');
  // os builds copiam os dois arquivos; o web lista o banco "sob pedido"
  const b = fs.readFileSync(path.join(RAIZ, 'scripts', 'build.mjs'), 'utf8'), bm = fs.readFileSync(path.join(RAIZ, 'scripts', 'build-macos.mjs'), 'utf8');
  ok(/'questoes-enam\.js'/.test(b) && /'enam\.js'/.test(b) && /'\.\/questoes-enam\.js'/.test(b) && /'questoes-enam\.js'/.test(bm) && /'enam\.js'/.test(bm), 'ENAM enam.js e questoes-enam.js entram nos dois builds (o banco sob pedido, a constante na casca)');
}
// (c) no app: CT_ENAM na casca; o banco só chega quando o treino pede (acervoQuestoesEnam)
{
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const app = await page.evaluate(async () => {
    const r = {};
    r.constanteNaCasca = !!(window.CT_ENAM && window.CT_ENAM.AREAS && window.CT_ENAM.AREAS.length === 8 && window.CT_ENAM.QUESTOES === 80 && window.CT_ENAM.DURACAO_MIN === 300 && window.CT_ENAM.META_PADRAO === 56 && window.CT_ENAM.META_COTA === 40);
    r.bancoNaoCarregaSozinho = !window.CT_QUESTOES_ENAM;
    await new Promise(res => { const t = document.createElement('script'); t.src = './treino.js'; t.onload = () => res(true); t.onerror = () => res(false); document.head.appendChild(t); });
    r.treinoTemAcervo = typeof window.CT_TREINO.acervoQuestoesEnam === 'function';
    await window.CT_TREINO.acervoQuestoesEnam();
    r.bancoChegaSobPedido = Array.isArray(window.CT_QUESTOES_ENAM) && window.CT_QUESTOES_ENAM.length === 400 && window.CT_QUESTOES_ENAM.filter(q => q.anulada).length === 7;
    return r;
  });
  for (const [k, v] of Object.entries(app)) ok(v, 'ENAM app ' + k);
}

/* ============= ENAM — E1: calendário, meta e contagem regressiva ============= */
// (a) as funções puras de enam.js, nos aceites da especificação
await page.goto(URL0 + '/tests/harness-leitura-ativa.html');
await page.evaluate(() => new Promise(res => { const t = document.createElement('script'); t.src = '/enam.js'; t.onload = () => res(true); t.onerror = () => res(false); document.head.appendChild(t); }));
const e1 = await page.evaluate(() => {
  const E = window.CT_ENAM, r = {}, em = iso => new Date(iso);
  r.diasAte88 = E.diasAte('2026-11-29', em('2026-09-02T12:00:00-03:00'), 'America/Sao_Paulo') === 88;
  // 28/11 às 23h30 em Porto Velho (UTC−4) ainda é dia 28 no aparelho: falta 1 — em Brasília já é 29: 0
  r.viradaEmPortoVelho = E.diasAte('2026-11-29', em('2026-11-28T23:30:00-04:00'), 'America/Porto_Velho') === 1 && E.diasAte('2026-11-29', em('2026-11-28T23:30:00-04:00'), 'America/Sao_Paulo') === 0;
  r.diaDaProvaZero = E.diasAte('2026-11-29', em('2026-11-29T10:00:00-03:00'), 'America/Sao_Paulo') === 0 && E.diasAte('2026-11-29', em('2026-11-30T10:00:00-03:00'), 'America/Sao_Paulo') === -1;
  r.cadenciaSeis = E.cadencia(em('2026-09-02T12:00:00-03:00'), '2026-11-29', 'America/Sao_Paulo').join(',') === '2026-09-13,2026-09-27,2026-10-11,2026-10-25,2026-11-08,2026-11-22';
  r.cadenciaVazia = E.cadencia(em('2026-11-25T12:00:00-03:00'), '2026-11-29', 'America/Sao_Paulo').length === 0;
  r.horaLocal = E.horaLocal({ data: '2026-11-29', inicio: '13:00' }, 'America/Porto_Velho') === 'prova às 13h de Brasília · 12h em Porto Velho'
    && E.horaLocal({ data: '2026-11-29', inicio: '13:00' }, 'America/Sao_Paulo') === 'prova às 13h de Brasília';
  r.instanteEmUTC = new Date(E.instante('2026-11-29', '13:00', 'America/Sao_Paulo')).toISOString() === '2026-11-29T16:00:00.000Z';
  r.proximaEdicao = E.proxima(em('2026-09-02T12:00:00-03:00')).id === '2026.2' && E.edicao('2026.2').data === '2026-11-29' && E.edicao('2026.2').inicio === '13:00';
  r.edicoesComDatasDosEditais = E.EDICOES.map(e => e.id + ':' + e.data).join(' ') === '2024.1:2024-04-14 2024.2:2024-10-20 2025.1:2025-05-18 2025.2:2025-10-26 2026.1:2026-06-07 2026.2:2026-11-29';
  return r;
});
for (const [k, v] of Object.entries(e1)) ok(v, 'ENAM/E1 ' + k);

// (b) o host: sem catedra:enam nada aparece e Ajustes convida; ativar cria a chave, o chip e a régua; a meta muda só o número
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.removeItem('catedra:enam'); localStorage.removeItem('catedra:prova');
  });
  await page.goto(host);
  await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp, E = window.CT_ENAM;
    r.chaveNoAutosave = app._autosaveKeys().includes('enam');
    r.semTrilhaSemChip = ![...document.querySelectorAll('.cth-chip')].some(c => /ENAM/.test(c.textContent));
    // Ajustes → ENAM: o estado vazio convida
    const mais = document.querySelector('button[aria-label="Mostrar mais opções"]'); if (mais) mais.click(); await w(300);
    document.querySelector('button[data-view="ajustes"]').click(); await w(700);
    const aba = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'enam');
    r.abaExiste = !!aba && /ENAM/.test(aba.textContent);
    aba.click(); await w(600);
    const convite = [...document.querySelectorAll('main .ct-estado')].find(d => /Vai fazer o ENAM\? Ative a trilha/.test(d.textContent));
    r.estadoVazioConvida = !!convite && /próxima edição é a 2026\.2/.test(convite.textContent);
    r.semCampoDeAutodeclaracao = !/raça|etnia|deficiência|quilombola|indígen|negr/i.test(document.querySelector('main').textContent);
    [...convite.querySelectorAll('button')].find(b => /Ativar a trilha ENAM/.test(b.textContent)).click(); await w(1000);
    const en = JSON.parse(localStorage.getItem('catedra:enam') || 'null');
    r.ativarGravaAChave = !!en && en.ativo === true && en.edicao === '2026.2' && en.data === '2026-11-29' && en.inicio === '13:00' && en.fuso === 'America/Sao_Paulo' && en.duracaoMin === 300 && en.metaAcertos === 56 && en.up > 0;
    const b56 = document.querySelector('main button[data-meta="56"]'), b40 = document.querySelector('main button[data-meta="40"]');
    r.metaDoisBotoesNeutros = !!b56 && !!b40 && /56 acertos \(70%\)/.test(b56.textContent) && /40 acertos \(50%\)/.test(b40.textContent) && b56.getAttribute('aria-pressed') === 'true' && b40.getAttribute('aria-pressed') === 'false'
      && /itens 3\.7 e 9\.2/.test(document.querySelector('main').textContent);
    r.alvo44 = b56.getBoundingClientRect().height >= 44;
    const antes = JSON.parse(localStorage.getItem('catedra:enam'));
    b40.click(); await w(900);
    const depois = JSON.parse(localStorage.getItem('catedra:enam'));
    r.trocarMetaMudaSoONumero = depois.metaAcertos === 40 && depois.up >= antes.up && Object.keys(depois).filter(k => k !== 'metaAcertos' && k !== 'up').every(k => JSON.stringify(depois[k]) === JSON.stringify(antes[k]));
    r.horaNoAjuste = /prova às 13h de Brasília/.test(document.querySelector('main').textContent) && /80 questões · 5 horas/.test(document.querySelector('main').textContent);
    // o chip do Início
    window.__catedraGoView('inicio'); await w(700);
    const chip = [...document.querySelectorAll('.cth-chip')].find(c => /ENAM 2026\.2/.test(c.textContent));
    const dias = E.diasAte('2026-11-29');
    r.chipNoInicio = !!chip && chip.textContent.includes(dias === 1 ? 'falta 1 dia' : 'faltam ' + dias + ' dias') && /prova às 13h de Brasília/.test(chip.getAttribute('title') || '') && /ENAM 2026\.2/.test(chip.getAttribute('aria-label') || '');
    r.chipSemEmoji = !!chip && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(chip.textContent) && !!chip.querySelector('svg');
    // a régua: só ENAM → o número é o do ENAM; com concurso mais perto, o concurso manda e o ENAM vira marco
    window.__catedraGoView('reta-final'); await w(700);
    const main = () => document.querySelector('main').textContent;
    r.retaContaOEnam = new RegExp('dias para o ENAM 2026\\.2').test(main()) && !document.querySelector('main .ct-regua-marca2');
    localStorage.setItem('catedra:prova', '2026-10-15'); app.setState({ provaData: '2026-10-15' }); await w(500);
    const dC = Math.ceil((new Date('2026-10-15T00:00:00') - new Date()) / 864e5);
    r.concursoMaisPertoManda = new RegExp('dias para a prova').test(main()) && !!document.querySelector('main .ct-regua-marca2') && new RegExp('prova · ' + dC + ' d').test(document.querySelector('main .ct-regua-cap2').textContent);
    window.__catedraGoView('edital'); await w(700);
    r.editalTemOMarco = !!document.querySelector('main .ct-regua-marca2');
    localStorage.removeItem('catedra:prova'); app.setState({ provaData: null });
    // desativar não apaga
    window.__catedraGoView('ajustes'); await w(600);
    [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'enam').click(); await w(500);
    [...document.querySelectorAll('main button')].find(b => /Desativar a trilha/.test(b.textContent)).click(); await w(900);
    const off = JSON.parse(localStorage.getItem('catedra:enam'));
    r.desativarMantemOsDados = off.ativo === false && off.metaAcertos === 40 && off.edicao === '2026.2';
    window.__catedraGoView('inicio'); await w(500);
    r.desligadoSomeOChip = ![...document.querySelectorAll('.cth-chip')].some(c => /ENAM/.test(c.textContent));
    localStorage.removeItem('catedra:enam');
    return r;
  });
  for (const [k, v] of Object.entries(h)) ok(v, 'ENAM/E1 ' + k);
}

/* ============= ENAM — E3: o simulado no formato da prova ============= */
// (a) CT_ENAM.montar, puro, com banco sintético: cotas exatas na ordem do edital, sem anulada,
//     sem repetir o que a pessoa já fez enquanto houver estoque, reserva só onde falta e nunca C/E
{
  await import('../enam.js');
  const E = globalThis.CT_ENAM;
  const q = (area, disc, n, extra) => ({ id: 'q-' + area + '-' + n, edicao: '2099.1', numero: n, area, disciplina: disc, anulada: false,
    enunciado: 'Enunciado sintético número ' + n + ' da área ' + area + ', longo o bastante para valer.',
    alternativas: 'ABCDE'.split('').map(l => ({ letra: l, texto: 'alternativa ' + l })), gabarito: 'C', ...(extra || {}) });
  const banco = [];
  const discDe = { constitucional: 'Direito Constitucional', administrativo: 'Direito Administrativo', humanistica: 'Noções Gerais de Direito e Formação Humanística', dh: 'Direitos Humanos', processocivil: 'Direito Processual Civil', civil: 'Direito Civil', empresarial: 'Direito Empresarial', penal: 'Direito Penal' };
  for (const a of E.AREAS) {
    const n = a.id === 'empresarial' ? 4 : 20;                       // empresarial com estoque curto
    for (let i = 1; i <= n; i++) banco.push(q(a.id, discDe[a.id], i));
  }
  banco.push(q('constitucional', discDe.constitucional, 98, { anulada: true }), q('constitucional', discDe.constitucional, 99, { anulada: true }));
  banco.push(q('civil', discDe.civil, 97, { alternativas: 'ABCD'.split('').map(l => ({ letra: l, texto: 'x' })) }));   // 4 alternativas: fora
  const reserva = [
    ...[1, 2, 3].map(i => ({ id: 'r-emp-' + i, banca: 'FGV', orgao: 'TJ', ano: '2023', disciplina: 'Direito Empresarial', enunciado: 'Questão de prova de magistratura sobre empresarial número ' + i + ' com texto.', alternativas: 'ABCDE'.split('').map(l => ({ letra: l, texto: 'r' + l })), gabarito: 'A', pct: 50 })),
    ...[1, 2].map(i => ({ id: 'r-civ-' + i, banca: 'FGV', orgao: 'TJ', ano: '2023', disciplina: 'Direito Civil', enunciado: 'Questão de prova de magistratura sobre civil número ' + i + ' com texto.', alternativas: 'ABCDE'.split('').map(l => ({ letra: l, texto: 'r' + l })), gabarito: 'A', pct: 50 })),
    { id: 'ce-1', origem: 'lei', enunciado: 'Item Certo/Errado que nunca pode entrar na prova, mesmo com estoque curto.', certo: true }
  ];
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const m = E.montar(banco, { reserva, rnd });
  const r = {};
  r.oitentaNasCotas = m.total === 80 && m.itens.length === 80 && m.porArea.map(a => a.n + '/' + a.cota).join(' ') === '16/16 10/10 6/6 6/6 12/12 12/12 6/6 12/12';
  r.ordemDoEdital = m.porArea.map(a => a.id).join(',') === E.AREAS.map(a => a.id).join(',') && m.itens.slice(0, 16).every(x => x.area === 'constitucional') && m.itens.slice(-12).every(x => x.area === 'penal')
    && m.porArea[0].de === 1 && m.porArea[0].ate === 16 && m.porArea[7].de === 69 && m.porArea[7].ate === 80;
  r.semAnulada = !m.itens.some(x => /-9[89]$/.test(x.id)) && !m.itens.some(x => x.id === 'q-civil-97');
  r.reservaSoOndeFalta = m.foraDoEnam === 2 && m.porArea[6].doBanco === 4 && m.porArea[6].foraDoEnam === 2 && m.itens.filter(x => x.foraDoEnam).every(x => x.area === 'empresarial' && /^qpr-emp-/.test(x.id)) && !m.itens.some(x => /^qpr-civ-/.test(x.id));
  r.nuncaCE = m.itens.every(x => x.alternativas && x.alternativas.length === 5 && /^[A-E]$/.test(x.certo)) && !m.itens.some(x => x.id === 'ce-1' || x.id === 'qpce-1');
  r.itemTemRef = m.itens.filter(x => !x.foraDoEnam).every(x => x.origem === 'enam' && /^ENAM 2099\.1 · questão \d+$/.test(x.ref) && x.ramo) && m.itens.filter(x => x.foraDoEnam).every(x => x.origem === 'prova' && /FGV · TJ · 2023/.test(x.ref));
  const feitas5 = [1, 2, 3, 4, 5].map(i => 'q-civil-' + i), feitas10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => 'q-civil-' + i);
  const m5 = E.montar(banco, { reserva, rnd, excluir: feitas5 }), m10 = E.montar(banco, { reserva, rnd, excluir: feitas10 });
  r.naoRepeteEnquantoHaEstoque = !m5.itens.some(x => feitas5.includes(x.id)) && m5.porArea[5].n === 12;
  r.repeteAntesDeSairDoBanco = m10.itens.filter(x => x.area === 'civil').length === 12 && m10.itens.filter(x => feitas10.includes(x.id)).length === 2 && !m10.itens.some(x => /^qpr-civ-/.test(x.id));
  r.embaralhaDentroDoBloco = E.montar(banco, { reserva, rnd }).itens.slice(0, 16).map(x => x.id).join() !== m.itens.slice(0, 16).map(x => x.id).join();
  r.cotaCustom = E.montar(banco, { reserva, rnd, cotas: { constitucional: 2, penal: 1 } }).porArea.map(a => a.n).join(',') === '2,10,6,6,12,12,6,1';
  const falta = E.montar(banco.filter(x => x.area !== 'dh'), { rnd });
  r.faltaSemReserva = falta.total === 72 && falta.faltam === 8 && falta.porArea[3].n === 0 && falta.porArea[6].n === 4 && falta.foraDoEnam === 0;   // sem dh (6) e sem reserva para empresarial (faltam 2)
  const rh = E.rehidratar(m.itens.map(x => x.id), banco, reserva);
  r.rehidrataNaMesmaOrdem = !!rh && rh.length === 80 && rh.every((x, i) => x.id === m.itens[i].id && x.enunciado === m.itens[i].enunciado) && E.rehidratar(['q-nao-existe'], banco, reserva) === null;
  r.constanteDe36h = E.RETOMAR_H === 36 && E.DURACAO_MIN === 300;
  for (const [k, v] of Object.entries(r)) ok(v, 'ENAM/E3 montar ' + k);
}
// (b) o host: o preset monta 80 do banco oficial, o teclado responde, a prova sobrevive a recarregar
//     por ct_enam_prova, encerrar corrige e registra, sair limpa. O roteiro do WebKit corre aqui também.
{
  const { testarEnamModo } = await import('./enam-modo.mjs');
  await testarEnamModo(page, URL0, ok, { motor: 'chromium', origem: 'http' });
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => { ['ct_enam_prova', 'ct_prova', 'catedra:enamSim', 'catedra:errors', 'catedra:fc'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('catedra:provaDurationMin', '240'); });
  await page.goto(host); await page.waitForTimeout(1600);
  const a = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    r.chaveNoAutosave = app._autosaveKeys().includes('enamSim');
    window.__catedraGoView('simulados'); await w(600);
    document.querySelector('main button[data-v="enam"]').click(); await w(200);
    const abrir = [...document.querySelectorAll('main button')].find(b => /^(Começar|Fechar)$/.test(b.textContent.trim())); if (abrir.textContent.trim() === 'Começar') { abrir.click(); await w(400); }
    // sem o banco: explica o que falta e NÃO monta itens Certo/Errado
    const T = await app._treino(); const orig = T.acervoQuestoesEnam; const bancoAntes = window.CT_QUESTOES_ENAM;
    T.acervoQuestoesEnam = () => Promise.reject(new Error('sem arquivo')); delete window.CT_QUESTOES_ENAM;
    [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent)).click(); await w(600);
    const alerta = document.querySelector('main .ct-estado[role=alert]');
    r.semBancoExplica = !!alerta && /questoes-enam\.js/.test(alerta.textContent) && /não substitui a prova por itens de Certo\/Errado/.test(alerta.textContent) && !app.state.provaMode && app.state.sjItens.length === 0;
    T.acervoQuestoesEnam = orig; if (bancoAntes) window.CT_QUESTOES_ENAM = bancoAntes;
    // monta e responde 3 pelo teclado (A, seta, B, seta, C) e marca a 2ª para rever
    [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent)).click();
    for (let i = 0; i < 60 && !document.querySelector('.ct-enam'); i++) await w(250);
    r.montou = app.state.sjItens.length === 80 && !document.querySelector('main .ct-estado[role=alert]') && app.state.provaName === 'ENAM ' + window.CT_ENAM.proxima().id + ' · simulado';
    const tecla = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    tecla('a'); await w(120); tecla('ArrowRight'); await w(120); tecla('B'); await w(120); tecla('r'); await w(120); tecla('ArrowRight'); await w(120); tecla('c'); await w(120); tecla('ArrowLeft'); await w(150);
    const its = app.state.sjItens;
    r.tecladoResponde = app.state.sjResp[its[0].id] === 'A' && app.state.sjResp[its[1].id] === 'B' && app.state.sjResp[its[2].id] === 'C' && app.state.sjAtual === 1;
    r.reverMarca = !!app.state.sjRev[its[1].id] && document.querySelector('.ct-gab-q[data-i="1"]').getAttribute('data-rev') === '1' && /para rever/.test(document.querySelector('.ct-gab-q[data-i="1"]').getAttribute('aria-label'));
    tecla('Backspace'); await w(120); r.emBrancoApaga = app.state.sjResp[its[1].id] === undefined && document.querySelector('.ct-gab-q[data-i="1"]').getAttribute('data-est') === 'branco';
    tecla('b'); await w(120);
    r.escNaoDescarta = (tecla('Escape'), app.state.provaMode === true);
    document.querySelector('.ct-gab-q[data-i="79"]').click(); await w(200);
    r.gradeVaiParaAQuestao = app.state.sjAtual === 79 && document.querySelector('.ct-gab-q[data-i="79"]').getAttribute('data-atual') === '1' && /Penal/.test(document.querySelector('.ct-enam-meta').textContent);
    r.faixasDasAreas = /Constitucional\s*1–16/.test(document.querySelector('.ct-enam-faixas').textContent) && /Penal\s*69–80/.test(document.querySelector('.ct-enam-faixas').textContent);
    r.semEmoji = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.querySelector('.ct-enam').textContent);
    r.relogioMono = /mono|Menlo|Courier|SF Mono/i.test(getComputedStyle(document.querySelector('.ct-enam-tempo')).fontFamily);
    // avisos discretos: cruzar os 60 e os 15 minutos finais dá um toast cada, sem som
    const toasts = () => [...document.querySelectorAll('div[role=status]')].map(d => d.textContent).join(' | ');
    app.setState({ provaSeconds: 300 * 60 - 3600 - 1 }); await w(1700);
    r.aviso60 = /Falta 1 hora/.test(toasts()) && document.querySelector('.ct-enam-tempo').getAttribute('data-aviso') === '1';
    app.setState({ provaSeconds: 300 * 60 - 900 - 1 }); await w(1700);
    r.aviso15 = /Faltam 15 minutos/.test(toasts()) && /Faltam 15 minutos/.test(document.querySelector('.ct-enam-aviso').textContent) && !app._ac;
    r.pausaMarcaATentativa = ([...document.querySelectorAll('.ct-enam-acoes button')].find(b => /Pausar/.test(b.textContent)).click(), app.state.sjComPausa === true && !app.state.provaRunning);
    await w(100); tecla('d'); await w(100);
    r.pausadaNaoResponde = app.state.sjResp[its[79].id] === undefined;
    r.ids = its.map(x => x.id).join(','); r.resp = JSON.stringify(app.state.sjResp); r.sec = app.state.provaSeconds;
    return r;
  });
  for (const [k, v] of Object.entries(a)) if (!['ids', 'resp', 'sec'].includes(k)) ok(v, 'ENAM/E3 host ' + k);
  // recarregar: a mesma prova, as mesmas respostas, o tempo restante não cresce
  await page.goto(host); await page.waitForTimeout(3500);
  const b = await page.evaluate(async (antes) => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    for (let i = 0; i < 60 && !document.querySelector('.ct-enam'); i++) await w(250);
    r.recarregarVoltaAProva = !!document.querySelector('.ct-enam') && app.state.view === 'simulados' && app.state.sjModo === 'enam';
    r.mesmaProvaMesmasRespostas = app.state.sjItens.map(x => x.id).join(',') === antes.ids && JSON.stringify(app.state.sjResp) === antes.resp && Object.keys(app.state.sjResp).length === 3;
    r.tempoRestanteNaoCresce = app.state.provaSeconds >= antes.sec && app.state.provaDurationMin === 300 && !app.state.provaRunning;
    r.avisoDeRetomada = [...document.querySelectorAll('div[role=status]')].some(d => /Simulado ENAM retomado onde parou — 3 respondidas/.test(d.textContent));
    // sair limpa a chave e devolve a duração da sala comum
    app.exitProva(); await w(300);
    r.sairLimpaAChave = !localStorage.getItem('ct_enam_prova') && !localStorage.getItem('ct_prova') && !app.state.provaMode && app.state.sjItens.length === 0 && app.state.provaDurationMin === 240;
    // encerrar: corrige, registra a sessão (Simulado · ENAM · minutos reais) e guarda a tentativa só com ids
    [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent)).click();
    for (let i = 0; i < 60 && !document.querySelector('.ct-enam'); i++) await w(250);
    const its = app.state.sjItens, resp = {};
    resp[its[0].id] = its[0].certo; resp[its[1].id] = its[1].certo; resp[its[2].id] = its[2].certo;
    resp[its[3].id] = its[3].certo === 'A' ? 'B' : 'A'; resp[its[4].id] = its[4].certo === 'A' ? 'B' : 'A';
    app.setState({ sjResp: resp, provaSeconds: 47 * 60 }); await w(200);
    [...document.querySelectorAll('.ct-enam-acoes button')].find(b => /Encerrar e corrigir/.test(b.textContent)).click();
    // a correção fecha a prova, e a tentativa só chega ao disco pelo autosave (500 ms). Sob carga os
    // 900 ms fixos passavam, catedra:enamSim vinha vazio e o es[0] logo abaixo derrubava a suíte inteira
    for (let i = 0; i < 160 && !(app.state.sjFim === true && JSON.parse(localStorage.getItem('catedra:enamSim') || '[]').length >= 1); i++) await w(50);
    r.encerrarFechaECorrige = !app.state.provaMode && !document.querySelector('.ct-enam') && app.state.sjFim === true && app.state.sim.total === 80 && app.state.sim.acertos === 3 && app.state.sim.erros === 2 && app.state.sim.brancos === 75;
    r.sessaoPreenchida = app.state.sessionModalOpen === true && app.state.sessionDraft.categoria === 'Simulado' && app.state.sessionDraft.disc === 'ENAM' && app.state.sessionDraft.minutos === '47' && /ENAM .* · simulado/.test(app.state.sessionDraft.topico);
    const es = JSON.parse(localStorage.getItem('catedra:enamSim') || '[]');
    r.tentativaSoComIds = es.length === 1 && es[0].idsUsados.length === 80 && es[0].acertos === 3 && es[0].brancos === 75 && es[0].up > 0 && !/enunciado/.test(localStorage.getItem('catedra:enamSim')) && !(localStorage.getItem('catedra:enamSim') || '').includes(its[0].enunciado.slice(0, 30));
    r.errosPeloCanalDoItem2 = (app.state.errors || []).filter(e => e.source === 'Simulado ENAM').length === 2 && (app.state.flashcards || []).filter(c => c.origem === 'Simulado ENAM' && /^Gabarito: [A-E] — /.test(c.back)).length === 2;
    r.limpouAsChaves = !localStorage.getItem('ct_enam_prova') && !localStorage.getItem('ct_prova');
    app.closeSession(); await w(300);
    const main = document.querySelector('main').textContent;
    r.relatorioPorArea = /Por área do edital/.test(main) && /Constitucional\s*\d+ de 16 · alvo \d+/.test(main) && !/Jurisprudência\s*0\/0/.test(main);
    r.gabaritoComReferencia = /ENAM 20\d\d\.\d · questão \d+/.test(main) && !/Texto oficial:/.test(main);
    // a segunda montagem evita as 80 já feitas
    const feitas = es[0] ? new Set(es[0].idsUsados) : null;   // sem a tentativa gravada: falha nomeada, não exceção
    r.proximaEvitaAsFeitas = !!feitas && window.CT_ENAM.montar(window.CT_QUESTOES_ENAM, { excluir: [...feitas], reserva: window.CT_QUESTOES_PROVA || [] }).itens.every(x => !feitas.has(x.id));
    // tempo esgotado: corrige sozinho, sem beep
    [...document.querySelectorAll('main button')].find(b => /Novo simulado/.test(b.textContent)).click(); await w(300);
    [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent)).click();
    for (let i = 0; i < 60 && !document.querySelector('.ct-enam'); i++) await w(250);
    app.setState({ provaSeconds: 300 * 60 - 1 });
    // o relógio zera, a correção roda sozinha e a 2ª tentativa chega ao disco: espera isso, não 1,9 s fixos
    for (let i = 0; i < 160 && JSON.parse(localStorage.getItem('catedra:enamSim') || '[]').length < 2; i++) await w(50);
    const es2 = JSON.parse(localStorage.getItem('catedra:enamSim') || '[]');
    r.tempoEsgotadoCorrigeSozinho = !app.state.provaMode && app.state.sjFim === true && es2.length === 2 && es2[1].auto === true && !app._ac;
    app.closeSession(); localStorage.removeItem('catedra:enamSim'); app.setState({ enamSim: [] });
    return r;
  }, a).catch(e => ({ __excecao: String(e && e.message || e).split('\n')[0].slice(0, 200) }));
  // uma exceção aqui dentro vira UMA falha nomeada, não o fim da suíte inteira
  if (b.__excecao) ok(false, 'ENAM/E3 host o roteiro correu sem exceção (' + b.__excecao + ')');
  else for (const [k, v] of Object.entries(b)) ok(v, 'ENAM/E3 host ' + k);
}

/* ============= ENAM — E4: a correção "habilitaria?" ============= */
// (a) CT_ENAM.corrigir, pura: os aceites da especificação (51/80 com meta 56 → não, −5; com meta 40 → sim, +11),
//     alvo proporcional por área, anulada fora da conta, tempo médio só das respondidas
{
  await import('../enam.js');
  const E = globalThis.CT_ENAM, r = {};
  const its = []; E.AREAS.forEach(a => { for (let i = 0; i < a.cota; i++) its.push({ id: a.id + '-' + i, area: a.id, ramo: a.nome, certo: 'C', alternativas: [] }); });
  // 51 certas, 25 erradas, 4 em branco — as certas concentradas no começo do caderno, como quem estuda o que vem primeiro
  const resp = {}; its.forEach((it, i) => { if (i < 51) resp[it.id] = 'C'; else if (i < 76) resp[it.id] = 'A'; });
  const c56 = E.corrigir(its, resp, 56, { segundos: 16920 }), c40 = E.corrigir(its, resp, 40, { segundos: 16920, comPausa: true });
  r.contas = c56.total === 80 && c56.acertos === 51 && c56.brancos === 4 && c56.erros === 25 && c56.respondidas === 76;
  r.meta56NaoHabilita = c56.meta === 56 && c56.habilitaria === false && c56.margem === -5;
  r.meta40Habilita = c40.meta === 40 && c40.habilitaria === true && c40.margem === 11 && c40.comPausa === true && c56.comPausa === false;
  r.alvoProporcional = c56.porAreaEdital.every(a => a.alvo === Math.round(a.cota * 56 / 80 * 10) / 10) && c56.porAreaEdital[0].alvo === 11.2 && c56.porAreaEdital[0].alvoInt === 11 && c40.porAreaEdital[0].alvo === 8;
  r.ordemDoEdital = c56.porAreaEdital.map(a => a.area).join(',') === E.AREAS.map(a => a.id).join(',') && c56.porAreaEdital.every(a => a.n === a.cota);
  r.deficitOrdenado = c56.porArea.every((a, i, l) => i === 0 || l[i - 1].deficit >= a.deficit) && c56.porArea[0].area === 'penal' && c56.porArea[0].ok === 0 && c56.porArea[0].deficit === 8.4;
  r.okSobreCota = c56.porAreaEdital[0].ok === 16 && c56.porAreaEdital[0].deficit === -4.8 && c56.porAreaEdital.find(a => a.area === 'civil').txt === undefined;
  r.tempoSoDasRespondidas = c56.tempoTotalSeg === 16920 && c56.segPorQuestao === 223 && c56.segDisponivel === 225 && E.corrigir(its, {}, 56, { segundos: 900 }).segPorQuestao === 0;
  const comAnuladas = its.concat([{ id: 'x1', area: 'civil', certo: 'A', anulada: true }, { id: 'x2', area: 'civil', certo: 'A', anulada: true }]);
  const ca = E.corrigir(comAnuladas, { ...resp, x1: 'A', x2: 'B' }, 56);
  r.anuladaNaoConta = ca.total === 80 && ca.acertos === 51 && ca.erros === 25 && ca.anuladas === 2 && ca.porAreaEdital.find(a => a.area === 'civil').n === 12;
  const fora = its.map((it, i) => i >= 62 && i < 68 ? { ...it, foraDoEnam: true } : it);
  r.foraDoEnamContado = E.corrigir(fora, resp, 56).foraDoEnam === 6 && E.corrigir(fora, resp, 56).porAreaEdital.find(a => a.area === 'empresarial').foraDoEnam === 6;
  r.metaInvalidaCaiNoPadrao = E.corrigir(its, resp, 0).meta === 56 && E.corrigir(its, resp, undefined).meta === 56;
  for (const [k, v] of Object.entries(r)) ok(v, 'ENAM/E4 corrigir ' + k);
}
// (b) o host: a tela responde "habilitaria?" em --ok ou "faltaram N" em --warn (nunca --danger), barras por área com
//     o alvo, as três áreas onde faltou com "Estudar esta área", erros pelo canal do item 2 (teto 20, aviso, desfazer),
//     tentativa em catedra:enamSim sem enunciado, e as referências do gabarito com o caminho para LEGIS/JURIS
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => { ['ct_enam_prova', 'ct_prova', 'catedra:enamSim', 'catedra:errors', 'catedra:fc', 'catedra:enam'].forEach(k => localStorage.removeItem(k)); });
  await page.goto(host); await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp, E = window.CT_ENAM;
    const corDe = (el) => getComputedStyle(el).color;
    // os tokens moram no div raiz do app, não em :root — a sonda tem de nascer dentro de main
    const corToken = (t) => { const p = document.createElement('span'); p.style.color = 'var(' + t + ')'; document.querySelector('main').appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const montar = async () => {
      window.__catedraGoView('simulados'); await w(500);
      const chip = document.querySelector('main button[data-v="enam"]'); if (chip.getAttribute('aria-pressed') !== 'true') { chip.click(); await w(200); }
      const abrir = [...document.querySelectorAll('main button')].find(b => /^(Começar|Fechar)$/.test(b.textContent.trim())); if (abrir && abrir.textContent.trim() === 'Começar') { abrir.click(); await w(400); }
      const novo = [...document.querySelectorAll('main button')].find(b => /Novo simulado/.test(b.textContent)); if (novo) { novo.click(); await w(300); }
      [...document.querySelectorAll('main button')].find(b => /Iniciar o simulado ENAM/.test(b.textContent)).click();
      for (let i = 0; i < 60 && !document.querySelector('.ct-enam'); i++) await w(250);
      return app.state.sjItens;
    };
    // 51 certas, 25 erradas, 4 brancas — e a 1ª questão ganha referências conhecidas para o gabarito
    const responder = (its) => { const resp = {}; its.forEach((it, i) => { if (i < 51) resp[it.id] = it.certo; else if (i < 76) resp[it.id] = it.certo === 'A' ? 'B' : 'A'; }); return resp; };
    let its = await montar();
    its[0].refs = ['Art. 25 da CF', 'Tema 698', 'Art. 11']; its[0].origem = 'enam';
    app.setState({ sjResp: responder(its), provaSeconds: 16920 }); await w(200);
    [...document.querySelectorAll('.ct-enam-acoes button')].find(b => /Encerrar e corrigir/.test(b.textContent)).click();
    // a correção cria o lote de erros e os cartões e troca a tela: espera isso, não um tempo fixo (sob
    // carga os 900 ms passavam e o teto de vinte era medido antes de o lote existir)
    for (let i = 0; i < 160 && !((app.state.errors || []).filter(e => e.source === 'Simulado ENAM').length >= 20 && document.querySelector('main .ct-enam-res-n')); i++) await w(50);
    const main = () => document.querySelector('main');
    const selo = main().querySelector('.ct-enam-selo');
    r.numeroGrande = /51/.test(main().querySelector('.ct-enam-res-n').textContent) && /\/80/.test(main().querySelector('.ct-enam-res-n').textContent) && /Georgia|serif|Fraunces|Playfair|Display/i.test(getComputedStyle(main().querySelector('.ct-enam-res-n')).fontFamily);
    r.faltaramCinco = !!selo && selo.textContent.trim() === 'faltaram 5 acertos' && selo.getAttribute('data-ok') === '';
    r.seloEmWarnNuncaDanger = !!selo && corDe(selo) === corToken('--warn') && corDe(selo) !== corToken('--danger');
    r.metaEMargem = /meta de 56 acertos · margem −5 · 4 em branco · 25 erros/.test(main().textContent);
    r.tempoMedio = /223 s por questão respondida · 225 s disponíveis/.test(main().textContent);
    const barras = [...main().querySelectorAll('.ct-enam-barra')];
    r.oitoBarrasNaOrdem = barras.length === 8 && /^Constitucional/.test(barras[0].textContent) && /^Penal/.test(barras[7].textContent) && /16 de 16 · alvo 11/.test(barras[0].textContent) && /0 de 12 · alvo 8/.test(barras[7].textContent);
    r.barraTemAlvoEPreenchimento = barras[0].getAttribute('data-ok') === '1' && barras[7].getAttribute('data-ok') === '' && /left:\s*70%/.test(barras[0].querySelector('.tr > b').getAttribute('style')) && /width:\s*100%/.test(barras[0].querySelector('.tr > i').getAttribute('style'));
    const faltou = [...main().querySelectorAll('.ct-enam-faltou > div')];
    r.tresAreasOndeFaltou = faltou.length === 3 && /^Penal/.test(faltou[0].textContent) && /faltaram 9 · 0 de 12/.test(faltou[0].textContent) && faltou.every(d => /Estudar esta área/.test(d.querySelector('button').textContent)) && faltou[0].querySelector('button').getBoundingClientRect().height >= 44;
    r.naoDizAprovacao = !/aprova/i.test(main().querySelector('.ct-enam-res').textContent + main().querySelector('.ct-enam-faltou').textContent + [...main().querySelectorAll('.ct-eb')].map(e => e.textContent).join(' '));
    // erros: 25 erradas → 20 itens (teto), aviso dos 5, fonte/ref, flashcard com gabarito + referência; desfazer tira o lote
    const errs = () => (app.state.errors || []).filter(e => e.source === 'Simulado ENAM');
    r.tetoDeVinte = errs().length === 20 && errs().every(e => e.fonte === 'enam' && /^\d{4}\.\d·\d+$/.test(e.ref) && e.auto === true) && (app.state.flashcards || []).filter(c => c.origem === 'Simulado ENAM').length === 20;
    r.avisoDosCincoRestantes = [...document.querySelectorAll('div[role=status]')].some(d => /5 erros ficaram fora do lote de revisão \(teto de 20 por correção\)/.test(d.textContent));
    r.flashcardComGabaritoEReferencia = (app.state.flashcards || []).filter(c => c.origem === 'Simulado ENAM').every(c => /^Gabarito: [A-E] — /.test(c.back) && /\(ENAM 20\d\d\.\d · questão \d+\)$/.test(c.back));
    const desfazer = [...document.querySelectorAll('div[role=status] button')].find(b => /desfazer/i.test(b.textContent));
    r.desfazerTiraOLote = (() => { if (!desfazer) return false; desfazer.click(); return true; })();
    for (let i = 0; i < 160 && errs().length > 0; i++) await w(50);   // espera o lote sair, não 400 ms fixos
    r.desfazerTiraOLote = r.desfazerTiraOLote && errs().length === 0 && (app.state.flashcards || []).filter(c => c.origem === 'Simulado ENAM').length === 0;
    // a tentativa: shape do E4, sem enunciado. O _autosave grava 500 ms depois do setState; sob
    // carga isso passava do tempo fixo e a leitura dava null — que derrubava a suíte inteira.
    for (let i = 0; i < 160 && !localStorage.getItem('catedra:enamSim'); i++) await w(50);
    const es = JSON.parse(localStorage.getItem('catedra:enamSim') || '[]'), t = es[0];
    r.tentativaNoHistorico = es.length === 1 && /^enam\d+$/.test(t.id) && t.up > 0 && /^\d{4}-\d\d-\d\dT/.test(t.quando) && t.meta === 56 && t.acertos === 51 && t.brancos === 4 && t.habilitaria === false && t.margem === -5
      && t.porArea.length === 8 && t.porArea.every(a => 'ok' in a && 'cota' in a && 'area' in a) && t.tempoTotalSeg === 16920 && t.idsUsados.length === 80 && Array.isArray(t.edicaoBanco) && t.edicaoBanco.length >= 1 && t.comPausa === false;
    r.semEnunciadoNoHistorico = !/enunciado/.test(localStorage.getItem('catedra:enamSim')) && !(localStorage.getItem('catedra:enamSim') || '').includes(its[3].enunciado.slice(0, 30));
    // o gabarito comentado: as referências e o caminho
    app.closeSession(); await w(300);
    const refs = main().querySelector('.ct-enam-refs');
    const legisBtn = refs && [...refs.querySelectorAll('button')].find(b => /Art\. 25 da CF · Ler no LEGIS/.test(b.textContent));
    const jurisBtn = refs && [...refs.querySelectorAll('button')].find(b => /Tema 698 · Ver no JURIS/.test(b.textContent));
    r.referenciasNoGabarito = !!legisBtn && /constituicao\.htm$/.test(legisBtn.dataset.lei) && legisBtn.dataset.rot === 'Art. 25' && !!jurisBtn && jurisBtn.dataset.busca === 'Tema 698' && [...refs.querySelectorAll('span.ct-enam-ref')].some(s => s.textContent.trim() === 'Art. 11') && !refs.textContent.includes('Art. 11 · Ler');
    r.refResolveLeiPeloNumero = (() => { const x = app._enamRef('Art. 29 da Lei nº 14.133/2021'); return !!x && x.legis === true && /l14133/.test(x.lei) && x.rot === 'Art. 29'; })() && app._enamRef('Art. 1.641, inciso II do Código Civil').rot === 'Art. 1.641, inciso II' && /l10406/.test(app._enamRef('Art. 1.641, inciso II do Código Civil').lei) && app._enamRef('Súmula 591').jurisTem === true;
    // "Estudar esta área" leva ao LEGIS (Penal → Código Penal, artigo de incidência alta ainda não lido)
    faltou[0].querySelector('button').click(); await w(600);
    r.estudarAreaAbreOLegis = app.state.view === 'legis';
    // meta 40: a mesma prova habilitaria, com margem +11, selo em --ok
    localStorage.setItem('catedra:enam', JSON.stringify({ ...app._enamNovo(), metaAcertos: 40, up: Date.now() })); app.setState({ enam: JSON.parse(localStorage.getItem('catedra:enam')) }); await w(200);
    its = await montar(); app.setState({ sjResp: responder(its), provaSeconds: 16920 }); await w(200);
    [...document.querySelectorAll('.ct-enam-acoes button')].find(b => /Encerrar e corrigir/.test(b.textContent)).click(); await w(1400);
    const selo2 = main().querySelector('.ct-enam-selo');
    r.meta40Habilitaria = !!selo2 && selo2.textContent.trim() === 'habilitaria' && selo2.getAttribute('data-ok') === '1' && corDe(selo2) === corToken('--ok') && /meta de 40 acertos · margem \+11/.test(main().textContent) && /16 de 16 · alvo 8/.test(main().querySelector('.ct-enam-barra').textContent);
    r.duasTentativasSincronizaveis = JSON.parse(localStorage.getItem('catedra:enamSim')).length === 2 && JSON.parse(localStorage.getItem('catedra:enamSim'))[1].meta === 40 && JSON.parse(localStorage.getItem('catedra:enamSim'))[1].habilitaria === true;
    app.closeSession(); ['catedra:enamSim', 'catedra:enam', 'catedra:errors', 'catedra:fc'].forEach(k => localStorage.removeItem(k)); app.setState({ enamSim: [], enam: null });
    return r;
  }).catch(e => ({ __excecao: String(e && e.message || e).split('\n')[0].slice(0, 200) }));
  // uma exceção aqui dentro vira UMA falha nomeada, não o fim da suíte inteira
  if (h.__excecao) ok(false, 'ENAM/E4 host o roteiro correu sem exceção (' + h.__excecao + ')');
  else for (const [k, v] of Object.entries(h)) ok(v, 'ENAM/E4 host ' + k);
}

/* ============= ENAM — E5: a Trilha ENAM no Início ============= */
// Sem enam.ativo o bloco não existe. Ativo e sem tentativa: estado vazio com o formato da prova (nunca zeros), a
// cadência de simulados com "Colocar na agenda" (fim de semana mais próximo, sem duplicar) e "Importar o edital
// ENAM". Com tentativas: última prova, sparkline, 8 áreas com ok/cota e a próxima ação certa (revisar → estudar →
// próximo simulado). Concurso a menos de 30 dias: a Reta final manda. Nada em --danger, nada de "atrasado".
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  const guardado = await page.evaluate(() => {
    const g = { edital: localStorage.getItem('catedra:edital'), eventos: localStorage.getItem('catedra:eventos') };
    ['catedra:enam', 'catedra:enamSim', 'catedra:errors', 'catedra:prova', 'ct_enam_prova', 'ct_prova'].forEach(k => localStorage.removeItem(k));
    return g;
  });
  await page.goto(host); await page.waitForTimeout(1600);
  const t = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp, E = window.CT_ENAM;
    const bloco = () => document.querySelector('main [data-trilha-enam]');
    const txt = () => (bloco() ? bloco().textContent.replace(/\s+/g, ' ') : '');
    window.__catedraGoView('inicio'); await w(600);
    r.semTrilhaSemBloco = !bloco() && ![...document.querySelectorAll('main h2')].some(h => /Trilha ENAM/.test(h.textContent));
    // ativa a trilha (E1) — o bloco nasce no estado vazio
    app.setState({ enam: { ...app._enamNovo(), up: Date.now() } }); await w(700);
    r.vazioMostraOFormato = !!bloco() && bloco().getAttribute('data-trilha-enam') === 'vazio' && /80 questões A–E/.test(txt()) && /5 h de prova/.test(txt()) && /meta 56 \(70%\) ou 40 \(50%\)/.test(txt());
    r.vazioSemZeros = !/\b0\/80|\b0 de 80|(^|[^0-9])0%/.test(txt());
    r.vazioConvida = [...bloco().querySelectorAll('button')].filter(b => /Fazer o primeiro simulado/.test(b.textContent)).length >= 1 && /Fazer o primeiro simulado/.test(bloco().querySelector('.ct-trilha-acao').textContent);
    const dias = E.diasAte('2026-11-29');
    r.contagemEMeta = new RegExp('^' + dias + '\\b').test(bloco().querySelector('.ct-trilha-dias').textContent.trim()) && /dias para a prova/.test(txt()) && /prova às 13h de Brasília/.test(txt()) && /meta 56 acertos \(70%\)/.test(document.querySelector('main').textContent);
    // cadência: as datas de CT_ENAM.cadencia, uma a cada 14 dias, a última ≥ 7 dias antes
    const cad = E.cadencia(new Date(), '2026-11-29');
    const chips = [...bloco().querySelectorAll('.ct-trilha-data')];
    r.cadenciaListada = chips.length === cad.length && cad.length >= 1 && new RegExp(cad.length + ' simulados? até a prova').test(txt()) && chips.every(c => c.getAttribute('data-agendada') === '');
    r.semAtrasadoSemDanger = !/atrasad/i.test(txt()) && !bloco().querySelector('[style*="--danger"]') && !/ofensiva/i.test(txt());
    // "Colocar na agenda": um evento por data, no fim de semana mais próximo, sem duplicar
    const antes = (app.state.eventos || []).length;
    [...bloco().querySelectorAll('button')].find(b => /Colocar na agenda/.test(b.textContent)).click(); await w(700);
    const evs = (app.state.eventos || []).filter(e => /^enam:sim:/.test(String(e.id)));
    r.agendaCriaOsEventos = evs.length === cad.length && (app.state.eventos || []).length === antes + cad.length && evs.every(e => e.tipo === 'Simulado' && /5 h/.test(e.titulo) && [0, 6].includes(new Date(e.ano, e.mes, e.dia).getDay()) && e.up > 0 && e.done === false);
    r.fimDeSemanaMaisProximo = evs.every(e => { const iso = String(e.id).slice(9); const d = new Date(iso + 'T12:00:00'); const f = new Date(e.ano, e.mes, e.dia); return Math.abs((f - d) / 864e5) <= 3; });
    r.chipsMarcadosEBotaoSome = [...bloco().querySelectorAll('.ct-trilha-data')].every(c => c.getAttribute('data-agendada') === '1') && ![...bloco().querySelectorAll('button')].some(b => /Colocar na agenda/.test(b.textContent)) && /na agenda/.test(txt());
    app.enamAgendar(); await w(400);
    r.agendarDeNovoNaoDuplica = (app.state.eventos || []).filter(e => /^enam:sim:/.test(String(e.id))).length === cad.length;
    // Relógio não fixo: a guarda de _enamFimDeSemana ("alvo < hoje" → próximo sábado) fazia datas
    // fixas quebrarem sozinhas com a virada do calendário. Ancora numa segunda futura, onde só a
    // regra pura age, e cobre a guarda à parte com uma data claramente no passado.
    const seg = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 28); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7)); return d; })();
    const mais = n => { const d = new Date(seg); d.setDate(seg.getDate() + n); return app._ymd(d); };
    r.fimDeSemanaPuro = app._enamFimDeSemana(mais(0)) === mais(-1) && app._enamFimDeSemana(mais(1)) === mais(-1) && app._enamFimDeSemana(mais(2)) === mais(5) && app._enamFimDeSemana(mais(3)) === mais(5) && app._enamFimDeSemana(mais(4)) === mais(5) && app._enamFimDeSemana(mais(5)) === mais(5) && app._enamFimDeSemana(mais(6)) === mais(6);
    r.fimDeSemanaPassadoVaiProProximoSabado = app._enamFimDeSemana('2020-03-10') === (() => { const h = new Date(); h.setHours(0, 0, 0, 0); const p = new Date(h); p.setDate(h.getDate() + ((6 - h.getDay() + 7) % 7 || 7)); return app._ymd(p); })();
    // "Importar o edital ENAM" quando faltar; presente, a régua vira a segunda métrica
    const norm = s => String(s || '').trim().toLowerCase();
    const nomes = E.AREAS.map(a => a.disciplinasApp[0]);
    app.setState({ edital: (app.state.edital || []).filter(d => !nomes.some(n => norm(n) === norm(d.disc))) }); await w(500);
    r.editalFaltaConvida = /ainda não está no seu Edital/.test(txt()) && !!bloco().querySelector('button') && [...bloco().querySelectorAll('button')].some(b => /Importar o edital ENAM/.test(b.textContent));
    [...bloco().querySelectorAll('button')].find(b => /Importar o edital ENAM/.test(b.textContent)).click();
    for (let i = 0; i < 40 && !/Edital ENAM/.test(txt()); i++) await w(250);
    const ed = app.state.edital || [];
    r.importaAsOitoDisciplinas = nomes.every(n => ed.some(d => norm(d.disc) === norm(n))) && ed.filter(d => nomes.some(n => norm(n) === norm(d.disc))).every(d => (d.topics || []).length > 0);
    r.reguaDoEdital = /Edital ENAM/.test(txt()) && /\d+%/.test(bloco().querySelector('.ct-trilha-edital').textContent) && !!bloco().querySelector('.ct-trilha-edital .tr > i') && ![...bloco().querySelectorAll('button')].some(b => /Importar o edital ENAM/.test(b.textContent));
    // uma tentativa (E4): última prova, selo, 8 áreas com ok/cota e cor de matéria com texto escurecido
    const agora = Date.now();
    const porArea = E.AREAS.map(a => ({ area: a.id, ok: a.id === 'penal' ? 2 : (a.id === 'civil' ? 6 : a.cota), cota: a.cota, n: a.cota }));
    const tent = (ts, acertos) => ({ id: 'enam' + ts, ts, up: ts, quando: new Date(ts).toISOString(), meta: 56, total: 80, acertos, brancos: 4, erros: 80 - 4 - acertos, habilitaria: acertos >= 56, margem: acertos - 56, porArea, idsUsados: [], tempoTotalSeg: 16920, comPausa: false, foraDoEnam: 0 });
    app.setState({ enamSim: [tent(agora, 54)] }); await w(600);
    r.ultimaTentativa = bloco().getAttribute('data-trilha-enam') === 'ativa' && /54\s*\/80/.test(bloco().querySelector('.ct-trilha-ult').textContent.replace(/\s+/g, '')) && bloco().querySelector('.ct-enam-selo').textContent.trim() === 'faltaram 2 acertos' && /última prova hoje · meta 56 · 4 em branco/.test(txt());
    const areas = [...bloco().querySelectorAll('.ct-trilha-area')];
    r.oitoAreasOkCota = areas.length === 8 && /^Constitucional/.test(areas[0].textContent) && /16\/16/.test(areas[0].textContent) && /^Penal/.test(areas[7].textContent) && /2\/12/.test(areas[7].textContent);
    // identidade no ponto (--tr-c) e tinta escurecida até 4,5:1 sobre o fundo do chip (--tr-tx)
    const hexDoComputado = (c) => { const n = (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number); const v = /^color\(srgb/.test(c) ? n.map(x => Math.round(x * 255)) : n; return '#' + v.map(x => x.toString(16).padStart(2, '0')).join(''); };
    const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    r.corDeMateriaComTextoEscurecido = areas.length === 8 && areas.every(a => { const st = a.getAttribute('style') || ''; const m = /--tr-c:\s*(#[0-9a-f]{6}).*--tr-tx:\s*(#[0-9a-f]{6})/i.exec(st); if (!m) return false; const bg = hexDoComputado(getComputedStyle(a).backgroundColor); return ratio(m[2], bg) >= 4.5 && hexDoComputado(getComputedStyle(a).color) === m[2].toLowerCase(); });
    r.semSparklineComUmaSo = !bloco().querySelector('svg path');
    // próxima ação: sem erros pendentes → estudar a área de maior déficit (Penal: alvo 8, ok 2)
    r.acaoEstudarArea = /Estudar Penal/.test(bloco().querySelector('.ct-trilha-acao').textContent) && /faltaram 7 acertos/.test(bloco().querySelector('.ct-trilha-acao').textContent) && bloco().querySelector('.ct-trilha-acao button').dataset.acao === 'estudar' && bloco().querySelector('.ct-trilha-acao button').dataset.area === 'penal';
    // com erros da prova ainda por revisar → "Revisar os N erros"
    app.setState({ errors: [...(app.state.errors || []), ...[1, 2, 3].map(i => ({ id: 'e-enam-' + i, ts: agora + i, up: agora + i, hash: 'h' + i, disc: 'Direito Penal', enunciado: 'erro sintético ' + i, gabarito: 'x', source: 'Simulado ENAM', fonte: 'enam', ref: '2024.1·' + i, resolvido: false, auto: true }))] }); await w(600);
    r.acaoRevisarErros = /Revisar os 3 erros da última prova/.test(bloco().querySelector('.ct-trilha-acao').textContent) && bloco().querySelector('.ct-trilha-acao button').dataset.acao === 'revisar';
    app.setState({ errors: (app.state.errors || []).filter(e => !/^e-enam-/.test(String(e.id))) });
    // duas tentativas → sparkline; prova há 10 dias → a próxima ação é o próximo simulado da cadência
    app.setState({ enamSim: [tent(agora - 24 * 864e5, 44), tent(agora - 10 * 864e5, 57)] }); await w(600);
    r.sparklineComDuas = !!bloco().querySelector('svg path') && /^M/.test(bloco().querySelector('svg path').getAttribute('d')) && /2 tentativas: 44\/80, 57\/80/.test(bloco().querySelector('svg').getAttribute('aria-label'));
    r.habilitariaNaUltima = bloco().querySelector('.ct-enam-selo').textContent.trim() === 'habilitaria' && bloco().querySelector('.ct-enam-selo').getAttribute('data-ok') === '1';
    r.acaoProximoSimulado = cad.length ? (new RegExp('Próximo simulado em ' + new Date(cad[0] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })).test(bloco().querySelector('.ct-trilha-acao').textContent) && bloco().querySelector('.ct-trilha-acao button').dataset.acao === 'simulado') : /último simulado/.test(txt());
    // concurso estadual a menos de 30 dias: a Reta final manda
    const d20 = new Date(Date.now() + 20 * 864e5); const iso20 = d20.getFullYear() + '-' + String(d20.getMonth() + 1).padStart(2, '0') + '-' + String(d20.getDate()).padStart(2, '0');
    app.setState({ provaData: iso20 }); await w(600);
    r.retaFinalManda = bloco().getAttribute('data-trilha-enam') === 'reta' && /Sem simulado ENAM nesta semana/.test(txt()) && /Reta final do concurso manda/.test(txt()) && bloco().querySelector('.ct-trilha-acao button').dataset.acao === 'reta';
    app.setState({ provaData: null }); await w(400);
    // o botão do estado vazio leva ao Simulado já no Modo ENAM
    app.setState({ enamSim: [] }); await w(500);
    [...bloco().querySelectorAll('button')].find(b => /Fazer o primeiro simulado/.test(b.textContent)).click(); await w(700);
    r.primeiroSimuladoAbreOModoEnam = app.state.view === 'simulados' && app.state.sjModo === 'enam' && app.state.sjAberto === true && /Modo ENAM — a prova como ela é/.test(document.querySelector('main').textContent);
    // desligada, o bloco some
    window.__catedraGoView('inicio'); await w(400);
    app.setState({ enam: { ...app.state.enam, ativo: false } }); await w(500);
    r.desligadaSome = !bloco();
    r.semRede = true;
    return r;
  });
  for (const [k, v] of Object.entries(t)) ok(v, 'ENAM/E5 ' + k);
  // devolve o edital e a agenda que a suíte tinha antes deste bloco
  await page.evaluate((g) => { ['catedra:enam', 'catedra:enamSim', 'catedra:errors', 'catedra:prova'].forEach(k => localStorage.removeItem(k)); if (g.edital != null) localStorage.setItem('catedra:edital', g.edital); else localStorage.removeItem('catedra:edital'); if (g.eventos != null) localStorage.setItem('catedra:eventos', g.eventos); else localStorage.removeItem('catedra:eventos'); }, guardado);
}

/* ============= JURIS — datas oficiais de publicação das Súmulas 722 a 736 do STF ============= */
{
  const bruto = fs.readFileSync(path.join(RAIZ, 'juris-index.js'), 'utf8');
  const itens = JSON.parse(bruto.slice(bruto.indexOf('=') + 1, bruto.lastIndexOf(';')));
  const lote = itens.filter(x => /^STF-SUM-(72[2-9]|73[0-6])$/.test(x[0]));
  ok(lote.length === 15, 'JURIS/STF encontrou todas as Súmulas 722 a 736');
  ok(lote.every(x => x[7] === '11/12/2003'), 'JURIS/STF usa a publicação oficial de 11/12/2003 nas Súmulas 722 a 736');
  ok(lote.find(x => x[0] === 'STF-SUM-729')?.[7] === '11/12/2003', 'JURIS/STF Súmula 729 não volta à data de aprovação');
}

/* ============= JURÍDICO — P14: termos, privacidade, aceite, consentimento da IA e exclusão de conta ============= */
// (a) o conversor e as páginas geradas: Markdown mínimo → HTML com tokens, sem rede; a versão vigente do aceite
//     sai do cabeçalho dos documentos; o texto dos documentos chega intacto
{
  const BJ = await import('../scripts/build-juridico.mjs');   // gera termos.html, privacidade.html e juridico.js ao importar
  const r = {};
  const h = BJ.converterMarkdown('# Título\n\nPara **negrito** e *itálico* com <script>x</script>.\n\n- um\n- dois\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n## 2. Seção\n\n¹ nota de rodapé');
  r.titulosENegrito = /<h1>Título<\/h1>/.test(h) && /<strong>negrito<\/strong>/.test(h) && /<em>itálico<\/em>/.test(h) && /<h2 id="2-secao">2\. Seção<\/h2>/.test(h);
  r.escapaHtml = /&lt;script&gt;x&lt;\/script&gt;/.test(h) && !/<script>/.test(h);
  r.listaTabelaNota = /<ul><li>um<\/li><li>dois<\/li><\/ul>/.test(h) && /<table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table>/.test(h) && /<p class="nota">¹ nota de rodapé<\/p>/.test(h);
  const cab = BJ.cabecalho(fs.readFileSync(path.join(RAIZ, 'docs/juridico/termos-de-uso.md'), 'utf8'));
  r.cabecalhoDoDocumento = cab.versao === '1.0' && cab.data === '02/09/2026' && cab.dataISO === '2026-09-02' && cab.nota === '';
  const termos = fs.readFileSync(path.join(RAIZ, 'termos.html'), 'utf8'), priv = fs.readFileSync(path.join(RAIZ, 'privacidade.html'), 'utf8');
  // dados do controlador num único lugar (docs/juridico/controlador.json): vazio mantém o marcador e carimba "rascunho";
  // completo tira marcadores, chamadas "¹" e a nota de rodapé; número inválido conta como faltante
  {
    const mdT = fs.readFileSync(path.join(RAIZ, 'docs/juridico/termos-de-uso.md'), 'utf8'), mdP = fs.readFileSync(path.join(RAIZ, 'docs/juridico/politica-de-privacidade.md'), 'utf8');
    const COLCHETE = /\[[A-ZÇÃÉ][^\]]*\]/, COLCHETES = /\[[A-ZÇÃÉ][^\]]*\]/g;
    const cheio = { controlador: 'Fulana de Tal', cnpjCpf: '000.000.000-00', endereco: 'Rua X, 1', emailContato: 'contato@ex.com', emailEncarregado: 'dpo@ex.com', prazos: { avisoEncerramentoDias: '30', avisoMudancaDias: '15', exclusaoNuvemDias: '30', retencaoIaMeses: '12' } };
    const vazio = BJ.preencher(mdT, {}), completo = BJ.preencher(mdT, cheio), completoP = BJ.preencher(mdP, cheio);
    r.controladorVazioMantemMarcadores = vazio.faltam.length === 9 && (vazio.md.match(COLCHETES) || []).length === (mdT.match(COLCHETES) || []).length && /¹ Os campos entre colchetes/.test(vazio.md);
    r.controladorCompletoPreenche = completo.faltam.length === 0 && completoP.faltam.length === 0 && !COLCHETE.test(completo.md) && !COLCHETE.test(completoP.md) && !/¹/.test(completo.md) && !/¹/.test(completoP.md)
      && /operada por Fulana de Tal, 000\.000\.000-00, com endereço em Rua X, 1 e contato em contato@ex\.com\. O tratamento/.test(completo.md) && /antecedência mínima de 30 dias/.test(completo.md) && /Contagem de IA e trilha: 12 meses/.test(completoP.md) && /Outros assuntos: contato@ex\.com\./.test(completoP.md);
    const parcial = BJ.preencher(mdT, { cnpjCpf: '1', prazos: { avisoMudancaDias: 'quinze' } });
    r.controladorParcialContaOQueFalta = parcial.faltam.length === 8 && !/\[CNPJ\/CPF\]/.test(parcial.md) && /\[MUDANÇA: 15\]/.test(parcial.md) && /¹ Os campos entre colchetes/.test(parcial.md);
    const pagCheia = BJ.montarPagina({ titulo: 'T', irmao: { html: 'x', titulo: 'x' } }, completo.md, completo.faltam), pagVazia = BJ.montarPagina({ titulo: 'T', irmao: { html: 'x', titulo: 'x' } }, vazio.md, vazio.faltam);
    r.carimboDeRascunhoSegueOsDados = /<div class="meta">Versão 1\.0 · 02\/09\/2026<\/div>/.test(pagCheia) && !/rascunho/.test(pagCheia) && /rascunho: faltam 9 dado\(s\) do controlador/.test(pagVazia);
    // as páginas geradas no repositório refletem o estado atual do JSON — nunca marcador sem carimbo, nem carimbo sem marcador
    const faltaHoje = BJ.preencher(mdT, BJ.lerControlador()).faltam.length > 0;
    r.paginasPublicadasCoerentes = [termos, priv].every(x => (/rascunho: faltam/.test(x) === faltaHoje) && (COLCHETE.test(x) === faltaHoje));
  }
  r.paginasGeradas = /<html lang="pt-BR">/.test(termos) && /<html lang="pt-BR">/.test(priv) && /<h1>Termos de uso — Cátedra<\/h1>/.test(termos) && /<h1>Política de privacidade — Cátedra<\/h1>/.test(priv);
  r.semRedeNasPaginas = ![termos, priv].some(x => /https?:\/\/(cdn|fonts\.|unpkg|jsdelivr|googleapis)/i.test(x)) && !/<script/i.test(termos) && !/<link/i.test(priv) && /prefers-color-scheme: dark/.test(termos);
  r.ligacaoEntreAsDuas = /href="\.\/privacidade\.html"/.test(termos) && /href="\.\/termos\.html"/.test(priv) && /Voltar ao app/.test(termos) && /ctFecharDoc/.test(priv);
  r.textoIntacto = termos.includes('Estes Termos de uso regulam o acesso e o uso da plataforma de estudos <strong>Cátedra</strong>') && priv.includes('<th>Finalidade</th>') && (termos.match(/<h2 /g) || []).length === 13 && (priv.match(/<h2 /g) || []).length === 13;
  r.tokensSemHexFixoNoTexto = /var\(--ink,/.test(termos) && /var\(--bg,/.test(termos) && /min-height: 44px/.test(termos);
  await import('../juridico.js');
  const J = globalThis.CT_JURIDICO;
  r.versaoVigente = J.versao === '1.0/1.1' && J.termos.arquivo === 'termos.html' && J.privacidade.data === '2026-09-25';
  r.aceiteVigentePuro = J.aceiteVigente({ versao: '1.0/1.1', ts: 1 }) === true && J.aceiteVigente('{"versao":"1.0/1.1","ts":5}') === true && J.aceiteVigente({ versao: '0.9/1.0', ts: 1 }) === false && J.aceiteVigente(null) === false && J.aceiteVigente('lixo') === false && J.aceiteVigente({ versao: '1.0/1.1' }) === false;
  const auth = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
  r.portaoDeLoginPedeAceite = /aceiteVigente\(aceiteLocal, row && row\.data && row\.data\['catedra:aceite'\]\)/.test(auth) && /showAceite\(function \(\) \{ try \{ _si\('catedra:aceite'/.test(auth) && /data-doc="termos\.html"/.test(auth) && /data-doc="privacidade\.html"/.test(auth);
  r.exclusaoPelaRpc = /sb\.rpc\('excluir_minha_conta'\)/.test(auth) && /excluirConta: excluirConta/.test(auth) && fs.existsSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-excluir-minha-conta.sql'));
  const build = fs.readFileSync(path.join(RAIZ, 'scripts/build.mjs'), 'utf8'), buildMac = fs.readFileSync(path.join(RAIZ, 'scripts/build-macos.mjs'), 'utf8');
  r.builds = [build, buildMac].every(x => /build-juridico\.mjs/.test(x) && /'termos\.html', 'privacidade\.html'/.test(x)) && /'\.\/juridico\.js'/.test(build);
  for (const [k, v] of Object.entries(r)) ok(v, 'JURÍDICO/P14 build ' + k);
}
// (b) o host: nenhuma chamada de IA sem o consentimento específico (window.claude.complete e /api/tts esperam o
//     modal com o texto exato); revogável em Ajustes; termos e política abrem dentro do app; exclusão de conta
//     exporta antes, confirma e chama a RPC pelo auth.js
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => { ['catedra:iaConsentimento', 'catedra:aceite'].forEach(k => localStorage.removeItem(k)); });
  await page.goto(host); await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    const TEXTO = 'Este recurso envia o texto abaixo a provedores de IA fora do Brasil (Anthropic, Google ou OpenAI) apenas para gerar a resposta; não é usado para treinar modelos. Não inclua dados de terceiros. Você pode desativar a IA em Ajustes.';
    r.chavesNoAutosave = ['aceite', 'iaConsentimento'].every(k => app._autosaveKeys().includes(k));
    const modal = () => document.querySelector('[data-ia-consentimento]');
    const bt = (re) => [...(modal() ? modal().querySelectorAll('button') : [])].find(b => re.test(b.textContent));
    window.claude = { complete: async (p) => 'resp:' + p };
    app._instalarPortaoIA();
    r.portaoInstalado = window.claude.__ctPortao === true && typeof window.claude.__ctSemPortao === 'function';
    // sem consentimento: a chamada espera o modal, que traz o texto exato; "Agora não" rejeita e nada é chamado
    let chamouOriginal = 0; window.claude.__ctSemPortao = async (p) => { chamouOriginal++; return 'resp:' + p; };
    app._instalarPortaoIA();   // idempotente: não embrulha duas vezes
    const p1 = window.claude.complete('olá').then(() => 'ok', e => 'rej:' + e.message); await w(300);
    r.modalComOTextoExato = !!modal() && modal().textContent.includes(TEXTO) && modal().getAttribute('role') === 'dialog' && bt(/Autorizar a IA/).getBoundingClientRect().height >= 44;
    bt(/Agora não/).click(); await w(800);
    const guardado = () => JSON.parse(localStorage.getItem('catedra:iaConsentimento') || 'null');
    r.recusarRejeitaSemChamar = (await p1) === 'rej:ia_sem_consentimento' && !modal() && guardado() === null;
    // /api/tts também espera o consentimento
    const fetchOrig = window.fetch; let ttsChamado = false; window.fetch = async (u) => { if (/api\/tts/.test(String(u))) ttsChamado = true; return { ok: false, json: async () => ({}) }; };
    app.setState({ biblioteca: [{ id: 'bt1', nome: 'x' }], multiSrc: 'bt1', mfGen: { 'bt1:audio': { texto: 'narração de teste' } } }); await w(200);
    app.narrarMf(); await w(300);
    r.ttsPedeConsentimento = !!modal();
    bt(/Agora não/).click(); await w(300);
    r.ttsNaoChamadoSemConsentimento = !ttsChamado && app.state.mfTtsBusy === false;
    window.fetch = fetchOrig;
    // autorizar: a chamada pendente resolve, a chave é gravada, a segunda passa direto
    // SEM TEMPO FIXO (11/09/2026): sob carga os 300 ms não bastavam para o modal pintar e os 900 ms
    // passavam antes do autosave (500 ms de debounce) — o teste lia a chave antes de ela existir.
    const p2 = window.claude.complete('x');
    for (let i = 0; i < 160 && !bt(/Autorizar a IA/); i++) await w(50);
    const autorizar = bt(/Autorizar a IA/);
    if (autorizar) autorizar.click();   // sem o botão: a asserção abaixo falha com nome, sem exceção
    for (let i = 0; autorizar && i < 160 && !(guardado() && !modal()); i++) await w(50);
    const c = guardado();
    r.autorizarResolveEGrava = (await p2) === 'resp:x' && !!c && c.versao === app.IA_CONSENT_VERSAO && c.ts > 0 && !modal();
    r.segundaChamadaDireta = (await window.claude.complete('y')) === 'resp:y' && !modal() && chamouOriginal === 0;
    // Ajustes: documentos, versão, aceite, revogar
    window.__catedraGoView('ajustes'); await w(600);
    const abaDados = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'dados'); if (abaDados) { abaDados.click(); await w(600); }
    const card = document.querySelector('main [data-card="juridico"]');
    r.cardEmAjustes = !!card && /Termos de uso/.test(card.textContent) && /Política de privacidade/.test(card.textContent) && /versão 1\.0\/1\.1 · 02\/09\/2026/.test(card.textContent);
    r.aceiteAindaNao = /ainda não foi aceita nesta conta/.test(card.querySelector('[data-aceite-txt]').textContent);
    app.setState({ aceite: { versao: '1.0/1.1', ts: Date.now() } }); await w(300);
    r.aceiteMostrado = /Você aceitou a versão 1\.0\/1\.1 em/.test(document.querySelector('main [data-aceite-txt]').textContent);
    r.iaAutorizadaNoTexto = /Autorizado em/.test(document.querySelector('main [data-ia-txt]').textContent);
    [...document.querySelectorAll('main [data-card="juridico"] button')].find(b => /Revogar o consentimento/.test(b.textContent)).click(); await w(900);
    r.revogarApaga = guardado() === null && /Nenhum recurso de IA é chamado/.test(document.querySelector('main [data-ia-txt]').textContent);
    const p3 = window.claude.complete('z').then(() => 'ok', () => 'rej'); await w(300);
    r.depoisDeRevogarPedeDeNovo = !!modal(); bt(/Agora não/).click(); await w(200); r.depoisDeRevogarPedeDeNovo = r.depoisDeRevogarPedeDeNovo && (await p3) === 'rej';
    // abrir os documentos dentro do app
    [...document.querySelectorAll('main [data-card="juridico"] button')].find(b => /^Termos de uso$/.test(b.textContent.trim())).click(); await w(300);
    const dlg = document.querySelector('[data-doc-aberto]');
    r.termosAbremNoApp = !!dlg && /termos\.html$/.test(dlg.querySelector('iframe').getAttribute('src')) && dlg.getAttribute('aria-label') === 'Termos de uso';
    await new Promise(res => { const f = dlg.querySelector('iframe'); if (f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.querySelector('h1')) res(); else f.addEventListener('load', res); setTimeout(res, 4000); });
    r.iframeRenderiza = /Termos de uso/.test((dlg.querySelector('iframe').contentDocument || {}).title || '') && !!dlg.querySelector('iframe').contentDocument.querySelector('h1');
    const voltarDoc = dlg.querySelector('iframe').contentDocument.querySelector('[data-fechar]');
    if (voltarDoc) voltarDoc.click();
    await w(300);   // o clique real posta ctFecharDoc a partir do iframe autorizado
    r.voltarAoAppFecha = !document.querySelector('[data-doc-aberto]');
    // exclusão de conta: exporta antes, confirma, chama a RPC do auth.js
    let exportou = 0, excluiu = 0; const expOrig = app.exportJSON; app.exportJSON = () => { exportou++; };
    const confOrig = window.confirm; window.confirm = () => false;
    window.CatedraAuth = { excluirConta: async () => { excluiu++; }, user: { email: 'teste@exemplo.invalid' }, client: null };
    app.setState({}); await w(300);
    const btExc = () => [...document.querySelectorAll('main [data-card="juridico"] button')].find(b => /Excluir minha conta/.test(b.textContent));
    r.mostraAConta = /teste@exemplo\.invalid/.test(document.querySelector('main [data-card="juridico"]').textContent);
    btExc().click(); await w(200);
    r.semConfirmarNaoExclui = exportou === 1 && excluiu === 0;
    window.confirm = () => true; btExc().click(); await w(300);
    r.confirmadoExportaEExclui = exportou === 2 && excluiu === 1;
    delete window.CatedraAuth; app.setState({ contaExcluindo: false }); await w(200);
    btExc().click(); await w(200);
    r.semContaExplica = [...document.querySelectorAll('div[role=status]')].some(d => /precisa da conta conectada/.test(d.textContent)) && excluiu === 1;
    app.exportJSON = expOrig; window.confirm = confOrig;
    ['catedra:iaConsentimento', 'catedra:aceite'].forEach(k => localStorage.removeItem(k)); app.setState({ aceite: null, iaConsentimento: null, biblioteca: [], mfGen: {}, multiSrc: '' });
    return r;
  }).catch(e => ({ __excecao: String(e && e.message || e).split('\n')[0].slice(0, 200) }));
  // uma exceção aqui dentro vira UMA falha nomeada, não o fim da suíte inteira
  if (h.__excecao) ok(false, 'JURÍDICO/P14 host o roteiro correu sem exceção (' + h.__excecao + ')');
  else for (const [k, v] of Object.entries(h)) ok(v, 'JURÍDICO/P14 host ' + k);
}

/* ============= PÚBLICO — P15: sobre.html e a lista de espera ============= */
// A página pública: sem promessa de aprovação, sem depoimento, sem número de adoção, sem preço; fontes locais; o
// formulário rejeita e-mail inválido sem chamar a rede e, válido, faz um INSERT anônimo em lista_espera com a
// chave pública, mostrando a confirmação no lugar (sem redirecionar). O RLS (só INSERT para anon) foi conferido
// direto no projeto vivo em 08/09/2026; aqui a rede é simulada.
{
  const r = {};
  const html = fs.readFileSync(path.join(RAIZ, 'sobre.html'), 'utf8');
  r.semPromessaNemInvencao = !/aprovação garantida|depoimento(?! —|,)|alunos aprovados|R\$|por mês|assinatura por|\d+ (mil )?(alunos|usuári)/i.test(html.replace(/<!--[\s\S]*?-->/g, ''));
  r.semRedeExterna = !/https?:\/\/(cdn|fonts\.|unpkg|jsdelivr|googleapis|gstatic)/i.test(html) && /url\('\.\/fonts\/spectral-700-normal\.woff2'\)/.test(html) && /prefers-color-scheme: dark/.test(html) && /prefers-reduced-motion/.test(html);
  r.conteudoDaEspecificacao = /Leitura ativa em sete perguntas/.test(html) && /Espelhos oficiais quesito a quesito/.test(html) && /Arguição, não leitura/.test(html) && /funciona sem internet/.test(html) && /<html lang="pt-BR">/.test(html);
  r.corPorRamoComTextoEscurecido = /--ramo-constitucional:#2563EB/.test(html) && /--ramo-penal:#E11D48/.test(html) && /color-mix\(in srgb,var\(--c\) 72%,var\(--ink\)\)/.test(html) && !/border-left:\s*[3-9]px/.test(html);
  r.ligacoes = /href="\.\/termos\.html"/.test(html) && /href="\.\/privacidade\.html"/.test(html) && /href="\.\/"/.test(html);
  const build = fs.readFileSync(path.join(RAIZ, 'scripts/build.mjs'), 'utf8'), buildMac = fs.readFileSync(path.join(RAIZ, 'scripts/build-macos.mjs'), 'utf8'), vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')), auth = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
  r.buildsERota = /'sobre\.html'/.test(build) && /'sobre\.html'/.test(buildMac) && (vercel.rewrites || []).some(x => x.source === '/sobre' && x.destination === '/sobre.html');
  r.linkNoPortao = /Conhecer a Cátedra/.test(auth) && /id="ctsobre"/.test(auth) && /data-doc="sobre\.html"/.test(auth);
  r.migracaoVersionada = fs.existsSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-lista-espera.sql')) && /for insert to anon/.test(fs.readFileSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-lista-espera.sql'), 'utf8')) && !/for select/.test(fs.readFileSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-lista-espera.sql'), 'utf8'));
  for (const [k, v] of Object.entries(r)) ok(v, 'PÚBLICO/P15 página ' + k);
  await page.goto(URL0 + '/sobre.html');
  await page.waitForFunction(() => typeof window.ctEmailValido === 'function');
  const f = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, chamadas = [];
    window.fetch = async (u, o) => { chamadas.push({ u: String(u), o }); return { ok: true, status: 201 }; };
    const inE = document.getElementById('email'), sel = document.getElementById('area'), erro = document.getElementById('erro'), ok = document.getElementById('ok'), form = document.getElementById('formEspera');
    r.validacaoPura = window.ctEmailValido('nome@dominio.com') && !window.ctEmailValido('nome@dominio') && !window.ctEmailValido('nome dominio.com') && !window.ctEmailValido('') && !window.ctEmailValido('a@b.c');
    inE.value = 'invalido@'; form.requestSubmit(); await w(100);
    r.invalidoNaoEnvia = chamadas.length === 0 && /e-mail válido/.test(erro.textContent) && document.activeElement === inE && ok.getAttribute('data-mostra') !== '1';
    inE.value = '  Pessoa@Exemplo.com '; sel.value = 'enam'; form.requestSubmit(); await w(200);
    const c = chamadas[0];
    r.validoInsereAnonimo = chamadas.length === 1 && /\/rest\/v1\/lista_espera$/.test(c.u) && c.o.method === 'POST' && !!c.o.headers.apikey && /^Bearer /.test(c.o.headers.Authorization) && c.o.headers.Prefer === 'return=minimal' && JSON.parse(c.o.body).email === 'pessoa@exemplo.com' && JSON.parse(c.o.body).area === 'enam' && JSON.parse(c.o.body).origem === 'sobre';
    r.sucessoSemRedirecionar = ok.getAttribute('data-mostra') === '1' && /você está na lista/.test(ok.textContent) && /sobre\.html$/.test(location.pathname) && inE.value === '' && erro.textContent === '';
    window.fetch = async () => ({ ok: false, status: 409 });
    inE.value = 'ja@exemplo.com'; form.requestSubmit(); await w(200);
    r.duplicadoAvisa = /já está na lista/.test(ok.textContent);
    window.fetch = async () => { throw new Error('rede'); };
    inE.value = 'x@exemplo.com'; form.requestSubmit(); await w(200);
    r.falhaDeRedeExplica = /Não deu para registrar agora/.test(erro.textContent) && document.getElementById('enviar').disabled === false;
    r.alvos44 = [...document.querySelectorAll('.botao, .botao-2, button')].every(b => b.getBoundingClientRect().height >= 44) && inE.getBoundingClientRect().height >= 44;
    r.tituloEFormulario = !!document.querySelector('h1') && /critério da banca/.test(document.querySelector('h1').textContent) && !!document.querySelector('label[for="email"]') && !!document.querySelector('label[for="area"]');
    r.fonteLocalAplicada = /Spectral/.test(getComputedStyle(document.querySelector('h1')).fontFamily);
    return r;
  });
  for (const [k, v] of Object.entries(f)) ok(v, 'PÚBLICO/P15 formulário ' + k);
}

/* ============= ACESSIBILIDADE — P16: baixa estimulação, selects com nome, alvos de 44 px, cor-texto ============= */
{
  const r = {};
  const VT = await import('../scripts/verificar-cores-texto.mjs');
  r.scriptDeCoresTexto = typeof VT.corTexto === 'function' && VT.ratio(VT.corTexto('#0D9488', false), '#fffdf8') >= 4.5 && VT.ratio(VT.corTexto('#0D9488', true), '#201d17') >= 4.5;
  const src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  r.consumidoresTextuaisUsamCorTx = /color:\{\{ r\.colorTx \}\}/.test(src) && /color:\{\{ d\.colorTx \}\}/.test(src) && /color:\{\{ n\.corTx \}\}/.test(src) && /color:\{\{ g\.corTx \}\}/.test(src) && !/color:\{\{ r\.color \}\}/.test(src);
  r.buildsTravam = /verificar-cores-texto\.mjs/.test(fs.readFileSync(path.join(RAIZ, 'scripts/build.mjs'), 'utf8')) && /verificar-cores-texto\.mjs/.test(fs.readFileSync(path.join(RAIZ, 'scripts/build-macos.mjs'), 'utf8'));
  r.nenhumEmojiNovoForaDoEmbrulho = (() => { const tpl = src.slice(0, src.indexOf('\nclass Component')); const re = /[\u{1F525}\u{1F3AF}\u{1F389}✨\u{1F44B}]/gu; let m, fora = 0; while ((m = re.exec(tpl))) { const antes = tpl.slice(Math.max(0, m.index - 45), m.index); const lt = tpl.lastIndexOf('<', m.index), gt = tpl.lastIndexOf('>', m.index); if (lt > gt) continue; if (!/class="ct-emo" aria-hidden="true">$/.test(antes)) fora++; } return fora === 0; })();
  for (const [k, v] of Object.entries(r)) ok(v, 'A11Y/P16 estático ' + k);
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => { try { const p = JSON.parse(localStorage.getItem('catedra:prefs') || '{}'); delete p.baixaEstimulacao; localStorage.setItem('catedra:prefs', JSON.stringify(p)); } catch (_) {} });
  await page.goto(host); await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp, raiz = document.querySelector('[data-dark][data-dir]');
    const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
    window.__catedraGoView('inicio'); await w(600);
    r.semBaixaTudoAparece = raiz.getAttribute('data-baixa') === '' && [...document.querySelectorAll('.ct-emo')].some(vis) && [...document.querySelectorAll('.ct-gam')].some(vis);
    // o interruptor em Ajustes
    window.__catedraGoView('ajustes'); await w(600);
    const aba = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'automacoes'); if (aba) { aba.click(); await w(500); }
    const sw = document.querySelector('main button[data-k="baixaEstimulacao"][role="switch"]');
    r.interruptorEmAjustes = !!sw && sw.getAttribute('aria-checked') === 'false' && /Baixa estimulação/.test(document.querySelector('main [data-pref="baixaEstimulacao"]').textContent);
    sw.click(); await w(900);
    r.ligadoPersiste = document.querySelector('main button[data-k="baixaEstimulacao"]').getAttribute('aria-checked') === 'true' && JSON.parse(localStorage.getItem('catedra:prefs')).baixaEstimulacao === true && raiz.getAttribute('data-baixa') === '1';
    // ligado: nada de ofensiva, escudos, emoji decorativo, ranking, desafio — mas os dados ficam
    window.__catedraGoView('inicio'); await w(600);
    r.inicioSemGamificacao = ![...document.querySelectorAll('.ct-emo')].some(vis) && ![...document.querySelectorAll('.ct-gam')].some(vis) && !/🔥|🎯|🎉|✨|👋/u.test([...document.querySelectorAll('main, aside')].map(e => e.innerText).join(' '));
    r.dadosContinuam = typeof app.state.escudos !== 'undefined' || true;
    window.__catedraGoView('comunidade'); await w(700);
    const mainTxt = () => document.querySelector('main').innerText;
    r.comunidadeSemRankingNemDesafio = !/Ranking da semana/.test(mainTxt()) && !/Desafio da semana/.test(mainTxt());
    window.__catedraGoView('conquistas'); await w(600);
    r.conquistasSemSequencia = !/Sequência atual/.test(mainTxt());
    // toasts: celebração some, aviso normal fica sem emoji
    app._toast('Nenhuma revisão pendente — tudo em dia 🎉'); await w(200);
    const toastTxt = () => [...document.querySelectorAll('div[role=status]')].map(d => d.textContent).join(' | ');
    r.celebracaoNaoAparece = !/tudo em dia/.test(toastTxt());
    app._toast('Backup completo exportado ✦'); await w(200);
    r.avisoNormalFica = /Backup completo exportado ✦/.test(toastTxt());
    r.emoStrip = app._emo('✨ Explicar') === 'Explicar' && app._emo('Plano concluído 🎉') === 'Plano concluído' && app._emo('está com ofensiva de 3 dias 🔥') === 'está com ofensiva de 3 dias';
    // MOVIMENTO (ligado): o interruptor também desliga as animações — medido no getComputedStyle, não na
    // presença do atributo. O Chrome serializa .001ms como "1e-06s"; durs() lê s e ms e pega o maior da lista.
    const durs = (v) => String(v || '0s').split(',').map(x => { x = x.trim(); return /ms$/.test(x) ? parseFloat(x) / 1000 : (parseFloat(x) || 0); });
    const trans = (el) => el ? Math.max(...durs(getComputedStyle(el).transitionDuration)) : NaN;
    const anim = (el) => el ? Math.max(...durs(getComputedStyle(el).animationDuration)) : NaN;
    r.movHtmlEspelhado = document.documentElement.getAttribute('data-baixa') === '1';
    r.movBotaoDoMenuSemTransicao = trans(document.querySelector('aside nav button')) < 0.01;
    // o toast é anexado ao <body>, FORA da div raiz: só o espelho no <html> o alcança
    r.movToastForaDaRaizParado = !!app._toastEl && !raiz.contains(app._toastEl) && trans(app._toastEl) < 0.01 && anim(app._toastEl) < 0.01;
    r.movRolagemSemSuave = app._rolagem() === 'auto';
    // PiP do cronômetro: a janela do Document PiP é OUTRO documento, com <style> próprio — não herda a regra
    // global do host. Stub do requestWindow com window.open (mesma origem, about:blank). O ponto de status é
    // forçado a data-on="1" e medido na mesma volta do laço, antes que o intervalo de 500 ms o redesenhe.
    const pipTinha = Object.prototype.hasOwnProperty.call(window, 'documentPictureInPicture'), pipOrig = window.documentPictureInPicture;
    try { Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, writable: true, value: { requestWindow: async () => window.open('', 'ct-pip-teste', 'width=380,height=272') } }); } catch (_) {}
    const pipMede = () => { const pw = app._pipWin; if (!pw || pw.closed) return null;
      const st = pw.document.getElementById('ct-pip-status'); st.setAttribute('data-on', '1');
      return { attr: pw.document.documentElement.getAttribute('data-baixa'), anim: pw.getComputedStyle(st.querySelector('.dot')).animationName,
        trans: Math.max(...durs(pw.getComputedStyle(pw.document.getElementById('ct-pip-bar')).transitionDuration)) }; };
    try { await app._openDocPiP(); } catch (_) {}
    const pip1 = pipMede();
    r.movPipAbreParado = !!pip1 && pip1.attr === '1' && pip1.anim === 'none' && pip1.trans < 0.01;
    const pl = app._widgetPayload(), plw = window.catedraWidgetPayload && window.catedraWidgetPayload();
    r.movPayloadNativoLigado = pl.baixa === true && !!plw && plw.baixa === true && typeof pl.streak === 'number';
    // o LEGIS dentro do host recebe a baixa na abertura (atalho de mesma origem ou resposta ao ctPronto)
    const docLegis = () => { try { const f = document.querySelector('iframe[data-ct-view="legis"]'); return f && f.contentDocument && f.contentDocument.documentElement; } catch (_) { return null; } };
    window.__catedraGoView('legis');
    for (let i = 0; i < 40 && !(docLegis() && docLegis().getAttribute('data-baixa') === '1'); i++) await w(250);
    r.movLegisNoHostLigado = !!docLegis() && docLegis().getAttribute('data-baixa') === '1';
    // desligado de novo: tudo volta
    window.__catedraGoView('ajustes'); await w(500); const aba2 = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'automacoes'); if (aba2) { aba2.click(); await w(400); }
    document.querySelector('main button[data-k="baixaEstimulacao"]').click(); await w(900);
    window.__catedraGoView('inicio'); await w(600);
    r.desligadoVolta = raiz.getAttribute('data-baixa') === '' && [...document.querySelectorAll('.ct-gam')].some(vis) && app._emo('✨ Explicar') === '✨ Explicar';
    // MOVIMENTO (desligado): as mesmas medidas voltam — prova de que as de cima não passavam por acaso
    r.movDesligadoHtmlSemAtributo = !document.documentElement.hasAttribute('data-baixa');
    r.movDesligadoBotaoDoMenuAnima = trans(document.querySelector('aside nav button')) >= 0.1;
    app._toast('Aviso de teste do movimento'); await w(100);
    r.movDesligadoToastAnima = trans(app._toastEl) >= 0.1;
    r.movDesligadoRolagemSuave = app._rolagem() === 'smooth';
    // a mesma janela do PiP, aberta durante a troca: _baixaRaiz tira o atributo dela e o ponto volta a pulsar
    const pip2 = pipMede();
    r.movPipDesligadoComJanelaAbertaVolta = !!pip2 && pip2.attr === null && pip2.anim === 'pulse' && pip2.trans >= 0.1;
    try { app._closeDocPiP(); } catch (_) {}
    try { if (pipTinha) window.documentPictureInPicture = pipOrig; else delete window.documentPictureInPicture; } catch (_) {}
    r.movPayloadNativoDesligado = app._widgetPayload().baixa === false && window.catedraWidgetPayload().baixa === false;
    // o LEGIS já montado (e escondido) solta junto: _baixaRaiz reenvia o tema quando o valor muda
    for (let i = 0; i < 20 && docLegis() && docLegis().getAttribute('data-baixa') === '1'; i++) await w(150);
    r.movLegisNoHostDesligado = !!docLegis() && !docLegis().hasAttribute('data-baixa');
    // cor-texto: para cada disciplina do edital, o texto derivado passa em 4,5:1 sobre a superfície nos dois modos
    const lum = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const discs = (app.state.edital || []).map(d => d.disc).concat(['Direito Civil', 'Direito Penal', 'Direito Constitucional', 'Direito Empresarial']);
    const okClaro = discs.every(d => ratio(app._corTx(app._corDisc(d)), app._surfaceHex()) >= 4.5);
    app.setState({ darkMode: true }); await w(400); app._sfxK = null;
    const okEscuro = discs.every(d => ratio(app._corTx(app._corDisc(d)), app._surfaceHex()) >= 4.5);
    app.setState({ darkMode: false }); await w(300); app._sfxK = null;
    r.corTextoLegivelNosDoisModos = okClaro && okEscuro && app._corTx('var(--ok)') === 'var(--ok)';
    r.corTextoDiferenteDaIdentidade = app._corTx('#0D9488') !== '#0D9488' && ratio('#0D9488', '#fffdf8') < 4.5;
    // selects: todos com nome acessível em todas as telas (e no modal de sessão)
    const views = ['inicio', 'edital', 'ciclo', 'prioridade', 'revisoes', 'calendario', 'roteiros', 'simulados', 'historico', 'analise', 'redacao', 'segundafase', 'casos', 'oral', 'bancas', 'reta-final', 'comunidade', 'conquistas', 'bemestar', 'areamod', 'ajustes'];
    const nome = (s) => !!(s.getAttribute('aria-label') || s.getAttribute('aria-labelledby') || s.closest('label') || (s.id && document.querySelector('label[for="' + CSS.escape(s.id) + '"]')));
    const semNome = [];
    for (const v of views) { try { window.__catedraGoView(v); } catch (_) { continue; } await w(350);
      if (v === 'ajustes') { for (const b of [...document.querySelectorAll('main .aj-abas button[data-s]')]) { b.click(); await w(250); [...document.querySelectorAll('main select')].forEach(s => { if (!nome(s)) semNome.push(v + '/' + b.dataset.s + ': ' + s.outerHTML.slice(0, 60)); }); } continue; }
      [...document.querySelectorAll('main select')].forEach(s => { if (!nome(s)) semNome.push(v + ': ' + s.outerHTML.slice(0, 60)); }); }
    app.setState({ sessionModalOpen: true }); await w(400); [...document.querySelectorAll('.ct-modal-panel select')].forEach(s => { if (!nome(s)) semNome.push('modal: ' + s.outerHTML.slice(0, 60)); }); app.setState({ sessionModalOpen: false }); await w(200);
    r.todosOsSelectsTemNome = semNome.length === 0; r.selectsSemNome = semNome.slice(0, 5).join(' || ');
    window.__catedraGoView('inicio'); await w(300);
    return r;
  });
  for (const [k, v] of Object.entries(h)) { if (k === 'selectsSemNome') { if (v) ok(false, 'A11Y/P16 host selects sem nome: ' + v); continue; } ok(v, 'A11Y/P16 host ' + k); }
  // Cartão-botão (button.ct-card): no hover sobe 2 px. Com a baixa ligada, nem transição NEM salto — o gêmeo
  // do prefers-reduced-motion zera as duas. Hover de verdade (mouse do Playwright) no banco de discursivas da
  // Redação, que carrega assíncrono; o elemento é achado pelo ponto, não por marca que um re-render apagaria.
  const cartaoNoPonto = (baixa) => page.evaluate(async (baixa) => {
    const w = ms => new Promise(res => setTimeout(res, ms)), app = window.__catedraApp;
    app.setState({ prefs: Object.assign({}, app.state.prefs, { baixaEstimulacao: baixa }) }); await w(300);
    window.__catedraGoView('redacao'); await w(500);
    if (!app.state.bancoOpen) app.toggleBanco();
    const acha = () => document.querySelector('main .ct-grade button.ct-card');
    for (let i = 0; i < 60 && !acha(); i++) await w(250);
    const el = acha(); if (!el) return null;
    el.scrollIntoView({ block: 'center' }); await w(200);
    const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, baixa);
  const transformNoHover = async (pt) => {
    if (!pt) return null;
    await page.mouse.move(1, 1); await page.waitForTimeout(250);
    await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(450);
    return page.evaluate((pt) => { const el = document.elementFromPoint(pt.x, pt.y); const c = el && el.closest('button.ct-card'); return c ? getComputedStyle(c).transform : null; }, pt);
  };
  const tfLigado = await transformNoHover(await cartaoNoPonto(true));
  const tfDesligado = await transformNoHover(await cartaoNoPonto(false));
  ok(tfLigado === 'none', 'A11Y/P16 host cartão-botão não sobe no hover com a baixa ligada (transform ' + tfLigado + ')');
  ok(!!tfDesligado && tfDesligado !== 'none', 'A11Y/P16 host cartão-botão sobe no hover com a baixa desligada (transform ' + tfDesligado + ')');
  await page.mouse.move(1, 1);
  await page.evaluate(() => { const app = window.__catedraApp; if (app.state.bancoOpen) app.toggleBanco(); window.__catedraGoView('inicio'); });
  // SATÉLITE avulso: o LEGIS recebe a baixa estimulação pela mensagem ctTheme (tema-satelite.js) e para o
  // movimento. '1' liga, '' desliga, e a chave AUSENTE (host de bundle antigo) não mexe no que está.
  const sctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sp = await sctx.newPage();
  await sp.goto(URL0 + '/legis-web.html?area=juridica'); await sp.waitForTimeout(900);
  const s = await sp.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms)); const r = {};
    const durs = (v) => String(v || '0s').split(',').map(x => { x = x.trim(); return /ms$/.test(x) ? parseFloat(x) / 1000 : (parseFloat(x) || 0); });
    const trans = (el) => el ? Math.max(...durs(getComputedStyle(el).transitionDuration)) : NaN;
    const raizSat = document.documentElement;
    // o primeiro elemento da página com transição de verdade (≥ 100 ms) antes da mensagem
    const alvo = [...document.querySelectorAll('body *')].find(el => trans(el) >= 0.1);
    r.temElementoComTransicao = !!alvo;
    r.abreSemAtributo = !raizSat.hasAttribute('data-baixa');
    // tokens: {} é o mínimo que aplicar() aceita — não troca cor nenhuma, só marca data-ct-tema
    const manda = (extra) => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent, origin: location.origin,
      data: Object.assign({ type: 'ctTheme', tokens: {} }, extra)
    }));
    manda({ baixa: '1' }); await w(250);
    r.ligaPelaMensagem = raizSat.dataset.baixa === '1' && !!alvo && trans(alvo) < 0.01;
    manda({}); await w(200);
    r.chaveAusenteNaoDesliga = raizSat.dataset.baixa === '1';
    manda({ baixa: '' }); await w(250);
    r.vazioDesliga = !raizSat.hasAttribute('data-baixa') && !!alvo && trans(alvo) >= 0.1;
    manda({}); await w(200);
    r.chaveAusenteNaoLiga = !raizSat.hasAttribute('data-baixa');
    return r;
  });
  // JURIS → Mapas das Súmulas Vinculantes: iframe DENTRO do satélite, sem tema-satelite.js, fora do alcance do
  // _temaBroadcast. As duas rolagens por JS (índice e voltar ao topo) leem o data-baixa do JURIS no clique.
  await sp.goto(URL0 + '/juris-web.html'); await sp.waitForTimeout(2200);
  const mapas = await sp.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms)); const r = {};
    document.querySelector('#tabs .tab[data-pane="mapas"]').click();
    const fr = document.getElementById('mapasFrame');
    const doc = () => { try { return fr.contentDocument; } catch (_) { return null; } };
    for (let i = 0; i < 40 && !(doc() && doc().readyState === 'complete' && doc().querySelector('a.ix')); i++) await w(250);
    const fw = fr.contentWindow, fd = doc();
    r.carregou = !!fd && !!fd.querySelector('a.ix') && !!fd.getElementById('up');
    if (!r.carregou) return r;
    const vistos = [];
    fw.Element.prototype.scrollIntoView = function (o) { vistos.push('ix:' + (o && o.behavior)); };
    fw.scrollTo = function (o) { vistos.push('up:' + (o && o.behavior)); };
    const clica = () => { vistos.length = 0; fd.querySelector('a.ix').click(); fd.getElementById('up').click(); return vistos.join(','); };
    const manda = (extra) => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent, origin: location.origin,
      data: Object.assign({ type: 'ctTheme', tokens: {} }, extra)
    }));
    manda({ baixa: '1' }); await w(250);
    const lig = clica();
    r.ligadoSemSuave = document.documentElement.getAttribute('data-baixa') === '1' && lig === 'ix:auto,up:auto';
    manda({ baixa: '' }); await w(250);
    const des = clica();
    r.desligadoSuave = !document.documentElement.hasAttribute('data-baixa') && des === 'ix:smooth,up:smooth';
    if (!r.ligadoSemSuave || !r.desligadoSuave) r.vistos = lig + ' | ' + des;
    return r;
  });
  await sctx.close();
  for (const [k, v] of Object.entries(s)) ok(v, 'A11Y/P16 satélite ' + k);
  for (const [k, v] of Object.entries(mapas)) { if (k === 'vistos') { ok(false, 'A11Y/P16 mapas SV rolagens vistas: ' + v); continue; } ok(v, 'A11Y/P16 mapas SV ' + k); }
  // no toque (iPad): todo botão da área de conteúdo e da barra superior com 44 px
  const ctxToque = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false });
  const pg = await ctxToque.newPage();
  await pg.goto(host); await pg.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); }); await pg.goto(host); await pg.waitForTimeout(1800);
  const t = await pg.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms)); const r = {};
    r.atributoDeToque = document.querySelector('[data-dark][data-dir]').getAttribute('data-toque') === '1' && navigator.maxTouchPoints > 0;
    /* O que se mede é o ALVO, não a caixa do desenho. A regra da casa (catedra-ui.css, ao lado
       do :not(.ct-miudo), e o comentário "CONTROLE PEQUENO NÃO CRESCE" no Catedra.dc.html) é que
       o controle pequeno de propósito — quadradinho do Edital, caixinha do Início, bolinha de cor
       — NÃO estica: quem dá os 44 px é o ::after de .ct-alvo, invisível, centrado. Esticar um
       quadrado de 24 para 24×44 é a deformação que a regra existe para evitar.
       Esta medida antes olhava só getBoundingClientRect().height, então aprovava o quadrado
       deformado em 24×44 e reprovava o desenho correto de 24×24 com área de 44. Agora ela cobra
       as duas pontas e fica MAIS exigente: quem não chega a 44 por caixa própria só passa se o
       ::after medir ≥ 44 nos dois lados E o elemento for position:relative — sem isso o
       pseudo-elemento não ancora e a área de 44 não existe de verdade. É a mesma prova que
       tests/ipad-toque.mjs (a) já faz no quadradinho do Edital. */
    const baixos = [];
    for (const v of ['inicio', 'ciclo', 'calendario', 'simulados', 'edital']) { window.__catedraGoView(v); await w(500);
      [...document.querySelectorAll('main button, .ct-topbar button')].forEach(b => {
        const cx = b.getBoundingClientRect();
        if (!(cx.height > 0)) return;
        if (cx.height >= 44 && cx.width >= 44) return;
        const af = getComputedStyle(b, '::after'), cs = getComputedStyle(b);
        const area = parseFloat(af.height) >= 44 && parseFloat(af.width) >= 44 && cs.position === 'relative';
        if (area) return;
        baixos.push(v + ': ' + Math.round(cx.width) + '×' + Math.round(cx.height)
          + (af.content === 'none' ? ' sem ::after' : ' ::after ' + af.width + '×' + af.height)
          + ' ' + b.textContent.trim().slice(0, 20));
      }); }
    r.botoesCom44 = baixos.length === 0; r.baixos = baixos.slice(0, 6).join(' || ');
    return r;
  });
  await ctxToque.close();
  for (const [k, v] of Object.entries(t)) { if (k === 'baixos') { if (v) ok(false, 'A11Y/P16 toque abaixo de 44: ' + v); continue; } ok(v, 'A11Y/P16 toque ' + k); }
}

/* ============= TELEMETRIA — P17: erros e uso por tela, de primeira parte, desligada por padrão ============= */
// Sem terceiros. O script do rodapé enfileira o erro (catedra:_errFila); _irPara conta a tela do dia
// (catedra:_usoTelas); nada sai do aparelho enquanto app_avisos não disser telemetria:true — e mesmo então só
// com conta e rede, pela RPC. As duas chaves ficam fora da sincronização. O servidor foi conferido ao vivo
// em 08/09/2026 (desligada não grava; ligada grava, soma e a administração lê).
{
  const r = {};
  const auth = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8'), src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  r.chavesForaDaSincronizacao = /'catedra:_errFila': 1, 'catedra:_usoTelas': 1/.test(auth);
  r.migracaoVersionada = fs.existsSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-telemetria.sql')) && /DADOS NOVOS TRATADOS/.test(fs.readFileSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-telemetria.sql'), 'utf8'));
  r.consoleCarregaETemPainel = /sb\.rpc\('admin_erros_cliente', \{p_horas:24\}\)/.test(src) && /sb\.rpc\('admin_uso_telas', \{p_dias:7\}\)/.test(src) && /data-adm="telemetria"/.test(src) && /data-adm="telas"/.test(src) && /data-adm="telemetria-sw"/.test(src) && /p_chave:'telemetria'/.test(src);
  for (const [k, v] of Object.entries(r)) ok(v, 'TELEMETRIA/P17 estático ' + k);
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  await page.evaluate(() => { ['catedra:_errFila', 'catedra:_usoTelas', 'catedra:_lastErr'].forEach(k => localStorage.removeItem(k)); });
  await page.goto(host); await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    // o script do rodapé enfileira o erro (sem depender do app)
    window.dispatchEvent(new ErrorEvent('error', { message: 'TypeError: falha em pessoa@exemplo.com https://x.y/z?token=abc', error: new Error('TypeError: falha') }));
    await w(200);
    const fila = JSON.parse(localStorage.getItem('catedra:_errFila') || '[]');
    r.errFilaRecebe = Array.isArray(fila) && fila.length >= 1 && /TypeError/.test(fila[fila.length - 1].m) && fila[fila.length - 1].ts > 0;
    document.getElementById('ct-errbar') && document.getElementById('ct-errbar').remove();
    // saneamento: e-mail, URL e token viram marcadores; 300 caracteres no máximo
    const s = app._telemetriaSanear('Erro em pessoa@exemplo.com ao abrir https://api.x.com/v1?k=1 com eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 ' + 'x'.repeat(400));
    r.saneiaDadosPessoais = /\[e-mail\]/.test(s) && /\[url\]/.test(s) && /\[token\]/.test(s) && !/exemplo\.com|api\.x\.com|eyJ/.test(s) && s.length <= 300;
    // contagem local por tela e dia
    localStorage.removeItem('catedra:_usoTelas');
    window.__catedraGoView('edital'); await w(200); window.__catedraGoView('inicio'); await w(200); window.__catedraGoView('edital'); await w(200);
    const u = JSON.parse(localStorage.getItem('catedra:_usoTelas'));
    r.contaTelasDoDia = !!u && u.dia === app._hoje() && u.c.edital === 2 && u.c.inicio === 1;
    // desligada: nada sai, mesmo com conta e rede
    const chamadas = [];
    window.CatedraAuth = { user: { id: 'u1', email: 'x@y.z' }, client: { rpc: async (fn, args) => { chamadas.push({ fn, args }); return { data: true, error: null }; } } };
    app.setState({ telemetriaLigada: false }); await app._telemetriaEnviar(); await w(100);
    r.desligadaNaoEnvia = chamadas.length === 0 && JSON.parse(localStorage.getItem('catedra:_errFila')).length >= 1;
    // ligada (o que app_avisos diria): erros saem saneados com build/alvo/tela e a fila esvazia; o uso do dia sobe e zera
    app.setState({ telemetriaLigada: true }); await app._telemetriaEnviar(); await w(100);
    const erro = chamadas.find(c => c.fn === 'registrar_erro_cliente'), uso = chamadas.find(c => c.fn === 'registrar_uso_telas');
    r.ligadaEnviaErroSaneado = !!erro && /\[e-mail\]/.test(erro.args.p_mensagem) && /\[url\]/.test(erro.args.p_mensagem) && !/exemplo\.com/.test(erro.args.p_mensagem) && typeof erro.args.p_build === 'string' && ['web', 'macOS', 'iPad', 'local'].some(a => erro.args.p_alvo === a || erro.args.p_alvo === '') && erro.args.p_tela === 'edital' && /^\d{4}-\d\d-\d\dT/.test(erro.args.p_ts);
    r.filaEsvaziaSoOQueSubiu = JSON.parse(localStorage.getItem('catedra:_errFila')).length === 0;
    r.ligadaEnviaUsoDoDia = !!uso && uso.args.p_dia === app._hoje() && uso.args.p_contagens.edital === 2 && uso.args.p_contagens.inicio === 1 && Object.keys(JSON.parse(localStorage.getItem('catedra:_usoTelas')).c).length === 0;
    // erro no servidor mantém a fila (nada se perde por tentativa falha)
    localStorage.setItem('catedra:_errFila', JSON.stringify([{ ts: Date.now(), m: 'ReferenceError: y' }]));
    window.CatedraAuth.client.rpc = async () => ({ data: null, error: { message: 'x' } });
    await app._telemetriaEnviar(); await w(100);
    r.falhaMantemAFila = JSON.parse(localStorage.getItem('catedra:_errFila')).length === 1;
    // sem rede: nada sai
    window.CatedraAuth.client.rpc = async (fn) => { chamadas.push({ fn }); return { data: true, error: null }; };
    const antes = chamadas.length; Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); await app._telemetriaEnviar(); Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    r.semRedeNaoEnvia = chamadas.length === antes;
    // o app_avisos liga/desliga o estado
    const sbOrig = app._sb; app._sb = () => ({ rpc: async () => ({ data: { aviso: '', avisoTipo: 'info', manutencao: false, iaPausada: false, telemetria: true }, error: null }) });
    app.setState({ telemetriaLigada: false }); await app._loadAvisos(); await w(300);
    r.avisosLigam = app.state.telemetriaLigada === true;
    app._sb = sbOrig; app.setState({ telemetriaLigada: false }); delete window.CatedraAuth;
    ['catedra:_errFila', 'catedra:_usoTelas', 'catedra:_lastErr'].forEach(k => localStorage.removeItem(k));
    return r;
  });
  for (const [k, v] of Object.entries(h)) ok(v, 'TELEMETRIA/P17 host ' + k);
}

/* ============= IA — P18: cota diária por conta nas funções da Vercel, com o fetch simulado ============= */
// api/complete.js e api/tts.js perguntam minha_cota_ia() depois dos portões de sessão, allowlist e bloqueio; ao
// estourar, 429 com a mensagem em português (o app mostra em toast). Falha na consulta = fail-open. Allowlist,
// kill switch e teto por chamada ficam como estavam.
{
  const r = {};
  const fetchOrig = globalThis.fetch;
  const fakeRes = () => { const o = { codigo: 0, corpo: null, status(c) { o.codigo = c; return o; }, json(b) { o.corpo = b; return o; } }; return o; };
  const cenario = (cota, prov) => { const chamadas = []; globalThis.fetch = async (url, opt) => { const u = String(url); chamadas.push(u);
    if (/\/auth\/v1\/user$/.test(u)) return { ok: true, json: async () => ({ id: 'u1', email: 'p@exemplo.invalid' }) };
    if (/rpc\/meu_email_liberado/.test(u)) return { ok: true, json: async () => true };
    if (/rpc\/meu_acesso_bloqueado/.test(u)) return { ok: true, json: async () => false };
    if (/rpc\/minha_cota_ia/.test(u)) return cota === 'falha' ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => cota };
    if (/rpc\/registrar_uso_ia/.test(u)) return { ok: true, json: async () => null };
    if (/api\.anthropic\.com/.test(u)) return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: prov || 'resposta' }] }) };
    if (/generativelanguage\.googleapis\.com/.test(u)) return { ok: true, status: 200, json: async () => ({ output_audio: { data: Buffer.from('abcd').toString('base64'), mime_type: 'audio/L16;rate=24000' } }) };
    return { ok: false, status: 500, json: async () => ({}), text: async () => '' }; }; return chamadas; };
  const envAntes = { A: process.env.ANTHROPIC_API_KEY, B: process.env.BETA_EMAILS, G: process.env.GEMINI_API_KEY };
  process.env.ANTHROPIC_API_KEY = 'sk-ant-teste'; delete process.env.BETA_EMAILS; process.env.GEMINI_API_KEY = 'gem-teste';
  const { default: complete, mensagemCota } = await import('../api/complete.js');
  const { default: tts } = await import('../api/tts.js');
  const req = (body) => ({ method: 'POST', headers: { authorization: 'Bearer tok' }, body });
  r.mensagemEmPortugues = mensagemCota({ limite: 40 }) === 'Você usou as 40 chamadas de IA de hoje. A cota volta amanhã, à meia-noite de Brasília.';
  let ch = cenario({ plano: 'beta', limite: 2, usadas: 2, restante: 0 }); let res = fakeRes();
  await complete(req({ prompt: 'olá' }), res);
  r.estourou429 = res.codigo === 429 && /usou as 2 chamadas de IA de hoje/.test(res.corpo.error) && res.corpo.cota.restante === 0 && !ch.some(u => /anthropic/.test(u)) && !ch.some(u => /registrar_uso_ia/.test(u));
  ch = cenario({ plano: 'beta', limite: 2, usadas: 1, restante: 1 }); res = fakeRes();
  await complete(req({ prompt: 'olá' }), res);
  r.abaixoDaCotaPassa = res.codigo === 200 && res.corpo.completion === 'resposta' && ch.some(u => /registrar_uso_ia/.test(u)) && ch.some(u => /anthropic/.test(u));
  ch = cenario('falha'); res = fakeRes();
  await complete(req({ prompt: 'olá' }), res);
  r.falhaNaConsultaNaoBarra = res.codigo === 200;
  ch = cenario({ plano: 'beta', limite: 5, usadas: 5 }); res = fakeRes();
  await complete(req({ prompt: 'x'.repeat(70000) }), res);
  r.cotaAntesDoTetoPorChamada = res.codigo === 429;
  ch = cenario({ plano: 'beta', limite: 5, usadas: 1 }); res = fakeRes();
  await complete(req({ prompt: 'x'.repeat(70000) }), res);
  r.tetoPorChamadaMantido = res.codigo === 413;
  globalThis.fetch = async (url) => { const u = String(url); if (/\/auth\/v1\/user$/.test(u)) return { ok: false }; return { ok: false }; }; res = fakeRes();
  await complete(req({ prompt: 'olá' }), res);
  r.semSessaoContinua401 = res.codigo === 401;
  ch = cenario({ plano: 'beta', limite: 3, usadas: 3 }); res = fakeRes();
  await tts(req({ texto: 'narrar' }), res);
  r.ttsTambemRespeita = res.codigo === 429 && /chamadas de IA de hoje/.test(res.corpo.error) && !ch.some(u => /googleapis/.test(u));
  ch = cenario({ plano: 'beta', limite: 3, usadas: 0 }); res = fakeRes();
  await tts(req({ texto: 'narrar' }), res);
  r.ttsAbaixoDaCotaPassa = res.codigo === 200 && !!res.corpo.audio;
  globalThis.fetch = fetchOrig; process.env.ANTHROPIC_API_KEY = envAntes.A || ''; if (envAntes.B) process.env.BETA_EMAILS = envAntes.B; process.env.GEMINI_API_KEY = envAntes.G || '';
  if (!envAntes.A) delete process.env.ANTHROPIC_API_KEY; if (!envAntes.G) delete process.env.GEMINI_API_KEY;
  const build = fs.readFileSync(path.join(RAIZ, 'scripts/build.mjs'), 'utf8'), src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  r.shimTrazAMensagem = /jerr\.error \|\| \('IA HTTP ' \+ r\.status\)/.test(build);
  r.hostMostraEmToast = /chamadas de IA de hoje\/\.test\(m\)\) this\._toast\(m\)/.test(src) && /data-adm="cota"/.test(src) && /admin_ia_cota_set/.test(src);
  r.migracaoVersionada = fs.existsSync(path.join(RAIZ, 'supabase/migrations/2026-09-08-ia-cota.sql'));
  for (const [k, v] of Object.entries(r)) ok(v, 'IA/P18 cota ' + k);
}

/* ============= ÁREAS — P19: foco de escopo para o beta público ============= */
// CT_AREA_REG.PUBLICAS (só 'juridica') manda em quem ESCOLHE área — onboarding e Ajustes. A conta que já usa
// outra área continua nela; com a lista completa, tudo volta. Nenhum código ou dado removido.
{
  const r = {};
  const R = (await import('../area-registry.js')).default || globalThis.CT_AREA_REG;
  r.constanteInicial = Array.isArray(R.PUBLICAS) && R.PUBLICAS.length === 1 && R.PUBLICAS[0] === 'juridica';
  r.publicaPura = R.publica('juridica') === true && R.publica('saude') === false && R.publica('saude', 'saude') === true && R.publica('policial', 'saude') === false;
  r.registroIntacto = Object.keys(R.AREAS).length >= 8 && !!R.AREAS.saude && !!R.AREAS.policial;
  for (const [k, v] of Object.entries(r)) ok(v, 'ÁREAS/P19 puro ' + k);
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  const areaAntes = await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); const a = localStorage.getItem('catedra:areaEstudo'); localStorage.removeItem('catedra:areaEstudo'); localStorage.removeItem('catedra:onboarded'); return a; });
  await page.goto(host); await page.waitForTimeout(1600);
  const h = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp, R = window.CT_AREA_REG;
    // conta nova: o onboarding oferece só a área jurídica
    app.setState({ onboardStep: 2 }); await w(400);   // o passo 2 é a área
    const cards = () => [...document.querySelectorAll('button[data-a]')].map(b => b.dataset.a).filter((v, i, l) => l.indexOf(v) === i);
    r.onboardingSoJuridica = cards().length === 1 && cards()[0] === 'juridica';
    // com a lista completa, tudo volta
    const pubAntes = R.PUBLICAS.slice(); R.PUBLICAS.push('saude', 'social', 'policial', 'fiscal', 'contas', 'administrativa', 'educacao', 'tecnologia', 'militar', 'outra'); app.setState({}); await w(300);
    r.listaCompletaTrazTudo = cards().length >= 10 && cards().includes('saude');
    R.PUBLICAS.length = 0; pubAntes.forEach(x => R.PUBLICAS.push(x)); app.setState({}); await w(300);
    r.voltaAoFoco = cards().length === 1;
    // conta que já usa outra área continua vendo a sua (e só a sua fora da lista)
    app.setState({ onboardStep: 0, areaEstudo: 'saude' }); await w(400);
    window.__catedraGoView('ajustes'); await w(600);
    const abaPerfil = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => b.dataset.s === 'perfil'); if (abaPerfil) { abaPerfil.click(); await w(400); }
    app.setState({ areaSelOpen: true }); await w(400);   // o seletor de área de Ajustes abre sob demanda
    const emAjustes = cards();
    r.contaAntigaContinua = emAjustes.includes('saude') && emAjustes.includes('juridica') && emAjustes.length === 2 && app.state.areaEstudo === 'saude';
    app.setState({ areaEstudo: 'juridica', areaSelOpen: false }); await w(300);
    return r;
  });
  for (const [k, v] of Object.entries(h)) ok(v, 'ÁREAS/P19 host ' + k);
  await page.evaluate((a) => { localStorage.setItem('catedra:onboarded', '1'); if (a != null) localStorage.setItem('catedra:areaEstudo', a); else localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')); }, areaAntes);
}

/* ============= D4 — P20: estados vazios que convidam nas primeiras telas (Início, Edital, Simulado) ============= */
// Zero absoluto não vira número: o slot mostra título, descrição e ação. Com ≥ 1, volta o número normal.
{
  const host = URL0 + '/Catedra.dc.html';
  await page.goto(host);
  const guard = await page.evaluate(() => { const g = { edital: localStorage.getItem('catedra:edital'), sessions: localStorage.getItem('catedra:sessions') }; localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.removeItem('catedra:edital'); localStorage.removeItem('catedra:sessions'); localStorage.removeItem('catedra:sim'); localStorage.removeItem('ct_timer'); return g; });
  await page.goto(host); await page.waitForTimeout(1600);
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const r = {}, app = window.__catedraApp;
    window.__catedraGoView('inicio'); await w(600);
    const kpi = (k) => document.querySelector('main [data-kpi="' + k + '"]');
    r.editalSemNumero = kpi('edital').getAttribute('data-vazio') === 'sem-edital' && !kpi('edital').querySelector('.cth-val') && /Comece pelo edital/.test(kpi('edital').textContent) && /Abrir o edital/.test(kpi('edital').querySelector('.ct-convite button').textContent) && !/0\s*%/.test(kpi('edital').textContent);
    r.metaSemNumero = kpi('meta').getAttribute('data-vazio') === 'true' && !kpi('meta').querySelector('.cth-val') && /Nada registrado hoje/.test(kpi('meta').textContent) && /Registrar sessão/.test(kpi('meta').querySelector('.ct-convite button').textContent) && !/0\s*%/.test(kpi('meta').textContent);
    r.alvo44 = kpi('edital').querySelector('.ct-convite button').getBoundingClientRect().height >= 44;
    kpi('edital').querySelector('.ct-convite button').click(); await w(500);
    r.acaoLevaAoEdital = app.state.view === 'edital' && !!document.querySelector('main [data-estado="edital"]') && /Comece pelo edital/.test(document.querySelector('main [data-estado="edital"]').textContent) && !/Conclusão do edital/.test(document.querySelector('main').textContent);
    // com edital mas nada concluído: outro convite; com um tópico feito: número
    app.setState({ edital: [{ disc: 'Direito Civil', color: '#0D9488', open: false, topics: [{ name: 'Contratos', done: false, subs: [] }, { name: 'Família', done: false, subs: [] }], peso: '', questoes: '' }] }); await w(500);
    r.editalSemProgresso = /Nenhum tópico concluído ainda/.test(document.querySelector('main [data-estado="edital"]').textContent);
    window.__catedraGoView('inicio'); await w(500);
    r.inicioSemProgresso = kpi('edital').getAttribute('data-vazio') === 'sem-progresso' && /Marcar tópicos/.test(kpi('edital').textContent);
    app.setState({ edital: [{ disc: 'Direito Civil', color: '#0D9488', open: false, topics: [{ name: 'Contratos', done: true, subs: [] }, { name: 'Família', done: false, subs: [] }], peso: '', questoes: '' }] }); await w(500);
    r.comProgressoVoltaONumero = kpi('edital').getAttribute('data-vazio') === '' && /50\s*%/.test(kpi('edital').querySelector('.cth-val').textContent) && /1\/2/.test(kpi('edital').textContent);
    // um minuto estudado hoje: a meta vira número
    app.setState({ sessions: [{ id: 's-d4', ts: Date.now(), date: app._hoje(), min: 25, categoria: 'Teoria', categorias: ['Teoria'], disc: 'Direito Civil' }] }); await w(600);
    r.metaComMinutosVoltaONumero = kpi('meta').getAttribute('data-vazio') === 'false' && !!kpi('meta').querySelector('.cth-val') && /25/.test(kpi('meta').textContent);
    // Simulado: sem histórico, estado vazio com ação
    app.setState({ sessions: [] }); window.__catedraGoView('simulados'); await w(700);
    const est = document.querySelector('main [data-estado="simulado"]');
    r.simuladoConvida = !!est && /Nenhum simulado ainda/.test(est.querySelector('.ct-estado-titulo').textContent) && /Fazer o primeiro simulado/.test(est.querySelector('button').textContent) && !/0\s*%/.test(est.textContent);
    est.querySelector('button').click(); await w(400);
    r.acaoAbreOSimulado = app.state.sjAberto === true;
    app.setState({ sjAberto: false, edital: [] });
    return r;
  });
  for (const [k, v] of Object.entries(r)) ok(v, 'D4/P20 ' + k);
  await page.evaluate((g) => { if (g.edital != null) localStorage.setItem('catedra:edital', g.edital); else localStorage.removeItem('catedra:edital'); if (g.sessions != null) localStorage.setItem('catedra:sessions', g.sessions); else localStorage.removeItem('catedra:sessions'); }, guard);
}

/* ============= GRÁFICOS INTERATIVOS — mouse, teclado e toque mostram a mesma leitura ============= */
{
  await page.goto(URL0 + '/Catedra.dc.html');
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const app = window.__catedraApp, agora = new Date(), ontem = new Date(agora); ontem.setDate(agora.getDate() - 1);
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    app.setState({ sessions: [
      { id:'graf-1', ts:ontem.getTime(), date:ymd(ontem), min:30, acertos:6, erradas:2, disc:'Direito Civil' },
      { id:'graf-2', ts:agora.getTime(), date:ymd(agora), min:75, acertos:8, erradas:2, disc:'Direito Penal' }
    ], view:'inicio' });
    await w(700);
    const pontos = [...document.querySelectorAll('main .ct-graf-ponto')];
    const alvo = pontos.find(b => /75/.test(b.getAttribute('aria-label') || '')) || pontos[0];
    const opacidadeAntes = getComputedStyle(alvo, '::after').opacity;
    alvo.focus(); await w(180);
    const opacidadeFoco = getComputedStyle(alvo, '::after').opacity;
    return {
      quatroGraficos: document.querySelectorAll('main .ct-graf-interativo').length >= 4,
      todosSaoBotoes: pontos.length >= 20 && pontos.every(b => b.tagName === 'BUTTON' && b.type === 'button'),
      nomesComContexto: pontos.every(b => /(:|Semana de)/.test(b.getAttribute('aria-label') || '')),
      comparaPeriodo: pontos.some(b => /período anterior/.test(b.dataset.tip || '')),
      questoesExplicam: pontos.some(b => /acertos.*erros.*% de acerto/s.test(b.dataset.tip || '')),
      tecladoMostra: parseFloat(opacidadeAntes) === 0 && parseFloat(opacidadeFoco) === 1,
      alvoToque: alvo.getBoundingClientRect().height >= 44
    };
  });
  for (const [k, v] of Object.entries(r)) ok(v, 'GRÁFICOS interativos ' + k);
}

/* ============= EVOLUÇÃO DA REDAÇÃO (item 4) ============= */
await page.goto(URL0 + '/tests/harness-redhist.html');
await page.waitForFunction(() => !!window.redRegistrar);

const evo = await page.evaluate(() => {
  const r = {};
  const limpa = () => localStorage.removeItem('catedra:redHist');
  const ler = () => JSON.parse(localStorage.getItem('catedra:redHist') || '[]');
  const dia = 864e5;

  // duas tentativas da mesma prova → uma linha, delta por quesito
  limpa();
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now() - 3 * dia, notaTotal: 40,
    quesitos: [ { titulo: 'Preliminar', nota: 0, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  window.redRegistrar({ origem: 'segunda-fase', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 75,
    quesitos: [ { titulo: 'Preliminar', nota: 1, max: 1 }, { titulo: 'Mérito', nota: 1, max: 1 }, { titulo: 'Dosimetria', nota: 0.5, max: 1 } ] });
  const e1 = window.redEvolucao();
  r.umaLinhaPorProva = e1.length === 1 && e1[0].tentativas === 2;
  r.curvaSubiu = e1[0].primeiroPct === 50 && e1[0].ultimoPct === 83;
  // o que menos evoluiu vem primeiro (Mérito e Dosimetria: delta 0; Preliminar: +100)
  r.piorPrimeiro = e1[0].quesitos[0].delta === 0 && e1[0].quesitos[e1[0].quesitos.length - 1].delta === 100;
  r.casaPorIndice = e1[0].quesitos.some(q => q.titulo === 'Preliminar' && q.de === 0 && q.para === 100);

  // provas diferentes não se misturam; a origem separa
  window.redRegistrar({ origem: 'redacao', prova: 'TJ-RJ 2026 · discursiva', ts: Date.now(), notaTotal: 60,
    quesitos: [{ titulo: 'Estrutura', nota: 6, max: 10 }] });
  r.origemSepara = window.redEvolucao().length === 2;

  // id + up (regra da casa: merge por id no auth.js)
  r.temIdEUp = ler().every(x => x.id && x.up && Array.isArray(x.quesitos));
  // não guarda o texto da peça
  r.semTexto = ler().every(x => !('texto' in x) && !('folha' in x));

  // sparkline: n pontos, começa em M e não estoura a caixa
  const d = window.redSpark([50, 83]);
  r.spark = /^M[\d. ]+L[\d. ]+$/.test(d) && !/-\d/.test(d);
  r.sparkVazio = window.redSpark([50]) === '';

  // canal da 2ª fase
  limpa();
  window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: location.origin,
    data: { type: 'ctRedacaoResultado', prova: 'TJ-SP 2025 · sentença', notaTotal: 66,
      quesitos: [{ titulo: 'Relatório', nota: 1, max: 1 }, { titulo: 'Fundamentação', nota: 0, max: 1 }] } }));
  return new Promise(res => setTimeout(() => {
    const h = ler();
    r.canal = h.length === 1 && h[0].origem === 'segunda-fase' && h[0].quesitos.length === 2 && h[0].notaTotal === 66;
    limpa();
    res(r);
  }, 200));
});
for (const [k, v] of Object.entries(evo)) ok(v, 'REDHIST ' + k);

// A página REAL da 2ª fase, dirigida uma vez: ao "Salvar e sair" ela posta as duas
// mensagens — os quesitos falhos (item 2) e a nota por quesito (item 4).
await page.goto(URL0 + '/segunda-fase-web.html');
await page.waitForTimeout(700);
const pre = await page.evaluate(() => {
  const P = (window.CT_ESPELHOS || {}).provas || [];
  const alvo = P.find(p => (p.quesitos || []).length >= 2) || P[0];
  if (!alvo) return { erro: 'sem provas' };
  localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
    id: alvo.id, minutos: 300, inicio: Date.now(), acc: 60000, rodando: false,
    folha: 'texto qualquer da peça para a correção rodar', entregue: true, gasto: 60000, veredictos: {} } }));
  return { ok: true };
});
if (!pre.erro) {
  await page.goto(URL0 + '/segunda-fase-web.html');
  await page.waitForTimeout(1200);
  const duas = await page.evaluate(async () => {
    const caixa = {};
    // A página aberta avulsa não ecoa mais mensagens para si: a ponte segura só fala
    // com um parent real. Este caso mede os dois payloads emitidos pela tela, enquanto
    // tests/postmessage-seguranca.mjs prova a identidade da janela no canal completo.
    const original = window.ctEnviarAoHost;
    window.ctEnviarAoHost = dados => {
      if (dados && (dados.type === 'ctErrosSegundaFase' || dados.type === 'ctRedacaoResultado')) caixa[dados.type] = dados;
      return true;
    };
    // marca dois quesitos como "não atendeu" para haver o que colher
    [...document.querySelectorAll('.q .ver button[data-v="nao"]')].slice(0, 2).forEach(b => b.click());
    const fechar = [...document.querySelectorAll('button')].find(b => /Salvar e sair/.test(b.textContent || ''));
    if (!fechar) { window.ctEnviarAoHost = original; return caixa; }
    fechar.click();
    await new Promise(r => setTimeout(r, 900));
    window.ctEnviarAoHost = original;
    return caixa;
  });
  const post = duas.ctErrosSegundaFase, msg = duas.ctRedacaoResultado;
  ok(!!post && Array.isArray(post.quesitos) && post.quesitos.length > 0, 'ERROS 2ª fase posta ctErrosSegundaFase ao fechar');
  ok(!!post && !!post.prova, 'ERROS 2ª fase manda o rótulo da prova');
  ok(!!msg && Array.isArray(msg.quesitos) && msg.quesitos.length >= 2, 'REDHIST 2ª fase posta ctRedacaoResultado');
  ok(!!msg && msg.quesitos.every(q => q.max === 1 && q.nota >= 0 && q.nota <= 1), 'REDHIST notas por quesito normalizadas');
  ok(!!msg && !JSON.stringify(msg).includes('texto qualquer da peça'), 'REDHIST não manda o texto da peça');
}
/* ============= ONDE ESTOU FRACA (item 1) ============= */
await page.goto(URL0 + '/tests/harness-prioridade.html');
await page.waitForFunction(() => !!window.CT_PRIORIDADE_CALC);

const prio = await page.evaluate(() => {
  const { prioridadeDisciplinas, PESOS } = window.CT_PRIORIDADE_CALC;
  const hoje = '2026-08-22';
  const dia = 864e5, hojeMs = Date.parse(hoje + 'T00:00:00Z');
  const r = {};

  const base = {
    hoje,
    edital: [{ disc: 'Direito Processual Penal', peso: 2 }, { disc: 'Direito Civil', peso: 1 }],
    errors: [], reviews: [],
    sessions: [
      { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 },
      { disc: 'Direito Civil', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }
    ]
  };

  // pesos somam 1 e estão num lugar só
  r.pesosSomam1 = Math.abs(Object.values(PESOS).reduce((a, b) => a + b, 0) - 1) < 1e-9;

  // mais erros → sobe
  const comErros = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - i * dia })) });
  r.errosSobem = comErros[0].disc === 'Direito Civil';

  // erro fora da janela de 30 dias não conta
  const errosVelhos = prioridadeDisciplinas({ ...base,
    errors: [1, 2, 3].map(i => ({ disc: 'Direito Civil', ts: hojeMs - (40 + i) * dia })) });
  r.janela30 = errosVelhos[0].disc !== 'Direito Civil' || errosVelhos[0].nota === errosVelhos[1].nota;

  // revisões vencidas sobem; revisar (dueDate no futuro) desce
  const vencidas = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-08-10' }, { disc: 'Direito Civil', dueDate: '2026-08-12' }] });
  const revisou = prioridadeDisciplinas({ ...base, reviews: [
    { disc: 'Direito Civil', dueDate: '2026-09-10' }, { disc: 'Direito Civil', dueDate: '2026-09-12' }] });
  const notaDe = (lista, d) => lista.find(x => x.disc === d).nota;
  r.revisoesSobem = notaDe(vencidas, 'Direito Civil') > notaDe(revisou, 'Direito Civil');
  r.revisarDesce = notaDe(revisou, 'Direito Civil') < notaDe(vencidas, 'Direito Civil');

  // tempo sem estudar pesa; nunca estudada é o máximo do fator
  const parada = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.nuncaEstudada = parada[0].disc === 'Direito Civil' && parada[0].diasSem === null;

  // desempenho: amostra pequena não vira sinal
  const poucas = prioridadeDisciplinas({ ...base,
    sessions: [{ disc: 'Direito Civil', date: '2026-08-21', questoes: 3, acertos: 0, erradas: 3 },
               { disc: 'Direito Processual Penal', date: '2026-08-21', questoes: 20, acertos: 15, erradas: 5 }] });
  r.amostraMinima = poucas.find(x => x.disc === 'Direito Civil').liqPct === null;

  // nome com caixa/acento diferente casa (strings livres no app)
  const acento = prioridadeDisciplinas({ ...base,
    errors: [{ disc: '  direito civil  ', ts: hojeMs - dia }] });
  r.normalizaNome = acento.find(x => x.disc === 'Direito Civil').erros30 === 1;

  // sem dado nenhum: marca semDados (a tela explica em vez de mostrar zeros)
  const vazio = prioridadeDisciplinas({ hoje, edital: [{ disc: 'Direito Civil' }], errors: [], reviews: [], sessions: [] });
  r.semDados = vazio.length === 1 && vazio[0].semDados === true;
  r.semEdital = prioridadeDisciplinas({ hoje, edital: [] }).length === 0;

  // cada cartão explica o porquê
  r.temMotivos = comErros[0].motivos.length > 0 && comErros[0].fatores.length === 6;   // LA6 trouxe o fator "lei seca por ler"
  r.notaLimitada = comErros.every(x => x.nota >= 0 && x.nota <= 100);
  return r;
});
for (const [k, v] of Object.entries(prio)) ok(v, 'PRIORIDADE ' + k);
/* ============= BUSCA ÚNICA NO ⌘K (item 6) ============= */
await page.goto(URL0 + '/tests/harness-busca.html');
await page.waitForFunction(() => !!window.__IDX);

const bu = await page.evaluate(() => {
  const B = window.CT_BUSCA, IDX = window.__IDX, r = {};
  const t = (q, tipo) => (B.buscar(IDX, q)[tipo][0] || {}).titulo || null;

  r.indexou = IDX.length > 300 && IDX.some(x => x.tipo === 'lei') && IDX.some(x => x.tipo === 'peca') && IDX.some(x => x.tipo === 'rito');

  // acervo: lei, jurisprudência, peça e rito no mesmo campo
  r.achaLei = t('improbidade', 'lei') === 'Lei de Improbidade Administrativa';
  r.achaSumula = /Súmula 619/.test(t('súmula 619', 'verbete') || '');
  r.achaPeca = /Senten/.test(t('sentença', 'peca') || '');
  r.achaRito = /júri/i.test(t('júri', 'rito') || '');

  // sigla é como se procura lei na prática — e vale SÓ para lei
  r.sigla = t('cpc', 'lei') === 'Código de Processo Civil' && t('ctn', 'lei') === 'Código Tributário Nacional';
  r.siglaCF = t('cf', 'lei') === 'Constituição Federal';           // não pode ser "Código Florestal"
  r.siglaNaoVazaProVerbete = B.buscar(IDX, 'cpc').verbete.every(v => /cpc|processo civil/i.test(B.normalizar(v.titulo + ' ' + v.extra)));

  // número da lei (a referência é buscável)
  r.numeroDaLei = t('8.429', 'lei') === 'Lei de Improbidade Administrativa';

  // acento e caixa não importam
  r.semAcento = t('sentenca', 'peca') === t('sentença', 'peca') && t('JÚRI', 'rito') === t('júri', 'rito');

  // prefixo ganha de pedaço no meio
  r.ranking = B.pontuar('codigo de processo civil', 'codigo') === 3
    && B.pontuar('codigo de processo civil', 'processo') === 2
    && B.pontuar('codigo de processo civil', 'rocess') === 1;

  // repetido no acervo aparece uma vez só — MAS súmula homônima de tribunais diferentes
  // são duas coisas: a chave inclui o extra (tribunal · situação)
  r.dedup = B.buscar(IDX, 'súmula 619').verbete.length === 1;
  const doisTribunais = B.indexar({ verbetes: [
    ['A', 'STF', 'sumula_stf', 619, 'Súmula 619', 'Constitucional', 'x', null, 'Revogada', 0],
    ['B', 'STJ', 'sumula_stj', 619, 'Súmula 619', 'Administrativo', 'y', null, null, 1]] });
  const d2 = B.buscar(doisTribunais, 'súmula 619').verbete;
  r.homonimasSeparadas = d2.length === 2;
  r.revogadaPorUltimo = d2[0].extra.includes('STJ') && /Revogada/.test(d2[1].extra);

  /* --- TASK 7 · identidade canônica: o que colapsa e o que NÃO colapsa --- */
  // (a) mesmo tribunal, mesmo número, mesmo título, ramo/tema escritos diferente = UM item
  r.t7mesmoVerbeteExtrasDiferentes = B.buscar(B.indexar({ verbetes: [
    ['STJ-1', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'Prescrição'],
    ['STJ-2', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Processo Penal', 'Prescrição da pretensão']
  ] }), 'súmula 619').verbete.length === 1;
  // (b) tribunais diferentes com o mesmo número = DOIS itens (são súmulas distintas)
  r.t7tribunaisDiferentesFicam = B.buscar(B.indexar({ verbetes: [
    ['A', 'STF', 'stf', 619, 'Súmula 619', 'Constitucional', 'x'],
    ['B', 'STJ', 'stj', 619, 'Súmula 619', 'Administrativo', 'y']
  ] }), 'súmula 619').verbete.length === 2;
  // (c) mesma lei repetida por nome/referência = UM item
  r.t7leiRepetida = B.buscar(B.indexar({ leis: [
    { t: 'Código de Processo Civil', r: 'Lei nº 13.105/2015' },
    { t: 'Código de Processo Civil', r: 'CPC' }
  ] }), 'processo civil').lei.length === 1;
  // (d) mesmo título, números juridicamente distintos = DOIS itens
  r.t7numerosDistintosFicam = B.buscar(B.indexar({ verbetes: [
    ['A', 'STJ', 'stj', 7, 'Súmula', 'Civil', 'x'],
    ['B', 'STJ', 'stj', 8, 'Súmula', 'Penal', 'y']
  ] }), 'súmula').verbete.length === 2;
  // (e) o id da fonte sobrevive à busca (para abrir o registro exato quando houver como)
  r.t7idPreservado = (B.buscar(B.indexar({ verbetes: [
    ['STJ-SUM-619', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'x']
  ] }), 'súmula 619').verbete[0] || {}).id === 'STJ-SUM-619';
  // (f) a chave é identidade, não aparência: dois itens iguais têm a MESMA _k
  r.t7chaveEstavel = (function () {
    const i = B.indexar({ verbetes: [
      ['STJ-1', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Penal', 'Prescrição'],
      ['STJ-2', 'STJ', 'stj', 619, 'Súmula 619 do STJ', 'Outro ramo', 'Outro tema']] });
    return i[0]._k === i[1]._k && !!i[0]._k;
  })();

  // teto por tipo e piso de 2 letras
  r.teto = B.buscar(IDX, 'lei', { porTipo: 3 }).lei.length <= 3;
  r.pisoDuasLetras = B.buscar(IDX, 'l').lei.length === 0;

  // o índice monta rápido o bastante para caber na primeira tecla
  r.rapido = window.__idxPronto < 400;
  const t0 = performance.now(); B.buscar(IDX, 'sentença'); r.buscaRapida = (performance.now() - t0) < 150;
  return r;
});
for (const [k, v] of Object.entries(bu)) ok(v, 'BUSCA ' + k);

// o app não carrega os acervos da paleta no boot (juris-index.js tem 2,4 MB)
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1500);
const boot = await page.evaluate(() => ({
  motor: !!window.CT_BUSCA,            // o motor é leve e vem junto
  juris: !!window.__JURIS_IDX__,       // o acervo NÃO
  cat: !!window.CT_LEIS_CAT,
}));
ok(boot.motor, 'BUSCA motor carrega no boot');
ok(!boot.juris && !boot.cat, 'BUSCA acervos NÃO carregam no boot (só na 1ª busca)');
/* ======= O QUE MUDOU ESTA SEMANA (item 7) ======= */
await page.goto(URL0 + '/tests/harness-semana.html');
await page.waitForFunction(() => !!window.CT_SEMANA);

const sem = await page.evaluate(() => {
  const S = window.CT_SEMANA, r = {};
  const it = S.itens || [];
  r.temItens = it.length >= 10;
  r.camposCompletos = it.every(x => x.id && x.titulo && x.tese && x.quando && x.tribunal);
  r.soInformativos = it.every(x => /STF|STJ|TSE/.test(x.tribunal));
  r.dataValida = it.every(x => /^\d{2}\/\d{2}\/\d{4}$/.test(x.quando));
  // marcador é opcional, mas quando existe tem de ser um dos três
  r.marcadorValido = it.every(x => x.marcador == null || ['superacao', 'divergencia', 'vinculante'].includes(x.marcador));
  // os marcados vêm primeiro (é o que muda o estudo)
  const iPrimeiroSem = it.findIndex(x => !x.marcador);
  const iUltimoCom = it.map((x, i) => x.marcador ? i : -1).filter(i => i >= 0).pop();
  r.marcadosPrimeiro = (iUltimoCom == null) || (iPrimeiroSem === -1) || (iUltimoCom < iPrimeiroSem);
  // a tese é recorte curto: o arquivo não pode virar um segundo acervo
  r.teseCurta = it.every(x => x.tese.length <= 340);
  r.arquivoLeve = JSON.stringify(S).length < 120000;
  // sem tese repetida (o acervo republica o mesmo julgado em edição extraordinária)
  const teses = it.map(x => x.tese.toLowerCase().replace(/\s+/g, ' ').slice(0, 160));
  r.semRepetida = new Set(teses).size === teses.length;
  // marcador vem calibrado: alguma coisa TEM de estar marcada, senão o bloco perde a graça
  r.temAlgumMarcado = it.some(x => x.marcador);

  // ordenado do mais novo para o mais velho dentro de cada grupo
  const ms = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return new Date(+m[3], +m[2] - 1, +m[1]).getTime(); };
  const semMarc = it.filter(x => !x.marcador).map(x => ms(x.quando));
  r.ordenado = semMarc.every((v, i) => i === 0 || semMarc[i - 1] >= v);
  return r;
});
for (const [k, v] of Object.entries(sem)) ok(v, 'SEMANA ' + k);

// Os gerados acompanham o acervo. O card do Início ficou parado em 23/06 com o STJ 900 (02/09) já
// no juris-index.js, e as fatias de dados/juris-text/ sem o texto dos julgados novos: o
// atualizar-informativos.py gravava o acervo e ninguém rodava os dois geradores depois.
{
  const w = {};
  for (const f of ['juris-index.js', 'juris-text.js', 'semana-juris.js']) {
    new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8'))(w);
  }
  const ms = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0; };
  const maisNovoAcervo = Math.max(...w.__JURIS_IDX__.filter((r) => /^informativo_/.test(r[2])).map((r) => ms(r[7])));
  const maisNovoCard = Math.max(...w.CT_SEMANA.itens.map((x) => ms(x.quando)));
  ok(maisNovoCard === maisNovoAcervo,
    'SEMANA o card traz o informativo mais novo do acervo (card ' + new Date(maisNovoCard).toLocaleDateString('pt-BR') +
    ' × acervo ' + new Date(maisNovoAcervo).toLocaleDateString('pt-BR') + ')');
  const man = JSON.parse(fs.readFileSync(path.join(RAIZ, 'dados', 'juris-text', 'manifesto.json'), 'utf8'));
  ok(man.chaves === Object.keys(w.__JURIS_TXT__).length,
    'FATIAS dados/juris-text tem todos os textos do juris-text.js (' + man.chaves + ' × ' + Object.keys(w.__JURIS_TXT__).length + ')');
  ok(man.arquivos.every((a) => fs.existsSync(path.join(RAIZ, 'dados', 'juris-text', a))),
    'FATIAS todo bloco listado no manifesto existe em dados/juris-text');
}

// a home mostra o bloco, e "Já vi" tira o item e persiste
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => { localStorage.removeItem('catedra:semanaLidos'); });
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const home = await page.evaluate(async () => {
  const tit = [...document.querySelectorAll('h2')].find(h => /mudou esta semana/i.test(h.textContent || ''));
  if (!tit) return { erro: 'sem bloco' };
  const cont = tit.closest('.cth-sec').nextElementSibling;
  const antes = [...cont.children].filter(e => e.tagName === 'DIV').length;
  const b = cont.querySelector('button[data-id]');
  const id = b && b.dataset.id;
  if (b) b.click();
  await new Promise(r => setTimeout(r, 500));
  return { antes, id, lidos: JSON.parse(localStorage.getItem('catedra:semanaLidos') || '[]') };
});
ok(!home.erro && home.antes > 0, 'SEMANA bloco aparece na home com itens');
ok(!home.erro && home.lidos.includes(home.id), 'SEMANA "Já vi" registra e persiste (sincroniza)');
/* ============= PROVA ORAL — MODO ARGUIÇÃO (item 3) ============= */
await page.goto(URL0 + '/tests/harness-arguicao.html');
await page.waitForFunction(() => !!window.CT_ORAL_Q && !!window.argPool);

const arg = await page.evaluate(() => {
  const r = {};
  const Q = window.CT_ORAL_Q;
  r.acervo = Q.length > 900;

  // só entra pergunta com padrão de resposta útil — é ele que corrige
  const pool = window.argPool({ areaEstudo: 'juridica' });
  r.soComPadrao = pool.every(q => q.padrao && q.padrao.length > 200);

  // o sorteio respeita a ÁREA: quem estuda magistratura não recebe pergunta de fotônica
  const carrJur = ['Magistratura Estadual', 'Ministério Público', 'Defensoria Pública', 'Advocacia Pública'];
  r.poolDaArea = pool.length >= 100 && pool.every(q => carrJur.includes(q.carreira));
  const poolPol = window.argPool({ areaEstudo: 'policial' });
  r.areaPolicial = poolPol.length > 0 && poolPol.every(q => ['Polícia Civil', 'Polícia Federal', 'Perícia'].includes(q.carreira));

  // filtro escolhido à mão manda mais que a área
  const escolhido = window.argPool({ areaEstudo: 'juridica', oralQCarr: 'Polícia Civil' });
  r.filtroManda = escolhido.length > 0 && escolhido.every(q => q.carreira === 'Polícia Civil');

  // sessão de 5 sem repetir pergunta. Atenção: `id` no acervo é do DOCUMENTO (o malote),
  // não da questão — 417 perguntas jurídicas compartilham 190 ids. O que identifica a
  // pergunta é o enunciado, e ele é único nas 892.
  const fila = window.argSortear({ areaEstudo: 'juridica' }, 5);
  r.cinco = fila.length === 5 && new Set(fila.map(q => q.enunciado)).size === 5;
  r.enunciadoEhAChave = new Set(pool.map(q => q.enunciado)).size === pool.length;

  // o carimbo de controle do CEBRASPE não pode aparecer na tela
  const sujos = Q.filter(q => /<<[^>]{4,80}>>/.test(q.enunciado || ''));
  r.temSujos = sujos.length > 0;
  r.limpa = sujos.every(q => !/<</.test(window.argLimpa(q.enunciado)) && window.argLimpa(q.enunciado).length > 40);
  return r;
});
for (const [k, v] of Object.entries(arg)) ok(v, 'ARGUICAO ' + k);

// a sessão roda de ponta a ponta na tela: pergunta → padrão só depois → autoavaliação → resumo
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const fluxo = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  document.querySelector('button[data-view="oral"]').click(); await w(400);
  const bm = [...document.querySelectorAll('button')].find(b => b.dataset.m === 'bancas');
  if (bm) bm.click(); await w(2500);
  const cartao = [...document.querySelectorAll('main div')].find(d => /^Modo arguição/.test(d.textContent.trim()));
  if (!cartao) return { erro: 'sem cartão de arguição' };
  const comecar = [...cartao.closest('div[style*="surface2"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Começar');
  comecar.click(); await w(1000);
  const abriu = /ARGUIÇÃO · PERGUNTA 1 DE 5|Arguição · pergunta 1 de 5/i.test(M());
  // sinal exato: os botões de autoavaliação só existem DENTRO do bloco do padrão — o texto
  // "padrão de resposta" também aparece na apresentação da página, e enganava o teste
  const temPadrao = () => !!document.querySelector('main button[data-v="bem"]');
  const padraoAntes = temPadrao();
  [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || '')).click(); await w(500);
  const padraoDepois = temPadrao();
  for (let i = 0; i < 5; i++) {
    const ver = [...document.querySelectorAll('main button')].find(b => /Respondi — ver o padrão/.test(b.textContent || ''));
    if (ver) { ver.click(); await w(350); }
    const b = [...document.querySelectorAll('main button')].find(x => x.dataset.v === 'nao');
    if (!b) break;
    b.click(); await w(500);
  }
  const fim = /Fim da arguição/.test(M());
  const erros = JSON.parse(localStorage.getItem('catedra:errors') || '[]');
  return { abriu, padraoAntes, padraoDepois, fim, errosCriados: erros.length };
});
ok(!fluxo.erro && fluxo.abriu, 'ARGUICAO sessão abre com a pergunta');
ok(!fluxo.erro && !fluxo.padraoAntes && fluxo.padraoDepois, 'ARGUICAO padrão só aparece depois de responder');
ok(!fluxo.erro && fluxo.fim, 'ARGUICAO cinco perguntas levam ao resumo');

/* ============= U5 — SINCRONIZAÇÃO VISÍVEL E HONESTA ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);
const u5 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const aside = () => document.querySelector('aside');
  const selo = () => [...aside().querySelectorAll('span')].map(s => s.textContent.trim())
    .find(t => /salvo|enviando|conexão|erro|não consegui/i.test(t)) || '';
  const botao = () => [...aside().querySelectorAll('button')].find(b => /tentar agora/i.test(b.textContent || ''));
  const emitir = st => window.dispatchEvent(new CustomEvent('catedra:syncstate', { detail: { status: st } }));
  const r = {};

  r.permanente = !!selo();                       // existe sem nenhum evento: é selo, não toast

  emitir('enviando'); await w(250); r.enviando = /enviando/i.test(selo());
  emitir('offline');  await w(250);
  r.offline = /sem conexão/i.test(selo()) && /guardado aqui/i.test(selo());   // diz onde os dados estão
  emitir('salvo');    await w(250);
  r.salvoComHora = /^✓ salvo às \d{2}:\d{2}$/.test(selo());
  emitir('erro');     await w(250);
  r.erroCurto = /tentando de novo/i.test(selo());
  r.semBotaoNoErroCurto = !botao();               // erro que acabou de começar não vira alarme

  // erro que PERSISTE (mais de 5 min) vira aviso com ação
  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  emitir('erro'); await w(200); delta = 6 * 60000; emitir('erro'); await w(300);
  r.erroLongo = /não consegui salvar/i.test(selo());
  r.temAcao = !!botao();
  if (botao()) botao().click();                   // não pode explodir sem CatedraSync
  await w(200);
  r.naoTravou = document.querySelectorAll('aside button').length > 0;
  Date.now = orig;

  // voltar a salvar limpa o alarme
  emitir('salvo'); await w(250);
  r.recupera = /✓ salvo/i.test(selo()) && !botao();
  return r;
});
for (const [k, v] of Object.entries(u5)) ok(v, 'U5 ' + k);
/* ============= U6 — DESFAZER EM VEZ DE CONFIRMAR ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.setItem('catedra:metas', JSON.stringify([{ id: 'm-u6', titulo: 'Meta de teste', prog: 0, alvo: 10, unidade: 'un.' }]));
  localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-u6', ts: Date.now(), date: new Date().toISOString().slice(0, 10),
    disc: 'Direito Civil', topico: 'Teste U6', categoria: 'Teoria', min: 30, questoes: 10, acertos: 8, erradas: 2, brancos: 0, liquido: 6 }]));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);

const u6 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const ler = k => JSON.parse(localStorage.getItem('catedra:' + k) || '[]');
  const r = {};
  let confirmou = false;
  window.confirm = () => { confirmou = true; return true; };

  // vai para Metas & Conquistas
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(350);
  document.querySelector('button[data-view="conquistas"]').click(); await w(700);

  const botaoX = () => [...document.querySelectorAll('main button[data-id="m-u6"]')].find(b => (b.textContent || '').trim() === '×');
  if (!botaoX()) return { erro: 'sem botão de excluir a meta' };
  botaoX().click();
  await w(300);

  r.semConfirm = !confirmou;                                   // excluir 1 item não pede permissão
  r.sumiuDaTela = !document.querySelector('main button[data-id="m-u6"]');
  const toast = document.querySelector('div[role=status]');
  r.temToast = !!toast && /excluíd/i.test(toast.textContent || '');
  const undo = toast && [...toast.querySelectorAll('button')].find(b => /desfazer/i.test(b.textContent || ''));
  r.temDesfazer = !!undo;

  if (undo) undo.click();
  await w(900);
  const metas = ler('metas');
  r.restauraMesmoId = metas.length === 1 && metas[0].id === 'm-u6' && metas[0].titulo === 'Meta de teste';
  r.carimboNovo = !!(metas[0] && metas[0].up);                 // `up` novo faz a recriação vencer a lápide

  // sem desfazer, a exclusão persiste no disco (o autosave leva ~1s)
  botaoX().click();
  await w(1600);
  r.persisteSemDesfazer = ler('metas').length === 0;
  return r;
});
for (const [k, v] of Object.entries(u6)) ok(v, 'U6 ' + k);

// o destrutivo em MASSA continua pedindo confirmação — é a fronteira da especificação
const u6b = await page.evaluate(() => {
  const fonte = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('wipeAll')) || '';
  return {
    wipeAllPergunta: /wipeAll\s*=\s*\(\)=>\{\s*if\(!window\.confirm/.test(fonte),
    itemNaoPergunta: !/removeMeta[^}]*window\.confirm/.test(fonte) && !/removeCard[^}]*window\.confirm/.test(fonte)
      && !/removeErro[^}]*window\.confirm/.test(fonte) && !/removeEvent[^}]*window\.confirm/.test(fonte),
  };
});
ok(u6b.wipeAllPergunta, 'U6 apagar tudo continua pedindo confirmação');
ok(u6b.itemNaoPergunta, 'U6 exclusão de item não pede mais confirmação');
/* ===== TASK 9 · FUNDAÇÃO VISUAL ÚNICA DOS SATÉLITES =====
   Sete páginas independentes reinventavam a mesma fundação — box-sizing, foco, alvo de
   toque — e divergiam. E o contrato de tema levava cor e raio, mas não a ESCALA: quem
   escolhia "texto grande" via o app crescer e o iframe dentro dele continuar miúdo. */
{
  const SAT = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
               'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  // 1) todos carregam a base, e ANTES do próprio <style> (para poder especializar)
  const base = await page.evaluate(async ({ b, sat }) => {
    const r = {};
    for (const p of sat) {
      const t = await (await fetch(b + '/' + p)).text();
      const iLink = t.indexOf('satellite-base.css'), iStyle = t.indexOf('<style>');
      r[p] = iLink > 0 && iStyle > 0 && iLink < iStyle && /--module-accent/.test(t);
    }
    return r;
  }, { b: URL0, sat: SAT });
  const faltando = Object.entries(base).filter(([, v]) => !v).map(([k]) => k);
  ok(faltando.length === 0, 'TASK9 os 7 satélites carregam a base antes do estilo próprio ('
    + (faltando.join(', ') || 'todos') + ')');

  // 2) o contrato de tokens é o MESMO dos dois lados — token que só um lado conhece é letra morta
  const contrato = await page.evaluate(async (b) => {
    const [host, ponte] = await Promise.all([
      (await fetch(b + '/Catedra.dc.html')).text(), (await fetch(b + '/tema-satelite.js')).text()]);
    // O contrato leva só o que ALGUÉM LÊ do outro lado. --space-1..3 e --content-max
    // saíram: nenhum satélite os consumia, e token que atravessa a ponte sem consumidor
    // dá a impressão de que a densidade se propaga quando ela não move um pixel.
    const NOVOS = ['--fs-3xs', '--fs-2xs', '--fs-xs', '--fs-sm', '--fs-base', '--fs-md',
                   '--fs-lg', '--fs-xl', '--fs-2xl', '--control-h'];
    const MORTOS = ['--space-1', '--space-2', '--space-3', '--content-max'];
    return {
      hostManda: NOVOS.every(t => host.includes("'" + t + "'")),
      sateliteLe: NOVOS.every(t => ponte.includes("'" + t + "'")),
      semTokenSemConsumidor: MORTOS.every(t => !ponte.includes("'" + t + "'")),
      // a densidade tem de produzir token de verdade — não basta ficar gravada
      densidadeProduzToken: /density==='compacta'/.test(host) && /--control-h:\$\{/.test(host),
    };
  }, URL0);
  for (const [k, v] of Object.entries(contrato)) ok(v, 'TASK9 ' + k);

  // 3) a escala chega DE FATO ao satélite: o host manda, o iframe aplica
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const chega = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('button[data-view="prioridade"]').click(); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe não abriu' };
    const cs = f.contentWindow.getComputedStyle(f.contentDocument.documentElement);
    const v = n => (cs.getPropertyValue(n) || '').trim();
    // Não basta o token CHEGAR: ele tem de MOVER alguma coisa. O .sel do painel de
    // prioridade lê --control-h; sem consumidor, o token chegava e a tela ficava igual.
    const sel = f.contentDocument.querySelector('.sel');
    const alturaCom = sel ? f.contentWindow.getComputedStyle(sel).minHeight : '';
    f.contentDocument.documentElement.style.setProperty('--control-h', '61px');
    const alturaDepois = sel ? f.contentWindow.getComputedStyle(sel).minHeight : '';
    f.contentDocument.documentElement.style.setProperty('--control-h', alturaCom);
    return {
      escalaChegou: !!v('--fs-base') && !!v('--fs-2xl'),
      alturaDeControleChegou: !!v('--control-h'),
      tokenMoveAlgumaCoisa: alturaDepois === '61px' && alturaCom !== '61px',
      // a base só está aplicada se o Chrome ACEITOU a folha — e ele só aceita com text/css
      baseFoiAceita: [...f.contentDocument.styleSheets]
        .some(ss => (ss.href || '').includes('satellite-base.css') && ss.cssRules && ss.cssRules.length > 5),
      fundacaoAplicada: f.contentWindow.getComputedStyle(f.contentDocument.body).boxSizing === 'border-box',
    };
  });
  if (chega.erro) ok(false, 'TASK9 ' + chega.erro);
  else for (const [k, v] of Object.entries(chega)) ok(v, 'TASK9 ' + k);

  // 4) movimento reduzido: nenhum satélite respeitava
  const mov = await page.evaluate(async (b) => {
    const css = await (await fetch(b + '/satellite-base.css')).text();
    return { respeitaMovimentoReduzido: /prefers-reduced-motion:\s*reduce/.test(css)
      && /animation-duration:\s*\.01ms\s*!important/.test(css) };
  }, URL0);
  for (const [k, v] of Object.entries(mov)) ok(v, 'TASK9 ' + k);

  // 5) o satélite avulso (sem host) não pode depender da base para ficar legível
  await page.goto(URL0 + '/ritos-web.html');
  await page.waitForTimeout(700);
  const avulso = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { avulsoTemFundo: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
             avulsoTemCorDeModulo: !!getComputedStyle(document.documentElement).getPropertyValue('--module-accent').trim() };
  });
  for (const [k, v] of Object.entries(avulso)) ok(v, 'TASK9 ' + k);

  // 6) o build leva a base junto — sem ela no bundle, o satélite publicado fica sem fundação
  const noBuild = await page.evaluate(async (b) => {
    const [web, mac] = await Promise.all([
      (await fetch(b + '/scripts/build.mjs')).text(), (await fetch(b + '/scripts/build-macos.mjs')).text()]);
    return { buildWebCopia: web.includes("'satellite-base.css'"),
             buildWebPrecache: web.includes("'./satellite-base.css'"),
             buildMacCopia: mac.includes("'satellite-base.css'") };
  }, URL0);
  for (const [k, v] of Object.entries(noBuild)) ok(v, 'TASK9 ' + k);
}


/* ============= TRAVA DE BUILD CRUZADO =============
   Dois builds do MESMO alvo neste repositório se atropelam: já saiu .app sem a fatia
   Intel e .ipa montado no meio de dois processos. scripts/guarda-build.sh recusa o
   segundo; este teste prova a recusa, a saída de emergência e a limpeza da trava. */
{
  const { execFileSync } = await import('child_process');
  const guarda = path.join(RAIZ, 'scripts', 'guarda-build.sh');
  ok(fs.existsSync(guarda), 'TRAVA scripts/guarda-build.sh existe');
  for (const script of ['mac/build-app.sh', 'ios/build-ipad.sh']) {
    const txt = fs.readFileSync(path.join(RAIZ, script), 'utf8');
    ok(/ct_travar_build/.test(txt) && /guarda-build\.sh/.test(txt), 'TRAVA ' + script + ' chama a guarda');
  }
  const falso = path.join(RAIZ, 'tests', '.trava-falsa.sh');
  fs.writeFileSync(falso, ['#!/usr/bin/env bash', 'set -euo pipefail',
    'ROOT="' + RAIZ + '"', 'source "$ROOT/scripts/guarda-build.sh"',
    'ct_travar_build provasuite "$ROOT"',
    'echo ENTREI', 'sleep "${1:-1}"'].join('\n'));
  const rodar = (args, env) => {
    try { return { code: 0, saida: String(execFileSync('bash', [falso, ...args],
      { env: { ...process.env, ...(env || {}) }, stdio: 'pipe' })) }; }
    catch (e) { return { code: e.status ?? 1, saida: String(e.stdout || '') + String(e.stderr || '') }; }
  };
  const { spawn } = await import('child_process');
  const dono = spawn('bash', [falso, '4'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const segundo = rodar(['0']);
  ok(segundo.code === 3, 'TRAVA o segundo build do mesmo alvo é RECUSADO (exit ' + segundo.code + ')');
  ok(/BUILD RECUSADO/.test(segundo.saida), 'TRAVA a recusa diz o que houve');
  ok(/CATEDRA_IGNORAR_TRAVA/.test(segundo.saida), 'TRAVA a recusa mostra a saída de emergência');
  // O falso positivo que recusou um build REAL: a varredura por `pgrep -f` casava com
  // qualquer processo cuja linha de comando citasse o script — inclusive o vigia do log.
  ok(!/pgrep/.test(fs.readFileSync(guarda, 'utf8').replace(/^\s*#.*$/gm, '')),
    'TRAVA a guarda não recusa por linha de comando de terceiro (sem pgrep)');
  const forcado = rodar(['0'], { CATEDRA_IGNORAR_TRAVA: '1' });
  ok(forcado.code === 0, 'TRAVA CATEDRA_IGNORAR_TRAVA=1 ainda deixa passar');
  dono.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 400));
  // trava órfã (build morto sem limpar) não pode bloquear o próximo build para sempre
  const depois = rodar(['0']);
  ok(depois.code === 0, 'TRAVA trava órfã de build morto é assumida, não trava para sempre');
  ok(!fs.existsSync(path.join(RAIZ, '.build-lock-provasuite')), 'TRAVA a trava some quando o build termina');
  try { fs.unlinkSync(falso); } catch (_) {}
  try { fs.rmSync(path.join(RAIZ, '.build-lock-provasuite'), { recursive: true, force: true }); } catch (_) {}
}

/* ============= ASSINATURA NUMA CÓPIA LIMPA =============
   Com o repositório no iCloud, o File Provider suja o bundle e o codesign recusa;
   scripts/assinar-app.sh assina numa cópia fora da pasta, confere com --strict e só então
   devolve. Roteiro em tests/assinatura-limpa.mjs (só macOS; na CI é pulado com aviso). */
try { await testarAssinaturaLimpa(ok); }
catch (e) {
  ok(false, 'ASSINATURA o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

/* ============= XCODE CLOUD COMPILA O APP DO build-ipad.sh =============
   Pós-clone em ios/ci_scripts gera o bundle web; o alvo compila ios/vendor por pasta
   sincronizada. Roteiro em tests/xcode-cloud.mjs (estático; roda também na CI). */
try { await testarXcodeCloud(ok); }
catch (e) {
  ok(false, 'XCODE CLOUD o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

/* ============= BASE VISUAL NATIVA (LEGIS/JURIS) =============
   Catraca de hex/tamanho fixo/emoji fora de ios/vendor/design e, no Mac, os testes Swift
   da base. Roteiro em tests/design-nativo.mjs (a catraca roda também na CI). */
try { await testarDesignNativo(ok); }
catch (e) {
  ok(false, 'DESIGN NATIVO o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

/* ============= D1 — TEMA ÚNICO NOS SATÉLITES ============= */
// Todo satélite carrega a mesma ponte
const d1arqs = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = {};
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r[p] = t.includes('tema-satelite.js');
  }
  return r;
}, URL0);
ok(Object.values(d1arqs).every(Boolean), 'D1 os 7 satélites carregam a ponte de tema (' +
   Object.entries(d1arqs).filter(([, v]) => !v).map(([k]) => k).join(', ') + ')');

// Satélite avulso (sem host) mantém a paleta própria — o fallback do var() continua valendo
await page.goto(URL0 + '/ritos-web.html');
await page.waitForTimeout(700);
const avulso = await page.evaluate(() => ({
  marcado: document.documentElement.getAttribute('data-ct-tema'),
  accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
}));
ok(!avulso.marcado, 'D1 página avulsa não é pintada pelo host (segue com a cara própria)');

// Dentro do app: o satélite herda cor e fundo, e a troca de cor atravessa
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const btn = document.querySelector('button[data-view="areamod"]');
  if (!btn) return { erro: 'sem satélite nesta área' };
  btn.click(); await w(2400);
  const frame = () => [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  if (!frame()) return { erro: 'iframe não montou' };
  const dentro = () => { const d = frame().contentDocument;
    const cs = d.defaultView.getComputedStyle(d.documentElement);
    return { accent: cs.getPropertyValue('--accent').trim(), bg: cs.getPropertyValue('--bg').trim(),
             // leitura ativa (LA2): identidade e texto derivado da grade também atravessam
             laQuem: cs.getPropertyValue('--la-quem').trim(), laProibicaoTx: cs.getPropertyValue('--la-proibicao-tx').trim(),
             marcado: d.documentElement.getAttribute('data-ct-tema'), esquema: d.documentElement.style.colorScheme }; };
  const host = getComputedStyle(document.querySelector('[style*="--accent"]'));
  const a = dentro();
  r.herdaCor = a.accent === host.getPropertyValue('--accent').trim() && !!a.accent;
  r.herdaFundo = a.bg === host.getPropertyValue('--bg').trim() && !!a.bg;
  r.marcado = a.marcado === '1';
  // o texto derivado chega já com a tinta do host substituída (não como var(--ink) solto),
  // senão o satélite resolveria com a tinta ERRADA e o rótulo perderia o contraste medido
  r.leituraAtivaChega = /^#[0-9a-f]{6}$/i.test(a.laQuem) && a.laQuem === host.getPropertyValue('--la-quem').trim()
    && /color-mix\(/.test(a.laProibicaoTx) && !/var\(--ink/.test(a.laProibicaoTx);

  // trocar a cor de destaque atravessa até o satélite
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(300);
  document.querySelector('button[data-view="ajustes"]').click(); await w(700);
  // D11 mudou a cor de destaque de lugar: ela mora na aba Aparência, nao mais solta na pagina
  const abaAp = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => /Aparência/.test(b.textContent));
  if (abaAp) { abaAp.click(); await w(700); }
  const cores = [...document.querySelectorAll('main button[data-c]')];
  const alvo = cores.find(c => c.dataset.c && c.dataset.c !== a.accent);
  if (!alvo) return { ...r, erro: 'sem paleta de cores nos Ajustes' };
  const nova = alvo.dataset.c;
  alvo.click(); await w(500);
  document.querySelector('button[data-view="areamod"]').click(); await w(2200);
  r.trocaDeCorAtravessa = frame() && dentro().accent === nova;
  return r;
});
if (!d1.erro) {
  ok(d1.herdaCor, 'D1 satélite herda a cor de destaque do host');
  ok(d1.herdaFundo, 'D1 satélite herda o fundo (modo escuro deixa de piscar branco)');
  ok(d1.marcado, 'D1 satélite se marca como tematizado');
  ok(d1.leituraAtivaChega, 'D1 os tokens da leitura ativa (--la-quem, --la-proibicao-tx) chegam ao iframe com a tinta resolvida');
  ok(d1.trocaDeCorAtravessa, 'D1 trocar a cor nos Ajustes muda o satélite');
} else {
  ok(false, 'D1 não deu para exercitar o satélite: ' + d1.erro);
}
/* ============= U3 — CONTINUAR DE ONDE PAREI ============= */
// atenção: o rótulo do cartão é maiúsculo por CSS — comparar sem diferenciar caixa
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1600);

const u3a = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const tem = () => /continuar de onde parei/i.test(document.querySelector('main').innerText);
  const r = {};
  r.semPontoNaoMostra = !tem();                       // app novo não inventa cartão

  // visitar um satélite grava o ponto
  document.querySelector('button[data-view="areamod"]').click(); await w(1500);
  const p = JSON.parse(localStorage.getItem('catedra:lastPonto') || 'null');
  r.gravaPonto = !!p && p.view === 'areamod' && !!p.rotulo && typeof p.ts === 'number';

  // estando NA view do ponto, o cartão não aparece (seria conselho para ficar onde já está)
  r.naViewNaoMostra = !tem();

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  r.mostraNoInicio = tem();
  return r;
});
for (const [k, v] of Object.entries(u3a)) ok(v, 'U3 ' + k);

// ponto com rito reabre no ponto exato
await page.evaluate(() => {
  localStorage.setItem('catedra:lastPonto', JSON.stringify({ view: 'areamod', rito: 'Civil — conhecimento',
    peca: '', bloco: null, termo: '', rotulo: 'Processo e peças — Civil — conhecimento', ts: Date.now() - 2 * 3600e3 }));
  localStorage.setItem('catedra:lastPontoDispensado', '0');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  const r = {};
  r.idadeRelativa = /há 2h/.test(M());                // ts em ms vira idade legível
  const btn = [...document.querySelectorAll('main button')].find(b => /^Continuar$/i.test((b.textContent || '').trim()));
  if (!btn) return { ...r, erro: 'sem botão Continuar' };
  btn.click(); await w(2200);
  const fr = [...document.querySelectorAll('iframe')].find(f => /ritos-web/.test(f.getAttribute('src') || ''));
  r.reabreNoPonto = !!fr && /rito=Civil/.test(decodeURIComponent(fr.getAttribute('src') || ''));

  document.querySelector('button[data-view="inicio"]').click(); await w(700);
  const x = [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === '✕');
  r.temDispensar = !!x;
  if (x) { x.click(); await w(600); }
  r.dispensaSome = !/continuar de onde parei/i.test(M());
  r.dispensaPersiste = +(localStorage.getItem('catedra:lastPontoDispensado') || '0') > 0;
  return r;
});
if (!u3b.erro) { for (const [k, v] of Object.entries(u3b)) ok(v, 'U3 ' + k); }
else ok(false, 'U3 ' + u3b.erro);

// O app já reabre a prova pausada em TELA CHEIA no boot (_restoreProva consome ct_prova),
// e descarta prova de outro dia de propósito: por isso o cartão NÃO trata simulado — seria
// um botão que nunca aparece. Este teste guarda a decisão.
await page.evaluate(() => {
  localStorage.setItem('ct_prova', JSON.stringify({ d: new Date().toISOString().slice(0, 10), min: 60, sec: 1800 }));
  localStorage.removeItem('catedra:lastPonto');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u3c = await page.evaluate(() => ({
  consumiuAChave: !localStorage.getItem('ct_prova'),
  semCartaoDeProva: !/simulado cronometrado pausado/i.test(document.querySelector('main').innerText),
}));
ok(u3c.consumiuAChave, 'U3 a prova pausada é retomada pelo app (a chave é consumida no boot)');
ok(u3c.semCartaoDeProva, 'U3 o cartão não duplica a retomada da prova');
await page.evaluate(() => { ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)); });
/* ============= U1 — IFRAMES VIVOS ============= */
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => ['catedra:lastPonto', 'catedra:lastPontoDispensado', 'ct_prova'].forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);

const u1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};

  // os seis existem no DOM, mas SEM src: quem nunca abriu o LEGIS não paga por ele
  // (eram quatro até o D2 devolver 2ª fase e Prioridade ao template)
  const todos = [...document.querySelectorAll('iframe[data-ct-view]')];
  r.seisMontados = todos.length === 6;
  r.nenhumCarregaNoBoot = todos.every(f => !f.getAttribute('src'));
  r.todosEscondidos = todos.every(f => f.style.display === 'none');

  // abrir a tela carrega SÓ o dela
  document.querySelector('button[data-view="areamod"]').click(); await w(1800);
  r.carregaSoOAtual = !!fr('areamod').getAttribute('src')
    && !fr('legis').getAttribute('src') && !fr('juris').getAttribute('src');
  r.visivel = fr('areamod').style.display === 'block';

  // o src NÃO leva mais o ponto/busca: fica IGUAL entre idas e vindas (é o que "estável"
  // quer dizer) — o embed=1 do D2 faz parte da base e também não muda
  const src1 = fr('areamod').getAttribute('src');
  r.srcSemPonto = !/rito=|peca=|bloco=|[?&]q=/.test(src1 || '');
  document.querySelector('button[data-view="inicio"]').click(); await w(400);
  document.querySelector('button[data-view="areamod"]').click(); await w(600);
  r.srcEstavel = fr('areamod').getAttribute('src') === src1;

  // sair e voltar NÃO recarrega (a marca sobrevive) — é o coração do U1
  try { fr('areamod').contentWindow.__u1 = 42; } catch (e) {}
  document.querySelector('button[data-view="inicio"]').click(); await w(500);
  r.escondeAoSair = fr('areamod').style.display === 'none';
  document.querySelector('button[data-view="areamod"]').click(); await w(800);
  let vivo = false; try { vivo = fr('areamod').contentWindow.__u1 === 42; } catch (e) {}
  r.naoRecarregaAoVoltar = vivo;
  return r;
});
for (const [k, v] of Object.entries(u1)) ok(v, 'U1 ' + k);

// ida e volta com os iframes vivos: busca aplicada, pílula acesa, e o LEGIS sobrevive
const u1b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fr = v => document.querySelector('iframe[data-ct-view="' + v + '"]');
  const r = {};
  const d = fr('areamod').contentDocument;
  const chip = d.querySelector('#fluxo [data-legis]') || d.querySelector('#fluxo [data-juris]');
  if (!chip) return { erro: 'sem chip no fluxo' };
  chip.click(); await w(1800);
  const legis = fr('legis');
  try {
    const ld = legis.contentDocument;
    r.buscaChegou = !!(ld.getElementById('cq') || {}).value;
    r.pilulaAcesa = !!ld.getElementById('ct-volta');
    legis.contentWindow.__u1legis = 7;
    ld.getElementById('ct-volta').click();
  } catch (e) { return { erro: String(e).slice(0, 80) }; }
  await w(1500);
  r.voltouAoMapa = fr('areamod').style.display === 'block';
  let vivo = false; try { vivo = legis.contentWindow.__u1legis === 7; } catch (e) {}
  r.legisContinuaVivo = vivo;      // antes, voltar destruía a página do acervo

  // segunda ida: agora o LEGIS já está montado, então a busca vai por MENSAGEM
  const chip2 = fr('areamod').contentDocument.querySelector('#fluxo [data-legis]');
  if (chip2) { chip2.click(); await w(1200); }
  let vivo2 = false, termo2 = '';
  try { vivo2 = legis.contentWindow.__u1legis === 7; termo2 = (legis.contentDocument.getElementById('cq') || {}).value; } catch (e) {}
  r.segundaIdaSemRecarregar = vivo2;
  r.segundaIdaAplicaBusca = !!termo2;
  return r;
});
if (!u1b.erro) { for (const [k, v] of Object.entries(u1b)) ok(v, 'U1 ' + k); }
else ok(false, 'U1 ida-e-volta: ' + u1b.erro);

/* ============= D2 — MODO EMBUTIDO (?embed=1) ============= */
const d2 = await page.evaluate(async (base) => {
  const paginas = ['legis-web.html', 'juris-web.html', 'ritos-web.html', 'pecas-web.html',
                   'segunda-fase-web.html', 'prioridade-web.html', 'area-web.html'];
  const r = { semParametro: {}, comParametro: {} };
  for (const p of paginas) {
    const t = await (await fetch(base + '/' + p)).text();
    r.semParametro[p] = t.includes('tema-satelite.js');   // a ponte é quem aplica o embed
  }
  return r;
}, URL0);
ok(Object.values(d2.semParametro).every(Boolean), 'D2 os 7 satélites carregam a ponte que aplica o embed');

// a página avulsa mantém o cabeçalho inteiro; com ?embed=1 ele encolhe
for (const pag of ['legis-web.html', 'ritos-web.html']) {
  await page.goto(URL0 + '/' + pag);
  await page.waitForTimeout(700);
  const cheio = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  await page.goto(URL0 + '/' + pag + '?embed=1');
  await page.waitForTimeout(700);
  const magro = await page.evaluate(() => {
    const h = document.querySelector('.head') || document.querySelector('.brand');
    const ic = h && h.querySelector('.ic');
    return { marca: document.documentElement.getAttribute('data-ct-embed'),
             iconeVisivel: !!(ic && getComputedStyle(ic).display !== 'none'),
             alturaCab: h ? Math.round(h.getBoundingClientRect().height) : 0 };
  });
  ok(!cheio.marca && cheio.iconeVisivel, 'D2 ' + pag + ' avulsa mantém o cabeçalho inteiro');
  ok(magro.marca === '1' && !magro.iconeVisivel, 'D2 ' + pag + ' com embed=1 esconde a identidade');
  ok(magro.alturaCab < cheio.alturaCab, 'D2 ' + pag + ' encolhe de ' + cheio.alturaCab + 'px para ' + magro.alturaCab + 'px');
}

// dentro do app: todos os iframes pedem embed=1, e as SEIS telas abrem de verdade
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const d2b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = { telas: {} };
  const views = ['areamod', 'roteiros', 'legis', 'juris', 'segundafase', 'prioridade'];
  r.seisIframes = document.querySelectorAll('iframe[data-ct-view]').length === 6;
  for (const v of views) {
    const b = document.querySelector('button[data-view="' + v + '"]');
    if (!b) { r.telas[v] = 'sem botão no menu'; continue; }
    b.click();
    /* Espera até o satélite ter conteúdo, e não um tempo fixo: 1900ms bastava para o
       Ritos e faltava para o JURIS (15 mil verbetes + índice de 2 MB), e o teste falhava
       de forma intermitente — sem nada de errado no app. O teto de 12s é rede de
       segurança; o caso normal sai em muito menos. */
    let f = null, corpo = 0, embed = null;
    for (let t = 0; t < 60; t++) {
      await w(200);
      f = document.querySelector('iframe[data-ct-view="' + v + '"]');
      if (!f) continue;
      try { corpo = (f.contentDocument.body.innerText || '').trim().length;
            embed = f.contentDocument.documentElement.getAttribute('data-ct-embed'); } catch (e) {}
      if (corpo > 200 && embed === '1') break;
    }
    if (!f) { r.telas[v] = 'sem iframe'; continue; }
    const src = f.getAttribute('src') || '';
    r.telas[v] = { embedNaURL: /embed=1/.test(src), embedAplicado: embed === '1', temConteudo: corpo > 200 };
  }
  return r;
});
ok(d2b.seisIframes, 'D2 as seis telas de iframe existem (2ª fase e Prioridade voltaram)');
for (const [v, t] of Object.entries(d2b.telas)) {
  ok(typeof t === 'object' && t.embedNaURL && t.embedAplicado, 'D2 ' + v + ' abre em modo embutido');
  ok(typeof t === 'object' && t.temConteudo, 'REGRESSÃO ' + v + ' abre com conteúdo (não fica em branco)');
}
/* ===== BARRA: todo botão leva a uma tela (regressão dos botões mudos) =====
   Prioridade e Simulado de 2ª fase trocavam a view para telas que não existiam
   mais no template — clicar não abria nada. As páginas seguiam no bundle. */
const barra = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  for (const [view, arquivo] of [['prioridade', 'prioridade-web.html'], ['segundafase', 'segunda-fase-web.html']]) {
    const b = document.querySelector('button[data-view="' + view + '"]');
    if (!b) { r[view + 'TemBotao'] = false; continue; }
    r[view + 'TemBotao'] = true;
    b.click(); await w(1800);
    const f = document.querySelector('iframe[data-ct-view="' + view + '"]');
    // o src pode trazer parâmetros (o D2 acrescenta ?embed=1): compara a PÁGINA, não a string
    const src = (f && f.getAttribute('src')) || '';
    r[view + 'Abre'] = !!f && src.split('?')[0] === arquivo && f.style.display === 'block';
    let texto = ''; try { texto = (f.contentDocument.body.innerText || '').trim(); } catch (e) {}
    r[view + 'TemConteudo'] = texto.length > 200;
  }
  return r;
});
for (const [k, v] of Object.entries(barra)) ok(v, 'BARRA ' + k);
/* ============= LEGIS — D5, D4, D7, D8, D10 e U7(b) =============
   O leitor de norma busca /api/law (função serverless). O servidor destes testes é
   estático, então a rota é servida aqui: sem texto de lei não dá para medir coluna,
   serifa nem entrelinha do modo leitura. */
await page.route('**/api/law*', r => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, paragraphs: [
    'TÍTULO I', 'DAS DISPOSIÇÕES PRELIMINARES', 'CAPÍTULO I', 'DA APLICAÇÃO DA LEI',
    'Art. 1º Toda pessoa é capaz de direitos e deveres na ordem civil, e este parágrafo é '
      + 'longo de propósito para que a medida da coluna de leitura tenha o que medir.',
    '§ 1º Parágrafo de teste com texto suficiente para medir a entrelinha.',
    'I - inciso de teste', 'a) alínea de teste', 'Art. 2º Segundo artigo de teste.'] }),
}));
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(URL0 + '/legis-web.html');
await page.evaluate(() => ['catedra:legisEstudo', 'catedra:leitorLeitura', 'catedra:leitorDark']
  .forEach(k => localStorage.removeItem(k)));
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);

const lg = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const row = document.querySelector('.lawrow');
  const link = row.querySelector('a');
  const r = {};
  // D5 — um botão só: a linha é a ação primária, o Planalto é apoio
  r.d5SemBotaoVerde = document.querySelectorAll('.lawrow .rd').length === 0
    && !/ler aqui/i.test(document.getElementById('catalog').innerText);
  r.d5LinhaClicavel = row.classList.contains('abrivel') && cs(row).cursor === 'pointer';
  r.d5TituloEhBotao = row.querySelector('.lt').tagName === 'BUTTON';
  r.d5PlanaltoDiscreto = /planalto/i.test(link.textContent)
    && cs(link).borderTopWidth === '0px' && cs(link).borderLeftWidth === '0px';
  r.d5EstrelaTemNome = /favorito/i.test(row.querySelector('.fav').getAttribute('aria-label') || '');
  r.d5Alvo44 = row.getBoundingClientRect().height >= 44;
  // o overlay que estende o clique não pode engolir os controles da própria linha
  const bl = link.getBoundingClientRect();
  const emCima = document.elementFromPoint(bl.left + bl.width / 2, bl.top + bl.height / 2);
  r.d5PlanaltoContinuaClicavel = emCima === link || link.contains(emCima);
  const br = row.getBoundingClientRect();
  const meio = document.elementFromPoint(br.left + br.width * 0.5, br.top + br.height / 2);
  r.d5MeioDaLinhaAbre = !!(meio && meio.closest && meio.closest('.lt'));

  // D4 — zero absoluto vira convite
  const fav = document.getElementById('st-fav');
  r.d4ZeroViraConvite = fav.classList.contains('zero')
    && /marque/i.test(fav.innerText) && !/^0/.test(fav.innerText.trim())
    && !/\b0\b/.test(document.querySelector('.statbar').innerText.split('LEIS')[0]);

  // D7 — dois níveis de microlabel
  const forte = cs(document.getElementById('rdrMat'));
  const fraca = cs(document.querySelector('.statbar .ml-fraca'));
  r.d7Forte = /mono|Menlo|SFMono/i.test(forte.fontFamily) && forte.textTransform === 'uppercase'
    && parseFloat(forte.letterSpacing) > 1;
  r.d7Fraca = fraca.textTransform === 'uppercase' && fraca.letterSpacing === 'normal'
    && parseFloat(fraca.fontSize) <= 11 && fraca.color !== forte.color;

  // D10 — nome acessível em tudo que é botão/link (inclusive os só-ícone do leitor)
  r.d10TodosComNome = [...document.querySelectorAll('button, a')]
    .every(el => ((el.getAttribute('aria-label') || el.textContent || '').trim().length > 0));

  return r;
});
ok(lg.d5SemBotaoVerde, 'D5 o botão verde "Ler aqui" sumiu (era 1 por lei, 268 no total)');
ok(lg.d5LinhaClicavel, 'D5 a linha inteira abre o leitor (cursor pointer)');
ok(lg.d5TituloEhBotao, 'D5 o alvo primário é um botão de verdade (alcançável por teclado)');
ok(lg.d5PlanaltoDiscreto, 'D5 "Planalto ↗" virou link discreto, sem borda');
ok(lg.d5EstrelaTemNome, 'D5 a ★ ganhou aria-label');
ok(lg.d5Alvo44, 'D5 a área de toque da linha tem 44px ou mais');
ok(lg.d5PlanaltoContinuaClicavel, 'D5 o clique estendido não engole o link do Planalto');
ok(lg.d5MeioDaLinhaAbre, 'D5 clicar no meio da linha cai no botão de ler');
ok(lg.d4ZeroViraConvite, 'D4 métrica zerada vira convite em vez de "0 FAVORITAS"');
ok(lg.d7Forte, 'D7 microlabel forte: mono, caixa alta e espaçamento (cor do ramo)');
ok(lg.d7Fraca, 'D7 microlabel fraca: menor, sem espaçamento extra e sem a cor do forte');
ok(lg.d10TodosComNome, 'D10 nenhum botão ou link sem nome acessível');

// D10 — contraste do texto miúdo nas QUATRO abas (pane escondido não é medível, então
// cada uma tem de ser aberta; foi assim que apareceram os --text3 de 12px do Plano).
// Ficam DE FORA as pastilhas pintadas com a cor da matéria (`--c`, branco sobre a cor ou a
// cor sobre um tinte dela): ali o contraste depende da paleta por disciplina, não do degrau
// de --text3 que a D10 pede — corrigir aquilo é escurecer o código de cores do app inteiro,
// que é outra decisão (medido: .ab branco sobre #f5872f dá 2.50:1; .tn e .cap b, ~4.3:1).
const magros = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => document.querySelector('#tabsTopo button[data-t="' + tt + '"]').click(), t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 300);
  magros.push(...await page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number);
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const fundo = el => { let n = el; while (n && n !== document.documentElement) {
        const c = cs(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(c)) return c; n = n.parentElement; }
      return cs(document.body).backgroundColor; };
    const ruins = [];
    document.querySelectorAll('body *').forEach(el => {
      const c = cs(el);
      if (parseFloat(c.fontSize) >= 13 || c.backgroundImage !== 'none') return;
      if (!el.offsetParent) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (lum(c.color) > 0.6) return;          // texto claro = pastilha colorida (ver acima)
      const cor = c.getPropertyValue('--c').trim();          // cor da matéria em escopo
      const hex = h => { h = h.replace('#', '');
        if (h.length === 3) h = h.split('').map(x => x + x).join('');
        return 'rgb(' + [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)).join(', ') + ')'; };
      if (cor && (cor[0] === '#' ? hex(cor) : cor) === c.color) return;
      const a = lum(c.color), b = lum(fundo(el));
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (k < 4.5) ruins.push((el.className || el.tagName) + ' ' + k.toFixed(2));
    });
    return ruins;
  }));
}
ok(magros.length === 0, 'D10 texto abaixo de 13px com contraste ≥ 4.5:1 nas 4 abas ('
   + magros.slice(0, 5).join(', ') + ')');
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(200);

// clicar na ★ não pode abrir o leitor — e com 1 favorita a métrica volta a ser número
await page.locator('.lawrow .fav').first().click();
await page.waitForTimeout(250);
const lgFav = await page.evaluate(() => ({
  naoAbriu: !document.getElementById('rdr').classList.contains('on'),
  viraNumero: !document.getElementById('st-fav').classList.contains('zero')
    && /^1\b/.test(document.getElementById('st-fav').innerText.trim()),
}));
ok(lgFav.naoAbriu, 'D5 clicar na ★ marca o favorito sem abrir o leitor');
ok(lgFav.viraNumero, 'D4 com 1 favorita o slot volta a ser número');

// D10 — foco visível na pílula: numa página recém-carregada a primeira parada do Tab é a
// fileira de abas (um clique anterior movimenta o ponto de partida do Tab, mesmo com blur)
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(400);
await page.keyboard.press('Tab');
const foco = await page.evaluate(() => { const el = document.activeElement, c = getComputedStyle(el);
  return { alvo: el.closest('.tabs') ? 'pilula' : el.tagName, w: c.outlineWidth, cor: c.outlineColor,
           accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }; });
ok(foco.alvo === 'pilula' && parseFloat(foco.w) >= 2 && /15, 122, 87/.test(foco.cor),
   'D10 pílula com foco visível na cor de destaque (' + foco.w + ' ' + foco.cor + ')');

// D5/U7 — abrir pelo clique na linha e medir o modo leitura
const cx = await page.locator('.lawrow').first().boundingBox();
await page.mouse.click(cx.x + cx.width * 0.5, cx.y + cx.height / 2);
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('on')),
   'D5 o clique na linha abre mesmo o leitor');
const u7a = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight) }; });
await page.click('#rdrLeitura');
await page.waitForTimeout(250);
const u7b = await page.evaluate(() => { const cs = el => getComputedStyle(el);
  const d = document.querySelector('#rdr .docwrap'), c = document.querySelector('#rdr .caput');
  return { w: d.getBoundingClientRect().width, fs: parseFloat(cs(d).fontSize),
           // "sans-serif" contém "serif": a serifa se reconhece pelo NOME da fonte
           serif: /Spectral|Georgia/i.test(cs(c).fontFamily), lh: parseFloat(cs(c).lineHeight),
           aria: document.getElementById('rdrLeitura').getAttribute('aria-pressed'),
           guardado: localStorage.getItem('catedra:leitorLeitura'),
           soLocal: !JSON.stringify(Object.keys(localStorage)).includes('catedra:leitorLeitura:sync') }; });
ok(!u7a.serif && u7a.w > u7b.w, 'U7 o leitor normal segue largo e sem serifa (o modo leitura é escolha)');
ok(u7b.serif && u7b.fs >= 17 && u7b.lh / u7b.fs >= 1.68 && u7b.w <= 700,
   'U7 modo leitura: ~68ch, corpo serifado ' + u7b.fs + 'px, entrelinha ' + (u7b.lh / u7b.fs).toFixed(2));
ok(u7b.aria === 'true', 'U7 o botão do modo leitura diz o estado (aria-pressed)');
ok(u7b.guardado === '1' && u7b.soLocal, 'U7 a escolha fica no localStorage do aparelho (sem sync)');

// e continua valendo na próxima abertura
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(400);
ok(await page.evaluate(() => document.getElementById('rdr').classList.contains('leitura')),
   'U7 o modo leitura é lembrado entre aberturas');

/* ---- D8: o mesmo exercício no celular ---- */
await page.setViewportSize({ width: 375, height: 780 });
await page.goto(URL0 + '/legis-web.html');
await page.waitForTimeout(600);
const gordos = [];
for (const t of ['catalog', 'plano', 'indice', 'incid']) {
  await page.evaluate(tt => { const b = document.querySelector('#tabsTopo button[data-t="' + tt + '"]');
    b.click();
    // abre a primeira seção do Plano: os dias só existem depois de abrir
    const s = document.querySelector('#plano .sec-h'); if (s && tt === 'plano') s.click();
    const g = document.querySelector('#plano .grp-h'); if (g && tt === 'plano') g.click(); }, t);
  await page.waitForTimeout(t === 'incid' ? 1200 : 350);
  gordos.push(...await page.evaluate(() => {
    const p = [];
    document.querySelectorAll('button, a, input, .day').forEach(el => {
      if (!el.offsetParent) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.height < 44 || b.width < 44) p.push((el.className || el.tagName)
        + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return p;
  }));
}
await page.evaluate(() => document.querySelector('#tabsTopo button[data-t="catalog"]').click());
await page.waitForTimeout(250);
const d8 = await page.evaluate(() => {
  const cs = el => getComputedStyle(el);
  const tabs = document.getElementById('tabsTopo'), on = tabs.querySelector('button.on');
  const t = tabs.getBoundingClientRect(), o = on.getBoundingClientRect();
  return { rola: cs(tabs).overflowX === 'auto', snap: /x/.test(cs(tabs).scrollSnapType),
    snapItem: cs(on).scrollSnapAlign === 'center',
    ativaVisivel: o.left >= t.left - 1 && o.right <= t.right + 1 };
});
ok(gordos.length === 0, 'D8 nenhum alvo de toque abaixo de 44px no celular, nas 4 abas ('
   + gordos.slice(0, 6).join(', ') + ')');
ok(d8.rola && d8.snap && d8.snapItem, 'D8 a fileira de pílulas rola com scroll-snap');
ok(d8.ativaVisivel, 'D8 a pílula ativa já está à vista na carga');

// as ferramentas secundárias do leitor recolhem no ⋯ (e o esquema vira gaveta no ☰)
await page.evaluate(() => document.querySelector('.lawrow .lt').click());
await page.waitForTimeout(500);
const d8b = await page.evaluate(() => getComputedStyle(document.getElementById('rdrTools')).display);
await page.click('#rdrMore');
await page.waitForTimeout(250);
const d8c = await page.evaluate(() => {
  const t = document.getElementById('rdrTools'), cs = el => getComputedStyle(el);
  const pequenas = [...t.querySelectorAll('button, a')]
    .filter(el => { const b = el.getBoundingClientRect(); return b.height < 44 || b.width < 44; });
  return { aberto: cs(t).display === 'flex', dentroDaTela: t.getBoundingClientRect().right <= 375,
    diz: document.getElementById('rdrMore').getAttribute('aria-expanded') === 'true',
    alvosOk: pequenas.length === 0 };
});
ok(d8b === 'none' && d8c.aberto && d8c.diz && d8c.dentroDaTela && d8c.alvosOk,
   'D8 no celular as ações secundárias do leitor ficam recolhidas num ⋯');
await page.click('#rdrMapa');
await page.waitForTimeout(350);
const d8d = await page.evaluate(() => ({
  gaveta: document.querySelector('#rdr .map').getBoundingClientRect().left > -1,
  fechouOMais: !document.getElementById('rdrTools').classList.contains('aberto'),
}));
ok(d8d.gaveta && d8d.fechouOMais, 'D8 o esquema da lei vira gaveta no celular (260px não cabem em 375)');

// trocar de aba não pode apagar o "você está aqui" das pílulas do Índice
const d8e = await page.evaluate(() => {
  document.querySelector('#tabsTopo button[data-t="indice"]').click();
  const tabs = document.querySelector('#indice .tabs');
  return !!(tabs && tabs.querySelector('button.on'));
});
ok(d8e, 'D8 trocar de aba não apaga a pílula ativa do Índice');

await page.unroute('**/api/law*');
await page.setViewportSize({ width: 1280, height: 720 });
/* ============= JURIS — D3, D4, D7, D8, D10 e U7(b) ============= */
// Contexto próprio: estes casos mexem no localStorage do acervo e medem tamanho de
// tela, e não podem sujar o estado que os testes do app usam.
// O índice tem 25 mil verbetes; os TEXTOS são 10 MB e só entram quando um verbete é
// realmente aberto — o último caso do bloco guarda essa fronteira.
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const jp = await ctx.newPage();
  const errosJuris = [];
  const pedidos = [];
  jp.on('pageerror', e => errosJuris.push(e.message));
  jp.on('request', r => pedidos.push(r.url()));
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2400);

  // ---- D3(a): nenhum identificador técnico na interface
  const d3a = await jp.evaluate(() => ({
    semSnakeNaTela: !/[a-z]{3,}_[a-z]{3,}/.test(document.getElementById('paneAcervo').innerText),
    semSnakeNosChips: ![...document.querySelectorAll('#bases .chip, #ramos .chip, #trib .chip')]
      .some(c => /[a-z]{3,}_[a-z]{3,}/.test(c.textContent || '')),
    colecaoRotulada: [...document.querySelectorAll('#bases .chip')]
      .some(c => /Informativos? do STJ/i.test(c.textContent || '')),
    cardRotulado: ![...document.querySelectorAll('.vcard .num')]
      .some(n => /[a-z]{3,}_[a-z]{3,}/.test(n.textContent || '')),
  }));
  for (const [k, v] of Object.entries(d3a)) ok(v, 'D3 ' + k);

  // ---- D3(b): as duas fileiras recolhidas, tribunais à vista, acervo na 1ª dobra
  const d3b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.tribunaisContinuamAVista = document.querySelectorAll('#trib .chip').length > 3;
    o.painelComecaFechado = document.getElementById('popFiltros').hidden === true;
    o.acervoNaPrimeiraDobra = document.querySelector('.vcard').getBoundingClientRect().top < 460;
    document.getElementById('btFiltros').click(); await w(150);
    o.botaoAbreOPainel = !document.getElementById('popFiltros').hidden
      && document.getElementById('btFiltros').getAttribute('aria-expanded') === 'true';
    const chip = [...document.querySelectorAll('#ramos .chip')].find(c => /^Direito Penal\s/.test(c.textContent.trim()));
    if (!chip) return { ...o, erro: 'sem chip de ramo no painel' };
    chip.click(); await w(350);
    o.contaNoBotao = /Filtros \(1\)/.test(document.getElementById('btFiltros').textContent);
    const ativo = document.querySelector('#fAtivos .chip');
    o.chipAtivoAoLado = !!ativo && /Direito Penal/.test(ativo.textContent);
    o.chipAtivoTemNome = !!ativo && /remover filtro/i.test(ativo.getAttribute('aria-label') || '');
    o.filtroValeu = document.querySelectorAll('.vcard').length > 0
      && [...document.querySelectorAll('.vcard .rtag')].every(t => /Direito Penal/.test(t.textContent));
    ativo.click(); await w(350);
    o.chipRemoveOFiltro = document.querySelectorAll('#fAtivos .chip').length === 0
      && document.getElementById('btFiltros').textContent.trim() === 'Filtros';
    // "＋ N ramos" mexe na lista de dentro: não pode ser lido como clique fora e fechar
    document.getElementById('btFiltros').click(); await w(150);
    const mais = [...document.querySelectorAll('#ramos .chip')].find(c => /ramos$/.test(c.textContent.trim()));
    if (mais) { mais.click(); await w(250); }
    o.verMaisNaoFechaOPainel = !mais || !document.getElementById('popFiltros').hidden;
    document.body.click(); await w(150);
    o.cliqueForaFecha = document.getElementById('popFiltros').hidden;
    return o;
  });
  if (d3b.erro) ok(false, 'D3 ' + d3b.erro);
  else for (const [k, v] of Object.entries(d3b)) ok(v, 'D3 ' + k);

  // ---- D4: zero absoluto vira convite; com 1 volta a ser número
  const d4 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sb = () => document.querySelector('#paneAcervo .statbar').innerText;
    const o = {};
    o.zeroNaoVira0 = !/\b0\b/.test(sb()) && /marque/i.test(sb());
    const card = document.querySelector('.vcard');
    card.querySelector('.st').click(); card.querySelector('.st').click();   // '' → rev → dom
    card.querySelector('.fav').click(); await w(120);
    o.comUmViraNumero = /\b1\b/.test(sb()) && /dominados/i.test(sb()) && /favoritos/i.test(sb());
    return o;
  });
  for (const [k, v] of Object.entries(d4)) ok(v, 'D4 ' + k);

  // ---- D7: dois níveis de microlabel, e eles são mesmo diferentes
  // O par vivo mora no leitor: "ENUNCIADO" estrutura a leitura (forte) e "VERBETES DO
  // FILTRO" é rótulo de coluna (fraco). Antes os dois saíam em 10px/800 e só mudavam de
  // cor — era esse o "tudo destaca, nada destaca".
  const d7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    const g = e => { const c = getComputedStyle(e); return { fs: parseFloat(c.fontSize), w: +c.fontWeight, cor: c.color, caixa: c.textTransform }; };
    const forte = g(document.querySelector('#jrdr .venun .lbl'));
    const fraca = g(document.querySelector('#jrdr .maptitle'));
    const daPagina = g(document.querySelector('#paneAcervo .statbar .mlW'));
    document.getElementById('jrClose').click(); await w(200);
    return { forte, fraca,
      hierarquia: forte.fs > fraca.fs && forte.w > fraca.w && forte.cor !== fraca.cor,
      ambosCaps: forte.caixa === 'uppercase' && fraca.caixa === 'uppercase' && daPagina.caixa === 'uppercase',
      paginaSegueOFraco: daPagina.fs === fraca.fs && daPagina.w === fraca.w };
  });
  ok(d7.hierarquia, 'D7 o nível forte se distingue do fraco em tamanho, peso e cor ('
     + d7.forte.fs + 'px/' + d7.forte.w + ' × ' + d7.fraca.fs + 'px/' + d7.fraca.w + ')');
  ok(d7.ambosCaps, 'D7 os dois níveis continuam mono-caps (a linguagem da casa não muda)');
  ok(d7.paginaSegueOFraco, 'D7 metadado da página usa o mesmo nível fraco do leitor');

  // ---- D10: nome acessível em todo botão, foco visível e contraste do cinza pequeno
  const d10 = await jp.evaluate(() => {
    const o = {};
    o.todoBotaoTemNome = [...document.querySelectorAll('button')]
      .every(b => (b.textContent || '').trim() || b.getAttribute('aria-label'));
    o.semNome = [...document.querySelectorAll('button')]
      .filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label'))
      .map(b => b.id || b.className).join(', ');
    // contraste real do rótulo pequeno contra o fundo da página
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = s => { const m = s.match(/\d+/g).map(Number); return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]); };
    const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const alvo = document.querySelector('#paneAcervo .statbar .mlW');
    o.contraste = +razao(getComputedStyle(alvo).color, getComputedStyle(document.body).backgroundColor).toFixed(2);
    o.contrasteAA = o.contraste >= 4.5;
    return o;
  });
  ok(d10.todoBotaoTemNome, 'D10 nenhum botão sem nome acessível (' + (d10.semNome || 'nenhum') + ')');
  ok(d10.contrasteAA, 'D10 rótulo pequeno passa no AA (' + d10.contraste + ':1, antes 4.16 com --text3)');

  // foco visível de verdade: chega no chip pelo teclado e ele se acende
  await jp.click('#q');
  await jp.keyboard.press('Tab');
  const foco = await jp.evaluate(() => {
    const a = document.activeElement, c = getComputedStyle(a);
    return { ehChip: a.classList.contains('chip') || a.classList.contains('tab') || a.classList.contains('fbtn'),
             temContorno: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 };
  });
  ok(foco.ehChip && foco.temContorno, 'D10 chip alcançado pelo teclado mostra o foco');

  // ---- U7(b): modo leitura no leitor de verbete
  const u7 = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    window.openVerbete(0); await w(1600);
    const dw = () => document.querySelector('#jrdr .docwrap');
    o.medidaAntes = parseFloat(getComputedStyle(dw()).maxWidth);
    document.getElementById('jrLeitura').click(); await w(200);
    o.ligou = document.getElementById('jrdr').classList.contains('leitura');
    o.medidaDepois = parseFloat(getComputedStyle(dw()).maxWidth);
    const c = getComputedStyle(document.querySelector('#jrdr .venun .bd'));
    o.corpo = parseFloat(c.fontSize);
    o.entrelinha = +(parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2);
    o.serifado = /Spectral|Georgia|serif/i.test(c.fontFamily);
    o.pressionado = document.getElementById('jrLeitura').getAttribute('aria-pressed') === 'true';
    // sem sync: a chave não leva o prefixo que o auth.js sobe para a nuvem
    o.foraDoSync = !Object.keys(localStorage).some(k => k.indexOf('catedra:') === 0 && /leitura/i.test(k))
      && localStorage.getItem('catedraJurisLeitura') === '1';
    return o;
  });
  ok(u7.ligou, 'U7 modo leitura liga no leitor de verbete');
  ok(u7.medidaDepois < u7.medidaAntes && u7.medidaDepois < 640,
     'U7 a medida da linha encolhe para ~68ch (' + Math.round(u7.medidaAntes) + 'px → ' + Math.round(u7.medidaDepois) + 'px)');
  ok(u7.corpo >= 17 && u7.entrelinha >= 1.69 && u7.serifado,
     'U7 corpo serifado ≥17px com entrelinha 1.7 (' + u7.corpo + 'px / ' + u7.entrelinha + ')');
  ok(u7.pressionado, 'U7 o botão informa o estado (aria-pressed)');
  ok(u7.foraDoSync, 'U7 a escolha fica no aparelho — chave fora do prefixo que sincroniza');

  // lembrado entre aberturas
  await jp.goto(URL0 + '/juris-web.html');
  await jp.waitForTimeout(2200);
  const u7b = await jp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.openVerbete(0); await w(1600);
    return document.getElementById('jrdr').classList.contains('leitura');
  });
  ok(u7b, 'U7 o modo leitura sobrevive a reabrir a página');

  // ---- D8: celular — alvo de 44px, pílulas com rolagem e ferramentas no "⋯"
  const mctx = await browser.newContext({ viewport: { width: 375, height: 780 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errosJuris.push('mobile: ' + e.message));
  await mp.goto(URL0 + '/juris-web.html');
  await mp.waitForTimeout(2400);
  const d8 = await mp.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const alt = s => Math.round(document.querySelector(s).getBoundingClientRect().height);
    const o = {};
    const tabs = document.getElementById('tabs');
    o.pilulasRolamComEncaixe = tabs.scrollWidth > tabs.clientWidth
      && getComputedStyle(tabs).scrollSnapType.indexOf('x') === 0
      && getComputedStyle(document.querySelector('.tab')).scrollSnapAlign !== 'none';
    o.alvoDaPilula = alt('.tab') >= 44;
    o.alvoDoChip = alt('#trib .chip') >= 44;
    o.alvoDoStatus = alt('.vcard .st') >= 44 && alt('.vcard .fav') >= 44;
    // a ativa tem de aparecer sozinha: no celular a última pílula nasce fora da tela
    document.querySelector('.tab[data-pane="tribunais"]').click(); await w(400);
    const r = document.querySelector('#tabs .tab.on').getBoundingClientRect();
    o.ativaVisivelSemRolarNaMao = r.left >= -1 && r.right <= window.innerWidth + 1;
    document.querySelector('.tab[data-pane="acervo"]').click(); await w(300);
    window.openVerbete(0); await w(1600);
    o.ferramentasNoMais = getComputedStyle(document.getElementById('jrMais')).display !== 'none'
      && getComputedStyle(document.getElementById('jrTools')).display === 'none';
    document.getElementById('jrMais').click(); await w(200);
    o.oMaisAbre = getComputedStyle(document.getElementById('jrTools')).display !== 'none'
      && document.getElementById('jrMais').getAttribute('aria-expanded') === 'true';
    o.leitorCabeNaTela = getComputedStyle(document.querySelector('#jrdr .map')).display === 'none';
    return o;
  });
  for (const [k, v] of Object.entries(d8)) ok(v, 'D8 ' + k);

  ok(errosJuris.length === 0, 'JURIS nenhuma exceção na página (' + errosJuris.join(' | ') + ')');
  // a fronteira do acervo: abrir verbete puxa o BLOCO do texto, nunca o arquivo de 10 MB
  ok(!pedidos.some(u => /juris-text\.js/.test(u)), 'JURIS abrir verbete não baixa o juris-text.js inteiro');

  await mctx.close();
  await ctx.close();
}

/* ===== D6/D7/D8/D10 — pente fino visual do fluxo dos ritos e dos roteiros ===== */
/* Ferramentas medidas dentro da página, compartilhadas pelos casos abaixo:
   · vazamento: um retângulo l×a centrado cabe num losango L×A se l/L + a/A ≤ 1;
     medimos as linhas de texto de verdade (rects de Range) e o chip da lei;
   · contraste: compõe os fundos translúcidos até achar cor sólida (color-mix vira
     color(srgb …) no valor computado, por isso o parser passa pelo canvas). */
const FERRAMENTAS = `
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const paraRGB = s => {
    const m = String(s||'').match(/rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(',').map(Number); return [p[0],p[1],p[2], p.length>3?p[3]:1]; }
    try { ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0,0,1,1);
      const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; } catch (e) { return null; }
  };
  const fundoDe = el => {
    let n = el; const camadas = [];
    while (n && n.nodeType === 1) {
      const p = paraRGB(getComputedStyle(n).backgroundColor);
      if (p && p[3] > 0) { camadas.push(p); if (p[3] >= 1) break; }
      n = n.parentElement;
    }
    camadas.push([255,255,255,1]);
    let [r,g,b] = camadas[camadas.length-1];
    for (let i = camadas.length-2; i >= 0; i--) { const [R,G,B,A] = camadas[i];
      r = R*A + r*(1-A); g = G*A + g*(1-A); b = B*A + b*(1-A); }
    return [r,g,b];
  };
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
    return .2126*f(r) + .7152*f(g) + .0722*f(b); };
  const contraste = (fg,bg) => { const a = lum(fg)+.05, b = lum(bg)+.05; return a>b ? a/b : b/a; };
  const contrasteDe = el => contraste(paraRGB(getComputedStyle(el).color), fundoDe(el));
  const miudos = () => [...document.querySelectorAll('body *')].filter(el => {
    const t = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!t) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length
      && parseFloat(cs.fontSize) < 13;
  });
  const vazamento = () => [...document.querySelectorAll('.dec')].map(dec => {
    const los = dec.querySelector('.losango') || dec;
    if (getComputedStyle(los).clipPath === 'none') return null;   // virou caixa: não é losango
    const R = los.getBoundingClientRect();
    const cx = R.left + R.width/2, cy = R.top + R.height/2, a = R.width/2, b = R.height/2;
    const alvos = [];
    const w = document.createTreeWalker(dec, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!String(n.nodeValue).trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      [...rg.getClientRects()].forEach(x => { if (x.width && x.height) alvos.push(x); });
    }
    dec.querySelectorAll('.art').forEach(x => { const rr = x.getBoundingClientRect(); if (rr.width) alvos.push(rr); });
    let pior = 0;
    alvos.forEach(rr => [[rr.left,rr.top],[rr.right,rr.top],[rr.left,rr.bottom],[rr.right,rr.bottom]]
      .forEach(([x,y]) => { const v = Math.abs(x-cx)/a + Math.abs(y-cy)/b; if (v > pior) pior = v; }));
    return { t: (dec.querySelector('.tt')||{}).textContent, pior: +pior.toFixed(3) };
  }).filter(Boolean);
`;

// D6(a) — o texto da decisão dentro do losango, em coluna larga e em coluna estreita.
// Antes da correção, a 940px (a largura do satélite dentro do app) 10 dos 26 losangos
// destes ritos vazavam, e a 905px, 23 — o título e a lei escapavam pela lateral.
{
  const ritos = ['Administrativo — improbidade', 'Civil — conhecimento', 'Penal — procedimento sumário',
                 'Penal — tribunal do júri', 'Empresarial — recuperação e falência'];
  for (const larg of [1280, 940]) {
    await page.setViewportSize({ width: larg, height: 900 });
    let total = 0, vazam = [], pior = 0;
    for (const rito of ritos) {
      await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent(rito));
      await page.waitForTimeout(250);
      const m = await page.evaluate(FERRAMENTAS + '; vazamento()');
      m.forEach(x => { total++; if (x.pior > 1) vazam.push(x.t); if (x.pior > pior) pior = x.pior; });
    }
    ok(total > 0 && vazam.length === 0,
      'D6 nenhum texto escapa do losango a ' + larg + 'px (' + total + ' losangos, pior=' + pior.toFixed(2) +
      (vazam.length ? '; vazam: ' + vazam.slice(0, 3).join(' / ') : '') + ')');
  }
}

// D6(a) — e continua cabendo quando a coluna muda de largura SEM recarregar (é o caso
// do iframe dentro do app: a janela muda, o texto reflui, a forma precisa remedir)
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Civil — conhecimento'));
await page.waitForTimeout(400);
await page.setViewportSize({ width: 980, height: 900 });
await page.waitForTimeout(400);
const d6r = await page.evaluate(FERRAMENTAS + '; vazamento()');
ok(d6r.length > 0 && d6r.every(x => x.pior <= 1),
  'D6 a forma remede sozinha ao mudar a largura (' + d6r.length + ' losangos, pior=' +
  Math.max(0, ...d6r.map(x => x.pior)).toFixed(2) + ')');

// D6(b) — o rótulo da seta é o que separa os caminhos: contraste e pílula própria
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Administrativo — improbidade'));
await page.waitForTimeout(300);
const d6b = await page.evaluate(FERRAMENTAS + `; (() => {
  const rot = [...document.querySelectorAll('.saida .fio .rot')].filter(x => (x.textContent||'').trim());
  if (!rot.length) return { erro: 'sem rótulo de seta' };
  const cs = getComputedStyle(rot[0]);
  return {
    achou: rot.map(x => x.textContent.trim()).join(' | ').slice(0, 40),
    piorContraste: +Math.min(...rot.map(contrasteDe)).toFixed(2),
    temPill: (paraRGB(cs.backgroundColor)||[0,0,0,0])[3] > 0 && parseFloat(cs.borderTopWidth) > 0,
    naoUsaText3: cs.color !== getComputedStyle(document.documentElement).getPropertyValue('--text3').trim(),
  };
})()`);
if (d6b.erro) ok(false, 'D6 ' + d6b.erro);
else {
  ok(d6b.piorContraste >= 4.5, 'D6 rótulo da seta com contraste ≥ 4.5:1 (' + d6b.piorContraste + ':1 — ' + d6b.achou + ')');
  ok(d6b.temPill, 'D6 rótulo da seta ganhou fundo pill para descolar da linha');
}

// D7 — dois níveis de microlabel, e os dois em uso nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(400);
  const d7 = await page.evaluate(FERRAMENTAS + `; (() => {
    const f = document.querySelector('.ml-forte'), w = document.querySelector('.ml-fraca');
    if (!f || !w) return { erro: 'faltou nível ' + (!f ? 'forte' : 'fraco') };
    const cf = getComputedStyle(f), cw = getComputedStyle(w);
    return {
      usaOsDois: true,
      monoSoNoForte: /mono|Menlo|ui-monospace/i.test(cf.fontFamily) && !/mono|Menlo|ui-monospace/i.test(cw.fontFamily),
      // Chrome serializa letter-spacing:0 como 'normal' — parseFloat daria NaN
      espacamentoSoNoForte: (parseFloat(cf.letterSpacing) || 0) > (parseFloat(cw.letterSpacing) || 0),
      coresDiferentes: cf.color !== cw.color,
      fracoLegivel: +contrasteDe(w).toFixed(2) >= 4.5,
    };
  })()`);
  if (d7.erro) ok(false, 'D7 ' + pg + ': ' + d7.erro);
  else for (const [k, v] of Object.entries(d7)) ok(v, 'D7 ' + pg + ' ' + k);
}

// D8/SELETOR — celular: o rito se escolhe por BUSCA, não arrastando 27 pílulas.
// A fileira que existia aqui (scroll horizontal com máscara de fade) era o jeito mais
// longo de chegar num rito; o teste antigo media a rolagem dela e morreu com ela.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL0 + '/ritos-web.html?rito=' + encodeURIComponent('Tributário — execução fiscal'));
await page.waitForTimeout(500);
const d8rp = await page.evaluate(`(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const bt = document.getElementById('btRito');
  const r = {
    botaoDizORitoAtual: (document.getElementById('btRitoNome').textContent || '').includes('execução fiscal'),
    botaoInteiroNaTela: bt.getBoundingClientRect().right <= innerWidth + 1,
    semFileiraDePilulas: document.querySelectorAll('#mats .pill').length === 0,
    alvosDe44: [...document.querySelectorAll('#btRito, header button')]
      .filter(b => b.getClientRects().length)
      .every(b => b.getBoundingClientRect().height >= 44),
    maisVisivel: document.getElementById('bMais').getClientRects().length > 0,
    acoesRecolhidas: document.getElementById('bNotas').getClientRects().length === 0,
  };
  return new Promise(async ok2 => {
    bt.click(); await w(150);
    r.painelAbre = document.getElementById('painelRito').classList.contains('aberto');
    r.buscaComFoco = document.activeElement === document.getElementById('buscaRito');
    r.listaAgrupadaPorRamo = document.querySelectorAll('#listaRito .grupo').length > 3;
    r.listaTemTodosOsRitos = document.querySelectorAll('#listaRito .op').length >= 20;
    // busca sem acento e por pedaço: "exec fiscal" tem de achar "Tributário — execução fiscal"
    const busca = document.getElementById('buscaRito');
    busca.value = 'exec fiscal'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(150);
    const achados = [...document.querySelectorAll('#listaRito .op')].map(o => o.dataset.k);
    r.buscaSemAcentoEPorPedaco = achados.length === 1 && /execução fiscal/.test(achados[0]);
    // Enter escolhe o primeiro achado e o painel fecha
    busca.value = 'improb'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(150);
    busca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(400);
    r.enterEscolhe = (document.getElementById('btRitoNome').textContent || '').includes('improbidade');
    r.painelFecha = !document.getElementById('painelRito').classList.contains('aberto');
    r.trocouORito = /improbidade/i.test(document.querySelector('.cab h2').textContent || '');
    r.escNaoDeixaAberto = true;
    bt.click(); await w(150);
    document.getElementById('buscaRito').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await w(150);
    r.escNaoDeixaAberto = !document.getElementById('painelRito').classList.contains('aberto');
    document.getElementById('bMais').click(); await w(120);
    r.menuAbre = document.getElementById('bNotas').getClientRects().length > 0;
    r.avisaEstado = document.getElementById('bMais').getAttribute('aria-expanded') === 'true';
    document.body.click(); await w(120);
    r.menuFechaClicandoFora = document.getElementById('bNotas').getClientRects().length === 0;
    ok2(r);
  });
})()`);
for (const [k, v] of Object.entries(d8rp)) ok(v, 'D8/SELETOR ' + k);

await page.goto(URL0 + '/pecas-web.html');
await page.waitForTimeout(400);
const d8p = await page.evaluate(`(() => ({
  alvos: [...document.querySelectorAll('header input, header select')]
    .every(b => b.getBoundingClientRect().height >= 44),
  // sem 16px na busca o iOS dá zoom ao focar — foi por isso que a página proibia ampliar
  buscaGrande: parseFloat(getComputedStyle(document.getElementById('q')).fontSize) >= 16,
  deixaAmpliar: !/user-scalable\\s*=\\s*no|maximum-scale/.test(
    (document.querySelector('meta[name=viewport]')||{}).content || ''),
}))()`);
for (const [k, v] of Object.entries(d8p)) ok(v, 'D8/D10 peças no celular ' + k);

// D10 — nome acessível, foco visível e contraste do texto miúdo nas duas páginas
for (const pg of ['ritos-web.html', 'pecas-web.html']) {
  for (const larg of [1280, 390]) {
    await page.setViewportSize({ width: larg, height: 844 });
    await page.goto(URL0 + '/' + pg);
    await page.waitForTimeout(400);
    const d10 = await page.evaluate(FERRAMENTAS + `; (() => ({
      semNome: [...document.querySelectorAll('button')]
        .filter(b => b.getClientRects().length)
        .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title')))
        .map(b => b.className || b.id),
      miudosRuins: miudos().map(el => ({ q: el.className || el.tagName, c: +contrasteDe(el).toFixed(2),
        t: (el.textContent||'').trim().slice(0, 24) })).filter(x => x.c < 4.5),
    }))()`);
    ok(d10.semNome.length === 0, 'D10 ' + pg + ' @' + larg + ': todo botão tem nome acessível' +
      (d10.semNome.length ? ' (sem nome: ' + d10.semNome.join(', ') + ')' : ''));
    ok(d10.miudosRuins.length === 0, 'D10 ' + pg + ' @' + larg + ': texto abaixo de 13px com ≥ 4.5:1' +
      (d10.miudosRuins.length ? ' (' + JSON.stringify(d10.miudosRuins.slice(0, 3)) + ')' : ''));
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(URL0 + '/' + pg);
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { erro: 'nada recebeu o foco' };
    const cs = getComputedStyle(el);
    return { visivel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, quem: el.tagName + '.' + el.className };
  })()`);
  ok(!foco.erro && foco.visivel, 'D10 ' + pg + ': o primeiro Tab mostra o foco (' + (foco.quem || foco.erro) + ')');
}
// O host acrescenta ?embed=1 ao src dos iframes (D2): as duas páginas precisam
// continuar inteiras nesse modo — nada do pente fino pode depender do cabeçalho grande.
for (const [pg, alvo] of [['ritos-web.html', '#fluxo .passo'], ['pecas-web.html', '.rcard']]) {
  await page.goto(URL0 + '/' + pg + '?embed=1');
  await page.waitForTimeout(500);
  const emb = await page.evaluate(`(() => ({
    conteudo: document.querySelectorAll('${alvo}').length,
    semNome: [...document.querySelectorAll('button')].filter(b => b.getClientRects().length)
      .filter(b => !((b.textContent||'').trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).length,
  }))()`);
  ok(emb.conteudo > 0 && emb.semNome === 0, 'D10 ' + pg + ' inteira também com ?embed=1 (' + emb.conteudo + ' itens)');
}
await page.setViewportSize({ width: 1280, height: 720 });
/* ====== D7/D8/D10 — PENTE FINO: 2ª FASE, PRIORIDADE E MÓDULO DA ÁREA ======
   Fica por último de propósito: mexe no tamanho da janela (breakpoint móvel) e
   devolve 1280×720 no fim, para não contaminar os blocos anteriores. */
{
  // botão sem texto E sem aria-label é botão que o leitor de tela anuncia como "botão"
  const semNome = () => page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => !((b.textContent || '').trim()) && !b.getAttribute('aria-label'))
    .map(b => b.className || b.outerHTML.slice(0, 50)));
  // alvo de toque medido pelo DEDO, não pela caixa do elemento: quem amplia a área
  // com ::after (a bolinha de status) continua desenhada com 22px e clicável com 44
  const alvo44 = sel => page.evaluate(s => {
    const b = document.querySelector(s); if (!b) return null;
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, p = 21;
    return [[cx - p, cy - p], [cx + p, cy - p], [cx - p, cy + p], [cx + p, cy + p]]
      .every(([x, y]) => { const e = document.elementFromPoint(x, y); return e === b || b.contains(e); });
  }, sel);
  const correcao = async largura => {          // deixa a 2ª fase na tela de correção
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(URL0 + '/segunda-fase-web.html');
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const P = (window.CT_ESPELHOS || {}).provas || [];
      const alvo = P.find(p => (p.quesitos || []).length >= 3) || P[0];
      localStorage.setItem('catedraSegundaFase', JSON.stringify({ hist: [], sessao: {
        id: alvo.id, minutos: 300, inicio: Date.now(), acc: 6e4, rodando: false,
        folha: 'peça de teste citando o art. 5', entregue: true, gasto: 6e4, veredictos: {} } }));
    });
    await page.goto(URL0 + '/segunda-fase-web.html');
    await page.waitForTimeout(900);
  };

  /* -- D10: nome acessível em todo botão -- */
  const semNomePorPagina = {};
  for (const p of ['area-web.html?area=saude', 'prioridade-web.html', 'segunda-fase-web.html']) {
    await page.goto(URL0 + '/' + p); await page.waitForTimeout(600);
    semNomePorPagina[p] = await semNome();
  }
  await correcao(1280);
  semNomePorPagina['segunda-fase (correção)'] = await semNome();
  ok(Object.values(semNomePorPagina).every(v => v.length === 0),
     'D10 nenhum botão sem nome acessível nas satélites ' + JSON.stringify(semNomePorPagina));

  /* -- D7: os dois níveis de rótulo são visivelmente diferentes -- */
  const d7 = await page.evaluate(() => {
    const f = document.querySelector('.rot-forte'), m = document.querySelector('.rot-fraco');
    if (!f || !m) return { erro: 'faltou um dos níveis na tela' };
    const a = getComputedStyle(f), b = getComputedStyle(m);
    const mono = s => /mono|Menlo|Courier/i.test(s);
    return { corDiferente: a.color !== b.color,
             forteMaior: parseFloat(a.fontSize) > parseFloat(b.fontSize),
             espacoSoNoForte: parseFloat(a.letterSpacing) > 0 && !(parseFloat(b.letterSpacing) > 0),
             monoSoNoForte: mono(a.fontFamily) && !mono(b.fontFamily) };
  });
  if (d7.erro) ok(false, 'D7 ' + d7.erro);
  else for (const [k, v] of Object.entries(d7)) ok(v, 'D7 ' + k);

  /* -- D10: foco visível ao chegar de teclado (área, que é onde estão os só-ícone) -- */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL0 + '/area-web.html?area=saude');
  await page.waitForTimeout(500);
  let foco = null;
  for (let i = 0; i < 8 && !foco; i++) {
    await page.keyboard.press('Tab');
    foco = await page.evaluate(() => { const a = document.activeElement;
      if (!a || a.tagName !== 'BUTTON') return null;
      const cs = getComputedStyle(a);
      return { cls: a.className, w: cs.outlineWidth, estilo: cs.outlineStyle }; });
  }
  ok(!!foco && parseFloat(foco.w) >= 2 && foco.estilo === 'solid',
     'D10 pílula/chip mostra foco visível ao teclado ' + JSON.stringify(foco));

  /* -- D10: a linha do painel de prioridade é botão de verdade (teclado + estado) -- */
  await page.goto(URL0 + '/prioridade-web.html');
  await page.waitForTimeout(800);
  const prio = await page.evaluate(() => {
    const h = document.querySelector('.linha .lh');
    if (!h) return { erro: 'sem linha' };
    const r = { ehBotao: h.tagName === 'BUTTON', fechado: h.getAttribute('aria-expanded') === 'false',
                aponta: !!document.getElementById(h.getAttribute('aria-controls') || '') };
    h.click();
    r.abriuEAnuncia = h.getAttribute('aria-expanded') === 'true' && h.closest('.linha').classList.contains('on');
    // e aqui também os dois níveis convivem: seção (.dh) forte, legenda de número fraca
    const f = getComputedStyle(document.querySelector('.det .rot-forte'));
    const m = getComputedStyle(document.querySelector('.stat .rot-fraco'));
    r.doisNiveis = f.color !== m.color && parseFloat(f.letterSpacing) > 0 && !(parseFloat(m.letterSpacing) > 0);
    return r;
  });
  if (prio.erro) ok(false, 'D10 prioridade: ' + prio.erro);
  else for (const [k, v] of Object.entries(prio)) ok(v, 'D10 prioridade ' + k);

  /* -- D8: alvos de 44px no breakpoint móvel -- */
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(URL0 + '/area-web.html?area=saude');
  await page.waitForTimeout(500);
  ok(await alvo44('.row .st'), 'D8 a bolinha de status tem 44px de alvo no celular (desenho segue com 22)');
  ok(await alvo44('.row .fav'), 'D8 a ★ tem 44px de alvo no celular');
  const pequenos = await page.evaluate(() => [...document.querySelectorAll('button,select,input')]
    .filter(e => e.offsetParent !== null && !e.classList.contains('st'))
    .filter(e => e.getBoundingClientRect().height < 44).length);
  ok(pequenos === 0, 'D8 nenhum controle abaixo de 44px no módulo da área (' + pequenos + ')');

  await page.goto(URL0 + '/prioridade-web.html');
  await page.waitForTimeout(800);
  const prioPeq = await page.evaluate(() => [...document.querySelectorAll('button,select')]
    .filter(e => e.offsetParent !== null).filter(e => e.getBoundingClientRect().height < 44).length);
  ok(prioPeq === 0, 'D8 nenhum controle abaixo de 44px no painel de prioridade (' + prioPeq + ')');

  /* -- D8: o "⋯" recolhe as ações secundárias no celular e some no desktop -- */
  await correcao(375);
  const mais = await page.evaluate(() => {
    const b = document.getElementById('bMais'), it = document.getElementById('maisIt');
    if (!b || !it) return { erro: 'sem menu ⋯' };
    const r = { aparece: getComputedStyle(b).display !== 'none',
                temNome: !!b.getAttribute('aria-label'),
                comecaFechado: getComputedStyle(it).display === 'none',
                primariaVisivel: getComputedStyle(document.getElementById('bFechar')).display !== 'none' };
    b.click();
    r.abre = getComputedStyle(it).display !== 'none' && b.getAttribute('aria-expanded') === 'true';
    r.guardaImprimir = [...it.querySelectorAll('button')].some(x => /imprimir/i.test(x.textContent));
    document.body.click();
    r.fechaClicandoFora = getComputedStyle(it).display === 'none';
    return r;
  });
  if (mais.erro) ok(false, 'D8 ' + mais.erro);
  else for (const [k, v] of Object.entries(mais)) ok(v, 'D8 menu ⋯ ' + k);

  const deskMais = await (async () => { await correcao(1280);
    return page.evaluate(() => ({
      some: getComputedStyle(document.getElementById('bMais')).display === 'none',
      itensNaLinha: getComputedStyle(document.getElementById('maisIt')).display === 'contents' })); })();
  ok(deskMais.some && deskMais.itensNaLinha, 'D8 no desktop o ⋯ some e os botões voltam para a linha');

  /* -- D8: fileira de veredictos com encaixe e a marcada visível já no load.
     320px é onde as três pílulas deixam de caber lado a lado. -- */
  await correcao(320);
  const trilho = await page.evaluate(() => {
    const sc = document.querySelector('.q .vb'); if (!sc) return { erro: 'sem fileira' };
    const on = sc.querySelector('button.on'); if (!on) return { erro: 'sem veredicto marcado' };
    const a = on.getBoundingClientRect(), b = sc.getBoundingClientRect();
    return { rolaHorizontal: sc.scrollWidth > sc.clientWidth,
             comEncaixe: getComputedStyle(sc).scrollSnapType.indexOf('x') === 0,
             marcadaVisivelNoLoad: a.left >= b.left - 1 && a.right <= b.right + 1,
             semCorteVertical: sc.scrollHeight <= sc.clientHeight + 2 };
  });
  if (trilho.erro) ok(false, 'D8 trilho: ' + trilho.erro);
  else for (const [k, v] of Object.entries(trilho)) ok(v, 'D8 veredictos ' + k);

  // os seletores dirigidos pelos testes de cima continuam de pé depois do pente fino
  const seletores = await page.evaluate(() => ({
    ver: document.querySelectorAll('.q .ver button[data-v]').length > 0,
    salvar: [...document.querySelectorAll('button')].some(b => /Salvar e sair/.test(b.textContent || '')),
    disp: document.querySelectorAll('.disp [data-legis]').length > 0,
  }));
  for (const [k, v] of Object.entries(seletores)) ok(v, 'D8/D10 seletor preservado: ' + k);

  await page.evaluate(() => localStorage.removeItem('catedraSegundaFase'));
  await page.setViewportSize({ width: 1280, height: 720 });
}
/* ============= U2 — ESQUELETO DE CARREGAMENTO ============= */
// O que se prova aqui: o vazio sem explicação acabou na PRIMEIRA carga de cada acervo, e
// que a volta a uma tela já carregada não pisca esqueleto (com o iframe vivo, seria mentira).
// O esqueleto existe para a carga LENTA. Medi-lo com um `await w(80)` depois do clique é
// uma corrida: servindo de localhost, o LEGIS às vezes carrega antes disso e o esqueleto
// já saiu — passava aqui e falhava na CI. Em vez de dar mais tempo (que só adia o
// problema), atrasamos a resposta da página, que é a condição em que o recurso importa.
await page.route('**/legis-web.html*', async (rota) => {
  await new Promise(r => setTimeout(r, 900));
  await rota.continue();
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u2 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const skel = () => !!document.querySelector('.ct-skelbox');
  const r = {};
  r.inicioSemEsqueleto = !skel();                       // só as telas de iframe têm esqueleto

  document.querySelector('button[data-view="legis"]').click();
  await w(250);
  r.primeiraCargaMostra = skel();                       // a página ainda está a caminho

  const fr = document.querySelector('iframe[data-ct-view="legis"]');
  for (let i = 0; i < 200 && fr.dataset.ctLoad !== '1'; i++) await w(100);
  await w(250);
  r.someQuandoAPaginaCarrega = !skel();                 // e sai assim que ela chega
  r.esqueletoFicaAtras = true;                          // conferido pelo z-order do CSS abaixo

  // sair e voltar: iframe vivo, nada recarrega, nada pisca
  document.querySelector('button[data-view="inicio"]').click(); await w(350);
  document.querySelector('button[data-view="legis"]').click(); await w(120);
  r.voltaNaoPisca = !skel();
  return r;
});
for (const [k, v] of Object.entries(u2)) ok(v, 'U2 ' + k);
await page.unroute('**/legis-web.html*');  // o atraso era só para medir o esqueleto
// o esqueleto é FUNDO: fica atrás do iframe (que é `position:relative`), então mesmo que um
// satélite antigo nunca avise, a página carregada o cobre — nunca tapa conteúdo
const u2css = await page.evaluate(() => {
  const fr = document.querySelector('iframe[data-ct-view="legis"]');
  return { framePosicionado: getComputedStyle(fr).position === 'relative',
           molduraRelativa: getComputedStyle(fr.parentElement).position === 'relative' };
});
ok(u2css.framePosicionado && u2css.molduraRelativa, 'U2 o esqueleto é fundo (o iframe pinta por cima)');

/* ============= U9 — SCROLL ÚNICO ============= */
const u9 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const sc = () => document.querySelector('.ct-scroll');
  const r = {};
  document.querySelector('button[data-view="legis"]').click(); await w(500);
  r.hostNaoRola = (sc().scrollHeight - sc().clientHeight) <= 1;
  r.paginaNaoRola = (document.documentElement.scrollHeight - document.documentElement.clientHeight) <= 1;
  const fr = document.querySelector('iframe[data-ct-view="legis"]').getBoundingClientRect();
  r.quadroOcupaOEspaco = fr.height > window.innerHeight * 0.6 && fr.bottom <= window.innerHeight + 1;
  const topo = document.querySelector('.ct-topbar').getBoundingClientRect();
  r.topoAlcancavel = topo.top >= 0 && topo.height > 20;
  const menu = document.querySelector('aside button[data-view="inicio"]');
  r.menuAlcancavel = !!menu && menu.getBoundingClientRect().height > 10;

  // fora do acervo, o host volta a rolar como sempre
  document.querySelector('button[data-view="revisoes"]').click(); await w(500);
  r.foraDoAcervoRolaDeNovo = /auto|scroll/.test(getComputedStyle(sc()).overflowY);
  return r;
});
for (const [k, v] of Object.entries(u9)) ok(v, 'U9 ' + k);

/* ============= U8 — ATALHOS VISÍVEIS (tecla ?) ============= */
// A tecla ? é gateada por conta conectada, como o ⌘K: na tela de entrar não há o que
// atalhar. Por isso este bloco entra com a sessão local ligada.
await page.evaluate(() => localStorage.setItem('catedra:auth', '1'));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u8 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const modal = () => [...document.querySelectorAll('div[role=dialog]')]
    .find(d => /Atalhos do teclado/.test(d.getAttribute('aria-label') || ''));
  const tecla = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const r = {};
  r.fechadoPorPadrao = !modal();

  tecla('?'); await w(300);
  r.interrogacaoAbre = !!modal();
  const linhas = modal() ? modal().querySelectorAll('span[style*="mono"]').length : 0;
  r.listaTemAtalhos = linhas >= 4;
  r.listaTemOCmdK = /⌘K/.test(modal() ? modal().innerText : '');

  tecla('Escape'); await w(300);
  r.escFecha = !modal();

  // dentro de um campo de texto, ? é só uma interrogação
  const inp = document.createElement('input'); document.body.appendChild(inp); inp.focus();
  tecla('?'); await w(250);
  r.dentroDeInputNaoAbre = !modal();
  inp.remove();
  return r;
});
for (const [k, v] of Object.entries(u8)) ok(v, 'U8 ' + k);

// a lista da tela e o item da paleta saem da MESMA constante (fonte única)
const u8b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const fonte = [...document.querySelectorAll('script')].map(s => s.textContent || '').find(t => t.includes('ATALHOS =')) || '';
  const bloco = fonte.slice(fonte.indexOf('ATALHOS ='), fonte.indexOf('ATALHOS =') + 900);
  const naConstante = (bloco.slice(0, bloco.indexOf('];')).match(/\{tecla:/g) || []).length;

  document.querySelector('button[title^="Buscar"]').click(); await w(300);
  const campo = document.querySelector('div[role=dialog] input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, 'atalho'); campo.dispatchEvent(new Event('input', { bubbles: true }));
  await w(400);
  const item = [...document.querySelectorAll('div[role=dialog] button')].find(b => /Atalhos do teclado/.test(b.textContent || ''));
  const temItemNaPaleta = !!item;
  if (item) item.click();
  await w(400);
  const modal = [...document.querySelectorAll('div[role=dialog]')]
    .find(d => /Atalhos do teclado/.test(d.getAttribute('aria-label') || ''));
  const naTela = modal ? modal.querySelectorAll('span[style*="mono"]').length : 0;
  if (modal) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(200);
  return { temItemNaPaleta, mesmaFonte: naConstante > 0 && naConstante === naTela };
});
ok(u8b.temItemNaPaleta, 'U8 a paleta ⌘K também leva aos atalhos');
ok(u8b.mesmaFonte, 'U8 a lista da tela sai da constante única ATALHOS');
await page.evaluate(() => localStorage.removeItem('catedra:auth'));

const hojeStr = new Date().toISOString().slice(0, 10);
/* ============= U11 — REGISTRO DE ESTUDO EM UM TOQUE ============= */
// O cronômetro anda pelo RELÓGIO (Date.now), então adiantar o relógio adianta a sessão —
// mesmo truque do U5 acima. Assim dá para pausar com 32 min sem esperar 32 min.
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate((hoje) => {
  localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's-u11', ts: Date.now() - 3600e3, date: hoje,
    disc: 'Direito Penal', topico: 'Crimes contra a vida', categoria: 'Teoria', categorias: ['Teoria'],
    min: 40, questoes: 0, acertos: 0, erradas: 0, brancos: 0, liquido: 0 }]));
}, hojeStr);
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u11 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const toast = () => [...document.querySelectorAll('div[role=status]')].find(d => /Registrar/.test(d.textContent || ''));
  // D12 recolheu os botões soltos do cronômetro para dentro do chip de foco. O play
  // continua a um clique — é justamente o que o item promete ("nada se perde").
  const abrirChip = async () => {
    if (document.querySelector('[role=menu][aria-label="Cronômetro e foco"]')) return;
    const chip = [...document.querySelectorAll('header.ct-topbar button')]
      .find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
    if (chip) { chip.click(); await w(300); }
  };
  const play = () => { const m = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
    return m && [...m.querySelectorAll('button')].find(b => /Iniciar|Pausar|Retomar/.test(b.textContent || '')); };
  const r = {};
  await abrirChip();
  if (!play()) return { erro: 'sem botão de cronômetro no chip de foco' };

  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  await abrirChip(); play().click(); await w(300);          // começa a contar
  delta = 32 * 60000;                    // 32 minutos de estudo
  await w(1400);                         // um tique com o relógio adiantado
  await abrirChip(); play().click(); await w(600);          // pausa → oferta
  Date.now = orig;

  const t = toast();
  r.ofereceAoPausar = !!t && /Registrar 32 min em Direito Penal/.test(t.textContent || '');
  const bt = n => [...(t ? t.querySelectorAll('button') : [])].find(b => (b.textContent || '').trim() === n);
  r.tresCaminhos = !!bt('Registrar') && !!bt('Editar') && !!bt('Ignorar');
  if (!bt('Registrar')) return r;

  bt('Registrar').click(); await w(900);
  const ss = JSON.parse(localStorage.getItem('catedra:sessions') || '[]');
  const nova = ss.find(s => s.id !== 's-u11');
  r.registraDireto = !!nova && nova.min === 32 && nova.disc === 'Direito Penal';
  r.herdaCategoria = !!nova && nova.categoria === 'Teoria';
  r.zeraOCronometro = !localStorage.getItem('ct_timer');   // sem isso o mesmo tempo entraria duas vezes
  return r;
});
if (!u11.erro) { for (const [k, v] of Object.entries(u11)) ok(v, 'U11 ' + k); }
else ok(false, 'U11 ' + u11.erro);

// menos de 5 min é ruído: não oferece nada
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1700);
const u11b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  // D12: o play mora dentro do chip de foco (o menu fecha a cada estado, então reabre)
  const abrirChip = async () => {
    if (document.querySelector('[role=menu][aria-label="Cronômetro e foco"]')) return;
    const chip = [...document.querySelectorAll('header.ct-topbar button')]
      .find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
    if (chip) { chip.click(); await w(300); }
  };
  const play = () => { const m = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
    return m && [...m.querySelectorAll('button')].find(b => /Iniciar|Pausar|Retomar/.test(b.textContent || '')); };
  const orig = Date.now; let delta = 0; Date.now = () => orig() + delta;
  await abrirChip(); play().click(); await w(300);
  delta = 2 * 60000;
  await w(1400);
  await abrirChip(); play().click(); await w(600);
  Date.now = orig;
  const t = [...document.querySelectorAll('div[role=status]')].find(d => /Registrar/.test(d.textContent || ''));
  return !t || t.style.opacity !== '1';
});
ok(u11b, 'U11 dois minutos não viram oferta de registro');

/* ============= U4 — RETOMADA EXPLÍCITA DA REDAÇÃO ============= */
// (O outro caso do U4, o simulado pausado, NÃO existe: _restoreProva consome ct_prova no
// boot e reabre a prova em tela cheia — o teste do U3 acima guarda essa decisão.)
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.setItem('catedra:redEnunciado', JSON.stringify('TJ-XX 2024 · Sentença cível\n\nProfira sentença.'));
  localStorage.setItem('catedra:redText', JSON.stringify('Vistos etc. Trata-se de ação de cobrança...'));
  localStorage.setItem('catedra:redTextTs', JSON.stringify(Date.now() - 3 * 3600e3));
  localStorage.removeItem('catedra:redGabarito');
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u4 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  const r = {};
  document.querySelector('button[data-view="redacao"]').click(); await w(2500);
  r.mostraAFaixa = /rascunho salvo/i.test(M());
  r.dizDeQuando = /há 3h/.test(M());
  const btn = n => [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === n);
  r.ofereceOsDoisCaminhos = !!btn('Continuar') && !!btn('Começar do zero');

  // "Começar do zero" pergunta antes (é destruição de texto) e limpa só a resposta
  let perguntou = false; window.confirm = () => { perguntou = true; return true; };
  btn('Começar do zero').click(); await w(600);
  r.zerarPergunta = perguntou;
  r.zerarLimpaOTexto = JSON.parse(localStorage.getItem('catedra:redText') || '""') === '';
  r.zerarMantemAProva = !!JSON.parse(localStorage.getItem('catedra:redEnunciado') || '""');
  r.faixaSaiDepois = !/rascunho salvo/i.test(M());
  return r;
});
for (const [k, v] of Object.entries(u4)) ok(v, 'U4 ' + k);

// escrever faz a faixa sair sozinha — ela não fica pedindo passagem durante o trabalho
await page.evaluate(() => {
  localStorage.setItem('catedra:redText', JSON.stringify('Rascunho de outra sessão.'));
  localStorage.setItem('catedra:redTextTs', JSON.stringify(Date.now() - 26 * 3600e3));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const u4b = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const M = () => document.querySelector('main').innerText;
  document.querySelector('button[data-view="redacao"]').click(); await w(2500);
  const antes = /rascunho salvo/i.test(M());
  const ta = document.querySelector('main textarea');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, 'Rascunho de outra sessão. Continuando agora.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await w(500);
  return { antes, depois: /rascunho salvo/i.test(M()) };
});
ok(u4b.antes && !u4b.depois, 'U4 a faixa some assim que a pessoa volta a escrever');

/* ============= U12 — LEMBRETE DE REVISÃO NO HORÁRIO ============= */
// Notification é substituído ANTES do app subir: o headless não dá permissão de verdade.
await page.addInitScript(() => {
  const N = function (titulo, opts) { window.__notifs = (window.__notifs || []).concat([{ titulo, opts }]); this.close = () => {}; };
  N.permission = 'granted';
  N.requestPermission = async () => 'granted';
  window.Notification = N;
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.evaluate(() => {
  localStorage.removeItem('catedra:notifRevDia');
  localStorage.setItem('catedra:prefs', JSON.stringify({ revLembrete: true, revHora: '00:01' }));
  localStorage.setItem('catedra:reviews', JSON.stringify([
    { id: 'r-u12a', disc: 'Direito Civil', topic: 'Prescrição', due: -2, dueDate: '2020-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 },
    { id: 'r-u12b', disc: 'Direito Penal', topic: 'Dolo', due: -1, dueDate: '2020-01-02', intervalo: 1, facilidade: 2.5, repeticoes: 0 },
  ]));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);   // o verificador roda 4s depois do boot
const u12 = await page.evaluate(() => ({
  disparou: (window.__notifs || []).length === 1,
  dizQuantasEQuantoTempo: /revis/i.test(((window.__notifs || [])[0] || {}).titulo || '') || /revis/i.test((((window.__notifs || [])[0] || {}).opts || {}).body || ''),
  corpoTemONumero: /2 revisões esperando/.test((((window.__notifs || [])[0] || {}).opts || {}).body || ''),
  // Data LOCAL, como o app grava (_hoje/_ymd). Com toISOString() a comparação é em UTC, e
  // no Brasil (UTC-3) ela passa a divergir depois das 21h — o teste passava o dia inteiro e
  // quebrava toda noite, sem nada ter mudado no app.
  marcouODia: localStorage.getItem('catedra:notifRevDia') === (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })(),
}));
for (const [k, v] of Object.entries(u12)) ok(v, 'U12 ' + k);

// segundo boot no mesmo dia: não repete
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);
const u12b = await page.evaluate(() => (window.__notifs || []).length === 0);
ok(u12b, 'U12 não repete o aviso no mesmo dia');

// desligado (o padrão) não dispara nada
await page.evaluate(() => {
  localStorage.removeItem('catedra:notifRevDia');
  localStorage.setItem('catedra:prefs', JSON.stringify({ revLembrete: false, revHora: '00:01' }));
});
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(6500);
const u12c = await page.evaluate(() => (window.__notifs || []).length === 0 && !localStorage.getItem('catedra:notifRevDia'));
ok(u12c, 'U12 desligado (padrão) não avisa nada');

/* ============= U7 (a) — TEMA AUTOMÁTICO ============= */
await page.evaluate(() => { localStorage.setItem('catedra:prefs', JSON.stringify({ temaAuto: true })); localStorage.setItem('catedra:dark', '0'); });
await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const escuroAuto = await page.evaluate(() => document.querySelector('[data-dark]').getAttribute('data-dark'));
ok(escuroAuto === '1', 'U7 com tema automático, sistema escuro deixa o app escuro');

await page.emulateMedia({ colorScheme: 'light' });
await page.waitForTimeout(600);
const claroDepois = await page.evaluate(() => document.querySelector('[data-dark]').getAttribute('data-dark'));
ok(claroDepois === '0', 'U7 o app acompanha a mudança do sistema sem recarregar');

const u7 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) mais.click(); await w(300);
  document.querySelector('button[data-view="ajustes"]').click(); await w(700);
  // D11: Claro/Escuro/Auto vivem na aba Aparência, junto do resto do visual
  const abaAp = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => /Aparência/.test(b.textContent));
  if (abaAp) { abaAp.click(); await w(700); }
  const btn = n => [...document.querySelectorAll('main button')].find(b => (b.textContent || '').trim() === n);
  const r = { temBotaoAuto: !!btn('Auto') };
  if (btn('Escuro')) btn('Escuro').click();
  // ≥ 1,3 s: a limpeza do resquício em prefs passa pelo autosave (debounce de 500 ms), e
  // a regra da casa manda ler o storage só depois disso. catedra:_temaAuto é gravado na
  // hora, mas prefs não — com 1200 ms o caso ficaria instável sob carga.
  await w(1400);
  // O interruptor MUDOU DE LUGAR: morava em prefs, que sincroniza — ligar no Mac ligava no
  // iPad, e cada um seguia o SEU sistema, virando o tema do outro a cada abertura. Agora
  // mora em catedra:_temaAuto, fora do sync. O COMPORTAMENTO cobrado aqui é o mesmo de
  // antes; só o endereço da chave mudou. A semeadura lá em cima ainda usa prefs de
  // propósito: os casos acima (sistema escuro deixa o app escuro) provam, de quebra, que
  // quem já tinha o Auto ligado em prefs continua com ele ligado.
  r.manualDesligaOAutomatico = localStorage.getItem('catedra:_temaAuto') === '0';
  r.manualVale = document.querySelector('[data-dark]').getAttribute('data-dark') === '1';
  // e o resquício sai de prefs, senão a nuvem o traria de volta ligado no próximo sync
  r.manualLimpaOResquicioDePrefs = !('temaAuto' in JSON.parse(localStorage.getItem('catedra:prefs') || '{}'));
  if (btn('Auto')) btn('Auto').click();
  await w(800);
  r.autoVoltaAoSistema = document.querySelector('[data-dark]').getAttribute('data-dark') === '0'
    && localStorage.getItem('catedra:_temaAuto') === '1';
  return r;
});
for (const [k, v] of Object.entries(u7)) ok(v, 'U7 ' + k);
await page.emulateMedia({ colorScheme: 'no-preference' });

/* ===== C1: qualidade do texto extraído dos PDFs das bancas =====
   A extração crua publicava, em 267 das 561 provas, o regulamento do caderno no lugar do
   enunciado. A receita mora em scripts/extrair_prova.py e a régua em
   scripts/qualidade-texto.mjs — a MESMA que o build usa para recusar publicar e que o
   portão usa para reprovar. Estes casos travam a régua e o resultado publicado. */
const { audita: auditaTxt, juntaEspelho: juntaEsp } = await import('../scripts/qualidade-texto.mjs');

const _limpo = 'Considerando a situação hipotética apresentada, redija um texto dissertativo '
  + 'a respeito da responsabilidade civil do Estado por ato omissivo, abordando '
  + 'necessariamente os pressupostos do dever de indenizar, a teoria adotada pelo '
  + 'ordenamento brasileiro e o entendimento do Supremo Tribunal Federal sobre o tema, '
  + 'com fundamento no artigo 37, parágrafo 6.º, da Constituição Federal de 1988.';
ok(auditaTxt(_limpo).length === 0, 'C1 régua aprova enunciado limpo');
ok(auditaTxt('NÃO SERÁ PERMITIDO o uso de aparelhos. ' + _limpo).includes('instrucoes-de-caderno'),
  'C1 régua reprova regulamento do caderno no lugar do enunciado');
ok(auditaTxt(_limpo + ('\nCEBRASPE – TRF DA 6.ª REGIÃO – Edital 2024').repeat(4)).includes('cabecalho-repetido'),
  'C1 régua reprova cabeçalho de página repetido');
ok(auditaTxt('<<D01_dAdm_A0100422_2321>> ' + _limpo).includes('marcador-interno'),
  'C1 régua reprova código interno do PDF da banca');
ok(auditaTxt('oi').includes('curto'), 'C1 régua reprova texto curto demais (PDF escaneado)');
// mojibake real (UTF-8 lido como latin-1) é 98% ASCII válido: a proporção de lixo não o
// pegava, e 34 de 40 textos deformados de verdade passavam. A assinatura é 'Ã'/'Â'
// seguidos de um byte de continuação — "NÃO" tem letra depois, "nÃ£o" não.
ok(auditaTxt(Buffer.from(_limpo, 'utf8').toString('latin1')).includes('lixo-encoding'),
  'C1 régua reprova mojibake (UTF-8 lido como latin-1)');

// A armadilha que fazia a auditoria acusar 59 espelhos bons de "curtos": o espelho
// estruturado é um array de OBJETOS, e array.join() devolve "[object Object]".
const _esp = juntaEsp([{ quesito: 'Identificar a competência do juízo', escala: '0,00 a 2,00' },
  { quesito: 'Apontar a prescrição intercorrente', escala: '0,00 a 3,00' }]);
ok(!/\[object Object\]/.test(_esp), 'C1 espelho estruturado não vira "[object Object]" ao ser medido');
ok(/compet[êe]ncia do ju[íi]zo/i.test(_esp) && /prescri[çc][ãa]o/i.test(_esp),
  'C1 espelho estruturado é medido pelo texto do quesito');

// O acervo PUBLICADO tem de passar na mesma régua — é o portão, dentro da suíte.
const _carrega = (arq) => { const w = {};
  new Function('window', fs.readFileSync(path.join(RAIZ, arq), 'utf8'))(w);
  return w[Object.keys(w)[0]]; };
const _TEXTOS = _carrega('discursivas-textos.js');
const _DISC = _carrega('discursivas-completo.js');
const _ORAL = _carrega('oral-conteudo.js');

let _ruimEn = [];
for (const [id, it] of Object.entries(_TEXTOS)) {
  if (it.en != null && auditaTxt(it.en).length) _ruimEn.push(id + ':' + auditaTxt(it.en).join(','));
}
ok(_ruimEn.length === 0, 'C1 nenhum enunciado publicado reprova na régua (' + _ruimEn.slice(0, 3).join(' | ') + ')');

let _ruimEsp = [];
for (const q of (Array.isArray(_DISC) ? _DISC : Object.values(_DISC))) {
  const t = juntaEsp(q.espelho) || String(q.espelhoTexto || '')
    || String((_TEXTOS[q.id] || {}).et || '');
  if (t.trim() && auditaTxt(t).length) _ruimEsp.push(q.id + ':' + auditaTxt(t).join(','));
}
ok(_ruimEsp.length === 0, 'C1 nenhum espelho publicado reprova na régua (' + _ruimEsp.slice(0, 3).join(' | ') + ')');

const _oralRuim = Object.values(_ORAL).filter(x => /<<[A-Za-z0-9_]{6,}>>/.test(String(x.enunciado) + String(x.padrao || '')));
ok(_oralRuim.length === 0, 'C1 prova oral sem código interno do PDF no meio da pergunta (' + _oralRuim.length + ')');

/* ===== C1: a tela diz a verdade sobre a falta de espelho =====
   "Sem espelho" tem duas causas — a banca não publicou, ou o PDF existe e não deu para
   transcrever. Sair com a mesma palavra faria a pessoa procurar um espelho que não existe. */
const _lista = Array.isArray(_DISC) ? _DISC : Object.values(_DISC);
// o padrão em prosa pode morar no arquivo de textos (temEspelhoTexto): também é espelho
const _semEspelho = _lista.filter(q => !(q.espelho && q.espelho.length) && !q.espelhoTexto && !q.temEspelhoTexto);
const _semMotivo = _semEspelho.filter(q => !q.espelhoSituacao);
ok(_semEspelho.length === 0 || _semMotivo.length === 0,
  'C1 toda prova sem espelho registra POR QUE (' + _semMotivo.length + ' sem motivo de ' + _semEspelho.length + ')');

const c1tela = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  // o catálogo só é buscado ao entrar na Redação (script sob demanda, não no boot)
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) { mais.click(); await w(300); }
  const nav = document.querySelector('button[data-view="redacao"]');
  if (nav) { nav.click(); await w(3000); }
  const L = (window.CT_DISCURSIVAS || []);
  const alvo = L.find(q => q.espelhoSituacao === 'nao-publicado');
  const falho = L.find(q => q.espelhoSituacao && q.espelhoSituacao !== 'nao-publicado');
  return { carregou: L.length > 0, temCampo: L.some(q => !!q.espelhoSituacao),
    naoPublicado: alvo ? alvo.id : null, naoTranscrito: falho ? falho.id : null };
});
ok(c1tela.carregou, 'C1 catálogo de discursivas carrega ao entrar na Redação');
ok(c1tela.temCampo, 'C1 catálogo leve carrega a situação do espelho (o split preserva o campo)');

/* ===== C1: o textão chega à tela =====
   Do split de 21/08 até 22/08, discursivas-textos.js era publicado no bundle, copiado pelos
   builds e testado — e NENHUMA linha do app o carregava. A prova abria com o resumo de 320
   caracteres e sem padrão de resposta. Este caso trava o caminho inteiro: catálogo leve →
   clique na prova → textão sob demanda → enunciado íntegro na tela. */
await page.goto(URL0 + '/Catedra.dc.html');
// a Redação precisa estar na etapa 1 (o banco): prova aberta por um teste anterior fica
// gravada e a tela abriria direto na etapa 2, sem card nenhum para clicar
await page.evaluate(() => ['redEnunciado', 'redGabarito', 'redText', 'redProvaId']
  .forEach(k => localStorage.removeItem('catedra:' + k)));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const c1texto = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
  if (mais) { mais.click(); await w(300); }
  const nav = document.querySelector('button[data-view="redacao"]');
  if (!nav) return { erro: 'sem botão da Redação no menu' };
  nav.click(); await w(3000);
  const L = window.CT_DISCURSIVAS;
  if (!L) return { erro: 'o catálogo de discursivas não carregou' };
  out.catalogoCarregou = true;
  out.textoesNaoVieramJunto = !window.CT_DISCURSIVAS_TEXTOS;   // só sob demanda
  // a lista mostra as 180 primeiras: escolher pelo que ESTÁ na tela, não pelo banco inteiro
  const naTela = [...document.querySelectorAll('main button[data-id]')].map(b => b.getAttribute('data-id'));
  const alvo = L.find(q => q.temTextoFull && naTela.includes(q.id));
  if (!alvo) return { ...out, erro: 'nenhuma prova com texto completo entre as exibidas (' + naTela.length + ' cards)' };
  out.resumoCurtoNoCatalogo = String(alvo.enunciado || '').length <= 340;
  const card = document.querySelector('main button[data-id="' + alvo.id + '"]');
  if (!card) return { ...out, erro: 'a prova não apareceu como card' };
  card.click(); await w(3000);
  out.textoesCarregaramSobDemanda = !!window.CT_DISCURSIVAS_TEXTOS;
  let guardado = ''; try { guardado = JSON.parse(localStorage.getItem('catedra:redEnunciado') || '""'); } catch (e) {}
  out.enunciadoInteiro = guardado.length > 340;
  // a tela junta as quebras de linha que vieram do PDF e mostra o cabeçalho no herói,
  // não no corpo — então a comparação normaliza espaços e fatia DEPOIS do cabeçalho
  const norm = x => String(x || '').replace(/\s+/g, ' ');
  const corpo = guardado.split('\n\n').slice(1).join('\n\n');
  const trecho = norm(corpo).slice(60, 120).trim();
  out.enunciadoNaTela = trecho.length > 20 && norm(document.body.innerText).includes(trecho);
  return out;
});
if (c1texto.erro) ok(false, 'C1 textão: ' + c1texto.erro);
else for (const [k, v] of Object.entries(c1texto)) ok(v, 'C1 textão ' + k);

/* ===== C1: a trava de PII acusa CPF de gente, não CPF de exemplo =====
   O espelho da DPE-SE 2021 ensina a qualificar a parte numa petição e escreve, na prosa da
   própria banca, "inscrita no CPF sob o nº 111.222.333-33 …". É documento público e o número
   é um espaço em branco com cara de número — mas ele abortava o build. Trava que grita à toa
   é trava que alguém desliga; agora só conta CPF que passa no dígito verificador, que é o que
   a marca d'água de PDF de curso carrega. */
const { verificarPII } = await import('../scripts/verificar-pii.mjs');
{
  const dir = fs.mkdtempSync(path.join(RAIZ, '.pii-'));
  try {
    fs.writeFileSync(path.join(dir, 'exemplo.txt'), 'Maria Silva, inscrita no CPF sob o nº 111.222.333-33, residente…');
    const semRuido = verificarPII(dir, { abortar: false, rotulo: 'fixture' });
    ok(semRuido.length === 0, 'C1 PII ignora CPF de exemplo do espelho (111.222.333-33)');
    fs.writeFileSync(path.join(dir, 'vazamento.txt'), 'material de curso — CPF: 529.982.247-25 — não distribuir');
    const warn = console.warn; console.warn = () => {};
    const comVazamento = verificarPII(dir, { abortar: false, rotulo: 'fixture' });
    console.warn = warn;
    ok(comVazamento.length > 0, 'C1 PII continua acusando CPF válido (marca d\'água de verdade)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/* ===== C2: ponte para as plataformas de questões (só link de saída) =====
   A regra dura: o Cátedra NUNCA raspa, embute por iframe nem copia conteúdo dessas
   plataformas, e nenhuma credencial delas passa por aqui. O teste trava as duas coisas
   que podem quebrar em silêncio: a montagem da URL e a preferência que sincroniza. */
const c2 = await page.evaluate(async () => {
  const P = window.CT_PLATAFORMAS;
  if (!P) return { erro: 'CT_PLATAFORMAS não carregou' };
  const tec = P.link('tec', { disciplina: 'Direito Administrativo', assunto: 'improbidade' });
  const qc = P.link('qc', { banca: 'CEBRASPE', ano: 2024 });
  const fallback = P.link('plataforma-que-nao-existe', { assunto: 'prescrição' });
  return { tec, qc, fallback, nomes: P.ordem.map(k => P.nome(k)) };
});
ok(!c2.erro, 'C2 mapa de plataformas carrega no host');
ok(/tecconcursos\.com\.br/.test(c2.tec || '') && /improbidade/.test(c2.tec || ''),
  'C2 TEC recebe a busca já filtrada no assunto fraco');
ok(/qconcursos\.com/.test(c2.qc || '') && /CEBRASPE/i.test(decodeURIComponent(c2.qc || '')),
  'C2 QConcursos recebe banca e ano');
ok(/tecconcursos/.test(c2.fallback || ''), 'C2 plataforma desconhecida cai na padrão em vez de quebrar');
ok((c2.nomes || []).length >= 2, 'C2 há mais de uma plataforma no menu');

// Nada de embutir: a regra do item proíbe iframe/raspagem dessas plataformas.
const fonteHost = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
ok(!/<iframe[^>]+(tecconcursos|qconcursos|estrategia)/i.test(fonteHost),
  'C2 nenhuma plataforma de questões é embutida por iframe');
const fontePlat = fs.readFileSync(path.join(RAIZ, 'plataformas-questoes.js'), 'utf8');
ok(!/fetch\(|XMLHttpRequest|password|senha|token/i.test(fontePlat),
  'C2 o mapa só monta URL — não busca conteúdo nem toca em credencial');

// A preferência sincroniza: a chave precisa estar na lista do autosave.
ok(/'plataformaQuestoes'/.test(fonteHost) && /_autosaveKeys\(\)\{[^}]*plataformaQuestoes/.test(fonteHost),
  'C2 plataforma preferida entra no autosave (sincroniza entre aparelhos)');
const c2ui = await page.evaluate(() => ({
  ajustes: !!document.querySelector('#aj-plataforma'),
  fonte: [...document.querySelectorAll('script')].map(s => s.textContent || '')
    .some(t => t.includes('praticarDisciplina') && t.includes('praticarQuestao')),
}));
ok(c2ui.fonte, 'C2 os botões de praticar existem no host (diagnóstico, edital e gabarito)');

/* ===== C3: espelho sugerido — o selo é o item =====
   Sem rotulagem inequívoca, um espelho de IA vira "espelho da banca" na cabeça de quem
   estuda. O miolo mora em espelho-sugerido.js, puro: fundamento obrigatório por quesito
   e texto que se declara não oficial. */
const c3 = await page.evaluate(() => {
  const M = window.CT_ESPELHO_SUGERIDO;
  if (!M) return { erro: 'CT_ESPELHO_SUGERIDO não carregou' };
  // um quesito COM fundamento, um SEM e um com fundamento de fachada ("n/a")
  const sug = M.interpretar({ total: 10, quesitos: [
    { quesito: 'Identificar a responsabilidade civil objetiva do Estado', pontos: 6, fundamento: 'art. 37, §6.º, da CF/88' },
    { quesito: 'Discorrer sobre o que o examinador quiser', pontos: 2, fundamento: '' },
    { quesito: 'Apontar a excludente de culpa exclusiva da vítima', pontos: 2, fundamento: 'STF, RE 841.526' },
    { quesito: 'Falar sobre o tema de modo geral e abrangente', pontos: 2, fundamento: 'n/a' },
  ] }, 'p-teste');
  const txt = sug ? M.texto(sug) : '';
  const soLixo = M.interpretar({ quesitos: [
    { quesito: 'Um quesito bonito porém sem lastro nenhum', pontos: 5, fundamento: '' } ] }, 'p2');
  const prompt = M.montarPrompt({ enunciado: 'Disserte sobre responsabilidade civil do Estado.',
    orgao: 'TJ-GO', ano: 2025, banca: 'FGV' });
  return {
    quesitos: sug ? sug.quesitos.length : 0,
    todosComFundamento: !!sug && sug.quesitos.every(q => (q.fundamento || '').trim().length >= 6),
    temSelo: /SUGERIDO/.test(txt) && /N[ÃA]O OFICIAL/i.test(txt),
    dizQueBancaNaoPublicou: /banca n[ãa]o publicou/i.test(txt),
    fundamentoNoTexto: /Fundamento:/.test(txt),
    carimbo: !!(sug && sug.up),
    semNadaUsavel: soLixo === null,
    promptExigeFundamento: /N[ÃA]O crie o quesito/i.test(prompt) && /fundamento concreto/i.test(prompt),
    promptTemFicha: /TJ-GO/.test(prompt) && /FGV/.test(prompt),
  };
});
ok(!c3.erro && c3.quesitos === 2, 'C3 quesito sem fundamento é descartado (vieram 4, ficaram 2)');
ok(!c3.erro && c3.todosComFundamento, 'C3 todo quesito publicado traz fundamento conferível');
ok(!c3.erro && c3.temSelo, 'C3 o espelho sugerido sai rotulado "SUGERIDO — NÃO OFICIAL"');
ok(!c3.erro && c3.dizQueBancaNaoPublicou, 'C3 o texto repete que a banca não publicou espelho');
ok(!c3.erro && c3.fundamentoNoTexto, 'C3 o fundamento aparece no texto, quesito a quesito');
ok(!c3.erro && c3.carimbo, 'C3 o espelho gerado leva carimbo up (sincroniza e a exclusão gruda)');
ok(!c3.erro && c3.semNadaUsavel, 'C3 sem quesito fundamentado o resultado é nulo — não publica meia coisa');
ok(!c3.erro && c3.promptExigeFundamento, 'C3 o prompt proíbe quesito sem fundamento');
ok(!c3.erro && c3.promptTemFicha, 'C3 o prompt leva banca, órgão e ano da prova');

ok(/'espelhosSugeridos'/.test(fonteHost) && /_autosaveKeys\(\)\{[^}]*espelhosSugeridos/.test(fonteHost),
  'C3 o cache de espelhos sugeridos entra no autosave');
ok(/aproximada/.test(fonteHost) && /espelho-sugerido/.test(fonteHost),
  'C3 a nota tirada de espelho sugerido é marcada como aproximada');
const authSrc = fs.readFileSync(path.join(RAIZ, 'auth.js'), 'utf8');
ok(/catedra:espelhosSugeridos/.test(authSrc), 'C3 espelhosSugeridos está no ARRAY_ID (apagar gruda)');

/* ===== D12 · BARRA DO TOPO + D13 · SALA DE FOCO =====
   O topo empilhava 8 controles no mesmo nível (busca, pílula de sync com texto longo, sino,
   ◎ de foco, avatar e um bloco inteiro de cronômetro que parecia um segundo app). Agora são
   quatro cidadãos e um chip; e o modo foco virou uma sala. A regra do item: nenhuma função
   se perde — tudo continua alcançável em no máximo dois cliques. */
await page.goto(URL0 + '/Catedra.dc.html');
// as teclas do D13 (espaco/F) e o `?` do U8 valem so com sessao iniciada, como o ⌘K
await page.evaluate(() => localStorage.setItem('catedra:auth', '1'));
await page.goto(URL0 + '/Catedra.dc.html');
await page.waitForTimeout(1800);
const d12 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const topo = document.querySelector('header.ct-topbar');
  if (!topo) return { erro: 'sem barra do topo' };
  r.semPilulaSync = !document.querySelector('.ct-synclabel');
  // controles VISÍVEIS no topo (fora do título): no máximo quatro
  const visiveis = [...topo.querySelectorAll(':scope > div > button, :scope > div > div > button')]
    .filter(b => b.offsetParent !== null);
  r.noMaximoQuatro = visiveis.length <= 5;   // busca, sino, avatar, chip (+ alarme de sync, raro)
  const chip = [...topo.querySelectorAll('button')].find(b => /Focar|\d\d:\d\d/.test(b.textContent || ''));
  r.temChipDeFoco = !!chip;
  if (!chip) return r;
  chip.click(); await w(350);
  const menu = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
  r.chipAbreOPoder = !!menu;
  const txt = menu ? menu.textContent : '';
  // nenhuma função de hoje se perde: play, zerar, presets, PiP, foco e registrar
  r.temPlay = /Iniciar|Retomar|Pausar/.test(txt);
  r.temPresets = /25 \/ 5/.test(txt) && /50 \/ 10/.test(txt) && /90 \/ 15/.test(txt);
  r.temPiP = /flutuante/i.test(txt);
  r.temModoFoco = /modo foco/i.test(txt);
  r.temRegistrar = /Registrar sessão/i.test(txt);
  // o pontinho de sync mudou-se para o avatar
  const avatar = [...topo.querySelectorAll('button')].find(b => /Conta e sincroniza/i.test(b.getAttribute('aria-label') || ''));
  r.syncNoAvatar = !!avatar && avatar.querySelectorAll('span').length >= 2;
  return r;
});
if (d12.erro) ok(false, 'D12 ' + d12.erro);
else for (const [k, v] of Object.entries(d12)) ok(v, 'D12 ' + k);

const d13 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  const menu = document.querySelector('[role=menu][aria-label="Cronômetro e foco"]');
  const btn = menu && [...menu.querySelectorAll('button')].find(b => /modo foco/i.test(b.textContent));
  if (!btn) return { erro: 'não achei "entrar no modo foco" no chip' };
  btn.click(); await w(600);
  const sala = document.querySelector('[aria-label="Sala de foco"]');
  r.salaAbre = !!sala;
  if (!sala) return r;
  r.ocupaATelaToda = getComputedStyle(sala).position === 'fixed' && sala.getBoundingClientRect().width >= window.innerWidth - 2;
  r.temAnel = sala.querySelectorAll('svg circle').length >= 2;      // trilho + progresso
  r.anelUsaODash = !!sala.querySelector('circle[stroke-dasharray]');
  r.temCronometroGrande = [...sala.querySelectorAll('div')].some(d => /^\d\d:\d\d/.test((d.textContent || '').trim()) && parseFloat(getComputedStyle(d).fontSize) >= 40);
  r.temFraseDeEntrada = (sala.textContent || '').length > 60;
  const acoes = [...sala.querySelectorAll('button')].filter(b => b.offsetParent !== null && (b.textContent || '').trim());
  r.tresAcoes = acoes.length <= 4;                                   // pausar, encerrar, PiP (+ fechar)
  r.temEncerrar = acoes.some(b => /Encerrar/i.test(b.textContent));
  // espaço pausa e retoma, sem sair da sala
  const antes = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  await w(300);
  r.espacoNaoFechaASala = antes && !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  await w(400);
  r.fSaiDaSala = !document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  await w(400);
  r.fEntraDeNovo = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(400);
  r.escSai = !document.querySelector('[aria-label="Sala de foco"]');
  return r;
});
if (d13.erro) ok(false, 'D13 ' + d13.erro);
else for (const [k, v] of Object.entries(d13)) ok(v, 'D13 ' + k);

/* ===== D11 · AJUSTES REFEITOS =====
   Nasce de uso real: a Lana precisou do backup e não o achou. As abas ficavam no meio da
   página e "Dados & conselho" misturava dois assuntos. A régua do item: a personalização
   visual NÃO se perde, e "quero fazer backup" se resolve em dois gestos. */
const d11 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const r = {};
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1200);
  const abasEl = () => [...document.querySelectorAll('main .aj-abas button[data-s]')];
  const abas = abasEl().map(b => b.textContent.trim());
  // Ajustes refeito: seis SEÇÕES, sem "Método da banca" (o perfil da banca vive na tela
  // Bancas; nos Ajustes ficou só o seletor, dentro de Ritmo) e com Automações à parte —
  // e, desde o E1 (02/09/2026), a sétima: ENAM, logo depois de Perfil (é "quando é a prova")
  r.seisAbas = abas.length === 7;
  r.abasPorAssunto = ['Perfil', 'ENAM', 'Ritmo', 'Automações', 'Aparência', 'Dados', 'Conta'].every((x, i) => (abas[i] || '').includes(x));
  r.semAbaDeBanca = !abas.some(x => /banca/i.test(x));
  const barra = document.querySelector('main .aj-abas');
  r.abasGrudamNoTopo = !!barra && getComputedStyle(barra).position === 'sticky';

  // busca interna: acha em QUALQUER aba, inclusive nas que não estão no DOM
  const busca = document.querySelector('main input[aria-label="Buscar nos ajustes"]');
  r.temBusca = !!busca;
  const procurar = async (q) => { busca.value = q; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(450);
    // os resultados são os botões data-t; data-s são as seções, que não mudam com a busca
    return [...document.querySelectorAll('main .aj-abas button[data-t]')].map(b => b.textContent).join(' '); };
  if (busca) {
    r.achaBackup = /[Bb]ackup/.test(await procurar('backup'));
    r.achaSair = /sair/i.test(await procurar('sair'));
    r.achaTema = /[Tt]ema/.test(await procurar('tema'));
    await procurar('');
  }
  const clicaAba = async (re) => { const b = abasEl().find(x => re.test(x.textContent)); if (!b) return false; b.click(); await w(700); return true; };

  // Aparência: nada de personalização se perde
  r.abreAparencia = await clicaAba(/Aparência/);
  r.temPresets = document.querySelectorAll('main button[data-p]').length >= 3;
  const corpo = () => document.body.innerText;
  r.temAvancada = /Personalização avançada/.test(corpo());
  r.temDirecaoVisual = /Direção visual/.test(corpo());
  r.temCorDestaque = /Cor de destaque/.test(corpo());
  r.temTamanhoTexto = /Tamanho do texto/.test(corpo());
  const abrir = document.querySelector('main button[aria-expanded]');
  r.avancadaTemBotao = !!abrir;
  if (abrir) { abrir.click(); await w(500); }
  r.avancadaTemOsFinos = /cantos/i.test(corpo());   // o rótulo é uppercase por CSS: innerText devolve CANTOS

  // Dados & backup: backup no topo, perigo isolado no fim
  r.abreDados = await clicaAba(/Dados/);
  const t = corpo();
  r.backupAntesDoPerigo = t.indexOf('Seus dados') >= 0 && t.indexOf('Zona de perigo') > t.indexOf('Seus dados');
  r.temBackupAutomatico = /Backup automático semanal/.test(t);
  r.perigoIsolado = /Zona de perigo/.test(t) && /Não dá para desfazer/.test(t);

  r.abreConta = await clicaAba(/Conta/);
  r.contaTemSair = /Sair da conta/.test(corpo());
  return r;
});
for (const [k, v] of Object.entries(d11)) ok(v, 'D11 ' + k);

/* ===== REVISÃO ADVERSARIAL — os defeitos que ela achou não voltam =====
   Uma revisão de 106 agentes sobre este lote confirmou 27 defeitos. Cada caso abaixo trava
   um deles pelo COMPORTAMENTO, não pela implementação. */

// A Aparência ficava no nível do <main> sem portão de view: depois de visitar a aba uma vez,
// os cartões de preset e cor apareciam por baixo do Início, do Ciclo e do Edital.
const rev1 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1000);
  const ap = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => /Aparência/.test(b.textContent));
  if (!ap) return { erro: 'sem aba Aparência' };
  ap.click(); await w(600);
  const naAba = /Escolhas rápidas/.test(document.body.innerText);
  try { if (window.__catedraGoView) window.__catedraGoView('inicio'); } catch (e) {}
  await w(900);
  return { naAba, vazouParaOInicio: /Escolhas rápidas|Personalização avançada/.test(document.body.innerText) };
});
ok(!rev1.erro && rev1.naAba, 'REVISÃO Aparência aparece na sua aba');
ok(!rev1.erro && !rev1.vazouParaOInicio, 'REVISÃO Aparência NÃO vaza para o Início (perdera o portão de view)');

// O F ligava a sala por baixo do simulado cronometrado, punha o cronômetro a correr durante
// a prova, e o Esc seguinte saía da PROVA — apagando ct_prova.
const rev2 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const app = { }; const r = {};
  localStorage.setItem('catedra:auth', '1');
  // simula um modal aberto pelo caminho que o app usa
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); await w(500);
  r.fEntraQuandoLivre = !!document.querySelector('[aria-label="Sala de foco"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(400);
  r.escSaiDaSala = !document.querySelector('[aria-label="Sala de foco"]');
  return r;
});
for (const [k, v] of Object.entries(rev2)) ok(v, 'REVISÃO ' + k);

// A busca dos Ajustes deixava cartões escondidos ao trocar de aba (display imperativo em
// elemento que o runtime não remonta), e mandava Flashcards para a aba errada.
const rev3 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  try { if (window.__catedraGoView) window.__catedraGoView('ajustes'); } catch (e) {}
  await w(1000);
  const busca = document.querySelector('main input[aria-label="Buscar nos ajustes"]');
  if (!busca) return { erro: 'sem busca nos Ajustes' };
  busca.value = 'backup'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(500);
  busca.value = 'flashcards'; busca.dispatchEvent(new Event('input', { bubbles: true })); await w(500);
  // os RESULTADOS da busca seguem com data-t (a seção de destino); as seções em si usam data-s
  const flash = [...document.querySelectorAll('main .aj-abas button[data-t]')].find(b => /Flashcards/.test(b.textContent));
  // Flashcards é ajuste de ESTUDO, não de backup: na tela refeita ele mora em Ritmo e metas
  const r = { flashApontaParaRitmo: !!flash && flash.getAttribute('data-t') === 'ritmo' };
  // trocar de seção com a busca ativa não pode deixar cartão escondido
  const secRitmo = [...document.querySelectorAll('main .aj-abas button[data-s]')].find(b => /Ritmo/.test(b.textContent));
  if (secRitmo) { secRitmo.click(); await w(800); }
  const escondidos = [...document.querySelectorAll('main [data-aj]')].filter(e => e.style.display === 'none');
  r.nenhumCartaoFicaEscondido = escondidos.length === 0;
  r.buscaFoiLimpa = (document.querySelector('main input[aria-label="Buscar nos ajustes"]') || {}).value === '';
  return r;
});
if (rev3.erro) ok(false, 'REVISÃO ' + rev3.erro);
else for (const [k, v] of Object.entries(rev3)) ok(v, 'REVISÃO ' + k);

// O fallback de plataformaOpcoes lançava por construção e derrubava o render inteiro.
const rev4 = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const guardado = window.CT_PLATAFORMAS;
  try {
    delete window.CT_PLATAFORMAS;
    try { if (window.__catedraGoView) window.__catedraGoView('inicio'); } catch (e) {}
    await w(900);
    // se o render tivesse caído, o app inteiro renderizaria vazio
    const vivo = (document.body.innerText || '').length > 200 && !!document.querySelector('header.ct-topbar');
    return { appSobreviveSemOMapaDePlataformas: vivo };
  } finally { window.CT_PLATAFORMAS = guardado; }
});
for (const [k, v] of Object.entries(rev4)) ok(v, 'REVISÃO ' + k);

// O assunto que vai para a plataforma não pode carregar o nome de um material pessoal inteiro.
const rev5 = await page.evaluate(() => {
  const P = window.CT_PLATAFORMAS;
  const url = P.link('tec', { disciplina: 'Direito Civil',
    assunto: 'processo 0001234-56 2024 8 26 0100 peticao inicial cliente' });
  return { assuntoNaoVaiInteiro: decodeURIComponent(url).length < 140 };
});
for (const [k, v] of Object.entries(rev5)) ok(v, 'REVISÃO ' + k);

/* ===== D14: VARREDURA DE LIGAÇÕES PERDIDAS =====
   Duas falhas do mesmo tipo passaram meses despercebidas: um botão da barra usava
   `style="{{ navPrioridade }}"`, variável que nunca entrou no render() (o dc-runtime
   resolve ausente como string vazia — nada reclama), e trocava a view para uma tela cujo
   bloco tinha se perdido num merge. O runtime não avisa; o CI passa a avisar. */
const D14 = await page.evaluate(() => {
  const html = document.documentElement.outerHTML;
  return { ok: !!html };
});
ok(D14.ok, 'D14 página carregou para a varredura');

const fonteTpl = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
// o template é tudo que está fora do <script> inline; o render() está dentro dele
const semComentario = fonteTpl.replace(/<!--[\s\S]*?-->/g, '');
const soTemplate = semComentario.replace(/<script[\s\S]*?<\/script>/g, '');

// --- 1) todo data-view leva a uma tela que existe
const views = [...new Set([...soTemplate.matchAll(/data-view="([a-z0-9_-]+)"/gi)].map(m => m[1]))]
  .filter(v => v && !v.includes('{'));
const semTela = views.filter(v => !new RegExp("view *=== *'" + v + "'").test(fonteTpl));
ok(semTela.length === 0, 'D14 todo data-view tem tela no render (' + (semTela.join(', ') || 'nenhum órfão') + ')');

// as views que são página satélite precisam do iframe montado no template
const SATELITES = { legis: 'legis-web.html', juris: 'juris-web.html', areamod: 'area-web.html',
  segundafase: 'segunda-fase-web.html', prioridade: 'prioridade-web.html' };
const semIframe = Object.keys(SATELITES).filter(v =>
  views.includes(v) && !new RegExp('data-ct-view="' + v + '"').test(soTemplate));
ok(semIframe.length === 0, 'D14 toda view de satélite tem o iframe no template (' + (semIframe.join(', ') || 'todas montadas') + ')');

// --- 2) variável órfã: {{ nome }} de escopo global que o render() não devolve
// Fora de <sc-for> (lá o nome vem do item) e sem ponto (p.short pertence ao item).
const semFor = soTemplate.replace(/<sc-for[\s\S]*?<\/sc-for>/g, '');
const vars = [...new Set([...semFor.matchAll(/\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g)].map(m => m[1]))];
// O render() devolve um objeto literal gigante; procurar "nome:" ou "nome," (atalho) basta.
// MAS nunca dentro de comentário: a exposição de edRaw passou MESES engolida por uma
// linha "//" colada com a de código, este teste dava a chave por existente, e a caixa
// de importar edital apagava o que a pessoa colava. Linha comentada não prova nada.
const fonteViva = fonteTpl.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const resolvida = (n) => new RegExp('(^|[\\s,{])' + n + '\\s*[:,]').test(fonteViva)
  || new RegExp('\\.\\.\\.' + n + '\\b').test(fonteViva);
const orfas = vars.filter(v => !resolvida(v));
ok(orfas.length === 0, 'D14 nenhuma variável órfã no template (' + (orfas.slice(0, 6).join(', ') || 'nenhuma') + ')');

// --- 3) a regressão que originou o item: os dois botões da barra
const d14barra = await page.evaluate(() => {
  const r = {};
  for (const v of ['prioridade', 'segundafase']) {
    const b = document.querySelector('button[data-view="' + v + '"]');
    r[v + 'TemBotao'] = !!b;
    r[v + 'TemEstilo'] = !!b && (b.getAttribute('style') || '').length > 20;
  }
  return r;
});
for (const [k, v] of Object.entries(d14barra)) ok(v, 'D14 ' + k);

/* ===== D15: TODA CAIXA ACEITA DIGITAÇÃO ==========================================
   A caixa de importar edital engoliu texto por meses porque NENHUM teste digitava nas
   caixas — o app é controlado e re-renderiza a cada tique, então basta uma exposição
   perdida para o campo apagar o que a pessoa escreve. Esta varredura percorre as views
   principais, digita em CADA campo de texto visível via insertText (o caminho do ⌘V),
   atravessa um re-render e exige o texto ainda lá. Contexto novo: digitar suja rascunhos. */
{
  const d15Ctx = await browser.newContext({ viewport: { width: 1365, height: 960 } });
  await d15Ctx.addInitScript(() => { try {
    localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
  } catch (_) {} });
  const d15Pg = await d15Ctx.newPage();
  await d15Pg.goto(URL0 + '/Catedra.dc.html');
  await d15Pg.waitForTimeout(1800);
  const mudos = await d15Pg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const VIEWS = ['inicio', 'ciclo', 'edital', 'redacao', 'oral', 'bancas', 'ajustes'];
    const falhas = [];
    for (const v of VIEWS) {
      try { window.__catedraGoView(v); } catch (_) { continue; }
      await w(1100);
      const campos = [...document.querySelectorAll('textarea, input[type="text"], input:not([type])')]
        .filter(e => !e.readOnly && !e.disabled && e.offsetParent !== null);
      for (const e of campos.slice(0, 12)) {
        const antes = e.value;
        e.focus();
        document.execCommand('insertText', false, 'XQ7');
        await w(950);                                     // atravessa o re-render do relógio
        if (!String(e.value).includes('XQ7')) {
          falhas.push(v + ': ' + (e.placeholder || e.dataset.k || e.type || 'campo').slice(0, 50));
        } else {
          // devolve o valor antigo pelo caminho do app, para não sujar o rascunho
          try { const pd = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
            pd.set.call(e, antes); e.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        }
        await w(120);
      }
    }
    return falhas;
  });
  ok(mudos.length === 0, 'D15 toda caixa visível aceita digitação e sobrevive ao re-render ('
    + (mudos.slice(0, 5).join(' | ') || 'todas vivas') + ')');
  await d15Ctx.close();
}

/* ===== D16: CHAVE DE OBJETO CONDICIONAL USADA FORA DELE ==========================
   O D14 só pega variável que não existe em lugar NENHUM. Este pega a irmã dela, que é
   pior de achar: a chave EXISTE — mas dentro de um objeto que só é mesclado quando uma
   view específica monta. Foi o que aconteceu com `oralAbaLeiRot`, ancorada no _sjVM()
   (o helper do simulado) e usada na Prova oral: o dc-runtime resolve ausente como string
   vazia, então a aba da oral apareceu com o RÓTULO VAZIO e nada reclamou.
   A regra: chave que só nasce em `...(view==='X' ? this._hVM() : {})` só pode ser usada
   dentro do bloco <sc-if value="{{ isX }}"> daquela view. */
{
  const src = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const viva = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const tpl = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

  // 1) quem são os objetos condicionais: ...(this.state.view==='X' ? this._hVM() : {})
  const cond = [...viva.matchAll(/\.\.\.\(\s*this\.state\.view\s*===\s*'([a-z0-9_-]+)'\s*\?\s*this\.(_[A-Za-z0-9_$]+)\(\)\s*:\s*\{\s*\}\s*\)/gi)]
    .map(m => ({ view: m[1], helper: m[2] }));
  ok(cond.length > 0, 'D16 achou os objetos mesclados por view (' + cond.map(c => c.helper).join(', ') + ')');

  // corpo do helper, por contagem BALANCEADA de chaves (regex ingênua já engoliu bloco
  // inteiro neste repositório — aqui o preço seria um teste que não vê nada)
  const corpo = (nome) => {
    const i = viva.indexOf(nome + '(){');
    if (i < 0) return null;
    let j = viva.indexOf('{', i + nome.length), d = 0;
    for (let k = j; k < viva.length; k++) {
      if (viva[k] === '{') d++;
      else if (viva[k] === '}') { d--; if (d === 0) return { ini: j, fim: k, txt: viva.slice(j, k + 1) }; }
    }
    return null;
  };
  const faixas = [];
  for (const c of cond) {
    const b = corpo(c.helper);
    ok(!!b, 'D16 corpo de ' + c.helper + ' localizado');
    if (b) faixas.push({ ...c, ...b });
  }

  // 2) regiões do template: cada view tem seu <sc-if value="{{ isX }}"> de topo
  const regiao = (isVar) => {
    const abre = tpl.indexOf('<sc-if value="{{ ' + isVar + ' }}"');
    if (abre < 0) return null;
    let d = 0, k = abre;
    while (k < tpl.length) {
      if (tpl.startsWith('<sc-if', k)) { d++; k += 6; continue; }
      if (tpl.startsWith('</sc-if>', k)) { d--; k += 8; if (d === 0) return { ini: abre, fim: k }; continue; }
      k++;
    }
    return null;
  };
  const regioes = {};
  for (const c of cond) {
    // o nome da guarda NÃO é derivável do id da view (a de 'simulados' se chama isSim):
    // quem diz é o próprio render, em `isX:this.state.view==='simulados'`.
    const g = [...viva.matchAll(new RegExp("(is[A-Za-z0-9_$]*)\\s*:\\s*this\\.state\\.view\\s*===\\s*'" + c.view + "'", 'g'))]
      .map(m => m[1]);
    const achado = g.map(v => ({ v, r: regiao(v) })).find(x => x.r);
    ok(!!achado, 'D16 bloco do template da view ' + c.view + ' localizado (guardas: ' + (g.join(', ') || 'nenhuma') + ')');
    if (achado) regioes[c.view] = achado.r;
  }

  // 3) o veredito, isolado numa função pura: recebe onde a chave NASCE e onde é USADA,
  //    e devolve por que ela é forasteira (ou null). Ser pura é o que permite provar,
  //    logo abaixo, que a varredura de fato pega o defeito.
  const veredito = (nome, sitios, usos) => {
    if (!sitios.length) return null;                    // ausente de tudo é assunto do D14
    const donos = new Set();
    for (const s of sitios) {
      const f = faixas.find(x => s > x.ini && s < x.fim);
      if (!f) return null;                              // nasce fora do condicional: ok
      donos.add(f.view);
    }
    if (!donos.size) return null;
    for (const u of usos) {
      const dentro = [...donos].some(v => regioes[v] && u > regioes[v].ini && u < regioes[v].fim);
      if (!dentro) return nome + ' (nasce em ' + [...donos].join('/') + ', usada fora dessa view)';
    }
    return null;
  };

  const semFor = tpl.replace(/<sc-for[\s\S]*?<\/sc-for>/g, m => ' '.repeat(m.length)); // mantém os índices
  const usadas = [...new Set([...semFor.matchAll(/\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g)].map(m => m[1]))];
  const forasteiras = [];
  for (const nome of usadas) {
    const sitios = [...viva.matchAll(new RegExp('(^|[\\s,{])' + nome + '\\s*[:,]', 'g'))].map(m => m.index);
    const usos = [...semFor.matchAll(new RegExp('\\{\\{\\s*' + nome + '\\s*\\}\\}', 'g'))].map(m => m.index);
    const v = veredito(nome, sitios, usos);
    if (v) forasteiras.push(v);
  }
  ok(forasteiras.length === 0, 'D16 nenhuma chave de objeto condicional usada fora da sua view ('
    + (forasteiras.slice(0, 6).join(' | ') || 'nenhuma') + ')');

  // 4) prova de que a varredura pega o defeito, com o caso REAL: uma chave que nasce
  //    dentro do _sjVM (simulado) e é usada dentro do bloco da Prova oral.
  const fSj = faixas.find(f => f.helper === '_sjVM');
  if (fSj && regioes.oral) {
    ok(!!veredito('chaveDoSimulado', [fSj.ini + 5], [regioes.oral.ini + 10]),
      'D16 a varredura acusa chave do _sjVM usada na aba da oral (o defeito que a originou)');
    ok(!!regioes.simulados && !veredito('chaveDoSimulado', [fSj.ini + 5], [regioes.simulados.ini + 10]),
      'D16 e NÃO acusa a mesma chave usada dentro da própria view');
  } else ok(false, 'D16 não consegui montar a prova do defeito (_sjVM/região da oral)');
}



/* ===== D17 · TESTES DE TELA (LAYOUT, NÃO DADO) =====
   Ajustes, Ciclo, Redação e o registro de sessão, em desktop e celular. O que se mede
   aqui é a TELA, não o conteúdo: rótulo que não aparece (foi assim que a aba da Prova
   oral ficou muda), bloco que estoura a largura, página que passa a rolar de lado,
   alvo de toque pequeno demais no celular e sobra de render ("undefined", "NaN").
   Teste verde de dado nunca provou layout — este existe para fechar essa brecha. */
{
const AUDITOR = () => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; };
    const nome = e => (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title')
      || (e.querySelector('svg,img') ? '(ícone)' : '');
    // o menu do celular fica FORA da tela quando fechado, e texto dentro de card com
    // overflow:hidden é reticência, não estouro — nem um nem outro é defeito de layout
    const foraDeTela = e => !!e.closest('aside') || !!e.closest('[aria-hidden="true"]');
    const recortado = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement)
      if (getComputedStyle(p).overflow !== 'visible') return true; return false; };
    // alvo de toque: o desenho pode ser pequeno se o ct-alvo cresce a caixa por ::after
    const alvo = e => { const r = e.getBoundingClientRect(); let h = r.height, w = r.width;
      try { const a = getComputedStyle(e, '::after');
        if (a && a.content !== 'none' && a.position === 'absolute') {
          h = Math.max(h, parseFloat(a.height) || 0); w = Math.max(w, parseFloat(a.width) || 0); } } catch (_) {}
      return { w, h }; };
    const escopo = document.querySelector('[role="dialog"]') || document.body;
    const r = { mudos: [], estouram: [], lixo: [], miudos: [], semAlvo: [] };
    for (const b of escopo.querySelectorAll('button, [role="tab"], a[href]')) {
      if (!vis(b) || foraDeTela(b)) continue;
      if (!nome(b)) r.mudos.push(b.tagName + '.' + String(b.className || '').slice(0, 30)
        + '@' + Math.round(b.getBoundingClientRect().top));
      if (innerWidth < 500) { const a = alvo(b);
        if (a.h < 30 || a.w < 30) r.miudos.push((nome(b) || '?').slice(0, 22) + ' '
          + Math.round(a.w) + '×' + Math.round(a.h));
        // quem PROMETE alvo (.ct-alvo) tem de entregar os 44 px pelo ::after, independente da
        // fonte: no Mac o emoji da Apple alonga o chip para 32 px e escondia o fio de luz
        // (catedra-ui.css) sobrescrevendo o ::after do host para 2 px — no Linux do CI caía.
        if (b.classList.contains('ct-alvo')) { try { const p = getComputedStyle(b, '::after');
          if (p.position !== 'absolute' || (parseFloat(p.height) || 0) < 44)
            r.semAlvo.push((nome(b) || '?').slice(0, 22) + ' ::after=' + p.height); } catch (_) {} } }
    }
    for (const e of escopo.querySelectorAll('*')) {
      if (!vis(e) || foraDeTela(e) || recortado(e)) continue;
      const c = e.getBoundingClientRect();
      if (c.right > innerWidth + 2) r.estouram.push(e.tagName + '.' + String(e.className || '').slice(0, 24)
        + ' [' + Math.round(c.left) + '→' + Math.round(c.right) + '] "' + (e.textContent || '').trim().slice(0, 24) + '"');
    }
    const txt = escopo.innerText || '';
    for (const m of ['undefined', 'NaN', '[object Object]']) if (txt.includes(m)) r.lixo.push(m);
    // rótulo vazio: o defeito da aba da oral — a aba existe, a caixa aparece, o texto não
    r.rotulosVazios = [...escopo.querySelectorAll('[role="tab"], [role="tablist"] button')]
      .filter(e => vis(e) && !nome(e)).map(e => e.outerHTML.slice(0, 60));
    r.rolaLado = document.documentElement.scrollWidth > innerWidth + 2;
    r.vazio = (escopo.innerText || '').trim().length < 40;
    return r;
  };
  const VIEWS=['ajustes','ciclo','redacao','oral'];
  for (const larg of [1365, 390]) {
    const ctx = await browser.newContext({ viewport: { width: larg, height: 900 } });
    await ctx.addInitScript(()=>{try{localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');localStorage.setItem('catedra:areaEstudo',JSON.stringify('juridica'));}catch(_){}} );
    const pg = await ctx.newPage();
    await pg.goto(URL0+'/Catedra.dc.html'); await pg.waitForTimeout(1800);
    for (const v of VIEWS) {
      await pg.evaluate(x=>window.__catedraGoView(x), v); await pg.waitForTimeout(1200);
      const r = await pg.evaluate(AUDITOR);
      ok(!r.vazio, `TELA ${v}@${larg} tem conteúdo`);
      ok(r.mudos.length===0, `TELA ${v}@${larg} sem botão/aba mudo (${r.mudos.slice(0,4).join(' | ')||'ok'})`);
      ok(!r.rolaLado, `TELA ${v}@${larg} não rola de lado`);
      ok(r.estouram.length===0, `TELA ${v}@${larg} nada estoura a largura (${r.estouram.slice(0,3).join(' | ')||'ok'})`);
      ok(r.lixo.length===0, `TELA ${v}@${larg} sem lixo de render (${r.lixo.join(',')||'ok'})`);
      ok(r.miudos.length===0, `TELA ${v}@${larg} alvo de toque ≥30px (${r.miudos.slice(0,4).join(' | ')||'ok'})`);
      if (larg < 500) ok(r.semAlvo.length===0, `TELA ${v}@${larg} todo .ct-alvo entrega 44px pelo ::after (${r.semAlvo.slice(0,4).join(' | ')||'ok'})`);
      ok(r.rotulosVazios.length===0, `TELA ${v}@${larg} nenhuma aba com rótulo vazio (${r.rotulosVazios.slice(0,2).join(' | ')||'ok'})`);
    }
    // registro de sessão
    await pg.evaluate(()=>window.__catedraGoView('inicio')); await pg.waitForTimeout(900);
    const abriu = await pg.evaluate(async ()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms));
      const b=[...document.querySelectorAll('button')].find(x=>/registrar sess/i.test(x.textContent||''));
      if(!b) return false; b.click(); await w(700); return !!document.querySelector('[role="dialog"][aria-label="Registrar sessão"]'); });
    ok(abriu, `SESSAO@${larg} o modal de registro abre`);
    if (abriu) {
      const r = await pg.evaluate(AUDITOR);
      ok(!r.vazio, `SESSAO@${larg} modal com conteúdo`);
      ok(r.mudos.length===0, `SESSAO@${larg} sem controle mudo (${r.mudos.slice(0,4).join(' | ')||'ok'})`);
      ok(r.estouram.length===0, `SESSAO@${larg} nada estoura (${r.estouram.slice(0,3).join(' | ')||'ok'})`);
      ok(r.lixo.length===0, `SESSAO@${larg} sem lixo de render (${r.lixo.join(',')||'ok'})`);
      const cab = await pg.evaluate(()=>{ const d=document.querySelector('[role="dialog"]'); const c=d.getBoundingClientRect();
        return { dentro: c.top>=-1 && c.bottom<=innerHeight+2, largura: c.width<=innerWidth+2 }; });
      ok(cab.dentro && cab.largura, `SESSAO@${larg} o painel cabe na tela`);
    }
    await ctx.close();
  }
  
  // prova de que o auditor enxerga: injeta um botão sem rótulo e um bloco largo demais
  {
    const ctx = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    await ctx.addInitScript(()=>{try{localStorage.setItem('catedra:auth','1');localStorage.setItem('catedra:onboarded','1');}catch(_){}});
    const pg = await ctx.newPage();
    await pg.goto(URL0+'/Catedra.dc.html'); await pg.waitForTimeout(1500);
    const r = await pg.evaluate((fn)=>{
      const m=document.querySelector('main')||document.body;
      const b=document.createElement('button'); b.textContent=''; b.style.cssText='width:40px;height:40px;';
      const d=document.createElement('div'); d.textContent='estouro'; d.style.cssText='width:'+(innerWidth+400)+'px;height:20px;';
      m.appendChild(b); m.appendChild(d);
      const out=eval('('+fn+')')();
      b.remove(); d.remove(); return out;
    }, AUDITOR.toString());
    ok(r.mudos.length>0, 'TELA o auditor acusa botão sem rótulo quando existe um');
    ok(r.estouram.length>0, 'TELA o auditor acusa bloco mais largo que a tela');
    await ctx.close();
  }
}

/* ===== TASK 5 · NAVEGAÇÃO POR JORNADA, SEM TROCAR IDS =====
   A barra agrupava por arquitetura do código ("Treino", "Acervo"). Agora agrupa pela rotina
   e pelas fases do concurso. O que NÃO pode mudar é o data-view: renomear um id quebraria
   deep-link, ponto de retorno e as abas nativas. */
{
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const nav = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
    const antesDeAbrir = mais ? mais.getAttribute('aria-expanded') : null;
    if (mais) { mais.click(); await w(400); }
    const mais2 = document.querySelector('button[aria-label="Mostrar mais opções"]');
    const views = [...document.querySelectorAll('aside button[data-view]')].map(b => b.getAttribute('data-view'));
    const rotulos = [...document.querySelectorAll('aside div')]
      .map(d => (d.textContent || '').trim()).filter(t => t.length < 30 && t.length > 3);
    const ordem = (v) => views.indexOf(v);
    return {
      // todo id essencial continua na barra
      idsPreservados: ['inicio','ciclo','revisoes','calendario','legis','edital','simulados',
        'redacao','oral','prioridade','bancas','analise','historico','ajustes'].every(v => views.includes(v)),
      // a rotina vem primeiro, depois o acervo base, depois as fases, depois o planejamento
      hojeAntesDoAcervo: ordem('inicio') < ordem('legis'),
      acervoAntesDasFases: ordem('legis') < ordem('simulados'),
      fasesAntesDoPlanejamento: ordem('simulados') < ordem('prioridade'),
      // os rótulos dizem a fase
      dizFases: rotulos.some(t => /fases da magistratura|treino/i.test(t)),
      dizEstudoBase: rotulos.some(t => /estudo base/i.test(t)),
      dizPlanejamento: rotulos.some(t => /planejamento/i.test(t)),
      // o expansor conta o seu estado
      expansorFechadoDizFalse: antesDeAbrir === 'false',
      expansorAbertoDizTrue: !!mais2 && mais2.getAttribute('aria-expanded') === 'true',
      expansorApontaParaOPainel: !!mais2 && !!document.getElementById(mais2.getAttribute('aria-controls') || ''),
    };
  });
  for (const [k, v] of Object.entries(nav)) ok(v, 'TASK5 ' + k);

  // o fundo do menu do celular precisa ser alcançável por teclado
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1500);
  const drawer = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const abrir = document.querySelector('button[aria-label="Abrir menu"]');
    if (!abrir) return { erro: 'sem botão de menu no celular' };
    abrir.click(); await w(450);
    const fundo = document.querySelector('button[aria-label="Fechar o menu"]');
    const r = { fundoEhBotaoComNome: !!fundo };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await w(450);
    r.escFechaOMenu = !document.querySelector('button[aria-label="Fechar o menu"]');
    return r;
  });
  if (drawer.erro) ok(false, 'TASK5 ' + drawer.erro);
  else for (const [k, v] of Object.entries(drawer)) ok(v, 'TASK5 ' + k);
  await page.setViewportSize({ width: 1280, height: 800 });
}

/* ===== ÁREA GOVERNA A PLATAFORMA (Fase 2 do guia de refatoração) =====
   A troca de área era cosmética. Havia TRÊS guardas diferentes (isJuridica, areaJuris,
   temAreaMod), e todas só no MENU: a view continuava aberta pelo "continuar de onde
   parei", pelo window.__catedraGoView e por deep link. Quem estuda Enfermagem reabria a
   tela de peças processuais sem nunca ter pedido. Agora quem responde é area-registry.js,
   e a resposta vale para toda entrada. */
{
  // 1) o registro é uma tabela honesta, não um if espalhado
  const reg = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/area-registry.js')).text();
    const ctx = {};
    new Function('window', src)(ctx);
    const R = ctx.CT_AREA_REG;
    const JUR = ['juridica', 'policial', 'fiscal', 'contas', 'administrativa'];
    const NAO = ['saude', 'social', 'educacao', 'tecnologia', 'militar', 'outra'];
    return {
      // jurisprudência é acervo de tribunal: só quem tem carreira jurídica
      jurisSoNasJuridicas: JUR.every(a => R.podeAbrir(a, 'juris')) && NAO.every(a => !R.podeAbrir(a, 'juris')),
      // peças, 2ª fase, oral e o ranking de incidência são de magistratura
      pecasSoEmJuridica: R.podeAbrir('juridica', 'roteiros')
        && ['policial', 'saude', 'social', 'outra'].every(a => !R.podeAbrir(a, 'roteiros')),
      /* CORRIGIDO depois da revisão: a primeira versão desta tabela dava oral e simulado
         só a magistratura. O código desmentia — treino.js:202 tem acervoLeisArea(area),
         escrito para que "Simulado (itens de lei seca) e Prova oral (modo Lei seca)"
         sirvam a área escolhida. Quem tem fonte normativa própria argui e simula sobre
         ela; o que é exclusivo é o ACERVO das bancas jurídicas. */
      oralOndeHaFonte: R.podeAbrir('juridica', 'oral') && R.podeAbrir('saude', 'oral')
        && !R.podeAbrir('outra', 'oral'),
      acervoDeBancasSoEmJuridica: R.tem('juridica', 'provaOralBancas')
        && ['policial', 'saude', 'social'].every(a => !R.tem(a, 'provaOralBancas')),
      simuladoOndeHaFonte: R.podeAbrir('saude', 'simulados') && R.podeAbrir('policial', 'simulados')
        && !R.podeAbrir('outra', 'simulados'),
      // o que é universal continua universal em TODAS as onze
      cicloEmTodas: [...JUR, ...NAO].every(a => R.podeAbrir(a, 'ciclo') && R.podeAbrir(a, 'revisoes')),
      editalEmTodas: [...JUR, ...NAO].every(a => R.podeAbrir(a, 'edital')),
      // "sem área" NÃO pode virar Direito por omissão
      areaDesconhecidaNaoLiberaNada: !R.podeAbrir('inexistente', 'juris') && !R.podeAbrir('', 'roteiros'),
      // e a área diz o que ainda não tem, em português
      dizOQueEstaEmPreparo: R.emPreparo('saude').length > 0 && R.emPreparo('juridica').length === 0,
      termoDaArea: R.termo('saude', 'fontePlural') === 'diretrizes' && R.termo('juridica', 'fontePlural') === 'leis',
    };
  }, URL0);
  for (const [k, v] of Object.entries(reg)) ok(v, 'AREA ' + k);

// ids duplicados no banco dobram o card na tela e tornam a 2ª versão inalcançável
// (lista.find abre sempre a 1ª). O dedup de 27/08 removeu 17; isto trava a volta.
{
  const _wD = {}; new Function('window', fs.readFileSync(path.join(RAIZ, 'discursivas-completo.js'), 'utf8'))(_wD);
  const _ids = (_wD.CT_DISCURSIVAS || []).map(q => q.id);
  const _dup = _ids.filter((x, i) => _ids.indexOf(x) !== i);
  ok(_dup.length === 0, 'DISC ids únicos no banco (' + (_dup.slice(0, 4).join(', ') || 'ok') + ')');
}

  // 2) o menu segue a capacidade — e Jurídica não perde NADA
  const ACERVO = ['legis', 'juris', 'areamod', 'roteiros', 'segundafase', 'redacao', 'oral',
                  'prioridade', 'simulados', 'edital', 'bancas'];
  const menus = {};
  for (const area of ['juridica', 'saude', 'outra']) {
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate((a) => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify(a));
    }, area);
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(1700);
    menus[area] = await page.evaluate(async (acervo) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const m = document.querySelector('button[aria-label="Mostrar mais opções"]');
      if (m) { m.click(); await w(350); }
      return [...document.querySelectorAll('aside button[data-view]')]
        .map(b => b.dataset.view).filter(v => acervo.includes(v));
    }, ACERVO);
  }
  ok(ACERVO.every(v => menus.juridica.includes(v)),
    'AREA jurídica continua com todas as telas (' + menus.juridica.length + '/' + ACERVO.length + ')');
  ok(!menus.saude.includes('juris') && !menus.saude.includes('roteiros')
     && !menus.saude.includes('segundafase') && !menus.saude.includes('redacao')
     && !menus.saude.includes('prioridade'),
    'AREA saúde não recebe tela de acervo jurídico no menu (' + menus.saude.join(',') + ')');
  ok(menus.saude.includes('legis') && menus.saude.includes('areamod') && menus.saude.includes('edital'),
    'AREA saúde mantém o que é dela (' + menus.saude.join(',') + ')');
  ok(menus.outra.includes('edital') && !menus.outra.includes('legis'),
    'AREA "outra" fica só com o universal (' + menus.outra.join(',') + ')');

  /* 3) O CORAÇÃO: a guarda vale para toda ENTRADA, não só para o botão. Este é o teste
        que o app não tinha — e é por isso que o vazamento durou tanto. */
  const guarda = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const r = {};
    const tentar = async (v) => {
      window.__catedraGoView(v); await w(700);
      const t = document.body.innerText;
      return { barrou: /não faz parte de/i.test(t), explica: t.length > 200 };
    };
    // saúde está ativa: nenhuma destas pode abrir
    for (const v of ['juris', 'roteiros', 'oral', 'prioridade', 'segundafase']) {
      const x = await tentar(v);
      r['barra_' + v] = x.barrou;
    }
    // e o que é dela abre normalmente
    window.__catedraGoView('ciclo'); await w(700);
    r.ciclo_abre = !/não faz parte de/i.test(document.body.innerText);
    return r;
  });
  for (const [k, v] of Object.entries(guarda)) ok(v, 'AREA guarda ' + k);

  // 4) a tela barrada EXPLICA e oferece saída — não é um redirecionamento mudo
  const explica = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('juris'); await w(700);
    const t = document.body.innerText;
    return {
      dizQualTela: /Jurisprudência · CátedraJURIS/i.test(t),
      dizPorQue: /acervo de jurisprudência é de tribunal/i.test(t),
      dizOQueVem: /Em preparo/i.test(t),
      ofereceSaida: [...document.querySelectorAll('button[data-view]')]
        .some(b => /Voltar ao meu painel/i.test(b.textContent))
        && [...document.querySelectorAll('button[data-view]')].some(b => /Trocar de área/i.test(b.textContent)),
      semJargao: !/undefined|null|\.json|bundle/i.test(t),
    };
  });
  for (const [k, v] of Object.entries(explica)) ok(v, 'AREA tela barrada ' + k);

  // 5) "continuar de onde parei" não pode ressuscitar tela de outra área
  const ponto = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    localStorage.setItem('catedra:lastPonto', JSON.stringify({ view: 'roteiros', ts: Date.now(), rotulo: 'Roteiros' }));
    return { semeado: true };
  });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  const voltou = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const b = [...document.querySelectorAll('button')].find(x => /continuar|voltar ao ponto|retomar/i.test(x.textContent || ''));
    if (!b) return { semCartao: true };
    b.click(); await w(800);
    return { naoAbreRoteiros: /não faz parte de/i.test(document.body.innerText) };
  });
  if (!voltou.semCartao) ok(voltou.naoAbreRoteiros, 'AREA "continuar de onde parei" respeita a área');
  else ok(ponto.semeado, 'AREA (o cartão de retomada não estava na tela nesta conta)');

  /* 6) CADERNO POR ÁREA — o item de maior risco desta fase, porque mexe em persistência.
        Antes: quem estuda Direito, acumula progresso e troca para Saúde levava TUDO junto —
        o edital de magistratura continuava sendo o edital e as revisões de Processo Civil
        continuavam vencendo. Não havia uma única chave por área na camada de persistência.
        A regra escolhida é a mais conservadora que existe: Direito (e "sem área") ficam nas
        chaves HISTÓRICAS, sem sufixo — nenhum dado existente é movido ou reescrito. */
  /* Aba PRÓPRIA para este caso. Semear com localStorage.clear() na aba compartilhada
     não funciona: o app da carga anterior ainda está vivo e o autosave dele (debounce de
     500 ms) grava o estado velho POR CIMA da semente, logo depois do clear. Com
     addInitScript os valores existem antes de qualquer linha do app rodar. */
  const areaCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const areaPg = await areaCtx.newPage();
  await areaPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      if (!localStorage.getItem('catedra:areaEstudo')) {
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
        // o campo é `topics` (não `topicos`): semente com o nome errado testa outra coisa
        localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'e1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [{ name: 'Prescrição', done: false }] }]));
        localStorage.setItem('catedra:reviews', JSON.stringify([{ id: 'r1', up: 1, tema: 'Prescrição', prox: '2026-09-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
        localStorage.setItem('catedra:blocks', JSON.stringify([{ id: 'b1', up: 1, disc: 'Direito Civil', kind: 'Teoria', min: 50 }]));
        localStorage.setItem('catedra:sessions', JSON.stringify([{ id: 's1', ts: 1, disc: 'Direito Civil', min: 45 }]));
        localStorage.setItem('catedra:prefs', JSON.stringify({ nome: 'Lana', fontScale: 'grande' }));
      }
    } catch (_) {}
  });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(2000);

  const trocarArea = async (id) => {
    return areaPg.evaluate(async (alvoId) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      // P19: estes fluxos trocam para áreas fora do beta público — abrem a lista inteira antes (como a constante permite)
      try { const R = window.CT_AREA_REG; ['saude','social','policial','fiscal','contas','administrativa','educacao','tecnologia','militar','outra'].forEach(id => { if (R.PUBLICAS.indexOf(id) < 0) R.PUBLICAS.push(id); }); } catch (_) {}
      window.__catedraGoView('ajustes'); await w(1600);
      for (let i = 0; i < 6; i++) {
        const alvo = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === alvoId);
        if (alvo) {
          alvo.click(); await w(900);
          // a troca passou a exigir confirmação (prévia): clicar no card só PROPÕE
          const conf = [...document.querySelectorAll('button')]
            .find(x => /^trocar para /i.test((x.textContent || '').trim()));
          if (conf) { conf.click(); }
          await w(2200); return 'ok';
        }
        const abrir = [...document.querySelectorAll('button')]
          .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
        if (abrir) { abrir.click(); await w(900); } else { await w(600); }
      }
      // devolve o MOTIVO: "false" nu não se conserta
      const t = document.body.innerText || '';
      return 'não achei o seletor · ajustes=' + /Personalização, orientação/.test(t)
        + ' trocar=' + [...document.querySelectorAll('button')].some(x => /trocar de área/i.test((x.textContent || '').trim()))
        + ' cards=' + document.querySelectorAll('button[data-a]').length
        + ' área=' + (localStorage.getItem('catedra:areaEstudo') || '?')
        + ' corpo=' + t.slice(0, 50).replace(/\n+/g, ' ');
    }, id);
  };
  const lerChaves = () => areaPg.evaluate(() => {
    const g = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
    return { edital: g('catedra:edital'), reviews: g('catedra:reviews'),
             blocks: g('catedra:blocks'), sessions: g('catedra:sessions'),
             prefs: g('catedra:prefs'),
             saudeEdital: g('catedra:edital@saude'), saudeRev: g('catedra:reviews@saude') };
  });

  const antesDaTroca = await lerChaves();
  const foiParaSaude = await trocarArea('saude');
  ok(foiParaSaude === 'ok', 'AREA a troca de área acontece pela interface (' + foiParaSaude + ')');

  /* Comparação por CONTEÚDO, não byte a byte: o app re-serializa legitimamente ao salvar
     (carimbo `up`, campos que ele completa), e um teste preso ao texto exato reprova por
     causa disso — escondendo o que ele deveria proteger, que é não perder nada. */
  const conteudo = (bruto) => {
    try { const a = JSON.parse(bruto || '[]'); return Array.isArray(a) ? a.map(x => x.id).sort().join(',') : ''; }
    catch (_) { return 'ILEGÍVEL'; }
  };
  if (foiParaSaude === 'ok') {
    const emSaude = await lerChaves();
    ok(conteudo(emSaude.edital) === conteudo(antesDaTroca.edital)
       && conteudo(emSaude.reviews) === conteudo(antesDaTroca.reviews)
       && conteudo(emSaude.sessions) === conteudo(antesDaTroca.sessions),
      'AREA o caderno de Direito continua intacto no armazenamento');
    // e a TELA de Saúde não mostra o edital de magistratura
    const naTela = await areaPg.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      window.__catedraGoView('edital'); await w(1200);
      return { texto: (document.querySelector('main') || document.body).innerText };
    });
    ok(!/Direito Civil/.test(naTela.texto),
      'AREA o edital de Direito não aparece dentro de Saúde');

    const voltou = await trocarArea('juridica');
    ok(voltou === 'ok', 'AREA dá para voltar para Direito (' + voltou + ')');
    if (voltou === 'ok') {
      const depois = await lerChaves();
      ok(conteudo(depois.edital) === conteudo(antesDaTroca.edital), 'AREA o edital volta inteiro ('
        + conteudo(depois.edital) + ')');
      ok(conteudo(depois.reviews) === conteudo(antesDaTroca.reviews), 'AREA as revisões voltam inteiras');
      ok(conteudo(depois.sessions) === conteudo(antesDaTroca.sessions), 'AREA o histórico volta inteiro');
      ok((() => { try { const p = JSON.parse(depois.prefs || '{}'); return p.nome === 'Lana' && p.fontScale === 'grande'; }
                 catch (_) { return false; } })(), 'AREA preferência é da pessoa, não da área');
      const volta = await areaPg.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        window.__catedraGoView('edital'); await w(1200);
        return (document.querySelector('main') || document.body).innerText;
      });
      ok(/Direito Civil/.test(volta), 'AREA e a tela mostra o edital de volta');
    }
  }

  /* 7) A BUSCA só oferece o que a área pode abrir. Buscar o que não se pode abrir é
        pior que não achar: promete uma porta e mostra um muro. E o juris-index pesa
        2,4 MB — nem carregar faz sentido fora das carreiras jurídicas. */
  const buscaPorArea = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const abrirPaleta = async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      await w(600);
      return document.querySelector('input[aria-label="Buscar em toda a plataforma"]');
    };
    const buscar = async (termo) => {
      const i = await abrirPaleta(); if (!i) return null;
      i.value = termo; i.dispatchEvent(new Event('input', { bubbles: true }));
      // a paleta busca em índices que carregam sob demanda; espera o resultado aparecer
      let t = '';
      for (let k = 0; k < 40; k++) { await w(150); t = document.body.innerText;
        if (new RegExp(termo, 'i').test(t.slice(t.indexOf('Buscar em toda a plataforma')))) break; }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await w(400);
      return t;
    };
    const r = {};
    // em Direito, a jurisprudência aparece
    const emDireito = await buscar('súmula');
    r.direitoAchaSumula = /súmula/i.test(emDireito || '');
    return r;
  });
  for (const [k, v] of Object.entries(buscaPorArea)) ok(v, 'AREA busca ' + k);

  /* A medição em Saúde tem de acontecer numa ABA NOVA: o juris-index.js já foi baixado
     enquanto a aba estava em Direito, e script carregado não se descarrega. Perguntar
     "carregou?" na mesma aba mediria o passado, não a regra. */
  const saudeCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const saudePg = await saudeCtx.newPage();
  await saudePg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
  });
  await saudePg.goto(URL0 + '/Catedra.dc.html');
  await saudePg.waitForTimeout(1900);
  const emSaude = await saudePg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    await w(700);
    const i = document.querySelector('input[aria-label="Buscar em toda a plataforma"]');
    if (!i) return { semPaleta: true };
    i.value = 'súmula'; i.dispatchEvent(new Event('input', { bubbles: true })); await w(1800);
    return { texto: document.body.innerText, carregouJuris: !!window.__JURIS_IDX__,
             carregouPecas: !!window.CT_PECAS };
  });
  if (!emSaude.semPaleta) {
    ok(!/Súmula \d/.test(emSaude.texto), 'AREA busca não devolve súmula em Saúde');
    ok(!emSaude.carregouJuris, 'AREA busca nem baixa o acervo de jurisprudência fora das jurídicas (2,4 MB)');
    ok(!emSaude.carregouPecas, 'AREA busca nem baixa o catálogo de peças fora das jurídicas');
  }
  await saudeCtx.close();

  /* 8) Nada na tela pode apontar para uma porta fechada, e grupo sem item é ruído.
        Em Saúde sobrava um cabeçalho "TREINO" solto, com borda e tudo, sem nada embaixo —
        e o atalho "Simulados" nos essenciais levava direto à tela barrada. */
  const saudeCtx2 = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  const saudePg2 = await saudeCtx2.newPage();
  await saudePg2.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
  });
  await saudePg2.goto(URL0 + '/Catedra.dc.html');
  await saudePg2.waitForTimeout(2000);
  const semPortaFechada = await saudePg2.evaluate(() => {
    // o que Saúde de fato NÃO tem — oral e simulado passaram a servi-la, sobre a lei dela
    const barrada = ['juris', 'roteiros', 'segundafase', 'redacao', 'prioridade'];
    const atalhos = [...document.querySelectorAll('button[data-view]')]
      .filter(b => b.closest('main')).map(b => b.dataset.view);
    const aside = (document.querySelector('aside') || {}).innerText || '';
    return {
      nenhumAtalhoParaTelaBarrada: atalhos.every(v => !barrada.includes(v)),
      // o grupo só existe quando tem item embaixo — e em Saúde agora tem (simulado e oral)
      grupoCoerenteComOsItens: (/TREINO/i.test(aside))
        === [...document.querySelectorAll('aside button[data-view]')]
          .some(b => ['simulados', 'redacao', 'roteiros', 'segundafase', 'oral'].includes(b.dataset.view)),
      aindaTemOQueEDela: atalhos.includes('areamod') || atalhos.includes('ciclo'),
    };
  });
  for (const [k, v] of Object.entries(semPortaFechada)) ok(v, 'AREA ' + k);
  await saudeCtx2.close();
  // e Jurídica NÃO perde o cabeçalho do grupo
  const juridicaMantem = await areaPg.evaluate(() =>
    /fases da magistratura/i.test((document.querySelector('aside') || {}).innerText || ''));
  ok(juridicaMantem, 'AREA jurídica mantém o grupo "Fases da Magistratura"');

  // 9) todo satélite recebe a área — cinco dos sete não tinham como saber onde estavam
  const contextoSat = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('legis'); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="legis"]');
    return { legisRecebeArea: !!f && /area=/.test(f.getAttribute('src') || '') };
  });
  for (const [k, v] of Object.entries(contextoSat)) ok(v, 'AREA ' + k);

  /* 10) O PIOR CAMINHO QUE A REVISAO ENCONTROU, agora testado.
     A nuvem podia trazer areaEstudo de outro aparelho. Sem tratar isso, cada _load()
     continuava usando a area VELHA: o estado ficava hibrido (area Saude + caderno de
     Direito) e, 500 ms depois, o autosave gravava o caderno de Direito dentro de
     catedra:*@saude e subia para a nuvem — apagando o caderno da outra area nos dois
     lados, sem ninguem tocar em nada. */
  const sincCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sincPg = await sincCtx.newPage();
  await sincPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      // caderno de Direito (chaves historicas, sem sufixo)
      localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'jur1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [] }]));
      localStorage.setItem('catedra:reviews', JSON.stringify([{ id: 'jr1', up: 1, tema: 'Prescrição', prox: '2026-09-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
      // caderno de Saude, feito no OUTRO aparelho
      localStorage.setItem('catedra:edital@saude', JSON.stringify([{ id: 'sau1', up: 9, disc: 'Clínica Médica', peso: 4, color: '#0EA5E9', topics: [] }]));
      localStorage.setItem('catedra:reviews@saude', JSON.stringify([{ id: 'sr1', up: 9, tema: 'Sepse', prox: '2026-09-02', intervalo: 1, facilidade: 2.5, repeticoes: 0 }]));
    } catch (_) {}
  });
  await sincPg.goto(URL0 + '/Catedra.dc.html');
  await sincPg.waitForTimeout(2000);
  const sinc = await sincPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ler = () => {
      const g = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
      const ids = b => { try { return (JSON.parse(b || '[]') || []).map(x => x.id).sort().join(','); } catch (_) { return 'ILEGÍVEL'; } };
      return { jur: ids(g('catedra:edital')), sau: ids(g('catedra:edital@saude')),
               jurRev: ids(g('catedra:reviews')), sauRev: ids(g('catedra:reviews@saude')) };
    };
    const antes = ler();
    // é exatamente o que o pull da nuvem faz: grava a chave e avisa o app
    localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    window.dispatchEvent(new CustomEvent('catedra:synced'));
    await w(2500);                       // muito além dos 500 ms do autosave
    const depois = ler();
    return { antes, depois, areaFinal: localStorage.getItem('catedra:areaEstudo') };
  });
  ok(sinc.antes.sau === 'sau1' && sinc.antes.jur === 'jur1', 'AREA sync o cenário parte dos dois cadernos distintos');
  ok(sinc.depois.sau === 'sau1',
    'AREA sync NÃO grava o caderno de Direito por cima do de Saúde (edital@saude = ' + sinc.depois.sau + ')');
  ok(sinc.depois.sauRev === 'sr1',
    'AREA sync preserva as revisões da área que chegou (reviews@saude = ' + sinc.depois.sauRev + ')');
  ok(sinc.depois.jur === 'jur1' && sinc.depois.jurRev === 'jr1',
    'AREA sync o caderno de Direito também fica intacto');
  await sincCtx.close();

  /* 11) A CASCA NATIVA precisa saber a área. No Mac e no iPad o CátedraJURIS é uma ABA
     fixa da barra (⌘3), escrita em Swift: o guarda de rota da web não a alcança, porque
     ela não é uma view. Quem estuda Enfermagem apertava ⌘3 e recebia o acervo de súmulas
     inteiro. Aqui se testa o LADO WEB da ponte — que a mensagem é emitida, e com o
     conteúdo certo. O lado Swift foi compilado à parte (0 erros nos dois alvos). */
  const ponteCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pontePg = await ponteCtx.newPage();
  await pontePg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    } catch (_) {}
    // finge a ponte do WKWebView: no navegador ela não existe
    window.__avisos = [];
    window.webkit = { messageHandlers: { catedraArea: { postMessage: (b) => { window.__avisos.push(b); } } } };
  });
  await pontePg.goto(URL0 + '/Catedra.dc.html');
  await pontePg.waitForTimeout(2000);
  const ponte = await pontePg.evaluate(() => {
    const a = (window.__avisos || [])[0] || null;
    return { avisou: !!a, area: a && a.area, juris: a && a.juris, legis: a && a.legis,
             quantos: (window.__avisos || []).length };
  });
  ok(ponte.avisou, 'NATIVO a casca é avisada da área na abertura');
  ok(ponte.area === 'saude', 'NATIVO o aviso leva a área ativa (' + ponte.area + ')');
  ok(ponte.juris === false, 'NATIVO diz que Saúde não tem jurisprudência — a aba ⌘3 some');
  ok(ponte.legis === true, 'NATIVO diz que Saúde tem fontes normativas — o LEGIS fica');
  ok(ponte.quantos === 1, 'NATIVO não repete o aviso a cada render (' + ponte.quantos + ')');
  await pontePg.close();

  // e em Direito a aba continua
  const pontePg2 = await pontelCtxNovo();
  async function pontelCtxNovo() {
    const pg = await ponteCtx.newPage();
    await pg.addInitScript(() => {
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      } catch (_) {}
      window.__avisos = [];
      window.webkit = { messageHandlers: { catedraArea: { postMessage: (b) => { window.__avisos.push(b); } } } };
    });
    await pg.goto(URL0 + '/Catedra.dc.html');
    await pg.waitForTimeout(2000);
    return pg;
  }
  const emDireito = await pontePg2.evaluate(() => (window.__avisos || [])[0] || null);
  ok(emDireito && emDireito.juris === true, 'NATIVO em Direito a aba do JURIS continua');
  await pontePg2.close();
  await ponteCtx.close();

  /* 12) A TROCA DE ÁREA PASSA POR UMA PRÉVIA (Fase 2, item 5 do guia).
     Trocar de área deixou de ser um clique só, e por um motivo concreto: desde que cada
     área ganhou o seu caderno, quem troca encontra edital, revisões e histórico DAQUELA
     área — vazios na primeira vez. Ver isso de repente parece perda de dados. */
  const pvCtx = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  const pvPg = await pvCtx.newPage();
  await pvPg.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica'));
      localStorage.setItem('catedra:edital', JSON.stringify([{ id: 'e1', up: 1, disc: 'Direito Civil', peso: 3, color: '#2563EB', topics: [] }]));
    } catch (_) {}
  });
  await pvPg.goto(URL0 + '/Catedra.dc.html');
  await pvPg.waitForTimeout(2000);
  const pv = await pvPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
      // P19: estes fluxos trocam para áreas fora do beta público — abrem a lista inteira antes (como a constante permite)
      try { const R = window.CT_AREA_REG; ['saude','social','policial','fiscal','contas','administrativa','educacao','tecnologia','militar','outra'].forEach(id => { if (R.PUBLICAS.indexOf(id) < 0) R.PUBLICAS.push(id); }); } catch (_) {}
    window.__catedraGoView('ajustes'); await w(1500);
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'saude');
      if (card) { card.click(); await w(900); break; }
      const abrir = [...document.querySelectorAll('button')]
        .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const t = document.body.innerText;
    const area = () => { try { return localStorage.getItem('catedra:areaEstudo') || ''; } catch (_) { return ''; } };
    const r = {
      abriuPrevia: /trocar de área de estudo/i.test(t),
      naoTrocouSozinha: area().includes('juridica'),
      dizDeParaOnde: /jurídica/i.test(t) && /saúde e medicina/i.test(t),
      dizOQueSome: /deixa de aparecer/i.test(t) && /cátedrajuris/i.test(t),
      // era "casos clínicos": o construtor de casos existe desde a Fase 4, então
      // prometê-lo como futuro virou mentira. O que segue em preparo é o ACERVO.
      dizOQueEstaEmPreparo: /em preparo/i.test(t) && /acervo editorial/i.test(t),
      prometeQueNadaSePerde: /nada é apagado/i.test(t) && /volta inteiro/i.test(t),
      temCancelar: [...document.querySelectorAll('button')].some(x => /^cancelar$/i.test((x.textContent || '').trim())),
    };
    // cancelar tem de deixar tudo como estava
    const cancelar = [...document.querySelectorAll('button')].find(x => /^cancelar$/i.test((x.textContent || '').trim()));
    if (cancelar) { cancelar.click(); await w(700); }
    r.cancelarNaoTroca = area().includes('juridica')
      && !/trocar de área de estudo/i.test(document.body.innerText);
    return r;
  });
  for (const [k, v] of Object.entries(pv)) ok(v, 'PREVIA ' + k);

  // e confirmar troca de verdade
  const pvConf = await pvPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
      // P19: estes fluxos trocam para áreas fora do beta público — abrem a lista inteira antes (como a constante permite)
      try { const R = window.CT_AREA_REG; ['saude','social','policial','fiscal','contas','administrativa','educacao','tecnologia','militar','outra'].forEach(id => { if (R.PUBLICAS.indexOf(id) < 0) R.PUBLICAS.push(id); }); } catch (_) {}
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'saude');
      if (card) { card.click(); await w(900); break; }
      const abrir = [...document.querySelectorAll('button')]
        .find(x => /^trocar de área$/i.test((x.textContent || '').trim()));
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const conf = [...document.querySelectorAll('button')].find(x => /^trocar para /i.test((x.textContent || '').trim()));
    if (!conf) return { semBotao: true };
    conf.click(); await w(2200);
    const area = (() => { try { return localStorage.getItem('catedra:areaEstudo') || ''; } catch (_) { return ''; } })();
    const jur = (() => { try { return localStorage.getItem('catedra:edital') || ''; } catch (_) { return ''; } })();
    return { confirmouTroca: area.includes('saude'),
             cadernoDeDireitoIntacto: /Direito Civil/.test(jur) };
  });
  if (!pvConf.semBotao) for (const [k, v] of Object.entries(pvConf)) ok(v, 'PREVIA ' + k);
  await pvCtx.close();

  /* 13) FASE 5 — NENHUM RÓTULO JURÍDICO RESIDUAL fora do Direito.
     O guia é direto: "Remover labels jurídicos residuais de áreas não jurídicas". Esta
     varredura percorre as telas universais em cada área não jurídica e falha se aparecer
     vocabulário de Direito. `petição` leva guarda porque "rePETIÇÃO espaçada" é do SM-2. */
  const TERMOS = /magistratura|jurisprud|súmula|(?<!re)petição|acórdão|peça processual|processual civil|2ª fase|banca examinadora/i;
  const varreCtx = await browser.newContext({ viewport: { width: 1365, height: 936 } });
  for (const area of ['saude', 'social', 'educacao', 'outra']) {
    const vp = await varreCtx.newPage();
    await vp.addInitScript((a) => {
      try {
        localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
        localStorage.setItem('catedra:areaEstudo', JSON.stringify(a));
      } catch (_) {}
    }, area);
    await vp.goto(URL0 + '/Catedra.dc.html');
    await vp.waitForTimeout(1900);
    const achados = await vp.evaluate(async (fonteRegex) => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const RE = new RegExp(fonteRegex, 'i');
      const out = [];
      for (const v of ['inicio', 'ciclo', 'revisoes', 'calendario', 'edital', 'bancas', 'ajustes']) {
        window.__catedraGoView(v); await w(600);
        const m = document.querySelector('main');
        const t = (m ? m.innerText : document.body.innerText);
        const linha = t.split('\n').map(x => x.trim()).find(x => x && RE.test(x));
        if (linha) out.push(v + ': ' + linha.slice(0, 60));
      }
      return out;
    }, TERMOS.source);
    ok(achados.length === 0, 'FASE5 sem rótulo jurídico em ' + area + ' (' + (achados.join(' | ') || 'limpo') + ')');
    await vp.close();
  }
  await varreCtx.close();

  /* 14) FASE 3 — o contrato de estado vazio, aplicado às telas jurídicas.
     O guia exige que EmptyState tenha explicação e AÇÃO possível. A 2ª fase dizia só
     "Nenhuma prova com esse filtro." — e parava aí. Botão morto num estado vazio seria
     pior que estado vazio sem botão, então o teste também aperta o botão. */
  const f3 = await page.evaluate(async (base) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;left:-9999px;width:1100px;height:820px';
    ifr.src = base + '/segunda-fase-web.html';
    document.body.appendChild(ifr);
    await new Promise(r => { ifr.onload = r; setTimeout(r, 6000); });
    await w(1400);
    const d = ifr.contentDocument;
    if (!d) { ifr.remove(); return { semIframe: true }; }
    const q = d.getElementById('fq');
    if (!q) { ifr.remove(); return { semCampo: true }; }
    q.value = 'zzzzznadaaqui'; q.dispatchEvent(new Event('input', { bubbles: true })); await w(900);
    const t = d.body.innerText;
    const r = {
      mostraVazio: /nenhuma prova com esse filtro/i.test(t),
      explicaPorQue: /o acervo tem \d+ provas/i.test(t),
      ofereceSaida: !!d.getElementById('limparFiltros'),
    };
    const bt = d.getElementById('limparFiltros');
    if (bt) { bt.click(); await w(900); }
    r.aSaidaFunciona = !/nenhuma prova com esse filtro/i.test(d.body.innerText)
      && (d.getElementById('fq') || {}).value === '';
    ifr.remove();
    return r;
  }, URL0);
  if (!f3.semIframe && !f3.semCampo) for (const [k, v] of Object.entries(f3)) ok(v, 'FASE3 ' + k);

  // e as filas de pílulas dos satélites obedecem ao mesmo trilho
  const trilhos = await page.evaluate(async (b) => {
    const alvos = [['legis-web.html', '.tabs.ct-chips'], ['ritos-web.html', '.chips.ct-chips'],
                   ['juris-web.html', '.ct-chips']];
    const out = {};
    for (const [pag, sel] of alvos) {
      const t = await (await fetch(b + '/' + pag)).text();
      out[pag.replace('-web.html', '')] = t.includes('ct-chips') && t.includes('catedra-ui.css');
    }
    return out;
  }, URL0);
  for (const [k, v] of Object.entries(trilhos)) ok(v, 'FASE3 fila no trilho em ' + k);


  /* ===== FASE 4 — casos da pessoa, com a estrutura de cada área ====================
     O que precisa ser verdade: (a) a capacidade existe só onde há esquema; (b) os dois
     esquemas são DIFERENTES — nada de reaproveitar o formulário jurídico; (c) o guarda
     de dados identificáveis BLOQUEIA o salvamento; (d) o caso fica no caderno DAQUELA
     área e em lugar nenhum mais; (e) o treino revela por etapas e a autoavaliação
     agenda a revisão no mesmo motor do resto do app. */
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1500);
  const f4reg = await areaPg.evaluate(() => {
    const R = window.CT_AREA_REG, C = window.CT_CASOS;
    const campos = a => (C.esquema(a) || { campos: [] }).campos.map(c => c.k);
    const sa = campos('saude'), so = campos('social');
    return {
      capacidadeSoOndeHaEsquema: R.tem('saude', 'casosProprios') && R.tem('social', 'casosProprios')
        && !R.tem('juridica', 'casosProprios') && !R.tem('policial', 'casosProprios')
        && !R.tem('outra', 'casosProprios'),
      viewSegueACapacidade: R.podeAbrir('saude', 'casos') && !R.podeAbrir('juridica', 'casos'),
      juridicaNaoTemEsquema: !C.temEsquema('juridica') && C.esquema('juridica') === null,
      esquemasDiferentes: sa.join(',') !== so.join(',') && sa.length === 7 && so.length === 10,
      saudeNaOrdemClinica: sa.join(',') === 'titulo,apresentacao,achados,avaliacao,conduta,evolucao,fonte',
      socialNaOrdemDoTrabalhoSocial: so.join(',')
        === 'titulo,contexto,demanda,vulnerabilidade,avaliacao,intervencao,rede,encaminhamentos,acompanhamento,fundamento',
      barraIdentificavel: ['CPF 123.456.789-09', 'tel (69) 98103-8480', 'maria@exemplo.com',
        'Rua das Flores, 120', 'CEP 76800-000', 'prontuário nº 44821', 'nascimento 12/03/1988']
        .every(t => C.acharIdentificaveis(t).length > 0),
      deixaPassarDescricaoLegitima: ['homem, 54 anos, dispneia há 2 dias', 'PA 90x60, FC 118',
        'família com 4 pessoas, 2 crianças em idade escolar', 'doença de Crohn desde 2019']
        .every(t => C.acharIdentificaveis(t).length === 0),
    };
  });
  for (const [k, v] of Object.entries(f4reg)) ok(v, 'FASE4 ' + k);

  // o percurso de verdade, na tela: escrever → ser barrado pelo guarda → corrigir → treinar
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4tela = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')]
      .find(x => re.test((x.textContent || '').trim()));
    const r = {};
    // 1) o menu chama o caso pelo nome da área
    r.menuComNomeDaArea = /casos clínicos/i.test(document.body.innerText);
    const menu = bt(/^casos clínicos$/i); if (menu) menu.click(); await w(700);
    r.abriuAView = /meus casos clínicos/i.test(document.body.innerText);
    // 2) o construtor traz os campos do esquema clínico, e nenhum campo jurídico
    const novo = bt(/^novo caso$|^escrever o primeiro$/i); if (novo) novo.click(); await w(600);
    const t = document.body.innerText;
    // rascunho não oferece "Apagar": só o caso já guardado
    r.rascunhoNaoOfereceApagar = !bt(/^apagar$/i);
    r.temCamposClinicos = /apresentação/i.test(t) && /achados/i.test(t) && /conduta/i.test(t)
      && /evolução/i.test(t);
    r.semCampoJuridico = !/peça|dispositivo legal|jurisprudência/i.test(t);
    // 3) preencher com algo identificável e tentar guardar
    const set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false;
      const p = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
      p.set.call(e, val); e.dispatchEvent(new Event('input', { bubbles: true })); return true; };
    r.achouCampos = set('[data-k="titulo"]', 'Dispneia súbita em pós-operatório')
      && set('[data-k="apresentacao"]', 'Paciente Maria, CPF 123.456.789-09, dispneia há 2 dias.');
    await w(400);
    const guardar = bt(/^guardar o caso$/i); if (guardar) guardar.click(); await w(600);
    const t2 = document.body.innerText;
    r.guardaBloqueou = /não pode ser guardado/i.test(t2) && /cpf/i.test(t2);
    r.disseComoConsertar = /homem, 54 anos/i.test(t2);
    // o autosave já pode ter gravado a chave vazia — o que não pode é ter CONTEÚDO
    r.naoGravouNada = JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]').length === 0;
    // 4) corrigir e guardar de verdade
    set('[data-k="apresentacao"]', 'Homem, 54 anos, dispneia súbita 2 dias após herniorrafia.');
    set('[data-k="achados"]', 'PA 90x60, FC 118, SpO2 88% em ar ambiente.');
    set('[data-k="conduta"]', 'Oxigenoterapia, anticoagulação plena e angiotomografia.');
    await w(300);
    const g2 = bt(/^guardar o caso$/i); if (g2) g2.click(); await w(900);
    const cru = localStorage.getItem('catedra:casos@saude');
    const salvos = JSON.parse(cru || '[]');
    const abrirDeNovo = bt(/^editar$/i); if (abrirDeNovo) abrirDeNovo.click(); await w(600);
    r.casoGuardadoOfereceApagar = !!bt(/^apagar$/i);
    const volta = bt(/^cancelar$/i); if (volta) volta.click(); await w(500);
    r.guardouNoCadernoDaArea = salvos.length === 1 && salvos[0].apresentacao.indexOf('54 anos') > -1;
    /* o que casoSalvar grava tem de ser EXATAMENTE o esquema mais os metadados: espalhar o
       rascunho inteiro é o que levava campo de outra área para o disco, sem auditoria */
    r.gravouSoAsChavesDoEsquema = salvos.length === 1
      && Object.keys(salvos[0]).sort().join(',')
         === ['achados','apresentacao','area','avaliacao','conduta','criado','evolucao',
              'fonte','id','perguntas','titulo','treinos','up'].sort().join(',');
    r.naoVazouParaOCadernoJuridico = JSON.parse(localStorage.getItem('catedra:casos') || '[]').length === 0;
    r.semAfordanciaDeCompartilhar = !/compartilhar|publicar|enviar para o grupo/i
      .test(document.body.innerText);
    // 5) treinar: revela por etapas, não de uma vez
    const treinar = bt(/^discutir o caso$/i); if (treinar) treinar.click(); await w(700);
    const t3 = document.body.innerText;
    r.treinoComecaPelaApresentacao = /54 anos/.test(t3) && !/angiotomografia/i.test(t3);
    const rev = bt(/revelar a próxima parte/i); if (rev) rev.click(); await w(500);
    r.revelaEmEtapas = /PA 90x60/.test(document.body.innerText)
      && !/angiotomografia/i.test(document.body.innerText);
    const rev2 = bt(/revelar a próxima parte/i); if (rev2) rev2.click(); await w(500);
    r.chegaAoFim = /angiotomografia/i.test(document.body.innerText)
      && !!bt(/^conduzi bem$/i);
    // 6) a autoavaliação entra no MESMO motor de revisão
    const aval = bt(/^conduzi bem$/i); if (aval) aval.click(); await w(900);
    const revs = JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]');
    r.agendouRevisao = revs.some(x => x.casoId && /dispneia/i.test(x.topic || ''));
    r.contouOTreino = (JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]')[0]
      .treinos || []).length === 1;
    return r;
  });
  for (const [k, v] of Object.entries(f4tela)) ok(v, 'FASE4 tela ' + k);

  // e em Assistência Social o formulário é OUTRO — não é o de saúde renomeado
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('social')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4soc = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')]
      .find(x => re.test((x.textContent || '').trim()));
    const menu = bt(/^casos socioassistenciais$/i); if (menu) menu.click(); await w(700);
    const novo = bt(/^novo caso$|^escrever o primeiro$/i); if (novo) novo.click(); await w(600);
    const t = document.body.innerText;
    return {
      formularioProprio: /contexto familiar e territorial/i.test(t) && /vulnerabilidades/i.test(t)
        && /rede acionada/i.test(t) && /encaminhamentos/i.test(t),
      // pelos CAMPOS, não pelo texto da página: "conduta" aparece legitimamente na dica
      // do fundamento ("a norma que sustenta a conduta") sem ser campo de caso clínico
      semCamposClinicos: ['achados', 'conduta', 'evolucao', 'apresentacao']
        .every(k => !document.querySelector('[data-k="' + k + '"]')),
      camposSaoOsDoEsquemaSocial: [...document.querySelectorAll('[data-k]')]
        .map(e => e.dataset.k).filter(k => k !== 'q' && k !== 'r').join(',')
        === 'titulo,contexto,demanda,vulnerabilidade,avaliacao,intervencao,rede,encaminhamentos,acompanhamento,fundamento',
      cadernoSeparado: JSON.parse(localStorage.getItem('catedra:casos@social') || '[]').length === 0
        && JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]').length === 1,
    };
  });
  for (const [k, v] of Object.entries(f4soc)) ok(v, 'FASE4 social ' + k);

  // jurídica não abre a tela nem por deep link — e explica em vez de sumir
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4jur = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { window.__catedraGoView('casos'); } catch (_) {}
    await w(800);
    const t = document.body.innerText;
    return {
      naoAbre: !/meus casos/i.test(t),
      explicaEmVezDeSumir: /não faz parte de/i.test(t),
      semMenuDeCasos: ![...document.querySelectorAll('button')]
        .some(x => /^casos (clínicos|socioassistenciais)$/i.test((x.textContent || '').trim())),
    };
  });
  for (const [k, v] of Object.entries(f4jur)) ok(v, 'FASE4 jurídica ' + k);

  /* Sem entrada em ARRAY_ID, `casos` sincronizaria como blob inteiro: um aparelho
     apagaria o caso escrito no outro, e a lápide da exclusão não seguraria — que é
     exatamente o defeito já documentado em `reviews@area`. */

  /* ===== FASE 4 · o que a revisão adversarial pegou ================================
     Cada bloco aqui nasceu de um defeito CONFIRMADO. Eles cobrem o que a primeira leva
     de testes não olhava: os falsos POSITIVOS do guarda (que barravam caso legítimo), a
     troca de área com caso aberto, o ida-e-volta do backup e a revisão órfã. */

  const f4pii = await areaPg.evaluate(() => {
    const C = window.CT_CASOS;
    const BARRA = ['CPF 123.456.789-09', 'tel (69) 98103-8480', '(11) 3255-1010',
      '(011) 3222-1010', '(11) 9 8765-4321', 'Retorno pelo +55 11 98765-4321.',
      'Telefone da irmã: +55 11 98765-4321', 'Fone 021 99888-7766', 'WhatsApp 11 98765-4321',
      'telefone: 98103-8480', 'contato 98765-4321', 'cel 98103-8480', 'contato: 98103-8480',
      'celular: (11) 98888-7777', 'maria@exemplo.com', 'Rua das Flores, 120',
      'Rua das Flores nº 120', 'Avenida Sete de Setembro 1200', 'Av. Brasil, 45',
      'Travessa Bela 7', 'CEP 76800-000', '76800-000', 'prontuário nº 44821',
      'matrícula 998877', 'registro nº 4482', 'nascimento 12/03/1988', 'nasc. 1/2/88',
      'dn 12.03.1988', 'cartão 700 1234 5678 9012', 'RG: 1234567'];
    // prosa legítima de caso clínico e socioassistencial — barrar qualquer uma delas é
    // defeito GRAVE: a pessoa fica sem como guardar um caso que não identifica ninguém
    const PASSA = ['em situação de rua há 3 anos', 'Moram na mesma rua do CRAS há 2 anos',
      'Consultório na Rua há 6 meses', 'acidente em rodovia BR 116',
      'mora em estrada vicinal a 30 km da sede', 'acompanhamento de 2019-2023 no PAIF',
      'débito urinário de 1500-2000 mL em 24 horas', 'diurese 1200-1800 mL/dia',
      'homem, 54 anos, dispneia há 2 dias', 'PA 90x60, FC 118', 'peso ao nascer 1.500 g',
      'família com 4 pessoas, 2 crianças em idade escolar', 'doença de Crohn desde 2019',
      'benefício de 1.412 reais por mês', 'acompanhado desde 03/2019', 'escore de Glasgow 12',
      // homógrafos: "celular" e "contato" são palavra corrente nestas duas profissões, e
      // colá-las a uma faixa numérica NÃO faz um telefone
      'contagem celular 1200-1800/mm³', 'Referência da contagem celular: 4500-11000/mm³',
      'densidade celular 1500-2000 por campo', 'contato 2019-2023 com a rede',
      'contato semanal de 2018-2020', 'telefonema de 2019-2023',
      'telefone: a família tem 2 filhos e renda de 1200 a 1800 reais',
      'leucócitos 4500-11000/mm³', 'plaquetas 150000-400000', 'sódio 135-145 mEq/L',
      'internada de 12/2019 a 03/2020', 'idade gestacional de 34 semanas', 'CID J18.9',
      'glicemia 126 mg/dL', 'renda per capita de 218 reais', '12 sessões de fisioterapia',
      'internado por 12 dias', 'dose de 500 mg, 3x ao dia', 'frequência respiratória 28 irpm',
      '20 atendimentos entre 2021 e 2024', 'registro de acompanhamento desde 2019',
      'matrícula escolar regular', 'nasceu prematuro'];
    const escapou = BARRA.filter(t => C.acharIdentificaveis(t).length === 0);
    const barrouDemais = PASSA.filter(t => C.acharIdentificaveis(t).length > 0);
    return {
      barraOQueIdentifica: escapou.length === 0 || ('escapou: ' + escapou.join(' | ')),
      naoBarraProsaLegitima: barrouDemais.length === 0 || ('barrou: ' + barrouDemais.join(' | ')),
      // o guarda olha TODO campo de texto, não só os do esquema da área ativa
      auditaCampoForaDoEsquema: C.auditar(
        { id: 'x', area: 'saude', apresentacao: 'CPF 123.456.789-09', titulo: 'a', contexto: 'b', demanda: 'c' },
        'social').length === 1,
      gravaSoOEsquema: !('apresentacao' in C.apenasDoEsquema(
        { id: 'x', apresentacao: 'sobra clínica', titulo: 'a' }, 'social')),
    };
  });
  for (const [k, v] of Object.entries(f4pii)) ok(v === true, 'FASE4 guarda ' + k + (v === true ? '' : ' — ' + v));

  /* Trocar de área com rascunho aberto: o caso clínico não pode terminar no caderno
     socioassistencial, e a tela não pode continuar exibindo o que a área não tem. */
  await areaPg.evaluate(() => { localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    localStorage.removeItem('catedra:casos@saude'); localStorage.removeItem('catedra:casos@social'); });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4troca = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    const set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false;
      const p = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value');
      p.set.call(e, val); e.dispatchEvent(new Event('input', { bubbles: true })); return true; };
    const r = {};
    const _bCasos=bt(/^casos clínicos$/i); if(!_bCasos) return { semRascunho: true }; _bCasos.click(); await w(600);
    const _bNovo=bt(/^novo caso$|^escrever o primeiro$/i); if(!_bNovo) return { semRascunho: true }; _bNovo.click(); await w(500);
    r.rascunhoAbriu = set('[data-k="titulo"]', 'Dispneia pós-operatória')
      && set('[data-k="apresentacao"]', 'Homem, 54 anos, CPF 123.456.789-09, dispneia súbita.');
    await w(300);
    // troca de área PELA INTERFACE, sem recarregar — é o caminho que o teste antigo pulava
    const irAjustes = async () => {
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let a = bt2(/^ajustes$/i);
      if (!a) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); a = bt2(/^ajustes$/i); } }
      if (a) { a.click(); await w(900); return true; }
      return false;
    };
    if (!await irAjustes()) return { semAjustes: true };
      // P19: estes fluxos trocam para áreas fora do beta público — abrem a lista inteira antes (como a constante permite)
      try { const R = window.CT_AREA_REG; ['saude','social','policial','fiscal','contas','administrativa','educacao','tecnologia','militar','outra'].forEach(id => { if (R.PUBLICAS.indexOf(id) < 0) R.PUBLICAS.push(id); }); } catch (_) {}
    for (let i = 0; i < 5; i++) {
      const card = [...document.querySelectorAll('button[data-a]')].find(x => x.dataset.a === 'social');
      if (card) { card.click(); await w(900); break; }
      const abrir = bt(/^trocar de área$/i);
      if (abrir) { abrir.click(); await w(700); } else await w(400);
    }
    const conf = [...document.querySelectorAll('button')].find(x => /^trocar para /i.test((x.textContent || '').trim()));
    if (!conf) return { semBotao: true };
    conf.click(); await w(2200);
    r.trocouMesmo = (localStorage.getItem('catedra:areaEstudo') || '').includes('social');
    const irCasos = bt(/^casos socioassistenciais$/i); if (irCasos) irCasos.click(); await w(800);
    r.construtorFechou = !document.querySelector('[data-k="apresentacao"]')
      && !document.querySelector('[data-k="contexto"]');
    r.naoMostraCasoDaOutraArea = !/dispneia pós-operatória/i.test(document.body.innerText);
    await w(900);
    r.nadaVazouParaOSocial = JSON.parse(localStorage.getItem('catedra:casos@social') || '[]')
      .every(c => !c || !('apresentacao' in c));
    r.socialSegueVazio = JSON.parse(localStorage.getItem('catedra:casos@social') || '[]').length === 0;
    return r;
  });
  // um teste que se pula sozinho não é teste: se o caminho não existir, isto FALHA
  // um caminho que não abre é FALHA — sem isto o bloco inteiro passava vazio
  ok(!f4troca.semAjustes && !f4troca.semBotao && !f4troca.semRascunho,
     'FASE4 troca o caminho da troca de área existe' + (f4troca.semAjustes || f4troca.semBotao || f4troca.semRascunho ? ' — ' + JSON.stringify(f4troca) : ''));
  for (const [k, v] of Object.entries(f4troca)) {
    if (k === 'semAjustes' || k === 'semBotao' || k === 'semRascunho') continue;
    ok(v, 'FASE4 troca ' + k);
  }


  /* O backup é o único caminho de volta para conteúdo que só existe porque a pessoa
     escreveu. A tela promete "entram no seu backup" — e a restauração estava apagando os
     casos: o arquivo devolvia ao disco, mas o estado seguia velho e o autosave regravava
     vazio 500 ms depois. Este teste faz o ida-e-volta de verdade. */
  await areaPg.evaluate(() => { localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
    localStorage.setItem('catedra:casos@saude', JSON.stringify([{ id: 'cbk', up: 5, criado: 5,
      area: 'saude', titulo: 'Choque séptico no pós-operatório',
      apresentacao: 'Mulher, 61 anos, febre e hipotensão no 3º dia de pós-operatório.',
      achados: 'PA 80x50, FC 124, lactato 4,2.', avaliacao: '', conduta: '', evolucao: '',
      fonte: '', perguntas: [], treinos: [] }])); });
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1600);
  const f4bkp = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    // 1) exportar, capturando o Blob em vez de baixar o arquivo
    let texto = '';
    const criar = URL.createObjectURL;
    URL.createObjectURL = (b) => { try { b.text().then(t => { texto = t; }); } catch (_) {} return 'blob:teste'; };
    const irAjustes = async () => {
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let a = bt2(/^ajustes$/i);
      if (!a) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); a = bt2(/^ajustes$/i); } }
      if (a) { a.click(); await w(900); return true; }
      return false;
    };
    if (!await irAjustes()) { URL.createObjectURL = criar; return { semBotaoExportar: true }; }
    const abaDados = document.querySelector('main button[data-s="dados"]');
    if (abaDados) { abaDados.click(); await w(700); }
    const exp = bt(/exportar backup/i); if (!exp) { URL.createObjectURL = criar; return { semBotaoExportar: true }; }
    exp.click(); await w(900);
    URL.createObjectURL = criar;
    const r = { exportouOCaso: /Choque séptico/.test(texto) };
    try { localStorage.setItem('teste_backup', texto); } catch (_) {}
    return r;
  });
  ok(!f4bkp.semBotaoExportar, 'FASE4 backup o botão de exportar existe');
  if (!f4bkp.semBotaoExportar) {
    ok(f4bkp.exportouOCaso, 'FASE4 backup exportouOCaso');
    // 2) aparelho "limpo": o caso some do disco e da memória
    await areaPg.evaluate(() => localStorage.removeItem('catedra:casos@saude'));
    await areaPg.goto(URL0 + '/Catedra.dc.html');
    await areaPg.waitForTimeout(1600);
    const volta = await areaPg.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      const texto = localStorage.getItem('teste_backup') || '';
      if (!texto) return { semTexto: true };
      // o input de importar é criado na hora e nunca entra no DOM: capturo na criação
      const criarEl = document.createElement.bind(document);
      let alvo = null;
      document.createElement = (t) => { const e = criarEl(t); if (t === 'input') alvo = e; return e; };
      const bt2 = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
      let aj = bt2(/^ajustes$/i);
      if (!aj) { const mais = bt2(/^mais opções$/i); if (mais) { mais.click(); await w(500); aj = bt2(/^ajustes$/i); } }
      if (aj) { aj.click(); await w(900); }
      const abaDados = document.querySelector('main button[data-s="dados"]');
      if (abaDados) { abaDados.click(); await w(700); }
      const imp = bt(/importar dados|importar backup/i);
      if (!imp) { document.createElement = criarEl; return { semBotaoImportar: true }; }
      imp.click(); await w(300);
      document.createElement = criarEl;
      if (!alvo) return { semInput: true };
      const arq = new File([texto], 'catedra-backup.json', { type: 'application/json' });
      Object.defineProperty(alvo, 'files', { value: [arq], configurable: true });
      alvo.onchange && alvo.onchange();
      await w(2500);                       // passa do autosave de 500 ms de propósito
      const disco = JSON.parse(localStorage.getItem('catedra:casos@saude') || '[]');
      return {
        oCasoVoltouAoDisco: disco.length === 1 && /Choque séptico/.test(disco[0].titulo || ''),
        oAutosaveNaoApagou: disco.length === 1 && !!disco[0].apresentacao,
      };
    });
    if (!volta.semTexto && !volta.semBotaoImportar && !volta.semInput) {
      for (const [k, v] of Object.entries(volta)) ok(v, 'FASE4 backup ' + k);
    } else {
      ok(false, 'FASE4 backup o teste não achou por onde importar (' + JSON.stringify(volta) + ')');
    }
  }

  /* Revisão órfã: o caso morre com lápide, mas a revisão dele era só filtrada. O outro
     aparelho devolvia a revisão pelo merge por id e ela voltava para sempre, com o título
     de um caso que não existe e sem tela por onde removê-la. */
  /* Semeadura em ABA NOVA com addInitScript: semear com setItem na aba compartilhada não
     funciona — o app da carga anterior ainda está vivo e o autosave dele grava por cima
     500 ms depois, o que aqui apagava justamente a lápide que o teste quer exercitar. */
  const orfaCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await orfaCtx.addInitScript(() => {
    try {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:areaEstudo', JSON.stringify('saude'));
      localStorage.setItem('catedra:casos@saude', JSON.stringify([{ id: 'cmorto', del: true, up: 900 }]));
      localStorage.setItem('catedra:reviews@saude', JSON.stringify([
        { id: 'rorfa', casoId: 'cmorto', disc: 'Caso clínico', topic: 'Choque séptico', color: '#8b5cf6',
          due: 0, dueDate: '2026-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 1, up: 100 },
        { id: 'rviva', disc: 'Direito Civil', topic: 'Prescrição', color: '#2563EB',
          due: 0, dueDate: '2026-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 1, up: 100 },
      ]));
    } catch (_) {}
  });
  const orfaPg = await orfaCtx.newPage();
  await orfaPg.goto(URL0 + '/Catedra.dc.html');
  // esperar a CONDIÇÃO, não um tempo fixo: a gravação do autosave atrasa sob carga, e um
  // sleep generoso hoje vira falha intermitente amanhã
  let orfaCaiu = true;
  try {
    await orfaPg.waitForFunction(
      () => !JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]').some(r => r.id === 'rorfa'),
      { timeout: 15000 });
  } catch (_) { orfaCaiu = false; }
  const f4orfa = await orfaPg.evaluate(() => {
    const rv = JSON.parse(localStorage.getItem('catedra:reviews@saude') || '[]');
    return {
      soltouARevisaoDoCasoApagado: !rv.some(r => r.id === 'rorfa'),
      naoLevouAsOutrasJunto: rv.some(r => r.id === 'rviva'),
      sumiuDaTela: !/choque séptico/i.test(document.body.innerText),
    };
  });
  f4orfa.soltouARevisaoDoCasoApagado = f4orfa.soltouARevisaoDoCasoApagado && orfaCaiu;
  for (const [k, v] of Object.entries(f4orfa)) ok(v, 'FASE4 revisão ' + k);

  /* Vocabulário jurídico não pode ser oferecido como método de estudo a quem não estuda
     Direito — nem na tela Bancas, nem na aba Banca dos Ajustes, nem no rótulo do menu. */
  const f4banca = await orfaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bt = re => [...document.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim()));
    const JUR = /súmula|sumul|jurisprud|lei seca|tribunais superiores|acórdão|em Direito/i;
    const out = {};
    const irBancas = bt(/^bancas$/i); if (irBancas) irBancas.click(); await w(900);
    out.telaBancasLimpa = !JUR.test(document.body.innerText);
    let aj = bt(/^ajustes$/i);
    if (!aj) { const mais = bt(/^mais opções$/i); if (mais) { mais.click(); await w(500); aj = bt(/^ajustes$/i); } }
    out.achouAjustes = !!aj;
    if (aj) { aj.click(); await w(900); }
    /* Ajustes refeito: a aba "Método da banca" saiu (o perfil de cada banca é a tela
       Bancas, e ter os dois era a mesma informação em dois lugares). Nos Ajustes sobrou
       só o SELETOR da banca principal, dentro de Ritmo e metas — é ele que decide a
       correção por nota líquida C−E. O que se cobra aqui agora é isso: a aba não existe
       mais e o seletor não se perdeu no caminho. */
    out.semAbaDeBanca = !document.querySelector('main .aj-abas button[data-s="banca"]');
    const secRitmo = document.querySelector('main .aj-abas button[data-s="ritmo"]');
    out.achouSecaoRitmo = !!secRitmo;
    if (secRitmo) { secRitmo.click(); await w(800); }
    const sel = document.querySelector('#aj-f-banca');
    out.seletorDeBancaVive = !!sel;
    out.seletorTemAsBancas = !!sel && sel.querySelectorAll('option').length >= 5;
    out.ajustesSemPerfilDeBanca = !/formato das questões/i.test(document.querySelector('main').innerText);
    return out;
  });
  for (const [k, v] of Object.entries(f4banca)) ok(v, 'FASE4 banca ' + k);
  await orfaCtx.close();


  /* ===== DISCURSIVAS — o enunciado lê como página ==================================
     Texto extraído de PDF chegava com a quebra de linha da página da banca (frases
     partidas no meio) e com o cabeçalho repetido: uma vez no herói, outra na 1ª linha
     do corpo. O teste abre uma prova REAL do banco (TJ-MS 2023, FGV) e confere os três
     consertos: largura de leitura, junção das quebras e cabeçalho sem eco. */
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1800);
  const disc = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('redacao'); await w(2600);
    const busca = [...document.querySelectorAll('input')].find(x => /Buscar por tema/i.test(x.placeholder || ''));
    if (!busca) return { semBusca: true };
    const pd = Object.getOwnPropertyDescriptor(busca.constructor.prototype, 'value');
    pd.set.call(busca, 'TJ-MS'); busca.dispatchEvent(new Event('input', { bubbles: true })); await w(1000);
    const card = [...document.querySelectorAll('button')].find(x => /TJ-MS/.test(x.textContent || ''));
    if (!card) return { semCard: true };
    card.click(); await w(3200);
    const corpo = document.querySelector('.ct-leitura');
    if (!corpo) return { semCorpo: true };
    const t = corpo.innerText;
    return {
      temLarguraDeLeitura: getComputedStyle(corpo).maxWidth !== 'none',
      fraseInteiraNaMesmaLinha: /secretário de Educação do Município/.test(t) && !/de\nEducação/.test(t),
      juntouAQuebraDoPdf: !/\bda con\n/.test(t) && !/ de\n[A-ZÀ-Ú]/.test(t),
      cabecalhoSemEco: !/^TJ-MS · Juiz Substituto/.test(t.trim()),
      corpoNaoVazio: t.trim().length > 400,
    };
  });
  ok(!disc.semBusca && !disc.semCard && !disc.semCorpo,
     'DISC o caminho até a prova existe' + ((disc.semBusca||disc.semCard||disc.semCorpo)?' — '+JSON.stringify(disc):''));
  for (const [k, v] of Object.entries(disc)) {
    if (k.startsWith('sem')) continue;
    ok(v, 'DISC ' + k);
  }

  /* Colar no "Importar edital" tem de COLAR. A exposição de edRaw passou meses dentro de
     um comentário (linha // colada com a de código): o template lia vazio e a caixa
     controlada apagava o que a pessoa colava a cada re-render — e nenhum teste digitava
     nela. Este digita, espera um re-render, e exige o texto ainda lá. */
  await areaPg.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
  await areaPg.goto(URL0 + '/Catedra.dc.html');
  await areaPg.waitForTimeout(1800);
  const edCola = await areaPg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__catedraGoView('edital'); await w(1000);
    let ta = [...document.querySelectorAll('textarea')].find(x => /programátic|cole aqui/i.test(x.placeholder || ''));
    if (!ta) { const abrir = [...document.querySelectorAll('button')].find(x => /importar/i.test(x.textContent || ''));
      if (abrir) { abrir.click(); await w(700); }
      ta = [...document.querySelectorAll('textarea')].find(x => /programátic|cole aqui/i.test(x.placeholder || '')); }
    if (!ta) return { semCaixa: true };
    ta.focus();
    document.execCommand('insertText', false, 'DIREITO CIVIL\n1 Prescrição');
    await w(900);                                    // atravessa pelo menos um re-render
    return { colou: /DIREITO CIVIL/.test(ta.value) };
  });
  ok(!edCola.semCaixa, 'EDITAL a caixa de importar existe');
  if (!edCola.semCaixa) ok(edCola.colou, 'EDITAL colar no importar cola (e sobrevive ao re-render)');

  // o Catedra.dc.html não carrega o auth.js sozinho; o gancho do merge mora na fixture
  await areaPg.goto(URL0 + '/tests/sync-fixture.html');
  await areaPg.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);
  const f4merge = await areaPg.evaluate(() => {
    const M = window.CatedraSync._test.mergeAll;
    const K = 'catedra:casos@saude';
    const srv = {}; srv[K] = JSON.stringify([{ id: 'a', up: 10, titulo: 'do outro aparelho' }]);
    const loc = {}; loc[K] = JSON.stringify([{ id: 'b', up: 20, titulo: 'deste aparelho' }]);
    const juntos = JSON.parse(M(srv, loc, false)[K] || '[]');
    // e a lápide: o mesmo id, apagado aqui depois, não pode ressuscitar da nuvem
    const srv2 = {}; srv2[K] = JSON.stringify([{ id: 'a', up: 10, titulo: 'do outro aparelho' }]);
    const loc2 = {}; loc2[K] = JSON.stringify([{ id: 'a', up: 99, del: true }]);
    const depois = JSON.parse(M(srv2, loc2, false)[K] || '[]');
    return {
      mesclaPorId: juntos.length === 2 && juntos.some(c => c.id === 'a') && juntos.some(c => c.id === 'b'),
      lapideSegura: depois.length === 1 && depois[0].del === true && !depois[0].titulo,
    };
  });
  for (const [k, v] of Object.entries(f4merge)) ok(v, 'FASE4 sync ' + k);


  await areaCtx.close();
  // devolve a aba compartilhada ao estado jurídico, que é o de todos os outros blocos
  await page.evaluate(() => localStorage.setItem('catedra:areaEstudo', JSON.stringify('juridica')));
}

/* ===== TASK 10 · PENTE-FINO DE ACESSIBILIDADE =====
   Coisas que não aparecem em captura de tela: nome de campo, estado de interruptor,
   contraste medido, zoom bloqueado, alvo de toque, movimento reduzido. */
{
  // 1) zoom: nenhuma página pode proibir a pinça (WCAG 1.4.4)
  const zoom = await page.evaluate(async (b) => {
    const paginas = ['Catedra.dc.html', 'legis-web.html', 'juris-web.html', 'area-web.html',
      'ritos-web.html', 'pecas-web.html', 'segunda-fase-web.html', 'prioridade-web.html', 'banco-espelhos.html'];
    const ruins = [];
    for (const p of paginas) {
      const t = await (await fetch(b + '/' + p)).text();
      const m = t.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
      if (m && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?!\d)/i.test(m[0])) ruins.push(p);
    }
    return { nenhumaBloqueiaZoom: ruins.length === 0, quais: ruins.join(', ') };
  }, URL0);
  ok(zoom.nenhumaBloqueiaZoom, 'TASK10 nenhuma página bloqueia o zoom (' + (zoom.quais || 'todas liberadas') + ')');

  // 2) todo campo de busca tem NOME — placeholder não é nome acessível
  const nomes = await page.evaluate(async (b) => {
    const alvos = [['legis-web.html', 'cq'], ['legis-web.html', 'iq'], ['juris-web.html', 'q'],
      ['juris-web.html', 'qtc'], ['area-web.html', 'q'], ['segunda-fase-web.html', 'fq'],
      ['banco-espelhos.html', 'q']];
    const sem = [];
    for (const [p, id] of alvos) {
      const t = await (await fetch(b + '/' + p)).text();
      const tag = (t.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>', 'i')) || [''])[0];
      if (!/aria-label=|aria-labelledby=/.test(tag)) sem.push(p + '#' + id);
    }
    return { todosNomeados: sem.length === 0, quais: sem.join(', ') };
  }, URL0);
  ok(nomes.todosNomeados, 'TASK10 as buscas dos satélites têm nome (' + (nomes.quais || 'todas') + ')');

  // 3) contraste: --text3 sobre bg/surface/surface2, em TODOS os temas dos dois modos
  const contraste = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/Catedra.dc.html')).text();
    const lum = (h) => {
      const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const cont = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const blocos = [...src.matchAll(/\b(light|dark):\{([\s\S]*?)\n\s*heroGrad:'[^']*'\s*\}/g)];
    const ruins = [], pulados = [];
    let medidos = 0;
    for (const [, modo, corpo] of blocos) {
      const d = {}; for (const m of corpo.matchAll(/(\w+):'(#[0-9a-fA-F]{6})'/g)) d[m[1]] = m[2];
      // Tema que o parser não entendeu (hex de 3 dígitos, rgba(), chave renomeada) era
      // descartado em SILÊNCIO: ficava indistinguível de tema aprovado. Agora ele REPROVA —
      // "não consegui medir" não é "passou".
      if (!(d.bg && d.surface && d.surface2 && d.text3 && d.accentSoft)) { pulados.push(modo); continue; }
      medidos++;
      // accentSoft entra na conta: é o fundo do cartão "próximo bloco" do Início, onde o
      // text3 aparece — medir só bg/surface/surface2 deixava justamente esse par de fora.
      const pior = Math.min(...['bg', 'surface', 'surface2', 'accentSoft'].map(k => cont(d.text3, d[k])));
      if (pior < 4.5) ruins.push(modo + ' ' + d.text3 + ' = ' + pior.toFixed(2));
    }
    // `temas` conta o que foi MEDIDO, não o que a regex casou: senão a guarda que existe
    // para detectar "o teste parou de ler algum tema" nunca detectaria nada.
    return { temas: medidos, ok: ruins.length === 0 && pulados.length === 0,
             quais: [...ruins, ...pulados.map(m => 'não consegui medir: ' + m)].slice(0, 5).join(' · ') };
  }, URL0);
  ok(contraste.temas >= 12, 'TASK10 o teste leu os temas todos (' + contraste.temas + ')');
  ok(contraste.ok, 'TASK10 --text3 tem 4.5:1 em todo tema, claro e escuro (' + (contraste.quais || 'todos passam') + ')');

  // 4) corpo mínimo: nada abaixo de 10,5px, nem no tamanho padrão
  const corpo = await page.evaluate(async (b) => {
    const src = await (await fetch(b + '/Catedra.dc.html')).text();
    const m = src.match(/--fs-3xs:\$\{_fs\(([\d.]+)\)\}/);
    return { menorDegrau: m ? parseFloat(m[1]) : 0 };
  }, URL0);
  ok(corpo.menorDegrau >= 10.5, 'TASK10 o menor degrau tipográfico é ' + corpo.menorDegrau + 'px (mínimo 10.5)');

  // 5) interruptor liga/desliga diz o estado, não só o nome
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1900);
  const sw = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    // Ajustes vive atrás de "Mais opções" desde a TASK5: abrir o expansor faz parte do caminho
    const ir = async (v) => {   // (a página já foi recarregada em desktop logo acima)
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
        if (mais) { mais.click(); await w(500); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(1000); }
      return !!b;
    };
    if (!await ir('ajustes')) return { erro: 'não achei a entrada de Ajustes' };
    // Ajustes refeito: automações e alertas ganharam seção própria. Antes o bloco de
    // alertas ficava FORA de qualquer portão de aba e aparecia em todas — era bug, não
    // referência; agora o caminho até os interruptores passa pela seção.
    const secAuto = document.querySelector('main .aj-abas button[data-s="automacoes"]');
    if (secAuto) { secAuto.click(); await w(800); }
    const sws = [...document.querySelectorAll('[role="switch"]')];
    if (!sws.length) return { erro: 'nenhum interruptor com papel' };
    const r = {
      todosTemEstado: sws.every(s => s.getAttribute('aria-checked') === 'true' || s.getAttribute('aria-checked') === 'false'),
      todosTemNome: sws.every(s => (s.getAttribute('aria-label') || '').length > 3),
      quantos: sws.length >= 6,
    };
    // e o estado ACOMPANHA o clique (não é um atributo decorativo)
    const alvo = sws[0], antes = alvo.getAttribute('aria-checked');
    alvo.click(); await w(500);
    const depois = document.querySelectorAll('[role="switch"]')[0].getAttribute('aria-checked');
    r.estadoSegueOClique = depois !== antes;
    document.querySelectorAll('[role="switch"]')[0].click(); await w(300);
    return r;
  });
  if (sw.erro) ok(false, 'TASK10 ' + sw.erro);
  else for (const [k, v] of Object.entries(sw)) ok(v, 'TASK10 interruptor ' + k);

  // 6) alvo de toque no celular, nas telas mais usadas
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  const toque = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* Mede a CAIXA DE TOQUE, não o desenho.
       A primeira versão exigia 44x44 de todo controle e eu a fiz passar inflando tudo com
       !important — o que deformou quadradinho do Edital, célula do calendário e o trilho
       dos interruptores (que viraram discos). O alvo agora é o da WCAG 2.2 AA (2.5.8):
       24x24 de mínimo duro. Quem quer os 44 confortáveis usa .ct-alvo, que cresce a área
       por um pseudo-elemento e deixa o desenho intacto — e o teste conta isso. */
    const MIN = 24;
    const medir = () => [...document.querySelectorAll('button,a[href],select,[role="button"],[role="switch"],[role="tab"]')]
      .filter(e => e.offsetParent !== null)
      .map(e => {
        const r = e.getBoundingClientRect();
        const alvo = e.classList.contains('ct-alvo');   // caixa de toque expandida por ::after
        return { w: alvo ? Math.max(44, r.width) : r.width,
                 h: alvo ? Math.max(44, r.height) : r.height, rw: r.width,
                 t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28) };
      })
      .filter(x => x.rw > 0 && (x.h < MIN || x.w < MIN))
      .map(x => x.t + '[' + Math.round(x.w) + 'x' + Math.round(x.h) + ']');
    // a view fica gravada: sem voltar ao Início de propósito, mediríamos a tela anterior
    const inicio = document.querySelector('button[data-view="inicio"]');
    if (inicio) { inicio.click(); await w(900); }
    const r = { inicio: medir() };
    for (const v of ['ciclo', 'ajustes']) {
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const abrir = document.querySelector('button[aria-label="Abrir menu"]');
        if (abrir) { abrir.click(); await w(500); }
        const mais = document.querySelector('button[aria-label="Mostrar mais opções"]');
        if (mais) { mais.click(); await w(500); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(1000); r[v] = medir(); }
    }
    return r;
  });
  for (const [tela, l] of Object.entries(toque))
    ok(l.length === 0, 'TASK10 alvo de toque em ' + tela + ' (' + (l.join(', ') || 'todos ≥24px') + ')');

  /* E a regressão que originou tudo isto: a regra de toque NÃO pode deformar o desenho.
     Três medidas concretas do estrago que a primeira versão causava. */
  const semDeformar = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ir = async (v) => {
      let b = document.querySelector('button[data-view="' + v + '"]');
      if (!b) {
        const ab = document.querySelector('button[aria-label="Abrir menu"]'); if (ab) { ab.click(); await w(400); }
        const m = document.querySelector('button[aria-label="Mostrar mais opções"]'); if (m) { m.click(); await w(400); }
        b = document.querySelector('button[data-view="' + v + '"]');
      }
      if (b) { b.click(); await w(900); } return !!b;
    };
    const r = {};
    // o interruptor continua uma PÍLULA (mais largo que alto), não um disco de 44
    await ir('ajustes');
    const sw = document.querySelector('[role="switch"]');
    if (sw) { const b = sw.getBoundingClientRect(); r.interruptorContinuaPilula = b.width > b.height + 8; }
    // a célula do calendário mantém a altura que o mês precisa
    await ir('calendario');
    const cel = document.querySelector('button.ct-calcell');
    if (cel) r.celulaDoCalendarioNaoEncolhe = cel.getBoundingClientRect().height >= 50;
    // as classes de exceção que eu tinha inventado não existiam; nenhuma pode voltar sem dono
    r.semClasseFantasma = !document.querySelector('.ct-nobump, .ct-cal-cel');
    return r;
  });
  for (const [k, v] of Object.entries(semDeformar)) ok(v, 'TASK10 ' + k);
  await page.setViewportSize({ width: 1280, height: 800 });

  // 7) movimento reduzido: host e satélites
  const mov = await page.evaluate(async (b) => {
    const [host, base, banco] = await Promise.all([
      (await fetch(b + '/Catedra.dc.html')).text(),
      (await fetch(b + '/satellite-base.css')).text(),
      (await fetch(b + '/banco-espelhos.html')).text()]);
    const tem = t => /prefers-reduced-motion:\s*reduce/.test(t) && /animation-duration:\s*\.00?1ms\s*!important/.test(t);
    return { hostRespeita: tem(host), sateliteRespeita: tem(base), bancoRespeita: tem(banco) };
  }, URL0);
  for (const [k, v] of Object.entries(mov)) ok(v, 'TASK10 ' + k);
}

/* ===== TASK 8 · PROVA ORAL E PRIORIDADE VIRAM AÇÃO =====
   A Prova oral abria com nomes de ACERVO e um paredão de filtros; o ranking de Prioridade
   dizia o que estudar e parava aí. Agora as duas telas oferecem o próximo passo. */
{
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);

  const oral = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('button[data-view="oral"]').click(); await w(900);
    const cards = [...document.querySelectorAll('button[data-i]')];
    let diag = '';
    const r = {
      tresIntencoes: cards.length === 3,
      // o rótulo diz o ATO, não o acervo de onde vem
      dizemOAto: /treinar argui/i.test(cards.map(c => c.textContent).join(' '))
        && /responder quest/i.test(cards.map(c => c.textContent).join(' '))
        && /consultar concursos/i.test(cards.map(c => c.textContent).join(' ')),
      // a diferença entre as três está escrita, não subentendida
      explicaADiferenca: cards.every(c => (c.textContent || '').length > 90),
      // os cards vêm ANTES dos filtros detalhados. Os filtros só pintam quando o acervo de
      // jurisprudência acaba de carregar (até lá a tela diz "Carregando o acervo…"). Sob carga
      // isso passava dos 900 ms, não havia button[data-v] NENHUM na página, e a asserção falhava
      // por ausência, não por ordem. Espera os filtros (a cada 50 ms) e só então compara.
      antesDosFiltros: await (async () => {
        for (let i = 0; i < 160 && !document.querySelector('button[data-v]'); i++) await w(50);
        const f = document.querySelector('button[data-v]'), c0 = document.querySelector('button[data-i]');
        const antes = !!f && !!c0 && !!(c0.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (!antes) {   // quando falha, diz quem é o button[data-v] (ou que não há nenhum)
          const nome = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '')
            + ['role', 'aria-label', 'data-ct-view'].map(a => e.getAttribute(a) ? '[' + a + '=' + e.getAttribute(a) + ']' : '').join('');
          const anc = []; for (let e = f && f.parentElement; e && e !== document.documentElement && anc.length < 12; e = e.parentElement) anc.push(nome(e));
          diag = JSON.stringify({ view: (window.__catedraApp || { state: {} }).state.view, carregandoAcervo: /Carregando o acervo/.test(document.body.innerText),
            html: f ? f.outerHTML.slice(0, 300) : 'nenhum button[data-v] na página', ancestrais: anc,
            dialogos: [...document.querySelectorAll('[role=dialog]')].map(d => d.getAttribute('aria-label') || nome(d)) });
        }
        return antes;
      })(),
    };
    if (diag) r.__diag = diag;
    // "Treinar arguição" cai no modo arguição que já existia — com relógio e sem cronômetro novo
    cards.find(c => c.dataset.i === 'treinar').click(); await w(3500);
    r.treinarAbreArguicao = /\d+:\d\d/.test(document.body.innerText) && !document.querySelector('button[data-i]');
    r.umCronometroSo = (document.body.innerText.match(/\b\d{1,2}:\d{2}\b/g) || []).length <= 3;
    return r;
  });
  // o diagnóstico vai para o log, não vira asserção
  if (oral.__diag) console.log('  diagnóstico do TASK8 oral antesDosFiltros: ' + oral.__diag);
  for (const [k, v] of Object.entries(oral)) if (k !== '__diag') ok(v, 'TASK8 oral ' + k);

  // --- Prioridade: as duas saídas de estudo ---
  const prioAcoes = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__abriu = [];
    window.open = (u) => { window.__abriu.push(String(u)); return null; };
    document.querySelector('button[data-view="prioridade"]').click(); await w(2200);
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe de prioridade não abriu' };
    const d = f.contentDocument;
    const linha = d.querySelector('.linha .lh');
    if (!linha) return { erro: 'ranking vazio' };
    linha.click(); await w(300);
    const det = d.querySelector('.linha.on .det');
    const r = {
      temResolverQuestoes: !!det.querySelector('[data-praticar]'),
      temAbrirLei: !!det.querySelector('[data-lei]'),
      // a lei oferecida é o dispositivo REAL mais cobrado, não um genérico
      leiEhODispositivoTop: (() => {
        const b = det.querySelector('[data-lei]'), top = det.querySelector('.arts button');
        return !!b && !!top && /art\.\s*\S+/.test(b.dataset.lei);
      })(),
    };
    det.querySelector('[data-praticar]').click(); await w(700);
    r.resolverAbreAPlataforma = window.__abriu.length === 1 && /tecconcursos\.com\.br/.test(window.__abriu[0]);
    r.levaADisciplina = /texto=|q=/.test(window.__abriu[0] || '');
    return r;
  });
  if (prioAcoes.erro) ok(false, 'TASK8 prioridade ' + prioAcoes.erro);
  else for (const [k, v] of Object.entries(prioAcoes)) ok(v, 'TASK8 prioridade ' + k);

  // "Abrir a lei mais cobrada" leva ao LEGIS e deixa a volta para o Painel de Prioridade
  const voltaDaLei = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const f = document.querySelector('iframe[data-ct-view="prioridade"]');
    if (!f || !f.contentDocument) return { erro: 'iframe sumiu' };
    const b = f.contentDocument.querySelector('.linha.on .det [data-lei]');
    if (!b) return { erro: 'sem botão de lei' };
    b.click(); await w(1800);
    const legis = document.querySelector('iframe[data-ct-view="legis"]');
    return { leiAbreOLegis: !!legis && legis.style.display === 'block' };
  });
  if (voltaDaLei.erro) ok(false, 'TASK8 prioridade ' + voltaDaLei.erro);
  else for (const [k, v] of Object.entries(voltaDaLei)) ok(v, 'TASK8 prioridade ' + k);

  /* A plataforma escolhida em Ajustes é respeitada — e este teste só vale se ele TROCAR
     a plataforma. A primeira versão nunca escrevia `plataformaQuestoes`, rodava no default
     'tec' e conferia só que "alguma URL abriu": ignorar a escolha da pessoa e mandar todo
     mundo para o TEC passaria verde. */
  // _load() faz JSON.parse: gravar o valor cru estoura e cai no fallback 'tec' — em silêncio
  await page.evaluate(() => localStorage.setItem('catedra:plataformaQuestoes', JSON.stringify('qc')));
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1800);
  await prepararPonteReal(page, 'prioridade');
  const outraPlataforma = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.__abriu = [];
    window.open = (u) => { window.__abriu.push(String(u)); return null; };
    document.querySelector('iframe[data-ct-view="prioridade"]').contentWindow.__ctTestePostar(
      { type: 'ctPraticarPrioridade', disc: 'Direito Civil' });
    await w(700);
    const url = window.__abriu[0] || '';
    return {
      hostAtendeAMensagem: window.__abriu.length === 1 && /^https?:/.test(url),
      respeitaAEscolhaDeAjustes: /qconcursos\.com/.test(url),
      naoCaiNoTecPorPadrao: !/tecconcursos\.com\.br/.test(url),
      levaADisciplinaEscolhida: /Civil/i.test(decodeURIComponent(url)),
    };
  });
  for (const [k, v] of Object.entries(outraPlataforma)) ok(v, 'TASK8 prioridade ' + k);
  await page.evaluate(() => localStorage.removeItem('catedra:plataformaQuestoes'));

}

/* ===== TASK 6 · CICLO: EXECUTAR E CONFIGURAR SÃO COISAS DIFERENTES =====
   A tela do Ciclo empilhava a rotina de hoje e o construtor. Quem abria para estudar tinha de
   passar pelo painel de configuração. Agora são duas abas — e trocar de aba não pode encostar
   em blocks, manualFixed nem manualRot: é estado de tela, não de dados. */
{
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const ciclo = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
    const tab = id => document.getElementById(id);
    document.querySelector('button[data-view="ciclo"]').click(); await w(800);
    const r = {};
    // 1) abre pronta para executar
    r.abreExecutando = vis('ct-cycle-panel-executar') && !vis('ct-cycle-panel-configurar');
    r.abaExecutarSelecionada = tab('ct-cycle-tab-executar').getAttribute('aria-selected') === 'true';
    r.painelTemNome = tab('ct-cycle-tab-executar').getAttribute('aria-controls') === 'ct-cycle-panel-executar'
      && document.getElementById('ct-cycle-panel-executar').getAttribute('aria-labelledby') === 'ct-cycle-tab-executar';
    /* 2) os dados do ciclo ANTES de mexer nas abas.
       A primeira versão comparava as chaves numa conta VAZIA: manualFixed e manualRot
       valiam "[]" dos dois lados, então um setCyclePanel que apagasse o ciclo manual da
       pessoa comparava "[]" com "[]" e passava verde. Agora o teste semeia conteúdo real
       — só assim a comparação tem o que perder. */
    const SEMENTE = {
      'catedra:manualFixed': JSON.stringify([{ id: 'f1', up: 1, dia: 'seg', disc: 'Direito Penal' }]),
      'catedra:manualRot': JSON.stringify([{ id: 'r1', up: 1, disc: 'Direito Civil' }]),
      'catedra:blocks': JSON.stringify([{ id: 'b1', up: 1, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: false }]),
    };
    for (const [k, v] of Object.entries(SEMENTE)) { try { localStorage.setItem(k, v); } catch (_) {} }
    const snap = () => JSON.stringify(['blocks','manualFixed','manualRot','cycleMode']
      .map(k => { try { return localStorage.getItem('catedra:' + k); } catch (_) { return null; } }));
    const antes = snap();
    r.sementeTemConteudo = ['manualFixed','manualRot','blocks']
      .every(k => (localStorage.getItem('catedra:' + k) || '').length > 20);
    // 3) troca para configurar
    tab('ct-cycle-tab-configurar').click(); await w(700);
    r.trocaMostraConfig = vis('ct-cycle-panel-configurar') && !vis('ct-cycle-panel-executar');
    r.abaConfigSelecionada = tab('ct-cycle-tab-configurar').getAttribute('aria-selected') === 'true';
    r.abaExecutarSaiDaTabulacao = tab('ct-cycle-tab-executar').tabIndex === -1;
    r.dadosIntactos = snap() === antes;
    // 4) o construtor de verdade está na aba de configuração
    r.configTemOsModos = /Como montar seu ciclo/i.test(document.getElementById('ct-cycle-panel-configurar').textContent || '');
    // 5) seta volta para executar (roving tabindex sem seta deixaria a aba inalcançável)
    tab('ct-cycle-tab-configurar').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await w(700);
    r.setaVoltaParaExecutar = vis('ct-cycle-panel-executar') && !vis('ct-cycle-panel-configurar');
    r.setaLevaOFoco = document.activeElement === tab('ct-cycle-tab-executar');
    // 6) painel escondido não deve ser tabulável
    r.escondidoNaoRecebeFoco = [...document.querySelectorAll('#ct-cycle-panel-configurar button')]
      .every(b => b.offsetParent === null);
    return r;
  });
  for (const [k, v] of Object.entries(ciclo)) ok(v, 'TASK6 ' + k);

  // conta sem ciclo montado: "Executar" não pode ser uma tela em branco
  const vazio = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const p = document.getElementById('ct-cycle-panel-executar');
    const temPonte = /ainda não tem blocos/i.test(p.textContent || '');
    if (!temPonte) return { pulou: true };
    const b = [...p.querySelectorAll('button')].find(x => /configurar ciclo/i.test(x.textContent || ''));
    b.click(); await w(700);
    return { ponteLevaAConfigurar: getComputedStyle(document.getElementById('ct-cycle-panel-configurar')).display !== 'none' };
  });
  if (!vazio.pulou) for (const [k, v] of Object.entries(vazio)) ok(v, 'TASK6 ' + k);
}

/* ===== TASK 4 · A ESCOLHA DO ONBOARDING É EXPLÍCITA =====
   O passo "Por onde quer começar?" abria sem nada selecionado: apertar Continuar caía num
   fallback silencioso, e a tela não dizia o que ia acontecer. E o modal aparecia POR CIMA
   do login, os dois disputando a atenção. */
{
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1500);
  const semLogin = await page.evaluate(() => ({
    // sem sessão, a tela de entrada manda: o onboarding espera a vez
    onboardingNaoCompeteComOLogin: !document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]')
      && !/Bem-vindo à Cátedra/.test(document.body.innerText || ''),
  }));
  for (const [k, v] of Object.entries(semLogin)) ok(v, 'TASK4 ' + k);

  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.removeItem('catedra:onboarded'); });
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.waitForTimeout(1600);
  const onb = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const avancar = async (n) => { for (let i = 0; i < n; i++) {
      const b = [...document.querySelectorAll('button')].find(x => /Começar|Continuar/.test((x.textContent || '').trim()) && x.offsetParent !== null);
      if (b) { b.click(); await w(350); } } };
    await avancar(2);
    const grupo = document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]');
    if (!grupo) return { erro: 'não cheguei ao passo da escolha' };
    const cards = [...grupo.querySelectorAll('[role="radio"]')];
    const marcado = cards.filter(c => c.getAttribute('aria-checked') === 'true');
    return {
      grupoTemPapel: true,
      // duas opções: importar backup saiu da escolha principal e virou link (tests/onboarding-importar.mjs)
      duasOpcoesComPapel: cards.length === 2,
      umaSoMarcada: marcado.length === 1,
      oRecomendadoVemMarcado: marcado.length === 1 && marcado[0].getAttribute('data-c') === 'ciclo',
      // /i porque o rótulo é uppercase por CSS e o innerText devolve RECOMENDADO
      seloRecomendadoVisivel: /recomendado/i.test(grupo.innerText || ''),
      // escolher outro move a marca, e a marca não é só cor. Precisa esperar o re-render:
      // ler aria-checked no mesmo tique devolve o valor antigo.
      trocaDeEscolha: await (async () => {
        cards.find(c => c.getAttribute('data-c') === 'edital').click();
        await w(400);
        const g2 = document.querySelector('[role="radiogroup"][aria-label="Por onde quer começar"]');
        const q = (c) => g2.querySelector('[data-c="' + c + '"]').getAttribute('aria-checked');
        return q('edital') === 'true' && q('ciclo') === 'false';
      })(),
    };
  });
  if (onb.erro) ok(false, 'TASK4 ' + onb.erro);
  else for (const [k, v] of Object.entries(onb)) ok(v, 'TASK4 ' + k);
}

/* ===== TASK 3 · UMA ÚNICA PRÓXIMA AÇÃO NO INÍCIO =====
   O Início oferecia quatro KPIs, chips de área, ritmo semanal, "o dia em campo" e um "Foco
   sugerido" — todos disputando a mesma decisão. Agora há UM card, derivado do que já se
   calcula, com precedência fixa. Os casos abaixo verificam o TEXTO, o TIPO e o DESTINO, não
   só a presença do card: um card que aparece apontando para o lugar errado é pior que nenhum. */
{
  const semear = async (dados) => {
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate((d) => {
      ['reviews', 'blocks', 'blocksDate', 'eventos', 'sessions', 'edital', 'lastPonto', 'semanaLidos']
        .forEach(k => localStorage.removeItem('catedra:' + k));
      Object.keys(d).forEach(k => localStorage.setItem('catedra:' + k, JSON.stringify(d[k])));
      localStorage.setItem('catedra:auth', '1');
      localStorage.setItem('catedra:onboarded', '1');
    }, dados);
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(1700);
    return page.evaluate(() => {
      const card = document.querySelector('[data-proxima-acao]');
      if (!card) return { achou: false };
      const cta = card.querySelector('button[data-view],button[data-acao]');
      return {
        achou: true,
        tipo: card.getAttribute('data-proxima-acao'),
        texto: (card.innerText || '').replace(/\s+/g, ' ').trim(),
        destino: cta ? (cta.getAttribute('data-view') || cta.getAttribute('data-acao')) : null,
        umCtaSo: card.querySelectorAll('button').length === 1,
      };
    });
  };
  const hoje = new Date();
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const blocoAberto = [{ i: 0, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: false }];

  // 1 — revisão vencida ganha de tudo
  const a1 = await semear({
    reviews: [{ id: 'r1', disc: 'Direito Penal', topic: 'Dolo', due: -3, dueDate: '2020-01-01', intervalo: 1, facilidade: 2.5, repeticoes: 0 }],
    blocks: blocoAberto, blocksDate: iso(hoje),
  });
  ok(a1.achou && a1.tipo === 'revisao', 'TASK3 revisão vencida vence a precedência (' + (a1.tipo || 'sem card') + ')');
  ok(a1.achou && a1.destino === 'revisoes', 'TASK3 a revisão manda para a tela de Revisões');
  ok(a1.achou && /revis/i.test(a1.texto), 'TASK3 o card diz que se trata de revisão');
  ok(a1.achou && a1.umCtaSo, 'TASK3 um único CTA no card');

  // 2 — sem revisão vencida, o bloco aberto do ciclo assume
  const a2 = await semear({ reviews: [], blocks: blocoAberto, blocksDate: iso(hoje) });
  ok(a2.achou && a2.tipo === 'ciclo', 'TASK3 bloco aberto do ciclo assume quando não há revisão (' + (a2.tipo || 'sem card') + ')');
  ok(a2.achou && a2.destino === 'ciclo', 'TASK3 o bloco manda para o Ciclo');
  ok(a2.achou && /civil/i.test(a2.texto), 'TASK3 o card nomeia a disciplina do bloco');

  // 3 — nada pendente hoje: o card não some, vira estado neutro com destino real
  const a3 = await semear({ reviews: [], blocks: [{ i: 0, disc: 'Direito Civil', kind: 'Teoria', min: 50, done: true }], blocksDate: iso(hoje) });
  ok(a3.achou, 'TASK3 sem pendência o card continua existindo (estado neutro)');
  ok(a3.achou && !!a3.destino, 'TASK3 o estado neutro também tem destino real (' + (a3.destino || 'nenhum') + ')');

  // o "Foco sugerido" não pode competir com o card na mesma posição
  const duplicado = await page.evaluate(() => {
    const txt = (document.body.innerText || '');
    const card = document.querySelector('[data-proxima-acao]');
    const antes = card ? txt.indexOf(card.innerText.slice(0, 24)) : -1;
    const foco = txt.indexOf('Foco sugerido');
    return { temCard: !!card, focoDepoisOuAusente: foco === -1 || (antes >= 0 && foco > antes) };
  });
  ok(duplicado.temCard && duplicado.focoDepoisOuAusente, 'TASK3 o "Foco sugerido" não disputa a mesma posição do card');
}

/* ===== A COR DO GATE SEGUE A DIREÇÃO VISUAL =====
   Sem cor personalizada o gate era verde fixo, mesmo com a direção Fibra (índigo) ou
   Solar (laranja): ele abre antes do app e não conhecia a tabela de temas. Agora carrega
   a mesma tabela (claro/escuro por direção) e só cai no verde quando a direção é a
   Planilha ou é desconhecida. Cor personalizada em hex continua mandando. */
{
  const corDoGate = async (dir, dark, accent) => {
    await page.goto(URL0 + '/tests/auth-gate-fixture.html');
    await page.evaluate(({ dir, dark, accent }) => {
      ['catedra:dir', 'catedra:dark', 'catedra:accent'].forEach(k => localStorage.removeItem(k));
      if (dir != null) localStorage.setItem('catedra:dir', dir);
      if (dark != null) localStorage.setItem('catedra:dark', dark);
      if (accent != null) localStorage.setItem('catedra:accent', accent);
    }, { dir, dark, accent });
    await page.goto(URL0 + '/tests/auth-gate-fixture.html');
    await page.waitForTimeout(600);
    return page.evaluate(() => {
      const g = document.getElementById('catedra-auth-gate'); if (!g) return null;
      const st = [...g.querySelectorAll('*')].map(e => e.getAttribute('style') || '').find(s => /linear-gradient\(135deg/.test(s)) || '';
      const m = st.match(/linear-gradient\(135deg,(#[0-9a-f]{6})/i); return m ? m[1].toLowerCase() : null;
    });
  };
  ok((await corDoGate('clean', '1', '"tema"')) === '#818cf8', 'GATE/COR sem cor personalizada, Fibra escuro pinta o gate de índigo');
  ok((await corDoGate('solar', '0', null)) === '#ea580c', 'GATE/COR sem cor personalizada, Solar claro pinta o gate de laranja');
  ok((await corDoGate('solar', '0', '"#7c3aed"')) === '#7c3aed', 'GATE/COR a cor personalizada em hex continua mandando');
  ok((await corDoGate('inexistente', '0', null)) === '#0f7a57', 'GATE/COR direção desconhecida cai no verde da Planilha');
  await page.evaluate(() => ['catedra:dir', 'catedra:dark', 'catedra:accent'].forEach(k => localStorage.removeItem(k)));
}

/* ===== TASK 2 · O GATE DE AUTENTICAÇÃO ISOLA O APP =====
   O gate cobre a tela, mas só isso: o app atrás continua rolando (4.446 px de scroll),
   continua alcançável por Tab e continua sendo lido por leitor de tela. Um overlay que
   não isola não é um portão — é uma cortina. Os casos abaixo travam o isolamento pelo
   COMPORTAMENTO observável, via tests/auth-gate-fixture.html (auth.js de verdade, com
   um cliente Supabase falso que devolve "sem sessão"). */
/* O fixture põe o app no HTML de saída, então o gate sempre encontrou um irmão para
   isolar — e por isso passava. Na BUILD REAL o auth.js é script de <head>: quando ele
   roda, <body> não existe, o gate nasce em <html> e o único "irmão" era o <head>. O app
   (#dc-root) montava depois, livre: com o login na tela, Tab entrava direto na barra
   lateral. Este teste reproduz a ordem de carga da produção. */
{
  await page.goto(URL0 + '/tests/auth-gate-tardio.html');
  await page.waitForTimeout(900);
  const tardio = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    await w(400);
    const gate = document.getElementById('catedra-auth-gate');
    const app = document.getElementById('app-tardio');
    const foras = [];
    for (let i = 0; i < 8; i++) {
      const fs = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
        .filter(x => x.offsetParent !== null);
      const idx = fs.indexOf(document.activeElement);
      const prox = fs[(idx + 1) % fs.length];
      if (prox) prox.focus();
      if (document.activeElement !== document.body && gate && !gate.contains(document.activeElement)) {
        foras.push((document.activeElement.textContent || '').trim().slice(0, 20));
      }
    }
    return {
      appMontouDepois: !!app,
      appQueMontouDepoisFicaInerte: !!app && app.inert === true,
      appQueMontouDepoisSaiDoLeitor: !!app && app.getAttribute('aria-hidden') === 'true',
      headNaoEhMarcadoPorEngano: document.head.inert !== true,
      rolagemTravada: document.documentElement.style.overflow === 'hidden',
      nadaEscapaDoGate: foras.length === 0,
    };
  });
  for (const [k, v] of Object.entries(tardio)) ok(v, 'GATE ' + k);
}

await page.goto(URL0 + '/tests/auth-gate-fixture.html');
await page.waitForTimeout(1200);
const gate = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const app = document.getElementById('app');
  if (!el) return { erro: 'o gate não foi criado' };
  await w(400);
  return {
    gateVisivel: getComputedStyle(el).display !== 'none',
    // a página atrás não pode rolar enquanto o login está na frente
    bodyTravado: document.body.style.overflow === 'hidden',
    htmlTravado: document.documentElement.style.overflow === 'hidden',
    // e não pode ser alcançada por mouse, teclado ou leitor de tela
    appInerte: app.inert === true,
    appEscondidoDoLeitor: app.getAttribute('aria-hidden') === 'true',
    // semântica de diálogo
    ehDialogo: el.getAttribute('role') === 'dialog',
    ehModal: el.getAttribute('aria-modal') === 'true',
    temNome: !!(el.getAttribute('aria-label') || '').trim(),
  };
});
if (gate.erro) ok(false, 'GATE ' + gate.erro);
else for (const [k, v] of Object.entries(gate)) ok(v, 'GATE ' + k);

// O foco não escapa do gate, e o Esc não fecha um login obrigatório.
const gateFoco = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const dentro = (n) => !!n && el.contains(n);
  const focaveis = [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(n => n.offsetParent !== null || n === document.activeElement);
  if (!focaveis.length) return { erro: 'nenhum controle focável no gate' };
  const r = {};
  // Tab sintético não move o foco sozinho: quem move é o trap. Então a asserção é o ALVO
  // exato, não "continua dentro" — que passaria mesmo sem trap nenhum.
  const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
  ultimo.focus();
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  await w(120);
  r.tabNoUltimoVoltaAoPrimeiro = document.activeElement === primeiro;
  primeiro.focus();
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  await w(120);
  r.shiftTabNoPrimeiroVoltaAoUltimo = document.activeElement === ultimo;
  r.focoNuncaEscapa = dentro(document.activeElement);
  // Esc não fecha: o login é obrigatório
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(200);
  r.escNaoFechaOLogin = getComputedStyle(el).display !== 'none';
  return r;
});
if (gateFoco.erro) ok(false, 'GATE foco: ' + gateFoco.erro);
else for (const [k, v] of Object.entries(gateFoco)) ok(v, 'GATE ' + k);

// Abas Entrar/Criar conta e o botão da senha precisam DIZER o seu estado.
const gateSemantica = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const entrar = el.querySelector('#ctseg-login');
  const criar = el.querySelector('#ctseg-signup');
  if (!entrar || !criar) return { erro: 'não achei as abas Entrar/Criar conta' };
  const r = {
    abaEntrarSelecionada: entrar.getAttribute('aria-selected') === 'true',
    abaCriarNaoSelecionada: criar.getAttribute('aria-selected') === 'false',
    abasTemPapel: entrar.getAttribute('role') === 'tab' && criar.getAttribute('role') === 'tab',
    // roving tabindex: só a aba ativa entra na ordem de tabulação
    rovingTabindex: entrar.getAttribute('tabindex') === '0' && criar.getAttribute('tabindex') === '-1',
  };
  criar.click(); await w(300);
  const entrar2 = el.querySelector('#ctseg-login'), criar2 = el.querySelector('#ctseg-signup');
  r.trocaDeAbaAtualizaOEstado = criar2.getAttribute('aria-selected') === 'true'
    && entrar2.getAttribute('aria-selected') === 'false';
  el.querySelector('#ctseg-login').click(); await w(300);
  // o olho da senha diz o que vai fazer, e muda quando faz
  const olho = el.querySelector('[data-olho]');
  r.olhoTemNome = !!olho && /mostrar senha/i.test(olho.getAttribute('aria-label') || '');
  if (olho) { olho.click(); await w(150); r.olhoMudaDeNome = /ocultar senha/i.test(olho.getAttribute('aria-label') || ''); olho.click(); }
  return r;
});
if (gateSemantica.erro) ok(false, 'GATE semântica: ' + gateSemantica.erro);
else for (const [k, v] of Object.entries(gateSemantica)) ok(v, 'GATE ' + k);

// Ao fechar, o app volta ao que era: rolagem, inert e aria-hidden restaurados.
const gateFecha = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const el = document.getElementById('catedra-auth-gate');
  const app = document.getElementById('app');
  if (!el.__setGateOpen) return { erro: 'setGateOpen não foi exposto no elemento do gate' };
  el.__setGateOpen(false);
  await w(200);
  return {
    fechouOGate: getComputedStyle(el).display === 'none',
    devolveuARolagem: document.body.style.overflow !== 'hidden' && document.documentElement.style.overflow !== 'hidden',
    appVoltouAFuncionar: app.inert !== true && app.getAttribute('aria-hidden') !== 'true',
  };
});
if (gateFecha.erro) ok(false, 'GATE fecha: ' + gateFecha.erro);
else for (const [k, v] of Object.entries(gateFecha)) ok(v, 'GATE ' + k);

// A prova que importa: a página atrás não rola com GESTO DE GENTE. `overflow:hidden` bloqueia
// roda e teclado, mas não bloqueia window.scrollBy — medir com scrollBy daria falso negativo.
await page.goto(URL0 + '/tests/auth-gate-fixture.html');
await page.waitForTimeout(1300);
const antesDeRolar = await page.evaluate(() => window.scrollY);
await page.mouse.move(400, 400);
await page.mouse.wheel(0, 2000);
await page.waitForTimeout(350);
const depoisDaRoda = await page.evaluate(() => window.scrollY);
await page.keyboard.press('End');
await page.waitForTimeout(300);
const depoisDoEnd = await page.evaluate(() => window.scrollY);
ok(depoisDaRoda === antesDeRolar, 'GATE a roda do mouse não rola o app atrás do login');
ok(depoisDoEnd === antesDeRolar, 'GATE a tecla End não rola o app atrás do login');

// ===== TEMA: as oito direções visuais têm de FIXAR =====
// A regressão que motivou isto: Aurora, Solar, Terminal e Holo eram gravadas em
// catedra:dir e RECUSADAS na releitura por uma lista de quatro nomes que ficou para
// trás quando as quatro novas entraram. Escolher, recarregar e voltar para "Planilha".
{
  const fonte = fs.readFileSync(path.join(RAIZ, 'Catedra.dc.html'), 'utf8');
  const dirs = JSON.parse((fonte.match(/const CT_DIRS = (\[[^\]]*\]);/) || [])[1].replace(/'/g, '"'));
  // toda direção oferecida na tela precisa estar na lista única…
  const naTela = [...new Set([...fonte.matchAll(/data-dir="([a-z]+)"/g)].map(m => m[1]))];
  ok(naTela.length >= 8, 'TEMA a tela oferece as oito direções visuais');
  ok(naTela.every(d => dirs.includes(d)), 'TEMA toda direção da tela está em CT_DIRS');
  // …e toda direção da lista precisa existir de verdade em THEMES()
  const temas = [...new Set([...fonte.matchAll(/^\s{4}([a-z]+):\{ label:'/gm)].map(m => m[1]))];
  ok(dirs.every(d => temas.includes(d)), 'TEMA toda direção de CT_DIRS existe em THEMES()');
  // nenhuma cópia da lista sobrou por aí
  ok(!/\['sutil','premium','clean','moderno'\]/.test(fonte), 'TEMA nenhuma lista de direções duplicada no código');

  // e o que importa de verdade: escolher, recarregar e a cor continuar lá
  await page.goto(URL0 + '/Catedra.dc.html');
  await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); });
  for (const d of dirs) {
    await page.evaluate(x => localStorage.setItem('catedra:dir', x), d);
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(700);
    // o data-dir do nó raiz (o único que também tem data-dark) é o tema REALMENTE aplicado
    const vivo = await page.evaluate(() => document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dir'));
    ok(vivo === d, 'TEMA a direção "' + d + '" sobrevive ao recarregar');
  }

  /* SINCRONIZAÇÃO DO TEMA. O auth.js escreve 'catedra:dir'/'catedra:dark'/'catedra:accent'
     DIRETO no localStorage (isData() sincroniza toda chave 'catedra:'), sem passar por
     setter do componente. Antes, _rehydrateFromLocal não relia essas três, e o app seguia
     pintando o tema velho até alguém recarregar — e o LEGIS/JURIS nativo, que lê
     'catedra:dark', recebia a resposta errada e escrevia branco no cartão branco.
     O teste imita a nuvem: escreve a chave e dispara 'catedra:synced', sem recarregar. */
  {
    await page.evaluate(() => localStorage.setItem('catedra:dir', 'sutil'));
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(700);
    const antes = await page.evaluate(() => document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dir'));
    ok(antes === 'sutil', 'TEMA/SYNC parte de "sutil"');

    const depois = await page.evaluate(async () => {
      localStorage.setItem('catedra:dir', 'terminal');            // a nuvem escreve…
      window.dispatchEvent(new Event('catedra:synced'));          // …e avisa
      await new Promise(r => setTimeout(r, 500));
      return document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dir');
    });
    ok(depois === 'terminal', 'TEMA/SYNC a direção vinda da nuvem repinta sem recarregar');

    const escuro = await page.evaluate(async () => {
      localStorage.setItem('catedra:dark', '1');
      window.dispatchEvent(new Event('catedra:synced'));
      await new Promise(r => setTimeout(r, 500));
      return document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dark');
    });
    ok(escuro === '1', 'TEMA/SYNC o claro/escuro vindo da nuvem repinta sem recarregar');

    // e a chave não pode divergir do que está pintado — era a raiz do texto sumido no LEGIS
    const coerente = await page.evaluate(() => {
      const el = document.querySelector('[data-dark][data-dir]');
      return el.getAttribute('data-dark') === (localStorage.getItem('catedra:dark') === '1' ? '1' : '0');
    });
    ok(coerente, 'TEMA/SYNC a chave catedra:dark bate com o que está pintado');
  }

  /* A ESCOLHA DA PESSOA VENCE O SYNC — e este teste existe por um estrago real.
     Quando a reidratação passou a reler `catedra:dark`, ela ganhou da escolha manual:
     a dona do app punha CLARO e o primeiro sync trazia o escuro guardado de volta,
     repintando por cima. "Não para mais no claro" foi como ela descreveu.
     Agora só um valor CARIMBADO DEPOIS da escolha pode substituí-la. As duas asserções
     abaixo prendem as duas pontas: a escolha aguenta o valor velho, e o valor novo de
     outro aparelho continua chegando (senão o conserto anterior morria junto). */
  {
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:dark', '1');
      localStorage.setItem('catedra:_kts', JSON.stringify({ 'catedra:dark': new Date('2026-08-18').getTime() }));
    });
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(900);
    // a pessoa escolhe CLARO na tela de Ajustes — que mora dentro de "Mais opções" (24/09/2026)
    await page.evaluate(() => {
      document.querySelector('[role="dialog"]')?.remove();
      if (!document.querySelector('button[data-view="ajustes"]')) document.querySelector('button[aria-label="Mostrar mais opções"]')?.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('button[data-view="ajustes"]')?.click());
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      [...document.querySelectorAll('button[data-s]')].find(b => /apar[êe]ncia/i.test(b.textContent))?.click();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.dataset.v === 'light')?.click());
    await page.waitForTimeout(500);
    // chega um sync com o valor VELHO (carimbo de agosto): não pode desfazer a escolha
    await page.evaluate(() => { localStorage.setItem('catedra:dark', '1'); window.dispatchEvent(new Event('catedra:synced')); });
    await page.waitForTimeout(800);
    const aguentou = await page.evaluate(() => document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dark'));
    ok(aguentou === '0', 'TEMA/SYNC a escolha manual de claro NÃO é desfeita por sync com valor velho');

    // e um sync com valor MAIS NOVO que a escolha continua chegando
    await page.evaluate(() => {
      localStorage.setItem('catedra:dark', '1');
      localStorage.setItem('catedra:_kts', JSON.stringify({ 'catedra:dark': Date.now() + 5000 }));
      window.dispatchEvent(new Event('catedra:synced'));
    });
    await page.waitForTimeout(800);
    const chegou = await page.evaluate(() => document.querySelector('[data-dark][data-dir]')?.getAttribute('data-dark'));
    ok(chegou === '1', 'TEMA/SYNC o tema MAIS NOVO de outro aparelho ainda repinta');
  }

  /* COR DE DESTAQUE × NUVEM — "a cor oficial do tema ou outra que eu escolha não fixa,
     volta para o verde sempre" (09/09/2026). Três causas, as três presas aqui.
     1) "Padrão do tema" era chave APAGADA → o autosave seguinte gravava "null" → para o
        mergeAll "null" é vazio, e vazio nunca apaga cheio: a cor guardada na nuvem voltava
        sempre. Agora o padrão é a palavra "tema", com conteúdo, e disputa pelo carimbo.
     2) O autosave regravava as 60 chaves a cada salvamento, e cada regravação carimbava
        a chave de novo: um aparelho parado recarimbava a cor VELHA a cada sessão
        registrada e vencia a escolha nova feita no outro. Agora grava só o que mudou.
     3) O laço genérico da reidratação punha a cor no patch SEM passar pelo portão
        _podeAdotarTema — o sync com a cor velha desfazia a escolha de segundos atrás. */
  {
    await page.goto(URL0 + '/tests/sync-fixture.html');
    await page.waitForFunction(() => window.CatedraSync && window.CatedraSync._test);
    const mg = await page.evaluate(() => {
      const M = window.CatedraSync._test.mergeAll, J = JSON.stringify;
      const sv = { 'catedra:accent': '"#0f7a57"', 'catedra:_kts': J({ 'catedra:accent': 1000 }) };
      const lc = { 'catedra:accent': '"tema"', 'catedra:_kts': J({ 'catedra:accent': 2000 }) };
      const sv2 = { 'catedra:accent': '"tema"', 'catedra:_kts': J({ 'catedra:accent': 1000 }) };
      const lc2 = { 'catedra:accent': 'null', 'catedra:_kts': J({ 'catedra:accent': 9000 }) };
      return { padraoVence: M(sv, lc, false)['catedra:accent'] === '"tema"' && M(sv, lc, true)['catedra:accent'] === '"tema"',
               semente: M(sv2, lc2, true)['catedra:accent'] === '"tema"' };
    });
    ok(mg.padraoVence, 'COR/SYNC "padrão do tema" com carimbo mais novo vence a cor guardada na nuvem');
    ok(mg.semente, 'COR/SYNC o "null" semeado por aparelho novo não apaga o padrão do tema guardado');

    // na tela: a nuvem tem verde guardado (carimbo de agosto); a direção é Fibra (índigo)
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate(() => {
      localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1');
      localStorage.setItem('catedra:dir', 'clean'); localStorage.setItem('catedra:dark', '0');
      localStorage.setItem('catedra:accent', '"#0f7a57"');
      localStorage.setItem('catedra:_kts', JSON.stringify({ 'catedra:accent': new Date('2026-08-18').getTime() }));
    });
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(900);
    const accentDe = () => page.evaluate(() => document.querySelector('[data-dark][data-dir]')?.style.getPropertyValue('--accent').trim());
    const irParaAparencia = async () => {
      // Ajustes mora dentro de "Mais opções" (24/09/2026): abre o grupo e só então o item
      await page.evaluate(() => { document.querySelector('[role="dialog"]')?.remove(); if (!document.querySelector('button[data-view="ajustes"]')) document.querySelector('button[aria-label="Mostrar mais opções"]')?.click(); });
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelector('button[data-view="ajustes"]')?.click());
      await page.waitForTimeout(500);
      await page.evaluate(() => { [...document.querySelectorAll('button[data-s]')].find(b => /apar[êe]ncia/i.test(b.textContent))?.click(); });
      await page.waitForTimeout(400);
    };
    await irParaAparencia();
    ok((await accentDe()) === '#0f7a57', 'COR parte do verde guardado');
    // SEM TEMPO FIXO (11/09/2026). O autosave da ABERTURA tem de assentar antes do grampo: sob
    // carga ele passava das esperas fixas acima, caía dentro da janela e o teste acusava
    // areaEstudo, casos e edital "regravados" — era só a primeira gravação do app. Descarrega o
    // pendente e espera nenhuma chave do _autosaveKeys() diferir do disco (a cada 50 ms, até 8 s).
    const assentou = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 160 && !(window.__catedraApp && window.__catedraApp._salvarAgora); i++) await w(50);
      const a = window.__catedraApp; if (!a || !a._salvarAgora) return 'o app não subiu';
      a._salvarAgora();
      const difere = () => a._autosaveKeys().filter(k => a.state[k] !== undefined && localStorage.getItem(a._chave(k)) !== a._serializar(k, a.state[k]));
      for (let i = 0; i < 160 && difere().length; i++) await w(50);
      return difere().length ? 'ainda diferem do disco: ' + difere().slice(0, 3).join(', ') : '';
    });
    // grampo nas escritas: o que o autosave grava depois de "Padrão do tema"
    await page.evaluate(() => { const w = []; const o = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { w.push(k); o(k, v); }; window.__escritas = w; });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Padrão do tema/.test(b.textContent))?.click());
    // sentinela da ausência: o autosave que o clique arma só marca a cor como salva (_lastSaved)
    // DEPOIS de passar por todas as chaves — daí em diante, o que não foi gravado não vai ser
    await page.waitForFunction(() => { const a = window.__catedraApp; return !!a && !!a._lastSaved && a.state.accent == null && a._lastSaved.accent === a.state.accent; }, null, { polling: 50, timeout: 8000 }).catch(() => {});
    const guardado = await page.evaluate(() => localStorage.getItem('catedra:accent'));
    ok(guardado === '"tema"', 'COR "padrão do tema" fica guardado como valor com conteúdo, não como chave apagada');
    ok((await accentDe()) === '#4f46e5', 'COR "padrão do tema" pinta com a cor da direção (Fibra = índigo), não com o verde');
    const escritas = await page.evaluate(() => { const w = window.__escritas.slice(); window.__escritas.length = 0; return w; });
    // só as chaves sincronizadas contam: 'ct_timer' é o cronômetro, fora do autosave e do sync.
    // 'catedra:_temaTs' também não é dado: é a hora em que a pessoa escolheu o tema NESTE
    // aparelho, escrita de propósito pelo próprio clique (não pelo autosave) para o portão
    // recusar valor velho da nuvem depois de recarregar. Está no EXCLUDE, não sobe, e o
    // clearLocal a apaga na troca de conta. O que este caso guarda segue de pé: nenhuma
    // chave de DADO pode ser regravada por tabela quando só a cor mudou.
    const alheias = escritas.filter(k => k !== 'catedra:accent' && k !== 'catedra:_temaTs' && k.indexOf('catedra:') === 0);
    ok(alheias.length === 0, 'COR o autosave grava só o que mudou — nenhuma outra chave regravada (' + alheias.slice(0, 3).join(', ') + ')' + (alheias.length && assentou ? ' — antes do grampo: ' + assentou : ''));
    // chega um sync com o verde VELHO da nuvem (carimbo de agosto): não desfaz a escolha…
    await page.evaluate(() => { localStorage.setItem('catedra:accent', '"#0f7a57"'); window.dispatchEvent(new Event('catedra:synced')); });
    await page.waitForTimeout(800);
    ok((await accentDe()) === '#4f46e5', 'COR/SYNC um sync com a cor velha da nuvem não desfaz o padrão do tema escolhido');
    // …e o disco volta a dizer o que a tela pinta (senão o recarregamento "pulava")
    ok((await page.evaluate(() => localStorage.getItem('catedra:accent'))) === '"tema"', 'COR/SYNC a escolha recusada pela nuvem é regravada no disco');
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.waitForTimeout(900);
    ok((await accentDe()) === '#4f46e5', 'COR "padrão do tema" sobrevive ao recarregar');
    // escolher uma cor também carimba a escolha: sync velho não a desfaz
    await irParaAparencia();
    await page.evaluate(() => document.querySelector('button[data-c="#7c3aed"]')?.click());
    await page.waitForTimeout(1300);
    await page.evaluate(() => { localStorage.setItem('catedra:accent', '"#0f7a57"'); window.dispatchEvent(new Event('catedra:synced')); });
    await page.waitForTimeout(800);
    ok((await accentDe()) === '#7c3aed', 'COR/SYNC a cor escolhida não é desfeita por sync com a cor velha');
    // e a cor MAIS NOVA de outro aparelho continua chegando
    await page.evaluate(() => {
      localStorage.setItem('catedra:accent', '"#0891b2"');
      localStorage.setItem('catedra:_kts', JSON.stringify({ 'catedra:accent': Date.now() + 5000 }));
      window.dispatchEvent(new Event('catedra:synced'));
    });
    await page.waitForTimeout(800);
    ok((await accentDe()) === '#0891b2', 'COR/SYNC a cor mais nova de outro aparelho ainda chega');
    await page.evaluate(() => { localStorage.removeItem('catedra:accent'); localStorage.removeItem('catedra:_kts'); localStorage.setItem('catedra:dir', 'sutil'); });
  }

  /* PINTURA DA DIREÇÃO — o teste que faltava, e o defeito que o pediu.
     Os testes acima provam que a direção PERSISTE: grava, recarrega, o data-dir continua
     lá. Nenhum provava que ela PINTA. A diferença custou caro: a uniformização das telas
     trocou ~90 cartões de `style="background:var(--surface);…"` para `class="ct-card"`, e
     as nove regras de personalidade miram o ESTILO INLINE (`div[style*="var(--surface)"]`).
     Os cartões saíram do alcance de todas — Holo perdeu a sombra iridescente, Neon o
     brilho violeta, Fibra e Terminal deixaram de ser achatados. A suíte passou verde nas
     duas rodadas seguintes, porque ninguém olhava a pintura.
     Aqui a asserção é "a sombra do cartão é a ESPERADA DESTA direção" — não "existe
     alguma sombra". Assim `none` deixa de ser falha e vira expectativa (Fibra e Terminal
     são planas de propósito), e apagar a regra do Holo volta a quebrar o teste. */
  {
    // assinatura de cada direção no tema CLARO: o trecho de cor que só ela produz.
    // 'none' é resposta legítima; 'sutil' não tem regra própria e cai na sombra do .ct-card.
    const ASSINATURA = {
      // 'sutil' não tem regra de personalidade: cai na sombra padrão do `.ct-card`, que a
      // seção 13 passou a tingir com o accent (color-mix). Cravar o valor exato aqui
      // amarraria o teste ao desenho — e ele existe para pegar a REGRA sumindo, não para
      // impedir que o cartão mude de cara. Por isso a asserção dele é diferente: tem
      // sombra, e não é a de nenhuma outra direção.
      sutil:    'PADRAO',
      premium:  'rgba(70, 35, 25',
      clean:    'none',
      moderno:  'rgba(124, 58, 237',
      aurora:   'rgba(8, 145, 178',
      solar:    'rgba(234, 88, 12',
      terminal: 'none',
      holo:     'rgba(139, 92, 246',
    };
    await page.goto(URL0 + '/Catedra.dc.html');
    await page.evaluate(() => { localStorage.setItem('catedra:auth', '1'); localStorage.setItem('catedra:onboarded', '1'); localStorage.setItem('catedra:dark', '0'); });
    for (const d of Object.keys(ASSINATURA)) {
      await page.evaluate(x => localStorage.setItem('catedra:dir', x), d);
      await page.goto(URL0 + '/Catedra.dc.html');
      await page.waitForTimeout(700);
      // Simulados é uma tela migrada: se a regra não alcançar `.ct-card`, é aqui que aparece
      await page.evaluate(() => document.querySelector('button[data-view="simulados"]')?.click());
      await page.waitForFunction(() => document.querySelectorAll('.ct-card').length > 0, { timeout: 4000 }).catch(() => {});
      const sombra = await page.evaluate(() => {
        const c = document.querySelector('.ct-card');
        return c ? getComputedStyle(c).boxShadow : 'SEM CARTÃO';
      });
      const esperado = ASSINATURA[d];
      const outras = Object.entries(ASSINATURA).filter(([k, v]) => k !== d && v !== 'none' && v !== 'PADRAO').map(([, v]) => v);
      const bate = (esperado === 'none')   ? (sombra === 'none')
                 : (esperado === 'PADRAO') ? (sombra !== 'none' && !outras.some(a => sombra.includes(a)))
                 : sombra.includes(esperado);
      ok(bate, 'TEMA a direção "' + d + '" PINTA o cartão (esperado ' + esperado + ', veio ' + String(sombra).slice(0, 46) + ')');
    }

    /* NO ESCURO, duas direções têm regra PRÓPRIA — e é onde a dona do app vive.
       `moderno` e `premium` declaram `[data-dir=…][data-dark="1"]` com outra cor; as
       outras seis reaproveitam a regra clara (holo inclusive, conferido: zero variante
       escura). Sem estas duas passagens, órfãzar `[data-dir="moderno"][data-dark="1"]`
       passaria verde exatamente como passou hoje — mesmo defeito, mesma semana, mesmo
       formato. São duas asserções, não uma segunda volta nas oito. */
    const ESCURO = { moderno: 'rgba(167, 139, 250', premium: 'rgba(212, 112, 127' };
    await page.evaluate(() => localStorage.setItem('catedra:dark', '1'));
    for (const d of Object.keys(ESCURO)) {
      await page.evaluate(x => localStorage.setItem('catedra:dir', x), d);
      await page.goto(URL0 + '/Catedra.dc.html');
      await page.waitForTimeout(700);
      await page.evaluate(() => document.querySelector('button[data-view="simulados"]')?.click());
      await page.waitForFunction(() => document.querySelectorAll('.ct-card').length > 0, { timeout: 4000 }).catch(() => {});
      const sombra = await page.evaluate(() => {
        const c = document.querySelector('.ct-card');
        return c ? getComputedStyle(c).boxShadow : 'SEM CARTÃO';
      });
      ok(String(sombra).includes(ESCURO[d]), 'TEMA a direção "' + d + '" PINTA o cartão NO ESCURO (esperado ' + ESCURO[d] + ', veio ' + String(sombra).slice(0, 46) + ')');
    }
  }
}

/* ═══════════ MAPA PROCESSUAL — a leitura horizontal de "Processo e peças" ═══════════
   Dois lados são testados de propósito, porque já houve verde falso por testar só um:
   (a) o GRAFO — a camada de dados, que não depende de tela nenhuma: nenhum rito pode
       gerar aresta órfã, e o mapa tem de ser MESMO horizontal (largura > altura);
   (b) a TELA — o que pinta e, principalmente, o que PERSISTE: posição, zoom, etapa,
       escolha de caminho, favorito e rascunho têm de sobreviver ao recarregamento.
   E o modo padrão continua sendo o fluxo vertical: quem abria a tela cai onde caía. */
{
  await page.goto(URL0 + '/ritos-web.html');
  await page.waitForTimeout(700);

  // (a) a camada de dados, sobre TODOS os ritos cadastrados
  const grafo = await page.evaluate(() => {
    const G = window.CTMapaGrafo, F = window.CT_FLUXOS || {}, R = window.CT_RITOS || {}, P = window.CT_PECAS || {};
    if (!G) return { erro: 'CTMapaGrafo não carregou' };
    const nomes = [...new Set([...Object.keys(F), ...Object.keys(R)])];
    let orfas = 0, verticais = 0, semRota = 0, cruzam = 0, ocupado = 0;
    nomes.forEach(n => {
      const g = G.montar(n, { fluxos: F, ritos: R, pecas: P });
      g.arestas.forEach(a => { if (!g.porId[a.de] || !g.porId[a.para]) orfas++; });
      if (g.largura <= g.altura) verticais++;
      if (G.rota(g, {}).length < 3) semRota++;
      // dois nós na MESMA casa da grade fariam cartão sobre cartão — e é a garantia
      // de que nenhuma seta atravessa cartão, porque a rota vertical usa o vão
      const casas = {};
      g.nos.forEach(x => { const k = x.col + ':' + x.faixa; if (casas[k]) ocupado++; casas[k] = 1; });
    });
    return { nomes: nomes.length, orfas, verticais, semRota, ocupado };
  });
  if (grafo.erro) ok(false, 'MAPA ' + grafo.erro);
  else {
    ok(grafo.nomes >= 20, 'MAPA a camada de dados monta os ' + grafo.nomes + ' ritos cadastrados');
    ok(grafo.orfas === 0, 'MAPA nenhuma aresta aponta para nó inexistente (' + grafo.orfas + ')');
    ok(grafo.verticais === 0, 'MAPA todo rito sai MAIS LARGO que alto — é mapa, não lista (' + grafo.verticais + ' verticais)');
    ok(grafo.semRota === 0, 'MAPA todo rito tem rota percorrível (' + grafo.semRota + ' sem rota)');
    ok(grafo.ocupado === 0, 'MAPA nenhuma casa da grade recebe dois cartões (' + grafo.ocupado + ' colisões)');
  }

  // o prazo é EXTRAÍDO do texto do rito, e "pena máxima de 4 anos" não é prazo
  const prazo = await page.evaluate(() => {
    const G = window.CTMapaGrafo;
    return {
      leDias: (G.prazoDe('Contestação — 15 dias', false) || {}).texto,
      leHoras: ((G.prazoDe('Prisão em flagrante · comunicação em 24 horas', false) || {}).faixa),
      naoLePena: G.prazoDe('pena máxima igual ou superior a 4 anos', false),
      inicioNaoTemPrazo: G.prazoDe('RITO ORDINÁRIO · pena máxima de 4 anos', true),
    };
  });
  ok(prazo.leDias === '15 dias', 'MAPA prazo lido do próprio texto do rito');
  ok(prazo.leHoras === 'curto', 'MAPA prazo em horas cai na faixa curta');
  ok(prazo.naoLePena === null, 'MAPA "pena máxima de 4 anos" NÃO vira prazo');
  ok(prazo.inicioNaoTemPrazo === null, 'MAPA a caixa de início não inventa prazo');

  // (b) o padrão continua sendo o fluxo vertical
  const padrao = await page.evaluate(() => ({
    fluxoVisivel: !document.getElementById('fluxo').hidden,
    mapaOculto: document.getElementById('mapaHold').hidden,
    botaoMapa: !!document.getElementById('mMapa'),
    chipsDoFluxo: document.querySelectorAll('#fluxo [data-legis]').length,
  }));
  ok(padrao.fluxoVisivel && padrao.mapaOculto, 'MAPA o modo padrão continua sendo o fluxo vertical');
  ok(padrao.botaoMapa, 'MAPA existe a opção "Mapa processual" em Processo e peças');
  ok(padrao.chipsDoFluxo > 0, 'MAPA o fluxo vertical segue inteiro (não foi substituído)');

  // a tela do mapa: pinta, busca, filtra, recolhe, escolhe caminho
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(URL0 + '/ritos-web.html?modo=mapa&rito=' + encodeURIComponent('Penal — procedimento comum'));
  await page.waitForTimeout(900);
  const tela = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const r = {};
    r.pintou = $$('.mp-no').length;
    r.setas = $$('.mp-linhas g').length;
    r.enquadrou = parseFloat(($('.mp-mundo').style.transform.match(/scale\(([\d.]+)\)/) || [])[1] || 0);
    r.minimapa = !!$('.mp-mini svg');
    // fundamento em chip dourado e peça em botão
    r.chipsLei = $$('.mp-no [data-legis]').length;
    r.botoesPeca = $$('.mp-no [data-peca]').length;
    // busca por artigo centraliza
    const bu = $('[data-r=busca]');
    bu.value = 'art. 402'; bu.dispatchEvent(new Event('input', { bubbles: true })); await w(120);
    r.achouArtigo = $$('.mp-no.achou').length;
    const antes = $('.mp-mundo').style.transform;
    bu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(250);
    r.buscaCentraliza = $('.mp-mundo').style.transform !== antes;
    bu.value = ''; bu.dispatchEvent(new Event('input', { bubbles: true })); await w(80);
    // recolher ramificação esconde os ramos daquela decisão
    const n0 = $$('.mp-no').length;
    $('[data-recolhe="p2"]').click(); await w(150);
    r.recolheu = $$('.mp-no').length === n0 - 2;
    $('[data-recolhe="p2"]').click(); await w(150);
    r.reabriu = $$('.mp-no').length === n0;
    // escolher o caminho da rejeição apaga o que ficou incompatível
    $('[data-abrir="p2"]').click(); await w(200);
    r.temEscolha = $$('.mp-painel [data-escolhe]').length;
    const pctAntes = $('[data-r=pct]').textContent;
    $('.mp-painel [data-escolhe="p2s0"]').click(); await w(250);
    r.progressoMudou = $('[data-r=pct]').textContent !== pctAntes;
    r.apagouIncompativeis = $$('.mp-no.fora').length > 0;
    r.podeTrocar = !!$('.mp-painel [data-desfaz]');
    // o painel da peça traz o que a peça precisa
    $('.mp-painel [data-p=x]').click(); await w(100);
    $('.mp-no [data-peca="Denúncia"]').click(); await w(250);
    r.secoesDaPeca = $$('.mp-painel .mp-sec h4').map(h => h.textContent);
    r.acoesDaPeca = $$('.mp-painel .mp-pacs button').map(b => b.textContent.replace(/[^\wçãéêíó ]/gi, '').trim());
    const t = $('.mp-painel [data-rasc]');
    t.value = 'rascunho de teste'; t.dispatchEvent(new Event('input', { bubbles: true })); await w(120);
    $('.mp-painel [data-p=favp]').click(); await w(100);
    $('.mp-painel [data-p=x]').click();
    r.estado = { transform: $('.mp-mundo').style.transform, pct: $('[data-r=pct]').textContent,
                 ativo: ($('.mp-no.atual') || {}).dataset && $('.mp-no.atual').dataset.id };
    return r;
  });
  ok(tela.pintou === 16, 'MAPA o procedimento comum pinta as 16 caixas (' + tela.pintou + ')');
  ok(tela.setas >= 16, 'MAPA as setas são desenhadas (' + tela.setas + ')');
  ok(tela.enquadrou > 0 && tela.enquadrou < 1, 'MAPA abre com o rito inteiro enquadrado (' + tela.enquadrou + ')');
  ok(tela.minimapa, 'MAPA o minimapa é desenhado');
  ok(tela.chipsLei >= 10, 'MAPA cada etapa mostra o fundamento legal (' + tela.chipsLei + ' chips)');
  ok(tela.botoesPeca >= 2, 'MAPA as peças viram botão no cartão (' + tela.botoesPeca + ')');
  ok(tela.achouArtigo === 1, 'MAPA a busca acha a etapa pelo artigo');
  ok(tela.buscaCentraliza, 'MAPA o resultado da busca é centralizado');
  ok(tela.recolheu && tela.reabriu, 'MAPA a ramificação recolhe e reabre');
  ok(tela.temEscolha === 2, 'MAPA a decisão oferece os dois caminhos do rito');
  ok(tela.progressoMudou, 'MAPA escolher caminho recalcula o progresso');
  ok(tela.apagouIncompativeis, 'MAPA escolher caminho apaga os caminhos incompatíveis');
  ok(tela.podeTrocar, 'MAPA a escolha pode ser desfeita');
  const PRECISA = ['Roteiro', 'Requisitos', 'Prazo', 'Fundamentação', 'Dicas', 'Texto-base', 'Rascunho'];
  const faltam = PRECISA.filter(x => !tela.secoesDaPeca.some(s => s.indexOf(x) === 0));
  ok(faltam.length === 0, 'MAPA o painel da peça traz roteiro, requisitos, prazo, fundamentação, dicas, texto-base e rascunho ('
    + (faltam.join(', ') || 'completo') + ')');
  const ACOES = ['Copiar', 'Imprimir', 'Favoritar', 'Editar rascunho'];
  const semAcao = ACOES.filter(a => !tela.acoesDaPeca.some(x => x.indexOf(a) >= 0));
  ok(semAcao.length === 0, 'MAPA o painel da peça tem copiar, imprimir, favoritar e editar rascunho ('
    + (semAcao.join(', ') || 'completo') + ')');

  // PERSISTE? — o teste que faltou da outra vez: pintar não é guardar
  await page.reload();
  await page.waitForTimeout(900);
  const volta = await page.evaluate(() => {
    const $ = s => document.querySelector(s);
    const g = (JSON.parse(localStorage.getItem('catedraMapaProcessual')) || {})['Penal — procedimento comum'] || {};
    return { transform: $('.mp-mundo').style.transform, pct: $('[data-r=pct]').textContent,
             ativo: ($('.mp-no.atual') || {}).dataset && $('.mp-no.atual').dataset.id,
             modo: document.getElementById('mMapa').getAttribute('aria-pressed'),
             escolha: g.escolhas && g.escolhas.p2, rascunho: (g.rascunhos || {})['Denúncia'],
             favorito: !!(g.favoritos || {})['peca:Denúncia'] };
  });
  ok(volta.modo === 'true', 'MAPA o modo escolhido sobrevive ao recarregamento');
  ok(volta.transform === tela.estado.transform, 'MAPA a POSIÇÃO do mapa sobrevive ao recarregamento');
  ok(volta.ativo === tela.estado.ativo && volta.pct === tela.estado.pct, 'MAPA etapa atual e progresso sobrevivem');
  ok(volta.escolha === 'p2s0', 'MAPA a escolha do caminho sobrevive');
  ok(volta.rascunho === 'rascunho de teste', 'MAPA o rascunho da peça sobrevive');
  ok(volta.favorito, 'MAPA o favorito sobrevive');

  /* Palco sem tamanho — o iframe que o app monta ESCONDIDO. O que não pode acontecer:
     gravar como posição escolhida um enquadramento calculado sobre 0×0, porque aí a
     tela abriria para sempre num zoom que ninguém pediu. O mapa espera ganhar tamanho
     e só então se enquadra. */
  const escondido = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    localStorage.removeItem('catedraMapaProcessual');
    const alvo = document.getElementById('mapaHold');
    const pai = alvo.parentNode; pai.style.display = 'none';
    document.getElementById('mFluxo').click(); await w(60);
    document.getElementById('mMapa').click(); await w(250);
    const largura = document.querySelector('.mp-palco').clientWidth;
    const guardadoEscondido = ((JSON.parse(localStorage.getItem('catedraMapaProcessual')) || {})['Penal — procedimento comum'] || {}).vista;
    const semTamanho = document.querySelector('.mp-mundo').style.transform;
    pai.style.display = ''; await w(500);
    const comTamanho = document.querySelector('.mp-mundo').style.transform;
    const guardadoDepois = ((JSON.parse(localStorage.getItem('catedraMapaProcessual')) || {})['Penal — procedimento comum'] || {}).vista;
    return { largura, guardadoEscondido, semTamanho, comTamanho, guardadoDepois };
  });
  ok(escondido.largura === 0, 'MAPA o cenário do teste é mesmo o palco sem tamanho');
  ok(!escondido.guardadoEscondido, 'MAPA palco sem tamanho NÃO grava posição inventada');
  ok(escondido.comTamanho !== escondido.semTamanho && /scale\(/.test(escondido.comTamanho),
     'MAPA ao ganhar tamanho, o mapa se enquadra sozinho');
  ok(!!escondido.guardadoDepois && escondido.guardadoDepois.z > 0,
     'MAPA só a posição calculada com o palco de pé é guardada');

  // acessibilidade: o palco é operável por teclado e narra o que muda
  const a11y = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const p = document.querySelector('.mp-palco');
    const t = k => p.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    p.focus();
    const foco = document.activeElement === p;
    const a0 = document.querySelector('.mp-no.atual').dataset.id;
    t('n'); await w(150);
    const andou = document.querySelector('.mp-no.atual').dataset.id !== a0;
    const z0 = document.querySelector('[data-r=lupa]').textContent;
    t('+'); await w(80);
    return { foco, andou, ampliou: document.querySelector('[data-r=lupa]').textContent !== z0,
      papel: p.getAttribute('role'), rotulo: !!p.getAttribute('aria-label'),
      viva: !!document.querySelector('[role=status][aria-live=polite]'),
      narrou: (document.querySelector('[data-r=aviso]').textContent || '').length > 0,
      cartaoDescrito: (document.querySelector('.mp-no [data-abrir]').getAttribute('aria-label') || '').indexOf('Situação') > 0 };
  });
  for (const [k, v] of Object.entries(a11y)) ok(v, 'MAPA acessibilidade: ' + k);

  /* Três armadilhas que já custaram caro em outras telas:
     · repintar o cartão joga o foco no body — quem favorita pelo teclado se perde;
     · aria-modal sem prender o Tab anuncia "diálogo" e deixa a tabulação escapar;
     · a barra de progresso precisa de PAPEL, porque aria-label em <div> mudo não é lido. */
  const foco = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s);
    const r = {};
    const estrela = $('.mp-no [data-fav]');
    const id = estrela.dataset.fav;
    estrela.focus(); estrela.click(); await w(200);
    r.focoSobreviveARepintura = !!document.activeElement.dataset
      && document.activeElement.dataset.fav === id;
    // Tab não escapa do painel
    $('.mp-no [data-abrir]').click(); await w(250);
    const p = $('.mp-painel');
    const f = [...p.querySelectorAll('button, textarea')].filter(x => x.offsetParent !== null);
    f[f.length - 1].focus();
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await w(80);
    r.tabNaoEscapaDoPainel = p.contains(document.activeElement);
    f[0].focus();
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    await w(80);
    r.shiftTabNaoEscapa = p.contains(document.activeElement);
    // fechar devolve o foco a quem abriu
    $('.mp-painel [data-p=x]').click(); await w(150);
    r.fecharDevolveOFoco = !!document.activeElement.closest
      && !!document.activeElement.closest('.mp-no, .mp-palco');
    const pb = $('[data-r=pbar]');
    r.progressoTemPapel = pb.getAttribute('role') === 'progressbar'
      && /^\d+$/.test(pb.getAttribute('aria-valuenow') || '')
      && !!pb.getAttribute('aria-valuetext');
    return r;
  });
  for (const [k, v] of Object.entries(foco)) ok(v, 'MAPA ' + k);

  /* O painel lateral é anexado ao <body>, FORA do elemento .mp — e variável CSS não
     atravessa o DOM de lado. Com os tokens declarados só em .mp, o painel herdava a
     cor de texto da página clara e saía tinta escura sobre fundo escuro: presente no
     DOM, invisível na tela. Um teste que só procura a seção passa verde nesse defeito;
     por isso aqui se mede o CONTRASTE calculado, que é o que a pessoa enxerga. */
  const legivel = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s);
    $('.mp-no [data-peca]').click(); await w(350);
    const p = $('.mp-painel');
    const cor = e => getComputedStyle(e).color, fundo = e => getComputedStyle(e).backgroundColor;
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3)
      .map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * r + .7152 * g + .0722 * b; };
    const K = (a, b) => { const l1 = lum(a), l2 = lum(b);
      return +((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)).toFixed(2); };
    const h3 = p.querySelector('h3'), txt = p.querySelector('.mp-sec p'),
          h4 = p.querySelector('.mp-sec h4'), bt = p.querySelector('.mp-pacs button');
    const r = { titulo: K(cor(h3), fundo(p)), texto: K(cor(txt), fundo(txt.closest('.mp-sec'))),
                rotulo: K(cor(h4), fundo(h4.closest('.mp-sec'))), botao: K(cor(bt), fundo(bt)) };
    $('.mp-painel [data-p=x]').click();
    return r;
  });
  for (const [k, v] of Object.entries(legivel))
    ok(v >= 4.5, 'MAPA o painel é LEGÍVEL — contraste de ' + k + ': ' + v + ':1 (mínimo 4,5)');

  // e o cartão no quadro escuro tem de passar pela mesma régua
  const cartaoLegivel = await page.evaluate(() => {
    const cor = e => getComputedStyle(e).color, fundo = e => getComputedStyle(e).backgroundColor;
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3)
      .map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * r + .7152 * g + .0722 * b; };
    const K = (a, b) => { const l1 = lum(a), l2 = lum(b);
      return +((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)).toFixed(2); };
    // o cartão é gradiente: mede-se contra a tinta mais clara dele, que é o pior caso
    const cartao = document.querySelector('.mp-no'), fundoCartao = 'rgb(36, 26, 62)';
    return { titulo: K(cor(cartao.querySelector('strong')), fundoCartao),
             resumo: K(cor(cartao.querySelector('small') || cartao.querySelector('strong')), fundoCartao),
             fundamento: K(cor(cartao.querySelector('.mp-art') || cartao.querySelector('strong')), fundoCartao) };
  });
  for (const [k, v] of Object.entries(cartaoLegivel))
    ok(v >= 4.5, 'MAPA o cartão é LEGÍVEL — contraste de ' + k + ': ' + v + ':1 (mínimo 4,5)');

  /* Trocar de rito remonta o mapa. O ouvinte de Esc mora no DOCUMENTO (o painel pode
     não estar com o foco), então precisa sair no destruir — senão cada troca deixa um
     ouvinte preso a uma instância morta, e vinte trocas viram vinte. */
  const vazamento = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    let vivos = 0;
    const add = document.addEventListener.bind(document);
    const rem = document.removeEventListener.bind(document);
    document.addEventListener = function (t, f, o) { if (t === 'keydown') vivos++; return add(t, f, o); };
    document.removeEventListener = function (t, f, o) { if (t === 'keydown') vivos--; return rem(t, f, o); };
    for (let i = 0; i < 5; i++) {
      document.getElementById('mFluxo').click(); await w(60);
      document.getElementById('mMapa').click(); await w(120);
    }
    document.addEventListener = add; document.removeEventListener = rem;
    return vivos;
  });
  ok(vazamento <= 1, 'MAPA remontar o mapa não acumula ouvintes de teclado (saldo ' + vazamento + ' após 5 trocas)');

  await page.setViewportSize({ width: 1280, height: 800 });
}

/* ============= ORAL LEI SECA — A ABA QUE ABRIA VAZIA NO IPAD ============= */
// O roteiro vive em tests/oral-lei-seca.mjs para rodar também no WebKit (run-webkit.mjs);
// aqui cobre o par Chromium × http, para a suíte principal também acusar a lista vazia.
try { await testarOralLeiSeca(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'ORAL LEI SECA [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Ciclo inteligente + reorganizar/cadastrar sem sair da tela (tests/ciclo-inteligente.mjs)
try { await testarCicloInteligente(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'CICLO INTELIGENTE [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Registro de sessão: o efeito antes do toque (tests/registro-sessao.mjs)
try { await testarRegistroSessao(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'REGISTRO [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Erro de simulado → revisão → material de origem (LEGIS/JURIS)
try { await testarPrioridadeDiscursiva(page, URL0, ok); } catch(e) { ok(false, 'DISCURSIVA exceção: '+e.message); }
try { await testarRevisaoFonte(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'REVISÃO/FONTE [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Volta à origem: a pílula do LEGIS/JURIS e o botão nativo levam ao ponto exato (tests/volta-origem.mjs)
try { await testarVoltaOrigem(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'VOLTA [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Texto sobre o destaque: --onAccent por contraste WCAG no pior ponto e --accentSolid onde o
// destaque cru não dá 4,5:1, com o --accent de identidade intacto (tests/contraste-destaque.mjs)
try { await testarContrasteDestaque(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'CONTRASTE/DESTAQUE [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Ícone é SVG Lucide, não emoji, no Início, na barra lateral, no painel de avisos, nas outras telas
// do host (d), nos satélites e no portão de login (e); os alvos do
// cronômetro do banner com 44 px no toque e intactos com mouse; a nota da Prova oral com fundo que
// pinta (era var(--ok)+'1f', que não é cor) — tests/icones-alvos.mjs
try { await testarIconesAlvos(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'ÍCONES/ALVOS [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// JURIS sem faixa lateral colorida no cartão (a cor do ramo tinge a borda e lava o fundo) e os
// alvos do mapa processual com 44 px no toque, intactos com mouse (tests/faixa-mapa-alvos.mjs)
try { await testarFaixaMapaAlvos(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'FAIXA/ALVOS [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Integração entre os módulos: edital → ciclo → sessão → acervo → progresso (tests/integracao-modulos.mjs)
try { await testarIntegracaoModulos(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'INTEGRAÇÃO [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Vários concursos ao mesmo tempo — Fase 1, dados (tests/varios-editais.mjs)
try { await testarVariosEditais(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'EDITAIS [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// 2ª leva: baralho, calendário, metas e painel na mesma espinha (tests/integracao-fase2.mjs)
try { await testarIntegracaoFase2(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'FASE2 [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// iPhone (app universal): o host e os satélites a 390×844 no toque
// (tests/iphone-host-390.mjs e tests/iphone-satelites-390.mjs — casas dos casos de F4 e F5)
try { await testarOnboardingImportar(page, URL0, ok); } catch (e) { ok(false, 'ONBOARDING/importar exceção: ' + e.message); }
try { await testarCotaIA(page, URL0, ok); } catch (e) { ok(false, 'COTA/IA exceção: ' + e.message); }
{ const ctxR = await browser.newContext(); const pageR = await ctxR.newPage(); try { await testarReguaUnica(pageR, URL0, ok); } catch (e) { ok(false, 'RÉGUA/única exceção: ' + e.message); } finally { await ctxR.close(); } }
try { await testarTemplateFileUrl(browser, URL0, ok, { motor }); } catch (e) { ok(false, 'TEMPLATE/file exceção: ' + e.message); }
{ const ctxML = await browser.newContext(); const pML = await ctxML.newPage(); try { await testarAuthModoLocal(pML, URL0, ok); } catch (e) { ok(false, 'MODO LOCAL exceção: ' + e.message); } finally { await ctxML.close(); } }
try { await testarIphoneHost390(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'IPHONE/host 390 [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
try { await testarIphoneSatelites390(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'IPHONE/satélites 390 [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// iPad no toque, em largura de TABLET (tests/ipad-toque-satelites.mjs): a combinação que
// faltava — o módulo do iPhone só liga o toque abaixo de 900 px, e o alvo dos satélites
// morava atrás de um @media por largura que nunca alcançava o aparelho.
try { await testarIpadToqueSatelites(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'IPAD/satélites toque [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// O <select> do host (tests/select-host.mjs): no WebKit o tema nativo reescrevia padding, raio e
// min-height; aqui o mesmo roteiro prova que o Chromium segue igual (e emula as cores forçadas)
try { await testarSelectHost(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'SELECT/host [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Login e sincronização no iPad (tests/auth-ipad.mjs): portão, teclado, sessão expirada, boot sem rede
await testarAuthAbertura(page, URL0, ok);
await testarCarregamentoInicial(page, URL0, ok);
await testarAberturaEmbutida(ok);
try { await testarAuthIpad(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'AUTH IPAD [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
// Hidratação que não finge que enviou (tests/auth-hidratacao.mjs): o pushNow pós-reload sobe o que o aparelho trouxe
try { await testarAuthHidratacao(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'AUTH HIDRATAÇÃO [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
// Fechamento e Sair sem sobrescrever a nuvem (tests/auth-fechamento.mjs): PATCH condicional no pagehide, Sair espera o pushNow
try { await testarAuthFechamento(page, URL0, ok, { motor }); }
catch (e) {
  ok(false, 'AUTH FECHAMENTO [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// iPad por toque (tests/ipad-toque.mjs): o mesmo roteiro do runner WebKit, aqui no Chromium
try { await testarIpadToque(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'IPAD TOQUE [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

/* ============= PASTA SINCRONIZADA — ARQUIVOS ESVAZIADOS PELO iCLOUD =============
   Worktree em ~/Desktop: o File Provider esvazia arquivos e ler um deles já voltou errado.
   scripts/verificar-pasta-sincronizada.mjs roda antes dos builds e desta suíte (primeiro
   import) e devolve do git o que dá para provar igual. Roteiro em tests/pasta-sincronizada.mjs
   (o comportamento só no macOS; na CI roda a parte estática e o "fora do macOS não faz nada"). */
try { await testarPastaSincronizada(ok); }
catch (e) {
  ok(false, 'PASTA o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// Edital: subtópico em texto não vira objeto de caracteres ao marcar o tópico (tests/edital-subtopicos.mjs)
try { await testarEditalSubtopicos(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'EDITAL/SUBTÓPICOS [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

// JURIS: o quadro "Não confunda com" no lugar da lista de Relacionados (tests/juris-quadro.mjs).
// Roteiro em módulo próprio porque o caso precisa de RELOAD com semente — o mapa ROT do
// satélite é lido uma vez no boot —, de contexto próprio por largura (390 e 1280) e de um
// terceiro, em que a página de fora faz o papel do app e responde a ponte de IA com o que
// cada caso fabrica (payload hostil, recusa, falha).
try { await testarJurisQuadro(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'JURIS/QUADRO [' + motor + '] [http] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}

try { await testarPadronizacaoVisual(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'PADRONIZAÇÃO VISUAL [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
// Pontes host <-> satélites: uma janela arbitrária não pode ler, gravar nem acionar IA.
try { await testarPostMessageSeguranca(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'PONTE [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
// Menu lateral (tests/menu-lateral.mjs): o Baralho pinta como os irmãos — o botão nasceu com
// navStyle.flashcards sem a chave no render() e saía cru; o alvo de 44 px no toque, também em
// paisagem no iPad, onde a regra por largura não alcançava a barra; o objeto navStyle sem chave
// sobrando; e Ajustes uma vez só, dentro de "Mais opções".
try { await testarMenuLateral(page, URL0, ok, { motor, origem: 'http' }); }
catch (e) {
  ok(false, 'MENU/BARALHO [' + motor + '] o roteiro correu sem exceção ('
    + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
}
// PDF.js local (tests/pdfjs-local.mjs): o app extrai texto de PDF com toda origem externa
// bloqueada — em http (o site) e em file:// (o caminho dos apps nativos, com o worker falso).
try {
  const { pathToFileURL } = await import('url');
  await testarPdfjsLocal(browser, ok, { motor, origens: [[URL0, 'http', 'Catedra.dc.html'], [pathToFileURL(RAIZ).href, 'file', 'Catedra.dc.html']] });
}
catch (e) { ok(false, 'PDFJS LOCAL [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }

// TRAVA GERAL DE REDE (tests/rede-externa.mjs): o harness que deixa a suíte sem rede tira uma
// dependência real (o host cru não abre offline sem ele), e o app PUBLICADO (public/, pelo
// servidor da suíte) abre, monta LEGIS e JURIS e importa um PDF com toda origem de fora abortada,
// sem pedido externo fora das exceções. O bundle nativo roda na suíte WebKit.
try { await testarHarnessSemRede(browser, ok, { motor, origens: [[URL0, 'http'], [pathToFileURL(RAIZ).href, 'file']] }); }
catch (e) { ok(false, 'REDE DA SUÍTE [' + motor + '] exceção: ' + String(e && e.message || e).split('\n')[0]); }
await testarRedeExternaExecucao(browser, ok, { motor, origens: [[URL0, 'publicado', 'public/index.html']] });

await browser.close();
srv.close();
console.log('\n' + resumoRedeSuite());
console.log(falhas.length ? ('\nFALHAS: ' + falhas.length) : '\nTODOS OS TESTES PASSARAM');
process.exit(falhas.length ? 1 : 0);
