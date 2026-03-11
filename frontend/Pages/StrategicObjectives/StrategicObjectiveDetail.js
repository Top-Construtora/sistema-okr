import { AuthService } from '../../services/auth.js';
import { convertToProxyUrl } from '../../services/supabase.js';
import { StrategicObjective } from '../../Entities/StrategicObjective.js';
import { StrategicSubMetric, CATEGORY_METRIC_CONFIG } from '../../Entities/StrategicSubMetric.js';
import { StrategicTimelineEntry } from '../../Entities/StrategicTimelineEntry.js';
import { Department } from '../../Entities/Department.js';

const FREQUENCIA_LABELS = {
    'semanal': 'Semanal',
    'mensal': 'Mensal',
    'trimestral': 'Trimestral',
    'semestral': 'Semestral',
    'anual': 'Anual'
};

const StrategicObjectiveDetailPage = {
    objective: null,
    currentMetric: null,
    timelineEntries: [],
    departments: [],

    async render(objectiveId) {
        const content = document.getElementById('content');

        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="widget-skeleton" style="height:200px;"></div>
                <div class="widget-skeleton" style="height:300px;margin-top:16px;"></div>
            </div>
        `;

        this.addStyles();

        this.objective = await StrategicObjective.getByIdWithSubMetrics(objectiveId);

        if (!this.objective) {
            content.innerHTML = `
                <div class="dashboard-gio">
                    <div class="widget" style="text-align:center;padding:60px 20px;">
                        <p style="color:#64748b;font-weight:600;">Objetivo não encontrado</p>
                        <button class="btn-gio-secondary" style="margin-top:16px;" onclick="Layout.navigate('strategic-objectives')">Voltar</button>
                    </div>
                </div>
            `;
            return;
        }

        const categoryConfig = CATEGORY_METRIC_CONFIG[this.objective.category] || {};

        // Para Melhoria Contínua, busca métricas auto-calculadas
        if (categoryConfig.metric_mode === 'auto_okr' && this.objective.cycle_id) {
            const autoMetrics = await StrategicSubMetric.getAutoOkrMetrics(this.objective.id, this.objective.cycle_id);
            this.objective.sub_metrics = autoMetrics;
        }

        // Busca entradas da timeline e departamentos em paralelo
        const [timelineEntries, departments] = await Promise.all([
            StrategicTimelineEntry.getByObjectiveId(objectiveId),
            Department.getActive()
        ]);
        this.timelineEntries = timelineEntries;
        this.departments = departments;

        this.renderPage();
    },

    renderPage() {
        const content = document.getElementById('content');
        const obj = this.objective;
        const isAdmin = AuthService.isAdmin();
        const categoryConfig = CATEGORY_METRIC_CONFIG[obj.category] || { unit: 'R$', format: 'currency', metric_mode: 'normal' };
        const metricMode = categoryConfig.metric_mode || 'normal';
        const cycleName = obj.cycles ? obj.cycles.nome : 'Sem ciclo';

        const categoryColors = {
            'Construtora': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
            'Incorporadora': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
            'Melhoria Contínua': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
            'Obra': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
            'Empreendimento Econômico': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
        };
        const colors = categoryColors[obj.category] || { bg: '#f3f4f6', color: '#6b7280' };

        const subMetrics = obj.sub_metrics || [];

        // Calcula totais baseado no modo
        let totalHTML = '';
        if (metricMode !== 'qualitative' && subMetrics.length > 0) {
            if (metricMode === 'auto_okr') {
                // Média de progresso dos departamentos
                const metricsWithOkrs = subMetrics.filter(m => m._okr_count > 0);
                const avgProgress = metricsWithOkrs.length > 0
                    ? Math.round(metricsWithOkrs.reduce((sum, m) => sum + m.current_value, 0) / metricsWithOkrs.length)
                    : 0;

                totalHTML = `
                    <div class="sod-total-row">
                        <div class="sod-total-label">MÉDIA GERAL</div>
                        <div class="sod-total-values">
                            <span class="sod-total-current">${avgProgress}%</span>
                            <span class="sod-total-sep">de progresso</span>
                        </div>
                        <div class="sod-total-progress-container">
                            <div class="sod-progress-bar">
                                <div class="sod-progress-fill" style="width:${avgProgress}%;background:${colors.color};"></div>
                            </div>
                            <span class="sod-total-pct">${avgProgress}%</span>
                        </div>
                    </div>
                `;
            } else if (metricMode === 'inverse') {
                // Para inverso, o total mostra a média dos valores atuais vs meta
                const totalTarget = subMetrics.reduce((sum, m) => sum + (m.target_value || 0), 0);
                const totalCurrent = subMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);
                const avgTarget = subMetrics.length > 0 ? totalTarget / subMetrics.length : 0;
                const avgCurrent = subMetrics.length > 0 ? totalCurrent / subMetrics.length : 0;
                const inverseProgress = avgTarget > 0 ? Math.max(0, (1 - avgCurrent / avgTarget) * 100) : 0;
                const statusColor = avgCurrent <= avgTarget * 0.7 ? '#10b981' : (avgCurrent <= avgTarget ? '#f59e0b' : '#ef4444');

                totalHTML = `
                    <div class="sod-total-row">
                        <div class="sod-total-label">TOTAL</div>
                        <div class="sod-total-values">
                            <span class="sod-total-current">${StrategicSubMetric.formatValue(avgCurrent, '%')}</span>
                            <span class="sod-total-sep">Meta: &lt;</span>
                            <span class="sod-total-target">${StrategicSubMetric.formatValue(avgTarget, '%')}</span>
                        </div>
                        <div class="sod-total-progress-container">
                            <div class="sod-progress-bar">
                                <div class="sod-progress-fill" style="width:${Math.min(inverseProgress, 100)}%;background:${statusColor};"></div>
                            </div>
                            <span class="sod-total-pct">${inverseProgress.toFixed(0)}%</span>
                        </div>
                    </div>
                `;
            } else {
                // Normal
                const totalTarget = subMetrics.reduce((sum, m) => sum + (m.target_value || 0), 0);
                const totalCurrent = subMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);
                const totalProgress = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;

                totalHTML = `
                    <div class="sod-total-row">
                        <div class="sod-total-label">TOTAL</div>
                        <div class="sod-total-values">
                            <span class="sod-total-current">${StrategicSubMetric.formatValue(totalCurrent, categoryConfig.unit)}</span>
                            <span class="sod-total-sep">/</span>
                            <span class="sod-total-target">${StrategicSubMetric.formatValue(totalTarget, categoryConfig.unit)}</span>
                        </div>
                        <div class="sod-total-progress-container">
                            <div class="sod-progress-bar">
                                <div class="sod-progress-fill" style="width:${totalProgress}%;background:${colors.color};"></div>
                            </div>
                            <span class="sod-total-pct">${totalProgress.toFixed(0)}%</span>
                        </div>
                    </div>
                `;
            }
        }

        const metricsHTML = subMetrics.map(m => this.renderMetricRow(m, categoryConfig, colors, isAdmin, metricMode)).join('');

        // Determina se mostra botão de nova sub-métrica (não para auto_okr)
        const showAddMetricBtn = isAdmin && metricMode !== 'auto_okr';

        // Determina título da seção de métricas
        const metricsSectionTitle = metricMode === 'auto_okr' ? 'Progresso por Departamento' : 'Sub-Métricas';

        // Empty state text
        const emptyText = metricMode === 'auto_okr'
            ? 'Nenhum OKR encontrado para este ciclo'
            : 'Nenhuma sub-métrica cadastrada';
        const emptyHint = metricMode === 'auto_okr'
            ? 'Os departamentos aparecerão automaticamente quando houver OKRs vinculados'
            : 'Adicione sub-métricas para acompanhar o progresso deste objetivo';

        // Timeline HTML
        const timelineHTML = this.renderTimeline(isAdmin);

        // Indicadores section
        const frequenciaLabel = obj.frequencia_medicao ? FREQUENCIA_LABELS[obj.frequencia_medicao] || obj.frequencia_medicao : null;
        const deptIds = obj.responsavel_departamento_ids || [];
        const responsavelNomes = deptIds.map(id => {
            const dept = this.departments.find(d => d.id === id);
            return dept ? dept.nome : null;
        }).filter(Boolean);
        const hasIndicadores = obj.indicadores || obj.fonte_coleta || obj.frequencia_medicao || deptIds.length > 0;

        const responsavelHTML = responsavelNomes.length > 0
            ? responsavelNomes.map(nome => `<span class="sod-dept-tag">${nome}</span>`).join('')
            : '<span class="sod-indicator-empty">Não definido</span>';

        const indicadoresHTML = `
            <div class="sod-indicators-section">
                <div class="sod-metrics-header">
                    <h3 class="sod-metrics-title">Indicadores</h3>
                    ${isAdmin ? `
                        <div style="display:flex;gap:8px;">
                            ${hasIndicadores ? `
                                <button class="sod-ind-clear-btn" onclick="StrategicObjectiveDetailPage.clearIndicadores()">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Limpar
                                </button>
                            ` : ''}
                            <button class="so-page-bar-btn" onclick="StrategicObjectiveDetailPage.openIndicadoresModal()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Editar
                            </button>
                        </div>
                    ` : ''}
                </div>
                ${hasIndicadores ? `
                    <div class="sod-indicators-grid">
                        <div class="sod-indicator-item">
                            <div class="sod-indicator-label">
                                <svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                Indicadores
                            </div>
                            <div class="sod-indicator-value">${obj.indicadores || '<span class="sod-indicator-empty">Não definido</span>'}</div>
                        </div>
                        <div class="sod-indicator-item">
                            <div class="sod-indicator-label">
                                <svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                Fonte de Coleta
                            </div>
                            <div class="sod-indicator-value">${obj.fonte_coleta || '<span class="sod-indicator-empty">Não definido</span>'}</div>
                        </div>
                        <div class="sod-indicator-item">
                            <div class="sod-indicator-label">
                                <svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Frequência de Medição
                            </div>
                            <div class="sod-indicator-value">${frequenciaLabel ? `<span class="sod-frequency-badge">${frequenciaLabel}</span>` : '<span class="sod-indicator-empty">Não definido</span>'}</div>
                        </div>
                        <div class="sod-indicator-item">
                            <div class="sod-indicator-label">
                                <svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Responsáveis
                            </div>
                            <div class="sod-indicator-value sod-dept-tags">${responsavelHTML}</div>
                        </div>
                    </div>
                ` : `
                    <div class="sod-empty" style="padding:32px 20px;">
                        <p class="sod-empty-text">Nenhum indicador configurado</p>
                        <p class="sod-empty-hint">Configure os indicadores, fonte de coleta, frequência e responsáveis</p>
                    </div>
                `}
            </div>
        `;

        content.innerHTML = `
            <div class="dashboard-gio">
                <!-- Header do objetivo -->
                <div class="sod-header">
                    <div class="sod-header-top">
                        <button class="sod-back-btn" onclick="Layout.navigate('strategic-objectives')">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                            Voltar
                        </button>
                        <span class="sod-category-badge" style="background:${colors.bg};color:${colors.color};">${obj.category}</span>
                        <span class="sod-cycle-badge">${cycleName}</span>
                    </div>
                    <h2 class="sod-title">${obj.text}</h2>
                    ${obj.meta ? `<p class="sod-meta">Meta: ${obj.meta}</p>` : ''}
                </div>

                <!-- Indicadores -->
                ${indicadoresHTML}

                <!-- Sub-Métricas -->
                <div class="sod-metrics-section">
                    <div class="sod-metrics-header">
                        <h3 class="sod-metrics-title">${metricsSectionTitle}</h3>
                        ${showAddMetricBtn ? `
                            <button class="so-page-bar-btn" onclick="StrategicObjectiveDetailPage.openMetricModal()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Nova Sub-Métrica
                            </button>
                        ` : ''}
                    </div>

                    ${subMetrics.length === 0 ? `
                        <div class="sod-empty">
                            <div class="sod-empty-icon">
                                <svg width="28" height="28" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <p class="sod-empty-text">${emptyText}</p>
                            <p class="sod-empty-hint">${emptyHint}</p>
                        </div>
                    ` : `
                        <div class="sod-metrics-list">
                            ${metricsHTML}
                        </div>
                        ${totalHTML}
                    `}
                </div>

                <!-- Timeline -->
                ${timelineHTML}

                <!-- Modal -->
                <div id="sod-metric-modal" class="modal-gio-container" style="display:none;"></div>
                <div id="sod-timeline-modal" class="modal-gio-container" style="display:none;"></div>
                <div id="sod-indicators-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;
    },

    renderMetricRow(metric, categoryConfig, colors, isAdmin, metricMode) {
        const isText = metric.unit === 'texto';
        const isAuto = metric._is_auto;
        const isInverse = metricMode === 'inverse';

        // Qualitative mode (texto)
        if (isText) {
            return `
                <div class="sod-metric-row">
                    <div class="sod-metric-info">
                        <span class="sod-metric-name">${metric.name}</span>
                        <span class="sod-metric-value-text">${metric.current_value ? 'Registrado' : 'Pendente'}</span>
                    </div>
                    ${isAdmin && !isAuto ? `
                        <div class="sod-metric-actions" onclick="event.stopPropagation();">
                            <button class="so-obj-action-btn" onclick="StrategicObjectiveDetailPage.openMetricModal(${metric.id})" title="Editar">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectiveDetailPage.deleteMetric(${metric.id})" title="Excluir">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const progress = metric.progress;

        // Auto OKR mode - departamento com média de progresso
        if (isAuto) {
            const okrCount = metric._okr_count || 0;
            const barColor = progress >= 70 ? '#10b981' : (progress >= 40 ? '#f59e0b' : '#ef4444');

            return `
                <div class="sod-metric-row">
                    <div class="sod-metric-info">
                        <span class="sod-metric-name">${metric.name}</span>
                        <div class="sod-metric-values">
                            <span class="sod-metric-current" style="color:${barColor};">${metric.current_value}%</span>
                            <span class="sod-metric-sep">-</span>
                            <span class="sod-metric-target">${okrCount} OKR${okrCount !== 1 ? 's' : ''}</span>
                        </div>
                        ${okrCount === 0 ? `<span class="sod-auto-warning">Sem OKRs neste ciclo</span>` : ''}
                    </div>
                    <div class="sod-metric-progress-area">
                        <div class="sod-progress-bar">
                            <div class="sod-progress-fill" style="width:${progress}%;background:${barColor};"></div>
                        </div>
                        <span class="sod-metric-pct">${progress.toFixed(0)}%</span>
                    </div>
                </div>
            `;
        }

        // Inverse mode (Obra) - verde se abaixo da meta
        if (isInverse) {
            const current = metric.current_value;
            const target = metric.target_value;
            // Cor: verde se abaixo de 70% da meta, amarelo se entre 70-100%, vermelho se acima
            const barColor = current <= target * 0.7 ? '#10b981' : (current <= target ? '#f59e0b' : '#ef4444');
            const inverseProgress = target > 0 ? Math.max(0, (1 - current / target) * 100) : 0;

            return `
                <div class="sod-metric-row">
                    <div class="sod-metric-info">
                        <span class="sod-metric-name">${metric.name}</span>
                        <div class="sod-metric-values">
                            <span class="sod-metric-current" style="color:${barColor};">${StrategicSubMetric.formatValue(current, metric.unit)}</span>
                            <span class="sod-metric-sep">Meta: &lt;</span>
                            <span class="sod-metric-target">${StrategicSubMetric.formatValue(target, metric.unit)}</span>
                        </div>
                    </div>
                    <div class="sod-metric-progress-area">
                        <div class="sod-progress-bar">
                            <div class="sod-progress-fill" style="width:${Math.min(inverseProgress, 100)}%;background:${barColor};"></div>
                        </div>
                        <span class="sod-metric-pct" style="color:${barColor};">${inverseProgress.toFixed(0)}%</span>
                    </div>
                    ${isAdmin ? `
                        <div class="sod-metric-actions" onclick="event.stopPropagation();">
                            <button class="so-obj-action-btn" onclick="StrategicObjectiveDetailPage.openMetricModal(${metric.id})" title="Editar">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectiveDetailPage.deleteMetric(${metric.id})" title="Excluir">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Normal mode (Construtora, Incorporadora)
        return `
            <div class="sod-metric-row">
                <div class="sod-metric-info">
                    <span class="sod-metric-name">${metric.name}</span>
                    <div class="sod-metric-values">
                        <span class="sod-metric-current">${StrategicSubMetric.formatValue(metric.current_value, metric.unit)}</span>
                        <span class="sod-metric-sep">/</span>
                        <span class="sod-metric-target">${StrategicSubMetric.formatValue(metric.target_value, metric.unit)}</span>
                    </div>
                </div>
                <div class="sod-metric-progress-area">
                    <div class="sod-progress-bar">
                        <div class="sod-progress-fill" style="width:${progress}%;background:${colors.color};"></div>
                    </div>
                    <span class="sod-metric-pct">${progress.toFixed(0)}%</span>
                </div>
                ${isAdmin ? `
                    <div class="sod-metric-actions" onclick="event.stopPropagation();">
                        <button class="so-obj-action-btn" onclick="StrategicObjectiveDetailPage.openMetricModal(${metric.id})" title="Editar">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectiveDetailPage.deleteMetric(${metric.id})" title="Excluir">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // =====================================================
    // TIMELINE
    // =====================================================

    /**
     * Gera períodos entre startDate e endDate baseado na frequência
     */
    generatePeriods(freq, startDate, endDate) {
        const periods = [];
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mesesFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        if (freq === 'anual') {
            for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
                periods.push({
                    label: `${y}`,
                    short: `${y}`,
                    start: new Date(y, 0, 1),
                    end: new Date(y, 11, 31, 23, 59, 59)
                });
            }
        } else if (freq === 'semestral') {
            let d = new Date(startDate.getFullYear(), startDate.getMonth() < 6 ? 0 : 6, 1);
            while (d <= endDate) {
                const sem = d.getMonth() < 6 ? 1 : 2;
                const y = d.getFullYear();
                const endMonth = sem === 1 ? 5 : 11;
                periods.push({
                    label: `${sem}º Semestre ${y}`,
                    short: `S${sem}/${y}`,
                    start: new Date(y, sem === 1 ? 0 : 6, 1),
                    end: new Date(y, endMonth + 1, 0, 23, 59, 59)
                });
                d = new Date(y, sem === 1 ? 6 : 12, 1);
            }
        } else if (freq === 'trimestral') {
            let d = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
            while (d <= endDate) {
                const q = Math.floor(d.getMonth() / 3) + 1;
                const y = d.getFullYear();
                const startM = (q - 1) * 3;
                periods.push({
                    label: `${q}º Trimestre ${y}`,
                    short: `T${q}/${y}`,
                    start: new Date(y, startM, 1),
                    end: new Date(y, startM + 3, 0, 23, 59, 59)
                });
                d = new Date(y, startM + 3, 1);
            }
        } else if (freq === 'mensal') {
            let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (d <= endDate) {
                const m = d.getMonth();
                const y = d.getFullYear();
                periods.push({
                    label: `${mesesFull[m]} ${y}`,
                    short: `${meses[m]}/${y}`,
                    start: new Date(y, m, 1),
                    end: new Date(y, m + 1, 0, 23, 59, 59)
                });
                d = new Date(y, m + 1, 1);
            }
        } else if (freq === 'semanal') {
            let d = new Date(startDate);
            d.setDate(d.getDate() - d.getDay() + 1); // segunda
            let weekNum = 1;
            while (d <= endDate) {
                const wStart = new Date(d);
                const wEnd = new Date(d);
                wEnd.setDate(wEnd.getDate() + 6);
                wEnd.setHours(23, 59, 59);
                periods.push({
                    label: `Semana ${weekNum} — ${wStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${wEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
                    short: `Sem ${weekNum}`,
                    start: wStart,
                    end: wEnd
                });
                d.setDate(d.getDate() + 7);
                weekNum++;
            }
        }
        return periods;
    },

    renderTimeline(isAdmin) {
        const entries = this.timelineEntries || [];
        const obj = this.objective;
        const freq = obj.frequencia_medicao;

        // Se não há frequência, mostra lista simples
        if (!freq) {
            return this.renderSimpleTimeline(entries, isAdmin);
        }

        // Determina range de datas
        const cycle = obj.cycles;
        const now = new Date();
        let rangeStart, rangeEnd;

        if (cycle && cycle.data_inicio && cycle.data_fim) {
            rangeStart = new Date(cycle.data_inicio);
            rangeEnd = new Date(cycle.data_fim);
        } else {
            // Fallback: do registro mais antigo até hoje
            if (entries.length > 0) {
                const dates = entries.map(e => new Date(e.created_at));
                rangeStart = new Date(Math.min(...dates));
                rangeEnd = new Date(Math.max(...dates.map(d => d.getTime()), now.getTime()));
            } else {
                rangeStart = new Date(now.getFullYear(), 0, 1);
                rangeEnd = now;
            }
        }

        const periods = this.generatePeriods(freq, rangeStart, rangeEnd);

        // Agrupa entries em períodos (usa measured_at para agrupar)
        const grouped = periods.map(period => {
            const periodEntries = entries.filter(e => {
                const d = new Date(e.effectiveDate);
                return d >= period.start && d <= period.end;
            });
            return { ...period, entries: periodEntries };
        });

        // Determina período atual
        const currentPeriodIdx = grouped.findIndex(p => now >= p.start && now <= p.end);

        // Windowing para semanal/mensal: mostra apenas períodos próximos do atual
        const WINDOW_SIZE = freq === 'semanal' ? 4 : freq === 'mensal' ? 3 : 0;
        const forceExpand = this._forceExpandTimeline;
        this._forceExpandTimeline = null;
        let visibleStart = 0;
        let visibleEnd = grouped.length;

        if (WINDOW_SIZE > 0 && grouped.length > WINDOW_SIZE * 2 + 1 && !forceExpand) {
            const center = currentPeriodIdx >= 0 ? currentPeriodIdx : grouped.length - 1;
            visibleStart = Math.max(0, center - WINDOW_SIZE);
            visibleEnd = Math.min(grouped.length, center + WINDOW_SIZE + 1);

            // Expande para incluir períodos com registros que ficaram fora da janela
            for (let i = 0; i < grouped.length; i++) {
                if (grouped[i].entries.length > 0) {
                    if (i < visibleStart) visibleStart = i;
                    if (i >= visibleEnd) visibleEnd = i + 1;
                }
            }
        }

        // Guarda estado de expansão
        this._timelineWindow = { visibleStart, visibleEnd, total: grouped.length };

        const freqLabel = FREQUENCIA_LABELS[freq] || freq;

        const hiddenBefore = visibleStart;
        const hiddenAfter = grouped.length - visibleEnd;

        const beforeBtnHTML = hiddenBefore > 0 ? `
            <div class="sod-period-expand-btn" onclick="StrategicObjectiveDetailPage.expandTimeline('before')">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                Ver ${hiddenBefore} período${hiddenBefore > 1 ? 's' : ''} anterior${hiddenBefore > 1 ? 'es' : ''}
            </div>` : '';

        const afterBtnHTML = hiddenAfter > 0 ? `
            <div class="sod-period-expand-btn" onclick="StrategicObjectiveDetailPage.expandTimeline('after')">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                Ver ${hiddenAfter} período${hiddenAfter > 1 ? 's' : ''} seguinte${hiddenAfter > 1 ? 's' : ''}
            </div>` : '';

        const visiblePeriods = grouped.slice(visibleStart, visibleEnd);

        const periodsHTML = visiblePeriods.length === 0
            ? `<div class="sod-empty" style="padding:32px 20px;">
                    <p class="sod-empty-text">Nenhum período disponível</p>
               </div>`
            : visiblePeriods.map((period, localIdx) => {
                const globalIdx = visibleStart + localIdx;
                const isCurrent = globalIdx === currentPeriodIdx;
                const isPast = period.end < now;
                const count = period.entries.length;
                const hasEntries = count > 0;
                const statusClass = isCurrent ? 'sod-period-current' : (isPast ? (hasEntries ? 'sod-period-done' : 'sod-period-missed') : 'sod-period-future');

                const entriesHTML = period.entries.map(e => this.renderTimelineEntry(e, isAdmin)).join('');

                return `
                    <div class="sod-period ${statusClass}">
                        <div class="sod-period-header" onclick="StrategicObjectiveDetailPage.togglePeriod(this)">
                            <div class="sod-period-marker">
                                <div class="sod-period-dot"></div>
                                ${localIdx < visiblePeriods.length - 1 ? '<div class="sod-period-line"></div>' : ''}
                            </div>
                            <div class="sod-period-info">
                                <span class="sod-period-label">${period.label}</span>
                                ${isCurrent ? '<span class="sod-period-badge-current">Atual</span>' : ''}
                            </div>
                            <div class="sod-period-right">
                                ${hasEntries
                                    ? `<span class="sod-period-count">${count} registro${count > 1 ? 's' : ''}</span>`
                                    : `<span class="sod-period-count sod-period-count-empty">${isPast ? 'Sem registros' : 'Pendente'}</span>`
                                }
                                <svg class="sod-period-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="${isCurrent || hasEntries ? 'transform:rotate(180deg)' : ''}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                            </div>
                        </div>
                        <div class="sod-period-body" style="display:${isCurrent || hasEntries ? 'block' : 'none'};">
                            ${hasEntries
                                ? `<div class="sod-timeline-list">${entriesHTML}</div>`
                                : `<div class="sod-period-empty">
                                        <span>${isCurrent ? 'Nenhum registro neste período ainda' : 'Nenhum registro neste período'}</span>
                                   </div>`
                            }
                        </div>
                    </div>
                `;
            }).join('');

        return `
            <div class="sod-metrics-section sod-timeline-section">
                <div class="sod-metrics-header">
                    <div>
                        <h3 class="sod-metrics-title">Timeline</h3>
                        <span class="sod-timeline-freq-label">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Frequência ${freqLabel} — ${entries.length} registro${entries.length !== 1 ? 's' : ''} total
                        </span>
                    </div>
                    ${isAdmin ? `
                        <button class="so-page-bar-btn" onclick="StrategicObjectiveDetailPage.openTimelineModal()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo Registro
                        </button>
                    ` : ''}
                </div>
                <div class="sod-periods-container">
                    ${beforeBtnHTML}
                    ${periodsHTML}
                    ${afterBtnHTML}
                </div>
            </div>
        `;
    },

    expandTimeline(direction) {
        // Re-render com todos os períodos visíveis
        this._forceExpandTimeline = direction;
        this.renderPage();
    },

    renderSimpleTimeline(entries, isAdmin) {
        const entriesHTML = entries.length === 0
            ? `<div class="sod-empty" style="padding:32px 20px;">
                    <p class="sod-empty-text">Nenhum registro na timeline</p>
                    <p class="sod-empty-hint">Adicione registros para acompanhar o histórico deste objetivo</p>
               </div>`
            : entries.map(entry => this.renderTimelineEntry(entry, isAdmin)).join('');

        return `
            <div class="sod-metrics-section sod-timeline-section">
                <div class="sod-metrics-header">
                    <div>
                        <h3 class="sod-metrics-title">Timeline</h3>
                        <span class="sod-timeline-freq-label" style="color:#9ca3af;">
                            Sem frequência definida — ${entries.length} registro${entries.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    ${isAdmin ? `
                        <button class="so-page-bar-btn" onclick="StrategicObjectiveDetailPage.openTimelineModal()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo Registro
                        </button>
                    ` : ''}
                </div>
                <div class="sod-timeline-list">
                    ${entriesHTML}
                </div>
            </div>
        `;
    },

    togglePeriod(headerEl) {
        const body = headerEl.nextElementSibling;
        const chevron = headerEl.querySelector('.sod-period-chevron');
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    },

    renderTimelineEntry(entry, isAdmin) {
        const typeIcon = entry.entry_type === 'file'
            ? '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>'
            : entry.entry_type === 'link'
                ? '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>'
                : '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';

        let attachmentHTML = '';
        if (entry.entry_type === 'link' && entry.url) {
            attachmentHTML = `
                <a href="${convertToProxyUrl(entry.url)}" target="_blank" rel="noopener noreferrer" class="sod-timeline-attachment sod-timeline-link">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    ${entry.url.length > 50 ? entry.url.substring(0, 50) + '...' : entry.url}
                </a>
            `;
        } else if (entry.entry_type === 'file' && entry.url) {
            attachmentHTML = `
                <a href="${convertToProxyUrl(entry.url)}" target="_blank" rel="noopener noreferrer" class="sod-timeline-attachment sod-timeline-file">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    ${entry.file_name || 'Arquivo'}
                </a>
            `;
        }

        // Badge de sub-métrica vinculada
        let metricBadgeHTML = '';
        if (entry.sub_metric_id && entry.strategic_sub_metrics) {
            const metricName = entry.strategic_sub_metrics.name;
            const unit = entry.strategic_sub_metrics.unit || '';
            const formattedValue = '+' + StrategicSubMetric.formatValue(entry.progress_value, unit);
            metricBadgeHTML = `
                <span class="sod-timeline-metric-badge">
                    ${metricName}
                    <span class="sod-timeline-metric-value">${formattedValue}</span>
                </span>
            `;
        }

        return `
            <div class="sod-timeline-entry">
                <div class="sod-timeline-entry-header">
                    <div class="sod-timeline-date">
                        ${typeIcon}
                        <span>${entry.formattedDate}</span>
                        ${entry.createdByName !== 'Sistema' ? `<span class="sod-timeline-author">por ${entry.createdByName}</span>` : ''}
                        ${metricBadgeHTML}
                    </div>
                    ${isAdmin ? `
                        <div class="sod-timeline-actions">
                            <button class="so-obj-action-btn" onclick="StrategicObjectiveDetailPage.openEditTimelineModal(${entry.id})" title="Editar">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectiveDetailPage.deleteTimelineEntry(${entry.id})" title="Excluir">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <p class="sod-timeline-description">${entry.description}</p>
                ${attachmentHTML}
            </div>
        `;
    },

    // =====================================================
    // TIMELINE MODAL
    // =====================================================

    getEligibleSubMetrics() {
        const categoryConfig = CATEGORY_METRIC_CONFIG[this.objective.category] || {};
        const metricMode = categoryConfig.metric_mode || 'normal';
        // Não mostra dropdown para auto_okr (Melhoria Contínua) nem qualitative (Empreendimento Econômico)
        if (metricMode === 'auto_okr' || metricMode === 'qualitative') return [];
        return (this.objective.sub_metrics || []).filter(m => !m._is_auto && m.unit !== 'texto');
    },

    openTimelineModal() {
        const modal = document.getElementById('sod-timeline-modal');
        const eligibleMetrics = this.getEligibleSubMetrics();

        const metricDropdownHTML = eligibleMetrics.length > 0 ? `
            <div class="form-group-gio">
                <label class="form-label-gio">Vincular a Sub-Métrica (opcional)</label>
                <select id="sod-timeline-metric" class="form-control-gio" onchange="StrategicObjectiveDetailPage.onTimelineMetricChange()">
                    <option value="">Nenhuma</option>
                    ${eligibleMetrics.map(m => `<option value="${m.id}" data-unit="${m.unit}">${m.name}</option>`).join('')}
                </select>
            </div>
            <div id="sod-timeline-progress-field" style="display:none;">
                <div class="form-group-gio">
                    <label class="form-label-gio">Valor de Progresso *</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="number" id="sod-timeline-progress" class="form-control-gio"
                            placeholder="0" min="0" step="any" style="flex:1;">
                        <span id="sod-timeline-progress-unit" style="font-size:13px;font-weight:600;color:#374151;min-width:30px;"></span>
                    </div>
                    <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">
                        Este valor será somado ao progresso atual da sub-métrica
                    </small>
                </div>
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="StrategicObjectiveDetailPage.closeTimelineModal()"></div>
            <div class="modal-content-gio" style="max-width:520px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>Novo Registro na Timeline</h3>
                        <p>Objetivo: ${this.objective.text.substring(0, 60)}${this.objective.text.length > 60 ? '...' : ''}</p>
                    </div>
                    <button class="modal-close-gio" onclick="StrategicObjectiveDetailPage.closeTimelineModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    ${metricDropdownHTML}
                    <div class="form-group-gio">
                        <label class="form-label-gio">Tipo de Registro *</label>
                        <select id="sod-timeline-type" class="form-control-gio" onchange="StrategicObjectiveDetailPage.onTimelineTypeChange()">
                            <option value="text">Texto</option>
                            <option value="link">Link</option>
                            <option value="file">Arquivo</option>
                        </select>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Data da Medição</label>
                        <input type="date" id="sod-timeline-measured-at" class="form-control-gio"
                            value="${new Date().toISOString().split('T')[0]}">
                        <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">
                            Data em que a medição foi realizada
                        </small>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Descrição *</label>
                        <textarea id="sod-timeline-description" class="form-control-gio" rows="3"
                            placeholder="Descreva o registro..."></textarea>
                    </div>
                    <div id="sod-timeline-dynamic-field">
                        <!-- Campo dinâmico baseado no tipo -->
                    </div>
                    <div id="sod-timeline-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="StrategicObjectiveDetailPage.closeTimelineModal()">Cancelar</button>
                    <button class="btn-gio-primary" id="sod-timeline-save-btn" onclick="StrategicObjectiveDetailPage.saveTimelineEntry()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        this._selectedFile = null;
        this.onTimelineTypeChange();
    },

    onTimelineMetricChange() {
        const metricSelect = document.getElementById('sod-timeline-metric');
        const progressField = document.getElementById('sod-timeline-progress-field');
        const unitLabel = document.getElementById('sod-timeline-progress-unit');

        if (!metricSelect || !progressField) return;

        const selectedOption = metricSelect.options[metricSelect.selectedIndex];
        if (metricSelect.value) {
            const unit = selectedOption.getAttribute('data-unit') || '';
            progressField.style.display = 'block';
            if (unitLabel) unitLabel.textContent = unit;
        } else {
            progressField.style.display = 'none';
            const progressInput = document.getElementById('sod-timeline-progress');
            if (progressInput) progressInput.value = '';
        }
    },

    onTimelineTypeChange() {
        const type = document.getElementById('sod-timeline-type').value;
        const dynamicField = document.getElementById('sod-timeline-dynamic-field');

        if (type === 'link') {
            dynamicField.innerHTML = `
                <div class="form-group-gio">
                    <label class="form-label-gio">URL do Link *</label>
                    <input type="url" id="sod-timeline-url" class="form-control-gio"
                        placeholder="https://exemplo.com/documento">
                </div>
            `;
        } else if (type === 'file') {
            dynamicField.innerHTML = `
                <div class="form-group-gio">
                    <label class="form-label-gio">Arquivo *</label>
                    <input type="file" id="sod-timeline-file" class="form-control-gio"
                        onchange="StrategicObjectiveDetailPage.onFileSelected(event)"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt,.csv">
                    <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">
                        Formatos aceitos: PDF, DOC, XLS, PPT, imagens, ZIP, TXT, CSV (max 10MB)
                    </small>
                    <div id="sod-file-preview" style="display:none;margin-top:8px;"></div>
                </div>
            `;
        } else {
            dynamicField.innerHTML = '';
        }
    },

    onFileSelected(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('sod-file-preview');

        if (!file) {
            this._selectedFile = null;
            if (preview) preview.style.display = 'none';
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            const errorDiv = document.getElementById('sod-timeline-error');
            errorDiv.textContent = 'Arquivo muito grande. Máximo 10MB.';
            errorDiv.style.display = 'block';
            event.target.value = '';
            this._selectedFile = null;
            return;
        }

        this._selectedFile = file;
        if (preview) {
            const sizeStr = file.size < 1024 * 1024
                ? (file.size / 1024).toFixed(1) + ' KB'
                : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            preview.innerHTML = `<span style="font-size:12px;color:#374151;">${file.name} (${sizeStr})</span>`;
            preview.style.display = 'block';
        }
    },

    closeTimelineModal() {
        const modal = document.getElementById('sod-timeline-modal');
        if (modal) modal.style.display = 'none';
        this._selectedFile = null;
    },

    async saveTimelineEntry() {
        const type = document.getElementById('sod-timeline-type').value;
        const description = document.getElementById('sod-timeline-description').value.trim();
        const errorDiv = document.getElementById('sod-timeline-error');
        const saveBtn = document.getElementById('sod-timeline-save-btn');

        if (!description) {
            errorDiv.textContent = 'Descrição é obrigatória';
            errorDiv.style.display = 'block';
            return;
        }

        // Lê campos de sub-métrica (se existirem)
        const metricSelect = document.getElementById('sod-timeline-metric');
        const progressInput = document.getElementById('sod-timeline-progress');
        const selectedMetricId = metricSelect ? metricSelect.value : '';
        const progressValue = progressInput ? parseFloat(progressInput.value) : 0;

        if (selectedMetricId && (!progressValue || progressValue <= 0)) {
            errorDiv.textContent = 'Informe um valor de progresso maior que 0';
            errorDiv.style.display = 'block';
            return;
        }

        const measuredAtInput = document.getElementById('sod-timeline-measured-at');
        const measuredAt = measuredAtInput ? measuredAtInput.value : null;

        const currentUser = AuthService.getCurrentUser();
        const entryData = {
            objective_id: this.objective.id,
            description,
            entry_type: type,
            created_by: currentUser ? currentUser.id : null,
            measured_at: measuredAt ? new Date(measuredAt + 'T12:00:00').toISOString() : new Date().toISOString()
        };

        if (selectedMetricId) {
            entryData.sub_metric_id = parseInt(selectedMetricId);
            entryData.progress_value = progressValue;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-gio"></span> Salvando...';

            if (type === 'link') {
                const url = document.getElementById('sod-timeline-url').value.trim();
                if (!url) {
                    errorDiv.textContent = 'URL é obrigatória';
                    errorDiv.style.display = 'block';
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar';
                    return;
                }
                entryData.url = url;
            } else if (type === 'file') {
                if (!this._selectedFile) {
                    errorDiv.textContent = 'Selecione um arquivo';
                    errorDiv.style.display = 'block';
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar';
                    return;
                }

                saveBtn.innerHTML = '<span class="spinner-gio"></span> Enviando arquivo...';
                const uploaded = await StrategicTimelineEntry.uploadFile(this._selectedFile, this.objective.id);
                entryData.url = uploaded.url;
                entryData.file_name = uploaded.name;
                entryData.file_path = uploaded.path;
            }

            await StrategicTimelineEntry.create(entryData);

            // Se vinculou a uma sub-métrica, incrementa o current_value
            if (entryData.sub_metric_id && entryData.progress_value) {
                const metric = (this.objective.sub_metrics || []).find(m => m.id === entryData.sub_metric_id);
                if (metric) {
                    const newValue = (metric.current_value || 0) + entryData.progress_value;
                    await StrategicSubMetric.update(metric.id, { current_value: newValue });
                }
            }

            DepartmentsPage.showToast('Registro adicionado!', 'success');
            this.closeTimelineModal();
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao salvar registro da timeline:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar registro';
            errorDiv.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar';
        }
    },

    openEditTimelineModal(entryId) {
        const entry = this.timelineEntries.find(e => e.id === entryId);
        if (!entry) return;

        this._editingEntryId = entryId;
        const modal = document.getElementById('sod-timeline-modal');
        const eligibleMetrics = this.getEligibleSubMetrics();

        const metricDropdownHTML = eligibleMetrics.length > 0 ? `
            <div class="form-group-gio">
                <label class="form-label-gio">Vincular a Sub-Métrica (opcional)</label>
                <select id="sod-timeline-metric" class="form-control-gio" onchange="StrategicObjectiveDetailPage.onTimelineMetricChange()">
                    <option value="">Nenhuma</option>
                    ${eligibleMetrics.map(m => `<option value="${m.id}" data-unit="${m.unit}" ${entry.sub_metric_id == m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                </select>
            </div>
            <div id="sod-timeline-progress-field" style="display:${entry.sub_metric_id ? 'block' : 'none'};">
                <div class="form-group-gio">
                    <label class="form-label-gio">Valor de Progresso *</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="number" id="sod-timeline-progress" class="form-control-gio"
                            placeholder="0" min="0" step="any" style="flex:1;"
                            value="${entry.progress_value || ''}">
                        <span id="sod-timeline-progress-unit" style="font-size:13px;font-weight:600;color:#374151;min-width:30px;">${entry.strategic_sub_metrics ? entry.strategic_sub_metrics.unit || '' : ''}</span>
                    </div>
                    <small style="color:#6b7280;font-size:11px;margin-top:4px;display:block;">
                        Este valor será somado ao progresso atual da sub-métrica
                    </small>
                </div>
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="StrategicObjectiveDetailPage.closeTimelineModal()"></div>
            <div class="modal-content-gio" style="max-width:520px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>Editar Registro</h3>
                        <p>Objetivo: ${this.objective.text.substring(0, 60)}${this.objective.text.length > 60 ? '...' : ''}</p>
                    </div>
                    <button class="modal-close-gio" onclick="StrategicObjectiveDetailPage.closeTimelineModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    ${metricDropdownHTML}
                    <div class="form-group-gio">
                        <label class="form-label-gio">Data da Medição</label>
                        <input type="date" id="sod-timeline-measured-at" class="form-control-gio"
                            value="${entry.measured_at ? new Date(entry.measured_at).toISOString().split('T')[0] : new Date(entry.created_at).toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Descrição *</label>
                        <textarea id="sod-timeline-description" class="form-control-gio" rows="3"
                            placeholder="Descreva o registro...">${entry.description}</textarea>
                    </div>
                    <div id="sod-timeline-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="StrategicObjectiveDetailPage.closeTimelineModal()">Cancelar</button>
                    <button class="btn-gio-primary" id="sod-timeline-save-btn" onclick="StrategicObjectiveDetailPage.updateTimelineEntry()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Atualizar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    async updateTimelineEntry() {
        const description = document.getElementById('sod-timeline-description').value.trim();
        const errorDiv = document.getElementById('sod-timeline-error');
        const saveBtn = document.getElementById('sod-timeline-save-btn');

        if (!description) {
            errorDiv.textContent = 'Descrição é obrigatória';
            errorDiv.style.display = 'block';
            return;
        }

        const entryId = this._editingEntryId;
        const oldEntry = this.timelineEntries.find(e => e.id === entryId);
        if (!oldEntry) return;

        // Lê campos de sub-métrica (se existirem)
        const metricSelect = document.getElementById('sod-timeline-metric');
        const progressInput = document.getElementById('sod-timeline-progress');
        const selectedMetricId = metricSelect ? metricSelect.value : '';
        const progressValue = progressInput ? parseFloat(progressInput.value) : 0;

        if (selectedMetricId && (!progressValue || progressValue <= 0)) {
            errorDiv.textContent = 'Informe um valor de progresso maior que 0';
            errorDiv.style.display = 'block';
            return;
        }

        const measuredAtInput = document.getElementById('sod-timeline-measured-at');
        const measuredAt = measuredAtInput ? measuredAtInput.value : null;

        const updateData = {
            description,
            measured_at: measuredAt ? new Date(measuredAt + 'T12:00:00').toISOString() : undefined
        };

        const newMetricId = selectedMetricId ? parseInt(selectedMetricId) : null;
        const newProgressValue = selectedMetricId ? progressValue : null;
        updateData.sub_metric_id = newMetricId;
        updateData.progress_value = newProgressValue;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-gio"></span> Salvando...';

            await StrategicTimelineEntry.update(entryId, updateData);

            // Reverte progresso da métrica antiga (se tinha)
            const oldMetricId = oldEntry.sub_metric_id;
            const oldProgressValue = oldEntry.progress_value;
            if (oldMetricId && oldProgressValue) {
                const oldMetric = (this.objective.sub_metrics || []).find(m => m.id === oldMetricId);
                if (oldMetric) {
                    const revertedValue = Math.max(0, (oldMetric.current_value || 0) - oldProgressValue);
                    await StrategicSubMetric.update(oldMetric.id, { current_value: revertedValue });
                }
            }

            // Aplica progresso da nova métrica (se tem)
            if (newMetricId && newProgressValue) {
                // Recarrega a métrica caso tenha sido a mesma (valor já foi revertido acima)
                const freshMetrics = await StrategicSubMetric.getByObjectiveId(this.objective.id);
                const targetMetric = freshMetrics.find(m => m.id === newMetricId);
                if (targetMetric) {
                    const newValue = (targetMetric.current_value || 0) + newProgressValue;
                    await StrategicSubMetric.update(targetMetric.id, { current_value: newValue });
                }
            }

            DepartmentsPage.showToast('Registro atualizado!', 'success');
            this.closeTimelineModal();
            this._editingEntryId = null;
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao atualizar registro da timeline:', error);
            errorDiv.textContent = error.message || 'Erro ao atualizar registro';
            errorDiv.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Atualizar';
        }
    },

    async deleteTimelineEntry(entryId) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Registro',
            message: 'Deseja realmente excluir este registro da timeline?',
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        try {
            // Verifica se a entrada tem sub-métrica vinculada para reverter o progresso
            const entry = this.timelineEntries.find(e => e.id === entryId);
            const hasMetricLink = entry && entry.sub_metric_id && entry.progress_value;

            await StrategicTimelineEntry.delete(entryId);

            // Decrementa o current_value da sub-métrica se havia vínculo
            if (hasMetricLink) {
                const metric = (this.objective.sub_metrics || []).find(m => m.id === entry.sub_metric_id);
                if (metric) {
                    const newValue = Math.max(0, (metric.current_value || 0) - entry.progress_value);
                    await StrategicSubMetric.update(metric.id, { current_value: newValue });
                }
            }

            DepartmentsPage.showToast('Registro excluído!', 'success');
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao excluir registro da timeline:', error);
            DepartmentsPage.showToast('Erro ao excluir registro', 'error');
        }
    },

    // =====================================================
    // METRIC MODAL (existente)
    // =====================================================

    async openMetricModal(metricId = null) {
        const obj = this.objective;
        const categoryConfig = CATEGORY_METRIC_CONFIG[obj.category] || { unit: 'R$', format: 'currency', metric_mode: 'normal' };
        const unit = categoryConfig.unit;
        const metricMode = categoryConfig.metric_mode || 'normal';

        if (metricId) {
            this.currentMetric = (obj.sub_metrics || []).find(m => m.id === metricId) || null;
        } else {
            this.currentMetric = null;
        }

        const modal = document.getElementById('sod-metric-modal');
        const isText = unit === 'texto';
        const isPercent = unit === '%';
        const isInverse = metricMode === 'inverse';

        const unitLabel = isText ? '' : (isPercent ? '%' : 'R$');
        const targetLabel = isText ? 'Descrição da Meta' : (isInverse ? `Meta Máxima (${unitLabel})` : `Meta (${unitLabel})`);
        const currentLabel = isText ? 'Evidência / Registro' : `Valor Atual (${unitLabel})`;

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="StrategicObjectiveDetailPage.closeMetricModal()"></div>
            <div class="modal-content-gio" style="max-width:520px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>${this.currentMetric ? 'Editar' : 'Nova'} Sub-Métrica</h3>
                        <p>Objetivo: ${obj.text.substring(0, 60)}${obj.text.length > 60 ? '...' : ''}</p>
                    </div>
                    <button class="modal-close-gio" onclick="StrategicObjectiveDetailPage.closeMetricModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Nome *</label>
                        <input type="text" id="sod-metric-name" class="form-control-gio"
                            placeholder="Ex: Obras Residenciais"
                            value="${this.currentMetric ? this.currentMetric.name : ''}">
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">${targetLabel}</label>
                        ${isInverse ? '<small style="color:#6b7280;font-size:11px;display:block;margin-bottom:6px;">O valor atual deve ficar ABAIXO desta meta</small>' : ''}
                        <input type="${isText ? 'text' : 'number'}" id="sod-metric-target" class="form-control-gio"
                            placeholder="${isText ? 'Descreva a meta qualitativa' : '0'}"
                            ${!isText ? 'min="0" step="any"' : ''}
                            value="${this.currentMetric ? (isText ? (this.currentMetric.target_value || '') : this.currentMetric.target_value) : ''}">
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">${currentLabel}</label>
                        <input type="${isText ? 'text' : 'number'}" id="sod-metric-current" class="form-control-gio"
                            placeholder="${isText ? 'Registre evidências ou observações' : '0'}"
                            ${!isText ? 'min="0" step="any"' : ''}
                            value="${this.currentMetric ? (isText ? (this.currentMetric.current_value || '') : this.currentMetric.current_value) : ''}">
                    </div>
                    <div id="sod-metric-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="StrategicObjectiveDetailPage.closeMetricModal()">Cancelar</button>
                    <button class="btn-gio-primary" onclick="StrategicObjectiveDetailPage.saveMetric()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentMetric ? 'Atualizar' : 'Criar'}
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    closeMetricModal() {
        const modal = document.getElementById('sod-metric-modal');
        if (modal) modal.style.display = 'none';
        this.currentMetric = null;
    },

    async saveMetric() {
        const name = document.getElementById('sod-metric-name').value.trim();
        const targetRaw = document.getElementById('sod-metric-target').value;
        const currentRaw = document.getElementById('sod-metric-current').value;
        const errorDiv = document.getElementById('sod-metric-error');

        const categoryConfig = CATEGORY_METRIC_CONFIG[this.objective.category] || { unit: 'R$' };
        const unit = categoryConfig.unit;
        const isText = unit === 'texto';

        if (!name) {
            errorDiv.textContent = 'Nome é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        const targetValue = isText ? (targetRaw ? 1 : 0) : (parseFloat(targetRaw) || 0);
        const currentValue = isText ? (currentRaw ? 1 : 0) : (parseFloat(currentRaw) || 0);

        try {
            const data = {
                objective_id: this.objective.id,
                name,
                target_value: targetValue,
                current_value: currentValue,
                unit
            };

            if (this.currentMetric) {
                await StrategicSubMetric.update(this.currentMetric.id, data);
                DepartmentsPage.showToast('Sub-métrica atualizada!', 'success');
            } else {
                await StrategicSubMetric.create(data);
                DepartmentsPage.showToast('Sub-métrica criada!', 'success');
            }

            this.closeMetricModal();
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao salvar sub-métrica:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar';
            errorDiv.style.display = 'block';
        }
    },

    async deleteMetric(metricId) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Sub-Métrica',
            message: 'Deseja realmente excluir esta sub-métrica?',
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        try {
            await StrategicSubMetric.delete(metricId);
            DepartmentsPage.showToast('Sub-métrica excluída!', 'success');
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao excluir sub-métrica:', error);
            DepartmentsPage.showToast('Erro ao excluir sub-métrica', 'error');
        }
    },

    // =====================================================
    // INDICADORES MODAL
    // =====================================================

    async openIndicadoresModal() {
        const obj = this.objective;
        const modal = document.getElementById('sod-indicators-modal');

        if (this.departments.length === 0) {
            this.departments = await Department.getActive();
        }

        const selectedIds = obj.responsavel_departamento_ids || [];

        const selectedCount = selectedIds.length;
        const totalDepts = this.departments.length;

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="StrategicObjectiveDetailPage.closeIndicadoresModal()"></div>
            <div class="modal-content-gio" style="max-width:640px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>Editar Indicadores</h3>
                        <p>Objetivo: ${obj.text.substring(0, 60)}${obj.text.length > 60 ? '...' : ''}</p>
                    </div>
                    <button class="modal-close-gio" onclick="StrategicObjectiveDetailPage.closeIndicadoresModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    <div class="sod-ind-row">
                        <div class="form-group-gio" style="flex:1;">
                            <label class="form-label-gio">Indicadores</label>
                            <textarea id="sod-ind-indicadores" class="form-control-gio" rows="2"
                                placeholder="Ex: Faturamento mensal, NPS...">${obj.indicadores || ''}</textarea>
                        </div>
                        <div class="form-group-gio" style="flex:1;">
                            <label class="form-label-gio">Fonte de Coleta</label>
                            <textarea id="sod-ind-fonte" class="form-control-gio" rows="2"
                                placeholder="Ex: Sistema ERP, Planilha...">${obj.fonte_coleta || ''}</textarea>
                        </div>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Frequência de Medição</label>
                        <div class="sod-freq-options">
                            ${[
                                { value: 'semanal', label: 'Semanal', icon: '7d' },
                                { value: 'mensal', label: 'Mensal', icon: '30d' },
                                { value: 'trimestral', label: 'Trimestral', icon: '3m' },
                                { value: 'semestral', label: 'Semestral', icon: '6m' },
                                { value: 'anual', label: 'Anual', icon: '1a' }
                            ].map(f => `
                                <label class="sod-freq-chip ${obj.frequencia_medicao === f.value ? 'sod-freq-chip-active' : ''}">
                                    <input type="radio" name="sod-ind-frequencia" value="${f.value}" ${obj.frequencia_medicao === f.value ? 'checked' : ''} onchange="StrategicObjectiveDetailPage.onFreqChange()">
                                    <span class="sod-freq-chip-icon">${f.icon}</span>
                                    <span>${f.label}</span>
                                </label>
                            `).join('')}
                            <label class="sod-freq-chip sod-freq-chip-none ${!obj.frequencia_medicao ? 'sod-freq-chip-active' : ''}">
                                <input type="radio" name="sod-ind-frequencia" value="" ${!obj.frequencia_medicao ? 'checked' : ''} onchange="StrategicObjectiveDetailPage.onFreqChange()">
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                <span>Nenhuma</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group-gio">
                        <div class="sod-dept-header">
                            <label class="form-label-gio" style="margin:0;">Responsáveis</label>
                            <div class="sod-dept-header-actions">
                                <button type="button" class="sod-dept-action-link" onclick="StrategicObjectiveDetailPage.toggleAllDepts(true)">Todos</button>
                                <span style="color:#d1d5db;">|</span>
                                <button type="button" class="sod-dept-action-link" onclick="StrategicObjectiveDetailPage.toggleAllDepts(false)">Nenhum</button>
                                <span class="sod-dept-counter" id="sod-dept-counter">${selectedCount} de ${totalDepts}</span>
                            </div>
                        </div>
                        <div class="sod-dept-checklist-box">
                            ${this.departments.length > 0 ? `
                                <div class="sod-dept-checklist-grid">
                                    ${this.departments.map(d => `
                                        <label class="sod-dept-chip ${selectedIds.includes(d.id) ? 'sod-dept-chip-active' : ''}">
                                            <input type="checkbox" name="sod-ind-depts" value="${d.id}" ${selectedIds.includes(d.id) ? 'checked' : ''} onchange="StrategicObjectiveDetailPage.onDeptToggle(this)">
                                            <span class="sod-dept-chip-text">${d.nome}</span>
                                            <svg class="sod-dept-chip-check" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                        </label>
                                    `).join('')}
                                </div>
                            ` : '<span style="color:#9ca3af;font-size:13px;padding:12px;">Nenhum departamento cadastrado</span>'}
                        </div>
                    </div>
                    <div id="sod-ind-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="StrategicObjectiveDetailPage.closeIndicadoresModal()">Cancelar</button>
                    <button class="btn-gio-primary" onclick="StrategicObjectiveDetailPage.saveIndicadores()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    onFreqChange() {
        document.querySelectorAll('.sod-freq-chip').forEach(chip => {
            const radio = chip.querySelector('input[type="radio"]');
            chip.classList.toggle('sod-freq-chip-active', radio.checked);
        });
    },

    toggleAllDepts(selectAll) {
        document.querySelectorAll('input[name="sod-ind-depts"]').forEach(cb => {
            cb.checked = selectAll;
            const chip = cb.closest('.sod-dept-chip');
            chip.classList.toggle('sod-dept-chip-active', selectAll);
        });
        const total = document.querySelectorAll('input[name="sod-ind-depts"]').length;
        const counter = document.getElementById('sod-dept-counter');
        if (counter) counter.textContent = `${selectAll ? total : 0} de ${total}`;
    },

    onDeptToggle(checkbox) {
        const chip = checkbox.closest('.sod-dept-chip');
        chip.classList.toggle('sod-dept-chip-active', checkbox.checked);
        const total = document.querySelectorAll('input[name="sod-ind-depts"]').length;
        const checked = document.querySelectorAll('input[name="sod-ind-depts"]:checked').length;
        const counter = document.getElementById('sod-dept-counter');
        if (counter) counter.textContent = `${checked} de ${total}`;
    },

    closeIndicadoresModal() {
        const modal = document.getElementById('sod-indicators-modal');
        if (modal) modal.style.display = 'none';
    },

    async saveIndicadores() {
        const indicadores = document.getElementById('sod-ind-indicadores').value.trim();
        const fonte_coleta = document.getElementById('sod-ind-fonte').value.trim();
        const freqRadio = document.querySelector('input[name="sod-ind-frequencia"]:checked');
        const frequencia_medicao = freqRadio ? freqRadio.value : '';
        const checkedBoxes = document.querySelectorAll('input[name="sod-ind-depts"]:checked');
        const selectedDeptIds = Array.from(checkedBoxes).map(cb => cb.value);
        const errorDiv = document.getElementById('sod-ind-error');

        try {
            const { supabaseClient } = await import('../../services/supabase.js');
            const updateData = {
                indicadores: indicadores || null,
                fonte_coleta: fonte_coleta || null,
                frequencia_medicao: frequencia_medicao || null,
                responsavel_departamento_ids: selectedDeptIds
            };

            const { error } = await supabaseClient
                .from('strategic_objectives')
                .update(updateData)
                .eq('id', this.objective.id);

            if (error) throw error;

            DepartmentsPage.showToast('Indicadores atualizados!', 'success');
            this.closeIndicadoresModal();
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao salvar indicadores:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar indicadores';
            errorDiv.style.display = 'block';
        }
    },

    async clearIndicadores() {
        const confirmed = await Modal.confirm({
            title: 'Limpar Indicadores',
            message: 'Deseja realmente limpar todos os indicadores deste objetivo?',
            confirmLabel: 'Limpar',
            danger: true
        });
        if (!confirmed) return;

        try {
            const { supabaseClient } = await import('../../services/supabase.js');
            const { error } = await supabaseClient
                .from('strategic_objectives')
                .update({
                    indicadores: null,
                    fonte_coleta: null,
                    frequencia_medicao: null,
                    responsavel_departamento_ids: []
                })
                .eq('id', this.objective.id);

            if (error) throw error;

            DepartmentsPage.showToast('Indicadores removidos!', 'success');
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao limpar indicadores:', error);
            DepartmentsPage.showToast('Erro ao limpar indicadores', 'error');
        }
    },

    async refreshData() {
        const categoryConfig = CATEGORY_METRIC_CONFIG[this.objective.category] || {};

        this.objective = await StrategicObjective.getByIdWithSubMetrics(this.objective.id);

        // Para Melhoria Contínua, recarrega métricas auto
        if (categoryConfig.metric_mode === 'auto_okr' && this.objective.cycle_id) {
            const autoMetrics = await StrategicSubMetric.getAutoOkrMetrics(this.objective.id, this.objective.cycle_id);
            this.objective.sub_metrics = autoMetrics;
        }

        // Recarrega timeline
        this.timelineEntries = await StrategicTimelineEntry.getByObjectiveId(this.objective.id);

        this.renderPage();
    },

    addStyles() {
        if (document.getElementById('sod-detail-styles')) return;

        const style = document.createElement('style');
        style.id = 'sod-detail-styles';
        style.textContent = `
            /* Action Button */
            .so-page-bar-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 9px 20px;
                background: #12b0a0;
                color: #fff;
                border: none;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.3);
                transition: all 0.2s;
                font-family: 'Lemon Milk', 'Inter', sans-serif;
                letter-spacing: 0.5px;
            }
            .so-page-bar-btn:hover {
                background: #0e8f82;
                box-shadow: 0 6px 16px rgba(18, 176, 160, 0.4);
                transform: translateY(-1px);
            }

            /* Object Action Buttons */
            .so-obj-action-btn {
                width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                background: #F3F4F6; border: none; border-radius: 10px;
                cursor: pointer; color: #6b7280;
                transition: all 0.2s;
            }
            .so-obj-action-btn:hover { background: #E5E7EB; color: #1e6076; }
            .so-obj-action-del:hover { background: #fef2f2; color: #ef4444; }

            /* Header */
            .sod-header {
                background: #fff;
                border-radius: 24px;
                padding: 24px 28px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .sod-header-top {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            .sod-back-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 14px;
                background: #F3F4F6;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s;
            }
            .sod-back-btn:hover { background: #E5E7EB; }
            .sod-category-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .sod-cycle-badge {
                display: inline-block;
                padding: 4px 12px;
                background: rgba(30, 96, 118, 0.1);
                color: #1e6076;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            .sod-title {
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px;
                line-height: 1.4;
            }
            .sod-meta {
                font-size: 13px;
                color: #6b7280;
                margin: 0;
                line-height: 1.5;
            }

            /* Indicators Section */
            .sod-indicators-section {
                background: #fff;
                border-radius: 24px;
                padding: 24px 28px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                margin-top: 16px;
            }
            .sod-indicators-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }
            .sod-indicator-item {
                padding: 14px 16px;
                background: #F9FAFB;
                border-radius: 14px;
                transition: all 0.2s;
            }
            .sod-indicator-item:hover {
                background: #F3F4F6;
            }
            .sod-indicator-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }
            .sod-indicator-value {
                font-size: 14px;
                font-weight: 500;
                color: #1f2937;
                line-height: 1.5;
                white-space: pre-line;
            }
            .sod-indicator-empty {
                color: #9ca3af;
                font-style: italic;
                font-weight: 400;
            }
            .sod-dept-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .sod-dept-tag {
                display: inline-block;
                padding: 3px 10px;
                background: rgba(30, 96, 118, 0.1);
                color: #1e6076;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
            }

            /* Modal layout */
            .sod-ind-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }

            /* Frequency chips */
            .sod-freq-options {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .sod-freq-chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 7px 14px;
                border: 1.5px solid #E5E7EB;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.15s;
                background: #fff;
            }
            .sod-freq-chip:hover {
                border-color: #12b0a0;
                background: rgba(18, 176, 160, 0.04);
            }
            .sod-freq-chip-active {
                border-color: #12b0a0;
                background: rgba(18, 176, 160, 0.08);
                color: #0e8f82;
                font-weight: 600;
            }
            .sod-freq-chip input { display: none; }
            .sod-freq-chip-icon {
                font-size: 10px;
                font-weight: 700;
                background: rgba(18, 176, 160, 0.12);
                color: #12b0a0;
                padding: 2px 6px;
                border-radius: 6px;
                letter-spacing: 0.3px;
            }
            .sod-freq-chip-none {
                color: #9ca3af;
                border-style: dashed;
            }
            .sod-freq-chip-none.sod-freq-chip-active {
                border-color: #9ca3af;
                background: #f9fafb;
                color: #6b7280;
            }
            .sod-freq-chip-none svg { opacity: 0.6; }

            /* Dept header */
            .sod-dept-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .sod-dept-header-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .sod-dept-action-link {
                background: none;
                border: none;
                color: #12b0a0;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 4px;
                transition: all 0.15s;
            }
            .sod-dept-action-link:hover {
                background: rgba(18, 176, 160, 0.08);
                text-decoration: underline;
            }
            .sod-dept-counter {
                font-size: 11px;
                color: #9ca3af;
                font-weight: 600;
                margin-left: 6px;
                background: #f3f4f6;
                padding: 2px 8px;
                border-radius: 6px;
            }

            /* Dept chips grid */
            .sod-dept-checklist-box {
                border: 1.5px solid #E5E7EB;
                border-radius: 14px;
                padding: 12px;
                max-height: 180px;
                overflow-y: auto;
                background: #fafbfc;
            }
            .sod-dept-checklist-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .sod-dept-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: 1.5px solid #E5E7EB;
                border-radius: 10px;
                font-size: 13px;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.15s;
                background: #fff;
                user-select: none;
            }
            .sod-dept-chip:hover {
                border-color: #1e6076;
                background: rgba(30, 96, 118, 0.04);
            }
            .sod-dept-chip input { display: none; }
            .sod-dept-chip-check {
                display: none;
                color: #fff;
            }
            .sod-dept-chip-active {
                border-color: #1e6076;
                background: rgba(30, 96, 118, 0.1);
                color: #1e6076;
                font-weight: 600;
            }
            .sod-dept-chip-active .sod-dept-chip-check {
                display: block;
            }
            .sod-ind-clear-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 9px 16px;
                background: #fff;
                color: #ef4444;
                border: 1px solid #fecaca;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                font-family: 'Lemon Milk', 'Inter', sans-serif;
                letter-spacing: 0.5px;
            }
            .sod-ind-clear-btn:hover {
                background: #fef2f2;
                border-color: #ef4444;
            }
            .sod-frequency-badge {
                display: inline-block;
                padding: 3px 10px;
                background: rgba(18, 176, 160, 0.1);
                color: #12b0a0;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
            }
            @media (max-width: 768px) {
                .sod-indicators-grid {
                    grid-template-columns: 1fr;
                }
                .sod-ind-row {
                    grid-template-columns: 1fr;
                }
            }

            /* Metrics Section */
            .sod-metrics-section {
                background: #fff;
                border-radius: 24px;
                padding: 24px 28px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                margin-top: 16px;
            }
            .sod-metrics-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 12px;
            }
            .sod-metrics-title {
                font-size: 16px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
                font-family: 'Lemon Milk', 'Inter', sans-serif;
            }

            /* Empty State */
            .sod-empty {
                text-align: center;
                padding: 48px 20px;
            }
            .sod-empty-icon {
                width: 56px; height: 56px;
                border-radius: 16px;
                background: #F3F4F6;
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 12px;
            }
            .sod-empty-text { color: #64748b; font-weight: 600; margin: 0 0 4px; font-size: 14px; }
            .sod-empty-hint { color: #94a3b8; font-size: 12px; margin: 0; }

            /* Metric Row */
            .sod-metrics-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .sod-metric-row {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                background: #F9FAFB;
                border-radius: 16px;
                transition: all 0.2s;
            }
            .sod-metric-row:hover {
                background: #F3F4F6;
            }
            .sod-metric-info {
                flex: 1;
                min-width: 0;
            }
            .sod-metric-name {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
            }
            .sod-metric-values {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
            }
            .sod-metric-current { color: #1e6076; font-weight: 600; }
            .sod-metric-sep { color: #9ca3af; }
            .sod-metric-target { color: #6b7280; }
            .sod-metric-value-text { font-size: 12px; color: #6b7280; }

            /* Auto OKR warning */
            .sod-auto-warning {
                display: inline-block;
                font-size: 11px;
                color: #f59e0b;
                font-weight: 500;
                margin-top: 2px;
            }

            /* Progress */
            .sod-metric-progress-area {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 180px;
            }
            .sod-progress-bar {
                flex: 1;
                height: 10px;
                background: #E5E7EB;
                border-radius: 5px;
                overflow: hidden;
            }
            .sod-progress-fill {
                height: 100%;
                border-radius: 5px;
                transition: width 0.4s ease;
            }
            .sod-metric-pct {
                font-size: 13px;
                font-weight: 700;
                color: #374151;
                min-width: 38px;
                text-align: right;
            }

            /* Actions */
            .sod-metric-actions {
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .sod-metric-row:hover .sod-metric-actions { opacity: 1; }

            /* Total Row */
            .sod-total-row {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                margin-top: 12px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                border-radius: 16px;
                color: #fff;
            }
            .sod-total-label {
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                min-width: 50px;
            }
            .sod-total-values {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
            }
            .sod-total-current { font-weight: 700; }
            .sod-total-sep { opacity: 0.6; }
            .sod-total-target { opacity: 0.8; }
            .sod-total-progress-container {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 180px;
            }
            .sod-total-row .sod-progress-bar { background: rgba(255,255,255,0.2); }
            .sod-total-row .sod-progress-fill { background: #fff !important; }
            .sod-total-pct {
                font-size: 14px;
                font-weight: 700;
                min-width: 38px;
                text-align: right;
            }

            /* Timeline Section */
            .sod-timeline-section { margin-top: 16px; }
            .sod-timeline-freq-label {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
                margin-top: 4px;
            }

            /* Periods */
            .sod-periods-container {
                display: flex;
                flex-direction: column;
            }
            .sod-period {
                position: relative;
            }
            .sod-period-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 8px;
                cursor: pointer;
                border-radius: 12px;
                transition: background 0.15s;
                user-select: none;
            }
            .sod-period-header:hover {
                background: #f9fafb;
            }

            /* Timeline dot + line */
            .sod-period-marker {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex-shrink: 0;
                width: 20px;
                position: relative;
            }
            .sod-period-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2.5px solid #d1d5db;
                background: #fff;
                z-index: 1;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .sod-period-line {
                position: absolute;
                top: 12px;
                width: 2px;
                height: calc(100% + 12px);
                background: #e5e7eb;
            }

            /* Period states */
            .sod-period-current .sod-period-dot {
                border-color: #12b0a0;
                background: #12b0a0;
                box-shadow: 0 0 0 4px rgba(18, 176, 160, 0.15);
            }
            .sod-period-done .sod-period-dot {
                border-color: #10b981;
                background: #10b981;
            }
            .sod-period-missed .sod-period-dot {
                border-color: #f59e0b;
                background: #fef3c7;
            }
            .sod-period-future .sod-period-dot {
                border-color: #d1d5db;
                background: #fff;
            }

            .sod-period-info {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
            }
            .sod-period-label {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .sod-period-future .sod-period-label {
                color: #9ca3af;
            }
            .sod-period-badge-current {
                font-size: 10px;
                font-weight: 700;
                color: #12b0a0;
                background: rgba(18, 176, 160, 0.1);
                padding: 2px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                flex-shrink: 0;
            }
            .sod-period-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            .sod-period-count {
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                background: #f3f4f6;
                padding: 2px 10px;
                border-radius: 8px;
            }
            .sod-period-count-empty {
                color: #9ca3af;
                background: none;
                font-weight: 500;
            }
            .sod-period-missed .sod-period-count-empty {
                color: #f59e0b;
            }
            .sod-period-chevron {
                color: #9ca3af;
                transition: transform 0.2s;
                flex-shrink: 0;
            }

            /* Period body (collapsible) */
            .sod-period-body {
                margin-left: 30px;
                padding-left: 12px;
                border-left: 2px solid #f3f4f6;
                margin-bottom: 4px;
            }
            .sod-period-empty {
                padding: 14px 16px;
                font-size: 13px;
                color: #9ca3af;
                font-style: italic;
            }
            .sod-period-expand-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 10px 16px;
                font-size: 13px;
                font-weight: 500;
                color: #0d9488;
                background: rgba(13, 148, 136, 0.05);
                border: 1px dashed rgba(13, 148, 136, 0.3);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                margin: 4px 0;
            }
            .sod-period-expand-btn:hover {
                background: rgba(13, 148, 136, 0.1);
                border-color: rgba(13, 148, 136, 0.5);
            }

            .sod-timeline-list {
                display: flex;
                flex-direction: column;
                gap: 0;
            }
            .sod-timeline-entry {
                padding: 14px 16px;
                border-bottom: 1px solid #F3F4F6;
                transition: background 0.2s;
                border-radius: 10px;
                margin-bottom: 2px;
            }
            .sod-timeline-entry:last-child { border-bottom: none; margin-bottom: 0; }
            .sod-timeline-entry:hover { background: #F9FAFB; }
            .sod-timeline-entry-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .sod-timeline-date {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
            }
            .sod-timeline-author {
                color: #9ca3af;
                font-weight: 400;
            }
            .sod-timeline-description {
                font-size: 14px;
                color: #1f2937;
                margin: 0 0 8px;
                line-height: 1.5;
            }
            .sod-timeline-attachment {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                padding: 4px 10px;
                border-radius: 8px;
                text-decoration: none;
                transition: all 0.2s;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .sod-timeline-link {
                color: #3b82f6;
                background: rgba(59, 130, 246, 0.08);
            }
            .sod-timeline-link:hover { background: rgba(59, 130, 246, 0.15); }
            .sod-timeline-file {
                color: #8b5cf6;
                background: rgba(139, 92, 246, 0.08);
            }
            .sod-timeline-file:hover { background: rgba(139, 92, 246, 0.15); }

            /* Timeline Actions */
            .sod-timeline-actions {
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .sod-timeline-entry:hover .sod-timeline-actions { opacity: 1; }

            /* Timeline Metric Badge */
            .sod-timeline-metric-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 2px 10px;
                background: rgba(16, 185, 129, 0.1);
                color: #059669;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                margin-left: 4px;
            }
            .sod-timeline-metric-value {
                color: #047857;
                font-weight: 700;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .sod-header, .sod-metrics-section {
                    border-radius: 18px;
                    padding: 18px 16px;
                }
                .sod-metric-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                .sod-metric-progress-area {
                    width: 100%;
                    min-width: unset;
                }
                .sod-metric-actions { opacity: 1; }
                .sod-timeline-actions { opacity: 1; }
                .sod-period-label { font-size: 13px; }
                .sod-period-body { margin-left: 20px; padding-left: 8px; }
                .sod-total-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                .sod-total-progress-container {
                    width: 100%;
                    min-width: unset;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

window.StrategicObjectiveDetailPage = StrategicObjectiveDetailPage;
export { StrategicObjectiveDetailPage };
