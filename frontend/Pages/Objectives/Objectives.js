import { StorageService } from '../../services/storage.js';
import { supabaseClient } from '../../services/supabase.js';
import { OKR } from '../../Entities/OKR.js';
import { AuthService } from '../../services/auth.js';

// Página de Gestão de Objetivos Estratégicos
const ObjectivesPage = {
    currentObjective: null,
    currentFilter: 'all',

    async render() {
        const content = document.getElementById('content');
        const objectives = await StorageService.getObjectives();
        const isAdmin = AuthService.isAdmin();

        content.innerHTML = `
            <div class="page-gio">
                <div class="page-actions-gio" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                    <div class="filter-buttons-gio">
                        <button class="filter-btn-gio ${this.currentFilter === 'all' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('all', this)">
                            Todos (${objectives.length})
                        </button>
                        <button class="filter-btn-gio ${this.currentFilter === 'Execução' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Execução', this)">
                            Execução (${objectives.filter(o => o.category === 'Execução').length})
                        </button>
                        <button class="filter-btn-gio ${this.currentFilter === 'Crescimento' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Crescimento', this)">
                            Crescimento (${objectives.filter(o => o.category === 'Crescimento').length})
                        </button>
                        <button class="filter-btn-gio ${this.currentFilter === 'Melhoria' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Melhoria', this)">
                            Melhoria (${objectives.filter(o => o.category === 'Melhoria').length})
                        </button>
                    </div>
                    ${isAdmin ? `
                    <button class="btn-gio-primary" onclick="ObjectivesPage.openModal()">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo Objetivo
                    </button>
                    ` : ''}
                </div>

                <div id="objectives-list"></div>
                <div id="objective-modal" class="modal-gio-container" style="display:none;"></div>
            </div>
        `;

        // Fecha menus ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-menu-gio')) {
                this.closeAllMenus();
            }
        });

        await this.renderList();
        this.addStyles();
    },

    async renderList() {
        const container = document.getElementById('objectives-list');
        if (!container) return;

        const isAdmin = AuthService.isAdmin();
        let objectives = await StorageService.getObjectives();

        // Filtro por categoria
        if (this.currentFilter !== 'all') {
            objectives = objectives.filter(o => o.category === this.currentFilter);
        }

        if (objectives.length === 0) {
            container.innerHTML = `
                <div class="card-gio" style="margin-top:20px;">
                    <div style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:#9CA3AF;opacity:0.5;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <p style="color:#6B7280;font-size:15px;margin-bottom:16px;">
                            ${this.currentFilter === 'all' ? 'Nenhum objetivo cadastrado' : `Nenhum objetivo da categoria "${this.currentFilter}"`}
                        </p>
                        ${isAdmin ? `
                        <button class="btn-gio-primary" onclick="ObjectivesPage.openModal()">
                            Criar primeiro objetivo
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
            return;
        }

        // Busca quantidade de OKRs por objetivo
        const okrCounts = await Promise.all(
            objectives.map(async obj => {
                const okrs = await OKR.getByObjective(obj.id);
                return { id: obj.id, count: okrs.length };
            })
        );

        const categoryColors = {
            'Execução': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#3b82f6' },
            'Crescimento': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '#10b981' },
            'Melhoria': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '#f59e0b' }
        };

        const rowsHTML = objectives.map(obj => {
            const okrCount = okrCounts.find(c => c.id === obj.id)?.count || 0;
            const colors = categoryColors[obj.category] || { bg: '#f3f4f6', color: '#6b7280', border: '#6b7280' };

            return `
                <tr class="table-row-gio">
                    <td>
                        <span class="category-badge-gio" style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};">
                            ${obj.category}
                        </span>
                    </td>
                    <td>
                        <div class="objective-content-gio">
                            <div class="objective-text-gio">${obj.text}</div>
                            ${obj.meta ? `
                                <div class="objective-meta-gio">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                    </svg>
                                    <span>Meta: ${obj.meta}</span>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <div class="okr-count-gio">
                            <span class="okr-count-value">${okrCount}</span>
                            <span class="okr-count-label">OKRs</span>
                        </div>
                    </td>
                    ${isAdmin ? `
                    <td class="actions-cell-gio">
                        <div class="action-buttons-gio">
                            <button class="action-btn-gio edit" onclick="ObjectivesPage.openModal(${obj.id})" title="Editar">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="action-btn-gio delete" onclick="ObjectivesPage.deleteObjective(${obj.id})" title="Excluir">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                    ` : ''}
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="card-gio" style="margin-top:20px;">
                <table class="table-gio">
                    <thead>
                        <tr>
                            <th style="width:130px;">Categoria</th>
                            <th>Objetivo</th>
                            <th style="width:100px;text-align:center;">OKRs</th>
                            ${isAdmin ? '<th style="width:100px;text-align:center;">Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        `;
    },

    async filterBy(category, btn) {
        this.currentFilter = category;
        await this.renderList();

        // Atualiza botões ativos
        document.querySelectorAll('.filter-btn-gio').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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
            <div class="modal-overlay-gio" onclick="ObjectivesPage.closeModal()"></div>
            <div class="modal-content-gio" style="max-width:600px;">
                <div class="modal-header-gio">
                    <div>
                        <h3>${this.currentObjective ? 'Editar' : 'Novo'} Objetivo Estratégico</h3>
                        <p>${this.currentObjective ? 'Atualize as informações do objetivo' : 'Defina um novo objetivo estratégico da empresa'}</p>
                    </div>
                    <button class="modal-close-gio" onclick="ObjectivesPage.closeModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body-gio">
                    <div class="form-group-gio">
                        <label class="form-label-gio">Categoria *</label>
                        <select id="obj-category" class="form-control-gio">
                            <option value="Execução" ${this.currentObjective?.category === 'Execução' ? 'selected' : ''}>Execução</option>
                            <option value="Crescimento" ${this.currentObjective?.category === 'Crescimento' ? 'selected' : ''}>Crescimento</option>
                            <option value="Melhoria" ${this.currentObjective?.category === 'Melhoria' ? 'selected' : ''}>Melhoria</option>
                        </select>
                        <small class="form-hint-gio">Categoria do objetivo estratégico</small>
                    </div>

                    <div class="form-group-gio">
                        <label class="form-label-gio">Texto do Objetivo *</label>
                        <textarea id="obj-text" class="form-control-gio" rows="3"
                            placeholder="Ex: Executar R$ 120M em obras residenciais">${this.currentObjective ? this.currentObjective.text : ''}</textarea>
                        <small class="form-hint-gio">Seja claro e específico. Este objetivo será usado como referência para criar OKRs.</small>
                    </div>

                    <div class="form-group-gio">
                        <label class="form-label-gio">Meta</label>
                        <textarea id="obj-meta" class="form-control-gio" rows="2"
                            placeholder="Ex: < 5%, 75%, > 10%, etc.">${this.currentObjective ? this.currentObjective.meta || '' : ''}</textarea>
                        <small class="form-hint-gio">Descreva a meta mensurável deste objetivo (opcional)</small>
                    </div>

                    <div id="obj-error" class="error-message-gio" style="display:none;"></div>
                </div>

                <div class="modal-footer-gio">
                    <button class="btn-gio-secondary" onclick="ObjectivesPage.closeModal()">
                        Cancelar
                    </button>
                    <button class="btn-gio-primary" onclick="ObjectivesPage.save()">
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

            // Atualiza os contadores e re-renderiza
            const updatedObjectives = await StorageService.getObjectives();

            // Atualiza contadores dos filtros
            document.querySelectorAll('.filter-btn-gio').forEach(btn => {
                const filterText = btn.textContent.split('(')[0].trim();
                if (filterText === 'Todos') {
                    btn.innerHTML = `Todos (${updatedObjectives.length})`;
                } else if (filterText === 'Execução') {
                    btn.innerHTML = `Execução (${updatedObjectives.filter(o => o.category === 'Execução').length})`;
                } else if (filterText === 'Crescimento') {
                    btn.innerHTML = `Crescimento (${updatedObjectives.filter(o => o.category === 'Crescimento').length})`;
                } else if (filterText === 'Melhoria') {
                    btn.innerHTML = `Melhoria (${updatedObjectives.filter(o => o.category === 'Melhoria').length})`;
                }
            });

            await this.renderList();
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

            // Atualiza os contadores e re-renderiza
            const updatedObjectives = await StorageService.getObjectives();

            // Atualiza contadores dos filtros
            document.querySelectorAll('.filter-btn-gio').forEach(btn => {
                const filterText = btn.textContent.split('(')[0].trim();
                if (filterText === 'Todos') {
                    btn.innerHTML = `Todos (${updatedObjectives.length})`;
                } else if (filterText === 'Execução') {
                    btn.innerHTML = `Execução (${updatedObjectives.filter(o => o.category === 'Execução').length})`;
                } else if (filterText === 'Crescimento') {
                    btn.innerHTML = `Crescimento (${updatedObjectives.filter(o => o.category === 'Crescimento').length})`;
                } else if (filterText === 'Melhoria') {
                    btn.innerHTML = `Melhoria (${updatedObjectives.filter(o => o.category === 'Melhoria').length})`;
                }
            });

            await this.renderList();
        } catch (error) {
            console.error('Erro ao excluir objetivo:', error);
            DepartmentsPage.showToast('Erro ao excluir objetivo', 'error');
        }
    },

    toggleMenu(event, objId) {
        event.stopPropagation();
        window.closeAllDropdownMenus();
        const menu = document.getElementById(`obj-menu-${objId}`);
        if (menu) {
            window.positionDropdownMenu(event.currentTarget, `obj-menu-${objId}`);
            menu.classList.toggle('show');
        }
    },

    closeAllMenus() {
        window.closeAllDropdownMenus();
    },

    addStyles() {
        if (document.getElementById('objectives-styles')) return;

        const style = document.createElement('style');
        style.id = 'objectives-styles';
        style.textContent = `
            /* Filter Buttons GIO */
            .filter-buttons-gio {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .filter-btn-gio {
                padding: 8px 16px;
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 13px;
                font-weight: 500;
                color: #374151;
            }

            .filter-btn-gio:hover {
                border-color: #12b0a0;
                background: rgba(18, 176, 160, 0.05);
                color: #12b0a0;
            }

            .filter-btn-gio.active {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border-color: transparent;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            /* Category Badge GIO */
            .category-badge-gio {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            /* Objective Content GIO */
            .objective-content-gio {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .objective-text-gio {
                font-size: 14px;
                font-weight: 500;
                color: #1F2937;
                line-height: 1.5;
            }

            .objective-meta-gio {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: rgba(18, 176, 160, 0.08);
                border-radius: 6px;
                border-left: 3px solid #12b0a0;
                font-size: 12px;
                color: #4B5563;
                width: fit-content;
            }

            .objective-meta-gio svg {
                color: #12b0a0;
                flex-shrink: 0;
            }

            /* OKR Count GIO */
            .okr-count-gio {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }

            .okr-count-value {
                font-size: 20px;
                font-weight: 700;
                color: #1e6076;
                line-height: 1;
            }

            .okr-count-label {
                font-size: 10px;
                color: #9CA3AF;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            /* RESPONSIVO MOBILE */
            @media (max-width: 768px) {
                .page-actions-gio {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }

                .filter-buttons-gio {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    padding-bottom: 4px;
                }

                .filter-buttons-gio::-webkit-scrollbar {
                    display: none;
                }

                .filter-btn-gio {
                    font-size: 12px;
                    padding: 8px 14px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .btn-gio-primary {
                    width: 100%;
                    justify-content: center;
                }

                /* Card mode for mobile */
                .card-gio {
                    background: transparent !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }

                .table-gio {
                    display: block;
                }

                .table-gio thead {
                    display: none;
                }

                .table-gio tbody {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .table-row-gio {
                    display: flex;
                    flex-direction: column;
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                    gap: 12px;
                }

                .table-row-gio td {
                    padding: 0 !important;
                    border: none !important;
                }

                .table-row-gio td:first-child {
                    order: 1;
                }

                .table-row-gio td:nth-child(2) {
                    order: 2;
                }

                .table-row-gio td:nth-child(3) {
                    order: 4;
                }

                .table-row-gio td:nth-child(4) {
                    order: 3;
                }

                .okr-count-gio {
                    flex-direction: row;
                    gap: 6px;
                    justify-content: flex-start;
                }

                .okr-count-value {
                    font-size: 16px;
                }

                .action-buttons-gio {
                    justify-content: flex-start !important;
                }
            }

            @media (max-width: 480px) {
                .filter-btn-gio {
                    font-size: 11px;
                    padding: 6px 12px;
                }

                .objective-text-gio {
                    font-size: 13px;
                }

                .table-row-gio {
                    padding: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.ObjectivesPage = ObjectivesPage;
export { ObjectivesPage };
