import { supabaseClient } from '../services/supabase.js';

class ProblemTree {
    // === ÁRVORES (categorias) ===
    static async getAllTrees() {
        try {
            const { data, error } = await supabaseClient
                .from('problem_trees')
                .select('*')
                .order('position')
                .order('id');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar árvores:', e);
            return [];
        }
    }

    static async createTree(nome) {
        try {
            const { data, error } = await supabaseClient
                .from('problem_trees')
                .insert([{ nome, position: Date.now() }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Erro ao criar árvore:', e);
            return null;
        }
    }

    static async deleteTree(id) {
        try {
            const { error } = await supabaseClient
                .from('problem_trees')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao deletar árvore:', e);
        }
    }

    // === ITENS GUT ===
    static async getAllItems() {
        try {
            const { data, error } = await supabaseClient
                .from('problem_tree_items')
                .select('*')
                .order('position')
                .order('id');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar itens:', e);
            return [];
        }
    }

    static async createItem(treeId, itemData = {}) {
        try {
            const { data, error } = await supabaseClient
                .from('problem_tree_items')
                .insert([{
                    tree_id: treeId,
                    topico: itemData.topico || '',
                    pergunta_norteadora: itemData.pergunta_norteadora || '',
                    gravidade: itemData.gravidade || 0,
                    urgencia: itemData.urgencia || 0,
                    tendencia: itemData.tendencia || 0,
                    position: Date.now()
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Erro ao criar item:', e);
            return null;
        }
    }

    static async updateItem(id, updates) {
        try {
            const { error } = await supabaseClient
                .from('problem_tree_items')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao atualizar item:', e);
        }
    }

    static async deleteItem(id) {
        try {
            const { error } = await supabaseClient
                .from('problem_tree_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao deletar item:', e);
        }
    }
}

export { ProblemTree };
