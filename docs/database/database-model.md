# Modelo de banco (PostgreSQL / Supabase)

Adaptação do Modelo Físico 2.0 e do DER 2.0. Decisões de conversão: [architecture/diagram-decisions.md](../architecture/diagram-decisions.md).

## Auth

| Conceito documental | Implementação |
|---|---|
| `usuario.senha` | Somente `auth.users` (Supabase Auth) |
| `usuario.id_usuario` | UUID = `auth.users.id` |
| `usuario.email` | UNIQUE em `usuario` (espelho); Auth é a fonte da credencial |
| Trigger | `handle_new_user`: INSERT em `usuario` após signup |

A API nunca recebe nem persiste senha.

## Tabelas oficiais

### usuario

Perfil de aplicação. PK `id_usuario` → `auth.users`. Campos: `nome`, `email` (unique), `data_nascimento` (DER), `data_criacao`, `ativo`. Sem senha.

### carteira

Carteiras do titular. `saldo_atual numeric(18,2)` atualizado por trigger em `transacao`. `ativo` no lugar de TINYINT status.

### categoria

Categorias por usuário. `tipo` ENUM `TipoFinanceiro` (`RECEITA`, `DESPESA`). `cor`, `icone`, `ativo`.

### transacao

Movimentação. FK obrigatória para `carteira` e `categoria`. `tipo` `TipoFinanceiro`. `valor > 0`. Sem `id_usuario` direto (isolamento via carteira). `forma_pagamento` é `text`.

### meta / progresso_meta

Metas do usuário e histórico de progresso.

### orcamento / orcamento_categoria

Orçamento mensal (`mes`, `ano`) e limites por categoria (`limite`, `valor_gasto`).

### notificacao

Notificações in-app. `referencia_id` / `referencia_tipo` para apontar outros registros. Sem data de vencimento na origem (D-010).

### simulacao_juros

Simulações persistidas. `tipo_taxa` em `text`.

### conteudo / usuario_conteudo

Conteúdo educativo (catálogo) e progresso do usuário (PK composta `id_usuario` + `id_conteudo`).

### moeda / taxa

Moedas (`codigo` unique) e taxas de referência. Leitura pública.

## Tabelas extra (não oficiais)

`investments`, `investment_transactions` — mantidas (D-008). FK para `usuario.id_usuario`.

## Relacionamentos

Conforme o DER: usuario 1:N carteira, categoria, meta, orcamento, notificacao, simulacao_juros, usuario_conteudo; carteira 1:N transacao; categoria 1:N transacao e orcamento_categoria; meta 1:N progresso_meta; orcamento 1:N orcamento_categoria; conteudo 1:N usuario_conteudo; moeda 1:N taxa.

## Índices

- PK em todas as tabelas
- UNIQUE `usuario.email`, `moeda.codigo`
- UNIQUE `categoria (id_usuario, nome, tipo)` (herdado do schema anterior; evita duplicata por usuário)
- Índices em FKs e `(id_usuario)` nas tabelas de dono
- `transacao` via `id_carteira` e `data_transacao`

## RLS

Políticas “own row” (`auth.uid()`) em: `usuario`, `carteira`, `categoria`, `transacao` (via carteira), `meta`, `progresso_meta` (via meta), `orcamento`, `orcamento_categoria` (via orcamento), `notificacao`, `simulacao_juros`, `usuario_conteudo`, `investments`, `investment_transactions`.

- `moeda`, `taxa`: SELECT `anon` + `authenticated`; escrita service role
- `conteudo`: SELECT `authenticated`; escrita service role

## Triggers e funções

| Nome | Evento | Efeito |
|---|---|---|
| `handle_new_user` | AFTER INSERT `auth.users` | Cria `usuario` |
| `aplicar_saldo_transacao` | INSERT/UPDATE/DELETE `transacao` | Ajusta `carteira.saldo_atual` |

Regra de saldo: RECEITA soma, DESPESA subtrai; linhas com `ativo = false` não afetam o saldo (reversão no UPDATE/DELETE).

## Tipos convertidos

| Documental | PostgreSQL |
|---|---|
| INT (id) | uuid |
| VARCHAR | varchar / text |
| DECIMAL | numeric(18,2) (percentuais até numeric(18,6/8)) |
| DATETIME | timestamptz |
| DATE | date |
| ENUM RECEITA/DESPESA | `"TipoFinanceiro"` |
| TINYINT(1) | boolean `ativo` |

## Apply

Apply: `pnpm exec prisma migrate deploy`. SQL espelhado em `supabase/migrations/`. Não aplicar Prisma e Supabase CLI no mesmo banco (D-011).
