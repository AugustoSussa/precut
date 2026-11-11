"""Transcricao de midia por API, preservando timestamps reais para SRT e cortes.

A V6 local continua usando Whisper offline. A V6.1 online utiliza a
API de transcricao para evitar carregar PyTorch/Whisper na RAM do Render.
"""
import os
import subprocess
import tempfile
from pathlib import Path

from openai import OpenAI

# whisper-1 tem suporte a segment timestamps (verbose_json) ate 26/02/2027.
# Os modelos mais novos exigem uma estrategia diferente para alinhamento.
MODELO_PADRAO = "whisper-1"
CHUNK_SEGUNDOS = 8 * 60


def _duracao_segundos(caminho: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(caminho)],
        capture_output=True, text=True, check=True, timeout=40,
    )
    duracao = float(proc.stdout.strip())
    if not 0 < duracao < 24 * 3600:
        raise ValueError("Duracao de audio invalida ou superior a 24 horas")
    return duracao


def _extrair_trecho(caminho: Path, saida: Path, inicio: float, duracao: float) -> None:
    # Mesmo MP3 de entrada e reamostrado: reduz tamanho e limita upload a API.
    # O FFmpeg usa pouco RAM e nao carrega o video inteiro na memoria.
    proc = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
         "-ss", str(inicio), "-i", str(caminho),
         "-t", str(duracao), "-vn", "-map", "0:a:0",
         "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame",
         "-b:a", "48k", "-y", str(saida)],
        capture_output=True, text=True, timeout=180,
    )
    if proc.returncode != 0 or not saida.is_file() or saida.stat().st_size == 0:
        raise ValueError("Nao foi possivel extrair audio: " + proc.stderr[-300:])


def _normalizar_segmentos(resposta, deslocamento: float) -> list[dict]:
    saida = []
    for s in resposta.segments or []:
        texto = str(s.text or "").strip()
        inicio = max(0.0, deslocamento + float(s.start))
        fim = max(inicio, deslocamento + float(s.end))
        if texto and fim > inicio:
            saida.append({
                "inicio": round(inicio, 2),
                "fim": round(fim, 2),
                "texto": texto,
            })
    return saida


def transcrever_segmentos(video_path: str) -> dict:
    caminho = Path(video_path)
    if not caminho.is_file():
        raise FileNotFoundError("Arquivo de midia nao encontrado no servidor")
    chave = os.getenv("OPENAI_API_KEY", "").strip()
    if not chave:
        raise RuntimeError("OPENAI_API_KEY nao configurada")
    modelo = os.getenv("OPENAI_TRANSCRIPTION_MODEL", MODELO_PADRAO)
    if modelo != "whisper-1":
        raise ValueError("Este fluxo exige whisper-1 para obter timestamps por segmento")

    duracao = _duracao_segundos(caminho)
    cliente = OpenAI(api_key=chave, timeout=180.0, max_retries=1)
    segmentos = []
    with tempfile.TemporaryDirectory(prefix="precut_audio_") as pasta:
        inicio = 0.0
        indice = 0
        while inicio < duracao:
            extensao = Path(pasta) / ("trecho_%03d.mp3" % indice)
            tamanho = min(CHUNK_SEGUNDOS, duracao - inicio)
            _extrair_trecho(caminho, extensao, inicio, tamanho)
            if extensao.stat().st_size > 24 * 1024 * 1024:
                raise ValueError("Trecho de audio excedeu limite da API (24 MB)")
            with extensao.open("rb") as arquivo:
                resposta = cliente.audio.transcriptions.create(
                    model=modelo,
                    file=arquivo,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                )
            segmentos.extend(_normalizar_segmentos(resposta, inicio))
            extensao.unlink(missing_ok=True)
            inicio += tamanho
            indice += 1

    if not segmentos:
        raise ValueError("A API nao identificou fala no arquivo")
    return {
        "texto": " ".join(item["texto"] for item in segmentos),
        "segmentos": segmentos,
    }


def transcrever(video_path: str) -> str:
    return transcrever_segmentos(video_path)["texto"]
