import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { AuthService } from '../../services/auth.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
import { Modal } from '../../Components/Modal.js';

// Página do Comitê de Aprovação - Kanban
const ApprovalPage = {
    currentMobileTab: 'pending', // Tab ativo no mobile

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
            <div class="page-gio approval-page-gio">
                <!-- Mobile Tabs Navigation -->
                <div class="mobile-tabs-nav-gio">
                    <button class="mobile-tab-btn-gio ${this.currentMobileTab === 'pending' ? 'active' : ''}"
                            data-status="pending"
                            onclick="ApprovalPage.switchMobileTab('pending')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        <span class="tab-label">Revisão</span>
                        <span class="tab-count">${stats.pending}</span>
                    </button>
                    <button class="mobile-tab-btn-gio ${this.currentMobileTab === 'adjust' ? 'active' : ''}"
                            data-status="adjust"
                            onclick="ApprovalPage.switchMobileTab('adjust')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <span class="tab-label">Ajustes</span>
                        <span class="tab-count">${stats.adjust}</span>
                    </button>
                    <button class="mobile-tab-btn-gio ${this.currentMobileTab === 'approved' ? 'active' : ''}"
                            data-status="approved"
                            onclick="ApprovalPage.switchMobileTab('approved')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <span class="tab-label">Andamento</span>
                        <span class="tab-count">${stats.approved}</span>
                    </button>
                    <button class="mobile-tab-btn-gio ${this.currentMobileTab === 'completed' ? 'active' : ''}"
                            data-status="completed"
                            onclick="ApprovalPage.switchMobileTab('completed')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="tab-label">Concluídos</span>
                        <span class="tab-count">${stats.completed}</span>
                    </button>
                    <button class="mobile-tab-btn-gio ${this.currentMobileTab === 'homologated' ? 'active' : ''}"
                            data-status="homologated"
                            onclick="ApprovalPage.switchMobileTab('homologated')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <span class="tab-label">Homologados</span>
                        <span class="tab-count">${stats.homologated}</span>
                    </button>
                </div>

                <!-- Kanban Container -->
                <div class="kanban-container-gio">
                    <div class="kanban-scroll-area-gio">
                        <div id="kanban-board" class="kanban-board-gio"></div>
                    </div>
                </div>
            </div>
        `;

        await this.renderKanban(okrs);
        this.addStyles();
        this.initScrollBehavior();
        this.initMobileTabs(); // Inicializa comportamento mobile

        // Força configuração de overflow dependendo do dispositivo
        const isMobile = window.innerWidth <= 768;
        const contentEl = document.getElementById('content');
        const mainEl = document.querySelector('.main');

        if (isMobile) {
            // Mobile: Permite scroll vertical normal
            if (contentEl) contentEl.style.overflow = '';
            if (mainEl) mainEl.style.overflow = '';
        } else {
            // Desktop: Esconde overflow (Kanban tem scroll próprio)
            if (contentEl) contentEl.style.overflow = 'hidden';
            if (mainEl) mainEl.style.overflow = 'hidden';
        }
    },

    // Inicializa tabs mobile
    initMobileTabs() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Mostra apenas a coluna da tab ativa
            this.switchMobileTab(this.currentMobileTab);
        }
    },

    initScrollBehavior() {
        const wrapper = document.querySelector('.kanban-scroll-area-gio');
        if (!wrapper) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            // Não interferir com cliques em cards ou botões
            if (e.target.closest('.okr-card-gio') || e.target.closest('button')) return;
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
            const colBody = e.target.closest('.kanban-col-body-gio');

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
                ? `<div class="kanban-empty-state-gio">
                        <div class="empty-icon-gio">${col.icon}</div>
                        <p>Nenhum OKR</p>
                   </div>`
                : (await Promise.all(items.map(okr => this.renderKanbanCard(okr, col)))).join('');

            html += `
                <div class="kanban-column-gio" data-status="${col.key}">
                    <div class="kanban-col-header-gio" style="--col-color: ${col.color}; --col-bg: ${col.bg}">
                        <div class="col-header-icon-gio">${col.icon}</div>
                        <div class="col-header-info-gio">
                            <h3 class="col-title-gio">${col.title}</h3>
                            <span class="col-count-gio">${items.length} ${items.length === 1 ? 'OKR' : 'OKRs'}</span>
                        </div>
                    </div>
                    <div class="kanban-col-body-gio">
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
            <div class="okr-card-gio" style="--card-accent: ${column.color}">
                <div class="okr-card-top-gio">
                    <span class="okr-dept-gio">${okr.department}</span>
                    <span class="okr-progress-badge-gio" style="background: ${progressColor}15; color: ${progressColor}">
                        ${okr.progress}%
                    </span>
                </div>

                <h4 class="okr-title-gio">${okr.title}</h4>

                <div class="okr-objective-gio">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>${objective?.text ? (objective.text.length > 60 ? objective.text.substring(0, 60) + '...' : objective.text) : 'N/A'}</span>
                </div>

                <div class="okr-meta-gio">
                    <div class="okr-krs-gio">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        ${okr.keyResults.length} Key Results
                    </div>
                </div>

                <div class="okr-progress-bar-gio">
                    <div class="progress-track-gio">
                        <div class="progress-fill-gio" style="width: ${okr.progress}%; background: ${progressColor}"></div>
                    </div>
                </div>

                ${okr.committeeComment ? `
                    <div class="okr-comment-gio">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span>${okr.committeeComment}</span>
                    </div>
                ` : ''}

                <div class="okr-actions-gio">
                    ${this.renderActions(okr, column.key)}
                </div>
            </div>
        `;
    },

    renderActions(okr, currentStatus) {
        const currentUser = AuthService.getCurrentUser();
        const isConsultor = currentUser && currentUser.tipo === 'consultor';

        // Ações completas para admin
        const adminActions = {
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

        // Ações limitadas para consultor: apenas solicitar ajuste em OKRs pendentes
        const consultorActions = {
            pending: [
                { action: 'adjust', label: 'Solicitar Ajuste', icon: 'edit', variant: 'danger' }
            ],
            adjust: [],
            approved: [],
            completed: [],
            homologated: []
        };

        const actions = isConsultor ? consultorActions : adminActions;

        const icons = {
            'edit': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            'check': '<path d="M20 6L9 17l-5-5"/>',
            'check-circle': '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
            'award': '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>'
        };

        const currentActions = actions[currentStatus] || [];

        if (currentActions.length === 0) {
            // Mensagem diferente para consultor vs fluxo finalizado
            if (isConsultor && currentStatus !== 'homologated') {
                return `
                    <div class="actions-completed-gio" style="color: #6b7280; font-style: italic;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        Apenas visualização
                    </div>
                `;
            }
            return `
                <div class="actions-completed-gio">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Fluxo finalizado
                </div>
            `;
        }

        return currentActions.map(a => `
            <button class="action-btn-gio ${a.variant}" onclick="ApprovalPage.changeStatus('${okr.id}', '${a.action}')">
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

    // Função para trocar tabs no mobile
    switchMobileTab(status) {
        this.currentMobileTab = status;

        // Atualiza botões ativos
        document.querySelectorAll('.mobile-tab-btn-gio').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });

        // Animação suave ao trocar tabs
        const board = document.querySelector('.kanban-board-gio');
        if (board) {
            board.style.opacity = '0';
            board.style.transform = 'translateY(10px)';
        }

        setTimeout(() => {
            // Mostra/esconde colunas correspondentes
            document.querySelectorAll('.kanban-column-gio').forEach(col => {
                if (col.dataset.status === status) {
                    col.style.display = 'flex';
                } else {
                    col.style.display = 'none';
                }
            });

            // Anima de volta
            if (board) {
                board.style.transition = 'all 0.3s ease';
                board.style.opacity = '1';
                board.style.transform = 'translateY(0)';
            }
        }, 150);

        // Scroll para o topo suavemente
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    addStyles() {
        if (document.getElementById('approval-styles-gio')) return;

        const style = document.createElement('style');
        style.id = 'approval-styles-gio';
        style.textContent = `
            /* Force ALL parent containers to not scroll */
            .main:has(.approval-page-gio),
            .content:has(.approval-page-gio) {
                overflow: hidden !important;
            }

            #content:has(.approval-page-gio) {
                overflow: hidden !important;
                display: flex;
                flex-direction: column;
            }

            .approval-page-gio {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                overflow: hidden !important;
                background: #f5f9ff;
            }

            /* Kanban Container - contains the scroll */
            .kanban-container-gio {
                flex: 1;
                min-height: 0;
                position: relative;
                background: #f5f9ff;
                border-radius: 16px;
                overflow: hidden;
            }

            /* Scroll Area - ONLY this scrolls horizontally */
            .kanban-scroll-area-gio {
                width: 100%;
                height: 100%;
                overflow-x: auto;
                overflow-y: hidden;
                cursor: grab;
                scroll-behavior: smooth;
                padding: 16px;
                padding-bottom: 24px;
            }

            .kanban-scroll-area-gio.grabbing {
                cursor: grabbing;
                scroll-behavior: auto;
            }

            .kanban-scroll-area-gio::-webkit-scrollbar {
                height: 10px;
            }

            .kanban-scroll-area-gio::-webkit-scrollbar-track {
                background: #e5e7eb;
                border-radius: 5px;
            }

            .kanban-scroll-area-gio::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #12b0a0, #1e6076);
                border-radius: 5px;
            }

            .kanban-scroll-area-gio::-webkit-scrollbar-thumb:hover {
                background: #1e6076;
            }

            /* Kanban board */
            .kanban-board-gio {
                display: inline-flex;
                gap: 16px;
                height: 100%;
                min-width: min-content;
            }

            /* Kanban column */
            .kanban-column-gio {
                flex: 0 0 300px;
                background: white;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 400px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                overflow: hidden;
            }

            .kanban-col-header-gio {
                padding: 16px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                border-radius: 16px 16px 0 0;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
            }

            .col-header-icon-gio {
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.15);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .col-header-icon-gio svg {
                color: white;
            }

            .col-title-gio {
                font-size: 14px;
                font-weight: 700;
                color: white;
                margin: 0;
            }

            .col-count-gio {
                font-size: 12px;
                color: rgba(255,255,255,0.8);
            }

            .kanban-col-body-gio {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                overflow-x: hidden;
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-height: 0;
                background: #f5f9ff;
            }

            .kanban-col-body-gio::-webkit-scrollbar {
                width: 6px;
            }

            .kanban-col-body-gio::-webkit-scrollbar-track {
                background: #e5e7eb;
                border-radius: 3px;
            }

            .kanban-col-body-gio::-webkit-scrollbar-thumb {
                background: #12b0a0;
                border-radius: 3px;
            }

            .kanban-col-body-gio::-webkit-scrollbar-thumb:hover {
                background: #0d9488;
            }

            /* Empty state */
            .kanban-empty-state-gio {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: #6b7280;
                text-align: center;
            }

            .empty-icon-gio {
                opacity: 0.3;
                margin-bottom: 12px;
            }

            .empty-icon-gio svg {
                width: 40px;
                height: 40px;
            }

            /* OKR Card */
            .okr-card-gio {
                background: white;
                border-radius: 12px;
                padding: 16px;
                border: 1px solid #e5e7eb;
                border-left: 4px solid var(--card-accent);
                transition: all 0.2s ease;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            }

            .okr-card-gio:hover {
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }

            .okr-card-top-gio {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .okr-dept-gio {
                font-size: 10px;
                font-weight: 700;
                color: white;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                padding: 4px 10px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .okr-progress-badge-gio {
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 6px;
            }

            .okr-title-gio {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 12px 0;
                line-height: 1.5;
            }

            .okr-objective-gio {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 10px 12px;
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.08) 0%, rgba(18, 176, 160, 0.03) 100%);
                border-radius: 8px;
                border-left: 3px solid #12b0a0;
                font-size: 12px;
                color: #4b5563;
                margin-bottom: 12px;
            }

            .okr-objective-gio svg {
                flex-shrink: 0;
                margin-top: 1px;
                color: #12b0a0;
                width: 14px;
                height: 14px;
            }

            .okr-meta-gio {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .okr-krs-gio {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #1e6076;
                font-weight: 500;
                padding: 6px 10px;
                background: rgba(30, 96, 118, 0.08);
                border-radius: 6px;
            }

            .okr-krs-gio svg {
                width: 14px;
                height: 14px;
            }

            .okr-progress-bar-gio {
                margin-bottom: 12px;
            }

            .progress-track-gio {
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill-gio {
                height: 100%;
                border-radius: 3px;
                transition: width 0.3s ease;
            }

            .okr-comment-gio {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 10px 12px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-left: 3px solid #ef4444;
                border-radius: 8px;
                font-size: 12px;
                color: #dc2626;
                margin-bottom: 12px;
            }

            .okr-comment-gio svg {
                flex-shrink: 0;
                margin-top: 1px;
            }

            /* Actions */
            .okr-actions-gio {
                display: flex;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
            }

            .action-btn-gio {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-btn-gio.success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
            }
            .action-btn-gio.success:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }

            .action-btn-gio.danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
            }
            .action-btn-gio.danger:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            }

            .action-btn-gio.secondary {
                background: #f3f4f6;
                color: #4b5563;
                border: 1px solid #e5e7eb;
            }
            .action-btn-gio.secondary:hover {
                background: #e5e7eb;
            }

            .action-btn-gio.primary {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 2px 6px rgba(18, 176, 160, 0.3);
            }
            .action-btn-gio.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.4);
            }

            .actions-completed-gio {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px;
                color: #6b7280;
                font-size: 12px;
                width: 100%;
            }

            .actions-completed-gio svg {
                color: #10b981;
            }

            /* Responsive */
            /* Esconde tabs no desktop */
            .mobile-tabs-nav-gio {
                display: none;
            }

            /* RESPONSIVO MOBILE */
            @media (max-width: 768px) {
                /* Mobile Tabs Navigation - MOSTRA */
                .mobile-tabs-nav-gio {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 16px;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    padding-bottom: 4px;
                }

                .mobile-tabs-nav-gio::-webkit-scrollbar {
                    display: none;
                }

                .mobile-tab-btn-gio {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 10px 12px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    min-width: 80px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                }

                .mobile-tab-btn-gio svg {
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .mobile-tab-btn-gio .tab-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #4b5563;
                    text-align: center;
                    line-height: 1.2;
                }

                .mobile-tab-btn-gio .tab-count {
                    font-size: 12px;
                    font-weight: 700;
                    color: #6b7280;
                }

                /* Tab ativa */
                .mobile-tab-btn-gio {
                    position: relative;
                }

                .mobile-tab-btn-gio.active {
                    border-color: #12b0a0;
                    background: linear-gradient(135deg, rgba(18, 176, 160, 0.12) 0%, rgba(18, 176, 160, 0.06) 100%);
                    box-shadow: 0 4px 12px rgba(18, 176, 160, 0.2);
                }

                /* Indicador inferior da tab ativa */
                .mobile-tab-btn-gio.active::after {
                    content: '';
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 30px;
                    height: 3px;
                    background: #12b0a0;
                    border-radius: 2px 2px 0 0;
                }

                .mobile-tab-btn-gio.active svg {
                    color: #12b0a0;
                }

                .mobile-tab-btn-gio.active .tab-label {
                    color: #12b0a0;
                }

                .mobile-tab-btn-gio.active .tab-count {
                    color: white;
                    background: #12b0a0;
                    padding: 2px 8px;
                    border-radius: 10px;
                }

                /* Cores específicas por status - Tabs */
                .mobile-tab-btn-gio[data-status="pending"].active {
                    border-color: #f59e0b;
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%);
                }

                .mobile-tab-btn-gio[data-status="pending"].active::after {
                    background: #f59e0b;
                }

                .mobile-tab-btn-gio[data-status="pending"].active svg,
                .mobile-tab-btn-gio[data-status="pending"].active .tab-label {
                    color: #f59e0b;
                }

                .mobile-tab-btn-gio[data-status="pending"].active .tab-count {
                    background: #f59e0b;
                }

                .mobile-tab-btn-gio[data-status="adjust"].active {
                    border-color: #ef4444;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 100%);
                }

                .mobile-tab-btn-gio[data-status="adjust"].active::after {
                    background: #ef4444;
                }

                .mobile-tab-btn-gio[data-status="adjust"].active svg,
                .mobile-tab-btn-gio[data-status="adjust"].active .tab-label {
                    color: #ef4444;
                }

                .mobile-tab-btn-gio[data-status="adjust"].active .tab-count {
                    background: #ef4444;
                }

                .mobile-tab-btn-gio[data-status="approved"].active {
                    border-color: #3b82f6;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%);
                }

                .mobile-tab-btn-gio[data-status="approved"].active::after {
                    background: #3b82f6;
                }

                .mobile-tab-btn-gio[data-status="approved"].active svg,
                .mobile-tab-btn-gio[data-status="approved"].active .tab-label {
                    color: #3b82f6;
                }

                .mobile-tab-btn-gio[data-status="approved"].active .tab-count {
                    background: #3b82f6;
                }

                .mobile-tab-btn-gio[data-status="completed"].active {
                    border-color: #10b981;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.06) 100%);
                }

                .mobile-tab-btn-gio[data-status="completed"].active::after {
                    background: #10b981;
                }

                .mobile-tab-btn-gio[data-status="completed"].active svg,
                .mobile-tab-btn-gio[data-status="completed"].active .tab-label {
                    color: #10b981;
                }

                .mobile-tab-btn-gio[data-status="completed"].active .tab-count {
                    background: #10b981;
                }

                .mobile-tab-btn-gio[data-status="homologated"].active {
                    border-color: #8b5cf6;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%);
                }

                .mobile-tab-btn-gio[data-status="homologated"].active::after {
                    background: #8b5cf6;
                }

                .mobile-tab-btn-gio[data-status="homologated"].active svg,
                .mobile-tab-btn-gio[data-status="homologated"].active .tab-label {
                    color: #8b5cf6;
                }

                .mobile-tab-btn-gio[data-status="homologated"].active .tab-count {
                    background: #8b5cf6;
                }

                /* Kanban Container - Layout vertical em mobile */
                .kanban-container-gio {
                    border-radius: 0;
                    background: transparent;
                    overflow: visible;
                }

                .kanban-scroll-area-gio {
                    padding: 0;
                    overflow: visible;
                    cursor: default;
                    height: auto;
                }

                /* Board - Layout vertical */
                .kanban-board-gio {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    width: 100%;
                }

                /* Colunas ocupam largura total e layout vertical */
                .kanban-column-gio {
                    flex: 1 1 auto;
                    width: 100%;
                    min-height: auto;
                    margin-bottom: 0;
                    border-radius: 16px;
                    box-shadow: none;
                }

                /* Esconde header das colunas (info está nas tabs) */
                .kanban-col-header-gio {
                    display: none;
                }

                .kanban-col-body-gio {
                    padding: 0;
                    gap: 12px;
                    overflow-y: visible;
                    max-height: none;
                    background: transparent;
                }

                /* Cards OKR - Totalmente redesenhados para mobile */
                .okr-card-gio {
                    padding: 0;
                    border-radius: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
                    border-left-width: 4px;
                    overflow: hidden;
                    background: white;
                }

                .okr-card-gio:last-child {
                    margin-bottom: 0;
                }

                .okr-card-gio:hover {
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                    transform: none;
                }

                /* Topo do card */
                .okr-card-top-gio {
                    padding: 14px 16px;
                    background: linear-gradient(135deg, rgba(245, 249, 255, 1) 0%, rgba(255, 255, 255, 1) 100%);
                    border-bottom: 1px solid #e5e7eb;
                    margin-bottom: 0;
                }

                .okr-dept-gio {
                    font-size: 10px;
                    padding: 5px 12px;
                }

                .okr-progress-badge-gio {
                    font-size: 12px;
                    padding: 5px 12px;
                }

                /* Título do OKR */
                .okr-title-gio {
                    font-size: 15px;
                    margin: 16px 16px 14px 16px;
                    line-height: 1.6;
                }

                /* Objetivo estratégico */
                .okr-objective-gio {
                    padding: 12px 14px;
                    font-size: 12px;
                    margin: 0 16px 14px 16px;
                    line-height: 1.5;
                }

                .okr-objective-gio svg {
                    width: 16px;
                    height: 16px;
                }

                /* Meta (KRs) */
                .okr-meta-gio {
                    margin: 0 16px 14px 16px;
                }

                .okr-krs-gio {
                    font-size: 12px;
                    padding: 10px 12px;
                }

                .okr-krs-gio svg {
                    width: 16px;
                    height: 16px;
                }

                /* Barra de progresso */
                .okr-progress-bar-gio {
                    margin: 0 16px 14px 16px;
                }

                .progress-track-gio {
                    height: 8px;
                    border-radius: 4px;
                }

                .progress-fill-gio {
                    border-radius: 4px;
                }

                /* Comentário do comitê */
                .okr-comment-gio {
                    padding: 12px 14px;
                    font-size: 13px;
                    margin: 0 16px 14px 16px;
                    line-height: 1.5;
                }

                .okr-comment-gio svg {
                    width: 18px;
                    height: 18px;
                }

                /* Ações - Botões maiores e mais fáceis de clicar */
                .okr-actions-gio {
                    flex-direction: column;
                    gap: 10px;
                    padding: 14px 16px 16px 16px;
                    background: #f5f9ff;
                    margin: 0;
                    border-top: 1px solid #e5e7eb;
                }

                .action-btn-gio {
                    padding: 14px 18px;
                    font-size: 14px;
                    border-radius: 10px;
                }

                .action-btn-gio:active {
                    transform: scale(0.97);
                }

                .action-btn-gio svg {
                    width: 18px;
                    height: 18px;
                }

                /* Empty state */
                .kanban-empty-state-gio {
                    padding: 60px 20px;
                    min-height: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                }

                .empty-icon-gio {
                    margin-bottom: 16px;
                }

                .empty-icon-gio svg {
                    width: 48px;
                    height: 48px;
                    color: #6b7280;
                    opacity: 0.4;
                }

                .kanban-empty-state-gio p {
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }
            }

            /* Telas muito pequenas */
            @media (max-width: 480px) {
                .mobile-tab-btn-gio {
                    min-width: 70px;
                    padding: 8px 10px;
                }

                .mobile-tab-btn-gio .tab-label {
                    font-size: 10px;
                }

                .mobile-tab-btn-gio .tab-count {
                    font-size: 11px;
                }

                .okr-card-gio {
                    border-radius: 12px;
                }

                .okr-card-top-gio {
                    padding: 12px 14px;
                }

                .okr-dept-gio {
                    font-size: 9px;
                    padding: 4px 10px;
                }

                .okr-title-gio {
                    font-size: 14px;
                    margin: 14px 14px 12px 14px;
                }

                .okr-objective-gio {
                    font-size: 11px;
                    padding: 10px 12px;
                    margin: 0 14px 12px 14px;
                }

                .okr-krs-gio {
                    font-size: 11px;
                    padding: 8px 10px;
                }

                .okr-progress-bar-gio {
                    margin: 0 14px 12px 14px;
                }

                .progress-track-gio {
                    height: 6px;
                }

                .okr-comment-gio {
                    font-size: 12px;
                    padding: 10px 12px;
                    margin: 0 14px 12px 14px;
                }

                .okr-actions-gio {
                    padding: 12px 14px 14px 14px;
                }

                .action-btn-gio {
                    font-size: 13px;
                    padding: 12px 16px;
                }

                .action-btn-gio svg {
                    width: 16px;
                    height: 16px;
                }
            }
        `;
        document.head.appendChild(style);

        // Remove old styles
        const oldStyle = document.getElementById('approval-styles');
        if (oldStyle) oldStyle.remove();
        const oldStyleV2 = document.getElementById('approval-styles-v2');
        if (oldStyleV2) oldStyleV2.remove();
    }
};

// Expõe globalmente
window.ApprovalPage = ApprovalPage;
export { ApprovalPage };
