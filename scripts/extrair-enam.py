#!/usr/bin/env python3
"""Extrai o texto dos PDFs oficiais do ENAM (scripts/fontes/enam/*.pdf) para .txt ao lado.

Por que um .txt versionado: o build (scripts/build-questoes-enam.mjs) roda na CI, onde não
há Python nem PyMuPDF. O texto cru é pequeno (~100 KB por prova) e é a matéria-prima que o
build lê; o PDF fica como prova de origem. Páginas separadas por \\f. Nada é limpo aqui —
a limpeza (moldura, cabeçalhos, numeração) é do build, para ser testável em Node.

Uso:  python3 scripts/extrair-enam.py            # todos os PDFs sem .txt ou desatualizados
      python3 scripts/extrair-enam.py --forcar   # reextrai tudo
"""
import os, sys
import fitz  # PyMuPDF

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fontes', 'enam')
forcar = '--forcar' in sys.argv
n = 0
for nome in sorted(os.listdir(PASTA)):
    if not nome.endswith('.pdf'):
        continue
    pdf = os.path.join(PASTA, nome)
    txt = pdf[:-4] + '.txt'
    if not forcar and os.path.exists(txt) and os.path.getmtime(txt) >= os.path.getmtime(pdf):
        continue
    doc = fitz.open(pdf)
    paginas = [p.get_text() for p in doc]
    with open(txt, 'w', encoding='utf-8') as f:
        f.write('\f'.join(paginas))
    n += 1
    print(f'  · {nome} → {os.path.basename(txt)} ({doc.page_count} páginas, {sum(len(p) for p in paginas)} caracteres)')
print(f'✓ {n} arquivo(s) extraído(s) em {os.path.relpath(PASTA)}')
