from sqlalchemy.orm import Session
from .models import Usuario


def buscar(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def buscar_por_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()


def criar(db: Session, dados: dict) -> Usuario:
    usuario = Usuario(**dados)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario
