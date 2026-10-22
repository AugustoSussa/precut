import asyncio
import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..projetos import repository as proj_repo
from ..projetos.erros import ProjetoNaoEncontrado, SemPermissao
from ..seguranca import get_current_user
from ..usuarios.models import Usuario

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

FORMATOS_ACEITOS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

router = APIRouter(
    prefix="/videos",
    tags=["Vídeos"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)


class TrimRequest(BaseModel):
    projeto_id: int
    start: float
    end: float


def _get_duracao(video_path: Path) -> float | None:
    """Tenta obter duração via ffprobe primeiro, depois moviepy."""
    # Tentativa 1: ffprobe (mais rápido e confiável)
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True, text=True, timeout=30,
        )
        val = result.stdout.strip()
        if val and val != "N/A":
            return float(val)
    except Exception:
        pass

    # Tentativa 2: moviepy
    try:
        from moviepy import VideoFileClip
        clip = VideoFileClip(str(video_path))
        dur = clip.duration
        clip.close()
        return dur
    except Exception:
        pass

    return None


@router.post("/upload/{projeto_id}/")
@router.post("/upload/{projeto_id}", include_in_schema=False)
async def upload_video(
    projeto_id: int,
    file: UploadFile = File(...),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projeto = proj_repo.buscar(db, projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()

    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in FORMATOS_ACEITOS:
        raise HTTPException(400, f"Formato não suportado. Use: {', '.join(FORMATOS_ACEITOS)}")

    video_path = UPLOAD_DIR / f"projeto_{projeto_id}{ext}"

    try:
        conteudo = await file.read()
        with open(video_path, "wb") as f:
            f.write(conteudo)
    except Exception as e:
        raise HTTPException(500, f"Erro ao salvar arquivo: {str(e)}")

    loop = asyncio.get_event_loop()
    duracao = await loop.run_in_executor(None, _get_duracao, video_path)

    try:
        proj_repo.atualizar(db, projeto, {
            "video_filename": file.filename,
            "video_url": f"/uploads/projeto_{projeto_id}{ext}",
            "duracao": duracao,
            "status": "pendente",
        })
    except Exception as e:
        raise HTTPException(500, f"Erro ao salvar no banco: {str(e)}")

    return {
        "video_url": f"/uploads/projeto_{projeto_id}{ext}",
        "duracao": duracao,
    }


@router.post("/trim/")
@router.post("/trim", include_in_schema=False)
async def trim_video(
    req: TrimRequest,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projeto = proj_repo.buscar(db, req.projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()
    if not projeto.video_url:
        raise HTTPException(400, "Nenhum vídeo enviado para este projeto")

    video_path = UPLOAD_DIR / Path(projeto.video_url).name
    output_path = UPLOAD_DIR / f"projeto_{req.projeto_id}_corte_{int(req.start)}_{int(req.end)}.mp4"

    def do_trim():
        # Tenta ffmpeg primeiro (mais rápido)
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-ss", str(req.start),
                    "-to", str(req.end),
                    "-c:v", "libx264", "-c:a", "aac",
                    str(output_path),
                ],
                capture_output=True, timeout=300,
            )
            if result.returncode == 0:
                return
        except FileNotFoundError:
            pass  # ffmpeg não instalado, tenta moviepy

        # Fallback: moviepy
        from moviepy import VideoFileClip
        clip = VideoFileClip(str(video_path))
        if req.end > clip.duration:
            raise ValueError(f"Tempo final ({req.end}s) excede duração ({clip.duration:.1f}s)")
        subclip = clip.subclipped(req.start, req.end)
        subclip.write_videofile(str(output_path), codec="libx264", audio_codec="aac", logger=None)
        clip.close()

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, do_trim)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro ao cortar vídeo: {str(e)}")

    return {"trimmed_url": f"/uploads/{output_path.name}"}
