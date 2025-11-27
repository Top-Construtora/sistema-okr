import { supabaseClient } from '../services/supabase.js';
import { StorageService, uid } from '../services/storage.js';

// Entidade User - Modelo de usuário conforme PRD (Versão Supabase)
class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nome = data.nome || '';
        this.email = data.email || '';
        this.senha = data.senha || '';
        this.departamento_id = data.departamento_id || data.departamentoId || null;
        this.tipo = data.tipo || 'colaborador';
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.department = data.department || null; // Quando vem com JOIN
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome é obrigatório');
        }

        if (!this.email || this.email.trim() === '') {
            errors.push('Email é obrigatório');
        } else if (!this.isValidEmail(this.email)) {
            errors.push('Email inválido');
        }

        if (!this.senha && !this.id) {
            errors.push('Senha é obrigatória');
        }

        if (!this.departamento_id) {
            errors.push('Departamento é obrigatório');
        }

        if (!['admin', 'colaborador'].includes(this.tipo)) {
            errors.push('Tipo de usuário inválido');
        }

        return errors;
    }

    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Verifica se email é único
    static async isEmailUnique(email, excludeId = null) {
        try {
            let query = supabaseClient
                .from('users')
                .select('id');

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data, error } = await query.ilike('email', email);

            if (error) throw error;
            return data.length === 0;
        } catch (error) {
            console.error('Erro ao verificar email único:', error);
            return false;
        }
    }

    // Pega departamento
    async getDepartment() {
        if (this.department) return this.department;
        return await Department.getById(this.departamento_id);
    }

    // Verifica se é admin
    isAdmin() {
        return this.tipo === 'admin';
    }

    // Salvar
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const isUnique = await User.isEmailUnique(this.email, this.id);
        if (!isUnique) {
            throw new Error('Já existe um usuário com este email');
        }

        if (this.id) {
            // UPDATE - apenas atualiza tabela users (senha não é armazenada aqui)
            const dataToSave = {
                nome: this.nome,
                email: this.email,
                departamento_id: this.departamento_id,
                tipo: this.tipo,
                ativo: this.ativo
            };

            const result = await StorageService.update('users', this.id, dataToSave);
            Object.assign(this, result);
            return result;
        } else {
            // CREATE - cria usuário no Supabase Auth primeiro
            if (!this.senha) {
                throw new Error('Senha é obrigatória para novos usuários');
            }

            try {
                // 1. Criar usuário no Supabase Auth
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: this.email,
                    password: this.senha,
                    options: {
                        data: {
                            nome: this.nome,
                            tipo: this.tipo,
                            departamento_id: this.departamento_id
                        }
                    }
                });

                if (authError) throw authError;

                // 2. A trigger handle_new_user() no Supabase cria automaticamente o registro na tabela users
                // Vamos buscar o usuário criado
                await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay para trigger processar

                const createdUser = await User.getByEmail(this.email);
                if (createdUser) {
                    Object.assign(this, createdUser);
                    return createdUser;
                }

                throw new Error('Usuário criado no Auth mas não encontrado na tabela users');
            } catch (error) {
                throw new Error('Erro ao criar usuário: ' + error.message);
            }
        }
    }

    // Métodos estáticos
    static async getAll() {
        const data = await StorageService.getAll('users');
        return data.map(u => new User(u));
    }

    static async getById(id) {
        const data = await StorageService.getById('users', id);
        return data ? new User(data) : null;
    }

    static async getByEmail(email) {
        try {
            const { data, error} = await supabaseClient
                .from('users')
                .select('*')
                .ilike('email', email)
                .single();

            if (error) return null;
            return data ? new User(data) : null;
        } catch (error) {
            return null;
        }
    }

    static async getActive() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('ativo', true);

            if (error) throw error;
            return data.map(u => new User(u));
        } catch (error) {
            console.error('Erro ao buscar usuários ativos:', error);
            return [];
        }
    }

    static async getByDepartment(departmentId) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('departamento_id', departmentId)
                .eq('ativo', true);

            if (error) throw error;
            return data.map(u => new User(u));
        } catch (error) {
            return [];
        }
    }

    static async authenticate(email, senha) {
        const user = await User.getByEmail(email);
        if (!user || !user.ativo) {
            return null;
        }

        // EM PRODUÇÃO: comparar hash da senha
        if (user.senha === senha) {
            return user;
        }

        return null;
    }

    static async toggleActive(id) {
        const user = await User.getById(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        user.ativo = !user.ativo;
        return await user.save();
    }

    static async delete(id) {
        return await StorageService.delete('users', id);
    }
}

// Expõe globalmente
window.User = User;

export { User };
