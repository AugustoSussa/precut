from sqlalchemy.orm import Session
from .models import Projeto


def listar(db: Session, dono_id: int) -> list[Projeto]:
    return (
        db.query(Projeto)
        .filter(Projeto.dono_id == dono_id)
        .order_by(Projeto.created_at.desc())
        .all()
    )


def buscar(db: Session, projeto_id: int) -> Projeto | None:
    return db.query(Projeto).filter(Projeto.id == projeto_id).first()


def criar(db: Session, dono_id: int, dados: dict) -> Projeto:
    projeto = Projeto(**dados, dono_id=dono_id)
    db.add(projeto)
    db.commit()
    db.refresh(projeto)
    return projeto


def atualizar(db: Session, projeto: Projeto, dados: dict) -> Projeto:
    for campo, valor in dados.items():
        setattr(projeto, campo, valor)
    db.commit()
    db.refresh(projeto)
    return projeto


def apagar(db: Session, projeto: Projeto):
    db.delete(projeto)
    db.commit()
