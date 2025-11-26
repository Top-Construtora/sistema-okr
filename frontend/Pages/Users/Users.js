import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { User } from '../../Entities/User.js';
import { Department } from '../../Entities/Department.js';
// Página de Usuários - CRUD Completo
const UsersPage = {
    currentUser: null,

    async render() {
        const content = document.getElementById('content');
        const users = await User.getAll();
        const departments = await Department.getActive();

        content.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Gestão de Usuários</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${users.length} ${users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}</p>
                </div>
                <button class="btn btn-primary" onclick="UsersPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Usuário
                </button>
            </div>

            <div class="card">
                <div class="card-body">
                    ${users.length === 0 ? `
                        <div style="text-align:center;padding:60px 20px;">
                            <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                            <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum usuário cadastrado</p>
                            <button class="btn btn-primary" onclick="UsersPage.openModal()">
                                Criar primeiro usuário
                            </button>
                        </div>
                    ` : `
                        <table class="data-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th style="width:30%;">Nome</th>
                                    <th style="width:25%;">Email</th>
                                    <th style="width:20%;">Departamento</th>
                                    <th style="width:12%;">Tipo</th>
                                    <th style="width:13%;text-align:right;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => {
                                    const dept = user.getDepartment();
                                    return `
                                    <tr>
                                        <td>
                                            <div style="display:flex;align-items:center;gap:12px;">
                                                <div style="width:40px;height:40px;border-radius:8px;background:${user.ativo ? 'var(--top-gold)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;color:${user.ativo ? 'var(--top-blue)' : 'var(--text-muted)'};font-weight:700;font-size:14px;">
                                                    ${user.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style="font-size:14px;display:block;${user.ativo ? '' : 'color:var(--text-muted);'}">${user.nome}</strong>
                                                    <span class="badge ${user.ativo ? 'badge-active' : 'badge-pending'}" style="font-size:10px;margin-top:2px;">
                                                        ${user.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="color:var(--text-secondary);font-size:13px;">${user.email}</td>
                                        <td>
                                            <span class="badge badge-active" style="background:var(--top-blue);color:white;">
                                                ${dept ? dept.nome : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            ${user.tipo === 'admin' ? `
                                                <span class="badge badge-cycle">Admin</span>
                                            ` : `
                                                <span class="badge badge-active">Colaborador</span>
                                            `}
                                        </td>
                                        <td style="text-align:right;">
                                            <button class="btn btn-sm btn-secondary" onclick="UsersPage.edit('${user.id}')">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button class="btn btn-sm ${user.ativo ? 'btn-danger' : 'btn-success'}"
                                                onclick="UsersPage.toggleStatus('${user.id}')">
                                                ${user.ativo ? 'Inativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>

            <div id="user-modal" style="display:none;"></div>
        `;
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

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="form-group">
                                <label class="form-label">Departamento *</label>
                                <select id="user-departamento" class="form-control">
                                    <option value="">Selecione...</option>
                                    ${departments.map(dept => `
                                        <option value="${dept.id}" ${this.currentUser && this.currentUser.departamento_id === dept.id ? 'selected' : ''}>
                                            ${dept.nome}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo de Usuário *</label>
                                <select id="user-tipo" class="form-control">
                                    <option value="colaborador" ${this.currentUser && this.currentUser.tipo === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                                    <option value="admin" ${this.currentUser && this.currentUser.tipo === 'admin' ? 'selected' : ''}>Administrador</option>
                                </select>
                                <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                    Admin tem acesso total ao sistema
                                </small>
                            </div>
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
    },

    closeModal() {
        document.getElementById('user-modal').style.display = 'none';
        this.currentUser = null;
    },

    save() {
        const nome = document.getElementById('user-nome').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const departamentoId = document.getElementById('user-departamento').value;
        const tipo = document.getElementById('user-tipo').value;
        const senha = document.getElementById('user-senha').value;
        const errorDiv = document.getElementById('user-error');

        errorDiv.style.display = 'none';

        if (!nome || !email || !departamentoId) {
            errorDiv.textContent = 'Preencha todos os campos obrigatórios';
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
            user.departamentoId = departamentoId;
            user.tipo = tipo;
            if (senha) {
                user.senha = senha;
            }
            user.save();

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

    toggleStatus(id) {
        const user = User.getById(id);
        if (!user) return;

        const action = user.ativo ? 'inativar' : 'ativar';

        if (confirm(`Deseja realmente ${action} o usuário "${user.nome}"?`)) {
            try {
                User.toggleActive(id);
                this.render();
                DepartmentsPage.showToast(`Usuário ${user.ativo ? 'inativado' : 'ativado'} com sucesso!`, 'success');
            } catch (error) {
                DepartmentsPage.showToast(error.message, 'error');
            }
        }
    }
};

// Expõe globalmente
window.UsersPage = UsersPage;
export { UsersPage };
