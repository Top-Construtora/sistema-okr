import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
// Página de Dashboard
const DashboardPage = {
    async render() {
        const content = document.getElementById('content');
        const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
        const year = new Date().getFullYear();

        content.innerHTML = `
            <div id="dashboard-content">
                <div class="hero">
                    <div class="hero-content">
                        <div class="hero-badge">
                            <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Ciclo Atual: Q${quarter} ${year}
                        </div>
                        <h2>Dashboard Executivo</h2>
                        <p>Acompanhe em tempo real o progresso dos OKRs da TOP Construtora. Use os filtros e relatórios para insights detalhados.</p>
                    </div>
                </div>

                <div class="stats-grid" id="stats"><div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando...</div></div>
                <div class="grid-2">
                    <div id="objectives-section"><div style="padding:40px;text-align:center;">Carregando...</div></div>
                    <div id="ranking-section"><div style="padding:40px;text-align:center;">Carregando...</div></div>
                </div>
            </div>
        `;

        await this.renderStats();
        await this.renderObjectives();
        await this.renderRanking();
    },

    async renderStats() {
        const stats = await OKR.getStats();
        const container = document.getElementById('stats');

        container.innerHTML = `
            <div class="stat-card teal">
                <div class="stat-label">Total de OKRs</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-meta">Cadastrados no sistema</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-label">Em Andamento</div>
                <div class="stat-value">${stats.approved}</div>
                <div class="stat-meta">${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% do total</div>
            </div>
            <div class="stat-card gold">
                <div class="stat-label">Progresso Médio</div>
                <div class="stat-value">${stats.avgProgress}%</div>
                <div class="stat-meta">Média geral</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Concluídos</div>
                <div class="stat-value">${stats.completed}</div>
                <div class="stat-meta">${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% do total</div>
            </div>
        `;
    },

    async renderObjectives() {
        const objectives = await StorageService.getObjectives();
        const container = document.getElementById('objectives-section');

        const categoryConfig = {
            'Execução': { icon: '🎯', color: '#3b82f6', bg: '#eff6ff' },
            'Crescimento': { icon: '📈', color: '#10b981', bg: '#f0fdf4' },
            'Melhoria': { icon: '⚡', color: '#f59e0b', bg: '#fffbeb' }
        };

        let html = `
            <div class="card">
                <div class="card-header" style="background:linear-gradient(135deg, var(--top-blue) 0%, var(--top-blue-dark) 100%);border:none;padding:24px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                            </svg>
                            <div>
                                <h3 style="color:white;font-size:18px;font-weight:700;margin:0;">Objetivos Estratégicos</h3>
                                <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">TOP Construtora 2025</p>
                            </div>
                        </div>
                        <button class="btn btn-sm" onclick="Layout.navigate('objectives')" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);">
                            Gerenciar
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px;height:14px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="objectives-table">
                        <thead>
                            <tr>
                                <th style="width:50px;">#</th>
                                <th style="width:120px;">Categoria</th>
                                <th>Objetivo Estratégico</th>
                                <th style="width:80px;text-align:center;">OKRs</th>
                                <th style="width:220px;text-align:center;">Progresso</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        for (const [idx, obj] of objectives.entries()) {
            const linkedOKRs = await OKR.getByObjective(obj.id);
            const avgProgress = linkedOKRs.length > 0
                ? Math.round(linkedOKRs.reduce((sum, o) => sum + o.progress, 0) / linkedOKRs.length)
                : 0;

            const config = categoryConfig[obj.category];
            const progressColor = avgProgress >= 80 ? '#10b981' : avgProgress >= 60 ? '#f59e0b' : '#ef4444';

            html += `
                <tr class="objective-table-row" onclick="Layout.navigate('objectives')">
                    <td>
                        <div class="objective-table-number">${obj.id}</div>
                    </td>
                    <td>
                        <span class="badge" style="background:${config.bg};color:${config.color};font-weight:600;">
                            ${obj.category}
                        </span>
                    </td>
                    <td>
                        <div class="objective-table-text">${obj.text}</div>
                    </td>
                    <td style="text-align:center;">
                        <span class="objective-table-count">${linkedOKRs.length}</span>
                    </td>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px;padding:0 12px;">
                            <div class="progress" style="flex:1;height:8px;">
                                <div class="progress-bar" style="width:${avgProgress}%;background:${progressColor};"></div>
                            </div>
                            <span style="font-weight:700;font-size:16px;color:${progressColor};min-width:45px;text-align:right;">
                                ${avgProgress}%
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
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
