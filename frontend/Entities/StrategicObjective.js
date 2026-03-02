import { supabaseClient } from '../services/supabase.js';
import { StrategicSubMetric } from './StrategicSubMetric.js';

class StrategicObjective {
    constructor(data = {}) {
        this.id = data.id || null;
        this.category = data.category || '';
        this.text = data.text || '';
        this.meta = data.meta || null;
        this.cycle_id = data.cycle_id || null;
        this.cycles = data.cycles || null;
        this.sub_metrics = data.sub_metrics || [];
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    static async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_objectives')
                .select('*, cycles(id, nome, ativo, data_inicio, data_fim)')
                .order('id', { ascending: true });

            if (error) throw error;
            return (data || []).map(d => new StrategicObjective(d));
        } catch (error) {
            console.error('Erro ao buscar objetivos estratégicos:', error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_objectives')
                .select('*, cycles(id, nome, ativo, data_inicio, data_fim)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data ? new StrategicObjective(data) : null;
        } catch (error) {
            console.error('Erro ao buscar objetivo estratégico:', error);
            return null;
        }
    }

    static async getByIdWithSubMetrics(id) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_objectives')
                .select('*, cycles(id, nome, ativo, data_inicio, data_fim)')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

            const subMetrics = await StrategicSubMetric.getByObjectiveId(id);
            data.sub_metrics = subMetrics;
            return new StrategicObjective(data);
        } catch (error) {
            console.error('Erro ao buscar objetivo com sub-métricas:', error);
            return null;
        }
    }
}

export { StrategicObjective };
