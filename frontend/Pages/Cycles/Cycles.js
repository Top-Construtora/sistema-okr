import { StorageService } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { Cycle } from '../../Entities/Cycle.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';

// Página de Gestão de Ciclos
const CyclesPage = {
    currentCycle: null,
    currentMiniCycle: null,
    expandedCycles: new Set(),

    async render() {
        const content = document.getElementById('content');
        const cycles = await Cycle.getAll();

        content.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Gestão de Ciclos</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${cycles.length} ${cycles.length === 1 ? 'ciclo cadastrado' : 'ciclos cadastrados'}</p>
                </div>
                <button class="btn btn-primary" onclick="CyclesPage.openCycleModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Ciclo
                </button>
            </div>

            <div id="cycles-list"></div>
            <div id="cycle-modal" style="display:none;"></div>
            <div id="minicycle-modal" style="display:none;"></div>
        `;

        await this.renderList();
        this.addStyles();
    },

    async renderList() {
        const container = document.getElementById('cycles-list');
        const cycles = await Cycle.getAll();

        if (cycles.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum ciclo encontrado</p>
                        <button class="btn btn-primary" onclick="CyclesPage.openCycleModal()">
                            Criar primeiro ciclo
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        for (const cycle of cycles) {
            const miniCycles = await cycle.getMiniCycles();
            const isExpanded = this.expandedCycles.has(cycle.id);
            const isCurrentlyActive = cycle.isCurrentlyActive();

            html += `
                <div class="card cycle-card" style="margin-bottom:20px;">
                    <div class="card-header" style="background:${isCurrentlyActive ? 'var(--success-bg)' : 'var(--bg-main)'};border-bottom:2px solid ${isCurrentlyActive ? 'var(--success)' : 'var(--border)'};">
                        <div style="display:flex;align-items:center;gap:12px;flex:1;">
                            <button class="btn-icon" onclick="CyclesPage.toggleExpand('${cycle.id}')" style="color:var(--top-teal);" data-toggle-btn="${cycle.id}">
                                <svg style="width:20px;height:20px;transform:rotate(${isExpanded ? '90' : '0'}deg);transition:transform 0.3s;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                            <div style="flex:1;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                    <h3 style="font-size:18px;font-weight:700;color:var(--top-blue);margin:0;">${cycle.nome}</h3>
                                    ${isCurrentlyActive ? `
                                        <span class="badge badge-success">Ativo Agora</span>
                                    ` : cycle.ativo ? `
                                        <span class="badge badge-active">Ativo</span>
                                    ` : `
                                        <span class="badge badge-inactive">Inativo</span>
                                    `}
                                    <span class="badge" style="background:var(--info-bg);color:var(--info);">
                                        ${miniCycles.length} ${miniCycles.length === 1 ? 'Miniciclo' : 'Miniciclos'}
                                    </span>
                                </div>
                                <div style="display:flex;gap:16px;font-size:13px;color:var(--text-muted);">
                                    <span>
                                        <svg style="width:14px;height:14px;display:inline;vertical-align:middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        ${this.formatDate(cycle.data_inicio)} até ${this.formatDate(cycle.data_fim)}
                                    </span>
                                    ${cycle.descricao ? `<span>${cycle.descricao}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-sm btn-secondary" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Adicionar Miniciclo
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="CyclesPage.openCycleModal('${cycle.id}')">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="btn btn-sm ${cycle.ativo ? 'btn-danger' : 'btn-success'}" onclick="CyclesPage.toggleCycle('${cycle.id}')">
                                ${cycle.ativo ? 'Inativar' : 'Ativar'}
                            </button>
                        </div>
                    </div>

                    <div class="minicycles-container ${isExpanded ? 'expanded' : ''}" data-cycle-id="${cycle.id}">
                        ${miniCycles.length > 0 ? `
                            <div class="card-body">
                                <div class="minicycles-grid">
                                    ${await this.renderMiniCycles(miniCycles)}
                                </div>
                            </div>
                        ` : `
                            <div class="card-body" style="text-align:center;padding:40px;color:var(--text-muted);">
                                <p>Nenhum miniciclo criado ainda.</p>
                                <button class="btn btn-sm btn-primary" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')" style="margin-top:12px;">
                                    Criar Primeiro Miniciclo
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    async renderMiniCycles(miniCycles) {
        let html = '';

        for (const mini of miniCycles) {
            const okrsCount = await mini.getOKRsCount();
            const avgProgress = okrsCount > 0 ? await mini.calculateAverageProgress() : 0;
            const isCurrentlyActive = mini.isCurrentlyActive();

            html += `
                <div class="minicycle-card ${isCurrentlyActive ? 'current-active' : ''}">
                    <div class="minicycle-header">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <div class="minicycle-ordem">${mini.ordem}</div>
                            <div>
                                <h4 style="font-size:15px;font-weight:600;color:var(--top-blue);margin:0;">${mini.nome}</h4>
                                ${mini.descricao ? `<p style="font-size:12px;color:var(--text-muted);margin:0;">${mini.descricao}</p>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:4px;align-items:center;">
                            ${isCurrentlyActive ? `
                                <span class="badge badge-success" style="font-size:10px;">Atual</span>
                            ` : mini.ativo ? `
                                <span class="badge badge-active" style="font-size:10px;">Ativo</span>
                            ` : `
                                <span class="badge badge-inactive" style="font-size:10px;">Inativo</span>
                            `}
                        </div>
                    </div>

                    <div class="minicycle-body">
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
                            <svg style="width:12px;height:12px;display:inline;vertical-align:middle;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            ${this.formatDate(mini.data_inicio)} até ${this.formatDate(mini.data_fim)}
                        </div>

                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                            <div style="flex:1;">
                                <div class="progress progress-sm">
                                    <div class="progress-bar" style="width:${avgProgress}%"></div>
                                </div>
                            </div>
                            <span style="font-size:13px;font-weight:600;color:var(--top-teal);">${avgProgress}%</span>
                        </div>

                        <div style="font-size:12px;color:var(--text-muted);">
                            ${okrsCount} ${okrsCount === 1 ? 'OKR' : 'OKRs'}
                        </div>
                    </div>

                    <div class="minicycle-footer">
                        <button class="btn btn-sm btn-secondary" onclick="CyclesPage.openMiniCycleModal('${mini.cycle_id}', '${mini.id}')" title="Editar miniciclo">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm ${mini.ativo ? 'btn-danger' : 'btn-success'}" onclick="CyclesPage.toggleMiniCycle('${mini.id}')" title="${mini.ativo ? 'Inativar' : 'Ativar'} miniciclo">
                            ${mini.ativo ? 'Inativar' : 'Ativar'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="CyclesPage.deleteMiniCycle('${mini.id}', '${mini.nome}')" title="Deletar miniciclo" style="margin-left:auto;">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        return html;
    },

    toggleExpand(cycleId) {
        const container = document.querySelector(`.minicycles-container[data-cycle-id="${cycleId}"]`);
        const button = document.querySelector(`[data-toggle-btn="${cycleId}"]`);
        const arrow = button?.querySelector('svg');

        if (!container) return;

        if (this.expandedCycles.has(cycleId)) {
            this.expandedCycles.delete(cycleId);
            container.classList.remove('expanded');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        } else {
            this.expandedCycles.add(cycleId);
            container.classList.add('expanded');
            if (arrow) arrow.style.transform = 'rotate(90deg)';
        }
    },

    async openCycleModal(id = null) {
        this.currentCycle = id ? await Cycle.getById(id) : null;
        const modal = document.getElementById('cycle-modal');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="CyclesPage.closeCycleModal()"></div>
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin:0;color:var(--top-blue);font-size:20px;">${this.currentCycle ? 'Editar' : 'Novo'} Ciclo</h3>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">
                            ${this.currentCycle ? 'Atualize as informações do ciclo' : 'Defina o período do ciclo e seus miniciclos'}
                        </p>
                    </div>
                    <button class="modal-close" onclick="CyclesPage.closeCycleModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome do Ciclo *</label>
                        <input type="text" id="cycle-nome" class="form-control"
                            placeholder="Ex: 2025, H1 2025, Semestre 1"
                            value="${this.currentCycle ? this.currentCycle.nome : ''}">
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Descrição</label>
                        <textarea id="cycle-descricao" class="form-control" rows="2"
                            placeholder="Descrição do ciclo (opcional)">${this.currentCycle ? this.currentCycle.descricao : ''}</textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">Data de Início *</label>
                            <input type="date" id="cycle-inicio" class="form-control"
                                value="${this.currentCycle ? this.currentCycle.data_inicio : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Data de Fim *</label>
                            <input type="date" id="cycle-fim" class="form-control"
                                value="${this.currentCycle ? this.currentCycle.data_fim : ''}">
                        </div>
                    </div>

                    ${!this.currentCycle ? `
                        <div class="form-group" style="margin-top:16px;">
                            <label class="form-label">Quantidade de Miniciclos *</label>
                            <select id="cycle-minicycles-count" class="form-control">
                                <option value="2">2 miniciclos (Semestres)</option>
                                <option value="3">3 miniciclos (Trimestres)</option>
                                <option value="4" selected>4 miniciclos (Quartis)</option>
                                <option value="6">6 miniciclos (Bimestres)</option>
                                <option value="12">12 miniciclos (Meses)</option>
                            </select>
                            <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                Os miniciclos serão criados automaticamente dividindo o período
                            </small>
                        </div>
                    ` : ''}

                    <div class="form-group" style="margin-top:16px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="cycle-ativo" ${this.currentCycle ? (this.currentCycle.ativo ? 'checked' : '') : 'checked'}>
                            <span>Ciclo ativo</span>
                        </label>
                    </div>

                    <div id="cycle-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CyclesPage.closeCycleModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="CyclesPage.saveCycle()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentCycle ? 'Atualizar' : 'Criar'} Ciclo
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    async openMiniCycleModal(cycleId, miniId = null) {
        this.currentMiniCycle = miniId ? await MiniCycle.getById(miniId) : null;
        const cycle = await Cycle.getById(cycleId);
        const modal = document.getElementById('minicycle-modal');

        if (!cycle) {
            alert('Erro: Ciclo não encontrado');
            return;
        }

        const miniCycles = await cycle.getMiniCycles();
        const nextOrdem = this.currentMiniCycle ? this.currentMiniCycle.ordem : (Math.max(...miniCycles.map(m => m.ordem), 0) + 1);

        modal.innerHTML = `
            <div class="modal-overlay" onclick="CyclesPage.closeMiniCycleModal()"></div>
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin:0;color:var(--top-blue);font-size:20px;">${this.currentMiniCycle ? 'Editar' : 'Novo'} Miniciclo</h3>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">
                            Ciclo: ${cycle.nome} (${this.formatDate(cycle.data_inicio)} - ${this.formatDate(cycle.data_fim)})
                        </p>
                    </div>
                    <button class="modal-close" onclick="CyclesPage.closeMiniCycleModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <input type="hidden" id="mini-cycle-id" value="${cycleId}">

                    <div class="form-group">
                        <label class="form-label">Nome do Miniciclo *</label>
                        <input type="text" id="mini-nome" class="form-control"
                            placeholder="Ex: Q1 2025, Janeiro, Semestre 1"
                            value="${this.currentMiniCycle ? this.currentMiniCycle.nome : ''}">
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Descrição</label>
                        <textarea id="mini-descricao" class="form-control" rows="2"
                            placeholder="Descrição do miniciclo (opcional)">${this.currentMiniCycle ? this.currentMiniCycle.descricao : ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label class="form-label">Ordem *</label>
                        <input type="number" id="mini-ordem" class="form-control" min="1"
                            value="${nextOrdem}"
                            placeholder="1, 2, 3, 4...">
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            Ordem de exibição do miniciclo
                        </small>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">Data de Início *</label>
                            <input type="date" id="mini-inicio" class="form-control"
                                value="${this.currentMiniCycle ? this.currentMiniCycle.data_inicio : cycle.data_inicio}"
                                min="${cycle.data_inicio}"
                                max="${cycle.data_fim}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Data de Fim *</label>
                            <input type="date" id="mini-fim" class="form-control"
                                value="${this.currentMiniCycle ? this.currentMiniCycle.data_fim : cycle.data_fim}"
                                min="${cycle.data_inicio}"
                                max="${cycle.data_fim}">
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="mini-ativo" ${this.currentMiniCycle ? (this.currentMiniCycle.ativo ? 'checked' : '') : 'checked'}>
                            <span>Miniciclo ativo</span>
                        </label>
                    </div>

                    <div id="mini-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CyclesPage.closeMiniCycleModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="CyclesPage.saveMiniCycle()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentMiniCycle ? 'Atualizar' : 'Criar'} Miniciclo
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    closeCycleModal() {
        document.getElementById('cycle-modal').style.display = 'none';
        this.currentCycle = null;
    },

    closeMiniCycleModal() {
        document.getElementById('minicycle-modal').style.display = 'none';
        this.currentMiniCycle = null;
    },

    async saveCycle() {
        const nome = document.getElementById('cycle-nome').value.trim();
        const descricao = document.getElementById('cycle-descricao').value.trim();
        const dataInicio = document.getElementById('cycle-inicio').value;
        const dataFim = document.getElementById('cycle-fim').value;
        const ativo = document.getElementById('cycle-ativo').checked;
        const errorDiv = document.getElementById('cycle-error');

        try {
            if (this.currentCycle) {
                // Atualizar ciclo existente
                this.currentCycle.nome = nome;
                this.currentCycle.descricao = descricao;
                this.currentCycle.data_inicio = dataInicio;
                this.currentCycle.data_fim = dataFim;
                this.currentCycle.ativo = ativo;
                await this.currentCycle.save();

                DepartmentsPage.showToast('Ciclo atualizado com sucesso!', 'success');
            } else {
                // Criar novo ciclo com miniciclos
                const miniCyclesCount = parseInt(document.getElementById('cycle-minicycles-count').value);

                await Cycle.createWithMiniCycles({
                    nome,
                    descricao,
                    data_inicio: dataInicio,
                    data_fim: dataFim,
                    ativo
                }, miniCyclesCount);

                DepartmentsPage.showToast(`Ciclo criado com ${miniCyclesCount} miniciclos!`, 'success');
            }

            this.closeCycleModal();
            await this.render();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    async saveMiniCycle() {
        const cycleId = document.getElementById('mini-cycle-id').value;
        const nome = document.getElementById('mini-nome').value.trim();
        const descricao = document.getElementById('mini-descricao').value.trim();
        const ordem = parseInt(document.getElementById('mini-ordem').value);
        const dataInicio = document.getElementById('mini-inicio').value;
        const dataFim = document.getElementById('mini-fim').value;
        const ativo = document.getElementById('mini-ativo').checked;
        const errorDiv = document.getElementById('mini-error');

        try {
            if (this.currentMiniCycle) {
                // Atualizar
                this.currentMiniCycle.nome = nome;
                this.currentMiniCycle.descricao = descricao;
                this.currentMiniCycle.ordem = ordem;
                this.currentMiniCycle.data_inicio = dataInicio;
                this.currentMiniCycle.data_fim = dataFim;
                this.currentMiniCycle.ativo = ativo;
                await this.currentMiniCycle.save();

                DepartmentsPage.showToast('Miniciclo atualizado com sucesso!', 'success');
            } else {
                // Criar novo
                const miniCycle = new MiniCycle({
                    cycle_id: cycleId,
                    nome,
                    descricao,
                    ordem,
                    data_inicio: dataInicio,
                    data_fim: dataFim,
                    ativo
                });
                await miniCycle.save();

                DepartmentsPage.showToast('Miniciclo criado com sucesso!', 'success');
            }

            this.closeMiniCycleModal();
            await this.renderList();
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    },

    async toggleCycle(id) {
        try {
            const cycle = await Cycle.getById(id);
            await cycle.toggleActive();
            DepartmentsPage.showToast(`Ciclo ${cycle.ativo ? 'ativado' : 'inativado'} com sucesso!`, 'success');
            await this.renderList();
        } catch (error) {
            DepartmentsPage.showToast('Erro ao alterar status do ciclo', 'error');
        }
    },

    async toggleMiniCycle(id) {
        try {
            const mini = await MiniCycle.getById(id);
            await mini.toggleActive();
            DepartmentsPage.showToast(`Miniciclo ${mini.ativo ? 'ativado' : 'inativado'} com sucesso!`, 'success');
            await this.renderList();
        } catch (error) {
            DepartmentsPage.showToast('Erro ao alterar status do miniciclo', 'error');
        }
    },

    async deleteMiniCycle(id, nome) {
        if (!confirm(`Tem certeza que deseja excluir o miniciclo "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            const mini = await MiniCycle.getById(id);
            await mini.delete();
            DepartmentsPage.showToast('Miniciclo excluído com sucesso!', 'success');
            await this.renderList();
        } catch (error) {
            DepartmentsPage.showToast(error.message || 'Erro ao excluir miniciclo', 'error');
        }
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    addStyles() {
        if (document.getElementById('cycles-styles')) return;

        const style = document.createElement('style');
        style.id = 'cycles-styles';
        style.textContent = `
            /* Animações suaves */
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .cycle-card {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: top;
                position: relative;
                overflow: hidden;
            }

            .cycle-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.05) 0%, rgba(30, 96, 118, 0.05) 100%);
                opacity: 0;
                transition: opacity 0.4s ease;
                pointer-events: none;
            }

            .cycle-card:hover {
                box-shadow: 0 10px 40px rgba(18, 176, 160, 0.15);
                transform: translateY(-2px);
            }

            .cycle-card:hover::before {
                opacity: 1;
            }

            .cycle-card .card-header {
                transition: all 0.3s ease;
            }

            .btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: var(--radius);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .btn-icon:hover {
                background: var(--bg-hover);
                transform: scale(1.1);
            }

            .btn-icon:active {
                transform: scale(0.95);
            }

            .btn-icon svg {
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .minicycles-container {
                max-height: 0;
                overflow: hidden;
                opacity: 0;
                transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                            opacity 0.3s ease;
            }

            .minicycles-container.expanded {
                max-height: 5000px;
                opacity: 1;
            }

            .minicycles-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 16px;
                padding: 16px 4px;
            }

            .minicycle-card {
                background: var(--white);
                border: 2px solid var(--border);
                border-radius: 12px;
                padding: 16px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .minicycle-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--top-teal);
                transform: scaleY(0);
                transition: transform 0.3s ease;
                transform-origin: top;
            }

            .minicycle-card:hover::before {
                transform: scaleY(1);
            }

            .minicycle-card:hover {
                box-shadow: 0 8px 24px rgba(18, 176, 160, 0.2);
                border-color: var(--top-teal);
                transform: translateY(-4px);
            }

            .minicycle-card.current-active {
                border: 2px solid var(--success);
                background: linear-gradient(135deg, var(--success-bg) 0%, rgba(34, 197, 94, 0.05) 100%);
                box-shadow: 0 4px 16px rgba(34, 197, 94, 0.2);
            }

            .minicycle-card.current-active::before {
                background: var(--success);
                transform: scaleY(1);
            }

            .minicycle-ordem {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--top-teal) 0%, #0d9488 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 15px;
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.3);
                transition: box-shadow 0.3s ease;
            }

            .minicycle-card:hover .minicycle-ordem {
                box-shadow: 0 6px 16px rgba(18, 176, 160, 0.4);
            }

            .minicycle-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .minicycle-body {
                margin-bottom: 12px;
            }

            .minicycle-footer {
                display: flex;
                gap: 8px;
                justify-content: flex-start;
                padding-top: 12px;
                border-top: 1px solid var(--border-light);
            }

            .minicycle-footer .btn {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .minicycle-footer .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .minicycle-footer .btn:active {
                transform: translateY(0);
            }

            .form-section {
                margin-bottom: 24px;
                padding-bottom: 24px;
                border-bottom: 1px solid var(--border-light);
            }

            .form-section:last-of-type {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }

            .form-section-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--top-blue);
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* Melhorias na barra de progresso */
            .progress {
                background: var(--bg-main);
                border-radius: 100px;
                overflow: hidden;
                position: relative;
            }

            .progress-bar {
                background: linear-gradient(90deg, var(--top-teal) 0%, #0d9488 100%);
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            /* Badges melhorados */
            .badge {
                transition: all 0.3s ease;
            }

            .badge-success {
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
            }

            .badge-active {
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.CyclesPage = CyclesPage;
export { CyclesPage };
