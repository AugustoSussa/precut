# Précut

Plataforma web de edição e análise de vídeo com IA — transcrição automática (Whisper), análise de conteúdo (Llama 3 via Ollama) e chat interativo sobre o vídeo.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + Alembic |
| Auth | JWT (PyJWT) + bcrypt |
| IA — Transcrição | OpenAI Whisper (local) |
| IA — Análise/Chat | Ollama + Llama 3 (local) |
| Banco de dados | SQLite (padrão) / PostgreSQL (via env) |
| Processamento | MoviePy |

---

## Pré-requisitos

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) instalado e rodando
- ffmpeg instalado (`choco install ffmpeg` no Windows / `brew install ffmpeg` no Mac)

---

## Configuração — Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Instalar dependências
pip install -r requirements.txt

# Copiar e ajustar variáveis de ambiente
cp .env.example .env
```

### Variáveis de ambiente (`.env`)

```env
DATABASE_URL=sqlite:///./precut.db
SECRET_KEY=troque-por-uma-chave-segura-em-producao
```

### Baixar modelo Llama 3 no Ollama

```bash
ollama pull llama3
```

### Rodar o backend

```bash
uvicorn app.main:app --reload --port 8000
```

A API fica disponível em `http://localhost:8000`.  
Documentação automática: `http://localhost:8000/docs`

---

## Configuração — Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

A aplicação fica em `http://localhost:3000`.

> O Next.js já está configurado para redirecionar `/api/*` → `localhost:8000` automaticamente.

---

## Estrutura do projeto

```
precut/
├── backend/
│   ├── app/
│   │   ├── main.py              # Ponto de entrada FastAPI
│   │   ├── database.py          # SQLAlchemy engine + sessão
│   │   ├── seguranca.py         # JWT + bcrypt + dependência get_current_user
│   │   ├── usuarios/            # Módulo de autenticação
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── repository.py
│   │   │   ├── service.py
│   │   │   └── controller.py
│   │   ├── projetos/            # Módulo de projetos
│   │   │   └── (mesma estrutura)
│   │   ├── videos/              # Upload e corte de vídeos
│   │   │   └── controller.py
│   │   └── ia/                  # Whisper + Ollama
│   │       ├── whisper_service.py
│   │       ├── ollama_service.py
│   │       └── controller.py
│   ├── uploads/                 # Vídeos enviados (criado automaticamente)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Login
    │   ├── cadastro/page.tsx    # Cadastro
    │   └── projetos/
    │       ├── page.tsx         # Lista de projetos
    │       └── [id]/page.tsx    # Editor + Análise IA + Chat
    ├── lib/
    │   ├── api.ts               # Todas as chamadas à API
    │   └── utils.ts             # Formatações e utilitários
    └── ...config files
```

---

## Funcionalidades

- **Autenticação** — cadastro, login com JWT, proteção de rotas
- **Projetos** — criar, listar, abrir, apagar projetos de vídeo
- **Upload de vídeo** — envio de arquivos MP4/MOV/AVI/MKV/WebM
- **Editor** — player de vídeo com timeline, marcar início/fim e cortar
- **Análise com IA** — transcrição via Whisper + análise via Llama 3:
  - Headline
  - Hook (primeiros 3 segundos)
  - Big Idea
  - Descrição para YouTube
  - Sugestões de Shorts/Reels
- **Chat** — conversa interativa com IA sobre o conteúdo do vídeo

---

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/usuarios/` | Criar conta |
| POST | `/usuarios/login` | Login (retorna JWT) |
| GET | `/usuarios/eu` | Dados do usuário logado |
| GET | `/projetos/` | Listar projetos |
| POST | `/projetos/` | Criar projeto |
| GET | `/projetos/{id}` | Detalhes do projeto |
| DELETE | `/projetos/{id}` | Apagar projeto |
| POST | `/videos/upload/{projeto_id}` | Upload de vídeo |
| POST | `/videos/trim` | Cortar vídeo |
| POST | `/ia/processar/{projeto_id}` | Transcrever + analisar com IA |
| POST | `/ia/chat/{projeto_id}` | Chat sobre o vídeo |

---

## Observações

- O modelo Whisper `base` é carregado uma vez na memória quando o backend inicia (pode demorar ~30s na primeira vez)
- O histórico de chat fica em RAM; ao reiniciar o backend, o chat começa do zero (mas o contexto do vídeo é reconstruído automaticamente do banco)
- Para produção, troque `SECRET_KEY` por um valor seguro e use `DATABASE_URL` apontando para PostgreSQL
