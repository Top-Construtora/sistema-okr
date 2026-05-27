import { supabaseClient } from '../services/supabase.js';

const UNLOCK_DAYS = 7;

class OkrEditRequest {
    constructor(data = {}) {
        this.id = data.id || null;
        this.okr_id = data.okr_id || null;
        this.requested_by = data.requested_by || null;
        this.reason = data.reason || '';
        this.status = data.status || 'pending';
        this.responded_by = data.responded_by || null;
        this.response_comment = data.response_comment || '';
        this.expires_at = data.expires_at || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.requester = data.requester || null;
        this.responder = data.responder || null;
        this.okr = data.okr || null;
    }

    isActiveUnlock() {
        if (this.status !== 'approved') return false;
        if (!this.expires_at) return true;
        return new Date(this.expires_at) > new Date();
    }

    static async create({ okrId, requestedBy, reason }) {
        if (!okrId) throw new Error('okrId é obrigatório');
        if (!requestedBy) throw new Error('Usuário solicitante é obrigatório');
        if (!reason || !reason.trim()) throw new Error('Motivo é obrigatório');

        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .insert([{
                okr_id: okrId,
                requested_by: requestedBy,
                reason: reason.trim(),
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return new OkrEditRequest(data);
    }

    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar solicitação:', error);
            return null;
        }
        return data ? new OkrEditRequest(data) : null;
    }

    static async getPending() {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .select(`
                *,
                requester:users!okr_edit_requests_requested_by_fkey(id, nome, email),
                okr:okrs(id, title, status, department, mini_cycle_id)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar solicitações pendentes:', error);
            return [];
        }
        return (data || []).map(r => new OkrEditRequest(r));
    }

    static async getByOkrId(okrId) {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .select(`
                *,
                requester:users!okr_edit_requests_requested_by_fkey(id, nome, email),
                responder:users!okr_edit_requests_responded_by_fkey(id, nome, email)
            `)
            .eq('okr_id', okrId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar solicitações do OKR:', error);
            return [];
        }
        return (data || []).map(r => new OkrEditRequest(r));
    }

    // Busca todos os "desbloqueios ativos" (approved + não expirados) por (okr_id, requested_by).
    // Retorna mapa { `${okrId}:${userId}`: OkrEditRequest } usado para liberar UI.
    static async getActiveUnlocksMap() {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .select('id, okr_id, requested_by, status, expires_at')
            .eq('status', 'approved')
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

        if (error) {
            console.error('Erro ao buscar desbloqueios ativos:', error);
            return {};
        }

        const map = {};
        (data || []).forEach(r => {
            map[`${r.okr_id}:${r.requested_by}`] = new OkrEditRequest(r);
        });
        return map;
    }

    // Verifica se existe uma solicitação PENDING para esse (okr, user)
    static async getPendingFor(okrId, userId) {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .select('*')
            .eq('okr_id', okrId)
            .eq('requested_by', userId)
            .eq('status', 'pending')
            .limit(1);

        if (error) {
            console.error('Erro ao buscar solicitação pendente:', error);
            return null;
        }
        return data && data.length > 0 ? new OkrEditRequest(data[0]) : null;
    }

    async approve(responderId, comment = '') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + UNLOCK_DAYS);

        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .update({
                status: 'approved',
                responded_by: responderId,
                response_comment: comment || null,
                expires_at: expiresAt.toISOString()
            })
            .eq('id', this.id)
            .select()
            .single();

        if (error) throw error;
        Object.assign(this, data);
        return this;
    }

    async reject(responderId, comment = '') {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .update({
                status: 'rejected',
                responded_by: responderId,
                response_comment: comment || null
            })
            .eq('id', this.id)
            .select()
            .single();

        if (error) throw error;
        Object.assign(this, data);
        return this;
    }

    async close(userId) {
        const { data, error } = await supabaseClient
            .from('okr_edit_requests')
            .update({
                status: 'closed',
                responded_by: userId
            })
            .eq('id', this.id)
            .select()
            .single();

        if (error) throw error;
        Object.assign(this, data);
        return this;
    }
}

export { OkrEditRequest, UNLOCK_DAYS };
