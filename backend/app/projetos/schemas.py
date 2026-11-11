from datetime import datetime
from pydantic import BaseModel


class ProjetoCriar(BaseModel):
    titulo: str
    descricao: str | None = None


class ProjetoPublico(BaseModel):
    id: int
    titulo: str
    descricao: str | None
    video_url: str | None
    duracao: float | None
    status: str
    transcricao: str | None
    segmentos_json: str | None = None
    headline: str | None
    big_idea: str | None
    hook: str | None
    descricao_yt: str | None
    sugestao_shorts: str | None
    temas_json: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjetoListagem(BaseModel):
    id: int
    titulo: str
    status: str
    duracao: float | None
    video_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
