# Précut V6.1 — publicação no Render (adaptação de Web 3)

Esta é uma **cópia específica para deploy**. A V6 local continua independente. O tutorial da aula usa Flutter/Poetry, que **não são utilizados** neste projeto; aqui implantamos **Next.js 15 e FastAPI com Docker**.

## O que está incluído

- `backend/Dockerfile`: Python 3.11, dependências leves do backend e FFmpeg; inicia Uvicorn com a porta do Render.
- `frontend/Dockerfile`: Node 20, instala dependências, compila Next.js e inicia o servidor web.
- `.dockerignore` em cada serviço: evita incluir arquivos locais, uploads e credenciais na imagem.
- Banco: aceita `sqlite:///...` local e `postgresql://...`/`postgresql+psycopg://...` no Render, via SQLAlchemy e psycopg 3.
- URLs: `NEXT_PUBLIC_API_URL` aponta o navegador para a API pública; localmente continua funcionando com `/api` e o proxy Next.js.
- CORS: `FRONTEND_ORIGINS` aceita a URL da aplicação publicada.
- Mídia: `PRECUT_UPLOAD_DIR` move os uploads para disco persistente opcional.

## Antes de publicar

1. Faça backup do projeto V6, banco SQLite, `backend/.env` e arquivos da pasta `backend/uploads`. **Nunca envie segredos para o GitHub.**
2. Use somente esta cópia V6.1 para o deploy. Os dois diretórios `frontend/` e `backend/` devem estar no mesmo repositório GitHub.
3. Confira no GitHub que `backend/.env`, `.db`, `uploads/`, `.next/` e `node_modules/` não foram versionados. Se já tiver enviado alguma chave, **revogue e gere outra**.
4. A V6.1 inicia um banco PostgreSQL **novo e vazio**; **não migra automaticamente** os usuários/projetos do SQLite local.

## 1 — PostgreSQL no Render

No [dashboard.render.com](https://dashboard.render.com), crie **New > Postgres**. Selecione a região desejada e o plano após conferir o preço. Na página do banco, copie a **Internal Database URL**. Use-a **apenas** como valor secreto de `DATABASE_URL` no serviço de backend. Não a exponha no GitHub.

A aplicação aceita `postgresql://...` e converte automaticamente para o driver `psycopg` (v3). O comando `create_all` cria tabelas ao iniciar, e há pequenas migrações aditivas para alguns campos de bancos legados; **não há sistema completo de migrações Alembic configurado**. Para esta entrega, use um banco de demonstração novo.

> Importante: os bancos PostgreSQL gratuitos do Render expiram após 30 dias. Verifique a data no painel.

## 2 — Backend / API

No Render, crie **New > Web Service** a partir do repositório GitHub:

- **Language:** Docker
- **Root Directory:** `backend`
- **Dockerfile:** `Dockerfile` (dentro de backend)
- **Health Check Path:** `/health`
- **Instance:** a transcrição passou a usar a API OpenAI, reduzindo bastante o uso de RAM. A exportacao de video/FFmpeg ainda pode exigir mais CPU/memoria.

Em **Environment**, crie as variáveis (NÃO COLE SEUS SEGREDOS NO README):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL do PostgreSQL |
| `SECRET_KEY` | Gerar valor aleatório com pelo menos 32 caracteres (use opção Generate do Render) |
| `OPENAI_API_KEY` | Chave privada da API da OpenAI |
| `OPENAI_MODEL` | `gpt-4o-mini` (ou modelo habilitado na sua chave) |
| `OPENAI_SEARCH_MODEL` | `gpt-4o` |
| `OPENAI_TRANSCRIPTION_MODEL` | `whisper-1` (temporario, para timestamps; descontinuacao em 26/02/2027) |
| `MAX_UPLOAD_MB` | `150` (ajustar conforme plano, espaço e limites) |
| `PRECUT_UPLOAD_DIR` | `/var/data/uploads` **se houver disco montado em `/var/data`**; caso contrário, `uploads` (efêmero) |
| `FRONTEND_ORIGINS` | `https://SEU-FRONTEND.onrender.com` (configurar após criar o frontend) |

**Arquivos enviados:** para persistência, o backend deve estar em **plano pago com Disk** montado em `/var/data`, e `PRECUT_UPLOAD_DIR=/var/data/uploads`. Render Free **não oferece disco persistente**: arquivos somem em reinicializações, deploys e períodos de inatividade. O PostgreSQL guarda metadados, **não** o MP4/MP3. Por enquanto esta V6.1 não tem integração com S3/R2.

Faça deploy. Copie a URL pública, por exemplo `https://precut-api.onrender.com`. Teste `https://precut-api.onrender.com/health` (esperado `{"status":"ok",...}`) e `/docs`.

A V6.1 agora extrai o audio com FFmpeg e usa `whisper-1` pela API OpenAI, sem carregar PyTorch no Render. Divide audios longos em trechos de ate 8 minutos, retorna timestamps e reconstitui os deslocamentos para a timeline. **Este modelo esta descontinuado e sera desligado em 26/02/2027**. Antes disso, planeje uma migracao para `gpt-transcribe` com alinhamento temporal ou outro fluxo compativel. Nao foram validadas chamadas reais nem conclusao de processamento na infraestrutura Render.

## 3 — Frontend Next.js

Crie um **segundo Web Service**, não Static Site (o tutorial é para Flutter):

- **Language:** Docker
- **Root Directory:** `frontend`
- **Dockerfile:** `Dockerfile`
- **Environment:** `NEXT_PUBLIC_API_URL=https://SUA-API.onrender.com` **sem barra final**

A variável `NEXT_PUBLIC_API_URL` é **pública**, não uma chave. Ela é incorporada ao JavaScript no `npm run build`. Configure-a **antes** de fazer deploy. Render disponibiliza as variáveis de ambiente Docker como `ARG` durante o build, e o `frontend/Dockerfile` já declara esse argumento. Se mudar a URL da API, escolha **Save, rebuild, and deploy** (não apenas reiniciar).

Assim que receber o endereço público do frontend, volte ao Web Service do backend e configure `FRONTEND_ORIGINS` para esse endereço com protocolo `https://`, sem barra final. Faça novo deploy do backend.

A aplicação usa HTTPS do Render, e o navegador chama a API diretamente. **Nunca configure `NEXT_PUBLIC_API_URL` como `localhost` no Render**.

## 4 — Validar de fora (importante para o TCC)

1. Abra o frontend numa janela anônima.
2. Crie uma conta de demonstração e faça login.
3. Crie um projeto; feche e reabra o navegador, confirme que o projeto continua listado.
4. Faça upload de **um MP3 pequeno** e teste transcrição via API/IA. Depois um **MP4 curto** e teste corte/exportação.
5. Teste o Research. Um resultado vazio da busca não significa falha do banco; já um `401` ou `500` deve ser investigado nos logs da API.
6. Acesse `/docs` e `/health` da API externa.
7. Adicione os **endereços reais** ao README/monografia. Nunca coloque `DATABASE_URL`, `SECRET_KEY` nem `OPENAI_API_KEY` lá.

### Limites conhecidos

- A V6 local usa SQLite e não deve ser substituída por esta configuração sem backup.
- A V6.1 **não converte** automaticamente banco e uploads locais para a nuvem.
- O tratamento de áudio/vídeo pode exceder CPU, RAM, tempo de requisição e armazenamento de planos modestos.
- Render Free suspende Web Services inativos e tem disco efêmero. O PostgreSQL Free expira após 30 dias.
- Ainda são necessárias validações reais de deploy, desempenho, falhas de transcrição, CORS e upload no seu ambiente.
- O protótipo não deve ser divulgado como serviço de produção com garantia de disponibilidade ou conformidade completa com a LGPD.

## Comandos locais continuam os mesmos

Em `backend/`, mantenha seu `.env` com SQLite e inicie:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Em `frontend/`:

```powershell
npm install
npm run dev
```

Não defina `NEXT_PUBLIC_API_URL` localmente, a menos que queira testar a API publicada. Sem ela, o frontend usa `/api` com proxy local.

## Transcricao pela API — versao online

Esta branch usa **OpenAI `whisper-1` via API**, com timestamps de segmentos (`verbose_json`) necessarios para SRT/cortes. A V6 local continua com Whisper offline. O `openai-whisper` e o `ollama` foram removidos das dependencias de deploy, reduzindo memoria e tempo de build. O processo ainda depende de FFmpeg/ffprobe e de arquivos temporarios locais.

- Em **Environment** do backend, remova `WHISPER_MODEL=tiny` (nao utilizado) e adicione `OPENAI_TRANSCRIPTION_MODEL=whisper-1`. A `OPENAI_API_KEY` continua a mesma para transcricao e analise.
- **Custo aproximado**: US$0,006 por minuto transcrito, alem de tokens de texto para analise/chat e uso de web search. Confirmar precos atuais no painel da API.
- **Limite de gastos**: configurar alertas e limites do projeto OpenAI, validar custos antes de conceder acesso publico.
- **Descontinuação**: `whisper-1` sai da API em 26 de fevereiro de 2027. Este e um caminho temporario para demonstracao do TCC, nao uma arquitetura definitiva.
- **Limites do Render Free**: armazenamento efemero, tempo de requisicao, CPU/RAM durante exportacao de clipes; o sistema pode continuar falhando nesses cenarios mesmo sem Whisper local.
- **Seguranca**: nao mostrar nem salvar a chave de API no frontend. A aplicacao envia audio ao servico OpenAI (atualizar aviso de privacidade antes de uso com dados reais).

