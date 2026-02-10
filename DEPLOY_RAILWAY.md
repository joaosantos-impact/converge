# Deploy no Railway

O projeto tem Dockerfiles prontos para o backend e frontend. No Railway, cria dois serviços a partir do mesmo repositório.

## 1. Criar projeto e serviços

1. Em [railway.app](https://railway.app), cria um projeto novo
2. **Add Service** → **GitHub Repo** → seleciona o repositório
3. Repete para o segundo serviço (mesmo repo)

## 2. Configurar cada serviço

### Backend (API)

- **Settings** → **Build** → **Dockerfile Path**: `backend/Dockerfile`
- **Settings** → **Build** → **Root Directory**: deixa vazio (repo root)
- **Settings** → **Networking** → **Generate Domain** para obter o URL público
- **Variables**: adiciona as variáveis abaixo

### Frontend (Next.js)

- **Settings** → **Build** → **Dockerfile Path**: `frontend/Dockerfile`
- **Settings** → **Build** → **Root Directory**: deixa vazio
- **Settings** → **Networking** → **Generate Domain**
- **Variables**: adiciona as variáveis abaixo

## 3. Variáveis de ambiente

### Backend

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL PostgreSQL (Neon ou Railway Postgres) | `postgresql://...` |
| `BETTER_AUTH_SECRET` | Chave secreta (32+ caracteres) | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | **URL do frontend** (onde o utilizador acede) | `https://converge.railway.app` |
| `GOOGLE_CLIENT_ID` | OAuth Google | |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | |
| `ENCRYPTION_SALT` | `openssl rand -hex 16` | |
| `ADMIN_EMAILS` | Emails admin (separados por vírgula) | |
| `FRONTEND_URL` | **URL do frontend** (CORS) | `https://converge.railway.app` |
| `REDIS_URL` | (opcional) Redis para fila de sync | `redis://...` |

### Frontend

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | **URL do backend** | `https://converge-api.railway.app` |

## 4. Base de dados

- **Add Plugin** → **PostgreSQL** (ou usa Neon com DATABASE_URL externa)
- Se usares Railway Postgres, copia o `DATABASE_URL` para as variáveis do backend

## 5. Portas

- Backend: expõe porta 4000 (Railway define `PORT` automaticamente)
- Frontend: expõe porta 3000

Os Dockerfiles usam `process.env.PORT` / `ENV PORT`, compatível com o Railway.

## 6. Migrações Prisma

O backend corre `prisma migrate deploy` no arranque do container, antes de iniciar o servidor. Garante que as migrações estão commitadas em `backend/prisma/migrations/`.

### Base de dados já existente (baseline)

Se a base de dados de produção **já tem tabelas** (ex.: criadas com `db push` ou manualmente), é preciso fazer baseline uma vez:

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate resolve --applied 0_init --config prisma.config.ts
```

Usa o teu `DATABASE_URL` de produção. Isto marca a migração inicial como já aplicada, sem executar o SQL. Depois disto, o `migrate deploy` no container vai funcionar.

### Nova base de dados

Se estiveres a começar do zero, corre `prisma migrate dev` localmente primeiro para gerar migrações:

```bash
cd backend && npx prisma migrate dev --name init
```
