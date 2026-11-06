"""Importação sem rede: uma citação nova precisa chegar ao widget na mesma rodada."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch


RAIZ = Path(__file__).resolve().parent.parent
EXECUTAR = subprocess.run


class InformativosGerados(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory(prefix="catedra-informativos-")
        self.addCleanup(self.pasta.cleanup)
        self.raiz = Path(self.pasta.name).resolve()
        (self.raiz / "scripts").mkdir()
        (self.raiz / "widget").mkdir()
        for nome in ("build-widget-dodia.mjs", "lib-cores-ramo.mjs"):
            shutil.copyfile(RAIZ / "scripts" / nome, self.raiz / "scripts" / nome)
        shutil.copyfile(RAIZ / "Catedra.dc.html", self.raiz / "Catedra.dc.html")
        self.gravar("leis-seca.js", 'window.CT_LEIS = [{nome:"Código Penal",artigos:[{rot:"Art. 59",txt:"Art. 59 O juiz atenderá aos critérios legais."}]}];')
        self.gravar("leis-seca-areas.js", "window.CT_LEIS_AREAS = [];")
        self.gravar("incidencia.json", json.dumps({"provas": {"CP": {"nome": "Código Penal", "artigos": {"59": {"provas": [{"id": "prova-fixture", "orgao": "Teste", "ano": 2026}]}}}}}))
        indice = [["INF-STF-1", "STF", "informativo_stf", 1], ["INF-STJ-1", "STJ", "informativo_stj", 1],
                  ["STJ-SUM-7", "STJ", "sumula", 7, "Súmula 7", "Direito Civil", None, None, None]]
        self.gravar("juris-index.js", "window.__JURIS_IDX__ = " + json.dumps(indice) + ";")
        self.gravar("juris-text.js", 'window.__JURIS_TXT__ = {"STJ-SUM-7":{"en":"Enunciado sintético."},"INF-STJ-1":{"en":"Súmula 7 do STJ."}};')
        EXECUTAR(["node", str(self.raiz / "scripts/build-widget-dodia.mjs")], check=True, capture_output=True)
        self.antes = self.widget()
        spec = importlib.util.spec_from_file_location("importador", RAIZ / "scripts/atualizar-informativos.py")
        self.modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.modulo)
        self.modulo.ROOT = str(self.raiz)
        self.modulo.IDX = str(self.raiz / "juris-index.js")
        self.modulo.TXT = str(self.raiz / "juris-text.js")
        self.modulo.MAXED = 2
        self.novo = {"id": "INF-STF-2", "tribunal": "STF", "fonte": "informativo_stf", "numero": 2,
                     "titulo": "Julgado sintético", "enunciado": "Aplicação da Súmula 7 do STJ."}

    def gravar(self, nome, texto):
        (self.raiz / nome).write_text(texto, encoding="utf-8")

    def widget(self):
        return json.loads((self.raiz / "widget/dodia.json").read_text(encoding="utf-8"))

    def importar(self, gerar):
        # Só a edição STF 2 responde; não há conexão com nenhuma fonte externa.
        def obter(url):
            if "informativo2.htm" in url:
                return 200, b"html-sintetico"
            return 404, b""

        with patch.object(self.modulo, "get", side_effect=obter), \
             patch.object(self.modulo, "parse_stf", return_value=[self.novo]), \
             patch.object(self.modulo, "parse_stj", return_value=[]), \
             patch.object(self.modulo.subprocess, "run", side_effect=gerar):
            self.modulo.main()

    def test_citacao_importada_regera_widget_e_preserva_artigo(self):
        def gerar(args, **opcoes):
            # Semana e fatias têm suas próprias réguas; aqui o widget REAL é executado.
            if Path(args[1]).name == "build-widget-dodia.mjs":
                return EXECUTAR(args, capture_output=True, **opcoes)
            return subprocess.CompletedProcess(args, 0)

        self.importar(gerar)
        depois = self.widget()
        self.assertEqual(len([i for i in self.antes["itens"] if i["tipo"] == "artigo"]), 1)
        self.assertEqual(next(i["n"] for i in self.antes["itens"] if i["id"] == "STJ-SUM-7"), 1)
        self.assertEqual(next(i["n"] for i in depois["itens"] if i["id"] == "STJ-SUM-7"), 2)
        self.assertEqual([i for i in self.antes["itens"] if i["tipo"] == "artigo"], [i for i in depois["itens"] if i["tipo"] == "artigo"])

    def test_falha_do_widget_nao_parece_importacao_concluida(self):
        def gerar(args, **opcoes):
            if Path(args[1]).name == "build-widget-dodia.mjs":
                raise subprocess.CalledProcessError(1, args)
            return subprocess.CompletedProcess(args, 0)

        with self.assertRaises(subprocess.CalledProcessError):
            self.importar(gerar)

    def test_simulacao_preserva_widget_e_nao_executa_geradores(self):
        self.modulo.DRY = True
        with patch.object(self.modulo.subprocess, "run") as gerar:
            self.importar(gerar)
            gerar.assert_not_called()
        self.assertEqual(self.widget(), self.antes)

    def test_falha_de_rede_nao_vira_zero_novidades_e_preserva_acervo(self):
        antes_idx = (self.raiz / "juris-index.js").read_bytes()
        antes_txt = (self.raiz / "juris-text.js").read_bytes()
        self.modulo.DRY = False
        with patch.object(self.modulo, "get", side_effect=self.modulo.FetchError("rede bloqueada")), \
             patch.object(self.modulo.time, "sleep"), \
             patch.object(self.modulo.subprocess, "run") as gerar:
            with self.assertRaises(SystemExit) as erro:
                self.modulo.main()
        self.assertEqual(erro.exception.code, 2)
        self.assertEqual((self.raiz / "juris-index.js").read_bytes(), antes_idx)
        self.assertEqual((self.raiz / "juris-text.js").read_bytes(), antes_txt)
        gerar.assert_not_called()

    def test_404_e_ausencia_legitima_e_resposta_200_ambigua_falha(self):
        series = [("STF", 10, 3, lambda n: (str(n), n), lambda codigo, raw: None)]
        with self.assertRaises(self.modulo.ParseError):
            self.modulo.buscar_edicoes(series, fetch=lambda url: (200, b"proxy bloqueou"))
        encontrados = self.modulo.buscar_edicoes(
            series, fetch=lambda url: (404, b"")
        )
        self.assertEqual(encontrados, [])

    def test_http_nao_404_nao_e_contado_como_edicao_ausente(self):
        series = [("STJ", 908, 2, lambda n: (str(n), n), lambda codigo, raw: [])]
        with self.assertRaises(self.modulo.FetchError):
            self.modulo.buscar_edicoes(series, fetch=lambda url: (403, b"blocked"))

    def test_get_expoe_bloqueio_de_rede_e_http_e_preserva_404(self):
        with patch.object(self.modulo.urllib.request, "urlopen", side_effect=self.modulo.urllib.error.URLError("403 tunnel")), \
             patch.object(self.modulo.time, "sleep"):
            with self.assertRaises(self.modulo.FetchError):
                self.modulo.get("https://fonte.test/edicao")
        for status in (403, 429, 500):
            erro = self.modulo.urllib.error.HTTPError("https://fonte.test", status, "erro", {}, None)
            with patch.object(self.modulo.urllib.request, "urlopen", side_effect=erro):
                with self.assertRaises(self.modulo.FetchError):
                    self.modulo.get("https://fonte.test/edicao")
        erro = self.modulo.urllib.error.HTTPError("https://fonte.test", 404, "not found", {}, None)
        with patch.object(self.modulo.urllib.request, "urlopen", side_effect=erro):
            self.assertEqual(self.modulo.get("https://fonte.test/edicao"), (404, b""))

    def test_parser_real_sem_resultado_e_erro(self):
        for parser, code, raw in (
            (self.modulo.parse_stf, 2, b"<html>" + b"x" * 5000 + b"</html>"),
            (self.modulo.parse_stj, "0002", b"clsIdentificaProcesso pagina incompleta"),
        ):
            serie = [("fonte", 2, 2, lambda n: (str(n), code), parser)]
            with self.assertRaises(self.modulo.ParseError):
                self.modulo.buscar_edicoes(serie, fetch=lambda url: (200, raw))

    def test_falha_serie_posterior_descarta_resultados_e_nao_mostra_zero(self):
        import io
        from contextlib import redirect_stdout
        antes = [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js")]
        def obter(url):
            if "informativo2.htm" in url:
                return 200, b"fixture"
            if "stf.jus" in url:
                return 404, b""
            raise self.modulo.FetchError("STJ indisponível")
        saida = io.StringIO()
        with patch.object(self.modulo, "get", side_effect=obter), \
             patch.object(self.modulo, "parse_stf", return_value=[self.novo]), \
             patch.object(self.modulo.subprocess, "run") as gerar, redirect_stdout(saida):
            with self.assertRaises(SystemExit) as erro:
                self.modulo.main()
        self.assertEqual(erro.exception.code, 2)
        self.assertNotIn("NOVOS:", saida.getvalue())
        self.assertEqual(antes, [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js")])
        gerar.assert_not_called()

    def test_falha_segunda_substituicao_restaura_acervo(self):
        antes = [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js")]
        replace = self.modulo.os.replace
        def falhar_segunda(origem, destino):
            if destino == self.modulo.TXT:
                raise OSError("erro simulado de gravação")
            return replace(origem, destino)
        with patch.object(self.modulo.os, "replace", side_effect=falhar_segunda):
            with self.assertRaises(OSError):
                self.importar(lambda *args, **kwargs: None)
        self.assertEqual(antes, [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js")])

    def test_falha_gerador_restaura_acervo_e_produtos(self):
        antes = [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js", "widget/dodia.json")]
        (self.raiz / "dados").mkdir()
        (self.raiz / "dados/original").write_text("original")
        def gerar(args, **opcoes):
            (self.raiz / "dados/original").write_text("modificado")
            (self.raiz / "semana-juris.js").write_text("novo")
            raise subprocess.CalledProcessError(1, args)
        with self.assertRaises(subprocess.CalledProcessError):
            self.importar(gerar)
        self.assertEqual(antes, [(self.raiz / nome).read_bytes() for nome in ("juris-index.js", "juris-text.js", "widget/dodia.json")])
        self.assertEqual((self.raiz / "dados/original").read_text(), "original")
        self.assertFalse((self.raiz / "semana-juris.js").exists())


if __name__ == "__main__":
    unittest.main()
