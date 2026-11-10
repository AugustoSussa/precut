"""
Endpoints de IA:
  POST /ia/processar/{projeto_id}  → transcreve + analisa com OpenAI
  POST /ia/chat/{projeto_id}       → chat com contexto do vídeo
"""
import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..projetos import repository as proj_repo
from ..projetos.erros import ProjetoNaoEncontrado, SemPermissao, VideoNaoProcessado
from ..seguranca import get_current_user
from ..usuarios.models import Usuario

_historicos: dict[int, list[dict]] = {}

router = APIRouter(prefix="/ia", tags=["IA"], dependencies=[Depends(get_current_user)], redirect_slashes=False)


class ChatRequest(BaseModel):
    mensagem: str


@router.post("/processar/{projeto_id}/")
@router.post("/processar/{projeto_id}", include_in_schema=False)
async def processar(
    projeto_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projeto = proj_repo.buscar(db, projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()
    if not projeto.video_url:
        raise HTTPException(400, "Faça o upload do vídeo antes de processar")

    from pathlib import Path
    video_path = Path("uploads") / Path(projeto.video_url).name

    proj_repo.atualizar(db, projeto, {"status": "processando"})

    try:
        loop = asyncio.get_event_loop()

        # 1. Transcrição (Whisper)
        from .whisper_service import transcrever
        transcricao = await loop.run_in_executor(None, transcrever, str(video_path))

        # 2. Análise (OpenAI)
        from .openai_service import analisar, chat as ollama_chat
        analise = await loop.run_in_executor(None, analisar, transcricao)

        sugestao_shorts = analise.get("sugestao_shorts", [])
        if isinstance(sugestao_shorts, list):
            sugestao_shorts = json.dumps(sugestao_shorts, ensure_ascii=False)

        proj_repo.atualizar(db, projeto, {
            "transcricao": transcricao,
            "headline": analise.get("headline", ""),
            "big_idea": analise.get("big_idea", ""),
            "hook": analise.get("hook", ""),
            "descricao_yt": analise.get("descricao_yt", ""),
            "sugestao_shorts": sugestao_shorts,
            "status": "pronto",
        })

        _historicos[projeto_id] = [
            {
                "role": "system",
                "content": (
                    "Você é um especialista em criação de conteúdo digital. "
                    "Você analisou o vídeo a seguir e deve responder perguntas sobre ele.\n\n"
                    f"TRANSCRIÇÃO:\n\"\"\"\n{transcricao}\n\"\"\""
                ),
            }
        ]

        db.refresh(projeto)
        return {
            "status": "pronto",
            "transcricao": transcricao,
            "headline": projeto.headline,
            "big_idea": projeto.big_idea,
            "hook": projeto.hook,
            "descricao_yt": projeto.descricao_yt,
            "sugestao_shorts": analise.get("sugestao_shorts", []),
        }

    except Exception as e:
        proj_repo.atualizar(db, projeto, {"status": "erro"})
        raise HTTPException(500, f"Erro ao processar: {str(e)}")


@router.post("/chat/{projeto_id}/")
@router.post("/chat/{projeto_id}", include_in_schema=False)
async def chat(
    projeto_id: int,
    req: ChatRequest,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projeto = proj_repo.buscar(db, projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()
    if projeto.status != "pronto":
        raise VideoNaoProcessado()

    if projeto_id not in _historicos:
        _historicos[projeto_id] = [
            {
                "role": "system",
                "content": (
                    "Você é um especialista em criação de conteúdo digital. "
                    f"TRANSCRIÇÃO DO VÍDEO:\n\"\"\"\n{projeto.transcricao}\n\"\"\""
                ),
            }
        ]

    from .openai_service import chat as ollama_chat
    loop = asyncio.get_event_loop()
    resposta = await loop.run_in_executor(
        None, ollama_chat, _historicos[projeto_id], req.mensagem
    )

    return {"resposta": resposta}