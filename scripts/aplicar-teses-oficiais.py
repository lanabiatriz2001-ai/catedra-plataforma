#!/usr/bin/env python3
"""Troca as Teses de RG e Repetitivos (verbetes repgeral-*, vindos do Dizer o Direito) pelo texto
oficial do STF e do STJ, nas DUAS cópias do acervo JURIS, a partir da mesma referência versionada.

    python3 scripts/aplicar-teses-oficiais.py                  # web: juris-index.js e juris-text.js
    python3 scripts/aplicar-teses-oficiais.py --nativo DIR     # + VadeMecumJuris (DIR = raiz dele)

Referências: docs/teses-oficiais/l1-referencia.json, l2-referencia.json e l3-referencia.json
(lotes L1 automático, L2 conferência com a auditoria e L3 revisão à mão; texto oficial literal,
baixado em 25/09/2026 — rotas em cada arquivo). Um id só pode estar num lote. Depois da web, rode
build-fatias, build-incidencia e build-semana-juris; depois do nativo, rode scripts/build_corpus.py
e scripts/verificar_auditoria.py lá.

Regras (decisões da dona, 25/09/2026):
- id NUNCA muda (favorito, status e grifos são gravados por id); a ordem dos arquivos também não;
- enunciado = tese oficial idêntica, sem texto nem link do DoD; link = página oficial do tema;
- tema = título oficial (STF) ou questão submetida a julgamento (STJ). Na web, a coluna da lista
  (índice) leva o título cortado; o verbete mostra o inteiro (campo `tm` do juris-text);
- `ramo` e o destaque (importante) ficam como estão; Nota do Cátedra (`co`) existente fica e é
  marcada para reler na referência. Registro com `co` na referência (L3: nota que aponta erro de
  digitação na fonte oficial) tem a nota FINAL ali — a da auditoria, se havia, mais a nova;
- relator (STF): o do julgamento de mérito, lido dos andamentos oficiais, com o redator do acórdão
  quando o relator ficou vencido — a exportação do STF traz o relator ATUAL;
- nativo: reescreve os registros em build/data/repercussao_geral.json (opção B: fonte nova, o
  build_corpus.py regenera o corpus.json), grava a trava literal em scripts/teses_oficiais.json
  e retira as notas de estudo (notas.json) desses verbetes. A trava leva o registro oficial
  inteiro: o build_corpus.py o põe por cima dos patches da auditoria (cuja correção o L2 conferiu
  campo a campo contra o oficial) e dos 4 ids que a auditoria criou por patch "add".
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = [os.path.join(RAIZ, 'docs', 'teses-oficiais', f'l{n}-referencia.json') for n in (1, 2, 3)]
CAMPOS = ('tribunal', 'fonte', 'numero', 'titulo', 'enunciado', 'tema', 'orgaoJulgador', 'data', 'situacao',
          'precedentes', 'observacao', 'url')
CORTE_LISTA = 140          # caracteres do tema na coluna da lista web
DOD = re.compile(r'dizer ?o ?direito|buscador|dizerodireito', re.I)
OFICIAL = re.compile(r'^https://(portal\.stf\.jus\.br|processo\.stj\.jus\.br)/')


def corta(s, n=CORTE_LISTA):
    if not s or len(s) <= n:
        return s
    c = s[:n].rsplit(' ', 1)[0].rstrip(' ,;:.—–-')
    return c + '…'


def le_js(caminho, glob):
    s = open(caminho, encoding='utf-8').read()
    pre = 'window.' + glob + '='
    assert s.startswith(pre) and s.endswith(';\n'), caminho
    return json.loads(s[len(pre):-2]), pre


def grava_js(caminho, pre, v):
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(pre + json.dumps(v, ensure_ascii=False, separators=(',', ':')) + ';\n')


def confere(ref):
    for i, r in ref.items():
        assert i.startswith('repgeral-'), i
        assert r['enunciado'] and OFICIAL.match(r['url']), i
        assert f"Tema {r['numero']} " in r['titulo'] + ' ', i
        assert not DOD.search(json.dumps(r, ensure_ascii=False)), i


def aplica_web(ref):
    p_idx, p_txt = os.path.join(RAIZ, 'juris-index.js'), os.path.join(RAIZ, 'juris-text.js')
    idx, pre_i = le_js(p_idx, '__JURIS_IDX__')
    txt, pre_t = le_js(p_txt, '__JURIS_TXT__')
    vistos = set()
    for k, r in enumerate(idx):
        o = ref.get(r[0])
        if not o:
            continue
        vistos.add(r[0])
        tema = corta(o['tema'])
        # [id, tribunal, fonte, número, título, ramo (mantido), tema (lista), data, situação, importante (mantido), …]
        idx[k] = [r[0], o['tribunal'], o['fonte'], o['numero'], o['titulo'], r[5], tema, o['data'], o['situacao']] + r[9:]
        antigo = txt.get(r[0]) or {}
        novo = {'en': o['enunciado'], 'ur': o['url'], 'og': o['orgaoJulgador'], 'fp': o['fp'],
                'co': o['co'] if 'co' in o else antigo.get('co'), 'ob': o['observacao'], 'tm': o['tema'] if tema != o['tema'] else None}
        txt[r[0]] = {c: v for c, v in novo.items() if v}   # juris-text é um objeto: a ordem das chaves se mantém
    faltam = set(ref) - vistos
    assert not faltam, f'ids da referência ausentes da web: {sorted(faltam)[:5]}'
    grava_js(p_idx, pre_i, idx)
    grava_js(p_txt, pre_t, txt)
    print(f'web: {len(vistos)} verbetes trocados em juris-index.js e juris-text.js')


def aplica_nativo(ref, dir_nat):
    p_rg = os.path.join(dir_nat, 'build', 'data', 'repercussao_geral.json')
    rg = json.load(open(p_rg, encoding='utf-8'))
    vistos = set()
    for k, r in enumerate(rg):
        o = ref.get(r['id'])
        if not o:
            continue
        vistos.add(r['id'])
        rg[k] = {'id': r['id'], 'tribunal': o['tribunal'], 'fonte': o['fonte'], 'numero': o['numero'],
                 'titulo': o['titulo'], 'enunciado': o['enunciado'], 'ramoDireito': r.get('ramoDireito'),
                 'tema': o['tema'], 'orgaoJulgador': o['orgaoJulgador'], 'data': o['data'],
                 'situacao': o['situacao'], 'fontePublicacao': None, 'referencias': None,
                 'precedentes': o['precedentes'], 'observacao': o['observacao'], 'url': o['url'],
                 'comentario': o['co'] if 'co' in o else r.get('comentario')}
    # ids que a auditoria criou por patch "add" (não estão no repercussao_geral.json): o registro
    # oficial deles entra pela trava, por cima do patch, no build_corpus.py
    por_patch = set()
    for f in sorted(os.listdir(os.path.join(dir_nat, 'build', 'data'))):
        if f.startswith('patches_auditoria_') and f.endswith('.json'):
            por_patch |= {p['add']['id'] for p in json.load(open(os.path.join(dir_nat, 'build', 'data', f), encoding='utf-8')) if 'add' in p}
    faltam = set(ref) - vistos - por_patch
    assert not faltam, f'ids da referência ausentes do repercussao_geral.json e dos patches: {sorted(faltam)[:5]}'
    with open(p_rg, 'w', encoding='utf-8') as f:
        f.write(json.dumps(rg, ensure_ascii=False, indent=1))
    # trava: o registro oficial inteiro. O build_corpus.py não reformata esses textos, põe estes campos
    # por cima de qualquer patch e derruba o build se o corpus divergir
    def campos(o):
        c = {k: o[k] for k in CAMPOS}
        c.update({'fontePublicacao': None, 'referencias': None})
        if 'co' in o:
            c['comentario'] = o['co']
        return c
    trava = {i: campos(o) for i, o in sorted(ref.items())}
    with open(os.path.join(dir_nat, 'scripts', 'teses_oficiais.json'), 'w', encoding='utf-8') as f:
        json.dump({'descricao': 'Trava literal das teses repgeral-* já trocadas pela fonte oficial (gerada por '
                                'scripts/aplicar-teses-oficiais.py do Cátedra). O build_corpus.py mantém esses textos '
                                'como estão e falha se o corpus divergir, se o link não for oficial ou se aparecer '
                                'texto do Dizer o Direito.',
                   'registros': trava}, f, ensure_ascii=False, indent=1)
    # notas de estudo do nativo desses verbetes: retiradas (decisão da dona)
    p_notas = os.path.join(dir_nat, 'Sources', 'VadeMecum', 'Resources', 'notas.json')
    notas = json.load(open(p_notas, encoding='utf-8'))
    antes = len(notas)
    notas = {k: v for k, v in notas.items() if k not in ref}
    with open(p_notas, 'w', encoding='utf-8') as f:
        f.write(json.dumps(notas, ensure_ascii=False))
    print(f'nativo: {len(vistos)} registros trocados em repercussao_geral.json, {len(set(ref) - vistos)} pela trava '
          f'(criados por patch da auditoria); trava com {len(trava)}; '
          f'notas de estudo retiradas: {antes - len(notas)} ({antes} → {len(notas)})')


if __name__ == '__main__':
    ref = {}
    for caminho in REFS:
        if not os.path.exists(caminho):
            continue
        lote = json.load(open(caminho, encoding='utf-8'))['registros']
        repetidos = set(ref) & set(lote)
        assert not repetidos, f'id em dois lotes: {sorted(repetidos)[:5]}'
        ref.update(lote)
        print(f'{os.path.basename(caminho)}: {len(lote)} registros')
    confere(ref)
    aplica_web(ref)
    if '--nativo' in sys.argv:
        aplica_nativo(ref, sys.argv[sys.argv.index('--nativo') + 1])
