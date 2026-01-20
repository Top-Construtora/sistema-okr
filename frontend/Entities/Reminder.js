import { supabaseClient } from '../services/supabase.js';

// Tipos de lembrete
export const REMINDER_TYPES = {
    NOTE: 'note',
    REMINDER: 'reminder',
    TASK: 'task'
};

export const REMINDER_PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

// Entidade Reminder - Lembretes e notas do calendário
class Reminder {
    constructor(data = {}) {
        this.id = data.id || null;
        this.user_id = data.user_id || null;
        this.content = data.content || '';
        this.reminder_date = data.reminder_date || null;
        this.type = data.type || REMINDER_TYPES.NOTE;
        this.priority = data.priority || REMINDER_PRIORITIES.NORMAL;
        this.completed = data.completed !== undefined ? data.completed : false;
        this.created_by_name = data.created_by_name || null;
        this.departments = data.departments || [];
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.user_id) {
            errors.push('Usuário é obrigatório');
        }

        if (!this.content || this.content.trim() === '') {
            errors.push('Conteúdo do lembrete é obrigatório');
        }

        if (this.content && this.content.length > 500) {
            errors.push('Conteúdo não pode exceder 500 caracteres');
        }

        if (!this.reminder_date) {
            errors.push('Data é obrigatória');
        }

        if (!Object.values(REMINDER_TYPES).includes(this.type)) {
            errors.push('Tipo de lembrete inválido');
        }

        if (!Object.values(REMINDER_PRIORITIES).includes(this.priority)) {
            errors.push('Prioridade inválida');
        }

        return errors;
    }

    // Verifica se está vencido (somente para tasks não completadas)
    isOverdue() {
        if (this.completed || this.type !== REMINDER_TYPES.TASK) return false;

        const reminderDate = new Date(this.reminder_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return reminderDate < today;
    }

    // Formata a data para exibição
    getFormattedDate() {
        if (!this.reminder_date) return '';
        const date = new Date(this.reminder_date + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Retorna label do tipo
    getTypeLabel() {
        const labels = {
            note: 'Nota',
            reminder: 'Lembrete',
            task: 'Tarefa'
        };
        return labels[this.type] || this.type;
    }

    // Retorna label da prioridade
    getPriorityLabel() {
        const labels = {
            low: 'Baixa',
            normal: 'Normal',
            high: 'Alta',
            urgent: 'Urgente'
        };
        return labels[this.priority] || this.priority;
    }

    // Salvar (create ou update)
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const reminderData = {
            user_id: this.user_id,
            content: this.content,
            reminder_date: this.reminder_date,
            type: this.type,
            priority: this.priority,
            completed: this.completed
        };

        if (this.id) {
            // Update
            const { data, error } = await supabaseClient
                .from('reminders')
                .update(reminderData)
                .eq('id', this.id)
                .select()
                .single();

            if (error) throw error;
            Object.assign(this, data);
        } else {
            // Insert
            const { data, error } = await supabaseClient
                .from('reminders')
                .insert([reminderData])
                .select()
                .single();

            if (error) throw error;
            Object.assign(this, data);
        }

        return this;
    }

    // Deletar
    async delete() {
        if (!this.id) {
            throw new Error('Não é possível deletar um lembrete sem ID');
        }

        const { error } = await supabaseClient
            .from('reminders')
            .delete()
            .eq('id', this.id);

        if (error) throw error;
    }

    // Toggle completed
    async toggleComplete() {
        this.completed = !this.completed;
        return await this.save();
    }

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    // Obter todos os lembretes visíveis (RLS controla automaticamente)
    static async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .order('reminder_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar lembretes:', error);
                return [];
            }

            return (data || []).map(r => new Reminder(r));
        } catch (error) {
            console.error('Erro ao buscar lembretes:', error);
            return [];
        }
    }

    // Obter lembretes por data (visíveis pelo RLS)
    static async getByDate(date) {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('reminder_date', date)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar lembretes por data:', error);
                return [];
            }

            return (data || []).map(r => new Reminder(r));
        } catch (error) {
            console.error('Erro ao buscar lembretes por data:', error);
            return [];
        }
    }

    // Obter lembretes por range de datas (visíveis pelo RLS)
    static async getByDateRange(startDate, endDate) {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .gte('reminder_date', startDate)
                .lte('reminder_date', endDate)
                .order('reminder_date', { ascending: true })
                .order('priority', { ascending: false });

            if (error) {
                console.error('Erro ao buscar lembretes por período:', error);
                return [];
            }

            return (data || []).map(r => new Reminder(r));
        } catch (error) {
            console.error('Erro ao buscar lembretes por período:', error);
            return [];
        }
    }

    // Obter lembrete por ID
    static async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Erro ao buscar lembrete:', error);
                return null;
            }

            return data ? new Reminder(data) : null;
        } catch (error) {
            console.error('Erro ao buscar lembrete:', error);
            return null;
        }
    }

    // Obter lembretes pendentes (tasks não completadas, visíveis pelo RLS)
    static async getPending() {
        try {
            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('completed', false)
                .eq('type', REMINDER_TYPES.TASK)
                .order('reminder_date', { ascending: true })
                .order('priority', { ascending: false });

            if (error) {
                console.error('Erro ao buscar tarefas pendentes:', error);
                return [];
            }

            return (data || []).map(r => new Reminder(r));
        } catch (error) {
            console.error('Erro ao buscar tarefas pendentes:', error);
            return [];
        }
    }

    // Obter lembretes vencidos (visíveis pelo RLS)
    static async getOverdue() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabaseClient
                .from('reminders')
                .select('*')
                .eq('completed', false)
                .eq('type', REMINDER_TYPES.TASK)
                .lt('reminder_date', today)
                .order('reminder_date', { ascending: true });

            if (error) {
                console.error('Erro ao buscar tarefas vencidas:', error);
                return [];
            }

            return (data || []).map(r => new Reminder(r));
        } catch (error) {
            console.error('Erro ao buscar tarefas vencidas:', error);
            return [];
        }
    }

    // Contar lembretes por data (visíveis pelo RLS)
    static async getCountByDate(date) {
        try {
            const { count, error } = await supabaseClient
                .from('reminders')
                .select('*', { count: 'exact', head: true })
                .eq('reminder_date', date);

            if (error) {
                console.error('Erro ao contar lembretes:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('Erro ao contar lembretes:', error);
            return 0;
        }
    }

    // Deletar (método estático)
    static async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('reminders')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao deletar lembrete:', error);
            throw error;
        }
    }
}

// Expõe globalmente
window.Reminder = Reminder;
window.REMINDER_TYPES = REMINDER_TYPES;
window.REMINDER_PRIORITIES = REMINDER_PRIORITIES;

// Exporta
export { Reminder };
