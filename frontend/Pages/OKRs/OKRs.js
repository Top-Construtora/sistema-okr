import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { AuthService } from '../../services/auth.js';
import { ExportService } from '../../services/export.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
import { Department } from '../../Entities/Department.js';
import { Initiative } from '../../Entities/Initiative.js';
import { User } from '../../Entities/User.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';

// Importa uid diretamente se necessário
const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
// Página de OKRs - Gestão Completa
const OKRsPage = {
    currentFilter: 'all',
    currentDepartment: 'all',
    currentMiniCycle: 'all',
    currentOKR: null,
    expandedOKRs: new Set(),
    expandedKRs: new Set(),
    currentInitiative: null,

    // Retorna array de nomes de departamentos do usuário
    getUserDepartmentNames(user) {
        if (!user) return [];

        // Se tem array de departments (nova estrutura)
        if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments.map(d => d.nome).filter(Boolean);
        }

        // Fallback para departamento único (legado)
        if (user.departamento?.nome) {
            return [user.departamento.nome];
        }

        return [];
    },

    async render() {
        const content = document.getElementById('content');
        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && currentUser.tipo === 'admin';
        const isConsultor = currentUser && currentUser.tipo === 'consultor';
        const canEdit = !isConsultor; // Consultor não pode editar

        // Suporta múltiplos departamentos
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);
        const userDepartmentDisplay = userDepartmentNames.length > 1
            ? `${userDepartmentNames.length} departamentos`
            : userDepartmentNames[0] || null;

        // Se for colaborador, força o filtro pelo departamento do usuário
        if (!isAdmin && userDepartmentNames.length > 0) {
            this.currentDepartment = 'user-depts'; // Marcador especial para múltiplos depts
        }

        let okrs = await OKR.getAll();
        const departments = await Department.getActive();
        const miniCycles = await MiniCycle.getActive();

        // Se for colaborador, filtra OKRs dos seus departamentos
        if (!isAdmin && userDepartmentNames.length > 0) {
            okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
        }

        content.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Gestão de OKRs</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${okrs.length} ${okrs.length === 1 ? 'OKR cadastrado' : "OKR's cadastrados"}${!isAdmin && userDepartmentDisplay ? ` - ${userDepartmentDisplay}` : ''}</p>
                </div>
                <div style="display:flex;gap:12px;">
                    ${canEdit ? `
                    <button class="btn btn-primary" onclick="OKRsPage.openModal()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo OKR
                    </button>
                    ` : ''}

                    <button class="btn btn-secondary" onclick="OKRsPage.exportToPDF()" title="Exportar para PDF">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        Exportar PDF
                    </button>
                </div>
            </div>

            <div style="display:flex;gap:16px;margin-bottom:24px;align-items:center;flex-wrap:wrap;">
                <div class="okr-filters">
                    <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="OKRsPage.filter('all', this)">
                        Todos (${okrs.length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'pending' ? 'active' : ''}" onclick="OKRsPage.filter('pending', this)">
                        Pendentes (${okrs.filter(o => o.status === 'pending').length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'approved' ? 'active' : ''}" onclick="OKRsPage.filter('approved', this)">
                        Em Andamento (${okrs.filter(o => o.status === 'approved').length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'completed' ? 'active' : ''}" onclick="OKRsPage.filter('completed', this)">
                        Concluídos (${okrs.filter(o => o.status === 'completed' || o.status === 'homologated').length})
                    </button>
                </div>

                <div style="margin-left:auto;display:flex;gap:12px;">
                    <select id="minicycle-filter" class="form-control" onchange="OKRsPage.filterByMiniCycle(this.value)" style="min-width:180px;">
                        <option value="all" ${this.currentMiniCycle === 'all' ? 'selected' : ''}>Todos os Miniciclos</option>
                        ${miniCycles.map(mc => `
                            <option value="${mc.id}" ${this.currentMiniCycle === mc.id ? 'selected' : ''}>
                                ${mc.nome}
                            </option>
                        `).join('')}
                    </select>
                    ${isAdmin ? `
                    <select id="dept-filter" class="form-control" onchange="OKRsPage.filterByDepartment(this.value)" style="min-width:200px;">
                        <option value="all">Todos os Departamentos</option>
                        ${departments.map(dept => `
                            <option value="${dept.nome}" ${this.currentDepartment === dept.nome ? 'selected' : ''}>
                                ${dept.nome}
                            </option>
                        `).join('')}
                    </select>
                    ` : ''}
                </div>
            </div>

            <div id="okrs-list"></div>
            <div id="okr-modal" style="display:none;"></div>
        `;

        // Fecha menus ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-menu')) {
                this.closeAllMenus();
            }
        });

        await this.renderList();
        this.addStyles();
    },

    async renderList() {
        const container = document.getElementById('okrs-list');
        if (!container) {
            console.warn('Container okrs-list não encontrado');
            return;
        }

        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && currentUser.tipo === 'admin';
        const isConsultor = currentUser && currentUser.tipo === 'consultor';
        const canEdit = !isConsultor; // Consultor não pode editar
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);

        let okrs = await OKR.getAll();

        // Se for colaborador, filtra OKRs dos seus departamentos
        if (!isAdmin && userDepartmentNames.length > 0) {
            okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
        }

        // Filtro por status
        if (this.currentFilter === 'pending') {
            okrs = okrs.filter(o => o.status === 'pending');
        } else if (this.currentFilter === 'approved') {
            okrs = okrs.filter(o => o.status === 'approved');
        } else if (this.currentFilter === 'completed') {
            okrs = okrs.filter(o => o.status === 'completed' || o.status === 'homologated');
        }

        // Filtro por departamento (apenas admin pode filtrar por outros departamentos)
        if (isAdmin && this.currentDepartment !== 'all') {
            okrs = okrs.filter(o => o.department === this.currentDepartment);
        }

        // Filtro por miniciclo
        if (this.currentMiniCycle !== 'all') {
            okrs = okrs.filter(o => o.mini_cycle_id === this.currentMiniCycle);
        }

        if (okrs.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum OKR encontrado</p>
                        ${canEdit ? `
                        <button class="btn btn-primary" onclick="OKRsPage.openModal()">
                            Criar primeiro OKR
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
            return;
        }

        // Se estiver mostrando todos os departamentos, agrupa por departamento com separador
        if (this.currentDepartment === 'all') {
            // Agrupa OKRs por departamento
            const okrsByDept = {};
            okrs.forEach(okr => {
                const dept = okr.department || 'Sem Departamento';
                if (!okrsByDept[dept]) {
                    okrsByDept[dept] = [];
                }
                okrsByDept[dept].push(okr);
            });

            // Ordena departamentos alfabeticamente
            const sortedDepts = Object.keys(okrsByDept).sort();

            let htmlParts = [];

            for (let i = 0; i < sortedDepts.length; i++) {
                const dept = sortedDepts[i];
                const deptOkrs = okrsByDept[dept];

                // Adiciona separador antes de cada departamento (exceto o primeiro)
                if (i > 0) {
                    htmlParts.push(`<div class="department-separator"><span class="dept-name">${dept}</span></div>`);
                } else {
                    htmlParts.push(`<div class="department-separator first"><span class="dept-name">${dept}</span></div>`);
                }

                // Renderiza os OKRs deste departamento (contagem reinicia para cada dept)
                const deptCardsHTML = await Promise.all(
                    deptOkrs.map((okr, deptIndex) => this.renderOKRCard(okr, deptIndex, canEdit))
                );
                htmlParts.push(...deptCardsHTML);
            }

            container.innerHTML = htmlParts.join('');
        } else {
            const cardsHTML = await Promise.all(okrs.map((okr, idx) => this.renderOKRCard(okr, idx, canEdit)));
            container.innerHTML = cardsHTML.join('');
        }
    },

    async renderOKRCard(okr, index, canEdit = true) {
        const objective = await okr.getObjective();
        const miniCycle = okr.mini_cycle_id ? await MiniCycle.getById(okr.mini_cycle_id) : null;
        const isOKRExpanded = this.expandedOKRs.has(okr.id);
        const okrIdentifier = `O${index + 1}`;

        // Configuração de status do OKR
        const okrStatusConfig = {
            'pending': { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '⏳' },
            'adjust': { label: 'Ajustes Solicitados', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '⚠️' },
            'approved': { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '▶️' },
            'completed': { label: 'Concluído', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '✅' },
            'homologated': { label: 'Homologado', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: '🏆' }
        };
        const statusInfo = okrStatusConfig[okr.status] || okrStatusConfig['pending'];

        return `
            <div class="okr-accordion-card ${okr.status === 'adjust' ? 'okr-needs-adjustment' : ''}">
                ${okr.status === 'adjust' && okr.committee_comment ? `
                    <div class="okr-adjustment-banner">
                        <div class="adjustment-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                        <div class="adjustment-content">
                            <strong>Ajustes Solicitados pelo Comitê:</strong>
                            <p>${okr.committee_comment}</p>
                        </div>
                    </div>
                ` : ''}
                <div class="okr-accordion-header" onclick="OKRsPage.toggleOKRExpand('${okr.id}')">
                    <div class="okr-header-left">
                        <button class="expand-arrow ${isOKRExpanded ? 'expanded' : ''}">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
                        <div class="okr-info-wrapper">
                            <div class="okr-main-line">
                                <span class="okr-identifier">${okrIdentifier}</span>
                                <h3 class="okr-title-header">O: ${okr.title}</h3>
                                <span class="okr-status-badge" style="background:${statusInfo.bg};color:${statusInfo.color};">
                                    ${statusInfo.label}
                                </span>
                                <span class="kr-count">${okr.keyResults.length} KRs</span>
                            </div>
                            <div class="okr-meta-line">
                                <span class="okr-department">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                    </svg>
                                    ${okr.department}
                                </span>
                                <span class="okr-separator">•</span>
                                <span class="okr-objective">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                                    </svg>
                                    ${objective ? objective.text : 'N/A'}
                                </span>
                                <span class="okr-separator">•</span>
                                <span class="okr-minicycle" style="color:${miniCycle ? '#fff' : 'var(--danger)'};">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    ${miniCycle ? miniCycle.nome : 'Sem miniciclo'}
                                </span>
                            </div>
                            <div class="okr-progress-line">
                                <div class="okr-progress-bar-header">
                                    <div class="okr-progress-fill" style="width: ${okr.progress || 0}%"></div>
                                </div>
                                <span class="okr-progress-text">${okr.progress || 0}%</span>
                            </div>
                        </div>
                    </div>
                    ${canEdit ? `
                    <div class="okr-header-right" onclick="event.stopPropagation();">
                        <div class="action-menu">
                            <button class="action-menu-btn-header" onclick="OKRsPage.toggleOKRMenu(event, '${okr.id}')" title="Ações">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                </svg>
                            </button>
                            <div class="action-menu-dropdown" id="okr-menu-${okr.id}">
                                <button class="menu-item" onclick="OKRsPage.edit('${okr.id}'); OKRsPage.closeAllMenus();">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar
                                </button>
                                <button class="menu-item danger" onclick="OKRsPage.delete('${okr.id}'); OKRsPage.closeAllMenus();">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="okr-accordion-body ${isOKRExpanded ? 'expanded' : ''}" data-okr-id="${okr.id}">
                    <div class="krs-section">
                        <div class="krs-section-header">
                            <div class="section-title">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                </svg>
                                KR's
                            </div>
                            ${canEdit ? `
                            <button class="btn btn-sm btn-secondary" onclick="OKRsPage.addKR('${okr.id}')">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Novo KR
                            </button>
                            ` : ''}
                        </div>

                        <div class="kr-accordion-list">
                            ${okr.keyResults.length === 0 ? `
                                <div class="empty-krs">
                                    <p style="color:var(--text-muted);font-size:14px;margin:0;">Nenhum Key Result cadastrado ainda</p>
                                    ${canEdit ? `
                                    <button class="btn btn-sm btn-primary" onclick="OKRsPage.addKR('${okr.id}')" style="margin-top:12px;">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                        </svg>
                                        Adicionar Primeiro KR
                                    </button>
                                    ` : ''}
                                </div>
                            ` : await Promise.all(okr.keyResults.map(async (kr, idx) => {
                                const initiatives = await Initiative.getByKeyResultId(kr.id);
                                const isKRExpanded = this.expandedKRs.has(kr.id);
                                const krStatus = kr.status || 'pending';
                                const krStatusConfig = {
                                    'pending': { label: 'PENDENTE', color: '#f59e0b', bg: '#fffbeb' },
                                    'in_progress': { label: 'EM PROGRESSO', color: '#3b82f6', bg: '#eff6ff' },
                                    'completed': { label: 'CONCLUÍDO', color: '#10b981', bg: '#f0fdf4' }
                                };
                                const statusInfo = krStatusConfig[krStatus] || krStatusConfig['pending'];

                                return `
                                <div class="kr-accordion-item">
                                    <div class="kr-accordion-header" onclick="OKRsPage.toggleKRExpand('${kr.id}')">
                                        <div class="kr-header-left">
                                            <button class="expand-arrow-sm ${isKRExpanded ? 'expanded' : ''}">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                </svg>
                                            </button>
                                            <div class="kr-info-section">
                                                <div class="kr-title-line">
                                                    <span class="kr-badge">KR${idx + 1}</span>
                                                    <span class="kr-title-text">${kr.title}</span>
                                                </div>
                                                <div class="kr-progress-line-header">
                                                    <div class="kr-progress-bar-small">
                                                        <div class="kr-progress-fill-small" style="width: ${kr.progress || 0}%"></div>
                                                    </div>
                                                    <span class="kr-progress-text-small">${kr.progress || 0}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="kr-header-right" onclick="event.stopPropagation();">
                                            <span class="kr-status-badge" style="background:${statusInfo.bg};color:${statusInfo.color};">
                                                ${statusInfo.label}
                                            </span>
                                            ${canEdit ? `
                                            <div class="action-menu">
                                                <button class="action-menu-btn" onclick="OKRsPage.toggleKRMenu(event, '${kr.id}')" title="Ações">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                    </svg>
                                                </button>
                                                <div class="action-menu-dropdown" id="kr-menu-${kr.id}">
                                                    <button class="menu-item" onclick="OKRsPage.editKR('${okr.id}', '${kr.id}'); OKRsPage.closeAllMenus();">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                        </svg>
                                                        Editar
                                                    </button>
                                                    <button class="menu-item danger" onclick="OKRsPage.deleteKR('${okr.id}', '${kr.id}'); OKRsPage.closeAllMenus();">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>

                                    <div class="kr-accordion-body ${isKRExpanded ? 'expanded' : ''}" data-kr-id="${kr.id}">
                                        <div class="kr-body-content">
                                            <!-- Comentário e Medições/Evidências lado a lado -->
                                            <div class="kr-top-row">
                                                <!-- Seção de Comentário -->
                                                <div class="kr-detail-section">
                                                    <div class="kr-detail-header">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                                        </svg>
                                                        <span>Comentário</span>
                                                        ${canEdit ? `
                                                        <button class="btn btn-xs btn-outline" onclick="OKRsPage.openQuickCommentEditor('${okr.id}', '${kr.id}')" style="margin-left:auto;" title="${kr.comment && kr.comment.trim() ? 'Editar' : 'Adicionar'} comentário">
                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${kr.comment && kr.comment.trim() ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' : 'M12 4v16m8-8H4'}"/>
                                                            </svg>
                                                            ${kr.comment && kr.comment.trim() ? 'Editar' : 'Adicionar'}
                                                        </button>
                                                        ` : ''}
                                                    </div>
                                                    <div class="kr-detail-body" id="kr-comment-body-${kr.id}">
                                                        ${kr.comment && kr.comment.trim()
                                                            ? `<p class="kr-comment-text">${kr.comment}</p>`
                                                            : `<p class="kr-empty-text">Nenhum comentário adicionado</p>`
                                                        }
                                                    </div>
                                                </div>

                                                <!-- Seção de Medições e Evidências -->
                                                <div class="kr-detail-section">
                                                    <div class="kr-detail-header">
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                        </svg>
                                                        <span>Medições e Evidências</span>
                                                        ${kr.evidence && Array.isArray(kr.evidence) && kr.evidence.length > 0
                                                            ? `<span class="kr-count-badge">${kr.evidence.length}</span>`
                                                            : ''
                                                        }
                                                        ${canEdit ? `
                                                        <button class="btn btn-xs btn-outline" onclick="OKRsPage.openQuickEvidenceModal('${okr.id}', '${kr.id}')" style="margin-left:auto;" title="Adicionar evidência">
                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                                            </svg>
                                                            Adicionar
                                                        </button>
                                                        ` : ''}
                                                    </div>
                                                    <div class="kr-detail-body" id="kr-evidence-body-${kr.id}">
                                                        ${kr.evidence && Array.isArray(kr.evidence) && kr.evidence.length > 0 ? `
                                                            <div class="kr-evidence-list">
                                                                ${kr.evidence.map((ev, idx) => `
                                                                    <div class="kr-evidence-item ${ev.type}">
                                                                        ${ev.type === 'text'
                                                                            ? `<p class="kr-evidence-text">${ev.content}</p>`
                                                                            : `<div class="kr-evidence-file">
                                                                                <div class="file-icon">
                                                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                                                    </svg>
                                                                                </div>
                                                                                <div class="file-info">
                                                                                    <a href="${ev.content}" target="_blank" rel="noopener noreferrer" class="file-download-link">
                                                                                        ${ev.name || 'Arquivo'}
                                                                                    </a>
                                                                                    ${ev.size ? `<span class="file-size-display">${this.formatFileSize(ev.size)}</span>` : ''}
                                                                                </div>
                                                                                <a href="${ev.content}" download class="btn btn-xs btn-secondary" title="Baixar">
                                                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                                                                    </svg>
                                                                                </a>
                                                                            </div>`
                                                                        }
                                                                    </div>
                                                                    ${idx < kr.evidence.length - 1 ? '<div class="kr-evidence-divider"></div>' : ''}
                                                                `).join('')}
                                                            </div>
                                                        ` : `
                                                            <p class="kr-empty-text">Nenhuma evidência adicionada</p>
                                                        `}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Seção de Iniciativas -->
                                            <div class="kr-detail-section">
                                                <div class="kr-detail-header">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                                    </svg>
                                                    <span>Iniciativas</span>
                                                    ${initiatives.length > 0
                                                        ? `<span class="kr-count-badge">${initiatives.length}</span>`
                                                        : ''
                                                    }
                                                    ${canEdit ? `
                                                    <button class="btn btn-xs btn-primary" onclick="OKRsPage.openInitiativeModal('${kr.id}')" style="margin-left:auto;">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                                        </svg>
                                                        Nova
                                                    </button>
                                                    ` : ''}
                                                </div>
                                                <div class="kr-detail-body">
                                                    ${initiatives.length === 0 ? `
                                                        <p class="kr-empty-text">Nenhuma iniciativa cadastrada</p>
                                                    ` : `
                                                        <div class="initiatives-list">
                                                            ${initiatives.map(init => `
                                                                <div class="initiative-item ${init.concluida ? 'completed' : ''} ${init.isOverdue() ? 'overdue' : ''}">
                                                                    ${canEdit ? `
                                                                    <label class="initiative-checkbox">
                                                                        <input type="checkbox" ${init.concluida ? 'checked' : ''}
                                                                            onchange="OKRsPage.toggleInitiative('${init.id}')">
                                                                        <span class="checkmark"></span>
                                                                    </label>
                                                                    ` : `
                                                                    <div class="initiative-status-icon">
                                                                        ${init.concluida
                                                                            ? '<svg width="16" height="16" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                                                                            : '<svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>'
                                                                        }
                                                                    </div>
                                                                    `}
                                                                    <div class="initiative-content">
                                                                        <div class="initiative-header-row">
                                                                            <div class="initiative-name">${init.nome}</div>
                                                                            <div class="initiative-progress-inline">
                                                                                ${canEdit ? `
                                                                                <input
                                                                                    type="range"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value="${init.progress || 0}"
                                                                                    class="initiative-progress-slider-inline"
                                                                                    id="slider-${init.id}"
                                                                                    style="background: linear-gradient(to right, var(--top-teal) ${init.progress || 0}%, var(--bg-main) ${init.progress || 0}%);"
                                                                                    oninput="OKRsPage.updateInitiativeProgressPreview('${init.id}', this.value)"
                                                                                    onchange="OKRsPage.updateInitiativeProgress('${init.id}', this.value)"
                                                                                >
                                                                                ` : `
                                                                                <div class="initiative-progress-bar-readonly" style="width:80px;height:6px;background:#e2e8f0;border-radius:3px;">
                                                                                    <div style="width:${init.progress || 0}%;height:100%;background:var(--top-teal);border-radius:3px;"></div>
                                                                                </div>
                                                                                `}
                                                                                <span class="progress-value-inline" id="progress-value-${init.id}">${init.progress || 0}%</span>
                                                                            </div>
                                                                        </div>
                                                                        ${init.responsavel || init.data_limite ? `
                                                                            <div class="initiative-meta">
                                                                                ${init.responsavel ? `
                                                                                    <span class="initiative-responsavel">
                                                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                                                        </svg>
                                                                                        ${init.responsavel.nome}
                                                                                    </span>
                                                                                ` : ''}
                                                                                ${init.data_limite ? `
                                                                                    <span class="initiative-deadline ${init.isOverdue() ? 'overdue' : ''}">
                                                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                        </svg>
                                                                                        ${this.formatDate(init.data_limite)}
                                                                                    </span>
                                                                                ` : ''}
                                                                            </div>
                                                                        ` : ''}
                                                                        ${(init.comment && init.comment.trim()) || (init.evidence && Array.isArray(init.evidence) && init.evidence.length > 0) ? `
                                                                            <div class="initiative-extra-info">
                                                                                ${init.comment && init.comment.trim() ? `
                                                                                    <div class="init-comment-section">
                                                                                        <span class="init-info-label">
                                                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                                                                            </svg>
                                                                                            Comentário:
                                                                                        </span>
                                                                                        <p class="init-comment-text">${init.comment}</p>
                                                                                    </div>
                                                                                ` : ''}
                                                                                ${init.evidence && Array.isArray(init.evidence) && init.evidence.length > 0 ? `
                                                                                    <div class="init-evidence-section">
                                                                                        <span class="init-info-label">
                                                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                                                            </svg>
                                                                                            Medições/Evidências (${init.evidence.length}):
                                                                                        </span>
                                                                                        <div class="init-evidence-list">
                                                                                            ${init.evidence.map((ev, idx) => `
                                                                                                <div class="init-evidence-item">
                                                                                                    ${ev.type === 'text'
                                                                                                        ? `<span class="init-evidence-text">${ev.content}</span>`
                                                                                                        : `<a href="${ev.content}" target="_blank" class="init-evidence-file">
                                                                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                                                                            </svg>
                                                                                                            ${ev.name || 'Arquivo'}
                                                                                                        </a>`
                                                                                                    }
                                                                                                </div>
                                                                                                ${idx < init.evidence.length - 1 ? '<span class="init-evidence-separator">•</span>' : ''}
                                                                                            `).join('')}
                                                                                        </div>
                                                                                    </div>
                                                                                ` : ''}
                                                                            </div>
                                                                        ` : ''}
                                                                    </div>
                                                                    ${canEdit ? `
                                                                    <div class="initiative-actions">
                                                                        <button class="btn-icon-sm" onclick="OKRsPage.openInitiativeModal('${kr.id}', '${init.id}')" title="Editar">
                                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                            </svg>
                                                                        </button>
                                                                        <button class="btn-icon-sm delete" onclick="OKRsPage.deleteInitiative('${init.id}', '${init.nome}')" title="Excluir">
                                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                    ` : ''}
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `})).then(results => results.join(''))}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async filter(status, btn) {
        this.currentFilter = status;
        await this.renderList();

        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    async filterByDepartment(department) {
        this.currentDepartment = department;
        await this.renderList();
    },

    async filterByMiniCycle(miniCycleId) {
        this.currentMiniCycle = miniCycleId;
        await this.renderList();
    },

    async openModal(id = null) {
        this.currentOKR = id ? await OKR.getById(id) : null;

        const modal = document.getElementById('okr-modal');
        const objectives = await StorageService.getObjectives();
        const departments = await Department.getActive();
        const miniCycles = await MiniCycle.getActive();
        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && currentUser.tipo === 'admin';
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);
        const hasMultipleDepts = userDepartmentNames.length > 1;

        // Encontra o miniciclo atualmente ativo (baseado na data)
        const today = new Date();
        const activeMiniCycle = miniCycles.find(mc => {
            const inicio = new Date(mc.data_inicio);
            const fim = new Date(mc.data_fim);
            return today >= inicio && today <= fim;
        });

        modal.innerHTML = `
            <div class="modal-overlay" onclick="OKRsPage.closeModal()"></div>
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin:0;color:var(--top-blue);font-size:20px;">${this.currentOKR ? 'Editar' : 'Novo'} OKR</h3>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">
                            ${this.currentOKR ? 'Atualize as informações do OKR' : 'Defina um novo OKR. Você poderá adicionar Key Results depois.'}
                        </p>
                    </div>
                    <button class="modal-close" onclick="OKRsPage.closeModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Título do OKR *</label>
                        <input type="text" id="okr-title" class="form-control"
                            placeholder="Ex: Reduzir tempo de aprovação de projetos em 50%"
                            value="${this.currentOKR ? this.currentOKR.title : ''}">
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">Objetivo Estratégico *</label>
                            <select id="okr-objective" class="form-control">
                                <option value="">Selecione...</option>
                                ${objectives.map(obj => `
                                    <option value="${obj.id}" ${this.currentOKR && this.currentOKR.objectiveId === obj.id ? 'selected' : ''}>
                                        ${obj.text}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Departamento *</label>
                            ${isAdmin ? `
                                <select id="okr-department" class="form-control">
                                    <option value="">Selecione...</option>
                                    ${departments.map(dept => `
                                        <option value="${dept.nome}" ${this.currentOKR && this.currentOKR.department === dept.nome ? 'selected' : ''}>
                                            ${dept.nome}
                                        </option>
                                    `).join('')}
                                </select>
                            ` : hasMultipleDepts ? `
                                <select id="okr-department" class="form-control">
                                    ${userDepartmentNames.map((deptName, idx) => `
                                        <option value="${deptName}" ${this.currentOKR && this.currentOKR.department === deptName ? 'selected' : (idx === 0 && !this.currentOKR ? 'selected' : '')}>
                                            ${deptName}
                                        </option>
                                    `).join('')}
                                </select>
                                <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">Selecione o departamento para este O</small>
                            ` : `
                                <input type="text" id="okr-department-display" class="form-control" value="${userDepartmentNames[0] || ''}" disabled style="background:var(--bg-main);cursor:not-allowed;">
                                <input type="hidden" id="okr-department" value="${userDepartmentNames[0] || ''}">
                                <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">O será criado para seu departamento</small>
                            `}
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Miniciclo *</label>
                        <select id="okr-minicycle" class="form-control">
                            <option value="">Selecione...</option>
                            ${miniCycles.map(mc => {
                                const isCurrentlyActive = activeMiniCycle && activeMiniCycle.id === mc.id;
                                const isSelected = this.currentOKR && this.currentOKR.mini_cycle_id === mc.id;
                                const shouldSelect = isSelected || (!this.currentOKR && isCurrentlyActive);
                                return `
                                    <option value="${mc.id}" ${shouldSelect ? 'selected' : ''}>
                                        ${mc.nome}${isCurrentlyActive ? ' [ATUAL]' : ''}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            Selecione o miniciclo ao qual este OKR pertence
                        </small>
                    </div>

                    ${!this.currentOKR ? `
                        <div class="info-box" style="margin-top:16px;padding:12px 16px;background:var(--info-bg);border-left:3px solid var(--info);border-radius:6px;">
                            <p style="margin:0;font-size:13px;color:var(--text-secondary);">
                                Dica: Após criar o O, você poderá adicionar Key Results clicando no botão "Novo KR".
                            </p>
                        </div>
                    ` : ''}

                    <div id="okr-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.save()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentOKR ? 'Atualizar' : 'Criar'} O
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    },

    closeModal() {
        document.getElementById('okr-modal').style.display = 'none';
        this.currentOKR = null;
    },

    async save() {
        const title = document.getElementById('okr-title').value.trim();
        const objectiveId = parseInt(document.getElementById('okr-objective').value);
        const department = document.getElementById('okr-department').value;
        const miniCycleId = document.getElementById('okr-minicycle').value;
        const errorDiv = document.getElementById('okr-error');

        errorDiv.style.display = 'none';

        if (!title) {
            errorDiv.textContent = 'Título do O é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        if (!objectiveId) {
            errorDiv.textContent = 'Selecione um objetivo estratégico';
            errorDiv.style.display = 'block';
            return;
        }

        if (!department) {
            errorDiv.textContent = 'Selecione um departamento';
            errorDiv.style.display = 'block';
            return;
        }

        if (!miniCycleId) {
            errorDiv.textContent = 'Selecione um miniciclo';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const okr = this.currentOKR || new OKR();
            okr.title = title;
            okr.objectiveId = objectiveId;
            okr.department = department;
            okr.mini_cycle_id = miniCycleId;

            // Se for novo OKR, cria com array vazio de KRs
            if (!this.currentOKR) {
                okr.keyResults = [];
            }

            await okr.save();

            this.closeModal();
            await this.renderList();
            DepartmentsPage.showToast(`OKR ${this.currentOKR ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    edit(id) {
        this.openModal(id);
    },

    async delete(id) {
        const okr = await OKR.getById(id);
        if (!okr) {
            DepartmentsPage.showToast('OKR não encontrado', 'error');
            return;
        }

        if (confirm(`Deseja realmente excluir o OKR "${okr.title}"?\n\nTodos os Key Results e iniciativas vinculados também serão excluídos.`)) {
            try {
                await OKR.delete(id);
                await this.render();
                DepartmentsPage.showToast('OKR excluído com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao excluir OKR:', error);
                DepartmentsPage.showToast(error.message || 'Erro ao excluir OKR', 'error');
            }
        }
    },

    updateKRProgress(okrId, krId, progress) {
        const okr = OKR.getById(okrId);
        if (okr) {
            okr.updateKeyResultProgress(krId, parseInt(progress));
            this.render();
        }
    },

    toggleOKRExpand(okrId) {
        const container = document.querySelector(`.okr-accordion-body[data-okr-id="${okrId}"]`);
        const arrow = document.querySelector(`.okr-accordion-header button.expand-arrow`);

        if (!container) return;

        if (this.expandedOKRs.has(okrId)) {
            this.expandedOKRs.delete(okrId);
            container.classList.remove('expanded');
        } else {
            this.expandedOKRs.add(okrId);
            container.classList.add('expanded');
        }
    },

    toggleKRExpand(krId) {
        const container = document.querySelector(`.kr-accordion-body[data-kr-id="${krId}"]`);

        if (!container) return;

        if (this.expandedKRs.has(krId)) {
            this.expandedKRs.delete(krId);
            container.classList.remove('expanded');
        } else {
            this.expandedKRs.add(krId);
            container.classList.add('expanded');
        }
    },

    toggleOKRMenu(event, okrId) {
        event.stopPropagation();
        window.closeAllDropdownMenus();
        const menu = document.getElementById(`okr-menu-${okrId}`);
        if (menu) {
            window.positionDropdownMenu(event.currentTarget, `okr-menu-${okrId}`);
            menu.classList.toggle('show');
        }
    },

    toggleKRMenu(event, krId) {
        event.stopPropagation();
        window.closeAllDropdownMenus();
        const menu = document.getElementById(`kr-menu-${krId}`);
        if (menu) {
            window.positionDropdownMenu(event.currentTarget, `kr-menu-${krId}`);
            menu.classList.toggle('show');
        }
    },

    closeAllMenus() {
        window.closeAllDropdownMenus();
    },

    async addKR(okrId) {
        const okr = await OKR.getById(okrId);
        if (!okr) {
            DepartmentsPage.showToast('OKR não encontrado', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'kr-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:1000;';

        modal.innerHTML = `
            <div class="modal-overlay" onclick="OKRsPage.closeKRModal()"></div>
            <div class="modal-content" style="max-width:700px;">
                <div class="modal-header">
                    <h3>Novo Key Result</h3>
                    <button class="modal-close" onclick="OKRsPage.closeKRModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="kr-okr-id" value="${okrId}">

                    <div class="form-group">
                        <label class="form-label">Título do Key Result *</label>
                        <input type="text" id="kr-title" class="form-control"
                            placeholder="Ex: Aumentar NPS para 85 pontos">
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Status *</label>
                        <select id="kr-status" class="form-control">
                            <option value="pending">Pendente</option>
                            <option value="in_progress">Em Progresso</option>
                            <option value="completed">Concluído</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Comentário</label>
                        <textarea id="kr-comment" class="form-control" rows="3"
                            placeholder="Adicione observações ou comentários sobre este KR..."></textarea>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Medições e Evidências</label>
                        <div id="kr-evidence-list" class="evidence-list"></div>
                        <div class="evidence-add-section" style="margin-top:8px;">
                            <select id="kr-evidence-type" class="form-control" style="width:auto;display:inline-block;margin-right:8px;">
                                <option value="text">Texto</option>
                                <option value="file">Arquivo</option>
                            </select>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="OKRsPage.addEvidenceField()">
                                + Adicionar Evidência
                            </button>
                        </div>
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            Adicione textos descritivos ou faça upload de arquivos (PDF, imagens, documentos)
                        </small>
                    </div>

                    <div id="kr-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeKRModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.saveNewKR()">Criar Key Result</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async editKR(okrId, krId) {
        const okr = await OKR.getById(okrId);
        if (!okr) return;

        const kr = okr.keyResults.find(k => k.id === krId);
        if (!kr) return;

        const modal = document.createElement('div');
        modal.id = 'kr-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:1000;';

        const existingEvidence = (kr.evidence && Array.isArray(kr.evidence)) ? kr.evidence : [];

        modal.innerHTML = `
            <div class="modal-overlay" onclick="OKRsPage.closeKRModal()"></div>
            <div class="modal-content" style="max-width:700px;">
                <div class="modal-header">
                    <h3>Editar Key Result</h3>
                    <button class="modal-close" onclick="OKRsPage.closeKRModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="kr-okr-id" value="${okrId}">
                    <input type="hidden" id="kr-id" value="${krId}">

                    <div class="form-group">
                        <label class="form-label">Título do Key Result *</label>
                        <input type="text" id="kr-title" class="form-control"
                            value="${kr.title}">
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Status *</label>
                        <select id="kr-status" class="form-control">
                            <option value="pending" ${kr.status === 'pending' ? 'selected' : ''}>Pendente</option>
                            <option value="in_progress" ${kr.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                            <option value="completed" ${kr.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Comentário</label>
                        <textarea id="kr-comment" class="form-control" rows="3"
                            placeholder="Adicione observações ou comentários sobre este KR...">${kr.comment ?? ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Medições e Evidências</label>
                        <div id="kr-evidence-list" class="evidence-list">
                            ${existingEvidence.map((ev, idx) => `
                                <div class="evidence-item" data-index="${idx}">
                                    <div class="evidence-item-header">
                                        <span class="evidence-type-badge ${ev.type}">${ev.type === 'text' ? 'Texto' : 'Arquivo'}</span>
                                        <button type="button" class="btn-icon-sm delete" onclick="OKRsPage.removeEvidenceField(${idx})" title="Remover">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    </div>
                                    ${ev.type === 'text'
                                        ? `<textarea class="form-control evidence-content" rows="2" placeholder="Descrição da evidência...">${ev.content}</textarea>`
                                        : `<div class="existing-file-display">
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                            </svg>
                                            <span class="existing-file-name">${ev.name || 'Arquivo'}</span>
                                            <a href="${ev.content}" target="_blank" class="btn btn-xs btn-secondary">Ver</a>
                                        </div>
                                        <input type="hidden" class="evidence-content" value="${ev.content}">
                                        <input type="hidden" class="evidence-filename" value="${ev.name || ''}">`
                                    }
                                    <input type="hidden" class="evidence-type-input" value="${ev.type}">
                                </div>
                            `).join('')}
                        </div>
                        <div class="evidence-add-section" style="margin-top:8px;">
                            <select id="kr-evidence-type" class="form-control" style="width:auto;display:inline-block;margin-right:8px;">
                                <option value="text">Texto</option>
                                <option value="file">Arquivo</option>
                            </select>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="OKRsPage.addEvidenceField()">
                                + Adicionar Evidência
                            </button>
                        </div>
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            Adicione textos descritivos ou faça upload de arquivos (PDF, imagens, documentos)
                        </small>
                    </div>

                    <div id="kr-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeKRModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.saveEditKR()">Atualizar Key Result</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    closeKRModal() {
        const modal = document.getElementById('kr-modal');
        if (modal) modal.remove();
    },

    // Funções para gerenciar evidências
    addEvidenceField() {
        const type = document.getElementById('kr-evidence-type').value;
        const list = document.getElementById('kr-evidence-list');
        const index = list.querySelectorAll('.evidence-item').length;

        const item = document.createElement('div');
        item.className = 'evidence-item';
        item.dataset.index = index;
        item.innerHTML = `
            <div class="evidence-item-header">
                <span class="evidence-type-badge ${type}">${type === 'text' ? 'Texto' : 'Arquivo'}</span>
                <button type="button" class="btn-icon-sm delete" onclick="OKRsPage.removeEvidenceField(${index})" title="Remover">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            ${type === 'text'
                ? `<textarea class="form-control evidence-content" rows="2" placeholder="Descrição da evidência..."></textarea>`
                : `<div class="file-upload-wrapper">
                    <input type="file" class="evidence-file-input" id="evidence-file-${index}"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                        onchange="OKRsPage.handleFileSelect(${index}, this)">
                    <label for="evidence-file-${index}" class="file-upload-label">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <span>Clique para selecionar arquivo</span>
                    </label>
                    <div class="file-selected" style="display:none;">
                        <span class="file-name"></span>
                        <span class="file-size"></span>
                    </div>
                </div>`
            }
            <input type="hidden" class="evidence-type-input" value="${type}">
            <input type="hidden" class="evidence-content" value="">
            <input type="hidden" class="evidence-filename" value="">
        `;
        list.appendChild(item);
    },

    handleFileSelect(index, input) {
        const file = input.files[0];
        if (!file) return;

        const item = input.closest('.evidence-item');
        const wrapper = item.querySelector('.file-upload-wrapper');
        const label = wrapper.querySelector('.file-upload-label');
        const selected = wrapper.querySelector('.file-selected');
        const fileName = selected.querySelector('.file-name');
        const fileSize = selected.querySelector('.file-size');

        // Validar tamanho (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo permitido: 10MB');
            input.value = '';
            return;
        }

        // Mostrar informações do arquivo
        label.style.display = 'none';
        selected.style.display = 'flex';
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);

        // Armazenar referência do arquivo
        item.dataset.file = 'pending';
        item.fileObject = file;
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    async uploadFile(file, krId) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `kr_${krId}/${timestamp}_${safeName}`;

        const { data, error } = await supabaseClient.storage
            .from('evidencias')
            .upload(filePath, file);

        if (error) {
            console.error('Erro no upload:', error);
            throw error;
        }

        // Pegar URL pública
        const { data: urlData } = supabaseClient.storage
            .from('evidencias')
            .getPublicUrl(filePath);

        return {
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
            path: filePath
        };
    },

    removeEvidenceField(index) {
        const list = document.getElementById('kr-evidence-list');
        const item = list.querySelector(`.evidence-item[data-index="${index}"]`);
        if (item) item.remove();
    },

    async collectEvidence(krId) {
        const list = document.getElementById('kr-evidence-list');
        if (!list) return [];

        const items = list.querySelectorAll('.evidence-item');
        const evidence = [];

        for (const item of items) {
            const type = item.querySelector('.evidence-type-input')?.value || 'text';

            if (type === 'text') {
                const content = item.querySelector('.evidence-content')?.value?.trim() ||
                               item.querySelector('textarea.evidence-content')?.value?.trim() || '';
                if (content) {
                    evidence.push({ type: 'text', content });
                }
            } else if (type === 'file') {
                // Verificar se já tem um arquivo uploaded (edição)
                const existingUrl = item.querySelector('.evidence-content')?.value;
                const existingName = item.querySelector('.evidence-filename')?.value;

                if (item.fileObject) {
                    // Novo arquivo para upload
                    try {
                        const uploaded = await this.uploadFile(item.fileObject, krId);
                        evidence.push({
                            type: 'file',
                            content: uploaded.url,
                            name: uploaded.name,
                            size: uploaded.size,
                            path: uploaded.path
                        });
                    } catch (error) {
                        console.error('Erro ao fazer upload:', error);
                        DepartmentsPage.showToast('Erro ao fazer upload do arquivo', 'error');
                    }
                } else if (existingUrl) {
                    // Arquivo já existente
                    evidence.push({
                        type: 'file',
                        content: existingUrl,
                        name: existingName || 'arquivo'
                    });
                }
            }
        }

        return evidence;
    },

    // =====================================================
    // EDIÇÃO RÁPIDA DE COMENTÁRIO E EVIDÊNCIAS DO KR
    // =====================================================

    async openQuickCommentEditor(okrId, krId) {
        const okr = await OKR.getById(okrId);
        if (!okr) return;

        const kr = okr.keyResults.find(k => k.id === krId);
        if (!kr) return;

        const modal = document.createElement('div');
        modal.id = 'quick-comment-modal';
        modal.className = 'quick-modal-overlay';
        modal.innerHTML = `
            <div class="quick-modal-content">
                <div class="quick-modal-header">
                    <h4>${kr.comment && kr.comment.trim() ? 'Editar' : 'Adicionar'} Comentário</h4>
                    <button class="modal-close" onclick="OKRsPage.closeQuickModal('quick-comment-modal')">&times;</button>
                </div>
                <div class="quick-modal-body">
                    <textarea id="quick-comment-text" class="form-control" rows="4"
                        placeholder="Digite seu comentário sobre este Key Result...">${kr.comment || ''}</textarea>
                </div>
                <div class="quick-modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeQuickModal('quick-comment-modal')">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.saveQuickComment('${okrId}', '${krId}')">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('quick-comment-text').focus();
    },

    async saveQuickComment(okrId, krId) {
        const comment = document.getElementById('quick-comment-text').value.trim();

        try {
            // Salvar diretamente no banco
            const { error } = await supabaseClient
                .from('key_results')
                .update({ comment: comment || null })
                .eq('id', krId);

            if (error) throw error;

            this.closeQuickModal('quick-comment-modal');
            await this.renderList();
            DepartmentsPage.showToast('Comentário salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
            DepartmentsPage.showToast('Erro ao salvar comentário', 'error');
        }
    },

    async openQuickEvidenceModal(okrId, krId) {
        const modal = document.createElement('div');
        modal.id = 'quick-evidence-modal';
        modal.className = 'quick-modal-overlay';
        modal.innerHTML = `
            <div class="quick-modal-content">
                <div class="quick-modal-header">
                    <h4>Adicionar Evidência</h4>
                    <button class="modal-close" onclick="OKRsPage.closeQuickModal('quick-evidence-modal')">&times;</button>
                </div>
                <div class="quick-modal-body">
                    <input type="hidden" id="quick-evidence-okr-id" value="${okrId}">
                    <input type="hidden" id="quick-evidence-kr-id" value="${krId}">

                    <div class="form-group">
                        <label class="form-label">Tipo de Evidência</label>
                        <div class="evidence-type-selector">
                            <label class="evidence-type-option active" data-type="text">
                                <input type="radio" name="quick-evidence-type" value="text" checked>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                <span>Texto</span>
                            </label>
                            <label class="evidence-type-option" data-type="file">
                                <input type="radio" name="quick-evidence-type" value="file">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <span>Arquivo</span>
                            </label>
                        </div>
                    </div>

                    <div id="quick-evidence-text-container" class="form-group" style="margin-top:16px;">
                        <label class="form-label">Texto da Evidência</label>
                        <textarea id="quick-evidence-text" class="form-control" rows="3"
                            placeholder="Descreva a medição ou evidência..."></textarea>
                    </div>

                    <div id="quick-evidence-file-container" class="form-group" style="margin-top:16px;display:none;">
                        <label class="form-label">Arquivo</label>
                        <div class="file-upload-wrapper">
                            <input type="file" id="quick-evidence-file" class="evidence-file-input"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                                onchange="OKRsPage.handleQuickFileSelect(this)">
                            <label for="quick-evidence-file" class="file-upload-label">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <span>Clique para selecionar arquivo</span>
                            </label>
                            <div id="quick-file-selected" class="file-selected" style="display:none;">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span id="quick-file-name" class="file-name"></span>
                                <span id="quick-file-size" class="file-size"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="quick-modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeQuickModal('quick-evidence-modal')">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.saveQuickEvidence()">Adicionar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para trocar tipo
        modal.querySelectorAll('.evidence-type-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.evidence-type-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                option.querySelector('input').checked = true;

                const type = option.dataset.type;
                document.getElementById('quick-evidence-text-container').style.display = type === 'text' ? 'block' : 'none';
                document.getElementById('quick-evidence-file-container').style.display = type === 'file' ? 'block' : 'none';
            });
        });
    },

    quickSelectedFile: null,

    handleQuickFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo permitido: 10MB');
            input.value = '';
            return;
        }

        this.quickSelectedFile = file;

        const label = document.querySelector('#quick-evidence-file-container .file-upload-label');
        const selected = document.getElementById('quick-file-selected');
        const fileName = document.getElementById('quick-file-name');
        const fileSize = document.getElementById('quick-file-size');

        label.style.display = 'none';
        selected.style.display = 'flex';
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
    },

    async saveQuickEvidence() {
        const okrId = document.getElementById('quick-evidence-okr-id').value;
        const krId = document.getElementById('quick-evidence-kr-id').value;
        const type = document.querySelector('input[name="quick-evidence-type"]:checked').value;

        try {
            // Buscar evidências atuais
            const { data: krData, error: fetchError } = await supabaseClient
                .from('key_results')
                .select('evidence')
                .eq('id', krId)
                .single();

            if (fetchError) throw fetchError;

            const currentEvidence = krData.evidence || [];
            let newEvidence;

            if (type === 'text') {
                const text = document.getElementById('quick-evidence-text').value.trim();
                if (!text) {
                    DepartmentsPage.showToast('Digite o texto da evidência', 'error');
                    return;
                }
                newEvidence = { type: 'text', content: text };
            } else {
                if (!this.quickSelectedFile) {
                    DepartmentsPage.showToast('Selecione um arquivo', 'error');
                    return;
                }

                // Upload do arquivo
                const uploaded = await this.uploadFile(this.quickSelectedFile, krId);
                newEvidence = {
                    type: 'file',
                    content: uploaded.url,
                    name: uploaded.name,
                    size: uploaded.size,
                    path: uploaded.path
                };
            }

            // Adicionar nova evidência
            currentEvidence.push(newEvidence);

            // Salvar no banco
            const { error } = await supabaseClient
                .from('key_results')
                .update({ evidence: currentEvidence })
                .eq('id', krId);

            if (error) throw error;

            this.quickSelectedFile = null;
            this.closeQuickModal('quick-evidence-modal');
            await this.renderList();
            DepartmentsPage.showToast('Evidência adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar evidência:', error);
            DepartmentsPage.showToast('Erro ao salvar evidência', 'error');
        }
    },

    closeQuickModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
        this.quickSelectedFile = null;
    },

    async saveNewKR() {
        const okrId = document.getElementById('kr-okr-id').value;
        const title = document.getElementById('kr-title').value.trim();
        const status = document.getElementById('kr-status').value;
        const comment = document.getElementById('kr-comment')?.value.trim() || '';
        const krId = generateId(); // Gerar ID antes para usar no upload
        const evidence = await this.collectEvidence(krId);
        const errorDiv = document.getElementById('kr-error');

        if (!title) {
            errorDiv.textContent = 'Título do Key Result é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const okr = await OKR.getById(okrId);
            if (!okr) throw new Error('OKR não encontrado');

            const newKR = {
                id: krId,
                title: title,
                status: status,
                target: 100,
                metric: '%',
                progress: 0,
                tasks: [],
                comment: comment,
                evidence: evidence
            };

            okr.keyResults.push(newKR);
            await okr.save();

            this.closeKRModal();
            await this.renderList();
            DepartmentsPage.showToast('Key Result criado com sucesso!', 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    async saveEditKR() {
        const okrId = document.getElementById('kr-okr-id').value;
        const krId = document.getElementById('kr-id').value;
        const title = document.getElementById('kr-title').value.trim();
        const status = document.getElementById('kr-status').value;
        const comment = document.getElementById('kr-comment')?.value.trim() || '';
        const evidence = await this.collectEvidence(krId);
        const errorDiv = document.getElementById('kr-error');

        if (!title) {
            errorDiv.textContent = 'Título do Key Result é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const okr = await OKR.getById(okrId);
            if (!okr) throw new Error('OKR não encontrado');

            const kr = okr.keyResults.find(k => k.id === krId);
            if (!kr) throw new Error('Key Result não encontrado');

            kr.title = title;
            kr.status = status;
            kr.comment = comment;
            kr.evidence = evidence;

            await okr.save();

            this.closeKRModal();
            await this.renderList();
            DepartmentsPage.showToast('Key Result atualizado com sucesso!', 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    async deleteKR(okrId, krId) {
        if (!confirm('Deseja realmente excluir este Key Result?\n\nTodas as iniciativas vinculadas também serão excluídas.')) {
            return;
        }

        try {
            const okr = await OKR.getById(okrId);
            if (!okr) throw new Error('OKR não encontrado');

            okr.keyResults = okr.keyResults.filter(kr => kr.id !== krId);
            await okr.save();

            await this.renderList();
            DepartmentsPage.showToast('Key Result excluído com sucesso!', 'success');
        } catch (error) {
            DepartmentsPage.showToast(error.message || 'Erro ao excluir Key Result', 'error');
        }
    },

    async openInitiativeModal(keyResultId, initiativeId = null) {
        this.currentInitiative = initiativeId ? await Initiative.getById(initiativeId) : null;
        this.currentInitiative = this.currentInitiative || { key_result_id: keyResultId };

        const users = await User.getAll();
        const modal = document.createElement('div');
        modal.id = 'initiative-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:1000;';

        modal.innerHTML = `
            <div class="modal-overlay" onclick="OKRsPage.closeInitiativeModal()"></div>
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h3>${initiativeId ? 'Editar' : 'Nova'} Iniciativa</h3>
                    <button class="modal-close" onclick="OKRsPage.closeInitiativeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="init-kr-id" value="${keyResultId}">

                    <div class="form-group">
                        <label class="form-label">Nome da Iniciativa *</label>
                        <input type="text" id="init-nome" class="form-control"
                            placeholder="Ex: Implementar novo sistema de aprovações"
                            value="${this.currentInitiative.nome || ''}">
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Descrição</label>
                        <textarea id="init-descricao" class="form-control" rows="3"
                            placeholder="Detalhes sobre a iniciativa (opcional)">${this.currentInitiative.descricao || ''}</textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">Responsável</label>
                            <select id="init-responsavel" class="form-control">
                                <option value="">Sem responsável</option>
                                ${users.map(user => `
                                    <option value="${user.id}" ${this.currentInitiative.responsavel_id === user.id ? 'selected' : ''}>
                                        ${user.nome}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Data Limite</label>
                            <input type="date" id="init-data-limite" class="form-control"
                                value="${this.currentInitiative.data_limite || ''}">
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Progresso: <span id="init-progress-display">${this.currentInitiative.progress || 0}</span>%</label>
                        <input
                            type="range"
                            id="init-progress"
                            class="form-control-range initiative-progress-slider"
                            min="0"
                            max="100"
                            value="${this.currentInitiative.progress || 0}"
                            oninput="
                                document.getElementById('init-progress-display').textContent = this.value;
                                const bar = document.getElementById('init-progress-bar');
                                if (bar) bar.style.width = this.value + '%';
                            "
                            style="width:100%;margin-top:8px;"
                        >
                        <div class="progress-bar-container" style="margin-top:8px;">
                            <div
                                id="init-progress-bar"
                                class="progress-bar"
                                style="width: ${this.currentInitiative.progress || 0}%"
                            ></div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="init-concluida" ${this.currentInitiative.concluida ? 'checked' : ''}>
                            <span>Marcar como concluída</span>
                        </label>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Comentário</label>
                        <textarea id="init-comment" class="form-control" rows="3"
                            placeholder="Adicione observações ou comentários sobre esta iniciativa...">${this.currentInitiative.comment ?? ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Medições e Evidências</label>
                        <div id="init-evidence-list" class="evidence-list">
                            ${(this.currentInitiative.evidence && Array.isArray(this.currentInitiative.evidence) ? this.currentInitiative.evidence : []).map((ev, idx) => `
                                <div class="evidence-item" data-index="${idx}">
                                    <div class="evidence-item-header">
                                        <span class="evidence-type-badge ${ev.type}">${ev.type === 'text' ? 'Texto' : 'Arquivo'}</span>
                                        <button type="button" class="btn-icon-sm delete" onclick="OKRsPage.removeInitEvidenceField(${idx})" title="Remover">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    </div>
                                    ${ev.type === 'text'
                                        ? `<textarea class="form-control evidence-content" rows="2" placeholder="Descrição da evidência...">${ev.content}</textarea>`
                                        : `<div class="existing-file-display">
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                            </svg>
                                            <span class="existing-file-name">${ev.name || 'Arquivo'}</span>
                                            <a href="${ev.content}" target="_blank" class="btn btn-xs btn-secondary">Ver</a>
                                        </div>
                                        <input type="hidden" class="evidence-content" value="${ev.content}">
                                        <input type="hidden" class="evidence-filename" value="${ev.name || ''}">`
                                    }
                                    <input type="hidden" class="evidence-type-input" value="${ev.type}">
                                </div>
                            `).join('')}
                        </div>
                        <div class="evidence-add-section" style="margin-top:8px;">
                            <select id="init-evidence-type" class="form-control" style="width:auto;display:inline-block;margin-right:8px;">
                                <option value="text">Texto</option>
                                <option value="file">Arquivo</option>
                            </select>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="OKRsPage.addInitEvidenceField()">
                                + Adicionar Evidência
                            </button>
                        </div>
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            Adicione textos descritivos ou faça upload de arquivos (PDF, imagens, documentos)
                        </small>
                    </div>

                    <div id="init-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeInitiativeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.saveInitiative()">
                        ${initiativeId ? 'Atualizar' : 'Criar'} Iniciativa
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    closeInitiativeModal() {
        const modal = document.getElementById('initiative-modal');
        if (modal) modal.remove();
        this.currentInitiative = null;
    },

    // Funções para gerenciar evidências de iniciativas
    addInitEvidenceField() {
        const type = document.getElementById('init-evidence-type').value;
        const list = document.getElementById('init-evidence-list');
        const index = list.querySelectorAll('.evidence-item').length;

        const item = document.createElement('div');
        item.className = 'evidence-item';
        item.dataset.index = index;
        item.innerHTML = `
            <div class="evidence-item-header">
                <span class="evidence-type-badge ${type}">${type === 'text' ? 'Texto' : 'Arquivo'}</span>
                <button type="button" class="btn-icon-sm delete" onclick="OKRsPage.removeInitEvidenceField(${index})" title="Remover">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            ${type === 'text'
                ? `<textarea class="form-control evidence-content" rows="2" placeholder="Descrição da evidência..."></textarea>`
                : `<div class="file-upload-wrapper">
                    <input type="file" id="init-file-input-${index}" class="evidence-file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif" onchange="OKRsPage.handleInitFileSelect(${index}, this)">
                    <label class="file-upload-label" for="init-file-input-${index}">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <span>Clique para selecionar arquivo ou arraste aqui</span>
                    </label>
                    <div class="file-selected" style="display:none;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="file-name"></span>
                        <span class="file-size"></span>
                    </div>
                </div>`
            }
            <input type="hidden" class="evidence-type-input" value="${type}">
        `;

        list.appendChild(item);
    },

    handleInitFileSelect(index, input) {
        const file = input.files[0];
        if (!file) return;

        const item = document.querySelector(`#init-evidence-list .evidence-item[data-index="${index}"]`);
        if (!item) return;

        const wrapper = item.querySelector('.file-upload-wrapper');
        const label = wrapper.querySelector('.file-upload-label');
        const selected = wrapper.querySelector('.file-selected');
        const fileName = selected.querySelector('.file-name');
        const fileSize = selected.querySelector('.file-size');

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo permitido: 10MB');
            input.value = '';
            return;
        }

        label.style.display = 'none';
        selected.style.display = 'flex';
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);

        item.dataset.file = 'pending';
        item.fileObject = file;
    },

    removeInitEvidenceField(index) {
        const list = document.getElementById('init-evidence-list');
        const item = list.querySelector(`.evidence-item[data-index="${index}"]`);
        if (item) item.remove();
    },

    async collectInitEvidence(initId) {
        const list = document.getElementById('init-evidence-list');
        if (!list) return [];

        const items = list.querySelectorAll('.evidence-item');
        const evidence = [];

        for (const item of items) {
            const type = item.querySelector('.evidence-type-input')?.value || 'text';

            if (type === 'text') {
                const content = item.querySelector('.evidence-content')?.value?.trim() ||
                               item.querySelector('textarea.evidence-content')?.value?.trim() || '';
                if (content) {
                    evidence.push({ type: 'text', content });
                }
            } else if (type === 'file') {
                const existingUrl = item.querySelector('.evidence-content')?.value;
                const existingName = item.querySelector('.evidence-filename')?.value;

                if (item.fileObject) {
                    try {
                        const uploaded = await this.uploadInitFile(item.fileObject, initId);
                        evidence.push({
                            type: 'file',
                            content: uploaded.url,
                            name: uploaded.name,
                            size: uploaded.size,
                            path: uploaded.path
                        });
                    } catch (error) {
                        console.error('Erro ao fazer upload:', error);
                        DepartmentsPage.showToast('Erro ao fazer upload do arquivo', 'error');
                    }
                } else if (existingUrl) {
                    evidence.push({
                        type: 'file',
                        content: existingUrl,
                        name: existingName || 'arquivo'
                    });
                }
            }
        }

        return evidence;
    },

    async uploadInitFile(file, initId) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `init_${initId}/${timestamp}_${safeName}`;

        const { data, error } = await supabaseClient.storage
            .from('evidencias')
            .upload(filePath, file);

        if (error) {
            console.error('Erro no upload:', error);
            throw error;
        }

        const { data: urlData } = supabaseClient.storage
            .from('evidencias')
            .getPublicUrl(filePath);

        return {
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
            path: filePath
        };
    },

    async saveInitiative() {
        const keyResultId = document.getElementById('init-kr-id').value;
        const nome = document.getElementById('init-nome').value.trim();
        const descricao = document.getElementById('init-descricao').value.trim();
        const responsavelId = document.getElementById('init-responsavel').value || null;
        const dataLimite = document.getElementById('init-data-limite').value || null;
        const progress = parseInt(document.getElementById('init-progress').value, 10) || 0;
        const concluida = document.getElementById('init-concluida').checked;
        const comment = document.getElementById('init-comment')?.value.trim() || '';
        const errorDiv = document.getElementById('init-error');

        errorDiv.style.display = 'none';

        if (!nome) {
            errorDiv.textContent = 'Nome da iniciativa é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const initiative = this.currentInitiative.id ? await Initiative.getById(this.currentInitiative.id) : new Initiative();
            const initId = initiative.id || generateId();
            const evidence = await this.collectInitEvidence(initId);

            initiative.key_result_id = keyResultId;
            initiative.nome = nome;
            initiative.descricao = descricao;
            initiative.responsavel_id = responsavelId;
            initiative.data_limite = dataLimite;
            initiative.progress = progress;
            initiative.concluida = concluida;
            initiative.comment = comment;
            initiative.evidence = evidence;

            await initiative.save();

            this.closeInitiativeModal();
            await this.renderList();
            DepartmentsPage.showToast(`Iniciativa ${this.currentInitiative.id ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    async toggleInitiative(id) {
        try {
            const initiative = await Initiative.getById(id);
            await initiative.toggleComplete();
            await this.renderList();
        } catch (error) {
            DepartmentsPage.showToast('Erro ao atualizar iniciativa', 'error');
        }
    },

    async deleteInitiative(id, nome) {
        if (!confirm(`Tem certeza que deseja excluir a iniciativa "${nome}"?`)) {
            return;
        }

        try {
            const initiative = await Initiative.getById(id);
            await initiative.delete();
            await this.renderList();
            DepartmentsPage.showToast('Iniciativa excluída com sucesso!', 'success');
        } catch (error) {
            DepartmentsPage.showToast(error.message || 'Erro ao excluir iniciativa', 'error');
        }
    },

    // Atualiza o preview do progresso (enquanto arrasta o slider)
    updateInitiativeProgressPreview(id, value) {
        const progressValue = document.getElementById(`progress-value-${id}`);
        if (progressValue) {
            progressValue.textContent = `${value}%`;
        }

        // Atualiza o background do slider
        const slider = document.getElementById(`slider-${id}`);
        if (slider) {
            slider.style.background = `linear-gradient(to right, var(--top-teal) ${value}%, var(--bg-main) ${value}%)`;
        }
    },

    // Salva o progresso no banco (quando solta o slider)
    async updateInitiativeProgress(id, value) {
        try {
            const initiative = await Initiative.getById(id);
            if (!initiative) {
                console.error('Iniciativa não encontrada:', id);
                return;
            }

            await initiative.updateProgress(parseInt(value));

            // Recarrega a lista para mostrar os progressos recalculados do KR e OKR
            await this.renderList();

            DepartmentsPage.showToast(`Progresso atualizado para ${value}%`, 'success');
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            DepartmentsPage.showToast('Erro ao atualizar progresso', 'error');
        }
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    // ==================== EXPORT METHODS ====================

    async exportToPDF() {
        try {
            this.showExportLoading('PDF');

            const currentUser = AuthService.getCurrentUser();
            const userDepartmentNames = this.getUserDepartmentNames(currentUser);
            const isAdmin = currentUser && currentUser.tipo === 'admin';

            // Get all OKRs
            let okrs = await OKR.getAll();

            // Filter by user departments if not admin
            if (!isAdmin && userDepartmentNames.length > 0) {
                okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
            }

            // Apply current filters
            okrs = this.applyCurrentFilters(okrs);

            // Check if there are OKRs to export
            if (okrs.length === 0) {
                DepartmentsPage.showToast('Nenhum OKR disponível para exportar', 'warning');
                this.hideExportLoading();
                return;
            }

            // Export to PDF
            await ExportService.exportToPDF(okrs, currentUser);

            DepartmentsPage.showToast(`${okrs.length} OKR(s) exportado(s) para PDF com sucesso!`, 'success');
            this.hideExportLoading();
        } catch (error) {
            console.error('Erro ao exportar para PDF:', error);
            DepartmentsPage.showToast('Erro ao gerar arquivo PDF', 'error');
            this.hideExportLoading();
        }
    },

    async exportToExcel() {
        try {
            this.showExportLoading('Excel');

            const currentUser = AuthService.getCurrentUser();
            const userDepartmentNames = this.getUserDepartmentNames(currentUser);
            const isAdmin = currentUser && currentUser.tipo === 'admin';

            // Get all OKRs
            let okrs = await OKR.getAll();

            // Filter by user departments if not admin
            if (!isAdmin && userDepartmentNames.length > 0) {
                okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
            }

            // Apply current filters
            okrs = this.applyCurrentFilters(okrs);

            // Check if there are OKRs to export
            if (okrs.length === 0) {
                DepartmentsPage.showToast('Nenhum OKR disponível para exportar', 'warning');
                this.hideExportLoading();
                return;
            }

            // Export to Excel
            await ExportService.exportToExcel(okrs, currentUser);

            DepartmentsPage.showToast(`${okrs.length} OKR(s) exportado(s) para Excel com sucesso!`, 'success');
            this.hideExportLoading();
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            DepartmentsPage.showToast('Erro ao gerar arquivo Excel', 'error');
            this.hideExportLoading();
        }
    },

    applyCurrentFilters(okrs) {
        let filtered = [...okrs];

        // Filter by status
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(o => o.status === this.currentFilter);
        }

        // Filter by department
        if (this.currentDepartment !== 'all' && this.currentDepartment !== 'user-depts') {
            filtered = filtered.filter(o => o.department === this.currentDepartment);
        }

        // Filter by mini cycle
        if (this.currentMiniCycle !== 'all') {
            filtered = filtered.filter(o => o.mini_cycle_id === this.currentMiniCycle);
        }

        return filtered;
    },

    showExportLoading(format) {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'export-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        overlay.innerHTML = `
            <div style="background:white;padding:32px;border-radius:12px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--top-blue);border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite;"></div>
                <p style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Gerando arquivo ${format}...</p>
                <p style="font-size:14px;color:var(--text-muted);">Por favor, aguarde</p>
            </div>
        `;

        // Add spinner animation if not already added
        if (!document.getElementById('export-spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'export-spinner-styles';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
    },

    hideExportLoading() {
        const overlay = document.getElementById('export-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    addStyles() {
        if (document.getElementById('okr-styles')) return;

        const style = document.createElement('style');
        style.id = 'okr-styles';
        style.textContent = `
            .okr-filters {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .filter-btn {
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-secondary);
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .filter-btn:hover {
                border-color: var(--top-teal);
                color: var(--top-teal);
            }
            .filter-btn.active {
                background: var(--top-teal);
                color: white;
                border-color: var(--top-teal);
            }
            .btn-secondary {
                background: var(--bg-card);
                color: var(--text-primary);
                border: 1px solid var(--border);
                padding: 10px 16px;
                border-radius: var(--radius);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .btn-secondary:hover {
                background: var(--bg-hover);
                border-color: var(--top-blue);
                color: var(--top-blue);
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
            }
            .btn-secondary:active {
                transform: translateY(0);
            }
            .btn-secondary svg {
                width: 20px;
                height: 20px;
            }
            .department-separator {
                display: flex;
                align-items: center;
                margin: 24px 0 16px 0;
                gap: 12px;
            }
            .department-separator.first {
                margin-top: 0;
            }
            .department-separator::after {
                content: '';
                flex: 1;
                height: 1px;
                background: var(--border);
            }
            .department-separator .dept-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-muted);
                white-space: nowrap;
            }
            .okr-card {
                transition: all 0.2s;
            }
            .okr-card:hover {
                box-shadow: var(--shadow-md);
            }
            .kr-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .kr-item {
                background: var(--bg-main);
                border-radius: var(--radius);
                padding: 16px;
            }
            .kr-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .kr-number {
                width: 28px;
                height: 28px;
                background: var(--top-teal);
                color: white;
                border-radius: var(--radius);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 13px;
                flex-shrink: 0;
            }
            .kr-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
            }
            .kr-meta {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 2px;
            }
            .kr-progress-value {
                font-size: 16px;
                font-weight: 700;
                color: var(--top-teal);
            }
            .kr-progress-bar {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .kr-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: var(--border);
                outline: none;
                -webkit-appearance: none;
            }
            .kr-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--top-teal);
                cursor: pointer;
            }
            .kr-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--top-teal);
                cursor: pointer;
                border: none;
            }
            .modal-large {
                max-width: 800px;
            }
            .form-section {
                background: var(--bg-main);
                padding: 20px;
                border-radius: var(--radius);
                margin-bottom: 20px;
            }
            .form-section-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--top-blue);
                margin-bottom: 16px;
            }
            .kr-form-item {
                background: white;
                padding: 16px;
                border-radius: var(--radius);
                border: 1px solid var(--border);
                margin-bottom: 12px;
            }

            /* OKR Accordion Styles */
            .okr-accordion-card {
                margin-bottom: 16px;
                border-radius: 12px;
                overflow: visible;
                border: 1px solid var(--border);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                transition: all 0.3s ease;
            }

            .okr-accordion-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .okr-accordion-card.okr-needs-adjustment {
                border-color: #fca5a5;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
            }

            .okr-adjustment-banner {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 20px;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border-bottom: 1px solid #fecaca;
                border-radius: 12px 12px 0 0;
            }

            .okr-needs-adjustment .okr-accordion-header {
                border-radius: 0;
            }

            .adjustment-icon {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #fee2e2;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #dc2626;
            }

            .adjustment-icon svg {
                width: 18px;
                height: 18px;
            }

            .adjustment-content {
                flex: 1;
            }

            .adjustment-content strong {
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 4px;
            }

            .adjustment-content p {
                font-size: 13px;
                color: #991b1b;
                margin: 0;
                line-height: 1.5;
            }

            .okr-status-badge {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                white-space: nowrap;
                transform: translateY(-2px);
            }

            .okr-accordion-header {
                background: linear-gradient(135deg, var(--top-blue) 0%, #1a5570 100%);
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                border-radius: 12px 12px 0 0;
            }

            .okr-accordion-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: var(--top-teal);
                transform: scaleX(0);
                transition: transform 0.3s ease;
            }

            .okr-accordion-header:hover::after {
                transform: scaleX(1);
            }

            .okr-accordion-header:hover {
                background: linear-gradient(135deg, #1a5570 0%, var(--top-blue) 100%);
            }

            .okr-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }

            .okr-info-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
                flex: 1;
            }

            .okr-main-line {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .okr-meta-line {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.85);
            }

            .okr-department,
            .okr-objective {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .okr-department svg,
            .okr-objective svg {
                flex-shrink: 0;
            }

            .okr-separator {
                color: rgba(255, 255, 255, 0.5);
                margin: 0 4px;
            }

            .okr-progress-line {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 8px;
            }

            .okr-progress-bar-header {
                flex: 1;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                overflow: hidden;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            .okr-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #fff 0%, rgba(255, 255, 255, 0.85) 100%);
                border-radius: 10px;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
            }

            .okr-progress-text {
                font-size: 14px;
                font-weight: 700;
                color: white;
                min-width: 45px;
                text-align: right;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }

            .expand-arrow {
                width: 24px;
                height: 24px;
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s ease;
            }

            .expand-arrow.expanded {
                transform: rotate(180deg);
            }

            .expand-arrow svg {
                width: 18px;
                height: 18px;
            }

            .expand-arrow-sm {
                width: 20px;
                height: 20px;
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s ease;
            }

            .expand-arrow-sm.expanded {
                transform: rotate(180deg);
            }

            .expand-arrow-sm svg {
                width: 16px;
                height: 16px;
            }

            .okr-identifier {
                background: white;
                color: var(--top-blue);
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 700;
            }

            .okr-title-header {
                color: white;
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }

            .kr-count {
                color: rgba(255,255,255,0.8);
                font-size: 13px;
            }

            .okr-header-right {
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                z-index: 10;
            }

            .action-menu-btn-header {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .action-menu-btn-header:hover {
                background: rgba(255,255,255,0.3);
            }

            .action-menu-btn-header svg {
                width: 18px;
                height: 18px;
            }

            .okr-accordion-body {
                max-height: 0;
                overflow: visible;
                opacity: 0;
                transition: max-height 0.4s ease, opacity 0.3s ease;
                background: white;
            }

            .okr-accordion-body.expanded {
                max-height: 5000px;
                opacity: 1;
            }

            /* KRs Section */
            .krs-section {
                padding: 20px;
            }

            .krs-section-header,
            .initiatives-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid var(--border-light);
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
                color: var(--top-blue);
            }

            .section-title svg {
                color: var(--top-teal);
            }

            /* KR Accordion */
            .kr-accordion-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .empty-krs {
                padding: 40px 20px;
                text-align: center;
                background: var(--bg-main);
                border-radius: 8px;
                border: 2px dashed var(--border);
            }

            .kr-accordion-item {
                border: 1px solid var(--border);
                border-radius: 10px;
                overflow: visible;
                background: white;
                transition: all 0.3s ease;
                position: relative;
            }

            .kr-accordion-item:hover {
                border-color: var(--top-teal);
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.1);
            }

            .kr-accordion-item:has(.kr-accordion-body.expanded) {
                border-color: var(--top-teal);
                box-shadow: 0 4px 16px rgba(18, 176, 160, 0.15);
            }

            .kr-accordion-item:has(.kr-accordion-body.expanded) .kr-accordion-header {
                background: linear-gradient(135deg, var(--bg-main) 0%, #e8f5f3 100%);
                border-bottom: 1px solid var(--top-teal);
            }

            .kr-accordion-header {
                background: var(--bg-main);
                padding: 14px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .kr-accordion-header:hover {
                background: var(--bg-hover);
            }

            .kr-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }

            .kr-info-section {
                display: flex;
                flex-direction: column;
                gap: 6px;
                flex: 1;
            }

            .kr-title-line {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .kr-badge {
                background: var(--top-teal);
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
            }

            .kr-title-text {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                flex: 1;
            }

            .kr-progress-line-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding-left: 46px;
            }

            .kr-progress-bar-small {
                flex: 1;
                max-width: 200px;
                height: 6px;
                background: var(--border-light);
                border-radius: 10px;
                overflow: hidden;
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
            }

            .kr-progress-fill-small {
                height: 100%;
                background: linear-gradient(90deg, var(--top-teal) 0%, #13a692 100%);
                border-radius: 10px;
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .kr-progress-text-small {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-secondary);
                min-width: 40px;
                text-align: right;
            }

            .kr-header-right {
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                z-index: 10;
            }

            .kr-status-badge {
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .kr-accordion-body {
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                background: white;
                border-top: 0 solid var(--border-light);
            }

            .kr-accordion-body.expanded {
                max-height: 3000px;
                opacity: 1;
                overflow: visible;
                border-top-width: 1px;
            }

            /* Initiatives Section */
            .initiatives-section {
                padding: 16px;
            }

            .initiatives-section-header {
                margin-top: 0;
            }

            /* Initiatives Styles */
            .initiatives-container {
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: max-height 0.4s ease, opacity 0.3s ease;
            }

            .initiatives-container.expanded {
                max-height: 2000px;
                opacity: 1;
            }

            .initiatives-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0 8px;
                border-top: 1px solid var(--border-light);
                margin-top: 12px;
            }

            .initiatives-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 12px;
            }

            .empty-initiatives {
                padding: 24px;
                text-align: center;
                background: var(--bg-main);
                border-radius: 8px;
                border: 2px dashed var(--border);
            }

            .empty-initiatives p {
                color: var(--text-muted);
                font-size: 13px;
                margin: 0;
            }

            .initiative-item {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 16px;
                background: linear-gradient(to bottom, #ffffff, #fafbfc);
                border: 1.5px solid var(--border);
                border-radius: 10px;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .initiative-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: var(--top-teal);
                border-radius: 10px 0 0 10px;
                opacity: 0;
                transition: opacity 0.25s ease;
            }

            .initiative-item:hover {
                border-color: var(--top-teal);
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.15), 0 2px 4px rgba(0, 0, 0, 0.05);
                transform: translateY(-2px);
            }

            .initiative-item:hover::before {
                opacity: 1;
            }

            .initiative-item.completed {
                background: linear-gradient(to bottom, #f0fdf4, #dcfce7);
                border-color: var(--success);
                box-shadow: 0 1px 3px rgba(34, 197, 94, 0.08);
            }

            .initiative-item.completed::before {
                background: var(--success);
                opacity: 1;
            }

            .initiative-item.completed .initiative-name {
                color: var(--success);
                text-decoration: line-through;
                text-decoration-thickness: 1.5px;
            }

            .initiative-item.overdue:not(.completed) {
                border-color: var(--danger);
                background: linear-gradient(to bottom, #fef2f2, #fee2e2);
                box-shadow: 0 1px 3px rgba(239, 68, 68, 0.08);
            }

            .initiative-item.overdue:not(.completed)::before {
                background: var(--danger);
                opacity: 1;
            }

            .initiative-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
                position: relative;
            }

            .initiative-checkbox input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
            }

            .initiative-checkbox .checkmark {
                width: 20px;
                height: 20px;
                border: 2px solid var(--border);
                border-radius: 4px;
                background: white;
                transition: all 0.2s ease;
            }

            .initiative-checkbox input:checked ~ .checkmark {
                background: var(--success);
                border-color: var(--success);
            }

            .initiative-checkbox input:checked ~ .checkmark::after {
                content: '';
                position: absolute;
                left: 6px;
                top: 2px;
                width: 5px;
                height: 10px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }

            .initiative-content {
                flex: 1;
                min-width: 0;
            }

            .initiative-header-row {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 6px;
            }

            .initiative-name {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                flex: 1;
                min-width: 0;
                line-height: 1.4;
            }

            .initiative-progress-inline {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }

            .initiative-progress-slider-inline {
                width: 120px;
                height: 6px;
                -webkit-appearance: none;
                appearance: none;
                border-radius: 3px;
                outline: none;
                cursor: pointer;
            }

            .initiative-progress-slider-inline::-webkit-slider-runnable-track {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: transparent;
            }

            .initiative-progress-slider-inline::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: white;
                border: 3px solid var(--top-teal);
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                transition: all 0.15s;
                margin-top: -5px;
            }

            .initiative-progress-slider-inline::-webkit-slider-thumb:hover {
                border-color: var(--top-blue);
                transform: scale(1.15);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            }

            .initiative-progress-slider-inline::-webkit-slider-thumb:active {
                cursor: grabbing;
                transform: scale(1.05);
            }

            .initiative-progress-slider-inline::-moz-range-track {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: var(--bg-main);
            }

            .initiative-progress-slider-inline::-moz-range-progress {
                height: 6px;
                border-radius: 3px;
                background: var(--top-teal);
            }

            .initiative-progress-slider-inline::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: white;
                border: 3px solid var(--top-teal);
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                transition: all 0.15s;
            }

            .initiative-progress-slider-inline::-moz-range-thumb:hover {
                border-color: var(--top-blue);
                transform: scale(1.15);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            }

            .initiative-progress-slider-inline::-moz-range-thumb:active {
                cursor: grabbing;
                transform: scale(1.05);
            }

            .progress-value-inline {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
                min-width: 40px;
                text-align: right;
            }

            .initiative-desc {
                font-size: 12px;
                color: var(--text-secondary);
                margin-bottom: 8px;
            }

            .initiative-meta {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                font-size: 12px;
            }

            .initiative-responsavel,
            .initiative-deadline {
                display: flex;
                align-items: center;
                gap: 4px;
                color: var(--text-muted);
            }

            .initiative-deadline.overdue {
                color: var(--danger);
                font-weight: 600;
            }

            .initiative-progress-section {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--border);
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }

            .progress-label {
                font-size: 12px;
                color: var(--text-muted);
                font-weight: 500;
            }

            .progress-value {
                font-size: 13px;
                color: var(--text-primary);
                font-weight: 600;
            }

            .progress-bar-container {
                height: 6px;
                background: var(--bg-main);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-bar {
                height: 100%;
                background: var(--top-teal);
                transition: width 0.3s ease;
                border-radius: 3px;
            }

            .initiative-progress-slider {
                width: 100%;
                height: 8px;
                -webkit-appearance: none;
                appearance: none;
                background: var(--bg-main);
                border-radius: 4px;
                outline: none;
                margin: 8px 0;
                cursor: pointer;
            }

            .initiative-progress-slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 8px;
                background: var(--bg-main);
                border-radius: 4px;
            }

            .initiative-progress-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: var(--top-teal);
                border: 3px solid white;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                transition: all 0.2s;
                margin-top: -6px;
            }

            .initiative-progress-slider::-webkit-slider-thumb:hover {
                background: var(--top-blue);
                transform: scale(1.15);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
            }

            .initiative-progress-slider::-webkit-slider-thumb:active {
                transform: scale(1.05);
            }

            .initiative-progress-slider::-moz-range-track {
                width: 100%;
                height: 8px;
                background: var(--bg-main);
                border-radius: 4px;
            }

            .initiative-progress-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: var(--top-teal);
                border: 3px solid white;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                transition: all 0.2s;
            }

            .initiative-progress-slider::-moz-range-thumb:hover {
                background: var(--top-blue);
                transform: scale(1.15);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
            }

            .initiative-progress-slider::-moz-range-thumb:active {
                transform: scale(1.05);
            }

            .initiative-actions {
                display: flex;
                gap: 4px;
            }

            /* Initiative Comment and Evidence Display */
            .initiative-extra-info {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px dashed var(--border);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .init-info-label {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .init-info-label svg {
                opacity: 0.7;
            }

            .init-comment-section {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .init-comment-text {
                margin: 0;
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.5;
                padding-left: 16px;
            }

            .init-evidence-section {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .init-evidence-list {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px;
                padding-left: 16px;
            }

            .init-evidence-item {
                display: inline;
            }

            .init-evidence-text {
                font-size: 13px;
                color: var(--text-secondary);
            }

            .init-evidence-file {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                color: var(--top-teal);
                text-decoration: none;
                padding: 2px 8px;
                background: var(--success-bg);
                border-radius: 4px;
                transition: all 0.2s;
            }

            .init-evidence-file:hover {
                background: var(--top-teal);
                color: white;
            }

            .init-evidence-separator {
                color: var(--text-muted);
                font-size: 10px;
            }

            .btn-icon-sm {
                width: 28px;
                height: 28px;
                border-radius: 6px;
                border: none;
                background: var(--bg-main);
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-icon-sm:hover {
                background: var(--top-blue);
                color: white;
            }

            .btn-icon-sm.delete:hover {
                background: var(--danger);
                color: white;
            }

            .btn-icon-sm svg {
                width: 14px;
                height: 14px;
            }

            /* Botão Outline */
            .btn-outline {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--text-secondary);
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-outline:hover {
                border-color: var(--top-teal);
                color: var(--top-teal);
                background: rgba(45, 212, 191, 0.05);
            }

            /* Quick Modals */
            .quick-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .quick-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .quick-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border);
            }

            .quick-modal-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .quick-modal-body {
                padding: 20px;
            }

            .quick-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 16px 20px;
                border-top: 1px solid var(--border);
                background: var(--bg-main);
                border-radius: 0 0 12px 12px;
            }

            /* Evidence Type Selector */
            .evidence-type-selector {
                display: flex;
                gap: 12px;
            }

            .evidence-type-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px 24px;
                border: 2px solid var(--border);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                flex: 1;
            }

            .evidence-type-option input {
                display: none;
            }

            .evidence-type-option svg {
                color: var(--text-muted);
                transition: color 0.2s;
            }

            .evidence-type-option span {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-secondary);
            }

            .evidence-type-option:hover {
                border-color: var(--top-teal);
            }

            .evidence-type-option.active {
                border-color: var(--top-teal);
                background: rgba(45, 212, 191, 0.05);
            }

            .evidence-type-option.active svg {
                color: var(--top-teal);
            }

            .evidence-type-option.active span {
                color: var(--top-teal);
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .okr-accordion-header {
                    padding: 12px 16px;
                }

                .okr-header-left {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .okr-info-wrapper {
                    width: 100%;
                }

                .okr-main-line {
                    flex-wrap: wrap;
                }

                .okr-meta-line {
                    font-size: 11px;
                    flex-wrap: wrap;
                }

                .okr-progress-line {
                    margin-top: 6px;
                }

                .okr-progress-bar-header {
                    height: 6px;
                }

                .okr-progress-text {
                    font-size: 12px;
                    min-width: 38px;
                }

                .okr-title-header {
                    font-size: 14px;
                }

                .kr-count {
                    font-size: 12px;
                }

                .kr-accordion-header {
                    padding: 12px;
                }

                .kr-header-left {
                    flex-wrap: wrap;
                }

                .kr-info-section {
                    width: 100%;
                }

                .kr-title-line {
                    width: 100%;
                }

                .kr-title-text {
                    font-size: 13px;
                }

                .kr-progress-line-header {
                    padding-left: 0;
                }

                .kr-progress-bar-small {
                    max-width: 100%;
                }

                .kr-status-badge {
                    font-size: 10px;
                    padding: 3px 8px;
                }

                .initiatives-section {
                    padding: 12px;
                }

                .initiative-item {
                    flex-direction: column;
                    gap: 8px;
                }

                .initiative-actions {
                    width: 100%;
                    justify-content: flex-end;
                }
            }

            /* Estilos para Evidências no Modal */
            .evidence-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .evidence-item {
                background: var(--bg-main);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 12px;
            }

            .evidence-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .evidence-type-badge {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .evidence-type-badge.text {
                background: var(--info-bg);
                color: var(--info);
            }

            .evidence-type-badge.link {
                background: var(--success-bg);
                color: var(--success);
            }

            .evidence-add-section {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* File Upload Styles */
            .file-upload-wrapper {
                position: relative;
            }

            .evidence-file-input {
                position: absolute;
                opacity: 0;
                width: 0;
                height: 0;
            }

            .file-upload-label {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 16px 20px;
                background: var(--bg-main);
                border: 2px dashed var(--border);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                color: var(--text-muted);
            }

            .file-upload-label:hover {
                border-color: var(--top-teal);
                background: #f0fdf9;
                color: var(--top-teal);
            }

            .file-upload-label svg {
                flex-shrink: 0;
            }

            .file-selected {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: var(--success-bg);
                border: 1px solid var(--success);
                border-radius: 8px;
                color: var(--success);
            }

            .file-selected .file-name {
                font-weight: 600;
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .file-selected .file-size {
                font-size: 12px;
                opacity: 0.8;
            }

            .evidence-type-badge.file {
                background: var(--warning-bg);
                color: var(--warning);
            }

            /* Existing file display in edit modal */
            .existing-file-display {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: var(--bg-main);
                border: 1px solid var(--border);
                border-radius: 8px;
            }

            .existing-file-display svg {
                flex-shrink: 0;
                color: var(--top-teal);
            }

            .existing-file-name {
                flex: 1;
                font-weight: 500;
                color: var(--text-main);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .existing-file-display .btn-xs {
                padding: 4px 10px;
                font-size: 12px;
            }

            /* ============================================ */
            /* NOVO LAYOUT DO KR EXPANDIDO */
            /* ============================================ */

            .kr-body-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                background: linear-gradient(to bottom, #fafbfc, white);
            }

            .kr-top-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            @media (max-width: 900px) {
                .kr-top-row {
                    grid-template-columns: 1fr;
                }
            }

            .kr-detail-section {
                background: white;
                border: 1px solid var(--border);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .kr-detail-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 18px;
                background: var(--bg-main);
                border-bottom: 1px solid var(--border-light);
                font-size: 13px;
                font-weight: 600;
                color: var(--top-blue);
            }

            .kr-detail-header svg {
                color: var(--top-teal);
                flex-shrink: 0;
            }

            .kr-detail-header span {
                flex-shrink: 0;
            }

            .kr-count-badge {
                background: var(--top-teal);
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                margin-left: 4px;
            }

            .kr-detail-body {
                padding: 18px;
                min-height: 60px;
            }

            .kr-comment-text {
                margin: 0;
                font-size: 14px;
                color: var(--text-secondary);
                line-height: 1.6;
                white-space: pre-wrap;
            }

            .kr-empty-text {
                margin: 0;
                font-size: 13px;
                color: var(--text-muted);
                font-style: italic;
                text-align: center;
                padding: 10px 0;
            }

            /* Lista de Evidências */
            .kr-evidence-list {
                display: flex;
                flex-direction: column;
                gap: 0;
            }

            .kr-evidence-item {
                padding: 8px 0;
            }

            .kr-evidence-item.text {
                padding: 4px 0;
            }

            .kr-evidence-divider {
                height: 1px;
                background: linear-gradient(to right, transparent, var(--border), transparent);
                margin: 4px 0;
            }

            .kr-evidence-text {
                margin: 0;
                font-size: 14px;
                color: var(--text-secondary);
                line-height: 1.6;
                white-space: pre-wrap;
            }

            .kr-evidence-file {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: var(--bg-main);
                border: 1px solid var(--border);
                border-radius: 8px;
                transition: all 0.2s;
            }

            .kr-evidence-file:hover {
                border-color: var(--top-teal);
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }

            .kr-evidence-file .file-icon {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                background: var(--info-bg);
                color: var(--info);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .kr-evidence-file .file-icon svg {
                width: 20px;
                height: 20px;
            }

            .kr-evidence-file .file-info {
                flex: 1;
                min-width: 0;
            }

            .kr-evidence-file .file-download-link {
                display: block;
                font-weight: 600;
                color: var(--text-primary);
                text-decoration: none;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .kr-evidence-file .file-download-link:hover {
                color: var(--top-teal);
            }

            .kr-evidence-file .file-size-display {
                font-size: 12px;
                color: var(--text-muted);
            }

            /* Grid de Evidências (alternativo para tela cheia) */
            .kr-evidence-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 14px;
            }

            .kr-evidence-card {
                display: flex;
                gap: 12px;
                padding: 14px;
                background: var(--bg-main);
                border: 1px solid var(--border-light);
                border-radius: 10px;
                transition: all 0.2s ease;
            }

            .kr-evidence-card:hover {
                border-color: var(--top-teal);
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.1);
            }

            .kr-evidence-card.text {
                border-left: 3px solid var(--info);
            }

            .kr-evidence-card.link {
                border-left: 3px solid var(--success);
            }

            .evidence-card-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .kr-evidence-card.text .evidence-card-icon {
                background: var(--info-bg);
                color: var(--info);
            }

            .kr-evidence-card.link .evidence-card-icon {
                background: var(--success-bg);
                color: var(--success);
            }

            .evidence-card-icon svg {
                width: 18px;
                height: 18px;
            }

            .evidence-card-content {
                flex: 1;
                min-width: 0;
            }

            .evidence-card-type {
                display: inline-block;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-muted);
                margin-bottom: 4px;
            }

            .evidence-card-text {
                margin: 0;
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.5;
                word-break: break-word;
            }

            .evidence-card-link {
                font-size: 13px;
                color: var(--top-teal);
                text-decoration: none;
                word-break: break-all;
                display: block;
            }

            .evidence-card-link:hover {
                text-decoration: underline;
            }

            /* Botão XS */
            .btn-xs {
                padding: 4px 10px;
                font-size: 11px;
                border-radius: 6px;
            }

            .btn-xs svg {
                width: 12px;
                height: 12px;
            }

            /* Ajuste da lista de iniciativas dentro do novo layout */
            .kr-detail-body .initiatives-list {
                margin: 0;
            }

            .kr-detail-body .initiative-item {
                background: var(--bg-main);
                margin-bottom: 10px;
            }

            .kr-detail-body .initiative-item:last-child {
                margin-bottom: 0;
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.OKRsPage = OKRsPage;
export { OKRsPage };
