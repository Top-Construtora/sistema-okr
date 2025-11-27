import { supabaseClient } from '../services/supabase.js';

// Entidade Initiative - Iniciativas vinculadas aos Key Results
class Initiative {
    constructor(data = {}) {
        this.id = data.id || null;
        this.key_result_id = data.key_result_id || null;
        this.nome = data.nome || data.title || '';
        this.descricao = data.descricao || data.description || '';
        this.responsavel_id = data.responsavel_id || null;
        this.data_limite = data.data_limite || null;
        this.progress = data.progress !== undefined ? data.progress : 0;
        this.concluida = data.concluida !== undefined ? data.concluida : false;
        this.position = data.position || 0;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        // Dados do responsável (quando vem de join)
        this.responsavel = data.responsavel || null;
    }

    // Aliases para compatibilidade
    get title() {
        return this.nome;
    }

    set title(value) {
        this.nome = value;
    }

    get description() {
        return this.descricao;
    }

    set description(value) {
        this.descricao = value;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.key_result_id) {
            errors.push('Key Result é obrigatório');
        }

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome da iniciativa é obrigatório');
        }

        if (this.progress < 0 || this.progress > 100) {
            errors.push('Progresso deve estar entre 0 e 100');
        }

        if (this.data_limite) {
            const limite = new Date(this.data_limite);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (limite < hoje && !this.concluida) {
                // Apenas um aviso, não bloqueia o save
                console.warn('Iniciativa com data limite vencida');
            }
        }

        return errors;
    }

    // Verifica se está atrasada
    isOverdue() {
        if (!this.data_limite || this.concluida) return false;

        const limite = new Date(this.data_limite);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return limite < hoje;
    }

    // Salvar (create ou update)
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const initiativeData = {
            key_result_id: this.key_result_id,
            nome: this.nome,
            descricao: this.descricao,
            responsavel_id: this.responsavel_id,
            data_limite: this.data_limite,
            progress: this.progress,
            concluida: this.concluida,
            position: this.position
        };

        if (this.id) {
            // Update
            const { data, error } = await supabaseClient
                .from('initiatives')
                .update(initiativeData)
                .eq('id', this.id)
                .select()
                .single();

            if (error) throw error;
            Object.assign(this, data);
        } else {
            // Insert
            const { data, error } = await supabaseClient
                .from('initiatives')
                .insert([initiativeData])
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
            throw new Error('Não é possível deletar uma iniciativa sem ID');
        }

        const { error } = await supabaseClient
            .from('initiatives')
            .delete()
            .eq('id', this.id);

        if (error) throw error;
    }

    // Toggle concluída
    async toggleComplete() {
        this.concluida = !this.concluida;
        // Quando marca como concluída, progresso = 100%, senão volta ao valor anterior
        if (this.concluida) {
            this.progress = 100;
        }
        return await this.save();
    }

    // Atualiza progresso (sincroniza com concluída)
    async updateProgress(progress) {
        if (progress < 0 || progress > 100) {
            throw new Error('Progresso deve estar entre 0 e 100');
        }

        this.progress = progress;
        this.concluida = progress === 100;

        return await this.save();
    }

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    // Obter todas as iniciativas
    static async getAll() {
        const { data, error } = await supabaseClient
            .from('initiatives')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar iniciativas:', error);
            return [];
        }

        return (data || []).map(i => new Initiative(i));
    }

    // Obter iniciativas de um Key Result específico
    static async getByKeyResultId(keyResultId) {
        const { data, error } = await supabaseClient
            .from('initiatives')
            .select(`
                *,
                responsavel:users(id, nome, email)
            `)
            .eq('key_result_id', keyResultId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar iniciativas:', error);
            return [];
        }

        return (data || []).map(i => new Initiative(i));
    }

    // Obter iniciativa por ID
    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('initiatives')
            .select(`
                *,
                responsavel:users(id, nome, email)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar iniciativa:', error);
            return null;
        }

        return data ? new Initiative(data) : null;
    }

    // Calcular percentual de conclusão de um Key Result (baseado no campo progress)
    static async getCompletionPercentage(keyResultId) {
        const initiatives = await this.getByKeyResultId(keyResultId);

        if (initiatives.length === 0) return 0;

        // Calcula a média dos progressos das iniciativas
        const totalProgress = initiatives.reduce((sum, i) => sum + i.progress, 0);
        return Math.round(totalProgress / initiatives.length);
    }

    // Reordena iniciativas
    static async reorder(keyResultId, initiativeIds) {
        try {
            const promises = initiativeIds.map((id, index) =>
                supabaseClient
                    .from('initiatives')
                    .update({ position: index })
                    .eq('id', id)
            );

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Erro ao reordenar iniciativas:', error);
            throw error;
        }
    }

    // Deletar (método estático)
    static async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('initiatives')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // O trigger recalculará automaticamente o progresso do KR e do OKR!
            return true;
        } catch (error) {
            console.error('Erro ao deletar iniciativa:', error);
            throw error;
        }
    }
}

// Expõe globalmente
window.Initiative = Initiative;

// Exporta
export { Initiative };
