from pydantic import BaseModel, EmailStr


class UsuarioCriar(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class UsuarioPublico(BaseModel):
    id: int
    nome: str
    email: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
