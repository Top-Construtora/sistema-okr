import { supabaseClient } from '../../services/supabase.js';
import { AuthService } from '../../services/auth.js';
import { Cycle } from '../../Entities/Cycle.js';
import { Department } from '../../Entities/Department.js';
import { StrategicSubMetric, CATEGORY_METRIC_CONFIG } from '../../Entities/StrategicSubMetric.js';

// Página de Gestão de Objetivos Estratégicos (Alto Nível)
const StrategicObjectivesPage = {
    currentObjective: null,
    currentCycleFilter: 'all',
    cycles: [],

    async render() {
        const content = document.getElementById('content');

        // Skeleton loading
        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="so-list-grid">
                    <div class="widget-skeleton"></div>
                    <div class="widget-skeleton"></div>
                    <div class="widget-skeleton"></div>
                </div>
            </div>
        `;

        this.addStyles();

        const [objectives, cycles] = await Promise.all([
            this.getObjectivesWithCycle(),
            Cycle.getAll()
        ]);
        this.cycles = cycles;

        // Auto-seleciona ciclo ativo
        if (this.currentCycleFilter === 'all') {
            const activeCycle = cycles.find(c => c.isCurrentlyActive());
            if (activeCycle) {
                this.currentCycleFilter = String(activeCycle.id);
            }
        }

        const isAdmin = AuthService.isAdmin();
        const filtered = this.applyFilters(objectives);

        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="so-page-bar">
                    <div class="so-page-bar-left">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                        <span class="so-page-bar-title">Objetivos Estratégicos</span>
                        <select id="strat-cycle-filter" class="so-page-bar-select" onchange="StrategicObjectivesPage.filterByCycle(this.value)">
                            <option value="all" ${this.currentCycleFilter === 'all' ? 'selected' : ''}>Todos os ciclos</option>
                            ${cycles.map(c => `
                                <option value="${c.id}" ${this.currentCycleFilter === String(c.id) ? 'selected' : ''}>
                                    ${c.nome}${c.isCurrentlyActive() ? ' (Atual)' : ''}${!c.ativo ? ' (Inativo)' : ''}
                                </option>
                            `).join('')}
                        </select>
                        <span class="so-list-count">${filtered.length} objetivo${filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                    ${isAdmin ? `
                        <button class="so-page-bar-btn" onclick="StrategicObjectivesPage.openModal()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo Objetivo
                        </button>
                    ` : ''}
                </div>

                <div id="strategic-objectives-list"></div>
                <div id="strategic-objective-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;

        await this.renderList();
    },

    async getObjectivesWithCycle() {
        const { data, error } = await supabaseClient
            .from('strategic_objectives')
            .select('*, cycles(id, nome, ativo, data_inicio, data_fim)')
            .order('id', { ascending: true });

        if (error) {
            console.error('Erro ao buscar objetivos estratégicos:', error);
            return [];
        }
        return data || [];
    },

    applyFilters(objectives) {
        let filtered = objectives;
        if (this.currentCycleFilter !== 'all') {
            filtered = filtered.filter(o => String(o.cycle_id) === this.currentCycleFilter);
        }
        return filtered;
    },

    async renderList() {
        const container = document.getElementById('strategic-objectives-list');
        if (!container) return;

        const isAdmin = AuthService.isAdmin();
        const allObjectives = await this.getObjectivesWithCycle();
        const objectives = this.applyFilters(allObjectives);

        if (objectives.length === 0) {
            container.innerHTML = `
                <div class="widget" style="margin-top:16px;">
                    <div class="widget-body" style="text-align:center;padding:60px 20px;">
                        <div style="width:64px;height:64px;border-radius:16px;background:rgba(18,176,160,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                            <svg width="28" height="28" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                            </svg>
                        </div>
                        <p style="color:#64748b;font-weight:600;margin-bottom:4px;">Nenhum objetivo estratégico</p>
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:16px;">Os objetivos aparecerão aqui quando forem cadastrados</p>
                        ${isAdmin ? `
                            <button class="btn-gio-primary" onclick="StrategicObjectivesPage.openModal()">Criar primeiro objetivo</button>
                        ` : ''}
                    </div>
                </div>
            `;
            return;
        }

        const categoryColors = {
            'Construtora': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#3b82f6' },
            'Incorporadora': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '#10b981' },
            'Melhoria Contínua': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '#f59e0b' },
            'Obra': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '#8b5cf6' },
            'Empreendimento Econômico': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '#ef4444' }
        };

        // Fetch sub-metrics for all objectives in parallel
        const metricsMap = {};
        await Promise.all(objectives.map(async (obj) => {
            const categoryConfig = CATEGORY_METRIC_CONFIG[obj.category] || {};
            if (categoryConfig.metric_mode === 'auto_okr' && obj.cycle_id) {
                metricsMap[obj.id] = await StrategicSubMetric.getAutoOkrMetrics(obj.id, obj.cycle_id);
            } else {
                metricsMap[obj.id] = await StrategicSubMetric.getByObjectiveId(obj.id);
            }
        }));

        const cardsHTML = objectives.map(obj => {
            const colors = categoryColors[obj.category] || { bg: '#f3f4f6', color: '#6b7280', border: '#6b7280' };
            const categoryConfig = CATEGORY_METRIC_CONFIG[obj.category] || {};
            const metricMode = categoryConfig.metric_mode || 'normal';
            const metrics = metricsMap[obj.id] || [];

            let metricsHTML = '';
            if (metrics.length > 0) {
                if (metricMode === 'auto_okr') {
                    // Melhoria Contínua: só mostra a média geral
                    const metricsWithOkrs = metrics.filter(m => m._okr_count > 0);
                    const avgProgress = metricsWithOkrs.length > 0
                        ? Math.round(metricsWithOkrs.reduce((sum, m) => sum + m.current_value, 0) / metricsWithOkrs.length)
                        : 0;
                    const barColor = avgProgress >= 70 ? '#10b981' : (avgProgress >= 40 ? '#f59e0b' : '#ef4444');

                    metricsHTML = `
                        <div class="so-card-metrics">
                            <div class="so-card-metric-item">
                                <div class="so-card-metric-header">
                                    <span class="so-card-metric-name">Média Geral</span>
                                    <span class="so-card-metric-pct" style="color:${barColor};">${avgProgress}%</span>
                                </div>
                                <div class="so-card-metric-bar">
                                    <div class="so-card-metric-fill" style="width:${avgProgress}%;background:${barColor};"></div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    metricsHTML = `
                        <div class="so-card-metrics">
                            ${metrics.map(m => {
                                if (m.unit === 'texto') {
                                    return `
                                        <div class="so-card-metric-item">
                                            <div class="so-card-metric-header">
                                                <span class="so-card-metric-name">${m.name}</span>
                                                <span class="so-card-metric-status ${m.current_value ? 'so-card-metric-done' : ''}">${m.current_value ? 'Registrado' : 'Pendente'}</span>
                                            </div>
                                        </div>
                                    `;
                                }

                                const progress = m.progress;
                                let barColor;
                                if (metricMode === 'inverse') {
                                    const current = m.current_value;
                                    const target = m.target_value;
                                    barColor = current <= target * 0.7 ? '#10b981' : (current <= target ? '#f59e0b' : '#ef4444');
                                } else {
                                    barColor = progress >= 70 ? '#10b981' : (progress >= 40 ? '#f59e0b' : '#ef4444');
                                }

                                const valueLabel = `${StrategicSubMetric.formatValue(m.current_value, m.unit)} / ${StrategicSubMetric.formatValue(m.target_value, m.unit)}`;

                                return `
                                    <div class="so-card-metric-item">
                                        <div class="so-card-metric-header">
                                            <span class="so-card-metric-name">${m.name}</span>
                                            <span class="so-card-metric-pct" style="color:${barColor};">${progress.toFixed(0)}%</span>
                                        </div>
                                        <div class="so-card-metric-bar">
                                            <div class="so-card-metric-fill" style="width:${progress}%;background:${barColor};"></div>
                                        </div>
                                        <span class="so-card-metric-values">${valueLabel}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }
            }

            return `
                <div class="so-obj-card so-obj-card-clickable" onclick="StrategicObjectivesPage.navigateToDetail(${obj.id})">
                    <div class="so-obj-card-bar">
                        <span class="so-obj-card-cat">${obj.category}</span>
                    </div>
                    <div class="so-obj-card-body">
                        <h3 class="so-obj-card-title">${obj.text}</h3>
                        ${obj.meta ? `<p class="so-obj-card-meta">${obj.meta}</p>` : ''}
                        ${metricsHTML}
                        ${isAdmin ? `
                            <div class="so-obj-card-actions" onclick="event.stopPropagation();">
                                <button class="so-obj-action-btn" onclick="StrategicObjectivesPage.openModal(${obj.id})" title="Editar">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="so-obj-action-btn so-obj-action-del" onclick="StrategicObjectivesPage.deleteObjective(${obj.id})" title="Excluir">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="so-list-grid">${cardsHTML}</div>`;
    },

    async filterByCycle(cycleId) {
        this.currentCycleFilter = cycleId;
        await this.renderList();
        // Atualiza contagem
        const allObjectives = await this.getObjectivesWithCycle();
        const filtered = this.applyFilters(allObjectives);
        const countEl = document.querySelector('.so-list-count');
        if (countEl) countEl.textContent = `${filtered.length} objetivo${filtered.length !== 1 ? 's' : ''}`;
    },

    async openModal(id = null) {
        if (id) {
            const objectives = await this.getObjectivesWithCycle();
            this.currentObjective = objectives.find(o => o.id === id);
        } else {
            this.currentObjective = null;
        }

        if (this.cycles.length === 0) {
            this.cycles = await Cycle.getAll();
        }

        const departments = await Department.getActive();

        const modal = document.getElementById('strategic-objective-modal');
        const currentCycleId = this.currentObjective?.cycle_id || '';

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="StrategicObjectivesPage.closeModal()"></div>
            <div class="modal-content-gio" style="max-width:600px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>${this.currentObjective ? 'Editar' : 'Novo'} Objetivo Estratégico</h3>
                        <p>${this.currentObjective ? 'Atualize as informações do objetivo' : 'Defina um novo objetivo estratégico da empresa'}</p>
                    </div>
                    <button class="modal-close-gio" onclick="StrategicObjectivesPage.closeModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Ciclo *</label>
                        <select id="strat-obj-cycle" class="form-control-gio">
                            <option value="">Selecione um ciclo</option>
                            ${this.cycles.map(c => `
                                <option value="${c.id}" ${currentCycleId == c.id ? 'selected' : ''}>
                                    ${c.nome}${c.isCurrentlyActive() ? ' (Atual)' : ''}${!c.ativo ? ' (Inativo)' : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Categoria *</label>
                        <select id="strat-obj-category" class="form-control-gio">
                            <option value="">Selecione uma categoria</option>
                            <option value="Construtora" ${this.currentObjective?.category === 'Construtora' ? 'selected' : ''}>Construtora</option>
                            <option value="Incorporadora" ${this.currentObjective?.category === 'Incorporadora' ? 'selected' : ''}>Incorporadora</option>
                            <option value="Melhoria Contínua" ${this.currentObjective?.category === 'Melhoria Contínua' ? 'selected' : ''}>Melhoria Contínua</option>
                            <option value="Obra" ${this.currentObjective?.category === 'Obra' ? 'selected' : ''}>Obra</option>
                            <option value="Empreendimento Econômico" ${this.currentObjective?.category === 'Empreendimento Econômico' ? 'selected' : ''}>Empreendimento Econômico</option>
                        </select>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Texto do Objetivo *</label>
                        <textarea id="strat-obj-text" class="form-control-gio" rows="3"
                            placeholder="Ex: Executar R$ 120M em obras residenciais">${this.currentObjective ? this.currentObjective.text : ''}</textarea>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Meta</label>
                        <textarea id="strat-obj-meta" class="form-control-gio" rows="2"
                            placeholder="Ex: < 5%, 75%, > 10%, etc.">${this.currentObjective ? this.currentObjective.meta || '' : ''}</textarea>
                    </div>
                    <hr style="border:none;border-top:1px solid #E5E7EB;margin:8px 0;">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Indicadores</label>
                        <textarea id="strat-obj-indicadores" class="form-control-gio" rows="2"
                            placeholder="Ex: Faturamento mensal, NPS, Taxa de conversão...">${this.currentObjective?.indicadores || ''}</textarea>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Fonte de Coleta</label>
                        <textarea id="strat-obj-fonte" class="form-control-gio" rows="2"
                            placeholder="Ex: Sistema ERP, Planilha de controle...">${this.currentObjective?.fonte_coleta || ''}</textarea>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="form-group-gio">
                            <label class="form-label-gio">Frequência de Medição</label>
                            <select id="strat-obj-frequencia" class="form-control-gio">
                                <option value="">Selecione</option>
                                <option value="semanal" ${this.currentObjective?.frequencia_medicao === 'semanal' ? 'selected' : ''}>Semanal</option>
                                <option value="mensal" ${this.currentObjective?.frequencia_medicao === 'mensal' ? 'selected' : ''}>Mensal</option>
                                <option value="trimestral" ${this.currentObjective?.frequencia_medicao === 'trimestral' ? 'selected' : ''}>Trimestral</option>
                                <option value="semestral" ${this.currentObjective?.frequencia_medicao === 'semestral' ? 'selected' : ''}>Semestral</option>
                                <option value="anual" ${this.currentObjective?.frequencia_medicao === 'anual' ? 'selected' : ''}>Anual</option>
                            </select>
                        </div>
                        <div class="form-group-gio">
                            <label class="form-label-gio">Responsáveis</label>
                            <div class="sod-dept-checklist">
                                ${departments.map(d => `
                                    <label class="sod-dept-check-item">
                                        <input type="checkbox" name="strat-obj-depts" value="${d.id}" ${(this.currentObjective?.responsavel_departamento_ids || []).includes(d.id) ? 'checked' : ''}>
                                        <span class="sod-dept-check-label">${d.nome}</span>
                                    </label>
                                `).join('')}
                                ${departments.length === 0 ? '<span style="color:#9ca3af;font-size:13px;">Nenhum departamento cadastrado</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div id="strat-obj-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="StrategicObjectivesPage.closeModal()">Cancelar</button>
                    <button class="btn-gio-primary" onclick="StrategicObjectivesPage.save()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentObjective ? 'Atualizar' : 'Criar'} Objetivo
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    closeModal() {
        document.getElementById('strategic-objective-modal').style.display = 'none';
        this.currentObjective = null;
    },

    async save() {
        const text = document.getElementById('strat-obj-text').value.trim();
        const category = document.getElementById('strat-obj-category').value;
        const meta = document.getElementById('strat-obj-meta').value.trim();
        const cycleId = document.getElementById('strat-obj-cycle').value;
        const indicadores = document.getElementById('strat-obj-indicadores').value.trim();
        const fonte_coleta = document.getElementById('strat-obj-fonte').value.trim();
        const frequencia_medicao = document.getElementById('strat-obj-frequencia').value;
        const checkedBoxes = document.querySelectorAll('input[name="strat-obj-depts"]:checked');
        const responsavel_departamento_ids = Array.from(checkedBoxes).map(cb => cb.value);
        const errorDiv = document.getElementById('strat-obj-error');

        if (!cycleId) { errorDiv.textContent = 'O ciclo é obrigatório'; errorDiv.style.display = 'block'; return; }
        if (!text) { errorDiv.textContent = 'O texto do objetivo é obrigatório'; errorDiv.style.display = 'block'; return; }
        if (!category) { errorDiv.textContent = 'A categoria é obrigatória'; errorDiv.style.display = 'block'; return; }

        try {
            const objectiveData = {
                text, category, meta: meta || null, cycle_id: cycleId,
                indicadores: indicadores || null,
                fonte_coleta: fonte_coleta || null,
                frequencia_medicao: frequencia_medicao || null,
                responsavel_departamento_ids: responsavel_departamento_ids
            };

            if (this.currentObjective) {
                const { error } = await supabaseClient.from('strategic_objectives').update(objectiveData).eq('id', this.currentObjective.id);
                if (error) throw error;
                DepartmentsPage.showToast('Objetivo atualizado com sucesso!', 'success');
            } else {
                const { error } = await supabaseClient.from('strategic_objectives').insert([objectiveData]);
                if (error) throw error;
                DepartmentsPage.showToast('Objetivo criado com sucesso!', 'success');
            }

            this.closeModal();
            await this.renderList();
        } catch (error) {
            console.error('Erro ao salvar objetivo estratégico:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar';
            errorDiv.style.display = 'block';
        }
    },

    async deleteObjective(id) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Objetivo Estratégico',
            message: 'Deseja realmente excluir este objetivo estratégico?',
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        try {
            const { error } = await supabaseClient.from('strategic_objectives').delete().eq('id', id);
            if (error) throw error;
            DepartmentsPage.showToast('Objetivo excluído com sucesso!', 'success');
            await this.renderList();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            DepartmentsPage.showToast('Erro ao excluir objetivo', 'error');
        }
    },

    navigateToDetail(id) {
        window.history.pushState({ page: 'strategic-objective-detail' }, '', `/objetivos-estrategicos/${id}`);
        Layout.navigate('strategic-objective-detail', false);
    },

    addStyles() {
        if (document.getElementById('strategic-objectives-styles')) return;

        const style = document.createElement('style');
        style.id = 'strategic-objectives-styles';
        style.textContent = `
            /* Page Bar */
            .so-page-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                padding: 0 0 20px;
                flex-wrap: wrap;
            }
            .so-page-bar-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .so-page-bar-left > svg { color: #1e6076; opacity: 0.6; flex-shrink: 0; }
            .so-page-bar-title {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                font-family: 'Lemon Milk', 'Inter', sans-serif;
            }
            .so-page-bar-select {
                padding: 7px 12px;
                border: 1px solid #E5E7EB;
                border-radius: 10px;
                font-size: 12px;
                color: #374151;
                background: #fff;
                cursor: pointer;
                outline: none;
                transition: all 0.2s;
            }
            .so-page-bar-select:focus {
                border-color: #12b0a0;
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.1);
            }
            .so-list-count {
                font-size: 12px;
                color: #9ca3af;
                font-weight: 500;
            }
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

            /* Card Grid */
            .so-list-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                gap: 16px;
            }

            /* ===== OBJECTIVE CARD ===== */
            .so-obj-card {
                background: #fff;
                border-radius: 24px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                overflow: hidden;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
            }
            .so-obj-card-clickable { cursor: pointer; }
            .so-obj-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 30px rgba(0,0,0,0.14);
            }

            /* Title Bar (gradient) */
            .so-obj-card-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                gap: 12px;
            }
            .so-obj-card-cat {
                font-size: 10px;
                font-weight: 700;
                color: rgba(255,255,255,0.9);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                flex: 1;
            }

            /* Card Body */
            .so-obj-card-body {
                padding: 18px 20px 16px;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .so-obj-card-title {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                line-height: 1.5;
                margin: 0;
            }
            .so-obj-card-meta {
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
                margin: 0;
            }

            /* Card Actions (admin) */
            .so-obj-card-actions {
                display: flex;
                gap: 6px;
                justify-content: flex-end;
                opacity: 0;
                transition: opacity 0.2s;
                padding-top: 4px;
                border-top: 1px solid #F3F4F6;
            }
            .so-obj-card:hover .so-obj-card-actions { opacity: 1; }
            .so-obj-action-btn {
                width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                background: #F3F4F6; border: none; border-radius: 10px;
                cursor: pointer; color: #6b7280;
                transition: all 0.2s;
            }
            .so-obj-action-btn:hover { background: #E5E7EB; color: #1e6076; }
            .so-obj-action-del:hover { background: #fef2f2; color: #ef4444; }

            /* Card Metrics (sub-metrics progress bars) */
            .so-card-metrics {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-top: 12px;
                border-top: 1px solid #F3F4F6;
            }
            .so-card-metric-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .so-card-metric-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .so-card-metric-name {
                font-size: 11px;
                font-weight: 600;
                color: #4b5563;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
                min-width: 0;
            }
            .so-card-metric-pct {
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
            }
            .so-card-metric-bar {
                width: 100%;
                height: 6px;
                background: #f1f5f9;
                border-radius: 3px;
                overflow: hidden;
            }
            .so-card-metric-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.4s ease;
            }
            .so-card-metric-values {
                font-size: 10px;
                color: #9ca3af;
                font-weight: 500;
            }
            .so-card-metric-status {
                font-size: 10px;
                font-weight: 600;
                color: #9ca3af;
                padding: 2px 8px;
                background: #f3f4f6;
                border-radius: 6px;
                flex-shrink: 0;
            }
            .so-card-metric-done {
                color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }

            /* Dept Checklist (modal) */
            .sod-dept-checklist {
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 200px;
                overflow-y: auto;
                padding: 8px 0;
            }
            .sod-dept-check-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .sod-dept-check-item:hover {
                background: #F3F4F6;
            }
            .sod-dept-check-item input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #12b0a0;
                cursor: pointer;
                flex-shrink: 0;
            }
            .sod-dept-check-label {
                font-size: 14px;
                color: #374151;
                font-weight: 500;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .so-page-bar {
                    flex-direction: column;
                    align-items: stretch;
                }
                .so-list-grid {
                    grid-template-columns: 1fr;
                }
                .so-obj-card-actions { opacity: 1; }
                .so-obj-card { border-radius: 18px; }
            }
        `;
        document.head.appendChild(style);
    }
};

window.StrategicObjectivesPage = StrategicObjectivesPage;
export { StrategicObjectivesPage };
