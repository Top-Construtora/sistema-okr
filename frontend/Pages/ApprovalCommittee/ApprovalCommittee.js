import { AuthService } from '../../services/auth.js';
import { OKR } from '../../Entities/OKR.js';
import { Department } from '../../Entities/Department.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';
import { Modal } from '../../Components/Modal.js';

const ApprovalPage = {
    activeTab: 'pending',
    okrs: [],
    objectivesCache: {},
    currentDepartment: 'all',
    currentMiniCycle: 'all',
    departments: [],
    miniCycles: [],

    getUserDepartmentNames(user) {
        if (!user) return [];
        if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments.map(d => d.nome).filter(Boolean);
        }
        if (user.departamento?.nome) return [user.departamento.nome];
        return [];
    },

    columns: [
        { key: 'pending',     title: 'Aguardando Revisão',   icon: 'clock',       color: '#f59e0b' },
        { key: 'adjust',      title: 'Ajustes Solicitados',  icon: 'alert',       color: '#ef4444' },
        { key: 'approved',    title: 'Em Andamento',          icon: 'zap',         color: '#3b82f6' },
        { key: 'completed',   title: 'Concluídos',            icon: 'check',       color: '#10b981' },
        { key: 'homologated', title: 'Homologados',            icon: 'award',       color: '#8b5cf6' },
    ],

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="dashboard-gio"><div class="widget-skeleton" style="height:400px;"></div></div>`;

        this.addStyles();

        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && (currentUser.tipo === 'admin' || currentUser.tipo === 'consultor');
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);

        const [okrs, departments, miniCycles] = await Promise.all([
            OKR.getAll(),
            Department.getActive(),
            MiniCycle.getActive()
        ]);

        this.departments = departments;
        this.miniCycles = miniCycles;

        if (!isAdmin && userDepartmentNames.length > 0) {
            this.okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
        } else {
            this.okrs = okrs;
        }

        // Pre-fetch objectives
        this.objectivesCache = {};
        await Promise.all(this.okrs.map(async (okr) => {
            if (!this.objectivesCache[okr.id]) {
                this.objectivesCache[okr.id] = await okr.getObjective();
            }
        }));

        this.renderPage();
    },

    getFilteredOkrs() {
        let okrs = this.okrs;

        if (this.currentDepartment !== 'all') {
            okrs = okrs.filter(o => o.department === this.currentDepartment);
        }

        if (this.currentMiniCycle !== 'all') {
            const selected = Array.isArray(this.currentMiniCycle) ? this.currentMiniCycle : [this.currentMiniCycle];
            okrs = okrs.filter(o => selected.includes(o.mini_cycle_id));
        }

        return okrs;
    },

    getMiniCycleFilterLabel() {
        if (this.currentMiniCycle === 'all') return 'Todos os Miniciclos';
        const selected = Array.isArray(this.currentMiniCycle) ? this.currentMiniCycle : [this.currentMiniCycle];
        if (selected.length === 1) {
            const mc = this.miniCycles.find(m => m.id === selected[0]);
            return mc ? mc.nome : 'Miniciclo';
        }
        return `${selected.length} miniciclos`;
    },

    filterByDepartment(value) {
        this.currentDepartment = value;
        this.applyFilters();
    },

    toggleMiniCycleDropdown() {
        const dropdown = document.getElementById('ap-minicycle-dropdown');
        if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    },

    toggleAllMiniCycles(checked) {
        if (checked) {
            this.currentMiniCycle = 'all';
        } else {
            this.currentMiniCycle = [];
        }
        this.applyFilters();
    },

    toggleMiniCycleCheck(id, checked) {
        // When "all" is active, clicking a specific item selects ONLY that one
        if (this.currentMiniCycle === 'all') {
            this.currentMiniCycle = [id];
            this.applyFilters();
            return;
        }

        let selected = Array.isArray(this.currentMiniCycle) ? [...this.currentMiniCycle] : [this.currentMiniCycle];

        if (checked) {
            if (!selected.includes(id)) selected.push(id);
        } else {
            selected = selected.filter(s => s !== id);
        }

        this.currentMiniCycle = selected.length === this.miniCycles.length ? 'all' : selected;
        this.applyFilters();
    },

    applyFilters() {
        // Update tab counts without re-rendering the whole page (keeps dropdown open)
        const filtered = this.getFilteredOkrs();
        const counts = {};
        this.columns.forEach(c => { counts[c.key] = filtered.filter(o => o.status === c.key).length; });

        // Update counts in existing tabs
        document.querySelectorAll('.ap-tab').forEach(tab => {
            const status = tab.dataset.status;
            if (status && counts[status] !== undefined) {
                const countEl = tab.querySelector('.ap-tab-count');
                if (countEl) countEl.textContent = counts[status];
            }
        });

        // Update mini-cycle checkboxes state
        const container = document.getElementById('ap-minicycle-container');
        if (container) {
            const allCheckbox = container.querySelector('input[value="all"]');
            if (allCheckbox) allCheckbox.checked = this.currentMiniCycle === 'all';
            this.miniCycles.forEach(mc => {
                const cb = container.querySelector(`input[value="${mc.id}"]`);
                if (cb) cb.checked = this.currentMiniCycle === 'all' || (Array.isArray(this.currentMiniCycle) && this.currentMiniCycle.includes(mc.id));
            });
        }

        // Update toggle label
        const toggleSpan = container?.querySelector('.multiselect-toggle span');
        if (toggleSpan) toggleSpan.textContent = this.getMiniCycleFilterLabel();

        this.renderTable();
    },

    renderPage() {
        const content = document.getElementById('content');
        const filtered = this.getFilteredOkrs();
        const counts = {};
        this.columns.forEach(c => { counts[c.key] = filtered.filter(o => o.status === c.key).length; });

        content.innerHTML = `
            <div class="dashboard-gio">
                <div class="ap-toolbar">
                    <div class="ap-tabs">
                        ${this.columns.map(col => `
                            <button class="ap-tab ${this.activeTab === col.key ? 'ap-tab-active' : ''}"
                                    data-status="${col.key}"
                                    style="--tab-color: ${col.color}"
                                    onclick="ApprovalPage.switchTab('${col.key}')">
                                <span class="ap-tab-dot"></span>
                                <span class="ap-tab-label">${col.title}</span>
                                <span class="ap-tab-count">${counts[col.key]}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="ap-filter-group">
                        <div class="minicycle-multiselect" id="ap-minicycle-container">
                            <div class="multiselect-toggle" onclick="ApprovalPage.toggleMiniCycleDropdown()">
                                <span>${this.getMiniCycleFilterLabel()}</span>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                            <div class="multiselect-options" id="ap-minicycle-dropdown" style="display:none;">
                                <label class="multiselect-option">
                                    <input type="checkbox" value="all" onchange="ApprovalPage.toggleAllMiniCycles(this.checked)" ${this.currentMiniCycle === 'all' ? 'checked' : ''}>
                                    <span>Todos os Miniciclos</span>
                                </label>
                                ${this.miniCycles.map(mc => {
                                    const isChecked = this.currentMiniCycle === 'all' || (Array.isArray(this.currentMiniCycle) && this.currentMiniCycle.includes(mc.id));
                                    return `
                                    <label class="multiselect-option">
                                        <input type="checkbox" value="${mc.id}" onchange="ApprovalPage.toggleMiniCycleCheck('${mc.id}', this.checked)" ${isChecked ? 'checked' : ''}>
                                        <span>${mc.nome}</span>
                                    </label>`;
                                }).join('')}
                            </div>
                        </div>
                        <select class="form-control ap-dept-select" onchange="ApprovalPage.filterByDepartment(this.value)">
                            <option value="all" ${this.currentDepartment === 'all' ? 'selected' : ''}>Todos os Departamentos</option>
                            ${this.departments.map(dept => `
                                <option value="${dept.nome}" ${this.currentDepartment === dept.nome ? 'selected' : ''}>
                                    ${dept.nome}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div id="ap-table-area"></div>
            </div>
        `;

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#ap-minicycle-container')) {
                const dropdown = document.getElementById('ap-minicycle-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });

        this.renderTable();
    },

    renderTable() {
        const area = document.getElementById('ap-table-area');
        if (!area) return;

        const col = this.columns.find(c => c.key === this.activeTab);
        const filtered = this.getFilteredOkrs();
        const items = filtered.filter(o => o.status === this.activeTab);
        const currentUser = AuthService.getCurrentUser();
        const isConsultor = currentUser && currentUser.tipo === 'consultor';

        if (items.length === 0) {
            area.innerHTML = `
                <div class="ap-empty">
                    <div class="ap-empty-icon" style="color:${col.color}20;">
                        <svg width="36" height="36" fill="none" stroke="${col.color}" viewBox="0 0 24 24" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <p>Nenhum OKR em <strong>${col.title.toLowerCase()}</strong></p>
                </div>
            `;
            return;
        }

        // Group by department
        const grouped = {};
        items.forEach(okr => {
            const dept = okr.department || 'Sem departamento';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(okr);
        });

        const deptKeys = Object.keys(grouped).sort();

        area.innerHTML = deptKeys.map(dept => `
            <div class="ap-dept-group">
                <div class="ap-dept-header">
                    <span class="ap-dept-name">${dept}</span>
                    <span class="ap-dept-count">${grouped[dept].length}</span>
                </div>
                <div class="ap-list">
                    ${grouped[dept].map(okr => this.renderRow(okr, col, isConsultor)).join('')}
                </div>
            </div>
        `).join('');
    },

    renderRow(okr, col, isConsultor) {
        const objective = this.objectivesCache[okr.id];
        const objText = objective?.text
            ? (objective.text.length > 50 ? objective.text.substring(0, 50) + '...' : objective.text)
            : '';
        const p = okr.progress;
        const progressColor = p >= 70 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444';
        const actions = this.getActions(okr, col.key, isConsultor);

        return `
            <div class="ap-card">
                <div class="ap-card-left" style="--accent:${progressColor};">
                    <div class="ap-card-pct">${p}%</div>
                    <div class="ap-card-ring">
                        <svg viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" stroke-width="3"/>
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="${progressColor}" stroke-width="3"
                                stroke-dasharray="${p * 0.9745} 100"
                                stroke-linecap="round" transform="rotate(-90 18 18)"/>
                        </svg>
                    </div>
                </div>
                <div class="ap-card-body">
                    <div class="ap-card-title">${okr.title}</div>
                    <div class="ap-card-meta">
                        ${objText ? `<span class="ap-card-obj" title="${(objective?.text || '').replace(/"/g, '&quot;')}">
                            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                            ${objText}
                        </span>` : ''}
                        <span class="ap-card-krs">${okr.keyResults.length} KRs</span>
                    </div>
                    ${okr.committee_comment ? `
                        <div class="ap-card-comment">${okr.committee_comment}</div>
                    ` : ''}
                </div>
                <div class="ap-card-actions">
                    ${actions}
                </div>
            </div>
        `;
    },

    getActions(okr, currentStatus, isConsultor) {
        const adminActions = {
            pending:     [{ action: 'adjust', label: 'Ajuste', icon: 'edit', cls: 'danger' },
                          { action: 'approved', label: 'Aprovar', icon: 'check', cls: 'success' }],
            adjust:      [{ action: 'pending', label: 'Revisão', icon: 'arrow-left', cls: 'secondary' },
                          { action: 'approved', label: 'Aprovar', icon: 'check', cls: 'success' }],
            approved:    [{ action: 'completed', label: 'Concluir', icon: 'check-circle', cls: 'success' }],
            completed:   [{ action: 'homologated', label: 'Homologar', icon: 'award', cls: 'primary' }],
            homologated: []
        };
        const consultorActions = {
            pending: [{ action: 'adjust', label: 'Ajuste', icon: 'edit', cls: 'danger' }],
            adjust: [], approved: [], completed: [], homologated: []
        };

        const icons = {
            'edit':         '<path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            'check':        '<path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/>',
            'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            'arrow-left':   '<path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 19l-7-7 7-7"/>',
            'award':        '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>'
        };

        const list = isConsultor ? consultorActions : adminActions;
        const acts = list[currentStatus] || [];

        if (acts.length === 0) {
            return `<span class="ap-flow-done">
                <svg width="14" height="14" fill="none" stroke="#10b981" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ${isConsultor && currentStatus !== 'homologated' ? 'Somente visualização' : 'Finalizado'}
            </span>`;
        }

        return acts.map(a => `
            <button class="ap-action ap-action-${a.cls}" onclick="ApprovalPage.changeStatus('${okr.id}', '${a.action}')" title="${a.label}">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">${icons[a.icon]}</svg>
                <span>${a.label}</span>
            </button>
        `).join('');
    },

    switchTab(status) {
        this.activeTab = status;
        document.querySelectorAll('.ap-tab').forEach(t => t.classList.toggle('ap-tab-active', t.dataset.status === status));
        this.renderTable();
    },

    async changeStatus(okrId, newStatus) {
        const okr = await OKR.getById(okrId);
        if (!okr) return;

        let comment = '';
        if (newStatus === 'adjust') {
            comment = await Modal.prompt({
                title: 'Solicitar Ajustes',
                message: 'Descreva os ajustes necessários para este OKR.',
                placeholder: 'Ex: O Key Result 2 precisa ter uma meta mais desafiadora...',
                confirmLabel: 'Solicitar Ajuste',
                cancelLabel: 'Cancelar',
                required: true,
                maxLength: 500
            });
            if (!comment) return;
        }

        // Limpa comentário ao sair de "ajustes" (o comentário era referente àquele ciclo de revisão)
        if (okr.committee_comment && newStatus !== 'adjust') {
            comment = '';
        }

        await okr.changeStatus(newStatus, comment);
        await this.render();

        if (window.DepartmentsPage?.showToast) {
            DepartmentsPage.showToast('Status atualizado com sucesso!', 'success');
        }
    },

    addStyles() {
        if (document.getElementById('approval-styles-v3')) return;
        const style = document.createElement('style');
        style.id = 'approval-styles-v3';
        style.textContent = `
            /* === TOOLBAR (tabs + filters on same row) === */
            .ap-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .ap-tabs {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            .ap-filter-group {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-shrink: 0;
            }
            .ap-dept-select {
                min-width: 190px;
                padding: 7px 10px;
                border: 1.5px solid #e5e7eb;
                border-radius: 8px;
                font-size: 12.5px;
                color: #374151;
                background: white;
                cursor: pointer;
                height: 36px;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .ap-dept-select:hover {
                border-color: #d1d5db;
            }
            .ap-dept-select:focus {
                outline: none;
                border-color: #12b0a0;
                box-shadow: 0 0 0 3px rgba(18,176,160,0.1);
            }
            .ap-filter-group .minicycle-multiselect {
                position: relative;
                min-width: 180px;
            }
            .ap-filter-group .multiselect-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 7px 10px;
                background: white;
                border: 1.5px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12.5px;
                font-weight: 500;
                color: #374151;
                height: 36px;
                white-space: nowrap;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .ap-filter-group .multiselect-toggle:hover {
                border-color: #d1d5db;
            }
            .ap-filter-group .multiselect-options {
                position: absolute;
                top: calc(100% + 4px);
                right: 0;
                min-width: 240px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                z-index: 100;
                max-height: 260px;
                overflow-y: auto;
                padding: 4px 0;
            }
            .ap-filter-group .multiselect-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 14px;
                cursor: pointer;
                font-size: 13px;
                color: #374151;
                transition: background 0.15s;
                user-select: none;
            }
            .ap-filter-group .multiselect-option:hover {
                background: #f3f4f6;
            }
            .ap-filter-group .multiselect-option input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #12b0a0;
                cursor: pointer;
                flex-shrink: 0;
            }
            .ap-filter-group .multiselect-option span {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .ap-filter-group .multiselect-option:first-child {
                border-bottom: 1px solid #e5e7eb;
                margin-bottom: 2px;
                padding-bottom: 10px;
                font-weight: 600;
            }
            .ap-tab {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: white;
                border: 1.5px solid #e5e7eb;
                border-radius: 10px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                color: #6b7280;
                transition: all 0.15s;
                white-space: nowrap;
            }
            .ap-tab:hover { border-color: #d1d5db; background: #f9fafb; }
            .ap-tab-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                background: var(--tab-color);
                opacity: 0.4;
                transition: all 0.15s;
            }
            .ap-tab-label { font-weight: 600; }
            .ap-tab-count {
                font-size: 11px; font-weight: 700;
                padding: 2px 7px; border-radius: 10px;
                background: #f3f4f6; color: #6b7280;
                min-width: 20px; text-align: center;
            }
            .ap-tab-active {
                border-color: var(--tab-color);
                background: color-mix(in srgb, var(--tab-color) 6%, white);
                color: var(--tab-color);
            }
            .ap-tab-active .ap-tab-dot { opacity: 1; transform: scale(1.2); }
            .ap-tab-active .ap-tab-count { background: var(--tab-color); color: white; }

            /* === DEPARTMENT GROUP === */
            .ap-dept-group {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06);
                margin-bottom: 12px;
                overflow: hidden;
            }
            .ap-dept-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
            }
            .ap-dept-name {
                font-size: 12px; font-weight: 700; color: white;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .ap-dept-count {
                font-size: 11px; font-weight: 700; color: white;
                background: rgba(255,255,255,0.2);
                padding: 2px 8px; border-radius: 10px;
            }

            /* === CARD ROW === */
            .ap-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 12px 20px;
                border-bottom: 1px solid #f1f5f9;
                transition: background 0.1s;
            }
            .ap-card:last-child { border-bottom: none; }
            .ap-card:hover { background: #f8faff; }

            /* Ring progress */
            .ap-card-left {
                flex-shrink: 0;
                width: 48px; height: 48px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ap-card-ring {
                position: absolute; inset: 0;
            }
            .ap-card-ring svg { width: 100%; height: 100%; }
            .ap-card-pct {
                position: relative; z-index: 1;
                font-size: 12px; font-weight: 800;
                color: var(--accent);
            }

            /* Body */
            .ap-card-body { flex: 1; min-width: 0; }
            .ap-card-title {
                font-size: 13px; font-weight: 600; color: #1f2937;
                line-height: 1.4; margin-bottom: 3px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .ap-card-meta {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            .ap-card-obj {
                display: inline-flex; align-items: center; gap: 4px;
                font-size: 11px; color: #12b0a0;
                max-width: 280px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .ap-card-krs {
                font-size: 11px; color: #9ca3af; font-weight: 500;
                padding: 1px 7px;
                background: #f3f4f6; border-radius: 8px;
            }
            .ap-card-comment {
                font-size: 11px; color: #ef4444;
                margin-top: 4px; padding: 3px 8px;
                background: #fef2f2; border-radius: 6px;
                display: inline-block;
                max-width: 100%;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }

            /* Actions */
            .ap-card-actions {
                display: flex; gap: 6px; flex-shrink: 0;
            }
            .ap-action {
                display: inline-flex; align-items: center; gap: 5px;
                padding: 7px 14px; border: none; border-radius: 8px;
                font-size: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.15s;
                white-space: nowrap;
            }
            .ap-action-success { background: #ecfdf5; color: #059669; }
            .ap-action-success:hover { background: #10b981; color: white; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
            .ap-action-danger  { background: #fef2f2; color: #dc2626; }
            .ap-action-danger:hover { background: #ef4444; color: white; box-shadow: 0 2px 8px rgba(239,68,68,0.3); }
            .ap-action-secondary { background: #f3f4f6; color: #4b5563; }
            .ap-action-secondary:hover { background: #e5e7eb; }
            .ap-action-primary { background: rgba(18,176,160,0.1); color: #12b0a0; }
            .ap-action-primary:hover { background: #12b0a0; color: white; box-shadow: 0 2px 8px rgba(18,176,160,0.3); }

            .ap-flow-done {
                display: inline-flex; align-items: center; gap: 5px;
                font-size: 11px; color: #9ca3af;
            }

            /* === EMPTY === */
            .ap-empty {
                background: white; border-radius: 12px;
                padding: 60px 20px; text-align: center;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            }
            .ap-empty-icon {
                width: 64px; height: 64px; border-radius: 16px;
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 16px; background: currentColor;
            }
            .ap-empty p { font-size: 14px; color: #6b7280; margin: 0; }

            /* === RESPONSIVE === */
            @media (max-width: 900px) {
                .ap-card { flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
                .ap-card-actions { width: 100%; justify-content: flex-end; }
            }
            @media (max-width: 600px) {
                .ap-tabs { gap: 4px; }
                .ap-tab { padding: 8px 10px; font-size: 12px; }
                .ap-tab-label { display: none; }
                .ap-action span { display: none; }
                .ap-action { padding: 7px 9px; }
                .ap-filters { justify-content: stretch; }
                .ap-filter-group { width: 100%; }
                .ap-dept-select, .ap-filters .minicycle-multiselect { min-width: 0; flex: 1; }
            }
        `;
        document.head.appendChild(style);

        // Cleanup old styles
        ['approval-styles', 'approval-styles-v2', 'approval-styles-gio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
};

window.ApprovalPage = ApprovalPage;
export { ApprovalPage };
