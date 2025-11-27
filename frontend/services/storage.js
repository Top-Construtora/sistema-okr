// Storage Service - Versão Supabase
// Substituição do LocalStorage por Supabase PostgreSQL

import { supabaseClient, handleSupabaseError } from './supabase.js';

const StorageService = {
    // Inicializa o storage (agora apenas verifica conexão)
    async init() {
        try {
            // Testa conexão
            const { data, error } = await supabaseClient
                .from('objectives')
                .select('count');

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar com Supabase:', error);
            return false;
        }
    },

    // Recupera todos os dados de uma entidade
    async getAll(entity) {
        try {
            const { data, error } = await supabaseClient
                .from(entity)
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Erro ao buscar ${entity}:`, error);
            return [];
        }
    },

    // Busca por ID
    async getById(entity, id) {
        try {
            const { data, error } = await supabaseClient
                .from(entity)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Erro ao buscar ${entity} ID ${id}:`, error);
            return null;
        }
    },

    // Criar novo registro
    async create(entity, item) {
        try {
            const { data, error } = await supabaseClient
                .from(entity)
                .insert(item)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Erro ao criar ${entity}:`, error);
            throw new Error(handleSupabaseError(error, `Erro ao criar ${entity}`));
        }
    },

    // Atualizar registro
    async update(entity, id, updatedItem) {
        try {
            const { data, error } = await supabaseClient
                .from(entity)
                .update(updatedItem)
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error(`Registro não encontrado ou sem permissão para atualizar. Verifique se você tem permissão de administrador.`);
            }

            return data[0];
        } catch (error) {
            console.error(`Erro ao atualizar ${entity}:`, error);
            throw error;
        }
    },

    // Deletar registro
    async delete(entity, id) {
        try {
            const { error } = await supabaseClient
                .from(entity)
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`Erro ao deletar ${entity}:`, error);
            throw new Error(handleSupabaseError(error, `Erro ao deletar ${entity}`));
        }
    },

    // Métodos específicos
    getCurrentUser() {
        // Agora vem do sessionStorage (temporário)
        const user = sessionStorage.getItem('current_user');
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser(user) {
        if (user) {
            sessionStorage.setItem('current_user', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('current_user');
        }
    },

    async getObjectives() {
        return await this.getAll('objectives');
    },

    // Popular dados de exemplo (agora via SQL)
    async populateExample() {
        try {
            console.log('📊 Populating com dados de exemplo via SQL...');
            console.log('⚠️ Execute o arquivo 04_seed_data.sql no Supabase SQL Editor');
            console.log('   Ou use a função abaixo para criar programaticamente');
            return false;
        } catch (error) {
            console.error('Erro:', error);
            return false;
        }
    },

    // Limpa todos os dados (agora via SQL)
    async clearAllData() {
        if (confirm('⚠️ Isso irá executar TRUNCATE em todas as tabelas. Continue apenas via SQL Editor!')) {
            console.log('Execute no Supabase SQL Editor:');
            console.log('TRUNCATE TABLE key_results, okrs, users, departments, okr_status_history RESTART IDENTITY CASCADE;');
            return false;
        }
    },

    // Exporta dados
    async exportData() {
        try {
            const data = {
                objectives: await this.getAll('objectives'),
                departments: await this.getAll('departments'),
                users: await this.getAll('users'),
                okrs: await this.getAll('okrs'),
                key_results: await this.getAll('key_results')
            };

            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            throw error;
        }
    }
};

// Utilitário para gerar IDs únicos (agora o Supabase faz isso)
function uid() {
    return crypto.randomUUID();
}

// Exporta para uso em outros módulos
export { StorageService, uid };
