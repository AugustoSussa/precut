"""
Pipeline de IA: Whisper (transcrição) → Ollama/Llama (análise + chat).
Operações pesadas rodam em executor para não travar o event loop.
"""
import asyncio
import os

import whisper
from moviepy import VideoFileClip
from sqlalchemy.orm import Session

from ..projetos import repository as proj_repo
from ..projetos.erros import AcessoNegado, ProjetoNaoEncontrado, VideoNaoEnviado
from ..usuarios.models import Usuario
from .models import Mensagem
from . import gemini_service

# Carrega o modelo Whisper uma vez ao importar o módulo
print("Carregando modelo Whisper...")
_WHISPER = whisper.load_model("base")
print("Whisper pronto!")

PROMPT_ANALISE = """Você é um especialista em marketing digital e criação de conteúdo.
Analise a transcrição abaixo e gere os seguintes elementos:

1. **HEADLINE** — título forte e chamativo para o vídeo
2. **BIG IDEA** — a ideia central em 1–2 frases
3. **HOOK** — gancho para os primeiros 3 segundos do vídeo
4. **DESCRIÇÃO** — descrição otimizada para YouTube/Instagram (até 150 palavras)
5. **SUGESTÕES DE SHORTS** — 3 trechos do vídeo que funcionariam bem como Reels ou Shorts (indique o assunto de cada um)

TRANSCRIÇÃO:
\"\"\"
{transcricao}
\"\"\"

Responda em português, de forma clara e direta."""


# ── helpers síncronos ─────────────────────────────────────────────────────

def _transcrever(video_path: str) -> str:
    audio_path = video_path.rsplit(".", 1)[0] + "_audio.mp3"
    clip = VideoFileClip(video_path)
    clip.audio.write_audiofile(audio_path, logger=None)
    clip.close()

    resultado = _WHISPER.transcribe(audio_path)
    os.remove(audio_path)

    return " ".join(seg["text"].strip() for seg in resultado["segments"])


def _chamar_ia(mensagens: list[dict]) -> str:
    return gemini_service._chamar_gemini(mensagens)


# ── serviços assíncronos ──────────────────────────────────────────────────

async def processar(db: Session, usuario: Usuario, projeto_id: int) -> dict:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()
    if not projeto.video_path:
        raise VideoNaoEnviado()

    # Atualiza status
    proj_repo.atualizar(db, projeto, {"status": "processando"})

    loop = asyncio.get_event_loop()

    try:
        # 1. Transcrição com Whisper
        transcricao = await loop.run_in_executor(None, _transcrever, projeto.video_path)

        # 2. Análise com Llama
        prompt = PROMPT_ANALISE.format(transcricao=transcricao)
        mensagens_llm = [{"role": "user", "content": prompt}]
        analise = await loop.run_in_executor(None, _chamar_ia, mensagens_llm)

        # 3. Salva no banco
        proj_repo.atualizar(db, projeto, {
            "transcricao": transcricao,
            "analise_ia": analise,
            "status": "pronto",
        })

        # 4. Salva mensagens iniciais no histórico
        db.add(Mensagem(projeto_id=projeto_id, papel="user", conteudo=prompt))
        db.add(Mensagem(projeto_id=projeto_id, papel="assistant", conteudo=analise))
        db.commit()

    except Exception as e:
        proj_repo.atualizar(db, projeto, {"status": "erro"})
        raise

    return {"transcricao": transcricao, "analise": analise}


async def chat(db: Session, usuario: Usuario, projeto_id: int, mensagem: str) -> str:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()
    if not projeto.transcricao:
        raise VideoNaoEnviado()

    # Reconstrói histórico do banco
    historico_db = (
        db.query(Mensagem)
        .filter(Mensagem.projeto_id == projeto_id)
        .order_by(Mensagem.criado_em)
        .all()
    )
    mensagens_llm = [{"role": m.papel, "content": m.conteudo} for m in historico_db]
    mensagens_llm.append({"role": "user", "content": mensagem})

    loop = asyncio.get_event_loop()
    resposta = await loop.run_in_executor(None, _chamar_ia, mensagens_llm)

    # Persiste no banco
    db.add(Mensagem(projeto_id=projeto_id, papel="user", conteudo=mensagem))
    db.add(Mensagem(projeto_id=projeto_id, papel="assistant", conteudo=resposta))
    db.commit()

    return resposta


def historico(db: Session, usuario: Usuario, projeto_id: int) -> list[Mensagem]:
    projeto = proj_repo.buscar(db, projeto_id)
    if projeto is None:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise AcessoNegado()
    return (
        db.query(Mensagem)
        .filter(Mensagem.projeto_id == projeto_id)
        .order_by(Mensagem.criado_em)
        .all()
    )
