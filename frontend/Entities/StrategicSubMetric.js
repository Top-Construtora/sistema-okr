import { supabaseClient } from '../services/supabase.js';

// Configuração de métricas por categoria
// metric_mode: 'normal' (↑ = bom), 'inverse' (↓ = bom), 'auto_okr' (auto-calculado), 'qualitative' (sem barra)
const CATEGORY_METRIC_CONFIG = {
    'Construtora': { unit: 'R$', label: 'Valor Monetário', format: 'currency', metric_mode: 'normal' },
    'Incorporadora': { unit: 'R$', label: 'Valor Monetário', format: 'currency', metric_mode: 'normal' },
    'Melhoria Contínua': { unit: '%', label: 'Percentual', format: 'percent', metric_mode: 'auto_okr' },
    'Obra': { unit: '%', label: 'Percentual', format: 'percent', metric_mode: 'inverse' },
    'Empreendimento Econômico': { unit: 'texto', label: 'Qualitativo', format: 'text', metric_mode: 'qualitative' }
};

class StrategicSubMetric {
    constructor(data = {}) {
        this.id = data.id || null;
        this.objective_id = data.objective_id || null;
        this.name = data.name || '';
        this.target_value = data.target_value != null ? Number(data.target_value) : 0;
        this.current_value = data.current_value != null ? Number(data.current_value) : 0;
        this.unit = data.unit || 'R$';
        this.metric_mode = data.metric_mode || 'normal';
        this.position = data.position || 0;
        this.indicadores = data.indicadores || null;
        this.fonte_coleta = data.fonte_coleta || null;
        this.responsavel_ids = data.responsavel_ids || [];
        this.frequencia = data.frequencia || null;
        this.meta_texto = data.meta_texto || null;
        this.target_date = data.target_date || null;
        this.conclusion_date = data.conclusion_date || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        // Propriedades para métricas auto-calculadas
        this._okr_count = data._okr_count || 0;
        this._is_auto = data._is_auto || false;
        this.sub_metric_type = data.sub_metric_type || null;
    }

    get dateStatus() {
        if (this.unit !== 'data') return null;
        const today = new Date().toISOString().split('T')[0];
        if (!this.target_date) return { label: 'Sem prazo', color: '#6b7280' };
        if (this.conclusion_date) {
            if (this.conclusion_date <= this.target_date) return { label: 'Concluído no prazo', color: '#10b981' };
            return { label: 'Concluído com atraso', color: '#ef4444' };
        }
        if (today <= this.target_date) return { label: 'Pendente', color: '#f59e0b' };
        return { label: 'Atrasado', color: '#ef4444' };
    }

    static formatDate(dateStr) {
        if (!dateStr) return '—';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    get progress() {
        if (this.unit === 'texto' || this.unit === 'data') return null;
        if (!this.target_value || this.target_value === 0) return 0;

        // Modo inverso: 100% quando current = 0, 0% quando current >= target
        if (this.metric_mode === 'inverse') {
            const pct = Math.max(0, (1 - this.current_value / this.target_value) * 100);
            return Math.min(pct, 100);
        }

        const pct = (this.current_value / this.target_value) * 100;
        return Math.min(Math.max(pct, 0), 100);
    }

    validate() {
        const errors = [];
        if (!this.name || !this.name.trim()) errors.push('Nome é obrigatório');
        if (!this.objective_id) errors.push('Objetivo é obrigatório');
        if (this.unit !== 'texto' && (this.target_value == null || this.target_value < 0)) {
            errors.push('Meta deve ser um valor positivo');
        }
        return errors;
    }

    static formatValue(value, unit) {
        if (unit === 'texto') return value ? String(value) : '-';
        if (unit === '%') return `${Number(value || 0).toFixed(1)}%`;
        if (unit === 'R$') {
            const num = Number(value || 0);
            if (num >= 1_000_000) {
                return `R$ ${(num / 1_000_000).toFixed(1)}M`;
            }
            if (num >= 1_000) {
                return `R$ ${(num / 1_000).toFixed(0)}K`;
            }
            return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        }
        if (unit === 'un') {
            const num = Number(value || 0);
            return `${num.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} un`;
        }
        return String(value || 0);
    }

    static formatInputValue(value, unit) {
        if (unit === 'texto') return String(value || '');
        return String(Number(value || 0));
    }

    static async getAllOperationalKpis() {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_sub_metrics')
                .select('*, strategic_objectives(id, text, category)')
                .eq('sub_metric_type', 'operational_kpi')
                .order('objective_id', { ascending: true })
                .order('position', { ascending: true })
                .order('id', { ascending: true });

            if (error) throw error;
            return (data || []).map(d => new StrategicSubMetric(d));
        } catch (error) {
            console.error('Erro ao buscar KPIs operacionais:', error);
            return [];
        }
    }

    static async getByObjectiveId(objectiveId) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_sub_metrics')
                .select('*')
                .eq('objective_id', objectiveId)
                .order('position', { ascending: true })
                .order('id', { ascending: true });

            if (error) throw error;
            return (data || []).map(d => new StrategicSubMetric(d));
        } catch (error) {
            console.error('Erro ao buscar sub-métricas:', error);
            return [];
        }
    }

    static async getByObjectiveIdAndType(objectiveId, type) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_sub_metrics')
                .select('*')
                .eq('objective_id', objectiveId)
                .eq('sub_metric_type', type)
                .order('position', { ascending: true })
                .order('id', { ascending: true });

            if (error) throw error;
            return (data || []).map(d => new StrategicSubMetric(d));
        } catch (error) {
            console.error('Erro ao buscar sub-métricas por tipo:', error);
            return [];
        }
    }

    static async create(data) {
        try {
            const { data: created, error } = await supabaseClient
                .from('strategic_sub_metrics')
                .insert([{
                    objective_id: data.objective_id,
                    name: data.name,
                    target_value: data.target_value || 0,
                    current_value: data.current_value || 0,
                    unit: data.unit || 'R$',
                    position: data.position || 0,
                    indicadores: data.indicadores || null,
                    fonte_coleta: data.fonte_coleta || null,
                    responsavel_ids: data.responsavel_ids || [],
                    frequencia: data.frequencia || null,
                    meta_texto: data.meta_texto || null,
                    sub_metric_type: data.sub_metric_type || null,
                    target_date: data.target_date || null,
                    conclusion_date: data.conclusion_date || null
                }])
                .select()
                .single();

            if (error) throw error;
            return new StrategicSubMetric(created);
        } catch (error) {
            console.error('Erro ao criar sub-métrica:', error);
            throw error;
        }
    }

    static async update(id, data) {
        try {
            const updateData = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.target_value !== undefined) updateData.target_value = data.target_value;
            if (data.current_value !== undefined) updateData.current_value = data.current_value;
            if (data.unit !== undefined) updateData.unit = data.unit;
            if (data.position !== undefined) updateData.position = data.position;
            if (data.indicadores !== undefined) updateData.indicadores = data.indicadores;
            if (data.fonte_coleta !== undefined) updateData.fonte_coleta = data.fonte_coleta;
            if (data.responsavel_ids !== undefined) updateData.responsavel_ids = data.responsavel_ids;
            if (data.frequencia !== undefined) updateData.frequencia = data.frequencia || null;
            if (data.meta_texto !== undefined) updateData.meta_texto = data.meta_texto || null;
            if (data.sub_metric_type !== undefined) updateData.sub_metric_type = data.sub_metric_type;
            if (data.target_date !== undefined) updateData.target_date = data.target_date || null;
            if (data.conclusion_date !== undefined) updateData.conclusion_date = data.conclusion_date || null;

            const { data: updated, error } = await supabaseClient
                .from('strategic_sub_metrics')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return new StrategicSubMetric(updated);
        } catch (error) {
            console.error('Erro ao atualizar sub-métrica:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('strategic_sub_metrics')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao excluir sub-métrica:', error);
            throw error;
        }
    }

    /**
     * Gera sub-métricas auto-calculadas para "Melhoria Contínua"
     * Uma por departamento, com progresso = média dos OKRs do departamento no ciclo
     */
    static async getAutoOkrMetrics(objectiveId, cycleId) {
        try {
            // 1. Busca todos os departamentos ativos
            const { data: departments, error: deptError } = await supabaseClient
                .from('departments')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (deptError) throw deptError;
            if (!departments || departments.length === 0) return [];

            // 2. Busca mini_cycles do ciclo
            const { data: miniCycles, error: mcError } = await supabaseClient
                .from('mini_cycles')
                .select('id')
                .eq('cycle_id', cycleId);

            if (mcError) throw mcError;
            const miniCycleIds = (miniCycles || []).map(mc => mc.id);

            if (miniCycleIds.length === 0) {
                return departments.map((dept, idx) => new StrategicSubMetric({
                    id: `auto_${dept.id}`,
                    objective_id: objectiveId,
                    name: dept.nome,
                    target_value: 100,
                    current_value: 0,
                    unit: '%',
                    metric_mode: 'auto_okr',
                    position: idx,
                    _okr_count: 0,
                    _is_auto: true
                }));
            }

            // 3. Busca OKRs dos mini_cycles com progresso
            const { data: okrs, error: okrError } = await supabaseClient
                .from('okrs')
                .select('id, department, progress, mini_cycle_id')
                .in('mini_cycle_id', miniCycleIds);

            if (okrError) throw okrError;

            // 4. Agrupa por departamento e calcula média
            const deptOkrs = {};
            (okrs || []).forEach(okr => {
                const dept = okr.department;
                if (!deptOkrs[dept]) deptOkrs[dept] = [];
                deptOkrs[dept].push(okr.progress || 0);
            });

            // 5. Gera pseudo sub-métricas
            return departments.map((dept, idx) => {
                const okrList = deptOkrs[dept.nome] || [];
                const avgProgress = okrList.length > 0
                    ? Math.round(okrList.reduce((sum, p) => sum + p, 0) / okrList.length)
                    : 0;

                return new StrategicSubMetric({
                    id: `auto_${dept.id}`,
                    objective_id: objectiveId,
                    name: dept.nome,
                    target_value: 100,
                    current_value: avgProgress,
                    unit: '%',
                    metric_mode: 'auto_okr',
                    position: idx,
                    _okr_count: okrList.length,
                    _is_auto: true
                });
            });
        } catch (error) {
            console.error('Erro ao buscar métricas auto OKR:', error);
            return [];
        }
    }
}

export { StrategicSubMetric, CATEGORY_METRIC_CONFIG };
