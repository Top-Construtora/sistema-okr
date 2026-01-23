import { Initiative } from '../Entities/Initiative.js';
import { Modal } from './Modal.js';

// Componente para gerenciar Iniciativas de um Key Result
const InitiativeManager = {
    /**
     * Retorna apenas primeiro e segundo nome do usuário
     */
    getShortName(fullName) {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length < 2) return parts[0];
        const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e'];
        if (preposicoes.includes(parts[1].toLowerCase())) {
            return parts[0];
        }
        return parts.slice(0, 2).join(' ');
    },

    /**
     * Renderiza o gerenciador de iniciativas para um Key Result
     * @param {string} keyResultId - ID do Key Result
     * @param {Array} initiatives - Lista de iniciativas (opcional, será carregada se não fornecida)
     * @param {Function} onUpdate - Callback chamado quando iniciativas são modificadas
     * @returns {Promise<string>} HTML do gerenciador
     */
    async render(keyResultId, initiatives = null, onUpdate = null) {
        // Carrega iniciativas se não foram fornecidas
        if (!initiatives) {
            initiatives = await Initiative.getByKeyResultId(keyResultId);
        }

        // Calcula o progresso médio
        const avgProgress = initiatives.length > 0
            ? Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length)
            : 0;

        return `
            <div class="initiative-manager" data-kr-id="${keyResultId}">
                <div class="initiative-header">
                    <div class="initiative-stats">
                        <span class="initiative-count">${initiatives.length} iniciativa(s)</span>
                        <span class="initiative-progress">Progresso médio: ${avgProgress}%</span>
                    </div>
                    <button
                        class="btn btn-sm btn-primary"
                        onclick="window.initiativeManager.openAddModal('${keyResultId}')"
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Adicionar Iniciativa
                    </button>
                </div>

                <div class="initiative-list">
                    ${initiatives.length === 0 ? `
                        <div class="empty-state">
                            <p>Nenhuma iniciativa cadastrada</p>
                            <p class="text-sm text-muted">Adicione iniciativas para acompanhar o progresso deste Key Result</p>
                        </div>
                    ` : initiatives.map(initiative => this.renderInitiativeCard(initiative)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza um card de iniciativa
     */
    renderInitiativeCard(initiative) {
        const isOverdue = initiative.isOverdue();
        const progressColor = initiative.progress >= 100 ? 'success' : initiative.progress >= 70 ? 'warning' : 'primary';

        return `
            <div class="initiative-card ${initiative.concluida ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-initiative-id="${initiative.id}">
                <div class="initiative-card-header">
                    <div class="initiative-title-row">
                        <h4 class="initiative-title">${initiative.nome}</h4>
                        <div class="initiative-actions">
                            <button
                                class="btn-icon"
                                onclick="window.initiativeManager.openEditModal('${initiative.id}')"
                                title="Editar"
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button
                                class="btn-icon text-danger"
                                onclick="window.initiativeManager.deleteInitiative('${initiative.id}')"
                                title="Excluir"
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    ${initiative.descricao ? `<p class="initiative-description">${initiative.descricao}</p>` : ''}

                    <div class="initiative-meta">
                        ${initiative.data_limite ? `
                            <span class="initiative-deadline ${isOverdue ? 'overdue' : ''}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                ${new Date(initiative.data_limite).toLocaleDateString('pt-BR')}
                            </span>
                        ` : ''}
                        ${(() => {
                            const responsibleUsers = initiative.getResponsibleUsers();
                            if (responsibleUsers.length === 0) return '';

                            return `
                                <div class="initiative-responsible-users">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    <div class="responsible-user-badges">
                                        ${responsibleUsers.map(user => `
                                            <span class="responsible-user-badge ${user.is_primary ? 'primary' : ''}">
                                                ${this.getShortName(user.nome)}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        })()}
                    </div>
                </div>

                <div class="initiative-progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Progresso</span>
                        <span class="progress-value">${initiative.progress}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar progress-${progressColor}" style="width: ${initiative.progress}%"></div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value="${initiative.progress}"
                        class="initiative-progress-slider"
                        onchange="window.initiativeManager.updateProgress('${initiative.id}', this.value)"
                    >
                </div>
            </div>
        `;
    },

    /**
     * Abre modal para adicionar nova iniciativa
     */
    async openAddModal(keyResultId) {
        const formHTML = await this.renderForm(keyResultId);
        const modal = this.createFormModal('Nova Iniciativa', formHTML, async (formData) => {
            try {
                const initiative = new Initiative({
                    key_result_id: keyResultId,
                    ...formData
                });
                await initiative.save();
                this.refreshManager(keyResultId);
            } catch (error) {
                console.error('Erro ao criar iniciativa:', error);
                alert('Erro ao criar iniciativa: ' + error.message);
            }
        });
    },

    /**
     * Abre modal para editar iniciativa
     */
    async openEditModal(initiativeId) {
        const initiative = await Initiative.getById(initiativeId);
        if (!initiative) {
            alert('Iniciativa não encontrada');
            return;
        }

        const formHTML = await this.renderForm(initiative.key_result_id, initiative);
        const modal = this.createFormModal('Editar Iniciativa', formHTML, async (formData) => {
            try {
                Object.assign(initiative, formData);
                await initiative.save();
                this.refreshManager(initiative.key_result_id);
            } catch (error) {
                console.error('Erro ao atualizar iniciativa:', error);
                alert('Erro ao atualizar iniciativa: ' + error.message);
            }
        });
    },

    /**
     * Renderiza o formulário de iniciativa
     */
    async renderForm(keyResultId, initiative = null) {
        // Busca usuários para o select de responsável e filtra consultores e admin@sistema.com
        const { User } = window;
        const allUsers = await User.getAll();
        const users = allUsers.filter(user =>
            user.tipo !== 'consultor' &&
            user.email !== 'admin@sistema.com'
        );

        return `
            <div class="form-group">
                <label for="initiative-nome">Nome *</label>
                <input
                    type="text"
                    id="initiative-nome"
                    class="form-control"
                    value="${initiative?.nome || ''}"
                    required
                    maxlength="200"
                >
            </div>

            <div class="form-group">
                <label for="initiative-descricao">Descrição</label>
                <textarea
                    id="initiative-descricao"
                    class="form-control"
                    rows="3"
                    maxlength="500"
                >${initiative?.descricao || ''}</textarea>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">
                    Responsáveis
                    <small style="font-weight:normal;color:var(--text-muted);">(selecione um ou mais)</small>
                </label>
                <div class="responsible-users-checkbox-list" id="initiative-responsible-users">
                    ${users.map(u => {
                        const responsibleUserIds = initiative?.getResponsibleUserIds() || [];
                        const isChecked = responsibleUserIds.includes(u.id);
                        const isPrimary = initiative?.responsible_users?.find(ru => ru.id === u.id)?.is_primary || false;

                        return `
                            <label class="responsible-user-checkbox-item ${isChecked ? 'checked' : ''}">
                                <input
                                    type="checkbox"
                                    name="initiative-responsible"
                                    value="${u.id}"
                                    ${isChecked ? 'checked' : ''}
                                    data-is-primary="${isPrimary}"
                                    onchange="this.parentElement.classList.toggle('checked', this.checked)"
                                >
                                <span class="responsible-checkbox-name">${u.nome}</span>
                                ${isPrimary ? '<span class="primary-badge">Principal</span>' : ''}
                            </label>
                        `;
                    }).join('')}
                </div>
                <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:6px;">
                    O primeiro usuário selecionado será marcado como responsável principal
                </small>
            </div>

            <div class="form-group">
                <label for="initiative-data-limite">Data Limite</label>
                <input
                    type="date"
                    id="initiative-data-limite"
                    class="form-control"
                    value="${initiative?.data_limite || ''}"
                >
            </div>

            <div class="form-group">
                <label for="initiative-progress">Progresso: <span id="progress-display">${initiative?.progress || 0}</span>%</label>
                <input
                    type="range"
                    id="initiative-progress"
                    class="form-control-range"
                    min="0"
                    max="100"
                    value="${initiative?.progress || 0}"
                    oninput="document.getElementById('progress-display').textContent = this.value"
                >
            </div>
        `;
    },

    /**
     * Cria um modal com formulário
     */
    createFormModal(title, formHTML, onSave) {
        // Remove modal anterior se existir
        const existingModal = document.getElementById('initiative-form-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="initiative-form-modal" class="modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="document.getElementById('initiative-form-modal').remove()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="initiative-form">
                            ${formHTML}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('initiative-form-modal').remove()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" id="save-initiative-btn">
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Evento de salvar
        document.getElementById('save-initiative-btn').addEventListener('click', async () => {
            // Collect selected responsible users
            const selectedUsers = Array.from(document.querySelectorAll('input[name="initiative-responsible"]:checked'))
                .map((cb, idx) => ({
                    id: cb.value,
                    is_primary: idx === 0 // First selected is primary
                }));

            const formData = {
                nome: document.getElementById('initiative-nome').value.trim(),
                descricao: document.getElementById('initiative-descricao').value.trim(),
                responsible_users: selectedUsers,
                responsavel_id: selectedUsers.length > 0 ? selectedUsers[0].id : null, // Backward compat
                data_limite: document.getElementById('initiative-data-limite').value || null,
                progress: parseInt(document.getElementById('initiative-progress').value, 10)
            };

            if (!formData.nome) {
                alert('Nome é obrigatório');
                return;
            }

            await onSave(formData);
            document.getElementById('initiative-form-modal').remove();
        });
    },

    /**
     * Atualiza o progresso de uma iniciativa
     */
    async updateProgress(initiativeId, progress) {
        try {
            const initiative = await Initiative.getById(initiativeId);
            if (!initiative) return;

            await initiative.updateProgress(parseInt(progress, 10));
            this.refreshManager(initiative.key_result_id);
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            alert('Erro ao atualizar progresso: ' + error.message);
        }
    },

    /**
     * Deleta uma iniciativa
     */
    async deleteInitiative(initiativeId) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Iniciativa',
            message: 'Tem certeza que deseja excluir esta iniciativa? Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (!confirmed) return;

        try {
            const initiative = await Initiative.getById(initiativeId);
            const keyResultId = initiative.key_result_id;

            await Initiative.delete(initiativeId);
            this.refreshManager(keyResultId);
        } catch (error) {
            console.error('Erro ao deletar iniciativa:', error);
            alert('Erro ao deletar iniciativa: ' + error.message);
        }
    },

    /**
     * Atualiza o gerenciador na página
     */
    async refreshManager(keyResultId) {
        const container = document.querySelector(`[data-kr-id="${keyResultId}"]`);
        if (!container) return;

        const initiatives = await Initiative.getByKeyResultId(keyResultId);
        const html = await this.render(keyResultId, initiatives);
        container.outerHTML = html;

        // Dispara evento customizado para que outras partes da UI possam reagir
        window.dispatchEvent(new CustomEvent('initiativesUpdated', {
            detail: { keyResultId, initiatives }
        }));
    },

    /**
     * Adiciona estilos CSS
     */
    addStyles() {
        if (document.getElementById('initiative-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'initiative-manager-styles';
        style.textContent = `
            .initiative-manager {
                margin-top: 16px;
            }

            .initiative-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border);
            }

            .initiative-stats {
                display: flex;
                gap: 16px;
                font-size: 14px;
            }

            .initiative-count {
                color: var(--text-secondary);
                font-weight: 500;
            }

            .initiative-progress {
                color: var(--text-muted);
            }

            .initiative-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .initiative-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 16px;
                transition: all 0.2s;
            }

            .initiative-card:hover {
                box-shadow: var(--shadow-md);
            }

            .initiative-card.completed {
                opacity: 0.7;
                background: var(--bg-success-subtle);
            }

            .initiative-card.overdue {
                border-left: 3px solid var(--danger);
            }

            .initiative-card-header {
                margin-bottom: 12px;
            }

            .initiative-title-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }

            .initiative-title {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
                flex: 1;
            }

            .initiative-actions {
                display: flex;
                gap: 4px;
            }

            .initiative-description {
                font-size: 13px;
                color: var(--text-secondary);
                margin: 8px 0 0 0;
                line-height: 1.5;
            }

            .initiative-meta {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 8px;
                font-size: 12px;
            }

            .initiative-deadline,
            .initiative-responsible {
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
                transition: width 0.3s ease;
                border-radius: 3px;
            }

            .progress-bar.progress-primary {
                background: var(--top-teal);
            }

            .progress-bar.progress-warning {
                background: var(--warning);
            }

            .progress-bar.progress-success {
                background: var(--success);
            }

            .initiative-progress-slider {
                width: 100%;
                margin-top: 4px;
            }

            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted);
            }

            .empty-state p {
                margin: 0 0 8px 0;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            /* Responsible Users Display */
            .initiative-responsible-users {
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--text-muted);
            }

            .responsible-user-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .responsible-user-badge {
                display: inline-flex;
                align-items: center;
                padding: 3px 8px;
                background: linear-gradient(135deg, var(--top-teal) 0%, #2c9f8a 100%);
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }

            .responsible-user-badge.primary {
                background: linear-gradient(135deg, var(--top-blue) 0%, #1a5570 100%);
                font-weight: 600;
            }

            /* Responsible Users Checkbox List (Form) */
            .responsible-users-checkbox-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 8px;
                padding: 12px;
                background: var(--bg-main);
                border-radius: 8px;
                border: 1px solid var(--border);
                max-height: 240px;
                overflow-y: auto;
            }

            .responsible-user-checkbox-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 12px;
                background: white;
                border: 2px solid var(--border);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .responsible-user-checkbox-item:hover {
                border-color: var(--top-teal);
            }

            .responsible-user-checkbox-item.checked {
                border-color: var(--top-teal);
                background: rgba(45, 212, 191, 0.05);
            }

            .responsible-user-checkbox-item input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: var(--top-teal);
                cursor: pointer;
            }

            .responsible-checkbox-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-main);
                flex: 1;
            }

            .primary-badge {
                display: inline-flex;
                align-items: center;
                padding: 2px 6px;
                background: var(--top-blue);
                color: white;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            @media (max-width: 640px) {
                .initiative-header {
                    flex-direction: column;
                    gap: 12px;
                    align-items: flex-start;
                }

                .form-row {
                    grid-template-columns: 1fr;
                }

                .responsible-users-checkbox-list {
                    grid-template-columns: 1fr;
                    max-height: 200px;
                }

                .responsible-user-badges {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Adiciona estilos ao carregar
InitiativeManager.addStyles();

// Expõe globalmente
window.initiativeManager = InitiativeManager;

export { InitiativeManager };
// Cache-bust: 1768907596
