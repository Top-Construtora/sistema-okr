import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
// Página do Comitê de Aprovação - Kanban
const ApprovalPage = {
    async render() {
        const content = document.getElementById('content');

        content.innerHTML = `
            <div class="page-header" style="margin-bottom:32px;">
                <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Comitê de Aprovação</h2>
                <p style="color:var(--text-muted);font-size:13px;">Gerencie o fluxo de aprovação dos OKRs</p>
            </div>

            <div id="kanban-board" class="kanban-board"></div>
        `;

        await this.renderKanban();
        this.addStyles();
    },

    async renderKanban() {
        const container = document.getElementById('kanban-board');
        const okrs = await OKR.getAll();

        const columns = [
            { key: 'pending', title: 'Aguardando Revisão', class: 'pending', icon: '⏳' },
            { key: 'adjust', title: 'Ajustes Solicitados', class: 'adjust', icon: '⚠️' },
            { key: 'approved', title: 'Em Andamento', class: 'approved', icon: '▶️' },
            { key: 'completed', title: 'Concluídos', class: 'completed', icon: '✓' },
            { key: 'homologated', title: 'Homologados', class: 'homologated', icon: '✓✓' }
        ];

        let html = '<div class="kanban-columns">';

        columns.forEach(col => {
            const items = okrs.filter(okr => okr.status === col.key);

            html += `
                <div class="kanban-column">
                    <div class="kanban-column-header ${col.class}">
                        <div class="kanban-column-icon">${col.icon}</div>
                        <div>
                            <div class="kanban-column-title">${col.title}</div>
                            <div class="kanban-column-count">${items.length} ${items.length === 1 ? 'OKR' : 'OKRs'}</div>
                        </div>
                    </div>
                    <div class="kanban-column-body">
                        ${items.length === 0 ? `
                            <div class="kanban-empty">
                                <p>Nenhum OKR neste estágio</p>
                            </div>
                        ` : items.map(okr => this.renderKanbanCard(okr, col.key)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    renderKanbanCard(okr, currentStatus) {
        const objective = okr.getObjective();

        return `
            <div class="kanban-card">
                <div class="kanban-card-header">
                    <div>
                        <div class="kanban-card-dept">${okr.department}</div>
                        <div class="kanban-card-title">${okr.title}</div>
                    </div>
                </div>

                <div class="kanban-card-body">
                    <div class="kanban-card-meta">
                        <svg style="width:14px;height:14px;display:inline;vertical-align:middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        ${objective ? objective.text.substring(0, 50) + '...' : 'N/A'}
                    </div>

                    <div class="kanban-card-krs">
                        <svg style="width:14px;height:14px;display:inline;vertical-align:middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        ${okr.keyResults.length} Key ${okr.keyResults.length === 1 ? 'Result' : 'Results'}
                    </div>

                    <div class="kanban-card-progress">
                        <div class="progress progress-sm">
                            <div class="progress-bar" style="width:${okr.progress}%"></div>
                        </div>
                        <span style="font-size:12px;font-weight:600;color:var(--top-teal);">${okr.progress}%</span>
                    </div>
                </div>

                <div class="kanban-card-actions">
                    ${this.renderActions(okr, currentStatus)}
                </div>

                ${okr.committeeComment ? `
                    <div class="kanban-card-comment">
                        <strong>Comentário:</strong> ${okr.committeeComment}
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderActions(okr, currentStatus) {
        const actions = {
            pending: [
                { action: 'adjust', label: 'Solicitar Ajuste', class: 'btn-danger' },
                { action: 'approved', label: 'Aprovar', class: 'btn-success' }
            ],
            adjust: [
                { action: 'pending', label: 'Voltar p/ Revisão', class: 'btn-secondary' },
                { action: 'approved', label: 'Aprovar', class: 'btn-success' }
            ],
            approved: [
                { action: 'completed', label: 'Marcar Concluído', class: 'btn-success' }
            ],
            completed: [
                { action: 'homologated', label: 'Homologar', class: 'btn-primary' }
            ],
            homologated: []
        };

        const currentActions = actions[currentStatus] || [];

        if (currentActions.length === 0) {
            return '<p style="text-align:center;color:var(--text-muted);font-size:12px;padding:8px 0;">Fluxo finalizado</p>';
        }

        return currentActions.map(a => `
            <button class="btn btn-sm ${a.class}" onclick="ApprovalPage.changeStatus('${okr.id}', '${a.action}')">
                ${a.label}
            </button>
        `).join('');
    },

    async changeStatus(okrId, newStatus) {
        const okr = await OKR.getById(okrId);
        if (!okr) return;

        let comment = '';
        if (newStatus === 'adjust') {
            comment = prompt('Digite o motivo dos ajustes solicitados:');
            if (!comment) return; // Cancelou
        }

        okr.changeStatus(newStatus, comment);
        await okr.save();

        await this.render();
        DepartmentsPage.showToast('Status do OKR atualizado com sucesso!', 'success');
    },

    addStyles() {
        if (document.getElementById('approval-styles')) return;

        const style = document.createElement('style');
        style.id = 'approval-styles';
        style.textContent = `
            .kanban-board {
                width: 100%;
                overflow-x: auto;
                padding-bottom: 20px;
            }

            .kanban-columns {
                display: flex;
                gap: 20px;
                min-width: max-content;
            }

            .kanban-column {
                flex: 0 0 300px;
                background: var(--bg-main);
                border-radius: var(--radius-lg);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 250px);
            }

            .kanban-column-header {
                padding: 16px 20px;
                border-bottom: 2px solid;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .kanban-column-header.pending {
                background: var(--warning-bg);
                border-color: var(--warning);
            }

            .kanban-column-header.adjust {
                background: var(--danger-bg);
                border-color: var(--danger);
            }

            .kanban-column-header.approved {
                background: var(--info-bg);
                border-color: var(--info);
            }

            .kanban-column-header.completed {
                background: var(--success-bg);
                border-color: var(--success);
            }

            .kanban-column-header.homologated {
                background: #a7f3d0;
                border-color: #065f46;
            }

            .kanban-column-icon {
                font-size: 24px;
                line-height: 1;
            }

            .kanban-column-title {
                font-size: 14px;
                font-weight: 700;
                color: var(--text-primary);
            }

            .kanban-column-count {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 2px;
            }

            .kanban-column-body {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .kanban-card {
                background: white;
                border-radius: var(--radius);
                border: 1px solid var(--border);
                overflow: hidden;
                transition: all 0.2s;
            }

            .kanban-card:hover {
                box-shadow: var(--shadow-md);
                border-color: var(--top-teal);
            }

            .kanban-card-header {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-light);
            }

            .kanban-card-dept {
                font-size: 11px;
                font-weight: 600;
                color: var(--top-teal);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }

            .kanban-card-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                line-height: 1.4;
            }

            .kanban-card-body {
                padding: 12px 16px;
            }

            .kanban-card-meta,
            .kanban-card-krs {
                font-size: 12px;
                color: var(--text-muted);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .kanban-card-progress {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .kanban-card-progress .progress {
                flex: 1;
            }

            .kanban-card-actions {
                padding: 12px 16px;
                background: var(--bg-main);
                border-top: 1px solid var(--border-light);
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .kanban-card-actions .btn {
                flex: 1;
                min-width: 0;
            }

            .kanban-card-comment {
                padding: 12px 16px;
                background: var(--danger-bg);
                border-top: 1px solid var(--danger);
                font-size: 12px;
                color: var(--danger);
            }

            .kanban-card-comment strong {
                display: block;
                margin-bottom: 4px;
            }

            .kanban-empty {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted);
                font-size: 13px;
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.ApprovalPage = ApprovalPage;
export { ApprovalPage };
