"""
Integração com Ollama (Llama 3).
- analisar(transcricao) → dict com headline, big_idea, hook, descricao_yt, sugestao_shorts
- chat(historico, mensagem) → str
"""
import json
import ollama

MODELO = "llama3"

PROMPT_ANALISE = """Você é um especialista em marketing de conteúdo digital e criação de vídeos para redes sociais.

Analise a transcrição abaixo e retorne um JSON com exatamente estas chaves:
- "headline": título forte e chamativo (máx. 100 caracteres)
- "big_idea": a ideia central do vídeo em 1-2 frases
- "hook": frase de gancho para os primeiros 3 segundos (máx. 80 caracteres)
- "descricao_yt": descrição completa estilo YouTube com emojis e hashtags
- "sugestao_shorts": lista com 3 sugestões de cortes para Shorts/Reels, cada um com "titulo", "inicio" e "fim" (em segundos, se possível)

Responda APENAS com o JSON, sem texto adicional.

TRANSCRIÇÃO:
\"\"\"
{transcricao}
\"\"\"
"""


def analisar(transcricao: str) -> dict:
    resposta = ollama.chat(
        model=MODELO,
        messages=[{"role": "user", "content": PROMPT_ANALISE.format(transcricao=transcricao)}],
    )
    texto = resposta["message"]["content"]

    # Tenta extrair JSON da resposta
    try:
        inicio = texto.find("{")
        fim = texto.rfind("}") + 1
        return json.loads(texto[inicio:fim])
    except Exception:
        # Fallback: retorna texto bruto como headline
        return {
            "headline": texto[:100],
            "big_idea": texto,
            "hook": "",
            "descricao_yt": "",
            "sugestao_shorts": [],
        }


def chat(historico: list[dict], mensagem: str) -> str:
    historico.append({"role": "user", "content": mensagem})
    resposta = ollama.chat(model=MODELO, messages=historico)
    conteudo = resposta["message"]["content"]
    historico.append({"role": "assistant", "content": conteudo})
    return conteudo
