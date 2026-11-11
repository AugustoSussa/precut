from pydantic import BaseModel, EmailStr


class UsuarioCriar(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    aceite_privacidade: bool = False


class UsuarioPublico(BaseModel):
    id: int
    nome: str
    email: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
