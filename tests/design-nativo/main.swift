// Testes da base visual nativa (ios/vendor/design). Compilados só com a base, no Mac,
// por scripts/testar-design-nativo.sh — o projeto não tem XCTest. Saída: uma linha ✓/✗
// por conferência; código de saída 1 se alguma falhar.
import Foundation
import SwiftUI

var falhas = 0
func confere(_ c: Bool, _ rotulo: String) {
    print((c ? "✓ " : "✗ ") + rotulo)
    if !c { falhas += 1 }
}
let pastaFontes = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""

// ── Tema e cor ──────────────────────────────────────────────────────────────
confere(Color.hexDe(css: "#fffdf8") == 0xFFFDF8, "hexDe lê #rrggbb")
confere(Color.hexDe(css: "#abc") == 0xAABBCC, "hexDe expande #rgb")
confere(Color.hexDe(css: " rgb(32, 29, 23) ") == 0x201D17, "hexDe lê rgb() com espaços")
confere(Color.hexDe(css: "rgba(0, 0, 0, 0)") == nil, "hexDe ignora cor transparente")
confere(Color.hexDe(css: "") == nil && Color.hexDe(css: "lixo") == nil, "hexDe ignora vazio e lixo")
confere(Color(css: "lixo") == nil, "Color(css:) devolve nil para lixo")
confere(abs(DSCor.contraste(0x000000, 0xFFFFFF) - 21) < 0.01, "contraste preto × branco = 21:1")
confere(abs(DSCor.contraste(0xFFFDF8, 0xFFFDF8) - 1) < 0.001, "contraste de uma cor com ela mesma = 1:1")
let tx = DSCor.texto(identidade: 0x65A30D, superficie: 0xFFFDF8, escuro: false)
confere(DSCor.contraste(tx, 0xFFFDF8) >= 4.5, "cor-texto do lima escurece até 4,5:1 no claro")
confere(ThemeState.t.surfaceHex == 0xFFFDF8 && ThemeState.t.displayFamilia == "Spectral",
        "tema de partida é a Planilha (superfície #fffdf8, display Spectral)")

// ── Tabela única de ramos e tribunais ──────────────────────────────────────
confere(Ramo.allCases.count == 13, "13 ramos na tabela (12 famílias da web + Leis Especiais)")
confere(Ramo.constitucional.identidade == 0x2563EB && Ramo.penal.identidade == 0xE11D48
        && Ramo.civil.identidade == 0x0D9488 && Ramo.internacional.identidade == 0x0284C7,
        "valores da tabela iguais aos que o LEGIS e o JURIS usavam")
for r in Ramo.allCases {
    let claro = DSCor.texto(identidade: r.identidade, superficie: 0xFFFDF8, escuro: false)
    let escuro = DSCor.texto(identidade: r.identidade, superficie: 0x201D17, escuro: true)
    confere(DSCor.contraste(claro, 0xFFFDF8) >= 4.5 && DSCor.contraste(escuro, 0x201D17) >= 4.5,
            "\(r.rawValue): cor-texto ≥ 4,5:1 no claro e no escuro")
}
confere(Ramo.deNome("Direito Constitucional") == .constitucional, "deNome: Constitucional")
confere(Ramo.deNome("Direito Processual Penal") == .penal, "deNome: Processual Penal é penal")
confere(Ramo.deNome("Direito Processual Civil") == .civil, "deNome: Processual Civil é civil")
confere(Ramo.deNome("Direito Previdenciário") == .previdenciario, "deNome ignora acento")
confere(Ramo.deNome("Direito Eleitoral") == .administrativo, "deNome: Eleitoral cai em administrativo (como antes)")
confere(Ramo.deNome("Direitos Humanos") == .internacional, "deNome: Direitos Humanos cai em internacional")
confere(Ramo.deNome(nil) == nil && Ramo.deNome("Direito Canônico") == nil, "deNome: nil ou desconhecido devolve nil")
confere(CorTribunal.identidade("STF") == 0x1D4ED8 && CorTribunal.identidade("STJ") == 0x0D9488
        && CorTribunal.identidade("XYZ") == nil, "cores de tribunal e ausência para tribunal desconhecido")

// ── Fontes e escala ─────────────────────────────────────────────────────────
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: "/nao/existe")).isEmpty
        && !DSFontes.disponivel("Spectral"),
        "registrar pasta inexistente não quebra e nada fica disponível")
let reg = DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true))
for f in DSFontes.familiasDaCasa {
    confere(reg.contains(f) && DSFontes.disponivel(f), "fonte da casa registrada a partir do woff2: \(f)")
}
let woffs = ((try? FileManager.default.contentsOfDirectory(atPath: pastaFontes)) ?? []).filter { $0.hasSuffix(".woff2") }
let conteudosUnicos = Set(woffs.compactMap { FileManager.default.contents(atPath: pastaFontes + "/" + $0) }).count
confere(DSFontes.ultimoRegistro.arquivos == conteudosUnicos && conteudosUnicos < woffs.count,
        "cada conteúdo de fonte é registrado uma vez só (\(DSFontes.ultimoRegistro.arquivos) de \(woffs.count) arquivos)")
confere(DSFontes.ultimoRegistro.falhas.isEmpty, "nenhuma falha de registro com as fontes do repositório")
confere(DSFontes.registrar(pasta: URL(fileURLWithPath: pastaFontes, isDirectory: true)) == reg,
        "registrar de novo (já registradas) não perde nenhuma família")
confere(!DSFontes.disponivel("Comic Sans MS"), "família de fora da casa não conta como disponível")
confere(DS.familiaDisplay(css: "'Spectral', Georgia, serif") == "Spectral", "display da Planilha/Tribunal")
confere(DS.familiaDisplay(css: "'Inter Tight', 'Inter', sans-serif") == "Inter Tight", "display do Neon/Aurora")
confere(DS.familiaDisplay(css: "'Space Grotesk', sans-serif") == "Space Grotesk", "display do Fibra/Solar")
confere(DS.familiaDisplay(css: "'JetBrains Mono', monospace") == "JetBrains Mono", "display do Terminal")
confere(DS.familiaDisplay(css: "") == nil && DS.familiaDisplay(css: "Comic Sans") == nil,
        "display vazio ou desconhecido devolve nil (a ponte mantém o anterior)")
confere(DS.escala(8) == 11 && DS.escala(15) == 15, "escala: piso de 11 e tamanho normal intacto (Mac)")
confere(DSTipo.micro.rawValue == 12 && DSTipo.corpo.rawValue == 15
        && DSTipo.titulo.rawValue == 19 && DSTipo.display.rawValue == 26, "escala de 4 degraus da interface")
ThemeState.t.radius = 12
confere(DSRaio.card == 12 && DSRaio.interno == 9 && DSRaio.hero == 18, "raios derivados de --radius")
ThemeState.t.radius = 6
confere(DSRaio.interno == 6, "raio interno nunca abaixo de 6")

// ── Lógica do leitor (entrega 2) ────────────────────────────────────────────
confere(LeitorLogica.numero(de: "Art. 5º") == "5" && LeitorLogica.numero(de: "Art. 1.015") == "1015"
        && LeitorLogica.numero(de: "Art. 121-A") == "121-A" && LeitorLogica.numero(de: "sem número") == nil,
        "numero(de:) no mesmo formato do incidencia-verbetes.json")
confere(LeitorLogica.numero(de: "Art. 1º-A") == "1-A" && LeitorLogica.numero(de: "Art. 5o-A") == "5-A"
        && LeitorLogica.numero(de: "Art. 1.045-B") == "1045-B", "numero(de:) com ordinal antes da letra (1º-A → 1-A)")
let lei = """
TÍTULO II
Art. 5º Todos são iguais perante a lei, nos termos do art. 3º e seguintes:
I - homens e mulheres são iguais;
Art. 6º São direitos sociais a educação.
Art 7 texto sem ponto.
Art. 1.045 texto com milhar.
Art. 121-A texto com letra.
"""
let cabs = LeitorLogica.cabecalhos(em: lei)
confere(cabs.map(\.numero) == ["5", "6", "7", "1045", "121-A"],
        "cabeçalhos: só início de linha; 'art. 3º' no meio do parágrafo não conta")
let ns = lei as NSString
confere(cabs.allSatisfy { ns.substring(with: $0.intervalo) == $0.rotulo } && cabs.first?.rotulo == "Art. 5º",
        "intervalo de cada cabeçalho aponta exatamente para o rótulo no texto (o texto não muda)")
confere(LeitorLogica.trecho(de: cabs[0], em: lei, cabecalhos: cabs)
        == ["Art. 5º Todos são iguais perante a lei, nos termos do art. 3º e seguintes:", "I - homens e mulheres são iguais;"],
        "trecho do artigo vai até o próximo cabeçalho")
confere(LeitorLogica.trecho(de: cabs[4], em: lei, cabecalhos: cabs) == ["Art. 121-A texto com letra."],
        "trecho do último artigo vai até o fim")
confere(LeitorLogica.cabecalhos(em: "").isEmpty && LeitorLogica.cabecalhos(em: "Sem artigos aqui.").isEmpty,
        "texto sem artigos: nenhum cabeçalho")
confere(AlturaGaveta.fechada.apos(arrasto: -120) == .meia && AlturaGaveta.meia.apos(arrasto: -120) == .cheia
        && AlturaGaveta.cheia.apos(arrasto: -500) == .cheia, "arrastar para cima sobe um degrau (e para no topo)")
confere(AlturaGaveta.cheia.apos(arrasto: 120) == .meia && AlturaGaveta.meia.apos(arrasto: 120) == .fechada
        && AlturaGaveta.meia.apos(arrasto: 900) == .fechada, "arrastar para baixo desce um degrau (e fecha)")
confere(AlturaGaveta.meia.apos(arrasto: 30) == .meia && AlturaGaveta.meia.apos(arrasto: -30) == .meia,
        "arrasto pequeno (< 80 pt) não muda a altura")
confere(AlturaGaveta.meia.fracao(compacto: true) == 1 && AlturaGaveta.meia.fracao(compacto: false) == 0.5
        && AlturaGaveta.fechada.fracao(compacto: false) == 0, "no compacto a gaveta abre em tela cheia")

var modoTeste = ModoLeitor.ler
let barra = BarraLeitor(ramo: "Constitucional", corRamo: Ramo.constitucional.identidade, titulo: "Constituição Federal",
                        modo: Binding(get: { modoTeste }, set: { modoTeste = $0 }), aoVoltar: {},
                        aa: { EmptyView() }, mais: { EmptyView() })
confere(ModoLeitor.ler.rawValue == "corrido" && ModoLeitor.estudar.rawValue == "estudo"
        && String(describing: type(of: barra)).hasPrefix("BarraLeitor"),
        "BarraLeitor existe e o modo usa os mesmos valores de readerMode")
var alturaTeste = AlturaGaveta.meia, abaTeste = 0
let gaveta = GavetaContexto(altura: Binding(get: { alturaTeste }, set: { alturaTeste = $0 }),
                            titulo: "Art. 5º", subtitulo: "3 julgados", abas: ["Jurisprudência", "Remissões"],
                            aba: Binding(get: { abaTeste }, set: { abaTeste = $0 }), compacto: false) { EmptyView() }
confere(String(describing: type(of: gaveta)).hasPrefix("GavetaContexto"), "GavetaContexto existe")

// ── Artigos citados (entrega 3) ─────────────────────────────────────────────
let invertido = CitacoesLogica.inverter([
    "Constituição Federal": ["5": ["v1", "v2"], "10-A": ["v1"], "100": ["v1"], "2": ["v1"]],
    "Código Civil": ["186": ["v1"]]])
confere(CitacoesLogica.ordenar(invertido["v1"] ?? []).map { "\($0.diploma)|\($0.artigo)" }
        == ["Código Civil|186", "Constituição Federal|2", "Constituição Federal|5", "Constituição Federal|10-A", "Constituição Federal|100"],
        "artigos citados: por diploma e em ordem numérica (2 < 5 < 10-A < 100)")
confere(invertido["v2"] == [ArtigoCitado(diploma: "Constituição Federal", artigo: "5")] && invertido["vX"] == nil,
        "inversão: verbete com um artigo e verbete sem nenhum")
confere(CitacoesLogica.inverter([:]).isEmpty, "índice vazio: nada")

// ── Destinos (entrega 4) ────────────────────────────────────────────────────
confere(Destino.allCases.map(\.titulo) == ["Hoje", "Acervo", "Treinar", "Novidades"],
        "os mesmos 4 destinos, na mesma ordem, nos dois produtos")
confere(Set(Destino.allCases.map(\.simbolo)).count == 4, "cada destino com ícone próprio")
let hubTeste = DestinoHub(titulo: "Acervo", subtitulo: "", secoes: [SecaoHub(titulo: "", itens: [
    ItemHub(id: "a", titulo: "Todas", detalhe: nil, simbolo: "books.vertical", cor: nil, contagem: 3, acao: {})])])
confere(String(describing: type(of: hubTeste)) == "DestinoHub", "DestinoHub existe")

// ── Hoje e ordem por autoridade (entrega 5) ────────────────────────────────
let cont = CartaoContinuar(titulo: "Constituição Federal", detalhe: "Art. 5º", cor: Ramo.constitucional.identidade, acao: {})
confere(String(describing: type(of: cont)) == "CartaoContinuar", "CartaoContinuar existe")
let ordem = ["sumula_vinculante", "stf_adi", "repercussao_geral", "repetitivo", "sumula_stf", "sumula_stj",
             "informativo_stf", "tjro", "vademecum_dod", "desconhecida"]
confere(ordem.map(OrdemAutoridade.posicao) == ordem.map(OrdemAutoridade.posicao).sorted(),
        "ordem por autoridade: vinculante → controle concentrado → RG → repetitivo → súmulas → informativos → estaduais → apoio")
confere(OrdemAutoridade.posicao("tjro") > OrdemAutoridade.posicao("sumula_stj"),
        "TJRO depois de STF e STJ (antes a lista abria pela Súmula 1 do TJRO)")

// Lateral no padrão do Cátedra: texto claro sobre o navy e branco sobre a pílula verde.
confere(DSCor.contraste(0xB9C3CF, 0x1E2B3A) >= 4.5, "texto da lateral dá 4,5:1 sobre o navy do tema de partida")
confere(DSCor.contraste(0xFFFFFF, 0x0F7A57) >= 4.5, "branco sobre a pílula verde do item ativo dá 4,5:1")
_ = LinhaLateral(titulo: "Acervo", simbolo: "books.vertical", ativa: true, acao: {})
_ = MetaLateral(feito: 31, meta: 50, unidade: "verbetes")

// ── Início (padrão do Cátedra) ─────────────────────────────────────────────
let fk = DateFormatter(); fk.locale = Locale(identifier: "en_US_POSIX"); fk.dateFormat = "yyyy-MM-dd"
let sab = fk.date(from: "2026-09-26")!   // sábado
let sem = BarrasSemana.dias(["2026-09-26": 4, "2026-09-21": 2, "2026-09-19": 9], agora: sab)
confere(sem.count == 7 && sem.last?.hoje == true && sem.last?.valor == 4 && sem.last?.rotulo == "SÁB · HOJE",
        "estudo semanal: 7 dias, o último é hoje (sábado) com 4")
confere(sem.first?.rotulo == "DOM" && sem[1].valor == 2 && !sem.contains { $0.valor == 9 },
        "estudo semanal começa no domingo anterior e ignora o que é de mais de 7 dias")
confere(HeroInicio<EmptyView>.saudacao(fk.date(from: "2026-09-26")!.addingTimeInterval(9 * 3600)) == "Bom dia",
        "saudação das 9 h é Bom dia")

// (Tasks 2 e 3 acrescentam blocos aqui, antes do fechamento.)

print(falhas == 0 ? "\nbase visual: tudo certo" : "\nbase visual: \(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
