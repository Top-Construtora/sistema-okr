import { supabaseClient, getProxyUrl } from '../services/supabase.js';

class StrategicTimelineEntry {
    constructor(data = {}) {
        this.id = data.id || null;
        this.objective_id = data.objective_id || null;
        this.description = data.description || '';
        this.entry_type = data.entry_type || 'text';
        this.url = data.url || null;
        this.file_name = data.file_name || null;
        this.file_path = data.file_path || null;
        this.created_by = data.created_by || null;
        this.created_at = data.created_at || null;
        // Join data
        this.users = data.users || null;
    }

    get createdByName() {
        return this.users ? this.users.nome : 'Sistema';
    }

    get formattedDate() {
        if (!this.created_at) return '';
        const d = new Date(this.created_at);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    static async getByObjectiveId(objectiveId) {
        try {
            const { data, error } = await supabaseClient
                .from('strategic_objective_entries')
                .select('*, users(id, nome)')
                .eq('objective_id', objectiveId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(d => new StrategicTimelineEntry(d));
        } catch (error) {
            console.error('Erro ao buscar entradas da timeline:', error);
            return [];
        }
    }

    static async create(data) {
        try {
            const { data: created, error } = await supabaseClient
                .from('strategic_objective_entries')
                .insert([{
                    objective_id: data.objective_id,
                    description: data.description,
                    entry_type: data.entry_type || 'text',
                    url: data.url || null,
                    file_name: data.file_name || null,
                    file_path: data.file_path || null,
                    created_by: data.created_by || null
                }])
                .select('*, users(id, nome)')
                .single();

            if (error) throw error;
            return new StrategicTimelineEntry(created);
        } catch (error) {
            console.error('Erro ao criar entrada na timeline:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            // First get the entry to check if there's a file to delete
            const { data: entry } = await supabaseClient
                .from('strategic_objective_entries')
                .select('file_path')
                .eq('id', id)
                .single();

            // Delete the file from storage if exists
            if (entry && entry.file_path) {
                await supabaseClient.storage
                    .from('evidencias')
                    .remove([entry.file_path]);
            }

            const { error } = await supabaseClient
                .from('strategic_objective_entries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao excluir entrada da timeline:', error);
            throw error;
        }
    }

    static async uploadFile(file, objectiveId) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `strategic_obj_${objectiveId}/${timestamp}_${safeName}`;

        const { data, error } = await supabaseClient.storage
            .from('evidencias')
            .upload(filePath, file);

        if (error) {
            console.error('Erro no upload:', error);
            throw error;
        }

        const proxyUrl = getProxyUrl('evidencias', filePath);

        return {
            url: proxyUrl,
            name: file.name,
            size: file.size,
            path: filePath
        };
    }
}

export { StrategicTimelineEntry };
