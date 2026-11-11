"""Testes de validação dos intervalos propostos pela IA (sem chamadas externas)."""
import unittest
from app.ia.openai_service import validar_cortes

class ValidacaoCortesTest(unittest.TestCase):
    def setUp(self):
        self.segmentos = [
            {"inicio": 0.0, "fim": 2.2, "texto": "Início"},
            {"inicio": 2.2, "fim": 5.0, "texto": "Meio"},
            {"inicio": 5.0, "fim": 9.0, "texto": "Final"},
        ]

    def test_ancora_limites_reais(self):
        resposta = validar_cortes([{"titulo": "Exemplo", "inicio": 2.1, "fim": 8.8}], self.segmentos)
        self.assertEqual(resposta, [{"titulo": "Exemplo", "inicio": 2.2, "fim": 9.0}])

    def test_rejeita_tempo_fora_do_video(self):
        self.assertEqual(validar_cortes([{"titulo": "Erro", "inicio": 10, "fim": 20}], self.segmentos), [])

    def test_rejeita_intervalos_invertidos(self):
        self.assertEqual(validar_cortes([{"inicio": 6, "fim": 2}], self.segmentos), [])

    def test_rejeita_sem_segmentos(self):
        self.assertEqual(validar_cortes([{"inicio": 0, "fim": 5}], []), [])

if __name__ == '__main__':
    unittest.main()
