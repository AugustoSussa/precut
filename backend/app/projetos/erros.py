from fastapi import HTTPException


class ProjetoNaoEncontrado(HTTPException):
    def __init__(self):
        super().__init__(status_code=404, detail="Projeto não encontrado")


class SemPermissao(HTTPException):
    def __init__(self):
        super().__init__(status_code=403, detail="Sem permissão para este projeto")


class VideoNaoProcessado(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Processe o vídeo antes de usar o chat")
