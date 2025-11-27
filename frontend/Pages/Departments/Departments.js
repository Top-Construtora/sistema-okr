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
            <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
                <button class="btn btn-primary" onclick="DepartmentsPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Departamento
                </button>
            </div>

            <div class="card">
                <div class="card-body">
                    ${departments.length === 0 ? `
                        <div style="text-align:center;padding:60px 20px;">
                            <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum departamento cadastrado</p>
                            <button class="btn btn-primary" onclick="DepartmentsPage.openModal()">
                                Criar primeiro departamento
                            </button>
                        </div>
                    ` : `
                        <div class="departments-table-container">
                            <table class="departments-table">
                                <thead>
                                    <tr>
                                        <th style="width:70%;">Departamento</th>
                                        <th style="width:30%;text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${departments.map(dept => `
                                        <tr class="dept-row ${!dept.ativo ? 'inactive' : ''}">
                                            <td>
                                                <div class="dept-info">
                                                    <div class="dept-icon ${dept.ativo ? 'active' : 'inactive'}">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                                        </svg>
                                                    </div>
                                                    <div class="dept-details">
                                                        <div class="dept-name">${dept.nome}</div>
                                                        <div class="dept-status">
                                                            <span class="status-dot ${dept.ativo ? 'active' : 'inactive'}"></span>
                                                            ${dept.ativo ? 'Ativo' : 'Inativo'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="actions-cell">
                                                <div class="action-menu">
                                                    <button class="action-menu-btn" onclick="DepartmentsPage.toggleMenu(event, '${dept.id}')" title="Ações">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                        </svg>
                                                    </button>
                                                    <div class="action-menu-dropdown" id="dept-menu-${dept.id}">
                                                        <button class="menu-item" onclick="DepartmentsPage.edit('${dept.id}'); DepartmentsPage.closeAllMenus();">
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                            </svg>
                                                            Editar
                                                        </button>
                                                        <button class="menu-item ${dept.ativo ? 'warning' : 'success'}" onclick="DepartmentsPage.toggleStatus('${dept.id}'); DepartmentsPage.closeAllMenus();">
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                ${dept.ativo ? `
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                                                ` : `
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                                `}
                                                            </svg>
                                                            ${dept.ativo ? 'Inativar' : 'Ativar'}
                                                        </button>
                                                    </div>
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

        // Fecha menus ao clicar fora
        document.addEventListener('click', () => this.closeAllMenus());

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
                background: rgba(0,0,0,0.5);
                z-index: 999;
            }
            .modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                z-index: 1000;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: modalSlideIn 0.2s ease;
            }
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                font-size: 18px;
                font-weight: 700;
                color: var(--top-blue);
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--text-muted);
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.15s;
            }
            .modal-close:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }
            .modal-body {
                padding: 24px;
            }
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--border);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .form-label {
                display: block;
                font-weight: 600;
                font-size: 13px;
                color: var(--text-primary);
                margin-bottom: 8px;
            }
            .error-message {
                background: var(--danger-bg);
                color: var(--danger);
                padding: 10px 12px;
                border-radius: var(--radius);
                font-size: 13px;
                margin-top: 12px;
                border: 1px solid var(--danger);
            }
            .data-table {
                border-collapse: collapse;
            }
            .data-table th {
                text-align: left;
                padding: 12px;
                border-bottom: 2px solid var(--border);
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--text-muted);
                letter-spacing: 0.5px;
            }
            .data-table td {
                padding: 16px 12px;
                border-bottom: 1px solid var(--border-light);
                font-size: 14px;
            }
            .data-table tbody tr {
                transition: background 0.15s;
            }
            .data-table tbody tr:hover {
                background: var(--bg-hover);
            }
            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                padding: 16px 20px;
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                font-size: 14px;
                font-weight: 500;
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
                background: var(--success);
                color: white;
            }
            .toast-error {
                background: var(--danger);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.DepartmentsPage = DepartmentsPage;
export { DepartmentsPage };
