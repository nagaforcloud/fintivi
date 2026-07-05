# Fintivi

Fintivi is a personal finance app with a Fastify API and Vite React web app.

## Requirements

- Node.js 20.11+
- pnpm 11.9.0
- PostgreSQL database URL in `.env`

## Local Setup

Copy `.env.example` to `.env` and fill database and secret values.

Run migrations:

```bash
pnpm db:migrate
```

Start API and web app:

```bash
pnpm dev
```

Local URLs:

- API: `http://localhost:8001/api/v1`
- Web: `http://localhost:5173`

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
```
