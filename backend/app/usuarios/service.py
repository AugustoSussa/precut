from sqlalchemy.orm import Session
from ..seguranca import gerar_hash, conferir_senha
from . import repository
from .erros import CredenciaisInvalidas, EmailJaCadastrado


def cadastrar(db: Session, dados: dict):
    if repository.buscar_por_email(db, dados["email"]):
        raise EmailJaCadastrado()
    dados["senha_hash"] = gerar_hash(dados.pop("senha"))
    return repository.criar(db, dados)


def autenticar(db: Session, email: str, senha: str):
    usuario = repository.buscar_por_email(db, email)
    if not usuario or not conferir_senha(senha, usuario.senha_hash):
        raise CredenciaisInvalidas("E-mail ou senha incorretos")
    return usuario
