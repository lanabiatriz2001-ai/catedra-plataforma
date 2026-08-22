#!/usr/bin/env python3
"""Extração limpa do PDF de uma prova — a receita do relatório de auditoria.

Por que existe: a extração crua (`get_text()` página a página, concatenado) publicava,
em 267 das 561 provas, o regulamento do caderno no lugar do enunciado, cabeçalho/rodapé
repetido no meio do texto, ou quase nada (PDF escaneado). Texto errado é pior que texto
ausente: quem treina em cima dele confia nele.

A receita, na ordem em que importa:
  1. remove a moldura (linha que se repete em 3+ páginas é cabeçalho/rodapé, não conteúdo);
  2. descarta as páginas que são SÓ regulamento (e só essas — no CEBRASPE o regulamento
     divide a página com o enunciado, e derrubar a página inteira apagava a prova);
  3. corta tudo antes do marcador de início, preferindo marcador forte a marcador fraco;
  4. espelho em tabela sai por find_tables(), célula a célula — get_text() embaralha coluna;
  5. PDF escaneado (texto curto demais) é declarado como tal, para o app dizer a verdade
     em vez de publicar meia dúzia de caracteres.

Rede de segurança: se a limpeza derrubar o texto abaixo do mínimo mas o PDF tinha conteúdo,
volta para o estágio anterior. Perder o enunciado inteiro é pior que deixar sobrar instrução.

Uso:  python3 extrair_prova.py <arquivo.pdf> [enunciado|espelho]
Saída: JSON {texto, paginas, escaneado, tabelas}
"""
import json
import re
import sys
import unicodedata

import fitz  # PyMuPDF

# Regulamento do caderno em nível de PÁGINA: se a página inteira é isto, ela cai.
RE_INSTRUCOES_FORTE = re.compile(
    r"N[ÃA]O\s+SER[ÁA]\s+PERMITIDO|INFORMA[ÇC][ÕO]ES\s+GERAIS|retirar-?se\s+da\s+sala"
    r"|ser[áa]\s+eliminad[oa]\s+do\s+concurso|AGUARDE\s+A\s+ORDEM|BOA\s+PROVA"
    r"|FISCAL\s+DE\s+SALA|APARELHOS\s+ELETR[ÔO]NICOS", re.I)

# Regulamento em nível de LINHA. As bolinhas do CEBRASPE não usam nenhuma frase da lista
# acima — são sobre a folha de texto definitivo e a distribuição de pontos — e vinham
# inteiras no lugar do enunciado em 36 de 60 provas da amostra.
RE_INSTRUCOES = re.compile(
    RE_INSTRUCOES_FORTE.pattern
    + r"|anula[çc][ãa]o\s+da\s+sua\s+prova|dom[íi]nio\s+do\s+conte[úu]do\s+ser[ãa]o\s+atribu[íi]dos"
      r"|transcreva\s+o\s+texto|FOLHA\s+DE\s+TEXTO\s+DEFINITIVO|folha\s+de\s+texto\s+definitivo"
      r"|ser[áa]\s+desconsiderad[oa]|local\s+indevido|espa[çc]os?\s+destinados?\s+[àa]\s+transcri"
      r"|espa[çc]os?\s+para\s+rascunho|extens[ãa]o\s+m[áa]xima\s+de\s+linhas"
      r"|quesito\s+apresenta[çc][ãa]o|estrutura\s+textual|marca\s+identificadora"
      r"|CADERNO\s+DE\s+RASCUNHO|^\s*RASCUNHO\b", re.I | re.M)

# Marcador FORTE: onde a prova começa, sem ambiguidade.
RE_INICIO_FORTE = re.compile(
    r"(-{2,}\s*PROVA\s+DISCURSIVA\s*-{2,}|PE[ÇC]A\s+PR[ÁA]TICO"
    r"|QUEST[ÃA]O\s*(?:N?[º°.]?\s*)?0?1\b|DISSERTA[ÇC][ÃA]O\b"
    r"|PROVA\s+ESCRITA\s+DISCURSIVA|Texto\s+1\b)", re.I)

# Layout da FGV: a disciplina abre em linha própria e o número da questão vem logo abaixo,
# sem a palavra "QUESTÃO". Sem isto, o corte parava na capa de instruções em duas colunas.
RE_INICIO_FGV = re.compile(
    r"^\s*(Direito\s+\w[^\n]{0,40}|Legisla[çc][ãa]o[^\n]{0,40}|Sentença[^\n]{0,30})\s*\n\s*\d{1,2}\s*\n",
    re.I | re.M)

# Marcador FRACO: aparece também dentro do regulamento ("…DA PROVA DISCURSIVA, nos locais…"),
# por isso só vale quando nenhum forte serve.
RE_INICIO_FRACO = re.compile(
    r"(PROVA\s+DISCURSIVA\b|SENTEN[ÇC]A\b|Considerando\s+a\s+situa[çc][ãa]o"
    r"|Considere\s+a\s+seguinte\s+situa[çc][ãa]o|Na\s+qualidade\s+de)", re.I)

RE_INICIO_ESPELHO = re.compile(
    r"(PADR[ÃA]O\s+DE\s+RESPOSTA|GABARITO\s+(?:OFICIAL|DEFINITIVO)|ESPELHO\s+DE\s+CORRE[ÇC][ÃA]O"
    r"|CRIT[ÉE]RIOS?\s+DE\s+CORRE[ÇC][ÃA]O|QUESITO\s*1)", re.I)

MIN_TEXTO = 300          # abaixo disso o PDF é imagem (ou a extração falhou)


def linhas_moldura(paginas):
    """Linha que aparece em 3+ páginas é cabeçalho/rodapé — moldura, não conteúdo.

    Cortar por posição (topo/rodapé) erraria: muita banca põe o enunciado logo abaixo do
    cabeçalho, na mesma faixa vertical. Frequência é o sinal confiável.
    """
    if len(paginas) < 3:
        return set()
    conta = {}
    for p in paginas:
        for l in {x.strip() for x in p.split("\n") if len(x.strip()) >= 12}:
            conta[l] = conta.get(l, 0) + 1
    minimo = max(3, len(paginas) // 3)
    return {l for l, n in conta.items() if n >= minimo}


def _normalizar_pua(texto):
    """Fonte de símbolo (Symbol/Wingdings) codifica na área de uso privativo do Unicode.

    A bolinha da FGV sai como \uf0b7 e o espaço como \uf020 — caracteres que a auditoria
    conta como lixo de codificação e que escondem o começo da prova. A convenção dessas
    fontes é o código Latin-1 somado a 0xF000, então basta subtrair.
    """
    return "".join(
        chr(ord(c) - 0xF000) if 0xF020 <= ord(c) <= 0xF0FF else c
        for c in texto)


def _dobrar_matematicas(texto):
    """𝑢 e 𝑖 (Alfanuméricos Matemáticos, U+1D400–U+1D7FF) viram u e i.

    O espelho de contabilidade do TCE-AC escreve as fórmulas com essas letras. Elas são
    CONTEÚDO — a régua da auditoria é que as contava como lixo de codificação. Dobrar só
    este bloco (e não aplicar NFKC no texto inteiro) evita mexer no resto: um NFKC geral
    transformaria "№" em "No" e "½" em "1⁄2" dentro de texto de lei.
    """
    if not any(0x1D400 <= ord(c) <= 0x1D7FF for c in texto):
        return texto
    return "".join(
        unicodedata.normalize("NFKC", c) if 0x1D400 <= ord(c) <= 0x1D7FF else c
        for c in texto)


def limpar(texto):
    texto = _dobrar_matematicas(texto)
    texto = _normalizar_pua(texto)
    texto = texto.replace("­", "")            # hífen suave
    texto = re.sub(r"[ \t ]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def _pagina_e_so_regulamento(pagina):
    """Página de puro regulamento: tem frase forte de instrução e nenhum começo de prova.

    A guarda do marcador é o que salva o CEBRASPE, onde as bolinhas do regulamento e o
    enunciado dividem a primeira página: ali a página fica, e o corte vem do marcador.
    """
    if not RE_INSTRUCOES_FORTE.search(pagina[:2000]):
        return False
    if RE_INICIO_FORTE.search(pagina):
        return False
    return len(pagina.strip()) < 6000


def _bom_comeco(texto, pos, modo):
    """O marcador serve se o que vem depois dele é enunciado, não mais regulamento."""
    depois = texto[pos:pos + 700]
    if RE_INSTRUCOES.search(depois):
        return False
    return len(depois.strip()) >= 120 or modo == "espelho"


def _cortar_no_comeco(texto, modo):
    if modo == "espelho":
        ordens = [RE_INICIO_ESPELHO]
    else:
        ordens = [RE_INICIO_FORTE, RE_INICIO_FGV, RE_INICIO_FRACO]
    for regex in ordens:
        for m in regex.finditer(texto):
            if _bom_comeco(texto, m.start(), modo):
                return texto[m.start():].strip() if m.start() > 0 else texto
    return texto


def _tirar_linhas_de_regulamento(texto):
    """Tira linha a linha o que sobrou de regulamento.

    Duas cautelas, ambas por erro cometido:
    · só linhas CURTAS — um parágrafo longo que por acaso cite "sentença" ou "rascunho" é
      conteúdo da prova, e apagá-lo é justamente o erro que a auditoria pegou;
    · a bolinha "•" sozinha numa linha só cai junto com o item que ela abre. Descartá-la
      sempre custava as listas legítimas do enunciado — em 1 de cada 4 provas da amostra,
      os fatos da situação hipotética perdiam a marcação.
    """
    linhas = texto.split("\n")
    saida = []
    i = 0
    while i < len(linhas):
        crua = linhas[i].strip()
        if crua in {"•", "-", "–"} and i + 1 < len(linhas):
            item = linhas[i + 1].strip()
            if item and len(item) < 500 and RE_INSTRUCOES.search(item):
                i += 2                                  # a bolinha e o item de regulamento
                continue
            saida.append(linhas[i])                     # lista de verdade: a bolinha fica
            i += 1
            continue
        if crua and len(crua) < 500 and RE_INSTRUCOES.search(crua):
            i += 1
            continue
        saida.append(linhas[i])
        i += 1
    return "\n".join(saida)


def _tirar_repeticao(texto):
    """Linha idêntica repetida 4+ vezes é boilerplate, não conteúdo — fica só a primeira.

    A FGV repete "Obs.: o(a) examinando(a) deve fundamentar suas respostas…" abaixo de
    cada questão. A frase é legítima uma vez; quatro vezes é ruído, e é exatamente o que
    a heurística de cabeçalho-repetido da auditoria acusa.
    """
    conta = {}
    for linha in texto.split("\n"):
        crua = linha.strip()
        if len(crua) >= 20:
            conta[crua] = conta.get(crua, 0) + 1
    repetidas = {l for l, n in conta.items() if n >= 4}
    if not repetidas:
        return texto
    vistas, saida = set(), []
    for linha in texto.split("\n"):
        crua = linha.strip()
        if crua in repetidas:
            if crua in vistas:
                continue
            vistas.add(crua)
        saida.append(linha)
    return "\n".join(saida)


def extrair(caminho, modo="enunciado"):
    doc = fitz.open(caminho)
    paginas = [p.get_text() for p in doc]
    bruto = "\n".join(paginas)

    # 5. escaneado: declara em vez de publicar lixo
    if len(bruto.strip()) < MIN_TEXTO:
        return {"texto": "", "paginas": len(paginas), "escaneado": True, "tabelas": 0}

    # 1. moldura fora
    moldura = linhas_moldura(paginas)
    sem_moldura = []
    for p in paginas:
        sem_moldura.append("\n".join(l for l in p.split("\n") if l.strip() not in moldura))

    # 2. páginas que são SÓ regulamento
    uteis = [p for p in sem_moldura if not _pagina_e_so_regulamento(p)]
    if not uteis:
        uteis = sem_moldura

    texto = limpar("\n".join(uteis))
    reserva = texto           # rede de segurança: estágio anterior a cada corte

    # 4. espelho em tabela: get_text() embaralha as colunas; find_tables monta certo
    tabelas = 0
    if modo == "espelho":
        pedacos = []
        for pagina in doc:
            try:
                achadas = pagina.find_tables()
            except Exception:
                continue
            for t in getattr(achadas, "tables", []) or []:
                try:
                    dados = t.extract()
                except Exception:
                    continue
                linhas_t = []
                for linha in dados:
                    celulas = [str(c).strip() for c in linha if c and str(c).strip()]
                    if celulas:
                        linhas_t.append(" · ".join(celulas))
                if len(linhas_t) >= 2:
                    tabelas += 1
                    pedacos.append("\n".join(linhas_t))
        if pedacos:
            # a tabela é a fonte boa; o texto corrido entra como complemento
            texto = limpar("\n\n".join(pedacos) + "\n\n" + texto)
            reserva = texto

    # 3. corte no começo real
    cortado = _cortar_no_comeco(texto, modo)
    if len(cortado) >= MIN_TEXTO:
        texto, reserva = cortado, cortado

    # regulamento que sobrou solto no meio
    enxuto = limpar(_tirar_linhas_de_regulamento(texto))
    texto = enxuto if len(enxuto) >= MIN_TEXTO else reserva
    texto = limpar(_tirar_repeticao(texto))

    return {"texto": texto, "paginas": len(paginas),
            "escaneado": len(texto) < MIN_TEXTO, "tabelas": tabelas}


if __name__ == "__main__":
    arq = sys.argv[1]
    modo = sys.argv[2] if len(sys.argv) > 2 else "enunciado"
    print(json.dumps(extrair(arq, modo), ensure_ascii=False))
