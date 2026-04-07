import { AuthService } from '../../services/auth.js';
import { StrategicSubMetric } from '../../Entities/StrategicSubMetric.js';
import { StrategicObjective } from '../../Entities/StrategicObjective.js';
import { StrategicTimelineEntry } from '../../Entities/StrategicTimelineEntry.js';
import { Department } from '../../Entities/Department.js';
import { convertToProxyUrl } from '../../services/supabase.js';

const FREQUENCIA_LABELS = {
    'semanal': 'Semanal',
    'mensal': 'Mensal',
    'trimestral': 'Trimestral',
    'semestral': 'Semestral',
    'anual': 'Anual',
    'fim_obra': 'Ao final de cada Obra'
};


const KPIsPage = {
    kpis: [],
    objectives: [],
    departments: [],
    _editingKpiId: null,
    _expandedGroups: new Set(),
    _kpiEntries: {},
    _loadingEntries: new Set(),
    _highlightKpiId: null,
    _selectedFile: null,

    // =====================================================
    // RENDER & LIFECYCLE
    // =====================================================

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="kp-page"><div class="widget-skeleton" style="height:200px;border-radius:16px;"></div></div>`;
        this.addStyles();

        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('highlight');
        if (highlightId) {
            this._highlightKpiId = parseInt(highlightId);
        }

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

        if (this._highlightKpiId) {
            const hk = this.kpis.find(k => k.id === this._highlightKpiId);
            if (hk) {
                this._expandedGroups.add(hk.objective_id);
                await this.loadKpiEntries(this._highlightKpiId);
            }
        }

        this.renderPage(AuthService.isAdmin());

        if (this._highlightKpiId) {
            const hId = this._highlightKpiId;
            this._highlightKpiId = null;
            setTimeout(() => this.openDetailModal(hId), 200);
        }
    },

    // =====================================================
    // STATE
    // =====================================================

    async loadKpiEntries(kpiId) {
        if (this._loadingEntries.has(kpiId)) return;
        this._loadingEntries.add(kpiId);
        try {
            this._kpiEntries[kpiId] = await StrategicTimelineEntry.getBySubMetricId(kpiId);
        } catch (e) {
            console.error('Erro ao carregar entradas do KPI:', e);
            this._kpiEntries[kpiId] = [];
        }
        this._loadingEntries.delete(kpiId);
    },

    toggleGroup(objId) {
        const isOpen = this._expandedGroups.has(objId);
        isOpen ? this._expandedGroups.delete(objId) : this._expandedGroups.add(objId);
        const body = document.getElementById(`kp-grp-body-${objId}`);
        const chevron = document.getElementById(`kp-grp-chev-${objId}`);
        const card = document.getElementById(`kp-grp-${objId}`);
        if (body) body.style.display = isOpen ? 'none' : 'block';
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
        if (card) card.classList.toggle('kp-grp-open', !isOpen);
    },

    expandAll() {
        this.objectives.forEach(o => this._expandedGroups.add(o.id));
        document.querySelectorAll('.kp-grp-body').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.kp-grp-chev').forEach(el => el.style.transform = 'rotate(180deg)');
        document.querySelectorAll('.kp-grp').forEach(el => el.classList.add('kp-grp-open'));
    },

    collapseAll() {
        this._expandedGroups.clear();
        document.querySelectorAll('.kp-grp-body').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.kp-grp-chev').forEach(el => el.style.transform = '');
        document.querySelectorAll('.kp-grp').forEach(el => el.classList.remove('kp-grp-open'));
    },

    // =====================================================
    // PAGE RENDER
    // =====================================================

    renderPage(isAdmin) {
        const content = document.getElementById('content');
        const grouped = {};
        this.kpis.forEach(kpi => {
            if (!grouped[kpi.objective_id]) grouped[kpi.objective_id] = [];
            grouped[kpi.objective_id].push(kpi);
        });

        const totalKpis = this.kpis.length;
        const allObjs = this.objectives;
        const totalObjs = allObjs.length;

        if (this._expandedGroups.size === 0 && allObjs.length > 0) {
            this._expandedGroups.add(allObjs[0].id);
        }

        const groupsHTML = allObjs.map((obj, idx) => this._buildGroup(obj, grouped[obj.id] || [], idx + 1, isAdmin)).join('');

        content.innerHTML = `
            <div class="kp-page">
                <div class="kp-header">
                    <div class="kp-header-left">
                        <div class="kp-header-icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        </div>
                        <div>
                            <h1 class="kp-title">Objetivos Operacionais</h1>
                            <p class="kp-subtitle">${totalKpis} indicador${totalKpis !== 1 ? 'es' : ''} em ${totalObjs} objetivo${totalObjs !== 1 ? 's' : ''} estratégico${totalObjs !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div class="kp-header-actions">
                        ${totalObjs > 1 ? `
                            <div class="kp-toggle-btns">
                                <button class="kp-toggle-btn" onclick="KPIsPage.expandAll()" title="Expandir todos">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                                </button>
                                <button class="kp-toggle-btn" onclick="KPIsPage.collapseAll()" title="Recolher todos">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4H4m0 5l5-5m6 5V4h5m0 5l-5-5M9 15v5H4m0-5l5 5m6-5v5h5m0-5l-5 5"/></svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${totalObjs === 0 ? `
                    <div class="kp-empty-state">
                        <div class="kp-empty-icon">
                            <svg width="32" height="32" fill="none" stroke="#12b0a0" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        </div>
                        <h3>Nenhum objetivo estratégico cadastrado</h3>
                        <p>Cadastre objetivos estratégicos para começar a adicionar KPIs.</p>
                    </div>
                ` : `<div class="kp-groups">${groupsHTML}</div>`}

                <div id="kpi-detail-modal" class="modal-gio-container" style="display:none;"></div>
                <div id="kpi-modal" class="modal-gio-container" style="display:none;"></div>
                <div id="kpi-evidence-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;
    },

    // =====================================================
    // LEVEL 1 — OBJECTIVE GROUP
    // =====================================================

    _buildGroup(obj, kpiList, number, isAdmin) {
        const isOpen = this._expandedGroups.has(obj.id);

        return `
            <div class="kp-grp ${isOpen ? 'kp-grp-open' : ''}" id="kp-grp-${obj.id}">
                <div class="kp-grp-header" onclick="KPIsPage.toggleGroup(${obj.id})">
                    <svg id="kp-grp-chev-${obj.id}" class="kp-grp-chev" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="${isOpen ? 'transform:rotate(180deg)' : ''}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    <div class="kp-grp-info">
                        <div class="kp-grp-title-row">
                            <span class="kp-grp-cat">${obj.category}</span>
                            <span class="kp-grp-sep">/</span>
                            <span class="kp-grp-title">${obj.text}</span>
                        </div>
                    </div>
                    <div class="kp-grp-right" onclick="event.stopPropagation();">
                        <span class="kp-grp-badge">${kpiList.length} KPI${kpiList.length !== 1 ? 's' : ''}</span>
                        ${isAdmin ? `
                            <button class="kp-grp-add" onclick="KPIsPage.openModal(null, ${obj.id})" title="Novo KPI neste objetivo">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="kp-grp-body" id="kp-grp-body-${obj.id}" style="display:${isOpen ? 'block' : 'none'};">
                    ${kpiList.length > 0
                        ? kpiList.map((kpi, i) => this._buildKpiRow(kpi, i + 1, kpiList.length, isAdmin)).join('')
                        : `<div class="kp-grp-empty">${isAdmin ? `Nenhum KPI ainda. <a href="#" onclick="event.preventDefault();KPIsPage.openModal(null, ${obj.id})">Adicionar KPI</a>` : 'Nenhum KPI cadastrado neste objetivo.'}</div>`
                    }
                </div>
            </div>
        `;
    },

    // =====================================================
    // LEVEL 2 — KPI ROW (accordion)
    // =====================================================

    _buildKpiRow(kpi, number, total, isAdmin) {
        const freqLabel = kpi.frequencia ? (FREQUENCIA_LABELS[kpi.frequencia] || kpi.frequencia) : null;
        const deptNomes = (kpi.responsavel_ids || []).map(id => {
            const d = this.departments.find(d => d.id === id || String(d.id) === String(id));
            return d ? d.nome : null;
        }).filter(Boolean);
        const entries = this._kpiEntries[kpi.id] || [];
        const hasEntries = entries.length > 0;

        return `
            <div class="kp-kpi" id="kp-kpi-${kpi.id}">
                <div class="kp-kpi-header" onclick="KPIsPage.openDetailModal(${kpi.id})">
                    <div class="kp-kpi-left">
                        <div class="kp-kpi-dot-area">
                            <div class="kp-kpi-dot"></div>
                            ${number < total ? '<div class="kp-kpi-line"></div>' : ''}
                        </div>
                        <div class="kp-kpi-info">
                            <div class="kp-kpi-title-row">
                                <span class="kp-kpi-name">${kpi.name}</span>
                                ${kpi.meta_texto ? `<span class="kp-badge kp-badge-meta">Meta: ${kpi.meta_texto}</span>` : ''}
                                ${freqLabel ? `<span class="kp-badge kp-badge-freq">${freqLabel}</span>` : ''}
                                ${hasEntries ? `<span class="kp-badge kp-badge-entries">${entries.length}</span>` : ''}
                            </div>
                            <div class="kp-kpi-details">
                                ${kpi.indicadores ? `<span class="kp-detail"><svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>${kpi.indicadores}</span>` : ''}
                                ${kpi.fonte_coleta ? `<span class="kp-detail"><svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>${kpi.fonte_coleta}</span>` : ''}
                                ${deptNomes.length > 0 ? deptNomes.map(n => `<span class="kp-dept">${n}</span>`).join('') : ''}
                            </div>
                        </div>
                    </div>
                    <svg class="kp-kpi-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
            </div>
        `;
    },

    // =====================================================
    // KPI DETAIL MODAL
    // =====================================================

    async openDetailModal(kpiId) {
        // Load data on demand if not already loaded (e.g. called from another page)
        if (!this.kpis.length || !this.objectives.length) {
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
        }

        const kpi = this.kpis.find(k => k.id === kpiId);
        if (!kpi) return;

        if (!this._kpiEntries[kpiId]) {
            await this.loadKpiEntries(kpiId);
        }

        // Create modal container if it doesn't exist (called from another page)
        let modal = document.getElementById('kpi-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'kpi-detail-modal';
            modal.className = 'modal-gio-container';
            modal.style.display = 'none';
            document.body.appendChild(modal);
            this.addStyles();
        }

        // Also ensure evidence modal exists
        if (!document.getElementById('kpi-evidence-modal')) {
            const evModal = document.createElement('div');
            evModal.id = 'kpi-evidence-modal';
            evModal.className = 'modal-gio-container';
            evModal.style.display = 'none';
            document.body.appendChild(evModal);
        }

        this._renderDetailModal(kpiId);
        modal.style.display = 'flex';
    },

    _renderDetailModal(kpiId) {
        const kpi = this.kpis.find(k => k.id === kpiId);
        if (!kpi) return;
        const isAdmin = AuthService.isAdmin();
        const obj = this.objectives.find(o => o.id === kpi.objective_id);
        const freqLabel = kpi.frequencia ? (FREQUENCIA_LABELS[kpi.frequencia] || kpi.frequencia) : null;
        const deptNomes = (kpi.responsavel_ids || []).map(id => {
            const d = this.departments.find(d => d.id === id || String(d.id) === String(id));
            return d ? d.nome : null;
        }).filter(Boolean);
        const entries = this._kpiEntries[kpiId] || [];
        const latestProgress = entries.find(e => e.progress_value != null)?.progress_value ?? 0;
        const progressColor = latestProgress >= 70 ? '#1e6076' : (latestProgress >= 40 ? '#2a8fad' : '#5bb8ce');

        const entriesHTML = entries.length === 0
            ? `<div class="kp-ev-empty">
                    <svg width="20" height="20" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Nenhuma medição registrada</span>
               </div>`
            : entries.map(e => this._buildEntry(e, isAdmin)).join('');

        const modal = document.getElementById('kpi-detail-modal');
        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="KPIsPage.closeDetailModal()"></div>
            <div class="kp-detail-content">
                <div class="kp-detail-header">
                    <div class="kp-detail-header-top">
                        <div class="kp-detail-header-info">
                            ${obj ? `<span class="kp-detail-obj-cat">${obj.category}</span>` : ''}
                            <h2 class="kp-detail-title">${kpi.name}</h2>
                            ${obj ? `<p class="kp-detail-obj-name">${obj.text}</p>` : ''}
                        </div>
                        <div class="kp-detail-header-actions">
                            ${isAdmin ? `
                                <button class="kp-detail-action-btn" onclick="KPIsPage.closeDetailModal();KPIsPage.openModal(${kpi.id})" title="Editar KPI">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="kp-detail-action-btn kp-detail-action-del" onclick="KPIsPage.closeDetailModal();KPIsPage.deleteKpi(${kpi.id})" title="Excluir KPI">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            ` : ''}
                            <button class="kp-detail-close" onclick="KPIsPage.closeDetailModal()">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="kp-detail-progress-row">
                        <div class="kp-detail-progress-bar">
                            <div class="kp-detail-progress-fill" style="width:${latestProgress}%;background:${progressColor};"></div>
                        </div>
                        <span class="kp-detail-progress-label" style="color:${progressColor};">${latestProgress}%</span>
                    </div>
                </div>

                <div class="kp-detail-body">
                    <div class="kp-detail-meta-grid">
                        ${kpi.meta_texto ? `
                            <div class="kp-detail-meta-card">
                                <div class="kp-detail-meta-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
                                <div><span class="kp-detail-meta-label">Meta</span><span class="kp-detail-meta-value">${kpi.meta_texto}</span></div>
                            </div>
                        ` : ''}
                        ${kpi.indicadores ? `
                            <div class="kp-detail-meta-card">
                                <div class="kp-detail-meta-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
                                <div><span class="kp-detail-meta-label">Indicador</span><span class="kp-detail-meta-value">${kpi.indicadores}</span></div>
                            </div>
                        ` : ''}
                        ${kpi.fonte_coleta ? `
                            <div class="kp-detail-meta-card">
                                <div class="kp-detail-meta-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg></div>
                                <div><span class="kp-detail-meta-label">Fonte de Coleta</span><span class="kp-detail-meta-value">${kpi.fonte_coleta}</span></div>
                            </div>
                        ` : ''}
                        ${freqLabel ? `
                            <div class="kp-detail-meta-card">
                                <div class="kp-detail-meta-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                                <div><span class="kp-detail-meta-label">Frequência</span><span class="kp-detail-meta-value">${freqLabel}</span></div>
                            </div>
                        ` : ''}
                    </div>

                    ${deptNomes.length > 0 ? `
                        <div class="kp-detail-section">
                            <span class="kp-detail-section-label">Responsáveis</span>
                            <div class="kp-detail-dept-list">${deptNomes.map(n => `<span class="kp-detail-dept">${n}</span>`).join('')}</div>
                        </div>
                    ` : ''}

                    <div class="kp-detail-divider"></div>

                    <div class="kp-detail-section">
                        <div class="kp-ev-header">
                            <span class="kp-ev-title">Medições / Evidências</span>
                            <span class="kp-ev-count">${entries.length} registro${entries.length !== 1 ? 's' : ''}</span>
                            ${isAdmin ? `
                                <button class="kp-ev-add" onclick="KPIsPage.openEvidenceModal(${kpiId})">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    Nova Medição
                                </button>
                            ` : ''}
                        </div>
                        <div class="kp-ev-list">${entriesHTML}</div>
                    </div>
                </div>
            </div>
        `;
    },

    closeDetailModal() {
        const m = document.getElementById('kpi-detail-modal');
        if (m) m.style.display = 'none';
    },

    _buildEntry(entry, isAdmin) {
        const icon = entry.entry_type === 'file'
            ? '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>'
            : entry.entry_type === 'link'
                ? '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>'
                : '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';

        let attachment = '';
        if (entry.entry_type === 'link' && entry.url) {
            attachment = `<a href="${convertToProxyUrl(entry.url)}" target="_blank" rel="noopener noreferrer" class="kp-ev-attach"><svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>${entry.url.length > 50 ? entry.url.substring(0, 50) + '...' : entry.url}</a>`;
        } else if (entry.entry_type === 'file' && entry.url) {
            attachment = `<a href="${convertToProxyUrl(entry.url)}" target="_blank" rel="noopener noreferrer" class="kp-ev-attach"><svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>${entry.file_name || 'Arquivo'}</a>`;
        }

        const pv = entry.progress_value;
        const pvColor = pv != null ? (pv >= 70 ? '#1e6076' : (pv >= 40 ? '#2a8fad' : '#5bb8ce')) : null;

        return `
            <div class="kp-ev-item">
                <div class="kp-ev-item-top">
                    <span class="kp-ev-date">${icon} ${entry.formattedDate}</span>
                    ${pv != null ? `<span class="kp-ev-progress-badge" style="background:${pvColor}15;color:${pvColor};border:1px solid ${pvColor}30;">${pv}%</span>` : ''}
                    ${entry.createdByName !== 'Sistema' ? `<span class="kp-ev-author">por ${entry.createdByName}</span>` : ''}
                    ${isAdmin ? `<button class="kp-icon-btn kp-icon-del kp-ev-del" onclick="KPIsPage.deleteEntryFromDetail(${entry.id}, ${entry.sub_metric_id})" title="Excluir"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
                </div>
                ${pv != null ? `<div class="kp-ev-mini-bar"><div class="kp-ev-mini-fill" style="width:${pv}%;background:${pvColor};"></div></div>` : ''}
                <p class="kp-ev-desc">${entry.description}</p>
                ${attachment}
            </div>
        `;
    },

    async deleteEntryFromDetail(entryId, kpiId) {
        if (!await Modal.confirm({ title: 'Excluir Registro', message: 'Deseja excluir este registro?', confirmLabel: 'Excluir', danger: true })) return;
        try {
            await StrategicTimelineEntry.delete(entryId);
            DepartmentsPage.showToast('Registro excluído!', 'success');
            await this.loadKpiEntries(kpiId);
            this._renderDetailModal(kpiId);
        } catch (e) { console.error('Erro:', e); DepartmentsPage.showToast('Erro ao excluir', 'error'); }
    },

    // =====================================================
    // EVIDENCE MODAL
    // =====================================================

    openEvidenceModal(kpiId) {
        const kpi = this.kpis.find(k => k.id === kpiId);
        if (!kpi) return;
        const modal = document.getElementById('kpi-evidence-modal');
        if (!modal) return;
        this._selectedFile = null;

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="KPIsPage.closeEvidenceModal()"></div>
            <div class="modal-content-gio">
                <div class="modal-header-gio">
                    <div><h3>Nova Medição</h3><p>${kpi.name}</p></div>
                    <button class="modal-close-gio" onclick="KPIsPage.closeEvidenceModal()"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Progresso da Meta (%)</label>
                        <div class="kp-ev-progress-field">
                            <input type="range" id="kpi-ev-progress" min="0" max="100" value="0" oninput="document.getElementById('kpi-ev-progress-val').textContent=this.value+'%';this.style.background='linear-gradient(to right, var(--top-teal, #12b0a0) '+this.value+'%, #e2e8f0 '+this.value+'%)'">
                            <span id="kpi-ev-progress-val" class="kp-ev-progress-val">0%</span>
                        </div>
                        ${kpi.meta_texto ? `<span class="kp-ev-progress-hint">Meta: ${kpi.meta_texto}</span>` : ''}
                    </div>
                    <div class="sod-ind-row">
                        <div class="form-group-gio"><label class="form-label-gio">Data da Medição</label><input type="date" id="kpi-ev-date" class="form-control-gio" value="${new Date().toISOString().split('T')[0]}"></div>
                        <div class="form-group-gio"><label class="form-label-gio">Tipo de Evidência *</label><select id="kpi-ev-type" class="form-control-gio" onchange="KPIsPage.onEvidenceTypeChange()"><option value="text">Texto</option><option value="link">Link</option><option value="file">Arquivo</option></select></div>
                    </div>
                    <div class="form-group-gio"><label class="form-label-gio">Descrição *</label><textarea id="kpi-ev-description" class="form-control-gio" rows="3" placeholder="Descreva a medição, resultado obtido, o que foi alcançado..."></textarea></div>
                    <div id="kpi-ev-dynamic-field"></div>
                    <div id="kpi-ev-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="KPIsPage.closeEvidenceModal()">Cancelar</button>
                    <button class="btn-gio-primary" id="kpi-ev-save-btn" onclick="KPIsPage.saveEvidence(${kpiId})"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        this.onEvidenceTypeChange();
    },

    onEvidenceTypeChange() {
        const type = document.getElementById('kpi-ev-type')?.value;
        const c = document.getElementById('kpi-ev-dynamic-field');
        if (!c) return;
        if (type === 'link') {
            c.innerHTML = `<div class="form-group-gio"><label class="form-label-gio">URL *</label><input type="url" id="kpi-ev-url" class="form-control-gio" placeholder="https://..."></div>`;
        } else if (type === 'file') {
            c.innerHTML = `<div class="form-group-gio"><label class="form-label-gio">Arquivo *</label><div class="kp-file-drop" onclick="document.getElementById('kpi-ev-file-input').click()"><svg width="24" height="24" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><span id="kpi-ev-file-label">Clique para selecionar</span></div><input type="file" id="kpi-ev-file-input" style="display:none;" onchange="KPIsPage.onFileSelected(this)"></div>`;
        } else { c.innerHTML = ''; }
    },

    onFileSelected(input) {
        const f = input.files?.[0];
        if (f) { this._selectedFile = f; const l = document.getElementById('kpi-ev-file-label'); if (l) l.textContent = f.name; }
    },

    closeEvidenceModal() {
        const m = document.getElementById('kpi-evidence-modal');
        if (m) m.style.display = 'none';
        this._selectedFile = null;
    },

    async saveEvidence(kpiId) {
        const kpi = this.kpis.find(k => k.id === kpiId);
        if (!kpi) return;
        const type = document.getElementById('kpi-ev-type')?.value || 'text';
        const description = document.getElementById('kpi-ev-description')?.value.trim();
        const measuredAt = document.getElementById('kpi-ev-date')?.value;
        const errorDiv = document.getElementById('kpi-ev-error');
        const saveBtn = document.getElementById('kpi-ev-save-btn');
        errorDiv.style.display = 'none';

        if (!description) { errorDiv.textContent = 'A descrição é obrigatória'; errorDiv.style.display = 'block'; return; }

        try {
            saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-gio"></span> Salvando...';
            let url = null, fileName = null, filePath = null;

            if (type === 'link') {
                url = document.getElementById('kpi-ev-url')?.value.trim();
                if (!url) { errorDiv.textContent = 'A URL é obrigatória'; errorDiv.style.display = 'block'; saveBtn.disabled = false; saveBtn.innerHTML = 'Salvar'; return; }
            } else if (type === 'file') {
                if (!this._selectedFile) { errorDiv.textContent = 'Selecione um arquivo'; errorDiv.style.display = 'block'; saveBtn.disabled = false; saveBtn.innerHTML = 'Salvar'; return; }
                const uploaded = await StrategicTimelineEntry.uploadFile(this._selectedFile, kpi.objective_id);
                url = uploaded.url; fileName = uploaded.name; filePath = uploaded.path;
            }

            const progressValue = parseInt(document.getElementById('kpi-ev-progress')?.value || '0');
            const user = AuthService.getCurrentUser();
            await StrategicTimelineEntry.create({
                objective_id: kpi.objective_id, description, entry_type: type, url,
                file_name: fileName, file_path: filePath, created_by: user?.id || null,
                measured_at: measuredAt ? new Date(measuredAt + 'T12:00:00').toISOString() : new Date().toISOString(),
                sub_metric_id: kpiId,
                progress_value: progressValue
            });

            this.closeEvidenceModal();
            DepartmentsPage.showToast('Medição registrada!', 'success');
            await this.loadKpiEntries(kpiId);
            this._renderDetailModal(kpiId);
        } catch (error) {
            console.error('Erro ao salvar evidência:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar';
            errorDiv.style.display = 'block';
            saveBtn.disabled = false; saveBtn.innerHTML = 'Salvar';
        }
    },


    // =====================================================
    // KPI CRUD MODAL
    // =====================================================

    openModal(kpiId = null, presetObjectiveId = null) {
        const kpi = kpiId ? this.kpis.find(k => k.id === kpiId) : null;
        this._editingKpiId = kpiId || null;
        let modal = document.getElementById('kpi-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'kpi-modal';
            modal.className = 'modal-gio-container';
            modal.style.display = 'none';
            document.body.appendChild(modal);
            this.addStyles();
        }

        const selectedIds = kpi ? (kpi.responsavel_ids || []) : [];
        const currentFreq = kpi ? (kpi.frequencia || '') : '';
        const currentObjId = kpi ? kpi.objective_id : (presetObjectiveId || '');
        const selectedObj = this.objectives.find(o => o.id == currentObjId);
        const isObra = selectedObj?.category === 'Obra';

        const freqOptions = [
            { value: 'semanal', label: 'Semanal', icon: '7d' },
            { value: 'mensal', label: 'Mensal', icon: '30d' },
            { value: 'trimestral', label: 'Trimestral', icon: '3m' },
            { value: 'semestral', label: 'Semestral', icon: '6m' },
            { value: 'anual', label: 'Anual', icon: '1a' },
            ...(isObra ? [{ value: 'fim_obra', label: 'Ao final de cada Obra', icon: '\u{1F3D7}' }] : [])
        ];

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="KPIsPage.closeModal()"></div>
            <div class="modal-content-gio">
                <div class="modal-header-gio">
                    <div><h3>${kpi ? 'Editar' : 'Novo'} KPI</h3><p>Indicador de performance operacional</p></div>
                    <button class="modal-close-gio" onclick="KPIsPage.closeModal()"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div class="modal-body-gio">
                    <div class="form-group-gio"><label class="form-label-gio">Objetivo Estratégico *</label><select id="kpi-modal-objective" class="form-control-gio" onchange="KPIsPage.onObjectiveChange(this.value)" ${kpi ? 'disabled' : ''}><option value="">Selecione...</option>${this.objectives.map(o => `<option value="${o.id}" ${o.id == currentObjId ? 'selected' : ''}>${o.category} \u2014 ${o.text.substring(0, 70)}${o.text.length > 70 ? '...' : ''}</option>`).join('')}</select></div>
                    <div class="form-group-gio"><label class="form-label-gio">KPI *</label><input type="text" id="kpi-modal-name" class="form-control-gio" placeholder="Ex: Taxa de conversão de vendas" value="${kpi ? kpi.name : ''}"></div>
                    <div class="form-group-gio"><label class="form-label-gio">Meta</label><input type="text" id="kpi-modal-meta" class="form-control-gio" placeholder="Ex: NPS acima de 70" value="${kpi?.meta_texto || ''}"></div>
                    <div class="sod-ind-row">
                        <div class="form-group-gio" style="flex:1;"><label class="form-label-gio">Indicador</label><textarea id="kpi-modal-indicador" class="form-control-gio" rows="2" placeholder="Ex: % de leads convertidos">${kpi?.indicadores || ''}</textarea></div>
                        <div class="form-group-gio" style="flex:1;"><label class="form-label-gio">Fonte de Coleta</label><textarea id="kpi-modal-fonte" class="form-control-gio" rows="2" placeholder="Ex: CRM, Planilha">${kpi?.fonte_coleta || ''}</textarea></div>
                    </div>
                    <div class="form-group-gio"><label class="form-label-gio">Frequência</label><div class="sod-freq-options" id="kpi-modal-freq-options">${this._renderFreqOptions(freqOptions, currentFreq)}</div></div>
                    <div class="form-group-gio"><label class="form-label-gio">Responsáveis</label><div class="so-modal-dept-grid">${this.departments.map(dept => { const checked = selectedIds.map(String).includes(String(dept.id)); return `<label class="so-modal-dept-chip${checked ? ' active' : ''}"><input type="checkbox" name="kpi-modal-depts" value="${dept.id}" ${checked ? 'checked' : ''} onchange="this.closest('label').classList.toggle('active', this.checked)"><svg class="so-modal-dept-chip-check" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>${dept.nome}</label>`; }).join('')}</div></div>
                    <div id="kpi-modal-error" class="error-message-gio" style="display:none;"></div>
                </div>
                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="KPIsPage.closeModal()">Cancelar</button>
                    <button class="btn-gio-primary" id="kpi-modal-save-btn" onclick="KPIsPage.saveKpi()"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ${kpi ? 'Atualizar' : 'Criar'}</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    _renderFreqOptions(freqOptions, currentFreq) {
        return freqOptions.map(f => `<label class="sod-freq-chip ${currentFreq === f.value ? 'sod-freq-chip-active' : ''}"><input type="radio" name="kpi-modal-frequencia" value="${f.value}" ${currentFreq === f.value ? 'checked' : ''} onchange="KPIsPage.onFreqChange()"><span class="sod-freq-chip-icon">${f.icon}</span><span>${f.label}</span></label>`).join('') +
            `<label class="sod-freq-chip sod-freq-chip-none ${!currentFreq ? 'sod-freq-chip-active' : ''}"><input type="radio" name="kpi-modal-frequencia" value="" ${!currentFreq ? 'checked' : ''} onchange="KPIsPage.onFreqChange()"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg><span>Nenhuma</span></label>`;
    },

    onObjectiveChange(objId) {
        const obj = this.objectives.find(o => o.id == objId);
        const isObra = obj?.category === 'Obra';
        const currentFreq = document.querySelector('input[name="kpi-modal-frequencia"]:checked')?.value || '';
        const freqOptions = [
            { value: 'semanal', label: 'Semanal', icon: '7d' }, { value: 'mensal', label: 'Mensal', icon: '30d' },
            { value: 'trimestral', label: 'Trimestral', icon: '3m' }, { value: 'semestral', label: 'Semestral', icon: '6m' },
            { value: 'anual', label: 'Anual', icon: '1a' },
            ...(isObra ? [{ value: 'fim_obra', label: 'Ao final de cada Obra', icon: '\u{1F3D7}' }] : [])
        ];
        const c = document.getElementById('kpi-modal-freq-options');
        if (c) c.innerHTML = this._renderFreqOptions(freqOptions, currentFreq);
    },

    onFreqChange() {
        document.querySelectorAll('#kpi-modal .sod-freq-chip').forEach(chip => {
            chip.classList.toggle('sod-freq-chip-active', chip.querySelector('input[type="radio"]')?.checked || false);
        });
    },

    closeModal() { const m = document.getElementById('kpi-modal'); if (m) m.style.display = 'none'; this._editingKpiId = null; },

    async saveKpi() {
        const objectiveId = document.getElementById('kpi-modal-objective')?.value;
        const name = document.getElementById('kpi-modal-name')?.value.trim();
        const errorDiv = document.getElementById('kpi-modal-error');
        const saveBtn = document.getElementById('kpi-modal-save-btn');
        errorDiv.style.display = 'none';

        if (!objectiveId) { errorDiv.textContent = 'Selecione o objetivo'; errorDiv.style.display = 'block'; return; }
        if (!name) { errorDiv.textContent = 'O campo KPI é obrigatório'; errorDiv.style.display = 'block'; return; }

        const data = {
            objective_id: parseInt(objectiveId), name,
            meta_texto: document.getElementById('kpi-modal-meta')?.value.trim() || null,
            indicadores: document.getElementById('kpi-modal-indicador')?.value.trim() || null,
            fonte_coleta: document.getElementById('kpi-modal-fonte')?.value.trim() || null,
            frequencia: document.querySelector('input[name="kpi-modal-frequencia"]:checked')?.value || null,
            responsavel_ids: Array.from(document.querySelectorAll('input[name="kpi-modal-depts"]:checked')).map(cb => cb.value),
            sub_metric_type: 'operational_kpi', target_value: 0, unit: 'texto'
        };

        try {
            saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-gio"></span> Salvando...';
            if (this._editingKpiId) { await StrategicSubMetric.update(this._editingKpiId, data); DepartmentsPage.showToast('KPI atualizado!', 'success'); }
            else { await StrategicSubMetric.create(data); DepartmentsPage.showToast('KPI criado!', 'success'); }
            const editedId = this._editingKpiId;
            this.closeModal();
            if (this._isOnKpisPage()) {
                await this.render();
            } else {
                // Reload data and reopen detail modal
                this.kpis = []; this.objectives = [];
                if (editedId) await this.openDetailModal(editedId);
            }
        } catch (error) {
            console.error('Erro:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar';
            errorDiv.style.display = 'block';
            saveBtn.disabled = false; saveBtn.innerHTML = this._editingKpiId ? 'Atualizar' : 'Criar';
        }
    },

    _isOnKpisPage() {
        return !!document.getElementById('kpi-detail-modal')?.closest('.kp-page');
    },

    async deleteKpi(kpiId) {
        if (!await Modal.confirm({ title: 'Excluir KPI', message: 'Deseja excluir este KPI?', confirmLabel: 'Excluir', danger: true })) return;
        try {
            await StrategicSubMetric.delete(kpiId);
            DepartmentsPage.showToast('KPI excluído!', 'success');
            if (this._isOnKpisPage()) {
                await this.render();
            } else {
                this.kpis = []; this.objectives = [];
            }
        }
        catch (e) { console.error('Erro:', e); DepartmentsPage.showToast('Erro ao excluir', 'error'); }
    },

    // =====================================================
    // STYLES
    // =====================================================

    addStyles() {
        if (document.getElementById('kp-styles')) return;
        const s = document.createElement('style');
        s.id = 'kp-styles';
        s.textContent = `
/* ===== PAGE ===== */
.kp-page { background:#f5f7fb; margin:-24px; padding:28px 24px; min-height:calc(100vh - 140px); }

/* ===== HEADER ===== */
.kp-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.kp-header-left { display:flex; align-items:center; gap:14px; }
.kp-header-icon { width:40px;height:40px;border-radius:12px;background:rgba(18,176,160,0.1);display:flex;align-items:center;justify-content:center;color:#12b0a0;flex-shrink:0; }
.kp-title { font-size:18px;font-weight:800;color:#0f172a;margin:0;font-family:'Lemon Milk','Inter',sans-serif;letter-spacing:0.3px; }
.kp-subtitle { font-size:12px;color:#94a3b8;margin:2px 0 0;font-weight:500; }
.kp-header-actions { display:flex;align-items:center;gap:10px; }
.kp-toggle-btns { display:flex;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden; }
.kp-toggle-btn { display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:white;border:none;color:#64748b;cursor:pointer;transition:all 0.15s; }
.kp-toggle-btn:first-child { border-right:1px solid #e2e8f0; }
.kp-toggle-btn:hover { background:#f1f5f9;color:#1e293b; }
.kp-new-btn { display:inline-flex;align-items:center;gap:6px;padding:9px 20px;background:#12b0a0;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(18,176,160,0.3);transition:all 0.2s;font-family:'Lemon Milk','Inter',sans-serif;letter-spacing:0.5px; }
.kp-new-btn:hover { background:#0e8f82;transform:translateY(-1px); }

/* ===== EMPTY ===== */
.kp-empty-state { text-align:center;padding:60px 20px;background:white;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.kp-empty-icon { width:64px;height:64px;border-radius:16px;background:rgba(18,176,160,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px; }
.kp-empty-state h3 { font-size:15px;font-weight:700;color:#1f2937;margin:0 0 6px; }
.kp-empty-state p { font-size:13px;color:#6b7280;margin:0;max-width:380px;margin:0 auto; }

/* ===== GROUPS ===== */
.kp-groups { display:flex;flex-direction:column;gap:12px; }

/* ===== LEVEL 1: OBJECTIVE GROUP ===== */
.kp-grp { background:white;border-radius:12px;border:1px solid var(--border, #e2e8f0);box-shadow:0 2px 4px rgba(0,0,0,0.05);overflow:hidden;transition:all 0.3s ease; }
.kp-grp:hover { box-shadow:0 4px 12px rgba(0,0,0,0.1); }
.kp-grp-open { box-shadow:0 4px 12px rgba(0,0,0,0.1); }
.kp-grp-header { display:flex;align-items:center;gap:12px;padding:16px 20px;cursor:pointer;transition:all 0.2s ease;background:linear-gradient(135deg, var(--top-blue, #1e3a5f) 0%, #1a5570 100%);position:relative;border-radius:12px 12px 0 0; }
.kp-grp-header::after { content:'';position:absolute;bottom:0;left:0;width:100%;height:2px;background:var(--top-teal, #12b0a0);transform:scaleX(0);transition:transform 0.3s ease; }
.kp-grp-header:hover::after { transform:scaleX(1); }
.kp-grp-header:hover { background:linear-gradient(135deg, #1a5570 0%, var(--top-blue, #1e3a5f) 100%); }
.kp-grp:not(.kp-grp-open) .kp-grp-header { border-radius:12px; }
.kp-grp-chev { flex-shrink:0;color:rgba(255,255,255,0.7);transition:transform 0.25s ease; }
.kp-grp-info { flex:1;min-width:0; }
.kp-grp-title-row { display:flex;align-items:baseline;gap:6px;flex-wrap:wrap; }
.kp-grp-cat { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;color:var(--top-teal, #12b0a0); }
.kp-grp-sep { color:rgba(255,255,255,0.4);font-size:12px; }
.kp-grp-title { font-size:13px;font-weight:600;color:rgba(255,255,255,0.95);line-height:1.4; }
.kp-grp-right { display:flex;align-items:center;gap:8px;flex-shrink:0; }
.kp-grp-badge { font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px; }
.kp-grp-add { width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1.5px dashed rgba(255,255,255,0.35);background:transparent;color:rgba(255,255,255,0.8);cursor:pointer;transition:all 0.15s; }
.kp-grp-add:hover { background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.6); }
.kp-grp-body { background:#f8fafc; }
.kp-grp-empty { padding:24px 20px;text-align:center;color:#94a3b8;font-size:13px; }
.kp-grp-empty a { color:#12b0a0;font-weight:600;text-decoration:none; }
.kp-grp-empty a:hover { text-decoration:underline; }

/* ===== LEVEL 2: KPI ROW ===== */
.kp-kpi { position:relative; }
.kp-kpi-header { display:flex;align-items:center;gap:10px;padding:12px 20px 12px 16px;cursor:pointer;transition:background 0.12s; }
.kp-kpi-header:hover { background:#f0f4f8; }
.kp-kpi-left { display:flex;align-items:flex-start;gap:0;flex:1;min-width:0; }
.kp-kpi-dot-area { display:flex;flex-direction:column;align-items:center;width:24px;flex-shrink:0;padding-top:6px; }
.kp-kpi-dot { width:8px;height:8px;border-radius:50%;background:#cbd5e1;flex-shrink:0;transition:background 0.15s; }
.kp-kpi-header:hover .kp-kpi-dot { background:#12b0a0; }
.kp-kpi-line { width:2px;flex:1;background:#e2e8f0;min-height:20px;margin-top:4px; }
.kp-kpi-info { flex:1;min-width:0; }
.kp-kpi-title-row { display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px; }
.kp-kpi-name { font-size:13px;font-weight:600;color:#1e293b; }
.kp-badge { font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap; }
.kp-badge-meta { background:rgba(30,58,95,0.07);color:#1e3a5f; }
.kp-badge-freq { background:rgba(16,185,129,0.1);color:#059669; }
.kp-badge-entries { background:rgba(18,176,160,0.1);color:#12b0a0;min-width:18px;text-align:center;border-radius:10px;padding:2px 6px; }
.kp-kpi-details { display:flex;align-items:center;gap:10px;flex-wrap:wrap; }
.kp-detail { display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#64748b; }
.kp-detail svg { color:#94a3b8;flex-shrink:0; }
.kp-dept { font-size:10px;font-weight:600;padding:1px 7px;background:#e8ecf1;color:#475569;border-radius:20px; }
.kp-kpi-arrow { color:#94a3b8;flex-shrink:0;transition:transform 0.2s;margin-left:4px; }
.kp-kpi-header:hover .kp-kpi-arrow { color:#12b0a0;transform:translateX(2px); }
.kp-icon-btn { display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid #e2e8f0;background:white;border-radius:6px;cursor:pointer;color:#64748b;transition:all 0.15s;opacity:1; }
.kp-ev-item:hover .kp-ev-del { opacity:1; }
.kp-icon-btn:hover { background:#f1f5f9;color:#1e293b; }
.kp-icon-del:hover { background:#fef2f2;border-color:#fca5a5;color:#ef4444; }

/* ===== KPI DETAIL MODAL ===== */
.kp-detail-content { background:white;border-radius:16px;width:94vw;max-width:1100px;height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:1001;animation:kp-modal-in 0.25s ease; }
@keyframes kp-modal-in { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
.kp-detail-header { background:linear-gradient(135deg, var(--top-blue, #1e3a5f) 0%, #1a5570 100%);padding:24px 28px;position:relative; }
.kp-detail-header::after { content:'';position:absolute;bottom:0;left:0;width:100%;height:3px;background:var(--top-teal, #12b0a0); }
.kp-detail-header-top { display:flex;justify-content:space-between;align-items:flex-start;gap:16px; }
.kp-detail-header-info { flex:1;min-width:0; }
.kp-detail-obj-cat { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--top-teal, #12b0a0);margin-bottom:6px;display:block; }
.kp-detail-title { font-size:18px;font-weight:700;color:white;margin:0 0 6px;line-height:1.3; }
.kp-detail-obj-name { font-size:12px;color:rgba(255,255,255,0.65);margin:0;line-height:1.4; }
.kp-detail-header-actions { display:flex;align-items:center;gap:6px;flex-shrink:0; }
.kp-detail-action-btn { width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);cursor:pointer;transition:all 0.15s; }
.kp-detail-action-btn:hover { background:rgba(255,255,255,0.2);color:white; }
.kp-detail-action-del:hover { background:rgba(239,68,68,0.3);border-color:rgba(239,68,68,0.5);color:#fca5a5; }
.kp-detail-close { width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:none;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);cursor:pointer;transition:all 0.15s; }
.kp-detail-close:hover { background:rgba(255,255,255,0.2);color:white; }
.kp-detail-progress-row { display:flex;align-items:center;gap:12px;margin-top:16px; }
.kp-detail-progress-bar { flex:1;height:8px;background:rgba(255,255,255,0.15);border-radius:4px;overflow:hidden; }
.kp-detail-progress-fill { height:100%;border-radius:4px;transition:width 0.5s ease; }
.kp-detail-progress-label { font-size:16px;font-weight:800;color:white;min-width:48px;text-align:right; }
.kp-detail-body { flex:1;overflow-y:auto;padding:24px 28px; }
.kp-detail-meta-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px; }
.kp-detail-meta-card { display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px; }
.kp-detail-meta-icon { width:32px;height:32px;border-radius:8px;background:rgba(18,176,160,0.1);display:flex;align-items:center;justify-content:center;color:#12b0a0;flex-shrink:0; }
.kp-detail-meta-label { display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:2px; }
.kp-detail-meta-value { display:block;font-size:13px;font-weight:600;color:#1e293b;line-height:1.4; }
.kp-detail-section { margin-bottom:16px; }
.kp-detail-section-label { display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:8px; }
.kp-detail-dept-list { display:flex;flex-wrap:wrap;gap:6px; }
.kp-detail-dept { font-size:12px;font-weight:600;padding:4px 12px;background:rgba(30,58,95,0.06);color:#1e3a5f;border-radius:20px;border:1px solid rgba(30,58,95,0.1); }
.kp-detail-divider { height:1px;background:#e2e8f0;margin:20px 0; }

/* ===== EVIDENCE PANEL (used in detail modal) ===== */
.kp-ev-header { display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap; }
.kp-ev-title { font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px; }
.kp-ev-count { font-size:11px;color:#94a3b8;font-weight:500;flex:1; }
.kp-ev-add { display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#12b0a0;border:none;border-radius:8px;font-size:11px;font-weight:600;color:white;cursor:pointer;transition:background 0.15s; }
.kp-ev-add:hover { background:#0e8f82; }
.kp-ev-empty { display:flex;align-items:center;gap:8px;padding:16px;background:white;border:1px dashed #d1d5db;border-radius:10px;color:#94a3b8;font-size:12px; }
.kp-ev-list { display:flex;flex-direction:column;gap:6px; }
.kp-ev-item { background:white;border:1px solid #e8ecf1;border-radius:10px;padding:10px 12px;transition:border-color 0.15s; }
.kp-ev-item:hover { border-color:#cbd5e1; }
.kp-ev-item-top { display:flex;align-items:center;gap:6px;margin-bottom:4px; }
.kp-ev-date { display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#374151; }
.kp-ev-date svg { color:#94a3b8; }
.kp-ev-author { font-size:10px;color:#94a3b8; }
.kp-ev-del { margin-left:auto; }
.kp-ev-desc { font-size:12px;color:#475569;margin:0;line-height:1.5;white-space:pre-wrap; }
.kp-ev-attach { display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:11px;color:#3b82f6;text-decoration:none;padding:3px 8px;background:rgba(59,130,246,0.06);border-radius:6px;transition:background 0.15s; }
.kp-ev-attach:hover { background:rgba(59,130,246,0.12); }
.kp-ev-progress-badge { font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px; }
.kp-ev-mini-bar { height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin:6px 0; }
.kp-ev-mini-fill { height:100%;border-radius:2px;transition:width 0.3s ease; }

/* ===== EVIDENCE FORM PROGRESS ===== */
.kp-ev-progress-field { display:flex;align-items:center;gap:14px; }
.kp-ev-progress-field input[type="range"] { flex:1;height:8px;-webkit-appearance:none;appearance:none;border-radius:4px;background:linear-gradient(to right, var(--top-teal, #12b0a0) 0%, #e2e8f0 0%);outline:none;cursor:pointer; }
.kp-ev-progress-field input[type="range"]::-webkit-slider-thumb { -webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;border:3px solid var(--top-teal, #12b0a0);box-shadow:0 2px 6px rgba(0,0,0,0.15);cursor:pointer;transition:transform 0.15s; }
.kp-ev-progress-field input[type="range"]::-webkit-slider-thumb:hover { transform:scale(1.15); }
.kp-ev-progress-field input[type="range"]::-moz-range-thumb { width:22px;height:22px;border-radius:50%;background:white;border:3px solid var(--top-teal, #12b0a0);box-shadow:0 2px 6px rgba(0,0,0,0.15);cursor:pointer; }
.kp-ev-progress-val { font-size:18px;font-weight:800;color:var(--top-teal, #12b0a0);min-width:48px;text-align:right; }
.kp-ev-progress-hint { display:block;font-size:11px;color:#94a3b8;margin-top:4px; }

/* ===== UTILS ===== */
.kp-loading { text-align:center;padding:20px;color:#94a3b8;font-size:12px; }
@keyframes kp-pulse { 0%{box-shadow:0 0 0 0 rgba(18,176,160,0.4)} 50%{box-shadow:0 0 0 6px rgba(18,176,160,0.1)} 100%{box-shadow:0 0 0 0 rgba(18,176,160,0)} }
.kp-flash { animation:kp-pulse 0.6s ease-out 2; }
.kp-file-drop { display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:2px dashed #e2e8f0;border-radius:12px;cursor:pointer;background:#fafbfc;transition:all 0.15s;font-size:13px;color:#6b7280; }
.kp-file-drop:hover { border-color:#12b0a0;background:rgba(18,176,160,0.02); }
.widget-skeleton { background:white;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;overflow:hidden; }
.widget-skeleton::after { content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.03),transparent);animation:shimmer 1.5s infinite; }
@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

/* ===== MODAL SHARED ===== */
.sod-ind-row { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
.sod-freq-options { display:flex;flex-wrap:wrap;gap:8px; }
.sod-freq-chip { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;transition:all 0.15s;background:#fff; }
.sod-freq-chip:hover { border-color:#12b0a0;background:rgba(18,176,160,0.04); }
.sod-freq-chip-active { border-color:#12b0a0;background:rgba(18,176,160,0.08);color:#0e8f82;font-weight:600; }
.sod-freq-chip input { display:none; }
.sod-freq-chip-icon { font-size:10px;font-weight:700;background:rgba(18,176,160,0.12);color:#12b0a0;padding:2px 6px;border-radius:6px; }
.sod-freq-chip-none { color:#9ca3af;border-style:dashed; }
.sod-freq-chip-none.sod-freq-chip-active { border-color:#9ca3af;background:#f9fafb;color:#6b7280; }
.sod-freq-chip-none svg { opacity:0.6; }
.spinner-gio { display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin-gio 0.6s linear infinite; }
@keyframes spin-gio { to{transform:rotate(360deg)} }
.so-modal-dept-grid { display:flex;flex-wrap:wrap;gap:8px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb; }
.so-modal-dept-chip { display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:20px;background:white;font-size:13px;font-weight:500;color:#475569;cursor:pointer;user-select:none;transition:all 0.15s; }
.so-modal-dept-chip input[type="checkbox"] { display:none; }
.so-modal-dept-chip-check { display:none;color:#1e3a5f; }
.so-modal-dept-chip.active { border-color:#1e3a5f;background:rgba(30,58,95,0.06);color:#1e3a5f;font-weight:600; }
.so-modal-dept-chip.active .so-modal-dept-chip-check { display:block; }
        `;
        document.head.appendChild(s);
    }
};

export { KPIsPage };
window.KPIsPage = KPIsPage;
