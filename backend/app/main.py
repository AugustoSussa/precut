from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .produtos import controller as produtos_controller
from .produtos.erros import ErroDeProduto, ProdutoNaoEncontrado
from .usuarios import controller as usuarios_controller
from .usuarios.erros import CredenciaisInvalidas, ErroDeUsuario
app = FastAPI(title="API do Meu Projeto", version="0.3.0")
from fastapi.middleware.cors import CORSMiddleware

# O app Flutter roda no navegador, noutro endereco (a porta muda a cada
# `flutter run`). O navegador so' deixa uma pagina falar com outro endereco
# se a API disser que deixa: e' o CORS. Aqui: qualquer porta desta maquina.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(produtos_controller.router)
app.include_router(usuarios_controller.router)


@app.exception_handler(ErroDeProduto)
def traduzir_recusa(request: Request, erro: ErroDeProduto):
    """O unico lugar do sistema que transforma recusa em numero HTTP."""
    codigo = 404 if isinstance(erro, ProdutoNaoEncontrado) else 409
    return JSONResponse(
        status_code=codigo,
        content={"detail": str(erro)}
    )