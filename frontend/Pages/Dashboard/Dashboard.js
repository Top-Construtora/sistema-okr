import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
import { Initiative } from '../../Entities/Initiative.js';

// Página de Dashboard
const DashboardPage = {
    async render() {
        const content = document.getElementById('content');

        content.innerHTML = `
            <div id="dashboard-content" class="dashboard-gio">
                <!-- Main Dashboard Grid -->
                <div class="dashboard-grid">
                    <div id="ranking-section">
                        <div class="widget-skeleton"></div>
                    </div>
                    <div class="objectives-and-activities">
                        <div id="objectives-section">
                            <div class="widget-skeleton"></div>
                        </div>
                        <div id="upcoming-activities-section">
                            <div class="widget-skeleton"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
        await Promise.all([
            this.renderRanking(),
            this.renderObjectives(),
            this.renderUpcomingActivities()
        ]);
    },

    async renderRanking() {
        const container = document.getElementById('ranking-section');

        // Busca departamentos para mapear nome -> id
        const { data: departments } = await supabaseClient
            .from('departments')
            .select('id, nome');

        const deptNameToId = {};
        if (departments) {
            departments.forEach(d => {
                deptNameToId[d.nome] = d.id;
            });
        }

        // Calcula ranking em tempo real com base nos OKRs atuais
        const okrs = await OKR.getAll();
        const deptStats = {};

        okrs.forEach(okr => {
            if (!deptStats[okr.department]) {
                deptStats[okr.department] = {
                    count: 0,
                    totalProgress: 0,
                    department_id: deptNameToId[okr.department]
                };
            }
            deptStats[okr.department].count++;
            deptStats[okr.department].totalProgress += okr.progress;
        });

        // Calcula ranking atual ordenado
        // Ordena por avg (maior primeiro), e por nome (alfabético) em caso de empate
        const currentRanking = Object.entries(deptStats)
            .map(([name, stats]) => ({
                name,
                avg: Math.round(stats.totalProgress / stats.count),
                count: stats.count,
                department_id: stats.department_id
            }))
            .sort((a, b) => {
                if (b.avg !== a.avg) return b.avg - a.avg; // Maior avg primeiro
                return a.name.localeCompare(b.name); // Empate: ordem alfabética
            })
            .map((dept, idx) => ({ ...dept, position: idx + 1 }));

        // Busca posição do dia ANTERIOR (não de hoje) para comparação
        const today = new Date().toISOString().split('T')[0];
        const { data: historyData } = await supabaseClient
            .from('ranking_history')
            .select('department_id, department_name, position, recorded_at')
            .lt('recorded_at', today) // Apenas registros anteriores a hoje
            .order('recorded_at', { ascending: false });

        // Pega a posição mais recente (anterior a hoje) de cada departamento
        const previousPositions = {};
        if (historyData) {
            historyData.forEach(h => {
                if (!previousPositions[h.department_id]) {
                    previousPositions[h.department_id] = h.position;
                }
            });
        }

        // Combina ranking atual com histórico para determinar mudança
        const ranking = currentRanking.map(dept => {
            const prevPos = previousPositions[dept.department_id];
            let change = 'same';

            if (prevPos === undefined) {
                change = 'new';
            } else if (dept.position < prevPos) {
                change = 'up';
            } else if (dept.position > prevPos) {
                change = 'down';
            }

            return {
                ...dept,
                previousPosition: prevPos || dept.position,
                change
            };
        });

        // Gera HTML da seta de posição
        const getPositionArrow = (change, prevPos, currentPos) => {
            const diff = Math.abs((prevPos || 0) - currentPos);
            if (change === 'up') {
                return `<div class="ranking-change up" title="Subiu ${diff} posição(ões)">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"/>
                    </svg>
                </div>`;
            }
            if (change === 'down') {
                return `<div class="ranking-change down" title="Desceu ${diff} posição(ões)">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>`;
            }
            if (change === 'new') {
                return `<div class="ranking-change new" title="Novo no ranking">
                    <span>•</span>
                </div>`;
            }
            return `<div class="ranking-change same" title="Mesma posição">
                <span>–</span>
            </div>`;
        };

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
                const currentPos = dept.position || (idx + 1);
                const posClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
                const arrow = getPositionArrow(dept.change, dept.previousPosition, currentPos);

                html += `
                    <div class="ranking-item">
                        <div class="ranking-pos ${posClass}">${currentPos}</div>
                        ${arrow}
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
            html += `
                <div style="text-align:center;padding:40px 20px;">
                    <div style="width:64px;height:64px;border-radius:16px;background:rgba(18,176,160,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <svg width="28" height="28" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <p style="color:#64748b;font-weight:600;margin-bottom:4px;">Nenhum dado disponível</p>
                    <p style="color:#94a3b8;font-size:12px;">Os rankings serão exibidos quando houver OKRs cadastrados</p>
                </div>
            `;
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
            </div>
        `;

        container.innerHTML = html;
    },

    async renderUpcomingActivities() {
        const container = document.getElementById('upcoming-activities-section');

        try {
            // Calcular datas
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 30); // Próximos 30 dias
            const futureDateStr = futureDate.toISOString().split('T')[0];

            // Buscar iniciativas dos próximos 30 dias
            const { data, error } = await supabaseClient
                .from('initiatives')
                .select('id, nome, data_limite, progress, concluida, department')
                .gte('data_limite', todayStr)
                .lte('data_limite', futureDateStr)
                .eq('concluida', false) // Apenas não concluídas
                .order('data_limite', { ascending: true })
                .limit(50); // Buscar mais para rotacionar

            if (error) throw error;

            const initiatives = data || [];

            let html = `
                <div class="widget widget-fixed-height">
                    <div class="widget-header">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Próximas Atividades
                        <span class="widget-badge">${initiatives.length}</span>
                    </div>
                    <div class="widget-body widget-body-carousel" id="activities-carousel">
            `;

            if (initiatives.length > 0) {
                // Mostrar apenas 2 atividades por vez
                const visibleCount = 2;
                const visibleActivities = initiatives.slice(0, visibleCount);
                const allActivities = initiatives; // Guardar todas para carousel

                // Renderizar apenas as primeiras
                visibleActivities.forEach(init => {
                    const deadline = new Date(init.data_limite + 'T00:00:00');
                    const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                    const isUrgent = daysUntil <= 7;
                    const isNear = daysUntil > 7 && daysUntil <= 15;

                    html += `
                        <div class="activity-item ${isUrgent ? 'urgent' : isNear ? 'near' : ''}"
                             data-activity-id="${init.id}"
                             onclick="Layout.navigate('okrs?initiative=${init.id}')"
                             style="cursor: pointer;">
                            <div class="activity-info">
                                <div class="activity-name">${init.nome}</div>
                                ${init.department ? `
                                    <div class="activity-dept">${init.department}</div>
                                ` : ''}
                            </div>
                            <div class="activity-deadline">
                                <div class="deadline-date">${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                                <div class="deadline-days ${isUrgent ? 'urgent' : isNear ? 'near' : ''}">
                                    ${daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                                </div>
                            </div>
                        </div>
                    `;
                });

                // Iniciar carousel automático se tiver mais atividades
                if (allActivities.length > visibleCount) {
                    setTimeout(() => {
                        this.startActivitiesCarousel(allActivities, visibleCount);
                    }, 3000);
                }
            } else {
                html += `
                    <div style="text-align:center;padding:30px;">
                        <p style="color:var(--text-muted);margin-bottom:12px;">Nenhuma atividade próxima</p>
                        <small style="color:var(--text-muted);font-size:12px;">Iniciativas para os próximos 30 dias aparecerão aqui</small>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;

            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar próximas atividades:', error);
            container.innerHTML = `
                <div class="widget widget-fixed-height">
                    <div class="widget-header">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Próximas Atividades
                    </div>
                    <div class="widget-body">
                        <p style="text-align:center;color:var(--text-muted);padding:20px;">Erro ao carregar</p>
                    </div>
                </div>
            `;
        }
    },

    startActivitiesCarousel(allActivities, visibleCount) {
        const carousel = document.getElementById('activities-carousel');
        if (!carousel || !allActivities || allActivities.length <= visibleCount) return;

        let currentStartIndex = visibleCount; // Começa da próxima atividade não visível
        let isPaused = false;
        let intervalId = null;

        const updateVisibleActivities = () => {
            if (isPaused) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Pegar próximo conjunto de atividades (rotação circular)
            const activitiesToShow = [];
            for (let i = 0; i < visibleCount; i++) {
                const index = (currentStartIndex + i) % allActivities.length;
                activitiesToShow.push(allActivities[index]);
            }

            // Fade out
            carousel.style.opacity = '0';
            carousel.style.transform = 'translateX(-10px)';

            setTimeout(() => {
                // Renderizar novas atividades
                const items = activitiesToShow.map(init => {
                    const deadline = new Date(init.data_limite + 'T00:00:00');
                    const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                    const isUrgent = daysUntil <= 7;
                    const isNear = daysUntil > 7 && daysUntil <= 15;

                    return `
                        <div class="activity-item ${isUrgent ? 'urgent' : isNear ? 'near' : ''}"
                             data-activity-id="${init.id}"
                             onclick="Layout.navigate('okrs?initiative=${init.id}')"
                             style="cursor: pointer;">
                            <div class="activity-info">
                                <div class="activity-name">${init.nome}</div>
                                ${init.department ? `
                                    <div class="activity-dept">${init.department}</div>
                                ` : ''}
                            </div>
                            <div class="activity-deadline">
                                <div class="deadline-date">${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                                <div class="deadline-days ${isUrgent ? 'urgent' : isNear ? 'near' : ''}">
                                    ${daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                carousel.innerHTML = items;

                // Fade in
                setTimeout(() => {
                    carousel.style.opacity = '1';
                    carousel.style.transform = 'translateX(0)';
                }, 50);

            }, 300);

            // Avançar para próximo conjunto
            currentStartIndex = (currentStartIndex + 1) % allActivities.length;
        };

        // Aplicar transição CSS
        carousel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        // Atualizar a cada 5 segundos
        intervalId = setInterval(updateVisibleActivities, 5000);

        // Pausar ao passar mouse
        carousel.addEventListener('mouseenter', () => {
            isPaused = true;
        });

        carousel.addEventListener('mouseleave', () => {
            isPaused = false;
        });

        // Limpar interval ao sair da página
        window.addEventListener('beforeunload', () => {
            if (intervalId) clearInterval(intervalId);
        });
    },

    addStyles() {
        if (document.getElementById('dashboard-styles')) return;

        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            /* ===== DASHBOARD GIO STYLES ===== */
            .dashboard-gio {
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }

            /* ===== SKELETON LOADING ===== */
            .widget-skeleton {
                background: white;
                border-radius: 24px;
                height: 300px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                position: relative;
                overflow: hidden;
            }

            .widget-skeleton::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            /* ===== DASHBOARD GRID ===== */
            .dashboard-grid {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 20px;
                align-items: stretch;
            }

            #ranking-section {
                display: flex;
                flex-direction: column;
            }

            #ranking-section .widget {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .objectives-and-activities {
                display: flex;
                flex-direction: column;
                gap: 20px;
                height: 100%;
            }

            #objectives-section {
                flex: 0 0 auto;
            }

            #upcoming-activities-section {
                flex: 1;
                display: flex;
                min-height: 0;
            }

            #upcoming-activities-section .widget {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            /* ===== WIDGETS GIO STYLE ===== */
            .widget {
                background: white;
                border-radius: 16px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;
            }

            .widget:hover {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }

            .widget-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 18px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                color: white;
                font-weight: 600;
                font-size: 13px;
                letter-spacing: 0.3px;
            }

            .widget-header svg {
                width: 18px;
                height: 18px;
                opacity: 0.9;
            }

            .widget-badge {
                margin-left: auto;
                background: rgba(255,255,255,0.2);
                backdrop-filter: blur(10px);
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
            }

            .widget-body {
                padding: 12px 16px;
                flex: 1;
            }

            .widget-body-table {
                padding: 0;
            }

            .widget-footer {
                padding: 10px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                text-align: right;
            }

            .btn-link-dash {
                background: none;
                border: none;
                color: #12b0a0;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                padding: 0;
                transition: all 0.2s ease;
            }

            .btn-link-dash:hover {
                color: #1e6076;
            }

            /* ===== RANKING STYLES GIO ===== */
            .ranking-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s ease;
            }

            .ranking-item:hover {
                transform: translateX(2px);
            }

            .ranking-item:last-child {
                border-bottom: none;
            }

            .ranking-pos {
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 12px;
                color: #64748b;
                flex-shrink: 0;
            }

            .ranking-pos.gold {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
            }

            .ranking-pos.silver {
                background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
                color: white;
            }

            .ranking-pos.bronze {
                background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
                color: white;
            }

            .ranking-info {
                flex: 1;
                min-width: 0;
            }

            .ranking-name {
                font-weight: 600;
                font-size: 13px;
                color: #1f2937;
                margin-bottom: 5px;
            }

            .ranking-bar .progress {
                height: 6px;
                background: #e2e8f0;
                border-radius: 3px;
                overflow: hidden;
            }

            .ranking-bar .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #12b0a0 0%, #0d9488 100%);
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            .ranking-percent {
                font-weight: 700;
                font-size: 13px;
                color: #12b0a0;
                min-width: 40px;
                text-align: right;
            }

            /* Indicadores de mudança de posição */
            .ranking-change {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 4px;
                flex-shrink: 0;
                font-size: 11px;
                font-weight: 700;
            }

            .ranking-change.up {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
            }

            .ranking-change.up svg {
                stroke: #059669;
            }

            .ranking-change.down {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .ranking-change.down svg {
                stroke: #dc2626;
            }

            .ranking-change.same {
                background: rgba(148, 163, 184, 0.15);
                color: #94a3b8;
            }

            .ranking-change.new {
                background: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
                font-size: 16px;
            }

            /* ===== OBJECTIVES TABLE GIO ===== */
            .dashboard-objectives-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }

            .dashboard-objectives-table thead {
                background: rgba(30, 96, 118, 0.04);
            }

            .dashboard-objectives-table thead th {
                padding: 10px 14px;
                text-align: left;
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #e2e8f0;
            }

            .dashboard-objectives-table .col-cat {
                width: 100px;
            }

            .dashboard-objectives-table .col-obj {
                width: auto;
            }

            .dashboard-objectives-table .col-okrs {
                width: 60px;
                text-align: center;
            }

            .obj-row {
                border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s ease;
            }

            .obj-row:hover {
                background: rgba(18, 176, 160, 0.04);
            }

            .obj-row:last-child {
                border-bottom: none;
            }

            .obj-row td {
                padding: 10px 14px;
                vertical-align: middle;
            }

            .obj-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .obj-text {
                font-size: 12px;
                font-weight: 600;
                color: #1f2937;
                line-height: 1.4;
            }

            .obj-meta {
                font-size: 11px;
                color: #64748b;
                margin-top: 4px;
                padding: 4px 8px;
                background: rgba(18, 176, 160, 0.08);
                border-radius: 4px;
                border-left: 2px solid #12b0a0;
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
                border-radius: 8px;
                background: #f1f5f9;
                font-size: 12px;
                font-weight: 700;
                color: #64748b;
                transition: all 0.2s ease;
            }

            .okr-count-badge.has-okrs {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            /* ===== ACTIVITIES GIO ===== */
            .widget-fixed-height {
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .widget-fixed-height .widget-body {
                flex: 1;
                overflow: hidden;
                position: relative;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .widget-body-carousel {
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 4px 0;
            }

            .activity-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                background: #f8fafc;
                border-radius: 12px;
                border-left: 4px solid #12b0a0;
                transition: all 0.25s ease;
                flex-shrink: 0;
                gap: 16px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .activity-item:hover {
                background: #f1f5f9;
                transform: translateX(4px);
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
            }

            .activity-item.urgent {
                border-left-color: #ef4444;
                background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
            }

            .activity-item.urgent:hover {
                background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
            }

            .activity-item.near {
                border-left-color: #f59e0b;
                background: linear-gradient(135deg, #fffbeb 0%, #fef9f3 100%);
            }

            .activity-item.near:hover {
                background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
            }

            .activity-info {
                flex: 1;
                min-width: 0;
            }

            .activity-name {
                font-size: 13px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 6px;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .activity-dept {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 9px;
                color: #1e6076;
                text-transform: uppercase;
                font-weight: 700;
                letter-spacing: 0.5px;
                background: rgba(30, 96, 118, 0.08);
                padding: 3px 8px;
                border-radius: 4px;
            }

            .activity-deadline {
                text-align: right;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 6px;
                flex-shrink: 0;
            }

            .deadline-date {
                font-size: 14px;
                font-weight: 700;
                color: #1e6076;
                white-space: nowrap;
            }

            .deadline-days {
                font-size: 10px;
                padding: 4px 10px;
                border-radius: 20px;
                font-weight: 700;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(18, 176, 160, 0.25);
            }

            .deadline-days.urgent {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
            }

            .deadline-days.near {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
            }

            /* ===== CAROUSEL INDICATOR ===== */
            .carousel-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #94a3b8;
            }

            .carousel-indicator svg {
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 0.6;
                    transform: scale(1);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
            }

            /* ===== RESPONSIVE ===== */
            @media (max-width: 1024px) {
                .dashboard-grid {
                    grid-template-columns: 1fr;
                    min-height: auto;
                }

                .objectives-and-activities {
                    gap: 20px;
                }

                .widget-fixed-height {
                    max-height: 400px;
                }
            }

            @media (max-width: 768px) {
                .dashboard-gio {
                    margin: -16px;
                    padding: 16px;
                }

                .dashboard-grid {
                    gap: 16px;
                }

                .widget {
                    border-radius: 20px;
                }

                .widget-header {
                    padding: 16px 20px;
                    font-size: 14px;
                }

                .widget-body {
                    padding: 16px 20px;
                }

                .activity-item {
                    padding: 12px 14px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                    border-radius: 10px;
                }

                .activity-deadline {
                    align-items: flex-start;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                    justify-content: space-between;
                    padding-top: 8px;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }

                .activity-name {
                    font-size: 13px;
                }

                .ranking-item {
                    padding: 14px 0;
                    gap: 12px;
                }

                .ranking-pos {
                    width: 32px;
                    height: 32px;
                    font-size: 13px;
                    border-radius: 10px;
                }

                .ranking-name {
                    font-size: 13px;
                }

                .ranking-percent {
                    font-size: 14px;
                    min-width: 45px;
                }

                /* Objectives Mobile */
                .dashboard-objectives-table thead {
                    display: none;
                }

                .dashboard-objectives-table,
                .dashboard-objectives-table tbody,
                .dashboard-objectives-table tr {
                    display: block;
                    width: 100%;
                }

                .obj-row {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 16px !important;
                    border-radius: 0;
                }

                .obj-row td {
                    display: block;
                    padding: 0 !important;
                    width: 100% !important;
                }

                .obj-row td:first-child {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .obj-count {
                    text-align: left !important;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 8px;
                    padding-top: 12px;
                    border-top: 1px solid #f1f5f9;
                }

                .obj-count::before {
                    content: 'OKRs:';
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
            }

            @media (max-width: 480px) {
                .widget {
                    border-radius: 16px;
                }

                .widget-header {
                    padding: 14px 16px;
                    font-size: 13px;
                }

                .widget-body {
                    padding: 14px 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.DashboardPage = DashboardPage;
export { DashboardPage };
