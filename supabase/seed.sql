-- Reference seed only. No user financial data.
-- Apply after migrations (Prisma or supabase). Safe to re-run.

INSERT INTO moeda (id_moeda, codigo, nome, simbolo, taxa_para_real, data_atualizacao)
VALUES (gen_random_uuid(), 'BRL', 'Real brasileiro', 'R$', 1, CURRENT_TIMESTAMP)
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome,
    simbolo = EXCLUDED.simbolo,
    taxa_para_real = EXCLUDED.taxa_para_real,
    data_atualizacao = CURRENT_TIMESTAMP;
