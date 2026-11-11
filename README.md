# Précut V6 — protótipo acadêmico

Aplicação web de apoio à pré e pós-produção audiovisual. **Frontend:** Next.js 15/React/TypeScript; **backend:** FastAPI/SQLAlchemy/SQLite; **transcrição:** Whisper local; **análise e chat:** API OpenAI. O Research/Instagram é experimental, sem comprovação automática de tendências.

## Iniciar no Windows / PowerShell

Use Python 3.11 ou 3.12, Node.js 20+ e FFmpeg/ffprobe instalados e disponíveis no `PATH`.

**Backend** (primeiro terminal, dentro de `precut-main`):

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

No novo `backend/.env`, substitua `SECRET_KEY` pelo segredo aleatório acima e insira sua `OPENAI_API_KEY` (não inclua comandos no valor). Em seguida:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (outro terminal, dentro de `precut-main`):

```powershell
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:3000`. Swagger: `http://localhost:8000/docs`.

### Atualização de V5 para V6 sem perder dados

1. Faça backup integral da V5, principalmente `backend/.env`, `backend/precut.db` e `backend/uploads/`.
2. Extraia a V6 em **outra pasta**. Não copie `venv` nem `node_modules` antigos.
3. Copie os três itens anteriores para `precut-main/backend/` da V6.
4. Crie o ambiente Python e execute os comandos de instalação acima **sem sobrescrever seu `.env` copiado**. Reinicie frontend e backend. O SQLite recebe colunas novas automaticamente, sem remover os registros anteriores.
5. Se gerar uma `SECRET_KEY` nova, os tokens de login antigos deixam de funcionar; faça login novamente.

O ZIP não contém chave privada, banco de dados de usuário ou uploads.

## V6: requisitos adicionados

- **RF02:** upload de arquivos MP3 e transcrição local. MP3 não oferece edição de vídeo nem exportação de corte MP4.
- **RF03:** baixar SRT com os timestamps da transcrição.
- **RF04:** importar SRT UTF-8 (até 2 MB, até 10 mil segmentos). Ao importar, a análise anterior fica pendente; execute “Analisar com IA” novamente. Se houver vídeo, a legenda importada será usada na próxima análise.
- **RF09:** IA devolve temas centrais estruturados; são mostrados em chips na visão geral.
- **RF16:** revisar textos no painel e aprovar explicitamente uma resposta do chat para substituir headline, hook, Big Idea ou descrição, com persistência no banco.
- **RF17:** exportar relatório TXT com textos, transcrição e cortes.
- **RNF09 (protótipo):** aceite obrigatório e registrado no cadastro, com aviso de privacidade acessível em `/privacidade`. Não equivale a uma auditoria jurídica completa de LGPD.

Abra **Análise IA** para importar SRT, baixar SRT ou exportar TXT. O botão de analisar aparece inclusive em projetos que contêm apenas SRT.

## Escopo e limites — importantes para o TCC

- Novos testes automatizados: `cd backend; .\venv\Scripts\python.exe -m pytest -q tests` (caso instale `pytest`).
- O processamento de MP3/Whisper e a API OpenAI exigem validação com arquivos e credenciais reais no computador de entrega.
- Os requisitos quantitativos RNF01 (10 mil palavras/30s), RNF02 (10 usuários), RNF06 (headline/5min), RNF07 (usabilidade), RNF10 (conformidade LGPD) e RNF12 (95% disponibilidade) **não devem ser declarados aprovados sem medição específica**.
- A exclusão de projetos não garante exclusão física de todos os arquivos da pasta de uploads; o operador precisa tratá-los manualmente. Não use dados sensíveis sem autorização e avaliação institucional.
- Sem Remotion automático ou integração Apify. Essas funcionalidades são trabalhos futuros.

## Publicação na nuvem — V6.1

Consulte **[DEPLOY_RENDER_V6_1.md](DEPLOY_RENDER_V6_1.md)** para o roteiro de publicação no Render. O frontend desta versão utiliza Next.js e o backend FastAPI, portanto não use os comandos Flutter/Poetry do tutorial de Web 3.
