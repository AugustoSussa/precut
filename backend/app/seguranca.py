import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .usuarios import repository as usuarios_repository
from .usuarios.erros import CredenciaisInvalidas

load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY")
if (not SECRET_KEY or len(SECRET_KEY) < 32
        or SECRET_KEY == "precut-dev-secret-troque-em-producao"
        or SECRET_KEY.startswith("substitua_") or SECRET_KEY.startswith("cole_")):
    raise RuntimeError("Defina uma SECRET_KEY forte no arquivo .env")
ALGORITMO = "HS256"
TOKEN_DURA_MINUTOS = 60 * 24  # 24 horas

esquema_oauth = OAuth2PasswordBearer(tokenUrl="/usuarios/login")


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def conferir_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode(), senha_hash.encode())


def criar_token(usuario_id: int) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_DURA_MINUTOS)
    return jwt.encode(
        {"sub": str(usuario_id), "exp": expira}, SECRET_KEY, algorithm=ALGORITMO
    )


def get_current_user(
    token: str = Depends(esquema_oauth),
    db: Session = Depends(get_db),
):
    try:
        dados = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITMO])
    except jwt.PyJWTError:
        raise CredenciaisInvalidas("Token inválido ou vencido")

    try:
        usuario_id = int(dados["sub"])
    except (KeyError, ValueError, TypeError):
        raise CredenciaisInvalidas("Token inválido")
    usuario = usuarios_repository.buscar(db, usuario_id)
    if usuario is None:
        raise CredenciaisInvalidas("Usuário deste token não existe mais")
    return usuario
