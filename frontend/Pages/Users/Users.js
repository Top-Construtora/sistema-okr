import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { User } from '../../Entities/User.js';
import { Department } from '../../Entities/Department.js';
// Página de Usuários - CRUD Completo
const UsersPage = {
    currentUser: null,

    async render() {
        const content = document.getElementById('content');
        const allUsers = await User.getAll();
        const users = allUsers.filter(u => u.email !== 'admin@sistema.com');
        const departments = await Department.getActive();

        content.innerHTML = `
            <div class="page-gio-users">
                <!-- Action Button -->
                <div class="page-actions-gio">
                    <button class="btn-gio-primary" onclick="UsersPage.openModal()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo Usuário
                    </button>
                </div>

                <!-- Content Card -->
                <div class="card-gio">
                    ${users.length === 0 ? `
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                </svg>
                            </div>
                            <h3>Nenhum usuário cadastrado</h3>
                            <p>Comece criando seu primeiro usuário</p>
                            <button class="btn-gio-primary" onclick="UsersPage.openModal()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Criar Usuário
                            </button>
                        </div>
                    ` : `
                        <div class="table-gio-container">
                            <table class="table-gio">
                                <thead>
                                    <tr>
                                        <th style="min-width:200px;">Usuário</th>
                                        <th style="min-width:180px;">Email</th>
                                        <th style="min-width:140px;">Departamento</th>
                                        <th style="min-width:90px;text-align:center;">Tipo</th>
                                        <th style="width:100px;text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(user => {
                                        const userDepts = user.departments && user.departments.length > 0
                                            ? user.departments
                                            : (user.departamento_id ? [departments.find(d => d.id === user.departamento_id)].filter(Boolean) : []);
                                        return `
                                        <tr class="${!user.ativo ? 'row-inactive' : ''}">
                                            <td>
                                                <div class="table-cell-info">
                                                    <div class="user-avatar-gio ${user.ativo ? 'active' : 'inactive'}">
                                                        ${user.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div class="user-details-gio">
                                                        <span class="user-name-gio">${user.nome}</span>
                                                        <span class="user-status-gio ${user.ativo ? 'active' : 'inactive'}">
                                                            ${user.ativo ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="email-cell">${user.email}</td>
                                            <td>
                                                <div class="dept-badges-gio">
                                                    ${userDepts.length > 0
                                                        ? userDepts.map(d => `<span class="dept-badge-gio">${d.nome}</span>`).join('')
                                                        : '<span class="dept-badge-gio empty">N/A</span>'
                                                    }
                                                </div>
                                            </td>
                                            <td style="text-align:center;">
                                                <span class="type-badge-gio ${user.tipo}">
                                                    ${user.tipo === 'admin' ? 'Admin' : user.tipo === 'consultor' ? 'Consultor' : 'Colab.'}
                                                </span>
                                            </td>
                                            <td style="text-align:center;">
                                                <div class="action-buttons">
                                                    <button class="action-btn" onclick="UsersPage.edit('${user.id}')" title="Editar">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                        </svg>
                                                    </button>
                                                    <button class="action-btn ${user.ativo ? 'warning' : 'success'}" onclick="UsersPage.toggleStatus('${user.id}')" title="${user.ativo ? 'Inativar' : 'Ativar'}">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            ${user.ativo ? `
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                                            ` : `
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                            `}
                                                        </svg>
                                                    </button>
                                                    <button class="action-btn danger" onclick="UsersPage.deleteUser('${user.id}', '${user.nome}')" title="Excluir">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>

            <div id="user-modal" style="display:none;"></div>
            <div id="delete-confirmation-modal" style="display:none;"></div>
        `;

        this.addStyles();
    },

    async openModal(id = null) {
        this.currentUser = id ? await User.getById(id) : null;
        const departments = await Department.getActive();
        const modal = document.getElementById('user-modal');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="UsersPage.closeModal()"></div>
            <div class="modal-content" style="max-width:650px;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin:0;color:var(--top-blue);font-size:20px;">${this.currentUser ? 'Editar' : 'Novo'} Usuário</h3>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">
                            ${this.currentUser ? 'Atualize as informações do usuário' : 'Preencha os dados do novo usuário'}
                        </p>
                    </div>
                    <button class="modal-close" onclick="UsersPage.closeModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            Informações Pessoais
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="form-group">
                                <label class="form-label">Nome Completo *</label>
                                <input type="text" id="user-nome" class="form-control"
                                    placeholder="Ex: João Silva"
                                    value="${this.currentUser ? this.currentUser.nome : ''}"
                                    autocomplete="name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email *</label>
                                <input type="email" id="user-email" class="form-control"
                                    placeholder="joao@topconstrutora.com.br"
                                    value="${this.currentUser ? this.currentUser.email : ''}"
                                    ${this.currentUser ? 'disabled' : ''}
                                    autocomplete="email">
                                ${this.currentUser ? '<small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">O email não pode ser alterado</small>' : ''}
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            Dados Organizacionais
                        </div>

                        <div class="form-group" id="departamentos-group">
                            <label class="form-label" id="departamentos-label">Departamentos * <small style="font-weight:normal;color:var(--text-muted);">(selecione um ou mais)</small></label>
                            <div class="departments-checkbox-list" id="user-departamentos">
                                ${departments.map(dept => {
                                    const isChecked = this.currentUser && (
                                        (this.currentUser.departments && this.currentUser.departments.some(d => d.id === dept.id)) ||
                                        this.currentUser.departamento_id === dept.id
                                    );
                                    return `
                                    <label class="department-checkbox-item ${isChecked ? 'checked' : ''}">
                                        <input type="checkbox" name="user-dept" value="${dept.id}" ${isChecked ? 'checked' : ''}
                                            onchange="this.parentElement.classList.toggle('checked', this.checked)">
                                        <span class="dept-checkbox-name">${dept.nome}</span>
                                    </label>
                                `}).join('')}
                            </div>
                        </div>

                        <div class="form-group" style="margin-top:16px;">
                            <label class="form-label">Tipo de Usuário *</label>
                            <select id="user-tipo" class="form-control" onchange="UsersPage.onTipoChange()">
                                <option value="colaborador" ${this.currentUser && this.currentUser.tipo === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                                <option value="consultor" ${this.currentUser && this.currentUser.tipo === 'consultor' ? 'selected' : ''}>Consultor</option>
                                <option value="admin" ${this.currentUser && this.currentUser.tipo === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                            <small id="tipo-hint" style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                ${this.currentUser?.tipo === 'consultor' ? 'Consultor: visualiza OKRs e pode solicitar ajustes' : 'Admin tem acesso total ao sistema'}
                            </small>
                        </div>
                    </div>

                    ${!this.currentUser ? `
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                            Senha de Acesso
                        </div>

                        <div class="form-group">
                            <label class="form-label">Senha Temporária *</label>
                            <input type="password" id="user-senha" class="form-control"
                                placeholder="Mínimo 6 caracteres"
                                autocomplete="new-password">
                            <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                O usuário poderá alterar a senha após o primeiro acesso
                            </small>
                        </div>
                    </div>
                    ` : ''}

                    <div id="user-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="UsersPage.closeModal()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="UsersPage.save()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentUser ? 'Atualizar' : 'Criar'} Usuário
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';

        // Aplica estado inicial baseado no tipo
        this.onTipoChange();
    },

    // Chamado quando o tipo de usuário muda
    onTipoChange() {
        const tipo = document.getElementById('user-tipo')?.value;
        const deptsGroup = document.getElementById('departamentos-group');
        const deptsLabel = document.getElementById('departamentos-label');
        const tipoHint = document.getElementById('tipo-hint');
        const checkboxes = document.querySelectorAll('input[name="user-dept"]');

        if (!deptsGroup) return;

        if (tipo === 'consultor') {
            // Consultor não tem departamento
            deptsGroup.style.opacity = '0.5';
            deptsGroup.style.pointerEvents = 'none';
            deptsLabel.innerHTML = 'Departamentos <small style="font-weight:normal;color:var(--text-muted);">(não aplicável para consultor)</small>';
            tipoHint.textContent = 'Consultor: visualiza OKRs e pode solicitar ajustes no Comitê';
            // Desmarca todos os departamentos
            checkboxes.forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });
        } else {
            // Admin ou Colaborador precisam de departamento
            deptsGroup.style.opacity = '1';
            deptsGroup.style.pointerEvents = 'auto';
            deptsLabel.innerHTML = 'Departamentos * <small style="font-weight:normal;color:var(--text-muted);">(selecione um ou mais)</small>';
            tipoHint.textContent = tipo === 'admin' ? 'Admin tem acesso total ao sistema' : 'Colaborador tem acesso ao seu departamento';
        }
    },

    closeModal() {
        document.getElementById('user-modal').style.display = 'none';
        this.currentUser = null;
    },

    async save() {
        const nome = document.getElementById('user-nome').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const tipo = document.getElementById('user-tipo').value;
        const senhaEl = document.getElementById('user-senha');
        const senha = senhaEl ? senhaEl.value : '';
        const errorDiv = document.getElementById('user-error');

        // Coletar departamentos selecionados
        const selectedDepts = Array.from(document.querySelectorAll('input[name="user-dept"]:checked'))
            .map(cb => cb.value);

        errorDiv.style.display = 'none';

        if (!nome || !email) {
            errorDiv.textContent = 'Preencha todos os campos obrigatórios';
            errorDiv.style.display = 'block';
            return;
        }

        // Consultor não precisa de departamento, outros tipos precisam
        if (tipo !== 'consultor' && selectedDepts.length === 0) {
            errorDiv.textContent = 'Selecione pelo menos um departamento';
            errorDiv.style.display = 'block';
            return;
        }

        if (!this.currentUser && !senha) {
            errorDiv.textContent = 'Senha é obrigatória para novos usuários';
            errorDiv.style.display = 'block';
            return;
        }

        if (senha && senha.length < 6) {
            errorDiv.textContent = 'Senha deve ter no mínimo 6 caracteres';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const user = this.currentUser || new User();
            user.nome = nome;
            user.email = email;
            user.tipo = tipo;

            // Configurar departamentos (consultor não tem departamento)
            if (tipo === 'consultor') {
                user.departments = [];
                user.departamento_id = null;
            } else {
                user.departments = selectedDepts.map((id, idx) => ({ id, is_primary: idx === 0 }));
                user.departamento_id = selectedDepts[0]; // Compatibilidade
            }

            if (senha) {
                user.senha = senha;
            }
            await user.save();

            this.closeModal();
            this.render();
            DepartmentsPage.showToast(`Usuário ${this.currentUser ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    edit(id) {
        this.openModal(id);
    },

    async toggleStatus(id) {
        const user = await User.getById(id);
        if (!user) return;

        const action = user.ativo ? 'inativar' : 'ativar';

        if (confirm(`Deseja realmente ${action} o usuário "${user.nome}"?`)) {
            try {
                await User.toggleActive(id);
                await this.render();
                DepartmentsPage.showToast(`Usuário ${user.ativo ? 'inativado' : 'ativado'} com sucesso!`, 'success');
            } catch (error) {
                DepartmentsPage.showToast(error.message, 'error');
            }
        }
    },

    deleteUser(id, nome) {
        this.openDeleteConfirmationModal(id, nome);
    },

    openDeleteConfirmationModal(id, nome) {
        const modal = document.getElementById('delete-confirmation-modal');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="UsersPage.closeDeleteConfirmationModal()"></div>
            <div class="modal-content delete-confirmation-modal" style="max-width:420px;">
                <div class="delete-confirmation-header">
                    <div class="delete-icon">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h3 style="margin:0 0 8px 0;color:var(--danger);font-size:20px;font-weight:700;">Excluir Usuário</h3>
                    <p style="margin:0;font-size:15px;color:var(--text-secondary);">Deseja excluir permanentemente:</p>
                </div>

                <div class="modal-body" style="padding:0 32px 24px;">
                    <div style="background:var(--bg-main);padding:16px;border-radius:8px;border-left:4px solid var(--danger);margin-bottom:20px;">
                        <strong style="font-size:16px;color:var(--top-blue);">${nome}</strong>
                    </div>
                    <p style="margin:0;font-size:13px;color:var(--text-muted);text-align:center;">
                        Esta ação não pode ser desfeita.
                    </p>
                </div>

                <div class="modal-footer" style="gap:12px;padding:0 32px 32px;">
                    <button class="btn btn-secondary" onclick="UsersPage.closeDeleteConfirmationModal()" style="flex:1;">
                        Cancelar
                    </button>
                    <button class="btn btn-danger" onclick="UsersPage.confirmDelete('${id}')" style="flex:1;">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    },

    closeDeleteConfirmationModal() {
        document.getElementById('delete-confirmation-modal').style.display = 'none';
    },

    async confirmDelete(id) {
        try {
            await User.delete(id);
            this.closeDeleteConfirmationModal();
            await this.render();
            DepartmentsPage.showToast('Usuário excluído com sucesso!', 'success');
        } catch (error) {
            this.closeDeleteConfirmationModal();
            DepartmentsPage.showToast(error.message || 'Erro ao excluir usuário', 'error');
        }
    },

    toggleMenu(event, userId) {
        event.stopPropagation();
        event.preventDefault();

        const button = event.currentTarget;
        if (!button) return;

        // Abre o menu (a função já lida com toggle)
        window.openDropdownMenu(button, `menu-${userId}`);
    },

    closeAllMenus() {
        window.closeAllDropdownMenus();
    },

    addStyles() {
        if (document.getElementById('users-gio-styles')) return;

        const style = document.createElement('style');
        style.id = 'users-gio-styles';
        style.textContent = `
            /* ===== PAGE GIO USERS STYLES ===== */
            .page-gio-users {
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
                padding: 14px 16px;
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
                padding: 12px 16px;
                vertical-align: middle;
            }

            .table-cell-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            /* User Avatar GIO */
            .user-avatar-gio {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: 700;
                flex-shrink: 0;
            }

            .user-avatar-gio.active {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .user-avatar-gio.inactive {
                background: #f1f5f9;
                color: #94a3b8;
            }

            .user-details-gio {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .user-name-gio {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }

            .user-status-gio {
                font-size: 11px;
                font-weight: 500;
            }

            .user-status-gio.active {
                color: #059669;
            }

            .user-status-gio.inactive {
                color: #94a3b8;
            }

            .email-cell {
                font-size: 13px;
                color: #64748b;
            }

            /* Dept Badges GIO */
            .dept-badges-gio {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .dept-badge-gio {
                display: inline-block;
                padding: 4px 10px;
                background: rgba(30, 96, 118, 0.08);
                color: #1e6076;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
            }

            .dept-badge-gio.empty {
                background: #f1f5f9;
                color: #94a3b8;
            }

            /* Type Badge GIO */
            .type-badge-gio {
                display: inline-block;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
            }

            .type-badge-gio.admin {
                background: rgba(239, 68, 68, 0.12);
                color: #dc2626;
            }

            .type-badge-gio.consultor {
                background: rgba(245, 158, 11, 0.12);
                color: #d97706;
            }

            .type-badge-gio.colaborador {
                background: rgba(16, 185, 129, 0.12);
                color: #059669;
            }

            /* Action Buttons */
            .action-buttons {
                display: flex;
                justify-content: center;
                gap: 6px;
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

            .action-btn.danger:hover {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .action-btn svg {
                width: 16px;
                height: 16px;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .page-gio-users {
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
                    padding: 10px 12px;
                }

                .user-avatar-gio {
                    width: 36px;
                    height: 36px;
                    font-size: 12px;
                }

                .user-name-gio {
                    font-size: 13px;
                }

                .email-cell {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.UsersPage = UsersPage;
export { UsersPage };
