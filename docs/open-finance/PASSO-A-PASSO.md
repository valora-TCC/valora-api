# Open Finance (Belvo Sandbox) — Passo a passo para rodar

Guia prático para colocar a integração Open Finance do Valora em funcionamento no ambiente local, usando o **Sandbox da Belvo**.

Documentação técnica completa: [belvo-integration.md](./belvo-integration.md).

---

## Pré-requisitos

- Node.js + pnpm instalados
- Projeto Valora já configurado (Supabase + `DATABASE_URL` da API + `VITE_*` do web)
- Conta Belvo com acesso ao **Sandbox** (se ainda não tiver, o Passo 1 começa do cadastro)
- (Recomendado) ngrok ou cloudflared para receber webhooks em localhost

---

## Passo 1 — Conta Belvo + credenciais (do zero)

Se você **nunca** acessou a Belvo, faça nesta ordem.

### 1.1 Criar a conta

1. Abra a página de cadastro da Belvo (link oficial na doc):  
   [Get started — Create a Belvo account](https://developers.belvo.com/products/aggregation_brazil/prerequisites-get-started-in-10-minutes)  
   → clique em **Belvo signup page** (ou acesse direto o dashboard: [https://dashboard.belvo.com](https://dashboard.belvo.com)).
2. Preencha o formulário (e-mail, senha, dados da conta).
3. Confirme o e-mail: assunto **`[Belvo] Please Confirm Your Email Address`**.
4. Depois do clique no link, você cai no **dashboard** da Belvo.

### 1.2 Entrar no Sandbox

1. No dashboard, selecione o ambiente **Sandbox** (não Production).
2. Production exige liberação com o suporte Belvo — para o Valora local use **só Sandbox**.

### 1.3 Gerar API Keys

1. Vá em **Developer Tools → API Keys** (às vezes aparece como **Developers → API Keys**).
2. Clique em **Generate API Keys**.
3. Copie e guarde **agora**:
   - **Secret ID** (`secretId`)
   - **Secret Password** (`secretPassword`)

> **Importante:** o `secretPassword` aparece **uma vez só**. Se perder, precisa resetar as keys no dashboard.

Postman / “Run in Postman” é opcional — para o Valora basta colar as duas chaves no `.env` da API (Passo 2).

### 1.4 Onde essas chaves vão

Elas vão **somente** no backend (`valora-api/.env`). Nunca no React / `VITE_*`.

---

## Passo 2 — Variáveis de ambiente da API

1. Abra (ou crie) o arquivo:

```text
valora-api/.env
```

2. Use `valora-api/.env.example` como base e preencha no mínimo:

```env
# Já existentes do Valora
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWKS_URL=...

# Belvo Open Finance
BELVO_ENV=sandbox
BELVO_BASE_URL=https://sandbox.belvo.com
BELVO_SECRET_ID=cole_aqui
BELVO_SECRET_PASSWORD=cole_aqui
BELVO_WEBHOOK_SECRET=um_token_forte_que_voce_definir
BELVO_WIDGET_CALLBACK_BASE_URL=http://localhost:5173
BELVO_TERMS_URL=https://belvo.com/terms-service/
BELVO_COMPANY_ICON_URL=https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/bank.svg
BELVO_COMPANY_LOGO_URL=https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/finance.svg
BELVO_COMPANY_NAME=Valora
```

### Observações

- `BELVO_WEBHOOK_SECRET` é um token **definido por você**. O mesmo valor será configurado no dashboard Belvo.
- `BELVO_WIDGET_CALLBACK_BASE_URL` deve apontar para o frontend (em local: `http://localhost:5173`).
- Sem `BELVO_SECRET_ID` / `BELVO_SECRET_PASSWORD`, a API sobe, mas **Conectar banco** falha.

---

## Passo 3 — Variáveis de ambiente do frontend

1. Abra (ou crie):

```text
valora-web/.env
```

2. Confirme (exemplo local):

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Não** coloque credenciais Belvo no frontend.

---

## Passo 4 — Aplicar a migration do banco

Na pasta da API:

```powershell
cd c:\valora\valora-api
pnpm install
pnpm prisma:deploy
```

Isso cria/atualiza:

- `usuario.cpf`
- `transacao.origem`, `id_externo`, `provedor`
- campos Open Finance em `carteira`
- tabelas `conexao_open_finance` e `evento_sync_open_finance`
- políticas RLS

> Se o projeto usa o espelho `supabase/migrations`, aplique **apenas um** caminho (Prisma **ou** Supabase), conforme a regra do repositório (não rode os dois no mesmo banco).

---

## Passo 5 — Subir a API

```powershell
cd c:\valora\valora-api
pnpm start:dev
```

Verifique:

- API: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`

---

## Passo 6 — Subir o frontend

Em outro terminal:

```powershell
cd c:\valora\valora-web
pnpm install
pnpm dev
```

Abra: `http://localhost:5173`

---

## Passo 7 — Configurar webhook Belvo (necessário para sync automático)

A Belvo notifica quando as contas/transações ficam prontas. Em localhost você precisa de uma URL pública.

### 7.1 Tunnel

Exemplo com ngrok:

```powershell
ngrok http 3000
```

Copie a URL HTTPS gerada (ex.: `https://abc123.ngrok-free.app`).

### 7.2 Dashboard Belvo → Webhooks

Crie/edite o webhook:

| Campo | Valor |
|-------|--------|
| URL | `https://SEU-TUNNEL/api/webhooks/belvo` |
| Authorization | o mesmo valor de `BELVO_WEBHOOK_SECRET` (ex.: `Bearer um_token_forte_que_voce_definir` **ou** só o token, se a Belvo já prefixar — o Valora aceita `Bearer <token>` e compara com o `.env`) |

Reinicie a API se alterou o `.env` depois de subir.

> Sem webhook, ainda é possível usar **Sincronizar** manualmente na página Open Finance (útil para testes), mas o fluxo oficial da Belvo é assíncrono via webhook.

---

## Passo 8 — Conectar um banco no Valora

1. Faça login no Valora.
2. No menu **Base**, abra **Open Finance**.
3. Preencha:
   - **CPF** (11 dígitos)
   - **Nome completo**
4. Clique em **Conectar banco**.
5. No Hosted Widget da Belvo, selecione a instituição de teste (Sandbox), em geral:
   - `ofmockbank_br_retail` (Mockbank)
6. Conclua a autenticação no ambiente Sandbox.
7. Você volta para `/open-finance/callback/success`.
8. A conexão é salva e o Valora tenta sincronizar.

### Identidade de teste (Sandbox)

Use a identidade oficial da Belvo para Mockbank (doc OFDA):

| Campo | Valor |
|-------|--------|
| CPF | `76109277673` |
| Nome | `Ralph Bragg` |

---

## Passo 9 — Conferir o resultado

Na página **Open Finance**:

- instituição listada
- status (Conectado / Aguardando / etc.)
- contas e saldos, quando disponíveis
- botões **Sincronizar** e **Desconectar**

No restante do app:

- **Carteiras** — contas importadas
- **Transações** — lançamentos com origem **Open Finance**
- **Dashboard** — saldo, receitas, despesas e categorias atualizados pelo ledger

---

## Passo 10 — Testes automatizados (opcional)

```powershell
cd c:\valora\valora-api
pnpm test -- open-finance.service.spec.ts

cd c:\valora\valora-web
pnpm test -- open-finance-page.test.tsx
```

---

## Checklist rápido

```text
[ ] Conta Belvo criada + e-mail confirmado
[ ] Ambiente Sandbox + API Keys geradas (Secret ID / Password salvos)
[ ] BELVO_SECRET_ID / BELVO_SECRET_PASSWORD no valora-api/.env
[ ] BELVO_WEBHOOK_SECRET definido
[ ] BELVO_WIDGET_CALLBACK_BASE_URL = http://localhost:5173
[ ] Migration aplicada (prisma:deploy)
[ ] API rodando (pnpm start:dev)
[ ] Web rodando (pnpm dev)
[ ] Tunnel + webhook Belvo apontando para /api/webhooks/belvo
[ ] Login no Valora
[ ] Open Finance → Conectar banco → Mockbank
[ ] Contas/transações visíveis
[ ] Dashboard refletindo dados importados
```

---

## Problemas comuns

| Sintoma | O que verificar |
|---------|-----------------|
| “Integração Belvo não configurada” | `BELVO_SECRET_ID` / `BELVO_SECRET_PASSWORD` no `.env` e reinício da API |
| Widget Belvo / `ACCESS_TOKEN_NOT_VALID` | Na UI do Valora o fluxo principal é **Conectar banco** (seed local de Sandbox). Belvo real fica opcional até o produto OFDA/widget estar liberado. |
| Widget não abre / erro ao conectar | Credenciais Sandbox; CPF com 11 dígitos; callback base URL |
| Conexão salva, mas sem dados | Webhook + tunnel; ou clique em **Sincronizar**; aguarde `historical_update` da Belvo |
| Webhook inválido (401) | `BELVO_WEBHOOK_SECRET` igual ao Authorization do dashboard |
| Callback não volta ao Valora | `BELVO_WIDGET_CALLBACK_BASE_URL` deve ser a URL do frontend |
| Erro de banco / tabela inexistente | Rodar `pnpm prisma:deploy` |

---

## Produção (ainda não é este guia)

Trocar `BELVO_ENV` / `BELVO_BASE_URL` / credenciais de produção **não** conclui sozinho o Open Finance Brasil real (certificações, instituições reais, etc.). Isso fica para uma etapa futura — ver classificação em [belvo-integration.md](./belvo-integration.md).
