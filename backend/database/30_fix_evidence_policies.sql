-- =====================================================
-- 30_fix_evidence_policies.sql
-- Corrige permissões para salvar evidências:
--   1. RLS policies na tabela key_results (SELECT/UPDATE)
--   2. Storage policies no bucket "evidencias" (upload/download)
-- =====================================================

-- =====================================================
-- PARTE 1: RLS policies para key_results
-- =====================================================

-- Garantir RLS ativo
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas (se existirem)
DROP POLICY IF EXISTS "key_results_select" ON key_results;
DROP POLICY IF EXISTS "key_results_insert" ON key_results;
DROP POLICY IF EXISTS "key_results_update" ON key_results;
DROP POLICY IF EXISTS "key_results_delete" ON key_results;

-- Também limpar possíveis nomes antigos
DROP POLICY IF EXISTS "Authenticated users can read key_results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can insert key_results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can update key_results" ON key_results;
DROP POLICY IF EXISTS "Authenticated users can delete key_results" ON key_results;
DROP POLICY IF EXISTS "key_results_select_policy" ON key_results;
DROP POLICY IF EXISTS "key_results_insert_policy" ON key_results;
DROP POLICY IF EXISTS "key_results_update_policy" ON key_results;
DROP POLICY IF EXISTS "key_results_delete_policy" ON key_results;

-- SELECT: todos autenticados podem ler
CREATE POLICY "key_results_select" ON key_results
    FOR SELECT TO authenticated USING (true);

-- INSERT: todos autenticados podem criar
CREATE POLICY "key_results_insert" ON key_results
    FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: todos autenticados podem atualizar
CREATE POLICY "key_results_update" ON key_results
    FOR UPDATE TO authenticated USING (true);

-- DELETE: todos autenticados podem deletar
CREATE POLICY "key_results_delete" ON key_results
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- PARTE 2: Storage policies para bucket "evidencias"
-- =====================================================

-- Criar o bucket se não existir (public = false para segurança)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', false)
ON CONFLICT (id) DO NOTHING;

-- Limpar policies antigas do bucket
DROP POLICY IF EXISTS "evidencias_select" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_insert" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_update" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete evidencias" ON storage.objects;

-- SELECT: autenticados podem ler/baixar arquivos do bucket evidencias
CREATE POLICY "evidencias_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'evidencias');

-- INSERT: autenticados podem fazer upload no bucket evidencias
CREATE POLICY "evidencias_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'evidencias');

-- UPDATE: autenticados podem atualizar arquivos no bucket evidencias
CREATE POLICY "evidencias_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'evidencias');

-- DELETE: autenticados podem deletar arquivos do bucket evidencias
CREATE POLICY "evidencias_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'evidencias');
