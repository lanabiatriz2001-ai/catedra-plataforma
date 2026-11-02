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
        with patch.object(self.modulo, "get", side_effect=lambda url: (200, b"fixture") if "informativo2.htm" in url else (404, b"")), \
             patch.object(self.modulo, "parse_stf", return_value=[self.novo]), \
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


if __name__ == "__main__":
    unittest.main()
