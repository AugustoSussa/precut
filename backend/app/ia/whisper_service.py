"""Transcrição Whisper com intervalos verificáveis para edição."""
import os
from pathlib import Path

_MODEL = None

def transcrever_segmentos(video_path: str) -> dict:
    global _MODEL
    import whisper
    from moviepy import VideoFileClip
    if _MODEL is None:
        _MODEL = whisper.load_model(os.getenv("WHISPER_MODEL", "tiny"))
    caminho = Path(video_path)
    audio_path = caminho.with_name(caminho.stem + "_temp_audio.mp3")
    if caminho.suffix.lower() == '.mp3':
        resultado = _MODEL.transcribe(str(caminho), fp16=False)
    else:
        clip = VideoFileClip(str(caminho))
        try:
            if clip.audio is None:
                raise ValueError("O vídeo não contém uma faixa de áudio")
            clip.audio.write_audiofile(str(audio_path), logger=None)
        finally:
            clip.close()
        try:
            resultado = _MODEL.transcribe(str(audio_path), fp16=False)
        finally:
            audio_path.unlink(missing_ok=True)
    segmentos = [
        {"inicio": round(float(s["start"]), 2), "fim": round(float(s["end"]), 2), "texto": s["text"].strip()}
        for s in resultado["segments"] if s["text"].strip()
    ]
    return {"texto": " ".join(s["texto"] for s in segmentos), "segmentos": segmentos}


def transcrever(video_path: str) -> str:
    return transcrever_segmentos(video_path)["texto"]
