import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
// Página de Dashboard
const DashboardPage = {
    async render() {
        const content = document.getElementById('content');

        content.innerHTML = `
            <div id="dashboard-content">
                <div id="ranking-section"><div style="padding:40px;text-align:center;">Carregando...</div></div>
            </div>
        `;

        await this.renderRanking();
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
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);

        let html = `
            <div class="widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Top 5 Departamentos
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
    }
};

// Expõe globalmente
window.DashboardPage = DashboardPage;
export { DashboardPage };
