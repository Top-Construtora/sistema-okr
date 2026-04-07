-- =====================================================
-- 34. Cria tabela system_settings para configurações do sistema
-- Usada pela página de Identidade Organizacional e futuras configs
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,
    value       JSONB,
    description TEXT DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'general',
    data_type   TEXT NOT NULL DEFAULT 'string',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE TRIGGER set_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: habilita segurança por linha
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura: todos os usuários autenticados podem ler
CREATE POLICY "system_settings_select" ON system_settings
    FOR SELECT TO authenticated
    USING (true);

-- Política de escrita: somente admins podem modificar
CREATE POLICY "system_settings_update" ON system_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
              AND users.tipo IN ('admin', 'consultor')
        )
    );

-- Seed: dados de identidade organizacional
INSERT INTO system_settings (key, value, description, category, data_type)
VALUES
    ('company_mission', NULL, 'Missão da empresa', 'identity', 'string'),
    ('company_vision',  NULL, 'Visão da empresa',  'identity', 'string'),
    ('company_values',  NULL, 'Valores da empresa', 'identity', 'string')
ON CONFLICT (key) DO NOTHING;
