"""Verifica os decoradores de rotas sem depender da inicialização do servidor."""
import ast
import unittest
from pathlib import Path

class ResearchRoutesTest(unittest.TestCase):
    def test_rotas_com_e_sem_barra(self):
        path = Path(__file__).resolve().parents[1] / 'app' / 'ia' / 'controller.py'
        tree = ast.parse(path.read_text(encoding='utf-8'))
        routes = set()
        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.args and isinstance(dec.args[0], ast.Constant):
                    routes.add((dec.func.attr.upper(), dec.args[0].value))
        for method, name in [('GET', '/referencias/{projeto_id}'), ('POST', '/referencias/{projeto_id}'), ('DELETE', '/referencias/{projeto_id}/{referencia_id}')]:
            self.assertIn((method, name), routes)
            self.assertIn((method, name + '/'), routes)

if __name__ == '__main__':
    unittest.main()
