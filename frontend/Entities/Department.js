// Entidade Department - Modelo simplificado conforme PRD (Versão Supabase)
import { supabaseClient } from '../services/supabase.js';
import { StorageService } from '../services/storage.js';
import { uid } from '../services/storage.js';

class Department {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nome = data.nome || '';
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome do departamento é obrigatório');
        }

        if (this.nome.length > 100) {
            errors.push('Nome deve ter no máximo 100 caracteres');
        }

        return errors;
    }

    // Verifica se nome é único
    static async isNameUnique(nome, excludeId = null) {
        try {
            let query = supabaseClient
                .from('departments')
                .select('id');

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data, error } = await query.ilike('nome', nome);

            if (error) throw error;
            return data.length === 0;
        } catch (error) {
            console.error('Erro ao verificar nome único:', error);
            return false;
        }
    }

    // Conta usuários ativos
    async getUserCount() {
        try {
            const { count, error } = await supabaseClient
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('departamento_id', this.id)
                .eq('ativo', true);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Erro ao contar usuários:', error);
            return 0;
        }
    }

    // Verifica se pode ser excluído
    async canDelete() {
        const count = await this.getUserCount();
        return count === 0;
    }

    // Salvar
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const isUnique = await Department.isNameUnique(this.nome, this.id);
        if (!isUnique) {
            throw new Error('Já existe um departamento com este nome');
        }

        const dataToSave = {
            nome: this.nome,
            ativo: this.ativo
        };

        if (this.id) {
            // Update
            const result = await StorageService.update('departments', this.id, dataToSave);
            Object.assign(this, result);
            return result;
        } else {
            // Insert
            const result = await StorageService.create('departments', dataToSave);
            Object.assign(this, result);
            return result;
        }
    }

    // Métodos estáticos para CRUD
    static async getAll() {
        const data = await StorageService.getAll('departments');
        return data.map(d => new Department(d));
    }

    static async getById(id) {
        const data = await StorageService.getById('departments', id);
        return data ? new Department(data) : null;
    }

    static async getActive() {
        try {
            const { data, error } = await supabaseClient
                .from('departments')
                .select('*')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            return data.map(d => new Department(d));
        } catch (error) {
            console.error('Erro ao buscar departamentos ativos:', error);
            return [];
        }
    }

    static async delete(id) {
        const dept = await Department.getById(id);
        if (!dept) {
            throw new Error('Departamento não encontrado');
        }

        const canDelete = await dept.canDelete();
        if (!canDelete) {
            throw new Error('Não é possível excluir departamento com usuários ativos');
        }

        return await StorageService.delete('departments', id);
    }

    static async toggleActive(id) {
        const dept = await Department.getById(id);
        if (!dept) {
            throw new Error('Departamento não encontrado');
        }

        dept.ativo = !dept.ativo;
        return await dept.save();
    }
}

// Expõe globalmente
window.Department = Department;

export { Department };
