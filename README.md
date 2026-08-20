# Valora API

Backend NestJS do Valora — gestão financeira pessoal.

## Stack

- NestJS + TypeScript
- Prisma + PostgreSQL (Supabase)
- Supabase Auth (JWT ES256 / JWKS)
- Swagger em `/api/docs`

## Configuração

Requer [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`).

```powershell
Copy-Item .env.example .env
# Preencha as variáveis do Supabase
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

API: `http://localhost:3000/api` · Health: `GET /api/health`

## Documentação

Diagramas, requisitos e decisões de arquitetura ficam em [`docs/`](docs/):

- [`docs/architecture/`](docs/architecture/) — arquitetura, contexto, decisões
- [`docs/diagrams/`](docs/diagrams/) — Caso de Uso, BPMN, DER, modelo físico
- [`docs/database/database-model.md`](docs/database/database-model.md) — modelo PostgreSQL
- [`docs/requirements/`](docs/requirements/) — RF e rastreabilidade

SQL espelhado do Prisma: [`supabase/migrations/`](supabase/migrations/).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm start:dev` | Dev com watch |
| `pnpm build` | Build produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Jest |
| `pnpm exec prisma migrate deploy` | Aplicar migrations |

## Segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou `DATABASE_URL` no frontend.
- Queries filtram pelo `id_usuario` do JWT; RLS reforça o isolamento no Postgres.
- Modelo oficial em português (`usuario`, `carteira`, `transacao`, …). SQL também em `supabase/migrations/`. Não rode `supabase db push` no mesmo banco após `prisma migrate deploy`.

## Deploy

Railway / Render / Fly.io: configure as mesmas variáveis de ambiente e rode `pnpm exec prisma migrate deploy` no release.
