import { AuthService } from '../../services/auth.js';
import { StrategicObjective } from '../../Entities/StrategicObjective.js';
import { StrategicSubMetric, CATEGORY_METRIC_CONFIG } from '../../Entities/StrategicSubMetric.js';
import { StrategicTimelineEntry } from '../../Entities/StrategicTimelineEntry.js';

const StrategicObjectiveDetailPage = {
    objective: null,
    currentMetric: null,
    timelineEntries: [],

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

        // Busca entradas da timeline
        this.timelineEntries = await StrategicTimelineEntry.getByObjectiveId(objectiveId);

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

    renderTimeline(isAdmin) {
        const entries = this.timelineEntries || [];

        const entriesHTML = entries.length === 0
            ? `
                <div class="sod-empty" style="padding:32px 20px;">
                    <p class="sod-empty-text">Nenhum registro na timeline</p>
                    <p class="sod-empty-hint">Adicione registros para acompanhar o histórico deste objetivo</p>
                </div>
            `
            : entries.map(entry => this.renderTimelineEntry(entry, isAdmin)).join('');

        return `
            <div class="sod-metrics-section sod-timeline-section">
                <div class="sod-metrics-header">
                    <h3 class="sod-metrics-title">Timeline</h3>
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

    renderTimelineEntry(entry, isAdmin) {
        const typeIcon = entry.entry_type === 'file'
            ? '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>'
            : entry.entry_type === 'link'
                ? '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>'
                : '<svg width="14" height="14" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';

        let attachmentHTML = '';
        if (entry.entry_type === 'link' && entry.url) {
            attachmentHTML = `
                <a href="${entry.url}" target="_blank" rel="noopener noreferrer" class="sod-timeline-attachment sod-timeline-link">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    ${entry.url.length > 50 ? entry.url.substring(0, 50) + '...' : entry.url}
                </a>
            `;
        } else if (entry.entry_type === 'file' && entry.url) {
            attachmentHTML = `
                <a href="${entry.url}" target="_blank" rel="noopener noreferrer" class="sod-timeline-attachment sod-timeline-file">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    ${entry.file_name || 'Arquivo'}
                </a>
            `;
        }

        return `
            <div class="sod-timeline-entry">
                <div class="sod-timeline-entry-header">
                    <div class="sod-timeline-date">
                        ${typeIcon}
                        <span>${entry.formattedDate}</span>
                        ${entry.createdByName !== 'Sistema' ? `<span class="sod-timeline-author">por ${entry.createdByName}</span>` : ''}
                    </div>
                    ${isAdmin ? `
                        <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectiveDetailPage.deleteTimelineEntry(${entry.id})" title="Excluir">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
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

    openTimelineModal() {
        const modal = document.getElementById('sod-timeline-modal');

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
                    <div class="form-group-gio">
                        <label class="form-label-gio">Tipo de Registro *</label>
                        <select id="sod-timeline-type" class="form-control-gio" onchange="StrategicObjectiveDetailPage.onTimelineTypeChange()">
                            <option value="text">Texto</option>
                            <option value="link">Link</option>
                            <option value="file">Arquivo</option>
                        </select>
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

        const currentUser = AuthService.getCurrentUser();
        const entryData = {
            objective_id: this.objective.id,
            description,
            entry_type: type,
            created_by: currentUser ? currentUser.id : null
        };

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

    async deleteTimelineEntry(entryId) {
        if (!confirm('Deseja realmente excluir este registro?')) return;

        try {
            await StrategicTimelineEntry.delete(entryId);
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
        if (!confirm('Deseja realmente excluir esta sub-métrica?')) return;

        try {
            await StrategicSubMetric.delete(metricId);
            DepartmentsPage.showToast('Sub-métrica excluída!', 'success');
            await this.refreshData();
        } catch (error) {
            console.error('Erro ao excluir sub-métrica:', error);
            DepartmentsPage.showToast('Erro ao excluir sub-métrica', 'error');
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
            .sod-timeline-list {
                display: flex;
                flex-direction: column;
                gap: 0;
            }
            .sod-timeline-entry {
                padding: 16px 20px;
                border-bottom: 1px solid #F3F4F6;
                transition: background 0.2s;
            }
            .sod-timeline-entry:last-child { border-bottom: none; }
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
