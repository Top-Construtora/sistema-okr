import { supabaseClient } from '../services/supabase.js';

// Entidade SystemSetting - Gerencia configurações do sistema
class SystemSetting {
    constructor(data = {}) {
        this.id = data.id || null;
        this.key = data.key || '';
        this.value = data.value || null;
        this.description = data.description || '';
        this.category = data.category || 'general';
        this.data_type = data.data_type || 'string';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Converte o valor JSONB para o tipo nativo com base em data_type
    getTypedValue() {
        if (!this.value) return null;

        try {
            switch (this.data_type) {
                case 'number':
                    return Number(this.value);
                case 'boolean':
                    return Boolean(this.value);
                case 'string':
                    return String(this.value);
                case 'json':
                    return this.value; // Já é JSONB
                default:
                    return this.value;
            }
        } catch (error) {
            console.error(`Erro ao converter valor de ${this.key}:`, error);
            return this.value;
        }
    }

    // Converte valor nativo para formato JSONB
    static valueToJson(value, dataType) {
        switch (dataType) {
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'string':
                return JSON.stringify(value);
            case 'json':
                return value;
            default:
                return value;
        }
    }

    // ====================================
    // Métodos Estáticos (CRUD)
    // ====================================

    // Buscar todas as configurações
    static async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('system_settings')
                .select('*')
                .order('category', { ascending: true })
                .order('key', { ascending: true });

            if (error) throw error;

            return (data || []).map(setting => new SystemSetting(setting));
        } catch (error) {
            console.error('Erro ao buscar configurações do sistema:', error);
            return [];
        }
    }

    // Buscar por categoria
    static async getByCategory(category) {
        try {
            const { data, error } = await supabaseClient
                .from('system_settings')
                .select('*')
                .eq('category', category)
                .order('key', { ascending: true });

            if (error) throw error;

            return (data || []).map(setting => new SystemSetting(setting));
        } catch (error) {
            console.error(`Erro ao buscar configurações da categoria ${category}:`, error);
            return [];
        }
    }

    // Buscar por chave
    static async getByKey(key) {
        try {
            const { data, error } = await supabaseClient
                .from('system_settings')
                .select('*')
                .eq('key', key)
                .single();

            if (error) throw error;

            return data ? new SystemSetting(data) : null;
        } catch (error) {
            console.error(`Erro ao buscar configuração ${key}:`, error);
            return null;
        }
    }

    // Atualizar uma configuração por chave
    static async updateByKey(key, value, dataType = 'string') {
        try {
            const jsonValue = SystemSetting.valueToJson(value, dataType);

            const { data, error } = await supabaseClient
                .from('system_settings')
                .update({ value: jsonValue })
                .eq('key', key)
                .select()
                .single();

            if (error) throw error;

            return data ? new SystemSetting(data) : null;
        } catch (error) {
            console.error(`Erro ao atualizar configuração ${key}:`, error);
            throw error;
        }
    }

    // Atualizar múltiplas configurações (batch update)
    static async updateMultiple(settings) {
        try {
            // settings é um array de objetos: { key, value, data_type }
            const updates = settings.map(async (setting) => {
                return SystemSetting.updateByKey(setting.key, setting.value, setting.data_type);
            });

            const results = await Promise.all(updates);
            return results.every(r => r !== null);
        } catch (error) {
            console.error('Erro ao atualizar múltiplas configurações:', error);
            throw error;
        }
    }

    // Agrupar configurações por categoria
    static groupByCategory(settings) {
        const grouped = {};

        settings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = [];
            }
            grouped[setting.category].push(setting);
        });

        return grouped;
    }

    // Pegar nome amigável da categoria
    static getCategoryName(category) {
        const names = {
            'okr': 'Configurações de OKR',
            'approval': 'Aprovação',
            'notifications': 'Notificações',
            'general': 'Geral'
        };
        return names[category] || category;
    }
}

// Expõe globalmente
window.SystemSetting = SystemSetting;

export { SystemSetting };
