import asyncio
import os
import secrets
import logging
import math
from datetime import datetime, timedelta, timezone
import jwt
from fastapi.responses import FileResponse
from ..seguranca import SECRET_KEY
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

logger = logging.getLogger(__name__)
UPLOAD_DIR = Path(os.getenv("PRECUT_UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)

FORMATOS_ACEITOS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3"}
media_router = APIRouter(prefix="/videos", tags=["Mídia"])

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

    video_path = UPLOAD_DIR / f"projeto_{projeto_id}_{secrets.token_hex(8)}{ext}"

    try:
        tamanho = 0
        limite = int(os.getenv("MAX_UPLOAD_MB", "500")) * 1024 * 1024
        with open(video_path, "wb") as f:
            while bloco := await file.read(1024 * 1024):
                tamanho += len(bloco)
                if tamanho > limite:
                    raise HTTPException(413, "Vídeo excede o limite de upload")
                f.write(bloco)
    except Exception as e:
        video_path.unlink(missing_ok=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(500, "Erro ao salvar arquivo")

    loop = asyncio.get_event_loop()
    duracao = await loop.run_in_executor(None, _get_duracao, video_path)

    try:
        proj_repo.atualizar(db, projeto, {
            "video_filename": file.filename,
            "video_url": f"/uploads/{video_path.name}",
            "duracao": duracao,
            "status": "pendente",
            "segmentos_json": None,
            "transcricao": None,
        })
    except Exception as e:
        raise HTTPException(500, f"Erro ao salvar no banco: {str(e)}")

    return {
        "video_url": f"/uploads/{video_path.name}",
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

    if Path(projeto.video_url).suffix.lower() == ".mp3":
        raise HTTPException(400, "Cortes MP4 exigem um projeto com vídeo; o MP3 é somente para transcrição.")
    if not all(math.isfinite(v) for v in (req.start, req.end)):
        raise HTTPException(400, "Intervalo do corte invalido")
    if not (0 <= req.start < req.end) or (projeto.duracao and req.end > projeto.duracao + 0.1):
        raise HTTPException(400, "Intervalo do corte invalido")

    video_path = UPLOAD_DIR / Path(projeto.video_url).name
    if not video_path.is_file():
        raise HTTPException(
            409,
            "Arquivo de video nao esta mais no servidor. Reenvie o MP4 para exportar.",
        )
    output_path = UPLOAD_DIR / f"projeto_{req.projeto_id}_corte_{secrets.token_hex(8)}.mp4"

    def do_trim():
        # FFmpeg com uma thread, seek antes do input, transcodificacao ultrafast.
        # Evita MoviePy, multiplos processos e buffers excessivos no Render Free.
        duracao = req.end - req.start
        cmd = [
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
            "-y", "-threads", "1", "-filter_threads", "1",
            "-ss", f"{req.start:.3f}",
            "-i", str(video_path),
            "-t", f"{duracao:.3f}",
            "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "24",
            "-threads:v", "1",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(output_path),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Exportacao excedeu 180 segundos") from exc
        if result.returncode != 0:
            logger.error("FFmpeg trim failed, code=%s stderr=%s", result.returncode, result.stderr[-2000:])
            raise RuntimeError("FFmpeg falhou ao exportar o corte; consulte os logs do backend")
        if not output_path.is_file() or output_path.stat().st_size == 0:
            raise RuntimeError("FFmpeg nao gerou um arquivo MP4 valido")

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, do_trim)
    except Exception as exc:
        output_path.unlink(missing_ok=True)
        logger.exception("Falha ao exportar corte do projeto %s", req.projeto_id)
        if isinstance(exc, subprocess.TimeoutExpired):
            raise HTTPException(504, "Exportacao excedeu o tempo limite") from exc
        raise HTTPException(500, str(exc)) from exc

    return {"trimmed_url": f"/uploads/{output_path.name}"}


@router.get("/media-token/{projeto_id}")
def criar_media_token(projeto_id: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    projeto = proj_repo.buscar(db, projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()
    # Só autoriza a visualização dos arquivos pertencentes a este projeto.
    exp = datetime.now(timezone.utc) + timedelta(hours=2)
    token = jwt.encode({"sub": str(usuario.id), "project": projeto_id, "scope": "media", "exp": exp}, SECRET_KEY, algorithm="HS256")
    return {"token": token}


@media_router.get("/media/{projeto_id}/{nome}")
def visualizar_media(projeto_id: int, nome: str, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("scope") != "media" or payload.get("project") != projeto_id:
            raise ValueError("Escopo inválido")
        projeto = proj_repo.buscar(db, projeto_id)
        if not projeto or projeto.dono_id != int(payload["sub"]):
            raise ValueError("Permissão negada")
    except (jwt.PyJWTError, ValueError, KeyError, TypeError):
        raise HTTPException(403, "Acesso ao vídeo negado")
    # Não aceita caminhos arbitrários. Apenas o vídeo ou cortes identificados deste projeto.
    if Path(nome).name != nome or not (nome == Path(projeto.video_url or "").name or
       (nome.startswith(f"projeto_{projeto_id}_corte_") and nome.endswith(".mp4"))):
        raise HTTPException(404, "Arquivo não encontrado")
    caminho = UPLOAD_DIR / nome
    if not caminho.is_file():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(caminho, media_type="video/mp4" if nome.endswith(".mp4") else None,
                        headers={"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"})
