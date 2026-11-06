#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualiza o CátedraJURIS com os informativos OFICIAIS novos do STF e do STJ.

Fontes (públicas):
  STF: https://www.stf.jus.br/arquivo/informativo/documento/informativo{N}.htm
  STJ: https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{NNNN}%27.cod.
       (edições extraordinárias: código {NNNN}E)

Descobre o último número já presente em juris-index.js, baixa as edições
seguintes até duas ausências confirmadas, parseia e ANEXA em juris-index.js e
juris-text.js (dedupe por id). Não faz commit — quem grava é a Lana (ou o PR).

Uso:  python3 scripts/atualizar-informativos.py [--dry-run] [--max-edicoes N] [--corpus]
      --corpus só imprime, em JSON, o último número de cada série no acervo (sem rede).
"""
import html as H
import json
import os
import re
import subprocess
import shutil
import tempfile
from contextlib import contextmanager
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = os.path.join(ROOT, "juris-index.js")
TXT = os.path.join(ROOT, "juris-text.js")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
DRY = "--dry-run" in sys.argv
MAXED = 40
TIMEOUT = 40
RETRY_MAX = 3
RETRY_BACKOFF = 2.0
INTERVALO = 3
if "--max-edicoes" in sys.argv:
    MAXED = int(sys.argv[sys.argv.index("--max-edicoes") + 1])


def get(url, retry=0):
    """Fetch URL com retry exponencial e tratamento de rede"""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        if e.code >= 500 and retry < RETRY_MAX:
            time.sleep(RETRY_BACKOFF ** retry)
            return get(url, retry + 1)
        return e.code, b""
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        if retry < RETRY_MAX:
            wait = RETRY_BACKOFF ** retry
            print(f"  ⚠️ erro de rede ({type(e).__name__}), retry em {wait:.0f}s... (tentativa {retry + 1}/{RETRY_MAX})", file=sys.stderr)
            time.sleep(wait)
            return get(url, retry + 1)
        else:
            print(f"  ✗ erro de rede após {RETRY_MAX} tentativas: {type(e).__name__}", file=sys.stderr)
            raise RuntimeError(f"falha de rede em {url}: {e}") from e
    except Exception as e:
        print(f"  ✗ erro inesperado: {type(e).__name__}: {e}", file=sys.stderr)
        raise RuntimeError(f"falha ao consultar {url}: {e}") from e


# ------------------------------------------------------------------ helpers
def oneline(s):
    s = re.sub(r"<br\s*/?>|</p>|</div>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = H.unescape(s).replace("\xa0", " ")
    s = re.sub(r"(\w)-\n\s*(\w)", r"\1\2", s)
    return re.sub(r"\s+", " ", s).strip()


def clean_multi(s):
    s = re.sub(r"<br\s*/?>|</p>|</div>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = H.unescape(s).replace("\xa0", " ")
    s = re.sub(r"(\w)-\n\s*(\w)", r"\1\2", s)
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\s*\n\s*", "\n", s).strip()


def norm_ramo_one(s):
    s = s.strip().title().replace(" Do ", " do ").replace(" Da ", " da ").replace(" De ", " de ").replace(" E ", " e ")
    if not s.startswith("Direito"):
        s = "Direito " + s
    return s


def edicao_na_pagina(fonte, status, raw, numero, extra=False):
    """Mesma régua do Sentinela, exercitada com as mesmas fixtures oficiais.

    Número em menu, parâmetro de pesquisa ou remissão não identifica o conteúdo.
    Um título genérico sozinho tampouco comprova que a edição não foi publicada.
    """
    if fonte == "stf" and status == 404:
        return "nao-existe"
    if status != 200:
        raise RuntimeError(f"HTTP {status}")
    h = raw.decode("latin1")
    match = re.search(r"<title[^>]*>(.*?)</title>", h, re.S | re.I)
    titulo = oneline(match.group(1)) if match else ""
    n = rf"0*{numero}(?!\d)"
    if fonte == "stf":
        if re.search(rf"\bN(?:º|°|o|\.º|\.°|Âº|Â°)?\s*{n}", titulo):
            return "existe"
        raise RuntimeError("resposta sem o número pedido no título do STF")
    tit_stj = r"Informativo de Jurisprud\S{1,2}ncia"
    tit_extra = r"Edi\S{2,4}o\s+Extraordin\S{1,2}ria"
    if not re.search(tit_stj, titulo, re.I):
        raise RuntimeError("resposta sem o título do Informativo do STJ")
    cabecalhos = [oneline(t) for t in re.findall(
        r'''<span\b[^>]*class=["'][^"']*\bclsInformativoTitulo\b[^"']*["'][^>]*>(.*?)</span>''', h, re.S | re.I)]
    tipo = tit_extra if extra else "Informativo"
    if cabecalhos:
        if all(re.search(rf"^{tipo}\s+n(?:\.|º|°|Âº|Â°)?\s*{n}", c, re.I) for c in cabecalhos) and "clsIdentificaProcesso" in h:
            return "existe"
        raise RuntimeError("cabeçalho de outra edição/série ou julgados ausentes")
    tipo = tit_extra if extra else tit_stj
    if re.search(rf"{tipo}\s+n(?:\.|º|°)?\s*{n}", titulo, re.I):
        return "existe"
    vazio = re.search(r'''<div\b[^>]*class=["'][^"']*\bclsCaixaMensagem\b[^"']*["'][^>]*>\s*Nenhum documento encontrado!\s*</div>''', h, re.I)
    if vazio and "clsIdentificaProcesso" not in h and not re.search(r"\bn(?:\.|º|°)?\s*\d+", titulo, re.I):
        return "nao-existe"
    raise RuntimeError("resposta sem identificação da edição nem confirmação explícita de busca vazia")


# ------------------------------------------------------------------ STF
def paras_stf(h):
    h = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ", h, flags=re.S)
    h = re.sub(r"<br[^>]*>", " ", h)
    out = []
    for p in re.split(r"</p>|</h\d>|</td>|</li>", h, flags=re.I):
        p = re.sub(r"<[^>]+>", "", p)
        p = H.unescape(p).replace("\xa0", " ")
        p = re.sub(r"\s+", " ", p).strip()
        if p:
            out.append(p)
    return out


def parse_stf(num, raw):
    if len(raw) < 5000:
        return None
    P = paras_stf(raw.decode("cp1252", errors="replace"))
    idx = None
    for i, p in enumerate(P):
        if re.fullmatch(r"(1\s+)?PLENÁRIO", p):
            idx = i
            break
    if idx is None:
        for i, p in enumerate(P):
            if re.fullmatch(r"(\d\s+)?(PRIMEIRA TURMA|SEGUNDA TURMA|TURMAS)", p):
                idx = i
                break
    if idx is None:
        return []
    body = P[idx:]
    end = len(body)
    for i, p in enumerate(body):
        if re.fullmatch(r"(\d\s+)?(INOVAÇÕES NORMATIVAS( DO STF)?|CLIPPING.*|OUTRAS INFORMAÇÕES|LEGISLAÇÃO)", p):
            end = i
            break
    body = body[:end]
    ishdr = lambda p: bool(re.match(r"^DIREITO(S)? [A-ZÀ-ÚÇ ,]+ [–—-] ", p) or re.fullmatch(r"DIREITO(S)? [A-ZÀ-ÚÇ ,]+ [–—-]?", p))
    hdr = [j for j, p in enumerate(body) if ishdr(p) and not (j > 0 and ishdr(body[j - 1]))]
    org = "Plenário"
    seq = 0
    recs = []
    for k, j in enumerate(hdr):
        for p in body[(hdr[k - 1] if k else 0):j]:
            m = re.fullmatch(r"(\d\s+)?(PLENÁRIO|PRIMEIRA TURMA|SEGUNDA TURMA|TURMAS)", p)
            if m:
                org = {"PLENÁRIO": "Plenário", "PRIMEIRA TURMA": "Primeira Turma", "SEGUNDA TURMA": "Segunda Turma", "TURMAS": "Turmas"}[m.group(2)]
        seg = body[j:(hdr[k + 1] if k + 1 < len(hdr) else len(body))]
        heads = [seg[0]]
        t = 1
        while t < len(seg) and re.match(r'^[A-ZÀ-ÚÇ0-9 ,;–\-“”"()/º]+$', seg[t]) and not re.search(r"\d+/[A-Z]{2}", seg[t]):
            if ishdr(seg[t]):
                heads.append(seg[t])
            else:
                heads[-1] += " " + seg[t]
            t += 1
        ramos, temas = [], []
        for head in heads:
            m = re.match(r"^(DIREITO(?:S)? [A-ZÀ-ÚÇ ]+?)\s*[–—-]\s*(.*)$", head)
            if m:
                ramos.append(norm_ramo_one(m.group(1)))
                temas.append(m.group(2).strip())
            else:
                temas.append(head)
        ramo = ramos[0] if ramos else None
        tema = " | ".join(x for x in temas if x)
        title = []
        while t < len(seg) and not re.match(r"^(Teses? fixadas?|Tese|Resumo|Decisão)\s*:", seg[t]):
            title.append(seg[t])
            t += 1
        title = re.sub(r"\s*ODS\s*:.*$", "", " ".join(title)).strip()
        mm = re.match(r"^(.*?)\s+[-–]\s+((?:[A-Z][A-Za-z]*(?:\s+[A-Za-z]+)?\s+[\d.]+(?:\s+[A-Za-z]+)?/[A-Z]{2}.*)|(?:[A-Z]{2,}.*))$", title)
        ttl = mm.group(1) if mm else title
        proc = mm.group(2) if mm else None
        tese, resumo, procs, mode = [], [], [], None
        for p in seg[t:]:
            if re.match(r"^Teses? fixadas?\s*:|^Tese\s*:", p):
                mode = "t"
                p = re.sub(r"^Teses? fixadas?\s*:\s*|^Tese\s*:\s*", "", p)
            elif re.match(r"^(Resumo|Decisão)\s*:", p):
                mode = "r"
                p = re.sub(r"^(Resumo|Decisão)\s*:\s*", "", p)
            if re.match(r"^\(\d+\)\s", p):
                mode = "n"
                continue
            if re.search(r"\b(relator[a]?|redator[a]?)\b.*\b(julgamento|julgad[oa])\b", p, re.I) and re.search(r"/[A-Z]{2}\b", p):
                procs.append(p)
                mode = "p"
                continue
            if mode == "t" and p:
                tese.append(p)
            elif mode == "r" and p:
                resumo.append(p)
        fix = lambda s: re.sub(r"\s+([,.;:)])", r"\1", s)
        tese_s = fix(" ".join(tese).strip())
        res = fix(" ".join(resumo).strip())
        en = tese_s.strip("“”\" ") if tese_s else (fix(resumo[0]) if resumo else None)
        if not en or len(en) < 40:
            raise RuntimeError(f"STF {num}: bloco de julgamento sem tese/resumo reconhecível")
        seq += 1
        d = None
        for pr in procs:
            dm = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", pr)
            if dm:
                d = f"{dm.group(1).zfill(2)}/{dm.group(2).zfill(2)}/{dm.group(3)}"
                break
        fonte = " ; ".join(procs) if procs else proc
        if org == "Turmas":
            tm = re.search(r"(Primeira|Segunda) Turma", (fonte or "") + " " + res)
            org_out = tm.group(0) if tm else "Turma"
        else:
            org_out = org
        recs.append({
            "id": f"INF2026-STF-{num}-{seq:02d}", "tribunal": "STF", "fonte": "informativo_stf", "numero": num,
            "titulo": f"Info {num} · STF", "enunciado": en, "ramoDireito": ramo, "tema": tema or None,
            "orgaoJulgador": "STF. " + org_out, "data": d, "fontePublicacao": fonte,
            "observacao": ((ttl + ". " if ttl else "") + res) or None,
            "url": f"https://www.stf.jus.br/arquivo/informativo/documento/informativo{num}.htm",
        })
    return recs


# ------------------------------------------------------------------ STJ
def parse_stj(code, raw):
    h = raw.decode("latin-1")
    if "clsIdentificaProcesso" not in h:
        return None
    extra = code.endswith("E")
    num = int(code[:4])
    url = f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{code}%27.cod."
    titulo = f"Info {num} · STJ" if not extra else f"Info Ed. Extraordinária {num} · STJ"
    blocks = re.split(r'<div class="divTabela clsIdentificaProcesso">', h)
    org_pos = [(m.start(), oneline(m.group(1))) for m in re.finditer(r'clsInformativoOrgaojulgador">(.*?)</span>', h, re.S)]
    recs = []
    seq = 0
    pos = 0
    for b in blocks[1:]:
        pos = h.find('<div class="divTabela clsIdentificaProcesso">', pos) + 10
        cur_org = None
        for p, o in org_pos:
            if p < pos:
                cur_org = o

        def field(lbl):
            mm = re.search(lbl + r'\s*(?:</span>\s*)?(?:<div class="listaODS">.*?</div>\s*)?</div>\s*(?:</div>\s*<div class="divLinha[^"]*">\s*)?<div class="divCell clsInformativoTexto(?:Formatado)?">(.*?)</div>\s*</div>', b, re.S)
            return mm.group(1) if mm else None

        proc, ramo, tema = field(r"Processo"), field("Ramo do Direito"), field(r"<span>Tema")
        dest, info = field("Destaque"), field("Informações do Inteiro Teor")
        if not all((proc, ramo, tema, dest, info)) or len(oneline(dest)) < 40:
            raise RuntimeError(f"STJ {code}: bloco {seq + 1} com campos ausentes ou destaque incompleto")
        seq += 1
        procs = re.sub(r"\s+([,.;)])", r"\1", oneline(proc)) if proc else None
        d = re.search(r"julgad[oa]s? em (\d{1,2})[º°]?/(\d{1,2})/(\d{4})", procs or "")
        m = re.search(r"(Corte Especial|Primeira Seção|Segunda Seção|Terceira Seção|Primeira Turma|Segunda Turma|Terceira Turma|Quarta Turma|Quinta Turma|Sexta Turma|Plenário)", procs or "")
        og = ("STJ. " + m.group(1)) if m else (("STJ. " + cur_org.title()) if cur_org else None)
        ramo1 = None
        if ramo:
            parts = [p for p in re.split(r",|;| E ", oneline(ramo)) if p.strip()]
            if parts:
                ramo1 = norm_ramo_one(parts[0])
        recs.append({
            "id": f"INF2026-STJ-{'EE' + str(num) if extra else num}-{seq:02d}", "tribunal": "STJ", "fonte": "informativo_stj",
            "numero": num, "titulo": titulo, "enunciado": oneline(dest), "ramoDireito": ramo1,
            "tema": oneline(tema) if tema else None, "orgaoJulgador": og,
            "data": ("/".join(x.zfill(2) for x in d.groups())) if d else None,
            "fontePublicacao": procs, "observacao": clean_multi(info), "url": url,
        })
    if len(recs) != h.count("clsIdentificaProcesso"):
        raise RuntimeError(f"STJ {code}: nem todos os blocos de julgamento foram reconhecidos")
    return recs


# ------------------------------------------------------------------ main
def load_index():
    s = Path(IDX).read_text(encoding="utf-8")
    arr = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
    return s, arr


def ultimos(idx):
    """Último número de cada série já no acervo. As edições extraordinárias do STJ têm numeração
    própria (id INF….-STJ-EE{n}-) e ficam fora da série ordinária. Não há teto: o antigo `< 900`
    fazia o STJ 900 valer 899 e, com MAXED edições por rodada, travaria a busca depois do STJ 940."""
    ee = lambda r: re.match(r"INF\d{4}-STJ-EE(\d+)-", r[0])
    stf = max(r[3] for r in idx if r[2] == "informativo_stf" and isinstance(r[3], int))
    stj = max(r[3] for r in idx if r[2] == "informativo_stj" and isinstance(r[3], int) and not ee(r))
    eem = max([int(m.group(1)) for r in idx for m in [ee(r)] if m] or [0])
    if not eem:
        raise RuntimeError("última edição extraordinária desconhecida no acervo")
    return stf, stj, eem


def url_edicao(fonte, numero, extra=False):
    if fonte == "stf":
        return f"https://www.stf.jus.br/arquivo/informativo/documento/informativo{numero}.htm"
    code = f"{numero:04d}{'E' if extra else ''}"
    return f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{code}%27.cod."


def ler_edicao(fonte, numero, extra=False):
    url = url_edicao(fonte, numero, extra)
    status, raw = get(url)
    estado = edicao_na_pagina(fonte, status, raw, numero, extra)
    if estado == "nao-existe":
        return None
    recs = parse_stf(numero, raw) if fonte == "stf" else parse_stj(f"{numero:04d}{'E' if extra else ''}", raw)
    if not recs:
        raise RuntimeError(f"{url}: edição reconhecida, mas nenhum julgado foi extraído")
    return recs


def coletar_serie(fonte, ultimo, extra=False):
    rotulo = fonte.upper() + (" Ed. Extr." if extra else "")
    if not ler_edicao(fonte, ultimo, extra):
        raise RuntimeError(f"âncora {ultimo}, já no acervo, não foi reconhecida")
    print(f"{rotulo} {ultimo}: âncora conferida", flush=True)
    novos, ausencias = [], 0
    limite = 10 if extra else MAXED
    for n in range(ultimo + 1, ultimo + limite + 1):
        time.sleep(INTERVALO)
        try:
            recs = ler_edicao(fonte, n, extra)
        except (RuntimeError, ValueError) as e:
            raise RuntimeError(f"edição {n}: {e}") from e
        if recs is None:
            ausencias += 1
            print(f"{rotulo} {n}: ausência confirmada na fonte", flush=True)
        else:
            ausencias = 0
            novos.extend(recs)
            print(f"{rotulo} {n}: {len(recs)} julgados", flush=True)
        # Conferir pelo menos as três extraordinárias seguintes, como o Sentinela;
        # havendo várias novas, continuar até o fim confirmado (teto anterior: dez).
        if ausencias >= 2 and (not extra or n >= ultimo + 3):
            return novos
    if ausencias < 2:
        raise RuntimeError(f"limite de {limite} edições atingido sem confirmar o fim da série")
    return novos


@contextmanager
def preservar_gerados():
    """Falha em gerador restaura o lote: a próxima rodada ainda encontra as edições.

    Sem isso, índice novo com fatias antigas faria a tentativa seguinte concluir
    NOVOS: 0, sem jamais reparar os textos que o app lê.
    """
    alvos = [Path(IDX), Path(TXT)] + [Path(ROOT) / p for p in (
        "semana-juris.js", "dados/indice.json", "dados/juris-text",
        "dados/contas-text", "dados/leis-seca", "widget/dodia.json")]
    with tempfile.TemporaryDirectory(prefix="catedra-informativos-lote-") as d:
        copias = []
        for i, alvo in enumerate(alvos):
            copia = Path(d) / str(i)
            if alvo.is_dir():
                shutil.copytree(alvo, copia)
            elif alvo.exists():
                shutil.copy2(alvo, copia)
            copias.append((alvo, copia))
        try:
            yield
        except BaseException:
            for alvo, copia in copias:
                if alvo.is_dir():
                    shutil.rmtree(alvo)
                elif alvo.exists():
                    alvo.unlink()
                if copia.is_dir():
                    shutil.copytree(copia, alvo)
                elif copia.exists():
                    alvo.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(copia, alvo)
            raise


def main():
    s_idx, idx = load_index()
    have = {r[0] for r in idx}
    stf_max, stj_max, ee_max = ultimos(idx)
    if "--corpus" in sys.argv:
        print(json.dumps({"stf": stf_max, "stj": stj_max, "ee": ee_max}))
        return
    print(f"corpus: STF até {stf_max}, STJ até {stj_max}, Ed. Extr. até {ee_max}")

    novos, falhas = [], []
    for fonte, ultimo, extra in (("stf", stf_max, False), ("stj", stj_max, False), ("stj", ee_max, True)):
        try:
            novos.extend(coletar_serie(fonte, ultimo, extra))
        except (RuntimeError, ValueError) as e:
            falhas.append(f"{fonte.upper()}{' extraordinárias' if extra else ''}: {e}")
    if falhas:
        raise RuntimeError("consulta incompleta; acervo preservado. " + "; ".join(falhas))
    ids_novos = [r["id"] for r in novos]
    if len(ids_novos) != len(set(ids_novos)):
        raise RuntimeError("IDs repetidos na coleta; acervo preservado")

    novos = [r for r in novos if r["id"] not in have]
    print(f"NOVOS: {len(novos)}")
    if not novos or DRY:
        return
    rows, txt = [], {}
    for r in novos:
        rows.append([r["id"], r["tribunal"], r["fonte"], r["numero"], r["titulo"], r.get("ramoDireito"),
                     r.get("tema"), r.get("data"), None, 0])
        t = {"en": r["enunciado"]}
        for k, kk in (("url", "ur"), ("orgaoJulgador", "og"), ("observacao", "ob"), ("fontePublicacao", "fp")):
            if r.get(k):
                t[kk] = r[k]
        txt[r["id"]] = t
    e = s_idx.rstrip().rstrip(";").rstrip()
    assert e.endswith("]")
    s_new = e[:-1] + "," + ",".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in rows) + "]" + s_idx[len(e):]
    s_t = Path(TXT).read_text(encoding="utf-8")
    e2 = s_t.rstrip().rstrip(";").rstrip()
    assert e2.endswith("}")
    s_t2 = e2[:-1] + "," + json.dumps(txt, ensure_ascii=False, separators=(",", ":"))[1:-1] + "}" + s_t[len(e2):]
    # Validar ambos antes da primeira gravação.
    json.loads(s_new[s_new.index("=") + 1:].strip().rstrip(";"))
    json.loads(s_t2[s_t2.index("=") + 1:].strip().rstrip(";"))
    with preservar_gerados():
        Path(IDX).write_text(s_new, encoding="utf-8")
        Path(TXT).write_text(s_t2, encoding="utf-8")
        # sanidade
        _, idx2 = load_index()
        print(f"índice: {len(idx)} -> {len(idx2)} verbetes")
        # O acervo novo só chega à pessoa depois dos gerados que dependem dele: o recorte
        # "O que mudou esta semana" (semana-juris.js) e as fatias de texto que o app de fato lê
        # (dados/juris-text/). Sem isso o card do Início ficou parado em 23/06 com o STJ 900 já
        # no acervo, e "Abrir no JURIS" dos julgados novos abria sem texto. O widget também
        # depende das citações do acervo: sem regerá-lo, a atualização falha na suíte (#245).
        for gerador in ("build-semana-juris.mjs", "build-fatias.mjs", "build-widget-dodia.mjs"):
            subprocess.run(["node", os.path.join(ROOT, "scripts", gerador)], check=True)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, subprocess.CalledProcessError) as e:
        print(f"FALHA: {e}", file=sys.stderr)
        sys.exit(1)
