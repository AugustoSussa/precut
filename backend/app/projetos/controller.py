from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..seguranca import get_current_user
from ..usuarios.models import Usuario
from . import service
from .schemas import ProjetoCriar, ProjetoListagem, ProjetoPublico

router = APIRouter(
    prefix="/projetos",
    tags=["Projetos"],
    dependencies=[Depends(get_current_user)],
    redirect_slashes=False,
)


@router.get("/", response_model=list[ProjetoListagem])
@router.get("", response_model=list[ProjetoListagem], include_in_schema=False)
def listar(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.listar(db, usuario)


@router.post("/", response_model=ProjetoPublico, status_code=201)
@router.post("", response_model=ProjetoPublico, status_code=201, include_in_schema=False)
def criar(
    dados: ProjetoCriar,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.criar(db, usuario, dados.model_dump())


@router.get("/{projeto_id}/", response_model=ProjetoPublico)
@router.get("/{projeto_id}", response_model=ProjetoPublico, include_in_schema=False)
def buscar(
    projeto_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.buscar_com_permissao(db, usuario, projeto_id)


@router.delete("/{projeto_id}/", status_code=204)
@router.delete("/{projeto_id}", status_code=204, include_in_schema=False)
def apagar(
    projeto_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.apagar(db, usuario, projeto_id)
