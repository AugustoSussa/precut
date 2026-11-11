"""
Tudo que envolve arquivos de vídeo: salvar, medir duração, cortar.
As operações pesadas (MoviePy) rodam em executor para não travar o event loop.
"""
import asyncio
import os
from pathlib import Path

from fastapi import UploadFile
from moviepy import VideoFileClip
from sqlalchemy.orm import Session

from ..projetos import repository as proj_repo
from ..projetos.erros import AcessoNegado, ProjetoNaoEncontrado, VideoNaoEnviado
from ..usuarios.models import Usuario
from .models import Corte

UPLOAD_DIR = Path(os.getenv("PRECUT_UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)


# ── helpers síncronos que rodam em thread ──────────────────────────────────

def _salvar_video(conteudo: bytes, destino: Path):
    destino.write_bytes(conteudo)


def _duracao(video_path: str) -> float:
    clip = VideoFileClip(video_path)
    d = clip.duration
    clip.close()
    return d


def _cortar(video_path: str, inicio: float, fim: float, saida: str):
    clip = VideoFileClip(video_path)
    if fim > clip.duration:
        raise ValueError(f"Tempo final ({fim}s) excede duração ({clip.duration:.2f}s)")
    sub = clip.subclipped(inicio, fim)
    sub.write_videofile(saida, codec="libx264", audio_codec="aac", logger=None)
    clip.close()


# ── serviços assíncronos ────────────────────────────────────────────────────

async def upload(
    db: Session,
    usuario: Usuario,
    projeto_id: int,
    arquivo: UploadFile,
) -> dict:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()

    ext = Path(arquivo.filename).suffix.lower()
    if ext not in {".mp4", ".mov", ".avi", ".mkv", ".webm"}:
        from fastapi import HTTPException
        raise HTTPException(400, "Formato não suportado. Use MP4, MOV, AVI, MKV ou WEBM.")

    destino = UPLOAD_DIR / f"projeto_{projeto_id}{ext}"
    conteudo = await arquivo.read()

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _salvar_video, conteudo, destino)
    duracao = await loop.run_in_executor(None, _duracao, str(destino))

    video_url = f"/uploads/projeto_{projeto_id}{ext}"
    proj_repo.atualizar(db, projeto, {
        "video_path": str(destino),
        "video_url": video_url,
        "duracao_segundos": duracao,
        "status": "pendente",
    })

    return {"projeto_id": projeto_id, "video_url": video_url, "duracao_segundos": duracao}


async def criar_corte(
    db: Session,
    usuario: Usuario,
    projeto_id: int,
    inicio: float,
    fim: float,
    rotulo: str | None,
) -> Corte:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()
    if not projeto.video_path:
        raise VideoNaoEnviado()

    saida = str(UPLOAD_DIR / f"projeto_{projeto_id}_corte_{int(inicio)}_{int(fim)}.mp4")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _cortar, projeto.video_path, inicio, fim, saida)

    corte = Corte(
        projeto_id=projeto_id,
        inicio=inicio,
        fim=fim,
        rotulo=rotulo,
        video_exportado_url=f"/uploads/{Path(saida).name}",
    )
    db.add(corte)
    db.commit()
    db.refresh(corte)
    return corte


def listar_cortes(db: Session, usuario: Usuario, projeto_id: int) -> list[Corte]:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()
    return db.query(Corte).filter(Corte.projeto_id == projeto_id).all()
