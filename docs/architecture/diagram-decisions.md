# Decisões e inconsistências entre documentos oficiais e implementação

Os PDFs oficiais (Caso de Uso 2.0, BPMN 2.0, DER 2.0, Modelo Físico 2.0) são a fonte dos requisitos. Divergências **não** foram “corrigidas em silêncio”: cada uma está registrada aqui, com a decisão aplicada no PostgreSQL/Supabase e no código.

---

## D-001 — Senha em `usuario` vs Supabase Auth

**Problema:** O DER e o modelo físico incluem `usuario.senha`. A arquitetura do Valora usa Supabase Auth (`auth.users`).

**Fonte:** Documentação DER 2.0 / Modelo Físico 2.0 × stack já adotada (JWT ES256/JWKS).

**Impacto:** Duplicar senha na tabela de aplicação quebraria o modelo de Auth e aumentaria superfície de vazamento.

**Decisão recomendada / aplicada:** Não persistir senha em `usuario`. `usuario.id_usuario` = `auth.users.id`. E-mail único em `usuario` é espelho para consultas; a senha permanece apenas no Supabase Auth.

**Motivo:** O plano de execução exige Auth do Supabase e proíbe armazenamento manual de senha quando Auth está em uso.

---

## D-002 — Identificadores INT vs UUID

**Problema:** O modelo físico documenta `INT` para PKs. O Auth do Supabase identifica usuários com UUID.

**Fonte:** Modelo Físico 2.0 × `auth.users`.

**Impacto:** INT não pode ser FK de `auth.users.id`.

**Decisão:** Todas as PKs/FKs usam `uuid` (`gen_random_uuid()` nas tabelas de negócio; `id_usuario` copiado de `auth.users`).

**Motivo:** Integridade referencial com o provedor de autenticação.

---

## D-003 — `TINYINT(1)` / status

**Problema:** Status documentado como `TINYINT(1)` (MySQL). PostgreSQL não tem esse tipo.

**Fonte:** Modelo Físico 2.0.

**Impacto:** Conversão obrigatória.

**Decisão:** Coluna `ativo boolean NOT NULL DEFAULT true`. Valores de domínio não documentados (ex. “pendente”, “arquivado”) não foram inventados como ENUM.

**Motivo:** Equivalente semântico ao TINYINT(1) booleano; sem lista oficial de status.

---

## D-004 — `data_nascimento` só no DER

**Problema:** DER lista `usuario.data_nascimento`. O modelo físico não lista esse campo.

**Fonte:** DER 2.0 × Modelo Físico 2.0.

**Impacto:** Schema incompleto se um dos docs for ignorado.

**Decisão:** Incluir `data_nascimento date NULL` em `usuario`.

**Motivo:** Campo aditivo, nullable, presente no DER; não contradiz o físico além da omissão.

---

## D-005 — `orcamento.ano` só no físico

**Problema:** DER omite `ano` em `ORCAMENTO`. O físico tem `mes` e `ano`. Casos de uso falam em orçamento mensal.

**Fonte:** DER 2.0 × Modelo Físico 2.0 × Caso de Uso 2.0.

**Impacto:** Sem `ano`, orçamentos de meses iguais em anos diferentes colidem semanticamente.

**Decisão:** Persistir `mes` e `ano` conforme o modelo físico.

**Motivo:** Necessário para orçamento mensal; o físico é a fonte mais específica para colunas.

---

## D-006 — ENUMs com valores não listados

**Problema:** O físico define ENUM apenas para `categoria.tipo` = `RECEITA` | `DESPESA`. Não lista valores de `forma_pagamento`, `tipo_taxa`, `notificacao.tipo`, `conteudo.tipo`, status além de TINYINT.

**Fonte:** Modelo Físico 2.0.

**Impacto:** Inventar valores criaria requisitos não oficiais.

**Decisão:** ENUM PostgreSQL `TipoFinanceiro` (`RECEITA`, `DESPESA`) em `categoria.tipo` e `transacao.tipo`. Demais classificadores ficam `text` até haver lista oficial.

**Motivo:** Não inventar requisitos.

---

## D-007 — Saldo da carteira: trigger vs service

**Problema:** Caso de uso e DER exigem atualização automática do saldo. O código anterior calculava saldo no NestJS a partir de `initial_balance` + transações.

**Fonte:** Caso de Uso 2.0 (inclui Atualizar Saldo da Carteira) × `AccountsService.computeBalance`.

**Impacto:** Duas fontes de verdade.

**Decisão (opção C):** Trigger PostgreSQL em `transacao` atualiza `carteira.saldo_atual`. O NestJS lê o saldo persistido e agrega o dashboard. Transações com `ativo = false` não entram no saldo.

**Motivo:** Integridade mesmo se houver escrita fora da API; dashboard continua no backend.

---

## D-008 — Investments fora do modelo oficial

**Problema:** Existem `investments` e `investment_transactions` no código e no Prisma. Nenhum documento oficial as descreve.

**Fonte:** Código atual × DER / Modelo Físico 2.0.

**Impacto:** Funcionalidade extra, não rastreável a RF oficiais.

**Decisão:** Manter as tabelas e as páginas. Não apagar. Registrar na matriz de rastreabilidade como extra / fora do oficial. Não criar RF para investments.

**Motivo:** Plano proíbe apagar artefatos existentes sem autorização.

---

## D-009 — Tipos de conta, `transfer`, categoria opcional

**Problema:** Código tinha `AccountType`, `TransactionType.transfer` e `categoryId` opcional. Oficial: carteira sem tipo de instituição; transação RECEITA/DESPESA vinculada a carteira **e** categoria.

**Fonte:** Prisma antigo × DER regras de negócio.

**Impacto:** Contrato da API muda.

**Decisão:** Remover `AccountType` e `transfer` do modelo oficial. `transacao.id_categoria` NOT NULL. Linhas `transfer` existentes são migradas para `DESPESA`. Transações sem categoria recebem categoria fallback `Geral` do usuário.

**Motivo:** Alinhar ao DER (“toda transação deve estar vinculada a uma carteira e categoria”).

---

## D-010 — Contas próximas do vencimento sem `data_vencimento`

**Problema:** BPMN e casos de uso exigem verificação automática (24h) de contas vencendo. Nenhuma entidade física tem data de vencimento.

**Fonte:** BPMN 2.0 / Caso de Uso 2.0 × Modelo Físico 2.0.

**Impacto:** O job não consegue selecionar registros “a vencer” sem inventar coluna.

**Decisão:** Não adicionar `data_vencimento` nesta etapa. `NotificacoesModule` + cron 24h ficam preparados (no-op documentado). Gap permanece até decisão de produto.

**Motivo:** Não corrigir o modelo oficial em silêncio.

---

## D-011 — Caminho de migrations (Prisma + `supabase/`)

**Problema:** O plano pede `supabase/migrations`. O deploy atual usa `prisma migrate deploy`.

**Fonte:** Plano de execução × README da API.

**Impacto:** Aplicar os dois no mesmo banco duplicaria DDL.

**Decisão:** Prisma permanece o caminho de apply (`pnpm exec prisma migrate deploy`). `supabase/migrations` contém o **mesmo SQL** como artefato oficial. Não executar `supabase db push` e `prisma migrate deploy` no mesmo banco.

**Motivo:** Preservar o fluxo de deploy existente e versionar o SQL pedido.

---

## D-012 — Colunas extras do schema antigo

**Problema:** `profiles.avatar_url`, `updated_at`, `accounts.currency`, `accounts.type`, `transactions.notes`, `transactions.deleted_at`, `transactions.user_id` não estão no modelo físico oficial. Transação oficial não tem `id_usuario` (acesso via carteira).

**Fonte:** Prisma antigo × Modelo Físico 2.0.

**Impacto:** Perda de avatar, notas, soft-delete dedicado, filtro direto por `user_id` em `transacao`.

**Decisão:** Seguir o físico: sem `avatar_url` / `notes` / `deleted_at` / `user_id` em `transacao`. Isolamento via `carteira.id_usuario`. `ativo` substitui arquivo/soft-delete. `descricao` da carteira absorve o que era tipo/moeda apenas como texto livre se necessário; moeda de trabalho fica na tabela `moeda`.

**Motivo:** Alinhamento ao modelo oficial escolhido (renomear para português).

---

## D-013 — Conteúdo educativo e papel Administrador

**Problema:** Há ator Administrador e UC Gerenciar Conteúdo Educativo. O JWT atual não carrega role de admin.

**Fonte:** Caso de Uso 2.0 × `JwtStrategy`.

**Impacto:** Escrita em `conteudo` não pode ser autorizada por role nesta etapa.

**Decisão:** RLS: `SELECT` autenticado em `conteudo`; INSERT/UPDATE/DELETE apenas via `service_role`. Papel admin fica pendente.

**Motivo:** Não inventar RBAC não documentado no código de Auth.

---

## D-014 — Informações públicas (moedas/taxas) antes do login

**Problema:** BPMN mostra visualização pública de taxas/moedas antes da autenticação.

**Fonte:** BPMN 2.0.

**Impacto:** RLS padrão “só o dono” bloquearia leitura anônima.

**Decisão:** `moeda` e `taxa` com `SELECT` para `anon` e `authenticated`; escrita apenas `service_role`.

**Motivo:** Requisito explícito do fluxo BPMN.
