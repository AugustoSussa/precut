from fastapi import HTTPException


class ErroDeUsuario(HTTPException):
    pass


class CredenciaisInvalidas(ErroDeUsuario):
    def __init__(self, detalhe: str = "Credenciais inválidas"):
        super().__init__(status_code=401, detail=detalhe)


class EmailJaCadastrado(ErroDeUsuario):
    def __init__(self):
        super().__init__(status_code=409, detail="E-mail já cadastrado")
