import { supabaseClient } from '../services/supabase.js';

class SwotItem {
    static QUADRANTS = [
        { key: 'forcas', label: 'Forças', color: '#10b981', bg: '#ecfdf5', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', type: 'INTERNO' },
        { key: 'fraquezas', label: 'Fraquezas', color: '#ef4444', bg: '#fef2f2', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', type: 'INTERNO' },
        { key: 'oportunidades', label: 'Oportunidades', color: '#3b82f6', bg: '#eff6ff', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', type: 'EXTERNO' },
        { key: 'ameacas', label: 'Ameaças', color: '#f59e0b', bg: '#fffbeb', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6', type: 'EXTERNO' }
    ];

    static async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('swot_items')
                .select('*')
                .order('quadrant')
                .order('position');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar itens SWOT:', e);
            return [];
        }
    }

    static async getByQuadrant(quadrant) {
        try {
            const { data, error } = await supabaseClient
                .from('swot_items')
                .select('*')
                .eq('quadrant', quadrant)
                .order('position');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar itens:', e);
            return [];
        }
    }

    static async create(quadrant, text) {
        try {
            // Enforce max 5
            const existing = await this.getByQuadrant(quadrant);
            if (existing.length >= 5) {
                throw new Error('Máximo de 5 itens por quadrante');
            }
            const { data, error } = await supabaseClient
                .from('swot_items')
                .insert([{ quadrant, text, position: existing.length }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Erro ao criar item SWOT:', e);
            throw e;
        }
    }

    static async update(id, text) {
        try {
            const { error } = await supabaseClient
                .from('swot_items')
                .update({ text })
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao atualizar item SWOT:', e);
        }
    }

    static async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('swot_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao deletar item SWOT:', e);
        }
    }
}

export { SwotItem };
