"""Regressões do formato oficial de 06/11/2026; nenhuma chamada de rede."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parent.parent
FIXTURES = RAIZ / 'tests/fixtures/informativos/2026-11-06'
spec = importlib.util.spec_from_file_location('importador', RAIZ / 'scripts/atualizar-informativos.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def fixture(nome):
    return (FIXTURES / (nome + '.html')).read_bytes()


class LeituraOficial(unittest.TestCase):
    def test_respostas_reais_identificam_edicao_e_extraordinaria(self):
        for p in json.loads((FIXTURES / 'manifesto.json').read_text())['paginas']:
            with self.subTest(p=p['arquivo']):
                raw = (FIXTURES / p['arquivo']).read_bytes()
                self.assertEqual(m.edicao_na_pagina(p['fonte'], p['status'], raw, p['numero'], p['extra']), p['estado'])
                if not p['julgados']:
                    continue
                recs = m.parse_stf(p['numero'], raw) if p['fonte'] == 'stf' else m.parse_stj(f"{p['numero']:04d}{'E' if p['extra'] else ''}", raw)
                self.assertEqual(len(recs), p['julgados'])
                self.assertEqual(len(set(r['id'] for r in recs)), len(recs))
                self.assertTrue(all(r['url'] == p['url'] and r['enunciado'] and r['observacao'] for r in recs))
                self.assertTrue(all('\ufffd' not in json.dumps(r, ensure_ascii=False) for r in recs))
                if p['fonte'] == 'stj':
                    with self.assertRaises(RuntimeError):
                        m.edicao_na_pagina('stj', 200, raw, p['numero'] + 1, p['extra'])
                    with self.assertRaises(RuntimeError):
                        m.edicao_na_pagina('stj', 200, raw, p['numero'], not p['extra'])

    def test_falhas_http_e_respostas_incompletas_nao_sao_ausencia(self):
        for status in (0, 403, 429, 500, 503):
            with self.subTest(status=status), self.assertRaisesRegex(RuntimeError, 'HTTP'):
                m.edicao_na_pagina('stj', status, b'', 908)
        for h in ('<title>Request Rejected</title>', '<title>STJ - Informativo de Jurisprudência</title>',
                  '<title>STJ - Informativo de Jurisprudência</title><option>Informativo nº 908</option>'):
            with self.subTest(h=h), self.assertRaises(RuntimeError):
                m.edicao_na_pagina('stj', 200, h.encode('latin1'), 908)
        self.assertEqual(m.edicao_na_pagina('stf', 404, b'', 1236), 'nao-existe')

    def test_bloco_incompleto_nao_some_silenciosamente(self):
        raw = fixture('stj-0908').replace(b'>Destaque</div>', b'>Campo alterado</div>', 1)
        with self.assertRaisesRegex(RuntimeError, 'campos ausentes'):
            m.parse_stj('0908', raw)
        with self.assertRaisesRegex(RuntimeError, 'blocos de julgamento'):
            m.parse_stj('0908', fixture('stj-0908').replace(b'divTabela clsIdentificaProcesso', b'divTabela outra clsIdentificaProcesso', 1))

    def test_textos_completos_e_data_do_primeiro_dia(self):
        recs = m.parse_stj('0908', fixture('stj-0908'))
        self.assertEqual(recs[0]['data'], '01/09/2026')
        self.assertTrue(any(len(r['observacao']) > 1500 for r in recs))
        self.assertTrue(recs[-1]['observacao'].endswith('ausência de contato físico.'))

    def test_coleta_confere_ancora_e_so_para_por_ausencia(self):
        respostas = [(200, fixture('stj-0907')), (200, fixture('stj-0908')),
                     (200, fixture('stj-0909')), (200, fixture('stj-0909'))]
        with patch.object(m, 'get', side_effect=respostas) as buscar, patch.object(m.time, 'sleep'):
            self.assertEqual(len(m.coletar_serie('stj', 907)), 10)
            self.assertEqual(buscar.call_count, 4)
        with patch.object(m, 'get', side_effect=respostas[:1] + [(503, b'')]), patch.object(m.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'edição 908: HTTP 503'):
                m.coletar_serie('stj', 907)
        with patch.object(m, 'get', return_value=(200, fixture('stj-0909'))):
            with self.assertRaisesRegex(RuntimeError, 'âncora'):
                m.coletar_serie('stj', 907)
        with patch.object(m, 'get', side_effect=respostas[:2]), patch.object(m.time, 'sleep'), patch.object(m, 'MAXED', 1):
            with self.assertRaisesRegex(RuntimeError, 'limite'):
                m.coletar_serie('stj', 907)
        # Duas extraordinárias novas não podem travar a importação no terceiro probe.
        # A descoberta é simulada aqui; o parsing extraordinário usa o HTML real acima.
        with patch.object(m, 'ler_edicao', side_effect=[[{'id': 'ancora'}], [{'id': 'ee34'}], [{'id': 'ee35'}], None, None]) as ler, patch.object(m.time, 'sleep'):
            self.assertEqual(m.coletar_serie('stj', 33, True), [{'id': 'ee34'}, {'id': 'ee35'}])
            self.assertEqual(ler.call_args.args, ('stj', 37, True))

    def test_falha_de_uma_fonte_preserva_acervo_e_nao_gera_derivados(self):
        with tempfile.TemporaryDirectory() as d:
            idx = Path(d) / 'juris-index.js'
            txt = Path(d) / 'juris-text.js'
            idx.write_text('window.__JURIS_IDX__ = ' + json.dumps([
                ['INF2026-STF-1234-01', 'STF', 'informativo_stf', 1234],
                ['INF2026-STJ-907-01', 'STJ', 'informativo_stj', 907],
                ['INF2026-STJ-EE33-01', 'STJ', 'informativo_stj', 33]]) + ';')
            txt.write_text('window.__JURIS_TXT__ = {};')
            antes = (idx.read_bytes(), txt.read_bytes())
            with patch.object(m, 'IDX', str(idx)), patch.object(m, 'TXT', str(txt)), \
                 patch.object(m, 'coletar_serie', side_effect=[[{'id': 'novo'}], RuntimeError('bloqueio HTTP 403'), []]), \
                 patch.object(m.subprocess, 'run') as gerar:
                with self.assertRaisesRegex(RuntimeError, 'consulta incompleta; acervo preservado'):
                    m.main()
                gerar.assert_not_called()
            self.assertEqual((idx.read_bytes(), txt.read_bytes()), antes)

    def test_erro_de_rede_final_e_5xx_nao_viram_zero(self):
        with patch.object(m.urllib.request, 'urlopen', side_effect=m.urllib.error.URLError('DNS')), patch.object(m.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'falha de rede'):
                m.get('https://processo.stj.jus.br/teste')
        erro = m.urllib.error.HTTPError('https://processo.stj.jus.br/teste', 503, 'indisponível', {}, None)
        with patch.object(m.urllib.request, 'urlopen', side_effect=erro) as abrir, patch.object(m.time, 'sleep'):
            self.assertEqual(m.get('https://processo.stj.jus.br/teste'), (503, b''))
            self.assertEqual(abrir.call_count, m.RETRY_MAX + 1)


if __name__ == '__main__':
    unittest.main()
