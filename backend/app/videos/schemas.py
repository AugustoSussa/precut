from pydantic import BaseModel


class CortePublico(BaseModel):
    id: int
    projeto_id: int
    inicio: float
    fim: float
    rotulo: str | None
    video_exportado_url: str | None

    model_config = {"from_attributes": True}


class CorteCriar(BaseModel):
    inicio: float
    fim: float
    rotulo: str | None = None


class UploadResposta(BaseModel):
    projeto_id: int
    video_url: str
    duracao_segundos: float
