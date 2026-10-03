#!/usr/bin/env python3
"""Troca as Teses de RG e Repetitivos (verbetes repgeral-*, vindos do Dizer o Direito) pelo texto
oficial do STF e do STJ, nas DUAS cópias do acervo JURIS, a partir da mesma referência versionada.

    python3 scripts/aplicar-teses-oficiais.py                  # web: juris-index.js e juris-text.js
    python3 scripts/aplicar-teses-oficiais.py --nativo DIR     # + VadeMecumJuris (DIR = raiz dele)

Referências: docs/teses-oficiais/l1-referencia.json, l2-referencia.json e l3-referencia.json
(lotes L1 automático, L2 conferência com a auditoria e L3 revisão à mão; texto oficial literal,
baixado em 25/09/2026 — rotas em cada arquivo) e l4-referencia.json (lote L4: "aplicar" entra como
os outros; "fundir" e "retirar" SAEM do acervo). Um id só pode estar num lote. Depois da web, rode
build-fatias, build-incidencia e build-semana-juris; depois do nativo, rode scripts/build_corpus.py
e scripts/verificar_auditoria.py lá.

Lote L4 (decisões da dona, 25/09/2026): um verbete por tema. O id fundido sai das duas cópias e o
estado da pessoa migra para o canônico — a tabela de migração é GERADA aqui, entre marcadores, no
juris-web.html (JURIS_ID_MIGRACOES / JURIS_IDS_RETIRADOS), no JurisEstadoPersistido.swift do Mac e do
iPad e, com --nativo, no LibraryStore.swift do app independente. O id retirado sai sem destino: o
estado da pessoa fica no disco, órfão. No nativo, os registros saem do repercussao_geral.json, a
deduplicação congelada é reposicionada (o absorvedor fundido vira o canônico; o retirado, nenhum) e a
trava passa a exigir que nenhum desses ids volte ao corpus.

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
  build_corpus.py regenera o corpus.json) e grava a trava literal em scripts/teses_oficiais.json.
  A trava leva o registro oficial
  inteiro: o build_corpus.py o põe por cima dos patches da auditoria (cuja correção o L2 conferiu
  campo a campo contra o oficial) e dos 4 ids que a auditoria criou por patch "add".
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = [os.path.join(RAIZ, 'docs', 'teses-oficiais', f'l{n}-referencia.json') for n in (1, 2, 3)]
REF_L4 = os.path.join(RAIZ, 'docs', 'teses-oficiais', 'l4-referencia.json')
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


def sem_nota(v):
    """Nota da plataforma não entra no acervo (03/10/2026: no verbete fica o texto oficial e o que a
    pessoa anota). A referência ainda guarda o campo 'co'; daqui ele não sai mais para lugar nenhum."""
    return None if (v and 'Nota do C' in v) else v


def le_js(caminho, glob):
    s = open(caminho, encoding='utf-8').read()
    pre = 'window.' + glob + '='
    assert s.startswith(pre) and s.endswith(';\n'), caminho
    return json.loads(s[len(pre):-2]), pre


def grava_js(caminho, pre, v):
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(pre + json.dumps(v, ensure_ascii=False, separators=(',', ':')) + ';\n')


def bloco(caminho, nome, linhas):
    """Troca o conteúdo entre os marcadores <gerado:NOME> e </gerado:NOME> (comentário // ou /* */)."""
    t = open(caminho, encoding='utf-8').read()
    m = re.search(r'(?m)^([ \t]*)(/\*|//) <gerado:' + re.escape(nome) + r'>.*\n', t)
    f = re.search(r'(?m)^[ \t]*(/\*|//) </gerado:' + re.escape(nome) + r'>', t)
    assert m and f and f.start() >= m.end(), (caminho, nome)
    ind = m.group(1)
    novo = t[:m.end()] + ''.join(ind + l + '\n' for l in linhas) + t[f.start():]
    if novo != t:
        with open(caminho, 'w', encoding='utf-8') as fh:
            fh.write(novo)


def gera_migracoes(l4, arquivos_swift):
    """A mesma tabela nas três casas: web, Swift do Mac/iPad (e do app independente, com --nativo)."""
    fundir = {i: v['canonico'] for i, v in sorted(l4['fundir'].items())}
    retirar = sorted(l4['retirar'])
    jw = os.path.join(RAIZ, 'juris-web.html')
    bloco(jw, 'teses-oficiais-l4:migracoes', [f"'{a}':'{b}'," for a, b in fundir.items()])
    bloco(jw, 'teses-oficiais-l4:retirados', [f"'{i}'," for i in retirar])
    for sw in arquivos_swift:
        bloco(sw, 'teses-oficiais-l4:migracoes', [f'"{a}": "{b}",' for a, b in fundir.items()])
        bloco(sw, 'teses-oficiais-l4:retirados', [f'"{i}",' for i in retirar])
    print(f'migração de id: {len(fundir)} fusões e {len(retirar)} retirados em juris-web.html e em {len(arquivos_swift)} arquivo(s) Swift')


def confere(ref):
    for i, r in ref.items():
        assert i.startswith('repgeral-'), i
        assert r['enunciado'] and OFICIAL.match(r['url']), i
        assert f"Tema {r['numero']} " in r['titulo'] + ' ', i
        assert not DOD.search(json.dumps(r, ensure_ascii=False)), i


def aplica_web(ref, sai=frozenset()):
    p_idx, p_txt = os.path.join(RAIZ, 'juris-index.js'), os.path.join(RAIZ, 'juris-text.js')
    idx, pre_i = le_js(p_idx, '__JURIS_IDX__')
    txt, pre_t = le_js(p_txt, '__JURIS_TXT__')
    antes = len(idx)
    idx = [r for r in idx if r[0] not in sai]           # L4: fundidos e retirados saem (a ordem do resto fica)
    for i in sai:
        txt.pop(i, None)
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
                'co': sem_nota(antigo.get('co')), 'ob': o['observacao'], 'tm': o['tema'] if tema != o['tema'] else None}
        txt[r[0]] = {c: v for c, v in novo.items() if v}   # juris-text é um objeto: a ordem das chaves se mantém
    faltam = set(ref) - vistos
    assert not faltam, f'ids da referência ausentes da web: {sorted(faltam)[:5]}'
    grava_js(p_idx, pre_i, idx)
    grava_js(p_txt, pre_t, txt)
    print(f'web: {len(vistos)} verbetes trocados em juris-index.js e juris-text.js; {antes - len(idx)} retirados do acervo ({antes} → {len(idx)})')


def reposiciona_dedup(dir_nat, rg_antes, sai, fundir, novo_569):
    """dedup_congelada.json guarda (arquivo, posição) do registro descartado. Tirar registros do
    repercussao_geral.json desloca as posições desse arquivo; e o absorvedor que saiu do acervo muda:
    fundido → o canônico (recebe o ⚡ como receberia o fundido); STF-569 (retirado) → o 569-2, que é o
    Tema 569; retirado sem destino → nenhum (o descarte continua, sem transferir o ⚡)."""
    p = os.path.join(dir_nat, 'scripts', 'dedup_congelada.json')
    cg = json.load(open(p, encoding='utf-8'))
    tirados = sorted(k for k, r in enumerate(rg_antes) if r['id'] in sai)
    import bisect
    mov = alvo = orfao = 0
    for d in cg['descartes']:
        assert d['id'] not in sai, d
        if d['arquivo'] == 'repercussao_geral' and tirados:
            k = d['posicao'] - bisect.bisect_left(tirados, d['posicao'])
            if k != d['posicao']:
                d['posicao'] = k; mov += 1
        a = d.get('absorvido_por')
        if a in fundir:
            d['absorvido_por'] = fundir[a]; d['absorvedor_fundido'] = a; alvo += 1
        elif a == 'repgeral-repercussao_geral-STF-569':
            d['absorvido_por'] = novo_569; d['absorvedor_retirado'] = a; alvo += 1
        elif a in sai:
            d['absorvido_por'] = None; d['absorvedor_retirado'] = a; orfao += 1
    if mov or alvo or orfao:
        cg['descricao'] = cg['descricao'].split(' Lote L4:')[0] + (
            ' Lote L4 (26/09/2026): posições do repercussao_geral.json reposicionadas depois de tirar os ids fundidos e '
            'retirados; absorvedor fundido → o canônico (absorvedor_fundido guarda o antigo); absorvedor retirado → '
            'nenhum, o descarte continua sem transferir o ⚡ (absorvedor_retirado guarda o antigo); STF-569 → STF-569-2 (Tema 569).')
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(cg, f, ensure_ascii=False, indent=1)
    print(f'dedup congelada: {mov} posições deslocadas, {alvo} absorvedores trocados pelo canônico, {orfao} sem absorvedor')


def aplica_nativo(ref, dir_nat, l4=None):
    p_rg = os.path.join(dir_nat, 'build', 'data', 'repercussao_geral.json')
    rg = json.load(open(p_rg, encoding='utf-8'))
    fundir = {i: v['canonico'] for i, v in (l4 or {}).get('fundir', {}).items()}
    retirar = dict((l4 or {}).get('retirar', {}))
    sai = set(fundir) | set(retirar)
    if sai & {r['id'] for r in rg}:
        reposiciona_dedup(dir_nat, rg, sai, fundir, 'repgeral-repercussao_geral-STF-569-2')
        n0 = len(rg)
        rg = [r for r in rg if r['id'] not in sai]
        print(f'nativo: {n0 - len(rg)} registros fundidos/retirados saem do repercussao_geral.json ({n0} → {len(rg)})')
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
                 'comentario': sem_nota(r.get('comentario'))}
    # ids que a auditoria criou por patch "add" (não estão no repercussao_geral.json): o registro
    # oficial deles entra pela trava, por cima do patch, no build_corpus.py
    por_patch = set()
    for f in sorted(os.listdir(os.path.join(dir_nat, 'build', 'data'))):
        if f.startswith('patches_auditoria_') and f.endswith('.json'):
            por_patch |= {p['add']['id'] for p in json.load(open(os.path.join(dir_nat, 'build', 'data', f), encoding='utf-8')) if 'add' in p}
    faltam = set(ref) - vistos - por_patch
    assert not (sai & por_patch), f'id criado por patch da auditoria está entre os que saem: {sorted(sai & por_patch)[:5]}'
    assert not faltam, f'ids da referência ausentes do repercussao_geral.json e dos patches: {sorted(faltam)[:5]}'
    with open(p_rg, 'w', encoding='utf-8') as f:
        f.write(json.dumps(rg, ensure_ascii=False, indent=1))
    # trava: o registro oficial inteiro. O build_corpus.py não reformata esses textos, põe estes campos
    # por cima de qualquer patch e derruba o build se o corpus divergir
    def campos(o):
        c = {k: o[k] for k in CAMPOS}
        c.update({'fontePublicacao': None, 'referencias': None})
        return c
    trava = {i: campos(o) for i, o in sorted(ref.items())}
    with open(os.path.join(dir_nat, 'scripts', 'teses_oficiais.json'), 'w', encoding='utf-8') as f:
        json.dump({'descricao': 'Trava literal das teses repgeral-* já trocadas pela fonte oficial (gerada por '
                                'scripts/aplicar-teses-oficiais.py do Cátedra). O build_corpus.py mantém esses textos '
                                'como estão e falha se o corpus divergir, se o link não for oficial ou se aparecer '
                                'texto do Dizer o Direito.',
                   'registros': trava,
                   # L4: um verbete por tema. Nenhum destes ids pode voltar ao corpus (o build falha).
                   'fundidos': dict(sorted(fundir.items())), 'retirados': dict(sorted(retirar.items()))},
                  f, ensure_ascii=False, indent=1)
    # As notas de estudo do nativo (notas.json) foram apagadas em 03/10/2026 (decisão da dona): não há
    # mais o que retirar desses verbetes.
    print(f'nativo: {len(vistos)} registros trocados em repercussao_geral.json, {len(set(ref) - vistos)} pela trava '
          f'(criados por patch da auditoria); trava com {len(trava)}')


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
    l4 = json.load(open(REF_L4, encoding='utf-8')) if os.path.exists(REF_L4) else None
    sai = set()
    if l4:
        repetidos = set(ref) & set(l4['aplicar'])
        assert not repetidos, f'id em dois lotes: {sorted(repetidos)[:5]}'
        ref.update(l4['aplicar'])
        sai = set(l4['fundir']) | set(l4['retirar'])
        assert not (sai & set(ref)), 'id fundido/retirado com registro oficial'
        assert all(v['canonico'] in ref for v in l4['fundir'].values()), 'canônico sem registro oficial'
        print(f"l4-referencia.json: {len(l4['aplicar'])} aplicado(s), {len(l4['fundir'])} fundidos, {len(l4['retirar'])} retirados")
    confere(ref)
    aplica_web(ref, sai)
    swift = [os.path.join(RAIZ, d, 'vendor', 'juris', 'Store', 'JurisEstadoPersistido.swift') for d in ('mac', 'ios')]
    if '--nativo' in sys.argv:
        dir_nat = sys.argv[sys.argv.index('--nativo') + 1]
        swift.append(os.path.join(dir_nat, 'Sources', 'VadeMecum', 'Store', 'LibraryStore.swift'))
        aplica_nativo(ref, dir_nat, l4)
    if l4:
        gera_migracoes(l4, swift)
