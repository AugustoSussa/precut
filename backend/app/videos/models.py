from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base


class Corte(Base):
    """Um trecho do vídeo que o usuário marcou para exportar."""
    __tablename__ = "cortes"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    inicio = Column(Float, nullable=False)   # segundos
    fim = Column(Float, nullable=False)      # segundos
    rotulo = Column(String(200), nullable=True)
    video_exportado_url = Column(String(500), nullable=True)

    projeto = relationship("Projeto", back_populates="cortes")
