import { ProblemTree } from '../../Entities/ProblemTree.js';

const ProblemTreePage = {
    trees: [],
    items: [],
    expandedTrees: {},
    editingItem: {},
    openMenuId: null,
    novaArvoreNome: '',

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Carregando...</div>';
        this.addStyles();

        const [trees, items] = await Promise.all([
            ProblemTree.getAllTrees(),
            ProblemTree.getAllItems()
        ]);

        this.trees = trees;
        this.items = items;
        this.editingItem = {};
        this.openMenuId = null;
        this.renderPage();
    },

    renderPage() {
        const content = document.getElementById('content');
        const pilares = this.getPilaresDeDor();

        content.innerHTML = `
            <div class="page-gio">
                <div class="page-actions-gio" style="gap:10px;">
                    <input type="text" class="form-control" style="max-width:360px;padding:9px 14px;font-size:13px;"
                        placeholder="Digite o nome da nova árvore..."
                        value="${this.escapeAttr(this.novaArvoreNome)}"
                        oninput="ProblemTreePage.novaArvoreNome = this.value"
                        onkeydown="if(event.key==='Enter') ProblemTreePage.criarArvore()" />
                    <button class="btn-gio-primary" onclick="ProblemTreePage.criarArvore()">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        Criar Árvore
                    </button>
                    ${this.trees.length === 0 ? `
                        <button class="btn-gio-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 2px 8px rgba(245,158,11,0.3);" onclick="ProblemTreePage.criarPadrao()">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                            Criar Padrão
                        </button>
                    ` : ''}
                </div>

                ${this.trees.length === 0 ? `
                    <div class="card-gio">
                        <div class="empty-state-gio">
                            <div class="empty-state-icon">
                                <svg width="36" height="36" fill="none" stroke="#12b0a0" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                            </div>
                            <h3>Nenhuma árvore criada</h3>
                            <p>Crie uma nova árvore ou use as árvores padrão para começar.</p>
                        </div>
                    </div>
                ` : ''}

                <div class="pt-trees">
                    ${this.trees.map(tree => this.renderTree(tree)).join('')}
                </div>

                ${pilares.length > 0 ? this.renderPilares(pilares) : ''}
            </div>
        `;
    },

    renderTree(tree) {
        const expanded = this.expandedTrees[tree.id] || false;
        const treeItems = this.getTreeItems(tree.id);
        const menuOpen = this.openMenuId === `tree-${tree.id}`;

        return `
            <div class="card-gio" style="margin-bottom:12px;overflow:visible;">
                <div class="pt-tree-header">
                    <div class="pt-tree-title-row" onclick="ProblemTreePage.toggleTree(${tree.id})">
                        <svg class="pt-chevron ${expanded ? 'pt-chevron-open' : ''}" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                        <h4 class="pt-tree-name">${this.escapeHtml(tree.nome)}</h4>
                        <span class="status-chip active">${treeItems.length} ${treeItems.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <div style="position:relative;">
                        <button class="action-btn" onclick="event.stopPropagation(); ProblemTreePage.toggleMenu('tree-${tree.id}')">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                        ${menuOpen ? `
                            <div class="pt-dropdown">
                                <button class="pt-dropdown-item pt-dropdown-danger" onclick="ProblemTreePage.deleteTree(${tree.id})">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    Excluir Árvore
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${expanded ? `
                    <div class="pt-tree-body">
                        <div style="margin-bottom:12px;">
                            <button class="btn-gio-primary" style="padding:7px 14px;font-size:12px;" onclick="ProblemTreePage.addItem(${tree.id})">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                Adicionar Linha
                            </button>
                        </div>

                        ${treeItems.length > 0 ? `
                            <div class="table-gio-container">
                                <table class="table-gio">
                                    <thead>
                                        <tr>
                                            <th style="width:28%;text-align:left;">Tópico</th>
                                            <th style="width:30%;text-align:left;">Pergunta Norteadora</th>
                                            <th style="width:8%">Gravidade</th>
                                            <th style="width:8%">Urgência</th>
                                            <th style="width:8%">Tendência</th>
                                            <th style="width:8%">Nota</th>
                                            <th style="width:10%">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${treeItems.map((item, i) => this.renderItemRow(tree.id, item, i)).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;font-style:italic;">
                                Nenhum item. Clique em "Adicionar Linha" para começar.
                            </div>
                        `}
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderItemRow(treeId, item, index) {
        const editing = this.editingItem[treeId];
        const isEditing = editing && editing.index === index;

        if (isEditing) {
            const ed = editing.data;
            return `
                <tr style="background:rgba(18,176,160,0.04);">
                    <td style="padding:8px;text-align:left;">
                        <input type="text" class="form-control" style="padding:8px 10px;font-size:13px;" value="${this.escapeAttr(ed.topico)}"
                            oninput="ProblemTreePage.onEditField(${treeId}, 'topico', this.value)" placeholder="Tópico" />
                    </td>
                    <td style="padding:8px;text-align:left;">
                        <input type="text" class="form-control" style="padding:8px 10px;font-size:13px;" value="${this.escapeAttr(ed.pergunta_norteadora)}"
                            oninput="ProblemTreePage.onEditField(${treeId}, 'pergunta_norteadora', this.value)" placeholder="Pergunta norteadora" />
                    </td>
                    <td style="padding:8px;">
                        <input type="number" class="form-control" style="padding:8px 4px;font-size:13px;text-align:center;" value="${ed.gravidade || ''}"
                            min="1" max="5" step="1" oninput="ProblemTreePage.onEditField(${treeId}, 'gravidade', this.value)" placeholder="1-5" />
                    </td>
                    <td style="padding:8px;">
                        <input type="number" class="form-control" style="padding:8px 4px;font-size:13px;text-align:center;" value="${ed.urgencia || ''}"
                            min="1" max="5" step="1" oninput="ProblemTreePage.onEditField(${treeId}, 'urgencia', this.value)" placeholder="1-5" />
                    </td>
                    <td style="padding:8px;">
                        <input type="number" class="form-control" style="padding:8px 4px;font-size:13px;text-align:center;" value="${ed.tendencia || ''}"
                            min="1" max="5" step="1" oninput="ProblemTreePage.onEditField(${treeId}, 'tendencia', this.value)" placeholder="1-5" />
                    </td>
                    <td style="text-align:center;color:var(--text-muted);">—</td>
                    <td style="text-align:center;">
                        <div class="action-buttons">
                            <button class="action-btn success" onclick="ProblemTreePage.saveItem(${treeId})" title="Salvar">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            </button>
                            <button class="action-btn" onclick="ProblemTreePage.cancelEdit(${treeId})" title="Cancelar">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        const nota = (item.gravidade && item.urgencia && item.tendencia)
            ? item.gravidade * item.urgencia * item.tendencia
            : item.nota;
        const notaClass = nota && nota > 20 ? 'pt-nota-alta' : '';
        const menuOpen = this.openMenuId === `item-${treeId}-${index}`;

        return `
            <tr>
                <td style="text-align:left;font-weight:500;">${this.escapeHtml(item.topico) || '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:left;color:var(--text-secondary);">${this.escapeHtml(item.pergunta_norteadora) || '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center;">${this.formatNum(item.gravidade)}</td>
                <td style="text-align:center;">${this.formatNum(item.urgencia)}</td>
                <td style="text-align:center;">${this.formatNum(item.tendencia)}</td>
                <td style="text-align:center;" class="${notaClass}">${nota != null ? this.formatNum(nota) : '—'}</td>
                <td style="text-align:center;position:relative;">
                    <div class="action-buttons" style="justify-content:center;">
                        <button class="action-btn" onclick="ProblemTreePage.startEdit(${treeId}, ${index})" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="action-btn danger" onclick="ProblemTreePage.deleteItem(${treeId}, ${item.id})" title="Excluir">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderPilares(pilares) {
        return `
            <div class="card-gio" style="margin-top:16px;border-left:4px solid var(--top-teal);">
                <div style="padding:20px 24px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div class="empty-state-icon" style="width:36px;height:36px;border-radius:10px;margin:0;">
                                <svg width="18" height="18" fill="none" stroke="#12b0a0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#12b0a0"/></svg>
                            </div>
                            <div>
                                <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-primary);">Pilares de Dor</h3>
                                <p style="margin:2px 0 0;font-size:12px;color:var(--text-muted);">Tópicos com nota de impacto superior a 20 pontos</p>
                            </div>
                        </div>
                        <span class="status-chip active">${pilares.length} ${pilares.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <div class="pt-pilares-list">
                        ${pilares.map(p => `
                            <div class="pt-pilar-item">
                                <span style="font-size:13px;font-weight:500;color:var(--text-primary);">${this.escapeHtml(p.topico)}</span>
                                <span class="status-chip" style="background:var(--warning-bg);color:var(--warning);">${this.formatNum(p.nota)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // === Actions ===

    getTreeItems(treeId) {
        return this.items.filter(i => i.tree_id === treeId);
    },

    getPilaresDeDor() {
        return this.items
            .filter(i => {
                const nota = (i.gravidade && i.urgencia && i.tendencia)
                    ? i.gravidade * i.urgencia * i.tendencia
                    : i.nota;
                return nota && nota > 20;
            })
            .map(i => ({
                ...i,
                nota: i.nota || (i.gravidade * i.urgencia * i.tendencia)
            }))
            .sort((a, b) => (b.nota || 0) - (a.nota || 0));
    },

    toggleTree(treeId) {
        this.expandedTrees[treeId] = !this.expandedTrees[treeId];
        this.closeAllMenus();
        this.renderPage();
    },

    toggleMenu(menuId) {
        this.openMenuId = this.openMenuId === menuId ? null : menuId;
        this.renderPage();
    },

    closeAllMenus() {
        this.openMenuId = null;
    },

    async criarArvore() {
        const nome = this.novaArvoreNome.trim();
        if (!nome) return;
        const tree = await ProblemTree.createTree(nome);
        if (tree) {
            this.trees.push(tree);
            this.novaArvoreNome = '';
            this.expandedTrees[tree.id] = true;
            this.renderPage();
        }
    },

    async criarPadrao() {
        const nomes = ['Cliente', 'Pessoas', 'Financeiro', 'Processos', 'Estratégia'];
        for (const nome of nomes) {
            const tree = await ProblemTree.createTree(nome);
            if (tree) {
                this.trees.push(tree);
                this.expandedTrees[tree.id] = false;
            }
        }
        this.renderPage();
    },

    async deleteTree(treeId) {
        if (!confirm('Tem certeza que deseja excluir esta árvore e todos os seus itens?')) return;
        await ProblemTree.deleteTree(treeId);
        this.trees = this.trees.filter(t => t.id !== treeId);
        this.items = this.items.filter(i => i.tree_id !== treeId);
        delete this.expandedTrees[treeId];
        delete this.editingItem[treeId];
        this.closeAllMenus();
        this.renderPage();
    },

    addItem(treeId) {
        const tempItem = {
            id: null, tree_id: treeId, topico: '', pergunta_norteadora: '',
            gravidade: null, urgencia: null, tendencia: null, nota: null, _isNew: true
        };
        this.items.push(tempItem);
        const treeItems = this.getTreeItems(treeId);
        this.editingItem[treeId] = { index: treeItems.length - 1, data: { ...tempItem } };
        this.closeAllMenus();
        this.renderPage();
        setTimeout(() => {
            const inputs = document.querySelectorAll('tr[style*="rgba(18,176,160"] .form-control');
            if (inputs.length > 0) inputs[0].focus();
        }, 50);
    },

    startEdit(treeId, index) {
        const treeItems = this.getTreeItems(treeId);
        const item = treeItems[index];
        this.editingItem[treeId] = {
            index,
            data: {
                id: item.id, topico: item.topico || '',
                pergunta_norteadora: item.pergunta_norteadora || '',
                gravidade: item.gravidade, urgencia: item.urgencia, tendencia: item.tendencia
            }
        };
        this.closeAllMenus();
        this.renderPage();
    },

    onEditField(treeId, field, value) {
        if (!this.editingItem[treeId]) return;
        if (['gravidade', 'urgencia', 'tendencia'].includes(field)) {
            this.editingItem[treeId].data[field] = value ? parseFloat(value) : null;
        } else {
            this.editingItem[treeId].data[field] = value;
        }
    },

    async saveItem(treeId) {
        const editing = this.editingItem[treeId];
        if (!editing) return;
        const data = editing.data;

        if (!data.topico || !data.topico.trim()) { alert('O tópico é obrigatório.'); return; }
        for (const field of ['gravidade', 'urgencia', 'tendencia']) {
            if (data[field] != null && (data[field] < 1 || data[field] > 5)) {
                alert(`${field.charAt(0).toUpperCase() + field.slice(1)} deve estar entre 1 e 5.`);
                return;
            }
        }

        const payload = {
            topico: data.topico.trim(),
            pergunta_norteadora: data.pergunta_norteadora?.trim() || '',
            gravidade: data.gravidade || 0, urgencia: data.urgencia || 0, tendencia: data.tendencia || 0
        };

        if (data.id) {
            await ProblemTree.updateItem(data.id, payload);
            const idx = this.items.findIndex(i => i.id === data.id);
            if (idx !== -1) {
                Object.assign(this.items[idx], payload);
                this.items[idx].nota = payload.gravidade * payload.urgencia * payload.tendencia;
            }
        } else {
            this.items = this.items.filter(i => !(i.tree_id === treeId && i._isNew));
            const created = await ProblemTree.createItem(treeId, payload);
            if (created) this.items.push(created);
        }

        delete this.editingItem[treeId];
        this.renderPage();
    },

    cancelEdit(treeId) {
        this.items = this.items.filter(i => !(i.tree_id === treeId && i._isNew));
        delete this.editingItem[treeId];
        this.renderPage();
    },

    async deleteItem(treeId, itemId) {
        if (!confirm('Excluir este item?')) return;
        await ProblemTree.deleteItem(itemId);
        this.items = this.items.filter(i => i.id !== itemId);
        this.closeAllMenus();
        this.renderPage();
    },

    formatNum(val) {
        if (val == null || val === 0) return '—';
        return String(val).replace('.', ',');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    addStyles() {
        if (document.getElementById('pt-styles')) return;
        const style = document.createElement('style');
        style.id = 'pt-styles';
        style.textContent = `
            .pt-trees { display: flex; flex-direction: column; }
            .pt-tree-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 20px;
            }
            .pt-tree-title-row {
                display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer;
            }
            .pt-tree-title-row:hover { opacity: 0.8; }
            .pt-chevron { transition: transform 0.2s; color: var(--text-muted); flex-shrink: 0; }
            .pt-chevron-open { transform: rotate(90deg); }
            .pt-tree-name { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
            .pt-tree-body {
                padding: 16px 20px; border-top: 1px solid var(--border-light);
                background: var(--bg-main); border-radius: 0 0 16px 16px;
            }
            .pt-dropdown {
                position: absolute; top: 100%; right: 0; z-index: 50;
                background: white; border: 1px solid var(--border);
                border-radius: var(--radius); box-shadow: var(--shadow-lg);
                min-width: 160px; padding: 4px;
            }
            .pt-dropdown-item {
                display: flex; align-items: center; gap: 8px;
                width: 100%; padding: 8px 12px;
                font-size: 13px; background: none; border: none;
                cursor: pointer; border-radius: var(--radius-sm);
                color: var(--text-primary); text-align: left;
            }
            .pt-dropdown-item:hover { background: var(--bg-hover); }
            .pt-dropdown-danger { color: var(--danger); }
            .pt-dropdown-danger:hover { background: var(--danger-bg); }
            .pt-nota-alta { color: var(--warning) !important; font-weight: 700; }
            .pt-pilares-list {
                display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;
            }
            .pt-pilar-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 14px; background: var(--bg-main);
                border-radius: var(--radius); transition: all 0.2s;
            }
            .pt-pilar-item:hover { background: var(--bg-hover); }

            @media (max-width: 768px) {
                .page-actions-gio { flex-wrap: wrap; }
                .page-actions-gio .form-control { max-width: 100% !important; }
                .pt-pilares-list { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }
};

export { ProblemTreePage };
window.ProblemTreePage = ProblemTreePage;
