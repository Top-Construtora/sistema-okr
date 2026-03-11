import { SwotItem } from '../../Entities/SwotItem.js';
import { SwotCrossing } from '../../Entities/SwotCrossing.js';

const ScenarioAnalysisPage = {
    swotItems: {},
    scores: [],

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = SkeletonLoader.scenarioAnalysis();
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

        if (scores.length === 0) {
            content.innerHTML = `
                <div class="page-gio">
                    <div class="card-gio">
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg width="36" height="36" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <h3>Definição de Impacto necessária</h3>
                            <p>Preencha a Definição de Impacto para visualizar a análise de cenários.</p>
                            <button class="btn-gio-primary" onclick="Layout.navigate('impact-definition')">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"/></svg>
                                Ir para Definição de Impacto
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        this.renderPage();
    },

    renderPage() {
        const content = document.getElementById('content');

        const oppAnalysis = this.buildAnalysis('oportunidades', 'restricoes', 'alavancas');
        const threatAnalysis = this.buildAnalysis('ameacas', 'problemas', 'defesas');

        content.innerHTML = `
            <div class="page-gio">
                ${this.renderAnalysisSection('Oportunidades', oppAnalysis, '#3b82f6')}
                ${this.renderAnalysisSection('Ameaças', threatAnalysis, '#f59e0b')}
                ${this.renderSummary(oppAnalysis, threatAnalysis)}
            </div>
        `;
    },

    buildAnalysis(rowQuadrant, weakGrid, strongGrid) {
        const rows = this.swotItems[rowQuadrant] || [];
        const fraquezas = this.swotItems['fraquezas'] || [];
        const forcas = this.swotItems['forcas'] || [];

        const weakScores = SwotCrossing.buildGrid(this.scores, weakGrid, rows.length, fraquezas.length);
        const strongScores = SwotCrossing.buildGrid(this.scores, strongGrid, rows.length, forcas.length);

        const items = rows.map((row, i) => {
            const fraqueza = (weakScores[i] || []).reduce((s, v) => s + (v || 0), 0);
            const forca = (strongScores[i] || []).reduce((s, v) => s + (v || 0), 0);
            return { text: row.text, fraqueza, forca, total: fraqueza + forca };
        });

        const grandTotal = items.reduce((s, i) => s + i.total, 0);
        items.forEach(item => {
            item.percentual = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
        });
        items.sort((a, b) => b.percentual - a.percentual);

        return {
            items,
            somaFraqueza: items.reduce((s, i) => s + i.fraqueza, 0),
            somaForca: items.reduce((s, i) => s + i.forca, 0),
            grandTotal
        };
    },

    renderAnalysisSection(title, analysis, color) {
        if (analysis.items.length === 0) return '';

        return `
            <div class="card-gio" style="margin-bottom:16px;border-left:4px solid ${color};">
                <div style="padding:16px 20px;border-bottom:1px solid var(--border-light);">
                    <h3 style="font-size:16px;font-weight:700;margin:0;color:${color};">${title}</h3>
                </div>
                <div class="table-gio-container">
                    <table class="table-gio">
                        <thead>
                            <tr>
                                <th style="width:40px;">#</th>
                                <th style="text-align:left;">Descrição</th>
                                <th>Fraqueza</th>
                                <th>Força</th>
                                <th>Total</th>
                                <th style="min-width:130px;">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${analysis.items.map((item, i) => `
                                <tr>
                                    <td style="font-weight:700;color:var(--text-muted);">${i + 1}</td>
                                    <td style="text-align:left;font-weight:500;">${this.escapeHtml(item.text)}</td>
                                    <td>${item.fraqueza}</td>
                                    <td>${item.forca}</td>
                                    <td style="font-weight:700;">${item.total}</td>
                                    <td>
                                        <div class="sa-pct-cell">
                                            <div class="sa-pct-bar">
                                                <div class="sa-pct-fill" style="width:${item.percentual}%;background:${color};"></div>
                                            </div>
                                            <span style="font-weight:700;font-size:12px;min-width:36px;text-align:right;">${item.percentual}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="border-top:2px solid var(--border);background:var(--bg-main);">
                                <td colspan="2" style="text-align:left;"><strong>SOMA</strong></td>
                                <td><strong>${analysis.somaFraqueza}</strong></td>
                                <td><strong>${analysis.somaForca}</strong></td>
                                <td><strong>${analysis.grandTotal}</strong></td>
                                <td><strong>100%</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderSummary(oppAnalysis, threatAnalysis) {
        const topOpp = oppAnalysis.items[0];
        const topThreat = threatAnalysis.items[0];

        return `
            <div class="card-gio">
                <div style="padding:20px 24px;">
                    <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0 0 14px;">Resumo Estratégico</h3>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
                        ${topOpp ? `
                            <div style="border-radius:var(--radius-lg);padding:16px;border-left:4px solid #3b82f6;background:var(--info-bg);">
                                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px;">Maior Oportunidade</div>
                                <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${this.escapeHtml(topOpp.text)}</div>
                                <div style="font-size:12px;color:var(--text-muted);">${topOpp.percentual}% do impacto total</div>
                            </div>
                        ` : ''}
                        ${topThreat ? `
                            <div style="border-radius:var(--radius-lg);padding:16px;border-left:4px solid #f59e0b;background:var(--warning-bg);">
                                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px;">Maior Ameaça</div>
                                <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${this.escapeHtml(topThreat.text)}</div>
                                <div style="font-size:12px;color:var(--text-muted);">${topThreat.percentual}% do impacto total</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    addStyles() {
        if (document.getElementById('sa-styles')) return;
        const style = document.createElement('style');
        style.id = 'sa-styles';
        style.textContent = `
            .sa-pct-cell { display: flex; align-items: center; gap: 8px; }
            .sa-pct-bar {
                flex: 1; height: 6px; border-radius: 3px;
                background: rgba(0,0,0,0.06); overflow: hidden;
            }
            .sa-pct-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

            @media (max-width: 768px) {
                .sa-pct-cell { min-width: 80px; }
                div[style*="grid-template-columns:repeat(2"] { grid-template-columns: 1fr !important; }
            }
        `;
        document.head.appendChild(style);
    }
};

export { ScenarioAnalysisPage };
window.ScenarioAnalysisPage = ScenarioAnalysisPage;
