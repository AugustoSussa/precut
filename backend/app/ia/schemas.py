from datetime import datetime
from pydantic import BaseModel


class MensagemPublica(BaseModel):
    id: int
    papel: str
    conteudo: str
    criado_em: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    mensagem: str


class ProcessarResposta(BaseModel):
    transcricao: str
    analise: str
