import pytest
from app.ia.text_tools import criar_srt, ler_srt, criar_relatorio
from types import SimpleNamespace

def test_srt_roundtrip():
    rows=[{'inicio':0,'fim':1.235,'texto':'Olá!'},{'inicio':1.5,'fim':70.001,'texto':'Tudo certo.'}]
    assert ler_srt(criar_srt(rows)) == rows

def test_srt_malformed_rejected():
    with pytest.raises(ValueError):
        ler_srt('1\n00:00:04,000 --> 00:00:02,000\ntexto')
    with pytest.raises(ValueError):
        ler_srt('1\n00:00:04,000 --> 00:00:05,000\n')

def test_report_contains_results():
    p=SimpleNamespace(titulo='Projeto',headline='H',hook='K',big_idea='B',descricao_yt='D',transcricao='X',sugestao_shorts='[{"titulo":"Teste","inicio":1,"fim":3}]')
    report=criar_relatorio(p)
    assert 'HEADLINE' in report and 'Teste (1s' in report
