from sqlalchemy.orm import Session
from ..usuarios.models import Usuario
from . import repository
from .erros import ProjetoNaoEncontrado, SemPermissao


def listar(db: Session, usuario: Usuario):
    return repository.listar(db, usuario.id)


def criar(db: Session, usuario: Usuario, dados: dict):
    return repository.criar(db, usuario.id, dados)


def buscar_com_permissao(db: Session, usuario: Usuario, projeto_id: int):
    projeto = repository.buscar(db, projeto_id)
    if not projeto:
        raise ProjetoNaoEncontrado()
    if projeto.dono_id != usuario.id:
        raise SemPermissao()
    return projeto


def apagar(db: Session, usuario: Usuario, projeto_id: int):
    projeto = buscar_com_permissao(db, usuario, projeto_id)
    repository.apagar(db, projeto)
