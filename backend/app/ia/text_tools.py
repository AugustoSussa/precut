"""Importação/exportação segura de transcrição SubRip e relatório de análise."""
import json
import re
from datetime import timedelta

def _timestamp(seconds: float) -> str:
    ms = round(seconds * 1000)
    h, remainder = divmod(ms, 3600000)
    m, remainder = divmod(remainder, 60000)
    s, milli = divmod(remainder, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{milli:03d}"

def criar_srt(segmentos: list[dict]) -> str:
    return "\n\n".join(f"{i}\n{_timestamp(float(s['inicio']))} --> {_timestamp(float(s['fim']))}\n{s['texto'].strip()}" for i,s in enumerate(segmentos, 1) if s.get('texto','').strip()) + "\n"

_TIME = re.compile(r"^(\d{1,3}):(\d{2}):(\d{2})[,\.](\d{3})\s+-->\s+(\d{1,3}):(\d{2}):(\d{2})[,\.](\d{3})(?:\s+.*)?$")
def ler_srt(conteudo: str) -> list[dict]:
    conteudo = conteudo.lstrip('\ufeff').replace('\r\n','\n').replace('\r','\n').strip()
    if not conteudo or len(conteudo)>2_000_000:
        raise ValueError('SRT vazio ou maior que 2 MB')
    segmentos=[]
    for bloco in re.split(r"\n\s*\n", conteudo):
        linhas=[x.strip() for x in bloco.split('\n')]
        if linhas and linhas[0].isdigit():
            linhas=linhas[1:]
        if len(linhas)<2:
            raise ValueError('Bloco SRT incompleto')
        m=_TIME.fullmatch(linhas[0]);
        if not m:
            raise ValueError('Timestamp SRT inválido')
        vals=[int(x) for x in m.groups()]
        if vals[1]>=60 or vals[2]>=60 or vals[5]>=60 or vals[6]>=60:
            raise ValueError('Timestamp SRT fora do intervalo')
        a=round(vals[0]*3600+vals[1]*60+vals[2]+vals[3]/1000, 3)
        b=round(vals[4]*3600+vals[5]*60+vals[6]+vals[7]/1000, 3)
        texto=' '.join(x for x in linhas[1:] if x)
        if not texto or not 0<=a<b or b>24*3600:
            raise ValueError('Intervalo ou texto inválido no SRT')
        segmentos.append({'inicio':a,'fim':b,'texto':texto})
        if len(segmentos)>10000:
            raise ValueError('SRT com mais de 10.000 segmentos')
    if not segmentos:
        raise ValueError('SRT sem segmentos')
    if any(segmentos[i]['inicio']<segmentos[i-1]['inicio'] for i in range(1,len(segmentos))):
        raise ValueError('SRT fora da ordem cronológica')
    return segmentos

def criar_relatorio(projeto) -> str:
    campos=(('Título do projeto',projeto.titulo),('Headline',projeto.headline),('Hook',projeto.hook),('Big Idea',projeto.big_idea),('Descrição',projeto.descricao_yt),('Transcrição',projeto.transcricao))
    partes=['PRÉCUT — RELATÓRIO DO PROJETO']
    for nome,valor in campos:
        partes.extend(['',f'=== {nome.upper()} ===',str(valor or 'Não disponível')])
    partes.extend(['','=== SUGESTÕES DE CORTES ==='])
    try: cortes=json.loads(projeto.sugestao_shorts or '[]')
    except (ValueError,TypeError): cortes=[]
    for i,c in enumerate(cortes if isinstance(cortes,list) else [],1):
        if not isinstance(c,dict):continue
        partes.extend(['',f"{i}. {c.get('titulo','Sem título')} ({c.get('inicio','?')}s – {c.get('fim','?')}s)"])
        for k in ('headline','hook','big_idea','descricao'):
            partes.append(f'{k}: {c.get(k, "Não disponível")}')
    return '\n'.join(partes)+'\n'
