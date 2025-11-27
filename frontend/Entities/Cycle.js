import { supabaseClient } from '../services/supabase.js';
import { StorageService } from '../services/storage.js';

// Entidade Cycle - Ciclos de OKRs (anuais, semestrais)
class Cycle {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nome = data.nome || '';
        this.descricao = data.descricao || '';
        this.data_inicio = data.data_inicio || null;
        this.data_fim = data.data_fim || null;
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome do ciclo é obrigatório');
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

    // Verifica se o ciclo está ativo baseado na data atual
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

        const cycleData = {
            nome: this.nome,
            descricao: this.descricao,
            data_inicio: this.data_inicio,
            data_fim: this.data_fim,
            ativo: this.ativo
        };

        if (this.id) {
            // Update
            const { data, error } = await supabaseClient
                .from('cycles')
                .update(cycleData)
                .eq('id', this.id)
                .select()
                .single();

            if (error) throw error;
            Object.assign(this, data);
        } else {
            // Insert
            const { data, error } = await supabaseClient
                .from('cycles')
                .insert([cycleData])
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
            throw new Error('Não é possível deletar um ciclo sem ID');
        }

        // Verifica se tem miniciclos
        const { count } = await supabaseClient
            .from('mini_cycles')
            .select('*', { count: 'exact', head: true })
            .eq('cycle_id', this.id);

        if (count > 0) {
            throw new Error(`Não é possível excluir este ciclo pois ele possui ${count} miniciclo(s) vinculado(s)`);
        }

        const { error } = await supabaseClient
            .from('cycles')
            .delete()
            .eq('id', this.id);

        if (error) throw error;
    }

    // Ativar/Inativar
    async toggleActive() {
        this.ativo = !this.ativo;
        return await this.save();
    }

    // Obter miniciclos deste ciclo
    async getMiniCycles() {
        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select('*')
            .eq('cycle_id', this.id)
            .order('ordem', { ascending: true });

        if (error) throw error;

        // Importa MiniCycle dinamicamente para evitar circular dependency
        const { MiniCycle } = await import('./MiniCycle.js');
        return (data || []).map(mc => new MiniCycle(mc));
    }

    // Obter contagem de miniciclos
    async getMiniCyclesCount() {
        const { count, error } = await supabaseClient
            .from('mini_cycles')
            .select('*', { count: 'exact', head: true })
            .eq('cycle_id', this.id);

        if (error) throw error;
        return count || 0;
    }

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    // Obter todos os ciclos
    static async getAll() {
        const { data, error } = await supabaseClient
            .from('cycles')
            .select('*')
            .order('data_inicio', { ascending: false });

        if (error) {
            console.error('Erro ao buscar ciclos:', error);
            return [];
        }

        return (data || []).map(c => new Cycle(c));
    }

    // Obter ciclos ativos
    static async getActive() {
        const { data, error } = await supabaseClient
            .from('cycles')
            .select('*')
            .eq('ativo', true)
            .order('data_inicio', { ascending: false});

        if (error) {
            console.error('Erro ao buscar ciclos ativos:', error);
            return [];
        }

        return (data || []).map(c => new Cycle(c));
    }

    // Obter ciclo por ID
    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('cycles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar ciclo:', error);
            return null;
        }

        return data ? new Cycle(data) : null;
    }

    // Obter ciclo ativo atual (baseado na data)
    static async getCurrentActive() {
        const { data, error } = await supabaseClient
            .rpc('get_active_cycle');

        if (error) {
            console.error('Erro ao buscar ciclo ativo:', error);
            return null;
        }

        return data && data.length > 0 ? new Cycle(data[0]) : null;
    }

    // Criar ciclo com miniciclos automaticamente
    static async createWithMiniCycles(cycleData, miniCyclesCount = 4) {
        const cycle = new Cycle(cycleData);
        await cycle.save();

        // Calcula duração de cada miniciclo
        const inicio = new Date(cycle.data_inicio);
        const fim = new Date(cycle.data_fim);
        const totalDays = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
        const daysPerMini = Math.floor(totalDays / miniCyclesCount);

        // Cria miniciclos
        for (let i = 0; i < miniCyclesCount; i++) {
            const miniInicio = new Date(inicio);
            miniInicio.setDate(inicio.getDate() + (i * daysPerMini));

            const miniFim = new Date(inicio);
            if (i === miniCyclesCount - 1) {
                // Último miniciclo vai até o fim do ciclo
                miniFim.setTime(fim.getTime());
            } else {
                miniFim.setDate(inicio.getDate() + ((i + 1) * daysPerMini) - 1);
            }

            const miniCycle = {
                cycle_id: cycle.id,
                nome: `Q${i + 1} ${cycle.nome}`,
                descricao: `${i + 1}º período do ciclo ${cycle.nome}`,
                ordem: i + 1,
                data_inicio: miniInicio.toISOString().split('T')[0],
                data_fim: miniFim.toISOString().split('T')[0],
                ativo: i === 0 // Apenas o primeiro ativo por padrão
            };

            await supabaseClient.from('mini_cycles').insert([miniCycle]);
        }

        return cycle;
    }
}

// Exporta
export { Cycle };
