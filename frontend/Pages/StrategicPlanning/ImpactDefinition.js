import { SwotItem } from '../../Entities/SwotItem.js';
import { SwotCrossing } from '../../Entities/SwotCrossing.js';

const ImpactDefinitionPage = {
    swotItems: {},
    scores: [],
    grids: {},
    isSaving: false,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = SkeletonLoader.impactDefinition();
        this.addStyles();

        const [items, scores] = await Promise.all([
            SwotItem.getAll(),
            SwotCrossing.getAll()
        ]);

        this.swotItems = {};
        items.forEach(i => {
            if (!this.swotItems[i.quadrant]) this.swotItems[i.quadrant] = [];
            this.swotItems[i.quadrant].push(i);
        });
        this.scores = scores;

        const hasAll = ['forcas', 'fraquezas', 'oportunidades', 'ameacas'].every(q => (this.swotItems[q] || []).length > 0);

        if (!hasAll) {
            content.innerHTML = `
                <div class="page-gio">
                    <div class="card-gio">
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg width="36" height="36" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>
                            <h3>Matriz SWOT necessária</h3>
                            <p>Preencha a Matriz SWOT com todos os quadrantes antes de definir os impactos.</p>
                            <button class="btn-gio-primary" onclick="Layout.navigate('swot-matrix')">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"/></svg>
                                Ir para Matriz SWOT
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        SwotCrossing.GRIDS.forEach(g => {
            const rows = this.swotItems[g.row] || [];
            const cols = this.swotItems[g.col] || [];
            this.grids[g.key] = SwotCrossing.buildGrid(this.scores, g.key, rows.length, cols.length);
        });

        this.renderPage();
    },

    renderPage() {
        const content = document.getElementById('content');
        const gridConfigs = SwotCrossing.GRIDS;

        content.innerHTML = `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <button class="btn-gio-primary" onclick="ImpactDefinitionPage.saveAll()" ${this.isSaving ? 'disabled' : ''}
                        style="${this.isSaving ? 'opacity:0.6;cursor:not-allowed;' : ''}background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 2px 8px rgba(16,185,129,0.3);">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        ${this.isSaving ? 'Salvando...' : 'Salvar Tudo'}
                    </button>
                </div>

                <div class="id-grids">
                    ${gridConfigs.map(g => this.renderGrid(g)).join('')}
                </div>

                <div class="card-gio" style="margin-top:16px;">
                    <div style="padding:16px 20px;">
                        <h4 style="font-size:13px;font-weight:700;color:var(--text-primary);margin:0 0 8px;">Nível de Impacto</h4>
                        <div style="display:flex;flex-wrap:wrap;gap:16px;">
                            ${SwotCrossing.SCORE_OPTIONS.map(o => `
                                <span style="font-size:12px;color:var(--text-muted);"><strong>${o.value}</strong> — ${o.label}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderGrid(gridConf) {
        const rows = this.swotItems[gridConf.row] || [];
        const cols = this.swotItems[gridConf.col] || [];
        const grid = this.grids[gridConf.key] || [];

        const colors = {
            'alavancas': { accent: '#10b981', bg: 'rgba(16,185,129,0.06)' },
            'defesas': { accent: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
            'restricoes': { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
            'problemas': { accent: '#ef4444', bg: 'rgba(239,68,68,0.06)' }
        };
        const c = colors[gridConf.key];

        return `
            <div class="card-gio" style="overflow:visible;border-left:4px solid ${c.accent};">
                <div style="padding:14px 20px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;background:${c.bg};">
                    <h3 style="font-size:15px;font-weight:700;margin:0;color:var(--text-primary);">${gridConf.label}</h3>
                    <span style="font-size:11px;color:var(--text-muted);font-weight:600;">${gridConf.rowLabel} × ${gridConf.colLabel}</span>
                </div>
                <div class="table-gio-container" style="padding:12px;">
                    <table class="table-gio id-table">
                        <thead>
                            <tr>
                                <th style="text-align:left;min-width:100px;">${gridConf.rowLabel}</th>
                                ${cols.map(col => `<th title="${this.escapeAttr(col.text)}" style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.truncate(col.text, 20)}</th>`).join('')}
                                <th style="background:var(--bg-hover);">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((row, i) => {
                                const rowTotal = (grid[i] || []).reduce((s, v) => s + (v || 0), 0);
                                return `
                                <tr>
                                    <td style="text-align:left;font-weight:500;color:var(--text-secondary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${this.escapeAttr(row.text)}">${this.truncate(row.text, 25)}</td>
                                    ${cols.map((_, j) => `
                                        <td style="padding:4px;text-align:center;">
                                            <input type="number" class="id-cell-input" min="0" max="50" step="10"
                                                value="${grid[i]?.[j] || 0}"
                                                onchange="ImpactDefinitionPage.onCellChange('${gridConf.key}', ${i}, ${j}, this.value)" />
                                        </td>
                                    `).join('')}
                                    <td style="font-weight:700;background:var(--bg-hover);text-align:center;">${rowTotal}</td>
                                </tr>`;
                            }).join('')}
                            <tr style="border-top:2px solid var(--border);">
                                <td style="text-align:left;"><strong>Total</strong></td>
                                ${cols.map((_, j) => {
                                    const colTotal = rows.reduce((s, _, i) => s + (grid[i]?.[j] || 0), 0);
                                    return `<td style="font-weight:700;background:var(--bg-hover);text-align:center;">${colTotal}</td>`;
                                }).join('')}
                                <td style="font-weight:800;background:var(--bg-hover);text-align:center;">${rows.reduce((s, _, i) => s + (grid[i] || []).reduce((s2, v) => s2 + (v || 0), 0), 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    onCellChange(gridKey, row, col, value) {
        let v = parseInt(value) || 0;
        v = Math.max(0, Math.min(50, Math.round(v / 10) * 10));
        if (!this.grids[gridKey]) this.grids[gridKey] = [];
        if (!this.grids[gridKey][row]) this.grids[gridKey][row] = [];
        this.grids[gridKey][row][col] = v;
    },

    async saveAll() {
        this.isSaving = true;
        this.renderPage();
        try {
            for (const g of SwotCrossing.GRIDS) {
                if (this.grids[g.key]) await SwotCrossing.saveAllScores(g.key, this.grids[g.key]);
            }
            alert('Matrizes salvas com sucesso!');
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
        } finally {
            this.isSaving = false;
            this.renderPage();
        }
    },

    truncate(text, max) {
        if (!text) return '';
        return text.length > max ? text.substring(0, max) + '...' : text;
    },

    escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    },

    addStyles() {
        if (document.getElementById('id-styles')) return;
        const style = document.createElement('style');
        style.id = 'id-styles';
        style.textContent = `
            .id-grids {
                display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
            }
            .id-table { font-size: 12px; }
            .id-table th, .id-table td {
                padding: 6px 8px; text-align: center; border: 1px solid var(--border);
            }
            .id-cell-input {
                width: 44px; padding: 4px; text-align: center;
                border: 1px solid var(--border); border-radius: var(--radius-sm);
                font-size: 13px; font-weight: 600; font-family: inherit; background: white;
            }
            .id-cell-input:focus {
                outline: none; border-color: var(--top-teal);
                box-shadow: 0 0 0 2px rgba(18,176,160,0.15);
            }
            @media (max-width: 900px) {
                .id-grids { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }
};

export { ImpactDefinitionPage };
window.ImpactDefinitionPage = ImpactDefinitionPage;
