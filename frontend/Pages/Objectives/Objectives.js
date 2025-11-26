import { StorageService } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { OKR } from '../../Entities/OKR.js';

// Página de Gestão de Objetivos Estratégicos
const ObjectivesPage = {
    currentObjective: null,
    currentFilter: 'all',

    async render() {
        const content = document.getElementById('content');
        const objectives = await StorageService.getObjectives();

        content.innerHTML = `
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Objetivos Estratégicos</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${objectives.length} ${objectives.length === 1 ? 'objetivo cadastrado' : 'objetivos cadastrados'}</p>
                </div>
                <button class="btn btn-primary" onclick="ObjectivesPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Objetivo
                </button>
            </div>

            <div style="margin-bottom:24px;">
                <div class="filter-buttons">
                    <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="ObjectivesPage.filterByCategory('all')">
                        Todos (${objectives.length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'Execução' ? 'active' : ''}" onclick="ObjectivesPage.filterByCategory('Execução')">
                        Execução (${objectives.filter(o => o.category === 'Execução').length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'Crescimento' ? 'active' : ''}" onclick="ObjectivesPage.filterByCategory('Crescimento')">
                        Crescimento (${objectives.filter(o => o.category === 'Crescimento').length})
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'Melhoria' ? 'active' : ''}" onclick="ObjectivesPage.filterByCategory('Melhoria')">
                        Melhoria (${objectives.filter(o => o.category === 'Melhoria').length})
                    </button>
                </div>
            </div>

            <div id="objectives-list"></div>
            <div id="objective-modal" style="display:none;"></div>
        `;

        await this.renderList();
        this.addStyles();
    },

    async renderList() {
        const container = document.getElementById('objectives-list');
        let objectives = await StorageService.getObjectives();

        // Filtro por categoria
        if (this.currentFilter !== 'all') {
            objectives = objectives.filter(o => o.category === this.currentFilter);
        }

        if (objectives.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">Nenhum objetivo encontrado nesta categoria</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="objectives-table">';

        for (const obj of objectives) {
            const linkedOKRs = await OKR.getByObjective(obj.id);
            const avgProgress = linkedOKRs.length > 0
                ? Math.round(linkedOKRs.reduce((sum, o) => sum + o.progress, 0) / linkedOKRs.length)
                : 0;

            const categoryColor = {
                'Execução': 'var(--info)',
                'Crescimento': 'var(--success)',
                'Melhoria': 'var(--warning)'
            };

            html += `
                <div class="objective-row">
                    <div class="objective-main">
                        <div class="objective-id">${obj.id}</div>
                        <div class="objective-content">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <span class="badge" style="background:${categoryColor[obj.category] || 'var(--text-muted)'}15;color:${categoryColor[obj.category] || 'var(--text-muted)'};">
                                    ${obj.category}
                                </span>
                            </div>
                            <h4 class="objective-text">${obj.text}</h4>
                        </div>
                    </div>
                    <div class="objective-metrics">
                        <div class="metric-item">
                            <div class="metric-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                            <div>
                                <div class="metric-value">${linkedOKRs.length}</div>
                                <div class="metric-label">OKRs</div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                            <div style="min-width:100px;">
                                <div class="progress progress-sm" style="margin-bottom:4px;">
                                    <div class="progress-bar" style="width:${avgProgress}%"></div>
                                </div>
                                <div class="metric-value" style="font-size:16px;">${avgProgress}%</div>
                            </div>
                        </div>
                    </div>
                    <div class="objective-actions">
                        <button class="btn btn-sm btn-secondary" onclick="ObjectivesPage.openModal(${obj.id})" title="Editar">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="ObjectivesPage.deleteObjective(${obj.id})" title="Excluir" ${linkedOKRs.length > 0 ? 'disabled' : ''}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    },

    async filterByCategory(category) {
        this.currentFilter = category;
        await this.renderList();

        // Atualiza botões
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    },

    async openModal(id = null) {
        if (id) {
            const objectives = await StorageService.getObjectives();
            this.currentObjective = objectives.find(o => o.id === id);
        } else {
            this.currentObjective = null;
        }

        const modal = document.getElementById('objective-modal');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="ObjectivesPage.closeModal()"></div>
            <div class="modal-content" style="max-width:700px;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin:0;color:var(--top-blue);font-size:20px;">${this.currentObjective ? 'Editar' : 'Novo'} Objetivo Estratégico</h3>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">
                            ${this.currentObjective ? 'Atualize as informações do objetivo' : 'Defina um novo objetivo estratégico da empresa'}
                        </p>
                    </div>
                    <button class="modal-close" onclick="ObjectivesPage.closeModal()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                            </svg>
                            Definição do Objetivo
                        </div>

                        <div class="form-group">
                            <label class="form-label">Categoria *</label>
                            <select id="obj-category" class="form-control">
                                <option value="Execução" ${this.currentObjective?.category === 'Execução' ? 'selected' : ''}>Execução</option>
                                <option value="Crescimento" ${this.currentObjective?.category === 'Crescimento' ? 'selected' : ''}>Crescimento</option>
                                <option value="Melhoria" ${this.currentObjective?.category === 'Melhoria' ? 'selected' : ''}>Melhoria</option>
                            </select>
                            <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                Categoria do objetivo estratégico
                            </small>
                        </div>

                        <div class="form-group" style="margin-top:16px;">
                            <label class="form-label">Texto do Objetivo *</label>
                            <textarea id="obj-text" class="form-control" rows="3"
                                placeholder="Ex: Executar R$ 120M em obras residenciais">${this.currentObjective ? this.currentObjective.text : ''}</textarea>
                            <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                Seja claro e específico. Este objetivo será usado como referência para criar OKRs.
                            </small>
                        </div>
                    </div>

                    <div id="obj-error" class="error-message" style="display:none;margin-top:16px;"></div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="ObjectivesPage.closeModal()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="ObjectivesPage.save()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${this.currentObjective ? 'Atualizar' : 'Criar'} Objetivo
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    closeModal() {
        document.getElementById('objective-modal').style.display = 'none';
        this.currentObjective = null;
    },

    async save() {
        const text = document.getElementById('obj-text').value.trim();
        const category = document.getElementById('obj-category').value;
        const errorDiv = document.getElementById('obj-error');

        // Validações
        if (!text) {
            errorDiv.textContent = 'O texto do objetivo é obrigatório';
            errorDiv.style.display = 'block';
            return;
        }

        if (!category) {
            errorDiv.textContent = 'A categoria é obrigatória';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const objectiveData = { text, category };

            if (this.currentObjective) {
                // Update
                const { error } = await supabaseClient
                    .from('objectives')
                    .update(objectiveData)
                    .eq('id', this.currentObjective.id);

                if (error) throw error;
                DepartmentsPage.showToast('Objetivo atualizado com sucesso!', 'success');
            } else {
                // Insert
                const { error } = await supabaseClient
                    .from('objectives')
                    .insert([objectiveData]);

                if (error) throw error;
                DepartmentsPage.showToast('Objetivo criado com sucesso!', 'success');
            }

            this.closeModal();
            await this.render();
        } catch (error) {
            console.error('Erro ao salvar objetivo:', error);
            errorDiv.textContent = error.message || 'Erro ao salvar objetivo';
            errorDiv.style.display = 'block';
        }
    },

    async deleteObjective(id) {
        // Verifica se tem OKRs vinculados
        const linkedOKRs = await OKR.getByObjective(id);

        if (linkedOKRs.length > 0) {
            DepartmentsPage.showToast(`Não é possível excluir: ${linkedOKRs.length} OKR(s) vinculado(s)`, 'error');
            return;
        }

        if (!confirm('Deseja realmente excluir este objetivo estratégico?')) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('objectives')
                .delete()
                .eq('id', id);

            if (error) throw error;

            DepartmentsPage.showToast('Objetivo excluído com sucesso!', 'success');
            await this.renderList();
        } catch (error) {
            console.error('Erro ao excluir objetivo:', error);
            DepartmentsPage.showToast('Erro ao excluir objetivo', 'error');
        }
    },

    addStyles() {
        if (document.getElementById('objectives-styles')) return;

        const style = document.createElement('style');
        style.id = 'objectives-styles';
        style.textContent = `
            .filter-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .filter-btn {
                padding: 8px 16px;
                background: var(--white);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary);
            }

            .filter-btn:hover {
                border-color: var(--top-teal);
                background: var(--bg-hover);
            }

            .filter-btn.active {
                background: var(--top-teal);
                color: white;
                border-color: var(--top-teal);
            }

            .objectives-table {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .objective-row {
                background: var(--white);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                transition: all 0.2s;
            }

            .objective-row:hover {
                box-shadow: var(--shadow-md);
                border-color: var(--top-teal);
            }

            .objective-main {
                flex: 1;
                display: flex;
                gap: 16px;
                align-items: flex-start;
            }

            .objective-id {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--top-teal);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                flex-shrink: 0;
            }

            .objective-content {
                flex: 1;
            }

            .objective-text {
                font-size: 15px;
                font-weight: 600;
                color: var(--top-blue);
                line-height: 1.5;
                margin: 0;
            }

            .objective-metrics {
                display: flex;
                gap: 24px;
                align-items: center;
                padding-left: 24px;
                border-left: 1px solid var(--border-light);
            }

            .metric-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .metric-icon {
                width: 36px;
                height: 36px;
                border-radius: var(--radius);
                background: var(--bg-main);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--top-teal);
            }

            .metric-icon svg {
                width: 18px;
                height: 18px;
            }

            .metric-value {
                font-size: 20px;
                font-weight: 700;
                color: var(--top-blue);
                line-height: 1;
            }

            .metric-label {
                font-size: 11px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .objective-actions {
                display: flex;
                gap: 8px;
            }

            @media (max-width: 768px) {
                .objective-row {
                    flex-direction: column;
                    align-items: stretch;
                }

                .objective-metrics {
                    border-left: none;
                    border-top: 1px solid var(--border-light);
                    padding-left: 0;
                    padding-top: 16px;
                    justify-content: space-around;
                }

                .objective-actions {
                    justify-content: flex-end;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.ObjectivesPage = ObjectivesPage;
export { ObjectivesPage };
