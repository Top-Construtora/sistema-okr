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
            <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:var(--top-blue);margin-bottom:4px;">Objetivos Estratégicos</h2>
                    <p style="color:var(--text-muted);font-size:13px;">${objectives.length} ${objectives.length === 1 ? 'objetivo cadastrado' : 'objetivos cadastrados'}</p>
                </div>
                ${isAdmin ? `
                <button class="btn btn-primary" onclick="ObjectivesPage.openModal()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Novo Objetivo
                </button>
                ` : ''}
            </div>

            <div class="filter-buttons" style="margin-bottom:24px;">
                <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('all', this)">
                    Todos (${objectives.length})
                </button>
                <button class="filter-btn ${this.currentFilter === 'Execução' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Execução', this)">
                    Execução (${objectives.filter(o => o.category === 'Execução').length})
                </button>
                <button class="filter-btn ${this.currentFilter === 'Crescimento' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Crescimento', this)">
                    Crescimento (${objectives.filter(o => o.category === 'Crescimento').length})
                </button>
                <button class="filter-btn ${this.currentFilter === 'Melhoria' ? 'active' : ''}" onclick="ObjectivesPage.filterBy('Melhoria', this)">
                    Melhoria (${objectives.filter(o => o.category === 'Melhoria').length})
                </button>
            </div>

            <div id="objectives-list"></div>
            <div id="objective-modal" style="display:none;"></div>
        `;

        // Fecha menus ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-menu')) {
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
                <div class="card">
                    <div class="card-body" style="text-align:center;padding:60px 20px;">
                        <svg style="width:64px;height:64px;color:var(--text-muted);opacity:0.3;margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <p style="color:var(--text-muted);font-size:15px;margin-bottom:16px;">
                            ${this.currentFilter === 'all' ? 'Nenhum objetivo cadastrado' : `Nenhum objetivo da categoria "${this.currentFilter}"`}
                        </p>
                        ${isAdmin ? `
                        <button class="btn btn-primary" onclick="ObjectivesPage.openModal()">
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
            'Execução': { bg: '#eff6ff', color: '#3b82f6' },
            'Crescimento': { bg: '#f0fdf4', color: '#10b981' },
            'Melhoria': { bg: '#fef3c7', color: '#f59e0b' }
        };

        const rowsHTML = objectives.map(obj => {
            const okrCount = okrCounts.find(c => c.id === obj.id)?.count || 0;
            const colors = categoryColors[obj.category] || { bg: '#f3f4f6', color: '#6b7280' };

            return `
                <tr class="objective-row-page">
                    <td>
                        <span class="objective-category-badge" style="background:${colors.bg};color:${colors.color};">
                            ${obj.category}
                        </span>
                    </td>
                    <td>
                        <div class="objective-content-cell">
                            <div class="objective-text-page">${obj.text}</div>
                            ${obj.meta ? `
                                <div class="objective-meta-info">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                    </svg>
                                    <span>Meta: ${obj.meta}</span>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    ${isAdmin ? `
                    <td class="actions-cell" style="text-align:center;">
                        <div class="action-menu">
                            <button class="action-menu-btn" onclick="ObjectivesPage.toggleMenu(event, '${obj.id}')" title="Ações">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                </svg>
                            </button>
                            <div class="action-menu-dropdown" id="obj-menu-${obj.id}">
                                <button class="menu-item" onclick="ObjectivesPage.openModal(${obj.id}); ObjectivesPage.closeAllMenus();">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar
                                </button>
                                <button class="menu-item danger" onclick="ObjectivesPage.deleteObjective(${obj.id}); ObjectivesPage.closeAllMenus();">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </td>
                    ` : '<td></td>'}
                    <td class="meta-cell-page" style="text-align:center;">
                        <div class="metric-item">
                            <div>
                                <div class="metric-value">${okrCount}</div>
                                <div class="metric-label">OKR's</div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="objectives-table-container">
                <table class="objectives-table-page">
                    <thead>
                        <tr>
                            <th class="col-category">Categoria</th>
                            <th class="col-objective">Objetivo</th>
                            ${isAdmin ? '<th class="col-actions">Ações</th>' : '<th></th>'}
                            <th class="col-okrs">OKR's Vinculados</th>
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
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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

            // Atualiza os contadores e re-renderiza
            const updatedObjectives = await StorageService.getObjectives();
            document.querySelector('.page-header p').textContent =
                `${updatedObjectives.length} ${updatedObjectives.length === 1 ? 'objetivo cadastrado' : 'objetivos cadastrados'}`;

            // Atualiza contadores dos filtros
            document.querySelectorAll('.filter-btn').forEach(btn => {
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
            document.querySelector('.page-header p').textContent =
                `${updatedObjectives.length} ${updatedObjectives.length === 1 ? 'objetivo cadastrado' : 'objetivos cadastrados'}`;

            // Atualiza contadores dos filtros
            document.querySelectorAll('.filter-btn').forEach(btn => {
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
            .filter-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .filter-btn {
                padding: 8px 16px;
                background: var(--white);
                border: 1px solid var(--border);
                border-radius: 20px;
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

            /* Action Menu Button */
            .action-menu-btn {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: none;
                background: transparent;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-menu-btn:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            .action-menu-btn svg {
                width: 18px;
                height: 18px;
            }

            /* Objectives Table Page */
            .objectives-table-container {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .objectives-table-page {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }

            .objectives-table-page thead {
                background: linear-gradient(135deg, var(--top-blue) 0%, #1a5570 100%);
            }

            .objectives-table-page thead th {
                padding: 16px 20px;
                text-align: left;
                font-size: 12px;
                font-weight: 600;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Larguras fixas das colunas */
            .objectives-table-page .col-category {
                width: 130px;
            }

            .objectives-table-page .col-objective {
                width: auto;
            }

            .objectives-table-page .col-okrs {
                width: 140px;
                text-align: center;
            }

            .objectives-table-page .col-actions {
                width: 70px;
                text-align: center;
            }

            .objective-row-page {
                border-bottom: 1px solid var(--border-light);
                transition: all 0.2s ease;
            }

            .objective-row-page:hover {
                background: var(--bg-main);
            }

            .objective-row-page:last-child {
                border-bottom: none;
            }

            .objective-row-page td {
                padding: 16px 20px;
                vertical-align: middle;
            }

            .objective-row-page td:nth-child(1) {
                width: 130px;
            }

            .objective-row-page td:nth-child(3) {
                width: 70px;
                text-align: center;
            }

            .objective-row-page td:nth-child(4) {
                width: 140px;
                text-align: center;
            }

            .objective-content-cell {
                display: flex;
                flex-direction: column;
                gap: 8px;
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
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                width: fit-content;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .metric-item {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .metric-value {
                font-size: 18px;
                font-weight: 700;
                color: var(--top-blue);
                line-height: 1;
            }

            .metric-label {
                font-size: 10px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .objective-meta-info {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: var(--bg-main);
                border-radius: 6px;
                border-left: 3px solid var(--top-teal);
                font-size: 12px;
                color: var(--text-secondary);
            }

            .objective-meta-info svg {
                color: var(--top-teal);
                flex-shrink: 0;
                width: 14px;
                height: 14px;
            }

            .actions-cell {
                position: relative;
            }

            @media (max-width: 768px) {
                .objectives-table-page {
                    table-layout: auto;
                }

                .objectives-table-page thead th,
                .objective-row-page td {
                    padding: 12px 10px;
                }

                .objectives-table-page .col-category,
                .objective-row-page td:nth-child(1) {
                    width: 100px;
                }

                .objectives-table-page .col-okrs,
                .objective-row-page td:nth-child(4) {
                    width: 80px;
                }

                .metric-item {
                    flex-direction: column;
                    gap: 2px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.ObjectivesPage = ObjectivesPage;
export { ObjectivesPage };
