-- Align schema to official Portuguese physical model (DER / Modelo Físico 2.0).
-- Do not run this together with supabase db push on a database that already applied
-- the same SQL via `prisma migrate deploy`.

-- ---------------------------------------------------------------------------
-- 1. Drop existing RLS policies (recreated below with new names/tables)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON "profiles";
DROP POLICY IF EXISTS "profiles_insert_own" ON "profiles";
DROP POLICY IF EXISTS "profiles_update_own" ON "profiles";
DROP POLICY IF EXISTS "accounts_select_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_insert_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_update_own" ON "accounts";
DROP POLICY IF EXISTS "accounts_delete_own" ON "accounts";
DROP POLICY IF EXISTS "categories_select_own" ON "categories";
DROP POLICY IF EXISTS "categories_insert_own" ON "categories";
DROP POLICY IF EXISTS "categories_update_own" ON "categories";
DROP POLICY IF EXISTS "categories_delete_own" ON "categories";
DROP POLICY IF EXISTS "transactions_select_own" ON "transactions";
DROP POLICY IF EXISTS "transactions_insert_own" ON "transactions";
DROP POLICY IF EXISTS "transactions_update_own" ON "transactions";
DROP POLICY IF EXISTS "transactions_delete_own" ON "transactions";
DROP POLICY IF EXISTS "investments_select_own" ON "investments";
DROP POLICY IF EXISTS "investments_insert_own" ON "investments";
DROP POLICY IF EXISTS "investments_update_own" ON "investments";
DROP POLICY IF EXISTS "investments_delete_own" ON "investments";
DROP POLICY IF EXISTS "investment_transactions_select_own" ON "investment_transactions";
DROP POLICY IF EXISTS "investment_transactions_insert_own" ON "investment_transactions";
DROP POLICY IF EXISTS "investment_transactions_update_own" ON "investment_transactions";
DROP POLICY IF EXISTS "investment_transactions_delete_own" ON "investment_transactions";

-- ---------------------------------------------------------------------------
-- 2. Enum + data conversion while old table names still exist
-- ---------------------------------------------------------------------------
CREATE TYPE "TipoFinanceiro" AS ENUM ('RECEITA', 'DESPESA');

DROP INDEX IF EXISTS "categories_user_id_name_kind_key";

ALTER TABLE "categories" ADD COLUMN "tipo" "TipoFinanceiro";
UPDATE "categories"
SET "tipo" = CASE WHEN "kind"::text = 'income' THEN 'RECEITA'::"TipoFinanceiro" ELSE 'DESPESA'::"TipoFinanceiro" END;
ALTER TABLE "categories" ALTER COLUMN "tipo" SET NOT NULL;
ALTER TABLE "categories" DROP COLUMN "kind";

ALTER TABLE "transactions" ADD COLUMN "tipo" "TipoFinanceiro";
UPDATE "transactions"
SET "tipo" = CASE WHEN "type"::text = 'income' THEN 'RECEITA'::"TipoFinanceiro" ELSE 'DESPESA'::"TipoFinanceiro" END;
ALTER TABLE "transactions" ALTER COLUMN "tipo" SET NOT NULL;
ALTER TABLE "transactions" DROP COLUMN "type";

INSERT INTO "categories" ("id", "user_id", "name", "tipo", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", 'Geral', 'DESPESA'::"TipoFinanceiro", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "profiles" p
WHERE EXISTS (
  SELECT 1 FROM "transactions" t WHERE t."user_id" = p."id" AND t."category_id" IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM "categories" c
  WHERE c."user_id" = p."id" AND c."name" = 'Geral' AND c."tipo" = 'DESPESA'::"TipoFinanceiro"
);

UPDATE "transactions" t
SET "category_id" = (
  SELECT c."id"
  FROM "categories" c
  WHERE c."user_id" = t."user_id"
  ORDER BY CASE WHEN c."tipo" = t."tipo" THEN 0 ELSE 1 END, c."created_at"
  LIMIT 1
)
WHERE t."category_id" IS NULL;

ALTER TABLE "transactions" ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "accounts" ADD COLUMN "saldo_atual" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "accounts" ADD COLUMN "descricao" TEXT;
ALTER TABLE "accounts" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
UPDATE "accounts" SET "ativo" = NOT "is_archived";
UPDATE "accounts" a
SET "saldo_atual" = a."initial_balance" + COALESCE((
  SELECT SUM(CASE WHEN t."tipo" = 'RECEITA'::"TipoFinanceiro" THEN t."amount" ELSE -t."amount" END)
  FROM "transactions" t
  WHERE t."account_id" = a."id" AND t."deleted_at" IS NULL
), 0);

ALTER TABLE "transactions" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
UPDATE "transactions" SET "ativo" = ("deleted_at" IS NULL);

ALTER TABLE "categories" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "profiles" ADD COLUMN "email" TEXT;
ALTER TABLE "profiles" ADD COLUMN "data_nascimento" DATE;
ALTER TABLE "profiles" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
UPDATE "profiles" SET "full_name" = COALESCE(NULLIF(BTRIM("full_name"), ''), 'Usuario');
ALTER TABLE "profiles" ALTER COLUMN "full_name" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Drop FKs before rename
-- ---------------------------------------------------------------------------
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_id_fkey";
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_fkey";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_user_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_user_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_account_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_fkey";
ALTER TABLE "investments" DROP CONSTRAINT IF EXISTS "investments_user_id_fkey";
ALTER TABLE "investment_transactions" DROP CONSTRAINT IF EXISTS "investment_transactions_user_id_fkey";
ALTER TABLE "investment_transactions" DROP CONSTRAINT IF EXISTS "investment_transactions_investment_id_fkey";

DROP INDEX IF EXISTS "accounts_user_id_idx";
DROP INDEX IF EXISTS "categories_user_id_idx";
DROP INDEX IF EXISTS "transactions_user_id_occurred_at_idx";
DROP INDEX IF EXISTS "transactions_account_id_idx";
DROP INDEX IF EXISTS "transactions_category_id_idx";

-- ---------------------------------------------------------------------------
-- 4. Rename tables and columns
-- ---------------------------------------------------------------------------
ALTER TABLE "profiles" RENAME TO usuario;
ALTER TABLE usuario RENAME COLUMN "id" TO id_usuario;
ALTER TABLE usuario RENAME COLUMN "full_name" TO nome;
ALTER TABLE usuario RENAME COLUMN "created_at" TO data_criacao;
ALTER TABLE usuario DROP COLUMN "avatar_url";
ALTER TABLE usuario DROP COLUMN "updated_at";
ALTER TABLE usuario RENAME CONSTRAINT "profiles_pkey" TO usuario_pkey;

ALTER TABLE "accounts" RENAME TO carteira;
ALTER TABLE carteira RENAME COLUMN "id" TO id_carteira;
ALTER TABLE carteira RENAME COLUMN "user_id" TO id_usuario;
ALTER TABLE carteira RENAME COLUMN "name" TO nome;
ALTER TABLE carteira RENAME COLUMN "created_at" TO data_criacao;
ALTER TABLE carteira DROP COLUMN "type";
ALTER TABLE carteira DROP COLUMN "currency";
ALTER TABLE carteira DROP COLUMN "initial_balance";
ALTER TABLE carteira DROP COLUMN "is_archived";
ALTER TABLE carteira DROP COLUMN "updated_at";
ALTER TABLE carteira RENAME CONSTRAINT "accounts_pkey" TO carteira_pkey;

ALTER TABLE "categories" RENAME TO categoria;
ALTER TABLE categoria RENAME COLUMN "id" TO id_categoria;
ALTER TABLE categoria RENAME COLUMN "user_id" TO id_usuario;
ALTER TABLE categoria RENAME COLUMN "name" TO nome;
ALTER TABLE categoria RENAME COLUMN "color" TO cor;
ALTER TABLE categoria RENAME COLUMN "icon" TO icone;
ALTER TABLE categoria RENAME COLUMN "created_at" TO data_criacao;
ALTER TABLE categoria DROP COLUMN "updated_at";
ALTER TABLE categoria RENAME CONSTRAINT "categories_pkey" TO categoria_pkey;

ALTER TABLE "transactions" RENAME TO transacao;
ALTER TABLE transacao RENAME COLUMN "id" TO id_transacao;
ALTER TABLE transacao RENAME COLUMN "account_id" TO id_carteira;
ALTER TABLE transacao RENAME COLUMN "category_id" TO id_categoria;
ALTER TABLE transacao RENAME COLUMN "amount" TO valor;
ALTER TABLE transacao RENAME COLUMN "occurred_at" TO data_transacao;
ALTER TABLE transacao RENAME COLUMN "description" TO descricao;
ALTER TABLE transacao DROP COLUMN "user_id";
ALTER TABLE transacao DROP COLUMN "notes";
ALTER TABLE transacao DROP COLUMN "deleted_at";
ALTER TABLE transacao DROP COLUMN "created_at";
ALTER TABLE transacao DROP COLUMN "updated_at";
ALTER TABLE transacao ADD COLUMN forma_pagamento TEXT;
ALTER TABLE transacao RENAME CONSTRAINT "transactions_pkey" TO transacao_pkey;
ALTER TABLE transacao RENAME CONSTRAINT "transactions_amount_positive" TO transacao_valor_positivo;

-- ---------------------------------------------------------------------------
-- 5. Recreate FKs and indexes for renamed tables
-- ---------------------------------------------------------------------------
ALTER TABLE usuario
  ADD CONSTRAINT usuario_id_usuario_fkey
  FOREIGN KEY (id_usuario) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE carteira
  ADD CONSTRAINT carteira_id_usuario_fkey
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE categoria
  ADD CONSTRAINT categoria_id_usuario_fkey
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE transacao
  ADD CONSTRAINT transacao_id_carteira_fkey
  FOREIGN KEY (id_carteira) REFERENCES carteira(id_carteira) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE transacao
  ADD CONSTRAINT transacao_id_categoria_fkey
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE investments
  ADD CONSTRAINT investments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE investment_transactions
  ADD CONSTRAINT investment_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE investment_transactions
  ADD CONSTRAINT investment_transactions_investment_id_fkey
  FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX usuario_email_key ON usuario(email);
CREATE INDEX carteira_id_usuario_idx ON carteira(id_usuario);
CREATE UNIQUE INDEX categoria_id_usuario_nome_tipo_key ON categoria(id_usuario, nome, tipo);
CREATE INDEX categoria_id_usuario_idx ON categoria(id_usuario);
CREATE INDEX transacao_id_carteira_idx ON transacao(id_carteira);
CREATE INDEX transacao_id_categoria_idx ON transacao(id_categoria);
CREATE INDEX transacao_data_transacao_idx ON transacao(data_transacao DESC);

DROP TYPE IF EXISTS "AccountType";
DROP TYPE IF EXISTS "CategoryKind";
DROP TYPE IF EXISTS "TransactionType";

-- ---------------------------------------------------------------------------
-- 6. New official tables
-- ---------------------------------------------------------------------------
CREATE TABLE meta (
  id_meta UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_objetivo DECIMAL(18,2) NOT NULL,
  valor_atual DECIMAL(18,2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT meta_pkey PRIMARY KEY (id_meta),
  CONSTRAINT meta_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE progresso_meta (
  id_progresso UUID NOT NULL DEFAULT gen_random_uuid(),
  id_meta UUID NOT NULL,
  data DATE NOT NULL,
  valor DECIMAL(18,2) NOT NULL,
  observacao TEXT,
  CONSTRAINT progresso_meta_pkey PRIMARY KEY (id_progresso),
  CONSTRAINT progresso_meta_id_meta_fkey FOREIGN KEY (id_meta) REFERENCES meta(id_meta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE orcamento (
  id_orcamento UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  nome TEXT NOT NULL,
  valor_total DECIMAL(18,2) NOT NULL,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_criacao TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orcamento_pkey PRIMARY KEY (id_orcamento),
  CONSTRAINT orcamento_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT orcamento_mes_check CHECK (mes >= 1 AND mes <= 12)
);

CREATE TABLE orcamento_categoria (
  id_orc_categoria UUID NOT NULL DEFAULT gen_random_uuid(),
  id_orcamento UUID NOT NULL,
  id_categoria UUID NOT NULL,
  limite DECIMAL(18,2) NOT NULL,
  valor_gasto DECIMAL(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT orcamento_categoria_pkey PRIMARY KEY (id_orc_categoria),
  CONSTRAINT orcamento_categoria_id_orcamento_fkey FOREIGN KEY (id_orcamento) REFERENCES orcamento(id_orcamento) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT orcamento_categoria_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE notificacao (
  id_notificacao UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT,
  data_envio TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lida BOOLEAN NOT NULL DEFAULT false,
  data_leitura TIMESTAMPTZ(6),
  referencia_id UUID,
  referencia_tipo TEXT,
  CONSTRAINT notificacao_pkey PRIMARY KEY (id_notificacao),
  CONSTRAINT notificacao_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE simulacao_juros (
  id_simulacao UUID NOT NULL DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  nome TEXT NOT NULL,
  valor_inicial DECIMAL(18,2) NOT NULL,
  taxa_juros DECIMAL(18,6) NOT NULL,
  tipo_taxa TEXT NOT NULL,
  tempo_meses INTEGER NOT NULL,
  resultado_final DECIMAL(18,2) NOT NULL,
  data_simulacao TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT simulacao_juros_pkey PRIMARY KEY (id_simulacao),
  CONSTRAINT simulacao_juros_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE conteudo (
  id_conteudo UUID NOT NULL DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  url TEXT,
  capa_url TEXT,
  data_publicacao TIMESTAMPTZ(6),
  ativo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT conteudo_pkey PRIMARY KEY (id_conteudo)
);

CREATE TABLE usuario_conteudo (
  id_usuario UUID NOT NULL,
  id_conteudo UUID NOT NULL,
  data_acesso TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concluido BOOLEAN NOT NULL DEFAULT false,
  progresso DECIMAL(5,2) NOT NULL DEFAULT 0,
  CONSTRAINT usuario_conteudo_pkey PRIMARY KEY (id_usuario, id_conteudo),
  CONSTRAINT usuario_conteudo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT usuario_conteudo_id_conteudo_fkey FOREIGN KEY (id_conteudo) REFERENCES conteudo(id_conteudo) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE moeda (
  id_moeda UUID NOT NULL DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  simbolo TEXT NOT NULL,
  taxa_para_real DECIMAL(18,8) NOT NULL,
  data_atualizacao TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moeda_pkey PRIMARY KEY (id_moeda),
  CONSTRAINT moeda_codigo_key UNIQUE (codigo)
);

CREATE TABLE taxa (
  id_taxa UUID NOT NULL DEFAULT gen_random_uuid(),
  id_moeda UUID NOT NULL,
  nome TEXT NOT NULL,
  valor_percentual DECIMAL(18,6) NOT NULL,
  data_atualizacao TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fonte TEXT,
  CONSTRAINT taxa_pkey PRIMARY KEY (id_taxa),
  CONSTRAINT taxa_id_moeda_fkey FOREIGN KEY (id_moeda) REFERENCES moeda(id_moeda) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX meta_id_usuario_idx ON meta(id_usuario);
CREATE INDEX progresso_meta_id_meta_idx ON progresso_meta(id_meta);
CREATE INDEX orcamento_id_usuario_idx ON orcamento(id_usuario);
CREATE INDEX orcamento_id_usuario_ano_mes_idx ON orcamento(id_usuario, ano, mes);
CREATE INDEX orcamento_categoria_id_orcamento_idx ON orcamento_categoria(id_orcamento);
CREATE INDEX orcamento_categoria_id_categoria_idx ON orcamento_categoria(id_categoria);
CREATE INDEX notificacao_id_usuario_idx ON notificacao(id_usuario);
CREATE INDEX simulacao_juros_id_usuario_idx ON simulacao_juros(id_usuario);
CREATE INDEX taxa_id_moeda_idx ON taxa(id_moeda);

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE carteira ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresso_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_juros ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_conteudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE moeda ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxa ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_select_own ON usuario FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY usuario_insert_own ON usuario FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY usuario_update_own ON usuario FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY carteira_select_own ON carteira FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY carteira_insert_own ON carteira FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY carteira_update_own ON carteira FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY carteira_delete_own ON carteira FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY categoria_select_own ON categoria FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY categoria_insert_own ON categoria FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY categoria_update_own ON categoria FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY categoria_delete_own ON categoria FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY transacao_select_own ON transacao FOR SELECT
  USING (EXISTS (SELECT 1 FROM carteira c WHERE c.id_carteira = transacao.id_carteira AND c.id_usuario = auth.uid()));
CREATE POLICY transacao_insert_own ON transacao FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM carteira c WHERE c.id_carteira = transacao.id_carteira AND c.id_usuario = auth.uid()));
CREATE POLICY transacao_update_own ON transacao FOR UPDATE
  USING (EXISTS (SELECT 1 FROM carteira c WHERE c.id_carteira = transacao.id_carteira AND c.id_usuario = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM carteira c WHERE c.id_carteira = transacao.id_carteira AND c.id_usuario = auth.uid()));
CREATE POLICY transacao_delete_own ON transacao FOR DELETE
  USING (EXISTS (SELECT 1 FROM carteira c WHERE c.id_carteira = transacao.id_carteira AND c.id_usuario = auth.uid()));

CREATE POLICY meta_select_own ON meta FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY meta_insert_own ON meta FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY meta_update_own ON meta FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY meta_delete_own ON meta FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY progresso_meta_select_own ON progresso_meta FOR SELECT
  USING (EXISTS (SELECT 1 FROM meta m WHERE m.id_meta = progresso_meta.id_meta AND m.id_usuario = auth.uid()));
CREATE POLICY progresso_meta_insert_own ON progresso_meta FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM meta m WHERE m.id_meta = progresso_meta.id_meta AND m.id_usuario = auth.uid()));
CREATE POLICY progresso_meta_update_own ON progresso_meta FOR UPDATE
  USING (EXISTS (SELECT 1 FROM meta m WHERE m.id_meta = progresso_meta.id_meta AND m.id_usuario = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meta m WHERE m.id_meta = progresso_meta.id_meta AND m.id_usuario = auth.uid()));
CREATE POLICY progresso_meta_delete_own ON progresso_meta FOR DELETE
  USING (EXISTS (SELECT 1 FROM meta m WHERE m.id_meta = progresso_meta.id_meta AND m.id_usuario = auth.uid()));

CREATE POLICY orcamento_select_own ON orcamento FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY orcamento_insert_own ON orcamento FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY orcamento_update_own ON orcamento FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY orcamento_delete_own ON orcamento FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY orcamento_categoria_select_own ON orcamento_categoria FOR SELECT
  USING (EXISTS (SELECT 1 FROM orcamento o WHERE o.id_orcamento = orcamento_categoria.id_orcamento AND o.id_usuario = auth.uid()));
CREATE POLICY orcamento_categoria_insert_own ON orcamento_categoria FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orcamento o WHERE o.id_orcamento = orcamento_categoria.id_orcamento AND o.id_usuario = auth.uid()));
CREATE POLICY orcamento_categoria_update_own ON orcamento_categoria FOR UPDATE
  USING (EXISTS (SELECT 1 FROM orcamento o WHERE o.id_orcamento = orcamento_categoria.id_orcamento AND o.id_usuario = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM orcamento o WHERE o.id_orcamento = orcamento_categoria.id_orcamento AND o.id_usuario = auth.uid()));
CREATE POLICY orcamento_categoria_delete_own ON orcamento_categoria FOR DELETE
  USING (EXISTS (SELECT 1 FROM orcamento o WHERE o.id_orcamento = orcamento_categoria.id_orcamento AND o.id_usuario = auth.uid()));

CREATE POLICY notificacao_select_own ON notificacao FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY notificacao_insert_own ON notificacao FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY notificacao_update_own ON notificacao FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY notificacao_delete_own ON notificacao FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY simulacao_juros_select_own ON simulacao_juros FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY simulacao_juros_insert_own ON simulacao_juros FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY simulacao_juros_update_own ON simulacao_juros FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY simulacao_juros_delete_own ON simulacao_juros FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY conteudo_select_authenticated ON conteudo FOR SELECT TO authenticated USING (true);

CREATE POLICY usuario_conteudo_select_own ON usuario_conteudo FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY usuario_conteudo_insert_own ON usuario_conteudo FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY usuario_conteudo_update_own ON usuario_conteudo FOR UPDATE USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY usuario_conteudo_delete_own ON usuario_conteudo FOR DELETE USING (auth.uid() = id_usuario);

CREATE POLICY moeda_select_public ON moeda FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY taxa_select_public ON taxa FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY investments_select_own ON investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY investments_insert_own ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY investments_update_own ON investments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY investments_delete_own ON investments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY investment_transactions_select_own ON investment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY investment_transactions_insert_own ON investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_transactions_update_own ON investment_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_transactions_delete_own ON investment_transactions FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (id_usuario, nome, email, data_criacao, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Usuario'),
    NEW.email,
    NOW(),
    true
  )
  ON CONFLICT (id_usuario) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.aplicar_saldo_transacao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  delta DECIMAL(18,2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ativo THEN
      delta := CASE WHEN NEW.tipo = 'RECEITA' THEN NEW.valor ELSE -NEW.valor END;
      UPDATE carteira SET saldo_atual = saldo_atual + delta WHERE id_carteira = NEW.id_carteira;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.ativo THEN
      delta := CASE WHEN OLD.tipo = 'RECEITA' THEN OLD.valor ELSE -OLD.valor END;
      UPDATE carteira SET saldo_atual = saldo_atual - delta WHERE id_carteira = OLD.id_carteira;
    END IF;
    IF NEW.ativo THEN
      delta := CASE WHEN NEW.tipo = 'RECEITA' THEN NEW.valor ELSE -NEW.valor END;
      UPDATE carteira SET saldo_atual = saldo_atual + delta WHERE id_carteira = NEW.id_carteira;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.ativo THEN
      delta := CASE WHEN OLD.tipo = 'RECEITA' THEN OLD.valor ELSE -OLD.valor END;
      UPDATE carteira SET saldo_atual = saldo_atual - delta WHERE id_carteira = OLD.id_carteira;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS transacao_saldo ON transacao;
CREATE TRIGGER transacao_saldo
  AFTER INSERT OR UPDATE OR DELETE ON transacao
  FOR EACH ROW EXECUTE PROCEDURE public.aplicar_saldo_transacao();
