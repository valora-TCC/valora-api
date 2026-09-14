-- Mirror of prisma/migrations/20260913000000_open_finance_belvo (D-011: do not double-apply)

CREATE TYPE "OrigemTransacao" AS ENUM ('MANUAL', 'OPEN_FINANCE');
CREATE TYPE "StatusConexaoOpenFinance" AS ENUM ('PENDING', 'ACTIVE', 'SYNCING', 'ERROR', 'DISCONNECTED');
CREATE TYPE "StatusEventoSyncOpenFinance" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "cpf" VARCHAR(11);
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_cpf_key" ON "usuario"("cpf");

ALTER TABLE "transacao"
  ADD COLUMN IF NOT EXISTS "origem" "OrigemTransacao" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "id_externo" TEXT,
  ADD COLUMN IF NOT EXISTS "provedor" VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS "transacao_id_externo_key" ON "transacao"("id_externo");
CREATE INDEX IF NOT EXISTS "transacao_origem_idx" ON "transacao"("origem");

CREATE TABLE IF NOT EXISTS "conexao_open_finance" (
  "id_conexao" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_usuario" UUID NOT NULL,
  "belvo_link_id" TEXT NOT NULL,
  "instituicao" TEXT NOT NULL,
  "status" "StatusConexaoOpenFinance" NOT NULL DEFAULT 'PENDING',
  "ultima_sincronizacao" TIMESTAMPTZ(6),
  "ultimo_erro" TEXT,
  "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_atualizacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conexao_open_finance_pkey" PRIMARY KEY ("id_conexao"),
  CONSTRAINT "conexao_open_finance_belvo_link_id_key" UNIQUE ("belvo_link_id"),
  CONSTRAINT "conexao_open_finance_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "conexao_open_finance_id_usuario_idx" ON "conexao_open_finance"("id_usuario");

ALTER TABLE "carteira"
  ADD COLUMN IF NOT EXISTS "id_conexao_of" UUID,
  ADD COLUMN IF NOT EXISTS "id_conta_externa" TEXT,
  ADD COLUMN IF NOT EXISTS "instituicao_of" TEXT,
  ADD COLUMN IF NOT EXISTS "tipo_conta_of" TEXT,
  ADD COLUMN IF NOT EXISTS "moeda_of" VARCHAR(3);

CREATE UNIQUE INDEX IF NOT EXISTS "carteira_id_conta_externa_key" ON "carteira"("id_conta_externa");
CREATE INDEX IF NOT EXISTS "carteira_id_conexao_of_idx" ON "carteira"("id_conexao_of");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'carteira_id_conexao_of_fkey'
  ) THEN
    ALTER TABLE "carteira"
      ADD CONSTRAINT "carteira_id_conexao_of_fkey"
      FOREIGN KEY ("id_conexao_of") REFERENCES "conexao_open_finance"("id_conexao")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "evento_sync_open_finance" (
  "id_evento" UUID NOT NULL DEFAULT gen_random_uuid(),
  "id_conexao" UUID,
  "webhook_id" TEXT,
  "event_key" TEXT NOT NULL,
  "webhook_type" TEXT,
  "webhook_code" TEXT,
  "status" "StatusEventoSyncOpenFinance" NOT NULL DEFAULT 'RECEIVED',
  "detalhe" TEXT,
  "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_processamento" TIMESTAMPTZ(6),
  CONSTRAINT "evento_sync_open_finance_pkey" PRIMARY KEY ("id_evento"),
  CONSTRAINT "evento_sync_open_finance_event_key_key" UNIQUE ("event_key"),
  CONSTRAINT "evento_sync_open_finance_id_conexao_fkey"
    FOREIGN KEY ("id_conexao") REFERENCES "conexao_open_finance"("id_conexao")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "evento_sync_open_finance_id_conexao_idx" ON "evento_sync_open_finance"("id_conexao");
CREATE INDEX IF NOT EXISTS "evento_sync_open_finance_webhook_id_idx" ON "evento_sync_open_finance"("webhook_id");

ALTER TABLE "conexao_open_finance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evento_sync_open_finance" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conexao_of_select_own ON conexao_open_finance;
DROP POLICY IF EXISTS conexao_of_insert_own ON conexao_open_finance;
DROP POLICY IF EXISTS conexao_of_update_own ON conexao_open_finance;
DROP POLICY IF EXISTS conexao_of_delete_own ON conexao_open_finance;

CREATE POLICY conexao_of_select_own ON conexao_open_finance
  FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY conexao_of_insert_own ON conexao_open_finance
  FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY conexao_of_update_own ON conexao_open_finance
  FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY conexao_of_delete_own ON conexao_open_finance
  FOR DELETE USING (auth.uid() = id_usuario);

DROP POLICY IF EXISTS evento_sync_of_select_own ON evento_sync_open_finance;
DROP POLICY IF EXISTS evento_sync_of_insert_own ON evento_sync_open_finance;
DROP POLICY IF EXISTS evento_sync_of_update_own ON evento_sync_open_finance;
DROP POLICY IF EXISTS evento_sync_of_delete_own ON evento_sync_open_finance;

CREATE POLICY evento_sync_of_select_own ON evento_sync_open_finance
  FOR SELECT USING (
    id_conexao IS NULL
    OR EXISTS (
      SELECT 1 FROM conexao_open_finance c
      WHERE c.id_conexao = evento_sync_open_finance.id_conexao
        AND c.id_usuario = auth.uid()
    )
  );
CREATE POLICY evento_sync_of_insert_own ON evento_sync_open_finance
  FOR INSERT WITH CHECK (
    id_conexao IS NULL
    OR EXISTS (
      SELECT 1 FROM conexao_open_finance c
      WHERE c.id_conexao = evento_sync_open_finance.id_conexao
        AND c.id_usuario = auth.uid()
    )
  );
CREATE POLICY evento_sync_of_update_own ON evento_sync_open_finance
  FOR UPDATE USING (
    id_conexao IS NULL
    OR EXISTS (
      SELECT 1 FROM conexao_open_finance c
      WHERE c.id_conexao = evento_sync_open_finance.id_conexao
        AND c.id_usuario = auth.uid()
    )
  )
  WITH CHECK (
    id_conexao IS NULL
    OR EXISTS (
      SELECT 1 FROM conexao_open_finance c
      WHERE c.id_conexao = evento_sync_open_finance.id_conexao
        AND c.id_usuario = auth.uid()
    )
  );
CREATE POLICY evento_sync_of_delete_own ON evento_sync_open_finance
  FOR DELETE USING (
    id_conexao IS NULL
    OR EXISTS (
      SELECT 1 FROM conexao_open_finance c
      WHERE c.id_conexao = evento_sync_open_finance.id_conexao
        AND c.id_usuario = auth.uid()
    )
  );
