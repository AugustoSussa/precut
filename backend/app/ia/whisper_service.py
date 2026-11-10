"""
Carrega o modelo Whisper uma única vez ao iniciar o servidor.
Expõe transcrever(video_path) → str
"""
import os
from pathlib import Path

print("Carregando modelo Whisper...")
import whisper
_MODEL = whisper.load_model("tiny")
print("Whisper pronto!")


def transcrever(video_path: str) -> str:
    """Extrai áudio do vídeo e transcreve com Whisper. Retorna o texto completo."""
    from moviepy import VideoFileClip

    video_path = Path(video_path)
    audio_path = video_path.with_suffix(".mp3")

    clip = VideoFileClip(str(video_path))
    clip.audio.write_audiofile(str(audio_path), logger=None)
    clip.close()

    resultado = _MODEL.transcribe(str(audio_path))
    os.remove(audio_path)

    return " ".join(seg["text"].strip() for seg in resultado["segments"])
