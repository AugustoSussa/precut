"""Testes sem rede: aceitação de referências e preservação de metadados."""
import unittest
from app.ia.openai_service import _reel_instagram, extrair_resultados_research, validar_cortes

class ResearchTest(unittest.TestCase):
    def test_aceita_reel_e_elimina_tracking(self):
        self.assertEqual(_reel_instagram('https://www.instagram.com/reel/ABCabc12345/?igsh=abc'), 'https://www.instagram.com/reel/ABCabc12345/')

    def test_rejeita_anuncios_paginas_genericas_e_hosts_falsos(self):
        for url in [
            'https://ads.tiktok.com/business/nexus',
            'https://www.instagram.com/',
            'https://instagram.com.evil.example/reel/ABCabc12345/',
            'https://www.instagram.com/business/',
            'https://www.instagram.com/stories/qualquer/123',
        ]:
            self.assertIsNone(_reel_instagram(url))

    def test_nao_converte_citacao_de_anuncio_em_referencia(self):
        data = {'output': [{'type': 'message', 'content': [{'type': 'output_text',
            'text': 'IDEIA: O que fazer para reter pacientes?',
            'annotations': [
                {'type': 'url_citation', 'url': 'https://ads.tiktok.com/business/foo', 'title': 'Campanha'},
                {'type': 'url_citation', 'url': 'https://www.instagram.com/reel/ABCabc12345/?utm_source=foo', 'title': 'Reel'},
            ]}]}]}
        resp = extrair_resultados_research(data, 'consultório')
        self.assertEqual(len(resp['referencias']), 1)
        self.assertEqual(resp['referencias'][0]['plataforma'], 'Instagram')
        self.assertEqual(resp['referencias'][0]['status_tendencia'], 'nao_verificada')
        self.assertEqual(resp['ideias_futuras'], ['O que fazer para reter pacientes?'])

    def test_corte_preserva_textos_individuais(self):
        segs = [{'inicio':0, 'fim':4, 'texto':'fala'}, {'inicio':4,'fim':9,'texto':'fala 2'}]
        result = validar_cortes([{'titulo':'Corte', 'inicio':0, 'fim':4,
            'headline':'Headline própria', 'hook':'Hook próprio', 'big_idea':'Tese do trecho', 'descricao':'Descrição própria'}], segs)
        self.assertEqual(result[0]['headline'], 'Headline própria')
        self.assertEqual(result[0]['inicio'], 0)

if __name__ == '__main__':
    unittest.main()
