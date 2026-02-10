import { supabaseClient } from '../services/supabase.js';
import { StorageService, uid } from '../services/storage.js';

// Entidade User - Modelo de usuário conforme PRD (Versão Supabase)
class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nome = data.nome || '';
        this.email = data.email || '';
        this.senha = data.senha || '';
        this.departamento_id = data.departamento_id || data.departamentoId || null; // Mantido para compatibilidade
        this.tipo = data.tipo || 'colaborador';
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.department = data.department || null; // Quando vem com JOIN (legado)
        this.departments = data.departments || []; // Array de departamentos vinculados
        this.primeiro_acesso = data.primeiro_acesso !== undefined ? data.primeiro_acesso : true;
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

        // Aceita departments array ou departamento_id legado (consultor não precisa de departamento)
        const hasDepartments = this.departments && this.departments.length > 0;
        if (this.tipo !== 'consultor' && !hasDepartments && !this.departamento_id) {
            errors.push('Pelo menos um departamento é obrigatório');
        }

        if (!['admin', 'colaborador', 'consultor'].includes(this.tipo)) {
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

        // Determinar departamento principal para compatibilidade
        const primaryDeptId = this.departments && this.departments.length > 0
            ? (this.departments.find(d => d.is_primary)?.id || this.departments[0]?.id || this.departments[0])
            : this.departamento_id;

        if (this.id) {
            // UPDATE - apenas atualiza tabela users
            const dataToSave = {
                nome: this.nome,
                email: this.email,
                departamento_id: primaryDeptId,
                tipo: this.tipo,
                ativo: this.ativo
            };

            const result = await StorageService.update('users', this.id, dataToSave);

            // Atualizar vínculos de departamentos
            if (this.departments && this.departments.length > 0) {
                await this.updateDepartments();
            }

            Object.assign(this, result);
            return result;
        } else {
            // CREATE - usa API do backend para criar usuário (bypass de restrições de signup)
            if (!this.senha) {
                throw new Error('Senha é obrigatória para novos usuários');
            }

            try {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

                const response = await fetch(`${backendUrl}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nome: this.nome,
                        email: this.email,
                        senha: this.senha,
                        tipo: this.tipo,
                        departamento_id: primaryDeptId,
                        departments: this.departments
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao criar usuário');
                }

                this.id = result.id;
                Object.assign(this, result);
                return result;
            } catch (error) {
                throw new Error('Erro ao criar usuário: ' + error.message);
            }
        }
    }

    // Atualizar vínculos de departamentos
    async updateDepartments() {
        if (!this.id) return;

        try {
            // Remover vínculos antigos
            await supabaseClient
                .from('user_departments')
                .delete()
                .eq('user_id', this.id);

            // Inserir novos vínculos
            if (this.departments && this.departments.length > 0) {
                const records = this.departments.map((dept, idx) => ({
                    user_id: this.id,
                    department_id: typeof dept === 'string' ? dept : dept.id,
                    is_primary: idx === 0 || dept.is_primary === true
                }));

                const { error } = await supabaseClient
                    .from('user_departments')
                    .insert(records);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Erro ao atualizar departamentos:', error);
            throw error;
        }
    }

    // Obter IDs dos departamentos do usuário
    getDepartmentIds() {
        if (this.departments && this.departments.length > 0) {
            return this.departments.map(d => typeof d === 'string' ? d : d.id);
        }
        return this.departamento_id ? [this.departamento_id] : [];
    }

    // Obter nomes dos departamentos
    getDepartmentNames() {
        if (this.departments && this.departments.length > 0) {
            return this.departments.map(d => d.nome).filter(Boolean);
        }
        return this.department ? [this.department.nome] : [];
    }

    // Métodos estáticos
    static async getAll() {
        try {
            // Usar view que inclui departamentos
            const { data, error } = await supabaseClient
                .from('users_with_departments')
                .select('*')
                .order('nome');

            if (error) {
                // Fallback para tabela original se view não existir
                console.warn('View users_with_departments não disponível, usando tabela users');
                const fallbackData = await StorageService.getAll('users');
                return fallbackData.map(u => new User(u));
            }

            return data.map(u => new User(u));
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    }

    static async getById(id) {
        try {
            // Tentar usar view primeiro
            const { data, error } = await supabaseClient
                .from('users_with_departments')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                // Fallback para tabela original
                const fallbackData = await StorageService.getById('users', id);
                return fallbackData ? new User(fallbackData) : null;
            }

            return data ? new User(data) : null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    }

    static async getByEmail(email) {
        try {
            const { data, error} = await supabaseClient
                .from('users_with_departments')
                .select('*')
                .ilike('email', email)
                .single();

            if (error) {
                // Fallback para tabela original
                const { data: fallbackData } = await supabaseClient
                    .from('users')
                    .select('*')
                    .ilike('email', email)
                    .single();
                return fallbackData ? new User(fallbackData) : null;
            }
            return data ? new User(data) : null;
        } catch (error) {
            return null;
        }
    }

    static async getActive() {
        try {
            const { data, error } = await supabaseClient
                .from('users_with_departments')
                .select('*')
                .eq('ativo', true);

            if (error) {
                // Fallback
                const { data: fallbackData } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('ativo', true);
                return (fallbackData || []).map(u => new User(u));
            }

            return data.map(u => new User(u));
        } catch (error) {
            console.error('Erro ao buscar usuários ativos:', error);
            return [];
        }
    }

    // Busca usuários vinculados a um departamento (via tabela de junção)
    static async getByDepartment(departmentId) {
        try {
            // Buscar via tabela de junção
            const { data: userDepts, error: junctionError } = await supabaseClient
                .from('user_departments')
                .select('user_id')
                .eq('department_id', departmentId);

            if (!junctionError && userDepts && userDepts.length > 0) {
                const userIds = userDepts.map(ud => ud.user_id);
                const { data, error } = await supabaseClient
                    .from('users_with_departments')
                    .select('*')
                    .in('id', userIds)
                    .eq('ativo', true);

                if (!error) {
                    return data.map(u => new User(u));
                }
            }

            // Fallback para campo departamento_id legado
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('departamento_id', departmentId)
                .eq('ativo', true);

            if (error) throw error;
            return data.map(u => new User(u));
        } catch (error) {
            console.error('Erro ao buscar usuários por departamento:', error);
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

    // Atualiza a senha do usuário e marca primeiro_acesso como false
    static async updatePassword(userId, newPassword) {
        try {
            // 1. Atualizar senha no Supabase Auth
            const { error: authError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // 2. Marcar primeiro_acesso como false na tabela users
            const { error: updateError } = await supabaseClient
                .from('users')
                .update({ primeiro_acesso: false })
                .eq('id', userId);

            if (updateError) throw updateError;

            return true;
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            throw new Error('Erro ao atualizar senha: ' + error.message);
        }
    }

    // Marca primeiro_acesso como false (sem trocar senha)
    static async markFirstAccessComplete(userId) {
        try {
            const { error } = await supabaseClient
                .from('users')
                .update({ primeiro_acesso: false })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao marcar primeiro acesso:', error);
            throw error;
        }
    }

    // Atualiza perfil do usuário (nome e email)
    async updateProfile(nome, email) {
        try {
            // Validação básica
            if (!nome || nome.trim().length < 3) {
                throw new Error('Nome deve ter no mínimo 3 caracteres');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                throw new Error('Email inválido');
            }

            // Verificar email único (se mudou)
            if (email !== this.email) {
                const isUnique = await User.isEmailUnique(email, this.id);
                if (!isUnique) {
                    throw new Error('Este email já está em uso');
                }
            }

            // 1. Atualizar tabela users
            const { error: updateError } = await supabaseClient
                .from('users')
                .update({ nome, email })
                .eq('id', this.id);

            if (updateError) throw updateError;

            // 2. Se email mudou, atualizar auth.users
            if (email !== this.email) {
                const { error: authError } = await supabaseClient.auth.updateUser({
                    email: email
                });

                if (authError) {
                    console.warn('Email atualizado na tabela users, mas erro no auth:', authError);
                }
            }

            // 3. Atualizar objeto
            this.nome = nome;
            this.email = email;

            // 4. Atualizar sessão
            StorageService.setCurrentUser(this);

            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }
}

// Expõe globalmente
window.User = User;

export { User };
