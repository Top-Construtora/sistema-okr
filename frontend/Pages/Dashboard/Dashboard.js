import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';

// Página de Dashboard
const DashboardPage = {
    async render() {
        const content = document.getElementById('content');

        content.innerHTML = `
            <div id="dashboard-content">
                <div class="dashboard-grid">
                    <div id="ranking-section">
                        <div style="padding:40px;text-align:center;">Carregando...</div>
                    </div>
                    <div id="objectives-section">
                        <div style="padding:40px;text-align:center;">Carregando...</div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
        await Promise.all([
            this.renderRanking(),
            this.renderObjectives()
        ]);
    },

    async renderRanking() {
        const container = document.getElementById('ranking-section');
        const okrs = await OKR.getAll();
        const deptStats = {};

        // Calcula estatísticas por departamento
        okrs.forEach(okr => {
            if (!deptStats[okr.department]) {
                deptStats[okr.department] = { count: 0, totalProgress: 0 };
            }
            deptStats[okr.department].count++;
            deptStats[okr.department].totalProgress += okr.progress;
        });

        // Cria ranking
        const ranking = Object.entries(deptStats)
            .map(([name, stats]) => ({
                name,
                avg: Math.round(stats.totalProgress / stats.count),
                count: stats.count
            }))
            .sort((a, b) => b.avg - a.avg);

        let html = `
            <div class="widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Ranking de Departamentos
                </div>
                <div class="widget-body">
        `;

        if (ranking.length > 0) {
            ranking.forEach((dept, idx) => {
                html += `
                    <div class="ranking-item">
                        <div class="ranking-pos ${idx === 0 ? 'gold' : ''}">${idx + 1}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${dept.name}</div>
                            <div class="ranking-bar">
                                <div class="progress progress-sm">
                                    <div class="progress-bar" style="width: ${dept.avg}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="ranking-percent">${dept.avg}%</div>
                    </div>
                `;
            });
        } else {
            html += '<p style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum dado disponível</p>';
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    async renderObjectives() {
        const container = document.getElementById('objectives-section');
        const objectives = await StorageService.getObjectives();
        const okrs = await OKR.getAll();

        // Conta OKRs por objetivo
        const okrCountByObjective = {};
        okrs.forEach(okr => {
            if (!okrCountByObjective[okr.objective_id]) {
                okrCountByObjective[okr.objective_id] = 0;
            }
            okrCountByObjective[okr.objective_id]++;
        });

        const categoryColors = {
            'Execução': { bg: '#eff6ff', color: '#3b82f6' },
            'Crescimento': { bg: '#f0fdf4', color: '#10b981' },
            'Melhoria': { bg: '#fef3c7', color: '#f59e0b' }
        };

        let html = `
            <div class="widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                    </svg>
                    Objetivos Estratégicos
                    <span class="widget-badge">${objectives.length}</span>
                </div>
                <div class="widget-body widget-body-table">
        `;

        if (objectives.length > 0) {
            html += `
                <table class="dashboard-objectives-table">
                    <thead>
                        <tr>
                            <th class="col-cat">Categoria</th>
                            <th class="col-obj">Objetivo</th>
                            <th class="col-okrs">OKRs</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            objectives.forEach(obj => {
                const colors = categoryColors[obj.category] || { bg: '#f3f4f6', color: '#6b7280' };
                const okrCount = okrCountByObjective[obj.id] || 0;

                html += `
                    <tr class="obj-row">
                        <td>
                            <span class="obj-badge" style="background:${colors.bg};color:${colors.color};">
                                ${obj.category}
                            </span>
                        </td>
                        <td>
                            <div class="obj-text">${obj.text}</div>
                            ${obj.meta ? `<div class="obj-meta">Meta: ${obj.meta}</div>` : ''}
                        </td>
                        <td class="obj-count">
                            <span class="okr-count-badge ${okrCount > 0 ? 'has-okrs' : ''}">${okrCount}</span>
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        } else {
            html += `
                <div style="text-align:center;padding:30px;">
                    <p style="color:var(--text-muted);margin-bottom:12px;">Nenhum objetivo cadastrado</p>
                    <button class="btn btn-primary btn-sm" onclick="Layout.navigate('objectives')">
                        Criar Objetivo
                    </button>
                </div>
            `;
        }

        html += `
                </div>
                <div class="widget-footer">
                    <button class="btn-link-dash" onclick="Layout.navigate('objectives')">
                        Ver todos os objetivos →
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    addStyles() {
        if (document.getElementById('dashboard-styles')) return;

        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .dashboard-grid {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 24px;
                align-items: start;
            }

            .widget {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .widget-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 16px 20px;
                background: linear-gradient(135deg, var(--top-blue) 0%, #1a5570 100%);
                color: white;
                font-weight: 600;
                font-size: 14px;
            }

            .widget-header svg {
                width: 20px;
                height: 20px;
            }

            .widget-badge {
                margin-left: auto;
                background: rgba(255,255,255,0.2);
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 12px;
            }

            .widget-body {
                padding: 16px 20px;
                flex: 1;
            }

            .widget-body-table {
                padding: 0;
            }

            .widget-footer {
                padding: 12px 20px;
                background: var(--bg-main);
                border-top: 1px solid var(--border-light);
                text-align: right;
            }

            .btn-link-dash {
                background: none;
                border: none;
                color: var(--top-teal);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                padding: 0;
            }

            .btn-link-dash:hover {
                color: var(--top-blue);
                text-decoration: underline;
            }

            /* Ranking Styles */
            .ranking-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 0;
                border-bottom: 1px solid var(--border-light);
            }

            .ranking-item:last-child {
                border-bottom: none;
            }

            .ranking-pos {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--bg-main);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 12px;
                color: var(--text-secondary);
            }

            .ranking-pos.gold {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: white;
            }

            .ranking-info {
                flex: 1;
            }

            .ranking-name {
                font-weight: 600;
                font-size: 13px;
                color: var(--text-primary);
                margin-bottom: 6px;
            }

            .ranking-bar .progress {
                height: 6px;
                background: var(--border-light);
                border-radius: 3px;
                overflow: hidden;
            }

            .ranking-bar .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, var(--top-teal) 0%, #13a692 100%);
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            .ranking-percent {
                font-weight: 700;
                font-size: 14px;
                color: var(--top-blue);
                min-width: 45px;
                text-align: right;
            }

            /* Objectives Table Styles */
            .dashboard-objectives-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }

            .dashboard-objectives-table thead {
                background: var(--bg-main);
            }

            .dashboard-objectives-table thead th {
                padding: 12px 16px;
                text-align: left;
                font-size: 11px;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid var(--border-light);
            }

            .dashboard-objectives-table .col-cat {
                width: 110px;
            }

            .dashboard-objectives-table .col-obj {
                width: auto;
            }

            .dashboard-objectives-table .col-okrs {
                width: 70px;
                text-align: center;
            }

            .obj-row {
                border-bottom: 1px solid var(--border-light);
                transition: background 0.2s;
            }

            .obj-row:hover {
                background: var(--bg-main);
            }

            .obj-row:last-child {
                border-bottom: none;
            }

            .obj-row td {
                padding: 12px 16px;
                vertical-align: middle;
            }

            .obj-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .obj-text {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary);
                line-height: 1.4;
            }

            .obj-meta {
                font-size: 11px;
                color: var(--text-muted);
                margin-top: 4px;
                padding: 4px 8px;
                background: var(--bg-main);
                border-radius: 4px;
                border-left: 2px solid var(--top-teal);
                display: inline-block;
            }

            .obj-count {
                text-align: center;
            }

            .okr-count-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--bg-main);
                font-size: 12px;
                font-weight: 700;
                color: var(--text-muted);
            }

            .okr-count-badge.has-okrs {
                background: var(--top-teal);
                color: white;
            }

            /* Responsive */
            @media (max-width: 1024px) {
                .dashboard-grid {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 768px) {
                .dashboard-objectives-table .col-cat {
                    width: 90px;
                }

                .obj-badge {
                    font-size: 9px;
                    padding: 3px 8px;
                }

                .obj-text {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.DashboardPage = DashboardPage;
export { DashboardPage };
