import { supabaseClient } from '../services/supabase.js';
import { StorageService } from '../services/storage.js';

// Entidade MiniCycle - Miniciclos dentro de cada Ciclo
class MiniCycle {
    constructor(data = {}) {
        this.id = data.id || null;
        this.cycle_id = data.cycle_id || null;
        this.nome = data.nome || '';
        this.descricao = data.descricao || '';
        this.ordem = data.ordem || 1;
        this.data_inicio = data.data_inicio || null;
        this.data_fim = data.data_fim || null;
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        // Dados do ciclo pai (quando vem de join)
        this.cycle = data.cycle || null;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.cycle_id) {
            errors.push('Ciclo pai é obrigatório');
        }

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome do miniciclo é obrigatório');
        }

        if (!this.ordem || this.ordem < 1) {
            errors.push('Ordem deve ser maior que zero');
        }

        if (!this.data_inicio) {
            errors.push('Data de início é obrigatória');
        }

        if (!this.data_fim) {
            errors.push('Data de fim é obrigatória');
        }

        if (this.data_inicio && this.data_fim) {
            const inicio = new Date(this.data_inicio);
            const fim = new Date(this.data_fim);
            if (fim <= inicio) {
                errors.push('Data de fim deve ser maior que data de início');
            }
        }

        return errors;
    }

    // Verifica se o miniciclo está ativo baseado na data atual
    isCurrentlyActive() {
        if (!this.ativo) return false;

        const hoje = new Date();
        const inicio = new Date(this.data_inicio);
        const fim = new Date(this.data_fim);

        return hoje >= inicio && hoje <= fim;
    }

    // Salvar (create ou update)
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const miniCycleData = {
            cycle_id: this.cycle_id,
            nome: this.nome,
            descricao: this.descricao,
            ordem: this.ordem,
            data_inicio: this.data_inicio,
            data_fim: this.data_fim,
            ativo: this.ativo
        };

        if (this.id) {
            // Update
            const { data, error } = await supabaseClient
                .from('mini_cycles')
                .update(miniCycleData)
                .eq('id', this.id)
                .select()
                .single();

            if (error) throw error;
            Object.assign(this, data);
        } else {
            // Insert
            const { data, error } = await supabaseClient
                .from('mini_cycles')
                .insert([miniCycleData])
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
            throw new Error('Não é possível deletar um miniciclo sem ID');
        }

        // Verifica se tem OKRs vinculados
        const { count } = await supabaseClient
            .from('okrs')
            .select('*', { count: 'exact', head: true })
            .eq('mini_cycle_id', this.id);

        if (count > 0) {
            throw new Error(`Não é possível excluir este miniciclo pois ele possui ${count} OKR(s) vinculado(s)`);
        }

        const { error } = await supabaseClient
            .from('mini_cycles')
            .delete()
            .eq('id', this.id);

        if (error) throw error;
    }

    // Ativar/Inativar
    async toggleActive() {
        this.ativo = !this.ativo;
        return await this.save();
    }

    // Obter ciclo pai
    async getCycle() {
        if (this.cycle) return this.cycle;

        const { data, error } = await supabaseClient
            .from('cycles')
            .select('*')
            .eq('id', this.cycle_id)
            .single();

        if (error) throw error;
        return data;
    }

    // Obter OKRs deste miniciclo
    async getOKRs() {
        const { data, error } = await supabaseClient
            .from('okrs')
            .select('*')
            .eq('mini_cycle_id', this.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Obter contagem de OKRs
    async getOKRsCount() {
        const { count, error } = await supabaseClient
            .from('okrs')
            .select('*', { count: 'exact', head: true })
            .eq('mini_cycle_id', this.id);

        if (error) throw error;
        return count || 0;
    }

    // Calcular progresso médio dos OKRs
    async calculateAverageProgress() {
        const okrs = await this.getOKRs();
        if (okrs.length === 0) return 0;

        const sum = okrs.reduce((acc, okr) => acc + (okr.progress || 0), 0);
        return Math.round(sum / okrs.length);
    }

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    // Obter todos os miniciclos
    static async getAll() {
        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select(`
                *,
                cycle:cycles(id, nome, ativo)
            `)
            .order('data_inicio', { ascending: false });

        if (error) {
            console.error('Erro ao buscar miniciclos:', error);
            return [];
        }

        return (data || []).map(mc => new MiniCycle(mc));
    }

    // Obter miniciclos ativos
    static async getActive() {
        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select(`
                *,
                cycle:cycles!inner(id, nome, ativo)
            `)
            .eq('ativo', true)
            .eq('cycle.ativo', true)
            .order('data_inicio', { ascending: false });

        if (error) {
            console.error('Erro ao buscar miniciclos ativos:', error);
            return [];
        }

        return (data || []).map(mc => new MiniCycle(mc));
    }

    // Obter miniciclos de um ciclo específico
    static async getByCycleId(cycleId) {
        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select('*')
            .eq('cycle_id', cycleId)
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao buscar miniciclos:', error);
            return [];
        }

        return (data || []).map(mc => new MiniCycle(mc));
    }

    // Obter miniciclo por ID
    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select(`
                *,
                cycle:cycles(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar miniciclo:', error);
            return null;
        }

        return data ? new MiniCycle(data) : null;
    }

    // Obter miniciclo ativo atual (baseado na data)
    static async getCurrentActive() {
        const { data, error } = await supabaseClient
            .rpc('get_active_mini_cycle');

        if (error) {
            console.error('Erro ao buscar miniciclo ativo:', error);
            return null;
        }

        return data && data.length > 0 ? new MiniCycle(data[0]) : null;
    }

    // Obter próximo miniciclo
    static async getNext() {
        const hoje = new Date().toISOString().split('T')[0];

        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select(`
                *,
                cycle:cycles!inner(*)
            `)
            .eq('cycle.ativo', true)
            .gt('data_inicio', hoje)
            .order('data_inicio', { ascending: true })
            .limit(1);

        if (error) {
            console.error('Erro ao buscar próximo miniciclo:', error);
            return null;
        }

        return data && data.length > 0 ? new MiniCycle(data[0]) : null;
    }
}

// Exporta
export { MiniCycle };
