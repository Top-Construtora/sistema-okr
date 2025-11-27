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
            <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
                <button class="btn btn-primary" onclick="ObjectivesPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Objetivo
                </button>
            </div>


            <div id="objective-modal" style="display:none;"></div>
        `;

        // Fecha menus ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-menu')) {
                this.closeAllMenus();
            }
        });

        this.addStyles();
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

                        <div class="form-group" style="margin-top:16px;">
                            <label class="form-label">Meta</label>
                            <textarea id="obj-meta" class="form-control" rows="2"
                                placeholder="Ex: < 5%, 75%, > 10%, etc.">${this.currentObjective ? this.currentObjective.meta || '' : ''}</textarea>
                            <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                                Descreva a meta mensurável deste objetivo (opcional)
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
        const meta = document.getElementById('obj-meta').value.trim();
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
            const objectiveData = { text, category, meta };

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

    toggleMenu(event, objId) {
        event.stopPropagation();
        this.closeAllMenus();
        const menu = document.getElementById(`obj-menu-${objId}`);
        if (menu) {
            menu.classList.toggle('show');
        }
    },

    closeAllMenus() {
        document.querySelectorAll('.action-menu-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
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

            /* Objectives Table Page */
            .objectives-table-container {
                background: white;
                border-radius: 12px;
                overflow: visible;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .objectives-table-page {
                width: 100%;
                border-collapse: collapse;
            }

            .objectives-table-page tbody {
                position: relative;
            }

            .objectives-table-page thead {
                background: linear-gradient(135deg, var(--top-blue) 0%, #1a5570 100%);
            }

            .objectives-table-page thead th {
                padding: 16px 20px;
                text-align: left;
                font-size: 13px;
                font-weight: 600;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .objective-row-page {
                border-bottom: 1px solid var(--border-light);
                transition: all 0.2s ease;
                position: relative;
            }

            .objective-row-page::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 4px;
                height: 100%;
                background: var(--top-teal);
                transform: scaleY(0);
                transition: transform 0.3s ease;
            }

            .objective-row-page:hover {
                background: var(--bg-main);
            }

            .objective-row-page:hover::before {
                transform: scaleY(1);
            }

            .objective-row-page:last-child {
                border-bottom: none;
            }

            .objective-row-page td {
                padding: 18px 20px;
                vertical-align: middle;
            }

            .objective-row-page .actions-cell {
                position: relative;
                z-index: 10;
            }

            .objective-content-cell {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .objective-text-page {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                line-height: 1.5;
            }

            .objective-category-badge {
                display: inline-flex;
                align-items: center;
                padding: 5px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                width: fit-content;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .meta-cell-page {
                border-left: 2px solid var(--border-light);
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
