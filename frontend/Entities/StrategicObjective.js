import { supabaseClient } from '../services/supabase.js';
import { StrategicSubMetric } from './StrategicSubMetric.js';
import { AuthService } from '../services/auth.js';

// Regras de visibilidade por categoria de objetivo estratégico
const CATEGORY_VISIBILITY = {
    'Empreendimento Econômico': { hidden: true },
    'Melhoria Contínua':       { visibleToAll: true },
    'Construtora':             { visibleToAll: true },
    'Obra':                    { departments: ['Planejamento e Controle'] },
    'Incorporadora':           { departments: ['Incorporação'] },
};

class StrategicObjective {
    constructor(data = {}) {
        this.id = data.id || null;
        this.category = data.category || '';
        this.text = data.text || '';
        this.meta = data.meta || null;
        this.cycle_id = data.cycle_id || null;
        this.indicadores = data.indicadores || null;
        this.fonte_coleta = data.fonte_coleta || null;
        this.frequencia_medicao = data.frequencia_medicao || null;
        this.responsavel_departamento_ids = data.responsavel_departamento_ids || [];
        this.responsavel_usuario_id = data.responsavel_usuario_id || null;
        this.politica_qualidade_ids = data.politica_qualidade_ids || [];
        this.cycles = data.cycles || null;
        this.sub_metrics = data.sub_metrics || [];
        this.satisfaction_external = data.satisfaction_external || [];
        this.satisfaction_internal = data.satisfaction_internal || [];
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

            const [subMetrics, satisfactionExternal, satisfactionInternal] = await Promise.all([
                StrategicSubMetric.getByObjectiveId(id),
                StrategicSubMetric.getByObjectiveIdAndType(id, 'satisfaction_external'),
                StrategicSubMetric.getByObjectiveIdAndType(id, 'satisfaction_internal')
            ]);
            data.sub_metrics = subMetrics;
            data.satisfaction_external = satisfactionExternal;
            data.satisfaction_internal = satisfactionInternal;
            return new StrategicObjective(data);
        } catch (error) {
            console.error('Erro ao buscar objetivo com sub-métricas:', error);
            return null;
        }
    }

    /**
     * Filtra objetivos de acordo com regras de visibilidade por departamento do usuário.
     * Admins e consultores veem tudo (exceto categorias hidden).
     */
    static filterByVisibility(objectives) {
        const user = AuthService.getCurrentUser();
        const isPrivileged = user && (user.tipo === 'admin' || user.tipo === 'consultor');
        const userDeptNames = (user?.departments || []).map(d => d.nome);

        return objectives.filter(obj => {
            const category = obj.category;
            const rule = CATEGORY_VISIBILITY[category];

            // Sem regra definida: visível para todos
            if (!rule) return true;

            // Categoria oculta para todos
            if (rule.hidden) return false;

            // Visível para todos
            if (rule.visibleToAll) return true;

            // Admins/consultores veem tudo (exceto hidden, já filtrado acima)
            if (isPrivileged) return true;

            // Verifica se o usuário pertence a algum departamento permitido
            return rule.departments.some(dept => userDeptNames.includes(dept));
        });
    }

    /**
     * Verifica se um objetivo individual é visível para o usuário atual.
     */
    static isVisibleToCurrentUser(objective) {
        return this.filterByVisibility([objective]).length > 0;
    }
}

export { StrategicObjective, CATEGORY_VISIBILITY };
