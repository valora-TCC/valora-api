-- Mirror of prisma/migrations/20260916230000_clear_all_data_for_demo (do not double-apply)
-- Demo reset: remove all rows, keep schema/tables.
-- WARNING: destructive — do not apply on environments with data you need to keep.

TRUNCATE TABLE
  "investment_transactions",
  "investments",
  "usuario_conteudo",
  "progresso_meta",
  "orcamento_categoria",
  "evento_sync_open_finance",
  "transacao",
  "conexao_open_finance",
  "meta",
  "orcamento",
  "notificacao",
  "simulacao_juros",
  "carteira",
  "categoria",
  "moeda",
  "taxa",
  "usuario"
RESTART IDENTITY CASCADE;
