import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { AuthService } from '../../services/auth.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
import { Modal } from '../../Components/Modal.js';

// Página do Comitê de Aprovação - Kanban
const ApprovalPage = {
    // Retorna array de nomes de departamentos do usuário
    getUserDepartmentNames(user) {
        if (!user) return [];

        if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments.map(d => d.nome).filter(Boolean);
        }

        if (user.departamento?.nome) {
            return [user.departamento.nome];
        }

        return [];
    },

    async render() {
        const content = document.getElementById('content');
        const currentUser = AuthService.getCurrentUser();
        const isAdmin = currentUser && currentUser.tipo === 'admin';
        const userDepartmentNames = this.getUserDepartmentNames(currentUser);

        let okrs = await OKR.getAll();

        // Filtra OKRs por departamento se não for admin
        if (!isAdmin && userDepartmentNames.length > 0) {
            okrs = okrs.filter(o => userDepartmentNames.includes(o.department));
        }

        // Estatísticas
        const stats = {
            total: okrs.length,
            pending: okrs.filter(o => o.status === 'pending').length,
            adjust: okrs.filter(o => o.status === 'adjust').length,
            approved: okrs.filter(o => o.status === 'approved').length,
            completed: okrs.filter(o => o.status === 'completed').length,
            homologated: okrs.filter(o => o.status === 'homologated').length
        };

        content.innerHTML = `
            <div class="approval-page">
                <!-- Header -->
                <div class="approval-header">
                    <div class="approval-header-info">
                        <h1 class="approval-title">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                            </svg>
                            Comitê de Aprovação
                        </h1>
                        <p class="approval-subtitle">
                            Gerencie o fluxo de aprovação dos OKRs
                            ${!isAdmin && userDepartmentNames.length > 0 ? `<span class="dept-badge">${userDepartmentNames.join(', ')}</span>` : ''}
                        </p>
                    </div>
                </div>

                <!-- Kanban Container -->
                <div class="kanban-container">
                    <div class="kanban-scroll-area">
                        <div id="kanban-board" class="kanban-board"></div>
                    </div>
                </div>
            </div>
        `;

        await this.renderKanban(okrs);
        this.addStyles();
        this.initScrollBehavior();

        // Força remoção do scroll dos containers pai
        const contentEl = document.getElementById('content');
        if (contentEl) {
            contentEl.style.overflow = 'hidden';
        }
        const mainEl = document.querySelector('.main');
        if (mainEl) {
            mainEl.style.overflow = 'hidden';
        }
    },

    initScrollBehavior() {
        const wrapper = document.querySelector('.kanban-scroll-area');
        if (!wrapper) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            // Não interferir com cliques em cards ou botões
            if (e.target.closest('.okr-card') || e.target.closest('button')) return;
            isDown = true;
            wrapper.classList.add('grabbing');
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.classList.remove('grabbing');
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.classList.remove('grabbing');
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 2;
            wrapper.scrollLeft = scrollLeft - walk;
        });

        // Scroll horizontal apenas quando fora das colunas
        wrapper.addEventListener('wheel', (e) => {
            const colBody = e.target.closest('.kanban-col-body');

            // Se está dentro de uma coluna, deixa o scroll vertical natural
            if (colBody) {
                e.stopPropagation();
                return; // Não interfere - cada coluna scrolla sozinha
            }

            // Fora das colunas - converte para scroll horizontal
            if (e.deltaY !== 0) {
                e.preventDefault();
                wrapper.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    },

    async renderKanban(okrs) {
        const container = document.getElementById('kanban-board');

        const columns = [
            {
                key: 'pending',
                title: 'Aguardando Revisão',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>`,
                color: '#f59e0b',
                bg: '#fef3c7'
            },
            {
                key: 'adjust',
                title: 'Ajustes Solicitados',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>`,
                color: '#ef4444',
                bg: '#fee2e2'
            },
            {
                key: 'approved',
                title: 'Em Andamento',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>`,
                color: '#3b82f6',
                bg: '#dbeafe'
            },
            {
                key: 'completed',
                title: 'Concluídos',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`,
                color: '#10b981',
                bg: '#d1fae5'
            },
            {
                key: 'homologated',
                title: 'Homologados',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>`,
                color: '#8b5cf6',
                bg: '#ede9fe'
            }
        ];

        let html = '';

        for (const col of columns) {
            const items = okrs.filter(okr => okr.status === col.key);
            const cardsHTML = items.length === 0
                ? `<div class="kanban-empty-state">
                        <div class="empty-icon">${col.icon}</div>
                        <p>Nenhum OKR</p>
                   </div>`
                : (await Promise.all(items.map(okr => this.renderKanbanCard(okr, col)))).join('');

            html += `
                <div class="kanban-column" data-status="${col.key}">
                    <div class="kanban-col-header" style="--col-color: ${col.color}; --col-bg: ${col.bg}">
                        <div class="col-header-icon">${col.icon}</div>
                        <div class="col-header-info">
                            <h3 class="col-title">${col.title}</h3>
                            <span class="col-count">${items.length} ${items.length === 1 ? 'OKR' : 'OKRs'}</span>
                        </div>
                    </div>
                    <div class="kanban-col-body">
                        ${cardsHTML}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    async renderKanbanCard(okr, column) {
        const objective = await okr.getObjective();
        const progressColor = okr.progress >= 70 ? '#10b981' : okr.progress >= 40 ? '#f59e0b' : '#ef4444';

        return `
            <div class="okr-card" style="--card-accent: ${column.color}">
                <div class="okr-card-top">
                    <span class="okr-dept">${okr.department}</span>
                    <span class="okr-progress-badge" style="background: ${progressColor}15; color: ${progressColor}">
                        ${okr.progress}%
                    </span>
                </div>

                <h4 class="okr-title">${okr.title}</h4>

                <div class="okr-objective">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>${objective?.text ? (objective.text.length > 60 ? objective.text.substring(0, 60) + '...' : objective.text) : 'N/A'}</span>
                </div>

                <div class="okr-meta">
                    <div class="okr-krs">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        ${okr.keyResults.length} Key Results
                    </div>
                </div>

                <div class="okr-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${okr.progress}%; background: ${progressColor}"></div>
                    </div>
                </div>

                ${okr.committeeComment ? `
                    <div class="okr-comment">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span>${okr.committeeComment}</span>
                    </div>
                ` : ''}

                <div class="okr-actions">
                    ${this.renderActions(okr, column.key)}
                </div>
            </div>
        `;
    },

    renderActions(okr, currentStatus) {
        const actions = {
            pending: [
                { action: 'adjust', label: 'Solicitar Ajuste', icon: 'edit', variant: 'danger' },
                { action: 'approved', label: 'Aprovar', icon: 'check', variant: 'success' }
            ],
            adjust: [
                { action: 'pending', label: 'Voltar p/ Revisão', icon: 'arrow-left', variant: 'secondary' },
                { action: 'approved', label: 'Aprovar', icon: 'check', variant: 'success' }
            ],
            approved: [
                { action: 'completed', label: 'Marcar Concluído', icon: 'check-circle', variant: 'success' }
            ],
            completed: [
                { action: 'homologated', label: 'Homologar', icon: 'award', variant: 'primary' }
            ],
            homologated: []
        };

        const icons = {
            'edit': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            'check': '<path d="M20 6L9 17l-5-5"/>',
            'check-circle': '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
            'award': '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>'
        };

        const currentActions = actions[currentStatus] || [];

        if (currentActions.length === 0) {
            return `
                <div class="actions-completed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Fluxo finalizado
                </div>
            `;
        }

        return currentActions.map(a => `
            <button class="action-btn ${a.variant}" onclick="ApprovalPage.changeStatus('${okr.id}', '${a.action}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${icons[a.icon]}
                </svg>
                ${a.label}
            </button>
        `).join('');
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

        okr.changeStatus(newStatus, comment);
        await okr.save();

        await this.render();

        if (window.DepartmentsPage?.showToast) {
            DepartmentsPage.showToast('Status atualizado com sucesso!', 'success');
        }
    },

    addStyles() {
        if (document.getElementById('approval-styles-v2')) return;

        const style = document.createElement('style');
        style.id = 'approval-styles-v2';
        style.textContent = `
            /* Force ALL parent containers to not scroll */
            .main:has(.approval-page),
            .content:has(.approval-page) {
                overflow: hidden !important;
            }

            #content:has(.approval-page) {
                overflow: hidden !important;
                display: flex;
                flex-direction: column;
            }

            .approval-page {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden !important;
            }

            /* Header - fixed */
            .approval-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 20px;
                flex-shrink: 0;
            }

            .approval-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 24px;
                font-weight: 700;
                color: var(--top-blue);
                margin: 0 0 8px 0;
            }

            .approval-title svg {
                color: var(--top-teal);
            }

            .approval-subtitle {
                color: var(--text-muted);
                font-size: 14px;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .dept-badge {
                background: var(--top-teal);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }

            .approval-stats {
                display: flex;
                align-items: center;
                gap: 16px;
                background: white;
                padding: 12px 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }

            .stat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 60px;
            }

            .stat-number {
                font-size: 24px;
                font-weight: 700;
                color: var(--text-primary);
            }

            .stat-label {
                font-size: 11px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .stat-item.pending .stat-number { color: #f59e0b; }
            .stat-item.adjust .stat-number { color: #ef4444; }
            .stat-item.approved .stat-number { color: #3b82f6; }

            .stat-divider {
                width: 1px;
                height: 40px;
                background: var(--border);
            }

            /* Kanban Container - contains the scroll */
            .kanban-container {
                flex: 1;
                min-height: 0;
                position: relative;
                background: var(--bg-main);
                border-radius: 16px;
                overflow: hidden;
            }

            /* Scroll Area - ONLY this scrolls horizontally */
            .kanban-scroll-area {
                width: 100%;
                height: 100%;
                overflow-x: auto;
                overflow-y: hidden;
                cursor: grab;
                scroll-behavior: smooth;
                padding: 16px;
                padding-bottom: 24px;
            }

            .kanban-scroll-area.grabbing {
                cursor: grabbing;
                scroll-behavior: auto;
            }

            .kanban-scroll-area::-webkit-scrollbar {
                height: 10px;
            }

            .kanban-scroll-area::-webkit-scrollbar-track {
                background: var(--border-light);
                border-radius: 5px;
            }

            .kanban-scroll-area::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, var(--top-teal), var(--top-blue));
                border-radius: 5px;
            }

            .kanban-scroll-area::-webkit-scrollbar-thumb:hover {
                background: var(--top-blue);
            }

            /* Kanban board */
            .kanban-board {
                display: inline-flex;
                gap: 16px;
                height: 100%;
                min-width: min-content;
            }

            /* Kanban column */
            .kanban-column {
                flex: 0 0 300px;
                background: white;
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 400px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                overflow: hidden;
            }

            .kanban-col-header {
                padding: 14px 16px;
                background: var(--col-bg);
                border-radius: 12px 12px 0 0;
                border-bottom: 3px solid var(--col-color);
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
            }

            .col-header-icon {
                width: 36px;
                height: 36px;
                background: white;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--col-color);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .col-title {
                font-size: 13px;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .col-count {
                font-size: 11px;
                color: var(--text-muted);
            }

            .kanban-col-body {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                overflow-x: hidden;
                display: flex;
                flex-direction: column;
                gap: 10px;
                min-height: 0;
            }

            .kanban-col-body::-webkit-scrollbar {
                width: 6px;
            }

            .kanban-col-body::-webkit-scrollbar-track {
                background: var(--bg-main);
                border-radius: 3px;
            }

            .kanban-col-body::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 3px;
            }

            .kanban-col-body::-webkit-scrollbar-thumb:hover {
                background: var(--text-muted);
            }

            /* Empty state */
            .kanban-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: var(--text-muted);
                text-align: center;
            }

            .empty-icon {
                opacity: 0.3;
                margin-bottom: 12px;
            }

            .empty-icon svg {
                width: 40px;
                height: 40px;
            }

            /* OKR Card */
            .okr-card {
                background: var(--bg-main);
                border-radius: 10px;
                padding: 14px;
                border: 1px solid var(--border);
                border-left: 4px solid var(--card-accent);
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .okr-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                background: white;
            }

            .okr-card-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .okr-dept {
                font-size: 10px;
                font-weight: 700;
                color: var(--top-teal);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .okr-progress-badge {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 20px;
            }

            .okr-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 10px 0;
                line-height: 1.4;
            }

            .okr-objective {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                padding: 8px;
                background: white;
                border-radius: 6px;
                font-size: 11px;
                color: var(--text-secondary);
                margin-bottom: 10px;
            }

            .okr-objective svg {
                flex-shrink: 0;
                margin-top: 1px;
                color: var(--top-teal);
                width: 12px;
                height: 12px;
            }

            .okr-meta {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px;
            }

            .okr-krs {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: var(--text-muted);
            }

            .okr-krs svg {
                width: 12px;
                height: 12px;
            }

            .okr-progress-bar {
                margin-bottom: 10px;
            }

            .progress-track {
                height: 5px;
                background: white;
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.3s ease;
            }

            .okr-comment {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                padding: 8px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 6px;
                font-size: 11px;
                color: #dc2626;
                margin-bottom: 10px;
            }

            .okr-comment svg {
                flex-shrink: 0;
                margin-top: 1px;
            }

            /* Actions */
            .okr-actions {
                display: flex;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid var(--border-light);
            }

            .action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 12px;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-btn.success {
                background: #d1fae5;
                color: #059669;
            }
            .action-btn.success:hover {
                background: #a7f3d0;
            }

            .action-btn.danger {
                background: #fee2e2;
                color: #dc2626;
            }
            .action-btn.danger:hover {
                background: #fecaca;
            }

            .action-btn.secondary {
                background: var(--bg-main);
                color: var(--text-secondary);
            }
            .action-btn.secondary:hover {
                background: var(--border);
            }

            .action-btn.primary {
                background: #dbeafe;
                color: #2563eb;
            }
            .action-btn.primary:hover {
                background: #bfdbfe;
            }

            .actions-completed {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 8px;
                color: var(--text-muted);
                font-size: 12px;
                width: 100%;
            }

            .actions-completed svg {
                color: #10b981;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .approval-header {
                    flex-direction: column;
                }

                .approval-stats {
                    width: 100%;
                    justify-content: space-around;
                }

                .kanban-column {
                    flex: 0 0 280px;
                }
            }
        `;
        document.head.appendChild(style);

        // Remove old styles
        const oldStyle = document.getElementById('approval-styles');
        if (oldStyle) oldStyle.remove();
    }
};

// Expõe globalmente
window.ApprovalPage = ApprovalPage;
export { ApprovalPage };
