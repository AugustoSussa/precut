from fastapi import APIRouter, HTTPException
from .schemas import ProdutoCriar, ProdutoAtualizar, ProdutoPublico

router = APIRouter(prefix="/produtos", tags=["Produtos"])

produtos = []


@router.post("/", response_model=ProdutoPublico, status_code=201)
def criar(dados: ProdutoCriar):
    novo = {
        "id": len(produtos) + 1,
        **dados.model_dump()
    }

    produtos.append(novo)
    return novo


@router.get("/{produto_id}", response_model=ProdutoPublico)
def buscar(produto_id: int):
    for p in produtos:
        if p["id"] == produto_id:
            return p

    raise HTTPException(
        status_code=404,
        detail="Produto nao encontrado"
    )


@router.patch("/{produto_id}", response_model=ProdutoPublico)
def atualizar(produto_id: int, dados: ProdutoAtualizar):
    for p in produtos:
        if p["id"] == produto_id:
            p.update(dados.model_dump(exclude_unset=True))
            return p

    raise HTTPException(
        status_code=404,
        detail="Produto nao encontrado"
    )


@router.delete("/{produto_id}", status_code=204)
def apagar(produto_id: int):
    for p in produtos:
        if p["id"] == produto_id:
            produtos.remove(p)
            return

    raise HTTPException(
        status_code=404,
        detail="Produto nao encontrado"
    )
    
@router.get("/", response_model=list[ProdutoPublico])
def listar():
    return produtos