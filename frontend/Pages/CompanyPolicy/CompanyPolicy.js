import { AuthService } from '../../services/auth.js';
import { CompanyPolicy } from '../../Entities/CompanyPolicy.js';

const CompanyPolicyPage = {
    currentPolicy: null,
    selectedIcon: 'document',

    async render() {
        const content = document.getElementById('content');
        const isAdmin = AuthService.isAdmin();

        if (!isAdmin) {
            content.innerHTML = '<p>Acesso negado.</p>';
            return;
        }

        const policies = await CompanyPolicy.getAll();

        content.innerHTML = `
            <div class="page-gio">
                <!-- Action Button -->
                <div class="page-actions-gio">
                    <button class="btn-gio-primary" onclick="CompanyPolicyPage.openModal()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Nova Política
                    </button>
                </div>

                <!-- Content Card -->
                <div class="card-gio">
                    ${policies.length === 0 ? `
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <h3>Nenhuma política cadastrada</h3>
                            <p>Comece criando sua primeira política da empresa</p>
                            <button class="btn-gio-primary" onclick="CompanyPolicyPage.openModal()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Criar Política
                            </button>
                        </div>
                    ` : `
                        <div class="table-gio-container">
                            <table class="table-gio">
                                <thead>
                                    <tr>
                                        <th style="min-width:200px;">Título</th>
                                        <th>Descrição</th>
                                        <th style="width:80px;text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${policies.map(p => `
                                        <tr>
                                            <td>
                                                <div class="table-cell-info">
                                                    <div class="table-cell-icon active">
                                                        ${CompanyPolicy.getIconSVG(p.icon, 20)}
                                                    </div>
                                                    <span class="table-cell-name">${p.title || '<em style="color:#94a3b8;">Sem título</em>'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="cp-desc-cell">${p.description ? (p.description.length > 100 ? p.description.substring(0, 100) + '...' : p.description) : '<em style="color:#94a3b8;">Sem descrição</em>'}</span>
                                            </td>
                                            <td style="text-align:center;">
                                                <div class="action-buttons">
                                                    <button class="action-btn" onclick="CompanyPolicyPage.edit(${p.id})" title="Editar">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                        </svg>
                                                    </button>
                                                    <button class="action-btn warning" onclick="CompanyPolicyPage.delete(${p.id}, '${p.title.replace(/'/g, "\\'")}')" title="Excluir">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>

            <div id="cp-modal" style="display:none;"></div>
        `;

        this.addStyles();
    },

    async openModal(id = null) {
        this.currentPolicy = id ? await CompanyPolicy.getById(id) : null;
        this.selectedIcon = this.currentPolicy ? this.currentPolicy.icon : 'document';
        const modal = document.getElementById('cp-modal');

        const selectedLabel = CompanyPolicy.ICONS[this.selectedIcon]?.label || 'Documento';
        const iconPickerHTML = Object.entries(CompanyPolicy.ICONS).map(([key, icon]) => `
            <button type="button" class="cp-icon-option ${key === this.selectedIcon ? 'selected' : ''}"
                    data-icon="${key}" onclick="CompanyPolicyPage.selectIcon('${key}')" title="${icon.label}">
                ${CompanyPolicy.getIconSVG(key, 18)}
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="CompanyPolicyPage.closeModal()"></div>
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h3>${this.currentPolicy ? 'Editar' : 'Nova'} Política</h3>
                    <button class="modal-close" onclick="CompanyPolicyPage.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Ícone</label>
                        <div class="cp-icon-toggle" onclick="CompanyPolicyPage.toggleIconPicker()">
                            <div class="cp-icon-preview" id="cp-icon-preview">
                                ${CompanyPolicy.getIconSVG(this.selectedIcon, 20)}
                            </div>
                            <span class="cp-icon-toggle-label" id="cp-icon-toggle-label">${selectedLabel}</span>
                            <svg class="cp-icon-toggle-arrow" id="cp-icon-toggle-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div class="cp-icon-picker" id="cp-icon-picker" style="display:none;">
                            ${iconPickerHTML}
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" id="cp-title-input" class="form-control"
                            placeholder="Ex: Política de Gestão de Resultados"
                            value="${this.currentPolicy ? this.currentPolicy.title.replace(/"/g, '&quot;') : ''}"
                            autofocus>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descrição</label>
                        <textarea id="cp-desc-input" class="form-control" rows="8"
                            placeholder="Descreva a política da empresa..."
                            style="resize:vertical;min-height:140px;line-height:1.7;font-family:inherit;">${this.currentPolicy ? this.currentPolicy.description : ''}</textarea>
                    </div>
                    <div id="cp-error" class="error-message" style="display:none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CompanyPolicyPage.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" id="cp-save-btn" onclick="CompanyPolicyPage.save()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';

        setTimeout(() => document.getElementById('cp-title-input').focus(), 100);

        document.getElementById('cp-title-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.save();
        });
    },

    toggleIconPicker() {
        const picker = document.getElementById('cp-icon-picker');
        const arrow = document.getElementById('cp-icon-toggle-arrow');
        const isOpen = picker.style.display !== 'none';
        picker.style.display = isOpen ? 'none' : 'flex';
        arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
    },

    selectIcon(key) {
        this.selectedIcon = key;
        document.querySelectorAll('.cp-icon-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.icon === key);
        });
        const label = CompanyPolicy.ICONS[key]?.label || 'Documento';
        document.getElementById('cp-icon-preview').innerHTML = CompanyPolicy.getIconSVG(key, 20);
        document.getElementById('cp-icon-toggle-label').textContent = label;
        document.getElementById('cp-icon-picker').style.display = 'none';
        document.getElementById('cp-icon-toggle-arrow').style.transform = '';
    },

    closeModal() {
        document.getElementById('cp-modal').style.display = 'none';
        this.currentPolicy = null;
    },

    edit(id) {
        this.openModal(id);
    },

    async delete(id, title) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Política',
            message: `Deseja realmente excluir a política <strong>"${title}"</strong>?`,
            confirmLabel: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        try {
            await CompanyPolicy.delete(id);
            DepartmentsPage.showToast('Política excluída com sucesso!', 'success');
            this.render();
        } catch (err) {
            DepartmentsPage.showToast('Erro ao excluir política.', 'error');
        }
    },

    async save() {
        const title = document.getElementById('cp-title-input').value.trim();
        const description = document.getElementById('cp-desc-input').value.trim();
        const errorDiv = document.getElementById('cp-error');

        if (!title) {
            errorDiv.textContent = 'O título é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            if (this.currentPolicy) {
                await CompanyPolicy.update(this.currentPolicy.id, title, description, this.selectedIcon);
            } else {
                await CompanyPolicy.create(title, description, this.selectedIcon);
            }

            this.closeModal();
            DepartmentsPage.showToast(`Política ${this.currentPolicy ? 'atualizada' : 'criada'} com sucesso!`, 'success');
            await this.render();
        } catch (err) {
            console.error('Erro ao salvar política:', err);
            errorDiv.textContent = 'Erro ao salvar política. Tente novamente.';
            errorDiv.style.display = 'block';
        }
    },

    addStyles() {
        if (document.getElementById('cp-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'cp-page-styles';
        style.textContent = `
            /* ===== PAGE GIO BASE (shared pattern) ===== */
            .page-gio {
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }

            .page-actions-gio {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 20px;
            }

            .btn-gio-primary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .btn-gio-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(18, 176, 160, 0.4);
            }

            .btn-gio-primary svg {
                width: 18px;
                height: 18px;
            }

            .card-gio {
                background: white;
                border-radius: 16px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                overflow: hidden;
            }

            .empty-state-gio {
                text-align: center;
                padding: 60px 20px;
            }

            .empty-state-icon {
                width: 72px;
                height: 72px;
                border-radius: 20px;
                background: rgba(18, 176, 160, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            }

            .empty-state-icon svg {
                width: 36px;
                height: 36px;
                color: #12b0a0;
            }

            .empty-state-gio h3 {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
            }

            .empty-state-gio p {
                font-size: 14px;
                color: #64748b;
                margin: 0 0 24px 0;
            }

            .table-gio-container {
                overflow-x: auto;
            }

            .table-gio {
                width: 100%;
                border-collapse: collapse;
            }

            .table-gio thead {
                background: rgba(30, 96, 118, 0.04);
            }

            .table-gio thead th {
                padding: 14px 20px;
                text-align: left;
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #e2e8f0;
            }

            .table-gio tbody tr {
                border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s ease;
            }

            .table-gio tbody tr:hover {
                background: rgba(18, 176, 160, 0.04);
            }

            .table-gio tbody tr:last-child {
                border-bottom: none;
            }

            .table-gio tbody td {
                padding: 14px 20px;
                vertical-align: middle;
            }

            .table-cell-info {
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .table-cell-icon {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .table-cell-icon svg {
                width: 20px;
                height: 20px;
            }

            .table-cell-icon.active {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .table-cell-name {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }

            .cp-desc-cell {
                font-size: 13px;
                color: #64748b;
                line-height: 1.5;
            }

            /* Icon Toggle */
            .cp-icon-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.15s;
                background: white;
            }

            .cp-icon-toggle:hover {
                border-color: #cbd5e1;
                background: #f8fafc;
            }

            .cp-icon-preview {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .cp-icon-toggle-label {
                font-size: 13px;
                font-weight: 600;
                color: #1f2937;
                flex: 1;
            }

            .cp-icon-toggle-arrow {
                color: #94a3b8;
                transition: transform 0.2s;
                flex-shrink: 0;
            }

            /* Icon Picker Grid */
            .cp-icon-picker {
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 10px;
                padding: 12px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
            }

            .cp-icon-option {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 2px solid transparent;
                background: white;
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .cp-icon-option:hover {
                border-color: #12b0a0;
                color: #12b0a0;
            }

            .cp-icon-option.selected {
                border-color: #12b0a0;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .action-buttons {
                display: flex;
                justify-content: center;
                gap: 8px;
            }

            .action-btn {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: none;
                background: #f1f5f9;
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .action-btn:hover {
                background: #e2e8f0;
                color: #1f2937;
            }

            .action-btn.warning:hover {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .action-btn svg {
                width: 16px;
                height: 16px;
            }

            /* Modal GIO */
            #cp-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.6);
                z-index: 999;
            }

            .modal-content {
                position: relative;
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 480px;
                z-index: 1000;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: modalSlideIn 0.25s ease;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h3 {
                font-size: 18px;
                font-weight: 700;
                color: #1e6076;
                margin: 0;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #94a3b8;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                transition: all 0.15s;
            }

            .modal-close:hover {
                background: #f1f5f9;
                color: #1f2937;
            }

            .modal-body {
                padding: 24px;
            }

            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #f8fafc;
                border-radius: 0 0 16px 16px;
            }

            .form-label {
                display: block;
                font-weight: 600;
                font-size: 13px;
                color: #1f2937;
                margin-bottom: 8px;
            }

            .error-message {
                background: rgba(239, 68, 68, 0.1);
                color: #dc2626;
                padding: 12px 14px;
                border-radius: 10px;
                font-size: 13px;
                margin-top: 12px;
                border: 1px solid rgba(239, 68, 68, 0.2);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .page-gio {
                    margin: -16px;
                    padding: 16px;
                }

                .page-actions-gio {
                    justify-content: stretch;
                }

                .btn-gio-primary {
                    width: 100%;
                    justify-content: center;
                }

                .table-gio thead th,
                .table-gio tbody td {
                    padding: 12px 14px;
                }

                .table-cell-icon {
                    width: 36px;
                    height: 36px;
                }

                .table-cell-icon svg {
                    width: 18px;
                    height: 18px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

export { CompanyPolicyPage };
window.CompanyPolicyPage = CompanyPolicyPage;
