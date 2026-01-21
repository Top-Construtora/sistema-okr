import { Cycle } from '../../Entities/Cycle.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';
import { AuthService } from '../../services/auth.js';

// Pagina de Gestao de Ciclos
const CyclesPage = {
    currentCycle: null,
    currentMiniCycle: null,

    async render() {
        const content = document.getElementById('content');
        const cycles = await Cycle.getAll();
        const isAdmin = AuthService.isAdmin();
        const canEdit = isAdmin;

        // Encontra ciclo e miniciclo ativos
        let currentCycleId = null;
        let currentMiniCycleId = null;
        for (const cycle of cycles) {
            if (cycle.isCurrentlyActive()) {
                currentCycleId = cycle.id;
                const minis = await cycle.getMiniCycles();
                for (const m of minis) {
                    if (m.isCurrentlyActive()) {
                        currentMiniCycleId = m.id;
                        break;
                    }
                }
                break;
            }
        }

        content.innerHTML = `
            <div class="page-gio">
                ${await this.renderContent(cycles, canEdit, currentCycleId, currentMiniCycleId)}
                <div id="cycle-modal" class="modal-gio-container" style="display:none;"></div>
                <div id="minicycle-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;

        this.addStyles();
    },

    async renderContent(cycles, canEdit, currentCycleId, currentMiniCycleId) {
        // Empty state
        if (cycles.length === 0) {
            return `
                <div class="cycles-empty-gio">
                    <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <h2>Nenhum ciclo cadastrado</h2>
                    <p>Crie um ciclo para organizar seus OKRs por periodo.</p>
                    ${canEdit ? `
                        <button class="btn-gio-primary" onclick="CyclesPage.openCycleModal()">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Criar Ciclo
                        </button>
                    ` : ''}
                </div>
            `;
        }

        let cyclesHtml = '';
        for (const cycle of cycles) {
            const isCurrent = cycle.id === currentCycleId;
            const miniCycles = await cycle.getMiniCycles();

            // Calcular totais do ciclo
            let totalOkrs = 0;
            let totalProgress = 0;
            for (const mini of miniCycles) {
                const prog = await this.getMiniCycleProgress(mini);
                totalOkrs += prog.okrs;
                totalProgress += prog.avg * prog.okrs;
            }
            const avgProgress = totalOkrs > 0 ? Math.round(totalProgress / totalOkrs) : 0;

            cyclesHtml += `
                <div class="cycle-card-gio ${isCurrent ? 'current' : ''} ${!cycle.ativo ? 'inactive' : ''}">
                    <div class="cycle-header-gio">
                        <div class="cycle-title-row-gio">
                            ${miniCycles.length > 0 ? `
                                <button class="cycle-toggle-gio" onclick="CyclesPage.toggleExpand('${cycle.id}')" title="Expandir/Recolher">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            ` : ''}
                            <h2 class="cycle-name-gio">${cycle.nome}</h2>
                            ${isCurrent ? '<span class="badge-current-gio">Atual</span>' : ''}
                            ${!cycle.ativo ? '<span class="badge-inactive-gio">Inativo</span>' : ''}
                        </div>
                        <div class="cycle-meta-gio">
                            <span class="cycle-dates-gio">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                ${this.formatDateShort(cycle.data_inicio)} - ${this.formatDateShort(cycle.data_fim)}
                            </span>
                            <span class="cycle-stats-gio">${totalOkrs} OKRs | ${avgProgress}% progresso</span>
                        </div>
                        ${canEdit ? `
                            <div class="cycle-actions-gio">
                                <button class="action-btn-gio edit" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')" title="Adicionar miniciclo">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                </button>
                                <button class="action-btn-gio edit" onclick="CyclesPage.openCycleModal('${cycle.id}')" title="Editar ciclo">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    ${miniCycles.length > 0 ? `
                        <div class="mini-grid-gio" id="mini-grid-${cycle.id}">
                            ${await this.renderMiniCyclesGrid(miniCycles, canEdit, currentMiniCycleId)}
                        </div>
                    ` : `
                        <div class="no-minicycles-gio">
                            Nenhum miniciclo
                            ${canEdit ? `<button class="btn-link-gio" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')">Criar</button>` : ''}
                        </div>
                    `}
                </div>
            `;
        }

        return `
            <div class="page-actions-gio" style="display:flex;justify-content:flex-end;">
                ${canEdit ? `
                    <button class="btn-gio-primary" onclick="CyclesPage.openCycleModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo Ciclo
                    </button>
                ` : ''}
            </div>
            <div class="cycles-grid-gio">
                ${cyclesHtml}
            </div>
        `;
    },

    async renderMiniCyclesGrid(miniCycles, canEdit, currentMiniCycleId) {
        let html = '';

        for (const mini of miniCycles) {
            const isCurrent = mini.id === currentMiniCycleId;
            const isPast = new Date(mini.data_fim) < new Date();
            const progress = await this.getMiniCycleProgress(mini);
            const status = isCurrent ? 'current' : isPast ? 'past' : 'future';
            const daysInfo = this.getDaysInfo(mini.data_inicio, mini.data_fim);

            html += `
                <div class="mini-card-gio ${status} ${!mini.ativo ? 'inactive' : ''}">
                    <div class="mini-card-header-gio">
                        <span class="mini-order-gio">${mini.ordem}</span>
                        <span class="mini-name-gio">${mini.nome}</span>
                        ${isCurrent ? '<span class="mini-badge-gio">Atual</span>' : ''}
                    </div>
                    <div class="mini-card-dates-gio">${this.formatDateShort(mini.data_inicio)} - ${this.formatDateShort(mini.data_fim)}</div>
                    ${daysInfo ? `<div class="mini-card-days-gio ${daysInfo.status}">${daysInfo.text}</div>` : ''}
                    <div class="mini-card-progress-gio">
                        <div class="mini-progress-bar-gio">
                            <div class="mini-progress-fill-gio" style="width: ${progress.avg}%"></div>
                        </div>
                        <div class="mini-progress-info-gio">
                            <span>${progress.avg}%</span>
                            <span>${progress.okrs} OKRs</span>
                        </div>
                    </div>
                    ${canEdit ? `
                        <div class="mini-card-actions-gio">
                            <button class="btn-sm-gio" onclick="CyclesPage.openMiniCycleModal('${mini.cycle_id}', '${mini.id}')">Editar</button>
                            <button class="btn-sm-gio ${mini.ativo ? 'warning' : 'success'}" onclick="CyclesPage.toggleMiniCycle('${mini.id}')">${mini.ativo ? 'Desativar' : 'Ativar'}</button>
                            <button class="btn-sm-gio danger" onclick="CyclesPage.deleteMiniCycle('${mini.id}', '${mini.nome}')">Excluir</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return html;
    },

    async getMiniCycleProgress(mini) {
        const okrsCount = await mini.getOKRsCount();
        const avg = okrsCount > 0 ? await mini.calculateAverageProgress() : 0;
        return { okrs: okrsCount, avg: Math.round(avg) };
    },

    getDaysInfo(startDate, endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        if (today < start) {
            const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
            return { text: `Inicia em ${diff} dias`, status: 'future' };
        } else if (today > end) {
            return null; // Passado, não mostrar
        } else {
            const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            if (diff === 0) return { text: 'Ultimo dia!', status: 'urgent' };
            if (diff <= 7) return { text: `${diff} dias restantes`, status: 'urgent' };
            if (diff <= 30) return { text: `${diff} dias restantes`, status: 'warning' };
            return { text: `${diff} dias restantes`, status: 'normal' };
        }
    },

    formatDateShort(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    },

    // ========== MODAIS ==========

    async openCycleModal(id = null) {
        this.currentCycle = id ? await Cycle.getById(id) : null;
        const modal = document.getElementById('cycle-modal');

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="CyclesPage.closeCycleModal()"></div>
            <div class="modal-content-gio" style="max-width:500px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>${this.currentCycle ? 'Editar' : 'Novo'} Ciclo</h3>
                        <p>${this.currentCycle ? 'Atualize as informações do ciclo' : 'Crie um novo ciclo para organizar seus OKRs'}</p>
                    </div>
                    <button class="modal-close-gio" onclick="CyclesPage.closeCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Nome do Ciclo *</label>
                        <input type="text" id="cycle-nome" class="form-control-gio"
                            placeholder="Ex: 2025, Q1-Q4 2025"
                            value="${this.currentCycle?.nome || ''}">
                    </div>

                    <div class="form-row-gio">
                        <div class="form-group-gio">
                            <label class="form-label-gio">Início *</label>
                            <input type="date" id="cycle-inicio" class="form-control-gio"
                                value="${this.currentCycle?.data_inicio || ''}">
                        </div>
                        <div class="form-group-gio">
                            <label class="form-label-gio">Fim *</label>
                            <input type="date" id="cycle-fim" class="form-control-gio"
                                value="${this.currentCycle?.data_fim || ''}">
                        </div>
                    </div>

                    ${!this.currentCycle ? `
                        <div class="form-group-gio">
                            <label class="form-label-gio">Dividir em</label>
                            <select id="cycle-minicycles-count" class="form-control-gio">
                                <option value="4">4 periodos (Trimestres)</option>
                                <option value="2">2 periodos (Semestres)</option>
                                <option value="3">3 periodos</option>
                                <option value="6">6 periodos (Bimestres)</option>
                                <option value="12">12 periodos (Meses)</option>
                            </select>
                            <small class="form-hint-gio">Os miniciclos serao criados automaticamente</small>
                        </div>
                    ` : ''}

                    <div class="form-group-gio">
                        <label class="form-label-gio">Descricao (opcional)</label>
                        <textarea id="cycle-descricao" class="form-control-gio" rows="2"
                            placeholder="Observacoes sobre este ciclo">${this.currentCycle?.descricao || ''}</textarea>
                    </div>

                    <div id="cycle-error" class="error-message-gio" style="display:none;"></div>
                </div>

                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="CyclesPage.closeCycleModal()">Cancelar</button>
                    <button class="btn-gio-primary" onclick="CyclesPage.saveCycle()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentCycle ? 'Salvar' : 'Criar Ciclo'}
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        document.getElementById('cycle-nome').focus();
    },

    async openMiniCycleModal(cycleId, miniId = null) {
        this.currentMiniCycle = miniId ? await MiniCycle.getById(miniId) : null;
        const cycle = await Cycle.getById(cycleId);
        const modal = document.getElementById('minicycle-modal');

        if (!cycle) {
            this.showToast('Ciclo nao encontrado', 'error');
            return;
        }

        const miniCycles = await cycle.getMiniCycles();
        const nextOrdem = this.currentMiniCycle ? this.currentMiniCycle.ordem : (Math.max(...miniCycles.map(m => m.ordem), 0) + 1);

        modal.innerHTML = `
            <div class="modal-overlay-gio" onclick="CyclesPage.closeMiniCycleModal()"></div>
            <div class="modal-content-gio" style="max-width:500px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>${this.currentMiniCycle ? 'Editar' : 'Novo'} Miniciclo</h3>
                        <p>Ciclo: ${cycle.nome}</p>
                    </div>
                    <button class="modal-close-gio" onclick="CyclesPage.closeMiniCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body-gio">
                    <input type="hidden" id="mini-cycle-id" value="${cycleId}">

                    <div class="form-row-gio">
                        <div class="form-group-gio" style="flex:2">
                            <label class="form-label-gio">Nome *</label>
                            <input type="text" id="mini-nome" class="form-control-gio"
                                placeholder="Ex: Q1 2025, Jan-Mar"
                                value="${this.currentMiniCycle?.nome || ''}">
                        </div>
                        <div class="form-group-gio" style="flex:1">
                            <label class="form-label-gio">Ordem</label>
                            <input type="number" id="mini-ordem" class="form-control-gio" min="1"
                                value="${nextOrdem}">
                        </div>
                    </div>

                    <div class="form-row-gio">
                        <div class="form-group-gio">
                            <label class="form-label-gio">Início *</label>
                            <input type="date" id="mini-inicio" class="form-control-gio"
                                value="${this.currentMiniCycle?.data_inicio || cycle.data_inicio}"
                                min="${cycle.data_inicio}" max="${cycle.data_fim}">
                        </div>
                        <div class="form-group-gio">
                            <label class="form-label-gio">Fim *</label>
                            <input type="date" id="mini-fim" class="form-control-gio"
                                value="${this.currentMiniCycle?.data_fim || cycle.data_fim}"
                                min="${cycle.data_inicio}" max="${cycle.data_fim}">
                        </div>
                    </div>

                    <div class="form-group-gio">
                        <label class="form-label-gio">Descricao (opcional)</label>
                        <textarea id="mini-descricao" class="form-control-gio" rows="2"
                            placeholder="Observacoes sobre este periodo">${this.currentMiniCycle?.descricao || ''}</textarea>
                    </div>

                    <div id="mini-error" class="error-message-gio" style="display:none;"></div>
                </div>

                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="CyclesPage.closeMiniCycleModal()">Cancelar</button>
                    <button class="btn-gio-primary" onclick="CyclesPage.saveMiniCycle()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentMiniCycle ? 'Salvar' : 'Criar'}
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        document.getElementById('mini-nome').focus();
    },

    closeCycleModal() {
        document.getElementById('cycle-modal').style.display = 'none';
        this.currentCycle = null;
    },

    closeMiniCycleModal() {
        document.getElementById('minicycle-modal').style.display = 'none';
        this.currentMiniCycle = null;
    },

    // ========== ACOES ==========

    async saveCycle() {
        const nome = document.getElementById('cycle-nome').value.trim();
        const descricao = document.getElementById('cycle-descricao').value.trim();
        const dataInicio = document.getElementById('cycle-inicio').value;
        const dataFim = document.getElementById('cycle-fim').value;
        const errorDiv = document.getElementById('cycle-error');

        // Validação
        if (!nome) {
            this.showError(errorDiv, 'Informe o nome do ciclo');
            return;
        }
        if (!dataInicio || !dataFim) {
            this.showError(errorDiv, 'Informe as datas de inicio e fim');
            return;
        }
        if (dataInicio >= dataFim) {
            this.showError(errorDiv, 'A data de fim deve ser posterior ao inicio');
            return;
        }

        try {
            if (this.currentCycle) {
                this.currentCycle.nome = nome;
                this.currentCycle.descricao = descricao;
                this.currentCycle.data_inicio = dataInicio;
                this.currentCycle.data_fim = dataFim;
                await this.currentCycle.save();
                this.showToast('Ciclo atualizado');
            } else {
                const miniCyclesCount = parseInt(document.getElementById('cycle-minicycles-count').value);
                await Cycle.createWithMiniCycles({
                    nome, descricao, data_inicio: dataInicio, data_fim: dataFim, ativo: true
                }, miniCyclesCount);
                this.showToast(`Ciclo criado com ${miniCyclesCount} miniciclos`);
            }

            this.closeCycleModal();
            await this.render();
        } catch (error) {
            this.showError(errorDiv, error.message);
        }
    },

    async saveMiniCycle() {
        const cycleId = document.getElementById('mini-cycle-id').value;
        const nome = document.getElementById('mini-nome').value.trim();
        const descricao = document.getElementById('mini-descricao').value.trim();
        const ordem = parseInt(document.getElementById('mini-ordem').value);
        const dataInicio = document.getElementById('mini-inicio').value;
        const dataFim = document.getElementById('mini-fim').value;
        const errorDiv = document.getElementById('mini-error');

        // Validação
        if (!nome) {
            this.showError(errorDiv, 'Informe o nome do miniciclo');
            return;
        }
        if (!dataInicio || !dataFim) {
            this.showError(errorDiv, 'Informe as datas');
            return;
        }

        try {
            if (this.currentMiniCycle) {
                this.currentMiniCycle.nome = nome;
                this.currentMiniCycle.descricao = descricao;
                this.currentMiniCycle.ordem = ordem;
                this.currentMiniCycle.data_inicio = dataInicio;
                this.currentMiniCycle.data_fim = dataFim;
                await this.currentMiniCycle.save();
                this.showToast('Miniciclo atualizado');
            } else {
                const miniCycle = new MiniCycle({
                    cycle_id: cycleId, nome, descricao, ordem,
                    data_inicio: dataInicio, data_fim: dataFim, ativo: true
                });
                await miniCycle.save();
                this.showToast('Miniciclo criado');
            }

            this.closeMiniCycleModal();
            await this.render();
        } catch (error) {
            this.showError(errorDiv, error.message);
        }
    },

    toggleExpand(cycleId) {
        const grid = document.getElementById(`mini-grid-${cycleId}`);
        const btn = document.querySelector(`[onclick="CyclesPage.toggleExpand('${cycleId}')"]`);

        if (grid) {
            grid.classList.toggle('collapsed-gio');
            btn?.classList.toggle('rotated-gio');
        }
    },

    async toggleCycle(id) {
        try {
            const cycle = await Cycle.getById(id);
            await cycle.toggleActive();
            this.showToast(`Ciclo ${cycle.ativo ? 'ativado' : 'desativado'}`);
            await this.render();
        } catch (error) {
            this.showToast('Erro ao alterar ciclo', 'error');
        }
    },

    async toggleMiniCycle(id) {
        try {
            const mini = await MiniCycle.getById(id);
            mini.ativo = !mini.ativo;
            await mini.save();
            this.showToast(`Miniciclo ${mini.ativo ? 'ativado' : 'desativado'}`);
            await this.render();
        } catch (error) {
            this.showToast('Erro ao alterar miniciclo', 'error');
        }
    },

    async deleteMiniCycle(id, nome) {
        if (!confirm(`Excluir "${nome}"?\n\nOKRs vinculados perderao a referencia.`)) {
            return;
        }

        try {
            const mini = await MiniCycle.getById(id);
            await mini.delete();
            this.showToast('Miniciclo excluido');
            await this.render();
        } catch (error) {
            this.showToast(error.message || 'Erro ao excluir', 'error');
        }
    },

    // ========== HELPERS ==========

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; }, 5000);
    },

    showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${type === 'success'
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    addStyles() {
        if (document.getElementById('cycles-styles-gio')) return;

        const style = document.createElement('style');
        style.id = 'cycles-styles-gio';
        style.textContent = `
            /* ========== CYCLES EMPTY STATE GIO ========== */

            .cycles-empty-gio {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                background: white;
                border: 2px dashed #E5E7EB;
                border-radius: 16px;
                padding: 60px 32px;
                text-align: center;
            }

            .cycles-empty-gio svg {
                color: #9CA3AF;
                opacity: 0.5;
            }

            .cycles-empty-gio h2 {
                font-size: 18px;
                font-weight: 600;
                color: #1e6076;
                margin: 0;
            }

            .cycles-empty-gio p {
                margin: 0;
                font-size: 14px;
                color: #6B7280;
            }

            /* ========== CYCLES GRID GIO ========== */

            .cycles-grid-gio {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            /* ========== CYCLE CARD GIO ========== */

            .cycle-card-gio {
                background: white;
                border-radius: 16px;
                border: 1px solid #E5E7EB;
                overflow: hidden;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                transition: all 0.2s ease;
            }

            .cycle-card-gio:hover {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }

            .cycle-card-gio.current {
                border-color: #12b0a0;
                box-shadow: 0 0 0 2px rgba(18, 176, 160, 0.2), 0 4px 20px rgba(0, 0, 0, 0.1);
            }

            .cycle-card-gio.inactive {
                opacity: 0.6;
            }

            .cycle-header-gio {
                padding: 18px 22px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
            }

            .cycle-title-row-gio {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 200px;
            }

            .cycle-name-gio {
                font-size: 18px;
                font-weight: 600;
                color: white;
                margin: 0;
            }

            .badge-current-gio {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                padding: 4px 10px;
                border-radius: 20px;
                letter-spacing: 0.3px;
            }

            .badge-inactive-gio {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                background: rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.8);
                padding: 4px 10px;
                border-radius: 20px;
            }

            .cycle-meta-gio {
                display: flex;
                align-items: center;
                gap: 16px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
            }

            .cycle-dates-gio {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .cycle-stats-gio {
                font-weight: 500;
            }

            .cycle-actions-gio {
                display: flex;
                gap: 6px;
                margin-left: auto;
            }

            .cycle-actions-gio .action-btn-gio {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: white;
            }

            .cycle-actions-gio .action-btn-gio:hover {
                background: rgba(255, 255, 255, 0.25);
            }

            .no-minicycles-gio {
                padding: 32px;
                text-align: center;
                color: #6B7280;
                font-size: 14px;
                background: #F9FAFB;
            }

            .btn-link-gio {
                color: #12b0a0;
                background: none;
                border: none;
                cursor: pointer;
                font-weight: 600;
                margin-left: 8px;
                transition: color 0.2s;
            }

            .btn-link-gio:hover {
                color: #0d9488;
            }

            /* ========== MINI GRID GIO ========== */

            .mini-grid-gio {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 16px;
                padding: 20px;
                background: #F9FAFB;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            .mini-grid-gio.collapsed-gio {
                display: none;
            }

            .cycle-toggle-gio {
                width: 32px;
                height: 32px;
                border: none;
                background: rgba(255, 255, 255, 0.15);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .cycle-toggle-gio:hover {
                background: rgba(255, 255, 255, 0.25);
            }

            .cycle-toggle-gio.rotated-gio {
                transform: rotate(-180deg);
            }

            /* ========== MINI CARD GIO ========== */

            .mini-card-gio {
                background: white;
                border-radius: 12px;
                padding: 16px 18px;
                border: 1px solid #E5E7EB;
                transition: all 0.2s ease;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
            }

            .mini-card-gio:hover {
                border-color: #D1D5DB;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                transform: translateY(-2px);
            }

            .mini-card-gio.current {
                border-color: #12b0a0;
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.05) 0%, white 100%);
                box-shadow: 0 0 0 2px rgba(18, 176, 160, 0.15);
            }

            .mini-card-gio.past {
                opacity: 0.6;
            }

            .mini-card-gio.inactive {
                opacity: 0.5;
            }

            .mini-card-header-gio {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .mini-order-gio {
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
                box-shadow: 0 2px 6px rgba(18, 176, 160, 0.3);
            }

            .mini-card-gio.past .mini-order-gio {
                background: #9CA3AF;
                box-shadow: none;
            }

            .mini-name-gio {
                font-size: 15px;
                font-weight: 600;
                color: #1F2937;
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mini-badge-gio {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 3px 8px;
                border-radius: 10px;
                letter-spacing: 0.3px;
            }

            .mini-card-dates-gio {
                font-size: 12px;
                color: #6B7280;
                margin-bottom: 8px;
            }

            .mini-card-days-gio {
                font-size: 11px;
                font-weight: 600;
                margin-bottom: 12px;
                padding: 5px 10px;
                border-radius: 20px;
                display: inline-block;
            }

            .mini-card-days-gio.normal {
                background: #F3F4F6;
                color: #4B5563;
            }

            .mini-card-days-gio.warning {
                background: rgba(245, 158, 11, 0.12);
                color: #b45309;
            }

            .mini-card-days-gio.urgent {
                background: rgba(239, 68, 68, 0.12);
                color: #dc2626;
            }

            .mini-card-days-gio.future {
                background: rgba(59, 130, 246, 0.12);
                color: #2563eb;
            }

            .mini-card-progress-gio {
                margin-bottom: 12px;
            }

            .mini-progress-bar-gio {
                height: 8px;
                background: #E5E7EB;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .mini-progress-fill-gio {
                height: 100%;
                background: linear-gradient(90deg, #12b0a0 0%, #0d9488 100%);
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .mini-progress-info-gio {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
            }

            .mini-progress-info-gio span:first-child {
                font-weight: 700;
                color: #12b0a0;
            }

            .mini-progress-info-gio span:last-child {
                color: #6B7280;
            }

            .mini-card-actions-gio {
                display: flex;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid #E5E7EB;
                margin-top: 4px;
            }

            /* ========== BUTTONS SM GIO ========== */

            .btn-sm-gio {
                padding: 6px 14px;
                font-size: 12px;
                font-weight: 500;
                border: 1px solid #E5E7EB;
                background: white;
                color: #4B5563;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-sm-gio:hover {
                border-color: #12b0a0;
                color: #12b0a0;
                background: rgba(18, 176, 160, 0.05);
            }

            .btn-sm-gio.danger:hover {
                border-color: #ef4444;
                color: #ef4444;
                background: rgba(239, 68, 68, 0.05);
            }

            .btn-sm-gio.warning:hover {
                border-color: #f59e0b;
                color: #f59e0b;
                background: rgba(245, 158, 11, 0.05);
            }

            .btn-sm-gio.success:hover {
                border-color: #10b981;
                color: #10b981;
                background: rgba(16, 185, 129, 0.05);
            }

            /* ========== FORM ROW GIO ========== */

            .form-row-gio {
                display: flex;
                gap: 12px;
            }

            .form-row-gio .form-group-gio {
                flex: 1;
            }

            /* ========== TOAST GIO ========== */

            .toast-gio {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                border-radius: 12px;
                padding: 14px 18px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 2000;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                border-left: 4px solid #10b981;
            }

            .toast-gio.show {
                opacity: 1;
                transform: translateY(0);
            }

            .toast-gio.toast-error {
                border-left-color: #ef4444;
            }

            .toast-gio svg {
                flex-shrink: 0;
            }

            .toast-gio.toast-success svg {
                color: #10b981;
            }

            .toast-gio.toast-error svg {
                color: #ef4444;
            }

            /* ========== RESPONSIVE GIO ========== */

            @media (max-width: 768px) {
                .cycle-header-gio {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 16px;
                }

                .cycle-meta-gio {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                }

                .cycle-actions-gio {
                    width: 100%;
                    justify-content: flex-start;
                }

                .mini-grid-gio {
                    grid-template-columns: 1fr;
                    padding: 16px;
                }

                .mini-card-actions-gio {
                    flex-wrap: wrap;
                }

                .btn-sm-gio {
                    flex: 1;
                    text-align: center;
                    justify-content: center;
                }

                .form-row-gio {
                    flex-direction: column;
                    gap: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expoe globalmente
window.CyclesPage = CyclesPage;
export { CyclesPage };
