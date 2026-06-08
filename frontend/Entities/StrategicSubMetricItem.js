import { supabaseClient } from '../services/supabase.js';

// Entidade StrategicSubMetricItem - Itens (ex: obras) de sub-métrica tipo 'checklist'
// status: 'pending' (em progresso, default) | 'completed' (concluída no prazo) | 'not_completed' (não concluída)
class StrategicSubMetricItem {
    constructor(data = {}) {
        this.id = data.id || null;
        this.sub_metric_id = data.sub_metric_id || null;
        this.name = data.name || '';
        // Status com 3 estados; fallback do legacy 'completed' boolean
        if (data.status === 'completed' || data.status === 'not_completed' || data.status === 'pending') {
            this.status = data.status;
        } else if (data.completed === true) {
            this.status = 'completed';
        } else {
            this.status = 'pending';
        }
        this.position = data.position || 0;
        this.notes = data.notes || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    get completed() { return this.status === 'completed'; }

    static async getBySubMetricId(subMetricId) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_sub_metric_items')
                .select('*')
                .eq('sub_metric_id', subMetricId)
                .order('position', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data || []).map(d => new StrategicSubMetricItem(d));
        } catch (error) {
            console.error('Erro ao buscar items da sub-métrica:', error);
            return [];
        }
    }

    // Pega contagens (total, concluídos) para uma lista de sub_metric_ids — usado pra renderizar rows
    static async getCountsBySubMetricIds(subMetricIds) {
        if (!Array.isArray(subMetricIds) || subMetricIds.length === 0) return {};
        try {
            const { data, error } = await supabaseClient
                .from('strategic_sub_metric_items')
                .select('sub_metric_id, status')
                .in('sub_metric_id', subMetricIds);
            if (error) throw error;
            const counts = {};
            (data || []).forEach(it => {
                if (!counts[it.sub_metric_id]) counts[it.sub_metric_id] = { total: 0, done: 0 };
                counts[it.sub_metric_id].total += 1;
                if (it.status === 'completed') counts[it.sub_metric_id].done += 1;
            });
            return counts;
        } catch (error) {
            console.error('Erro ao contar items:', error);
            return {};
        }
    }

    static async create({ sub_metric_id, name, status = 'pending', position = 0, notes = null }) {
        if (!sub_metric_id) throw new Error('sub_metric_id é obrigatório');
        if (!name || !String(name).trim()) throw new Error('Nome do item é obrigatório');
        const validStatus = ['pending', 'completed', 'not_completed'].includes(status) ? status : 'pending';
        const { data, error } = await supabaseClient
            .from('strategic_sub_metric_items')
            .insert([{
                sub_metric_id,
                name: String(name).trim(),
                status: validStatus,
                position,
                notes: notes || null
            }])
            .select()
            .single();
        if (error) throw error;
        return new StrategicSubMetricItem(data);
    }

    static async update(id, fields) {
        const updateData = {};
        if (fields.name !== undefined) updateData.name = String(fields.name).trim();
        if (fields.status !== undefined) {
            const valid = ['pending', 'completed', 'not_completed'];
            updateData.status = valid.includes(fields.status) ? fields.status : 'pending';
        }
        if (fields.position !== undefined) updateData.position = Number(fields.position) || 0;
        if (fields.notes !== undefined) updateData.notes = fields.notes || null;
        const { data, error } = await supabaseClient
            .from('strategic_sub_metric_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return new StrategicSubMetricItem(data);
    }

    static async delete(id) {
        const { error } = await supabaseClient
            .from('strategic_sub_metric_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    static async setStatus(id, status) {
        return StrategicSubMetricItem.update(id, { status });
    }
}

export { StrategicSubMetricItem };
