"""
Integração com Google Gemini (substitui o Ollama).
- analisar(transcricao) → dict com headline, big_idea, hook, descricao_yt, sugestao_shorts
- chat(historico, mensagem) → str
"""
import json
import os
import urllib.request
import urllib.error

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

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


def _chamar_gemini(mensagens: list[dict]) -> str:
    """Chama a API do Gemini com o histórico de mensagens."""
    # Converte formato OpenAI/Ollama para formato Gemini
    contents = []
    for msg in mensagens:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })

    payload = json.dumps({
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
        },
    }).encode("utf-8")

    url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        erro = e.read().decode("utf-8")
        raise RuntimeError(f"Gemini API erro {e.code}: {erro}")


def analisar(transcricao: str) -> dict:
    """Analisa a transcrição e retorna dict estruturado."""
    mensagens = [{"role": "user", "content": PROMPT_ANALISE.format(transcricao=transcricao)}]
    texto = _chamar_gemini(mensagens)

    try:
        # Remove possível markdown que o modelo insira mesmo sendo instruído a não
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
    """Continua uma conversa com o histórico."""
    historico.append({"role": "user", "content": mensagem})
    resposta = _chamar_gemini(historico)
    historico.append({"role": "assistant", "content": resposta})
    return resposta
