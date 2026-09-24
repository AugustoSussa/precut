# precut

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_rnNBlFLv41OAWt6K9HyBeK70x28e)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.


# Biblioteca do Campus — o livro tem dono

O projeto com login e migrações, mais o que o checkpoint pede: o livro
ganha **dono** (um usuário tem muitos livros), cada pessoa enxerga e mexe só
no próprio acervo, a listagem tem **busca e filtro**, e o `422` explica o
que está errado em português. A coluna nova entrou por uma **migração** —
o `create_all` não existe mais.

> É o mesmo sistema de Programação III, de propósito. Quem cursa as duas vê a
> mesma biblioteca dos dois lados: lá o foco é *como ele é por dentro*; aqui,
> *como ele funciona*.

## Rodar

```
poetry install
```

Renomeie `env.exemplo` para `.env` (URL do banco e `SECRET_KEY`).

```
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

O `upgrade head` aplica as **duas** migrações: a que cria `livros` e
`usuarios`, e a que acrescenta `livros.dono_id`. Depois abra
<http://127.0.0.1:8000/docs>.
