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
        this.responsible_users = Array.isArray(data.responsible_users) ? data.responsible_users : [];
    }

    // Helpers de responsáveis (espelha padrão de Initiative)
    getResponsibleUsers() {
        return Array.isArray(this.responsible_users) ? this.responsible_users : [];
    }

    getResponsibleUserIds() {
        return this.getResponsibleUsers().map(u => typeof u === 'string' ? u : u.id);
    }

    getPrimaryResponsibleUser() {
        const list = this.getResponsibleUsers();
        return list.find(u => u && u.is_primary) || list[0] || null;
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

                // Buscar KRs existentes no banco para comparar
                const { data: existingKRs } = await supabaseClient
                    .from('key_results')
                    .select('id')
                    .eq('okr_id', this.id);

                const existingKRIds = new Set((existingKRs || []).map(kr => kr.id));
                const currentKRIds = new Set(this.key_results.filter(kr => kr.id && !String(kr.id).startsWith('temp_')).map(kr => kr.id));

                // Deletar KRs que foram removidos (não estão mais na lista atual)
                const krsToDelete = [...existingKRIds].filter(id => !currentKRIds.has(id));
                if (krsToDelete.length > 0) {
                    await supabaseClient
                        .from('key_results')
                        .delete()
                        .in('id', krsToDelete);
                }

                // Processar cada KR
                for (let idx = 0; idx < this.key_results.length; idx++) {
                    const kr = this.key_results[idx];
                    const krData = {
                        okr_id: this.id,
                        title: kr.title,
                        metric: kr.metric || '%',
                        target: kr.target || '100',
                        progress: kr.progress || 0,
                        tasks: kr.tasks || [],
                        position: idx,
                        status: kr.status || 'pending',
                        comment: kr.comment || null,
                        evidence: kr.evidence || [],
                        committee_comment: kr.committee_comment ?? null
                    };

                    // Se KR já existe (tem ID válido no banco), atualizar
                    if (kr.id && existingKRIds.has(kr.id)) {
                        const { error } = await supabaseClient
                            .from('key_results')
                            .update(krData)
                            .eq('id', kr.id);
                        if (error) throw error;
                    } else {
                        // Novo KR - inserir
                        const { data: newKR, error } = await supabaseClient
                            .from('key_results')
                            .insert(krData)
                            .select()
                            .single();
                        if (error) throw error;
                        // Atualizar o ID local com o ID do banco
                        kr.id = newKR.id;
                    }
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
                        metric: kr.metric || '%',
                        target: kr.target || '100',
                        progress: kr.progress || 0,
                        tasks: kr.tasks || [],
                        position: idx,
                        status: kr.status || 'pending',
                        comment: kr.comment || null,
                        evidence: kr.evidence || [],
                        committee_comment: kr.committee_comment ?? null
                    }));

                    const { error: krError } = await supabaseClient
                        .from('key_results')
                        .insert(krs);

                    if (krError) throw krError;
                }
            }

            // Persiste responsáveis (após o OKR ter id)
            await this._saveResponsibleUsers();

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

            // Ao sair de 'adjust', limpa committee_comment dos KRs deste OKR
            // (espelha o comportamento de limpeza do committee_comment do OKR)
            if (newStatus !== 'adjust') {
                await supabaseClient
                    .from('key_results')
                    .update({ committee_comment: null })
                    .eq('okr_id', this.id);
            }
            // O trigger salvará no histórico automaticamente!
        } catch (error) {
            console.error('Erro ao mudar status:', error);
            throw error;
        }
    }

    /**
     * Solicita ajustes em KRs específicos.
     * @param {Array<{kr_id: string, comment: string}>} adjustments - lista de ajustes por KR
     * @param {string} okrSummary - comentário a gravar no committee_comment do OKR (opcional)
     */
    async requestKRAdjustments(adjustments, okrSummary = '') {
        if (!Array.isArray(adjustments) || adjustments.length === 0) {
            throw new Error('Forneça pelo menos um ajuste de KR');
        }
        try {
            // 1) Atualiza committee_comment de cada KR (uma chamada por KR)
            for (const adj of adjustments) {
                if (!adj.kr_id || !adj.comment || !adj.comment.trim()) continue;
                const { error } = await supabaseClient
                    .from('key_results')
                    .update({ committee_comment: adj.comment.trim() })
                    .eq('id', adj.kr_id);
                if (error) throw error;
            }

            // 2) Marca o OKR como 'adjust' com um resumo (ou o texto fornecido).
            const count = adjustments.length;
            const summary = okrSummary && okrSummary.trim()
                ? okrSummary.trim()
                : `Ajustes solicitados em ${count} KR${count > 1 ? 's' : ''} específico${count > 1 ? 's' : ''}. Veja detalhes em cada KR.`;
            const { error: okrError } = await supabaseClient
                .from('okrs')
                .update({ status: 'adjust', committee_comment: summary })
                .eq('id', this.id);
            if (okrError) throw okrError;

            this.status = 'adjust';
            this.committee_comment = summary;

            // 3) Notifica colaboradores do departamento via Edge Function.
            // Best-effort: falhas não impedem a operação principal.
            try {
                const { error: fnError } = await supabaseClient.functions.invoke('notify-kr-adjustment', {
                    body: {
                        okr_id: this.id,
                        kr_ids: adjustments.map(a => a.kr_id)
                    }
                });
                if (fnError) console.warn('notify-kr-adjustment falhou:', fnError);
            } catch (e) {
                console.warn('notify-kr-adjustment não disponível:', e);
            }
        } catch (error) {
            console.error('Erro ao solicitar ajustes nos KRs:', error);
            throw error;
        }
    }

    // Persiste responsible_users via tabela de junção okr_responsible_users.
    // Faz diff: remove os que saíram, adiciona os que entraram, atualiza is_primary.
    async _saveResponsibleUsers() {
        if (!this.id) return;
        const desired = this.getResponsibleUsers();
        const desiredIds = desired.map(u => typeof u === 'string' ? u : u.id).filter(Boolean);

        const { data: current, error: selectError } = await supabaseClient
            .from('okr_responsible_users')
            .select('user_id, is_primary')
            .eq('okr_id', this.id);

        if (selectError) {
            // Tabela não existe? Erro de RLS? Avisa em vez de mascarar.
            if (selectError.code === 'PGRST205' || /not find the table/i.test(selectError.message || '')) {
                throw new Error('Tabela "okr_responsible_users" não existe. Rode a migration 34 no Supabase.');
            }
            throw new Error(`Erro ao ler responsáveis: ${selectError.message}`);
        }

        const currentIds = (current || []).map(r => r.user_id);
        const toRemove = currentIds.filter(id => !desiredIds.includes(id));
        const toAdd = desiredIds.filter(id => !currentIds.includes(id));

        if (toRemove.length > 0) {
            const { error } = await supabaseClient
                .from('okr_responsible_users')
                .delete()
                .eq('okr_id', this.id)
                .in('user_id', toRemove);
            if (error) throw new Error(`Erro ao remover responsáveis: ${error.message}`);
        }

        // Zera is_primary atual pra evitar conflito de unique index
        if (currentIds.length > 0 || desiredIds.length > 0) {
            const { error } = await supabaseClient
                .from('okr_responsible_users')
                .update({ is_primary: false })
                .eq('okr_id', this.id);
            if (error) throw new Error(`Erro ao limpar primary: ${error.message}`);
        }

        // Insere novos
        if (toAdd.length > 0) {
            const { error } = await supabaseClient
                .from('okr_responsible_users')
                .insert(toAdd.map(uid => ({ okr_id: this.id, user_id: uid, is_primary: false })));
            if (error) throw new Error(`Erro ao inserir responsáveis: ${error.message}`);
        }

        // Marca o primary (primeiro da lista, ou quem tem is_primary explícito)
        const primaryEntry = desired.find(u => u && u.is_primary) || desired[0];
        const primaryId = primaryEntry ? (typeof primaryEntry === 'string' ? primaryEntry : primaryEntry.id) : null;
        if (primaryId) {
            const { error } = await supabaseClient
                .from('okr_responsible_users')
                .update({ is_primary: true })
                .eq('okr_id', this.id)
                .eq('user_id', primaryId);
            if (error) throw new Error(`Erro ao marcar primary: ${error.message}`);
        }
    }

    // Carrega responsáveis para uma lista de OKRs (usado em getAll/getById)
    static async _attachResponsibleUsers(okrs) {
        try {
            const ids = okrs.map(o => o.id).filter(Boolean);
            if (ids.length === 0) return okrs;
            const { data, error } = await supabaseClient
                .from('okr_responsible_users')
                .select('okr_id, user_id, is_primary, user:users!okr_responsible_users_user_id_fkey(id, nome, email)')
                .in('okr_id', ids);
            if (error) return okrs;
            const map = {};
            (data || []).forEach(r => {
                if (!map[r.okr_id]) map[r.okr_id] = [];
                const u = r.user || { id: r.user_id };
                map[r.okr_id].push({ ...u, is_primary: !!r.is_primary });
            });
            okrs.forEach(o => {
                o.responsible_users = map[o.id] || [];
            });
        } catch (e) { /* não-fatal */ }
        return okrs;
    }

    // Merge defensivo: garante kr.committee_comment vindo direto de key_results,
    // caso a view okrs_complete não exponha a coluna.
    static async _mergeKRCommitteeComments(okrs) {
        try {
            const krIds = okrs.flatMap(o => (o.keyResults || []).map(k => k.id)).filter(Boolean);
            if (krIds.length === 0) return okrs;
            const { data, error } = await supabaseClient
                .from('key_results')
                .select('id, committee_comment')
                .in('id', krIds);
            if (error) return okrs;
            const map = {};
            (data || []).forEach(r => { map[r.id] = r.committee_comment; });
            okrs.forEach(o => {
                (o.keyResults || []).forEach(k => {
                    if (map[k.id] !== undefined) k.committee_comment = map[k.id];
                });
            });
        } catch (e) { /* não-fatal */ }
        return okrs;
    }

    // Métodos estáticos
    static async getAll() {
        try {
            // Usa a view que já traz os key_results agregados
            const { data, error } = await supabaseClient
                .from('okrs_complete')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            const okrs = data.map(o => new OKR(o));
            await OKR._mergeKRCommitteeComments(okrs);
            await OKR._attachResponsibleUsers(okrs);
            return okrs;
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
            if (!data) return null;
            const okr = new OKR(data);
            await OKR._mergeKRCommitteeComments([okr]);
            await OKR._attachResponsibleUsers([okr]);
            return okr;
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
