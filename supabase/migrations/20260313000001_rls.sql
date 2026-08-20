-- Enable RLS
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investment_transactions" ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON "profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON "profiles" FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Accounts policies
CREATE POLICY "accounts_select_own" ON "accounts" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON "accounts" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON "accounts" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON "accounts" FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "categories_select_own" ON "categories" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON "categories" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON "categories" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON "categories" FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "transactions_select_own" ON "transactions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON "transactions" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON "transactions" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON "transactions" FOR DELETE USING (auth.uid() = user_id);

-- Investments policies
CREATE POLICY "investments_select_own" ON "investments" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "investments_insert_own" ON "investments" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investments_update_own" ON "investments" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investments_delete_own" ON "investments" FOR DELETE USING (auth.uid() = user_id);

-- Investment transactions policies
CREATE POLICY "investment_transactions_select_own" ON "investment_transactions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "investment_transactions_insert_own" ON "investment_transactions" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_transactions_update_own" ON "investment_transactions" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_transactions_delete_own" ON "investment_transactions" FOR DELETE USING (auth.uid() = user_id);
