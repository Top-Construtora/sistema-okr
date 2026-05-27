import { AuthService } from '../../services/auth.js';
import { OKR } from '../../Entities/OKR.js';
import { Department } from '../../Entities/Department.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';
import { OkrEditRequest } from '../../Entities/OkrEditRequest.js';
import { Modal } from '../../Components/Modal.js';
import { convertToProxyUrl, convertToDownloadUrl } from '../../services/supabase.js';

const ApprovalPage = {
    activeTab: 'pending',
    okrs: [],
    editRequests: [],
    objectivesCache: {},
    expandedOkrs: new Set(),
    currentDepartment: 'all',
    currentMiniCycle: 'all',
    departments: [],
    miniCycles: [],

    toggleOkrExpand(okrId) {
        if (this.expandedOkrs.has(okrId)) {
            this.expandedOkrs.delete(okrId);
        } else {
            this.expandedOkrs.add(okrId);
        }
        this.renderTable();
    },

    getUserDepartmentNames(user) {
        if (!user) return [];
        if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments.map(d => d.nome).filter(Boolean);
        }
        if (user.departamento?.nome) return [user.departamento.nome];
        return [];
    },

    columns: [
        { key: 'pending',       title: 'Aguardando Revisão',    icon: 'clock',  color: '#f59e0b' },
        { key: 'adjust',        title: 'Ajustes Solicitados',   icon: 'alert',  color: '#ef4444' },
        { key: 'approved',      title: 'Em Andamento',           icon: 'zap',    color: '#3b82f6' },
        { key: 'completed',     title: 'Concluídos',             icon: 'check',  color: '#10b981' },
        { key: 'homologated',   title: 'Homologados',             icon: 'award',  color: '#8b5cf6' },
        { key: 'edit_requests', title: 'Pedidos de Edição',      icon: 'lock',   color: '#0ea5e9' },
    ],

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="dashboard-gio"><div class="widget-skeleton" style="height:400px;"></div></div>`;

        this.addStyles();

        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && (currentUser.tipo === 'admin' || currentUser.tipo === 'consultor');
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);

        const [okrs, departments, miniCycles, editRequests] = await Promise.all([
            OKR.getAll(),
            Department.getActive(),
            MiniCycle.getActive(),
            OkrEditRequest.getPending()
        ]);

        this.editRequests = editRequests;

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
        if (selected.length === 0) return 'Selecione...';
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
        this.columns.forEach(c => {
            if (c.key === 'edit_requests') {
                counts[c.key] = (this.editRequests || []).length;
            } else {
                counts[c.key] = filtered.filter(o => o.status === c.key).length;
            }
        });

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
        this.columns.forEach(c => {
            if (c.key === 'edit_requests') {
                counts[c.key] = (this.editRequests || []).length;
            } else {
                counts[c.key] = filtered.filter(o => o.status === c.key).length;
            }
        });

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

        // Aba especial: pedidos de edição
        if (this.activeTab === 'edit_requests') {
            this.renderEditRequestsTable(area, col);
            return;
        }

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
        const isExpanded = this.expandedOkrs.has(okr.id);
        const responsibles = okr.getResponsibleUsers ? okr.getResponsibleUsers() : [];

        return `
            <div class="ap-card-wrapper">
                <div class="ap-card ${isExpanded ? 'ap-card-expanded' : ''}">
                    <button class="ap-expand-btn ${isExpanded ? 'expanded' : ''}" onclick="ApprovalPage.toggleOkrExpand('${okr.id}')" title="${isExpanded ? 'Recolher' : 'Expandir'}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
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
                    <div class="ap-card-body" onclick="ApprovalPage.toggleOkrExpand('${okr.id}')" style="cursor:pointer;">
                        <div class="ap-card-title">${okr.title}</div>
                        <div class="ap-card-meta">
                            ${objText ? `<span class="ap-card-obj" title="${(objective?.text || '').replace(/"/g, '&quot;')}">
                                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                                ${objText}
                            </span>` : ''}
                            <span class="ap-card-krs">${okr.keyResults.length} KRs</span>
                            ${responsibles.length > 0 ? `<span class="ap-card-krs">${responsibles.length} resp.</span>` : ''}
                        </div>
                        ${okr.committee_comment ? `
                            <div class="ap-card-comment">${okr.committee_comment}</div>
                        ` : ''}
                    </div>
                    <div class="ap-card-actions" onclick="event.stopPropagation();">
                        ${actions}
                    </div>
                </div>
                ${isExpanded ? this.renderExpandedDetails(okr) : ''}
            </div>
        `;
    },

    renderExpandedDetails(okr) {
        const responsibles = okr.getResponsibleUsers ? okr.getResponsibleUsers() : [];
        const krs = okr.keyResults || [];

        return `
            <div class="ap-card-details">
                ${responsibles.length > 0 ? `
                    <div class="ap-detail-section">
                        <div class="ap-detail-label">Responsáveis</div>
                        <div class="ap-resp-badges">
                            ${responsibles.map(u => `
                                <span class="ap-resp-badge${u.is_primary ? ' primary' : ''}" title="${this.escapeHtml(u.email || '')}">
                                    ${this.escapeHtml(u.nome || 'Usuário')}${u.is_primary ? ' ⭐' : ''}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="ap-detail-section">
                        <div class="ap-detail-label">Responsáveis</div>
                        <div class="ap-resp-empty">Nenhum responsável cadastrado — emails caem para o departamento.</div>
                    </div>
                `}
                <div class="ap-detail-section">
                    <div class="ap-detail-label">Key Results (${krs.length})</div>
                    ${krs.length === 0 ? `<div class="ap-resp-empty">Este OKR ainda não tem KRs.</div>` : ''}
                    <div class="ap-kr-list">
                        ${krs.map((kr, idx) => this.renderKrDetail(kr, idx)).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderKrDetail(kr, idx) {
        const krProgress = kr.progress || 0;
        const krColor = krProgress >= 70 ? '#10b981' : krProgress >= 40 ? '#f59e0b' : '#ef4444';
        const evidences = Array.isArray(kr.evidence) ? kr.evidence : [];
        return `
            <div class="ap-kr-item">
                <div class="ap-kr-header">
                    <span class="ap-kr-badge">KR${idx + 1}</span>
                    <span class="ap-kr-title">${this.escapeHtml(kr.title || 'Sem título')}</span>
                </div>
                <div class="ap-kr-meta">
                    <div class="ap-kr-bar">
                        <div class="ap-kr-bar-fill" style="width:${krProgress}%;background:${krColor};"></div>
                    </div>
                    <span class="ap-kr-pct" style="color:${krColor};">${krProgress}%</span>
                    ${kr.metric ? `<span class="ap-kr-metric">Métrica: ${this.escapeHtml(kr.metric)}</span>` : ''}
                    ${kr.target ? `<span class="ap-kr-metric">Meta: ${this.escapeHtml(String(kr.target))}</span>` : ''}
                </div>
                ${kr.comment && kr.comment.trim() ? `
                    <div class="ap-kr-comment">
                        <strong>Comentário:</strong> ${this.escapeHtml(kr.comment)}
                    </div>
                ` : ''}
                ${kr.committee_comment && kr.committee_comment.trim() ? `
                    <div class="ap-kr-adjust">
                        <strong>Ajuste solicitado:</strong> ${this.escapeHtml(kr.committee_comment)}
                    </div>
                ` : ''}
                ${evidences.length > 0 ? `
                    <div class="ap-kr-evidence-block">
                        <div class="ap-kr-evidence-header">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <span>Medições e Evidências (${evidences.length})</span>
                        </div>
                        <div class="ap-kr-evidence-list">
                            ${evidences.map(ev => this.renderEvidence(ev)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderEvidence(ev) {
        if (ev.type === 'text') {
            return `
                <div class="ap-evidence ap-evidence-text">
                    <span class="ap-evidence-badge">Texto</span>
                    <p>${this.escapeHtml(ev.content || '')}</p>
                </div>
            `;
        }
        const name = this.escapeHtml(ev.name || 'Arquivo');
        const proxyUrl = convertToProxyUrl(ev.content || '');
        const downloadUrl = convertToDownloadUrl(ev.content || '', ev.name || undefined);
        const sizeKb = ev.size ? ` · ${Math.round(ev.size / 1024)} KB` : '';
        return `
            <div class="ap-evidence ap-evidence-file">
                <span class="ap-evidence-badge file">Arquivo</span>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span class="ap-evidence-name">${name}${sizeKb}</span>
                <a href="${proxyUrl}" target="_blank" rel="noopener" class="ap-evidence-link" title="Visualizar">Ver</a>
                <a href="${downloadUrl}" download="${this.escapeHtml(ev.name || '')}" class="ap-evidence-link" title="Baixar">Baixar</a>
            </div>
        `;
    },

    getActions(okr, currentStatus, isConsultor) {
        const adminActions = {
            pending:     [{ action: 'adjust', label: 'Ajuste', icon: 'edit', cls: 'danger' },
                          { action: 'adjust_krs', label: 'Ajustar KRs', icon: 'edit-list', cls: 'warning' },
                          { action: 'approved', label: 'Aprovar', icon: 'check', cls: 'success' }],
            adjust:      [{ action: 'pending', label: 'Revisão', icon: 'arrow-left', cls: 'secondary' },
                          { action: 'adjust_krs', label: 'Ajustar KRs', icon: 'edit-list', cls: 'warning' },
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
            'edit-list':    '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5h6a2 2 0 012 2v2M9 5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-9-7h6m-6 4h6m-6 4h3M15 13l4-4m-4 4l4 4"/>',
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

    // ============== PEDIDOS DE EDICAO ==============

    renderEditRequestsTable(area, col) {
        const items = this.editRequests || [];
        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && currentUser.tipo === 'admin';

        if (items.length === 0) {
            area.innerHTML = `
                <div class="ap-empty">
                    <div class="ap-empty-icon" style="color:${col.color}20;">
                        <svg width="36" height="36" fill="none" stroke="${col.color}" viewBox="0 0 24 24" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <p>Nenhum pedido de edição pendente</p>
                </div>
            `;
            return;
        }

        area.innerHTML = `
            <div class="ap-list">
                ${items.map(req => this.renderEditRequestRow(req, isAdmin)).join('')}
            </div>
        `;
    },

    renderEditRequestRow(req, isAdmin) {
        const okrTitle = req.okr?.title || 'OKR';
        const okrDept = req.okr?.department || '';
        const okrStatus = req.okr?.status || '';
        const reqDate = req.created_at ? new Date(req.created_at).toLocaleDateString('pt-BR') : '';
        const reqTime = req.created_at ? new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        const statusLabels = {
            'pending': 'Pendente', 'adjust': 'Ajustes', 'approved': 'Em Andamento',
            'completed': 'Concluído', 'homologated': 'Homologado'
        };
        return `
            <div class="ap-card ap-edit-req-card" style="align-items:flex-start;">
                <div class="ap-card-left" style="--accent:#0ea5e9;background:#e0f2fe;">
                    <svg width="22" height="22" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                </div>
                <div class="ap-card-body" style="flex:1;">
                    <div class="ap-card-title">${okrTitle}</div>
                    <div class="ap-card-meta">
                        ${okrDept ? `<span class="ap-card-krs">${okrDept}</span>` : ''}
                        ${okrStatus ? `<span class="ap-card-krs">Status: ${statusLabels[okrStatus] || okrStatus}</span>` : ''}
                        <span class="ap-card-krs">Solicitado por <strong>${req.requester?.nome || 'Usuário'}</strong></span>
                        <span class="ap-card-krs">${reqDate} ${reqTime}</span>
                    </div>
                    <div class="ap-card-comment" style="margin-top:8px;">
                        <strong>Motivo:</strong> ${this.escapeHtml(req.reason || '')}
                    </div>
                </div>
                <div class="ap-card-actions" style="flex-direction:column;gap:6px;">
                    ${isAdmin ? `
                        <button class="ap-action ap-action-success" onclick="ApprovalPage.approveEditRequest('${req.id}')" title="Aprovar (libera edição por 7 dias)">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
                            <span>Aprovar</span>
                        </button>
                        <button class="ap-action ap-action-danger" onclick="ApprovalPage.rejectEditRequest('${req.id}')" title="Recusar">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            <span>Recusar</span>
                        </button>
                    ` : `<span class="ap-flow-done">Somente admin pode aprovar</span>`}
                </div>
            </div>
        `;
    },

    escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    },

    async approveEditRequest(requestId) {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.tipo !== 'admin') {
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Somente admin pode aprovar', 'error');
            return;
        }
        const comment = await Modal.prompt({
            title: 'Aprovar pedido de edição',
            subtitle: 'O usuário poderá editar medições e evidências por 7 dias.',
            placeholder: 'Ex: OK, atualize a evidência final.',
            hint: 'Comentário opcional',
            confirmLabel: 'Aprovar',
            cancelLabel: 'Cancelar',
            required: false,
            maxLength: 500,
            variant: 'primary',
            icon: 'check'
        });
        if (comment === null) return;
        try {
            const req = await OkrEditRequest.getById(requestId);
            if (!req) return;
            await req.approve(currentUser.id, comment || '');
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Solicitação aprovada', 'success');
            await this.render();
        } catch (err) {
            console.error(err);
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Erro ao aprovar', 'error');
        }
    },

    async rejectEditRequest(requestId) {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.tipo !== 'admin') {
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Somente admin pode recusar', 'error');
            return;
        }
        const comment = await Modal.prompt({
            title: 'Recusar pedido de edição',
            subtitle: 'Informe o motivo da recusa para o solicitante.',
            placeholder: 'Ex: Esse OKR já foi homologado em ciclo anterior...',
            confirmLabel: 'Recusar pedido',
            cancelLabel: 'Cancelar',
            required: true,
            maxLength: 500,
            variant: 'danger',
            icon: 'warning'
        });
        if (!comment) return;
        try {
            const req = await OkrEditRequest.getById(requestId);
            if (!req) return;
            await req.reject(currentUser.id, comment);
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Solicitação recusada', 'success');
            await this.render();
        } catch (err) {
            console.error(err);
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Erro ao recusar', 'error');
        }
    },

    // ============== AJUSTES EM KRs ESPECIFICOS ==============

    async openKRAdjustmentsModal(okrId) {
        const okr = await OKR.getById(okrId);
        if (!okr) {
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('OKR não encontrado', 'error');
            return;
        }
        const krs = okr.keyResults || [];
        if (krs.length === 0) {
            if (window.DepartmentsPage?.showToast) DepartmentsPage.showToast('Este OKR não tem KRs', 'error');
            return;
        }

        const existing = document.getElementById('kr-adjust-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'kr-adjust-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:9000;isolation:isolate;';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="ApprovalPage.closeKRAdjustmentsModal()"></div>
            <div class="modal-content" style="max-width:720px;max-height:90vh;">
                <div class="modal-header">
                    <div>
                        <h3>Ajustes em KRs específicos</h3>
                        <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted);font-weight:normal;">
                            Selecione um ou mais KRs que precisam de revisão.
                        </p>
                    </div>
                    <button class="modal-close" onclick="ApprovalPage.closeKRAdjustmentsModal()">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y:auto;">
                    <div class="kr-adjust-toolbar">
                        <span id="kr-adjust-counter" class="kr-adjust-counter">0 de ${krs.length} selecionados</span>
                        <button type="button" class="kr-adjust-toggle-all" id="kr-adjust-toggle-all" onclick="ApprovalPage.toggleAllKRAdjust()">Marcar todos</button>
                    </div>
                    <input type="hidden" id="kr-adjust-okr-id" value="${okr.id}">
                    <div class="kr-adjust-list">
                        ${krs.map((kr, idx) => `
                            <div class="kr-adjust-item" data-kr-id="${kr.id}">
                                <label class="kr-adjust-check">
                                    <input type="checkbox" name="kr-adjust-check" value="${kr.id}"
                                        onchange="ApprovalPage.onKRAdjustToggle(this)">
                                    <span class="kr-adjust-checkbox-visual">
                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                        </svg>
                                    </span>
                                    <span class="kr-adjust-badge">KR${idx + 1}</span>
                                    <span class="kr-adjust-text">${this.escapeHtml(kr.title || 'Sem título')}</span>
                                </label>
                                <div class="kr-adjust-comment-wrapper">
                                    <textarea class="form-control kr-adjust-comment" rows="3" maxlength="500"
                                        placeholder="Descreva o ajuste necessário neste KR..."
                                        oninput="ApprovalPage.onKRAdjustCommentInput(this)"
                                        data-kr-id="${kr.id}">${kr.committee_comment ? this.escapeHtml(kr.committee_comment) : ''}</textarea>
                                    <div class="kr-adjust-charcount" data-kr-id="${kr.id}">0/500</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div id="kr-adjust-error" class="kr-adjust-error">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <span id="kr-adjust-error-text"></span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="ApprovalPage.closeKRAdjustmentsModal()">Cancelar</button>
                    <button class="btn btn-primary" id="kr-adjust-submit-btn" onclick="ApprovalPage.submitKRAdjustments()" disabled>
                        Solicitar ajustes
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Inicializa contadores e estado
        modal.querySelectorAll('.kr-adjust-comment').forEach(ta => this.onKRAdjustCommentInput(ta));
    },

    onKRAdjustToggle(checkbox) {
        const item = checkbox.closest('.kr-adjust-item');
        const ta = item?.querySelector('.kr-adjust-comment');
        if (!ta) return;
        item.classList.toggle('kr-adjust-item-checked', checkbox.checked);
        if (checkbox.checked) setTimeout(() => ta.focus(), 200);
        this._updateKRAdjustState();
    },

    onKRAdjustCommentInput(ta) {
        const count = (ta.value || '').length;
        const counter = document.querySelector(`.kr-adjust-charcount[data-kr-id="${ta.dataset.krId}"]`);
        if (counter) {
            counter.textContent = `${count}/500`;
            counter.classList.toggle('warning', count > 450);
        }
    },

    toggleAllKRAdjust() {
        const checkboxes = document.querySelectorAll('input[name="kr-adjust-check"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const target = !allChecked;
        checkboxes.forEach(cb => {
            if (cb.checked !== target) {
                cb.checked = target;
                this.onKRAdjustToggle(cb);
            }
        });
    },

    _updateKRAdjustState() {
        const checkboxes = document.querySelectorAll('input[name="kr-adjust-check"]');
        const total = checkboxes.length;
        const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
        const counter = document.getElementById('kr-adjust-counter');
        if (counter) {
            counter.textContent = selected === 0
                ? `0 de ${total} selecionados`
                : `${selected} de ${total} selecionado${selected > 1 ? 's' : ''}`;
            counter.classList.toggle('active', selected > 0);
        }
        const submitBtn = document.getElementById('kr-adjust-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = selected === 0;
            submitBtn.textContent = selected === 0
                ? 'Solicitar ajustes'
                : `Solicitar ajustes (${selected})`;
        }
        const toggleBtn = document.getElementById('kr-adjust-toggle-all');
        if (toggleBtn) {
            toggleBtn.textContent = selected === total && total > 0 ? 'Desmarcar todos' : 'Marcar todos';
        }
    },

    closeKRAdjustmentsModal() {
        const m = document.getElementById('kr-adjust-modal');
        if (m) m.remove();
    },

    async submitKRAdjustments() {
        const okrId = document.getElementById('kr-adjust-okr-id')?.value;
        const errorDiv = document.getElementById('kr-adjust-error');
        const errorText = document.getElementById('kr-adjust-error-text');
        const btn = document.getElementById('kr-adjust-submit-btn');
        const showError = (msg) => {
            if (errorText) errorText.textContent = msg;
            if (errorDiv) errorDiv.classList.add('show');
        };
        if (errorDiv) errorDiv.classList.remove('show');

        const checked = Array.from(document.querySelectorAll('input[name="kr-adjust-check"]:checked'));
        if (checked.length === 0) {
            showError('Selecione ao menos um KR.');
            return;
        }

        const adjustments = [];
        for (const cb of checked) {
            const krId = cb.value;
            const ta = document.querySelector(`.kr-adjust-comment[data-kr-id="${krId}"]`);
            const comment = (ta?.value || '').trim();
            if (!comment) {
                showError('Descreva o ajuste para cada KR selecionado.');
                ta?.focus();
                return;
            }
            adjustments.push({ kr_id: krId, comment });
        }

        try {
            if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
            const okr = await OKR.getById(okrId);
            if (!okr) throw new Error('OKR não encontrado');
            await okr.requestKRAdjustments(adjustments);
            this.closeKRAdjustmentsModal();
            if (window.DepartmentsPage?.showToast) {
                DepartmentsPage.showToast(`Ajustes solicitados em ${adjustments.length} KR${adjustments.length > 1 ? 's' : ''}`, 'success');
            }
            await this.render();
        } catch (err) {
            console.error(err);
            showError(err.message || 'Erro ao solicitar ajustes.');
            if (btn) {
                btn.disabled = false;
                this._updateKRAdjustState();
            }
        }
    },

    async changeStatus(okrId, newStatus) {
        // Roteamento especial: ajustes em KRs específicos
        if (newStatus === 'adjust_krs') {
            return this.openKRAdjustmentsModal(okrId);
        }

        const okr = await OKR.getById(okrId);
        if (!okr) return;

        let comment = '';
        if (newStatus === 'adjust') {
            comment = await Modal.prompt({
                title: 'Solicitar ajustes neste OKR',
                subtitle: 'O OKR será movido para "Ajustes Solicitados" e o time será notificado.',
                placeholder: 'Ex: O Key Result 2 precisa ter uma meta mais desafiadora e prazo definido...',
                hint: 'Ctrl+Enter para enviar',
                confirmLabel: 'Solicitar ajuste',
                cancelLabel: 'Cancelar',
                required: true,
                maxLength: 500,
                variant: 'warning',
                icon: 'warning'
            });
            if (!comment) return;
        }

        // Limpa comentário ao sair de "ajustes" (o comentário era referente àquele ciclo de revisão)
        if (okr.committee_comment && newStatus !== 'adjust') {
            comment = '';
        }

        await okr.changeStatus(newStatus, comment);

        // Notifica colaboradores do departamento quando OKR vai para 'adjust'.
        // Best-effort: falhas não impedem a operação.
        if (newStatus === 'adjust') {
            try {
                const { supabaseClient } = await import('../../services/supabase.js');
                await supabaseClient.functions.invoke('notify-kr-adjustment', {
                    body: { okr_id: okrId }
                });
            } catch (e) {
                console.warn('notify-kr-adjustment não disponível:', e);
            }
        }

        await this.render();

        if (window.DepartmentsPage?.showToast) {
            DepartmentsPage.showToast('Status atualizado com sucesso!', 'success');
        }
    },

    addStyles() {
        if (document.getElementById('approval-styles-v6')) return;
        const style = document.createElement('style');
        style.id = 'approval-styles-v6';
        style.textContent = `
            /* === TOOLBAR (tabs + filters on same row) === */
            .ap-toolbar {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            .ap-tabs {
                display: flex;
                gap: 5px;
                flex: 1;
                min-width: 0;
                flex-wrap: wrap;
            }
            .ap-filter-group {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-shrink: 0;
            }
            .ap-dept-select {
                width: 170px;
                padding: 6px 8px;
                border: 1.5px solid #e5e7eb;
                border-radius: 8px;
                font-size: 12px;
                color: #374151;
                background: white;
                cursor: pointer;
                height: 34px;
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
                width: 160px;
            }
            .ap-filter-group .multiselect-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                padding: 6px 8px;
                background: white;
                border: 1.5px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                color: #374151;
                height: 34px;
                white-space: nowrap;
                overflow: hidden;
                transition: border-color 0.15s, box-shadow 0.15s;
            }
            .ap-filter-group .multiselect-toggle:hover {
                border-color: #d1d5db;
            }
            .ap-filter-group .multiselect-options {
                position: absolute;
                top: calc(100% + 4px);
                right: 0;
                min-width: 220px;
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
                gap: 6px;
                padding: 8px 12px;
                background: white;
                border: 1.5px solid #e5e7eb;
                border-radius: 10px;
                cursor: pointer;
                font-size: 12px;
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

            /* Expand button + container */
            .ap-card-wrapper {
                display: block;
                margin-bottom: 8px;
                border-radius: 10px;
                overflow: hidden;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .ap-card-wrapper .ap-card { margin-bottom: 0; box-shadow: none; }
            .ap-card-wrapper .ap-card.ap-card-expanded { border-bottom: 1px solid #e5e7eb; border-radius: 10px 10px 0 0; }
            .ap-expand-btn {
                background: transparent;
                border: none;
                padding: 6px;
                margin: 0 4px 0 -4px;
                cursor: pointer;
                color: #6b7280;
                border-radius: 6px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s ease, background 0.15s;
                align-self: center;
            }
            .ap-expand-btn:hover { background: #f3f4f6; color: #111827; }
            .ap-expand-btn.expanded { transform: rotate(90deg); }

            /* Expanded details */
            .ap-card-details {
                background: #f9fafb;
                padding: 16px 18px;
                border-radius: 0 0 10px 10px;
                animation: ap-expand 0.18s ease-out;
            }
            @keyframes ap-expand {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ap-detail-section { margin-bottom: 14px; }
            .ap-detail-section:last-child { margin-bottom: 0; }
            .ap-detail-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin-bottom: 8px;
            }
            .ap-resp-badges { display: flex; flex-wrap: wrap; gap: 6px; }
            .ap-resp-badge {
                display: inline-flex; align-items: center;
                padding: 4px 10px;
                border-radius: 999px;
                background: #e0f2fe;
                color: #075985;
                font-size: 12px;
                font-weight: 500;
            }
            .ap-resp-badge.primary { background: #fef3c7; color: #92400e; }
            .ap-resp-empty {
                font-size: 12px; color: #9ca3af; font-style: italic;
            }
            .ap-kr-list { display: flex; flex-direction: column; gap: 16px; }
            .ap-kr-item {
                background: white;
                border: 1.5px solid #e5e7eb;
                border-radius: 12px;
                padding: 0;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                transition: box-shadow 0.15s;
            }
            .ap-kr-item:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            }
            .ap-kr-header {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 14px 16px 12px;
                background: linear-gradient(to bottom, #ffffff, #fafafa);
                border-bottom: 1px solid #f3f4f6;
            }
            .ap-kr-badge {
                background: #0f766e;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 5px;
                letter-spacing: 0.4px;
                flex-shrink: 0;
                margin-top: 1px;
            }
            .ap-kr-title { font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; line-height: 1.4; }
            .ap-kr-meta {
                display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                font-size: 11px; color: #6b7280;
                padding: 12px 16px;
                background: #fafafa;
                border-bottom: 1px solid #f3f4f6;
            }
            .ap-kr-bar {
                width: 100px; height: 7px; background: #e5e7eb;
                border-radius: 4px; overflow: hidden;
            }
            .ap-kr-bar-fill { height: 100%; transition: width 0.3s; border-radius: 4px; }
            .ap-kr-pct { font-weight: 700; font-size: 13px; }
            .ap-kr-metric {
                padding: 3px 10px;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 5px;
                font-size: 11px;
                color: #374151;
            }
            .ap-kr-comment {
                margin: 0;
                padding: 12px 16px;
                background: #f9fafb;
                border-bottom: 1px solid #f3f4f6;
                font-size: 13px;
                color: #374151;
                line-height: 1.5;
            }
            .ap-kr-comment strong { color: #1f2937; }
            .ap-kr-adjust {
                margin: 0;
                padding: 12px 16px;
                background: #fef2f2;
                border-left: 4px solid #dc2626;
                border-bottom: 1px solid #fee2e2;
                font-size: 13px;
                color: #991b1b;
                line-height: 1.5;
            }
            .ap-kr-adjust strong { color: #7f1d1d; }
            .ap-kr-item > *:last-child { border-bottom: none !important; }

            /* Evidências */
            .ap-kr-evidence-block {
                margin: 0;
                padding: 14px 16px;
                background: #ffffff;
            }
            .ap-kr-evidence-header {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                color: #6b7280;
                margin-bottom: 8px;
            }
            .ap-kr-evidence-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .ap-evidence {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 10px;
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                font-size: 12px;
            }
            .ap-evidence-text { align-items: flex-start; }
            .ap-evidence-text p {
                margin: 0;
                color: #374151;
                white-space: pre-wrap;
                flex: 1;
            }
            .ap-evidence-badge {
                display: inline-block;
                padding: 2px 6px;
                background: #dbeafe;
                color: #1e40af;
                font-size: 10px;
                font-weight: 700;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                flex-shrink: 0;
            }
            .ap-evidence-badge.file { background: #fef3c7; color: #92400e; }
            .ap-evidence-name {
                flex: 1;
                color: #374151;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .ap-evidence-link {
                padding: 4px 10px;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 5px;
                color: #0f766e;
                font-size: 11px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.15s;
            }
            .ap-evidence-link:hover {
                background: #0f766e;
                color: white;
                border-color: #0f766e;
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
            .ap-action-warning { background: #fef3c7; color: #92400e; }
            .ap-action-warning:hover { background: #f59e0b; color: white; box-shadow: 0 2px 8px rgba(245,158,11,0.3); }

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
