from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)

    # Arquivo de vídeo
    video_filename = Column(String(300), nullable=True)
    video_url = Column(String(500), nullable=True)
    duracao = Column(Float, nullable=True)          # segundos

    # Status do processamento
    status = Column(String(30), default="pendente")
    # pendente | processando | pronto | erro

    # Resultado da IA
    transcricao = Column(Text, nullable=True)
    segmentos_json = Column(Text, nullable=True)
    headline = Column(Text, nullable=True)
    big_idea = Column(Text, nullable=True)
    hook = Column(Text, nullable=True)
    descricao_yt = Column(Text, nullable=True)
    sugestao_shorts = Column(Text, nullable=True)
    temas_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dono_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    dono = relationship("Usuario", back_populates="projetos")

    cortes = relationship("Corte", back_populates="projeto", cascade="all, delete-orphan")
    mensagens = relationship("Mensagem", back_populates="projeto", cascade="all, delete-orphan")
