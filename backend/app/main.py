from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .database import Base, engine
from .usuarios import controller as usuarios_controller
from .projetos import controller as projetos_controller
from .videos import controller as videos_controller
from .ia import controller as ia_controller

# Cria as tabelas ao iniciar (em produção, usar Alembic)
Base.metadata.create_all(bind=engine)

# Garante que a pasta de uploads existe
Path("uploads").mkdir(exist_ok=True)

app = FastAPI(
    title="Précut API",
    description="Backend do Précut — edição de vídeo com IA",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(usuarios_controller.router)
app.include_router(projetos_controller.router)
app.include_router(videos_controller.router)
app.include_router(ia_controller.router)


@app.get("/health")
def health():
    return {"status": "ok", "versao": "2.0.0"}


@app.get("/debug/usuarios")
def debug_usuarios(db=None):
    """Endpoint temporário de diagnóstico — lista emails cadastrados"""
    from .database import SessionLocal
    from .usuarios.models import Usuario as U
    s = SessionLocal()
    try:
        users = s.query(U).all()
        return {"total": len(users), "emails": [u.email for u in users]}
    finally:
        s.close()


@app.post("/debug/seed")
def debug_seed():
    """Cria usuário de teste se não existir: teste@precut.com / 123456"""
    from .database import SessionLocal
    from .usuarios.models import Usuario as U
    from .seguranca import gerar_hash
    s = SessionLocal()
    try:
        existe = s.query(U).filter(U.email == "teste@precut.com").first()
        if existe:
            return {"ok": False, "msg": "Usuário já existe"}
        u = U(nome="Teste", email="teste@precut.com", senha_hash=gerar_hash("123456"))
        s.add(u)
        s.commit()
        return {"ok": True, "msg": "Criado: teste@precut.com / 123456"}
    finally:
        s.close()
