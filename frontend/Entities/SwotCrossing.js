import { supabaseClient } from '../services/supabase.js';

class SwotCrossing {
    // Grid types and their SWOT quadrant relationships
    static GRIDS = [
        { key: 'restricoes', label: 'Restrições', row: 'oportunidades', col: 'fraquezas', rowLabel: 'OPORTUNIDADES', colLabel: 'FRAQUEZAS' },
        { key: 'alavancas', label: 'Alavancas', row: 'oportunidades', col: 'forcas', rowLabel: 'OPORTUNIDADES', colLabel: 'FORÇAS' },
        { key: 'problemas', label: 'Problemas', row: 'ameacas', col: 'fraquezas', rowLabel: 'AMEAÇAS', colLabel: 'FRAQUEZAS' },
        { key: 'defesas', label: 'Defesas', row: 'ameacas', col: 'forcas', rowLabel: 'AMEAÇAS', colLabel: 'FORÇAS' }
    ];

    static SCORE_OPTIONS = [
        { value: 0, label: 'Nulo' },
        { value: 10, label: 'Muito baixo' },
        { value: 20, label: 'Baixo' },
        { value: 30, label: 'Médio' },
        { value: 40, label: 'Alto' },
        { value: 50, label: 'Muito alto' }
    ];

    static async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('swot_crossing_scores')
                .select('*');
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar scores:', e);
            return [];
        }
    }

    static async upsertScore(gridType, rowIndex, colIndex, score) {
        try {
            const { data: existing } = await supabaseClient
                .from('swot_crossing_scores')
                .select('id')
                .eq('grid_type', gridType)
                .eq('row_index', rowIndex)
                .eq('col_index', colIndex)
                .maybeSingle();

            if (existing) {
                const { error } = await supabaseClient
                    .from('swot_crossing_scores')
                    .update({ score })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('swot_crossing_scores')
                    .insert([{ grid_type: gridType, row_index: rowIndex, col_index: colIndex, score }]);
                if (error) throw error;
            }
        } catch (e) {
            console.error('Erro ao salvar score:', e);
        }
    }

    static async saveAllScores(gridType, scores2D) {
        try {
            const records = [];
            for (let i = 0; i < scores2D.length; i++) {
                for (let j = 0; j < scores2D[i].length; j++) {
                    records.push({
                        grid_type: gridType,
                        row_index: i,
                        col_index: j,
                        score: scores2D[i][j] || 0
                    });
                }
            }

            // Delete existing for this grid type
            await supabaseClient
                .from('swot_crossing_scores')
                .delete()
                .eq('grid_type', gridType);

            if (records.length > 0) {
                const { error } = await supabaseClient
                    .from('swot_crossing_scores')
                    .insert(records);
                if (error) throw error;
            }
        } catch (e) {
            console.error('Erro ao salvar scores:', e);
        }
    }

    // Build a 2D array from saved scores
    static buildGrid(allScores, gridType, numRows, numCols) {
        const grid = Array.from({ length: numRows }, () => Array(numCols).fill(0));
        allScores
            .filter(s => s.grid_type === gridType)
            .forEach(s => {
                if (s.row_index < numRows && s.col_index < numCols) {
                    grid[s.row_index][s.col_index] = s.score;
                }
            });
        return grid;
    }
}

export { SwotCrossing };
