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
            <div class="cycles-page">
                ${await this.renderContent(cycles, canEdit, currentCycleId, currentMiniCycleId)}
                <div id="cycle-modal" style="display:none;"></div>
                <div id="minicycle-modal" style="display:none;"></div>
            </div>
        `;

        this.addStyles();
    },

    async renderContent(cycles, canEdit, currentCycleId, currentMiniCycleId) {
        // Empty state
        if (cycles.length === 0) {
            return `
                <div class="cycles-empty">
                    <svg width="56" height="56" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <h2>Nenhum ciclo cadastrado</h2>
                    <p>Crie um ciclo para organizar seus OKRs por periodo.</p>
                    ${canEdit ? `
                        <button class="btn-primary" onclick="CyclesPage.openCycleModal()">
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
                <div class="cycle-card ${isCurrent ? 'current' : ''} ${!cycle.ativo ? 'inactive' : ''}">
                    <div class="cycle-header">
                        <div class="cycle-title-row">
                            ${miniCycles.length > 0 ? `
                                <button class="cycle-toggle" onclick="CyclesPage.toggleExpand('${cycle.id}')" title="Expandir/Recolher">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </button>
                            ` : ''}
                            <h2 class="cycle-name">${cycle.nome}</h2>
                            ${isCurrent ? '<span class="badge-current">Atual</span>' : ''}
                            ${!cycle.ativo ? '<span class="badge-inactive">Inativo</span>' : ''}
                        </div>
                        <div class="cycle-meta">
                            <span class="cycle-dates">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                ${this.formatDateShort(cycle.data_inicio)} - ${this.formatDateShort(cycle.data_fim)}
                            </span>
                            <span class="cycle-stats">${totalOkrs} OKRs | ${avgProgress}% progresso</span>
                        </div>
                        ${canEdit ? `
                            <div class="cycle-actions">
                                <button class="btn-icon-sm" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')" title="Adicionar miniciclo">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                </button>
                                <button class="btn-icon-sm" onclick="CyclesPage.openCycleModal('${cycle.id}')" title="Editar ciclo">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    ${miniCycles.length > 0 ? `
                        <div class="mini-grid" id="mini-grid-${cycle.id}">
                            ${await this.renderMiniCyclesGrid(miniCycles, canEdit, currentMiniCycleId)}
                        </div>
                    ` : `
                        <div class="no-minicycles">
                            Nenhum miniciclo
                            ${canEdit ? `<button class="btn-link" onclick="CyclesPage.openMiniCycleModal('${cycle.id}')">Criar</button>` : ''}
                        </div>
                    `}
                </div>
            `;
        }

        return `
            <div class="cycles-header">
                <div></div>
                ${canEdit ? `
                    <button class="btn-primary" onclick="CyclesPage.openCycleModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo Ciclo
                    </button>
                ` : ''}
            </div>
            <div class="cycles-grid">
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
                <div class="mini-card ${status} ${!mini.ativo ? 'inactive' : ''}">
                    <div class="mini-card-header">
                        <span class="mini-order">${mini.ordem}</span>
                        <span class="mini-name">${mini.nome}</span>
                        ${isCurrent ? '<span class="mini-badge">Atual</span>' : ''}
                    </div>
                    <div class="mini-card-dates">${this.formatDateShort(mini.data_inicio)} - ${this.formatDateShort(mini.data_fim)}</div>
                    ${daysInfo ? `<div class="mini-card-days ${daysInfo.status}">${daysInfo.text}</div>` : ''}
                    <div class="mini-card-progress">
                        <div class="mini-progress-bar">
                            <div class="mini-progress-fill" style="width: ${progress.avg}%"></div>
                        </div>
                        <div class="mini-progress-info">
                            <span>${progress.avg}%</span>
                            <span>${progress.okrs} OKRs</span>
                        </div>
                    </div>
                    ${canEdit ? `
                        <div class="mini-card-actions">
                            <button class="btn-sm" onclick="CyclesPage.openMiniCycleModal('${mini.cycle_id}', '${mini.id}')">Editar</button>
                            <button class="btn-sm ${mini.ativo ? 'warning' : 'success'}" onclick="CyclesPage.toggleMiniCycle('${mini.id}')">${mini.ativo ? 'Desativar' : 'Ativar'}</button>
                            <button class="btn-sm danger" onclick="CyclesPage.deleteMiniCycle('${mini.id}', '${mini.nome}')">Excluir</button>
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
            <div class="modal-overlay" onclick="CyclesPage.closeCycleModal()"></div>
            <div class="modal-content modal-medium">
                <div class="modal-header">
                    <h3>${this.currentCycle ? 'Editar' : 'Novo'} Ciclo</h3>
                    <button class="modal-close" onclick="CyclesPage.closeCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome do Ciclo</label>
                        <input type="text" id="cycle-nome" class="form-input"
                            placeholder="Ex: 2025, Q1-Q4 2025"
                            value="${this.currentCycle?.nome || ''}">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Início</label>
                            <input type="date" id="cycle-inicio" class="form-input"
                                value="${this.currentCycle?.data_inicio || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fim</label>
                            <input type="date" id="cycle-fim" class="form-input"
                                value="${this.currentCycle?.data_fim || ''}">
                        </div>
                    </div>

                    ${!this.currentCycle ? `
                        <div class="form-group">
                            <label class="form-label">Dividir em</label>
                            <select id="cycle-minicycles-count" class="form-input">
                                <option value="4">4 periodos (Trimestres)</option>
                                <option value="2">2 periodos (Semestres)</option>
                                <option value="3">3 periodos</option>
                                <option value="6">6 periodos (Bimestres)</option>
                                <option value="12">12 periodos (Meses)</option>
                            </select>
                            <span class="form-hint">Os miniciclos serao criados automaticamente</span>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label class="form-label">Descricao (opcional)</label>
                        <textarea id="cycle-descricao" class="form-input" rows="2"
                            placeholder="Observacoes sobre este ciclo">${this.currentCycle?.descricao || ''}</textarea>
                    </div>

                    <div id="cycle-error" class="form-error" style="display:none;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onclick="CyclesPage.closeCycleModal()">Cancelar</button>
                    <button class="btn-primary" onclick="CyclesPage.saveCycle()">
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
            <div class="modal-overlay" onclick="CyclesPage.closeMiniCycleModal()"></div>
            <div class="modal-content modal-medium">
                <div class="modal-header">
                    <div>
                        <h3>${this.currentMiniCycle ? 'Editar' : 'Novo'} Miniciclo</h3>
                        <span class="modal-subtitle">Ciclo: ${cycle.nome}</span>
                    </div>
                    <button class="modal-close" onclick="CyclesPage.closeMiniCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <input type="hidden" id="mini-cycle-id" value="${cycleId}">

                    <div class="form-row">
                        <div class="form-group" style="flex:2">
                            <label class="form-label">Nome</label>
                            <input type="text" id="mini-nome" class="form-input"
                                placeholder="Ex: Q1 2025, Jan-Mar"
                                value="${this.currentMiniCycle?.nome || ''}">
                        </div>
                        <div class="form-group" style="flex:1">
                            <label class="form-label">Ordem</label>
                            <input type="number" id="mini-ordem" class="form-input" min="1"
                                value="${nextOrdem}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Início</label>
                            <input type="date" id="mini-inicio" class="form-input"
                                value="${this.currentMiniCycle?.data_inicio || cycle.data_inicio}"
                                min="${cycle.data_inicio}" max="${cycle.data_fim}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fim</label>
                            <input type="date" id="mini-fim" class="form-input"
                                value="${this.currentMiniCycle?.data_fim || cycle.data_fim}"
                                min="${cycle.data_inicio}" max="${cycle.data_fim}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descricao (opcional)</label>
                        <textarea id="mini-descricao" class="form-input" rows="2"
                            placeholder="Observacoes sobre este periodo">${this.currentMiniCycle?.descricao || ''}</textarea>
                    </div>

                    <div id="mini-error" class="form-error" style="display:none;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onclick="CyclesPage.closeMiniCycleModal()">Cancelar</button>
                    <button class="btn-primary" onclick="CyclesPage.saveMiniCycle()">
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
            grid.classList.toggle('collapsed');
            btn?.classList.toggle('rotated');
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
        if (document.getElementById('cycles-styles-v3')) return;

        const style = document.createElement('style');
        style.id = 'cycles-styles-v3';
        style.textContent = `
            /* ========== CYCLES PAGE ========== */

            .cycles-page {
                width: 100%;
            }

            /* ========== HEADER ========== */

            .cycles-header {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 20px;
            }

            /* ========== EMPTY STATE ========== */

            .cycles-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                background: white;
                border: 2px dashed var(--border);
                border-radius: 12px;
                padding: 60px 32px;
                text-align: center;
                color: var(--text-muted);
            }

            .cycles-empty h2 {
                font-size: 18px;
                color: var(--top-blue);
                margin: 8px 0 0;
            }

            .cycles-empty p {
                margin: 0 0 12px;
                font-size: 14px;
            }

            /* ========== CYCLES GRID ========== */

            .cycles-grid {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            /* ========== CYCLE CARD ========== */

            .cycle-card {
                background: white;
                border-radius: 12px;
                border: 1px solid var(--border);
                overflow: hidden;
            }

            .cycle-card.current {
                border-color: var(--top-teal);
                box-shadow: 0 0 0 1px var(--top-teal);
            }

            .cycle-card.inactive {
                opacity: 0.6;
            }

            .cycle-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-light);
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
            }

            .cycle-title-row {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 200px;
            }

            .cycle-name {
                font-size: 18px;
                font-weight: 600;
                color: var(--top-blue);
                margin: 0;
            }

            .badge-current {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                background: var(--top-teal);
                color: white;
                padding: 3px 8px;
                border-radius: 4px;
            }

            .badge-inactive {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                background: var(--bg-main);
                color: var(--text-muted);
                padding: 3px 8px;
                border-radius: 4px;
            }

            .cycle-meta {
                display: flex;
                align-items: center;
                gap: 16px;
                font-size: 13px;
                color: var(--text-muted);
            }

            .cycle-dates {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .cycle-actions {
                display: flex;
                gap: 6px;
                margin-left: auto;
            }

            .no-minicycles {
                padding: 24px;
                text-align: center;
                color: var(--text-muted);
                font-size: 14px;
            }

            .no-minicycles .btn-link {
                color: var(--top-teal);
                background: none;
                border: none;
                cursor: pointer;
                font-weight: 600;
                margin-left: 8px;
            }

            /* ========== MINI GRID ========== */

            .mini-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 12px;
                padding: 16px;
                background: var(--bg-main);
                transition: all 0.3s ease;
                overflow: hidden;
            }

            .mini-grid.collapsed {
                display: none;
            }

            .cycle-toggle {
                width: 28px;
                height: 28px;
                border: none;
                background: transparent;
                color: var(--text-muted);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .cycle-toggle:hover {
                background: var(--bg-main);
                color: var(--top-blue);
            }

            .cycle-toggle.rotated {
                transform: rotate(-180deg);
            }

            /* ========== MINI CARD ========== */

            .mini-card {
                background: white;
                border-radius: 10px;
                padding: 14px 16px;
                border: 1px solid var(--border-light);
                transition: all 0.15s;
            }

            .mini-card:hover {
                border-color: var(--border);
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }

            .mini-card.current {
                border-color: var(--top-teal);
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.03) 0%, white 100%);
            }

            .mini-card.past {
                opacity: 0.6;
            }

            .mini-card.inactive {
                opacity: 0.5;
            }

            .mini-card-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .mini-order {
                width: 24px;
                height: 24px;
                background: var(--top-teal);
                color: white;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
            }

            .mini-card.past .mini-order {
                background: var(--text-muted);
            }

            .mini-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mini-badge {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                background: var(--success);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
            }

            .mini-card-dates {
                font-size: 12px;
                color: var(--text-muted);
                margin-bottom: 6px;
            }

            .mini-card-days {
                font-size: 11px;
                font-weight: 600;
                margin-bottom: 10px;
                padding: 4px 8px;
                border-radius: 4px;
                display: inline-block;
            }

            .mini-card-days.normal {
                background: var(--bg-main);
                color: var(--text-secondary);
            }

            .mini-card-days.warning {
                background: #fef3c7;
                color: #b45309;
            }

            .mini-card-days.urgent {
                background: #fee2e2;
                color: #dc2626;
            }

            .mini-card-days.future {
                background: #e0f2fe;
                color: #0369a1;
            }

            .mini-card-progress {
                margin-bottom: 10px;
            }

            .mini-progress-bar {
                height: 6px;
                background: var(--border);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 6px;
            }

            .mini-progress-fill {
                height: 100%;
                background: var(--top-teal);
                border-radius: 3px;
                transition: width 0.3s;
            }

            .mini-progress-info {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
            }

            .mini-progress-info span:first-child {
                font-weight: 600;
                color: var(--top-teal);
            }

            .mini-progress-info span:last-child {
                color: var(--text-muted);
            }

            .mini-card-actions {
                display: flex;
                gap: 8px;
                padding-top: 10px;
                border-top: 1px solid var(--border-light);
                margin-top: 4px;
            }

            /* ========== BUTTONS ========== */

            .btn-primary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: var(--top-teal);
                color: white;
                border: none;
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s;
            }

            .btn-primary:hover {
                background: var(--top-teal-dark, #0e9488);
            }

            .btn-secondary {
                background: white;
                color: var(--text-secondary);
                border: 1px solid var(--border);
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s;
            }

            .btn-secondary:hover {
                background: var(--bg-main);
            }

            .btn-icon-sm {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: 1px solid var(--border);
                background: white;
                color: var(--text-muted);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
            }

            .btn-icon-sm:hover {
                border-color: var(--top-teal);
                color: var(--top-teal);
            }

            .btn-icon-sm.warning:hover {
                border-color: var(--warning);
                color: var(--warning);
            }

            .btn-icon-sm.success:hover {
                border-color: var(--success);
                color: var(--success);
            }

            .btn-sm {
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                border: 1px solid var(--border);
                background: white;
                color: var(--text-secondary);
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.15s;
            }

            .btn-sm:hover {
                border-color: var(--top-teal);
                color: var(--top-teal);
            }

            .btn-sm.danger:hover {
                border-color: var(--danger);
                color: var(--danger);
            }

            .btn-sm.warning:hover {
                border-color: var(--warning, #f59e0b);
                color: var(--warning, #f59e0b);
            }

            .btn-sm.success:hover {
                border-color: var(--success);
                color: var(--success);
            }

            /* ========== MODAL ========== */

            .modal-medium {
                max-width: 480px;
            }

            .modal-subtitle {
                font-size: 13px;
                color: var(--text-muted);
                font-weight: normal;
            }

            .form-row {
                display: flex;
                gap: 12px;
            }

            .form-row .form-group {
                flex: 1;
            }

            .form-group {
                margin-bottom: 16px;
            }

            .form-group:last-child {
                margin-bottom: 0;
            }

            .form-label {
                display: block;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-secondary);
                margin-bottom: 6px;
            }

            .form-input {
                width: 100%;
                padding: 10px 12px;
                font-size: 14px;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: white;
                transition: border-color 0.15s, box-shadow 0.15s;
            }

            .form-input:focus {
                outline: none;
                border-color: var(--top-teal);
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.1);
            }

            .form-hint {
                display: block;
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 4px;
            }

            .form-error {
                background: var(--danger-bg, #fef2f2);
                border: 1px solid var(--danger);
                color: var(--danger);
                padding: 10px 12px;
                border-radius: 6px;
                font-size: 13px;
                margin-top: 16px;
            }

            /* ========== TOAST ========== */

            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 2000;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s;
                border-left: 4px solid var(--success);
            }

            .toast.show {
                opacity: 1;
                transform: translateY(0);
            }

            .toast.toast-error {
                border-left-color: var(--danger);
            }

            .toast svg {
                flex-shrink: 0;
            }

            .toast.toast-success svg {
                color: var(--success);
            }

            .toast.toast-error svg {
                color: var(--danger);
            }

            /* ========== RESPONSIVE ========== */

            @media (max-width: 768px) {
                .cycle-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .cycle-actions {
                    width: 100%;
                    justify-content: flex-end;
                }

                .mini-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expoe globalmente
window.CyclesPage = CyclesPage;
export { CyclesPage };
