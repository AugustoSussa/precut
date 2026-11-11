import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

URL = os.environ.get("DATABASE_URL", "sqlite:///./precut.db")
# Render entrega postgresql://; SQLAlchemy utiliza o driver psycopg v3.
if URL.startswith("postgres://"):
    URL = "postgresql+psycopg://" + URL[len("postgres://"):]
elif URL.startswith("postgresql://"):
    URL = "postgresql+psycopg://" + URL[len("postgresql://"):]
ARGS = {"check_same_thread": False} if URL.startswith("sqlite") else {}

engine = create_engine(URL, connect_args=ARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
