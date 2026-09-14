# Open Finance — Integração Belvo (Valora)

Documentação da integração Open Finance do Valora com a Belvo no ambiente **Sandbox**.  
Classificação para TCC: use apenas o que estiver comprovável no código.

## 1. Arquitetura

```text
React (valora-web)
  → HTTPS + JWT Supabase
NestJS (valora-api)  /api/open-finance/*
  → Belvo Sandbox (widget token, accounts, transactions, delete link)
  ← POST /api/webhooks/belvo
  → Prisma → PostgreSQL (Supabase)
  → Dashboard / Transações / Carteiras (ledger existente)
```

Módulo backend: `valora-api/src/open-finance/`.  
Página frontend: `valora-web/src/pages/open-finance-page.tsx`.

## 2. Fluxo completo

```text
Usuário autenticado
  → Página Open Finance (CPF + nome)
  → POST /api/open-finance/widget-token
  → Nest gera access token OFDA (POST Belvo /api/token/)
  → Frontend abre Hosted Widget (widget.belvo.io)
  → Usuário conecta ofmockbank_br_retail (Sandbox)
  → Callback /open-finance/callback/success?link=…&institution=…
  → POST /api/open-finance/connections (associa Link → usuário)
  → Belvo processa histórico de forma assíncrona
  → Webhook historical_update → POST /api/webhooks/belvo
  → Nest busca Accounts/Transactions na Belvo
  → Normaliza → carteira + transacao (origem OPEN_FINANCE)
  → Dashboard consome o ledger existente
```

**Importante (doc Belvo):** após `fetch_resources`, aguardar webhook antes de considerar o histórico completo. O Valora também permite sync manual (`POST /open-finance/sync/:id`) para testes.

## 3. Autenticação

- Endpoints de usuário: JWT Supabase (`JwtAuthGuard` + `@CurrentUser()`).
- O `userId` **nunca** vem do body; vem de `payload.sub`.
- Webhook: `@Public()` + header `Authorization: Bearer <BELVO_WEBHOOK_SECRET>` (token configurado no dashboard Belvo).

## 4. Widget (Hosted / OFDA)

- Token gerado **somente no backend**.
- Payload OFDA inclui `openfinance_feature: consent_link_creation`, scopes oficiais, `fetch_resources: ACCOUNTS, TRANSACTIONS, OWNERS`, `identification_info` (CPF + nome).
- Callbacks: `{FRONTEND}/open-finance/callback/{success|exit|event}`.
- Sandbox: URL do widget inclui `institutions=ofmockbank_br_retail`.

## 5. Banco de dados

### Extensões
- `usuario.cpf`
- `transacao.origem` (`MANUAL` | `OPEN_FINANCE`), `id_externo` (unique), `provedor`
- `carteira.id_conexao_of`, `id_conta_externa` (unique), metadados OF

### Novas tabelas
- `conexao_open_finance` — Link Belvo ↔ usuário
- `evento_sync_open_finance` — idempotência de webhooks (`event_key` unique)

### Migrations
- Prisma: `prisma/migrations/20260913000000_open_finance_belvo`
- Espelho: `supabase/migrations/20260913000000_open_finance_belvo.sql`
- RLS nas novas tabelas (dono = `auth.uid()`)

**Não** há segundo ledger: contas e lançamentos OF alimentam `carteira` / `transacao`.

### Saldo
Após sync, `carteira.saldo_atual` das contas OF é atualizado com o saldo Belvo (fonte da instituição). Transações importadas alimentam receitas/despesas/categorias.

## 6. Categorização

Regras por palavra-chave em `categorization/category-rules.ts` (IFOOD → Alimentação, UBER → Transporte, etc.).  
Sem IA nesta etapa. Fallback: “Outros” / “Outros (receita)”.

## 7. Idempotência

- Contas: unique `carteira.id_conta_externa`
- Transações: unique `transacao.id_externo` (Belvo transaction id)
- Webhooks: unique `evento_sync_open_finance.event_key`

## 8. Variáveis de ambiente

Ver `valora-api/.env.example`:

| Variável | Uso |
|----------|-----|
| `BELVO_ENV` | `sandbox` \| `production` |
| `BELVO_BASE_URL` | default Sandbox `https://sandbox.belvo.com` |
| `BELVO_SECRET_ID` | Secret ID (backend only) |
| `BELVO_SECRET_PASSWORD` | Secret Password (backend only) |
| `BELVO_WEBHOOK_SECRET` | Token Authorization do webhook |
| `BELVO_WIDGET_CALLBACK_BASE_URL` | Base dos callbacks (ex. `http://localhost:5173`) |
| `BELVO_TERMS_URL` / ícone / logo / nome | Branding exigido no token OFDA |

Nenhuma credencial Belvo no frontend (`VITE_*`).

## 9. Endpoints

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/open-finance/widget-token` | JWT |
| GET | `/api/open-finance/connections` | JWT |
| POST | `/api/open-finance/connections` | JWT |
| DELETE | `/api/open-finance/connections/:id` | JWT |
| GET | `/api/open-finance/accounts` | JWT |
| GET | `/api/open-finance/transactions` | JWT |
| POST | `/api/open-finance/sync/:connectionId` | JWT |
| POST | `/api/webhooks/belvo` | Webhook secret |

## 10. Sandbox vs produção

Configuração centralizada em `belvo.config.ts` + `BELVO_ENV` / `BELVO_BASE_URL`.  
Trocar para produção = novas credenciais + URL de API + instituições reais.  
**Não** implica certificação Open Finance Brasil automática.

## 11. Webhooks em desenvolvimento local

Belvo precisa de URL pública. Use tunnel (ngrok/cloudflared) apontando para `https://<tunnel>/api/webhooks/belvo` e configure o mesmo `BELVO_WEBHOOK_SECRET` no dashboard Belvo.

## 12. Segurança (o que existe de fato)

Implementado no código:
- Secrets Belvo só no backend
- Validação de env (Zod)
- JWT nos endpoints de usuário
- Isolamento por `id_usuario`
- RLS nas tabelas OF
- Validação de Authorization no webhook
- Idempotência de sync
- Logs sem imprimir secret password / token completo

**Não** afirmamos neste projeto: mTLS com instituições, OAuth bancário do cliente final além do fluxo Belvo Widget, AES-256 customizado, TLS 1.3 “garantido” pela aplicação, Open Finance em produção certificado.

## 13. Classificação TCC

### Implementado
- Módulo Open Finance NestJS + cliente Belvo (token, accounts, transactions, delete link)
- Página Open Finance + Hosted Widget (callbacks)
- Persistência Link → usuário, contas → carteira, transações → transacao
- Origem MANUAL / OPEN_FINANCE
- Categorização por regras
- Webhook Belvo com auth + idempotência
- Sync manual
- Integração indireta ao dashboard via ledger
- Migrations + RLS
- Testes automatizados unitários/UI (mocks)

### Arquitetura preparada
- `BELVO_ENV=production` e troca de `BELVO_BASE_URL`
- Campos/extensões para evolução (provedor, eventos de sync)

### Previsto
- Open Finance Brasil em produção com instituições reais e certificações
- mTLS / obrigações regulatórias de participante
- Webhook E2E sem tunnel (infra de deploy público)
- Categorização por IA
- Consentimento/renovação avançada além do widget Belvo

## 14. Como testar

1. Preencher credenciais Belvo Sandbox no `.env` da API
2. `pnpm prisma:deploy` (ou migrate) na API
3. Subir API + web
4. Em Open Finance, informar CPF/nome (Sandbox: identidade de teste da Belvo se exigido)
5. Conectar Mockbank → callback → sync
6. Verificar carteiras, transações (origem Open Finance) e dashboard
