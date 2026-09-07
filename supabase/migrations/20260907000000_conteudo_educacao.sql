-- Mirror: extend conteudo for educational trails
ALTER TABLE "conteudo" ADD COLUMN IF NOT EXISTS "corpo" TEXT;
ALTER TABLE "conteudo" ADD COLUMN IF NOT EXISTS "nivel" TEXT;
ALTER TABLE "conteudo" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "conteudo" ADD COLUMN IF NOT EXISTS "ordem" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "conteudo_slug_key" ON "conteudo"("slug");
CREATE INDEX IF NOT EXISTS "conteudo_nivel_idx" ON "conteudo"("nivel");
CREATE INDEX IF NOT EXISTS "conteudo_ativo_ordem_idx" ON "conteudo"("ativo", "ordem");
