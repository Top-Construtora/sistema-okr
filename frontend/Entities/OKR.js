import { supabaseClient } from '../services/supabase.js';
import { StorageService, uid } from '../services/storage.js';

// Entidade OKR - Objetivo e Resultados-Chave (Versão Supabase)
class OKR {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.objective_id = data.objective_id || data.objectiveId || null;
        this.mini_cycle_id = data.mini_cycle_id || data.miniCycleId || null;
        this.department = data.department || '';
        this.status = data.status || 'pending';
        this.progress = data.progress || 0;
        this.key_results = data.key_results || data.keyResults || [];
        this.committee_comment = data.committee_comment || data.committeeComment || '';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.objective_text = data.objective_text || null; // Quando vem da view
        this.mini_cycle = data.mini_cycle || null; // Quando vem de join
    }

    // Normaliza mini_cycle_id
    get miniCycleId() {
        return this.mini_cycle_id;
    }

    set miniCycleId(value) {
        this.mini_cycle_id = value;
    }

    // Normaliza key_results para keyResults (compatibilidade)
    get keyResults() {
        return this.key_results;
    }

    set keyResults(value) {
        this.key_results = value;
    }

    // Normaliza objective_id
    get objectiveId() {
        return this.objective_id;
    }

    set objectiveId(value) {
        this.objective_id = value;
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.title || this.title.trim() === '') {
            errors.push('Título do OKR é obrigatório');
        }

        if (!this.objective_id) {
            errors.push('Objetivo estratégico é obrigatório');
        }

        if (!this.department) {
            errors.push('Departamento é obrigatório');
        }

        return errors;
    }

    // Pega objetivo vinculado
    async getObjective() {
        if (this.objective_text) {
            return { id: this.objective_id, text: this.objective_text };
        }

        const objectives = await StorageService.getObjectives();
        return objectives.find(obj => obj.id === this.objective_id);
    }

    // Pega miniciclo vinculado
    async getMiniCycle() {
        if (!this.mini_cycle_id) return null;

        if (this.mini_cycle) return this.mini_cycle;

        const { data, error } = await supabaseClient
            .from('mini_cycles')
            .select('*, cycle:cycles(*)')
            .eq('id', this.mini_cycle_id)
            .single();

        if (error) {
            console.error('Erro ao buscar miniciclo:', error);
            return null;
        }

        return data;
    }

    // Salvar
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const okrData = {
            title: this.title,
            objective_id: this.objective_id,
            mini_cycle_id: this.mini_cycle_id,
            department: this.department,
            status: this.status,
            committee_comment: this.committee_comment
        };

        try {
            if (this.id) {
                // Update OKR
                const { error: okrError } = await supabaseClient
                    .from('okrs')
                    .update(okrData)
                    .eq('id', this.id);

                if (okrError) throw okrError;

                // Delete KRs antigos
                await supabaseClient
                    .from('key_results')
                    .delete()
                    .eq('okr_id', this.id);

                // Insert novos KRs
                if (this.key_results.length > 0) {
                    const krs = this.key_results.map((kr, idx) => ({
                        okr_id: this.id,
                        title: kr.title,
                        metric: kr.metric,
                        target: kr.target,
                        progress: kr.progress || 0,
                        tasks: kr.tasks || [],
                        position: idx
                    }));

                    const { error: krError } = await supabaseClient
                        .from('key_results')
                        .insert(krs);

                    if (krError) throw krError;
                }
            } else {
                // Insert OKR
                const { data: okrResult, error: okrError } = await supabaseClient
                    .from('okrs')
                    .insert(okrData)
                    .select()
                    .single();

                if (okrError) throw okrError;
                this.id = okrResult.id;

                // Insert KRs
                if (this.key_results.length > 0) {
                    const krs = this.key_results.map((kr, idx) => ({
                        okr_id: this.id,
                        title: kr.title,
                        metric: kr.metric,
                        target: kr.target,
                        progress: kr.progress || 0,
                        tasks: kr.tasks || [],
                        position: idx
                    }));

                    const { error: krError } = await supabaseClient
                        .from('key_results')
                        .insert(krs);

                    if (krError) throw krError;
                }
            }

            return this;
        } catch (error) {
            console.error('Erro ao salvar OKR:', error);
            throw error;
        }
    }

    // Atualiza progresso de um Key Result
    async updateKeyResultProgress(krId, progress) {
        try {
            const { error } = await supabaseClient
                .from('key_results')
                .update({ progress: progress })
                .eq('id', krId);

            if (error) throw error;

            // O trigger recalculará automaticamente o progresso do OKR!

            // Atualiza localmente
            const kr = this.key_results.find(k => k.id === krId);
            if (kr) {
                kr.progress = progress;
            }
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            throw error;
        }
    }

    // Muda status
    async changeStatus(newStatus, comment = '') {
        this.status = newStatus;
        if (comment) {
            this.committee_comment = comment;
        }

        try {
            const { error } = await supabaseClient
                .from('okrs')
                .update({
                    status: newStatus,
                    committee_comment: comment
                })
                .eq('id', this.id);

            if (error) throw error;
            // O trigger salvará no histórico automaticamente!
        } catch (error) {
            console.error('Erro ao mudar status:', error);
            throw error;
        }
    }

    // Métodos estáticos
    static async getAll() {
        try {
            // Usa a view que já traz os key_results agregados
            const { data, error } = await supabaseClient
                .from('okrs_complete')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(o => new OKR(o));
        } catch (error) {
            console.error('Erro ao buscar OKRs:', error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('okrs_complete')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data ? new OKR(data) : null;
        } catch (error) {
            console.error('Erro ao buscar OKR:', error);
            return null;
        }
    }

    static async getByObjective(objectiveId) {
        try {
            const { data, error } = await supabaseClient
                .from('okrs')
                .select('*')
                .eq('objective_id', objectiveId);

            if (error) throw error;
            return data.map(o => new OKR(o));
        } catch (error) {
            return [];
        }
    }

    static async getByDepartment(department) {
        try {
            const { data, error } = await supabaseClient
                .from('okrs')
                .select('*')
                .eq('department', department);

            if (error) throw error;
            return data.map(o => new OKR(o));
        } catch (error) {
            return [];
        }
    }

    static async getByStatus(status) {
        try {
            const { data, error } = await supabaseClient
                .from('okrs')
                .select('*')
                .eq('status', status);

            if (error) throw error;
            return data.map(o => new OKR(o));
        } catch (error) {
            return [];
        }
    }

    static async delete(id) {
        return await StorageService.delete('okrs', id);
    }

    // Estatísticas
    static async getStats() {
        try {
            const okrs = await OKR.getAll();
            return {
                total: okrs.length,
                pending: okrs.filter(o => o.status === 'pending').length,
                approved: okrs.filter(o => o.status === 'approved').length,
                completed: okrs.filter(o => o.status === 'completed' || o.status === 'homologated').length,
                avgProgress: okrs.length > 0
                    ? Math.round(okrs.reduce((sum, o) => sum + o.progress, 0) / okrs.length)
                    : 0
            };
        } catch (error) {
            console.error('Erro ao calcular stats:', error);
            return { total: 0, pending: 0, approved: 0, completed: 0, avgProgress: 0 };
        }
    }
}

// Status disponíveis
const OKR_STATUS = {
    pending: { label: "Pendente", badge: "badge-pending" },
    approved: { label: "Em Andamento", badge: "badge-approved" },
    adjust: { label: "Ajuste Solicitado", badge: "badge-adjust" },
    completed: { label: "Concluído", badge: "badge-completed" },
    homologated: { label: "Homologado", badge: "badge-homologated" }
};

// Expõe globalmente
window.OKR = OKR;
window.OKR_STATUS = OKR_STATUS;

export { OKR, OKR_STATUS };
