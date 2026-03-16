-- =====================================================
-- 29_initiatives_rls_policies.sql
-- RLS Policies para tabelas de iniciativas
-- Permite leitura para todos autenticados,
-- escrita (insert/update/delete) para todos autenticados
-- =====================================================

-- 1. Garantir RLS ativo
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_responsible_users ENABLE ROW LEVEL SECURITY;

-- 2. Limpar policies antigas (se existirem)
DROP POLICY IF EXISTS "initiatives_select" ON initiatives;
DROP POLICY IF EXISTS "initiatives_insert" ON initiatives;
DROP POLICY IF EXISTS "initiatives_update" ON initiatives;
DROP POLICY IF EXISTS "initiatives_delete" ON initiatives;

DROP POLICY IF EXISTS "initiative_responsible_users_select" ON initiative_responsible_users;
DROP POLICY IF EXISTS "initiative_responsible_users_insert" ON initiative_responsible_users;
DROP POLICY IF EXISTS "initiative_responsible_users_update" ON initiative_responsible_users;
DROP POLICY IF EXISTS "initiative_responsible_users_delete" ON initiative_responsible_users;

-- 3. Policies para initiatives
-- SELECT: todos autenticados podem ler
CREATE POLICY "initiatives_select" ON initiatives
    FOR SELECT TO authenticated USING (true);

-- INSERT: todos autenticados podem criar iniciativas
CREATE POLICY "initiatives_insert" ON initiatives
    FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: todos autenticados podem atualizar
CREATE POLICY "initiatives_update" ON initiatives
    FOR UPDATE TO authenticated USING (true);

-- DELETE: todos autenticados podem deletar
CREATE POLICY "initiatives_delete" ON initiatives
    FOR DELETE TO authenticated USING (true);

-- 4. Policies para initiative_responsible_users (junction table)
CREATE POLICY "initiative_responsible_users_select" ON initiative_responsible_users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "initiative_responsible_users_insert" ON initiative_responsible_users
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "initiative_responsible_users_update" ON initiative_responsible_users
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "initiative_responsible_users_delete" ON initiative_responsible_users
    FOR DELETE TO authenticated USING (true);
