from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base


class Mensagem(Base):
    """Histórico de chat de um projeto — persiste no banco."""
    __tablename__ = "mensagens"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    papel = Column(String(20), nullable=False)   # "user" | "assistant"
    conteudo = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projeto = relationship("Projeto", back_populates="mensagens")


class Referencia(Base):
    """Acervo de referências salvo por projeto, sem scraping de plataformas."""
    __tablename__ = "referencias"
    id = Column(Integer, primary_key=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String(300), nullable=False)
    url = Column(Text, nullable=False)
    plataforma = Column(String(40), nullable=False, default="Web")
    motivo = Column(Text, nullable=False, default="")
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
