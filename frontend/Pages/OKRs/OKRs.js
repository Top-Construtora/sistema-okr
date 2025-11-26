import { StorageService, uid } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';

import { OKR, OKR_STATUS } from '../../Entities/OKR.js';
import { Department } from '../../Entities/Department.js';
// Página de OKRs - Gestão Completa
const OKRsPage = {
    currentFilter: 'all',
    currentDepartment: 'all',
    currentOKR: null,
    formKRs: [],

    async render() {
        const content = document.getElementById('content');
        const okrs = await OKR.getAll();
        const departments = await Department.getActive();

        content.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Gestão de OKRs</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${okrs.length} ${okrs.length === 1 ? 'OKR cadastrado' : 'OKRs cadastrados'}</p>
                </div>
                <button class="btn btn-primary" onclick="OKRsPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo OKR
                </button>
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

                <div style="margin-left:auto;">
                    <select id="dept-filter" class="form-control" onchange="OKRsPage.filterByDepartment(this.value)" style="min-width:200px;">
                        <option value="all">Todos os Departamentos</option>
                        ${departments.map(dept => `
                            <option value="${dept.nome}" ${this.currentDepartment === dept.nome ? 'selected' : ''}>
                                ${dept.nome}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div id="okrs-list"></div>
            <div id="okr-modal" style="display:none;"></div>
        `;

        await this.renderList();
        this.addStyles();
    },

    async renderList() {
        const container = document.getElementById('okrs-list');
        let okrs = await OKR.getAll();

        // Filtro por status
        if (this.currentFilter === 'pending') {
            okrs = okrs.filter(o => o.status === 'pending');
        } else if (this.currentFilter === 'approved') {
            okrs = okrs.filter(o => o.status === 'approved');
        } else if (this.currentFilter === 'completed') {
            okrs = okrs.filter(o => o.status === 'completed' || o.status === 'homologated');
        }

        // Filtro por departamento
        if (this.currentDepartment !== 'all') {
            okrs = okrs.filter(o => o.department === this.currentDepartment);
        }

        if (okrs.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum OKR encontrado</p>
                        <button class="btn btn-primary" onclick="OKRsPage.openModal()">
                            Criar primeiro OKR
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = okrs.map(okr => this.renderOKRCard(okr)).join('');
    },

    renderOKRCard(okr) {
        const objective = okr.getObjective();

        return `
            <div class="okr-card card" style="margin-bottom:20px;">
                <div class="card-body">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
                        <div style="flex:1;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                <span class="badge ${OKR_STATUS[okr.status].badge}">${OKR_STATUS[okr.status].label}</span>
                                <span class="badge badge-active">${okr.department}</span>
                            </div>
                            <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">
                                ${okr.title}
                            </h3>
                            <p style="font-size:13px;color:var(--text-muted);">
                                Vinculado: ${objective ? objective.text : 'N/A'}
                            </p>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-sm btn-secondary" onclick="OKRsPage.edit('${okr.id}')">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="OKRsPage.delete('${okr.id}')">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="kr-list">
                        ${okr.keyResults.map((kr, idx) => `
                            <div class="kr-item">
                                <div class="kr-header">
                                    <div style="display:flex;align-items:center;gap:12px;flex:1;">
                                        <div class="kr-number">${idx + 1}</div>
                                        <div style="flex:1;">
                                            <div class="kr-title">${kr.title}</div>
                                            <div class="kr-meta">
                                                <span>Meta: ${kr.target} ${kr.metric}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="kr-progress-value">${kr.progress}%</div>
                                </div>
                                <div class="kr-progress-bar">
                                    <input type="range" class="kr-slider" min="0" max="100" value="${kr.progress}"
                                        onchange="OKRsPage.updateKRProgress('${okr.id}', '${kr.id}', this.value)">
                                    <div class="progress">
                                        <div class="progress-bar" style="width:${kr.progress}%"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-light);">
                        <div style="font-size:13px;color:var(--text-muted);">
                            Progresso geral: <strong style="color:var(--top-teal);">${okr.progress}%</strong>
                        </div>
                        <div class="progress" style="flex:1;margin:0 20px;">
                            <div class="progress-bar" style="width:${okr.progress}%"></div>
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

    async openModal(id = null) {
        this.currentOKR = id ? await OKR.getById(id) : null;
        this.formKRs = this.currentOKR ? [...this.currentOKR.keyResults] : [this.createEmptyKR()];

        const modal = document.getElementById('okr-modal');
        const objectives = await StorageService.getObjectives();
        const departments = await Department.getActive();

        modal.innerHTML = `
            <div class="modal-overlay" onclick="OKRsPage.closeModal()"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>${this.currentOKR ? 'Editar' : 'Novo'} OKR</h3>
                    <button class="modal-close" onclick="OKRsPage.closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
                    <div class="form-section">
                        <h4 class="form-section-title">Informações Básicas</h4>

                        <div class="form-group">
                            <label class="form-label">Título do OKR *</label>
                            <input type="text" id="okr-title" class="form-control"
                                placeholder="Ex: Reduzir tempo de aprovação de projetos em 50%"
                                value="${this.currentOKR ? this.currentOKR.title : ''}">
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
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
                                <select id="okr-department" class="form-control">
                                    <option value="">Selecione...</option>
                                    ${departments.map(dept => `
                                        <option value="${dept.nome}" ${this.currentOKR && this.currentOKR.department === dept.nome ? 'selected' : ''}>
                                            ${dept.nome}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                            <h4 class="form-section-title" style="margin:0;">Key Results *</h4>
                            <button class="btn btn-sm btn-secondary" onclick="OKRsPage.addKR()">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Adicionar KR
                            </button>
                        </div>

                        <div id="krs-container"></div>
                    </div>

                    <div id="okr-error" class="error-message" style="display:none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="OKRsPage.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="OKRsPage.save()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Salvar OKR
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        this.renderKRs();
    },

    createEmptyKR() {
        return {
            id: uid(),
            title: '',
            metric: '',
            target: '',
            progress: 0,
            tasks: []
        };
    },

    renderKRs() {
        const container = document.getElementById('krs-container');

        container.innerHTML = this.formKRs.map((kr, idx) => `
            <div class="kr-form-item">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <strong style="color:var(--top-blue);">Key Result ${idx + 1}</strong>
                    ${this.formKRs.length > 1 ? `
                        <button class="btn btn-sm btn-danger" onclick="OKRsPage.removeKR(${idx})" type="button">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Título do Key Result *</label>
                    <input type="text" class="form-control"
                        value="${kr.title}"
                        onchange="OKRsPage.updateKR(${idx}, 'title', this.value)"
                        placeholder="Ex: Diminuir tempo médio de 15 para 7 dias">
                </div>

                <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Métrica *</label>
                        <input type="text" class="form-control"
                            value="${kr.metric}"
                            onchange="OKRsPage.updateKR(${idx}, 'metric', this.value)"
                            placeholder="Ex: Dias, %, R$">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Meta *</label>
                        <input type="text" class="form-control"
                            value="${kr.target}"
                            onchange="OKRsPage.updateKR(${idx}, 'target', this.value)"
                            placeholder="Ex: 7">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Progresso</label>
                        <input type="number" class="form-control" min="0" max="100"
                            value="${kr.progress}"
                            onchange="OKRsPage.updateKR(${idx}, 'progress', parseInt(this.value))"
                            placeholder="0">
                    </div>
                </div>
            </div>
        `).join('');
    },

    updateKR(idx, field, value) {
        this.formKRs[idx][field] = value;
    },

    addKR() {
        this.formKRs.push(this.createEmptyKR());
        this.renderKRs();
    },

    removeKR(idx) {
        if (this.formKRs.length > 1) {
            this.formKRs.splice(idx, 1);
            this.renderKRs();
        }
    },

    closeModal() {
        document.getElementById('okr-modal').style.display = 'none';
        this.currentOKR = null;
        this.formKRs = [];
    },

    save() {
        const title = document.getElementById('okr-title').value.trim();
        const objectiveId = parseInt(document.getElementById('okr-objective').value);
        const department = document.getElementById('okr-department').value;
        const errorDiv = document.getElementById('okr-error');

        errorDiv.style.display = 'none';

        if (!title) {
            errorDiv.textContent = 'Título do OKR é obrigatório';
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

        const validKRs = this.formKRs.filter(kr => kr.title && kr.metric && kr.target);
        if (validKRs.length === 0) {
            errorDiv.textContent = 'Adicione pelo menos um Key Result válido';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const okr = this.currentOKR || new OKR();
            okr.title = title;
            okr.objectiveId = objectiveId;
            okr.department = department;
            okr.keyResults = validKRs;
            okr.save();

            this.closeModal();
            this.render();
            DepartmentsPage.showToast(`OKR ${this.currentOKR ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    edit(id) {
        this.openModal(id);
    },

    delete(id) {
        const okr = OKR.getById(id);
        if (!okr) return;

        if (confirm(`Deseja realmente excluir o OKR "${okr.title}"?`)) {
            OKR.delete(id);
            this.render();
            DepartmentsPage.showToast('OKR excluído com sucesso!', 'success');
        }
    },

    updateKRProgress(okrId, krId, progress) {
        const okr = OKR.getById(okrId);
        if (okr) {
            okr.updateKeyResultProgress(krId, parseInt(progress));
            this.render();
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
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.OKRsPage = OKRsPage;
export { OKRsPage };
