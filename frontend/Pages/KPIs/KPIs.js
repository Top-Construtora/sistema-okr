import { AuthService } from '../../services/auth.js';
import { StrategicSubMetric } from '../../Entities/StrategicSubMetric.js';
import { StrategicObjective } from '../../Entities/StrategicObjective.js';
import { Department } from '../../Entities/Department.js';

const FREQUENCIA_LABELS = {
    'semanal': 'Semanal',
    'mensal': 'Mensal',
    'trimestral': 'Trimestral',
    'semestral': 'Semestral',
    'anual': 'Anual',
    'fim_obra': 'Ao final de cada Obra'
};

const CATEGORY_COLORS = {
    'Construtora':             { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
    'Incorporadora':           { bg: 'rgba(16,185,129,0.1)',   color: '#10b981' },
    'Melhoria Contínua':       { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b' },
    'Obra':                    { bg: 'rgba(139,92,246,0.1)',   color: '#8b5cf6' },
};

const KPIsPage = {
    kpis: [],
    objectives: [],
    departments: [],
    _editingKpiId: null,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="widget-skeleton" style="height:200px;"></div>
            </div>
        `;

        this.addStyles();

        const [kpis, allObjectives, departments] = await Promise.all([
            StrategicSubMetric.getAllOperationalKpis(),
            StrategicObjective.getAll(),
            Department.getActive()
        ]);

        const objectives = StrategicObjective.filterByVisibility(allObjectives);
        const visibleObjIds = new Set(objectives.map(o => o.id));

        this.kpis = kpis.filter(k => visibleObjIds.has(k.objective_id));
        this.objectives = objectives;
        this.departments = departments;

        const isAdmin = AuthService.isAdmin();
        this.renderPage(isAdmin);
    },

    renderPage(isAdmin) {
        const content = document.getElementById('content');

        // Agrupa KPIs por objetivo
        const grouped = {};
        this.kpis.forEach(kpi => {
            const objId = kpi.objective_id;
            if (!grouped[objId]) grouped[objId] = [];
            grouped[objId].push(kpi);
        });

        const totalKpis = this.kpis.length;
        const totalObjs = Object.keys(grouped).length;

        // Objetivos que têm KPIs
        const objectivesWithKpis = this.objectives.filter(o => grouped[o.id]);
        // Objetivos sem KPIs (só para admin criar)
        const objectivesWithoutKpis = this.objectives.filter(o => !grouped[o.id]);

        const groupsHTML = objectivesWithKpis.map(obj => {
            const kpiList = grouped[obj.id] || [];
            const colors = CATEGORY_COLORS[obj.category] || { bg: '#f3f4f6', color: '#6b7280' };
            return `
                <div class="kpi-group">
                    <div class="kpi-group-header">
                        <span class="kpi-group-category" style="background:${colors.bg};color:${colors.color};">${obj.category}</span>
                        <span class="kpi-group-title">${obj.text}</span>
                        <span class="kpi-group-count">${kpiList.length} KPI${kpiList.length !== 1 ? 's' : ''}</span>
                        ${isAdmin ? `
                            <button class="kpi-add-btn" onclick="KPIsPage.openModal(null, ${obj.id})" title="Novo KPI">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Novo KPI
                            </button>
                        ` : ''}
                    </div>
                    <div class="kpi-list">
                        ${kpiList.map(kpi => this.renderKpiRow(kpi, isAdmin)).join('')}
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="so-page-bar">
                    <div class="so-page-bar-left">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        <span class="so-page-bar-title">Objetivos Operacionais</span>
                        <span class="so-list-count">${totalKpis} KPI${totalKpis !== 1 ? 's' : ''} em ${totalObjs} objetivo${totalObjs !== 1 ? 's' : ''}</span>
                    </div>
                    ${isAdmin ? `
                        <button class="so-page-bar-btn" onclick="KPIsPage.openModal()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo KPI
                        </button>
                    ` : ''}
                </div>

                ${totalKpis === 0 ? `
                    <div class="widget" style="margin-top:16px;">
                        <div class="widget-body" style="text-align:center;padding:60px 20px;">
                            <div style="width:64px;height:64px;border-radius:16px;background:rgba(18,176,160,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                                <svg width="28" height="28" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <h3 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 8px;">Nenhum KPI cadastrado</h3>
                            <p style="font-size:13px;color:#6b7280;margin:0;max-width:400px;margin:0 auto;">Os objetivos operacionais aparecerão aqui após serem criados nos objetivos estratégicos${isAdmin ? ' ou clicando em "Novo KPI" acima' : ''}.</p>
                        </div>
                    </div>
                ` : groupsHTML}

                <div id="kpi-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;
    },

    renderKpiRow(kpi, isAdmin) {
        const deptIds = kpi.responsavel_ids || [];
        const deptNomes = deptIds.map(id => {
            const dept = this.departments.find(d => d.id === id || String(d.id) === String(id));
            return dept ? dept.nome : null;
        }).filter(Boolean);
        const freqLabel = kpi.frequencia ? (FREQUENCIA_LABELS[kpi.frequencia] || kpi.frequencia) : null;

        return `
            <div class="kpi-row">
                <div class="kpi-row-content">
                    <div class="kpi-row-top">
                        <span class="kpi-row-name">${kpi.name}</span>
                        ${kpi.meta_texto ? `<span class="kpi-meta-badge">Meta: ${kpi.meta_texto}</span>` : ''}
                        ${freqLabel ? `<span class="kpi-freq-badge">${freqLabel}</span>` : ''}
                    </div>
                    <div class="kpi-row-fields">
                        ${kpi.indicadores ? `
                            <div class="kpi-field">
                                <span class="kpi-field-label">
                                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                    Indicador
                                </span>
                                <span class="kpi-field-value">${kpi.indicadores}</span>
                            </div>
                        ` : ''}
                        ${kpi.fonte_coleta ? `
                            <div class="kpi-field">
                                <span class="kpi-field-label">
                                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                    Fonte de Coleta
                                </span>
                                <span class="kpi-field-value">${kpi.fonte_coleta}</span>
                            </div>
                        ` : ''}
                        ${deptNomes.length > 0 ? `
                            <div class="kpi-field">
                                <span class="kpi-field-label">
                                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    Responsável
                                </span>
                                <span class="kpi-field-value">${deptNomes.map(n => `<span class="kpi-dept-tag">${n}</span>`).join('')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${isAdmin ? `
                    <div class="kpi-row-actions">
                        <button class="kpi-action-btn" onclick="KPIsPage.openModal(${kpi.id})" title="Editar">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="kpi-action-btn kpi-action-del" onclick="KPIsPage.deleteKpi(${kpi.id})" title="Excluir">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    openModal(kpiId = null, presetObjectiveId = null) {
        const kpi = kpiId ? this.kpis.find(k => k.id === kpiId) : null;
        this._editingKpiId = kpiId || null;

        const modal = document.getElementById('kpi-modal');
        if (!modal) return;

        const selectedIds = kpi ? (kpi.responsavel_ids || []) : [];
        const currentFreq = kpi ? (kpi.frequencia || '') : '';
        const currentObjId = kpi ? kpi.objective_id : (presetObjectiveId || '');

        // Determina se tem objetivo de obra selecionado (para mostrar opção fim_obra)
        const selectedObj = this.objectives.find(o => o.id == currentObjId);
        const isObra = selectedObj?.category === 'Obra';

        const freqOptions = [
            { value: 'semanal',     label: 'Semanal',    icon: '7d' },
            { value: 'mensal',      label: 'Mensal',     icon: '30d' },
            { value: 'trimestral',  label: 'Trimestral', icon: '3m' },
            { value: 'semestral',   label: 'Semestral',  icon: '6m' },
            { value: 'anual',       label: 'Anual',      icon: '1a' },
            ...(isObra ? [{ value: 'fim_obra', label: 'Ao final de cada Obra', icon: '🏗' }] : [])
        ];

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="KPIsPage.closeModal()"></div>
            <div class="modal-content-gio">
                <div class="modal-header-gio">
                    <div>
                        <h3>${kpi ? 'Editar' : 'Novo'} KPI Operacional</h3>
                        <p>Defina o indicador de performance operacional</p>
                    </div>
                    <button class="modal-close-gio" onclick="KPIsPage.closeModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Objetivo Estratégico *</label>
                        <select id="kpi-modal-objective" class="form-control-gio"
                            onchange="KPIsPage.onObjectiveChange(this.value)"
                            ${kpi ? 'disabled' : ''}>
                            <option value="">Selecione o objetivo...</option>
                            ${this.objectives.map(o => `
                                <option value="${o.id}" ${o.id == currentObjId ? 'selected' : ''}>${o.category} — ${o.text.substring(0, 70)}${o.text.length > 70 ? '...' : ''}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">KPI *</label>
                        <input type="text" id="kpi-modal-name" class="form-control-gio"
                            placeholder="Ex: Taxa de conversão de vendas"
                            value="${kpi ? kpi.name : ''}">
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Meta</label>
                        <input type="text" id="kpi-modal-meta" class="form-control-gio"
                            placeholder="Ex: NPS acima de 70, 25% ao mês"
                            value="${kpi?.meta_texto || ''}">
                    </div>
                    <div class="sod-ind-row">
                        <div class="form-group-gio" style="flex:1;">
                            <label class="form-label-gio">Indicador</label>
                            <textarea id="kpi-modal-indicador" class="form-control-gio" rows="2"
                                placeholder="Ex: % de leads convertidos">${kpi?.indicadores || ''}</textarea>
                        </div>
                        <div class="form-group-gio" style="flex:1;">
                            <label class="form-label-gio">Fonte de Coleta</label>
                            <textarea id="kpi-modal-fonte" class="form-control-gio" rows="2"
                                placeholder="Ex: CRM, Planilha de vendas">${kpi?.fonte_coleta || ''}</textarea>
                        </div>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Frequência de Medição</label>
                        <div class="sod-freq-options" id="kpi-modal-freq-options">
                            ${this._renderFreqOptions(freqOptions, currentFreq)}
                        </div>
                    </div>
                    <div class="form-group-gio">
                        <label class="form-label-gio">Responsáveis</label>
                        <div class="so-modal-dept-grid">
                            ${this.departments.map(dept => {
                                const checked = selectedIds.map(String).includes(String(dept.id));
                                return `<label class="so-modal-dept-chip${checked ? ' active' : ''}">
                                    <input type="checkbox" name="kpi-modal-depts" value="${dept.id}" ${checked ? 'checked' : ''}
                                        onchange="this.closest('label').classList.toggle('active', this.checked)">
                                    <svg class="so-modal-dept-chip-check" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                    ${dept.nome}
                                </label>`;
                            }).join('')}
                        </div>
                    </div>
                    <div id="kpi-modal-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="KPIsPage.closeModal()">Cancelar</button>
                    <button class="btn-gio-primary" id="kpi-modal-save-btn" onclick="KPIsPage.saveKpi()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${kpi ? 'Atualizar' : 'Criar'}
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    _renderFreqOptions(freqOptions, currentFreq) {
        return freqOptions.map(f => `
            <label class="sod-freq-chip ${currentFreq === f.value ? 'sod-freq-chip-active' : ''}">
                <input type="radio" name="kpi-modal-frequencia" value="${f.value}"
                    ${currentFreq === f.value ? 'checked' : ''}
                    onchange="KPIsPage.onFreqChange()">
                <span class="sod-freq-chip-icon">${f.icon}</span>
                <span>${f.label}</span>
            </label>
        `).join('') + `
            <label class="sod-freq-chip sod-freq-chip-none ${!currentFreq ? 'sod-freq-chip-active' : ''}">
                <input type="radio" name="kpi-modal-frequencia" value=""
                    ${!currentFreq ? 'checked' : ''}
                    onchange="KPIsPage.onFreqChange()">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                <span>Nenhuma</span>
            </label>
        `;
    },

    onObjectiveChange(objId) {
        const obj = this.objectives.find(o => o.id == objId);
        const isObra = obj?.category === 'Obra';
        const currentFreq = document.querySelector('input[name="kpi-modal-frequencia"]:checked')?.value || '';
        const freqOptions = [
            { value: 'semanal',     label: 'Semanal',    icon: '7d' },
            { value: 'mensal',      label: 'Mensal',     icon: '30d' },
            { value: 'trimestral',  label: 'Trimestral', icon: '3m' },
            { value: 'semestral',   label: 'Semestral',  icon: '6m' },
            { value: 'anual',       label: 'Anual',      icon: '1a' },
            ...(isObra ? [{ value: 'fim_obra', label: 'Ao final de cada Obra', icon: '🏗' }] : [])
        ];
        const container = document.getElementById('kpi-modal-freq-options');
        if (container) container.innerHTML = this._renderFreqOptions(freqOptions, currentFreq);
    },

    onFreqChange() {
        document.querySelectorAll('#kpi-modal .sod-freq-chip').forEach(chip => {
            const radio = chip.querySelector('input[type="radio"]');
            chip.classList.toggle('sod-freq-chip-active', radio?.checked || false);
        });
    },

    closeModal() {
        const modal = document.getElementById('kpi-modal');
        if (modal) modal.style.display = 'none';
        this._editingKpiId = null;
    },

    async saveKpi() {
        const objectiveId = document.getElementById('kpi-modal-objective')?.value;
        const name = document.getElementById('kpi-modal-name')?.value.trim();
        const errorDiv = document.getElementById('kpi-modal-error');
        const saveBtn = document.getElementById('kpi-modal-save-btn');

        errorDiv.style.display = 'none';

        if (!objectiveId) {
            errorDiv.textContent = 'Selecione o objetivo estratégico';
            errorDiv.style.display = 'block';
            return;
        }
        if (!name) {
            errorDiv.textContent = 'O campo KPI é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        const meta_texto = document.getElementById('kpi-modal-meta')?.value.trim() || null;
        const indicadores = document.getElementById('kpi-modal-indicador')?.value.trim() || null;
        const fonte_coleta = document.getElementById('kpi-modal-fonte')?.value.trim() || null;
        const freqRadio = document.querySelector('input[name="kpi-modal-frequencia"]:checked');
        const frequencia = freqRadio ? freqRadio.value || null : null;
        const checkedBoxes = document.querySelectorAll('input[name="kpi-modal-depts"]:checked');
        const responsavel_ids = Array.from(checkedBoxes).map(cb => cb.value);

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-gio"></span> Salvando...';

            const data = {
                objective_id: parseInt(objectiveId),
                name,
                meta_texto,
                indicadores,
                fonte_coleta,
                frequencia,
                responsavel_ids,
                sub_metric_type: 'operational_kpi',
                target_value: 0,
                unit: 'texto'
            };

            if (this._editingKpiId) {
                await StrategicSubMetric.update(this._editingKpiId, data);
                DepartmentsPage.showToast('KPI atualizado!', 'success');
            } else {
                await StrategicSubMetric.create(data);
                DepartmentsPage.showToast('KPI criado!', 'success');
            }

            this.closeModal();
            await this.render();
        } catch (error) {
            console.error('Erro ao salvar KPI:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar KPI';
            errorDiv.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ${this._editingKpiId ? 'Atualizar' : 'Criar'}`;
        }
    },

    async deleteKpi(kpiId) {
        const confirmed = await Modal.confirm({
            title: 'Excluir KPI',
            message: 'Deseja realmente excluir este KPI operacional?',
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        try {
            await StrategicSubMetric.delete(kpiId);
            DepartmentsPage.showToast('KPI excluído!', 'success');
            await this.render();
        } catch (error) {
            console.error('Erro ao excluir KPI:', error);
            DepartmentsPage.showToast('Erro ao excluir KPI', 'error');
        }
    },

    addStyles() {
        if (document.getElementById('kpi-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'kpi-page-styles';
        style.textContent = `
            /* Shared layout styles (self-contained) */
            .dashboard-gio {
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }
            .widget-skeleton {
                background: white;
                border-radius: 24px;
                height: 300px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                position: relative;
                overflow: hidden;
            }
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

            /* Modal shared styles */
            .sod-ind-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }
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

            /* Spinner */
            .spinner-gio {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: spin-gio 0.6s linear infinite;
            }
            @keyframes spin-gio { to { transform: rotate(360deg); } }

            /* KPI page styles */
            @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

            .kpi-group {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 6px rgba(0,0,0,0.06);
                margin-bottom: 16px;
                overflow: hidden;
            }
            .kpi-group-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 20px;
                border-bottom: 1px solid #f1f5f9;
                flex-wrap: wrap;
            }
            .kpi-group-category {
                font-size: 11px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 20px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                flex-shrink: 0;
            }
            .kpi-group-title {
                flex: 1;
                font-size: 13px;
                font-weight: 600;
                color: #1e293b;
                line-height: 1.4;
            }
            .kpi-group-count {
                font-size: 12px;
                color: #94a3b8;
                flex-shrink: 0;
            }
            .kpi-add-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 5px 12px;
                background: rgba(18, 176, 160, 0.1);
                border: 1px solid rgba(18, 176, 160, 0.25);
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                color: #12b0a0;
                cursor: pointer;
                flex-shrink: 0;
                transition: all 0.15s;
            }
            .kpi-add-btn:hover { background: rgba(18, 176, 160, 0.18); border-color: #12b0a0; }

            .kpi-list { padding: 4px 0; }

            .kpi-row {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 20px;
                border-bottom: 1px solid #f8fafc;
                transition: background 0.1s;
            }
            .kpi-row:last-child { border-bottom: none; }
            .kpi-row:hover { background: #fafbff; }
            .kpi-row-content { flex: 1; min-width: 0; }
            .kpi-row-top {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }
            .kpi-row-name {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
            }
            .kpi-meta-badge {
                font-size: 11px;
                font-weight: 600;
                padding: 2px 8px;
                background: rgba(30,58,95,0.08);
                color: #1e3a5f;
                border-radius: 20px;
                white-space: nowrap;
            }
            .kpi-freq-badge {
                font-size: 11px;
                font-weight: 600;
                padding: 2px 8px;
                background: rgba(16,185,129,0.1);
                color: #059669;
                border-radius: 20px;
                white-space: nowrap;
            }
            .kpi-row-fields {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .kpi-field {
                display: flex;
                align-items: baseline;
                gap: 6px;
                font-size: 12px;
            }
            .kpi-field-label {
                display: flex;
                align-items: center;
                gap: 3px;
                color: #94a3b8;
                font-weight: 600;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .kpi-field-value {
                color: #475569;
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }
            .kpi-dept-tag {
                display: inline-block;
                font-size: 11px;
                padding: 1px 7px;
                background: #f1f5f9;
                color: #475569;
                border-radius: 20px;
                font-weight: 500;
            }
            .kpi-row-actions {
                display: flex;
                gap: 4px;
                flex-shrink: 0;
                padding-top: 2px;
            }
            .kpi-action-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border: 1px solid #e2e8f0;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                color: #64748b;
                transition: all 0.15s;
            }
            .kpi-action-btn:hover { background: #f1f5f9; color: #1e293b; }
            .kpi-action-del:hover { background: #fef2f2; border-color: #fca5a5; color: #ef4444; }

            .so-modal-dept-grid { display:flex; flex-wrap:wrap; gap:8px; padding:12px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb; }
            .so-modal-dept-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border:1.5px solid #e2e8f0; border-radius:20px; background:white; font-size:13px; font-weight:500; color:#475569; cursor:pointer; user-select:none; transition:all 0.15s; }
            .so-modal-dept-chip input[type="checkbox"] { display:none; }
            .so-modal-dept-chip-check { display:none; color:#1e3a5f; }
            .so-modal-dept-chip.active { border-color:#1e3a5f; background:rgba(30,58,95,0.06); color:#1e3a5f; font-weight:600; }
            .so-modal-dept-chip.active .so-modal-dept-chip-check { display:block; }


        `;
        document.head.appendChild(style);
    }
};

export { KPIsPage };
window.KPIsPage = KPIsPage;
