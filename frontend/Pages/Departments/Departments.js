import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { Department } from '../../Entities/Department.js';

// Página de Departamentos - CRUD Simplificado conforme PRD
const DepartmentsPage = {
    currentDept: null,

    async render() {
        const content = document.getElementById('content');
        const departments = await Department.getAll();

        content.innerHTML = `
            <div class="page-gio">
                <!-- Action Button -->
                <div class="page-actions-gio">
                    <button class="btn-gio-primary" onclick="DepartmentsPage.openModal()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo Departamento
                    </button>
                </div>

                <!-- Content Card -->
                <div class="card-gio">
                    ${departments.length === 0 ? `
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                            <h3>Nenhum departamento cadastrado</h3>
                            <p>Comece criando seu primeiro departamento</p>
                            <button class="btn-gio-primary" onclick="DepartmentsPage.openModal()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Criar Departamento
                            </button>
                        </div>
                    ` : `
                        <div class="table-gio-container">
                            <table class="table-gio">
                                <thead>
                                    <tr>
                                        <th>Departamento</th>
                                        <th style="width:100px;text-align:center;">Status</th>
                                        <th style="width:80px;text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${departments.map(dept => `
                                        <tr class="${!dept.ativo ? 'row-inactive' : ''}">
                                            <td>
                                                <div class="table-cell-info">
                                                    <div class="table-cell-icon ${dept.ativo ? 'active' : 'inactive'}">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                                        </svg>
                                                    </div>
                                                    <span class="table-cell-name">${dept.nome}</span>
                                                </div>
                                            </td>
                                            <td style="text-align:center;">
                                                <span class="status-chip ${dept.ativo ? 'active' : 'inactive'}">
                                                    ${dept.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td style="text-align:center;">
                                                <div class="action-buttons">
                                                    <button class="action-btn" onclick="DepartmentsPage.edit('${dept.id}')" title="Editar">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                        </svg>
                                                    </button>
                                                    <button class="action-btn ${dept.ativo ? 'warning' : 'success'}" onclick="DepartmentsPage.toggleStatus('${dept.id}')" title="${dept.ativo ? 'Inativar' : 'Ativar'}">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            ${dept.ativo ? `
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                                            ` : `
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                            `}
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

            <div id="dept-modal" style="display:none;"></div>
        `;

        this.addStyles();
    },

    async openModal(id = null) {
        this.currentDept = id ? await Department.getById(id) : null;
        const modal = document.getElementById('dept-modal');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="DepartmentsPage.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.currentDept ? 'Editar' : 'Novo'} Departamento</h3>
                    <button class="modal-close" onclick="DepartmentsPage.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome do Departamento *</label>
                        <input type="text" id="dept-nome" class="form-control"
                            placeholder="Ex: Engenharia"
                            value="${this.currentDept ? this.currentDept.nome : ''}"
                            autofocus>
                        <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block;">
                            O nome deve ser único
                        </small>
                        <div id="dept-error" class="error-message" style="display:none;"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="DepartmentsPage.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="DepartmentsPage.save()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';

        // Focus no input
        setTimeout(() => document.getElementById('dept-nome').focus(), 100);

        // Enter para salvar
        document.getElementById('dept-nome').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.save();
            }
        });
    },

    closeModal() {
        document.getElementById('dept-modal').style.display = 'none';
        this.currentDept = null;
    },

    async save() {
        const nome = document.getElementById('dept-nome').value.trim();
        const errorDiv = document.getElementById('dept-error');

        if (!nome) {
            errorDiv.textContent = 'Nome do departamento é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const dept = this.currentDept || new Department();
            dept.nome = nome;
            await dept.save();

            this.closeModal();
            await this.render();
            this.showToast(`Departamento ${this.currentDept ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    edit(id) {
        this.openModal(id);
    },

    async toggleStatus(id) {
        const dept = await Department.getById(id);
        if (!dept) return;

        const action = dept.ativo ? 'inativar' : 'ativar';

        if (confirm(`Deseja realmente ${action} o departamento "${dept.nome}"?`)) {
            try {
                await Department.toggleActive(id);
                await this.render();
                this.showToast(`Departamento ${dept.ativo ? 'inativado' : 'ativado'} com sucesso!`, 'success');
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        }
    },

    toggleMenu(event, deptId) {
        event.stopPropagation();
        window.closeAllDropdownMenus();
        const menu = document.getElementById(`dept-menu-${deptId}`);
        if (menu) {
            window.positionDropdownMenu(event.currentTarget, `dept-menu-${deptId}`);
            menu.classList.toggle('show');
        }
    },

    closeAllMenus() {
        window.closeAllDropdownMenus();
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    addStyles() {
        if (document.getElementById('dept-styles')) return;

        const style = document.createElement('style');
        style.id = 'dept-styles';
        style.textContent = `
            /* ===== PAGE GIO STYLES ===== */
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

            /* Empty State */
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

            /* Table GIO */
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

            .table-gio tbody tr.row-inactive {
                opacity: 0.6;
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

            .table-cell-icon.inactive {
                background: #f1f5f9;
                color: #94a3b8;
            }

            .table-cell-name {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }

            .status-chip {
                display: inline-block;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
            }

            .status-chip.active {
                background: rgba(16, 185, 129, 0.12);
                color: #059669;
            }

            .status-chip.inactive {
                background: rgba(100, 116, 139, 0.12);
                color: #64748b;
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
                background: rgba(245, 158, 11, 0.15);
                color: #d97706;
            }

            .action-btn.success:hover {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
            }

            .action-btn svg {
                width: 16px;
                height: 16px;
            }

            /* Modal GIO */
            #dept-modal {
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
                backdrop-filter: blur(4px);
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

            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                padding: 14px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }

            .toast.show {
                opacity: 1;
                transform: translateY(0);
            }

            .toast-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }

            .toast-error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
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

// Expõe globalmente
window.DepartmentsPage = DepartmentsPage;
export { DepartmentsPage };
