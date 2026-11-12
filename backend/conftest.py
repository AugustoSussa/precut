"""Fixtures de API: isolamento completo do banco de testes e do diretório de mídia."""
import os
import tempfile
from pathlib import Path

# Definir ANTES de importar a aplicação: database.py inicializa o engine no import.
_SANDBOX = tempfile.TemporaryDirectory(prefix="precut-testes-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_SANDBOX.name) / "testes.sqlite3").replace("\\", "/")
os.environ["SECRET_KEY"] = "segredo-exclusivo-para-testes-automatizados-precut-2026"
os.environ["PRECUT_UPLOAD_DIR"] = str(Path(_SANDBOX.name) / "uploads")

import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine
from app.main import app


@pytest.fixture
def cliente():
    """Cada teste recebe a API real, mas um banco SQLite vazio e descartável."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as client:
        yield client
    Base.metadata.drop_all(bind=engine)
