"""
Integração com OpenAI (substitui o Gemini).
- analisar(transcricao) → dict com headline, big_idea, hook, descricao_yt, sugestao_shorts
- chat(historico, mensagem) → str
"""
import json
import os
import urllib.request
import urllib.error

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

PROMPT_ANALISE = """Você é um especialista em marketing de conteúdo digital e criação de vídeos para redes sociais.

Analise a transcrição abaixo e retorne um JSON com exatamente estas chaves:
- "headline": título forte e chamativo (máx. 100 caracteres)
- "big_idea": a ideia central do vídeo em 1-2 frases
- "hook": frase de gancho para os primeiros 3 segundos (máx. 80 caracteres)
- "descricao_yt": descrição completa estilo YouTube com emojis e hashtags
- "sugestao_shorts": lista com 3 sugestões de cortes para Shorts/Reels, cada um com "titulo", "inicio" e "fim" (em segundos)

Responda APENAS com o JSON, sem texto adicional, sem markdown, sem ```json.

TRANSCRIÇÃO:
\"\"\"
{transcricao}
\"\"\"
"""


def _chamar_openai(mensagens: list[dict]) -> str:
    payload = json.dumps({
        "model": OPENAI_MODEL,
        "messages": mensagens,
        "temperature": 0.7,
        "max_tokens": 4096,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENAI_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        erro = e.read().decode("utf-8")
        raise RuntimeError(f"OpenAI API erro {e.code}: {erro}")


def analisar(transcricao: str) -> dict:
    mensagens = [{"role": "user", "content": PROMPT_ANALISE.format(transcricao=transcricao)}]
    texto = _chamar_openai(mensagens)

    try:
        texto_limpo = texto.strip()
        if texto_limpo.startswith("```"):
            texto_limpo = texto_limpo.split("\n", 1)[1]
            texto_limpo = texto_limpo.rsplit("```", 1)[0]
        inicio = texto_limpo.find("{")
        fim = texto_limpo.rfind("}") + 1
        return json.loads(texto_limpo[inicio:fim])
    except Exception:
        return {
            "headline": texto[:100],
            "big_idea": texto,
            "hook": "",
            "descricao_yt": "",
            "sugestao_shorts": [],
        }


def chat(historico: list[dict], mensagem: str) -> str:
    historico.append({"role": "user", "content": mensagem})
    resposta = _chamar_openai(historico)
    historico.append({"role": "assistant", "content": resposta})
    return resposta