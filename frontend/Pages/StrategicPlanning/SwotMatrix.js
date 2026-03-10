import { SwotItem } from '../../Entities/SwotItem.js';

const SwotMatrixPage = {
    items: [],
    editing: false,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Carregando...</div>';
        this.addStyles();
        this.items = await SwotItem.getAll();
        this.editing = false;
        this.renderPage();
    },

    renderPage() {
        const content = document.getElementById('content');
        const quadrants = SwotItem.QUADRANTS;

        content.innerHTML = `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <button class="btn-gio-primary" onclick="SwotMatrixPage.toggleEdit()" style="${this.editing ? 'background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 2px 8px rgba(16,185,129,0.3);' : ''}">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.editing ? 'M5 13l4 4L19 7' : 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'}"/>
                        </svg>
                        ${this.editing ? 'Concluir Edição' : 'Editar'}
                    </button>
                </div>

                <div class="card-gio" style="overflow:visible;">
                    <div class="sw-grid">
                        <div class="sw-label-row">
                            <div class="sw-corner"></div>
                            <div class="sw-col-label" style="color:#10b981;">POSITIVO</div>
                            <div class="sw-col-label" style="color:#ef4444;">NEGATIVO</div>
                        </div>
                        <div class="sw-body-row">
                            <div class="sw-row-label">INTERNO</div>
                            ${this.renderQuadrant(quadrants[0])}
                            ${this.renderQuadrant(quadrants[1])}
                        </div>
                        <div class="sw-body-row">
                            <div class="sw-row-label">EXTERNO</div>
                            ${this.renderQuadrant(quadrants[2])}
                            ${this.renderQuadrant(quadrants[3])}
                        </div>
                    </div>
                </div>

                <div class="card-gio" style="margin-top:16px;">
                    <div style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:16px;">
                        <span class="sw-legend-item"><span class="sw-legend-dot" style="background:#10b981;"></span> Forças — Pontos fortes internos</span>
                        <span class="sw-legend-item"><span class="sw-legend-dot" style="background:#ef4444;"></span> Fraquezas — Pontos fracos internos</span>
                        <span class="sw-legend-item"><span class="sw-legend-dot" style="background:#3b82f6;"></span> Oportunidades — Fatores externos positivos</span>
                        <span class="sw-legend-item"><span class="sw-legend-dot" style="background:#f59e0b;"></span> Ameaças — Fatores externos negativos</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderQuadrant(q) {
        const qItems = this.items.filter(i => i.quadrant === q.key);
        const canAdd = qItems.length < 5 && this.editing;

        return `
            <div class="sw-quadrant" style="border-color:${q.color};">
                <div class="sw-q-header" style="background:${q.bg};border-color:${q.color};">
                    <svg width="18" height="18" fill="none" stroke="${q.color}" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${q.icon}"/>
                    </svg>
                    <span style="color:${q.color};font-weight:700;">${q.label}</span>
                    <span class="status-chip" style="background:${q.color}15;color:${q.color};margin-left:auto;">${qItems.length}/5</span>
                </div>
                <div class="sw-q-body">
                    ${qItems.length === 0 && !this.editing ? `
                        <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:30px 12px;font-style:italic;">
                            Nenhum item adicionado
                        </div>
                    ` : ''}
                    ${qItems.map((item, idx) => `
                        <div class="sw-q-item">
                            <span class="sw-q-num" style="color:${q.color};">${idx + 1}.</span>
                            ${this.editing ? `
                                <input class="form-control" style="padding:7px 10px;font-size:13px;flex:1;" value="${this.escapeAttr(item.text)}"
                                    onchange="SwotMatrixPage.updateItem(${item.id}, this.value)"
                                    placeholder="Descreva o item..." />
                                <button class="action-btn danger" style="width:28px;height:28px;" onclick="SwotMatrixPage.deleteItem(${item.id})">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            ` : `
                                <span style="font-size:13px;color:var(--text-secondary);flex:1;line-height:1.4;">${this.escapeHtml(item.text)}</span>
                            `}
                        </div>
                    `).join('')}
                    ${canAdd ? `
                        <button class="sw-q-add" onclick="SwotMatrixPage.addItem('${q.key}')" style="color:${q.color};border-color:${q.color}30;">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Adicionar item
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    toggleEdit() {
        this.editing = !this.editing;
        this.renderPage();
    },

    async addItem(quadrant) {
        try {
            const item = await SwotItem.create(quadrant, '');
            this.items.push(item);
            this.renderPage();
            setTimeout(() => {
                const inputs = document.querySelectorAll('.sw-q-item .form-control');
                if (inputs.length) inputs[inputs.length - 1].focus();
            }, 50);
        } catch (e) {
            alert(e.message || 'Erro ao adicionar item');
        }
    },

    async updateItem(id, text) {
        await SwotItem.update(id, text);
        const item = this.items.find(i => i.id === id);
        if (item) item.text = text;
    },

    async deleteItem(id) {
        await SwotItem.delete(id);
        this.items = this.items.filter(i => i.id !== id);
        this.renderPage();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    },

    addStyles() {
        if (document.getElementById('sw-styles')) return;
        const style = document.createElement('style');
        style.id = 'sw-styles';
        style.textContent = `
            .sw-grid { display: flex; flex-direction: column; }
            .sw-label-row, .sw-body-row {
                display: grid; grid-template-columns: 40px 1fr 1fr;
            }
            .sw-corner { background: var(--bg-main); }
            .sw-col-label {
                text-align: center; font-size: 11px; font-weight: 800;
                letter-spacing: 1px; text-transform: uppercase;
                padding: 12px; background: var(--bg-main);
            }
            .sw-row-label {
                writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg);
                font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
                color: var(--text-muted); display: flex; align-items: center; justify-content: center;
                background: var(--bg-main); padding: 8px 4px;
            }
            .sw-quadrant {
                border: 2px solid; margin: 4px; border-radius: var(--radius-lg);
                overflow: hidden; min-height: 200px; display: flex; flex-direction: column;
            }
            .sw-q-header {
                display: flex; align-items: center; gap: 8px;
                padding: 12px 14px; border-bottom: 2px solid; font-size: 14px;
            }
            .sw-q-body {
                padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 6px;
            }
            .sw-q-item {
                display: flex; align-items: center; gap: 8px;
                padding: 6px 8px; border-radius: var(--radius); background: rgba(0,0,0,0.02);
            }
            .sw-q-num { font-size: 13px; font-weight: 700; flex-shrink: 0; }
            .sw-q-add {
                display: flex; align-items: center; justify-content: center; gap: 6px;
                padding: 8px; border: 2px dashed; border-radius: var(--radius);
                background: transparent; font-size: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.2s; margin-top: auto;
            }
            .sw-q-add:hover { background: rgba(0,0,0,0.02); }
            .sw-legend-item {
                display: flex; align-items: center; gap: 6px;
                font-size: 12px; color: var(--text-muted);
            }
            .sw-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

            @media (max-width: 768px) {
                .sw-label-row, .sw-body-row { grid-template-columns: 1fr; }
                .sw-corner, .sw-col-label, .sw-row-label { display: none; }
                .sw-quadrant { margin: 6px 0; }
            }
        `;
        document.head.appendChild(style);
    }
};

export { SwotMatrixPage };
window.SwotMatrixPage = SwotMatrixPage;
