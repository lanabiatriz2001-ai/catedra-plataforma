#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualiza o CátedraJURIS com os informativos OFICIAIS novos do STF e do STJ.

Fontes (públicas):
  STF: https://www.stf.jus.br/arquivo/informativo/documento/informativo{N}.htm
  STJ: https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{NNNN}%27.cod.
       (edições extraordinárias: código {NNNN}E)

Descobre o último número já presente em juris-index.js, baixa as edições
seguintes até esgotar (2 falhas seguidas), parseia e ANEXA em juris-index.js e
juris-text.js (dedupe por id). Não faz commit — quem grava é a Lana (ou o PR).

Uso:  python3 scripts/atualizar-informativos.py [--dry-run] [--max-edicoes N]
"""
import html as H
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = os.path.join(ROOT, "juris-index.js")
TXT = os.path.join(ROOT, "juris-text.js")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
DRY = "--dry-run" in sys.argv
MAXED = 40
if "--max-edicoes" in sys.argv:
    MAXED = int(sys.argv[sys.argv.index("--max-edicoes") + 1])


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception:
        return 0, b""


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
            continue
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
            "observacao": ((ttl + ". " if ttl else "") + res)[:1500] or None,
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
        if dest is None or len(oneline(dest)) < 40:
            continue
        seq += 1
        procs = re.sub(r"\s+([,.;)])", r"\1", oneline(proc)) if proc else None
        d = re.search(r"julgad[oa]s? em (\d{1,2}/\d{1,2}/\d{4})", procs or "")
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
            "data": ("/".join(x.zfill(2) for x in d.group(1).split("/"))) if d else None,
            "fontePublicacao": procs, "observacao": (clean_multi(info)[:1500] if info else None), "url": url,
        })
    return recs


# ------------------------------------------------------------------ main
def load_index():
    s = open(IDX, encoding="utf-8").read()
    arr = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
    return s, arr


def main():
    s_idx, idx = load_index()
    have = {r[0] for r in idx}
    stf_max = max(r[3] for r in idx if r[2] == "informativo_stf" and isinstance(r[3], int))
    stj_max = max(r[3] for r in idx if r[2] == "informativo_stj" and isinstance(r[3], int) and r[3] < 900)
    ee_max = max([int(m.group(1)) for r in idx for m in [re.match(r"INF\d{4}-STJ-EE(\d+)-", r[0])] if m] or [27])
    print(f"corpus: STF até {stf_max}, STJ até {stj_max}, Ed. Extr. até {ee_max}")

    novos = []
    # STF
    misses, n = 0, stf_max + 1
    while misses < 2 and n < stf_max + 1 + MAXED:
        st, raw = get(f"https://www.stf.jus.br/arquivo/informativo/documento/informativo{n}.htm")
        recs = parse_stf(n, raw) if st == 200 else None
        if not recs:
            misses += 1
            print(f"STF {n}: nada ({st})")
        else:
            misses = 0
            novos += recs
            print(f"STF {n}: {len(recs)} julgados")
        n += 1
    # STJ ordinárias
    misses, n = 0, stj_max + 1
    while misses < 2 and n < stj_max + 1 + MAXED:
        st, raw = get(f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{n:04d}%27.cod.")
        recs = parse_stj(f"{n:04d}", raw) if st == 200 else None
        if not recs:
            misses += 1
            print(f"STJ {n}: nada ({st})")
        else:
            misses = 0
            novos += recs
            print(f"STJ {n}: {len(recs)} julgados")
        n += 1
    # STJ extraordinárias
    misses, n = 0, ee_max + 1
    while misses < 2 and n < ee_max + 1 + 10:
        st, raw = get(f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=%27{n:04d}E%27.cod.")
        recs = parse_stj(f"{n:04d}E", raw) if st == 200 else None
        if not recs:
            misses += 1
            print(f"STJ Ed. Extr. {n}: nada ({st})")
        else:
            misses = 0
            novos += recs
            print(f"STJ Ed. Extr. {n}: {len(recs)} julgados")
        n += 1

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
    open(IDX, "w", encoding="utf-8").write(s_new)
    s_t = open(TXT, encoding="utf-8").read()
    e2 = s_t.rstrip().rstrip(";").rstrip()
    assert e2.endswith("}")
    s_t2 = e2[:-1] + "," + json.dumps(txt, ensure_ascii=False, separators=(",", ":"))[1:-1] + "}" + s_t[len(e2):]
    open(TXT, "w", encoding="utf-8").write(s_t2)
    # sanidade
    _, idx2 = load_index()
    print(f"índice: {len(idx)} -> {len(idx2)} verbetes")


if __name__ == "__main__":
    main()
