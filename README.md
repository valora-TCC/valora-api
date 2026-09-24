# Valora API

Backend do Valora, um sistema de gestão financeira pessoal. Este repositório é a API NestJS. O frontend fica em um repositório separado (`valora-web`) e os dois precisam rodar juntos.

## Stack

- NestJS + TypeScript
- Prisma + PostgreSQL (Supabase)
- Supabase Auth (JWT ES256 / JWKS)
- Swagger em `/api/docs`

## O que a API cobre

Carteiras, categorias, transações, metas, orçamentos, dashboard, investimentos, relatórios, simulações, educação financeira, cotações de mercado e Open Finance (Belvo sandbox).

## Pré-requisitos

- Node.js
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- Um projeto [Supabase](https://supabase.com) (Auth + PostgreSQL)

## Configuração local

Suba a API antes do frontend.

```powershell
Copy-Item .env.example .env
# Preencha as variáveis obrigatórias
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

- API: `http://localhost:3000/api`
- Health: `GET /api/health`
- Swagger: `http://localhost:3000/api/docs`

O frontend (`valora-web`) sobe em `http://localhost:5173` depois que a API estiver no ar.

## Variáveis de ambiente

Copie [`.env.example`](.env.example). Não commite o `.env`.

Obrigatórias:

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Connection string do PostgreSQL (Supabase) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (somente neste backend) |
| `SUPABASE_JWKS_URL` | JWKS do Auth (`…/auth/v1/.well-known/jwks.json`) |
| `FRONTEND_URL` | Origem do web (`http://localhost:5173` em desenvolvimento) |

Opcionais:

| Variável | Uso |
|----------|-----|
| `BRAPI_TOKEN` | Token da BrAPI para tickers educacionais da B3 |
| `BELVO_ENV` | `sandbox` (padrão) ou `production` |
| `BELVO_BASE_URL` | URL da API Belvo |
| `BELVO_SECRET_ID` / `BELVO_SECRET_PASSWORD` | Credenciais Belvo |
| `BELVO_WEBHOOK_SECRET` | Token de autorização dos webhooks |
| `BELVO_WIDGET_CALLBACK_BASE_URL` | Base dos callbacks do widget (em geral o `FRONTEND_URL`) |
| `BELVO_*` (ícone, logo, nome, termos) | Branding do Hosted Widget |
| `OPEN_FINANCE_DEMO_ENABLED` | `true` / `false`; sem valor, segue o sandbox |

`SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` ficam só neste repositório. Não use essas chaves no frontend.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm start:dev` | Dev com watch |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Jest |
| `pnpm prisma:deploy` | Aplicar migrations |
| `pnpm conteudo:seed` | Popular conteúdos de educação |

## Documentação

Arquitetura, requisitos e diagramas ficam em [`docs/`](docs/):

- [`docs/architecture/`](docs/architecture/) — arquitetura, contexto, decisões
- [`docs/diagrams/`](docs/diagrams/) — caso de uso, BPMN, DER, modelo físico
- [`docs/database/database-model.md`](docs/database/database-model.md) — modelo PostgreSQL
- [`docs/requirements/`](docs/requirements/) — requisitos funcionais e rastreabilidade
- [`docs/open-finance/`](docs/open-finance/) — integração Belvo

SQL espelhado do Prisma: [`supabase/migrations/`](supabase/migrations/). Não rode `supabase db push` no mesmo banco depois de `prisma migrate deploy`.

Queries filtram pelo `id_usuario` do JWT; o RLS no Postgres reforça o isolamento.

## Deploy

Railway / Render / Fly.io: configure as mesmas variáveis e rode `pnpm exec prisma migrate deploy` no release.
