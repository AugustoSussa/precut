from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

from .database import Base, engine
# Registra todos os modelos no mesmo Base antes de configurar os relacionamentos.
# Sem os imports, SQLAlchemy nao resolve "Corte" e "Mensagem" em Projeto.
from .usuarios.models import Usuario  # noqa: F401
from .projetos.models import Projeto  # noqa: F401
from .videos.models import Corte  # noqa: F401
from .ia.models import Mensagem, Referencia  # noqa: F401
from .usuarios import controller as usuarios_controller
from .projetos import controller as projetos_controller
from .videos import controller as videos_controller
from .ia import controller as ia_controller

# Cria as tabelas ao iniciar (em produção, usar Alembic)
Base.metadata.create_all(bind=engine)

# Migração aditiva mínima para bancos legados (SQLite/PostgreSQL).
# Para modificações futuras de schema, adotar migrations versionadas com Alembic.
from sqlalchemy import inspect, text
for tabela, colunas_necessarias in {
    "projetos": {"segmentos_json": "TEXT", "temas_json": "TEXT"},
    "usuarios": {"consentimento_em": "TIMESTAMP"},
}.items():
    if tabela not in inspect(engine).get_table_names():
        continue
    existentes = {c["name"] for c in inspect(engine).get_columns(tabela)}
    with engine.begin() as conn:
        for coluna, tipo in colunas_necessarias.items():
            if coluna not in existentes:
                conn.execute(text(f'ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}'))

# Garante que a pasta de uploads existe
Path(os.getenv("PRECUT_UPLOAD_DIR", "uploads")).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Précut API",
    description="Backend do Précut — edição de vídeo com IA",
    version="2.0.0",
)

origens = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
origens += [item.strip().rstrip("/") for item in os.getenv("FRONTEND_ORIGINS", "").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origens,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(usuarios_controller.router)
app.include_router(projetos_controller.router)
app.include_router(videos_controller.router)
app.include_router(videos_controller.media_router)
app.include_router(ia_controller.router)


@app.get("/health")
def health():
    return {"status": "ok", "versao": "2.0.0"}


